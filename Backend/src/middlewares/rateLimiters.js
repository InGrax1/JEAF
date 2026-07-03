// Rate limiting según especificación:
// - Login: máx. 5 intentos por IP cada 15 minutos (sección 7.2).
// - Transacciones: máx. 30 peticiones por minuto POR API KEY, no por IP,
//   ya que varios capturistas pueden compartir la red del templo (sección 10.4).
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    ok: false,
    error: { code: 'RATE_LIMITED', message: 'Demasiados intentos de inicio de sesión. Intenta de nuevo en 15 minutos.' },
  },
});

const transaccionesLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  // Limita por API key; si no viene, cae al comportamiento por IP como respaldo
  keyGenerator: (req) => req.headers['x-api-key']
    || (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
    || req.ip,
  message: {
    ok: false,
    error: { code: 'RATE_LIMITED', message: 'Límite de peticiones alcanzado. Espera un minuto.' },
  },
});

module.exports = { loginLimiter, transaccionesLimiter };
