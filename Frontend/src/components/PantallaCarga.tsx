// Pantalla de espera mientras se obtienen los datos del backend (Motion).
// Prioridad móvil: en el arranque de la PWA de iOS cubre toda la pantalla
// (evita el dashboard vacío tras el splash del sistema); en escritorio (lg+)
// la barra lateral ya carga al instante, así que solo cubre el área de
// contenido (deja los 280px de la barra visibles y usables).
// El padre debe envolverla en <AnimatePresence> para que el fade de salida
// se reproduzca al desmontarla cuando lleguen los datos.
import { motion, useReducedMotion } from 'motion/react';
import isotipo from '../assets/isotipo.png';

export default function PantallaCarga({ texto = 'Cargando información…' }: { texto?: string }) {
  // Coherente con la regla global de prefers-reduced-motion de index.css:
  // esa regla solo cubre animaciones CSS, Motion anima por JS/WAAPI y
  // necesita respetar la preferencia por su propia vía.
  const sinMovimiento = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.35, ease: 'easeOut' } }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-background lg:left-[280px]"
      role="status"
      aria-label={texto}
    >
      {/* Entrada con resorte; el hijo hace la "respiración" en bucle para no
          mezclar keyframes de entrada y de loop en una sola animación. */}
      <motion.div
        initial={sinMovimiento ? false : { scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      >
        <motion.img
          src={isotipo}
          alt=""
          className="ambient-shadow h-24 w-24 rounded-3xl border border-outline-variant"
          animate={sinMovimiento ? undefined : { scale: [1, 1.05, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.div>

      <div className="flex items-center gap-1.5" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-2 w-2 rounded-full bg-secondary"
            animate={sinMovimiento ? undefined : { y: [0, -6, 0], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
          />
        ))}
      </div>

      <p className="text-label-md uppercase text-on-surface-variant">{texto}</p>
    </motion.div>
  );
}
