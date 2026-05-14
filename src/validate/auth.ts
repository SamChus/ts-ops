import Joi from "joi";


export const registerSchema = Joi.object({
    name: Joi.string().min(3).max(30).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    balance: Joi.number().min(0).required(),
})

export const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
})

export const transferSchema = Joi.object({
    receiverId: Joi.number().required(),
    amount: Joi.number().min(0).required(),
})

export function validateRegister(data: any) {
    return registerSchema.validate(data)
}

export function validateLogin(data: any) {
    return loginSchema.validate(data)
}

export function validateTransfer(data: any) {
    return transferSchema.validate(data)
}