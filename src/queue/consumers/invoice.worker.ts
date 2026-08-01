// src/queue/consumers/inventory.consumer.ts
import { pgPool } from "../../config/db";
import { PoolClient } from "pg";
import { PaymentConfirmedMessage } from "../../types";
import { messageBroker, type QueueMessage } from "../messageBroker";
import AppError from "@/utils/appError";
import { generateInvoicePdf } from "@/utils/invoiceGenerator";
import { s3, bucketName } from "@/config/aws-s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { sendEmail } from "@/services/email.service";

export const InvoiceWorker = async (): Promise<void> => {
  const amqpChannel = await messageBroker.createChannel();
  await amqpChannel.assertQueue("payment_confirmed_queue", { durable: true });

  amqpChannel.consume(
    "payment_confirmed_queue",
    async (msg: QueueMessage | null) => {
      if (!msg) return;

      const { bookingId, reference, data }: PaymentConfirmedMessage =
        JSON.parse(msg.content.toString());
      const client: PoolClient = await pgPool.connect();

      try {
        await client.query("BEGIN");

        // 1. Mark booking row as confirmed
        const bookingUpdateResult = await client.query(
          `UPDATE bookings 
          SET status = 'confirmed' 
          WHERE id = $1
          RETURNING id, apartment_id, guest_id, check_in, check_out, total_price, no_of_guest, status, expires_at
          `,
          [bookingId],
        );

        if (bookingUpdateResult.rowCount === 0) {
          throw new AppError(`Booking with ID ${bookingId} not found`, 500);
        }

        const updatedBooking = bookingUpdateResult.rows[0];

        // fetch apartment and agent details
        const aptRes = await client.query(
          `SELECT id, agent_id, title, price_per_night, cleaning_fee FROM apartments WHERE id = $1`,
          [updatedBooking.apartment_id],
        );
        const apartment = aptRes.rows[0];

        // fetch guest and agent user records
        const guestRes = await client.query(
          `SELECT id, name, email FROM users WHERE id = $1`,
          [updatedBooking.guest_id],
        );
        const guest = guestRes.rows[0];

        const agentRes = await client.query(
          `SELECT id, name, email FROM users WHERE id = $1`,
          [apartment.agent_id],
        );
        const agent = agentRes.rows[0];

        const subTotal = Number(updatedBooking.total_price) || 0; // subtotal
        const taxAmount = Number((subTotal * 0.075).toFixed(2)); // 7.5% tax
        const totalAmount = Number((subTotal + taxAmount).toFixed(2));

        // 2. Secure day-by-day rows to final status 'booked'
        await client.query(
          `UPDATE apartment_availability 
         SET status = 'booked' 
         WHERE booking_id = $1`,
          [bookingId],
        );

        // 3. Mark the apartment as booked
        await client.query(
          `UPDATE apartments 
         SET status = 'booked' 
         WHERE id = $1`,
          [updatedBooking.apartment_id],
        );

        // 4. Insert invoice row
        const invoiceNumber = `INV-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000000)}`;

        const invoiceInsert = await client.query(
          `INSERT INTO invoices (invoice_number, booking_id, guest_id, agent_id, sub_total, tax_amount, total_amount, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *`,
          [
            invoiceNumber,
            updatedBooking.id,
            updatedBooking.guest_id,
            apartment.agent_id,
            subTotal,
            taxAmount,
            totalAmount,
            "paid",
          ],
        );

        const invoice = invoiceInsert.rows[0];

        // 5. Store payment confirmation in the payments table
        await client.query(
          `INSERT INTO payments (invoice_id, booking_id, amount, status, transaction_ref, paystack_data)
          VALUES ($1, $2, $3, $4, $5, $6)`,
          [invoice.id, bookingId, totalAmount, "paid", reference, data],
        );

        // 6. Generate invoice PDF buffer
        const pdfBuffer = await generateInvoicePdf({
          invoice,
          booking: updatedBooking,
          apartment,
          guest,
          agent,
        });

        // 7. Upload PDF to S3 and update invoice row with pdf_url
        const key = `invoices/${invoice.invoice_number}.pdf`;
        const put = new PutObjectCommand({
          Bucket: bucketName,
          Key: key,
          Body: pdfBuffer,
          ContentType: "application/pdf",
        });
        await s3.send(put);
        const pdfUrl = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

        await client.query(`UPDATE invoices SET pdf_url = $1 WHERE id = $2`, [
          pdfUrl,
          invoice.id,
        ]);

        await client.query("COMMIT");

        // 8. Send email to guest with invoice attached
        try {
          await sendEmail(
            guest.email,
            `Booking Confirmed - ${invoice.invoice_number}`,
            `Your booking ${bookingId} is confirmed. Invoice: ${invoice.invoice_number}`,
            undefined,
            [
              {
                filename: `${invoice.invoice_number}.pdf`,
                content: pdfBuffer,
              },
            ],
          );
        } catch (err) {
          console.error("Failed to send confirmation email:", err);
        }

        // Acknowledge event completion to RabbitMQ
        msg.ack();
        console.log(
          `[Invoice Worker] Processed confirmed booking: ${bookingId}`,
        );
      } catch (error) {
        await client.query("ROLLBACK");
        console.error(
          `[Invoice Worker] Failed processing booking ${bookingId}:`,
          error,
        );

        // Re-queue the event message to handle temporary database timeouts/issues
        msg.nack(false, true);
      } finally {
        client.release();
      }
    },
  );
};
