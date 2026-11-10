/**
 * JALORA — Offline Status & Update Banner Component
 * Accurately monitors online/offline status and service worker update availability.
 * 
 * Created by Abdul Jalil
 */

import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, RefreshCw, AlertTriangle, X } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [showOnlineRestored, setShowOnlineRestored] = useState<boolean>(false);
  const { updateAvailable, applyUpdate } = usePWAInstall();
  const [dismissedUpdate, setDismissedUpdate] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOnlineRestored(true);
      const timer = setTimeout(() => {
        setShowOnlineRestored(false);
      }, 4000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOnlineRestored(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <>
      {/* 1. Offline Banner */}
      {!isOnline && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 bg-[#294D35] text-white p-3.5 rounded-2xl border border-[#D6BD7A] shadow-2xl flex items-start gap-3 text-xs animate-in slide-in-from-bottom duration-200">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-[#D6BD7A] flex items-center justify-center shrink-0 border border-[#D6BD7A]/30">
            <WifiOff className="w-4 h-4" />
          </div>
          <div className="flex-1 space-y-0.5">
            <p className="font-bold text-white flex items-center gap-1.5">
              <span>Mode Offline</span>
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block" />
            </p>
            <p className="text-stone-200 text-[11px] leading-relaxed">
              Koneksi internet terputus. Data transaksi yang baru hanya tersimpan di cache lokal browser Anda dan belum disinkronkan ke Supabase.
            </p>
          </div>
        </div>
      )}

      {/* 2. Online Restored Notification */}
      {isOnline && showOnlineRestored && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-50 bg-[#294D35] text-white p-3 rounded-2xl border border-emerald-400 shadow-2xl flex items-center gap-3 text-xs animate-in slide-in-from-bottom duration-150">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Wifi className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-emerald-300">Koneksi Internet Pulih</p>
            <p className="text-[11px] text-stone-200">Aplikasi terhubung kembali secara online.</p>
          </div>
        </div>
      )}

      {/* 3. New Version Update Notification */}
      {updateAvailable && !dismissedUpdate && (
        <div className="fixed top-4 right-4 sm:right-6 max-w-sm z-50 bg-white text-[#294D35] p-4 rounded-2xl border border-[#DCE5D6] shadow-2xl flex items-start gap-3 text-xs animate-in slide-in-from-top duration-200">
          <div className="w-8 h-8 rounded-xl bg-[#F5F0E5] text-[#4F7655] flex items-center justify-center shrink-0 border border-[#DCE5D6]">
            <RefreshCw className="w-4 h-4" />
          </div>
          <div className="flex-1 space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="font-bold text-[#294D35]">Pembaruan Tersedia</p>
              <button
                type="button"
                onClick={() => setDismissedUpdate(true)}
                className="text-stone-400 hover:text-stone-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[11px] text-stone-500">
              Versi terbaru Jalora telah diunduh. Muat ulang sekarang untuk menerapkan pembaruan tanpa menghapus data Anda.
            </p>
            <button
              type="button"
              onClick={applyUpdate}
              className="px-3 py-1.5 bg-[#294D35] hover:bg-[#1e3827] text-white rounded-lg font-semibold text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3 h-3 text-[#D6BD7A]" />
              <span>Perbarui Sekarang</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};
