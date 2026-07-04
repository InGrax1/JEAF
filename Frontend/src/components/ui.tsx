// Piezas de UI compartidas: modal, insignias, tarjetas y estados de carga.
import type { ReactNode } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-lg bg-white p-5 shadow-sm ${className}`}>{children}</div>;
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
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{titulo}</h3>
          <button onClick={onCerrar} className="text-gray-400 hover:text-gray-600" aria-label="Cerrar">
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
    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">⬆ Ingreso</span>
  ) : (
    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">⬇ Egreso</span>
  );
}

export function BadgeEstado({ estado }: { estado: 'activa' | 'cancelada' }) {
  return estado === 'activa' ? (
    <span className="rounded-full bg-jeaf-100 px-2 py-0.5 text-xs font-medium text-jeaf-800">Activa</span>
  ) : (
    <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600 line-through">
      Cancelada
    </span>
  );
}

export function Cargando({ texto = 'Cargando…' }: { texto?: string }) {
  return <p className="py-8 text-center text-sm text-gray-500">{texto}</p>;
}

export function MensajeError({ mensaje }: { mensaje: string }) {
  return <div className="rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{mensaje}</div>;
}

export const inputCls =
  'w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-jeaf-500 focus:outline-none focus:ring-1 focus:ring-jeaf-500';

export const btnPrimario =
  'rounded bg-jeaf-600 px-4 py-2 text-sm font-medium text-white hover:bg-jeaf-700 disabled:opacity-50';

export const btnSecundario =
  'rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50';
