import wiston from "winston";

const { combine, timestamp, json, errors, simple } = wiston.format;

const logger = wiston.createLogger({
  level: "info",
  format: combine(errors({ stack: true }), timestamp(), json()),
  defaultMeta: { service: "user-service" },
  transports: [
    new wiston.transports.Console({
      format: combine(simple(), timestamp()),
    }),
    new wiston.transports.File({
      filename: "./logs/error.log",
      level: "error",
    }),
    new wiston.transports.File({ filename: "./logs/combined.log" }),
  ],
  exceptionHandlers: [
    new wiston.transports.File({ filename: "./logs/exceptions.log" }),
  ],
  rejectionHandlers: [
    new wiston.transports.File({ filename: "./logs/rejections.log" }),
  ],
});


export default logger;
