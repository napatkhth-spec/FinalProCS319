import { apiClient } from '../../lib/axios'
import type { ApiResponse, Product } from '../../types'

export interface ProductFilters { search?: string; categoryId?: string; province?: string; page?: number; pageSize?: number }
export interface ProductPage { items: Product[]; pagination: { page: number; pageSize: number; total: number } }
export type ProductInput = Pick<Product, 'name' | 'categoryId' | 'price' | 'stock' | 'unit'> & Partial<Pick<Product, 'description' | 'sku' | 'status'>>

export async function listProducts(filters: ProductFilters = {}): Promise<ProductPage> {
  const response = await apiClient.get<ApiResponse<ProductPage>>('/products', { params: filters })
  return response.data.data ?? { items: [], pagination: { page: 1, pageSize: 24, total: 0 } }
}

export async function getProduct(id: string): Promise<Product> {
  const response = await apiClient.get<ApiResponse<Product>>(`/products/${id}`)
  if (!response.data.data) throw new Error('ไม่พบสินค้า')
  return response.data.data
}

export async function listMyProducts(): Promise<Product[]> {
  const response = await apiClient.get<ApiResponse<Product[]>>('/products/mine')
  return response.data.data ?? []
}

export async function createProduct(input: ProductInput): Promise<Product> {
  const response = await apiClient.post<ApiResponse<Product>>('/products', input)
  if (!response.data.data) throw new Error('เพิ่มสินค้าไม่สำเร็จ')
  return response.data.data
}

export async function updateProduct(id: string, input: Partial<ProductInput>): Promise<Product> {
  const response = await apiClient.patch<ApiResponse<Product>>(`/products/${id}`, input)
  if (!response.data.data) throw new Error('แก้ไขสินค้าไม่สำเร็จ')
  return response.data.data
}

export async function uploadProductImages(productId: string, files: File[], primaryIndex?: number): Promise<NonNullable<Product['images']>> {
  const body = new FormData()
  files.forEach((file) => body.append('images', file))
  if (primaryIndex !== undefined) body.append('primaryIndex', String(primaryIndex))
  const response = await apiClient.post<ApiResponse<NonNullable<Product['images']>>>(`/products/${productId}/images`, body)
  if (!response.data.data) throw new Error('อัปโหลดรูปสินค้าไม่สำเร็จ')
  return response.data.data
}

export async function setPrimaryProductImage(productId: string, imageId: string): Promise<void> {
  await apiClient.patch(`/products/${productId}/images/${imageId}/primary`)
}

export async function deleteProductImage(productId: string, imageId: string): Promise<boolean> {
  const response = await apiClient.delete<ApiResponse<{ storageDeleted: boolean }>>(`/products/${productId}/images/${imageId}`)
  return response.data.data?.storageDeleted ?? false
}

export async function archiveProduct(id: string): Promise<void> {
  await apiClient.delete(`/products/${id}`)
}
