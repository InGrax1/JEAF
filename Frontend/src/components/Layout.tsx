// Estructura del panel: barra lateral de navegación (filtrada por rol) + contenido.
// Responsivo: en escritorio (lg+) la barra es fija de 280px, tal como especifica
// el sistema de diseño oficial; en móvil/tablet se convierte en un drawer
// deslizable con una barra superior y botón de menú.
import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ETIQUETA_ROL: Record<string, string> = {
  super_admin: 'Tesorero',
  auditor: 'Auditor',
  capturista: 'Capturista',
};

export default function Layout() {
  const { usuario, logout } = useAuth();
  const [menuAbierto, setMenuAbierto] = useState(false);
  if (!usuario) return null;

  const esAdmin = usuario.rol === 'super_admin';

  const enlaces = [
    { a: '/', texto: 'Dashboard', icono: 'dashboard', visible: true },
    { a: '/transacciones', texto: 'Transacciones', icono: 'receipt_long', visible: true },
    { a: '/reportes', texto: 'Reportes', icono: 'description', visible: true },
    { a: '/categorias', texto: 'Categorías', icono: 'category', visible: esAdmin },
    { a: '/usuarios', texto: 'Usuarios', icono: 'group', visible: esAdmin },
    { a: '/api-keys', texto: 'API Keys', icono: 'vpn_key', visible: esAdmin },
  ].filter((e) => e.visible);

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Barra superior — solo móvil/tablet. pt- extra: respeta el notch/Dynamic
          Island cuando la app corre en modo standalone en iOS (env() vale 0 en
          navegador normal, así que no afecta ahí). */}
      <header className="flex items-center justify-between border-b border-outline-variant bg-surface-container-lowest px-4 pb-3 pt-[calc(0.75rem_+_env(safe-area-inset-top))] lg:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-on-primary">
            J
          </div>
          <h1 className="text-headline-md font-black text-primary">JEAF</h1>
        </div>
        <button
          onClick={() => setMenuAbierto(true)}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container"
          aria-label="Abrir menú"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
      </header>

      {/* Fondo oscuro al abrir el drawer en móvil */}
      {menuAbierto && (
        <div
          className="fixed inset-0 z-30 bg-on-background/40 lg:hidden"
          onClick={() => setMenuAbierto(false)}
          aria-hidden="true"
        />
      )}

      <aside
        // Posición móvil vía estilo inline (transform), y en escritorio la clase
        // .sidebar-desktop-visible (definida en index.css con @media clásico) la
        // fuerza siempre visible — ver esa regla para el motivo de no usar lg:!transform-none.
        style={{ transform: menuAbierto ? 'translateX(0)' : 'translateX(-100%)' }}
        // pt-/pb- separados (en vez de p-4) para poder sumarles el área segura
        // de iOS arriba (notch) y abajo (home indicator) sin pisar el padding
        // horizontal — ver Layout.tsx del header para el mismo patrón.
        className="sidebar-desktop-visible fixed inset-y-0 left-0 z-40 flex w-[280px] shrink-0 flex-col border-r border-outline-variant bg-surface-container-lowest px-4 pt-[calc(1rem_+_env(safe-area-inset-top))] pb-[calc(1rem_+_env(safe-area-inset-bottom))] transition-transform duration-300 ease-out lg:sticky lg:top-0 lg:z-auto lg:h-screen"
      >
        <div className="mb-6 flex items-center justify-between gap-3 px-2 py-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-on-primary">
              J
            </div>
            <div>
              <h1 className="text-headline-md font-black text-primary">JEAF</h1>
              <p className="text-label-md text-on-surface-variant">Gestión financiera</p>
            </div>
          </div>
          <button
            onClick={() => setMenuAbierto(false)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container lg:hidden"
            aria-label="Cerrar menú"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {enlaces.map((e) => (
            <NavLink
              key={e.a}
              to={e.a}
              end={e.a === '/'}
              onClick={() => setMenuAbierto(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm transition-all duration-150 ${
                  isActive
                    ? 'scale-[0.98] bg-secondary-container font-semibold text-on-secondary-container'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`
              }
            >
              <span className="material-symbols-outlined">{e.icono}</span>
              {e.texto}
            </NavLink>
          ))}
        </nav>
        <div className="flex flex-col gap-1 border-t border-outline-variant pt-3">
          <div className="px-3.5 py-2 text-sm">
            <p className="font-semibold text-on-surface">{usuario.nombre}</p>
            <p className="text-label-md text-on-surface-variant">{ETIQUETA_ROL[usuario.rol] ?? usuario.rol}</p>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-left text-sm text-on-surface-variant transition-all duration-150 hover:bg-surface-container hover:text-on-surface"
          >
            <span className="material-symbols-outlined">logout</span>
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Márgenes de página: 16px móvil, 32px desktop (spec del sistema de diseño).
          pb- extra en móvil: home indicator de iOS en modo standalone. */}
      <main className="flex-1 overflow-x-auto p-4 pb-[calc(1rem_+_env(safe-area-inset-bottom))] lg:p-8">
        <Outlet />
      </main>
    </div>
  );
}
