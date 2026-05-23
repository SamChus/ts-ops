import { transporter } from "../services/emailService";

export const verifySTMP = async (): Promise<void> => {
  try {
    await transporter.verify();
    console.log("Server is ready to take our messages");
  } catch (err) {
    console.error("Verification failed:", err);
  }
};
