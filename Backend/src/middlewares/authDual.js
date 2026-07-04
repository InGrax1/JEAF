// Autenticación dual: API Key (Atajos de iOS) o JWT (panel web).
// Las API keys de JEAF siempre inician con "jeaf_", lo que permite
// distinguirlas de un JWT cuando viajan en Authorization: Bearer.
const { apiKeyAuth } = require('./apiKeyAuth');
const { authJwt } = require('./authJwt');

function authDual(req, res, next) {
  const bearer = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (req.headers['x-api-key'] || bearer.startsWith('jeaf_')) {
    return apiKeyAuth(req, res, next);
  }
  return authJwt(req, res, next);
}

module.exports = { authDual };
