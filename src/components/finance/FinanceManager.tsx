/**
 * JALORA — Double-Entry Finance & Accounting Module
 * General Journal, General Ledger, Profit & Loss, Balance Sheet, Chart of Accounts, and Payables/Receivables
 * Created by Abdul Jalil
 */

import React, { useState, useMemo } from 'react';
import {
  Wallet,
  FileSpreadsheet,
  BookOpen,
  Scale,
  PieChart,
  Plus,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Receipt,
  CreditCard,
  Download,
  FileText
} from 'lucide-react';
import { Account, JournalEntry, JournalLine, ReceivablePayable, Store, Branch, UserProfile } from '../../types';
import { jaloraStorage } from '../../services/storage';
import { formatIndonesianDateTime } from '../../utils/dateFormatter';
import { downloadCsv } from '../../utils/exportCsv';
import { downloadFinancialReportPdf } from '../../utils/exportPdf';

interface FinanceManagerProps {
  store: Store;
  branch: Branch;
  user: UserProfile;
  onRefreshData?: () => void;
}

export const FinanceManager: React.FC<FinanceManagerProps> = ({ store, branch, user, onRefreshData }) => {
  const [activeTab, setActiveTab] = useState<'reports' | 'journal' | 'ledger' | 'receivables_payables' | 'accounts'>('reports');
  const [reportType, setReportType] = useState<'pnl' | 'balance_sheet' | 'cashflow'>('pnl');

  // Modals
  const [showManualJournalModal, setShowManualJournalModal] = useState(false);
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [settlementItem, setSettlementItem] = useState<ReceivablePayable | null>(null);
  const [settlementAmount, setSettlementAmount] = useState<number>(0);
  const [settlementMethod, setSettlementMethod] = useState<'cash' | 'bank'>('cash');

  // Manual Journal Form State
  const [journalDate, setJournalDate] = useState(new Date().toISOString().split('T')[0]);
  const [journalDesc, setJournalDesc] = useState('');
  const [journalLines, setJournalLines] = useState<{ accountId: string; debit: number; credit: number }[]>([
    { accountId: '', debit: 0, credit: 0 },
    { accountId: '', debit: 0, credit: 0 },
  ]);
  const [journalError, setJournalError] = useState('');

  // Ledger Filter
  const [selectedLedgerAccountId, setSelectedLedgerAccountId] = useState<string>('');
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);

  // Load Data
  const accounts = useMemo(() => jaloraStorage.getAccounts(store.id), [store.id]);
  const journals = useMemo(() => jaloraStorage.getJournalEntries(store.id), [store.id, showManualJournalModal, showSettlementModal]);
  const receivables = useMemo(() => jaloraStorage.getReceivablesPayables(store.id, 'receivable'), [store.id, showSettlementModal]);
  const payables = useMemo(() => jaloraStorage.getReceivablesPayables(store.id, 'payable'), [store.id, showSettlementModal]);

  // Set default ledger account
  React.useEffect(() => {
    if (!selectedLedgerAccountId && accounts.length > 0) {
      setSelectedLedgerAccountId(accounts[0].id);
    }
  }, [accounts, selectedLedgerAccountId]);

  // General Ledger Computation for selected account
  const ledgerEntries = useMemo(() => {
    if (!selectedLedgerAccountId) return [];
    const acc = accounts.find(a => a.id === selectedLedgerAccountId);
    if (!acc) return [];

    let runningBalance = 0;
    const list: {
      date: string;
      entryNumber: string;
      description: string;
      debit: number;
      credit: number;
      balance: number;
    }[] = [];

    // Sort journals ascending for running balance
    const sortedJournals = [...journals].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    sortedJournals.forEach(j => {
      j.lines.forEach(line => {
        if (line.accountId === selectedLedgerAccountId) {
          if (acc.normalBalance === 'debit') {
            runningBalance += line.debit - line.credit;
          } else {
            runningBalance += line.credit - line.debit;
          }
          list.push({
            date: j.date,
            entryNumber: j.entryNumber,
            description: j.description,
            debit: line.debit,
            credit: line.credit,
            balance: runningBalance,
          });
        }
      });
    });

    return list.reverse(); // Display latest first
  }, [journals, selectedLedgerAccountId, accounts]);

  // Financial Calculations for Reports
  const financialSummary = useMemo(() => {
    let totalRevenue = 0;
    let totalHPP = 0;
    let totalExpense = 0;
    let kasBalance = 0;
    let bankBalance = 0;
    let piutangBalance = 0;
    let persediaanBalance = 0;
    let utangBalance = 0;
    let modalBalance = 0;

    journals.forEach(j => {
      j.lines.forEach(l => {
        const acc = accounts.find(a => a.id === l.accountId);
        if (!acc) return;

        // P&L
        if (acc.category === 'revenue') {
          totalRevenue += l.credit - l.debit;
        } else if (acc.code === '5-1001') {
          totalHPP += l.debit - l.credit;
        } else if (acc.category === 'expense' && acc.code !== '5-1001') {
          totalExpense += l.debit - l.credit;
        }

        // Balance Sheet Assets
        if (acc.code === '1-1001') kasBalance += l.debit - l.credit;
        if (acc.code === '1-1002') bankBalance += l.debit - l.credit;
        if (acc.code === '1-1003') piutangBalance += l.debit - l.credit;
        if (acc.code === '1-1004') persediaanBalance += l.debit - l.credit;

        // Balance Sheet Liabilities & Equity
        if (acc.code.startsWith('2-')) utangBalance += l.credit - l.debit;
        if (acc.code === '3-1001') modalBalance += l.credit - l.debit;
      });
    });

    const grossProfit = totalRevenue - totalHPP;
    const netProfit = grossProfit - totalExpense;
    const totalAssets = kasBalance + bankBalance + piutangBalance + persediaanBalance;
    const totalLiabilitiesAndEquity = utangBalance + modalBalance + netProfit;

    return {
      totalRevenue,
      totalHPP,
      grossProfit,
      totalExpense,
      netProfit,
      kasBalance,
      bankBalance,
      piutangBalance,
      persediaanBalance,
      totalAssets,
      utangBalance,
      modalBalance,
      totalLiabilitiesAndEquity,
    };
  }, [journals, accounts]);

  // Add Manual Journal Line
  const handleAddJournalLine = () => {
    setJournalLines([...journalLines, { accountId: accounts[0]?.id || '', debit: 0, credit: 0 }]);
  };

  const handleUpdateJournalLine = (index: number, field: 'accountId' | 'debit' | 'credit', val: any) => {
    const updated = [...journalLines];
    if (field === 'accountId') {
      updated[index].accountId = val;
    } else {
      updated[index][field] = Number(val);
    }
    setJournalLines(updated);
  };

  const handleRemoveJournalLine = (index: number) => {
    if (journalLines.length > 2) {
      setJournalLines(journalLines.filter((_, i) => i !== index));
    }
  };

  const totalJournalDebit = journalLines.reduce((s, l) => s + l.debit, 0);
  const totalJournalCredit = journalLines.reduce((s, l) => s + l.credit, 0);
  const isJournalBalanced = Math.abs(totalJournalDebit - totalJournalCredit) < 0.01 && totalJournalDebit > 0;

  // Save Manual Journal
  const handleSaveManualJournal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!journalDesc.trim()) {
      setJournalError('Keterangan jurnal wajib diisi.');
      return;
    }
    if (!isJournalBalanced) {
      setJournalError(`Jurnal belum seimbang! Total Debit (Rp ${totalJournalDebit.toLocaleString('id-ID')}) harus sama dengan Total Kredit (Rp ${totalJournalCredit.toLocaleString('id-ID')}).`);
      return;
    }

    try {
      const entryNumber = `JV-MNL-${Date.now().toString().slice(-5)}`;
      const lines: JournalLine[] = journalLines.map(line => {
        const acc = accounts.find(a => a.id === line.accountId) || accounts[0];
        return {
          accountId: acc.id,
          accountCode: acc.code,
          accountName: acc.name,
          debit: line.debit,
          credit: line.credit,
        };
      });

      jaloraStorage.saveJournalEntry({
        id: `je_man_${Date.now()}`,
        storeId: store.id,
        branchId: branch.id,
        entryNumber,
        date: journalDate,
        description: journalDesc.trim(),
        referenceType: 'manual',
        lines,
        totalDebit: totalJournalDebit,
        totalCredit: totalJournalCredit,
        isPosted: true,
        createdAt: new Date().toISOString(),
      });

      jaloraStorage.recordAuditLog({
        storeId: store.id,
        userName: user.name,
        userRole: user.role,
        action: 'JURNAL_MANUAL',
        targetEntity: 'JournalEntry',
        targetId: entryNumber,
        details: `Pencatatan Jurnal Manual #${entryNumber}: ${journalDesc.trim()} (Nilai Rp ${totalJournalDebit.toLocaleString('id-ID')})`,
        timestamp: new Date().toISOString(),
      });

      setShowManualJournalModal(false);
      onRefreshData?.();
    } catch (err: any) {
      setJournalError(err.message || 'Gagal menyimpan jurnal.');
    }
  };

  // Open Settlement Modal
  const handleOpenSettlement = (item: ReceivablePayable) => {
    setSettlementItem(item);
    setSettlementAmount(item.remainingAmount);
    setSettlementMethod('cash');
    setShowSettlementModal(true);
  };

  // Settle Payable / Receivable
  const handleExecuteSettlement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settlementItem || settlementAmount <= 0) return;

    const success = jaloraStorage.settleReceivablePayable(
      settlementItem.id,
      settlementAmount,
      settlementMethod,
      user.name
    );

    if (success) {
      setShowSettlementModal(false);
      onRefreshData?.();
    } else {
      alert('Gagal memproses pelunasan.');
    }
  };

  // 1a. Export Laba Rugi to CSV (Excel)
  const handleExportPnL = () => {
    try {
      const headers = ['Pos Laporan', 'Keterangan', 'Nilai (Rp)'];
      const rows = [
        ['PENDAPATAN USAHA (REVENUE)', 'Total Penjualan Retail POS', financialSummary.totalRevenue],
        ['HARGA POKOK PENJUALAN (HPP)', 'Beban Pokok Barang Terjual (Moving Average)', -financialSummary.totalHPP],
        ['LABA KOTOR (GROSS PROFIT)', 'Pendapatan Bersih dikurangi HPP', financialSummary.grossProfit],
        ['BEBAN OPERASIONAL', 'Biaya Operasional Toko & Selisih Kas', -financialSummary.totalExpense],
        ['LABA BERSIH (NET PROFIT)', 'Hasil Akhir Periode Berjalan', financialSummary.netProfit]
      ];
      const nowStr = new Date().toISOString().split('T')[0];
      const filename = `Jalora_Laporan_Laba_Rugi_${branch.code}_${nowStr}.csv`;
      downloadCsv(filename, headers, rows);
      setExportFeedback(`Laporan Laba Rugi Excel (${filename}) berhasil diunduh.`);
      setTimeout(() => setExportFeedback(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Gagal mengekspor file Excel Laba Rugi.');
    }
  };

  // 1b. Export Laba Rugi Bulanan to PDF
  const handleExportPnLPdf = () => {
    try {
      const now = new Date();
      const monthNames = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      const periodText = `Bulan ${monthNames[now.getMonth()]} ${now.getFullYear()}`;

      downloadFinancialReportPdf({
        store,
        branch,
        reportTitle: 'Laporan Laba Rugi Bulanan',
        periodText,
        summary: financialSummary,
        details: [
          { section: 'PENDAPATAN USAHA', description: 'Total Penjualan Retail POS', amount: financialSummary.totalRevenue, isSubtotal: true },
          { section: 'HARGA POKOK PENJUALAN', description: 'Beban Pokok Barang Terjual (Moving Average)', amount: -financialSummary.totalHPP },
          { section: 'LABA KOTOR', description: 'Pendapatan Bersih dikurangi HPP', amount: financialSummary.grossProfit, isSubtotal: true },
          { section: 'BEBAN OPERASIONAL', description: 'Biaya Operasional Toko & Selisih Kas', amount: -financialSummary.totalExpense },
          { section: 'LABA BERSIH (NET PROFIT)', description: 'Hasil Akhir Periode Berjalan', amount: financialSummary.netProfit, isTotal: true },
        ],
      });
      setExportFeedback('Dokumen resmi PDF Laporan Laba Rugi Bulanan berhasil diunduh.');
      setTimeout(() => setExportFeedback(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Gagal mengekspor file PDF Laba Rugi.');
    }
  };

  // 2a. Export Neraca to CSV (Excel)
  const handleExportBalanceSheet = () => {
    try {
      const headers = ['Kelompok', 'Akun / Komponen', 'Saldo (Rp)'];
      const rows = [
        ['ASET', 'Kas Fisik di Toko (1-1001)', financialSummary.kasBalance],
        ['ASET', 'Bank Operasional & QRIS (1-1002)', financialSummary.bankBalance],
        ['ASET', 'Piutang Usaha Pelanggan (1-1003)', financialSummary.piutangBalance],
        ['ASET', 'Persediaan Barang Dagang (1-1004)', financialSummary.persediaanBalance],
        ['TOTAL ASET', 'Total Seluruh Aset Lancar', financialSummary.totalAssets],
        ['LIABILITAS', 'Utang Usaha kepada Pemasok (2-1001)', financialSummary.utangBalance],
        ['EKUITAS', 'Modal Pemilik Disetor (3-1001)', financialSummary.modalBalance],
        ['EKUITAS', 'Laba Bersih Periode Berjalan', financialSummary.netProfit],
        ['TOTAL PASIVA', 'Total Liabilitas & Ekuitas', financialSummary.totalLiabilitiesAndEquity],
        ['STATUS NERACA', 'Selisih Keseimbangan', Math.abs(financialSummary.totalAssets - financialSummary.totalLiabilitiesAndEquity)]
      ];
      const nowStr = new Date().toISOString().split('T')[0];
      const filename = `Jalora_Laporan_Neraca_${branch.code}_${nowStr}.csv`;
      downloadCsv(filename, headers, rows);
      setExportFeedback(`Laporan Neraca Excel (${filename}) berhasil diunduh.`);
      setTimeout(() => setExportFeedback(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Gagal mengekspor file Excel Neraca.');
    }
  };

  // 2b. Export Neraca to PDF
  const handleExportBalanceSheetPdf = () => {
    try {
      const now = new Date();
      const monthNames = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      const periodText = `Posisi Per ${now.getDate()} ${monthNames[now.getMonth()]} ${now.getFullYear()}`;

      downloadFinancialReportPdf({
        store,
        branch,
        reportTitle: 'Laporan Posisi Keuangan (Neraca)',
        periodText,
        summary: financialSummary,
        details: [
          { section: 'ASET', description: 'Kas Fisik di Toko (1-1001)', amount: financialSummary.kasBalance },
          { section: 'ASET', description: 'Bank Operasional & QRIS (1-1002)', amount: financialSummary.bankBalance },
          { section: 'ASET', description: 'Piutang Usaha Pelanggan (1-1003)', amount: financialSummary.piutangBalance },
          { section: 'ASET', description: 'Persediaan Barang Dagang (1-1004)', amount: financialSummary.persediaanBalance },
          { section: 'TOTAL ASET', description: 'Total Seluruh Aset Lancar', amount: financialSummary.totalAssets, isTotal: true },
          { section: 'LIABILITAS', description: 'Utang Usaha kepada Pemasok (2-1001)', amount: financialSummary.utangBalance, isSubtotal: true },
          { section: 'EKUITAS', description: 'Modal Pemilik Disetor (3-1001)', amount: financialSummary.modalBalance },
          { section: 'EKUITAS', description: 'Laba Bersih Periode Berjalan', amount: financialSummary.netProfit },
          { section: 'TOTAL PASIVA', description: 'Total Liabilitas & Ekuitas', amount: financialSummary.totalLiabilitiesAndEquity, isTotal: true },
        ],
      });
      setExportFeedback('Dokumen resmi PDF Laporan Neraca berhasil diunduh.');
      setTimeout(() => setExportFeedback(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Gagal mengekspor file PDF Neraca.');
    }
  };

  // 3. Export Jurnal Umum to CSV
  const handleExportJournal = () => {
    if (journals.length === 0) {
      alert('Tidak ada data jurnal umum untuk diekspor.');
      return;
    }
    const headers = [
      'Toko',
      'Cabang',
      'No. Jurnal',
      'Tanggal & Waktu',
      'Keterangan',
      'Kode Akun',
      'Nama Akun',
      'Debit (Rp)',
      'Kredit (Rp)',
      'Tipe Referensi'
    ];
    const rows: (string | number)[][] = [];
    journals.forEach(j => {
      j.lines.forEach(l => {
        rows.push([
          store.name,
          branch.name,
          j.entryNumber,
          j.date,
          j.description,
          l.accountCode,
          l.accountName,
          l.debit,
          l.credit,
          j.referenceType || 'manual'
        ]);
      });
    });
    const nowStr = new Date().toISOString().split('T')[0];
    downloadCsv(`Jalora_Buku_Jurnal_Umum_${branch.code}_${nowStr}.csv`, headers, rows);
  };

  // 4. Export Buku Besar to CSV
  const handleExportLedger = () => {
    if (ledgerEntries.length === 0) {
      alert('Tidak ada mutasi buku besar pada akun yang dipilih.');
      return;
    }
    const acc = accounts.find(a => a.id === selectedLedgerAccountId);
    const headers = [
      'Toko',
      'Cabang',
      'Kode Akun',
      'Nama Akun',
      'Tanggal',
      'No. Jurnal Bukti',
      'Keterangan Mutasi',
      'Debit (Rp)',
      'Kredit (Rp)',
      'Saldo Berjalan (Rp)'
    ];
    const rows = ledgerEntries.map(e => [
      store.name,
      branch.name,
      acc?.code || '-',
      acc?.name || '-',
      e.date,
      e.entryNumber,
      e.description,
      e.debit,
      e.credit,
      e.balance
    ]);
    const nowStr = new Date().toISOString().split('T')[0];
    const accCode = acc ? acc.code.replace(/[^a-zA-Z0-9]/g, '_') : 'Akun';
    downloadCsv(`Jalora_Buku_Besar_${accCode}_${branch.code}_${nowStr}.csv`, headers, rows);
  };

  return (
    <div className="p-3.5 sm:p-5 lg:p-8 space-y-4 sm:space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#DCE5D6]">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#294D35]">Keuangan & Akuntansi Double-Entry</h2>
          <p className="text-xs text-stone-500 mt-1">
            Standar SAK EMKM · Jurnal Otomatis Seimbang · Laba Rugi & Neraca Real-time
          </p>
        </div>

        <button
          onClick={() => {
            setJournalLines([
              { accountId: accounts[0]?.id || '', debit: 0, credit: 0 },
              { accountId: accounts[1]?.id || '', debit: 0, credit: 0 },
            ]);
            setJournalDesc('');
            setJournalError('');
            setShowManualJournalModal(true);
          }}
          className="px-4 py-2 rounded-lg bg-[#294D35] hover:bg-[#4F7655] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Jurnal Manual</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 text-xs overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('reports')}
          className={`pb-2.5 px-3 font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'reports' ? 'border-b-2 border-[#4F7655] text-[#294D35]' : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          <PieChart className="w-4 h-4" />
          <span>Laporan Keuangan</span>
        </button>

        <button
          onClick={() => setActiveTab('journal')}
          className={`pb-2.5 px-3 font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'journal' ? 'border-b-2 border-[#4F7655] text-[#294D35]' : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Jurnal Umum ({journals.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('ledger')}
          className={`pb-2.5 px-3 font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'ledger' ? 'border-b-2 border-[#4F7655] text-[#294D35]' : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Buku Besar (General Ledger)</span>
        </button>

        <button
          onClick={() => setActiveTab('receivables_payables')}
          className={`pb-2.5 px-3 font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'receivables_payables' ? 'border-b-2 border-[#4F7655] text-[#294D35]' : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Piutang & Utang Usaha</span>
        </button>

        <button
          onClick={() => setActiveTab('accounts')}
          className={`pb-2.5 px-3 font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'accounts' ? 'border-b-2 border-[#4F7655] text-[#294D35]' : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>Bagan Akun (COA)</span>
        </button>
      </div>

      {/* Reports Tab View */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          {/* Sub Tab: PnL vs Balance Sheet + Export Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex gap-2">
              <button
                onClick={() => setReportType('pnl')}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors cursor-pointer ${
                  reportType === 'pnl' ? 'bg-[#294D35] text-white shadow-xs' : 'bg-white border border-stone-200 text-stone-700'
                }`}
              >
                Laporan Laba Rugi (Income Statement)
              </button>
              <button
                onClick={() => setReportType('balance_sheet')}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors cursor-pointer ${
                  reportType === 'balance_sheet' ? 'bg-[#294D35] text-white shadow-xs' : 'bg-white border border-stone-200 text-stone-700'
                }`}
              >
                Laporan Posisi Keuangan (Neraca)
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={reportType === 'pnl' ? handleExportPnL : handleExportBalanceSheet}
                className="px-3.5 py-2 bg-[#F5F0E5] hover:bg-[#ebdcc4] text-[#294D35] border border-[#DCE5D6] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                title={reportType === 'pnl' ? 'Unduh Laporan Laba Rugi ke file Excel (CSV)' : 'Unduh Laporan Neraca ke file Excel (CSV)'}
              >
                <Download className="w-3.5 h-3.5 text-[#4F7655]" />
                <span>Unduh Excel (CSV)</span>
              </button>

              <button
                type="button"
                onClick={reportType === 'pnl' ? handleExportPnLPdf : handleExportBalanceSheetPdf}
                className="px-3.5 py-2 bg-[#294D35] hover:bg-[#1e3827] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                title={reportType === 'pnl' ? 'Unduh Dokumen PDF Resmi Laporan Laba Rugi Bulanan' : 'Unduh Dokumen PDF Resmi Laporan Neraca'}
              >
                <FileText className="w-3.5 h-3.5 text-[#D6BD7A]" />
                <span>Unduh PDF Bulanan</span>
              </button>
            </div>
          </div>

          {exportFeedback && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 animate-jalora-enter">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{exportFeedback}</span>
            </div>
          )}

          {reportType === 'pnl' ? (
            <div className="bg-white rounded-2xl border border-[#DCE5D6] p-6 lg:p-8 max-w-3xl shadow-xs space-y-6">
              <div className="text-center pb-4 border-b border-stone-200">
                <h3 className="text-lg font-bold text-[#294D35] uppercase">{store.name}</h3>
                <h4 className="text-sm font-semibold text-[#4F7655]">Laporan Laba Rugi Real-Time</h4>
                <p className="text-xs text-stone-500 mt-1">Periode Berjalan · Mata Uang: Rupiah (IDR)</p>
              </div>

              <div className="space-y-4 text-xs">
                {/* Revenue */}
                <div>
                  <div className="flex justify-between font-bold text-sm text-[#294D35] pb-1 border-b border-stone-100">
                    <span>PENDAPATAN USAHA (REVENUE)</span>
                    <span className="font-mono tabular-nums">Rp {financialSummary.totalRevenue.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="pl-4 py-1.5 flex justify-between text-stone-600">
                    <span>Pendapatan Penjualan Retail POS</span>
                    <span className="font-mono tabular-nums">Rp {financialSummary.totalRevenue.toLocaleString('id-ID')}</span>
                  </div>
                </div>

                {/* HPP */}
                <div>
                  <div className="flex justify-between font-bold text-sm text-[#294D35] pb-1 border-b border-stone-100">
                    <span>HARGA POKOK PENJUALAN (HPP)</span>
                    <span className="font-mono tabular-nums text-red-600">
                      -Rp {financialSummary.totalHPP.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div className="pl-4 py-1.5 flex justify-between text-stone-600">
                    <span>Beban Pokok Barang Terjual (Moving Average)</span>
                    <span className="font-mono tabular-nums">Rp {financialSummary.totalHPP.toLocaleString('id-ID')}</span>
                  </div>
                </div>

                {/* Gross Profit */}
                <div className="p-3 bg-[#F5F7F2] rounded-xl border border-[#DCE5D6] flex justify-between items-center font-bold text-sm text-[#294D35]">
                  <span>LABA KOTOR (GROSS PROFIT)</span>
                  <span className="font-mono tabular-nums text-emerald-800 text-base">
                    Rp {financialSummary.grossProfit.toLocaleString('id-ID')}
                  </span>
                </div>

                {/* Operating Expenses */}
                <div>
                  <div className="flex justify-between font-bold text-sm text-[#294D35] pb-1 border-b border-stone-100">
                    <span>BEBAN OPERASIONAL & SELISIH</span>
                    <span className="font-mono tabular-nums text-red-600">
                      -Rp {financialSummary.totalExpense.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div className="pl-4 py-1.5 flex justify-between text-stone-600">
                    <span>Biaya Operasional Toko / Selisih Kasir</span>
                    <span className="font-mono tabular-nums">Rp {financialSummary.totalExpense.toLocaleString('id-ID')}</span>
                  </div>
                </div>

                {/* Net Profit */}
                <div className="p-4 bg-[#294D35] text-white rounded-xl flex justify-between items-center font-bold text-base">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-emerald-300">Hasil Akhir Periode</p>
                    <p className="text-base font-bold">LABA BERSIH (NET PROFIT)</p>
                  </div>
                  <span className="text-2xl font-mono tabular-nums text-emerald-300">
                    Rp {financialSummary.netProfit.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-[#DCE5D6] p-6 lg:p-8 max-w-4xl shadow-xs space-y-6">
              <div className="text-center pb-4 border-b border-stone-200">
                <h3 className="text-lg font-bold text-[#294D35] uppercase">{store.name}</h3>
                <h4 className="text-sm font-semibold text-[#4F7655]">Laporan Posisi Keuangan (Neraca)</h4>
                <p className="text-xs text-stone-500 mt-1">Prinsip Keseimbangan: Total Aset = Total Liabilitas + Ekuitas</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs">
                {/* Left: Assets */}
                <div className="space-y-4">
                  <div className="border-b border-stone-200 pb-2">
                    <h5 className="font-bold text-sm text-[#294D35] uppercase">ASET (AKTIVA)</h5>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-stone-700 py-1 border-b border-stone-100">
                      <span>Kas Fisik di Toko</span>
                      <span className="font-mono tabular-nums font-semibold">Rp {financialSummary.kasBalance.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between text-stone-700 py-1 border-b border-stone-100">
                      <span>Rekening Bank Operasional & QRIS</span>
                      <span className="font-mono tabular-nums font-semibold">Rp {financialSummary.bankBalance.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between text-stone-700 py-1 border-b border-stone-100">
                      <span>Piutang Usaha Pelanggan</span>
                      <span className="font-mono tabular-nums font-semibold">Rp {financialSummary.piutangBalance.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between text-stone-700 py-1 border-b border-stone-100">
                      <span>Persediaan Barang Dagang</span>
                      <span className="font-mono tabular-nums font-semibold">Rp {financialSummary.persediaanBalance.toLocaleString('id-ID')}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-[#F5F7F2] rounded-xl border border-[#DCE5D6] flex justify-between items-center font-bold text-sm text-[#294D35]">
                    <span>TOTAL ASET</span>
                    <span className="font-mono tabular-nums text-base">
                      Rp {financialSummary.totalAssets.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>

                {/* Right: Liabilities & Equity */}
                <div className="space-y-4">
                  <div className="border-b border-stone-200 pb-2">
                    <h5 className="font-bold text-sm text-[#294D35] uppercase">LIABILITAS & EKUITAS (PASIVA)</h5>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-stone-700 py-1 border-b border-stone-100">
                      <span>Utang Usaha kepada Pemasok</span>
                      <span className="font-mono tabular-nums font-semibold">Rp {financialSummary.utangBalance.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between text-stone-700 py-1 border-b border-stone-100">
                      <span>Modal Pemilik Disetor</span>
                      <span className="font-mono tabular-nums font-semibold">Rp {financialSummary.modalBalance.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between text-stone-700 py-1 border-b border-stone-100">
                      <span>Laba Bersih Periode Berjalan</span>
                      <span className="font-mono tabular-nums font-semibold text-emerald-800">
                        Rp {financialSummary.netProfit.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-[#F5F7F2] rounded-xl border border-[#DCE5D6] flex justify-between items-center font-bold text-sm text-[#294D35]">
                    <span>TOTAL LIABILITAS & EKUITAS</span>
                    <span className="font-mono tabular-nums text-base">
                      Rp {financialSummary.totalLiabilitiesAndEquity.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Balance Verification Banner */}
              <div className="pt-2">
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between text-xs text-emerald-900">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    <span className="font-semibold">Neraca Terverifikasi Seimbang (Balanced)</span>
                  </div>
                  <span className="font-mono font-bold">
                    Selisih: Rp {Math.abs(financialSummary.totalAssets - financialSummary.totalLiabilitiesAndEquity).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* General Journal Tab View */}
      {activeTab === 'journal' && (
        <div className="bg-white rounded-xl border border-[#DCE5D6] overflow-hidden shadow-xs">
          <div className="p-4 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm text-[#294D35]">Buku Jurnal Umum (General Journal)</h3>
              <p className="text-xs text-stone-500 mt-0.5">Semua entri transaksi berpasangan seimbang (Debit = Kredit)</p>
            </div>
            <button
              type="button"
              onClick={handleExportJournal}
              className="px-3.5 py-1.5 bg-[#294D35] hover:bg-[#1e3827] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs shrink-0 self-start sm:self-auto"
              title="Unduh seluruh entri Buku Jurnal Umum ke file CSV Excel"
            >
              <Download className="w-3.5 h-3.5 text-[#D6BD7A]" />
              <span>Unduh CSV Jurnal</span>
            </button>
          </div>

          <div className="divide-y divide-stone-200 text-xs">
            {journals.length === 0 ? (
              <div className="p-8 text-center text-stone-400">
                Belum ada entri jurnal yang tercatat. Jurnal akan otomatis dibuat saat ada transaksi kasir atau pembelian.
              </div>
            ) : (
              journals.map(j => (
                <div key={j.id} className="p-4 hover:bg-stone-50/50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#294D35] font-mono">{j.entryNumber}</span>
                      <span className="text-stone-400">·</span>
                      <span className="text-stone-600 font-medium">{j.description}</span>
                    </div>
                    <span className="text-stone-500 font-mono text-[11px]">{j.date}</span>
                  </div>

                  <div className="bg-[#F5F7F2] rounded-lg p-2 border border-stone-200">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="text-[11px] text-stone-500 font-semibold border-b border-stone-200 pb-1">
                          <th className="py-1">Akun Perkiraan</th>
                          <th className="py-1 text-right w-28">Debit (Rp)</th>
                          <th className="py-1 text-right w-28">Kredit (Rp)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 font-mono">
                        {j.lines.map((line, idx) => (
                          <tr key={idx} className="py-1">
                            <td className="py-1 font-sans">
                              <span className="font-mono text-stone-400 mr-2">{line.accountCode}</span>
                              <span className={line.credit > 0 ? 'pl-4 text-stone-700' : 'font-medium text-stone-900'}>
                                {line.accountName}
                              </span>
                            </td>
                            <td className="py-1 text-right tabular-nums">
                              {line.debit > 0 ? line.debit.toLocaleString('id-ID') : '-'}
                            </td>
                            <td className="py-1 text-right tabular-nums">
                              {line.credit > 0 ? line.credit.toLocaleString('id-ID') : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* General Ledger Tab View */}
      {activeTab === 'ledger' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-[#DCE5D6] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-stone-700">Pilih Akun Buku Besar:</span>
              <select
                value={selectedLedgerAccountId}
                onChange={(e) => setSelectedLedgerAccountId(e.target.value)}
                className="px-3 py-1.5 text-xs border border-stone-300 rounded-lg bg-white font-medium text-[#294D35] focus:outline-none focus:border-[#4F7655]"
              >
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>{a.code} — {a.name} ({a.category.toUpperCase()})</option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleExportLedger}
              className="px-3.5 py-1.5 bg-[#294D35] hover:bg-[#1e3827] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs shrink-0 self-start sm:self-auto"
              title="Unduh seluruh mutasi Buku Besar akun terpilih ke file CSV Excel"
            >
              <Download className="w-3.5 h-3.5 text-[#D6BD7A]" />
              <span>Unduh CSV Buku Besar</span>
            </button>
          </div>

          <div className="bg-white rounded-xl border border-[#DCE5D6] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-stone-50/80 border-b border-stone-200 text-stone-600 font-semibold">
                    <th className="py-3 px-4">Tanggal</th>
                    <th className="py-3 px-3">No. Jurnal</th>
                    <th className="py-3 px-3">Keterangan</th>
                    <th className="py-3 px-3 text-right">Debit</th>
                    <th className="py-3 px-3 text-right">Kredit</th>
                    <th className="py-3 px-4 text-right">Saldo Berjalan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-mono">
                  {ledgerEntries.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-stone-400 font-sans">
                        Belum ada mutasi pembukuan pada akun ini.
                      </td>
                    </tr>
                  ) : (
                    ledgerEntries.map((e, idx) => (
                      <tr key={idx} className="hover:bg-stone-50/60 font-mono">
                        <td className="py-2.5 px-4 text-stone-500 font-sans">{e.date}</td>
                        <td className="py-2.5 px-3 font-semibold text-[#294D35]">{e.entryNumber}</td>
                        <td className="py-2.5 px-3 text-stone-700 font-sans">{e.description}</td>
                        <td className="py-2.5 px-3 text-right tabular-nums">
                          {e.debit > 0 ? e.debit.toLocaleString('id-ID') : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums">
                          {e.credit > 0 ? e.credit.toLocaleString('id-ID') : '-'}
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-[#294D35] tabular-nums">
                          Rp {e.balance.toLocaleString('id-ID')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Receivables & Payables Tab View */}
      {activeTab === 'receivables_payables' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Piutang (Receivables) */}
          <div className="bg-white rounded-xl border border-[#DCE5D6] p-5 shadow-xs space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-stone-200">
              <h4 className="font-bold text-sm text-[#294D35]">Piutang Pelanggan ({receivables.length})</h4>
              <span className="text-xs text-stone-500">Tagihan Penjualan Tempo</span>
            </div>

            {receivables.length === 0 ? (
              <p className="text-xs text-stone-400 py-6 text-center">Tidak ada piutang yang belum lunas.</p>
            ) : (
              receivables.map(r => (
                <div key={r.id} className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs space-y-1">
                  <div className="flex justify-between font-semibold">
                    <span className="text-[#294D35]">{r.partyName}</span>
                    <span className="font-mono text-[#4F7655]">Sisa: Rp {r.remainingAmount.toLocaleString('id-ID')}</span>
                  </div>
                  <p className="text-stone-500 text-[11px] font-mono">Invoice #{r.invoiceNumber} · Jatuh Tempo: {r.dueDate}</p>
                  <button
                    onClick={() => handleOpenSettlement(r)}
                    className="mt-2 w-full py-1.5 bg-[#294D35] hover:bg-[#4F7655] text-white rounded font-medium text-xs transition-colors"
                  >
                    Catat Pelunasan Piutang
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Utang (Payables) */}
          <div className="bg-white rounded-xl border border-[#DCE5D6] p-5 shadow-xs space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-stone-200">
              <h4 className="font-bold text-sm text-[#294D35]">Utang Supplier ({payables.length})</h4>
              <span className="text-xs text-stone-500">Kewajiban Pembelian Tempo</span>
            </div>

            {payables.length === 0 ? (
              <p className="text-xs text-stone-400 py-6 text-center">Tidak ada utang usaha yang tertunggak.</p>
            ) : (
              payables.map(p => (
                <div key={p.id} className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs space-y-1">
                  <div className="flex justify-between font-semibold">
                    <span className="text-[#294D35]">{p.partyName}</span>
                    <span className="font-mono text-red-600">Sisa: Rp {p.remainingAmount.toLocaleString('id-ID')}</span>
                  </div>
                  <p className="text-stone-500 text-[11px] font-mono">PO #{p.invoiceNumber} · Jatuh Tempo: {p.dueDate}</p>
                  <button
                    onClick={() => handleOpenSettlement(p)}
                    className="mt-2 w-full py-1.5 bg-stone-800 hover:bg-[#294D35] text-white rounded font-medium text-xs transition-colors"
                  >
                    Bayar Utang Supplier
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Chart of Accounts Tab View */}
      {activeTab === 'accounts' && (
        <div className="bg-white rounded-xl border border-[#DCE5D6] overflow-hidden shadow-xs">
          <div className="p-4 border-b border-stone-200">
            <h3 className="font-bold text-sm text-[#294D35]">Bagan Akun Standar (Chart of Accounts)</h3>
            <p className="text-xs text-stone-500 mt-0.5">Struktur klasifikasi akun keuangan berstandar akuntansi umum</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left border-collapse text-xs">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold">
                  <th className="py-2.5 px-4">Kode Akun</th>
                  <th className="py-2.5 px-3">Nama Akun</th>
                  <th className="py-2.5 px-3">Kategori</th>
                  <th className="py-2.5 px-3">Saldo Normal</th>
                  <th className="py-2.5 px-4">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {accounts.map(acc => (
                  <tr key={acc.id} className="hover:bg-stone-50/60">
                    <td className="py-2.5 px-4 font-mono font-bold text-[#294D35]">{acc.code}</td>
                    <td className="py-2.5 px-3 font-semibold text-stone-800">{acc.name}</td>
                    <td className="py-2.5 px-3 uppercase text-[10px] font-semibold text-stone-500">{acc.category}</td>
                    <td className="py-2.5 px-3 uppercase text-[10px] font-bold text-[#4F7655]">{acc.normalBalance}</td>
                    <td className="py-2.5 px-4 text-stone-500 text-[11px]">{acc.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Manual Journal Modal */}
      {showManualJournalModal && (
        <div className="fixed inset-0 z-50 bg-[rgba(41,77,53,0.55)] backdrop-blur-xs transition-opacity duration-200 ease-out flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-2xl border border-[#DCE5D6] shadow-2xl p-4 sm:p-6 relative max-h-[90dvh] flex flex-col my-auto overflow-hidden">
            <button
              onClick={() => setShowManualJournalModal(false)}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 text-sm p-1 z-10"
            >
              ✕
            </button>

            <div className="shrink-0 mb-3 pr-6">
              <h3 className="text-base font-bold text-[#294D35] mb-0.5">Entri Jurnal Umum Manual</h3>
              <p className="text-xs text-stone-500">Total Debit harus persis sama dengan Total Kredit.</p>
            </div>

            {journalError && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg shrink-0">
                {journalError}
              </div>
            )}

            <form onSubmit={handleSaveManualJournal} className="flex-1 overflow-y-auto min-h-0 space-y-3.5 text-xs pr-1 -mr-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Tanggal *</label>
                  <input
                    type="date"
                    value={journalDate}
                    onChange={(e) => setJournalDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:border-[#4F7655]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-stone-700 mb-1">Keterangan Transaksi *</label>
                  <input
                    type="text"
                    placeholder="Contoh: Pembayaran Biaya Listrik Toko"
                    value={journalDesc}
                    onChange={(e) => setJournalDesc(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:border-[#4F7655]"
                  />
                </div>
              </div>

              {/* Journal Lines */}
              <div className="space-y-2 pt-2 border-t border-stone-200">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-stone-700">Baris Perkiraan Akun:</span>
                  <button
                    type="button"
                    onClick={handleAddJournalLine}
                    className="text-[#4F7655] font-bold hover:underline cursor-pointer"
                  >
                    + Tambah Baris
                  </button>
                </div>

                {journalLines.map((line, idx) => (
                  <div key={idx} className="p-2.5 bg-stone-50 rounded-xl border border-stone-200 grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-12 sm:col-span-5">
                      <select
                        value={line.accountId}
                        onChange={(e) => handleUpdateJournalLine(idx, 'accountId', e.target.value)}
                        className="w-full px-2 py-1.5 border border-stone-300 rounded bg-white text-xs"
                      >
                        {accounts.map(a => (
                          <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-5 sm:col-span-3">
                      <input
                        type="number"
                        placeholder="Debit (Rp)"
                        value={line.debit || ''}
                        onChange={(e) => handleUpdateJournalLine(idx, 'debit', e.target.value)}
                        className="w-full px-2 py-1.5 border border-stone-300 rounded text-right font-mono"
                      />
                    </div>

                    <div className="col-span-5 sm:col-span-3">
                      <input
                        type="number"
                        placeholder="Kredit (Rp)"
                        value={line.credit || ''}
                        onChange={(e) => handleUpdateJournalLine(idx, 'credit', e.target.value)}
                        className="w-full px-2 py-1.5 border border-stone-300 rounded text-right font-mono"
                      />
                    </div>

                    <div className="col-span-2 sm:col-span-1 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveJournalLine(idx)}
                        disabled={journalLines.length <= 2}
                        className="text-stone-400 hover:text-red-600 disabled:opacity-20 cursor-pointer p-1"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Balancing Indicator */}
              <div className="p-3 bg-stone-100 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs font-mono">
                <div>
                  <span className="text-stone-600">Total Debit: </span>
                  <strong className="text-[#294D35]">Rp {totalJournalDebit.toLocaleString('id-ID')}</strong>
                </div>
                <div>
                  <span className="text-stone-600">Total Kredit: </span>
                  <strong className="text-[#294D35]">Rp {totalJournalCredit.toLocaleString('id-ID')}</strong>
                </div>
                <div className={isJournalBalanced ? 'text-emerald-700 font-bold' : 'text-red-600 font-bold'}>
                  {isJournalBalanced ? '✓ Seimbang (Balanced)' : '✕ Belum Seimbang'}
                </div>
              </div>

              <div className="pt-3 border-t border-stone-200 shrink-0 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowManualJournalModal(false)}
                  className="w-1/3 py-2.5 rounded-lg border border-stone-200 text-stone-700 font-semibold cursor-pointer hover:bg-stone-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!isJournalBalanced}
                  className="flex-1 py-2.5 rounded-lg bg-[#294D35] hover:bg-[#4F7655] text-white font-semibold transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  Simpan Jurnal & Posting
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settle Receivable/Payable Modal */}
      {showSettlementModal && settlementItem && (
        <div className="fixed inset-0 z-50 bg-[rgba(41,77,53,0.55)] backdrop-blur-xs transition-opacity duration-200 ease-out flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-2xl border border-[#DCE5D6] shadow-2xl p-4 sm:p-6 relative max-h-[90dvh] flex flex-col my-auto overflow-hidden">
            <button
              onClick={() => setShowSettlementModal(false)}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 text-sm p-1 z-10"
            >
              ✕
            </button>
            <div className="shrink-0 mb-3 pr-6">
              <h3 className="text-base font-bold text-[#294D35] mb-0.5">
                {settlementItem.type === 'receivable' ? 'Pelunasan Piutang Pelanggan' : 'Pembayaran Utang Supplier'}
              </h3>
              <p className="text-xs text-stone-500">
                Pihak: <strong>{settlementItem.partyName}</strong> (Invoice #{settlementItem.invoiceNumber})
              </p>
            </div>

            <form onSubmit={handleExecuteSettlement} className="flex-1 overflow-y-auto min-h-0 space-y-3.5 text-xs pr-1 -mr-1">
              <div className="p-3 bg-[#F5F7F2] rounded-xl border border-[#DCE5D6] flex justify-between">
                <span className="text-stone-600">Sisa Tagihan:</span>
                <span className="font-bold text-[#294D35] font-mono">Rp {settlementItem.remainingAmount.toLocaleString('id-ID')}</span>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Jumlah yang Dibayarkan (Rp) *</label>
                <input
                  type="number"
                  value={settlementAmount}
                  onChange={(e) => setSettlementAmount(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 text-base font-bold text-[#294D35] border border-stone-300 rounded-lg font-mono focus:outline-none focus:border-[#4F7655]"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Metode Dana Kas/Bank *</label>
                <select
                  value={settlementMethod}
                  onChange={(e) => setSettlementMethod(e.target.value as any)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg bg-white focus:outline-none focus:border-[#4F7655]"
                >
                  <option value="cash">Kas Fisik Toko</option>
                  <option value="bank">Rekening Bank Operasional</option>
                </select>
              </div>

              <div className="pt-3 border-t border-stone-200 shrink-0 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowSettlementModal(false)}
                  className="w-1/3 py-2.5 rounded-lg border border-stone-200 text-stone-700 font-semibold cursor-pointer hover:bg-stone-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-lg bg-[#294D35] hover:bg-[#4F7655] text-white font-semibold transition-colors cursor-pointer shadow-xs"
                >
                  Konfirmasi Pembayaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
