// Inicio de sesión del panel (JWT). Tras 5 intentos fallidos por IP el
// backend aplica rate limiting de 15 minutos.
import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../lib/api';
import { MensajeError, inputCls, btnPrimario } from '../components/ui';

export default function LoginPage() {
  const { usuario, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  if (usuario) return <Navigate to="/" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error inesperado');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary-container p-4">
      <div className="animate-modal-in ambient-shadow w-full max-w-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-8">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-on-primary">
          J
        </div>
        <h1 className="text-center text-headline-lg text-on-surface">JEAF</h1>
        <p className="mb-6 text-center text-label-md text-on-surface-variant">Panel Administrativo</p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-on-surface">Correo electrónico</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputCls}
              autoComplete="username"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-on-surface">Contraseña</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputCls}
              autoComplete="current-password"
            />
          </div>
          {error && <MensajeError mensaje={error} />}
          <button type="submit" disabled={enviando} className={`${btnPrimario} w-full`}>
            {enviando ? 'Entrando…' : 'Iniciar sesión'}
          </button>
          <Link to="/recuperar-password" className="block text-center text-sm text-primary hover:underline">
            ¿Olvidaste tu contraseña?
          </Link>
        </form>
      </div>
    </div>
  );
}
