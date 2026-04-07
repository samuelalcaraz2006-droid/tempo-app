import { useAuth } from '../contexts/useAuth'

export function useAdminGuard() {
  const { user, profile, loading } = useAuth()
  const isAdmin = profile?.role === 'admin'
  return { allowed: isAdmin && !loading, loading }
}
