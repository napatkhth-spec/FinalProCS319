import { Router } from 'express';
import {
  createCategoryHandler,
  deleteCategoryHandler,
  getCategoryHandler,
  listCategoriesHandler,
  updateCategoryHandler,
} from '../controllers/category.controller.js';
import { requireAccessToken, requireRoles } from '../middlewares/auth.middleware.js';
import { validateBody } from '../middlewares/validate.middleware.js';
import { createCategorySchema, updateCategorySchema } from '../validators/category.validator.js';

export const categoryRouter = Router();

categoryRouter.get('/', listCategoriesHandler);
categoryRouter.get('/:id', getCategoryHandler);
categoryRouter.post(
  '/',
  requireAccessToken,
  requireRoles('ADMIN'),
  validateBody(createCategorySchema),
  createCategoryHandler,
);
categoryRouter.patch(
  '/:id',
  requireAccessToken,
  requireRoles('ADMIN'),
  validateBody(updateCategorySchema),
  updateCategoryHandler,
);
categoryRouter.delete('/:id', requireAccessToken, requireRoles('ADMIN'), deleteCategoryHandler);
