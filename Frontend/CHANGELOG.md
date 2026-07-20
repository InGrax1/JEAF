# Changelog — Frontend JEAF (Panel Administrativo Web)

Todos los cambios notables del frontend se documentan en este archivo.
Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.1.0/).
Versionado alineado a las fases de desarrollo de la especificación JEAF v1.2.

---

### Agregado
- **Proxy de Vite para pruebas desde el celular** (`vite.config.ts`): `/api` se reenvía a `http://localhost:3000` desde el propio proceso de Vite. Antes, al correr `npm run dev -- --host` y entrar desde el celular por la IP local, la app intentaba llamar a `http://localhost:3000` — que en el teléfono apunta a sí mismo, no a la PC — y fallaba. Con el proxy, el navegador del celular solo habla con la IP de Vite (mismo origen), así que tampoco hace falta tocar `CORS_ORIGINS` en el backend para probar en la red local. `VITE_API_URL` ahora es opcional en desarrollo (`src/lib/api.ts` cae a la ruta relativa `/api/v1`); en producción se sigue definiendo como la URL absoluta del backend.
- **Pantalla de espera del dashboard** (`components/PantallaCarga.tsx`, animada con [Motion](https://motion.dev)): mientras se obtienen los datos del backend ya no se ve un dashboard vacío. En móvil/PWA cubre toda la pantalla (prioridad al arranque de la app en iOS); en escritorio (≥1024px) solo cubre el área de contenido, dejando visible y usable la barra lateral que carga al instante. Isotipo con entrada de resorte + "respiración" en bucle, tres puntos rebotando en verde institucional y fade de salida (`AnimatePresence`) cuando llegan los datos; el contenido del dashboard entra con un deslizamiento suave. Respeta `prefers-reduced-motion` (Motion anima por JS, la regla CSS global de `index.css` no lo cubre).
- **Imágenes de arranque (splash) para iOS** (`public/splash/`, generadas desde el isotipo): iOS no lee `manifest.json` para decidir qué mostrar mientras la PWA instalada arranca — solo atiende a `<link rel="apple-touch-startup-image">` en `index.html`, uno por resolución física exacta de pantalla (9 tamaños, iPhone X en adelante). Sin esto, ese hueco se rellenaba con una pantalla negra lisa; el `<style>` inline que pinta `#f7f9fb` en `index.html` (agregado antes) ayuda una vez que el HTML empieza a cargar, pero no alcanza a cubrir el tramo previo, que controla el propio iOS.
- **Código dividido por ruta** (`App.tsx`, `React.lazy` + `Suspense`): el bundle principal pesaba ~770kB porque incluía Recharts (solo lo usa el Dashboard) y todas las páginas de una sola vez. Ahora baja a ~320kB y cada página se descarga bajo demanda — reduce el tiempo hasta el primer pintado, que es justo el motivo por el que el hueco en negro se notaba en el celular y no en PC (más CPU/red de sobra ahí).
- **PWA instalable, enfocada en iOS**: `vite-plugin-pwa` genera `manifest.webmanifest` y un service worker (Workbox) que solo precachea el "app shell" (JS/CSS del build) — las llamadas a la API financiera **nunca se cachean** (comportamiento por defecto sin `runtimeCaching`), para no arriesgar mostrar datos obsoletos en una app de finanzas.
- **Meta tags de iOS** en `index.html` (`apple-mobile-web-app-capable`, `apple-touch-icon`, `theme-color`, etc.): Safari ignora el manifest para el modo standalone, así que estos son obligatorios para que "Agregar a inicio" abra la app sin la barra de Safari.
- **Áreas seguras de iOS** (`Layout.tsx`): la barra superior móvil, la barra lateral y el contenido principal ahora suman `env(safe-area-inset-top/bottom)` a su padding, para no quedar tapados por el notch/Dynamic Island o el home indicator cuando la app corre en modo standalone.
- **Aviso "Instala JEAF en tu iPhone"** (`components/InstalarIOSBanner.tsx`): Safari no dispara el evento `beforeinstallprompt` que sí tienen Android/Chrome, así que se agregó un banner propio que detecta iOS (incluye iPadOS, que se identifica como Mac) y no está ya instalada, con las instrucciones manuales (Compartir → Agregar a inicio). Se cierra y no vuelve a aparecer (`localStorage`).
- **Logotipo oficial de la marca** (`docs/logo/`, provisto por el usuario): se incorporó en dos variantes, cada una para su función —
  - **Imagotipo** (`Imagotipo.svg`, icono + wordmark "JEAF"): reemplaza el círculo negro "J" + texto duplicado en `Layout.tsx` (barra lateral y barra superior móvil), `LoginPage.tsx` y `RecuperarPasswordPage.tsx`. Copiado a `src/assets/imagotipo.svg`.
  - **Isotipo** (`Isotipo.png`, solo el icono): reemplaza los iconos PWA generados como placeholder — `pwa-192x192.png`, `pwa-512x512.png`, `pwa-maskable-512x512.png` (recompuesto con margen ampliado para caber en la zona segura de recorte), `apple-touch-icon.png` y los favicons — todos en `public/`. Copiado a `src/assets/isotipo.png`.

### Corregido
- **Logotipo demasiado pequeño**: se aumentó su tamaño en la barra superior móvil (28px→36px), la barra lateral (32px→44px) y las pantallas de login/recuperar contraseña (48px→64px).
- **Favicon no se actualizaba en la pestaña**: los navegadores cachean el favicon de forma más agresiva que el resto de los assets (por origen, no por archivo), así que al reemplazar el ícono placeholder por el isotipo real la pestaña seguía mostrando el anterior. Se agregó un query param de versión (`?v=2`) a los `<link>` de favicon y `apple-touch-icon` en `index.html` para forzar la recarga.
- **Panel no responsivo en móvil**: la barra lateral (`Layout.tsx`) era fija de 280px sin colapsar, dejando menos de la mitad de la pantalla útil en dispositivos angostos. Ahora es un drawer deslizable en móvil/tablet (oculto por defecto, con barra superior y botón de menú) y vuelve a ser persistente en escritorio (`lg:` y superior, ≥1024px), tal como especifica el sistema de diseño oficial ("persistent left sidebar (280px)" solo para desktop — no hay pantalla móvil oficial en el proyecto de Stitch, así que el patrón de drawer es una implementación estándar propia). Márgenes de página también responsivos (16px móvil / 32px escritorio, spec del sistema de diseño).
- Corregido un bug real en el camino: dos clases de Tailwind (`-translate-x-full` y `translate-x-0`) compitiendo por la misma propiedad en el mismo elemento — el empate lo resuelve el orden de generación de Tailwind, no el orden en el HTML, así que la de "cerrado" siempre ganaba. Se resolvió moviendo la posición a un estilo inline controlado por React, con el override de escritorio en un `@media` clásico en `index.css` (evitando además la sintaxis de CSS anidado de Tailwind v4 para `lg:!` + media, que un motor de navegador de esta sesión no evaluaba correctamente).

### Cambiado
- **Rediseño visual completo alineado al sistema de diseño oficial en Stitch** ("JEAF Financial System"): tokens de color (`primary` negro institucional, `secondary` verde esmeralda, `error` carmesí, escala de superficies `surface-container-*`), tipografía Inter con escala `display`/`headline-lg`/`headline-md`/`body-lg`/`body-md`/`label-md`/`stats-lg`, radios de 8-12px (no cápsula) y sombra ambiental difusa — todo definido en `index.css` vía `@theme` de Tailwind 4.
- **Componentes compartidos** (`src/components/ui.tsx`): `Card`, `Modal`, badges, `inputCls`, `btnPrimario`/`btnSecundario` reescritos sobre los nuevos tokens; se agrega `btnPeligro` para acciones destructivas (cancelar transacción, revocar, eliminar).
- **Barra lateral** (`Layout.tsx`): iconografía Material Symbols, resaltado de ítem activo en verde (`secondary-container`), footer con usuario/rol y cierre de sesión.
- Reestilizadas todas las páginas (Dashboard, Transacciones, Reportes, Categorías, Usuarios, API Keys, Login, Recuperar contraseña) sobre los componentes compartidos, sin tocar lógica de negocio ni llamadas a la API.
- Se agregó la fuente Inter y Material Symbols Outlined vía Google Fonts en `index.html`.

### Pendiente
- Despliegue efectivo a Vercel (requiere cuenta — ver `docs/Despliegue.md`).

---

## [0.2.4] — 2026-07-10 — Recuperación de contraseña

### Agregado
- **Página `/recuperar-password`** (pública, sin sesión): flujo en 2 pasos — solicitar código por correo, luego verificarlo junto con la nueva contraseña (con confirmación). Mensaje genérico consistente con el backend (no revela si el correo existe).
- Enlace "¿Olvidaste tu contraseña?" en la pantalla de login.

### Verificado
- Flujo completo probado en navegador contra el backend real: solicitud de código, verificación, redirección a login y acceso exitoso con la nueva contraseña.

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
