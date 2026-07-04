// Estructura del panel: barra lateral de navegación (filtrada por rol) + contenido.
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ETIQUETA_ROL: Record<string, string> = {
  super_admin: 'Tesorero',
  auditor: 'Auditor',
  capturista: 'Capturista',
};

export default function Layout() {
  const { usuario, logout } = useAuth();
  if (!usuario) return null;

  const esAdmin = usuario.rol === 'super_admin';

  const enlaces = [
    { a: '/', texto: 'Dashboard', visible: true },
    { a: '/transacciones', texto: 'Transacciones', visible: true },
    { a: '/reportes', texto: 'Reportes', visible: true },
    { a: '/categorias', texto: 'Categorías', visible: esAdmin },
    { a: '/usuarios', texto: 'Usuarios', visible: esAdmin },
    { a: '/api-keys', texto: 'API Keys', visible: esAdmin },
  ].filter((e) => e.visible);

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 flex-col bg-jeaf-800 text-white">
        <div className="border-b border-jeaf-700 px-5 py-4">
          <h1 className="text-xl font-bold tracking-wide">JEAF</h1>
          <p className="text-xs text-jeaf-100/70">Gestión financiera</p>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {enlaces.map((e) => (
            <NavLink
              key={e.a}
              to={e.a}
              end={e.a === '/'}
              className={({ isActive }) =>
                `block rounded px-3 py-2 text-sm transition ${
                  isActive ? 'bg-jeaf-600 font-semibold' : 'text-jeaf-100/80 hover:bg-jeaf-700'
                }`
              }
            >
              {e.texto}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-jeaf-700 px-5 py-4 text-sm">
          <p className="font-medium">{usuario.nombre}</p>
          <p className="mb-2 text-xs text-jeaf-100/70">{ETIQUETA_ROL[usuario.rol] ?? usuario.rol}</p>
          <button
            onClick={logout}
            className="w-full rounded bg-jeaf-700 px-3 py-1.5 text-xs hover:bg-jeaf-600"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-x-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
