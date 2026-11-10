/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * JALORA — Business Management Platform
 * Integrated Business Management: POS × Finance × Inventory × Multi-Branch
 * Created by Abdul Jalil
 */

import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Boxes,
  Truck,
  Wallet,
  Receipt,
  Settings,
  LogOut,
  Store as StoreIcon,
  Building,
  Menu,
  X,
  Bell,
  ChevronDown,
  Info,
  ShieldCheck,
  UserRound,
  Loader2,
  AlertTriangle,
  BookOpen,
  Printer,
  BarChart3
} from 'lucide-react';
import { Store, Branch, UserProfile } from './types';
import { jaloraStorage } from './services/storage';
import { signOutSupabase } from './services/supabase';
import { PublicLanding } from './components/public/PublicLanding';
import { PosTerminal } from './components/pos/PosTerminal';
import { InventoryManager } from './components/inventory/InventoryManager';
import { PurchasingManager } from './components/purchasing/PurchasingManager';
import { FinanceManager } from './components/finance/FinanceManager';
import { CashReconciliation } from './components/cashier_shift/CashReconciliation';
import { SettingsManager } from './components/settings/SettingsManager';
import { DashboardOverview } from './components/dashboard/DashboardOverview';
import { ReportsAnalytics } from './components/reports/ReportsAnalytics';
import { KnowledgeGuide } from './components/knowledge/KnowledgeGuide';
import { PWAInstallButton } from './components/pwa/PWAInstallButton';
import { OfflineIndicator } from './components/pwa/OfflineIndicator';
import { TransactionToast } from './components/common/TransactionToast';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => jaloraStorage.getCurrentUser());
  const [currentStore, setCurrentStore] = useState<Store | null>(() => jaloraStorage.getCurrentStore());
  const [currentBranch, setCurrentBranch] = useState<Branch | null>(null);
  const [activeSection, setActiveSection] = useState<string>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Logout & Security State
  const [showLogoutModal, setShowLogoutModal] = useState<boolean>(false);
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  // History Guard: Prevent returning to private dashboard via browser back button after logout
  useEffect(() => {
    const handlePopState = () => {
      const activeUser = jaloraStorage.getCurrentUser();
      if (!activeUser && currentUser) {
        setCurrentUser(null);
        setCurrentStore(null);
        setCurrentBranch(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentUser]);

  // Sync branches when currentStore is loaded
  useEffect(() => {
    if (currentStore) {
      const branches = jaloraStorage.getBranches(currentStore.id);
      if (branches.length > 0) {
        const found = branches.find(b => b.id === (currentUser?.branchId || currentStore.defaultBranchId)) || branches[0];
        setCurrentBranch(found);
      }
    }
  }, [currentStore, currentUser, refreshTrigger]);

  const handleLoginSuccess = (user: UserProfile, store: Store) => {
    setCurrentUser(user);
    setCurrentStore(store);
    const branches = jaloraStorage.getBranches(store.id);
    const defaultBranch = branches.find(b => b.id === (user.branchId || store.defaultBranchId)) || branches[0];
    setCurrentBranch(defaultBranch || null);
    setActiveSection('dashboard');
  };

  const handleOpenLogoutModal = () => {
    setLogoutError(null);
    setShowLogoutModal(true);
    setMobileMenuOpen(false);
  };

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    setLogoutError(null);

    try {
      // 1. Sign out from Supabase Auth if client is configured & active
      try {
        await signOutSupabase();
      } catch (sbErr) {
        console.warn('Supabase auth signOut warning:', sbErr);
      }

      // 2. Clear user session in Jalora Storage Engine
      jaloraStorage.clearUserSession();

      // 3. Reset all active session state in React
      setCurrentUser(null);
      setCurrentStore(null);
      setCurrentBranch(null);
      setMobileMenuOpen(false);
      setShowLogoutModal(false);

      // 4. Sanitize browser history state to prevent Back button replay
      if (typeof window !== 'undefined' && window.history?.replaceState) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    } catch (err: any) {
      console.error('Logout error:', err);
      setLogoutError(err?.message || 'Gagal mengakhiri sesi. Silakan coba lagi.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleRefreshData = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleSelectBranch = (branchId: string) => {
    if (!currentStore) return;
    const branches = jaloraStorage.getBranches(currentStore.id);
    const selected = branches.find(b => b.id === branchId);
    if (selected) {
      setCurrentBranch(selected);
      handleRefreshData();
    }
  };

  // If user is not logged in, render the Public Dashboard
  if (!currentUser || !currentStore || !currentBranch) {
    return <PublicLanding onLoginSuccess={handleLoginSuccess} />;
  }

  // Navigation Items
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'operasional' },
    { id: 'pos', label: 'Kasir (POS)', icon: ShoppingCart, group: 'operasional' },
    { id: 'inventory', label: 'Produk & Inventaris', icon: Boxes, group: 'operasional' },
    { id: 'purchasing', label: 'Pembelian & Pemasok', icon: Truck, group: 'operasional' },
    { id: 'finance', label: 'Keuangan & Jurnal', icon: Wallet, group: 'finansial' },
    { id: 'reports', label: 'Laporan & Analisis', icon: BarChart3, group: 'finansial' },
    { id: 'shift', label: 'Rekonsiliasi Kasir', icon: Receipt, group: 'finansial' },
    { id: 'knowledge', label: 'Panduan & Rumus', icon: BookOpen, group: 'bantuan' },
    { id: 'branches', label: 'Cabang Toko', icon: Building, group: 'sistem' },
    { id: 'users', label: 'Pengguna & Peran', icon: UserRound, group: 'sistem' },
    { id: 'printer', label: 'Printer Struk', icon: Printer, group: 'sistem' },
    { id: 'notifications', label: 'Notifikasi & Suara', icon: Bell, group: 'sistem' },
    { id: 'settings', label: 'Pengaturan Sistem', icon: Settings, group: 'sistem' },
    { id: 'about', label: 'Tentang JALORA', icon: Info, group: 'sistem' },
  ];

  return (
    <div className="h-screen h-[100dvh] bg-[#EBE4C2] text-[#294D35] flex flex-col font-sans overflow-hidden">
      <OfflineIndicator />
      <TransactionToast />
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#CECDA9]/60 px-3 sm:px-5 lg:px-8 py-2 sm:py-2.5 flex items-center justify-between gap-2 sm:gap-4 shrink-0 select-none shadow-2xs">
        {/* Left: Mobile Toggle & Brand */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-1.5 sm:p-2 rounded-xl text-stone-700 hover:bg-stone-100 min-h-[38px] min-w-[38px] flex items-center justify-center cursor-pointer shrink-0 transition-colors"
            title="Buka Menu Navigasi"
            aria-label="Menu Navigasi"
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-stone-800" /> : <Menu className="w-5 h-5 text-stone-800" />}
          </button>

          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#294D35] text-white flex items-center justify-center font-bold text-base shadow-xs overflow-hidden border border-[#DCE5D6]/60 shrink-0 p-1">
              <img
                src="/assets/aistudio/Logo_Aplikasi_Jalora_Hijau_Modern_d93205db.png"
                alt="JALORA Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <span className="font-bold text-sm sm:text-base md:text-lg tracking-tight text-[#294D35] leading-none">
              JALORA
            </span>
          </div>
        </div>

        {/* Right: Notifications, Cart POS, Profile & Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* PWA Install Button — Desktop & Tablet only */}
          <PWAInstallButton variant="header" />

          {/* Quick Notification Button */}
          <button
            type="button"
            onClick={() => setActiveSection('notifications')}
            className={`p-2 rounded-xl transition-colors cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center relative shrink-0 ${
              activeSection === 'notifications'
                ? 'bg-[#294D35] text-white shadow-xs'
                : 'text-stone-700 hover:bg-stone-100 hover:text-[#294D35]'
            }`}
            title="Notifikasi & Suara Aplikasi"
            aria-label="Notifikasi"
          >
            <Bell className="w-5 h-5 sm:w-4 sm:h-4 text-stone-700" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#D6BD7A] ring-2 ring-white" />
          </button>

          {/* POS Cart Button — Touch-friendly Icon on Mobile, full CTA on Tablet/Desktop */}
          <button
            type="button"
            onClick={() => setActiveSection('pos')}
            className={`p-2 sm:px-3 sm:py-1.5 rounded-xl cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center gap-1.5 transition-colors shrink-0 ${
              activeSection === 'pos'
                ? 'bg-[#294D35] text-white shadow-xs'
                : 'text-stone-700 hover:bg-stone-100 hover:text-[#294D35] sm:bg-[#294D35] sm:hover:bg-[#1e3827] sm:text-white'
            }`}
            title="Buka Kasir POS"
            aria-label="Kasir POS"
          >
            <ShoppingCart className={`w-5 h-5 sm:w-4 sm:h-4 ${activeSection === 'pos' ? 'text-[#D6BD7A]' : 'sm:text-[#D6BD7A]'}`} />
            <span className="hidden sm:inline text-xs font-semibold">Kasir POS</span>
          </button>

          {/* Profile & User Info */}
          <div className="flex items-center gap-1 sm:gap-2 pl-0.5 sm:pl-2 sm:border-l sm:border-stone-200 shrink-0">
            <button
              type="button"
              onClick={() => setActiveSection('users')}
              className="flex items-center gap-1.5 p-1 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer text-left"
              title={`Profil Pengguna: ${currentUser.name} (${currentUser.role})`}
            >
              <div className="w-8 h-8 rounded-full bg-[#1b2a1e] text-white font-bold text-xs flex items-center justify-center border border-[#DCE5D6] shrink-0 shadow-xs">
                {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'H'}
              </div>
              <div className="text-right hidden md:block">
                <p className="text-xs font-bold text-[#294D35] leading-none truncate max-w-[110px]">{currentUser.name}</p>
                <span className="text-[10px] text-[#4F7655] font-semibold uppercase">{currentUser.role}</span>
              </div>
            </button>

            {/* Logout on Tablet/Desktop */}
            <button
              onClick={handleOpenLogoutModal}
              title="Keluar Akun"
              className="hidden sm:flex p-1.5 rounded-lg text-stone-500 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer min-h-[34px] min-w-[34px] items-center justify-center shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Body with Sidebar + Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Desktop Sidebar (Width 240px - 260px) */}
        <aside className="hidden lg:flex flex-col w-56 xl:w-60 bg-white border-r border-[#DCE5D6] justify-between p-3.5 xl:p-4 shrink-0 overflow-y-auto">
          <div className="space-y-5">
            {/* Store Card snippet */}
            <div className="p-3 bg-[#F5F0E5]/50 rounded-xl border border-[#DCE5D6]">
              <div className="flex items-center justify-between text-xs">
                <span className="text-stone-500">Cabang:</span>
                <span className="font-mono text-[10px] font-bold text-[#4F7655]">{currentBranch.code}</span>
              </div>
              <p className="font-bold text-xs text-[#294D35] mt-0.5 truncate">{currentBranch.name}</p>
            </div>

            {/* Nav Links */}
            <nav className="space-y-1">
              {navItems.map(item => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer min-h-[38px] ${
                      isActive
                        ? 'bg-[#294D35] text-white shadow-xs font-semibold'
                        : 'text-stone-600 hover:text-[#294D35] hover:bg-[#F5F0E5]/40'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#D6BD7A]' : 'text-[#4F7655]'}`} />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Footer Info & Creator Credit */}
          <div className="pt-3 border-t border-[#DCE5D6] text-center space-y-2 shrink-0">
            <PWAInstallButton variant="sidebar" className="w-full" />
            <p className="text-[11px] font-medium text-stone-600">JALORA Platform v1.0</p>
            <p className="text-[10px] text-stone-400">Dibuat oleh <strong className="text-[#294D35]">Abdul Jalil</strong></p>
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden bg-[rgba(41,77,53,0.55)] backdrop-blur-xs transition-opacity duration-200 ease-out flex">
            <div className="w-72 max-w-[85vw] bg-white h-full p-4 flex flex-col justify-between shadow-2xl overflow-y-auto">
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-[#DCE5D6]">
                  <div>
                    <span className="font-bold text-base text-[#294D35]">Menu JALORA</span>
                    <p className="text-[10px] text-stone-500 font-mono">{currentBranch.name} ({currentBranch.code})</p>
                  </div>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1.5 rounded-lg text-stone-500 hover:bg-stone-100 min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <nav className="space-y-1">
                  {navItems.map(item => {
                    const Icon = item.icon;
                    const isActive = activeSection === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveSection(item.id);
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all min-h-[42px] cursor-pointer ${
                          isActive
                            ? 'bg-[#294D35] text-white font-semibold'
                            : 'text-stone-600 hover:bg-[#F5F0E5]/40'
                        }`}
                      >
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#D6BD7A]' : 'text-[#4F7655]'}`} />
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              <div className="pt-4 border-t border-[#DCE5D6] space-y-2 shrink-0">
                <PWAInstallButton variant="sidebar" className="w-full" />
                <button
                  onClick={handleOpenLogoutModal}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors cursor-pointer min-h-[42px]"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Keluar Akun</span>
                </button>
              </div>
            </div>
            <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
          </div>
        )}

        {/* Dynamic Content Viewport with Smooth Transition */}
        <main className={`flex-1 min-h-0 flex flex-col ${activeSection === 'pos' ? 'overflow-hidden h-full' : 'overflow-y-auto'}`}>
          <div key={activeSection} className={`animate-jalora-enter ${activeSection === 'pos' ? 'h-full' : 'min-h-full'}`}>
            {activeSection === 'dashboard' && (
            <DashboardOverview
              store={currentStore}
              branch={currentBranch}
              user={currentUser}
              onNavigate={setActiveSection}
            />
          )}

          {activeSection === 'pos' && (
            <PosTerminal
              store={currentStore}
              branch={currentBranch}
              user={currentUser}
              onRefreshData={handleRefreshData}
            />
          )}

          {activeSection === 'inventory' && (
            <InventoryManager
              store={currentStore}
              branch={currentBranch}
              user={currentUser}
              onRefreshData={handleRefreshData}
            />
          )}

          {activeSection === 'purchasing' && (
            <PurchasingManager
              store={currentStore}
              branch={currentBranch}
              user={currentUser}
              onRefreshData={handleRefreshData}
            />
          )}

          {activeSection === 'finance' && (
            <FinanceManager
              store={currentStore}
              branch={currentBranch}
              user={currentUser}
              onRefreshData={handleRefreshData}
            />
          )}

          {activeSection === 'reports' && (
            <ReportsAnalytics
              store={currentStore}
              branch={currentBranch}
              user={currentUser}
              onNavigate={setActiveSection}
            />
          )}

          {activeSection === 'shift' && (
            <CashReconciliation
              store={currentStore}
              branch={currentBranch}
              user={currentUser}
              onRefreshData={handleRefreshData}
            />
          )}

          {activeSection === 'knowledge' && (
            <KnowledgeGuide
              store={currentStore}
              branch={currentBranch}
              user={currentUser}
              onNavigateMenu={setActiveSection}
            />
          )}

          {['settings', 'branches', 'users', 'printer', 'notifications', 'audit', 'feedback', 'share', 'about'].includes(activeSection) && (
            <SettingsManager
              store={currentStore}
              branch={currentBranch}
              user={currentUser}
              initialTab={activeSection === 'settings' ? 'store' : activeSection}
              onRefreshData={handleRefreshData}
              onSelectBranch={handleSelectBranch}
            />
          )}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Tab Navigation Bar (Bumble/V20 Modern Redesign: Beranda • Kasir • Produk • Laporan • Akun) */}
      <nav
        aria-label="Navigasi Bawah Mobile"
        className="lg:hidden bg-white/95 backdrop-blur-md border-t border-[#CECDA9]/60 px-2 py-1.5 flex items-center justify-around shadow-lg shrink-0 z-30 pb-safe"
      >
        <button
          type="button"
          onClick={() => setActiveSection('dashboard')}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 rounded-2xl transition-all min-h-[46px] cursor-pointer ${
            activeSection === 'dashboard'
              ? 'text-[#294D35] font-extrabold bg-[#EBE4C2]/60 shadow-2xs'
              : 'text-[#4F7655]/70 hover:text-[#294D35]'
          }`}
        >
          <LayoutDashboard className={`w-4 h-4 ${activeSection === 'dashboard' ? 'text-[#294D35]' : 'text-[#4F7655]/70'}`} />
          <span className="text-[10px] tracking-tight mt-0.5">Beranda</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('pos')}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 rounded-2xl transition-all min-h-[46px] cursor-pointer relative ${
            activeSection === 'pos'
              ? 'text-[#294D35] font-extrabold bg-[#EBE4C2]/60 shadow-2xs'
              : 'text-[#4F7655]/70 hover:text-[#294D35]'
          }`}
        >
          <div className="relative">
            <ShoppingCart className={`w-4 h-4 ${activeSection === 'pos' ? 'text-[#294D35]' : 'text-[#4F7655]/70'}`} />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#D3D464]" />
          </div>
          <span className="text-[10px] tracking-tight mt-0.5">Kasir</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('inventory')}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 rounded-2xl transition-all min-h-[46px] cursor-pointer ${
            activeSection === 'inventory'
              ? 'text-[#294D35] font-extrabold bg-[#EBE4C2]/60 shadow-2xs'
              : 'text-[#4F7655]/70 hover:text-[#294D35]'
          }`}
        >
          <Boxes className={`w-4 h-4 ${activeSection === 'inventory' ? 'text-[#294D35]' : 'text-[#4F7655]/70'}`} />
          <span className="text-[10px] tracking-tight mt-0.5">Produk</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('reports')}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 rounded-2xl transition-all min-h-[46px] cursor-pointer ${
            activeSection === 'reports'
              ? 'text-[#294D35] font-extrabold bg-[#EBE4C2]/60 shadow-2xs'
              : 'text-[#4F7655]/70 hover:text-[#294D35]'
          }`}
        >
          <BarChart3 className={`w-4 h-4 ${activeSection === 'reports' ? 'text-[#294D35]' : 'text-[#4F7655]/70'}`} />
          <span className="text-[10px] tracking-tight mt-0.5">Laporan</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('settings')}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 rounded-2xl transition-all min-h-[46px] cursor-pointer ${
            activeSection === 'settings' || ['branches', 'users', 'printer', 'notifications', 'audit', 'about'].includes(activeSection)
              ? 'text-[#294D35] font-extrabold bg-[#EBE4C2]/60 shadow-2xs'
              : 'text-[#4F7655]/70 hover:text-[#294D35]'
          }`}
        >
          <UserRound className={`w-4 h-4 ${activeSection === 'settings' ? 'text-[#294D35]' : 'text-[#4F7655]/70'}`} />
          <span className="text-[10px] tracking-tight mt-0.5">Akun</span>
        </button>
      </nav>

      {/* JALORA Logout Confirmation & Execution Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 bg-[rgba(41,77,53,0.55)] backdrop-blur-xs transition-opacity duration-200 ease-out flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-md w-full border border-[#DCE5D6] shadow-2xl flex flex-col max-h-[90dvh] my-auto overflow-hidden animate-jalora-enter relative">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-stone-100 flex items-start justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center border border-red-200 shrink-0">
                  <LogOut className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#294D35]">Konfirmasi Keluar Akun</h3>
                  <p className="text-xs text-stone-500">Amankan sesi aktif JALORA Anda</p>
                </div>
              </div>
              {!isLoggingOut && (
                <button
                  onClick={() => setShowLogoutModal(false)}
                  className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 min-h-0">
              {/* Active User Card */}
              <div className="p-3 bg-[#F5F0E5]/40 rounded-xl border border-[#DCE5D6] flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-stone-500 font-medium">Sesi Pengguna Saat Ini</p>
                  <p className="text-sm font-bold text-[#294D35]">{currentUser.name}</p>
                  <p className="text-[11px] text-stone-500 mt-0.5">{currentStore.name} • {currentBranch.name}</p>
                </div>
                <span className="px-2.5 py-1 text-[10px] font-bold uppercase rounded-lg bg-[#294D35] text-white tracking-wide">
                  {currentUser.role}
                </span>
              </div>

              {logoutError && (
                <div className="p-3 bg-red-50 rounded-xl border border-red-200 flex items-start gap-2.5 text-xs text-red-700">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                  <div>
                    <p className="font-semibold">Catatan Proses Logout</p>
                    <p className="mt-0.5">{logoutError}</p>
                  </div>
                </div>
              )}

              <p className="text-xs text-stone-600 leading-relaxed">
                Apakah Anda yakin ingin keluar dari sesi aplikasi?
                <strong className="block text-[#294D35] font-medium mt-1">
                  Seluruh data transaksi kasir, katalog produk, stok gudang, dan laporan akuntansi tetap tersimpan aman di database.
                </strong>
              </p>
            </div>

            {/* Modal Actions */}
            <div className="p-3.5 sm:p-4 bg-stone-50 border-t border-stone-100 flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                disabled={isLoggingOut}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-200/60 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                disabled={isLoggingOut}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoggingOut ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Memproses Keluar...</span>
                  </>
                ) : (
                  <>
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Ya, Keluar Akun</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
