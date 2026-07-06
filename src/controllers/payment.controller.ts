import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import AppError from "../utils/appError";
import paystackApi, {
  InitializePaymentArgs,
  VerifyPaymentResponse,
} from "../utils/api/paystackApi";
import { amqpManager } from "../config/amqp";
import { PaymentConfirmedMessage } from "../types";
import crypto from "crypto";
import PaymentService from "../services/payment.service";

export const initializePayment = async (req: Request, res: Response) => {
  //destructure request
  const { email, name, amount, callbackUrl, bookingId } = req.body;
  //validate user input/request
  if (!email || !name || !amount || !callbackUrl || !bookingId) {
    throw new AppError("All Fields Are Required", 400);
  }

  const paymentData: InitializePaymentArgs = {
    amount,
    email,
    callback_url: callbackUrl,
    metadata: {
      amount,
      email,
      name,
      bookingId,
    },
  };

  //call endpoint
  const result = await paystackApi.initializePayment(paymentData);
  //response
  res.status(StatusCodes.OK).json(result);
};

export const verifyPayment = async (req: Request, res: Response) => {
  //Get ref from query
  const { reference } = req.query;

  if (!reference) {
    throw new AppError("Refrence is missing", StatusCodes.BAD_REQUEST);
  }
  //Call enpoint

  const response: VerifyPaymentResponse | null =
    await paystackApi.verifyPayment(reference as string);

  if (response) {
    await PaymentService.saveVerifiedPayment(response);
  }

  //response
  res.status(StatusCodes.OK).json(response);
};

// export const handlePaymentWebhook = async (req: Request, res: Response): Promise<Response> => {
//   const event = req.body;

//   if (event.status === 'successful' || event.type === 'charge.success') {
//     const bookingId: string = event.metadata.booking_id;

//     const payload: PaymentConfirmedMessage = {
//       bookingId,
//       reference: event.reference || event.id,
//       timestamp: new Date().toISOString()
//     };

//     // Forward payload securely to RabbitMQ
//     const channel = await amqpManager.createChannel();

//     channel.sendToQueue(
//       'payment_confirmed_queue',
//       Buffer.from(JSON.stringify(payload)),
//       { persistent: true }
//     );

//     console.log(`[Payment Webhook] Published payment success for booking: ${bookingId}`);
//   }

//   // Always respond with 200 OK directly to the payment network gate
//   return res.status(200).json({ processed: true });
// };

export const handlePaystackWebhook = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    // 1. Get the signature from headers
    const hash = req.headers["x-paystack-signature"];
    const secret = process.env.PAYSTACK_SECRET_KEY || "YOUR_TEST_SECRET_KEY";

    if (!hash) {
      console.warn("[Webhook] Missing signature header");
      return res.status(400).json({ error: "No signature provided" });
    }

    // 2. Compute the HMAC signature using raw request body string
    // Note: Make sure express.json() parser doesn't mutate the raw string body

    // Inside handlePaystackWebhook controller:
    const computedHash = crypto
      .createHmac("sha512", secret)
      .update((req as any).rawBody) // Pure, untouched string bytes
      .digest("hex");

    console.log("--- PAYSTACK WEBHOOK DEBUG ---");
    console.log("Header Signature:", hash);
    console.log("Computed Signature:", computedHash);
    console.log("Raw Body Input:", (req as any).rawBody);
    console.log("------------------------------");

    // 3. Compare them securely
    if (hash !== computedHash) {
      console.error("[Webhook] Invalid signature match attempt!");
      return res.status(401).json({ error: "Unauthorized signature" });
    }

    // Signature verified! Process the event payload safely
    const event = req.body;
    console.log(`[Webhook] Event verified: ${event.event}`);

    // Paystack sends 'charge.success' when a card payment goes through
    if (event.event === "charge.success") {
      const bookingId = event.data.metadata?.bookingId;

      const payload = {
        bookingId,
        reference: event.data.reference,
        timestamp: new Date().toISOString(),
      };

      if (bookingId) {
        await PaymentService.saveVerifiedPayment({
          status: true,
          message: "Charge success verified via webhook",
          data: {
            reference: event.data.reference,
            amount: event.data.amount,
            status: event.data.status,
            metadata: {
              bookingId,
              email: event.data.customer?.email,
              name: event.data.customer?.first_name,
            },
          },
        });
      }

      // Push straight into RabbitMQ
      const channel = await amqpManager.createChannel();

      channel.sendToQueue(
        "payment_confirmed_queue",
        Buffer.from(JSON.stringify(payload)),
        { persistent: true },
      );

      console.log(`[Webhook] Sent booking ${bookingId} to RabbitMQ`);
    }

    // 4. Always respond to Paystack with 200 OK within 2 seconds
    return res.status(200).json({ status: "success" });
  } catch (error) {
    console.error("[Webhook Error]:", error);
    return res.status(500).json({ error: "Internal webhook loop failure" });
  }
};
