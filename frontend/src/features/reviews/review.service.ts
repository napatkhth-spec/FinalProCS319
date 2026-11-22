import { apiClient } from '../../lib/axios'
import type { ApiResponse, Review } from '../../types'

export async function listProductReviews(productId: string): Promise<Review[]> {
  const response = await apiClient.get<ApiResponse<Review[]>>('/reviews', { params: { productId } })
  return response.data.data ?? []
}

export async function createReview(input: { productId: string; rating: number; comment?: string }): Promise<Review> {
  const response = await apiClient.post<ApiResponse<Review>>('/reviews', input)
  if (!response.data.data) throw new Error('ส่งรีวิวไม่สำเร็จ')
  return response.data.data
}

export async function updateReview(id: string, input: { rating?: number; comment?: string | null }): Promise<Review> {
  const response = await apiClient.patch<ApiResponse<Review>>(`/reviews/${id}`, input)
  if (!response.data.data) throw new Error('แก้ไขรีวิวไม่สำเร็จ')
  return response.data.data
}

export async function deleteReview(id: string): Promise<void> {
  await apiClient.delete(`/reviews/${id}`)
}
