// Manejo centralizado de errores: respuestas JSON uniformes, sin filtrar detalles internos.
const env = require('../config/env');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      ok: false,
      error: { code: err.code, message: err.message },
    });
  }

  // Error no controlado: log completo en servidor, mensaje genérico al cliente
  console.error('[ERROR NO CONTROLADO]', err);
  return res.status(500).json({
    ok: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: env.nodeEnv === 'development' ? err.message : 'Error interno del servidor',
    },
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({
    ok: false,
    error: { code: 'NOT_FOUND', message: `Ruta no encontrada: ${req.method} ${req.originalUrl}` },
  });
}

module.exports = { errorHandler, notFoundHandler };
