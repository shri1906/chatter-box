'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { disconnectSocket } from './socket';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [token, setToken]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('cb_token') : null;
    if (!stored) { setLoading(false); return; }
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${stored}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.user) { setToken(stored); setUser(data.user); }
        else localStorage.removeItem('cb_token');
      })
      .catch(() => localStorage.removeItem('cb_token'))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (username, password) => {
    const res  = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    localStorage.setItem('cb_token', data.token);
    setToken(data.token); setUser(data.user);
    return data;
  }, []);

  const register = useCallback(async (username, displayName, password, color) => {
    const res  = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, displayName, password, color }) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    localStorage.setItem('cb_token', data.token);
    setToken(data.token); setUser(data.user);
    return data;
  }, []);

  const updateProfile = useCallback(async (updates) => {
    const stored = localStorage.getItem('cb_token');
    const res  = await fetch('/api/profile/update', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${stored}` }, body: JSON.stringify(updates) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Update failed');
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('cb_token');
    disconnectSocket();
    setToken(null); setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateProfile, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
