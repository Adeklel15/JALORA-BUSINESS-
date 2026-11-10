/**
 * JALORA — Public Landing & Identity Page
 * Accessible without login. Displays platform features, benefits, creator tribute,
 * and secure onboarding modal.
 * Created by Abdul Jalil
 */

import React, { useState } from 'react';
import {
  Store,
  ShoppingCart,
  Boxes,
  Wallet,
  ShieldCheck,
  RefreshCw,
  Printer,
  ArrowRight,
  CheckCircle2,
  Lock,
  Phone,
  User,
  KeyRound,
  Layers,
  HelpCircle,
  Sparkles,
  ChevronRight,
  TrendingUp,
  Receipt
} from 'lucide-react';
import { UserProfile, Store as StoreType } from '../../types';
import { hashPin, jaloraStorage } from '../../services/storage';
import { PWAInstallButton } from '../pwa/PWAInstallButton';
import { OfflineIndicator } from '../pwa/OfflineIndicator';

interface PublicLandingProps {
  onLoginSuccess: (user: UserProfile, store: StoreType) => void;
}

export const PublicLanding: React.FC<PublicLandingProps> = ({ onLoginSuccess }) => {
  const [activeTab, setActiveTab] = useState<'home' | 'features' | 'benefits' | 'about' | 'help' | 'privacy'>('home');
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Login Form State
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPin, setLoginPin] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Register Wizard State
  const [regStep, setRegStep] = useState<number>(1);
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regStoreName, setRegStoreName] = useState('');
  const [regStoreAddress, setRegStoreAddress] = useState('');
  const [regPin, setRegPin] = useState('');
  const [regPinConfirm, setRegPinConfirm] = useState('');
  const [regError, setRegError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsSubmitting(true);

    try {
      const cleanPhone = loginPhone.trim().replace(/[-\s]/g, '');
      const users = jaloraStorage.getUsers();
      const user = users.find(u => u.phone.replace(/[-\s]/g, '') === cleanPhone);

      if (!user) {
        setLoginError('Nomor HP belum terdaftar. Silakan daftar terlebih dahulu atau gunakan mode Demo.');
        setIsSubmitting(false);
        return;
      }

      if (user.isPinLocked) {
        setLoginError('Akun terkunci karena percobaan PIN salah melebihi batas. Hubungi pemilik atau reset data.');
        setIsSubmitting(false);
        return;
      }

      const inputPinHash = await hashPin(loginPin);
      if (user.pinHash && user.pinHash !== inputPinHash) {
        user.pinFailedAttempts = (user.pinFailedAttempts || 0) + 1;
        if (user.pinFailedAttempts >= 5) {
          user.isPinLocked = true;
          jaloraStorage.saveUser(user);
          setLoginError('PIN salah 5 kali. Akun telah diamankan/dikunci.');
        } else {
          jaloraStorage.saveUser(user);
          setLoginError(`PIN salah! Sisa percobaan: ${5 - user.pinFailedAttempts}`);
        }
        setIsSubmitting(false);
        return;
      }

      // Successful login
      user.pinFailedAttempts = 0;
      jaloraStorage.saveUser(user);
      jaloraStorage.setCurrentUser(user);

      const stores = jaloraStorage.getStores();
      const store = stores.find(s => s.id === user.storeId) || jaloraStorage.getCurrentStore();
      if (store) {
        jaloraStorage.setCurrentStore(store);
        onLoginSuccess(user, store);
      } else {
        setLoginError('Data toko tidak ditemukan.');
      }
    } catch {
      setLoginError('Terjadi kesalahan saat memproses login.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');

    if (regStep === 1) {
      if (!regName.trim() || !regPhone.trim()) {
        setRegError('Nama lengkap dan nomor HP wajib diisi.');
        return;
      }
      setRegStep(2);
      return;
    }

    if (regStep === 2) {
      if (!regStoreName.trim()) {
        setRegError('Nama toko wajib diisi.');
        return;
      }
      setRegStep(3);
      return;
    }

    if (regStep === 3) {
      if (regPin.length !== 6 || !/^\d{6}$/.test(regPin)) {
        setRegError('PIN transaksi harus tepat 6 digit angka.');
        return;
      }
      if (regPin !== regPinConfirm) {
        setRegError('Konfirmasi PIN tidak cocok.');
        return;
      }

      setIsSubmitting(true);
      try {
        const storeId = `store_${Date.now()}`;
        const branchId = `branch_${Date.now()}_main`;
        const userId = `user_${Date.now()}`;

        const newStore: StoreType = {
          id: storeId,
          name: regStoreName.trim(),
          phone: regPhone.trim(),
          address: regStoreAddress.trim() || 'Indonesia',
          currency: 'IDR',
          taxRate: 0,
          isTaxActive: false,
          defaultBranchId: branchId,
          createdAt: new Date().toISOString(),
        };

        const newBranch = {
          id: branchId,
          storeId,
          name: 'Cabang Utama',
          code: 'CAB-01',
          phone: regPhone.trim(),
          address: regStoreAddress.trim() || 'Indonesia',
          isMain: true,
          createdAt: new Date().toISOString(),
        };

        const hashed = await hashPin(regPin);

        const newUser: UserProfile = {
          id: userId,
          name: regName.trim(),
          phone: regPhone.trim(),
          role: 'owner',
          storeId,
          branchId,
          pinHash: hashed,
          pinFailedAttempts: 0,
          isPinLocked: false,
          createdAt: new Date().toISOString(),
        };

        // Save cleanly with zero fake data (clean Rp0, 0 stock)
        jaloraStorage.saveStore(newStore);
        jaloraStorage.saveBranch(newBranch);
        jaloraStorage.saveUser(newUser);
        jaloraStorage.setCurrentStore(newStore);
        jaloraStorage.setCurrentUser(newUser);
        jaloraStorage.getAccounts(storeId); // initialize default Chart of Accounts

        jaloraStorage.recordAuditLog({
          storeId,
          userName: newUser.name,
          userRole: 'Owner',
          action: 'PENDAFTARAN_TOKO',
          targetEntity: 'Store',
          targetId: newStore.name,
          details: `Pendaftaran toko baru "${newStore.name}" oleh ${newUser.name}. Saldo awal Rp0, stok awal 0.`,
          timestamp: new Date().toISOString(),
        });

        onLoginSuccess(newUser, newStore);
      } catch (err: any) {
        setRegError(`Gagal membuat akun: ${err.message || 'Coba lagi'}`);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const startDemoStore = () => {
    const { store, user } = jaloraStorage.seedDemoStore();
    onLoginSuccess(user, store);
  };

  return (
    <div className="min-h-screen bg-[#F5F7F2] text-[#294D35] flex flex-col font-sans">
      <OfflineIndicator />
      {/* Top Bar Contract: 3 Zones: Brand Title (single-line) — 4-5 Nav Links — 1 Primary Action */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#DCE5D6] px-6 lg:px-12 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-8">
          {/* Zone 1: Single text element wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-[#294D35] flex items-center justify-center p-1 shadow-xs border border-[#DCE5D6]/50 overflow-hidden">
              <img
                src="/assets/aistudio/Logo_Aplikasi_Jalora_Hijau_Modern_d93205db.png"
                alt="Logo JALORA"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight text-[#294D35] whitespace-nowrap">
                JALORA
              </span>
              <span className="text-[10px] text-[#4F7655] font-medium tracking-wide -mt-1 hidden sm:block">
                Satu Sistem, Kendali Seluruh Bisnis
              </span>
            </div>
          </div>

          {/* Zone 2: Clean single-line text navigation links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-stone-600">
            <button
              onClick={() => setActiveTab('home')}
              className={`hover:text-[#294D35] transition-colors whitespace-nowrap shrink-0 ${activeTab === 'home' ? 'text-[#294D35] font-semibold border-b-2 border-[#4F7655] pb-0.5' : ''}`}
            >
              Beranda
            </button>
            <button
              onClick={() => setActiveTab('features')}
              className={`hover:text-[#294D35] transition-colors whitespace-nowrap shrink-0 ${activeTab === 'features' ? 'text-[#294D35] font-semibold border-b-2 border-[#4F7655] pb-0.5' : ''}`}
            >
              Fitur Lengkap
            </button>
            <button
              onClick={() => setActiveTab('benefits')}
              className={`hover:text-[#294D35] transition-colors whitespace-nowrap shrink-0 ${activeTab === 'benefits' ? 'text-[#294D35] font-semibold border-b-2 border-[#4F7655] pb-0.5' : ''}`}
            >
              Manfaat Usaha
            </button>
            <button
              onClick={() => setActiveTab('about')}
              className={`hover:text-[#294D35] transition-colors whitespace-nowrap shrink-0 ${activeTab === 'about' ? 'text-[#294D35] font-semibold border-b-2 border-[#4F7655] pb-0.5' : ''}`}
            >
              Tentang JALORA
            </button>
            <button
              onClick={() => setActiveTab('help')}
              className={`hover:text-[#294D35] transition-colors whitespace-nowrap shrink-0 ${activeTab === 'help' ? 'text-[#294D35] font-semibold border-b-2 border-[#4F7655] pb-0.5' : ''}`}
            >
              Bantuan & Panduan
            </button>
          </nav>

          {/* Zone 3: Primary Action buttons */}
          <div className="flex items-center gap-3 shrink-0">
            <PWAInstallButton variant="header" />
            <button
              onClick={() => {
                setAuthMode('login');
                setShowAuthModal(true);
              }}
              className="text-xs lg:text-sm font-semibold text-[#294D35] hover:text-[#4F7655] px-3 py-2 transition-colors whitespace-nowrap"
            >
              Masuk
            </button>
            <button
              onClick={() => {
                setAuthMode('register');
                setRegStep(1);
                setShowAuthModal(true);
              }}
              className="bg-[#294D35] hover:bg-[#4F7655] text-white text-xs lg:text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-sm whitespace-nowrap"
            >
              Daftar Toko
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Areas based on Tab */}
      <main className="flex-1">
        {activeTab === 'home' && (
          <div>
            {/* Hero Section */}
            <section className="px-6 lg:px-12 pt-14 pb-16 max-w-7xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                <div className="lg:col-span-7 space-y-6">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#4F7655] tracking-wide uppercase">
                    <span>Platform Manajemen Bisnis Terpadu Indonesia</span>
                    <span aria-hidden="true">·</span>
                    <span>Multi-Cabang & POS</span>
                  </div>

                  <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-[#294D35] leading-tight text-balance">
                    Satu Sistem, Kendali Seluruh Bisnis Anda.
                  </h1>

                  <p className="text-base lg:text-lg text-stone-600 leading-relaxed max-w-2xl">
                    JALORA menggabungkan Kasir POS cepat, pencatatan inventaris multi-cabang dengan valuasi moving average, akuntansi double-entry otomatis (Laba Rugi & Neraca), rekonsiliasi kasir, dan audit log anti-manipulasi dalam satu sistem terpercaya.
                  </p>

                  <div className="flex flex-wrap items-center gap-4 pt-2">
                    <button
                      onClick={() => {
                        setAuthMode('register');
                        setRegStep(1);
                        setShowAuthModal(true);
                      }}
                      className="bg-[#294D35] hover:bg-[#4F7655] text-white font-medium px-6 py-3 rounded-lg shadow-sm flex items-center gap-2 transition-all"
                    >
                      <span>Mulai Buka Toko (Gratis)</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    <button
                      onClick={startDemoStore}
                      className="bg-white hover:bg-stone-50 border border-[#DCE5D6] text-[#294D35] font-medium px-5 py-3 rounded-lg transition-colors flex items-center gap-2 shadow-xs"
                    >
                      <Sparkles className="w-4 h-4 text-[#4F7655]" />
                      <span>Eksplorasi Toko Demo</span>
                    </button>
                  </div>

                  {/* Trust markers */}
                  <div className="pt-6 border-t border-[#DCE5D6] grid grid-cols-3 gap-6 text-xs text-stone-600">
                    <div>
                      <p className="font-bold text-[#294D35] text-sm">Persisten & Aman</p>
                      <p className="mt-0.5">Dukungan Supabase PostgreSQL & RLS</p>
                    </div>
                    <div>
                      <p className="font-bold text-[#294D35] text-sm">Standar Akuntansi</p>
                      <p className="mt-0.5">Double-entry ledger otomatis & seimbang</p>
                    </div>
                    <div>
                      <p className="font-bold text-[#294D35] text-sm">Multi-Cabang</p>
                      <p className="mt-0.5">Kelola banyak cabang toko dalam 1 akun</p>
                    </div>
                  </div>
                </div>

                {/* Right Hero Visual Card */}
                <div className="lg:col-span-5">
                  <div className="bg-white rounded-2xl border border-[#DCE5D6] p-6 shadow-md relative overflow-hidden">
                    <div className="flex items-center justify-between pb-4 border-b border-stone-100 mb-5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-3 h-3 rounded-full bg-emerald-500" />
                        <span className="font-semibold text-sm text-[#294D35]">Terminal POS JALORA</span>
                      </div>
                      <span className="text-xs text-stone-600 font-mono">CABANG-01</span>
                    </div>

                    <div className="space-y-3">
                      <div className="bg-[#F5F7F2] p-3 rounded-xl flex items-center justify-between text-xs">
                        <div>
                          <p className="font-semibold text-[#294D35]">Beras Pandan Wangi 5kg</p>
                          <p className="text-stone-600">1 × Rp 78.000 (HPP Rp 68.000)</p>
                        </div>
                        <span className="font-bold text-[#294D35]">Rp 78.000</span>
                      </div>

                      <div className="bg-[#F5F7F2] p-3 rounded-xl flex items-center justify-between text-xs">
                        <div>
                          <p className="font-semibold text-[#294D35]">Minyak Goreng Sania 2L</p>
                          <p className="text-stone-600">2 × Rp 37.500</p>
                        </div>
                        <span className="font-bold text-[#294D35]">Rp 75.000</span>
                      </div>

                      <div className="bg-[#F5F7F2] p-3 rounded-xl flex items-center justify-between text-xs">
                        <div>
                          <p className="font-semibold text-[#294D35]">Gula Gulaku Tebu 1kg</p>
                          <p className="text-stone-600">1 × Rp 18.000</p>
                        </div>
                        <span className="font-bold text-[#294D35]">Rp 18.000</span>
                      </div>
                    </div>

                    <div className="mt-5 pt-4 border-t border-stone-100 space-y-2">
                      <div className="flex justify-between text-xs text-stone-600">
                        <span>Total Belanja</span>
                        <span className="font-semibold text-[#294D35]">Rp 171.000</span>
                      </div>
                      <div className="flex justify-between text-xs text-stone-600">
                        <span>Metode Pembayaran</span>
                        <span className="font-medium text-emerald-700">QRIS / Tunai Pas</span>
                      </div>
                      <div className="flex justify-between text-sm font-bold text-[#294D35] pt-1">
                        <span>Jurnal Akuntansi</span>
                        <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">Otomatis Terposting</span>
                      </div>
                    </div>

                    <div className="mt-6 flex gap-2">
                      <button
                        onClick={startDemoStore}
                        className="w-full bg-[#294D35] hover:bg-[#4F7655] text-white text-xs font-semibold py-2.5 rounded-lg transition-colors text-center"
                      >
                        Buka POS Langsung
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Core Capabilities Section */}
            <section className="bg-white py-16 px-6 lg:px-12 border-t border-[#DCE5D6]">
              <div className="max-w-7xl mx-auto">
                <div className="text-center max-w-2xl mx-auto mb-12">
                  <h2 className="text-3xl font-bold text-[#294D35]">Fitur Inti yang Siap Digunakan Nyata</h2>
                  <p className="text-stone-600 mt-2 text-sm">
                    Dirancang dengan presisi untuk memenuhi kebutuhan operasional toko ritel, grosir, apotek, dan usaha multi-cabang di Indonesia.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* POS */}
                  <div className="p-6 rounded-xl border border-[#DCE5D6] bg-[#F5F7F2]/50 hover:bg-[#F5F7F2] transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-[#294D35] text-white flex items-center justify-center mb-4">
                      <ShoppingCart className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-[#294D35] text-base mb-1">Kasir POS Cepat & Idempoten</h3>
                    <p className="text-xs text-stone-600 leading-relaxed">
                      Pencarian barcode cepat, keranjang belanja instan, kalkulasi kembalian tunai & QRIS, struk thermal 58/80mm, serta pengiriman struk otomatis ke WhatsApp pelanggan.
                    </p>
                  </div>

                  {/* Inventory & Moving Average */}
                  <div className="p-6 rounded-xl border border-[#DCE5D6] bg-[#F5F7F2]/50 hover:bg-[#F5F7F2] transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-[#4F7655] text-white flex items-center justify-center mb-4">
                      <Boxes className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-[#294D35] text-base mb-1">Stok & Valuasi Moving Average</h3>
                    <p className="text-xs text-stone-600 leading-relaxed">
                      Pencatatan mutasi masuk-keluar, saldo stok per cabang, batas minimum stok, stok opname dengan verifikasi PIN transaksi, serta kalkulasi harga beli rata-rata tertimbang.
                    </p>
                  </div>

                  {/* Accounting */}
                  <div className="p-6 rounded-xl border border-[#DCE5D6] bg-[#F5F7F2]/50 hover:bg-[#F5F7F2] transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-[#294D35] text-white flex items-center justify-center mb-4">
                      <Wallet className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-[#294D35] text-base mb-1">Akuntansi Double-Entry</h3>
                    <p className="text-xs text-stone-600 leading-relaxed">
                      Jurnal umum otomatis seimbang (Debit = Kredit), buku besar akun, laporan laba rugi, neraca saldo, arus kas, serta pemantauan piutang dan utang usaha jatuh tempo.
                    </p>
                  </div>

                  {/* Shift Reconciliation */}
                  <div className="p-6 rounded-xl border border-[#DCE5D6] bg-[#F5F7F2]/50 hover:bg-[#F5F7F2] transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-[#4F7655] text-white flex items-center justify-center mb-4">
                      <Receipt className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-[#294D35] text-base mb-1">Rekonsiliasi Kasir & Shift</h3>
                    <p className="text-xs text-stone-600 leading-relaxed">
                      Buka dan tutup shift kasir: Saldo awal + Penerimaan tunai - Pengeluaran kas = Kas diharapkan. Menghitung selisih kas fisik secara objektif dengan otorisasi PIN.
                    </p>
                  </div>

                  {/* Multi-Branch */}
                  <div className="p-6 rounded-xl border border-[#DCE5D6] bg-[#F5F7F2]/50 hover:bg-[#F5F7F2] transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-[#294D35] text-white flex items-center justify-center mb-4">
                      <Store className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-[#294D35] text-base mb-1">Multi-Cabang & Hak Akses</h3>
                    <p className="text-xs text-stone-600 leading-relaxed">
                      Kelola cabang utama dan cabang anak secara terpusat. Pembagian peran Owner, Manajer, dan Kasir dengan perlindungan least privilege di setiap level data.
                    </p>
                  </div>

                  {/* Audit & Cloud */}
                  <div className="p-6 rounded-xl border border-[#DCE5D6] bg-[#F5F7F2]/50 hover:bg-[#F5F7F2] transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-[#4F7655] text-white flex items-center justify-center mb-4">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-[#294D35] text-base mb-1">Audit Log & Supabase Sync</h3>
                    <p className="text-xs text-stone-600 leading-relaxed">
                      Mencatat setiap aksi sensitif (void, diskon besar, opname). Dilengkapi generator skema PostgreSQL Supabase dengan RLS dan backup data mandiri.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* Features Tab */}
        {activeTab === 'features' && (
          <div className="max-w-6xl mx-auto px-6 py-12 space-y-12">
            <div>
              <h2 className="text-3xl font-bold text-[#294D35]">Spesifikasi Modul JALORA</h2>
              <p className="text-stone-600 text-sm mt-1">Struktur fungsional terintegrasi dari meja kasir hingga laporan keuangan pemilik.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white p-6 rounded-xl border border-[#DCE5D6]">
                <h3 className="text-lg font-bold text-[#294D35] mb-3 flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-[#4F7655]" />
                  <span>Point of Sale (POS) & Transaksi</span>
                </h3>
                <ul className="space-y-2 text-xs text-stone-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Pencarian instan produk berdasarkan barcode, SKU, atau nama.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Pencegahan transaksi ganda (Idempotency Key) saat klik ganda atau koneksi terputus.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Dukungan cetak struk thermal 58mm & 80mm serta sharing nota via WhatsApp.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Pencatatan pembayaran tunai dengan kembalian otomatis dan QRIS statis/dinamis.</span>
                  </li>
                </ul>
              </div>

              <div className="bg-white p-6 rounded-xl border border-[#DCE5D6]">
                <h3 className="text-lg font-bold text-[#294D35] mb-3 flex items-center gap-2">
                  <Boxes className="w-5 h-5 text-[#4F7655]" />
                  <span>Inventaris & Pembelian (Purchasing)</span>
                </h3>
                <ul className="space-y-2 text-xs text-stone-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Valuasi persediaan Moving Weighted Average akurat saat penerimaan PO baru.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Stok opname berkala dengan alasan audit dan verifikasi 6-digit PIN transaksi.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Riwayat mutasi stok lengkap dari transaksi, opname, dan retur.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Peringatan stok kritis / minimum secara otomatis di dashboard.</span>
                  </li>
                </ul>
              </div>

              <div className="bg-white p-6 rounded-xl border border-[#DCE5D6]">
                <h3 className="text-lg font-bold text-[#294D35] mb-3 flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-[#4F7655]" />
                  <span>Akuntansi Double-Entry & Keuangan</span>
                </h3>
                <ul className="space-y-2 text-xs text-stone-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Bagan akun standar (Chart of Accounts) disesuaikan untuk ritel & grosir Indonesia.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Validasi ketat Debit = Kredit pada setiap pencatatan transaksi manual maupun otomatis.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Laporan Laba Rugi real-time: Pendapatan - HPP = Laba Kotor - Beban = Laba Bersih.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Manajemen Piutang Pelanggan dan Utang Supplier dengan tanggal jatuh tempo.</span>
                  </li>
                </ul>
              </div>

              <div className="bg-white p-6 rounded-xl border border-[#DCE5D6]">
                <h3 className="text-lg font-bold text-[#294D35] mb-3 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#4F7655]" />
                  <span>Keamanan, PIN & Cloud Supabase</span>
                </h3>
                <ul className="space-y-2 text-xs text-stone-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>6-Digit PIN Transaksi terpisah dari kata sandi akun untuk persetujuan manajerial.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Pencegahan brute-force PIN dengan penguncian otomatis setelah 5 kali gagal.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Skema PostgreSQL dan aturan Row Level Security (RLS) siap salin untuk Supabase.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Fitur export backup JSON mandiri untuk menjaga kedaulatan data bisnis pengguna.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Benefits Tab */}
        {activeTab === 'benefits' && (
          <div className="max-w-5xl mx-auto px-6 py-12 space-y-10">
            <div>
              <h2 className="text-3xl font-bold text-[#294D35]">Mengapa Memilih JALORA?</h2>
              <p className="text-stone-600 text-sm mt-1">Dibuat khusus untuk menghilangkan kebocoran kas, kekacauan stok, dan ketidakjelasan laba.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-xl border border-[#DCE5D6] space-y-3">
                <span className="text-2xl font-bold text-[#4F7655]">01</span>
                <h4 className="font-bold text-[#294D35]">Cegah Selisih Kasir</h4>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Dengan sistem hitung laci kas di awal dan akhir shift, setiap kelebihan atau kekurangan uang kasir tercatat jelas dan tidak dapat dimanipulasi.
                </p>
              </div>

              <div className="bg-white p-6 rounded-xl border border-[#DCE5D6] space-y-3">
                <span className="text-2xl font-bold text-[#4F7655]">02</span>
                <h4 className="font-bold text-[#294D35]">Valuasi HPP Akurat</h4>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Harga kulakan sering berubah naik turun. Metode Moving Weighted Average JALORA memastikan harga pokok penjualan selalu mencerminkan biaya modal nyata.
                </p>
              </div>

              <div className="bg-white p-6 rounded-xl border border-[#DCE5D6] space-y-3">
                <span className="text-2xl font-bold text-[#4F7655]">03</span>
                <h4 className="font-bold text-[#294D35]">Keuangan Standar Akuntansi</h4>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Bukan sekadar kalkulator kas masuk-keluar biasa. JALORA menghasilkan Neraca dan Laba Rugi berprinsip double-entry yang diakui perbankan dan auditor.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* About Tab: Creator Tribute & Credit */}
        {activeTab === 'about' && (
          <div className="max-w-4xl mx-auto px-6 py-12">
            <div className="bg-white rounded-2xl border border-[#DCE5D6] p-8 lg:p-12 shadow-sm">
              <div className="flex flex-col md:flex-row items-center gap-8">
                {/* Creator Portrait Frame */}
                <div className="w-48 h-64 shrink-0 rounded-xl overflow-hidden border-2 border-[#DCE5D6] shadow-md bg-stone-100 relative">
                  <img
                    src="/assets/aistudio/Gemini_Generated_Image_o4rim4o4rim4o4ri_08f3b9f5.jpeg"
                    alt="Abdul Jalil - Pencipta JALORA"
                    className="w-full h-full object-cover object-top"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }}
                  />
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 text-center">
                    <span className="text-[11px] text-white font-medium">Abdul Jalil</span>
                  </div>
                </div>

                <div className="space-y-4 text-center md:text-left">
                  <div className="inline-block px-3 py-1 bg-[#DCE5D6]/50 text-[#294D35] rounded text-xs font-semibold">
                    Karya & Dedikasi
                  </div>

                  <h2 className="text-2xl lg:text-3xl font-bold text-[#294D35]">
                    Dibuat oleh Abdul Jalil
                  </h2>

                  <p className="text-sm text-stone-700 leading-relaxed">
                    <strong>JALORA (Jalil Integrated Business Platform)</strong> lahir dari semangat untuk memberdayakan para pelaku usaha mikro, kecil, dan menengah (UMKM) hingga jaringan retail multi-cabang di seluruh Indonesia.
                  </p>

                  <p className="text-xs text-stone-600 leading-relaxed">
                    Platform ini dibangun dengan standar rekayasa perangkat lunak modern: arsitektur modular, keamanan data terisolasi per toko, integritas akuntansi double-entry, serta kemudahan operasional harian kasir dan manajer toko.
                  </p>

                  <div className="pt-2 flex flex-wrap gap-4 justify-center md:justify-start text-xs text-stone-500 font-mono">
                    <span>Versi 1.0.0</span>
                    <span>·</span>
                    <span>Google AI Studio Build</span>
                    <span>·</span>
                    <span>Supabase Ready</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Help Tab */}
        {activeTab === 'help' && (
          <div className="max-w-4xl mx-auto px-6 py-12 space-y-8">
            <div>
              <h2 className="text-3xl font-bold text-[#294D35]">Pusat Bantuan & Panduan</h2>
              <p className="text-stone-600 text-sm mt-1">Petunjuk penggunaan cepat untuk menjalankan operasional JALORA di toko Anda.</p>
            </div>

            <div className="space-y-4">
              <div className="bg-white p-5 rounded-xl border border-[#DCE5D6]">
                <h3 className="font-bold text-[#294D35] text-sm mb-1">1. Bagaimana cara memulai toko baru?</h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Klik tombol <strong>Daftar Toko</strong> di pojok kanan atas, masukkan nama dan nomor HP Anda, tentukan nama toko, lalu buat 6-digit PIN transaksi. Toko baru Anda akan langsung aktif dengan saldo Rp0 dan stok 0 tanpa data fiktif.
                </p>
              </div>

              <div className="bg-white p-5 rounded-xl border border-[#DCE5D6]">
                <h3 className="font-bold text-[#294D35] text-sm mb-1">2. Untuk apa PIN Transaksi 6-digit?</h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  PIN transaksi adalah lapisan keamanan khusus manajer/pemilik yang berbeda dari kata sandi akun. PIN ini diwajibkan saat melakukan tindakan sensitif seperti Stok Opname, diskon besar, retur barang, atau penutupan shift kasir.
                </p>
              </div>

              <div className="bg-white p-5 rounded-xl border border-[#DCE5D6]">
                <h3 className="font-bold text-[#294D35] text-sm mb-1">3. Bagaimana cara mencetak struk kasir?</h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Setelah transaksi berhasil di menu Kasir, akan muncul jendela pratinjau struk. Anda dapat memilih ukuran kertas 58mm atau 80mm dan menekan tombol Cetak Struk (menggunakan driver printer browser/sistem) atau membagikan struk langsung via WhatsApp.
                </p>
              </div>

              <div className="bg-white p-5 rounded-xl border border-[#DCE5D6]">
                <h3 className="font-bold text-[#294D35] text-sm mb-1">4. Bagaimana cara menghubungkan ke Supabase Cloud?</h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Buka menu Pengaturan &gt; Supabase & Sinkronisasi. Anda dapat memasukkan Project URL dan Anon Key dari dashboard Supabase Anda, serta menyalin skema SQL lengkap yang sudah kami sediakan untuk membuat seluruh tabel dan kebijakan RLS di database Anda.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-[#DCE5D6] px-6 lg:px-12 py-8 mt-12 text-xs text-stone-500">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#294D35]">JALORA</span>
            <span>—</span>
            <span>Platform Manajemen Bisnis Terpadu</span>
          </div>
          <div className="text-center md:text-right">
            <span>Dibuat oleh <strong>Abdul Jalil</strong>. Satu Sistem, Kendali Seluruh Bisnis.</span>
          </div>
        </div>
      </footer>

      {/* Auth Modal (Login & Multi-Step Register) */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 bg-[rgba(41,77,53,0.55)] backdrop-blur-xs transition-opacity duration-200 ease-out flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl border border-[#DCE5D6] shadow-xl p-6 sm:p-8 relative">
            <button
              onClick={() => {
                setShowAuthModal(false);
                setLoginError('');
                setRegError('');
              }}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 text-sm font-bold p-1"
            >
              ✕
            </button>

            {authMode === 'login' ? (
              <div>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-[#294D35] flex items-center justify-center mx-auto mb-2 p-1.5 shadow-sm border border-[#DCE5D6]">
                    <img
                      src="/assets/aistudio/Logo_Aplikasi_Jalora_Hijau_Modern_d93205db.png"
                      alt="Logo JALORA"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <h3 className="text-xl font-bold text-[#294D35]">Masuk ke JALORA</h3>
                  <p className="text-xs text-stone-500 mt-1">Gunakan nomor HP dan PIN transaksi Anda</p>
                </div>

                {loginError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
                    {loginError}
                  </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Nomor HP Terdaftar
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                      <input
                        type="tel"
                        placeholder="Contoh: 081234567890"
                        value={loginPhone}
                        onChange={(e) => setLoginPhone(e.target.value)}
                        required
                        className="w-full pl-9 pr-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:border-[#4F7655] focus:ring-1 focus:ring-[#4F7655]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      PIN Transaksi (6 Digit)
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                      <input
                        type="password"
                        maxLength={6}
                        placeholder="••••••"
                        value={loginPin}
                        onChange={(e) => setLoginPin(e.target.value.replace(/\D/g, ''))}
                        required
                        className="w-full pl-9 pr-3 py-2 text-sm tracking-widest font-mono border border-stone-300 rounded-lg focus:outline-none focus:border-[#4F7655] focus:ring-1 focus:ring-[#4F7655]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-[#294D35] hover:bg-[#4F7655] text-white font-medium py-2.5 rounded-lg text-sm transition-colors shadow-sm disabled:opacity-50"
                  >
                    {isSubmitting ? 'Memeriksa Kredensial...' : 'Masuk Sekarang'}
                  </button>
                </form>

                <div className="mt-6 pt-4 border-t border-stone-100 flex flex-col gap-2 text-center text-xs text-stone-600">
                  <p>
                    Belum punya akun?{' '}
                    <button
                      onClick={() => {
                        setAuthMode('register');
                        setRegStep(1);
                        setLoginError('');
                      }}
                      className="font-bold text-[#4F7655] hover:underline"
                    >
                      Daftar Toko Baru
                    </button>
                  </p>
                  <p>
                    Ingin mencoba fitur tanpa input data?{' '}
                    <button
                      onClick={startDemoStore}
                      className="font-semibold text-[#294D35] underline hover:text-[#4F7655]"
                    >
                      Buka Akun Demo Cepat
                    </button>
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <div className="text-center mb-5">
                  <div className="w-12 h-12 rounded-xl bg-[#294D35] flex items-center justify-center mx-auto mb-2 p-1 shadow-xs border border-[#DCE5D6]">
                    <img
                      src="/assets/aistudio/Logo_Aplikasi_Jalora_Hijau_Modern_d93205db.png"
                      alt="Logo JALORA"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <h3 className="text-xl font-bold text-[#294D35]">Pendaftaran Toko JALORA</h3>
                  <p className="text-xs text-stone-500 mt-1">Langkah {regStep} dari 3: {regStep === 1 ? 'Data Pemilik' : regStep === 2 ? 'Profil Toko' : 'Keamanan PIN'}</p>
                </div>

                {regError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
                    {regError}
                  </div>
                )}

                <form onSubmit={handleRegister} className="space-y-4">
                  {regStep === 1 && (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-stone-700 mb-1">
                          Nama Lengkap Pemilik
                        </label>
                        <div className="relative">
                          <User className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                          <input
                            type="text"
                            placeholder="Contoh: Budi Prasetyo"
                            value={regName}
                            onChange={(e) => setRegName(e.target.value)}
                            required
                            className="w-full pl-9 pr-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:border-[#4F7655]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-stone-700 mb-1">
                          Nomor Handphone (WhatsApp)
                        </label>
                        <div className="relative">
                          <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                          <input
                            type="tel"
                            placeholder="Contoh: 08123456789"
                            value={regPhone}
                            onChange={(e) => setRegPhone(e.target.value)}
                            required
                            className="w-full pl-9 pr-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:border-[#4F7655]"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {regStep === 2 && (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-stone-700 mb-1">
                          Nama Toko / Usaha
                        </label>
                        <div className="relative">
                          <Store className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                          <input
                            type="text"
                            placeholder="Contoh: Toko Berkah Mandiri"
                            value={regStoreName}
                            onChange={(e) => setRegStoreName(e.target.value)}
                            required
                            className="w-full pl-9 pr-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:border-[#4F7655]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-stone-700 mb-1">
                          Alamat Toko (Kota / Wilayah)
                        </label>
                        <input
                          type="text"
                          placeholder="Contoh: Jl. Sudirman No. 12, Jakarta"
                          value={regStoreAddress}
                          onChange={(e) => setRegStoreAddress(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:border-[#4F7655]"
                        />
                      </div>
                    </>
                  )}

                  {regStep === 3 && (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-stone-700 mb-1">
                          Buat 6-Digit PIN Transaksi
                        </label>
                        <input
                          type="password"
                          maxLength={6}
                          placeholder="••••••"
                          value={regPin}
                          onChange={(e) => setRegPin(e.target.value.replace(/\D/g, ''))}
                          required
                          className="w-full px-3 py-2 text-center text-lg tracking-widest font-mono border border-stone-300 rounded-lg focus:outline-none focus:border-[#4F7655]"
                        />
                        <p className="text-[11px] text-stone-500 mt-1">
                          Digunakan untuk otorisasi opname stok, void kasir, dan penutupan shift.
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-stone-700 mb-1">
                          Ulangi 6-Digit PIN
                        </label>
                        <input
                          type="password"
                          maxLength={6}
                          placeholder="••••••"
                          value={regPinConfirm}
                          onChange={(e) => setRegPinConfirm(e.target.value.replace(/\D/g, ''))}
                          required
                          className="w-full px-3 py-2 text-center text-lg tracking-widest font-mono border border-stone-300 rounded-lg focus:outline-none focus:border-[#4F7655]"
                        />
                      </div>
                    </>
                  )}

                  <div className="flex gap-2 pt-2">
                    {regStep > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setRegStep(regStep - 1);
                          setRegError('');
                        }}
                        className="w-1/3 bg-stone-100 text-stone-700 font-medium py-2 rounded-lg text-xs"
                      >
                        Kembali
                      </button>
                    )}

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 bg-[#294D35] hover:bg-[#4F7655] text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
                    >
                      {regStep < 3 ? 'Lanjutkan' : isSubmitting ? 'Membuat Toko...' : 'Selesaikan Pendaftaran'}
                    </button>
                  </div>
                </form>

                <div className="mt-5 text-center text-xs text-stone-600">
                  Sudah punya akun?{' '}
                  <button
                    onClick={() => {
                      setAuthMode('login');
                      setRegError('');
                    }}
                    className="font-bold text-[#4F7655] hover:underline"
                  >
                    Masuk di sini
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
