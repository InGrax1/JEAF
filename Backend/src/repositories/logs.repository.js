// Repositorio de logs de auditoría: solo INSERT y SELECT. Los logs jamás se modifican.
const { pool } = require('../config/db');

async function insert({ id, tabla, registroId, accion, estadoAnterior, estadoNuevo, usuarioId, ipAddress }, conn = pool) {
  await conn.query(
    `INSERT INTO logs_auditoria (id, tabla, registro_id, accion, estado_anterior, estado_nuevo, usuario_id, ip_address)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      tabla,
      registroId,
      accion,
      estadoAnterior ? JSON.stringify(estadoAnterior) : null,
      estadoNuevo ? JSON.stringify(estadoNuevo) : null,
      usuarioId || null,
      ipAddress || null,
    ]
  );
}

async function findByRegistro(tabla, registroId, conn = pool) {
  const [rows] = await conn.query(
    `SELECT id, tabla, registro_id, accion, estado_anterior, estado_nuevo, usuario_id, ip_address, created_at
     FROM logs_auditoria
     WHERE tabla = ? AND registro_id = ?
     ORDER BY created_at DESC`,
    [tabla, registroId]
  );
  return rows;
}

module.exports = { insert, findByRegistro };
