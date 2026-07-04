// Controller del dashboard: delega al service y devuelve JSON.
const dashboardService = require('../services/dashboard.service');

async function resumen(req, res, next) {
  try {
    res.json({ ok: true, data: await dashboardService.resumen() });
  } catch (err) {
    next(err);
  }
}

module.exports = { resumen };
