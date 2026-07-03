# JEAF — Plataforma de Gestión Financiera y Contable para Iglesias

Sistema transaccional interno single-tenant para automatizar el registro, control y auditoría de ingresos (ofrendas, diezmos, donaciones) y gastos. Basado en la especificación **JEAF v1.2** ([docs/JEAF_Especificacion_v1_2.docx](docs/JEAF_Especificacion_v1_2.docx)).

## Arquitectura

| Capa | Tecnología |
|------|-----------|
| Captura móvil | Atajos de iOS (HTTP POST + API Key) |
| Panel web | React + TypeScript + Vite + Tailwind CSS |
| Backend | Node.js + Express.js (Clean Architecture) |
| Base de datos | MySQL 8 (ACID, `DECIMAL(12,2)`, UUIDs, UTC) |
| Auth | JWT (panel web) + API Keys hasheadas (Atajos iOS) |

## Estructura del repositorio

```
JEAF/
├── Backend/    → API REST (ver Backend/CHANGELOG.md)
├── Frontend/   → Panel administrativo SPA (ver Frontend/CHANGELOG.md) — inicia en FASE 2
└── docs/       → Especificación del proyecto
```

## Fases de desarrollo

| Fase | Nombre | Estado |
|------|--------|--------|
| FASE 0 | Arquitectura y Base de Datos | ✅ Completada |
| FASE 1 | Motor de Transacciones e iOS | ⏳ Pendiente |
| FASE 2 | Panel Administrativo Web | ⏳ Pendiente |
| FASE 3 | Cierres y Reportes Legales | ⏳ Pendiente |
| FASE 4 | QA, Despliegue y Producción | ⏳ Pendiente |

## Backend — arranque rápido

```bash
cd Backend
npm install
cp .env.example .env       # completar credenciales MySQL y secretos JWT
# Crear la base de datos y aplicar esquema + seed:
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql
npm run dev
```

La API queda disponible en `http://localhost:3000/api/v1` (health check: `GET /api/v1/health`).
