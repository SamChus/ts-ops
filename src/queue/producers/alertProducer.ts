import type { Request, Response, NextFunction } from "express";
import { amqpManager } from "../../config/amqp";
import logger from "../../utils/winston";
import { LoginRequest } from "../../types";
import AppError from "../../utils/appError";

  export const loginAlart = async (req: Request) => {
    try {
     const { email } = req.body

     if (!email) throw new AppError("No email provided", 400)
      
      const channel = await amqpManager.createChannel();
      const queueName = "email_queue";
      await channel.assertQueue(queueName, { durable: true });

      const userAgent = req.headers["user-agent"] || "Unknown Device";
      const clientIp = req.ip || req.headers["x-forwarded-for"] || "127.0.0.1";

      const payload = {
        emailType: "LOGIN_DETECTED",
        recipient: email,
        metadata: {
          device: userAgent,
          ip: clientIp,
          time: new Date().toISOString(),
        },
      };

      channel.sendToQueue(queueName, Buffer.from(JSON.stringify(payload)), {
        persistent: true,
      });
      await channel.close();
    } catch (error) {
      logger.error("Failed to dispatch login alert event to AMQP:", error);
    }
  }

  export const welcomEmail = async (req: Request) => {
    try {
      const { email, name } = req.body
      const channel = await amqpManager.createChannel();
      const queueName = "email_queue";
      await channel.assertQueue(queueName, { durable: true });

      const payload = {
        emailType: "WELCOME_EMAIL",
        recipient: email,
        metadata: { name, time: new Date().toISOString() },
      };

      channel.sendToQueue(queueName, Buffer.from(JSON.stringify(payload)), {
        persistent: true,
      });
      await channel.close();
    } catch (ex) {
      logger.error("Failed to dispatch message to broker queue:", ex);
    }
  };
  