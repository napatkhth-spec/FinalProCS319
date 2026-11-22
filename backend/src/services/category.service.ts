import { Prisma } from '../generated/prisma/client.js';
import { prisma } from '../config/database.js';
import { HttpError } from '../utils/http-error.js';
import type { CreateCategoryInput, UpdateCategoryInput } from '../validators/category.validator.js';

const categoryInclude = {
  parent: { select: { id: true, name: true } },
  _count: { select: { children: true, products: true } },
} satisfies Prisma.CategoryInclude;

function mapCategoryError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    throw new HttpError(409, 'A category with this name already exists');
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
    throw new HttpError(400, 'The selected parent category is not available');
  }
  throw error;
}

export async function listCategories() {
  return prisma.category.findMany({
    orderBy: { name: 'asc' },
    include: categoryInclude,
  });
}

export async function getCategory(id: string) {
  const category = await prisma.category.findUnique({ where: { id }, include: categoryInclude });
  if (!category) throw new HttpError(404, 'Category not found');
  return category;
}

export async function createCategory(input: CreateCategoryInput) {
  try {
    return await prisma.category.create({
      data: { ...input, imageUrl: input.imageUrl || null },
      include: categoryInclude,
    });
  } catch (error) {
    mapCategoryError(error);
  }
}

export async function updateCategory(id: string, input: UpdateCategoryInput) {
  try {
    if (input.parentId === id) throw new HttpError(400, 'A category cannot be its own parent');
    return await prisma.category.update({
      where: { id },
      data: { ...input, ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl || null } : {}) },
      include: categoryInclude,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new HttpError(404, 'Category not found');
    }
    mapCategoryError(error);
  }
}

export async function deleteCategory(id: string) {
  const category = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { children: true, products: true } } },
  });
  if (!category) throw new HttpError(404, 'Category not found');
  if (category._count.children > 0 || category._count.products > 0) {
    throw new HttpError(409, 'A category with products or child categories cannot be deleted');
  }
  await prisma.category.delete({ where: { id } });
}
