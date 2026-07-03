// Pool de conexiones MySQL. Toda fecha se maneja en UTC (convención global).
const mysql = require('mysql2/promise');
const env = require('./env');

const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  waitForConnections: true,
  connectionLimit: 10,
  timezone: 'Z', // UTC: mysql2 no convierte fechas a la zona local del servidor
  dateStrings: false,
  decimalNumbers: false, // DECIMAL llega como string: evita pérdida de precisión en montos
});

/**
 * Ejecuta una función dentro de una transacción SQL con rollback automático.
 * Garantiza integridad contable: o se persiste todo, o nada.
 */
async function withTransaction(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { pool, withTransaction };
