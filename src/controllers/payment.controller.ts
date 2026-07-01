import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import AppError from "../utils/appError";
import paystackApi, { InitializePaymentArgs, VerifyPaymentResponse } from "../utils/api/paystackApi";

export const initializePayment = async (req: Request, res: Response) => {
  //destructure request
  const { email, name, amount, callbackUrl } = req.body;
  //validate user input/request
  if (!email || !name || !amount || !callbackUrl) {
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
    },
  };

  //call endpoint
  const result = await paystackApi.initializePayment(paymentData);
  //response
  res.status(StatusCodes.OK).json(result)
};


export const verifyPayment = async (req:Request, res:Response) => {
  //Get ref from query
  const {reference} = req.query
  
  if (!reference) {
    throw new AppError("Refrence is missing", StatusCodes.BAD_REQUEST)
  }
  //Call enpoint

  const response:VerifyPaymentResponse | null = await paystackApi.verifyPayment(reference as string)
  //response
  res.status(StatusCodes.OK).json(response)
}