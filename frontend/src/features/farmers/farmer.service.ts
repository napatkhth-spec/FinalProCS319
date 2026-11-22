import { apiClient } from '../../lib/axios';
import type { ApiResponse, FarmerApproval, FarmerProfile } from '../../types';

export async function getMyFarmerProfile(): Promise<FarmerProfile> {
  const response = await apiClient.get<ApiResponse<FarmerProfile>>('/farmers/profile');
  if (!response.data.data) throw new Error('ไม่พบข้อมูลร้านเกษตรกร');
  return response.data.data;
}

export async function updateMyFarmerProfile(
  input: Partial<
    Pick<FarmerProfile, 'shopName' | 'description' | 'farmAddress' | 'province' | 'profileImage'>
  >,
) {
  const response = await apiClient.patch<ApiResponse<FarmerProfile>>('/farmers/profile', input);
  if (!response.data.data) throw new Error('แก้ไขข้อมูลร้านไม่สำเร็จ');
  return response.data.data;
}

export async function listPendingFarmers(): Promise<FarmerApproval[]> {
  const response = await apiClient.get<ApiResponse<FarmerApproval[]>>('/farmers/admin/pending');
  if (!response.data.data) throw new Error('โหลดคำขอเปิดร้านไม่สำเร็จ');
  return response.data.data;
}

export async function approveFarmer(profileId: string): Promise<FarmerApproval> {
  const response = await apiClient.patch<ApiResponse<FarmerApproval>>(
    `/farmers/admin/${encodeURIComponent(profileId)}/approve`,
  );
  if (!response.data.data) throw new Error('อนุมัติคำขอไม่สำเร็จ');
  return response.data.data;
}
