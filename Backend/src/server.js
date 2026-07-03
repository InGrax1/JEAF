// Punto de entrada del backend JEAF.
const app = require('./app');
const env = require('./config/env');
const { pool } = require('./config/db');

async function iniciar() {
  // Verificación temprana de conexión a MySQL: fallar rápido si la BD no responde
  try {
    await pool.query('SELECT 1');
    console.log(`[JEAF] Conexión a MySQL establecida (${env.db.host}/${env.db.database})`);
  } catch (err) {
    console.error('[JEAF] No se pudo conectar a MySQL:', err.message);
    process.exit(1);
  }

  app.listen(env.port, () => {
    console.log(`[JEAF] API escuchando en http://localhost:${env.port}/api/v1 (${env.nodeEnv})`);
  });
}

iniciar();
