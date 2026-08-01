import Joi from "joi";


export const registerSchema = Joi.object({
    name: Joi.string().min(3).max(30).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    phone: Joi.string().min(10).max(15).required(),
    role: Joi.string()
})

export const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
})



export function validateRegister(data: any) {
    return registerSchema.validate(data)
}

export function validateLogin(data: any) {
    return loginSchema.validate(data)
}

