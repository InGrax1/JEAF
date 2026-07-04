# Changelog — Frontend JEAF (Panel Administrativo Web)

Todos los cambios notables del frontend se documentan en este archivo.
Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.1.0/).
Versionado alineado a las fases de desarrollo de la especificación JEAF v1.2.

---

## [No publicado]

### Pendiente
- Despliegue efectivo a Vercel (requiere cuenta — ver `docs/Despliegue.md`).

---

## [0.2.1] — 2026-07-04 — FASE 4: preparación para despliegue

### Agregado
- `vercel.json` con rewrites de SPA (todas las rutas sirven `index.html` para que React Router funcione en producción).
- Build del frontend integrado al pipeline de CI (GitHub Actions).

## [0.2.0] — 2026-07-04 — FASE 3: Cierres y Reportes

### Agregado
- **Página Reportes** (`/reportes`, visible para Tesorero y Auditor): selector de mes y botones de descarga del cierre mensual en PDF (formato formal para firma física) y Excel (cruce contable), con indicador de progreso y confirmación.
- **`apiDescargar`** en `src/lib/api.ts`: descarga autenticada de archivos binarios respetando el nombre sugerido por el servidor (`Content-Disposition`), con renovación de token ante expiración.
- Enlace "Reportes" en la barra lateral.

### Verificado
- Descarga del PDF desde el panel contra el backend real (200 OK) y build de producción sin errores.

## [0.1.0] — 2026-07-03 — FASE 2: Panel Administrativo Web

### Agregado
- **Proyecto React 18 + TypeScript + Vite 6 + Tailwind CSS 4** con tema verde institucional.
- **Autenticación JWT**: página de login, sesión persistida, renovación automática del access token con el refresh token ante expiración (una vez por petición) y cierre de sesión ante 401 definitivo (`src/lib/api.ts`).
- **RBAC en la UI** (la autoridad real es el backend):
  - Tesorero (super_admin): acceso total.
  - Auditor: solo Dashboard y Transacciones en modo lectura; rutas restringidas redirigen a `/`.
- **Dashboard financiero** (`/`): tarjetas de flujo de caja (balance total), ingresos/egresos del mes y resultado del año; gráfica de barras ingresos vs egresos de los últimos 12 meses; pays de desglose porcentual por categoría del mes (Recharts). Consume `GET /dashboard/resumen`.
- **Gestión de transacciones** (`/transacciones`): tabla del libro mayor con paginación (20 por página) y filtros por fecha, categoría, tipo, estado y conciliación; folio corto por registro; cancelación con motivo obligatorio (modal, solo Tesorero) y checkbox de "Conciliado en banco".
- **Categorías** (`/categorias`): crear, editar y activar/desactivar (soft delete); aviso de que el tipo no puede cambiar con histórico.
- **Usuarios** (`/usuarios`): alta con rol único, edición (incluye cambio de contraseña), activar/desactivar y baja lógica; protección contra la autoeliminación.
- **API Keys** (`/api-keys`): generación mostrando la key **una sola vez** (con botón copiar), listado con último uso y revocación con efecto inmediato.
- Formateo centralizado de moneda (es-MX) y fechas UTC → hora local del navegador (`src/lib/format.ts`).

### Verificado
- `npm run build` (typecheck TS + Vite) sin errores.
- Render del login, layout con navegación por rol y redirecciones RBAC comprobados en navegador.
