// Autenticación por API Key para los Atajos de iOS.
// La key viaja en el header X-Api-Key (o Authorization: Bearer <key>).
// Se valida contra el hash SHA-256 almacenado; nunca se compara texto plano en BD.
const crypto = require('crypto');
const apiKeysRepository = require('../repositories/apiKeys.repository');
const { AppError } = require('../utils/errors');

function hashApiKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

async function apiKeyAuth(req, res, next) {
  try {
    const key = req.headers['x-api-key']
      || (req.headers.authorization || '').replace(/^Bearer\s+/i, '');

    if (!key) {
      return next(new AppError('API Key requerida', 401, 'API_KEY_REQUIRED'));
    }

    const registro = await apiKeysRepository.findByHash(hashApiKey(key));
    if (!registro) {
      return next(new AppError('API Key inválida', 401, 'API_KEY_INVALID'));
    }
    if (registro.revoked_at !== null) {
      return next(new AppError('API Key revocada', 401, 'API_KEY_REVOKED'));
    }
    if (!registro.usuario_activo || registro.usuario_deleted_at !== null) {
      return next(new AppError('Usuario asociado inactivo', 401, 'API_KEY_INVALID'));
    }

    // last_used_at permite detectar keys inactivas o uso inusual (spec 10.3)
    await apiKeysRepository.touchLastUsed(registro.id);

    req.apiKey = { id: registro.id, usuarioId: registro.usuario_id };
    req.usuario = { id: registro.usuario_id, rol: registro.rol_nombre };
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = { apiKeyAuth, hashApiKey };
