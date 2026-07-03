# Changelog — Backend JEAF

Todos los cambios notables del backend se documentan en este archivo.
Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.1.0/).
Versionado alineado a las fases de desarrollo de la especificación JEAF v1.2.

---

## [No publicado]

### Pendiente
- FASE 1 — Motor de Transacciones e iOS: endpoints transaccionales (`POST /api/v1/transacciones` con idempotencia), rate limiting por API key, cancelación con motivo obligatorio, conciliación bancaria.
- FASE 3 — Cierres y Reportes: generación de PDF/Excel mensuales, endpoints de reportes y balances.
- FASE 4 — QA, entornos (dev/staging/prod), CI/CD con GitHub Actions, backups.

---

## [0.1.0] — 2026-07-03 — FASE 0: Arquitectura y Base de Datos

### Agregado
- **Estructura Clean Architecture** según especificación: `config/`, `controllers/`, `middlewares/`, `routes/`, `services/`, `repositories/`, `utils/`, `validators/`.
- **Esquema SQL completo** (`database/schema.sql`) con las 6 entidades core:
  - `roles` — niveles de permiso (super_admin, auditor, capturista).
  - `usuarios` — con `password_hash` (Bcrypt), FK a roles, soft delete.
  - `categorias` — con campo `tipo (ingreso|egreso)` y soft delete (activo).
  - `transacciones` — libro mayor: `DECIMAL(12,2)`, `idempotency_key` única, estado `activa|cancelada`, motivo de cancelación, bandera de conciliación bancaria.
  - `logs_auditoria` — rastro inmutable: estado anterior/nuevo en JSON, usuario, IP.
  - `api_keys` — solo `key_hash` (SHA-256), `last_used_at`, `revoked_at`; nunca texto plano.
  - Todos los IDs en `CHAR(36)` (UUID), fechas `DATETIME` en UTC.
- **Seed inicial** (`database/seed.sql`): roles base y usuario Tesorero inicial.
- **Servidor Express** (`src/server.js`, `src/app.js`) con Helmet, CORS restringido por origen y parseo JSON con límite.
- **Middlewares de seguridad**:
  - `authJwt` — validación de access token (1 h) y refresh token (7 días).
  - `rbac` — verificación de rol por ruta antes de llegar al controller.
  - `apiKeyAuth` — validación de API Key por hash, rechazo si `revoked_at` no es NULL, actualización de `last_used_at`.
  - `rateLimiters` — login: 5 intentos / 15 min por IP; transacciones: 30 req/min por API key (listo para FASE 1).
  - `validate` — validación de esquemas Joi (body/params/query) con rechazo de payload desconocido.
  - `errorHandler` — manejo centralizado de errores con respuestas JSON uniformes.
- **Módulo de autenticación web**: `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh` (JWT, Bcrypt salt rounds 12).
- **Gestión de usuarios** (solo super_admin): CRUD con soft delete, asignación de rol única (1:N).
- **Gestión de API Keys**: generación (la key se muestra una sola vez), listado y revocación inmediata (`revoked_at = NOW()`).
- **Servicio de auditoría** (`services/audit.service.js`): registra INSERT/UPDATE/CANCEL en `logs_auditoria` con estado anterior/nuevo, usuario e IP.
- **Configuración**: variables sensibles en `.env` (plantilla `.env.example`), pool MySQL con `mysql2/promise`, zona horaria de sesión en UTC.
- `GET /api/v1/health` — endpoint de salud para uptime monitoring.

### Notas de seguridad
- Prohibido `DELETE` físico en transacciones (regla de inmutabilidad) — reforzado a nivel de repositorio.
- Contraseñas y API keys jamás en texto plano.
