import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { CurrentUser, ModulePermission, PermissionAction } from '../lib/permissions';
import { EMPTY_PERMISSION, FULL_PERMISSION } from '../lib/permissions';

interface AuthContextValue {
  user: CurrentUser | null;
  isLoading: boolean;
  isStaff: boolean;
  isAdmin: boolean;
  permissionFor: (moduleKey: string | null) => ModulePermission;
  can: (moduleKey: string | null, action: PermissionAction) => boolean;
  logout: () => void;
  refetch: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [hasToken, setHasToken] = useState(!!localStorage.getItem('admin_token'));

  useEffect(() => {
    const onStorage = () => setHasToken(!!localStorage.getItem('admin_token'));
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const { data: user, isLoading, refetch } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => (await api.get('/admin/me')).data.data as CurrentUser,
    enabled: hasToken,
    retry: false,
    staleTime: 60_000
  });

  const logout = useCallback(() => {
    // Best-effort — invalidates the token server-side too (so it can't be
    // reused if it leaked) but the local session ends either way.
    api.post('/admin/logout').catch(() => {});
    localStorage.removeItem('admin_token');
    setHasToken(false);
    queryClient.removeQueries({ queryKey: ['currentUser'] });
  }, [queryClient]);

  const isAdmin = user?.type === 'admin';
  const isStaff = user?.type === 'staff';

  const permissionFor = useCallback(
    (moduleKey: string | null): ModulePermission => {
      if (isAdmin) return FULL_PERMISSION;
      if (!moduleKey || !user?.permissions) return EMPTY_PERMISSION;
      return user.permissions[moduleKey] || EMPTY_PERMISSION;
    },
    [isAdmin, user]
  );

  const can = useCallback(
    (moduleKey: string | null, action: PermissionAction) => permissionFor(moduleKey)[action],
    [permissionFor]
  );

  return (
    <AuthContext.Provider value={{ user: user || null, isLoading: hasToken && isLoading, isStaff, isAdmin, permissionFor, can, logout, refetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
