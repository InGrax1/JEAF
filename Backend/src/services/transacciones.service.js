// Motor de transacciones: reglas financieras del libro mayor.
// - Idempotencia (spec 10.1): si la idempotency_key ya fue procesada,
//   se devuelve la transacción existente sin duplicar.
// - Inmutabilidad (spec 4.1): cancelar = cambio de estado + motivo obligatorio.
// - Trazabilidad (spec 4.3): todo INSERT/UPDATE/CANCEL queda en logs_auditoria.
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const transaccionesRepository = require('../repositories/transacciones.repository');
const categoriasRepository = require('../repositories/categorias.repository');
const auditService = require('./audit.service');
const { AppError } = require('../utils/errors');

// Folio corto para la notificación del Atajo (spec 10.5): últimos 6 chars del UUID
function folioDe(id) {
  return id.slice(-6).toUpperCase();
}

async function crear({ tipo, monto, categoriaId, notas, idempotencyKey }, contexto) {
  const categoria = await categoriasRepository.findById(categoriaId);
  if (!categoria) throw new AppError('Categoría inexistente', 400, 'CATEGORY_NOT_FOUND');
  if (!categoria.activo) throw new AppError('La categoría está desactivada', 400, 'CATEGORY_INACTIVE');
  if (categoria.tipo !== tipo) {
    throw new AppError(
      `La categoría "${categoria.nombre}" es de tipo ${categoria.tipo}, no ${tipo}`,
      400,
      'CATEGORY_TYPE_MISMATCH'
    );
  }

  const id = uuidv4();
  const montoNormalizado = monto.toFixed(2); // DECIMAL(12,2): siempre 2 decimales exactos

  try {
    await db.withTransaction(async (conn) => {
      await transaccionesRepository.insert(
        {
          id,
          tipo,
          monto: montoNormalizado,
          categoriaId,
          usuarioId: contexto.usuarioId,
          notas,
          idempotencyKey,
          origen: contexto.origen,
        },
        conn
      );
      await auditService.registrar(
        {
          tabla: 'transacciones',
          registroId: id,
          accion: 'INSERT',
          estadoNuevo: { tipo, monto: montoNormalizado, categoriaId, notas, idempotencyKey, origen: contexto.origen },
          usuarioId: contexto.usuarioId,
          ipAddress: contexto.ip,
        },
        conn
      );
    });
  } catch (err) {
    // Idempotencia: reintento del Atajo tras timeout → devolver la existente, no duplicar
    if (err.code === 'ER_DUP_ENTRY' && String(err.message).includes('uq_transacciones_idempotency')) {
      const existente = await transaccionesRepository.findByIdempotencyKey(idempotencyKey);
      return { transaccion: existente, folio: folioDe(existente.id), duplicada: true };
    }
    throw err;
  }

  const creada = await transaccionesRepository.findById(id);
  return { transaccion: creada, folio: folioDe(id), duplicada: false };
}

async function listar(filtros) {
  return transaccionesRepository.list(filtros);
}

async function obtener(id) {
  const tx = await transaccionesRepository.findById(id);
  if (!tx) throw new AppError('Transacción no encontrada', 404, 'TRANSACTION_NOT_FOUND');
  return tx;
}

async function cancelar(id, { motivo }, contexto) {
  const anterior = await obtener(id);
  if (anterior.estado === 'cancelada') {
    throw new AppError('La transacción ya está cancelada', 409, 'ALREADY_CANCELLED');
  }

  await db.withTransaction(async (conn) => {
    await transaccionesRepository.cancelar(id, { motivo, canceladaPor: contexto.usuarioId }, conn);
    await auditService.registrar(
      {
        tabla: 'transacciones',
        registroId: id,
        accion: 'CANCEL',
        estadoAnterior: anterior,
        estadoNuevo: { estado: 'cancelada', motivo_cancelacion: motivo, cancelada_por: contexto.usuarioId },
        usuarioId: contexto.usuarioId,
        ipAddress: contexto.ip,
      },
      conn
    );
  });

  return transaccionesRepository.findById(id);
}

async function conciliar(id, { conciliada }, contexto) {
  const anterior = await obtener(id);
  if (anterior.estado === 'cancelada') {
    throw new AppError('No se puede conciliar una transacción cancelada', 409, 'CANCELLED_TRANSACTION');
  }

  await db.withTransaction(async (conn) => {
    await transaccionesRepository.setConciliada(id, conciliada, conn);
    await auditService.registrar(
      {
        tabla: 'transacciones',
        registroId: id,
        accion: 'UPDATE',
        estadoAnterior: { conciliada: anterior.conciliada },
        estadoNuevo: { conciliada },
        usuarioId: contexto.usuarioId,
        ipAddress: contexto.ip,
      },
      conn
    );
  });

  return transaccionesRepository.findById(id);
}

module.exports = { crear, listar, obtener, cancelar, conciliar, folioDe };
