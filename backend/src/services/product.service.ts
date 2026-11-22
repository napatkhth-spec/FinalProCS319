import { Prisma } from '../generated/prisma/client.js'
import { FarmerVerificationStatus, ProductStatus } from '../generated/prisma/enums.js'
import { prisma } from '../config/database.js'
import { HttpError } from '../utils/http-error.js'
import type { CreateProductInput, ProductQueryInput, UpdateProductInput } from '../validators/product.validator.js'

const productInclude = {
  category: { select: { id: true, name: true } },
  farmer: { select: { id: true, shopName: true, province: true } },
  images: { orderBy: { sortOrder: 'asc' as const } },
  _count: { select: { reviews: true } },
} satisfies Prisma.ProductInclude

function mapProductError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    throw new HttpError(409, 'The product SKU is already in use')
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
    throw new HttpError(400, 'The selected category is not available')
  }
  throw error
}

export async function listProducts(query: ProductQueryInput) {
  const where: Prisma.ProductWhereInput = {
    status: { in: [ProductStatus.ACTIVE, ProductStatus.OUT_OF_STOCK] },
    ...(query.categoryId ? { categoryId: query.categoryId } : {}),
    ...(query.farmerId ? { farmerId: query.farmerId } : {}),
    ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
    ...(query.province ? { farmer: { is: { province: query.province } } } : {}),
  }
  const [items, total] = await prisma.$transaction([
    prisma.product.findMany({
      where,
      include: productInclude,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.product.count({ where }),
  ])
  return { items, pagination: { page: query.page, pageSize: query.pageSize, total } }
}

export async function listMyProducts(userId: string) {
  const profile = await prisma.farmerProfile.findUnique({ where: { userId }, select: { id: true } })
  if (!profile) throw new HttpError(404, 'Farmer profile not found')
  return prisma.product.findMany({
    where: { farmerId: profile.id },
    include: productInclude,
    orderBy: { updatedAt: 'desc' },
  })
}

export async function getProduct(id: string) {
  const product = await prisma.product.findFirst({
    where: { id, status: { not: ProductStatus.INACTIVE } },
    include: productInclude,
  })
  if (!product) throw new HttpError(404, 'Product not found')
  return product
}

async function approvedFarmerId(userId: string): Promise<string> {
  const profile = await prisma.farmerProfile.findUnique({
    where: { userId },
    select: { id: true, verificationStatus: true },
  })
  if (!profile || profile.verificationStatus !== FarmerVerificationStatus.APPROVED) {
    throw new HttpError(403, 'An approved farmer profile is required to manage products')
  }
  return profile.id
}

export async function createProduct(userId: string, input: CreateProductInput) {
  const farmerId = await approvedFarmerId(userId)
  try {
    const { sku, ...fields } = input
    return await prisma.product.create({
      data: { ...fields, sku: sku || null, farmerId },
      include: productInclude,
    })
  } catch (error) {
    mapProductError(error)
  }
}

export async function updateProduct(userId: string, id: string, input: UpdateProductInput) {
  const farmerId = await approvedFarmerId(userId)
  const existing = await prisma.product.findFirst({ where: { id, farmerId }, select: { id: true } })
  if (!existing) throw new HttpError(404, 'Product not found')
  const { sku, ...fields } = input
  try {
    return await prisma.product.update({
      where: { id },
      data: { ...fields, ...(sku !== undefined ? { sku: sku || null } : {}) },
      include: productInclude,
    })
  } catch (error) {
    mapProductError(error)
  }
}

export async function archiveProduct(userId: string, id: string) {
  const farmerId = await approvedFarmerId(userId)
  const result = await prisma.product.updateMany({
    where: { id, farmerId },
    data: { status: ProductStatus.INACTIVE },
  })
  if (result.count === 0) throw new HttpError(404, 'Product not found')
  return { id, status: ProductStatus.INACTIVE }
}
