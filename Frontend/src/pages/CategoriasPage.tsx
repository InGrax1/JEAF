// Módulo de configuración de categorías (spec 3.3): CRUD con
// activar/desactivar (soft delete) sin afectar el histórico.
import { useEffect, useState, type FormEvent } from 'react';
import { motion } from 'motion/react';
import { api } from '../lib/api';
import type { Categoria } from '../lib/types';
import { Card, Modal, BadgeTipo, Cargando, MensajeError, inputCls, btnPrimario, btnSecundario, btnPeligro } from '../components/ui';

export default function CategoriasPage() {
  const [categorias, setCategorias] = useState<Categoria[] | null>(null);
  const [error, setError] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<Categoria | null>(null);
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<'ingreso' | 'egreso'>('ingreso');
  const [procesando, setProcesando] = useState(false);
  const [aEliminar, setAEliminar] = useState<Categoria | null>(null);
  const [estadoUso, setEstadoUso] = useState<'consultando' | 'usada' | 'libre' | null>(null);
  const [errorEliminar, setErrorEliminar] = useState('');

  async function cargar() {
    try {
      setCategorias(await api<Categoria[]>('/categorias'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  function abrirCrear() {
    setEditando(null);
    setNombre('');
    setTipo('ingreso');
    setModalAbierto(true);
  }

  function abrirEditar(cat: Categoria) {
    setEditando(cat);
    setNombre(cat.nombre);
    setTipo(cat.tipo);
    setModalAbierto(true);
  }

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setProcesando(true);
    setError('');
    try {
      if (editando) {
        const cambios: Record<string, unknown> = {};
        if (nombre !== editando.nombre) cambios.nombre = nombre;
        if (tipo !== editando.tipo) cambios.tipo = tipo;
        if (Object.keys(cambios).length > 0) {
          await api(`/categorias/${editando.id}`, { method: 'PUT', body: JSON.stringify(cambios) });
        }
      } else {
        await api('/categorias', { method: 'POST', body: JSON.stringify({ nombre, tipo }) });
      }
      setModalAbierto(false);
      cargar();
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : 'Error');
    } finally {
      setProcesando(false);
    }
  }

  async function alternarActivo(cat: Categoria) {
    setError('');
    try {
      await api(`/categorias/${cat.id}`, { method: 'PUT', body: JSON.stringify({ activo: !cat.activo }) });
      cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  }

  async function abrirEliminar(cat: Categoria) {
    setAEliminar(cat);
    setEstadoUso('consultando');
    setErrorEliminar('');
    try {
      const resultado = await api<{ enUso: boolean }>(`/categorias/${cat.id}/uso`);
      setEstadoUso(resultado.enUso ? 'usada' : 'libre');
    } catch (e) {
      setEstadoUso(null);
      setErrorEliminar(e instanceof Error ? e.message : 'No se pudo verificar la categoría');
    }
  }

  async function confirmarEliminar() {
    if (!aEliminar || estadoUso !== 'libre') return;
    setProcesando(true);
    setErrorEliminar('');
    try {
      await api(`/categorias/${aEliminar.id}`, { method: 'DELETE' });
      setAEliminar(null);
      setEstadoUso(null);
      cargar();
    } catch (e) {
      setErrorEliminar(e instanceof Error ? e.message : 'Error');
    } finally {
      setProcesando(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-headline-lg text-on-surface">Categorías contables</h2>
        <button className={btnPrimario} onClick={abrirCrear}>+ Nueva categoría</button>
      </div>

      {error && <MensajeError mensaje={error} />}

      <Card className="overflow-x-auto p-0">
        {!categorias ? (
          <Cargando />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-low text-left text-label-md uppercase text-on-surface-variant">
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {categorias.map((cat, i) => (
                <motion.tr
                  key={cat.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: Math.min(i, 12) * 0.025 }}
                  className={`border-b border-outline-variant last:border-0 hover:bg-surface-container-low ${!cat.activo ? 'text-on-surface-variant' : ''}`}
                >
                  <td className="px-4 py-2 font-medium">{cat.nombre}</td>
                  <td className="px-4 py-2"><BadgeTipo tipo={cat.tipo} /></td>
                  <td className="px-4 py-2">
                    {cat.activo ? (
                      <span className="rounded-full bg-secondary-container/30 px-2 py-0.5 text-xs font-semibold text-secondary">Activa</span>
                    ) : (
                      <span className="rounded-full bg-surface-container-high px-2 py-0.5 text-xs font-medium text-on-surface-variant">Desactivada</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right text-xs">
                    <button className="mr-3 font-semibold text-primary hover:underline" onClick={() => abrirEditar(cat)}>
                      Editar
                    </button>
                    <button
                      className={`mr-3 font-semibold hover:underline ${cat.activo ? 'text-amber-600' : 'text-secondary'}`}
                      onClick={() => alternarActivo(cat)}
                    >
                      {cat.activo ? 'Desactivar' : 'Activar'}
                    </button>
                    <button className="font-semibold text-error hover:underline" onClick={() => abrirEliminar(cat)}>
                      Eliminar
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal
        titulo={editando ? 'Editar categoría' : 'Nueva categoría'}
        abierto={modalAbierto}
        onCerrar={() => setModalAbierto(false)}
      >
        <form onSubmit={guardar} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-on-surface">Nombre</label>
            <input required minLength={2} maxLength={100} value={nombre} onChange={(e) => setNombre(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-on-surface">Tipo</label>
            <select value={tipo} onChange={(e) => setTipo(e.target.value as 'ingreso' | 'egreso')} className={inputCls}>
              <option value="ingreso">Ingreso</option>
              <option value="egreso">Egreso</option>
            </select>
            {editando && (
              <p className="mt-1 text-xs text-on-surface-variant">
                El tipo solo puede cambiarse si la categoría no tiene transacciones históricas.
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className={btnSecundario} onClick={() => setModalAbierto(false)}>Cancelar</button>
            <button type="submit" className={btnPrimario} disabled={procesando}>
              {procesando ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        titulo="Eliminar categoría"
        abierto={aEliminar !== null}
        onCerrar={() => { setAEliminar(null); setEstadoUso(null); }}
      >
        {aEliminar && (
          <div className="space-y-4">
            {estadoUso === 'consultando' && (
              <div className="flex items-center gap-3 rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant">
                <span className="material-symbols-outlined animate-spin" aria-hidden="true">progress_activity</span>
                Verificando si la categoría fue utilizada…
              </div>
            )}
            {estadoUso === 'usada' && (
              <div className="rounded-lg border border-error/30 bg-error-container px-4 py-3">
                <p className="font-semibold text-on-error-container">Esta categoría ya fue utilizada</p>
                <p className="mt-1 text-sm text-on-error-container">
                  <strong>{aEliminar.nombre}</strong> no se puede borrar porque forma parte del historial.
                  Puedes desactivarla para que deje de aparecer al registrar movimientos.
                </p>
              </div>
            )}
            {estadoUso === 'libre' && (
              <div className="rounded-lg border border-error/30 bg-error-container px-4 py-3">
                <p className="font-semibold text-on-error-container">Borrado permanente</p>
                <p className="mt-1 text-sm text-on-error-container">
                  <strong>{aEliminar.nombre}</strong> nunca ha sido utilizada y se eliminará de forma definitiva.
                  Esta acción no se puede deshacer.
                </p>
              </div>
            )}
            {errorEliminar && <MensajeError mensaje={errorEliminar} />}
            <div className="flex justify-end gap-2">
              <button className={btnSecundario} onClick={() => { setAEliminar(null); setEstadoUso(null); }}>
                {estadoUso === 'usada' ? 'Entendido' : 'Volver'}
              </button>
              {estadoUso === 'libre' && (
                <button className={btnPeligro} disabled={procesando} onClick={confirmarEliminar}>
                  {procesando ? 'Eliminando…' : 'Eliminar permanentemente'}
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
