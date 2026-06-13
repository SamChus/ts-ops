import nodemailer from "nodemailer";

// Create a transporter using SMTP
export const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // use SSL/TLS
  auth: {
    user: process.env.SMTP_USER || "samuelchigo55@gmail.com",
    pass: process.env.SMTP_PASS || "zuom xjxw vwqk zses",
  },
});

export const sendEmail = async (
  to: string,
  subject: string,
    text: string,
    html?: string
): Promise<void> => {
  const mailOptions = {
    from: process.env.SMTP_USER || "test@gmail.com",
    to,
    subject,
    text,
    html,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Email sent successfully");
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};
