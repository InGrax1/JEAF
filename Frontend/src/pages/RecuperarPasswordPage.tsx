// Recuperación de contraseña en 2 pasos: solicitar código por correo,
// luego verificarlo y establecer la nueva contraseña. El backend responde
// siempre el mismo mensaje genérico en el paso 1 (no revela si el correo existe).
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import { MensajeError, inputCls, btnPrimario, btnSecundario } from '../components/ui';
import imagotipo from '../assets/imagotipo.png';

export default function RecuperarPasswordPage() {
  const navigate = useNavigate();
  const [paso, setPaso] = useState<'solicitar' | 'restablecer'>('solicitar');
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [password, setPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function onSolicitar(e: FormEvent) {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      const data = await api<{ mensaje: string }>('/auth/olvide-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setMensaje(data.mensaje);
      setPaso('restablecer');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error inesperado');
    } finally {
      setEnviando(false);
    }
  }

  async function onRestablecer(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirmar) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setEnviando(true);
    try {
      const data = await api<{ mensaje: string }>('/auth/restablecer-password', {
        method: 'POST',
        body: JSON.stringify({ email, codigo, password }),
      });
      setMensaje(data.mensaje);
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error inesperado');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary-container p-4">
      <div className="animate-modal-in ambient-shadow w-full max-w-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-8">
        <img src={imagotipo} alt="JEAF" className="mx-auto mb-4 h-16 w-auto" />
        <p className="mb-6 text-center text-label-md text-on-surface-variant">
          {paso === 'solicitar' ? 'Recuperar contraseña' : 'Verificar código'}
        </p>

        {paso === 'solicitar' ? (
          <form onSubmit={onSolicitar} className="space-y-4">
            <p className="text-sm text-on-surface-variant">
              Escribe tu correo electrónico. Si existe una cuenta asociada, te enviaremos un código de
              verificación de 6 dígitos válido por 15 minutos.
            </p>
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
            {error && <MensajeError mensaje={error} />}
            <button type="submit" disabled={enviando} className={`${btnPrimario} w-full`}>
              {enviando ? 'Enviando…' : 'Enviar código'}
            </button>
            <Link to="/login" className="block text-center text-sm text-primary hover:underline">
              Volver a iniciar sesión
            </Link>
          </form>
        ) : (
          <form onSubmit={onRestablecer} className="space-y-4">
            {mensaje && (
              <p className="rounded-lg border border-secondary/30 bg-secondary-container/30 px-4 py-2.5 text-sm text-on-secondary-container">
                {mensaje}
              </p>
            )}
            <div>
              <label className="mb-1 block text-sm font-medium text-on-surface">Código de verificación</label>
              <input
                type="text"
                required
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className={`${inputCls} text-center text-lg tracking-[0.3em]`}
                placeholder="000000"
                autoComplete="one-time-code"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Nueva contraseña</label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputCls}
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Confirmar contraseña</label>
              <input
                type="password"
                required
                minLength={8}
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                className={inputCls}
                autoComplete="new-password"
              />
            </div>
            {error && <MensajeError mensaje={error} />}
            <button type="submit" disabled={enviando} className={`${btnPrimario} w-full`}>
              {enviando ? 'Guardando…' : 'Restablecer contraseña'}
            </button>
            <button
              type="button"
              className={`${btnSecundario} w-full`}
              onClick={() => {
                setPaso('solicitar');
                setError('');
                setMensaje('');
              }}
            >
              Solicitar otro código
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
