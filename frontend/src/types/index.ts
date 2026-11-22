export type AppRole = 'BUYER' | 'FARMER' | 'ADMIN'

export interface User {
  id: string
  name: string
  email: string
  roles: AppRole[]
  farmerProfile: Pick<FarmerProfile, 'id' | 'shopName' | 'description' | 'farmAddress' | 'province' | 'profileImage' | 'verificationStatus'> | null
}
export interface AuthResponseData { accessToken: string; user: User }
export interface Category {
  id: string
  name: string
  description: string | null
  imageUrl: string | null
  parentId: string | null
  parent?: Pick<Category, 'id' | 'name'> | null
  _count?: { children: number; products: number }
}

export interface Product {
  id: string
  name: string
  description: string | null
  price: number | string
  stock: number
  unit: string
  status: 'ACTIVE' | 'INACTIVE' | 'OUT_OF_STOCK'
  sku: string | null
  farmerId: string
  categoryId: string
  category?: Pick<Category, 'id' | 'name'>
  farmer?: { id: string; shopName: string; province: string | null }
  images?: Array<{ id: string; storagePath: string; isPrimary: boolean; sortOrder: number }>
}

export interface CartItem { product: Product; quantity: number }

export interface Address {
  id: string
  recipientName: string
  phone: string
  addressLine: string
  subDistrict: string
  district: string
  province: string
  postalCode: string
  isDefault: boolean
}

export interface FarmerProfile {
  id: string
  userId: string
  shopName: string
  description: string | null
  farmAddress: string | null
  province: string | null
  profileImage: string | null
  verificationStatus: 'PENDING' | 'APPROVED' | 'REJECTED'
  _count?: { products: number; orders: number }
}

export interface FarmerApproval {
  id: string
  shopName: string
  description: string | null
  farmAddress: string | null
  profileImage: string | null
  verificationStatus: 'PENDING' | 'APPROVED' | 'REJECTED'
  createdAt: string
  user: { id: string; fullName: string }
}

export interface Review {
  id: string
  userId: string
  productId: string
  rating: number
  comment: string | null
  createdAt: string
  user: { id: string; fullName: string }
}

export interface Order {
  id: string
  orderNumber: string
  status: 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'
  subtotal: number | string
  shippingFee: number | string
  totalAmount: number | string
  recipientName: string
  recipientPhone: string
  addressLine: string
  subDistrict: string
  district: string
  province: string
  postalCode: string
  note: string | null
  createdAt: string
  items: Array<{ id: string; productName: string; unitPrice: number | string; quantity: number; subtotal: number | string }>
  payments: Array<{ id: string; method: 'ONLINE' | 'COD'; status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'; amount: number | string }>
  buyer: { id: string; fullName: string }
  farmer: { id: string; shopName: string }
}

export interface ApiResponse<T> { success: boolean; message?: string; data?: T }
