import { ProductStatus } from '../generated/prisma/enums.js';
import { z } from 'zod';
import { THAI_PROVINCES } from '../constants/thai-provinces.js';

const skuSchema = z.union([z.string().trim().min(1).max(64), z.literal(''), z.null()]).optional();
const productFields = {
  categoryId: z.uuid(),
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(5000).nullable().optional(),
  sku: skuSchema,
  price: z.coerce.number().finite().positive().max(99_999_999.99),
  stock: z.coerce.number().int().min(0).max(1_000_000),
  unit: z.string().trim().min(1).max(32),
  status: z.enum(ProductStatus).optional(),
};

export const createProductSchema = z.object(productFields).strict();
export const updateProductSchema = z
  .object(productFields)
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required');

export const productQuerySchema = z
  .object({
    search: z.string().trim().max(120).optional(),
    categoryId: z.uuid().optional(),
    farmerId: z.uuid().optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(24),
    province: z.enum(THAI_PROVINCES).optional(),
  })
  .strict();

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductQueryInput = z.infer<typeof productQuerySchema>;
