// Validación de esquemas Joi por segmento de la request (body, params, query).
// Rechaza campos desconocidos y textos en campos numéricos (sanitización).
const { AppError } = require('../utils/errors');

function validate(schema, segment = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[segment], {
      abortEarly: false,
      stripUnknown: false,
      convert: true,
    });
    if (error) {
      const detalles = error.details.map((d) => d.message).join('; ');
      return next(new AppError(`Datos inválidos: ${detalles}`, 400, 'VALIDATION_ERROR'));
    }
    req[segment] = value;
    return next();
  };
}

module.exports = { validate };
