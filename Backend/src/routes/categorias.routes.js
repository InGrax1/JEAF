const { Router } = require('express');
const categoriasController = require('../controllers/categorias.controller');
const { authJwt } = require('../middlewares/authJwt');
const { authDual } = require('../middlewares/authDual');
const { permitir } = require('../middlewares/rbac');
const { validate } = require('../middlewares/validate');
const {
  crearCategoriaSchema,
  actualizarCategoriaSchema,
  listarCategoriasQuerySchema,
  idParamSchema,
} = require('../validators/schemas');

const router = Router();

// Lectura: también vía API Key — el Atajo de iOS arma su menú dinámico
// de categorías con esta ruta (?soloActivas=true).
router.get('/', authDual, validate(listarCategoriasQuerySchema, 'query'), categoriasController.listar);

// Administración: exclusiva del Tesorero
router.post('/', authJwt, permitir('super_admin'), validate(crearCategoriaSchema), categoriasController.crear);
router.put(
  '/:id',
  authJwt,
  permitir('super_admin'),
  validate(idParamSchema, 'params'),
  validate(actualizarCategoriaSchema),
  categoriasController.actualizar
);

module.exports = router;
