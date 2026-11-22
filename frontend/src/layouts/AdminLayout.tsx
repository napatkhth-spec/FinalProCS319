import { Link, Outlet } from 'react-router'

export function AdminLayout() { return <div className="min-h-screen bg-stone-100"><header className="bg-green-900 px-6 py-4 text-white"><Link to="/">← Local Farmer Market</Link><span className="ml-6 font-semibold">Admin</span><nav className="mt-3 flex gap-5 text-sm"><Link to="/admin">ภาพรวม</Link><Link to="/admin/farmer-approvals">คำขอเปิดร้านค้า</Link><Link to="/admin/categories">หมวดหมู่สินค้า</Link></nav></header><main className="mx-auto max-w-6xl p-6"><Outlet /></main></div> }
