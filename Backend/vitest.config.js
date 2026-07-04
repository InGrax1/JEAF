const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
  test: {
    // Variables mínimas para que config/env.js no falle en pruebas unitarias.
    // Las pruebas de integración contra MySQL real llegarán en FASE 4.
    env: {
      NODE_ENV: 'test',
      DB_HOST: 'localhost',
      DB_USER: 'test',
      DB_NAME: 'jeaf_test',
      JWT_ACCESS_SECRET: 'secreto_pruebas_access',
      JWT_REFRESH_SECRET: 'secreto_pruebas_refresh',
    },
  },
});
