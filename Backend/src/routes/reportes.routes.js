const { Router } = require('express');
const reportesController = require('../controllers/reportes.controller');
const { authJwt } = require('../middlewares/authJwt');
const { permitir } = require('../middlewares/rbac');
const { validate } = require('../middlewares/validate');
const { reporteMensualQuerySchema } = require('../validators/schemas');

const router = Router();

// Cierre mensual: Tesorero y Auditor (el auditor puede descargar el cierre, spec 2)
router.get(
  '/mensual',
  authJwt,
  permitir('super_admin', 'auditor'),
  validate(reporteMensualQuerySchema, 'query'),
  reportesController.mensual
);

module.exports = router;
