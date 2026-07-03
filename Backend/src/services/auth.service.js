// Autenticación web: login con Bcrypt y emisión de JWT (access 1h, refresh 7d).
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const usuariosRepository = require('../repositories/usuarios.repository');
const { AppError } = require('../utils/errors');

function firmarTokens(usuario) {
  const payload = { sub: usuario.id, rol: usuario.rol, email: usuario.email };
  const accessToken = jwt.sign(payload, env.jwt.accessSecret, { expiresIn: env.jwt.accessExpires });
  const refreshToken = jwt.sign({ sub: usuario.id }, env.jwt.refreshSecret, { expiresIn: env.jwt.refreshExpires });
  return { accessToken, refreshToken };
}

async function login({ email, password }) {
  const usuario = await usuariosRepository.findByEmailConHash(email);

  // Mensaje idéntico exista o no el email: no revelar cuáles cuentas existen
  const credencialesInvalidas = new AppError('Credenciales inválidas', 401, 'INVALID_CREDENTIALS');
  if (!usuario || usuario.deleted_at !== null || !usuario.activo) throw credencialesInvalidas;

  const coincide = await bcrypt.compare(password, usuario.password_hash);
  if (!coincide) throw credencialesInvalidas;

  const tokens = firmarTokens(usuario);
  return {
    ...tokens,
    usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol },
  };
}

async function refresh({ refreshToken }) {
  let payload;
  try {
    payload = jwt.verify(refreshToken, env.jwt.refreshSecret);
  } catch {
    throw new AppError('Refresh token inválido o expirado', 401, 'INVALID_REFRESH_TOKEN');
  }

  const usuario = await usuariosRepository.findById(payload.sub);
  if (!usuario || !usuario.activo) {
    throw new AppError('Usuario inactivo o eliminado', 401, 'INVALID_REFRESH_TOKEN');
  }
  return firmarTokens(usuario);
}

module.exports = { login, refresh };
