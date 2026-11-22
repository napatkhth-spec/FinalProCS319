import { useEffect, type PropsWithChildren } from 'react'
import { useAuthStore } from '../../stores/auth.store'

export function AuthInitializer({ children }: PropsWithChildren) {
  const initializeAnonymous = useAuthStore((state) => state.initializeAnonymous)

  useEffect(() => {
    if (!useAuthStore.getState().isInitialized) initializeAnonymous()
  }, [initializeAnonymous])

  return children
}
