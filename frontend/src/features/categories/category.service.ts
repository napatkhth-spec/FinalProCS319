import { apiClient } from '../../lib/axios';
import type { ApiResponse, Category } from '../../types';

export async function listCategories(): Promise<Category[]> {
  const response = await apiClient.get<ApiResponse<Category[]>>('/categories');
  return response.data.data ?? [];
}

export async function createCategory(
  input: Pick<Category, 'name'> & Partial<Pick<Category, 'description' | 'imageUrl' | 'parentId'>>,
) {
  const response = await apiClient.post<ApiResponse<Category>>('/categories', input);
  if (!response.data.data) throw new Error('สร้างหมวดหมู่ไม่สำเร็จ');
  return response.data.data;
}

export async function updateCategory(
  id: string,
  input: Partial<Pick<Category, 'name' | 'description' | 'imageUrl' | 'parentId'>>,
) {
  const response = await apiClient.patch<ApiResponse<Category>>(`/categories/${id}`, input);
  if (!response.data.data) throw new Error('แก้ไขหมวดหมู่ไม่สำเร็จ');
  return response.data.data;
}

export async function deleteCategory(id: string): Promise<void> {
  await apiClient.delete(`/categories/${id}`);
}
