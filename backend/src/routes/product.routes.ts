import { Router } from 'express'
import { archiveProductHandler, createProductHandler, deleteProductImageHandler, getProductHandler, listMyProductsHandler, listProductsHandler, setPrimaryProductImageHandler, updateProductHandler, uploadProductImagesHandler } from '../controllers/product.controller.js'
import { requireAccessToken, requireApprovedFarmer, requireRoles } from '../middlewares/auth.middleware.js'
import { requireFarmerProductOwner } from '../middlewares/farmer-product-owner.middleware.js'
import { parseProductImages } from '../middlewares/product-image-upload.middleware.js'
import { validateBody } from '../middlewares/validate.middleware.js'
import { createProductSchema, updateProductSchema } from '../validators/product.validator.js'

export const productRouter = Router()

productRouter.get('/', listProductsHandler)
productRouter.get('/mine', requireAccessToken, requireRoles('FARMER'), listMyProductsHandler)
productRouter.get('/:id', getProductHandler)
productRouter.post('/:id/images', requireAccessToken, requireRoles('FARMER'), requireApprovedFarmer, requireFarmerProductOwner, parseProductImages, uploadProductImagesHandler)
productRouter.patch('/:id/images/:imageId/primary', requireAccessToken, requireRoles('FARMER'), requireApprovedFarmer, setPrimaryProductImageHandler)
productRouter.delete('/:id/images/:imageId', requireAccessToken, requireRoles('FARMER'), requireApprovedFarmer, deleteProductImageHandler)
productRouter.post('/', requireAccessToken, requireRoles('FARMER'), requireApprovedFarmer, validateBody(createProductSchema), createProductHandler)
productRouter.patch('/:id', requireAccessToken, requireRoles('FARMER'), requireApprovedFarmer, validateBody(updateProductSchema), updateProductHandler)
productRouter.delete('/:id', requireAccessToken, requireRoles('FARMER'), requireApprovedFarmer, archiveProductHandler)
