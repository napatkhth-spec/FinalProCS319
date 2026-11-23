import { z } from 'zod';
import { THAI_PROVINCES } from '../constants/thai-provinces.js';

function isValidThaiNationalId(value: string) {
  if (!/^\d{13}$/.test(value)) return false;
  const sum = [...value.slice(0, 12)].reduce(
    (total, digit, index) => total + Number(digit) * (13 - index),
    0,
  );
  return Number(value[12]) === (11 - (sum % 11)) % 10;
}

const phoneSchema = z
  .string()
  .trim()
  .regex(/^0[0-9]{8,9}$/, 'กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง');

const nationalIdSchema = z.string().trim().refine(isValidThaiNationalId, 'กรุณากรอกเลขบัตรประชาชนให้ถูกต้อง');

export const createFarmerProfileSchema = z
  .object({
    shopName: z.string().trim().min(1).max(120),
    contactPhone: phoneSchema,
    nationalId: nationalIdSchema,
    description: z.string().trim().max(2000).optional(),
    farmAddress: z.string().trim().max(500).optional(),
    province: z.enum(THAI_PROVINCES),
    profileImage: z.string().url().optional(),
  })
  .strict();

export const updateFarmerProfileSchema = createFarmerProfileSchema
  .omit({ contactPhone: true, nationalId: true })
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required');

export type CreateFarmerProfileInput = z.infer<typeof createFarmerProfileSchema>;
export type UpdateFarmerProfileInput = z.infer<typeof updateFarmerProfileSchema>;
