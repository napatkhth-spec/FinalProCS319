import { Router } from 'express'
import { createOrderHandler, getOrderHandler, listOrdersHandler, updateOrderStatusHandler } from '../controllers/order.controller.js'
import { requireAccessToken, requireRoles } from '../middlewares/auth.middleware.js'
import { validateBody } from '../middlewares/validate.middleware.js'
import { createOrderSchema, updateOrderStatusSchema } from '../validators/order.validator.js'

export const orderRouter = Router()

orderRouter.use(requireAccessToken)
orderRouter.get('/', requireRoles('BUYER', 'FARMER', 'ADMIN'), listOrdersHandler)
orderRouter.get('/:id', requireRoles('BUYER', 'FARMER', 'ADMIN'), getOrderHandler)
orderRouter.post('/', requireRoles('BUYER'), validateBody(createOrderSchema), createOrderHandler)
orderRouter.patch('/:id/status', requireRoles('BUYER', 'FARMER', 'ADMIN'), validateBody(updateOrderStatusSchema), updateOrderStatusHandler)
