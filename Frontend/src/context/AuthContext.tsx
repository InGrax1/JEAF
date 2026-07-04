// Contexto de sesión: usuario autenticado, login y logout.
import { createContext, useContext, useState, type ReactNode } from 'react';
import { api, guardarSesion, limpiarSesion } from '../lib/api';
import type { SesionUsuario } from '../lib/types';

interface AuthContextValue {
  usuario: SesionUsuario | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function usuarioGuardado(): SesionUsuario | null {
  try {
    const raw = localStorage.getItem('jeaf_usuario');
    return raw ? (JSON.parse(raw) as SesionUsuario) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<SesionUsuario | null>(usuarioGuardado);

  async function login(email: string, password: string) {
    const data = await api<{ accessToken: string; refreshToken: string; usuario: SesionUsuario }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password }) }
    );
    guardarSesion(data.accessToken, data.refreshToken, data.usuario);
    setUsuario(data.usuario);
  }

  function logout() {
    limpiarSesion();
    setUsuario(null);
  }

  return <AuthContext.Provider value={{ usuario, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
