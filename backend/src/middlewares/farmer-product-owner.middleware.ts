import type { RequestHandler } from 'express'
import { prisma } from '../config/database.js'
import { HttpError } from '../utils/http-error.js'

export const requireFarmerProductOwner: RequestHandler = async (request, _response, next) => {
  const user = request.appUser
  if (!user) return next(new HttpError(401, 'Authentication is required'))
  const productId = request.params.id
  if (typeof productId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(productId)) {
    return next(new HttpError(400, 'Invalid product id'))
  }

  const product = await prisma.product.findFirst({
    where: { id: productId, farmer: { is: { userId: user.id } } },
    select: { id: true },
  })
  if (!product) return next(new HttpError(404, 'Product not found'))
  next()
}
