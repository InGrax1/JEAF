// Controller de categorías: recibe HTTP, delega al service, devuelve JSON.
const categoriasService = require('../services/categorias.service');

function contextoDe(req) {
  return { usuarioId: req.usuario.id, ip: req.ip };
}

async function listar(req, res, next) {
  try {
    // Los Atajos de iOS consumen esta lista para el menú dinámico de categorías
    res.json({ ok: true, data: await categoriasService.listar({ soloActivas: req.query.soloActivas }) });
  } catch (err) {
    next(err);
  }
}

async function crear(req, res, next) {
  try {
    const categoria = await categoriasService.crear(req.body, contextoDe(req));
    res.status(201).json({ ok: true, data: categoria });
  } catch (err) {
    next(err);
  }
}

async function actualizar(req, res, next) {
  try {
    const categoria = await categoriasService.actualizar(req.params.id, req.body, contextoDe(req));
    res.json({ ok: true, data: categoria });
  } catch (err) {
    next(err);
  }
}

async function consultarUso(req, res, next) {
  try {
    res.json({ ok: true, data: await categoriasService.consultarUso(req.params.id) });
  } catch (err) {
    next(err);
  }
}

async function eliminar(req, res, next) {
  try {
    await categoriasService.eliminar(req.params.id, contextoDe(req));
    res.json({ ok: true, data: { eliminada: true } });
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, crear, actualizar, consultarUso, eliminar };
