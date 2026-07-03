const { Router } = require('express');
const usuariosController = require('../controllers/usuarios.controller');
const { authJwt } = require('../middlewares/authJwt');
const { permitir } = require('../middlewares/rbac');
const { validate } = require('../middlewares/validate');
const { crearUsuarioSchema, actualizarUsuarioSchema, idParamSchema } = require('../validators/schemas');

const router = Router();

// Gestión de usuarios: exclusiva del Tesorero (super_admin)
router.use(authJwt, permitir('super_admin'));

router.get('/', usuariosController.listar);
router.get('/:id', validate(idParamSchema, 'params'), usuariosController.obtener);
router.post('/', validate(crearUsuarioSchema), usuariosController.crear);
router.put('/:id', validate(idParamSchema, 'params'), validate(actualizarUsuarioSchema), usuariosController.actualizar);
router.delete('/:id', validate(idParamSchema, 'params'), usuariosController.eliminar);

module.exports = router;
