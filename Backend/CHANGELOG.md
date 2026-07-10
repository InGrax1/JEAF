# Changelog — Backend JEAF

Todos los cambios notables del backend se documentan en este archivo.
Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.1.0/).
Versionado alineado a las fases de desarrollo de la especificación JEAF v1.2.

---

## [No publicado]

### Pendiente
- UAT con el tesorero real y despliegue efectivo a Render/Vercel/Aiven (requiere cuentas y credenciales — ver `docs/Despliegue.md`).
- Configurar variables `SMTP_*` en Render para que la recuperación de contraseña envíe correos reales en producción (ver más abajo).

---

## [0.6.0] — 2026-07-10 — Recuperación de contraseña por correo

### Agregado
- **`POST /api/v1/auth/olvide-password`**: solicita un código de verificación de 6 dígitos al correo del usuario. Responde siempre el mismo mensaje genérico exista o no la cuenta (mismo principio anti-enumeración que el login) y solo genera/envía el código si el usuario existe, está activo y no eliminado. Rate limit: 3 solicitudes por IP cada 15 minutos.
- **`POST /api/v1/auth/restablecer-password`**: verifica el código y establece la nueva contraseña en un solo paso. El código expira a los 15 minutos, admite máximo 5 intentos fallidos antes de invalidarse (hay que solicitar uno nuevo) y es de un solo uso. Comparación del código en tiempo constante (`crypto.timingSafeEqual`) para evitar side-channels de temporización. Rate limit: 10 intentos por IP cada 15 minutos.
- **Tabla `codigos_recuperacion`** (`database/schema.sql`): solo guarda el hash SHA-256 del código, nunca en texto plano — mismo principio que `api_keys`.
- **`utils/email.js`**: envío de correo vía SMTP (nodemailer). En desarrollo, si no hay `SMTP_*` configurado, el correo se imprime en la consola del servidor (permite probar el flujo completo sin credenciales reales); en producción, falla con un error claro si falta configurar.
- El restablecimiento exitoso queda auditado en `logs_auditoria` (UPDATE sobre `usuarios`), dentro de la misma transacción que actualiza el hash de la contraseña y marca el código como usado.
- Variables nuevas en `.env.example`: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`.

### Verificado
- 5 pruebas unitarias nuevas (`tests/auth.service.test.js`): anti-enumeración, generación/hash del código, código incorrecto incrementa intentos, límite de intentos, y flujo exitoso completo con auditoría.
- 2 pruebas de integración nuevas contra MySQL real: código vigente vs. expirado vs. usado.
- Flujo E2E verificado contra el backend y panel real: solicitud de código, anti-enumeración (mismo mensaje para correo existente/inexistente), código incorrecto rechazado, código de un solo uso (falla al reintentarlo), login con contraseña vieja falla y con la nueva funciona — probado tanto por API como en el navegador.

### Nota de despliegue
- **Producción requiere configurar `SMTP_*` en Render** (ver `docs/Despliegue.md`) — sin esas variables, `POST /auth/olvide-password` responderá `500 EMAIL_NOT_CONFIGURED` en ese entorno (a diferencia de desarrollo, donde el código solo se imprime en consola).

---

## [0.5.0] — 2026-07-04 — FASE 4: QA, Despliegue y Puesta en Producción

### Agregado
- **Pruebas de integración** (`tests/integration/repositories.int.test.js`, spec 10.6): 10 pruebas de la capa `repositories/` contra una base MySQL **real** (`jeaf_test`, creada desde `schema.sql` y eliminada al final) — índice único de idempotencia, `CHECK` de montos a nivel BD, cancelación sin DELETE, soft delete de usuarios, conciliación, filtros/paginación, API keys por hash y logs JSON. Scripts: `npm run test:int` y `npm run test:all`.
- **Swagger/OpenAPI en `/api/docs`** (spec 9.1): especificación completa de la API (`docs/openapi.json`) servida con swagger-ui-express; documenta la estructura exacta que el iPhone envía, los esquemas de seguridad (JWT y X-Api-Key) y todos los endpoints.
- **CI/CD con GitHub Actions** (`.github/workflows/ci.yml`): pruebas unitarias + integración (MySQL 8 como service container) + build del frontend en cada push/PR a `main`/`develop`; deploy automático a staging (Render deploy hook) al merge a `develop`; deploy a producción solo por tag `v*`.
- **Backup diario** (`scripts/backup_mysql.sh`, spec 10.7): mysqldump comprimido con retención de 30 días, listo para cron; complementa el point-in-time recovery de Aiven.

### Verificado
- 19/19 pruebas en verde (9 unitarias + 10 integración contra MySQL real local).
- `/api/docs` responde 200 con la especificación cargada.

## [0.4.0] — 2026-07-04 — FASE 3: Cierres y Reportes Legales

### Agregado
- **`GET /api/v1/reportes/mensual?anio&mes&formato=pdf|xlsx`** (Tesorero y Auditor): reporte de cierre mensual como descarga (`Content-Disposition: attachment`, nombre `JEAF_Reporte_AAAA-MM.*`).
- **Generador PDF** (`utils/reportePdf.js`, pdfkit): formato formal carta con encabezado institucional (logotipo opcional en `Backend/assets/logo.png`), resumen del mes, desglose por categoría, detalle de movimientos con folio/conciliación, anexo de cancelados con motivo, **espacio en blanco reservado para firma física** (Tesorero y Pastor/Auditor — sin firma electrónica, spec 3.2) y pie con numeración de páginas.
- **Generador Excel** (`utils/reporteExcel.js`, exceljs): hojas `Resumen`, `Detalle` (con autofiltro, panel congelado, montos con signo para cruce contable) y `Cancelados`.
- **`utils/fechas.js`**: límites de mes calculados en la zona horaria local de la iglesia (`LOCAL_TIMEZONE`) y convertidos a UTC para las consultas; formato de fechas local centralizado en backend (spec 6.1).
- Variable `IGLESIA_NOMBRE` para el encabezado de los reportes.
- Capa `reportes.repository` / `reportes.service`: cifras oficiales solo de transacciones activas; las canceladas se listan como anexo de auditoría sin sumar.

### Corregido
- El pie de página del PDF ya no genera una hoja en blanco adicional (PDFKit agregaba página al escribir dentro del margen inferior).

### Verificado (E2E, 2026-07-04)
- PDF y Excel generados contra MySQL real en ~60 ms y ~47 ms (KPI < 3 s ✓); totales cuadrados ($4,530.50 − $670.75 = $3,859.75); Excel releído y validado (3 hojas); descarga desde el panel web con CORS correcto; mes inválido → 400.

## [0.3.0] — 2026-07-03 — FASE 2: soporte del Panel Web

### Agregado
- **`GET /api/v1/dashboard/resumen`** (Tesorero y Auditor): balance total histórico (flujo de caja), ingresos/egresos del mes y del año en curso, serie mensual de los últimos 12 meses y desglose por categoría del mes. Todas las cifras excluyen transacciones canceladas.
- Nueva capa `dashboard.repository` (agregaciones SQL) y `dashboard.service` (cálculo de periodos UTC y normalización de DECIMAL).

### Corregido
- Validación de email en Joi ahora acepta dominios internos (ej. `tesorero@jeaf.local`): se valida el formato sin exigir TLD de la lista IANA.

### Verificado (E2E contra MySQL real, 2026-07-04)
- Login JWT → captura (folio + mensaje) → reintento idempotente (200, sin duplicar) → cancelación con motivo → conciliación → dashboard (excluye canceladas) → 4 registros en `logs_auditoria`.
- Panel web completo en navegador: login real, dashboard con gráficas y tabla de transacciones con datos vivos.

---

## [0.2.0] — 2026-07-03 — FASE 1: Motor de Transacciones e iOS

### Agregado
- **`POST /api/v1/transacciones`** — captura desde Atajos de iOS (API Key) o panel web (JWT, autenticación dual):
  - **Idempotencia** (spec 10.1): si la `idempotency_key` ya fue procesada responde `200 OK` con la transacción existente, sin duplicar. Detectado a nivel de índice único (a prueba de condiciones de carrera).
  - Validación estricta: monto positivo `DECIMAL(12,2)`, categoría existente/activa y coherente con el tipo (ingreso/egreso).
  - Respuesta con **folio corto** (últimos 6 chars del UUID) para el flujo de corrección del capturista (spec 10.5) y `mensaje` listo para la notificación local del Atajo.
  - **Rate limiting por API key**: 30 peticiones/minuto (spec 10.4).
  - Campo `origen` (`ios_shortcut` | `panel_web`) para trazabilidad.
- **`GET /api/v1/transacciones`** — listado con paginación y filtros (fecha, categoría, tipo, capturista, estado, conciliada). Solo Tesorero y Auditor.
- **`POST /api/v1/transacciones/:id/cancelar`** — regla de inmutabilidad (spec 4.1): nunca DELETE; cambia estado a `cancelada` con **motivo obligatorio**, `deleted_at` y quién canceló. Solo Tesorero.
- **`POST /api/v1/transacciones/:id/conciliar`** — marcar/desmarcar "Conciliado en banco". Solo Tesorero.
- **CRUD de categorías** (`/api/v1/categorias`): lectura vía API Key (menú dinámico del Atajo) o JWT; creación/edición/activación solo Tesorero. Bloqueo de cambio de `tipo` si la categoría ya tiene transacciones históricas.
- **Middleware `authDual`**: distingue API Keys (prefijo `jeaf_`) de JWTs en el mismo endpoint.
- **Auditoría completa**: INSERT/CANCEL/UPDATE de transacciones y categorías quedan en `logs_auditoria` con estado anterior/nuevo, usuario e IP, dentro de transacciones SQL.
- **Pruebas unitarias (Vitest)** de la capa `services/` (spec 10.6): idempotencia, validaciones de categoría, cancelación y conciliación — 9 pruebas.
- **Guía de Atajos de iOS** (`docs/Guia_Atajos_iOS.md`): configuración paso a paso de los 2 atajos (ingreso/gasto), generación de `idempotency_key`, reintentos 2–3 veces y respaldo en app Notas sin señal (spec 10.2).

### Cambiado
- Servicios ahora invocan `db.withTransaction(...)` (en lugar de desestructurar) para permitir espionaje en pruebas unitarias.

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
