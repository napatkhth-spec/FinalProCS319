import { z } from 'zod'

const emailSchema = z.string().trim().max(254).pipe(z.email()).transform((email) => email.toLowerCase())
const passwordSchema = z.string().min(12).max(128)

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  fullName: z.string().trim().min(1).max(120),
}).strict()

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
}).strict()

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
