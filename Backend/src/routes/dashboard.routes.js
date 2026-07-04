const { Router } = require('express');
const dashboardController = require('../controllers/dashboard.controller');
const { authJwt } = require('../middlewares/authJwt');
const { permitir } = require('../middlewares/rbac');

const router = Router();

// Dashboard: Tesorero y Auditor (lectura). El capturista no ve métricas.
router.get('/resumen', authJwt, permitir('super_admin', 'auditor'), dashboardController.resumen);

module.exports = router;
