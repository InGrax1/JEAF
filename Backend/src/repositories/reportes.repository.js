// Repositorio de reportes: solo SELECT sobre el libro mayor.
const { pool } = require('../config/db');

// Todas las transacciones del rango (activas y canceladas), con joins para el reporte
async function transaccionesDelPeriodo(desde, hasta, conn = pool) {
  const [rows] = await conn.query(
    `SELECT t.id, t.tipo, t.monto, c.nombre AS categoria, u.nombre AS capturista,
            t.notas, t.estado, t.motivo_cancelacion, t.conciliada, t.origen,
            t.fecha_transaccion
     FROM transacciones t
     JOIN categorias c ON c.id = t.categoria_id
     JOIN usuarios u ON u.id = t.usuario_id
     WHERE t.fecha_transaccion >= ? AND t.fecha_transaccion < ?
     ORDER BY t.fecha_transaccion ASC`,
    [desde, hasta]
  );
  return rows;
}

// Totales por categoría del rango (solo activas: son las cifras oficiales)
async function totalesPorCategoria(desde, hasta, conn = pool) {
  const [rows] = await conn.query(
    `SELECT c.nombre AS categoria, t.tipo, COALESCE(SUM(t.monto), 0) AS total,
            COUNT(*) AS movimientos
     FROM transacciones t
     JOIN categorias c ON c.id = t.categoria_id
     WHERE t.estado = 'activa' AND t.fecha_transaccion >= ? AND t.fecha_transaccion < ?
     GROUP BY c.id, c.nombre, t.tipo
     ORDER BY t.tipo, total DESC`,
    [desde, hasta]
  );
  return rows;
}

// Acumulado histórico anterior a una fecha (solo activas). Alimenta el
// "SALDO DEL MES" del formato oficial, que arrastra lo que quedó en caja
// al cierre del mes previo.
async function acumuladoAntesDe(fecha, conn = pool) {
  const [rows] = await conn.query(
    `SELECT
       COALESCE(SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE 0 END), 0) AS ingresos,
       COALESCE(SUM(CASE WHEN tipo = 'egreso'  THEN monto ELSE 0 END), 0) AS egresos
     FROM transacciones
     WHERE estado = 'activa' AND fecha_transaccion < ?`,
    [fecha]
  );
  return rows[0];
}

module.exports = { transaccionesDelPeriodo, totalesPorCategoria, acumuladoAntesDe };
