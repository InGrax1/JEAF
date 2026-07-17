// Aviso para instalar la PWA en iOS. Safari no dispara el evento nativo
// `beforeinstallprompt` (solo Android/Chrome lo tienen), así que en iOS es
// necesario indicarle al usuario los pasos manuales: compartir → agregar a
// inicio. Se oculta solo (localStorage) y no vuelve a aparecer si ya está
// instalada (modo standalone) o si el usuario la cerró antes.
import { useEffect, useState } from 'react';

const CLAVE_OCULTO = 'jeaf_instalar_ios_oculto';

function esIOS(): boolean {
  const ua = window.navigator.userAgent;
  const esDispositivoIOS = /iPad|iPhone|iPod/.test(ua);
  // iPadOS 13+ se identifica como "MacIntel" pero con soporte táctil
  const esIPadOSComoMac = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return esDispositivoIOS || esIPadOSComoMac;
}

function enModoStandalone(): boolean {
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
}

export default function InstalarIOSBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const yaOculto = localStorage.getItem(CLAVE_OCULTO) === '1';
    setVisible(esIOS() && !enModoStandalone() && !yaOculto);
  }, []);

  if (!visible) return null;

  function cerrar() {
    localStorage.setItem(CLAVE_OCULTO, '1');
    setVisible(false);
  }

  return (
    <div
      className="ambient-shadow fixed inset-x-4 z-50 flex items-start gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-4"
      style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
      role="status"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary">
        <span className="material-symbols-outlined text-[20px]">ios_share</span>
      </div>
      <div className="flex-1 text-sm text-on-surface">
        <p className="font-semibold">Instala JEAF en tu iPhone</p>
        <p className="mt-0.5 text-on-surface-variant">
          Toca <strong>Compartir</strong> y luego <strong>Agregar a inicio</strong> para abrirla como una app.
        </p>
      </div>
      <button
        onClick={cerrar}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
        aria-label="Cerrar aviso"
      >
        <span className="material-symbols-outlined text-[18px]">close</span>
      </button>
    </div>
  );
}
