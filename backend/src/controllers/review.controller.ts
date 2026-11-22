import type { RequestHandler } from 'express'
import { createReview, deleteReview, listProductReviews, updateReview } from '../services/review.service.js'
import { reviewQuerySchema, type CreateReviewInput, type UpdateReviewInput } from '../validators/review.validator.js'
import { HttpError } from '../utils/http-error.js'

function reviewId(value: unknown): string {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new HttpError(400, 'Invalid review id')
  }
  return value
}

export const listProductReviewsHandler: RequestHandler = async (request, response) => {
  const query = reviewQuerySchema.safeParse(request.query)
  if (!query.success) throw new HttpError(400, 'A valid productId is required')
  response.json({ success: true, data: await listProductReviews(query.data.productId) })
}

export const createReviewHandler: RequestHandler = async (request, response) => {
  if (!request.appUser) throw new HttpError(401, 'Authentication is required')
  response.status(201).json({ success: true, data: await createReview(request.appUser.id, request.body as CreateReviewInput) })
}

export const updateReviewHandler: RequestHandler = async (request, response) => {
  if (!request.appUser) throw new HttpError(401, 'Authentication is required')
  response.json({ success: true, data: await updateReview(request.appUser.id, reviewId(request.params.id), request.body as UpdateReviewInput) })
}

export const deleteReviewHandler: RequestHandler = async (request, response) => {
  if (!request.appUser) throw new HttpError(401, 'Authentication is required')
  await deleteReview(request.appUser.id, reviewId(request.params.id))
  response.json({ success: true })
}
