import { z } from 'zod'

const categoryFields = {
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).nullable().optional(),
  imageUrl: z.union([z.string().url(), z.literal('')]).nullable().optional(),
  parentId: z.uuid().nullable().optional(),
}

export const createCategorySchema = z.object(categoryFields).strict()
export const updateCategorySchema = z.object(categoryFields).partial().strict()
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required')
export type CreateCategoryInput = z.infer<typeof createCategorySchema>
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>
