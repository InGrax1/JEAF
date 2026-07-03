// Gestión de usuarios: reglas de negocio + auditoría. Solo accesible a super_admin.
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const env = require('../config/env');
const { withTransaction } = require('../config/db');
const usuariosRepository = require('../repositories/usuarios.repository');
const rolesRepository = require('../repositories/roles.repository');
const auditService = require('./audit.service');
const { AppError } = require('../utils/errors');

async function listar() {
  return usuariosRepository.findAll();
}

async function obtener(id) {
  const usuario = await usuariosRepository.findById(id);
  if (!usuario) throw new AppError('Usuario no encontrado', 404, 'USER_NOT_FOUND');
  return usuario;
}

async function crear({ nombre, email, password, rol }, contexto) {
  const rolRegistro = await rolesRepository.findByNombre(rol);
  if (!rolRegistro) throw new AppError(`Rol inexistente: ${rol}`, 400, 'INVALID_ROLE');

  const existente = await usuariosRepository.findByEmailConHash(email);
  if (existente) throw new AppError('El email ya está registrado', 409, 'EMAIL_TAKEN');

  const id = uuidv4();
  const passwordHash = await bcrypt.hash(password, env.bcryptSaltRounds);

  await withTransaction(async (conn) => {
    await usuariosRepository.insert({ id, nombre, email, passwordHash, rolId: rolRegistro.id }, conn);
    await auditService.registrar(
      {
        tabla: 'usuarios',
        registroId: id,
        accion: 'INSERT',
        estadoNuevo: { nombre, email, rol },
        usuarioId: contexto.usuarioId,
        ipAddress: contexto.ip,
      },
      conn
    );
  });

  return usuariosRepository.findById(id);
}

async function actualizar(id, cambios, contexto) {
  const anterior = await obtener(id);

  const campos = {};
  if (cambios.nombre !== undefined) campos.nombre = cambios.nombre;
  if (cambios.email !== undefined) campos.email = cambios.email;
  if (cambios.activo !== undefined) campos.activo = cambios.activo ? 1 : 0;
  if (cambios.password !== undefined) {
    campos.passwordHash = await bcrypt.hash(cambios.password, env.bcryptSaltRounds);
  }
  if (cambios.rol !== undefined) {
    const rolRegistro = await rolesRepository.findByNombre(cambios.rol);
    if (!rolRegistro) throw new AppError(`Rol inexistente: ${cambios.rol}`, 400, 'INVALID_ROLE');
    campos.rolId = rolRegistro.id;
  }

  await withTransaction(async (conn) => {
    await usuariosRepository.update(id, campos, conn);
    const { password, ...cambiosSinPassword } = cambios;
    await auditService.registrar(
      {
        tabla: 'usuarios',
        registroId: id,
        accion: 'UPDATE',
        estadoAnterior: anterior,
        estadoNuevo: { ...cambiosSinPassword, password: password ? '[actualizada]' : undefined },
        usuarioId: contexto.usuarioId,
        ipAddress: contexto.ip,
      },
      conn
    );
  });

  return usuariosRepository.findById(id);
}

async function eliminar(id, contexto) {
  const anterior = await obtener(id);
  if (id === contexto.usuarioId) {
    throw new AppError('No puedes eliminar tu propio usuario', 400, 'SELF_DELETE_FORBIDDEN');
  }

  await withTransaction(async (conn) => {
    await usuariosRepository.softDelete(id, conn);
    await auditService.registrar(
      {
        tabla: 'usuarios',
        registroId: id,
        accion: 'CANCEL',
        estadoAnterior: anterior,
        estadoNuevo: { deleted: true },
        usuarioId: contexto.usuarioId,
        ipAddress: contexto.ip,
      },
      conn
    );
  });
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
