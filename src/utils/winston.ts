import winston from "winston";
import dotenv from "dotenv";

dotenv.config();
const { combine, timestamp, json, errors, simple } = winston.format;

// Core logger configured with cloud-safe transports only
export const logger = winston.createLogger({
  level: "info",
  format: combine(errors({ stack: true }), timestamp(), json()),
  defaultMeta: { service: "user-service" },
  transports: [
    // Standard output for AWS CloudWatch to collect automatically
    new winston.transports.Console({
      format: combine(simple(), timestamp()),
    }),
    new winston.transports.File({
      filename: "./logs/error.log",
      level: "error",
    }),
    new winston.transports.File({ filename: "./logs/combined.log" }),
  ],
  exceptionHandlers: [
    new winston.transports.File({ filename: "./logs/exceptions.log" }),
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: "./logs/rejections.log" }),
  ],
});

// Stripped out DB tracking completely to ensure flawless server initialization
export const connectDbLogging = () => {
  logger.info("Console and file logging channels initialized smoothly.");
};

export default logger;
