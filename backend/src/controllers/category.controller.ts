import type { RequestHandler } from 'express'
import { createCategory, deleteCategory, getCategory, listCategories, updateCategory } from '../services/category.service.js'
import type { CreateCategoryInput, UpdateCategoryInput } from '../validators/category.validator.js'
import { HttpError } from '../utils/http-error.js'

function categoryId(value: unknown): string {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new HttpError(400, 'Invalid category id')
  }
  return value
}

export const listCategoriesHandler: RequestHandler = async (_request, response) => {
  response.json({ success: true, data: await listCategories() })
}

export const getCategoryHandler: RequestHandler = async (request, response) => {
  response.json({ success: true, data: await getCategory(categoryId(request.params.id)) })
}

export const createCategoryHandler: RequestHandler = async (request, response) => {
  response.status(201).json({ success: true, data: await createCategory(request.body as CreateCategoryInput) })
}

export const updateCategoryHandler: RequestHandler = async (request, response) => {
  response.json({ success: true, data: await updateCategory(categoryId(request.params.id), request.body as UpdateCategoryInput) })
}

export const deleteCategoryHandler: RequestHandler = async (request, response) => {
  await deleteCategory(categoryId(request.params.id))
  response.json({ success: true })
}
