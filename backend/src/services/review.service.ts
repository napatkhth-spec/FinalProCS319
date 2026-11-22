import { Prisma } from '../generated/prisma/client.js'
import { ProductStatus } from '../generated/prisma/enums.js'
import { prisma } from '../config/database.js'
import { HttpError } from '../utils/http-error.js'
import type { CreateReviewInput, UpdateReviewInput } from '../validators/review.validator.js'

const reviewInclude = {
  user: { select: { id: true, fullName: true } },
} satisfies Prisma.ReviewInclude

export async function listProductReviews(productId: string) {
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } })
  if (!product) throw new HttpError(404, 'Product not found')
  return prisma.review.findMany({ where: { productId }, include: reviewInclude, orderBy: { createdAt: 'desc' } })
}

export async function createReview(userId: string, input: CreateReviewInput) {
  const product = await prisma.product.findFirst({
    where: { id: input.productId, status: { not: ProductStatus.INACTIVE } },
    select: { id: true },
  })
  if (!product) throw new HttpError(404, 'Product not found')
  try {
    return await prisma.review.create({
      data: { ...input, userId },
      include: reviewInclude,
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new HttpError(409, 'You have already reviewed this product')
    }
    throw error
  }
}

export async function updateReview(userId: string, id: string, input: UpdateReviewInput) {
  const result = await prisma.review.updateMany({ where: { id, userId }, data: input })
  if (result.count === 0) throw new HttpError(404, 'Review not found')
  return prisma.review.findUnique({ where: { id }, include: reviewInclude })
}

export async function deleteReview(userId: string, id: string) {
  const result = await prisma.review.deleteMany({ where: { id, userId } })
  if (result.count === 0) throw new HttpError(404, 'Review not found')
}
