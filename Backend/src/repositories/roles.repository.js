// Repositorio de roles: solo comandos SQL.
const { pool } = require('../config/db');

async function findByNombre(nombre, conn = pool) {
  const [rows] = await conn.query('SELECT id, nombre, descripcion FROM roles WHERE nombre = ?', [nombre]);
  return rows[0] || null;
}

async function findAll(conn = pool) {
  const [rows] = await conn.query('SELECT id, nombre, descripcion FROM roles ORDER BY nombre');
  return rows;
}

module.exports = { findByNombre, findAll };
