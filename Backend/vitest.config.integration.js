// Configuración para pruebas de INTEGRACIÓN contra MySQL real (jeaf_test).
// Las credenciales salen del .env (local) o del entorno (CI).
const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
  test: {
    include: ['tests/integration/**/*.int.test.js'],
    // Un solo hilo: todas las pruebas comparten la base jeaf_test
    pool: 'threads',
    poolOptions: { threads: { singleThread: true } },
    testTimeout: 20000,
  },
});
