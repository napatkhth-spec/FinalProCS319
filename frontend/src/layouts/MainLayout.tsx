import { useState } from 'react'
import { Link, Outlet, useNavigate } from 'react-router'
import { ShoppingBasket, ShoppingCart } from 'lucide-react'
import { useCartStore } from '../stores/cart.store'
import { useAuthStore } from '../stores/auth.store'
import { logoutFromBackend } from '../features/auth/auth.service'
import { queryClient } from '../lib/query-client'

export function MainLayout() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const isInitialized = useAuthStore((state) => state.isInitialized)
  const clearSession = useAuthStore((state) => state.clearSession)
  const [logoutError, setLogoutError] = useState('')
  const [isSigningOut, setIsSigningOut] = useState(false)
  const count = useCartStore((state) => state.items.reduce((total, item) => total + item.quantity, 0))

  async function handleSignOut() {
    setLogoutError('')
    setIsSigningOut(true)
    try {
      await logoutFromBackend()
      clearSession()
      queryClient.clear()
      navigate('/login', { replace: true })
    } catch {
      setLogoutError('ออกจากระบบไม่สำเร็จ กรุณาลองอีกครั้ง')
      clearSession()
      queryClient.clear()
      navigate('/login', { replace: true })
    } finally {
      setIsSigningOut(false)
    }
  }

  return <div className="min-h-screen"><header className="border-b border-stone-200 bg-white"><nav className="mx-auto flex max-w-6xl items-center justify-between gap-5 px-5 py-4">
    <Link to="/" className="flex items-center gap-2 text-lg font-bold text-green-800"><ShoppingBasket size={22} />Local Farmer Market</Link>
    <div className="flex items-center gap-5 text-sm">
      <Link to="/products">สินค้า</Link>
      {user && <>
        <Link to="/farmer/dashboard">ร้านเกษตรกร</Link>
        {user.roles.includes('BUYER') && <><Link to="/orders">คำสั่งซื้อ</Link><Link to="/addresses">ที่อยู่</Link></>}
        {user.roles.includes('ADMIN') && <Link to="/admin">ผู้ดูแลระบบ</Link>}
        <span className="hidden text-stone-600 md:inline">{user.name}</span>
        <button type="button" disabled={isSigningOut} onClick={handleSignOut} className="text-red-700 disabled:opacity-60">{isSigningOut ? 'กำลังออก…' : 'ออกจากระบบ'}</button>
      </>}
      {!user && isInitialized && <><Link to="/login">เข้าสู่ระบบ</Link><Link to="/register">สมัครสมาชิก</Link></>}
      {!isInitialized && <span role="status" className="text-stone-500">กำลังเริ่มต้น…</span>}
      <Link to="/cart" aria-label="ตะกร้าสินค้า" className="flex items-center gap-1"><ShoppingCart size={18} />{count}</Link>
    </div>
  </nav></header>
    {logoutError && <p role="alert" className="mx-auto max-w-6xl px-5 pt-3 text-sm text-red-700">{logoutError}</p>}
    <main><Outlet /></main><footer className="mt-16 border-t border-stone-200 px-5 py-6 text-center text-sm text-stone-500">Local Farmer Market · ตลาดชุมชนเพื่อเกษตรกรไทย</footer></div>
}
