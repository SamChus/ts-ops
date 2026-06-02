

//means - This file defines a custom error class called AppError that extends the built-in Error class in JavaScript. It includes additional properties for statusCode and isOperational to provide more context about the error. The constructor takes a message and a status code, sets the properties, and captures the stack trace for better debugging. This class can be used throughout the application to create consistent error objects that can be handled by a global error handler, allowing for better error management and response formatting in an Express.js application.

class AppError extends Error {
  public readonly statusCode: number
    public readonly isOperational: boolean
    

    constructor(message: string, statusCode: number) {
        super(message)
        this.statusCode = statusCode
        this.isOperational = true
        Error.captureStackTrace(this, this.constructor)
    }
}

export default AppError
