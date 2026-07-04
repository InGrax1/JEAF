// Configuración de la app Express: seguridad, CORS, parseo y rutas.
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const env = require('./config/env');
const apiRoutes = require('./routes');
const openapi = require('../docs/openapi.json');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');

const app = express();

// Necesario detrás de proxy (Render) para que req.ip y rate limiting funcionen bien
app.set('trust proxy', 1);

app.use(helmet());

// CORS: solo orígenes autorizados pueden consumir la API (spec 7.2)
app.use(
  cors({
    origin: env.corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Api-Key'],
  })
);

app.use(express.json({ limit: '100kb' }));

// Documentación técnica autogenerada (spec 9.1): estructura exacta que el
// iPhone debe enviar al servidor
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapi, { customSiteTitle: 'JEAF API — Documentación' }));

app.use('/api/v1', apiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
