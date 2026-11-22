import { Link } from 'react-router';

export function AdminDashboardPage() {
  return (
    <section>
      <h1 className="text-3xl font-bold">แดชบอร์ดผู้ดูแลระบบ</h1>
      <p className="mt-3 text-stone-600">ภาพรวมการจัดการแพลตฟอร์ม</p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link to="/admin/categories" className="rounded-lg bg-green-700 px-4 py-2 text-white">
          จัดการหมวดหมู่สินค้า
        </Link>
        <Link to="/admin/farmer-approvals" className="rounded-lg bg-amber-700 px-4 py-2 text-white">
          คำขอเปิดร้านค้า
        </Link>
      </div>
    </section>
  );
}
