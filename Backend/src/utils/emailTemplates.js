// Plantillas de correo transaccional. HTML con tablas + estilos inline (no
// <style> con clases, no flexbox/grid): es lo único que los clientes de
// correo (Gmail, Outlook, Apple Mail) renderizan de forma consistente. El
// logo va como texto estilizado, no imagen: evita el ícono roto que
// aparecería mientras el cliente de correo bloquea imágenes por defecto,
// justo en un correo cuyo contenido crítico (el código) debe verse sí o sí.
const MARCA = {
  primario: '#000000',
  secundario: '#006c49',
  secundarioTenue: '#e6f7f0',
  fondo: '#f7f9fb',
  superficie: '#ffffff',
  borde: '#e6e8ea',
  texto: '#191c1e',
  textoTenue: '#45464d',
};

const FUENTE = "'Inter', Arial, Helvetica, sans-serif";

function envoltorio(contenido) {
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="light" />
    <meta name="supported-color-schemes" content="light" />
    <title>JEAF</title>
  </head>
  <body style="margin:0; padding:0; background-color:${MARCA.fondo}; font-family:${FUENTE};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${MARCA.fondo}; padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px; background-color:${MARCA.superficie}; border:1px solid ${MARCA.borde}; border-radius:12px; overflow:hidden;">
            <tr>
              <td align="center" style="background-color:${MARCA.primario}; padding:28px 24px;">
                <span style="color:#ffffff; font-size:22px; font-weight:800; letter-spacing:0.02em;">JEAF</span>
                <br />
                <span style="color:#ffffff; opacity:0.7; font-size:11px; letter-spacing:0.08em; text-transform:uppercase;">Gestión financiera</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 28px;">
                ${contenido}
              </td>
            </tr>
            <tr>
              <td align="center" style="background-color:${MARCA.fondo}; padding:18px 24px; border-top:1px solid ${MARCA.borde};">
                <span style="color:${MARCA.textoTenue}; font-size:12px;">JEAF — Plataforma de gestión financiera</span>
                <br />
                <span style="color:${MARCA.textoTenue}; font-size:11px;">Este es un mensaje automático, no respondas a este correo.</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function plantillaCodigoRecuperacion({ codigo, minutos }) {
  const asunto = 'Código para restablecer tu contraseña — JEAF';

  const cuerpo = `
    <h1 style="margin:0 0 12px; color:${MARCA.texto}; font-size:19px; font-weight:700;">Restablecer contraseña</h1>
    <p style="margin:0 0 24px; color:${MARCA.textoTenue}; font-size:14px; line-height:1.6;">
      Recibimos una solicitud para restablecer la contraseña de tu cuenta. Usa el siguiente código de verificación para continuar:
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="background-color:${MARCA.secundarioTenue}; border:1px solid ${MARCA.secundario}; border-radius:8px; padding:18px;">
          <span style="font-family:'Courier New', Courier, monospace; font-size:32px; font-weight:700; letter-spacing:10px; color:${MARCA.secundario};">${codigo}</span>
        </td>
      </tr>
    </table>
    <p style="margin:20px 0 0; color:${MARCA.textoTenue}; font-size:13px; line-height:1.6;">
      Este código expira en <strong>${minutos} minutos</strong> y solo puede usarse una vez.
    </p>
    <p style="margin:20px 0 0; padding-top:16px; border-top:1px solid ${MARCA.borde}; color:${MARCA.textoTenue}; font-size:12px; line-height:1.6;">
      Si no solicitaste este cambio, ignora este correo — tu contraseña actual sigue siendo válida.
    </p>
  `;

  const textoPlano =
    `Restablecer contraseña — JEAF\n\n` +
    `Tu código de verificación es: ${codigo}\n\n` +
    `Expira en ${minutos} minutos y solo puede usarse una vez.\n\n` +
    `Si no solicitaste este cambio, ignora este correo — tu contraseña actual sigue siendo válida.`;

  return { asunto, html: envoltorio(cuerpo), textoPlano };
}

module.exports = { plantillaCodigoRecuperacion };
