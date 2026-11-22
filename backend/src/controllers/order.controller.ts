import type { RequestHandler } from 'express';
import { createOrder, getOrder, listOrders, updateOrderStatus } from '../services/order.service.js';
import type { AppRole } from '../generated/prisma/enums.js';
import type { CreateOrderInput, UpdateOrderStatusInput } from '../validators/order.validator.js';
import { HttpError } from '../utils/http-error.js';

function orderId(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  ) {
    throw new HttpError(400, 'Invalid order id');
  }
  return value;
}

function identity(request: Parameters<RequestHandler>[0]) {
  if (!request.appUser) throw new HttpError(401, 'Authentication is required');
  return { userId: request.appUser.id, roles: request.appUser.roles as AppRole[] };
}

export const listOrdersHandler: RequestHandler = async (request, response) => {
  const { userId, roles } = identity(request);
  response.json({ success: true, data: await listOrders(userId, roles) });
};

export const getOrderHandler: RequestHandler = async (request, response) => {
  const { userId, roles } = identity(request);
  response.json({ success: true, data: await getOrder(userId, roles, orderId(request.params.id)) });
};

export const createOrderHandler: RequestHandler = async (request, response) => {
  const { userId } = identity(request);
  response
    .status(201)
    .json({ success: true, data: await createOrder(userId, request.body as CreateOrderInput) });
};

export const updateOrderStatusHandler: RequestHandler = async (request, response) => {
  const { userId, roles } = identity(request);
  response.json({
    success: true,
    data: await updateOrderStatus(
      userId,
      roles,
      orderId(request.params.id),
      request.body as UpdateOrderStatusInput,
    ),
  });
};
