import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listOrders, updateOrderStatus } from '../features/orders/order.service'
import { useAuthStore } from '../stores/auth.store'
import type { Order } from '../types'

const farmerNextStatus: Partial<Record<Order['status'], Order['status']>> = {
  PENDING: 'CONFIRMED', CONFIRMED: 'PROCESSING', PROCESSING: 'SHIPPED', SHIPPED: 'DELIVERED',
}

export function OrdersPage() {
  const user = useAuthStore((state) => state.user)
  const queryClient = useQueryClient()
  const orders = useQuery({ queryKey: ['orders'], queryFn: listOrders })
  const updateMutation = useMutation({ mutationFn: ({ id, status }: { id: string; status: Order['status'] }) => updateOrderStatus(id, status), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }) })

  return <section className="mx-auto max-w-5xl px-5 py-12">
    <h1 className="text-3xl font-bold">คำสั่งซื้อ</h1>
    {orders.isPending ? <p role="status" className="mt-6">กำลังโหลดคำสั่งซื้อ…</p> : orders.isError ? <div className="mt-6"><p role="alert" className="text-red-700">โหลดคำสั่งซื้อไม่สำเร็จ</p><button onClick={() => void orders.refetch()} className="mt-2 underline">ลองอีกครั้ง</button></div> : orders.data.length === 0 ? <p className="mt-6 text-stone-600">ยังไม่มีคำสั่งซื้อ</p> : <div className="mt-6 space-y-5">{orders.data.map((order) => {
      const next = farmerNextStatus[order.status]
      const isBuyer = order.buyer.id === user?.id
      return <article key={order.id} className="rounded-xl border border-stone-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">{order.orderNumber}</h2><p className="text-sm text-stone-600">{new Date(order.createdAt).toLocaleString('th-TH')} · ร้าน {order.farmer.shopName}</p></div><span className="rounded-full bg-green-50 px-3 py-1 text-sm">{order.status}</span></div>
        <ul className="mt-4 divide-y divide-stone-100">{order.items.map((item) => <li key={item.id} className="flex justify-between py-2 text-sm"><span>{item.productName} × {item.quantity}</span><span>฿{Number(item.subtotal).toFixed(2)}</span></li>)}</ul>
        <p className="mt-3 text-sm text-stone-600">จัดส่งถึง {order.recipientName} · {order.addressLine}, {order.district}, {order.province} {order.postalCode}</p><p className="mt-3 text-right font-bold">รวม ฿{Number(order.totalAmount).toFixed(2)}</p>
        <div className="mt-4 flex flex-wrap gap-3">{isBuyer && order.status === 'PENDING' && <button disabled={updateMutation.isPending} onClick={() => updateMutation.mutate({ id: order.id, status: 'CANCELLED' })} className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-700 disabled:opacity-50">ยกเลิกคำสั่งซื้อ</button>}{user?.roles.includes('FARMER') && next && <button disabled={updateMutation.isPending} onClick={() => updateMutation.mutate({ id: order.id, status: next })} className="rounded-lg bg-green-700 px-4 py-2 text-sm text-white disabled:opacity-50">เปลี่ยนเป็น {next}</button>}</div>
      </article>
    })}</div>}
    {updateMutation.isError && <p role="alert" className="mt-4 text-red-700">{updateMutation.error.message || 'อัปเดตคำสั่งซื้อไม่สำเร็จ'}</p>}
  </section>
}
