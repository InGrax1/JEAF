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
    const usos = await transaccionesRepository.countByCategoria(id);
    if (usos > 0) {
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

module.exports = { listar, crear, actualizar };
