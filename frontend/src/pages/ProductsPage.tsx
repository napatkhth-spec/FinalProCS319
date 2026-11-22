import { useState } from 'react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { listCategories } from '../features/categories/category.service'
import { listProducts } from '../features/products/product.service'
import { useCartStore } from '../stores/cart.store'
import { THAI_PROVINCES } from '../constants/thai-provinces'

export function ProductsPage() {
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [province, setProvince] = useState('')
  const addItem = useCartStore((state) => state.addItem)
  const cartItems = useCartStore((state) => state.items)
  const [cartMessage, setCartMessage] = useState<{ productId: string; message: string } | null>(null)
  const categories = useQuery({ queryKey: ['categories'], queryFn: listCategories })
  const products = useQuery({
    queryKey: ['products', { search, categoryId, province }],
    queryFn: () => listProducts({ search: search || undefined, categoryId: categoryId || undefined, province: province || undefined }),
  })

  return <section className="mx-auto max-w-6xl px-5 py-12">
    <h1 className="text-3xl font-bold">สินค้าเกษตร</h1>
    <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_16rem_16rem_auto]">
      <label className="sr-only" htmlFor="product-search">ค้นหาสินค้า</label>
      <input id="product-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ค้นหาสินค้า" className="rounded-lg border border-stone-300 px-3 py-2" />
      <label className="sr-only" htmlFor="product-category">หมวดหมู่สินค้า</label>
      <select id="product-category" value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className="rounded-lg border border-stone-300 px-3 py-2">
        <option value="">ทุกหมวดหมู่</option>
        {categories.data?.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
      </select>
      <label className="sr-only" htmlFor="product-province">จังหวัดร้านค้า</label>
      <select id="product-province" value={province} onChange={(event) => setProvince(event.target.value)} className="rounded-lg border border-stone-300 px-3 py-2">
        <option value="">ทุกจังหวัด</option>
        {THAI_PROVINCES.map((name) => <option key={name} value={name}>{name}</option>)}
      </select>
      {province && <button type="button" onClick={() => setProvince('')} className="rounded-lg border border-stone-300 px-3 py-2 text-sm">ล้างตัวกรองจังหวัด</button>}
    </div>
    {categories.isError && <p role="alert" className="mt-3 text-red-700">โหลดหมวดหมู่ไม่สำเร็จ</p>}
    {products.isPending ? <p role="status" className="mt-8">กำลังโหลดสินค้า…</p> : products.isError ? <div className="mt-8"><p role="alert" className="text-red-700">โหลดสินค้าไม่สำเร็จ</p><button onClick={() => void products.refetch()} className="mt-2 underline">ลองอีกครั้ง</button></div> : products.data.items.length === 0 ? <p className="mt-8 text-stone-600">{province ? `ไม่พบสินค้าในจังหวัด${province} ตามตัวกรองปัจจุบัน` : 'ไม่พบสินค้าตามตัวกรองปัจจุบัน'}</p> : <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {products.data.items.map((product) => <article key={product.id} className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        {product.images?.length ? <img src={product.images.find((image) => image.isPrimary)?.storagePath ?? product.images[0]?.storagePath} alt={product.name} loading="lazy" className="mb-4 aspect-[4/3] w-full rounded-lg object-cover" /> : <div role="img" aria-label="ไม่มีรูปสินค้า" className="mb-4 flex aspect-[4/3] w-full items-center justify-center rounded-lg bg-green-50 text-sm text-green-800">ไม่มีรูปสินค้า</div>}
        <p className="text-xs text-green-800">{product.category?.name ?? 'สินค้าเกษตร'}</p>
        <Link to={`/products/${product.id}`} className="mt-2 block text-xl font-semibold hover:underline">{product.name}</Link>
        <p className="mt-2 line-clamp-2 min-h-12 text-sm text-stone-600">{product.description || 'ไม่มีรายละเอียดสินค้า'}</p>
        <p className="mt-4 font-bold">฿{Number(product.price).toFixed(2)} / {product.unit}</p>
        <p className="mt-1 text-sm text-stone-500">{product.farmer?.shopName ?? 'เกษตรกร'}{product.farmer?.province ? ` · ${product.farmer.province}` : ''}</p>
        <button type="button" disabled={product.stock < 1 || product.status !== 'ACTIVE' || (cartItems.find((item) => item.product.id === product.id)?.quantity ?? 0) >= product.stock} onClick={() => setCartMessage({ productId: product.id, message: addItem(product) ? `เพิ่ม ${product.name} ลงตะกร้าแล้ว` : 'เพิ่มสินค้าไม่สำเร็จ สินค้าอาจหมดหรือเกินจำนวนคงเหลือ' })} className="mt-4 w-full rounded-lg bg-green-700 px-4 py-2 text-white disabled:bg-stone-300">
          {product.stock < 1 || product.status !== 'ACTIVE' ? 'สินค้าหมด' : (cartItems.find((item) => item.product.id === product.id)?.quantity ?? 0) >= product.stock ? 'เพิ่มครบจำนวนคงเหลือแล้ว' : 'เพิ่มลงตะกร้า'}
        </button>
        {cartMessage?.productId === product.id && <p role="status" className="mt-2 text-sm text-green-800">{cartMessage.message}</p>}
      </article>)}
    </div>}
  </section>
}
