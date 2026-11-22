import type { RequestHandler } from 'express';
import {
  createProduct,
  archiveProduct,
  getProduct,
  listMyProducts,
  listProducts,
  updateProduct,
} from '../services/product.service.js';
import {
  productQuerySchema,
  type CreateProductInput,
  type UpdateProductInput,
} from '../validators/product.validator.js';
import { HttpError } from '../utils/http-error.js';
import {
  deleteProductImage,
  getProductImage,
  setPrimaryProductImage,
  uploadProductImages,
} from '../services/product-image.service.js';

function parseId(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  ) {
    throw new HttpError(400, 'Invalid product id');
  }
  return value;
}

export const listProductsHandler: RequestHandler = async (request, response) => {
  const parsed = productQuerySchema.safeParse(request.query);
  if (!parsed.success) throw new HttpError(400, 'Invalid product filters');
  response.json({ success: true, data: await listProducts(parsed.data) });
};

export const listMyProductsHandler: RequestHandler = async (request, response) => {
  if (!request.appUser) throw new HttpError(401, 'Authentication is required');
  response.json({ success: true, data: await listMyProducts(request.appUser.id) });
};

export const getProductHandler: RequestHandler = async (request, response) => {
  response.json({ success: true, data: await getProduct(parseId(request.params.id)) });
};

export const createProductHandler: RequestHandler = async (request, response) => {
  if (!request.appUser) throw new HttpError(401, 'Authentication is required');
  response.status(201).json({
    success: true,
    data: await createProduct(request.appUser.id, request.body as CreateProductInput),
  });
};

export const updateProductHandler: RequestHandler = async (request, response) => {
  if (!request.appUser) throw new HttpError(401, 'Authentication is required');
  response.json({
    success: true,
    data: await updateProduct(
      request.appUser.id,
      parseId(request.params.id),
      request.body as UpdateProductInput,
    ),
  });
};

export const archiveProductHandler: RequestHandler = async (request, response) => {
  if (!request.appUser) throw new HttpError(401, 'Authentication is required');
  response.json({
    success: true,
    data: await archiveProduct(request.appUser.id, parseId(request.params.id)),
  });
};

export const uploadProductImagesHandler: RequestHandler = async (request, response) => {
  if (!request.appUser) throw new HttpError(401, 'Authentication is required');
  const files = request.files as Express.Multer.File[] | undefined;
  const rawPrimaryIndex = request.body?.primaryIndex;
  const primaryIndex =
    rawPrimaryIndex === undefined || rawPrimaryIndex === '' ? undefined : Number(rawPrimaryIndex);
  response.status(201).json({
    success: true,
    data: await uploadProductImages(
      request.appUser.id,
      parseId(request.params.id),
      files ?? [],
      primaryIndex,
    ),
  });
};

export const getProductImageHandler: RequestHandler = async (request, response) => {
  const image = await getProductImage(parseId(request.params.id), parseId(request.params.imageId));
  response.setHeader('Content-Type', image.mimeType);
  response.setHeader('Content-Length', image.fileSize);
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Cache-Control', 'public, max-age=3600');
  response.send(image.imageData);
};

export const deleteProductImageHandler: RequestHandler = async (request, response) => {
  if (!request.appUser) throw new HttpError(401, 'Authentication is required');
  response.json({
    success: true,
    data: await deleteProductImage(
      request.appUser.id,
      parseId(request.params.id),
      parseId(request.params.imageId),
    ),
  });
};

export const setPrimaryProductImageHandler: RequestHandler = async (request, response) => {
  if (!request.appUser) throw new HttpError(401, 'Authentication is required');
  response.json({
    success: true,
    data: await setPrimaryProductImage(
      request.appUser.id,
      parseId(request.params.id),
      parseId(request.params.imageId),
    ),
  });
};
