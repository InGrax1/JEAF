import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import TransaccionesPage from './pages/TransaccionesPage';
import CategoriasPage from './pages/CategoriasPage';
import UsuariosPage from './pages/UsuariosPage';
import ApiKeysPage from './pages/ApiKeysPage';
import type { Rol } from './lib/types';
import type { ReactElement } from 'react';

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
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <Protegida>
            <Layout />
          </Protegida>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/transacciones" element={<TransaccionesPage />} />
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
  );
}
