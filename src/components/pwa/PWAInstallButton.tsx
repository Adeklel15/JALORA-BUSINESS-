/**
 * JALORA — PWA Install Button Component
 * Easily mountable in Header, Sidebar, and Settings.
 * Triggers native prompt or opens guided installation modal.
 * 
 * Created by Abdul Jalil
 */

import React, { useState } from 'react';
import { Download, Smartphone, CheckCircle2 } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { PWAInstallModal } from './PWAInstallModal';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'header' | 'sidebar' | 'settings' | 'compact';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'header'
}) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);

  const handleClick = async () => {
    if (isInstallable) {
      try {
        const success = await install();
        if (!success) {
          setShowModal(true);
        }
      } catch {
        setShowModal(true);
      }
    } else {
      setShowModal(true);
    }
  };

  // If installed, show standalone badge in settings, but still allow opening guide
  if (isInstalled && variant === 'settings') {
    return (
      <div className="flex items-center justify-between gap-3 p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-800">
        <div className="flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <span className="font-bold">Aplikasi JALORA Terpasang (Mode Standalone)</span>
            <p className="text-[11px] text-emerald-700">Aplikasi sedang berjalan optimal sebagai PWA di perangkat ini.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold shrink-0 cursor-pointer"
        >
          Panduan PWA
        </button>
        <PWAInstallModal isOpen={showModal} onClose={() => setShowModal(false)} />
      </div>
    );
  }

  // Variant: Settings Full Card
  if (variant === 'settings') {
    return (
      <>
        <div className="p-4 bg-[#F5F0E5]/40 rounded-2xl border border-[#DCE5D6] space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#294D35] text-white flex items-center justify-center p-2 shadow-xs shrink-0">
                <img
                  src="/assets/aistudio/Logo_Aplikasi_Jalora_Hijau_Modern_d93205db.png"
                  alt="JALORA Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h4 className="font-bold text-sm text-[#294D35]">Unduh Aplikasi JALORA</h4>
                <p className="text-xs text-stone-600 mt-0.5">
                  JALORA berbasis Progressive Web App (PWA) sehingga dapat langsung diinstall ke layar utama HP tanpa melalui Play Store / App Store.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClick}
              className="px-4 py-2.5 bg-[#294D35] hover:bg-[#1e3827] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs shrink-0"
            >
              <Download className="w-4 h-4 text-[#D6BD7A]" />
              <span>Unduh Aplikasi</span>
            </button>
          </div>
        </div>

        <PWAInstallModal isOpen={showModal} onClose={() => setShowModal(false)} />
      </>
    );
  }

  // Variant: Sidebar Card (Matches reference card in user's image)
  if (variant === 'sidebar') {
    return (
      <>
        <button
          type="button"
          onClick={handleClick}
          className={`w-full flex items-center justify-between gap-2.5 p-2.5 sm:p-3 bg-white hover:bg-[#F5F0E5]/60 text-[#294D35] rounded-2xl border border-[#DCE5D6] text-xs font-bold transition-all cursor-pointer shadow-xs group ${className}`}
          title="Unduh aplikasi JALORA ke layar utama perangkat"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-transparent flex items-center justify-center shrink-0">
              <img
                src="/assets/aistudio/Ikon_Unduh_Hijau_Mengilap_93580ebc.png"
                alt="Unduh Aplikasi JALORA"
                className="w-7 h-7 object-contain group-hover:scale-105 transition-transform"
              />
            </div>
            <div className="text-left">
              <span className="block text-xs font-bold leading-tight text-[#294D35]">Unduh Aplikasi</span>
              <span className="block text-[10px] font-normal text-stone-500">Install ke Layar Utama</span>
            </div>
          </div>
          <span className="text-[10px] bg-[#294D35] text-white px-2 py-0.5 rounded-lg font-bold">PWA</span>
        </button>

        <PWAInstallModal isOpen={showModal} onClose={() => setShowModal(false)} />
      </>
    );
  }

  // Variant: Header Button (Icon saja tanpa tulisan, responsif untuk Android & iOS portrait & landscape)
  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={`p-1 sm:p-1.5 rounded-xl hover:bg-stone-100 active:scale-95 transition-all cursor-pointer min-h-[36px] min-w-[36px] sm:min-h-[38px] sm:min-w-[38px] flex items-center justify-center shrink-0 ${className}`}
        title="Unduh Aplikasi JALORA (PWA)"
        aria-label="Unduh Aplikasi JALORA"
      >
        <img
          src="/assets/aistudio/Ikon_Unduh_Hijau_Mengilap_93580ebc.png"
          alt="Unduh Aplikasi JALORA"
          className="w-6 h-6 sm:w-7 sm:h-7 object-contain drop-shadow-xs hover:brightness-105 transition-all shrink-0"
        />
      </button>

      <PWAInstallModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
};
