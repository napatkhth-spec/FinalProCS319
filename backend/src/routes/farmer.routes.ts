import { Router } from 'express';
import {
  approveFarmer,
  getMyFarmerProfile,
  listPendingFarmers,
  openFarmerShop,
  updateMyFarmerProfile,
} from '../controllers/farmer.controller.js';
import { requireAccessToken, requireRoles } from '../middlewares/auth.middleware.js';
import { validateBody } from '../middlewares/validate.middleware.js';
import { createFarmerProfileSchema, updateFarmerProfileSchema } from '../validators/farmer.validator.js';

export const farmerRouter = Router();

farmerRouter.get('/profile', requireAccessToken, getMyFarmerProfile);
farmerRouter.get('/admin/pending', requireAccessToken, requireRoles('ADMIN'), listPendingFarmers);
farmerRouter.patch('/admin/:id/approve', requireAccessToken, requireRoles('ADMIN'), approveFarmer);
farmerRouter.post(
  '/profile',
  requireAccessToken,
  requireRoles('BUYER', 'FARMER'),
  validateBody(createFarmerProfileSchema),
  openFarmerShop,
);
farmerRouter.patch(
  '/profile',
  requireAccessToken,
  requireRoles('FARMER'),
  validateBody(updateFarmerProfileSchema),
  updateMyFarmerProfile,
);
