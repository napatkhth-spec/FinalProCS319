import type { ErrorRequestHandler } from 'express';
import { HttpError } from '../utils/http-error.js';

export const errorMiddleware: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
  const message = error instanceof Error ? error.message : 'Internal server error';
  const statusCode = error instanceof HttpError ? error.statusCode : 500;
  response
    .status(statusCode)
    .json({ success: false, message: statusCode === 500 ? 'Internal server error' : message });
};
