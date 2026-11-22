import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { loginWithEmail } from '../features/auth/auth.service';
import { useAuthStore } from '../stores/auth.store';
import { queryClient } from '../lib/query-client';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setSession = useAuthStore((state) => state.setSession);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const session = await loginWithEmail(email, password);
      queryClient.clear();
      setSession(session.user, session.accessToken);
      const destination = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
      navigate(destination || '/', { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'เข้าสู่ระบบไม่สำเร็จ');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="mx-auto max-w-md px-5 py-12">
      <h1 className="text-3xl font-bold">เข้าสู่ระบบ</h1>
      <p className="mt-2 text-sm text-amber-800">บัญชีในช่วงเริ่มต้นยังไม่มีการยืนยันอีเมล</p>
      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <label className="block text-sm">
          อีเมล
          <input
            required
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          รหัสผ่าน
          <input
            required
            type="password"
            minLength={12}
            maxLength={128}
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2"
          />
        </label>
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        <button
          disabled={isSubmitting}
          className="w-full rounded-lg bg-green-700 px-4 py-2 font-semibold text-white disabled:opacity-60"
        >
          {isSubmitting ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}
        </button>
      </form>
      <Link className="mt-5 inline-block text-green-800 underline" to="/register">
        สมัครสมาชิก
      </Link>
    </section>
  );
}
