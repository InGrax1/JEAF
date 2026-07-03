// Repositorio de API Keys: solo comandos SQL. Nunca almacena la key en texto plano.
const { pool } = require('../config/db');

async function findByHash(keyHash, conn = pool) {
  const [rows] = await conn.query(
    `SELECT k.id, k.usuario_id, k.etiqueta, k.revoked_at, k.last_used_at,
            u.activo AS usuario_activo, u.deleted_at AS usuario_deleted_at,
            r.nombre AS rol_nombre
     FROM api_keys k
     JOIN usuarios u ON u.id = k.usuario_id
     JOIN roles r ON r.id = u.rol_id
     WHERE k.key_hash = ?`,
    [keyHash]
  );
  return rows[0] || null;
}

async function findByUsuario(usuarioId, conn = pool) {
  const [rows] = await conn.query(
    `SELECT id, usuario_id, etiqueta, key_prefix, created_at, last_used_at, revoked_at
     FROM api_keys WHERE usuario_id = ? ORDER BY created_at DESC`,
    [usuarioId]
  );
  return rows;
}

async function findAllConUsuario(conn = pool) {
  const [rows] = await conn.query(
    `SELECT k.id, k.etiqueta, k.key_prefix, k.created_at, k.last_used_at, k.revoked_at,
            u.id AS usuario_id, u.nombre AS usuario_nombre
     FROM api_keys k
     JOIN usuarios u ON u.id = k.usuario_id
     ORDER BY k.created_at DESC`
  );
  return rows;
}

async function findById(id, conn = pool) {
  const [rows] = await conn.query(
    `SELECT id, usuario_id, etiqueta, key_prefix, created_at, last_used_at, revoked_at
     FROM api_keys WHERE id = ?`,
    [id]
  );
  return rows[0] || null;
}

async function insert({ id, usuarioId, etiqueta, keyPrefix, keyHash }, conn = pool) {
  await conn.query(
    `INSERT INTO api_keys (id, usuario_id, etiqueta, key_prefix, key_hash)
     VALUES (?, ?, ?, ?, ?)`,
    [id, usuarioId, etiqueta, keyPrefix, keyHash]
  );
}

// Revocación con efecto inmediato (spec 10.3)
async function revoke(id, conn = pool) {
  await conn.query(
    'UPDATE api_keys SET revoked_at = UTC_TIMESTAMP() WHERE id = ? AND revoked_at IS NULL',
    [id]
  );
}

async function touchLastUsed(id, conn = pool) {
  await conn.query('UPDATE api_keys SET last_used_at = UTC_TIMESTAMP() WHERE id = ?', [id]);
}

module.exports = { findByHash, findByUsuario, findAllConUsuario, findById, insert, revoke, touchLastUsed };
