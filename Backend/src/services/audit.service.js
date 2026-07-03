// Servicio de auditoría (regla de trazabilidad, sección 4.3):
// todo INSERT/UPDATE/CANCEL genera un registro en logs_auditoria con
// estado anterior, estado nuevo, usuario e IP.
const { v4: uuidv4 } = require('uuid');
const logsRepository = require('../repositories/logs.repository');

async function registrar({ tabla, registroId, accion, estadoAnterior = null, estadoNuevo = null, usuarioId = null, ipAddress = null }, conn) {
  await logsRepository.insert(
    {
      id: uuidv4(),
      tabla,
      registroId,
      accion,
      estadoAnterior,
      estadoNuevo,
      usuarioId,
      ipAddress,
    },
    conn
  );
}

module.exports = { registrar };
