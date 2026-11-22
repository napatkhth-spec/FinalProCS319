import assert from 'node:assert/strict'
import { test } from 'node:test'
import { useCartStore } from '../src/stores/cart.store.ts'

const product = {
  id: 'product-1', name: 'Tomato', description: null, price: '25.00', stock: 3, unit: 'kg',
  status: 'ACTIVE', sku: null, farmerId: 'farmer-1', categoryId: 'category-1',
}

test('cart adds a product, increments duplicate quantity, caps at stock, updates and removes', () => {
  const cart = useCartStore.getState()
  cart.clear()

  assert.equal(cart.addItem(product), true)
  assert.equal(cart.addItem(product), true)
  assert.deepEqual(useCartStore.getState().items.map(({ product: item, quantity }) => [item.id, quantity]), [['product-1', 2]])
  assert.equal(cart.addItem(product), true)
  assert.equal(cart.addItem(product), false)

  cart.setQuantity(product.id, 99)
  assert.equal(useCartStore.getState().items[0].quantity, product.stock)
  cart.setQuantity(product.id, 2)
  assert.equal(useCartStore.getState().items[0].quantity, 2)
  cart.setQuantity(product.id, 0)
  assert.equal(useCartStore.getState().items.length, 0)

  cart.addItem(product)
  cart.removeItem(product.id)
  assert.equal(useCartStore.getState().items.length, 0)
})

test('cart refuses unavailable products and remains in the shared store across view changes', () => {
  useCartStore.getState().clear()
  assert.equal(useCartStore.getState().addItem({ ...product, status: 'OUT_OF_STOCK' }), false)
  assert.equal(useCartStore.getState().addItem({ ...product, stock: 0 }), false)
  useCartStore.getState().addItem(product)

  // Components on different routes read the same module-level Zustand store.
  const cartPageSnapshot = useCartStore.getState().items
  assert.equal(cartPageSnapshot[0].product.id, product.id)
  assert.equal(cartPageSnapshot[0].quantity, 1)
  useCartStore.getState().clear()
})
