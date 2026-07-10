const { Router } = require('express');
const authController = require('../controllers/auth.controller');
const { validate } = require('../middlewares/validate');
const { loginLimiter, olvidePasswordLimiter, restablecerPasswordLimiter } = require('../middlewares/rateLimiters');
const {
  loginSchema,
  refreshSchema,
  olvidePasswordSchema,
  restablecerPasswordSchema,
} = require('../validators/schemas');

const router = Router();

// Rate limit por IP: máx. 5 intentos cada 15 min (spec 7.2)
router.post('/login', loginLimiter, validate(loginSchema), authController.login);
router.post('/refresh', validate(refreshSchema), authController.refresh);

// Recuperación de contraseña: código de 6 dígitos por correo, válido 15 min
router.post(
  '/olvide-password',
  olvidePasswordLimiter,
  validate(olvidePasswordSchema),
  authController.olvidePassword
);
router.post(
  '/restablecer-password',
  restablecerPasswordLimiter,
  validate(restablecerPasswordSchema),
  authController.restablecerPassword
);

module.exports = router;
