import { Request, Response, NextFunction } from "express";
import logger from "../utils/winston";

interface HttpError extends Error {
  status?: number;
}

export const errorHandler = (
  err: HttpError,
  req: Request,
  res: Response,
  next: NextFunction,
) => {  
  logger.error(`Error: ${err.message}`, { stack: err.stack });
  res.status(err.status || 500).json({
    status: "error",
    message: err.message || "Internal Server Error",
  });
};
