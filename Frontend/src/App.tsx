import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import InstalarIOSBanner from './components/InstalarIOSBanner';
import PantallaCarga from './components/PantallaCarga';
import type { Rol } from './lib/types';
import type { ReactElement } from 'react';

// Páginas cargadas bajo demanda (una por ruta) en vez de un solo bundle: el
// principal pesaba ~770kB porque arrastraba Recharts (solo lo usa el
// Dashboard) y todas las páginas aunque no se visiten. En móvil esa descarga
// + parseo es justo el hueco que se nota como pantalla en negro/vacía al
// arrancar la PWA — en escritorio pasa desapercibido por tener más CPU/red.
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RecuperarPasswordPage = lazy(() => import('./pages/RecuperarPasswordPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const TransaccionesPage = lazy(() => import('./pages/TransaccionesPage'));
const ReportesPage = lazy(() => import('./pages/ReportesPage'));
const CategoriasPage = lazy(() => import('./pages/CategoriasPage'));
const UsuariosPage = lazy(() => import('./pages/UsuariosPage'));
const ApiKeysPage = lazy(() => import('./pages/ApiKeysPage'));

// Protege una ruta: exige sesión y, opcionalmente, roles concretos (RBAC en UI;
// la autoridad real siempre es el backend).
function Protegida({ children, roles }: { children: ReactElement; roles?: Rol[] }) {
  const { usuario } = useAuth();
  if (!usuario) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(usuario.rol)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <>
      <InstalarIOSBanner />
      <Suspense fallback={<PantallaCarga texto="Cargando…" />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/recuperar-password" element={<RecuperarPasswordPage />} />
          <Route
            element={
              <Protegida>
                <Layout />
              </Protegida>
            }
          >
            <Route path="/" element={<DashboardPage />} />
            <Route path="/transacciones" element={<TransaccionesPage />} />
            <Route path="/reportes" element={<ReportesPage />} />
            <Route
              path="/categorias"
              element={
                <Protegida roles={['super_admin']}>
                  <CategoriasPage />
                </Protegida>
              }
            />
            <Route
              path="/usuarios"
              element={
                <Protegida roles={['super_admin']}>
                  <UsuariosPage />
                </Protegida>
              }
            />
            <Route
              path="/api-keys"
              element={
                <Protegida roles={['super_admin']}>
                  <ApiKeysPage />
                </Protegida>
              }
            />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}
