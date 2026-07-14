import { useAuth } from '../context/useAuth';

export default function RequireRole({ role = 'admin', children }) {
  const { isAdmin, loading } = useAuth();

  if (loading) return null;

  // We only support 'admin' checks right now based on is_superuser
  if (role === 'admin' && !isAdmin) {
    return null; // Don't render the protected element
  }

  return children;
}
