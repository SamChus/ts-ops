import logger from "../../utils/winston";
import { sendEmail } from "../../services/email.service";
import { generateEmailTemplate } from "../../utils/emailTemplate";
import { messageBroker } from "../messageBroker";

export async function EmailWorker() {
  console.log("🤖 Starting Email Worker initialization...");

  const channel = await messageBroker.createChannel();
  const queueName = "email_queue";

  await channel.assertQueue(queueName, { durable: true });
  channel.prefetch(1);

  logger.info("Email Worker listening for authentication emails...");

  channel.consume(queueName, async (msg) => {
    if (!msg) return;

    try {
      const { emailType, recipient, metadata } = JSON.parse(
        msg.content.toString(),
      );

      switch (emailType) {
        case "WELCOME_EMAIL":
          logger.info(
            `✉️ [WELCOME] Sending onboarding sequence to ${recipient}. Hello ${metadata.name}!`,
          );
          sendEmail(
            recipient,
            `Welcome to our platform, ${metadata.name}! 👋`,
            `Hi ${metadata.name},\n\nThank you for registering on our Mini AirBNB application! We are thrilled to have you here.\n\nBest regards,\nThe Team.`,
            `
            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
              <h2 style="color: #FF5A5F;">Welcome to Mini AirBNB, ${metadata.name}! 🏠</h2>
              <p>Thank you for registering on our platform. Your account is now active and ready.</p>
              <p>Start exploring beautiful apartments and planning your next stay today!</p>
              <br />
              <hr style="border: 0; border-top: 1px solid #eee;" />
              <p style="font-size: 12px; color: #888;">If you did not create this account, please ignore this email.</p>
            </div>
          `,
          );
          break;

        case "LOGIN_DETECTED":
          sendEmail(
            recipient,
            `LOGIN DETECTED`,
            `Hi ${metadata.name},\n\nThank you for registering on our Mini AirBNB application! We are thrilled to have you here.\n\nBest regards,\nThe Team.`,
            generateEmailTemplate(
              "Login Dectected",
              `⚠️ [SECURITY] Alerting ${recipient} of a new login from device: ${metadata.device} (IP: ${metadata.ip})`,
              "Click Here, If Not You!!",
            ),
          );
          logger.info(
            `⚠️ [SECURITY] Alerting ${recipient} of a new login from device: ${metadata.device} (IP: ${metadata.ip})`,
          );
          await new Promise((res) => setTimeout(res, 1000));
          break;

        default:
          logger.warn(`Unknown email type received: ${emailType}`);
      }

      logger.info(`Successfully dispatched ${emailType} for ${recipient}`);
      msg.ack();
    } catch (error) {
      logger.error("Error delivering email. Retrying...", error);
      msg.nack(false, true);
    }
  });
}
