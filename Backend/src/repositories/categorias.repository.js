// Repositorio de categorías: solo comandos SQL. Soft delete vía campo activo.
const { pool } = require('../config/db');

async function findAll({ soloActivas = false } = {}, conn = pool) {
  const whereSql = soloActivas ? 'WHERE activo = 1 AND deleted_at IS NULL' : 'WHERE deleted_at IS NULL';
  const [rows] = await conn.query(
    `SELECT id, nombre, tipo, activo, created_at, updated_at
     FROM categorias ${whereSql} ORDER BY tipo, nombre`
  );
  return rows;
}

async function findById(id, conn = pool) {
  const [rows] = await conn.query(
    `SELECT id, nombre, tipo, activo, created_at, updated_at
     FROM categorias WHERE id = ? AND deleted_at IS NULL`,
    [id]
  );
  return rows[0] || null;
}

async function findByNombre(nombre, conn = pool) {
  const [rows] = await conn.query(
    'SELECT id, nombre, tipo, activo FROM categorias WHERE nombre = ? AND deleted_at IS NULL',
    [nombre]
  );
  return rows[0] || null;
}

async function insert({ id, nombre, tipo }, conn = pool) {
  await conn.query('INSERT INTO categorias (id, nombre, tipo) VALUES (?, ?, ?)', [id, nombre, tipo]);
}

async function update(id, campos, conn = pool) {
  const sets = [];
  const valores = [];
  if (campos.nombre !== undefined) { sets.push('nombre = ?'); valores.push(campos.nombre); }
  if (campos.tipo !== undefined) { sets.push('tipo = ?'); valores.push(campos.tipo); }
  if (campos.activo !== undefined) { sets.push('activo = ?'); valores.push(campos.activo ? 1 : 0); }
  if (sets.length === 0) return;
  sets.push('updated_at = UTC_TIMESTAMP()');
  valores.push(id);
  await conn.query(`UPDATE categorias SET ${sets.join(', ')} WHERE id = ? AND deleted_at IS NULL`, valores);
}

module.exports = { findAll, findById, findByNombre, insert, update };
