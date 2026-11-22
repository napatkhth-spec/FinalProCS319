import type { RequestHandler } from 'express';
import { HttpError } from '../utils/http-error.js';

const allowedOrigins = new Set(
  (process.env.FRONTEND_URL ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
);

export const requireTrustedOrigin: RequestHandler = (request, _response, next) => {
  const origin = request.get('origin');
  const fetchSite = request.get('sec-fetch-site');
  if (!origin || !allowedOrigins.has(origin) || fetchSite === 'cross-site') {
    next(new HttpError(403, 'Origin not allowed'));
    return;
  }
  next();
};
