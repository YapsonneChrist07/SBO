import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Redirects away from a partner page unless the user is logged in with `role`.
// Returns true once the page is allowed to render.
export default function useRequireRole(role) {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const allowed = !loading && user?.role === role

  useEffect(() => {
    if (loading) return
    if (!user) navigate('/login', { replace: true, state: { from: pathname } })
    else if (user.role !== role) navigate('/', { replace: true })
  }, [loading, user, role, navigate, pathname])

  return allowed
}
