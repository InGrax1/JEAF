// Formateo de moneda y fechas. Las fechas llegan en UTC desde la API
// y se muestran en la zona horaria local del navegador.

const moneda = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

export function formatoMoneda(valor: number | string): string {
  return moneda.format(typeof valor === 'string' ? Number(valor) : valor);
}

export function formatoFecha(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatoMes(yyyyMM: string): string {
  const [anio, mes] = yyyyMM.split('-').map(Number);
  return new Date(anio, mes - 1, 1).toLocaleDateString('es-MX', { month: 'short', year: '2-digit' });
}

// Folio corto de corrección (spec 10.5): últimos 6 caracteres del UUID
export function folioDe(id: string): string {
  return id.slice(-6).toUpperCase();
}
