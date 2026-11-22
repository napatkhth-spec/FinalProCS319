import { Router } from 'express';
import { addressRouter } from './address.routes.js';
import { authRouter } from './auth.routes.js';
import { categoryRouter } from './category.routes.js';
import { farmerRouter } from './farmer.routes.js';
import { orderRouter } from './order.routes.js';
import { productRouter } from './product.routes.js';
import { reviewRouter } from './review.routes.js';

export const apiRouter = Router();

apiRouter.get('/health', (_request, response) => {
  response.json({ success: true, message: 'Local Farmer Market API is running' });
});

apiRouter.use('/auth', authRouter);
apiRouter.use('/farmers', farmerRouter);
apiRouter.use('/categories', categoryRouter);
apiRouter.use('/products', productRouter);
apiRouter.use('/orders', orderRouter);
apiRouter.use('/addresses', addressRouter);
apiRouter.use('/reviews', reviewRouter);

for (const resource of ['users']) {
  apiRouter.use(`/${resource}`, (_request, response) => {
    response.status(501).json({ success: false, message: `${resource} API is not implemented yet` });
  });
}
