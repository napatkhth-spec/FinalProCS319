import { apiClient } from '../../lib/axios';
import type { ApiResponse, AppRole, AuthResponseData, User } from '../../types';

export async function registerWithEmail(email: string, password: string, fullName: string): Promise<void> {
  await apiClient.post('/auth/register', { email, password, fullName });
}

export async function loginWithEmail(email: string, password: string): Promise<AuthResponseData> {
  const response = await apiClient.post<ApiResponse<AuthResponseData>>('/auth/login', { email, password });
  if (!response.data.data) throw new Error('เข้าสู่ระบบไม่สำเร็จ');
  return response.data.data;
}

export async function getCurrentUser(): Promise<User> {
  const response = await apiClient.get<ApiResponse<User>>('/auth/me');
  if (!response.data.data) throw new Error('โหลดข้อมูลบัญชีไม่สำเร็จ');
  return response.data.data;
}

export async function logoutFromBackend(): Promise<void> {
  await apiClient.post('/auth/logout');
}

export async function openShop(
  shopName: string,
  province: string,
  contactPhone: string,
  nationalId: string,
  description?: string,
  farmAddress?: string,
) {
  const response = await apiClient.post<
    ApiResponse<{ roles: AppRole[]; farmerProfile: NonNullable<User['farmerProfile']> }>
  >('/farmers/profile', {
    shopName,
    province,
    contactPhone,
    nationalId,
    ...(description ? { description } : {}),
    ...(farmAddress ? { farmAddress } : {}),
  });
  if (!response.data.data) throw new Error('ไม่สามารถเปิดร้านได้');
  return response.data.data;
}
