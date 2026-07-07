// Piezas de UI compartidas: modal, insignias, tarjetas y estados de carga.
// Estilo alineado a Apple HIG: tipografía SF Pro, radios concéntricos,
// objetivos táctiles de 44px, retroalimentación de presión y motion sutil.
import type { ReactNode } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 ${className}`}>{children}</div>
  );
}

export function Modal({
  titulo,
  abierto,
  onCerrar,
  children,
}: {
  titulo: string;
  abierto: boolean;
  onCerrar: () => void;
  children: ReactNode;
}) {
  if (!abierto) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onCerrar}>
      <div
        className="animate-modal-in w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Indicador tipo "hoja" (grabber), estilo Apple sheet */}
        <div className="mx-auto -mt-2 mb-3 h-1.5 w-9 rounded-full bg-gray-200" aria-hidden="true" />
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{titulo}</h3>
          <button
            onClick={onCerrar}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function BadgeTipo({ tipo }: { tipo: 'ingreso' | 'egreso' }) {
  return tipo === 'ingreso' ? (
    <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-800">⬆ Ingreso</span>
  ) : (
    <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-800">⬇ Egreso</span>
  );
}

export function BadgeEstado({ estado }: { estado: 'activa' | 'cancelada' }) {
  return estado === 'activa' ? (
    <span className="rounded-full bg-jeaf-100 px-2.5 py-1 text-xs font-medium text-jeaf-800">Activa</span>
  ) : (
    <span className="rounded-full bg-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 line-through">
      Cancelada
    </span>
  );
}

export function Cargando({ texto = 'Cargando…' }: { texto?: string }) {
  return <p className="py-8 text-center text-sm text-gray-500">{texto}</p>;
}

export function MensajeError({ mensaje }: { mensaje: string }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{mensaje}</div>
  );
}

// Input estilo Apple: relleno tenue en vez de borde visible, radio 12px,
// altura mínima de 44px (objetivo táctil) y anillo de foco en el acento de marca.
export const inputCls =
  'w-full min-h-11 rounded-xl bg-gray-50 px-3.5 py-2 text-sm text-gray-900 placeholder:text-gray-400 ' +
  'transition-shadow duration-150 focus:outline-none focus:ring-4 focus:ring-jeaf-500/20';

// Botón primario: forma de cápsula, 44px de alto, retroalimentación de presión (scale)
export const btnPrimario =
  'inline-flex min-h-11 items-center justify-center rounded-full bg-jeaf-600 px-5 text-sm font-semibold ' +
  'text-white shadow-sm transition-all duration-150 ease-out hover:bg-jeaf-700 active:scale-[0.98] ' +
  'disabled:opacity-50 disabled:active:scale-100';

// Botón secundario: misma cápsula, relleno tenue del acento (patrón HIG de "Secondary")
export const btnSecundario =
  'inline-flex min-h-11 items-center justify-center rounded-full bg-jeaf-50 px-5 text-sm font-semibold ' +
  'text-jeaf-700 transition-all duration-150 ease-out hover:bg-jeaf-100 active:scale-[0.98] ' +
  'disabled:opacity-50 disabled:active:scale-100';
