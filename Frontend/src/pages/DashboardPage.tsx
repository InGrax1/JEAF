// Dashboard financiero (spec 3.2): flujo de caja, ingresos vs gastos
// mensual/anual y desglose porcentual por categorías del mes en curso.
import { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { api } from '../lib/api';
import { formatoMoneda, formatoMes } from '../lib/format';
import type { DashboardResumen } from '../lib/types';
import { Card, Cargando, MensajeError } from '../components/ui';

const COLORES = ['#006c49', '#0ea972', '#3fc38f', '#7ad9b3', '#c3ecd9', '#e0a030', '#ba1a1a', '#76777d'];

function TarjetaCifra({ titulo, valor, tono }: { titulo: string; valor: number; tono?: 'verde' | 'rojo' }) {
  const color = tono === 'verde' ? 'text-secondary' : tono === 'rojo' ? 'text-error' : 'text-primary';
  return (
    <Card>
      <p className="text-label-md uppercase text-on-surface-variant">{titulo}</p>
      <p className={`mt-1 text-stats-lg ${color}`}>{formatoMoneda(valor)}</p>
    </Card>
  );
}

function PieCategorias({ datos, titulo }: { datos: { categoria: string; total: number }[]; titulo: string }) {
  const total = datos.reduce((s, d) => s + d.total, 0);
  return (
    <Card>
      <h3 className="mb-2 text-headline-md text-primary">{titulo}</h3>
      {datos.length === 0 ? (
        <p className="py-10 text-center text-sm text-on-surface-variant">Sin movimientos este mes</p>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={datos} dataKey="total" nameKey="categoria" innerRadius={45} outerRadius={80}>
                {datos.map((_, i) => (
                  <Cell key={i} fill={COLORES[i % COLORES.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => formatoMoneda(Number(v))} />
            </PieChart>
          </ResponsiveContainer>
          <ul className="mt-2 space-y-1 text-sm">
            {datos.map((d, i) => (
              <li key={d.categoria} className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-on-surface">
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: COLORES[i % COLORES.length] }} />
                  {d.categoria}
                </span>
                <span className="font-semibold text-on-surface-variant">
                  {total > 0 ? `${((d.total / total) * 100).toFixed(1)}%` : '—'} · {formatoMoneda(d.total)}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

export default function DashboardPage() {
  const [resumen, setResumen] = useState<DashboardResumen | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<DashboardResumen>('/dashboard/resumen')
      .then(setResumen)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <MensajeError mensaje={error} />;
  if (!resumen) return <Cargando texto="Cargando dashboard…" />;

  const serie = resumen.serieMensual.map((m) => ({ ...m, mes: formatoMes(m.mes) }));
  const ingresosCat = resumen.porCategoriaMes.filter((c) => c.tipo === 'ingreso');
  const egresosCat = resumen.porCategoriaMes.filter((c) => c.tipo === 'egreso');

  return (
    <div className="space-y-6">
      <h2 className="text-headline-lg text-on-surface">Dashboard financiero</h2>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <TarjetaCifra titulo="Flujo de caja (balance total)" valor={resumen.balanceTotal} />
        <TarjetaCifra titulo="Ingresos del mes" valor={resumen.mesActual.ingresos} tono="verde" />
        <TarjetaCifra titulo="Egresos del mes" valor={resumen.mesActual.egresos} tono="rojo" />
        <TarjetaCifra
          titulo="Resultado del año"
          valor={resumen.anioActual.ingresos - resumen.anioActual.egresos}
          tono={resumen.anioActual.ingresos - resumen.anioActual.egresos >= 0 ? 'verde' : 'rojo'}
        />
      </div>

      <Card>
        <h3 className="mb-2 text-headline-md text-primary">Ingresos vs egresos — últimos 12 meses</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={serie}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#c6c6cd" />
            <XAxis dataKey="mes" fontSize={12} stroke="#45464d" />
            <YAxis fontSize={12} stroke="#45464d" tickFormatter={(v) => `$${Number(v).toLocaleString()}`} />
            <Tooltip formatter={(v) => formatoMoneda(Number(v))} />
            <Legend />
            <Bar dataKey="ingresos" name="Ingresos" fill="#006c49" radius={[3, 3, 0, 0]} />
            <Bar dataKey="egresos" name="Egresos" fill="#ba1a1a" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <PieCategorias datos={ingresosCat} titulo="Ingresos del mes por categoría" />
        <PieCategorias datos={egresosCat} titulo="Egresos del mes por categoría" />
      </div>
    </div>
  );
}
