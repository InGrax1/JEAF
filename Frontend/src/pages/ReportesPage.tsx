// Cierres y reportes legales (FASE 3): descarga del reporte mensual en PDF
// (formato formal con espacio para firma física) y Excel para cruce contable.
import { useState } from 'react';
import { apiDescargar, ApiError } from '../lib/api';
import { Card, MensajeError, inputCls, btnPrimario, btnSecundario } from '../components/ui';

function mesActualISO(): string {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
}

export default function ReportesPage() {
  const [periodo, setPeriodo] = useState(mesActualISO());
  const [descargando, setDescargando] = useState<'pdf' | 'xlsx' | null>(null);
  const [error, setError] = useState('');
  const [ultimo, setUltimo] = useState('');

  async function descargar(formato: 'pdf' | 'xlsx') {
    const [anio, mes] = periodo.split('-').map(Number);
    if (!anio || !mes) {
      setError('Selecciona un mes válido');
      return;
    }
    setError('');
    setDescargando(formato);
    try {
      await apiDescargar(`/reportes/mensual?anio=${anio}&mes=${mes}&formato=${formato}`);
      setUltimo(`Reporte ${formato.toUpperCase()} de ${periodo} descargado correctamente.`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Error al descargar');
    } finally {
      setDescargando(null);
    }
  }

  return (
    <div className="max-w-2xl space-y-4">
      <h2 className="text-headline-lg text-on-surface">Cierres y reportes</h2>

      <Card className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-on-surface">Mes del cierre</label>
          <input
            type="month"
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            max={mesActualISO()}
            className={inputCls}
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <button className={btnPrimario} disabled={descargando !== null} onClick={() => descargar('pdf')}>
            {descargando === 'pdf' ? 'Generando PDF…' : '⬇ Descargar PDF (cierre formal)'}
          </button>
          <button className={btnSecundario} disabled={descargando !== null} onClick={() => descargar('xlsx')}>
            {descargando === 'xlsx' ? 'Generando Excel…' : '⬇ Descargar Excel (cruce contable)'}
          </button>
        </div>

        {error && <MensajeError mensaje={error} />}
        {ultimo && !error && (
          <p className="rounded-lg border border-secondary/30 bg-secondary-container/30 px-4 py-2 text-sm text-on-secondary-container">✓ {ultimo}</p>
        )}
      </Card>

      <Card>
        <h3 className="mb-2 text-headline-md text-primary">Contenido del reporte</h3>
        <ul className="list-inside list-disc space-y-1 text-sm text-on-surface-variant">
          <li>Resumen del mes: total de ingresos, egresos y resultado.</li>
          <li>Desglose por categoría con número de movimientos.</li>
          <li>Detalle completo de movimientos activos (folio, capturista, conciliación).</li>
          <li>Anexo de movimientos cancelados con su motivo (no suman al cierre).</li>
          <li>
            El PDF reserva el <strong>espacio en blanco para firma física</strong> del Tesorero y del
            Pastor/Auditor: se imprime y se firma manualmente.
          </li>
        </ul>
      </Card>
    </div>
  );
}
