import { pgPool } from "../config/db";
import AppError from "../utils/appError";
import type {
  PaystackPaymentData,
  VerifyPaymentResponse,
} from "../utils/api/paystackApi";

export interface PaystackVerifiedPayload {
  status?: boolean;
  message?: string;
  data: PaystackPaymentData;
}

export const buildPaymentRecordFromPaystack = (
  verificationResponse: PaystackVerifiedPayload,
) => {
  const paymentData = verificationResponse.data;
  const normalizedAmount = Number(paymentData.amount) / 100;
  const normalizedStatus =
    paymentData.status === "success" ? "paid" : "pending";

  return {
    bookingId: paymentData.metadata?.bookingId,
    amount: Number.isFinite(normalizedAmount) ? normalizedAmount : 0,
    status: normalizedStatus,
    method: "card",
    transactionRef: paymentData.reference,
    paystackData: verificationResponse,
  };
};

export class PaymentService {
  static async processPayment(amount: number): Promise<void> {
    console.log(`Processing payment of $${amount}`);
  }

  static async validatePaymentDetails(paymentDetails: any): Promise<boolean> {
    console.log(
      `Validating payment details: ${JSON.stringify(paymentDetails)}`,
    );
    return true;
  }

  static async savePaymentRecord(
    userId: string,
    amount: number,
    status: string,
  ): Promise<void> {
    console.log(
      `Saving payment record for user ${userId} with amount $${amount} and status ${status}`,
    );
  }

  static async saveVerifiedPayment(
    verificationResponse: PaystackVerifiedPayload,
  ): Promise<any> {
    const paymentRecord = buildPaymentRecordFromPaystack(verificationResponse);

    if (!paymentRecord.bookingId) {
      throw new AppError(
        "Booking ID is missing from verified payment data",
        400,
      );
    }

    const client = await pgPool.connect();

    try {
      await client.query("BEGIN");
      await client.query(
        "ALTER TABLE payments ADD COLUMN IF NOT EXISTS paystack_data JSONB",
      );

      const existingPayment = await client.query(
        "SELECT id FROM payments WHERE transaction_ref = $1",
        [paymentRecord.transactionRef],
      );

      if (existingPayment.rows[0]) {
        await client.query("COMMIT");
        return existingPayment.rows[0];
      }

      const bookingResult = await client.query(
        "SELECT status FROM bookings WHERE id = $1",
        [paymentRecord.bookingId],
      );
      const previousStatus = bookingResult.rows[0]?.status ?? null;
      const bookingStatus =
        paymentRecord.status === "paid" ? "confirmed" : "pending_payment";

      const paymentResult = await client.query(
        `INSERT INTO payments (booking_id, amount, status, method, transaction_ref, paystack_data)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, booking_id, amount, status, transaction_ref`,
        [
          paymentRecord.bookingId,
          paymentRecord.amount,
          paymentRecord.status,
          paymentRecord.method,
          paymentRecord.transactionRef,
          paymentRecord.paystackData,
        ],
      );

      await client.query("UPDATE bookings SET status = $1 WHERE id = $2", [
        bookingStatus,
        paymentRecord.bookingId,
      ]);

      await client.query(
        `INSERT INTO booking_status_history (booking_id, old_status, new_status, changed_by)
         VALUES ($1, $2, $3, NULL)`,
        [paymentRecord.bookingId, previousStatus, bookingStatus],
      );

      await client.query("COMMIT");
      return paymentResult.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  static async refundPayment(amount: number): Promise<void> {
    console.log(`Refunding payment of $${amount}`);
  }

  static async getPaymentStatus(paymentId: string): Promise<string> {
    console.log(`Getting status for payment ID: ${paymentId}`);
    return "Payment status for ID: " + paymentId;
  }

  static async getUserTransactionHistory(userId: string): Promise<any[]> {
    console.log(`Getting transaction history for user ID: ${userId}`);
    return [{ userId }];
  }
}

export default PaymentService;
