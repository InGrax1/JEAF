// Carga y valida las variables de entorno. Falla temprano si falta algo crítico.
require('dotenv').config();

const requeridas = ['DB_HOST', 'DB_USER', 'DB_NAME', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
const faltantes = requeridas.filter((k) => !process.env[k]);
if (faltantes.length > 0) {
  throw new Error(`Variables de entorno faltantes: ${faltantes.join(', ')}. Revisa tu archivo .env`);
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',').map((o) => o.trim()),
  db: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME,
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpires: process.env.JWT_ACCESS_EXPIRES || '1h',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES || '7d',
  },
  bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12,
  localTimezone: process.env.LOCAL_TIMEZONE || 'America/Mexico_City',
  iglesiaNombre: process.env.IGLESIA_NOMBRE || 'JEAF — Gestión Financiera',
  // SMTP es opcional a nivel de arranque (no rompe el servidor si falta):
  // se valida hasta el momento de enviar un correo real (ver utils/email.js).
  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD,
    from: process.env.SMTP_FROM || 'JEAF <no-responder@jeaf.local>',
  },
};
