// Enrutador raíz de la API v1.
const { Router } = require('express');
const authRoutes = require('./auth.routes');
const usuariosRoutes = require('./usuarios.routes');
const apiKeysRoutes = require('./apiKeys.routes');
const transaccionesRoutes = require('./transacciones.routes');
const categoriasRoutes = require('./categorias.routes');

const router = Router();

// Health check para uptime monitoring (KPI: disponibilidad > 99.9%)
router.get('/health', (req, res) => {
  res.json({ ok: true, data: { status: 'up', timestamp: new Date().toISOString() } });
});

router.use('/auth', authRoutes);
router.use('/usuarios', usuariosRoutes);
router.use('/api-keys', apiKeysRoutes);
router.use('/transacciones', transaccionesRoutes);
router.use('/categorias', categoriasRoutes);

// FASE 3: /reportes — pendiente

module.exports = router;
