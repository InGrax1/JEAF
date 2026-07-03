// Controller de usuarios: recibe HTTP, delega al service, devuelve JSON.
const usuariosService = require('../services/usuarios.service');

function contextoDe(req) {
  return { usuarioId: req.usuario.id, ip: req.ip };
}

async function listar(req, res, next) {
  try {
    res.json({ ok: true, data: await usuariosService.listar() });
  } catch (err) {
    next(err);
  }
}

async function obtener(req, res, next) {
  try {
    res.json({ ok: true, data: await usuariosService.obtener(req.params.id) });
  } catch (err) {
    next(err);
  }
}

async function crear(req, res, next) {
  try {
    const usuario = await usuariosService.crear(req.body, contextoDe(req));
    res.status(201).json({ ok: true, data: usuario });
  } catch (err) {
    next(err);
  }
}

async function actualizar(req, res, next) {
  try {
    const usuario = await usuariosService.actualizar(req.params.id, req.body, contextoDe(req));
    res.json({ ok: true, data: usuario });
  } catch (err) {
    next(err);
  }
}

async function eliminar(req, res, next) {
  try {
    await usuariosService.eliminar(req.params.id, contextoDe(req));
    res.json({ ok: true, data: { id: req.params.id, eliminado: true } });
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
