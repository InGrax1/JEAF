// Envío de correo (recuperación de contraseña). El transporte SMTP se crea
// bajo demanda: si falta configurar SMTP_* en producción, falla con un error
// claro solo al intentar enviar (no rompe el arranque del servidor completo).
// En desarrollo, si no hay SMTP configurado, el correo se imprime en consola
// para poder probar el flujo completo sin credenciales reales.
const nodemailer = require('nodemailer');
const env = require('./../config/env');
const { AppError } = require('./errors');

let transportador = null;

function smtpConfigurado() {
  return Boolean(env.smtp.host && env.smtp.user && env.smtp.password);
}

function obtenerTransportador() {
  if (!transportador) {
    transportador = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth: { user: env.smtp.user, pass: env.smtp.password },
    });
  }
  return transportador;
}

async function enviarCorreo({ para, asunto, textoPlano, html }) {
  if (!smtpConfigurado()) {
    if (env.nodeEnv === 'production') {
      throw new AppError('Servicio de correo no configurado', 500, 'EMAIL_NOT_CONFIGURED');
    }
    // Modo desarrollo sin SMTP: mostrar el contenido en consola en vez de enviarlo
    console.log(`\n[email:dev] Para: ${para}\n[email:dev] Asunto: ${asunto}\n[email:dev] ${textoPlano}\n`);
    return;
  }

  await obtenerTransportador().sendMail({
    from: env.smtp.from,
    to: para,
    subject: asunto,
    text: textoPlano,
    html,
  });
}

module.exports = { enviarCorreo };
