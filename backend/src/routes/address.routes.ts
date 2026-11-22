import { Router } from 'express'
import { createAddressHandler, deleteAddressHandler, getAddressHandler, listAddressesHandler, updateAddressHandler } from '../controllers/address.controller.js'
import { requireAccessToken, requireRoles } from '../middlewares/auth.middleware.js'
import { validateBody } from '../middlewares/validate.middleware.js'
import { createAddressSchema, updateAddressSchema } from '../validators/address.validator.js'

export const addressRouter = Router()

addressRouter.use(requireAccessToken, requireRoles('BUYER'))
addressRouter.get('/', listAddressesHandler)
addressRouter.get('/:id', getAddressHandler)
addressRouter.post('/', validateBody(createAddressSchema), createAddressHandler)
addressRouter.patch('/:id', validateBody(updateAddressSchema), updateAddressHandler)
addressRouter.delete('/:id', deleteAddressHandler)
