import { create } from 'zustand'
import type { CartItem, Product } from '../types'

interface CartState {
  items: CartItem[]
  addItem: (product: Product) => boolean
  removeItem: (productId: string) => void
  setQuantity: (productId: string, quantity: number) => void
  clear: () => void
}

export const useCartStore = create<CartState>((set) => ({
  items: [],
  addItem: (product) => {
    if (product.status !== 'ACTIVE' || product.stock < 1) return false
    let added = true
    set((state) => {
      const existing = state.items.find((item) => item.product.id === product.id)
      if ((existing?.quantity ?? 0) >= product.stock) {
        added = false
        if (!existing) return state
        return { items: state.items.map((item) => item.product.id === product.id ? { ...item, product, quantity: Math.min(item.quantity, product.stock) } : item) }
      }
      return existing
        ? { items: state.items.map((item) => item.product.id === product.id ? { ...item, product, quantity: item.quantity + 1 } : item) }
        : { items: [...state.items, { product, quantity: 1 }] }
    })
    return added
  },
  removeItem: (productId) => set((state) => ({ items: state.items.filter((item) => item.product.id !== productId) })),
  setQuantity: (productId, quantity) => set((state) => ({ items: state.items.flatMap((item) => {
    if (item.product.id !== productId) return [item]
    if (!Number.isFinite(quantity) || quantity <= 0 || item.product.stock < 1) return []
    return [{ ...item, quantity: Math.min(Math.max(1, Math.floor(quantity)), item.product.stock) }]
  }) })),
  clear: () => set({ items: [] }),
}))
