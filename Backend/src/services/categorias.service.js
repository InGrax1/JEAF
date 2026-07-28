// Gestión de categorías contables (spec 3.3): CRUD con soft delete (activo)
// sin afectar registros históricos.
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const categoriasRepository = require('../repositories/categorias.repository');
const transaccionesRepository = require('../repositories/transacciones.repository');
const auditService = require('./audit.service');
const { AppError } = require('../utils/errors');

async function listar({ soloActivas = false } = {}) {
  return categoriasRepository.findAll({ soloActivas });
}

async function crear({ nombre, tipo }, contexto) {
  const existente = await categoriasRepository.findByNombre(nombre);
  if (existente) throw new AppError('Ya existe una categoría con ese nombre', 409, 'CATEGORY_NAME_TAKEN');

  const id = uuidv4();
  await db.withTransaction(async (conn) => {
    await categoriasRepository.insert({ id, nombre, tipo }, conn);
    await auditService.registrar(
      {
        tabla: 'categorias',
        registroId: id,
        accion: 'INSERT',
        estadoNuevo: { nombre, tipo },
        usuarioId: contexto.usuarioId,
        ipAddress: contexto.ip,
      },
      conn
    );
  });

  return categoriasRepository.findById(id);
}

async function actualizar(id, cambios, contexto) {
  const anterior = await categoriasRepository.findById(id);
  if (!anterior) throw new AppError('Categoría no encontrada', 404, 'CATEGORY_NOT_FOUND');

  // Cambiar el tipo reclasificaría el histórico del libro mayor: solo se
  // permite si la categoría aún no tiene transacciones asociadas.
  if (cambios.tipo !== undefined && cambios.tipo !== anterior.tipo) {
    const enUso = await transaccionesRepository.existePorCategoria(id);
    if (enUso) {
      throw new AppError(
        'No se puede cambiar el tipo: la categoría tiene transacciones históricas. Desactívala y crea una nueva.',
        409,
        'CATEGORY_IN_USE'
      );
    }
  }

  if (cambios.nombre !== undefined && cambios.nombre !== anterior.nombre) {
    const duplicada = await categoriasRepository.findByNombre(cambios.nombre);
    if (duplicada) throw new AppError('Ya existe una categoría con ese nombre', 409, 'CATEGORY_NAME_TAKEN');
  }

  await db.withTransaction(async (conn) => {
    await categoriasRepository.update(id, cambios, conn);
    await auditService.registrar(
      {
        tabla: 'categorias',
        registroId: id,
        accion: 'UPDATE',
        estadoAnterior: anterior,
        estadoNuevo: cambios,
        usuarioId: contexto.usuarioId,
        ipAddress: contexto.ip,
      },
      conn
    );
  });

  return categoriasRepository.findById(id);
}

/**
 * Consulta previa para que el Tesorero conozca el efecto antes de confirmar.
 * No cuenta movimientos: basta encontrar uno mediante el índice de categoría.
 */
async function consultarUso(id) {
  const categoria = await categoriasRepository.findById(id);
  if (!categoria) throw new AppError('Categoría no encontrada', 404, 'CATEGORY_NOT_FOUND');
  return { enUso: await transaccionesRepository.existePorCategoria(id) };
}

/**
 * Elimina una categoría de forma definitiva. Solo se permite si NUNCA se usó:
 * es para corregir un alta equivocada, no para depurar el catálogo. Una
 * categoría con movimientos se desactiva (`activo = 0`), nunca se borra —
 * borrarla dejaría sin nombre a las transacciones históricas y a los reportes,
 * que lo resuelven con un JOIN contra esta tabla.
 */
async function eliminar(id, contexto) {
  const anterior = await categoriasRepository.findById(id);
  if (!anterior) throw new AppError('Categoría no encontrada', 404, 'CATEGORY_NOT_FOUND');

  // Se repite al confirmar para cubrir movimientos creados después del aviso.
  const enUso = await transaccionesRepository.existePorCategoria(id);
  if (enUso) {
    throw new AppError(
      'No se puede eliminar: la categoría ya fue usada en el histórico. Desactívala para dejar de usarla sin borrar los movimientos anteriores.',
      409,
      'CATEGORY_IN_USE'
    );
  }

  await db.withTransaction(async (conn) => {
    await categoriasRepository.eliminar(id, conn);
    await auditService.registrar(
      {
        tabla: 'categorias',
        registroId: id,
        // El enum de logs_auditoria no tiene DELETE; CANCEL es la acción que
        // ya usa el sistema para las bajas (ver usuarios.service.js).
        accion: 'CANCEL',
        estadoAnterior: anterior,
        estadoNuevo: { eliminada: true, permanente: true },
        usuarioId: contexto.usuarioId,
        ipAddress: contexto.ip,
      },
      conn
    );
  });
}

module.exports = { listar, crear, actualizar, consultarUso, eliminar };
