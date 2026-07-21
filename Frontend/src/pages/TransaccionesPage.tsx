// Gestión de transacciones (spec 3.2): tabla del libro mayor con paginación,
// filtros por fecha/categoría/tipo/estado, conciliación bancaria y cancelación
// con motivo obligatorio (solo Tesorero; el Auditor es solo lectura).
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { motion } from 'motion/react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatoMoneda, formatoFecha, folioDe } from '../lib/format';
import type { Categoria, ListaTransacciones, Transaccion } from '../lib/types';
import { Card, Modal, BadgeTipo, BadgeEstado, Cargando, MensajeError, inputCls, btnPrimario, btnSecundario, btnPeligro } from '../components/ui';

interface Filtros {
  fechaDesde: string;
  fechaHasta: string;
  categoriaId: string;
  tipo: string;
  estado: string;
  conciliada: string;
}

const filtrosIniciales: Filtros = { fechaDesde: '', fechaHasta: '', categoriaId: '', tipo: '', estado: '', conciliada: '' };

export default function TransaccionesPage() {
  const { usuario } = useAuth();
  const esAdmin = usuario?.rol === 'super_admin';

  const [datos, setDatos] = useState<ListaTransacciones | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [filtros, setFiltros] = useState<Filtros>(filtrosIniciales);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [aCancelar, setACancelar] = useState<Transaccion | null>(null);
  const [motivo, setMotivo] = useState('');
  const [procesando, setProcesando] = useState(false);

  const cargar = useCallback(async () => {
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (filtros.fechaDesde) params.set('fechaDesde', new Date(filtros.fechaDesde).toISOString());
      if (filtros.fechaHasta) params.set('fechaHasta', new Date(`${filtros.fechaHasta}T23:59:59`).toISOString());
      if (filtros.categoriaId) params.set('categoriaId', filtros.categoriaId);
      if (filtros.tipo) params.set('tipo', filtros.tipo);
      if (filtros.estado) params.set('estado', filtros.estado);
      if (filtros.conciliada) params.set('conciliada', filtros.conciliada);
      setDatos(await api<ListaTransacciones>(`/transacciones?${params}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  }, [page, filtros]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    // Refresco al registrar un ingreso/gasto desde los botones flotantes (Layout.tsx)
    window.addEventListener('jeaf:transaccion-creada', cargar);
    return () => window.removeEventListener('jeaf:transaccion-creada', cargar);
  }, [cargar]);

  useEffect(() => {
    api<Categoria[]>('/categorias').then(setCategorias).catch(() => {});
  }, []);

  function aplicarFiltros(e: FormEvent) {
    e.preventDefault();
    setPage(1);
    cargar();
  }

  async function confirmarCancelacion() {
    if (!aCancelar) return;
    setProcesando(true);
    try {
      await api(`/transacciones/${aCancelar.id}/cancelar`, {
        method: 'POST',
        body: JSON.stringify({ motivo }),
      });
      setACancelar(null);
      setMotivo('');
      cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setProcesando(false);
    }
  }

  async function alternarConciliada(tx: Transaccion) {
    try {
      await api(`/transacciones/${tx.id}/conciliar`, {
        method: 'POST',
        body: JSON.stringify({ conciliada: !tx.conciliada }),
      });
      cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  }

  const totalPaginas = datos ? Math.max(1, Math.ceil(datos.total / datos.limit)) : 1;

  return (
    <div className="space-y-4">
      <h2 className="text-headline-lg text-on-surface">Transacciones</h2>

      <Card>
        <form onSubmit={aplicarFiltros} className="grid gap-3 sm:grid-cols-3 lg:grid-cols-7">
          <div>
            <label className="mb-1 block text-label-md text-on-surface-variant">Desde</label>
            <input type="date" value={filtros.fechaDesde} onChange={(e) => setFiltros({ ...filtros, fechaDesde: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-label-md text-on-surface-variant">Hasta</label>
            <input type="date" value={filtros.fechaHasta} onChange={(e) => setFiltros({ ...filtros, fechaHasta: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-label-md text-on-surface-variant">Categoría</label>
            <select value={filtros.categoriaId} onChange={(e) => setFiltros({ ...filtros, categoriaId: e.target.value })} className={inputCls}>
              <option value="">Todas</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-label-md text-on-surface-variant">Tipo</label>
            <select value={filtros.tipo} onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value })} className={inputCls}>
              <option value="">Todos</option>
              <option value="ingreso">Ingreso</option>
              <option value="egreso">Egreso</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-label-md text-on-surface-variant">Estado</label>
            <select value={filtros.estado} onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })} className={inputCls}>
              <option value="">Todos</option>
              <option value="activa">Activa</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-label-md text-on-surface-variant">Conciliada</label>
            <select value={filtros.conciliada} onChange={(e) => setFiltros({ ...filtros, conciliada: e.target.value })} className={inputCls}>
              <option value="">Todas</option>
              <option value="true">Sí</option>
              <option value="false">No</option>
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button type="submit" className={btnPrimario}>Filtrar</button>
            <button type="button" className={btnSecundario} onClick={() => { setFiltros(filtrosIniciales); setPage(1); }}>
              Limpiar
            </button>
          </div>
        </form>
      </Card>

      {error && <MensajeError mensaje={error} />}

      <Card className="overflow-x-auto p-0">
        {!datos ? (
          <Cargando />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-low text-left text-label-md uppercase text-on-surface-variant">
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Folio</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3 text-right">Monto</th>
                <th className="px-4 py-3">Capturista</th>
                <th className="px-4 py-3">Notas</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-center">Conciliada</th>
                {esAdmin && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {datos.items.length === 0 && (
                <tr>
                  <td colSpan={esAdmin ? 10 : 9} className="px-4 py-8 text-center text-on-surface-variant">
                    Sin transacciones con los filtros actuales
                  </td>
                </tr>
              )}
              {datos.items.map((tx, i) => (
                <motion.tr
                  key={tx.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: Math.min(i, 12) * 0.025 }}
                  className={`border-b border-outline-variant last:border-0 hover:bg-surface-container-low ${tx.estado === 'cancelada' ? 'bg-surface-container-low text-on-surface-variant' : ''}`}
                >
                  <td className="whitespace-nowrap px-4 py-2">{formatoFecha(tx.fecha_transaccion)}</td>
                  <td className="px-4 py-2 font-mono text-xs">{folioDe(tx.id)}</td>
                  <td className="px-4 py-2"><BadgeTipo tipo={tx.tipo} /></td>
                  <td className="px-4 py-2">{tx.categoria}</td>
                  <td className={`whitespace-nowrap px-4 py-2 text-right font-semibold ${tx.estado === 'cancelada' ? '' : tx.tipo === 'ingreso' ? 'text-secondary' : 'text-error'}`}>
                    {formatoMoneda(tx.monto)}
                  </td>
                  <td className="px-4 py-2">{tx.capturista}</td>
                  <td className="max-w-45 truncate px-4 py-2" title={tx.notas ?? undefined}>
                    {tx.estado === 'cancelada' && tx.motivo_cancelacion ? `Cancelada: ${tx.motivo_cancelacion}` : tx.notas || '—'}
                  </td>
                  <td className="px-4 py-2"><BadgeEstado estado={tx.estado} /></td>
                  <td className="px-4 py-2 text-center">
                    {esAdmin && tx.estado === 'activa' ? (
                      <input
                        type="checkbox"
                        checked={Boolean(tx.conciliada)}
                        onChange={() => alternarConciliada(tx)}
                        className="h-4 w-4 accent-secondary"
                        title="Conciliado en banco"
                      />
                    ) : tx.conciliada ? '✓' : '—'}
                  </td>
                  {esAdmin && (
                    <td className="px-4 py-2 text-right">
                      {tx.estado === 'activa' && (
                        <button
                          onClick={() => { setACancelar(tx); setMotivo(''); }}
                          className="text-xs font-semibold text-error hover:underline"
                        >
                          Cancelar
                        </button>
                      )}
                    </td>
                  )}
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {datos && (
        <div className="flex items-center justify-between text-sm text-on-surface-variant">
          <span>{datos.total} registro(s) — página {datos.page} de {totalPaginas}</span>
          <div className="flex gap-2">
            <button className={btnSecundario} disabled={page <= 1} onClick={() => setPage(page - 1)}>← Anterior</button>
            <button className={btnSecundario} disabled={page >= totalPaginas} onClick={() => setPage(page + 1)}>Siguiente →</button>
          </div>
        </div>
      )}

      <Modal titulo="Cancelar transacción" abierto={aCancelar !== null} onCerrar={() => setACancelar(null)}>
        {aCancelar && (
          <div className="space-y-4">
            <p className="text-sm text-on-surface-variant">
              Folio <span className="font-mono font-semibold text-on-surface">{folioDe(aCancelar.id)}</span> —{' '}
              {formatoMoneda(aCancelar.monto)} ({aCancelar.categoria}).
              <br />
              El registro no se elimina: queda marcado como cancelado con rastro de auditoría.
            </p>
            <div>
              <label className="mb-1 block text-sm font-medium text-on-surface">Razón de cancelación (obligatoria)</label>
              <textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                rows={3}
                minLength={5}
                className={inputCls}
                placeholder="Ej. Monto capturado por error; el correcto es $250.00"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button className={btnSecundario} onClick={() => setACancelar(null)}>Volver</button>
              <button
                className={btnPeligro}
                disabled={motivo.trim().length < 5 || procesando}
                onClick={confirmarCancelacion}
              >
                {procesando ? 'Cancelando…' : 'Confirmar cancelación'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
