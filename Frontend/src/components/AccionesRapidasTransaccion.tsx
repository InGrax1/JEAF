// Botones flotantes para registrar ingresos/gastos directo desde el panel web,
// sin depender del Atajo de iOS (el backend ya soporta ambos orígenes vía
// authDual — ver transacciones.routes.js). Viven en Layout.tsx (fuera del
// <Outlet />) para quedar accesibles en cualquier página, todo el tiempo.
import { useState, type FormEvent } from 'react';
import { motion } from 'motion/react';
import { api, ApiError } from '../lib/api';
import { formatoMoneda } from '../lib/format';
import type { Categoria } from '../lib/types';
import { Modal, MensajeError, inputCls, btnPrimario, btnSecundario } from './ui';

type Tipo = 'ingreso' | 'egreso';

// crypto.randomUUID() exige un contexto seguro (HTTPS o localhost) — al
// probar desde el celular por la IP de red en http:// (contexto NO seguro),
// no existe y tronaba antes de llegar al fetch. El backend solo exige que
// idempotencyKey sea un string de 8-191 caracteres (sin formato UUID
// obligatorio), así que basta con degradar a getRandomValues() (disponible
// en cualquier contexto) y, como último recurso, Math.random().
function generarIdempotencyKey(): string {
  if (typeof crypto?.randomUUID === 'function') return crypto.randomUUID();
  if (typeof crypto?.getRandomValues === 'function') {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function AccionesRapidasTransaccion() {
  const [tipo, setTipo] = useState<Tipo | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriaId, setCategoriaId] = useState('');
  const [monto, setMonto] = useState('');
  const [notas, setNotas] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [confirmacion, setConfirmacion] = useState<{ folio: string; monto: string } | null>(null);

  function abrir(t: Tipo) {
    setTipo(t);
    setCategoriaId('');
    setMonto('');
    setNotas('');
    setError('');
    setConfirmacion(null);
    api<Categoria[]>('/categorias')
      .then((cats) => setCategorias(cats.filter((c) => Boolean(c.activo) && c.tipo === t)))
      .catch(() => setCategorias([]));
  }

  function cerrar() {
    setTipo(null);
  }

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!tipo) return;
    setError('');
    setEnviando(true);
    try {
      const data = await api<{ transaccion: { monto: string }; folio: string }>('/transacciones', {
        method: 'POST',
        body: JSON.stringify({
          tipo,
          monto: Number(monto),
          categoriaId,
          notas: notas.trim() || undefined,
          idempotencyKey: generarIdempotencyKey(),
        }),
      });
      setConfirmacion({ folio: data.folio, monto: data.transaccion.monto });
      // Aviso global: Dashboard/Transacciones escuchan este evento para
      // refrescar sus datos si están montados, sin acoplar este componente a ellos.
      window.dispatchEvent(new Event('jeaf:transaccion-creada'));
    } catch (e2) {
      setError(e2 instanceof ApiError ? e2.message : 'Error inesperado');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      {/* Fijos en la esquina inferior derecha en TODA página del panel (z-30:
          por debajo del modal z-50, por encima del contenido normal). El
          bottom suma el área segura de iOS (home indicator en standalone). */}
      <div
        className="fixed right-4 z-30 flex flex-col items-end gap-3"
        style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
      >
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          whileTap={{ scale: 0.94 }}
          transition={{ type: 'spring', stiffness: 300, damping: 22 }}
          onClick={() => abrir('ingreso')}
          className="ambient-shadow flex h-12 items-center gap-2 rounded-full bg-secondary pl-4 pr-5 text-sm font-semibold text-on-secondary"
          aria-label="Registrar ingreso"
        >
          <span className="material-symbols-outlined">add</span>
          Ingreso
        </motion.button>
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          whileTap={{ scale: 0.94 }}
          transition={{ type: 'spring', stiffness: 300, damping: 22, delay: 0.05 }}
          onClick={() => abrir('egreso')}
          className="ambient-shadow flex h-12 items-center gap-2 rounded-full bg-error pl-4 pr-5 text-sm font-semibold text-on-error"
          aria-label="Registrar gasto"
        >
          <span className="material-symbols-outlined">remove</span>
          Gasto
        </motion.button>
      </div>

      <Modal titulo={tipo === 'ingreso' ? 'Registrar ingreso' : 'Registrar gasto'} abierto={tipo !== null} onCerrar={cerrar}>
        {confirmacion ? (
          <div className="space-y-4">
            <p className="rounded-lg border border-secondary/30 bg-secondary-container/30 px-4 py-2.5 text-sm text-on-secondary-container">
              ✓ Registrado — folio <strong>{confirmacion.folio}</strong> por {formatoMoneda(confirmacion.monto)}.
            </p>
            <div className="flex justify-end">
              <button className={btnPrimario} onClick={cerrar}>Listo</button>
            </div>
          </div>
        ) : (
          <form onSubmit={guardar} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-on-surface">Categoría</label>
              <select required value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} className={inputCls}>
                <option value="">Seleccionar…</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-on-surface">Monto</label>
              <input
                type="number"
                required
                min="0.01"
                step="0.01"
                inputMode="decimal"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                className={inputCls}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-on-surface">Notas (opcional)</label>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                rows={2}
                maxLength={500}
                className={inputCls}
                placeholder="Ej. Ofrenda del servicio dominical"
              />
            </div>
            {error && <MensajeError mensaje={error} />}
            <div className="flex justify-end gap-2">
              <button type="button" className={btnSecundario} onClick={cerrar}>Cancelar</button>
              <button type="submit" className={btnPrimario} disabled={enviando || !categoriaId || !monto}>
                {enviando ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
