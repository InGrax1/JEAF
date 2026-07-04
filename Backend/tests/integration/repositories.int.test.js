// Pruebas de INTEGRACIÓN (spec 10.6): repositories/ contra una base de datos
// MySQL real (jeaf_test), no mocks. Crea el esquema completo antes de correr
// y elimina la base al terminar. Ejecutar con: npm run test:int
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);

// Credenciales reales desde .env (o del entorno de CI), pero SIEMPRE
// apuntando a la base de pruebas jeaf_test — nunca a la operativa.
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
process.env.DB_NAME = 'jeaf_test';
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test_access';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test_refresh';

const mysql = require('mysql2/promise');
const { pool } = require('../../src/config/db');
const usuariosRepository = require('../../src/repositories/usuarios.repository');
const categoriasRepository = require('../../src/repositories/categorias.repository');
const transaccionesRepository = require('../../src/repositories/transacciones.repository');
const apiKeysRepository = require('../../src/repositories/apiKeys.repository');
const logsRepository = require('../../src/repositories/logs.repository');

const ROL_ID = 'a0000000-0000-4000-8000-000000000001';
const USUARIO_ID = 'b0000000-0000-4000-8000-000000000001';
const CAT_INGRESO = 'c0000000-0000-4000-8000-000000000001';
const CAT_EGRESO = 'c0000000-0000-4000-8000-000000000004';

let admin; // conexión sin base seleccionada, para DDL

beforeAll(async () => {
  admin = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });

  // Esquema real del proyecto, redirigido a jeaf_test
  const schema = fs
    .readFileSync(path.join(__dirname, '..', '..', 'database', 'schema.sql'), 'utf-8')
    .replace('CREATE DATABASE IF NOT EXISTS jeaf', 'CREATE DATABASE IF NOT EXISTS jeaf_test')
    .replace('USE jeaf;', 'USE jeaf_test;');
  await admin.query('DROP DATABASE IF EXISTS jeaf_test');
  await admin.query(schema);

  // Datos mínimos: rol, usuario y categorías
  await admin.query(`
    USE jeaf_test;
    INSERT INTO roles (id, nombre) VALUES ('${ROL_ID}', 'super_admin');
    INSERT INTO usuarios (id, nombre, email, password_hash, rol_id)
      VALUES ('${USUARIO_ID}', 'Tesorero Test', 'test@jeaf.local', 'hash-no-usado', '${ROL_ID}');
    INSERT INTO categorias (id, nombre, tipo) VALUES
      ('${CAT_INGRESO}', 'Diezmo', 'ingreso'),
      ('${CAT_EGRESO}', 'Mantenimiento', 'egreso');
  `);
}, 30000);

afterAll(async () => {
  if (admin) {
    await admin.query('DROP DATABASE IF EXISTS jeaf_test');
    await admin.end();
  }
  await pool.end();
});

function txBase(extra = {}) {
  return {
    id: crypto.randomUUID(),
    tipo: 'ingreso',
    monto: '100.00',
    categoriaId: CAT_INGRESO,
    usuarioId: USUARIO_ID,
    notas: 'integración',
    idempotencyKey: `int-${crypto.randomUUID()}`,
    origen: 'ios_shortcut',
    ...extra,
  };
}

describe('transacciones.repository (MySQL real)', () => {
  it('inserta y recupera con joins de categoría y capturista', async () => {
    const tx = txBase();
    await transaccionesRepository.insert(tx);
    const guardada = await transaccionesRepository.findById(tx.id);
    expect(guardada).not.toBeNull();
    expect(guardada.monto).toBe('100.00'); // DECIMAL exacto, sin flotantes
    expect(guardada.categoria).toBe('Diezmo');
    expect(guardada.capturista).toBe('Tesorero Test');
    expect(guardada.estado).toBe('activa');
  });

  it('el índice único de idempotency_key rechaza duplicados (ER_DUP_ENTRY)', async () => {
    const key = `int-dup-${Date.now()}`;
    await transaccionesRepository.insert(txBase({ idempotencyKey: key }));
    await expect(transaccionesRepository.insert(txBase({ idempotencyKey: key }))).rejects.toMatchObject({
      code: 'ER_DUP_ENTRY',
    });
    const existente = await transaccionesRepository.findByIdempotencyKey(key);
    expect(existente).not.toBeNull();
  });

  it('la restricción CHECK rechaza montos negativos a nivel de base de datos', async () => {
    await expect(transaccionesRepository.insert(txBase({ monto: '-50.00' }))).rejects.toThrow();
  });

  it('cancelar solo afecta transacciones activas y nunca borra la fila', async () => {
    const tx = txBase();
    await transaccionesRepository.insert(tx);
    await transaccionesRepository.cancelar(tx.id, { motivo: 'Error de captura', canceladaPor: USUARIO_ID });

    const cancelada = await transaccionesRepository.findById(tx.id);
    expect(cancelada.estado).toBe('cancelada');
    expect(cancelada.motivo_cancelacion).toBe('Error de captura');
    expect(cancelada.deleted_at).not.toBeNull();

    // Reintento de cancelación: el WHERE estado='activa' lo vuelve inocuo
    await transaccionesRepository.cancelar(tx.id, { motivo: 'Otro motivo', canceladaPor: USUARIO_ID });
    const igual = await transaccionesRepository.findById(tx.id);
    expect(igual.motivo_cancelacion).toBe('Error de captura');
  });

  it('marca y desmarca conciliación bancaria', async () => {
    const tx = txBase();
    await transaccionesRepository.insert(tx);
    await transaccionesRepository.setConciliada(tx.id, true);
    expect((await transaccionesRepository.findById(tx.id)).conciliada).toBe(1);
    await transaccionesRepository.setConciliada(tx.id, false);
    const fila = await transaccionesRepository.findById(tx.id);
    expect(fila.conciliada).toBe(0);
    expect(fila.conciliada_at).toBeNull();
  });

  it('lista con filtros y paginación', async () => {
    const egreso = txBase({ tipo: 'egreso', categoriaId: CAT_EGRESO, monto: '75.25' });
    await transaccionesRepository.insert(egreso);

    const soloEgresos = await transaccionesRepository.list({ tipo: 'egreso', page: 1, limit: 10 });
    expect(soloEgresos.total).toBeGreaterThanOrEqual(1);
    expect(soloEgresos.items.every((t) => t.tipo === 'egreso')).toBe(true);

    const paginado = await transaccionesRepository.list({ page: 1, limit: 2 });
    expect(paginado.items.length).toBeLessThanOrEqual(2);
    expect(paginado.total).toBeGreaterThanOrEqual(paginado.items.length);
  });
});

describe('usuarios.repository (MySQL real)', () => {
  it('inserta, actualiza y aplica soft delete (nunca DELETE físico)', async () => {
    const id = crypto.randomUUID();
    await usuariosRepository.insert({
      id,
      nombre: 'Capturista Int',
      email: `cap-${id.slice(0, 8)}@jeaf.local`,
      passwordHash: 'hash',
      rolId: ROL_ID,
    });

    await usuariosRepository.update(id, { nombre: 'Capturista Editado' });
    expect((await usuariosRepository.findById(id)).nombre).toBe('Capturista Editado');

    await usuariosRepository.softDelete(id);
    expect(await usuariosRepository.findById(id)).toBeNull(); // oculto para la app

    // pero la fila sigue existiendo físicamente (rastro de auditoría)
    const [rows] = await pool.query('SELECT deleted_at FROM usuarios WHERE id = ?', [id]);
    expect(rows).toHaveLength(1);
    expect(rows[0].deleted_at).not.toBeNull();
  });
});

describe('categorias.repository (MySQL real)', () => {
  it('crea, busca por nombre y desactiva sin afectar el histórico', async () => {
    const id = crypto.randomUUID();
    await categoriasRepository.insert({ id, nombre: 'Pro-Templo Int', tipo: 'ingreso' });
    expect((await categoriasRepository.findByNombre('Pro-Templo Int')).id).toBe(id);

    await categoriasRepository.update(id, { activo: false });
    const desactivada = await categoriasRepository.findById(id);
    expect(desactivada.activo).toBe(0);

    const activas = await categoriasRepository.findAll({ soloActivas: true });
    expect(activas.some((c) => c.id === id)).toBe(false);
  });
});

describe('api_keys.repository (MySQL real)', () => {
  it('guarda solo el hash, valida por hash y revoca con efecto inmediato', async () => {
    const id = crypto.randomUUID();
    const hash = 'a'.repeat(64);
    await apiKeysRepository.insert({ id, usuarioId: USUARIO_ID, etiqueta: 'iPhone Int', keyPrefix: 'jeaf_abc', keyHash: hash });

    const porHash = await apiKeysRepository.findByHash(hash);
    expect(porHash.usuario_id).toBe(USUARIO_ID);
    expect(porHash.revoked_at).toBeNull();

    await apiKeysRepository.touchLastUsed(id);
    await apiKeysRepository.revoke(id);
    expect((await apiKeysRepository.findByHash(hash)).revoked_at).not.toBeNull();
  });
});

describe('logs.repository (MySQL real)', () => {
  it('registra el rastro de auditoría con estados JSON', async () => {
    const registroId = crypto.randomUUID();
    await logsRepository.insert({
      id: crypto.randomUUID(),
      tabla: 'transacciones',
      registroId,
      accion: 'INSERT',
      estadoAnterior: null,
      estadoNuevo: { monto: '100.00', tipo: 'ingreso' },
      usuarioId: USUARIO_ID,
      ipAddress: '127.0.0.1',
    });

    const logs = await logsRepository.findByRegistro('transacciones', registroId);
    expect(logs).toHaveLength(1);
    expect(logs[0].accion).toBe('INSERT');
    const estadoNuevo = typeof logs[0].estado_nuevo === 'string' ? JSON.parse(logs[0].estado_nuevo) : logs[0].estado_nuevo;
    expect(estadoNuevo.monto).toBe('100.00');
  });
});
