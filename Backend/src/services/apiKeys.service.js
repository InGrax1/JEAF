// Gestión de API Keys para los Atajos de iOS (spec 6.2 y 10.3).
// La key en claro se genera aquí, se devuelve UNA sola vez y solo se persiste su hash.
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { withTransaction } = require('../config/db');
const apiKeysRepository = require('../repositories/apiKeys.repository');
const usuariosRepository = require('../repositories/usuarios.repository');
const auditService = require('./audit.service');
const { hashApiKey } = require('../middlewares/apiKeyAuth');
const { AppError } = require('../utils/errors');

async function listar() {
  return apiKeysRepository.findAllConUsuario();
}

async function crear({ usuarioId, etiqueta }, contexto) {
  const usuario = await usuariosRepository.findById(usuarioId);
  if (!usuario) throw new AppError('Usuario no encontrado', 404, 'USER_NOT_FOUND');

  // Key en claro: prefijo identificable + 32 bytes aleatorios en base64url
  const keyPlano = `jeaf_${crypto.randomBytes(32).toString('base64url')}`;
  const id = uuidv4();

  await withTransaction(async (conn) => {
    await apiKeysRepository.insert(
      {
        id,
        usuarioId,
        etiqueta,
        keyPrefix: keyPlano.slice(0, 8),
        keyHash: hashApiKey(keyPlano),
      },
      conn
    );
    await auditService.registrar(
      {
        tabla: 'api_keys',
        registroId: id,
        accion: 'INSERT',
        estadoNuevo: { usuarioId, etiqueta },
        usuarioId: contexto.usuarioId,
        ipAddress: contexto.ip,
      },
      conn
    );
  });

  // Única vez que la key viaja en claro: el cliente debe guardarla en el Atajo
  return { id, etiqueta, usuarioId, apiKey: keyPlano };
}

async function revocar(id, contexto) {
  const registro = await apiKeysRepository.findById(id);
  if (!registro) throw new AppError('API Key no encontrada', 404, 'API_KEY_NOT_FOUND');
  if (registro.revoked_at !== null) throw new AppError('La API Key ya fue revocada', 409, 'ALREADY_REVOKED');

  await withTransaction(async (conn) => {
    await apiKeysRepository.revoke(id, conn);
    await auditService.registrar(
      {
        tabla: 'api_keys',
        registroId: id,
        accion: 'UPDATE',
        estadoAnterior: registro,
        estadoNuevo: { revoked: true },
        usuarioId: contexto.usuarioId,
        ipAddress: contexto.ip,
      },
      conn
    );
  });
}

module.exports = { listar, crear, revocar };
