import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import { once } from 'node:events';

const require = createRequire(import.meta.url);
const jwt = require('jsonwebtoken');
const env = require('../src/config/env');
const servicio = require('../src/services/transacciones.service');
const app = require('../src/app');
let servidor;
let url;
const id = 'b0000000-0000-4000-8000-000000000001';

beforeAll(async () => {
  servidor = app.listen(0, '127.0.0.1');
  await once(servidor, 'listening');
  url = `http://127.0.0.1:${servidor.address().port}/api/v1/transacciones/${id}/cambiar-fecha`;
});
afterAll(() => new Promise((resolve) => servidor.close(resolve)));
afterEach(() => vi.restoreAllMocks());

async function solicitar(rol, body = { fecha: '2026-09-30', motivo: 'Captura del día anterior' }) {
  const headers = { 'Content-Type': 'application/json' };
  if (rol) headers.Authorization = `Bearer ${jwt.sign({ sub: id, rol }, env.jwt.accessSecret, { expiresIn: '1h' })}`;
  else headers['X-Api-Key'] = 'jeaf_no_autoriza_correcciones';
  return fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
}

describe('permisos y contrato HTTP de cambiar fecha', () => {
  it.each([['auditor', 403], ['capturista', 403], [null, 401]])('rechaza el acceso de %s', async (rol, estado) => {
    const llamada = vi.spyOn(servicio, 'cambiarFecha');
    expect((await solicitar(rol)).status).toBe(estado);
    expect(llamada).not.toHaveBeenCalled();
  });

  it('el Tesorero recibe la respuesta y pasa contexto de auditoría al servicio', async () => {
    const llamada = vi.spyOn(servicio, 'cambiarFecha').mockResolvedValue({ id, fecha_local: '2026-09-30' });
    const respuesta = await solicitar('super_admin');
    expect(respuesta.status).toBe(200);
    expect(await respuesta.json()).toEqual({ ok: true, data: { id, fecha_local: '2026-09-30' } });
    expect(llamada).toHaveBeenCalledWith(id, { fecha: '2026-09-30', motivo: 'Captura del día anterior' }, expect.objectContaining({ usuarioId: id, origen: 'panel_web', ip: '127.0.0.1' }));
  });

  it.each([
    { fecha: '2026-02-30', motivo: 'Error de captura' },
    { fecha: '2026-09-30', motivo: '    ' },
    { fecha: '2026-09-30', motivo: 'Error de captura', monto: 100 },
  ])('valida antes de ejecutar la mutación', async (body) => {
    const llamada = vi.spyOn(servicio, 'cambiarFecha');
    expect((await solicitar('super_admin', body)).status).toBe(400);
    expect(llamada).not.toHaveBeenCalled();
  });
});
