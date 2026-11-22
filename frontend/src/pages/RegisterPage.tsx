import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { registerWithEmail } from '../features/auth/auth.service'

export function RegisterPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      await registerWithEmail(email, password, fullName)
      setPassword('')
      setIsSubmitted(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'สมัครสมาชิกไม่สำเร็จ')
    } finally {
      setIsSubmitting(false)
    }
  }

  return <section className="mx-auto max-w-md px-5 py-12">
    <h1 className="text-3xl font-bold">สมัครสมาชิก</h1>
    <p className="mt-3 text-stone-600">บัญชีใหม่เริ่มต้นเป็นผู้ซื้อ และเปิดร้านเพิ่มได้ภายหลัง</p>
    <p className="mt-2 text-sm text-amber-800">ระบบยืนยันอีเมลยังไม่เปิดใช้ บัญชีที่สร้างจะยังไม่ผ่านการยืนยัน</p>
    {isSubmitted ? <p role="status" className="mt-6 rounded-lg bg-green-50 p-4 text-green-900">ได้รับคำขอแล้ว หากเป็นบัญชีใหม่ให้ลองเข้าสู่ระบบด้วยข้อมูลที่ส่งมา หากมีบัญชีอยู่แล้วให้ใช้ข้อมูลบัญชีเดิม</p> : <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
      <label className="block text-sm">ชื่อ-นามสกุล<input required maxLength={120} autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2" /></label>
      <label className="block text-sm">อีเมล<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2" /></label>
      <label className="block text-sm">รหัสผ่าน<input required type="password" minLength={12} maxLength={128} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2" /></label>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <button disabled={isSubmitting} className="w-full rounded-lg bg-green-700 px-4 py-2 font-semibold text-white disabled:opacity-60">{isSubmitting ? 'กำลังสมัคร…' : 'สมัครสมาชิก'}</button>
    </form>}
    <Link className="mt-5 inline-block text-green-800 underline" to="/login">เข้าสู่ระบบ</Link>
  </section>
}
