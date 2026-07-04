// Repositorio de transacciones: solo comandos SQL.
// INMUTABILIDAD: este módulo NO expone DELETE. La cancelación es un UPDATE
// de estado + deleted_at (regla 4.1 de la especificación).
const { pool } = require('../config/db');

const SELECT_BASE = `
  SELECT t.id, t.tipo, t.monto, t.categoria_id, c.nombre AS categoria,
         t.usuario_id, u.nombre AS capturista,
         t.notas, t.estado, t.motivo_cancelacion, t.cancelada_por,
         t.conciliada, t.conciliada_at, t.idempotency_key, t.origen,
         t.fecha_transaccion, t.created_at, t.updated_at, t.deleted_at
  FROM transacciones t
  JOIN categorias c ON c.id = t.categoria_id
  JOIN usuarios u ON u.id = t.usuario_id`;

async function insert(tx, conn = pool) {
  await conn.query(
    `INSERT INTO transacciones
       (id, tipo, monto, categoria_id, usuario_id, notas, idempotency_key, origen, fecha_transaccion)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())`,
    [tx.id, tx.tipo, tx.monto, tx.categoriaId, tx.usuarioId, tx.notas || null, tx.idempotencyKey, tx.origen]
  );
}

async function findById(id, conn = pool) {
  const [rows] = await conn.query(`${SELECT_BASE} WHERE t.id = ?`, [id]);
  return rows[0] || null;
}

async function findByIdempotencyKey(key, conn = pool) {
  const [rows] = await conn.query(`${SELECT_BASE} WHERE t.idempotency_key = ?`, [key]);
  return rows[0] || null;
}

/**
 * Listado con filtros y paginación para el panel web.
 * Filtros: fechaDesde, fechaHasta, categoriaId, tipo, usuarioId, estado, conciliada.
 */
async function list(filtros, conn = pool) {
  const where = [];
  const params = [];

  if (filtros.fechaDesde) { where.push('t.fecha_transaccion >= ?'); params.push(filtros.fechaDesde); }
  if (filtros.fechaHasta) { where.push('t.fecha_transaccion <= ?'); params.push(filtros.fechaHasta); }
  if (filtros.categoriaId) { where.push('t.categoria_id = ?'); params.push(filtros.categoriaId); }
  if (filtros.tipo) { where.push('t.tipo = ?'); params.push(filtros.tipo); }
  if (filtros.usuarioId) { where.push('t.usuario_id = ?'); params.push(filtros.usuarioId); }
  if (filtros.estado) { where.push('t.estado = ?'); params.push(filtros.estado); }
  if (filtros.conciliada !== undefined) { where.push('t.conciliada = ?'); params.push(filtros.conciliada ? 1 : 0); }

  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  const [[{ total }]] = await conn.query(
    `SELECT COUNT(*) AS total FROM transacciones t ${whereSql}`,
    params
  );

  const offset = (filtros.page - 1) * filtros.limit;
  const [rows] = await conn.query(
    `${SELECT_BASE} ${whereSql} ORDER BY t.fecha_transaccion DESC LIMIT ? OFFSET ?`,
    [...params, filtros.limit, offset]
  );

  return { items: rows, total, page: filtros.page, limit: filtros.limit };
}

// Cancelación (nunca DELETE): estado + motivo + deleted_at + quién canceló
async function cancelar(id, { motivo, canceladaPor }, conn = pool) {
  await conn.query(
    `UPDATE transacciones
     SET estado = 'cancelada', motivo_cancelacion = ?, cancelada_por = ?,
         deleted_at = UTC_TIMESTAMP(), updated_at = UTC_TIMESTAMP()
     WHERE id = ? AND estado = 'activa'`,
    [motivo, canceladaPor, id]
  );
}

async function setConciliada(id, conciliada, conn = pool) {
  await conn.query(
    `UPDATE transacciones
     SET conciliada = ?, conciliada_at = ${conciliada ? 'UTC_TIMESTAMP()' : 'NULL'},
         updated_at = UTC_TIMESTAMP()
     WHERE id = ?`,
    [conciliada ? 1 : 0, id]
  );
}

async function countByCategoria(categoriaId, conn = pool) {
  const [[{ total }]] = await conn.query(
    'SELECT COUNT(*) AS total FROM transacciones WHERE categoria_id = ?',
    [categoriaId]
  );
  return total;
}

module.exports = { insert, findById, findByIdempotencyKey, list, cancelar, setConciliada, countByCategoria };
