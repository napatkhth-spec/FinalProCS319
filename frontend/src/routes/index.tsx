import { createBrowserRouter } from 'react-router';
import { MainLayout } from '../layouts/MainLayout';
import { AdminLayout } from '../layouts/AdminLayout';
import { HomePage } from '../pages/HomePage';
import { ProductsPage } from '../pages/ProductsPage';
import { ProductDetailPage } from '../pages/ProductDetailPage';
import { CartPage } from '../pages/CartPage';
import { OrdersPage } from '../pages/OrdersPage';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { FarmerDashboardPage } from '../pages/FarmerDashboardPage';
import { AdminDashboardPage } from '../pages/AdminDashboardPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { AddressesPage } from '../pages/AddressesPage';
import { AdminCategoriesPage } from '../pages/AdminCategoriesPage';
import { AdminFarmerApprovalsPage } from '../pages/AdminFarmerApprovalsPage';
import { ProtectedRoute } from './ProtectedRoute';

export const router = createBrowserRouter([
  {
    element: <MainLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/products', element: <ProductsPage /> },
      { path: '/products/:productId', element: <ProductDetailPage /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      {
        element: <ProtectedRoute roles={['BUYER']} />,
        children: [
          { path: '/cart', element: <CartPage /> },
          { path: '/orders', element: <OrdersPage /> },
          { path: '/addresses', element: <AddressesPage /> },
        ],
      },
      {
        element: <ProtectedRoute />,
        children: [{ path: '/farmer/dashboard', element: <FarmerDashboardPage /> }],
      },
    ],
  },
  {
    element: <ProtectedRoute roles={['ADMIN']} />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { path: '/admin', element: <AdminDashboardPage /> },
          { path: '/admin/categories', element: <AdminCategoriesPage /> },
          { path: '/admin/farmer-approvals', element: <AdminFarmerApprovalsPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
