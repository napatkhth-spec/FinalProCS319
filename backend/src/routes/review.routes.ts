import { Router } from 'express'
import { createReviewHandler, deleteReviewHandler, listProductReviewsHandler, updateReviewHandler } from '../controllers/review.controller.js'
import { requireAccessToken, requireRoles } from '../middlewares/auth.middleware.js'
import { validateBody } from '../middlewares/validate.middleware.js'
import { createReviewSchema, updateReviewSchema } from '../validators/review.validator.js'

export const reviewRouter = Router()

reviewRouter.get('/', listProductReviewsHandler)
reviewRouter.post('/', requireAccessToken, requireRoles('BUYER'), validateBody(createReviewSchema), createReviewHandler)
reviewRouter.patch('/:id', requireAccessToken, requireRoles('BUYER'), validateBody(updateReviewSchema), updateReviewHandler)
reviewRouter.delete('/:id', requireAccessToken, requireRoles('BUYER'), deleteReviewHandler)
