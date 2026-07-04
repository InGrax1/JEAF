# JEAF — Diagrama Entidad-Relación

Mapa relacional de la base de datos (spec 9.1). Renderizable en GitHub/VS Code (Mermaid).

```mermaid
erDiagram
    roles ||--o{ usuarios : "1:N (rol_id)"
    usuarios ||--o{ transacciones : "1:N captura"
    usuarios ||--o{ api_keys : "1:N credenciales"
    usuarios ||--o{ logs_auditoria : "1:N acciones"
    categorias ||--o{ transacciones : "1:N clasifica"

    roles {
        char36 id PK
        varchar nombre UK "super_admin | auditor | capturista"
        varchar descripcion
        datetime created_at "UTC"
    }

    usuarios {
        char36 id PK
        varchar nombre
        varchar email UK
        varchar password_hash "Bcrypt salt 12"
        char36 rol_id FK
        tinyint activo
        datetime created_at "UTC"
        datetime updated_at
        datetime deleted_at "soft delete"
    }

    categorias {
        char36 id PK
        varchar nombre UK
        enum tipo "ingreso | egreso"
        tinyint activo "soft delete sin tocar historico"
        datetime created_at
        datetime updated_at
        datetime deleted_at
    }

    transacciones {
        char36 id PK
        enum tipo "ingreso | egreso"
        decimal12_2 monto "CHECK monto > 0"
        char36 categoria_id FK
        char36 usuario_id FK "quien capturo"
        varchar notas
        enum estado "activa | cancelada"
        varchar motivo_cancelacion "obligatorio al cancelar"
        char36 cancelada_por FK
        tinyint conciliada "conciliado en banco"
        datetime conciliada_at
        varchar idempotency_key UK "generada por el Atajo iOS"
        enum origen "ios_shortcut | panel_web"
        datetime fecha_transaccion "UTC"
        datetime created_at
        datetime updated_at
        datetime deleted_at "solo via cancelacion, nunca DELETE"
    }

    logs_auditoria {
        char36 id PK
        varchar tabla "polimorfico"
        char36 registro_id
        enum accion "INSERT | UPDATE | CANCEL"
        json estado_anterior
        json estado_nuevo
        char36 usuario_id
        varchar ip_address "IPv4/IPv6"
        datetime created_at "retencion minima 1 anio"
    }

    api_keys {
        char36 id PK
        char36 usuario_id FK
        varchar etiqueta "ej. iPhone de Juan"
        char8 key_prefix "visible en panel"
        char64 key_hash UK "SHA-256, nunca texto plano"
        datetime created_at
        datetime last_used_at "detecta keys inactivas"
        datetime revoked_at "revocacion inmediata"
    }
```

## Reglas estructurales

- **IDs**: UUID `CHAR(36)` en todas las tablas (evita predicción de registros).
- **Dinero**: `DECIMAL(12,2)` — nunca flotantes.
- **Fechas**: `DATETIME` en UTC; la conversión a hora local se centraliza en el backend.
- **Inmutabilidad**: prohibido `DELETE` físico en `transacciones`; `logs_auditoria` es solo-inserción.
- **`logs_auditoria` es polimórfica**: no tiene FK a la tabla auditada; referencia por (`tabla`, `registro_id`).
