// Pruebas unitarias de recuperación de contraseña (olvidePassword/restablecerPassword).
// Mismo patrón que transacciones.service.test.js: createRequire + vi.spyOn sobre
// los módulos reales, porque vi.mock no intercepta require entre módulos CJS.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const db = require('../src/config/db');
const usuariosRepository = require('../src/repositories/usuarios.repository');
const codigosRecuperacionRepository = require('../src/repositories/codigosRecuperacion.repository');
const auditService = require('../src/services/audit.service');
const emailUtil = require('../src/utils/email');
const authService = require('../src/services/auth.service');

const contexto = { ip: '127.0.0.1' };
const usuarioActivo = {
  id: 'u-1',
  nombre: 'Tesorero',
  email: 'tesorero@jeaf.local',
  password_hash: 'hash-existente',
  activo: 1,
  deleted_at: null,
  rol: 'super_admin',
};

beforeEach(() => {
  vi.spyOn(db, 'withTransaction').mockImplementation(async (fn) => fn({}));
  vi.spyOn(usuariosRepository, 'findByEmailConHash').mockResolvedValue(null);
  vi.spyOn(usuariosRepository, 'update').mockResolvedValue();
  vi.spyOn(codigosRecuperacionRepository, 'insert').mockResolvedValue();
  vi.spyOn(codigosRecuperacionRepository, 'findVigentePorUsuario').mockResolvedValue(null);
  vi.spyOn(codigosRecuperacionRepository, 'incrementarIntentos').mockResolvedValue();
  vi.spyOn(codigosRecuperacionRepository, 'marcarUsado').mockResolvedValue();
  vi.spyOn(auditService, 'registrar').mockResolvedValue();
  vi.spyOn(emailUtil, 'enviarCorreo').mockResolvedValue();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('auth.service.olvidePassword', () => {
  it('usuario inexistente: responde con el mensaje genérico y NO envía correo (anti-enumeración)', async () => {
    usuariosRepository.findByEmailConHash.mockResolvedValue(null);

    const resultado = await authService.olvidePassword({ email: 'nadie@jeaf.local' }, contexto);

    expect(resultado.mensaje).toMatch(/Si el correo existe/);
    expect(emailUtil.enviarCorreo).not.toHaveBeenCalled();
    expect(codigosRecuperacionRepository.insert).not.toHaveBeenCalled();
  });

  it('usuario desactivado: mismo mensaje genérico, no envía correo', async () => {
    usuariosRepository.findByEmailConHash.mockResolvedValue({ ...usuarioActivo, activo: 0 });

    const resultado = await authService.olvidePassword({ email: usuarioActivo.email }, contexto);

    expect(resultado.mensaje).toMatch(/Si el correo existe/);
    expect(emailUtil.enviarCorreo).not.toHaveBeenCalled();
  });

  it('usuario activo: genera código, lo guarda hasheado y envía el correo', async () => {
    usuariosRepository.findByEmailConHash.mockResolvedValue(usuarioActivo);

    await authService.olvidePassword({ email: usuarioActivo.email }, contexto);

    expect(codigosRecuperacionRepository.insert).toHaveBeenCalledWith(
      expect.objectContaining({ usuarioId: 'u-1', codigoHash: expect.stringMatching(/^[0-9a-f]{64}$/) })
    );
    expect(emailUtil.enviarCorreo).toHaveBeenCalledWith(
      expect.objectContaining({ para: usuarioActivo.email })
    );
  });
});

describe('auth.service.restablecerPassword', () => {
  it('sin código vigente: rechaza como código inválido', async () => {
    usuariosRepository.findByEmailConHash.mockResolvedValue(usuarioActivo);
    codigosRecuperacionRepository.findVigentePorUsuario.mockResolvedValue(null);

    await expect(
      authService.restablecerPassword({ email: usuarioActivo.email, codigo: '123456', password: 'NuevaPass123' }, contexto)
    ).rejects.toMatchObject({ code: 'INVALID_RESET_CODE' });
  });

  it('demasiados intentos fallidos: rechaza sin comparar el código', async () => {
    usuariosRepository.findByEmailConHash.mockResolvedValue(usuarioActivo);
    codigosRecuperacionRepository.findVigentePorUsuario.mockResolvedValue({
      id: 'cod-1',
      intentos: 5,
      codigo_hash: 'x'.repeat(64),
    });

    await expect(
      authService.restablecerPassword({ email: usuarioActivo.email, codigo: '123456', password: 'NuevaPass123' }, contexto)
    ).rejects.toMatchObject({ code: 'TOO_MANY_ATTEMPTS' });
    expect(codigosRecuperacionRepository.incrementarIntentos).not.toHaveBeenCalled();
  });

  it('código incorrecto: incrementa intentos y rechaza', async () => {
    const crypto = require('crypto');
    usuariosRepository.findByEmailConHash.mockResolvedValue(usuarioActivo);
    codigosRecuperacionRepository.findVigentePorUsuario.mockResolvedValue({
      id: 'cod-1',
      intentos: 0,
      codigo_hash: crypto.createHash('sha256').update('999999').digest('hex'),
    });

    await expect(
      authService.restablecerPassword({ email: usuarioActivo.email, codigo: '111111', password: 'NuevaPass123' }, contexto)
    ).rejects.toMatchObject({ code: 'INVALID_RESET_CODE' });
    expect(codigosRecuperacionRepository.incrementarIntentos).toHaveBeenCalledWith('cod-1');
    expect(usuariosRepository.update).not.toHaveBeenCalled();
  });

  it('código correcto: actualiza la contraseña, marca el código usado y audita', async () => {
    const crypto = require('crypto');
    usuariosRepository.findByEmailConHash.mockResolvedValue(usuarioActivo);
    codigosRecuperacionRepository.findVigentePorUsuario.mockResolvedValue({
      id: 'cod-1',
      intentos: 1,
      codigo_hash: crypto.createHash('sha256').update('654321').digest('hex'),
    });

    const resultado = await authService.restablecerPassword(
      { email: usuarioActivo.email, codigo: '654321', password: 'NuevaPass123' },
      contexto
    );

    expect(usuariosRepository.update).toHaveBeenCalledWith(
      'u-1',
      expect.objectContaining({ passwordHash: expect.any(String) }),
      expect.anything()
    );
    expect(codigosRecuperacionRepository.marcarUsado).toHaveBeenCalledWith('cod-1', expect.anything());
    expect(auditService.registrar).toHaveBeenCalledWith(
      expect.objectContaining({ tabla: 'usuarios', accion: 'UPDATE' }),
      expect.anything()
    );
    expect(resultado.mensaje).toMatch(/actualizada/);
  });
});
