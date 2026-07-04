// Pruebas unitarias del motor de transacciones (spec 10.6: foco en services/).
// Estrategia: los módulos son CommonJS y comparten instancia en la caché de
// require, así que se usa vi.spyOn sobre los módulos reales en lugar de
// vi.mock. La integración real contra MySQL se cubrirá en FASE 4.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'node:module';

// createRequire garantiza obtener la MISMA instancia (caché nativa de require)
// que usan los módulos CJS del backend entre sí.
const require = createRequire(import.meta.url);
const db = require('../src/config/db');
const transaccionesRepository = require('../src/repositories/transacciones.repository');
const categoriasRepository = require('../src/repositories/categorias.repository');
const auditService = require('../src/services/audit.service');
const service = require('../src/services/transacciones.service');

const contexto = { usuarioId: 'u-1', ip: '127.0.0.1', origen: 'ios_shortcut' };
const categoriaIngreso = { id: 'cat-1', nombre: 'Diezmo', tipo: 'ingreso', activo: 1 };

const payloadBase = {
  tipo: 'ingreso',
  monto: 150.5,
  categoriaId: 'cat-1',
  notas: 'Contado por Juan y Pedro',
  idempotencyKey: 'key-abc-123',
};

beforeEach(() => {
  // withTransaction se sustituye para no tocar MySQL: ejecuta el callback con una conexión ficticia
  vi.spyOn(db, 'withTransaction').mockImplementation(async (fn) => fn({}));
  vi.spyOn(auditService, 'registrar').mockResolvedValue();
  vi.spyOn(transaccionesRepository, 'insert').mockResolvedValue();
  vi.spyOn(transaccionesRepository, 'findById').mockResolvedValue(null);
  vi.spyOn(transaccionesRepository, 'findByIdempotencyKey').mockResolvedValue(null);
  vi.spyOn(transaccionesRepository, 'cancelar').mockResolvedValue();
  vi.spyOn(transaccionesRepository, 'setConciliada').mockResolvedValue();
  vi.spyOn(categoriasRepository, 'findById').mockResolvedValue(null);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('transacciones.service.crear', () => {
  it('crea la transacción, normaliza el monto a 2 decimales y audita el INSERT', async () => {
    categoriasRepository.findById.mockResolvedValue(categoriaIngreso);
    transaccionesRepository.findById.mockResolvedValue({ id: 'tx-nueva', monto: '150.50' });

    const resultado = await service.crear(payloadBase, contexto);

    expect(transaccionesRepository.insert).toHaveBeenCalledWith(
      expect.objectContaining({ monto: '150.50', origen: 'ios_shortcut' }),
      expect.anything()
    );
    expect(auditService.registrar).toHaveBeenCalledWith(
      expect.objectContaining({ tabla: 'transacciones', accion: 'INSERT' }),
      expect.anything()
    );
    expect(resultado.duplicada).toBe(false);
    // Folio corto (spec 10.5): últimos 6 caracteres del UUID generado, en mayúsculas
    expect(resultado.folio).toMatch(/^[0-9A-F]{6}$/);
  });

  it('rechaza categoría inexistente', async () => {
    categoriasRepository.findById.mockResolvedValue(null);
    await expect(service.crear(payloadBase, contexto)).rejects.toMatchObject({ code: 'CATEGORY_NOT_FOUND' });
  });

  it('rechaza categoría desactivada', async () => {
    categoriasRepository.findById.mockResolvedValue({ ...categoriaIngreso, activo: 0 });
    await expect(service.crear(payloadBase, contexto)).rejects.toMatchObject({ code: 'CATEGORY_INACTIVE' });
  });

  it('rechaza cuando el tipo no coincide con el de la categoría', async () => {
    categoriasRepository.findById.mockResolvedValue(categoriaIngreso);
    await expect(service.crear({ ...payloadBase, tipo: 'egreso' }, contexto)).rejects.toMatchObject({
      code: 'CATEGORY_TYPE_MISMATCH',
    });
  });

  it('idempotencia: ante idempotency_key duplicada devuelve la existente sin duplicar', async () => {
    categoriasRepository.findById.mockResolvedValue(categoriaIngreso);
    const errorDup = Object.assign(new Error("Duplicate entry 'key-abc-123' for key 'uq_transacciones_idempotency'"), {
      code: 'ER_DUP_ENTRY',
    });
    transaccionesRepository.insert.mockRejectedValue(errorDup);
    transaccionesRepository.findByIdempotencyKey.mockResolvedValue({ id: 'tx-original', monto: '150.50' });

    const resultado = await service.crear(payloadBase, contexto);

    expect(resultado.duplicada).toBe(true);
    expect(resultado.transaccion.id).toBe('tx-original');
    expect(transaccionesRepository.findByIdempotencyKey).toHaveBeenCalledWith('key-abc-123');
  });
});

describe('transacciones.service.cancelar', () => {
  it('cancela con motivo y audita CANCEL con estado anterior', async () => {
    transaccionesRepository.findById
      .mockResolvedValueOnce({ id: 'tx-1', estado: 'activa', monto: '100.00' })
      .mockResolvedValueOnce({ id: 'tx-1', estado: 'cancelada' });

    await service.cancelar('tx-1', { motivo: 'Monto capturado por error' }, contexto);

    expect(transaccionesRepository.cancelar).toHaveBeenCalledWith(
      'tx-1',
      { motivo: 'Monto capturado por error', canceladaPor: 'u-1' },
      expect.anything()
    );
    expect(auditService.registrar).toHaveBeenCalledWith(
      expect.objectContaining({ accion: 'CANCEL', estadoAnterior: expect.objectContaining({ estado: 'activa' }) }),
      expect.anything()
    );
  });

  it('rechaza cancelar una transacción ya cancelada', async () => {
    transaccionesRepository.findById.mockResolvedValue({ id: 'tx-1', estado: 'cancelada' });
    await expect(service.cancelar('tx-1', { motivo: 'Duplicado' }, contexto)).rejects.toMatchObject({
      code: 'ALREADY_CANCELLED',
    });
  });
});

describe('transacciones.service.conciliar', () => {
  it('rechaza conciliar una transacción cancelada', async () => {
    transaccionesRepository.findById.mockResolvedValue({ id: 'tx-1', estado: 'cancelada' });
    await expect(service.conciliar('tx-1', { conciliada: true }, contexto)).rejects.toMatchObject({
      code: 'CANCELLED_TRANSACTION',
    });
  });

  it('marca como conciliada y audita el UPDATE', async () => {
    transaccionesRepository.findById
      .mockResolvedValueOnce({ id: 'tx-1', estado: 'activa', conciliada: 0 })
      .mockResolvedValueOnce({ id: 'tx-1', estado: 'activa', conciliada: 1 });

    await service.conciliar('tx-1', { conciliada: true }, contexto);

    expect(transaccionesRepository.setConciliada).toHaveBeenCalledWith('tx-1', true, expect.anything());
    expect(auditService.registrar).toHaveBeenCalledWith(
      expect.objectContaining({ accion: 'UPDATE', estadoNuevo: { conciliada: true } }),
      expect.anything()
    );
  });
});
