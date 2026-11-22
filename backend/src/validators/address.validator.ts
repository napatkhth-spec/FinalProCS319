import { z } from 'zod'

const addressFields = {
  recipientName: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(7).max(32),
  addressLine: z.string().trim().min(1).max(300),
  subDistrict: z.string().trim().min(1).max(120),
  district: z.string().trim().min(1).max(120),
  province: z.string().trim().min(1).max(120),
  postalCode: z.string().trim().min(3).max(12),
  isDefault: z.boolean().optional(),
}

export const createAddressSchema = z.object(addressFields).strict()
export const updateAddressSchema = z.object(addressFields).partial().strict()
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required')
export type CreateAddressInput = z.infer<typeof createAddressSchema>
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>
