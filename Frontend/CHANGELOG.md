# Changelog — Frontend JEAF (Panel Administrativo Web)

Todos los cambios notables del frontend se documentan en este archivo.
Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.1.0/).
Versionado alineado a las fases de desarrollo de la especificación JEAF v1.2.

---

## [No publicado]

### Pendiente
- Despliegue efectivo a Vercel (requiere cuenta — ver `docs/Despliegue.md`).

---

## [0.2.2] — 2026-07-06 — Rediseño Apple HIG

### Cambiado
- **Tipografía**: pila del sistema SF Pro (`-apple-system, BlinkMacSystemFont, 'SF Pro Text/Display'...`) aplicada globalmente vía `--font-sans` en `index.css` — no requiere tocar cada página.
- **Escala de grises remapeada** a los grises exactos de Apple (`systemGray6`…`systemGray`) sobre el propio namespace `gray-*` de Tailwind, por lo que se propaga automáticamente a todas las páginas que ya usan `bg-gray-*`/`text-gray-*`/`border-gray-*`.
- **Componentes compartidos** (`src/components/ui.tsx`, usados por todas las páginas):
  - `Card`: radio 16px (`rounded-2xl`) con anillo sutil, en vez de esquinas cuadradas.
  - `Modal`: radio 24px, indicador tipo "hoja" (grabber) arriba, entrada animada (`animate-modal-in`, curva de resorte).
  - Inputs (`inputCls`): relleno tenue en vez de borde visible, altura mínima 44px (objetivo táctil), anillo de foco en el acento de marca.
  - Botones (`btnPrimario`/`btnSecundario`): forma de cápsula, 44px de alto, retroalimentación de presión (`active:scale-[0.98]`).
  - Insignias: más padding, proporciones de cápsula más fieles a HIG.
- **Barra lateral** (`Layout.tsx`): ítems de navegación con radio 12px y transición de color; botón de cierre de sesión en cápsula.
- Accesibilidad: `prefers-reduced-motion` respetado globalmente; anillo de foco visible consistente (`:focus-visible`) en vez de solo el default del navegador.
- Instalada la skill de terceros `apple-hig-designer` (alcance de proyecto, revisada antes de usarse — sin código ejecutable, solo referencia de diseño) como base de estos cambios.

### Verificado
- `npm run build` sin errores; recorrido visual en navegador (login, dashboard, transacciones, modal de cancelación) contra el backend real — sin errores de consola.

---

## [0.2.3] — 2026-07-07 — Paleta de color más vívida

### Cambiado
- **Verde institucional (`jeaf-*`)**: recalibrado a un esmeralda más saturado y vívido (`#0ea972`/`#08875b` como tonos principales) manteniendo el mismo matiz del acento del documento de especificación original, en vez del verde bosque apagado anterior. Cambio hecho en el token central de `index.css`, por lo que se propaga automáticamente a botones, barra lateral, insignias y anillo de foco sin tocar cada página.
- Colores de las gráficas del dashboard (`DashboardPage.tsx`, Recharts no lee variables CSS) actualizados a juego con la nueva paleta.

### Verificado
- `npm run build` sin errores; contraste de texto blanco sobre el nuevo verde confirmado en navegador (`rgb(8,135,91)`); gráficas de barras y dona revisadas visualmente.

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
