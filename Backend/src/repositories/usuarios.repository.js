// Repositorio de usuarios: solo comandos SQL, sin lógica de negocio.
const { pool } = require('../config/db');

const CAMPOS_PUBLICOS = `u.id, u.nombre, u.email, u.activo, u.created_at, u.updated_at,
  r.nombre AS rol`;

async function findAll(conn = pool) {
  const [rows] = await conn.query(
    `SELECT ${CAMPOS_PUBLICOS}
     FROM usuarios u
     JOIN roles r ON r.id = u.rol_id
     WHERE u.deleted_at IS NULL
     ORDER BY u.created_at DESC`
  );
  return rows;
}

async function findById(id, conn = pool) {
  const [rows] = await conn.query(
    `SELECT ${CAMPOS_PUBLICOS}
     FROM usuarios u
     JOIN roles r ON r.id = u.rol_id
     WHERE u.id = ? AND u.deleted_at IS NULL`,
    [id]
  );
  return rows[0] || null;
}

// Incluye password_hash: uso exclusivo del servicio de autenticación
async function findByEmailConHash(email, conn = pool) {
  const [rows] = await conn.query(
    `SELECT u.id, u.nombre, u.email, u.password_hash, u.activo, u.deleted_at,
            r.nombre AS rol
     FROM usuarios u
     JOIN roles r ON r.id = u.rol_id
     WHERE u.email = ?`,
    [email]
  );
  return rows[0] || null;
}

async function insert({ id, nombre, email, passwordHash, rolId }, conn = pool) {
  await conn.query(
    `INSERT INTO usuarios (id, nombre, email, password_hash, rol_id)
     VALUES (?, ?, ?, ?, ?)`,
    [id, nombre, email, passwordHash, rolId]
  );
}

async function update(id, campos, conn = pool) {
  const sets = [];
  const valores = [];
  const mapa = {
    nombre: 'nombre',
    email: 'email',
    passwordHash: 'password_hash',
    rolId: 'rol_id',
    activo: 'activo',
  };
  for (const [clave, columna] of Object.entries(mapa)) {
    if (campos[clave] !== undefined) {
      sets.push(`${columna} = ?`);
      valores.push(campos[clave]);
    }
  }
  if (sets.length === 0) return;
  sets.push('updated_at = UTC_TIMESTAMP()');
  valores.push(id);
  await conn.query(`UPDATE usuarios SET ${sets.join(', ')} WHERE id = ? AND deleted_at IS NULL`, valores);
}

// Soft delete: prohibido DELETE físico (regla de inmutabilidad)
async function softDelete(id, conn = pool) {
  await conn.query(
    `UPDATE usuarios SET deleted_at = UTC_TIMESTAMP(), activo = 0, updated_at = UTC_TIMESTAMP()
     WHERE id = ? AND deleted_at IS NULL`,
    [id]
  );
}

module.exports = { findAll, findById, findByEmailConHash, insert, update, softDelete };
