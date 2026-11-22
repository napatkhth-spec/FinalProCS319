import type { RequestHandler } from 'express';
import type { z } from 'zod';

export function validateBody(schema: z.ZodType): RequestHandler {
  return (request, response, next) => {
    const result = schema.safeParse(request.body);
    if (!result.success) {
      response.status(400).json({
        success: false,
        message: 'Invalid request body',
        errors: result.error.issues.map(({ path, message }) => ({ path, message })),
      });
      return;
    }

    request.body = result.data;
    next();
  };
}
