// Controller de transacciones: recibe HTTP, delega al service, devuelve JSON.
const transaccionesService = require('../services/transacciones.service');

function contextoDe(req) {
  return {
    usuarioId: req.usuario.id,
    ip: req.ip,
    origen: req.apiKey ? 'ios_shortcut' : 'panel_web',
  };
}

async function crear(req, res, next) {
  try {
    const { transaccion, folio, duplicada } = await transaccionesService.crear(req.body, contextoDe(req));
    // Duplicada (reintento idempotente del Atajo): 200 OK con la existente, no 201
    res.status(duplicada ? 200 : 201).json({
      ok: true,
      data: { transaccion, folio, duplicada },
      // Mensaje pensado para la notificación local del Atajo (spec 3.1 / 10.5)
      mensaje: `Registro exitoso: $${transaccion.monto} — Folio ${folio}`,
    });
  } catch (err) {
    next(err);
  }
}

async function listar(req, res, next) {
  try {
    res.json({ ok: true, data: await transaccionesService.listar(req.query) });
  } catch (err) {
    next(err);
  }
}

async function obtener(req, res, next) {
  try {
    res.json({ ok: true, data: await transaccionesService.obtener(req.params.id) });
  } catch (err) {
    next(err);
  }
}

async function cancelar(req, res, next) {
  try {
    const tx = await transaccionesService.cancelar(req.params.id, req.body, contextoDe(req));
    res.json({ ok: true, data: tx });
  } catch (err) {
    next(err);
  }
}

async function conciliar(req, res, next) {
  try {
    const tx = await transaccionesService.conciliar(req.params.id, req.body, contextoDe(req));
    res.json({ ok: true, data: tx });
  } catch (err) {
    next(err);
  }
}

module.exports = { crear, listar, obtener, cancelar, conciliar };
