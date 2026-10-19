import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const db = require('../src/config/db');
const repositorio = require('../src/repositories/transacciones.repository');
const auditoria = require('../src/services/audit.service');
const servicio = require('../src/services/transacciones.service');
const { cambiarDiaLocal, fechaLocalISO, rangoMesLocal } = require('../src/utils/fechas');
const { cambiarFechaTransaccionSchema } = require('../src/validators/schemas');

const contexto = { usuarioId: 'tesorero', ip: '127.0.0.1', origen: 'panel_web' };
const anterior = { id: 'tx-1', estado: 'activa', fecha_transaccion: new Date('2026-10-02T05:30:00Z'), created_at: new Date('2026-10-02T05:30:00Z'), monto: '100.00' };
const conn = {};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-18T18:00:00Z'));
  vi.spyOn(db, 'withTransaction').mockImplementation((fn) => fn(conn));
  vi.spyOn(repositorio, 'findByIdParaActualizar').mockResolvedValue(anterior);
  vi.spyOn(repositorio, 'findById').mockResolvedValue({ ...anterior, fecha_transaccion: new Date('2026-10-01T05:30:00Z') });
  vi.spyOn(repositorio, 'cambiarFecha').mockResolvedValue();
  vi.spyOn(auditoria, 'registrar').mockResolvedValue();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('corrección manual de fecha', () => {
  it('traslada al mes anterior en hora local y audita con la misma conexión', async () => {
    const resultado = await servicio.cambiarFecha('tx-1', { fecha: '2026-09-30', motivo: 'Captura realizada un día después' }, contexto);
    expect(repositorio.findByIdParaActualizar).toHaveBeenCalledWith('tx-1', conn);
    expect(repositorio.cambiarFecha).toHaveBeenCalledWith('tx-1', new Date('2026-10-01T05:30:00Z'), conn);
    expect(auditoria.registrar).toHaveBeenCalledWith(expect.objectContaining({
      accion: 'UPDATE', usuarioId: 'tesorero', ipAddress: '127.0.0.1',
      estadoAnterior: { fecha_transaccion: anterior.fecha_transaccion, fecha_local: '2026-10-01' },
      estadoNuevo: expect.objectContaining({ fecha_local: '2026-09-30', motivo_cambio_fecha: 'Captura realizada un día después' }),
    }), conn);
    expect(resultado.created_at).toEqual(anterior.created_at);
    expect(resultado.monto).toBe('100.00');
    expect(resultado.fecha_local).toBe('2026-09-30');
    const septiembre = rangoMesLocal(2026, 9);
    expect(resultado.fecha_transaccion >= septiembre.desde && resultado.fecha_transaccion < septiembre.hasta).toBe(true);
  });

  it('permite mover varios días hacia adelante sin pasar de hoy', async () => {
    await servicio.cambiarFecha('tx-1', { fecha: '2026-10-15', motivo: 'Corrección del día real' }, contexto);
    expect(repositorio.cambiarFecha).toHaveBeenCalledWith('tx-1', new Date('2026-10-16T05:30:00Z'), conn);
  });

  it.each([
    [null, 'TRANSACTION_NOT_FOUND'],
    [{ ...anterior, estado: 'cancelada' }, 'CANCELLED_TRANSACTION'],
  ])('rechaza un registro inexistente o cancelado', async (registro, code) => {
    repositorio.findByIdParaActualizar.mockResolvedValue(registro);
    await expect(servicio.cambiarFecha('tx-1', { fecha: '2026-09-30', motivo: 'Error de captura' }, contexto)).rejects.toMatchObject({ code });
    expect(repositorio.cambiarFecha).not.toHaveBeenCalled();
    expect(auditoria.registrar).not.toHaveBeenCalled();
  });

  it('rechaza fechas futuras respecto al calendario de la iglesia', async () => {
    vi.setSystemTime(new Date('2026-10-19T02:00:00Z')); // Aún es 18 en México.
    await expect(servicio.cambiarFecha('tx-1', { fecha: '2026-10-19', motivo: 'Error de captura' }, contexto)).rejects.toMatchObject({ code: 'FUTURE_DATE' });
    expect(repositorio.cambiarFecha).not.toHaveBeenCalled();
  });

  it('un reintento con el mismo día no escribe ni duplica auditoría', async () => {
    await servicio.cambiarFecha('tx-1', { fecha: '2026-10-01', motivo: 'Error de captura' }, contexto);
    expect(repositorio.cambiarFecha).not.toHaveBeenCalled();
    expect(auditoria.registrar).not.toHaveBeenCalled();
  });

  it('propaga el fallo de auditoría para que withTransaction haga rollback', async () => {
    auditoria.registrar.mockRejectedValue(new Error('Fallo de auditoría'));
    await expect(servicio.cambiarFecha('tx-1', { fecha: '2026-09-30', motivo: 'Error de captura' }, contexto)).rejects.toThrow('Fallo de auditoría');
  });
});

describe('calendario y zona horaria', () => {
  it.each(['2026-02-29', '2026-04-31', '2026-13-01', '2026-00-10', '18/10/2026', '2026-10-18T00:00:00Z'])('rechaza el día inválido %s', (fecha) => {
    expect(cambiarFechaTransaccionSchema.validate({ fecha, motivo: 'Error de captura' }).error).toBeDefined();
  });

  it.each(['', '    ', 'abc'])('exige un motivo significativo', (motivo) => {
    expect(cambiarFechaTransaccionSchema.validate({ fecha: '2024-02-29', motivo }).error).toBeDefined();
  });

  it('acepta el día bisiesto y rechaza campos que alteren dinero', () => {
    expect(cambiarFechaTransaccionSchema.validate({ fecha: '2024-02-29', motivo: 'Captura tardía' }).error).toBeUndefined();
    expect(cambiarFechaTransaccionSchema.validate({ fecha: '2024-02-29', motivo: 'Captura tardía', monto: 10 }).error).toBeDefined();
  });

  it('cruza año y conserva las 23:30 locales sin depender de la zona del cliente', () => {
    const fecha = cambiarDiaLocal('2026-01-03T05:30:00Z', '2025-12-31', 'America/Mexico_City');
    expect(fecha.toISOString()).toBe('2026-01-01T05:30:00.000Z');
    expect(fechaLocalISO(fecha, 'America/Mexico_City')).toBe('2025-12-31');
  });

  it('resuelve el desfase del día elegido cuando hay horario de verano', () => {
    expect(cambiarDiaLocal('2026-01-15T17:00:00Z', '2026-07-15', 'America/New_York').toISOString()).toBe('2026-07-15T16:00:00.000Z');
  });

  it('rechaza horas inexistentes durante el adelanto del reloj', () => {
    expect(() => cambiarDiaLocal('2026-03-07T07:30:00Z', '2026-03-08', 'America/New_York')).toThrow('La hora original no existe');
  });
});
