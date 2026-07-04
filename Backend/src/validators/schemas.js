// Esquemas Joi centralizados. Estrictos: rechazan textos en campos numéricos
// y campos desconocidos para prevenir inyecciones (sección 7.2).
const Joi = require('joi');

const uuid = Joi.string().uuid({ version: 'uuidv4' }).required();

const loginSchema = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).max(190).required(),
  password: Joi.string().min(8).max(100).required(),
}).unknown(false);

const refreshSchema = Joi.object({
  refreshToken: Joi.string().required(),
}).unknown(false);

const crearUsuarioSchema = Joi.object({
  nombre: Joi.string().min(2).max(120).required(),
  email: Joi.string().email({ tlds: { allow: false } }).max(190).required(),
  password: Joi.string().min(8).max(100).required(),
  rol: Joi.string().valid('super_admin', 'auditor', 'capturista').required(),
}).unknown(false);

const actualizarUsuarioSchema = Joi.object({
  nombre: Joi.string().min(2).max(120),
  email: Joi.string().email({ tlds: { allow: false } }).max(190),
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

// Regla de integridad numérica (spec 4.2): rechazar montos negativos, cero
// o no numéricos. DECIMAL(12,2) → máx. 10 dígitos enteros, 2 decimales.
const crearTransaccionSchema = Joi.object({
  tipo: Joi.string().valid('ingreso', 'egreso').required(),
  monto: Joi.number().positive().precision(2).max(9999999999.99).required(),
  categoriaId: uuid,
  notas: Joi.string().max(500).allow('', null),
  idempotencyKey: Joi.string().min(8).max(191).required(),
}).unknown(false);

const cancelarTransaccionSchema = Joi.object({
  // Motivo obligatorio para auditoría (regla de inmutabilidad, spec 4.1)
  motivo: Joi.string().min(5).max(255).required(),
}).unknown(false);

const conciliarTransaccionSchema = Joi.object({
  conciliada: Joi.boolean().required(),
}).unknown(false);

const listarTransaccionesQuerySchema = Joi.object({
  fechaDesde: Joi.date().iso(),
  fechaHasta: Joi.date().iso().min(Joi.ref('fechaDesde')),
  categoriaId: Joi.string().uuid({ version: 'uuidv4' }),
  tipo: Joi.string().valid('ingreso', 'egreso'),
  usuarioId: Joi.string().uuid({ version: 'uuidv4' }),
  estado: Joi.string().valid('activa', 'cancelada'),
  conciliada: Joi.boolean(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
}).unknown(false);

const crearCategoriaSchema = Joi.object({
  nombre: Joi.string().min(2).max(100).required(),
  tipo: Joi.string().valid('ingreso', 'egreso').required(),
}).unknown(false);

const actualizarCategoriaSchema = Joi.object({
  nombre: Joi.string().min(2).max(100),
  tipo: Joi.string().valid('ingreso', 'egreso'),
  activo: Joi.boolean(),
}).min(1).unknown(false);

const listarCategoriasQuerySchema = Joi.object({
  soloActivas: Joi.boolean().default(false),
}).unknown(false);

module.exports = {
  loginSchema,
  refreshSchema,
  crearUsuarioSchema,
  actualizarUsuarioSchema,
  idParamSchema,
  crearApiKeySchema,
  crearTransaccionSchema,
  cancelarTransaccionSchema,
  conciliarTransaccionSchema,
  listarTransaccionesQuerySchema,
  crearCategoriaSchema,
  actualizarCategoriaSchema,
  listarCategoriasQuerySchema,
};
