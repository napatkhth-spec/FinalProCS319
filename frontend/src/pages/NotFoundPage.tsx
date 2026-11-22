import { Link } from 'react-router'
export function NotFoundPage() { return <section className="mx-auto max-w-3xl px-5 py-24 text-center"><p className="text-sm font-semibold text-green-800">404</p><h1 className="mt-2 text-4xl font-bold">ไม่พบหน้าที่ต้องการ</h1><Link to="/" className="mt-6 inline-block text-green-800 underline">กลับหน้าหลัก</Link></section> }
