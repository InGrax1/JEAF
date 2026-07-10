// Controller de autenticación: recibe HTTP, delega al service, devuelve JSON.
const authService = require('../services/auth.service');

async function login(req, res, next) {
  try {
    const resultado = await authService.login(req.body);
    res.json({ ok: true, data: resultado });
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const resultado = await authService.refresh(req.body);
    res.json({ ok: true, data: resultado });
  } catch (err) {
    next(err);
  }
}

async function olvidePassword(req, res, next) {
  try {
    const resultado = await authService.olvidePassword(req.body, { ip: req.ip });
    res.json({ ok: true, data: resultado });
  } catch (err) {
    next(err);
  }
}

async function restablecerPassword(req, res, next) {
  try {
    const resultado = await authService.restablecerPassword(req.body, { ip: req.ip });
    res.json({ ok: true, data: resultado });
  } catch (err) {
    next(err);
  }
}

module.exports = { login, refresh, olvidePassword, restablecerPassword };
