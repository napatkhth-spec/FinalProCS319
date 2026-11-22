import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { prisma } from '../config/database.js'
import { listProducts } from '../services/product.service.js'
import { productQuerySchema } from '../validators/product.validator.js'

const originalProduct = Object.getOwnPropertyDescriptor(prisma, 'product')
const originalTransaction = Object.getOwnPropertyDescriptor(prisma, '$transaction')
let findManyArgs: any
let countArgs: any

Object.defineProperty(prisma, 'product', {
  configurable: true,
  value: {
    findMany: async (args: any) => { findManyArgs = args; return [] },
    count: async (args: any) => { countArgs = args; return 0 },
  },
})
Object.defineProperty(prisma, '$transaction', {
  configurable: true,
  value: async (operations: Promise<unknown>[]) => Promise.all(operations),
})

after(() => {
  if (originalProduct) Object.defineProperty(prisma, 'product', originalProduct)
  if (originalTransaction) Object.defineProperty(prisma, '$transaction', originalTransaction)
})

test('product query accepts only the 77 configured Thai province names', () => {
  assert.equal(productQuerySchema.safeParse({ province: 'เชียงใหม่' }).success, true)
  assert.equal(productQuerySchema.safeParse({ province: 'จังหวัดสมมติ' }).success, false)
})

test('product query applies province, search, and category before pagination', async () => {
  const categoryId = 'fa3e32e2-bcc4-4c8e-b0b1-a7f1a77c9f42'
  const filters = productQuerySchema.parse({ province: 'เชียงใหม่', search: 'มะเขือเทศ', categoryId, page: '2', pageSize: '8' })
  const result = await listProducts(filters)

  assert.deepEqual(result.items, [])
  assert.equal(result.pagination.total, 0)
  assert.equal(findManyArgs.where.farmer.is.province, 'เชียงใหม่')
  assert.equal(findManyArgs.where.categoryId, categoryId)
  assert.deepEqual(findManyArgs.where.name, { contains: 'มะเขือเทศ', mode: 'insensitive' })
  assert.deepEqual(countArgs.where, findManyArgs.where)
  assert.equal(findManyArgs.skip, 8)
  assert.equal(findManyArgs.take, 8)
})
