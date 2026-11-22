import { z } from 'zod';
import { THAI_PROVINCES } from '../constants/thai-provinces.js';

export const createFarmerProfileSchema = z
  .object({
    shopName: z.string().trim().min(1).max(120),
    description: z.string().trim().max(2000).optional(),
    farmAddress: z.string().trim().max(500).optional(),
    province: z.enum(THAI_PROVINCES),
    profileImage: z.string().url().optional(),
  })
  .strict();

export const updateFarmerProfileSchema = createFarmerProfileSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required');

export type CreateFarmerProfileInput = z.infer<typeof createFarmerProfileSchema>;
export type UpdateFarmerProfileInput = z.infer<typeof updateFarmerProfileSchema>;
