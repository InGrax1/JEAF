// RBAC: verifica el rol del usuario autenticado antes de pasar al controller.
// Uso: router.get('/ruta', authJwt, permitir('super_admin', 'auditor'), controller)
const { AppError } = require('../utils/errors');

function permitir(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.usuario) {
      return next(new AppError('No autenticado', 401, 'UNAUTHORIZED'));
    }
    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return next(new AppError('No tienes permisos para esta operación', 403, 'FORBIDDEN'));
    }
    return next();
  };
}

module.exports = { permitir };
