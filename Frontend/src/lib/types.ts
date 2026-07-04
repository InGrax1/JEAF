// Tipos compartidos del panel, espejo de las respuestas de la API JEAF.

export type Rol = 'super_admin' | 'auditor' | 'capturista';

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  activo: number;
  created_at: string;
  updated_at: string;
}

export interface Categoria {
  id: string;
  nombre: string;
  tipo: 'ingreso' | 'egreso';
  activo: number;
  created_at: string;
  updated_at: string;
}

export interface Transaccion {
  id: string;
  tipo: 'ingreso' | 'egreso';
  monto: string; // DECIMAL viaja como string para no perder precisión
  categoria_id: string;
  categoria: string;
  usuario_id: string;
  capturista: string;
  notas: string | null;
  estado: 'activa' | 'cancelada';
  motivo_cancelacion: string | null;
  conciliada: number;
  conciliada_at: string | null;
  origen: 'ios_shortcut' | 'panel_web';
  fecha_transaccion: string;
  created_at: string;
}

export interface ListaTransacciones {
  items: Transaccion[];
  total: number;
  page: number;
  limit: number;
}

export interface ApiKey {
  id: string;
  etiqueta: string;
  key_prefix: string;
  usuario_id: string;
  usuario_nombre: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

export interface DashboardResumen {
  balanceTotal: number;
  mesActual: { ingresos: number; egresos: number };
  anioActual: { ingresos: number; egresos: number };
  serieMensual: { mes: string; ingresos: number; egresos: number }[];
  porCategoriaMes: { categoria: string; tipo: 'ingreso' | 'egreso'; total: number }[];
}

export interface SesionUsuario {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
}
