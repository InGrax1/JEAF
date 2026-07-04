// Repositorio de agregaciones para el dashboard: solo SELECT.
// Todas las cifras excluyen transacciones canceladas (estado = 'activa').
const { pool } = require('../config/db');

// Balance histórico total: suma de ingresos menos egresos
async function totales(conn = pool) {
  const [[row]] = await conn.query(
    `SELECT
       COALESCE(SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE 0 END), 0) AS ingresos,
       COALESCE(SUM(CASE WHEN tipo = 'egreso'  THEN monto ELSE 0 END), 0) AS egresos
     FROM transacciones
     WHERE estado = 'activa'`
  );
  return row;
}

async function totalesPeriodo(desde, hasta, conn = pool) {
  const [[row]] = await conn.query(
    `SELECT
       COALESCE(SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE 0 END), 0) AS ingresos,
       COALESCE(SUM(CASE WHEN tipo = 'egreso'  THEN monto ELSE 0 END), 0) AS egresos
     FROM transacciones
     WHERE estado = 'activa' AND fecha_transaccion >= ? AND fecha_transaccion < ?`,
    [desde, hasta]
  );
  return row;
}

// Serie mensual de los últimos N meses para las gráficas ingresos vs gastos
async function serieMensual(desde, conn = pool) {
  const [rows] = await conn.query(
    `SELECT DATE_FORMAT(fecha_transaccion, '%Y-%m') AS mes,
       COALESCE(SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE 0 END), 0) AS ingresos,
       COALESCE(SUM(CASE WHEN tipo = 'egreso'  THEN monto ELSE 0 END), 0) AS egresos
     FROM transacciones
     WHERE estado = 'activa' AND fecha_transaccion >= ?
     GROUP BY mes
     ORDER BY mes`,
    [desde]
  );
  return rows;
}

// Desglose por categoría en un rango (para el porcentaje por categoría)
async function desglosePorCategoria(desde, hasta, conn = pool) {
  const [rows] = await conn.query(
    `SELECT c.nombre AS categoria, t.tipo, COALESCE(SUM(t.monto), 0) AS total
     FROM transacciones t
     JOIN categorias c ON c.id = t.categoria_id
     WHERE t.estado = 'activa' AND t.fecha_transaccion >= ? AND t.fecha_transaccion < ?
     GROUP BY c.id, c.nombre, t.tipo
     ORDER BY total DESC`,
    [desde, hasta]
  );
  return rows;
}

module.exports = { totales, totalesPeriodo, serieMensual, desglosePorCategoria };
