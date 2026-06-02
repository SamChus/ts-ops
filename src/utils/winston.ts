import wiston from "winston";



const {combine, timestamp, json, errors} = wiston.format;

const logger = wiston.createLogger({
  level: "info",
  format: combine(errors({stack: true}), timestamp(), json()
  ),
  defaultMeta: { service: "user-service" },
  transports: [new wiston.transports.File({ filename: "./logs/error.log", level: "error" }),
  new wiston.transports.File({ filename: "./logs/combined.log" })],
  exceptionHandlers: [new wiston.transports.File({ filename: "./logs/exceptions.log" })],
  rejectionHandlers: [new wiston.transports.File({ filename: "./logs/rejections.log" })]
  
});


//.File({ filename: "error.log", level: "error" }),
//.File({ filename: "combined.log" }),
export default logger;