import winston from "winston";


//@ts-ignore
import PostgresTransport from "winston-postgres-transport";
import dotenv from "dotenv";

dotenv.config();
const { combine, timestamp, json, errors, simple } = winston.format;

// 1. Core logger configured with safe transports only
export const logger = winston.createLogger({
  level: "info",
  format: combine(errors({ stack: true }), timestamp(), json()),
  defaultMeta: { service: "user-service" },
  transports: [
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

// 2. Function to safely attach Postgres AFTER tables are verified
export const connectDbLogging = () => {
  const dbTransport = new PostgresTransport({
    postgresUrl: process.env.DB_URL,
    tableName: "logs",
    config: {
      ssl: "require",
    },
  });

  dbTransport.on("error", (err: Error) => {
    console.error("Winston DB Transport Error: ", err.message);
  });

  logger.add(dbTransport);
  logger.info("Winston PostgreSQL logging transport attached active.");
  logger.info("Database logging initialized", {service: "db-service"});
};

export default logger;
