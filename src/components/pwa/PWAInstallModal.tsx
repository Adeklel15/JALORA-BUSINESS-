/**
 * JALORA — Modal Unduh Aplikasi PWA
 * Mengadopsi konsep dan alur PWA resmi (referensi Sawit-Ku)
 * Mendukung instalasi native browser (beforeinstallprompt) serta panduan manual untuk Android & iPhone.
 * 
 * Created by Abdul Jalil
 */

import React, { useState } from 'react';
import {
  Smartphone,
  Laptop,
  Apple,
  Download,
  X,
  CheckCircle2,
  Share,
  Info,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { usePWAInstall, PWAUserPlatform } from '../../hooks/usePWAInstall';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, platform, install } = usePWAInstall();
  const [selectedTab, setSelectedTab] = useState<PWAUserPlatform>(() => platform || 'android');
  const [isInstalling, setIsInstalling] = useState(false);
  const [installStatus, setInstallStatus] = useState<{
    type: 'success' | 'info' | 'warn';
    message: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleNativeInstall = async () => {
    setIsInstalling(true);
    setInstallStatus(null);
    try {
      if (isInstallable) {
        const success = await install();
        if (success) {
          setInstallStatus({
            type: 'success',
            message: 'Aplikasi JALORA berhasil dipasang ke perangkat Anda! Ikon aplikasi kini tersedia di layar utama.'
          });
        } else {
          setInstallStatus({
            type: 'info',
            message: 'Instalasi otomatis dibatalkan. Anda dapat mengikuti panduan manual di bawah.'
          });
        }
      } else {
        setInstallStatus({
          type: 'info',
          message: 'Browser Anda tidak memicu prompt otomatis. Silakan ikuti panduan manual di bawah.'
        });
      }
    } catch {
      setInstallStatus({
        type: 'warn',
        message: 'Tidak dapat membuka dialog otomatis. Silakan gunakan panduan manual di bawah.'
      });
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 bg-[rgba(41,77,53,0.55)] backdrop-blur-xs transition-opacity duration-200 ease-out flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-xl sm:max-w-2xl rounded-3xl border border-[#DCE5D6] shadow-2xl overflow-hidden flex flex-col my-auto transition-all animate-jalora-enter"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ============================================================== */}
        {/* A. HEADER: Dark Green #294D35 with Official Logo and Close (X) */}
        {/* ============================================================== */}
        <header className="bg-[#294D35] text-white px-5 sm:px-6 py-4 flex items-center justify-between gap-3 select-none shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white p-1.5 shadow-md border border-[#DCE5D6]/50 shrink-0 flex items-center justify-center">
              <img
                src="/assets/aistudio/Logo_Aplikasi_Jalora_Hijau_Modern_d93205db.png"
                alt="Logo JALORA"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h2 id="modal-title" className="text-base sm:text-lg font-bold tracking-tight text-white leading-tight">
                Unduh Aplikasi JALORA
              </h2>
              <p className="text-[11px] sm:text-xs text-[#F5F0E5]/90 mt-0.5">
                Akses cepat langsung dari layar utama perangkat Anda
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal"
            className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto max-h-[calc(88vh-130px)] p-4 sm:p-6 space-y-4">
          {/* Main Description Box */}
          <div className="p-3.5 sm:p-4 bg-[#F5F0E5]/60 rounded-2xl border border-[#DCE5D6] flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-transparent flex items-center justify-center shrink-0 mt-0.5">
              <img
                src="/assets/aistudio/Ikon_Unduh_Hijau_Mengilap_93580ebc.png"
                alt="Unduh Aplikasi JALORA"
                className="w-7 h-7 object-contain"
              />
            </div>
            <p className="text-xs sm:text-sm text-[#263328] leading-relaxed font-medium">
              JALORA berbasis Progressive Web App (PWA) sehingga dapat langsung diinstall ke layar utama HP tanpa melalui Play Store / App Store.
            </p>
          </div>

          {/* Standalone Active Status if already installed */}
          {isInstalled && (
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">
                Aplikasi JALORA saat ini sudah terpasang dan berjalan dalam mode aplikasi mandiri di perangkat ini.
              </span>
            </div>
          )}

          {/* Native Install Prompt Action (if browser supports beforeinstallprompt) */}
          {isInstallable && (
            <div className="p-3.5 bg-white rounded-2xl border-2 border-[#294D35]/30 space-y-2 shadow-xs">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-[#294D35]">Instalasi Otomatis Tersedia</h4>
                  <p className="text-[11px] text-stone-500">Browser Anda mendukung instalasi instan satu ketukan.</p>
                </div>
                <button
                  type="button"
                  onClick={handleNativeInstall}
                  disabled={isInstalling}
                  className="px-4 py-2 bg-[#294D35] hover:bg-[#1e3827] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer shrink-0"
                >
                  <Download className="w-4 h-4 text-[#D6BD7A]" />
                  <span>{isInstalling ? 'Memproses...' : 'Install Sekarang'}</span>
                </button>
              </div>

              {installStatus && (
                <div
                  className={`p-2.5 rounded-xl border text-xs flex items-start gap-2 ${
                    installStatus.type === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : installStatus.type === 'warn'
                      ? 'bg-amber-50 border-amber-200 text-amber-800'
                      : 'bg-stone-50 border-stone-200 text-stone-700'
                  }`}
                >
                  {installStatus.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  )}
                  <span className="leading-snug">{installStatus.message}</span>
                </div>
              )}
            </div>
          )}

          {/* Device Tabs: Android | iPhone | Komputer */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#294D35] uppercase tracking-wide">
                Pilih Jenis Perangkat Anda:
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#F5F7F2] rounded-2xl border border-[#DCE5D6]">
              <button
                type="button"
                onClick={() => setSelectedTab('android')}
                className={`py-2 px-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  selectedTab === 'android'
                    ? 'bg-white text-[#294D35] shadow-xs border border-[#4F7655]/40 font-bold'
                    : 'text-stone-600 hover:text-[#294D35]'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#4F7655]" />
                <span>Android</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedTab('ios')}
                className={`py-2 px-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  selectedTab === 'ios'
                    ? 'bg-white text-[#294D35] shadow-xs border border-[#4F7655]/40 font-bold'
                    : 'text-stone-600 hover:text-[#294D35]'
                }`}
              >
                <Apple className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-stone-800" />
                <span>iPhone</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedTab('desktop')}
                className={`py-2 px-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  selectedTab === 'desktop'
                    ? 'bg-white text-[#294D35] shadow-xs border border-[#4F7655]/40 font-bold'
                    : 'text-stone-600 hover:text-[#294D35]'
                }`}
              >
                <Laptop className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#294D35]" />
                <span>Komputer</span>
              </button>
            </div>

            {/* Detailed Guide Content */}
            <div className="p-4 bg-white rounded-2xl border border-[#DCE5D6] space-y-3 shadow-xs">
              {/* Panduan Android */}
              {selectedTab === 'android' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-[#DCE5D6]/60">
                    <Smartphone className="w-4 h-4 text-[#4F7655]" />
                    <h4 className="font-bold text-xs sm:text-sm text-[#294D35]">
                      Panduan Instalasi Android:
                    </h4>
                  </div>

                  <ol className="list-decimal list-inside space-y-2.5 text-xs sm:text-sm text-stone-700 leading-relaxed font-medium">
                    <li className="pl-1">
                      Buka JALORA menggunakan <strong>Google Chrome</strong>.
                    </li>
                    <li className="pl-1">
                      Ketuk menu titik tiga (<strong>⋮</strong>).
                    </li>
                    <li className="pl-1">
                      Pilih <strong>&quot;Tambahkan ke Layar Utama&quot;</strong> atau <strong>&quot;Install Aplikasi&quot;</strong>.
                    </li>
                    <li className="pl-1">
                      Konfirmasi instalasi.
                    </li>
                  </ol>
                </div>
              )}

              {/* Panduan iPhone */}
              {selectedTab === 'ios' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-[#DCE5D6]/60">
                    <Apple className="w-4 h-4 text-stone-800" />
                    <h4 className="font-bold text-xs sm:text-sm text-[#294D35]">
                      Panduan Instalasi iPhone:
                    </h4>
                  </div>

                  <ol className="list-decimal list-inside space-y-2.5 text-xs sm:text-sm text-stone-700 leading-relaxed font-medium">
                    <li className="pl-1">
                      Buka JALORA menggunakan <strong>Safari</strong>.
                    </li>
                    <li className="pl-1">
                      Ketuk tombol <strong>Share</strong> (<Share className="w-3.5 h-3.5 inline mx-0.5 text-blue-600" />).
                    </li>
                    <li className="pl-1">
                      Pilih <strong>&quot;Add to Home Screen&quot;</strong>.
                    </li>
                    <li className="pl-1">
                      Konfirmasi.
                    </li>
                  </ol>
                </div>
              )}

              {/* Panduan Komputer */}
              {selectedTab === 'desktop' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-[#DCE5D6]/60">
                    <Laptop className="w-4 h-4 text-[#294D35]" />
                    <h4 className="font-bold text-xs sm:text-sm text-[#294D35]">
                      Panduan Instalasi Komputer / Laptop:
                    </h4>
                  </div>

                  <ol className="list-decimal list-inside space-y-2.5 text-xs sm:text-sm text-stone-700 leading-relaxed font-medium">
                    <li className="pl-1">
                      Buka JALORA menggunakan browser <strong>Google Chrome</strong> atau <strong>Microsoft Edge</strong>.
                    </li>
                    <li className="pl-1">
                      Klik ikon <strong>Instal</strong> di bilah alamat URL browser (address bar sebelah kanan).
                    </li>
                    <li className="pl-1">
                      Pilih <strong>&quot;Instal JALORA&quot;</strong>.
                    </li>
                    <li className="pl-1">
                      Konfirmasi instalasi.
                    </li>
                  </ol>
                </div>
              )}
            </div>
          </div>

          {/* Informasi Box Sesuai Ketentuan */}
          <div className="flex items-start gap-2.5 p-3 bg-[#F5F7F2] rounded-xl border border-[#DCE5D6] text-xs text-stone-600">
            <Info className="w-4 h-4 text-[#4F7655] shrink-0 mt-0.5" />
            <span className="font-medium">
              Instalasi tersedia jika browser dan perangkat mendukung PWA.
            </span>
          </div>

          {/* Keuntungan Singkat */}
          <div className="p-3 bg-white rounded-xl border border-[#DCE5D6]/80 text-[11px] sm:text-xs text-stone-600 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#4F7655] shrink-0" />
            <span>Aplikasi langsung tersimpan di beranda perangkat, hemat memori, dan dapat dibuka tanpa membuka browser terlebih dahulu.</span>
          </div>
        </div>

        {/* ============================================================== */}
        {/* F. FOOTER: Tombol 'Mengerti & Tutup'                            */}
        {/* ============================================================== */}
        <footer className="px-5 sm:px-6 py-3.5 bg-stone-50 border-t border-stone-200 flex items-center justify-end select-none shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 bg-[#294D35] hover:bg-[#1e3827] text-white font-bold rounded-xl text-xs sm:text-sm transition-all shadow-xs cursor-pointer text-center"
          >
            Mengerti &amp; Tutup
          </button>
        </footer>
      </div>
    </div>
  );
};
