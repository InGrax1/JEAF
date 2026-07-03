const { Router } = require('express');
const apiKeysController = require('../controllers/apiKeys.controller');
const { authJwt } = require('../middlewares/authJwt');
const { permitir } = require('../middlewares/rbac');
const { validate } = require('../middlewares/validate');
const { crearApiKeySchema, idParamSchema } = require('../validators/schemas');

const router = Router();

// Gestión de API Keys: exclusiva del Tesorero (super_admin)
router.use(authJwt, permitir('super_admin'));

router.get('/', apiKeysController.listar);
router.post('/', validate(crearApiKeySchema), apiKeysController.crear);
router.post('/:id/revocar', validate(idParamSchema, 'params'), apiKeysController.revocar);

module.exports = router;
