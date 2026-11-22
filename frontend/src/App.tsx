import { RouterProvider } from 'react-router'
import { router } from './routes'
import { AuthInitializer } from './features/auth/AuthInitializer'

export function App() {
  return <AuthInitializer><RouterProvider router={router} /></AuthInitializer>
}
