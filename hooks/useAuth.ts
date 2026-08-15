import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'admin_token';

export const useAuth = () => {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem(STORAGE_KEY);
    setToken(storedToken);
    setLoading(false);

    // 跨实例同步：其他 useAuth 实例（如 admin layout）login/logout 时也能感知
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setToken(e.newValue);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const login = useCallback((newToken: string) => {
    setToken(newToken);
    localStorage.setItem(STORAGE_KEY, newToken);
    // 主动广播，保证同一窗口内其他 useAuth 实例同步更新
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: newToken }));
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: null }));
  }, []);

  const isAuthenticated = !!token;

  const getToken = useCallback(() => token, [token]);

  return { token, login, logout, isAuthenticated, loading, getToken };
};
