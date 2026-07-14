import { useEffect, useState } from 'react';
import { getCurrentUser } from '../api/endpoints';
import { AuthContext } from './auth-context';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data } = await getCurrentUser();
        if (data?.is_authenticated) {
          setUser(data);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Error fetching user auth status:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const isSuperuser = !!user?.is_superuser;
  const isAdmin = isSuperuser || !!user?.is_staff;

  return (
    <AuthContext.Provider value={{ user, loading, isSuperuser, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}
