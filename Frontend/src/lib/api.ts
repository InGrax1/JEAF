// Cliente HTTP del panel: adjunta el JWT, renueva el access token con el
// refresh token ante expiración (una sola vez por petición) y normaliza errores.

// Sin VITE_API_URL (desarrollo local), se usa una ruta relativa: el proxy de
// Vite (vite.config.ts) reenvía /api al backend en localhost:3000. Esto
// permite probar desde el celular con `npm run dev -- --host` sin que el
// teléfono intente resolver "localhost" contra sí mismo. En producción,
// VITE_API_URL apunta a la URL absoluta del backend (Render).
const API_URL = import.meta.env.VITE_API_URL ?? '/api/v1';

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(message: string, code: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function getTokens() {
  return {
    accessToken: localStorage.getItem('jeaf_access'),
    refreshToken: localStorage.getItem('jeaf_refresh'),
  };
}

export function guardarSesion(accessToken: string, refreshToken: string, usuario?: unknown) {
  localStorage.setItem('jeaf_access', accessToken);
  localStorage.setItem('jeaf_refresh', refreshToken);
  if (usuario) localStorage.setItem('jeaf_usuario', JSON.stringify(usuario));
}

export function limpiarSesion() {
  localStorage.removeItem('jeaf_access');
  localStorage.removeItem('jeaf_refresh');
  localStorage.removeItem('jeaf_usuario');
}

async function intentarRefresh(): Promise<boolean> {
  const { refreshToken } = getTokens();
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const json = await res.json();
    guardarSesion(json.data.accessToken, json.data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

export async function api<T>(path: string, options: RequestInit = {}, reintento = false): Promise<T> {
  const { accessToken } = getTokens();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    throw new ApiError('No se pudo conectar con el servidor', 'NETWORK_ERROR', 0);
  }

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    const code = json?.error?.code ?? 'UNKNOWN';
    // Access token expirado: renovar y reintentar una sola vez
    if (res.status === 401 && code === 'TOKEN_EXPIRED' && !reintento) {
      const renovado = await intentarRefresh();
      if (renovado) return api<T>(path, options, true);
    }
    if (res.status === 401 && !path.startsWith('/auth/')) {
      limpiarSesion();
      window.location.href = '/login';
    }
    throw new ApiError(json?.error?.message ?? 'Error del servidor', code, res.status);
  }

  return json.data as T;
}

/**
 * Descarga un archivo autenticado (reportes PDF/Excel) y dispara el guardado
 * en el navegador respetando el nombre sugerido por el servidor.
 */
export async function apiDescargar(path: string, reintento = false): Promise<void> {
  const { accessToken } = getTokens();
  const res = await fetch(`${API_URL}${path}`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });

  if (!res.ok) {
    const json = await res.json().catch(() => null);
    const code = json?.error?.code ?? 'UNKNOWN';
    if (res.status === 401 && code === 'TOKEN_EXPIRED' && !reintento) {
      const renovado = await intentarRefresh();
      if (renovado) return apiDescargar(path, true);
    }
    throw new ApiError(json?.error?.message ?? 'No se pudo descargar el archivo', code, res.status);
  }

  const disposicion = res.headers.get('Content-Disposition') ?? '';
  const nombre = /filename="?([^";]+)"?/.exec(disposicion)?.[1] ?? 'reporte';
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}
