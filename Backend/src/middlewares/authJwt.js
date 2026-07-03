// Autenticación JWT para el panel web. Adjunta req.usuario = { id, rol }.
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { AppError } = require('../utils/errors');

function authJwt(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(new AppError('Token de acceso requerido', 401, 'UNAUTHORIZED'));
  }

  try {
    const payload = jwt.verify(token, env.jwt.accessSecret);
    req.usuario = { id: payload.sub, rol: payload.rol, email: payload.email };
    return next();
  } catch (err) {
    const code = err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN';
    return next(new AppError('Token inválido o expirado', 401, code));
  }
}

module.exports = { authJwt };
