// Gestión de usuarios (spec 3.3): alta con rol único, edición, activar/desactivar
// y baja lógica. Exclusivo del Tesorero (super_admin).
import { useEffect, useState, type FormEvent } from 'react';
import { motion } from 'motion/react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { Rol, Usuario } from '../lib/types';
import { Card, Modal, Cargando, MensajeError, inputCls, btnPrimario, btnSecundario } from '../components/ui';

const ETIQUETA_ROL: Record<Rol, string> = {
  super_admin: 'Tesorero (Super Admin)',
  auditor: 'Auditor',
  capturista: 'Auxiliar de Captura',
};

export default function UsuariosPage() {
  const { usuario: sesion } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[] | null>(null);
  const [error, setError] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<Usuario | null>(null);
  const [form, setForm] = useState({ nombre: '', email: '', password: '', rol: 'capturista' as Rol });
  const [procesando, setProcesando] = useState(false);

  async function cargar() {
    try {
      setUsuarios(await api<Usuario[]>('/usuarios'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  function abrirCrear() {
    setEditando(null);
    setForm({ nombre: '', email: '', password: '', rol: 'capturista' });
    setModalAbierto(true);
  }

  function abrirEditar(u: Usuario) {
    setEditando(u);
    setForm({ nombre: u.nombre, email: u.email, password: '', rol: u.rol });
    setModalAbierto(true);
  }

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setProcesando(true);
    setError('');
    try {
      if (editando) {
        const cambios: Record<string, unknown> = {};
        if (form.nombre !== editando.nombre) cambios.nombre = form.nombre;
        if (form.email !== editando.email) cambios.email = form.email;
        if (form.rol !== editando.rol) cambios.rol = form.rol;
        if (form.password) cambios.password = form.password;
        if (Object.keys(cambios).length > 0) {
          await api(`/usuarios/${editando.id}`, { method: 'PUT', body: JSON.stringify(cambios) });
        }
      } else {
        await api('/usuarios', { method: 'POST', body: JSON.stringify(form) });
      }
      setModalAbierto(false);
      cargar();
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : 'Error');
    } finally {
      setProcesando(false);
    }
  }

  async function alternarActivo(u: Usuario) {
    setError('');
    try {
      await api(`/usuarios/${u.id}`, { method: 'PUT', body: JSON.stringify({ activo: !u.activo }) });
      cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  }

  async function eliminar(u: Usuario) {
    if (!window.confirm(`¿Eliminar (baja lógica) a ${u.nombre}? Sus registros históricos se conservan.`)) return;
    setError('');
    try {
      await api(`/usuarios/${u.id}`, { method: 'DELETE' });
      cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-headline-lg text-on-surface">Usuarios</h2>
        <button className={btnPrimario} onClick={abrirCrear}>+ Nuevo usuario</button>
      </div>

      {error && <MensajeError mensaje={error} />}

      <Card className="overflow-x-auto p-0">
        {!usuarios ? (
          <Cargando />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-low text-left text-label-md uppercase text-on-surface-variant">
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u, i) => (
                <motion.tr
                  key={u.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: Math.min(i, 12) * 0.025 }}
                  className={`border-b border-outline-variant last:border-0 hover:bg-surface-container-low ${!u.activo ? 'text-on-surface-variant' : ''}`}
                >
                  <td className="px-4 py-2 font-medium">
                    {u.nombre}
                    {u.id === sesion?.id && <span className="ml-2 text-xs text-secondary">(tú)</span>}
                  </td>
                  <td className="px-4 py-2">{u.email}</td>
                  <td className="px-4 py-2">{ETIQUETA_ROL[u.rol]}</td>
                  <td className="px-4 py-2">
                    {u.activo ? (
                      <span className="rounded-full bg-secondary-container/30 px-2 py-0.5 text-xs font-semibold text-secondary">Activo</span>
                    ) : (
                      <span className="rounded-full bg-surface-container-high px-2 py-0.5 text-xs font-medium text-on-surface-variant">Inactivo</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right text-xs">
                    <button className="mr-3 font-semibold text-primary hover:underline" onClick={() => abrirEditar(u)}>
                      Editar
                    </button>
                    {u.id !== sesion?.id && (
                      <>
                        <button className="mr-3 font-semibold text-amber-600 hover:underline" onClick={() => alternarActivo(u)}>
                          {u.activo ? 'Desactivar' : 'Activar'}
                        </button>
                        <button className="font-semibold text-error hover:underline" onClick={() => eliminar(u)}>
                          Eliminar
                        </button>
                      </>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal
        titulo={editando ? 'Editar usuario' : 'Nuevo usuario'}
        abierto={modalAbierto}
        onCerrar={() => setModalAbierto(false)}
      >
        <form onSubmit={guardar} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-on-surface">Nombre</label>
            <input required minLength={2} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-on-surface">Email</label>
            <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-on-surface">
              {editando ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña'}
            </label>
            <input
              type="password"
              required={!editando}
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className={inputCls}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-on-surface">Rol (único por usuario)</label>
            <select value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value as Rol })} className={inputCls}>
              <option value="capturista">Auxiliar de Captura</option>
              <option value="auditor">Auditor</option>
              <option value="super_admin">Tesorero (Super Admin)</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className={btnSecundario} onClick={() => setModalAbierto(false)}>Cancelar</button>
            <button type="submit" className={btnPrimario} disabled={procesando}>
              {procesando ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
