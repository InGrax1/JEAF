const { Router } = require('express');
const authController = require('../controllers/auth.controller');
const { validate } = require('../middlewares/validate');
const { loginLimiter } = require('../middlewares/rateLimiters');
const { loginSchema, refreshSchema } = require('../validators/schemas');

const router = Router();

// Rate limit por IP: máx. 5 intentos cada 15 min (spec 7.2)
router.post('/login', loginLimiter, validate(loginSchema), authController.login);
router.post('/refresh', validate(refreshSchema), authController.refresh);

module.exports = router;
