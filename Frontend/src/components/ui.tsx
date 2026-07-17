// Piezas de UI compartidas: modal, insignias, tarjetas y estados de carga.
// Estilo alineado al sistema de diseño oficial (Stitch — "JEAF Financial
// System"): tipografía Inter, superficies con borde + sombra ambiental,
// radios de 8-12px (no cápsula), acentos primary/secondary/error.
import type { ReactNode } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`ambient-shadow rounded-xl border border-outline-variant bg-surface-container-lowest p-5 ${className}`}
    >
      {children}
    </div>
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-on-background/20 p-4 backdrop-blur-sm"
      onClick={onCerrar}
    >
      <div
        className="animate-modal-in w-full max-w-md rounded-xl border border-outline-variant bg-surface-container-lowest shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-outline-variant px-6 py-4">
          <h3 className="text-headline-md text-on-surface">{titulo}</h3>
          <button
            onClick={onCerrar}
            className="flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export function BadgeTipo({ tipo }: { tipo: 'ingreso' | 'egreso' }) {
  return tipo === 'ingreso' ? (
    <span className="rounded-full bg-secondary-container/30 px-2.5 py-1 text-xs font-semibold text-secondary">
      ⬆ Ingreso
    </span>
  ) : (
    <span className="rounded-full bg-error-container/60 px-2.5 py-1 text-xs font-semibold text-error">
      ⬇ Egreso
    </span>
  );
}

export function BadgeEstado({ estado }: { estado: 'activa' | 'cancelada' }) {
  return estado === 'activa' ? (
    <span className="rounded-full bg-secondary-container/30 px-2.5 py-1 text-xs font-semibold text-secondary">
      Activa
    </span>
  ) : (
    <span className="rounded-full bg-error-container/60 px-2.5 py-1 text-xs font-semibold text-error line-through">
      Cancelada
    </span>
  );
}

export function Cargando({ texto = 'Cargando…' }: { texto?: string }) {
  return <p className="py-8 text-center text-sm text-on-surface-variant">{texto}</p>;
}

export function MensajeError({ mensaje }: { mensaje: string }) {
  return (
    <div className="rounded-lg border border-error/30 bg-error-container/60 px-4 py-2.5 text-sm text-on-error-container">
      {mensaje}
    </div>
  );
}

// Input: relleno de superficie, borde sutil, radio 8px, altura mínima de
// 44px (objetivo táctil) y anillo de foco en negro institucional (primary).
export const inputCls =
  'w-full min-h-11 rounded-lg border border-outline-variant bg-surface px-3.5 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/60 ' +
  'transition-shadow duration-150 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary';

// Botón primario: negro institucional sólido, radio 8px, retroalimentación de presión (scale)
export const btnPrimario =
  'inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold ' +
  'text-on-primary shadow-sm transition-all duration-150 ease-out hover:opacity-90 active:scale-[0.98] ' +
  'disabled:opacity-50 disabled:active:scale-100';

// Botón secundario: contorno en negro institucional, fondo transparente (patrón "Secondary" del sistema)
export const btnSecundario =
  'inline-flex min-h-11 items-center justify-center rounded-lg border border-primary px-5 text-sm font-semibold ' +
  'text-primary transition-all duration-150 ease-out hover:bg-surface-container-low active:scale-[0.98] ' +
  'disabled:opacity-50 disabled:active:scale-100';

// Botón de acción destructiva (cancelar transacción, revocar, eliminar)
export const btnPeligro =
  'inline-flex min-h-11 items-center justify-center rounded-lg bg-error px-5 text-sm font-semibold ' +
  'text-on-error transition-all duration-150 ease-out hover:opacity-90 active:scale-[0.98] ' +
  'disabled:opacity-50 disabled:active:scale-100';
