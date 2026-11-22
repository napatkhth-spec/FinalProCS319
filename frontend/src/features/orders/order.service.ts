import { apiClient } from '../../lib/axios';
import type { ApiResponse, Order } from '../../types';

export async function listOrders(): Promise<Order[]> {
  const response = await apiClient.get<ApiResponse<Order[]>>('/orders');
  return response.data.data ?? [];
}

export async function createOrder(input: {
  addressId: string;
  items: Array<{ productId: string; quantity: number }>;
  paymentMethod: 'COD' | 'ONLINE';
  shippingFee?: number;
  note?: string;
}): Promise<Order> {
  const response = await apiClient.post<ApiResponse<Order>>('/orders', input);
  if (!response.data.data) throw new Error('สร้างคำสั่งซื้อไม่สำเร็จ');
  return response.data.data;
}

export async function updateOrderStatus(id: string, status: Order['status']): Promise<Order> {
  const response = await apiClient.patch<ApiResponse<Order>>(`/orders/${id}/status`, { status });
  if (!response.data.data) throw new Error('แก้ไขสถานะคำสั่งซื้อไม่สำเร็จ');
  return response.data.data;
}
