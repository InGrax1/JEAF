// Controller de API Keys: recibe HTTP, delega al service, devuelve JSON.
const apiKeysService = require('../services/apiKeys.service');

function contextoDe(req) {
  return { usuarioId: req.usuario.id, ip: req.ip };
}

async function listar(req, res, next) {
  try {
    res.json({ ok: true, data: await apiKeysService.listar() });
  } catch (err) {
    next(err);
  }
}

async function crear(req, res, next) {
  try {
    const resultado = await apiKeysService.crear(req.body, contextoDe(req));
    // La apiKey en claro se devuelve SOLO en esta respuesta
    res.status(201).json({
      ok: true,
      data: resultado,
      advertencia: 'Guarda la apiKey ahora: no volverá a mostrarse.',
    });
  } catch (err) {
    next(err);
  }
}

async function revocar(req, res, next) {
  try {
    await apiKeysService.revocar(req.params.id, contextoDe(req));
    res.json({ ok: true, data: { id: req.params.id, revocada: true } });
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, crear, revocar };
