import type { RequestHandler } from 'express';
import {
  createAddress,
  deleteAddress,
  getAddress,
  listAddresses,
  updateAddress,
} from '../services/address.service.js';
import type { CreateAddressInput, UpdateAddressInput } from '../validators/address.validator.js';
import { HttpError } from '../utils/http-error.js';

function addressId(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  ) {
    throw new HttpError(400, 'Invalid address id');
  }
  return value;
}

function currentUserId(request: Parameters<RequestHandler>[0]): string {
  if (!request.appUser) throw new HttpError(401, 'Authentication is required');
  return request.appUser.id;
}

export const listAddressesHandler: RequestHandler = async (request, response) => {
  response.json({ success: true, data: await listAddresses(currentUserId(request)) });
};

export const getAddressHandler: RequestHandler = async (request, response) => {
  response.json({
    success: true,
    data: await getAddress(currentUserId(request), addressId(request.params.id)),
  });
};

export const createAddressHandler: RequestHandler = async (request, response) => {
  response.status(201).json({
    success: true,
    data: await createAddress(currentUserId(request), request.body as CreateAddressInput),
  });
};

export const updateAddressHandler: RequestHandler = async (request, response) => {
  response.json({
    success: true,
    data: await updateAddress(
      currentUserId(request),
      addressId(request.params.id),
      request.body as UpdateAddressInput,
    ),
  });
};

export const deleteAddressHandler: RequestHandler = async (request, response) => {
  await deleteAddress(currentUserId(request), addressId(request.params.id));
  response.json({ success: true });
};
