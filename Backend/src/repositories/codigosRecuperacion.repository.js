// Repositorio de códigos de recuperación de contraseña: solo SQL.
// Nunca guarda el código en texto plano, solo su hash SHA-256.
const { pool } = require('../config/db');

async function insert({ id, usuarioId, codigoHash, expiraEn }, conn = pool) {
  await conn.query(
    `INSERT INTO codigos_recuperacion (id, usuario_id, codigo_hash, expira_en)
     VALUES (?, ?, ?, ?)`,
    [id, usuarioId, codigoHash, expiraEn]
  );
}

// El código vigente más reciente: no usado, no expirado
async function findVigentePorUsuario(usuarioId, conn = pool) {
  const [rows] = await conn.query(
    `SELECT id, usuario_id, codigo_hash, intentos, expira_en, usado_en
     FROM codigos_recuperacion
     WHERE usuario_id = ? AND usado_en IS NULL AND expira_en > UTC_TIMESTAMP()
     ORDER BY created_at DESC
     LIMIT 1`,
    [usuarioId]
  );
  return rows[0] || null;
}

async function incrementarIntentos(id, conn = pool) {
  await conn.query('UPDATE codigos_recuperacion SET intentos = intentos + 1 WHERE id = ?', [id]);
}

async function marcarUsado(id, conn = pool) {
  await conn.query('UPDATE codigos_recuperacion SET usado_en = UTC_TIMESTAMP() WHERE id = ?', [id]);
}

module.exports = { insert, findVigentePorUsuario, incrementarIntentos, marcarUsado };
