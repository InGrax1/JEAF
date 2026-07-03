// Esquemas Joi centralizados. Estrictos: rechazan textos en campos numéricos
// y campos desconocidos para prevenir inyecciones (sección 7.2).
const Joi = require('joi');

const uuid = Joi.string().uuid({ version: 'uuidv4' }).required();

const loginSchema = Joi.object({
  email: Joi.string().email().max(190).required(),
  password: Joi.string().min(8).max(100).required(),
}).unknown(false);

const refreshSchema = Joi.object({
  refreshToken: Joi.string().required(),
}).unknown(false);

const crearUsuarioSchema = Joi.object({
  nombre: Joi.string().min(2).max(120).required(),
  email: Joi.string().email().max(190).required(),
  password: Joi.string().min(8).max(100).required(),
  rol: Joi.string().valid('super_admin', 'auditor', 'capturista').required(),
}).unknown(false);

const actualizarUsuarioSchema = Joi.object({
  nombre: Joi.string().min(2).max(120),
  email: Joi.string().email().max(190),
  password: Joi.string().min(8).max(100),
  rol: Joi.string().valid('super_admin', 'auditor', 'capturista'),
  activo: Joi.boolean(),
}).min(1).unknown(false);

const idParamSchema = Joi.object({
  id: uuid,
}).unknown(false);

const crearApiKeySchema = Joi.object({
  usuarioId: uuid,
  etiqueta: Joi.string().min(2).max(100).required(),
}).unknown(false);

module.exports = {
  loginSchema,
  refreshSchema,
  crearUsuarioSchema,
  actualizarUsuarioSchema,
  idParamSchema,
  crearApiKeySchema,
};
