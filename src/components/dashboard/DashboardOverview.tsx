/**
 * JALORA — Modern Dashboard / Beranda (Bumble/V20 Redesign)
 * Visual Hierarchy:
 * 1. Greeting + Profile
 * 2. Saldo/Kas Utama
 * 3. Quick Actions Rounded Cards: Kasir • Produk • Pembelian • Keuangan
 * 4. Ringkasan Hari Ini: Penjualan • Transaksi • Laba
 * 5. Grafik Penjualan Sederhana
 * 6. Aktivitas / Transaksi Terbaru
 * 
 * Created by Abdul Jalil
 */

import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Boxes,
  Truck,
  Wallet,
  Receipt,
  TrendingUp,
  Clock,
  ArrowRight,
  Plus,
  ArrowUpRight,
  Building,
  Sparkles,
  BarChart3,
  Calendar,
  X,
  CreditCard,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  DollarSign
} from 'lucide-react';
import { Store, Branch, UserProfile, Sale, PaymentMethod } from '../../types';
import { jaloraStorage } from '../../services/storage';

export const getFriendlyPaymentLabel = (method: PaymentMethod | string): string => {
  switch (method) {
    case 'cash':
      return 'Tunai';
    case 'transfer':
      return 'Transfer Bank';
    case 'qris':
      return 'QRIS';
    case 'ewallet':
      return 'E-Wallet';
    case 'debit_card':
      return 'Kartu Debit';
    case 'credit_card':
      return 'Kartu Kredit';
    default:
      return typeof method === 'string' && method ? method : 'Tunai';
  }
};

export const formatTransactionTimeShort = (isoString: string): string => {
  try {
    const d = new Date(isoString);
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch {
    return '00:00';
  }
};

interface DashboardOverviewProps {
  store: Store;
  branch: Branch;
  user: UserProfile;
  onNavigate: (section: string) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  store,
  branch,
  user,
  onNavigate
}) => {
  const sales = useMemo(() => jaloraStorage.getSales(store.id, branch.id), [store.id, branch.id]);
  const products = useMemo(() => jaloraStorage.getProducts(store.id), [store.id]);
  const accounts = useMemo(() => jaloraStorage.getAccounts(store.id), [store.id]);
  const journals = useMemo(() => jaloraStorage.getJournalEntries(store.id, branch.id), [store.id, branch.id]);
  const activeSession = useMemo(() => jaloraStorage.getActiveCashSession(store.id, branch.id), [store.id, branch.id]);
  const [selectedSaleDetail, setSelectedSaleDetail] = useState<{ sale: Sale; index: number } | null>(null);
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  // Today Date String
  const todayDateStr = new Date().toISOString().split('T')[0];
  const todayFormattedDate = useMemo(() => {
    return new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }, []);

  // Today Sales & Metrics
  const todaySales = useMemo(() => {
    return sales.filter(s => s.createdAt.startsWith(todayDateStr) && s.status === 'completed');
  }, [sales, todayDateStr]);

  const todayRevenue = useMemo(() => {
    return todaySales.reduce((sum, s) => sum + s.totalAmount, 0);
  }, [todaySales]);

  // Today HPP / Cost of Goods Sold
  const todayHPP = useMemo(() => {
    let totalHPP = 0;
    todaySales.forEach(s => {
      s.items.forEach(it => {
        totalHPP += it.quantity * it.costPrice;
      });
    });
    return totalHPP;
  }, [todaySales]);

  // Estimated Gross / Net Profit today
  const todayEstimatedProfit = useMemo(() => {
    return Math.max(0, todayRevenue - todayHPP);
  }, [todayRevenue, todayHPP]);

  const profitMarginPercent = useMemo(() => {
    return todayRevenue > 0 ? ((todayEstimatedProfit / todayRevenue) * 100).toFixed(0) : '0';
  }, [todayRevenue, todayEstimatedProfit]);

  // Primary Saldo Kas / Liquid Balance Calculation
  const mainCashBalance = useMemo(() => {
    let cash = 0;
    journals.forEach(j => {
      j.lines.forEach(l => {
        const acc = accounts.find(a => a.id === l.accountId);
        if (acc && (acc.code === '1-1001' || acc.code === '1-1002')) {
          cash += l.debit - l.credit;
        }
      });
    });

    if (activeSession && activeSession.status === 'open') {
      cash += activeSession.openingCash;
    }

    // Default friendly positive display if brand new
    return Math.max(cash, activeSession ? activeSession.openingCash : 0);
  }, [journals, accounts, activeSession]);

  // 7-Day Real Sales Trend Data
  const last7DaysData = useMemo(() => {
    const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const days: { dateStr: string; label: string; fullDate: string; revenue: number; count: number }[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = dayNames[d.getDay()];
      const fullDate = `${d.getDate()} ${['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'][d.getMonth()]}`;

      const daySales = sales.filter(s => s.createdAt.startsWith(dateStr) && s.status === 'completed');
      const rev = daySales.reduce((acc, curr) => acc + curr.totalAmount, 0);

      days.push({
        dateStr,
        label: dayLabel,
        fullDate,
        revenue: rev,
        count: daySales.length
      });
    }
    return days;
  }, [sales]);

  const max7DayRevenue = useMemo(() => {
    const max = Math.max(...last7DaysData.map(d => d.revenue), 100000);
    return max;
  }, [last7DaysData]);

  // Recent 5 Transactions for Activity Feed
  const recentSales = useMemo(() => {
    return [...sales]
      .filter(s => s.status === 'completed')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [sales]);

  return (
    <div className="p-3.5 sm:p-5 lg:p-8 space-y-5 sm:space-y-6 max-w-7xl mx-auto w-full">
      {/* ============================================================== */}
      {/* 1. GREETING + PROFILE HIERARCHY                                */}
      {/* ============================================================== */}
      <div className="bg-white rounded-3xl border border-[#CECDA9]/60 p-4 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#294D35] flex items-center justify-center text-white font-bold text-lg shadow-xs border border-[#CECDA9]/60 shrink-0">
            {user.name ? user.name.charAt(0).toUpperCase() : 'J'}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#4F7655]">
              <span className="px-2.5 py-0.5 rounded-full bg-[#EBE4C2] text-[#294D35] text-[10px] font-bold tracking-wide uppercase">
                {user.role}
              </span>
              <span>•</span>
              <span className="truncate">{branch.name}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#294D35] mt-1 tracking-tight truncate">
              Halo, {user.name} 👋
            </h1>
            <p className="text-xs text-stone-500 mt-0.5">
              {todayFormattedDate} • {store.name}
            </p>
          </div>
        </div>

        {/* Quick Shift Status Badge */}
        <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('shift')}
            className={`px-3.5 py-2 rounded-2xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-2 shadow-xs ${
              activeSession
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
            }`}
          >
            <Clock className="w-4 h-4 text-[#4F7655]" />
            <span>{activeSession ? 'Shift Kasir Aktif' : 'Shift Kasir Tutup'}</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. SALDO / KAS UTAMA (HERO ROUNDED CARD)                       */}
      {/* ============================================================== */}
      <div className="bg-[#294D35] text-white rounded-3xl p-5 sm:p-7 shadow-md relative overflow-hidden flex flex-col justify-between space-y-4">
        {/* Decorative soft glow */}
        <div className="absolute -right-10 -bottom-10 w-48 h-48 rounded-full bg-[#4F7655]/40 blur-2xl pointer-events-none" />

        <div className="flex items-start justify-between relative z-10">
          <div>
            <span className="text-[11px] sm:text-xs font-semibold tracking-wider text-[#D3D464] uppercase block">
              Saldo &amp; Kas Utama
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold font-mono tabular-nums mt-1 text-white tracking-tight">
              Rp {mainCashBalance.toLocaleString('id-ID')}
            </h2>
            <p className="text-xs text-[#EBE4C2]/80 mt-1">
              Likuiditas kas laci toko &amp; rekening operasional {branch.name}
            </p>
          </div>

          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-white/10 backdrop-blur-xs flex items-center justify-center text-[#D3D464] shrink-0 border border-white/10">
            <Wallet className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        {/* Action Buttons inside Hero Card */}
        <div className="pt-2 flex flex-wrap items-center gap-2.5 relative z-10">
          <button
            type="button"
            onClick={() => onNavigate('pos')}
            className="px-4 py-2.5 rounded-2xl bg-[#D3D464] hover:bg-[#c4c553] text-[#294D35] text-xs font-bold flex items-center gap-2 transition-all shadow-xs active:scale-98 cursor-pointer"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Buka Kasir (POS)</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('shift')}
            className="px-4 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer backdrop-blur-xs active:scale-98"
          >
            <Receipt className="w-4 h-4 text-[#D3D464]" />
            <span>Rekonsiliasi Kasir</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('finance')}
            className="px-4 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer backdrop-blur-xs active:scale-98"
          >
            <TrendingUp className="w-4 h-4 text-[#D3D464]" />
            <span>Laporan Keuangan</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. QUICK ACTIONS BERBENTUK ROUNDED CARDS                       */}
      {/*    Kasir • Produk • Pembelian • Keuangan                        */}
      {/* ============================================================== */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#4F7655]">
            Aksi Cepat
          </h3>
          <span className="text-[11px] text-stone-500">Menu Prioritas</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Kasir */}
          <button
            type="button"
            onClick={() => onNavigate('pos')}
            className="p-4 sm:p-5 bg-white rounded-3xl border border-[#CECDA9]/60 hover:border-[#294D35] hover:shadow-xs text-left transition-all group cursor-pointer flex flex-col justify-between space-y-3"
          >
            <div className="w-10 h-10 rounded-2xl bg-[#294D35] text-[#D3D464] flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm sm:text-base text-[#294D35] leading-tight">
                Kasir (POS)
              </h4>
              <p className="text-[11px] text-stone-500 mt-1 line-clamp-1">
                Transaksi penjualan &amp; struk
              </p>
            </div>
          </button>

          {/* Produk */}
          <button
            type="button"
            onClick={() => onNavigate('inventory')}
            className="p-4 sm:p-5 bg-white rounded-3xl border border-[#CECDA9]/60 hover:border-[#294D35] hover:shadow-xs text-left transition-all group cursor-pointer flex flex-col justify-between space-y-3"
          >
            <div className="w-10 h-10 rounded-2xl bg-[#EBE4C2] text-[#294D35] flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
              <Boxes className="w-5 h-5 text-[#4F7655]" />
            </div>
            <div>
              <h4 className="font-bold text-sm sm:text-base text-[#294D35] leading-tight">
                Katalog Produk
              </h4>
              <p className="text-[11px] text-stone-500 mt-1 line-clamp-1">
                {products.length} item aktif • Stok minim
              </p>
            </div>
          </button>

          {/* Pembelian */}
          <button
            type="button"
            onClick={() => onNavigate('purchasing')}
            className="p-4 sm:p-5 bg-white rounded-3xl border border-[#CECDA9]/60 hover:border-[#294D35] hover:shadow-xs text-left transition-all group cursor-pointer flex flex-col justify-between space-y-3"
          >
            <div className="w-10 h-10 rounded-2xl bg-[#EBE4C2] text-[#294D35] flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
              <Truck className="w-5 h-5 text-[#4F7655]" />
            </div>
            <div>
              <h4 className="font-bold text-sm sm:text-base text-[#294D35] leading-tight">
                Pembelian
              </h4>
              <p className="text-[11px] text-stone-500 mt-1 line-clamp-1">
                Kulakan barang &amp; pemasok
              </p>
            </div>
          </button>

          {/* Keuangan */}
          <button
            type="button"
            onClick={() => onNavigate('finance')}
            className="p-4 sm:p-5 bg-white rounded-3xl border border-[#CECDA9]/60 hover:border-[#294D35] hover:shadow-xs text-left transition-all group cursor-pointer flex flex-col justify-between space-y-3"
          >
            <div className="w-10 h-10 rounded-2xl bg-[#EBE4C2] text-[#294D35] flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
              <Wallet className="w-5 h-5 text-[#4F7655]" />
            </div>
            <div>
              <h4 className="font-bold text-sm sm:text-base text-[#294D35] leading-tight">
                Keuangan &amp; Jurnal
              </h4>
              <p className="text-[11px] text-stone-500 mt-1 line-clamp-1">
                Arus kas, laba rugi &amp; neraca
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 4. RINGKASAN HARI INI: PENJUALAN • TRANSAKSI • LABA            */}
      {/* ============================================================== */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#4F7655]">
            Ringkasan Hari Ini
          </h3>
          <span className="text-[11px] text-stone-500 font-mono">Real-time</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {/* Penjualan Hari Ini */}
          <div className="bg-white rounded-3xl border border-[#CECDA9]/60 p-5 shadow-xs flex flex-col justify-between space-y-2 hover:border-[#4F7655] transition-all">
            <div className="flex items-center justify-between text-stone-500 text-xs">
              <span className="font-bold uppercase tracking-wider text-[#294D35]">Penjualan</span>
              <div className="w-8 h-8 rounded-2xl bg-[#EBE4C2] flex items-center justify-center text-[#294D35]">
                <DollarSign className="w-4 h-4 text-[#4F7655]" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-[#294D35] font-mono tabular-nums">
              Rp {todayRevenue.toLocaleString('id-ID')}
            </p>
            <div className="text-[11px] text-stone-500">
              Total omzet kotor hari ini
            </div>
          </div>

          {/* Transaksi Hari Ini */}
          <div className="bg-white rounded-3xl border border-[#CECDA9]/60 p-5 shadow-xs flex flex-col justify-between space-y-2 hover:border-[#4F7655] transition-all">
            <div className="flex items-center justify-between text-stone-500 text-xs">
              <span className="font-bold uppercase tracking-wider text-[#294D35]">Transaksi</span>
              <div className="w-8 h-8 rounded-2xl bg-[#EBE4C2] flex items-center justify-center text-[#294D35]">
                <Receipt className="w-4 h-4 text-[#4F7655]" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-[#294D35] font-mono tabular-nums">
              {todaySales.length} <span className="text-sm font-semibold text-stone-500">Struk</span>
            </p>
            <div className="text-[11px] text-stone-500">
              Rata-rata: <strong className="text-[#294D35] font-mono">Rp {todaySales.length > 0 ? Math.round(todayRevenue / todaySales.length).toLocaleString('id-ID') : '0'}</strong>
            </div>
          </div>

          {/* Estimasi Laba Hari Ini */}
          <div className="bg-white rounded-3xl border border-[#CECDA9]/60 p-5 shadow-xs flex flex-col justify-between space-y-2 hover:border-[#4F7655] transition-all">
            <div className="flex items-center justify-between text-stone-500 text-xs">
              <span className="font-bold uppercase tracking-wider text-[#294D35]">Estimasi Laba</span>
              <div className="w-8 h-8 rounded-2xl bg-[#D3D464]/30 flex items-center justify-center text-[#294D35]">
                <TrendingUp className="w-4 h-4 text-[#294D35]" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-[#294D35] font-mono tabular-nums">
              Rp {todayEstimatedProfit.toLocaleString('id-ID')}
            </p>
            <div className="text-[11px] text-stone-500 flex items-center gap-1">
              <span className="font-bold text-[#294D35] bg-[#D3D464]/30 px-1 rounded font-mono">
                {profitMarginPercent}%
              </span>
              <span>setelah HPP barang</span>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 5. GRAFIK PENJUALAN SEDERHANA                                  */}
      {/* ============================================================== */}
      <div className="bg-white rounded-3xl border border-[#CECDA9]/60 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#CECDA9]/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-2xl bg-[#EBE4C2] flex items-center justify-center text-[#294D35]">
              <BarChart3 className="w-4 h-4 text-[#4F7655]" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-[#294D35]">
                Grafik Penjualan 7 Hari Terakhir
              </h3>
              <p className="text-[11px] text-stone-500">Omzet transaksi kasir cabang {branch.code}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('reports')}
            className="text-xs font-bold text-[#4F7655] hover:text-[#294D35] flex items-center gap-1 cursor-pointer"
          >
            <span>Analisis Lengkap</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Dynamic visual bars */}
        <div className="space-y-3 pt-1">
          <div className="h-44 sm:h-52 flex items-end justify-between gap-2 sm:gap-3 px-1">
            {last7DaysData.map((day, idx) => {
              const heightPercent = max7DayRevenue > 0 ? Math.max(8, Math.round((day.revenue / max7DayRevenue) * 100)) : 8;
              const isToday = idx === last7DaysData.length - 1;
              const isHovered = hoveredDay === idx;

              return (
                <div
                  key={day.dateStr}
                  className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer relative"
                  onMouseEnter={() => setHoveredDay(idx)}
                  onMouseLeave={() => setHoveredDay(null)}
                >
                  {/* Tooltip on hover */}
                  {(isHovered || isToday) && (
                    <div className="absolute -top-10 z-10 bg-[#294D35] text-white px-2 py-1 rounded-xl text-[10px] font-mono whitespace-nowrap shadow-md pointer-events-none animate-in fade-in duration-100">
                      Rp {day.revenue.toLocaleString('id-ID')} ({day.count} tx)
                    </div>
                  )}

                  {/* Rounded Pill Bar */}
                  <div className="w-full max-w-[42px] bg-[#EBE4C2]/40 rounded-2xl overflow-hidden flex flex-col justify-end relative h-full border border-[#CECDA9]/30">
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full rounded-2xl transition-all duration-300 ease-out ${
                        isToday ? 'bg-[#294D35]' : 'bg-[#4F7655]/85 hover:bg-[#4F7655]'
                      } ${isHovered ? 'brightness-105' : ''}`}
                    />
                  </div>

                  <div className="text-center mt-2">
                    <span className={`block text-[11px] font-bold ${isToday ? 'text-[#294D35]' : 'text-stone-500'}`}>
                      {day.label}
                    </span>
                    <span className="block text-[9px] text-stone-400 font-mono">
                      {day.fullDate}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 6. AKTIVITAS / TRANSAKSI TERBARU                               */}
      {/* ============================================================== */}
      <div className="bg-white rounded-3xl border border-[#CECDA9]/60 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#CECDA9]/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-2xl bg-[#EBE4C2] flex items-center justify-center text-[#294D35]">
              <Receipt className="w-4 h-4 text-[#4F7655]" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-[#294D35]">
                Aktivitas Transaksi Terbaru
              </h3>
              <p className="text-[11px] text-stone-500">5 transaksi terakhir yang tercatat di kasir</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('pos')}
            className="text-xs font-bold text-[#4F7655] hover:text-[#294D35] flex items-center gap-1 cursor-pointer"
          >
            <span>Riwayat Struk</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentSales.length === 0 ? (
          <div className="p-8 text-center text-stone-400">
            <Receipt className="w-10 h-10 mx-auto mb-2 text-stone-300" />
            <p className="text-xs">Belum ada transaksi di cabang ini</p>
            <button
              onClick={() => onNavigate('pos')}
              className="mt-3 px-4 py-2 bg-[#294D35] text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              Mulai Transaksi Pertama
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {recentSales.map((sale, idx) => (
              <div
                key={sale.id}
                onClick={() => setSelectedSaleDetail({ sale, index: idx + 1 })}
                className="p-3.5 bg-[#EBE4C2]/30 hover:bg-[#EBE4C2]/60 rounded-2xl border border-[#CECDA9]/40 flex items-center justify-between gap-3 text-xs transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-2xl bg-white border border-[#CECDA9] flex items-center justify-center font-bold text-[#294D35] shrink-0">
                    <Receipt className="w-4 h-4 text-[#4F7655]" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-[#294D35] truncate group-hover:text-[#4F7655]">
                      {sale.invoiceNumber}
                    </p>
                    <p className="text-[10px] text-stone-500">
                      {formatTransactionTimeShort(sale.createdAt)} WIB • {sale.customerName || 'Pelanggan Umum'} • {sale.items.length} item
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="font-extrabold text-[#294D35] font-mono tabular-nums text-xs sm:text-sm">
                    Rp {sale.totalAmount.toLocaleString('id-ID')}
                  </p>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white border border-[#CECDA9] text-[#4F7655] uppercase">
                    {getFriendlyPaymentLabel(sale.paymentMethod)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Transaction Detail Modal */}
      {selectedSaleDetail && createPortal(
        <div className="fixed inset-0 z-50 bg-[rgba(41,77,53,0.55)] backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-3xl border border-[#CECDA9] shadow-2xl overflow-hidden flex flex-col my-auto max-h-[90vh]">
            <div className="bg-[#294D35] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-base text-white">Detail Transaksi</h3>
                <p className="text-xs text-[#EBE4C2]/90 font-mono">{selectedSaleDetail.sale.invoiceNumber}</p>
              </div>
              <button
                onClick={() => setSelectedSaleDetail(null)}
                className="p-1 rounded-xl hover:bg-white/10 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="p-3 bg-[#EBE4C2]/30 rounded-2xl border border-[#CECDA9]/50 space-y-1">
                <div className="flex justify-between text-stone-600">
                  <span>Waktu:</span>
                  <span className="font-medium text-stone-800">{new Date(selectedSaleDetail.sale.createdAt).toLocaleDateString('id-ID')} {formatTransactionTimeShort(selectedSaleDetail.sale.createdAt)} WIB</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Metode:</span>
                  <span className="font-bold text-[#294D35]">{getFriendlyPaymentLabel(selectedSaleDetail.sale.paymentMethod)}</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Kasir:</span>
                  <span className="font-medium">{selectedSaleDetail.sale.cashierName || 'Kasir'}</span>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-xs text-[#294D35] mb-2">Item Belanja ({selectedSaleDetail.sale.items.length}):</h4>
                <div className="border border-stone-200 rounded-2xl divide-y divide-stone-100 max-h-48 overflow-y-auto bg-white">
                  {selectedSaleDetail.sale.items.map((it, idx) => (
                    <div key={idx} className="p-2.5 flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-stone-800">{it.productName}</p>
                        <p className="text-[10px] text-stone-500 font-mono">{it.quantity} × Rp {it.unitPrice.toLocaleString('id-ID')}</p>
                      </div>
                      <span className="font-mono font-bold text-stone-800">Rp {it.subtotal.toLocaleString('id-ID')}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3.5 bg-[#EBE4C2]/40 rounded-2xl border border-[#CECDA9]/60 space-y-1">
                <div className="flex justify-between text-stone-600">
                  <span>Subtotal:</span>
                  <span className="font-mono">Rp {selectedSaleDetail.sale.subtotal.toLocaleString('id-ID')}</span>
                </div>
                {selectedSaleDetail.sale.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Diskon:</span>
                    <span className="font-mono">-Rp {selectedSaleDetail.sale.discountAmount.toLocaleString('id-ID')}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-[#CECDA9] flex justify-between items-center text-sm font-bold text-[#294D35]">
                  <span>Total Bayar:</span>
                  <span className="font-mono text-base">Rp {selectedSaleDetail.sale.totalAmount.toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>

            <div className="p-3.5 bg-stone-50 border-t border-stone-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setSelectedSaleDetail(null)}
                className="px-5 py-2.5 bg-[#294D35] text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
