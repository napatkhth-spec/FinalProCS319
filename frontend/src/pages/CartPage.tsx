import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listAddresses } from '../features/addresses/address.service'
import { createOrder } from '../features/orders/order.service'
import { useCartStore } from '../stores/cart.store'

export function CartPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { items, removeItem, setQuantity, clear } = useCartStore()
  const [addressId, setAddressId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'ONLINE'>('COD')
  const addresses = useQuery({ queryKey: ['addresses'], queryFn: listAddresses })
  const orderMutation = useMutation({
    mutationFn: () => createOrder({ addressId, paymentMethod, items: items.map(({ product, quantity }) => ({ productId: product.id, quantity })) }),
    onSuccess: async (order) => {
      clear()
      await queryClient.invalidateQueries({ queryKey: ['orders'] })
      navigate(`/orders?created=${encodeURIComponent(order.orderNumber)}`)
    },
  })
  const total = items.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0)

  return <section className="mx-auto max-w-4xl px-5 py-12">
    <h1 className="text-3xl font-bold">ตะกร้าสินค้า</h1>
    {items.length === 0 ? <p className="mt-5 text-stone-600">ยังไม่มีสินค้าในตะกร้า <Link to="/products" className="text-green-800 underline">เลือกชมสินค้า</Link></p> : <>
      <div className="mt-6 space-y-4">{items.map(({ product, quantity }) => <div key={product.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-white p-4">
        <span>{product.name} · ฿{Number(product.price).toFixed(2)}/{product.unit}</span>
        <div className="flex items-center gap-3"><button type="button" onClick={() => setQuantity(product.id, quantity - 1)} aria-label="ลดจำนวน">−</button><span>{quantity}</span><button type="button" disabled={quantity >= product.stock} onClick={() => setQuantity(product.id, quantity + 1)} aria-label="เพิ่มจำนวน" className="disabled:opacity-40">+</button><button type="button" onClick={() => removeItem(product.id)} className="text-red-700">ลบ</button></div>
      </div>)}<p className="text-right font-bold">รวม ฿{total.toFixed(2)}</p></div>
      <div className="mt-8 rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="text-xl font-semibold">จัดส่งและชำระเงิน</h2>
        {addresses.isPending ? <p role="status" className="mt-3">กำลังโหลดที่อยู่…</p> : addresses.isError ? <p role="alert" className="mt-3 text-red-700">โหลดที่อยู่ไม่สำเร็จ</p> : addresses.data.length === 0 ? <p className="mt-3">ยังไม่มีที่อยู่จัดส่ง <Link to="/addresses" className="text-green-800 underline">เพิ่มที่อยู่</Link></p> : <>
          <label className="mt-4 block text-sm">ที่อยู่จัดส่ง<select value={addressId} onChange={(event) => setAddressId(event.target.value)} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"><option value="">เลือกที่อยู่</option>{addresses.data.map((address) => <option key={address.id} value={address.id}>{address.recipientName} · {address.addressLine}, {address.district}</option>)}</select></label>
          <label className="mt-4 block text-sm">วิธีชำระเงิน<select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as 'COD' | 'ONLINE')} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"><option value="COD">เก็บเงินปลายทาง</option><option value="ONLINE">ออนไลน์</option></select></label>
        </>}
        {orderMutation.isError && <p role="alert" className="mt-3 text-red-700">{orderMutation.error.message || 'สร้างคำสั่งซื้อไม่สำเร็จ'}</p>}
        <button type="button" disabled={!addressId || orderMutation.isPending || addresses.isError} onClick={() => orderMutation.mutate()} className="mt-5 rounded-lg bg-green-700 px-5 py-2 font-semibold text-white disabled:opacity-50">{orderMutation.isPending ? 'กำลังส่งคำสั่งซื้อ…' : 'ยืนยันคำสั่งซื้อ'}</button>
      </div>
    </>}
  </section>
}
