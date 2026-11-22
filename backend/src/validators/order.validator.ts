import { OrderStatus, PaymentMethod } from '../generated/prisma/enums.js'
import { z } from 'zod'

const itemsSchema = z.array(z.object({
  productId: z.uuid(),
  quantity: z.number().int().min(1).max(1000),
}).strict()).min(1).max(50).refine(
  (items) => new Set(items.map(({ productId }) => productId)).size === items.length,
  'Each product may appear only once',
)

export const createOrderSchema = z.object({
  addressId: z.uuid(),
  items: itemsSchema,
  paymentMethod: z.enum(PaymentMethod),
  shippingFee: z.number().finite().min(0).max(99_999.99).default(0),
  note: z.string().trim().max(1000).nullable().optional(),
}).strict()

export const updateOrderStatusSchema = z.object({
  status: z.enum(OrderStatus),
}).strict()

export type CreateOrderInput = z.infer<typeof createOrderSchema>
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>
