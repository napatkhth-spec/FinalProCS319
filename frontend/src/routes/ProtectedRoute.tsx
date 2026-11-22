import { Navigate, Outlet, useLocation } from 'react-router';
import type { AppRole } from '../types';
import { useAuthStore } from '../stores/auth.store';

interface ProtectedRouteProps {
  roles?: AppRole[];
}

export function ProtectedRoute({ roles }: ProtectedRouteProps) {
  const user = useAuthStore((state) => state.user);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const location = useLocation();

  if (!isInitialized) {
    return (
      <div role="status" className="mx-auto max-w-3xl px-5 py-16 text-center text-stone-600">
        กำลังตรวจสอบ Session…
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (roles && !roles.some((role) => user.roles.includes(role))) return <Navigate to="/" replace />;
  return <Outlet />;
}
