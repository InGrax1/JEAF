// Gestión de API Keys para los Atajos de iOS (spec 3.3 y 10.3):
// generar (la key se muestra UNA sola vez) y revocar con efecto inmediato.
import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../lib/api';
import { formatoFecha } from '../lib/format';
import type { ApiKey, Usuario } from '../lib/types';
import { Card, Modal, Cargando, MensajeError, inputCls, btnPrimario, btnSecundario } from '../components/ui';

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[] | null>(null);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [error, setError] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [form, setForm] = useState({ usuarioId: '', etiqueta: '' });
  const [keyGenerada, setKeyGenerada] = useState<string | null>(null);
  const [copiada, setCopiada] = useState(false);
  const [procesando, setProcesando] = useState(false);

  async function cargar() {
    try {
      setKeys(await api<ApiKey[]>('/api-keys'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  }

  useEffect(() => {
    cargar();
    api<Usuario[]>('/usuarios').then(setUsuarios).catch(() => {});
  }, []);

  async function generar(e: FormEvent) {
    e.preventDefault();
    setProcesando(true);
    setError('');
    try {
      const data = await api<{ apiKey: string }>('/api-keys', { method: 'POST', body: JSON.stringify(form) });
      setKeyGenerada(data.apiKey);
      setCopiada(false);
      cargar();
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : 'Error');
    } finally {
      setProcesando(false);
    }
  }

  async function revocar(k: ApiKey) {
    if (!window.confirm(`¿Revocar la key "${k.etiqueta}" de ${k.usuario_nombre}? El Atajo dejará de funcionar de inmediato.`)) return;
    setError('');
    try {
      await api(`/api-keys/${k.id}/revocar`, { method: 'POST' });
      cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  }

  async function copiar() {
    if (!keyGenerada) return;
    await navigator.clipboard.writeText(keyGenerada);
    setCopiada(true);
  }

  function cerrarModal() {
    setModalAbierto(false);
    setKeyGenerada(null);
    setForm({ usuarioId: '', etiqueta: '' });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-headline-lg text-on-surface">API Keys — Atajos de iOS</h2>
        <button className={btnPrimario} onClick={() => setModalAbierto(true)}>+ Generar API Key</button>
      </div>

      {error && <MensajeError mensaje={error} />}

      <Card className="overflow-x-auto p-0">
        {!keys ? (
          <Cargando />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-low text-left text-label-md uppercase text-on-surface-variant">
                <th className="px-4 py-3">Etiqueta</th>
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Prefijo</th>
                <th className="px-4 py-3">Creada</th>
                <th className="px-4 py-3">Último uso</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {keys.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-on-surface-variant">Aún no hay API keys generadas</td>
                </tr>
              )}
              {keys.map((k) => (
                <tr key={k.id} className={`border-b border-outline-variant last:border-0 hover:bg-surface-container-low ${k.revoked_at ? 'text-on-surface-variant' : ''}`}>
                  <td className="px-4 py-2 font-medium">{k.etiqueta}</td>
                  <td className="px-4 py-2">{k.usuario_nombre}</td>
                  <td className="px-4 py-2 font-mono text-xs">{k.key_prefix}…</td>
                  <td className="px-4 py-2">{formatoFecha(k.created_at)}</td>
                  <td className="px-4 py-2">{formatoFecha(k.last_used_at)}</td>
                  <td className="px-4 py-2">
                    {k.revoked_at ? (
                      <span className="rounded-full bg-error-container/60 px-2 py-0.5 text-xs font-semibold text-error">
                        Revocada
                      </span>
                    ) : (
                      <span className="rounded-full bg-secondary-container/30 px-2 py-0.5 text-xs font-semibold text-secondary">
                        Activa
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right text-xs">
                    {!k.revoked_at && (
                      <button className="font-semibold text-error hover:underline" onClick={() => revocar(k)}>
                        Revocar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal titulo={keyGenerada ? 'API Key generada' : 'Generar API Key'} abierto={modalAbierto} onCerrar={cerrarModal}>
        {keyGenerada ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              ⚠️ Guarda esta key ahora: <strong>no volverá a mostrarse</strong>. Pégala en el Atajo de iOS del capturista.
            </div>
            <code className="block break-all rounded-lg bg-inverse-surface px-4 py-3 font-mono text-xs text-secondary-container">
              {keyGenerada}
            </code>
            <div className="flex justify-end gap-2">
              <button className={btnSecundario} onClick={copiar}>{copiada ? '✓ Copiada' : 'Copiar'}</button>
              <button className={btnPrimario} onClick={cerrarModal}>Listo</button>
            </div>
          </div>
        ) : (
          <form onSubmit={generar} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-on-surface">Usuario (capturista)</label>
              <select
                required
                value={form.usuarioId}
                onChange={(e) => setForm({ ...form, usuarioId: e.target.value })}
                className={inputCls}
              >
                <option value="">Seleccionar…</option>
                {usuarios.filter((u) => u.activo).map((u) => (
                  <option key={u.id} value={u.id}>{u.nombre} ({u.email})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-on-surface">Etiqueta del dispositivo</label>
              <input
                required
                minLength={2}
                maxLength={100}
                value={form.etiqueta}
                onChange={(e) => setForm({ ...form, etiqueta: e.target.value })}
                className={inputCls}
                placeholder='Ej. "iPhone de Juan"'
              />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" className={btnSecundario} onClick={cerrarModal}>Cancelar</button>
              <button type="submit" className={btnPrimario} disabled={procesando}>
                {procesando ? 'Generando…' : 'Generar'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
