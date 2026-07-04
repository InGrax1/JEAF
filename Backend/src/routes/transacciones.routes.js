const { Router } = require('express');
const transaccionesController = require('../controllers/transacciones.controller');
const { authJwt } = require('../middlewares/authJwt');
const { authDual } = require('../middlewares/authDual');
const { permitir } = require('../middlewares/rbac');
const { validate } = require('../middlewares/validate');
const { transaccionesLimiter } = require('../middlewares/rateLimiters');
const {
  crearTransaccionSchema,
  cancelarTransaccionSchema,
  conciliarTransaccionSchema,
  listarTransaccionesQuerySchema,
  idParamSchema,
} = require('../validators/schemas');

const router = Router();

// Captura: Atajos de iOS (API Key) o panel web (JWT). Cualquier rol autenticado
// puede insertar (el capturista SOLO tiene este permiso). Rate limit por API key.
router.post(
  '/',
  transaccionesLimiter,
  authDual,
  validate(crearTransaccionSchema),
  transaccionesController.crear
);

// Consulta: solo panel web (Tesorero y Auditor). El capturista no ve métricas.
router.get(
  '/',
  authJwt,
  permitir('super_admin', 'auditor'),
  validate(listarTransaccionesQuerySchema, 'query'),
  transaccionesController.listar
);
router.get(
  '/:id',
  authJwt,
  permitir('super_admin', 'auditor'),
  validate(idParamSchema, 'params'),
  transaccionesController.obtener
);

// Cancelación (regla de inmutabilidad) y conciliación: exclusivas del Tesorero
router.post(
  '/:id/cancelar',
  authJwt,
  permitir('super_admin'),
  validate(idParamSchema, 'params'),
  validate(cancelarTransaccionSchema),
  transaccionesController.cancelar
);
router.post(
  '/:id/conciliar',
  authJwt,
  permitir('super_admin'),
  validate(idParamSchema, 'params'),
  validate(conciliarTransaccionSchema),
  transaccionesController.conciliar
);

module.exports = router;
