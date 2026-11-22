import type { RequestHandler } from 'express';
import { z } from 'zod';
import {
  approveFarmerProfile,
  createFarmerProfile,
  getFarmerProfile,
  listPendingFarmerProfiles,
  updateFarmerProfile,
} from '../services/farmer.service.js';
import type { CreateFarmerProfileInput, UpdateFarmerProfileInput } from '../validators/farmer.validator.js';
import { HttpError } from '../utils/http-error.js';

export const openFarmerShop: RequestHandler = async (request, response) => {
  const user = request.appUser;
  if (!user) throw new HttpError(401, 'Authentication is required');

  const result = await createFarmerProfile(user.id, request.body as CreateFarmerProfileInput);
  response.status(201).json({ success: true, data: result });
};

export const getMyFarmerProfile: RequestHandler = async (request, response) => {
  if (!request.appUser) throw new HttpError(401, 'Authentication is required');
  response.json({ success: true, data: await getFarmerProfile(request.appUser.id) });
};

export const updateMyFarmerProfile: RequestHandler = async (request, response) => {
  if (!request.appUser) throw new HttpError(401, 'Authentication is required');
  response.json({
    success: true,
    data: await updateFarmerProfile(request.appUser.id, request.body as UpdateFarmerProfileInput),
  });
};

export const listPendingFarmers: RequestHandler = async (_request, response) => {
  response.json({ success: true, data: await listPendingFarmerProfiles() });
};

export const approveFarmer: RequestHandler = async (request, response) => {
  const profileId = z.uuid().safeParse(request.params.id);
  if (!profileId.success) throw new HttpError(400, 'Invalid farmer profile id');
  response.json({ success: true, data: await approveFarmerProfile(profileId.data) });
};
