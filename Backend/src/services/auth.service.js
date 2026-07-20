// Autenticación web: login con Bcrypt y emisión de JWT (access 1h, refresh 7d).
// Incluye recuperación de contraseña por código temporal enviado al correo.
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const env = require('../config/env');
const db = require('../config/db');
const usuariosRepository = require('../repositories/usuarios.repository');
const codigosRecuperacionRepository = require('../repositories/codigosRecuperacion.repository');
const auditService = require('./audit.service');
const emailUtil = require('../utils/email');
const { plantillaCodigoRecuperacion } = require('../utils/emailTemplates');
const { AppError } = require('../utils/errors');

const CODIGO_EXPIRA_MINUTOS = 15;
const CODIGO_MAX_INTENTOS = 5;

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

function generarCodigo() {
  // 6 dígitos, con ceros a la izquierda si aplica (ej. "004821")
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
}

function hashCodigo(codigo) {
  return crypto.createHash('sha256').update(codigo).digest('hex');
}

// Comparación en tiempo constante: evita filtrar por temporización cuánto
// coincide el código probado con el real.
function codigosCoinciden(hashA, hashB) {
  const bufA = Buffer.from(hashA, 'hex');
  const bufB = Buffer.from(hashB, 'hex');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

const MENSAJE_GENERICO = 'Si el correo existe en el sistema, se envió un código de verificación.';

async function olvidePassword({ email }, contexto) {
  const usuario = await usuariosRepository.findByEmailConHash(email);

  // No revelar si el correo existe o no (mismo principio que login)
  if (!usuario || usuario.deleted_at !== null || !usuario.activo) {
    return { mensaje: MENSAJE_GENERICO };
  }

  const codigo = generarCodigo();
  const id = uuidv4();
  const expiraEn = new Date(Date.now() + CODIGO_EXPIRA_MINUTOS * 60 * 1000);

  await codigosRecuperacionRepository.insert({
    id,
    usuarioId: usuario.id,
    codigoHash: hashCodigo(codigo),
    expiraEn,
  });

  const { asunto, html, textoPlano } = plantillaCodigoRecuperacion({
    codigo,
    minutos: CODIGO_EXPIRA_MINUTOS,
  });
  await emailUtil.enviarCorreo({ para: usuario.email, asunto, html, textoPlano });

  return { mensaje: MENSAJE_GENERICO };
}

async function restablecerPassword({ email, codigo, password }, contexto) {
  const codigoInvalido = new AppError('Código inválido o expirado', 400, 'INVALID_RESET_CODE');

  const usuario = await usuariosRepository.findByEmailConHash(email);
  if (!usuario || usuario.deleted_at !== null || !usuario.activo) throw codigoInvalido;

  const registro = await codigosRecuperacionRepository.findVigentePorUsuario(usuario.id);
  if (!registro) throw codigoInvalido;

  if (registro.intentos >= CODIGO_MAX_INTENTOS) {
    throw new AppError('Demasiados intentos fallidos. Solicita un nuevo código.', 429, 'TOO_MANY_ATTEMPTS');
  }

  if (!codigosCoinciden(hashCodigo(codigo), registro.codigo_hash)) {
    await codigosRecuperacionRepository.incrementarIntentos(registro.id);
    throw codigoInvalido;
  }

  const passwordHash = await bcrypt.hash(password, env.bcryptSaltRounds);

  await db.withTransaction(async (conn) => {
    await usuariosRepository.update(usuario.id, { passwordHash }, conn);
    await codigosRecuperacionRepository.marcarUsado(registro.id, conn);
    await auditService.registrar(
      {
        tabla: 'usuarios',
        registroId: usuario.id,
        accion: 'UPDATE',
        estadoNuevo: { passwordRestablecida: true },
        usuarioId: usuario.id,
        ipAddress: contexto.ip,
      },
      conn
    );
  });

  return { mensaje: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.' };
}

module.exports = { login, refresh, olvidePassword, restablecerPassword };
