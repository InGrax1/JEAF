-- ============================================================
-- JEAF — Esquema de Base de Datos (FASE 0)
-- MySQL 8.0+ requerido (defaults por expresión, CHECK, JSON)
-- Convenciones: IDs UUID CHAR(36), dinero DECIMAL(12,2),
-- fechas DATETIME en UTC, soft delete (deleted_at).
-- ============================================================

CREATE DATABASE IF NOT EXISTS jeaf
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE jeaf;

-- ------------------------------------------------------------
-- roles: niveles de permiso. Relación 1:N con usuarios.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
  id          CHAR(36)     NOT NULL,
  nombre      VARCHAR(50)  NOT NULL,
  descripcion VARCHAR(255) NULL,
  created_at  DATETIME     NOT NULL DEFAULT (UTC_TIMESTAMP()),
  PRIMARY KEY (id),
  UNIQUE KEY uq_roles_nombre (nombre)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- usuarios: tesoreros, auditores y capturistas.
-- Cada usuario tiene exactamente un rol (N:1 con roles).
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
  id            CHAR(36)     NOT NULL,
  nombre        VARCHAR(120) NOT NULL,
  email         VARCHAR(190) NOT NULL,
  password_hash VARCHAR(100) NOT NULL,           -- Bcrypt (salt rounds 12)
  rol_id        CHAR(36)     NOT NULL,
  activo        TINYINT(1)   NOT NULL DEFAULT 1,
  created_at    DATETIME     NOT NULL DEFAULT (UTC_TIMESTAMP()),
  updated_at    DATETIME     NOT NULL DEFAULT (UTC_TIMESTAMP()),
  deleted_at    DATETIME     NULL,               -- soft delete
  PRIMARY KEY (id),
  UNIQUE KEY uq_usuarios_email (email),
  KEY idx_usuarios_rol (rol_id),
  CONSTRAINT fk_usuarios_rol FOREIGN KEY (rol_id) REFERENCES roles (id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- categorias: clasificación contable con tipo obligatorio.
-- Soft delete vía campo activo (histórico intacto).
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categorias (
  id         CHAR(36)                  NOT NULL,
  nombre     VARCHAR(100)              NOT NULL,
  tipo       ENUM('ingreso','egreso')  NOT NULL,
  activo     TINYINT(1)                NOT NULL DEFAULT 1,
  created_at DATETIME                  NOT NULL DEFAULT (UTC_TIMESTAMP()),
  updated_at DATETIME                  NOT NULL DEFAULT (UTC_TIMESTAMP()),
  deleted_at DATETIME                  NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_categorias_nombre (nombre)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- api_keys: credenciales de los Atajos de iOS.
-- Solo se guarda el hash (SHA-256), nunca la key en texto plano.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS api_keys (
  id           CHAR(36)    NOT NULL,
  usuario_id   CHAR(36)    NOT NULL,
  etiqueta     VARCHAR(100) NOT NULL,             -- ej. "iPhone de Juan"
  key_prefix   CHAR(8)     NOT NULL,              -- primeros chars visibles en el panel
  key_hash     CHAR(64)    NOT NULL,              -- SHA-256 hex de la key completa
  created_at   DATETIME    NOT NULL DEFAULT (UTC_TIMESTAMP()),
  last_used_at DATETIME    NULL,
  revoked_at   DATETIME    NULL,                  -- revocación con efecto inmediato
  PRIMARY KEY (id),
  UNIQUE KEY uq_api_keys_hash (key_hash),
  KEY idx_api_keys_usuario (usuario_id),
  CONSTRAINT fk_api_keys_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- transacciones: el libro mayor central. INMUTABLE:
-- prohibido DELETE físico; cancelación = estado + deleted_at + motivo.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transacciones (
  id                  CHAR(36)                 NOT NULL,
  tipo                ENUM('ingreso','egreso') NOT NULL,
  monto               DECIMAL(12,2)            NOT NULL,
  categoria_id        CHAR(36)                 NOT NULL,
  usuario_id          CHAR(36)                 NOT NULL,  -- quién capturó
  notas               VARCHAR(500)             NULL,
  estado              ENUM('activa','cancelada') NOT NULL DEFAULT 'activa',
  motivo_cancelacion  VARCHAR(255)             NULL,      -- obligatorio al cancelar (regla 4.1)
  cancelada_por       CHAR(36)                 NULL,
  conciliada          TINYINT(1)               NOT NULL DEFAULT 0,  -- "conciliado en banco"
  conciliada_at       DATETIME                 NULL,
  idempotency_key     VARCHAR(191)             NOT NULL,  -- generada por el Atajo iOS
  origen              ENUM('ios_shortcut','panel_web') NOT NULL DEFAULT 'ios_shortcut',
  fecha_transaccion   DATETIME                 NOT NULL,  -- UTC
  created_at          DATETIME                 NOT NULL DEFAULT (UTC_TIMESTAMP()),
  updated_at          DATETIME                 NOT NULL DEFAULT (UTC_TIMESTAMP()),
  deleted_at          DATETIME                 NULL,      -- solo vía cancelación
  PRIMARY KEY (id),
  UNIQUE KEY uq_transacciones_idempotency (idempotency_key),
  KEY idx_transacciones_fecha (fecha_transaccion),
  KEY idx_transacciones_categoria (categoria_id),
  KEY idx_transacciones_usuario (usuario_id),
  KEY idx_transacciones_estado (estado),
  CONSTRAINT fk_transacciones_categoria FOREIGN KEY (categoria_id) REFERENCES categorias (id),
  CONSTRAINT fk_transacciones_usuario   FOREIGN KEY (usuario_id)   REFERENCES usuarios (id),
  CONSTRAINT fk_transacciones_cancelada_por FOREIGN KEY (cancelada_por) REFERENCES usuarios (id),
  CONSTRAINT chk_transacciones_monto_positivo CHECK (monto > 0)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- logs_auditoria: rastro inmutable de cada INSERT/UPDATE/CANCEL.
-- Retención mínima: 1 año antes de archivar/purgar.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS logs_auditoria (
  id              CHAR(36)                          NOT NULL,
  tabla           VARCHAR(64)                       NOT NULL,  -- entidad afectada (polimórfico)
  registro_id     CHAR(36)                          NOT NULL,
  accion          ENUM('INSERT','UPDATE','CANCEL')  NOT NULL,
  estado_anterior JSON                              NULL,
  estado_nuevo    JSON                              NULL,
  usuario_id      CHAR(36)                          NULL,
  ip_address      VARCHAR(45)                       NULL,      -- soporta IPv6
  created_at      DATETIME                          NOT NULL DEFAULT (UTC_TIMESTAMP()),
  PRIMARY KEY (id),
  KEY idx_logs_tabla_registro (tabla, registro_id),
  KEY idx_logs_usuario (usuario_id),
  KEY idx_logs_fecha (created_at)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- codigos_recuperacion: códigos temporales de un solo uso para
-- restablecer contraseña por correo. Solo se guarda el hash del
-- código (SHA-256), nunca en texto plano.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS codigos_recuperacion (
  id           CHAR(36)  NOT NULL,
  usuario_id   CHAR(36)  NOT NULL,
  codigo_hash  CHAR(64)  NOT NULL,             -- SHA-256 hex del código de 6 dígitos
  intentos     TINYINT   NOT NULL DEFAULT 0,   -- intentos fallidos de verificación
  expira_en    DATETIME  NOT NULL,
  usado_en     DATETIME  NULL,
  created_at   DATETIME  NOT NULL DEFAULT (UTC_TIMESTAMP()),
  PRIMARY KEY (id),
  KEY idx_codigos_usuario (usuario_id),
  CONSTRAINT fk_codigos_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
) ENGINE=InnoDB;
