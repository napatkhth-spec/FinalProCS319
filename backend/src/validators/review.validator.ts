import { z } from 'zod';

export const createReviewSchema = z
  .object({
    productId: z.uuid(),
    rating: z.number().int().min(1).max(5),
    comment: z.string().trim().max(2000).nullable().optional(),
  })
  .strict();

export const updateReviewSchema = z
  .object({
    rating: z.number().int().min(1).max(5).optional(),
    comment: z.string().trim().max(2000).nullable().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required');

export const reviewQuerySchema = z.object({ productId: z.uuid() }).strict();
export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;
