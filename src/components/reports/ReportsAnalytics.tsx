/**
 * JALORA — Card-Based Analytics & Laporan Penjualan (Modern Bumble/V20 Redesign)
 * Card-based KPIs: Total Penjualan, Laba Bersih, Total Transaksi, Produk Terlaris,
 * Dynamic Chart with Period Filters (Harian, Mingguan, Bulanan, Tahunan),
 * and 1-Click PDF and Excel Exports.
 * 
 * Created by Abdul Jalil
 */

import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Receipt,
  Boxes,
  Calendar,
  FileSpreadsheet,
  FileText,
  DollarSign,
  ArrowUpRight,
  Sparkles,
  BarChart3,
  CheckCircle2,
  PieChart,
  ShoppingBag,
  Award,
  ArrowDownRight
} from 'lucide-react';
import { Store, Branch, UserProfile, Sale, Product } from '../../types';
import { jaloraStorage } from '../../services/storage';
import { downloadCsv } from '../../utils/exportCsv';
import { downloadSalesReportPdf, downloadFinancialReportPdf } from '../../utils/exportPdf';
import { formatIndonesianDateOnly, formatIndonesianDateTime } from '../../utils/dateFormatter';

export type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

interface ReportsAnalyticsProps {
  store: Store;
  branch: Branch;
  user: UserProfile;
  onNavigate?: (section: string) => void;
}

export const ReportsAnalytics: React.FC<ReportsAnalyticsProps> = ({
  store,
  branch,
  user,
  onNavigate
}) => {
  const [period, setPeriod] = useState<ReportPeriod>('monthly');
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);

  // Fetch sales, products, journals
  const sales = useMemo(() => jaloraStorage.getSales(store.id, branch.id), [store.id, branch.id]);
  const products = useMemo(() => jaloraStorage.getProducts(store.id), [store.id]);
  const journals = useMemo(() => jaloraStorage.getJournalEntries(store.id, branch.id), [store.id, branch.id]);
  const accounts = useMemo(() => jaloraStorage.getAccounts(store.id), [store.id]);

  // Filter sales according to selected period
  const { filteredSales, periodLabel, chartData } = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    let start = new Date();
    let label = 'Hari Ini';

    if (period === 'daily') {
      start.setHours(0, 0, 0, 0);
      label = `Harian (${formatIndonesianDateOnly(now)})`;
    } else if (period === 'weekly') {
      start.setDate(now.getDate() - 7);
      label = '7 Hari Terakhir';
    } else if (period === 'monthly') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      label = `Bulan ${now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`;
    } else if (period === 'yearly') {
      start = new Date(now.getFullYear(), 0, 1);
      label = `Tahun ${now.getFullYear()}`;
    }

    const filtered = sales.filter(s => {
      const saleDate = new Date(s.createdAt);
      return saleDate >= start && s.status === 'completed';
    });

    // Generate chart data intervals
    const chartBars: { label: string; revenue: number; count: number; dateStr: string }[] = [];
    if (period === 'daily') {
      // 24 hour intervals or 6-hour chunks
      for (let h = 8; h <= 22; h += 2) {
        const nextH = h + 2;
        const count = filtered.filter(s => {
          const hours = new Date(s.createdAt).getHours();
          return hours >= h && hours < nextH;
        }).length;
        const rev = filtered
          .filter(s => {
            const hours = new Date(s.createdAt).getHours();
            return hours >= h && hours < nextH;
          })
          .reduce((sum, s) => sum + s.totalAmount, 0);

        chartBars.push({
          label: `${h}:00`,
          revenue: rev,
          count,
          dateStr: `${h}:00 - ${nextH}:00`,
        });
      }
    } else if (period === 'weekly') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dStr = d.toISOString().split('T')[0];
        const daySales = filtered.filter(s => s.createdAt.startsWith(dStr));
        chartBars.push({
          label: d.toLocaleDateString('id-ID', { weekday: 'short' }),
          revenue: daySales.reduce((sum, s) => sum + s.totalAmount, 0),
          count: daySales.length,
          dateStr: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
        });
      }
    } else if (period === 'monthly') {
      // 4 weeks of the month
      for (let w = 1; w <= 4; w++) {
        const startDay = (w - 1) * 7 + 1;
        const endDay = w === 4 ? 31 : w * 7;
        const weekSales = filtered.filter(s => {
          const day = new Date(s.createdAt).getDate();
          return day >= startDay && day <= endDay;
        });
        chartBars.push({
          label: `Mgg ${w}`,
          revenue: weekSales.reduce((sum, s) => sum + s.totalAmount, 0),
          count: weekSales.length,
          dateStr: `Tgl ${startDay} - ${endDay}`,
        });
      }
    } else {
      // 12 months
      for (let m = 0; m < 12; m++) {
        const monthSales = filtered.filter(s => {
          const d = new Date(s.createdAt);
          return d.getMonth() === m && d.getFullYear() === now.getFullYear();
        });
        const mDate = new Date(now.getFullYear(), m, 1);
        chartBars.push({
          label: mDate.toLocaleDateString('id-ID', { month: 'short' }),
          revenue: monthSales.reduce((sum, s) => sum + s.totalAmount, 0),
          count: monthSales.length,
          dateStr: mDate.toLocaleDateString('id-ID', { month: 'long' }),
        });
      }
    }

    return { filteredSales: filtered, periodLabel: label, chartData: chartBars };
  }, [sales, period]);

  // Aggregate Metrics
  const totalRevenue = useMemo(() => {
    return filteredSales.reduce((sum, s) => sum + s.totalAmount, 0);
  }, [filteredSales]);

  const totalTransactions = filteredSales.length;

  const totalHPP = useMemo(() => {
    let cost = 0;
    filteredSales.forEach(s => {
      s.items.forEach(it => {
        const prod = products.find(p => p.id === it.productId);
        const unitCost = prod ? prod.costPrice : (it.unitPrice * 0.7);
        cost += unitCost * it.quantity;
      });
    });
    return cost;
  }, [filteredSales, products]);

  // Estimate operational expenses proportionally from journals in period
  const totalExpenses = useMemo(() => {
    let exp = 0;
    journals.forEach(j => {
      j.lines.forEach(l => {
        const acc = accounts.find(a => a.id === l.accountId);
        if (acc && acc.category === 'expense' && acc.code !== '5-1001') {
          exp += l.debit - l.credit;
        }
      });
    });
    // Proportionate to filtered period if needed
    if (period === 'daily') return Math.round(exp / 30);
    if (period === 'weekly') return Math.round(exp / 4);
    return exp;
  }, [journals, accounts, period]);

  const netProfit = Math.max(0, totalRevenue - totalHPP - totalExpenses);
  const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0';

  // Top Selling Products (Produk Terlaris)
  const topProducts = useMemo(() => {
    const map = new Map<string, { product: Product | undefined; quantity: number; revenue: number }>();

    filteredSales.forEach(s => {
      s.items.forEach(it => {
        const existing = map.get(it.productId);
        if (existing) {
          existing.quantity += it.quantity;
          existing.revenue += it.subtotal;
        } else {
          const prod = products.find(p => p.id === it.productId);
          map.set(it.productId, {
            product: prod,
            quantity: it.quantity,
            revenue: it.subtotal,
          });
        }
      });
    });

    return Array.from(map.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);
  }, [filteredSales, products]);

  // Max value for chart bar height
  const maxRevenueInChart = useMemo(() => {
    const max = Math.max(...chartData.map(c => c.revenue), 0);
    return max > 0 ? max : 1;
  }, [chartData]);

  // Handlers for 1-Click Export
  const handleExportExcel = () => {
    const headers = ['No', 'Nomor Faktur', 'Tanggal Transaksi', 'Kasir / Staff', 'Pelanggan', 'Metode Bayar', 'Jumlah Item', 'Total Transaksi (Rp)'];
    const rows = filteredSales.map((s, idx) => [
      idx + 1,
      s.invoiceNumber,
      formatIndonesianDateTime(new Date(s.createdAt)),
      s.cashierName || 'Kasir',
      s.customerName || 'Pelanggan Umum',
      s.paymentMethod.toUpperCase(),
      s.items.reduce((sum, it) => sum + it.quantity, 0),
      s.totalAmount,
    ]);

    const filename = `Jalora_Laporan_Penjualan_${period}_${branch.code}_${new Date().toISOString().split('T')[0]}.csv`;
    downloadCsv(filename, headers, rows);

    setExportFeedback(`Laporan Excel (${filename}) berhasil diunduh!`);
    setTimeout(() => setExportFeedback(null), 4000);
  };

  const handleExportPdf = () => {
    downloadSalesReportPdf({
      store,
      branch,
      sales: filteredSales,
      periodText: periodLabel,
    });

    setExportFeedback(`Dokumen resmi PDF Laporan Penjualan berhasil diunduh!`);
    setTimeout(() => setExportFeedback(null), 4000);
  };

  return (
    <div className="p-3.5 sm:p-5 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header Banner & Period Filter */}
      <div className="bg-white rounded-3xl border border-[#CECDA9]/60 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#EBE4C2] text-[#294D35] text-[10px] font-bold tracking-wide uppercase">
              Card-Based Analytics
            </span>
            <span className="text-xs text-[#4F7655] font-medium">Cabang: {branch.name}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#294D35] mt-1 tracking-tight">
            Laporan &amp; Analisis Penjualan
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Ringkasan omzet, laba bersih, dan tren performa ritel {periodLabel}.
          </p>
        </div>

        {/* Filter Period Chips: Harian • Mingguan • Bulanan • Tahunan */}
        <div className="flex items-center gap-1.5 p-1 bg-[#EBE4C2]/50 rounded-2xl border border-[#CECDA9]/50 overflow-x-auto no-scrollbar">
          {[
            { id: 'daily', label: 'Harian' },
            { id: 'weekly', label: 'Mingguan' },
            { id: 'monthly', label: 'Bulanan' },
            { id: 'yearly', label: 'Tahunan' },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setPeriod(tab.id as ReportPeriod)}
              className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                period === tab.id
                  ? 'bg-[#294D35] text-white shadow-xs'
                  : 'text-[#294D35] hover:bg-white/70'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Export Action Feedback Banner */}
      {exportFeedback && (
        <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{exportFeedback}</span>
          </div>
          <button
            onClick={() => setExportFeedback(null)}
            className="text-stone-400 hover:text-stone-700 text-xs cursor-pointer font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* 4 Primary Analytics Cards: Total Penjualan • Laba Bersih • Total Transaksi • Rata-rata */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Penjualan */}
        <div className="bg-white rounded-3xl border border-[#CECDA9]/60 p-5 shadow-xs flex flex-col justify-between space-y-3 hover:border-[#4F7655] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">Total Penjualan</span>
            <div className="w-9 h-9 rounded-2xl bg-[#EBE4C2] flex items-center justify-center text-[#294D35]">
              <DollarSign className="w-4 h-4 text-[#4F7655]" />
            </div>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-extrabold text-[#294D35] font-mono tabular-nums leading-none">
              Rp {totalRevenue.toLocaleString('id-ID')}
            </p>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-[#4F7655] font-medium">
              <ArrowUpRight className="w-3.5 h-3.5 text-[#294D35]" />
              <span>Omzet kotor ritel kasir</span>
            </div>
          </div>
        </div>

        {/* Card 2: Laba Bersih */}
        <div className="bg-white rounded-3xl border border-[#CECDA9]/60 p-5 shadow-xs flex flex-col justify-between space-y-3 hover:border-[#4F7655] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">Laba Bersih</span>
            <div className="w-9 h-9 rounded-2xl bg-[#D3D464]/30 flex items-center justify-center text-[#294D35]">
              <TrendingUp className="w-4 h-4 text-[#294D35]" />
            </div>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-extrabold text-[#294D35] font-mono tabular-nums leading-none">
              Rp {netProfit.toLocaleString('id-ID')}
            </p>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-stone-500">
              <span className="font-bold text-[#294D35] bg-[#D3D464]/30 px-1.5 py-0.5 rounded-md font-mono">
                Margin: {profitMargin}%
              </span>
              <span>setelah HPP &amp; beban</span>
            </div>
          </div>
        </div>

        {/* Card 3: Total Transaksi */}
        <div className="bg-white rounded-3xl border border-[#CECDA9]/60 p-5 shadow-xs flex flex-col justify-between space-y-3 hover:border-[#4F7655] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">Total Transaksi</span>
            <div className="w-9 h-9 rounded-2xl bg-[#EBE4C2] flex items-center justify-center text-[#294D35]">
              <Receipt className="w-4 h-4 text-[#4F7655]" />
            </div>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-extrabold text-[#294D35] font-mono tabular-nums leading-none">
              {totalTransactions} <span className="text-base font-semibold text-stone-500">Struk</span>
            </p>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-stone-500">
              <span>Status selesai di POS</span>
            </div>
          </div>
        </div>

        {/* Card 4: Rata-Rata Keranjang */}
        <div className="bg-white rounded-3xl border border-[#CECDA9]/60 p-5 shadow-xs flex flex-col justify-between space-y-3 hover:border-[#4F7655] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">Rata-Rata Belanja</span>
            <div className="w-9 h-9 rounded-2xl bg-[#EBE4C2] flex items-center justify-center text-[#294D35]">
              <ShoppingBag className="w-4 h-4 text-[#4F7655]" />
            </div>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-extrabold text-[#294D35] font-mono tabular-nums leading-none">
              Rp {totalTransactions > 0 ? Math.round(totalRevenue / totalTransactions).toLocaleString('id-ID') : '0'}
            </p>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-stone-500">
              <span>Nilai rata-rata per transaksi</span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Grafik Penjualan & Unduh Laporan CTA */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols): Grafik Penjualan Sederhana */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-[#CECDA9]/60 p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#CECDA9]/40">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#EBE4C2] flex items-center justify-center text-[#294D35]">
                <BarChart3 className="w-4 h-4 text-[#4F7655]" />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-[#294D35]">
                  Grafik Penjualan ({periodLabel})
                </h3>
                <p className="text-[11px] text-stone-500">Tren pemasukan riil faktur kasir</p>
              </div>
            </div>

            {/* Export Buttons: Unduh PDF & Unduh Excel */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportExcel}
                className="px-3 py-1.5 rounded-xl bg-white border border-[#CECDA9] hover:bg-[#EBE4C2]/50 text-[#294D35] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
                title="Unduh data penjualan ke format Excel (CSV)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                <span className="hidden sm:inline">Unduh Excel</span>
              </button>

              <button
                type="button"
                onClick={handleExportPdf}
                className="px-3 py-1.5 rounded-xl bg-[#294D35] hover:bg-[#1e3827] text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
                title="Unduh laporan resmi penjualan ke format PDF"
              >
                <FileText className="w-3.5 h-3.5 text-[#D3D464]" />
                <span className="hidden sm:inline">Unduh PDF</span>
              </button>
            </div>
          </div>

          {/* Dynamic Visual Bars */}
          <div className="space-y-3 pt-2">
            <div className="h-44 sm:h-52 flex items-end justify-between gap-2 sm:gap-3 px-1">
              {chartData.map((bar, idx) => {
                const heightPercent = maxRevenueInChart > 0 ? Math.max(8, Math.round((bar.revenue / maxRevenueInChart) * 100)) : 8;
                return (
                  <div
                    key={idx}
                    className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer relative"
                  >
                    {/* Tooltip */}
                    <div className="opacity-0 group-hover:opacity-100 absolute -top-10 z-10 bg-[#294D35] text-white px-2 py-1 rounded-xl text-[10px] font-mono whitespace-nowrap shadow-md pointer-events-none transition-opacity duration-150">
                      Rp {bar.revenue.toLocaleString('id-ID')} ({bar.count} tx)
                    </div>

                    {/* Bar visual with Bumble/V20 rounded top */}
                    <div className="w-full max-w-[44px] bg-[#EBE4C2]/40 rounded-2xl overflow-hidden flex flex-col justify-end relative h-full border border-[#CECDA9]/30">
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className="w-full rounded-2xl bg-[#294D35] group-hover:bg-[#4F7655] transition-all duration-300"
                      />
                    </div>

                    <div className="text-center mt-2">
                      <span className="block text-[10px] sm:text-[11px] font-bold text-[#294D35]">
                        {bar.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between text-xs text-stone-500 pt-3 border-t border-[#CECDA9]/30 px-1 font-medium">
              <span>Total Periode Terpilih</span>
              <span className="font-mono font-bold text-[#294D35]">Rp {totalRevenue.toLocaleString('id-ID')}</span>
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Produk Terlaris (Top Selling Products) */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-[#CECDA9]/60 p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#CECDA9]/40">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-[#D3D464] fill-[#D3D464]" />
              <h3 className="font-bold text-sm sm:text-base text-[#294D35]">Produk Terlaris</h3>
            </div>
            <span className="text-[10px] font-bold text-[#4F7655] bg-[#EBE4C2] px-2 py-0.5 rounded-lg">
              Top 6
            </span>
          </div>

          <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[300px]">
            {topProducts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-400">
                <Boxes className="w-8 h-8 mb-1 text-stone-300" />
                <p className="text-xs">Belum ada transaksi di periode ini</p>
              </div>
            ) : (
              topProducts.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-[#EBE4C2]/30 rounded-2xl border border-[#CECDA9]/40 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-6 h-6 rounded-xl flex items-center justify-center font-bold text-[11px] shrink-0 ${
                      idx === 0 ? 'bg-[#D3D464] text-[#294D35]' : 'bg-white text-stone-700 border border-[#CECDA9]'
                    }`}>
                      {idx + 1}
                    </div>
                    <div className="truncate">
                      <p className="font-bold text-[#294D35] truncate">
                        {item.product?.name || 'Produk'}
                      </p>
                      <p className="text-[10px] text-stone-500 font-mono">
                        {item.quantity} terjual
                      </p>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-[#294D35] shrink-0">
                    Rp {item.revenue.toLocaleString('id-ID')}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="pt-3 border-t border-[#CECDA9]/40">
            <button
              type="button"
              onClick={() => onNavigate && onNavigate('inventory')}
              className="w-full py-2.5 bg-[#EBE4C2] hover:bg-[#cecaa9]/50 text-[#294D35] rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Boxes className="w-3.5 h-3.5 text-[#4F7655]" />
              <span>Kelola Seluruh Katalog Produk &rarr;</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
