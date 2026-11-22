import cors from 'cors';
import express from 'express';
import { apiRouter } from './routes/index.js';
import { errorMiddleware } from './middlewares/error.middleware.js';
import { notFoundMiddleware } from './middlewares/not-found.middleware.js';
import { HttpError } from './utils/http-error.js';

const allowedOrigins = new Set(
  (process.env.FRONTEND_URL ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
);

if (allowedOrigins.has('*')) {
  throw new Error('FRONTEND_URL must contain explicit origins; wildcard origins are not allowed');
}

export const app = express();

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      callback(new HttpError(403, 'Origin not allowed'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 204,
  }),
);
app.use(express.json());
app.use('/api', apiRouter);
app.use(notFoundMiddleware);
app.use(errorMiddleware);
