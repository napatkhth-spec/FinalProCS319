import { apiClient } from '../../lib/axios';
import type { Address, ApiResponse } from '../../types';

export type AddressInput = Omit<Address, 'id'>;

export async function listAddresses(): Promise<Address[]> {
  const response = await apiClient.get<ApiResponse<Address[]>>('/addresses');
  return response.data.data ?? [];
}

export async function createAddress(input: AddressInput): Promise<Address> {
  const response = await apiClient.post<ApiResponse<Address>>('/addresses', input);
  if (!response.data.data) throw new Error('เพิ่มที่อยู่ไม่สำเร็จ');
  return response.data.data;
}

export async function updateAddress(id: string, input: Partial<AddressInput>): Promise<Address> {
  const response = await apiClient.patch<ApiResponse<Address>>(`/addresses/${id}`, input);
  if (!response.data.data) throw new Error('แก้ไขที่อยู่ไม่สำเร็จ');
  return response.data.data;
}

export async function deleteAddress(id: string): Promise<void> {
  await apiClient.delete(`/addresses/${id}`);
}
