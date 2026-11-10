/**
 * JALORA — Cash Reconciliation & Cashier Shifts
 * Shift opening, cash movements (in/out), physical counting, and discrepancy calculation
 * Created by Abdul Jalil
 */

import React, { useState, useMemo } from 'react';
import {
  Receipt,
  Plus,
  Minus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Lock,
  ArrowRight,
  History,
  Banknote
} from 'lucide-react';
import { CashSession, CashMovement, Store, Branch, UserProfile } from '../../types';
import { hashPin, jaloraStorage } from '../../services/storage';

interface CashReconciliationProps {
  store: Store;
  branch: Branch;
  user: UserProfile;
  onRefreshData?: () => void;
}

export const CashReconciliation: React.FC<CashReconciliationProps> = ({ store, branch, user, onRefreshData }) => {
  // Modal states
  const [showOpenShiftModal, setShowOpenShiftModal] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [showCloseShiftModal, setShowCloseShiftModal] = useState(false);

  // Open Shift Form State
  const [openingFloat, setOpeningFloat] = useState<number>(300000);
  const [openingNotes, setOpeningNotes] = useState('Modal awal uang pecahan kasir');

  // Cash Movement Form State
  const [movementType, setMovementType] = useState<'cash_in' | 'cash_out'>('cash_in');
  const [movementAmount, setMovementAmount] = useState<number>(50000);
  const [movementReason, setMovementReason] = useState('');

  // Close Shift Form State
  const [physicalCash, setPhysicalCash] = useState<number>(0);
  const [closeNotes, setCloseNotes] = useState('');
  const [closePin, setClosePin] = useState('');
  const [closeError, setCloseError] = useState('');
  const [isClosingShift, setIsClosingShift] = useState(false);

  // Load Data
  const activeSession = useMemo(() => jaloraStorage.getActiveCashSession(store.id, branch.id), [store.id, branch.id, showOpenShiftModal, showMovementModal, showCloseShiftModal]);
  const pastSessions = useMemo(() => jaloraStorage.getCashSessions(store.id, branch.id).filter(s => s.status === 'closed'), [store.id, branch.id, showCloseShiftModal]);
  const movements = useMemo(() => {
    return activeSession ? jaloraStorage.getCashMovements(store.id, activeSession.id) : [];
  }, [store.id, activeSession, showMovementModal]);

  // Expected Cash calculation
  // Expected = opening + sales + in - out
  const expectedCashAmount = useMemo(() => {
    if (!activeSession) return 0;
    return activeSession.openingCash + activeSession.cashSales + activeSession.cashIn - activeSession.cashOut;
  }, [activeSession]);

  const discrepancy = useMemo(() => {
    return physicalCash - expectedCashAmount;
  }, [physicalCash, expectedCashAmount]);

  // Open Shift Handler
  const handleOpenShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (openingFloat < 0) return;

    const newSession: CashSession = {
      id: `cs_${Date.now()}`,
      storeId: store.id,
      branchId: branch.id,
      cashierId: user.id,
      cashierName: user.name,
      openedAt: new Date().toISOString(),
      openingCash: openingFloat,
      cashSales: 0,
      cashIn: 0,
      cashOut: 0,
      expectedCash: openingFloat,
      status: 'open',
      notes: openingNotes.trim(),
    };

    jaloraStorage.saveCashSession(newSession);

    jaloraStorage.recordAuditLog({
      storeId: store.id,
      userName: user.name,
      userRole: user.role,
      action: 'BUKA_SHIFT_KASIR',
      targetEntity: 'CashSession',
      targetId: newSession.id,
      details: `Membuka shift kasir dengan modal awal Rp ${openingFloat.toLocaleString('id-ID')}`,
      timestamp: new Date().toISOString(),
    });

    setShowOpenShiftModal(false);
    onRefreshData?.();
  };

  // Record Cash Movement Handler
  const handleRecordMovement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession || movementAmount <= 0 || !movementReason.trim()) return;

    jaloraStorage.recordCashMovement({
      id: `cm_${Date.now()}`,
      storeId: store.id,
      sessionId: activeSession.id,
      type: movementType,
      amount: movementAmount,
      reason: movementReason.trim(),
      createdBy: user.name,
      createdAt: new Date().toISOString(),
    });

    jaloraStorage.recordAuditLog({
      storeId: store.id,
      userName: user.name,
      userRole: user.role,
      action: movementType === 'cash_in' ? 'KAS_MASUK_LACI' : 'KAS_KELUAR_LACI',
      targetEntity: 'CashSession',
      targetId: activeSession.id,
      details: `${movementType === 'cash_in' ? 'Tambah modal' : 'Penarikan'} kas kecil sebesar Rp ${movementAmount.toLocaleString('id-ID')}. Alasan: ${movementReason}`,
      timestamp: new Date().toISOString(),
    });

    setMovementReason('');
    setShowMovementModal(false);
    onRefreshData?.();
  };

  // Close Shift Handler with PIN
  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession) return;

    if (closePin.length !== 6) {
      setCloseError('PIN transaksi harus 6 digit.');
      return;
    }

    setIsClosingShift(true);
    setCloseError('');

    try {
      const hashed = await hashPin(closePin);
      if (user.pinHash && user.pinHash !== hashed) {
        setCloseError('PIN Transaksi Salah! Otorisasi penutupan shift ditolak.');
        setIsClosingShift(false);
        return;
      }

      activeSession.closedAt = new Date().toISOString();
      activeSession.actualCash = physicalCash;
      activeSession.discrepancy = discrepancy;
      activeSession.status = 'closed';
      activeSession.notes = closeNotes.trim();

      jaloraStorage.saveCashSession(activeSession);

      // If there was a cash shortage or excess, log accounting journal
      if (Math.abs(discrepancy) > 0) {
        const accounts = jaloraStorage.getAccounts(store.id);
        const kasAcc = accounts.find(a => a.code === '1-1001') || accounts[0];
        const diffAcc = accounts.find(a => a.code === '6-1002') || accounts[10];

        const lines = discrepancy < 0 ? [
          // Kurang kas: Debit Beban Selisih, Credit Kas
          { accountId: diffAcc.id, accountCode: diffAcc.code, accountName: diffAcc.name, debit: Math.abs(discrepancy), credit: 0 },
          { accountId: kasAcc.id, accountCode: kasAcc.code, accountName: kasAcc.name, debit: 0, credit: Math.abs(discrepancy) },
        ] : [
          // Lebih kas: Debit Kas, Credit Pendapatan Lain/Selisih
          { accountId: kasAcc.id, accountCode: kasAcc.code, accountName: kasAcc.name, debit: discrepancy, credit: 0 },
          { accountId: diffAcc.id, accountCode: diffAcc.code, accountName: diffAcc.name, debit: 0, credit: discrepancy },
        ];

        jaloraStorage.saveJournalEntry({
          id: `je_diff_${Date.now()}`,
          storeId: store.id,
          branchId: branch.id,
          entryNumber: `JV-SELISIH-${Date.now().toString().slice(-4)}`,
          date: new Date().toISOString().split('T')[0],
          description: `Jurnal Rekonsiliasi Selisih Kasir #${activeSession.id} (${discrepancy < 0 ? 'Kurang' : 'Lebih'} Rp ${Math.abs(discrepancy).toLocaleString('id-ID')})`,
          referenceType: 'cash_session',
          referenceId: activeSession.id,
          lines,
          totalDebit: Math.abs(discrepancy),
          totalCredit: Math.abs(discrepancy),
          isPosted: true,
          createdAt: new Date().toISOString(),
        });
      }

      jaloraStorage.recordAuditLog({
        storeId: store.id,
        userName: user.name,
        userRole: user.role,
        action: 'TUTUP_SHIFT_KASIR',
        targetEntity: 'CashSession',
        targetId: activeSession.id,
        details: `Tutup shift kasir. Diharapkan: Rp ${expectedCashAmount.toLocaleString('id-ID')}, Fisik: Rp ${physicalCash.toLocaleString('id-ID')}, Selisih: Rp ${discrepancy.toLocaleString('id-ID')}`,
        timestamp: new Date().toISOString(),
      });

      setShowCloseShiftModal(false);
      onRefreshData?.();
    } catch (err: any) {
      setCloseError(err.message || 'Gagal menutup shift');
    } finally {
      setIsClosingShift(false);
    }
  };

  return (
    <div className="p-3.5 sm:p-5 lg:p-8 space-y-4 sm:space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#DCE5D6]">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#294D35]">Rekonsiliasi Kasir & Sesi Shift</h2>
          <p className="text-xs text-stone-500 mt-1">
            Cabang: <strong className="text-[#294D35]">{branch.name}</strong> · Kontrol Laci Uang Fisik Anti-Bocor
          </p>
        </div>

        {activeSession ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setMovementType('cash_in');
                setMovementAmount(50000);
                setMovementReason('');
                setShowMovementModal(true);
              }}
              className="px-3.5 py-2 rounded-lg border border-[#DCE5D6] bg-white hover:bg-stone-50 text-xs font-semibold text-[#294D35] transition-colors"
            >
              Kas Masuk / Keluar
            </button>
            <button
              onClick={() => {
                setPhysicalCash(expectedCashAmount);
                setCloseNotes('');
                setClosePin('');
                setCloseError('');
                setShowCloseShiftModal(true);
              }}
              className="px-4 py-2 rounded-lg bg-[#294D35] hover:bg-[#4F7655] text-white text-xs font-semibold transition-colors shadow-xs"
            >
              Tutup Shift Kasir
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowOpenShiftModal(true)}
            className="px-4 py-2 rounded-lg bg-[#294D35] hover:bg-[#4F7655] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Clock className="w-4 h-4" />
            <span>Buka Shift Kasir Baru</span>
          </button>
        )}
      </div>

      {/* Active Shift Card */}
      {activeSession ? (
        <div className="bg-white rounded-2xl border border-[#DCE5D6] p-6 lg:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-stone-200">
            <div>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">
                ● Shift Kasir Sedang Berjalan
              </span>
              <h3 className="text-lg font-bold text-[#294D35] mt-2">
                Kasir: {activeSession.cashierName}
              </h3>
              <p className="text-xs text-stone-500 font-mono">
                Dibuka: {new Date(activeSession.openedAt).toLocaleString('id-ID')}
              </p>
            </div>

            <div className="text-right">
              <span className="text-xs text-stone-500 font-semibold block uppercase">Kas yang Diharapkan di Laci</span>
              <span className="text-2xl lg:text-3xl font-bold text-[#294D35] font-mono tabular-nums">
                Rp {expectedCashAmount.toLocaleString('id-ID')}
              </span>
            </div>
          </div>

          {/* Metrics Formula Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-xs">
            <div className="p-3.5 bg-[#F5F7F2] rounded-xl border border-[#DCE5D6]">
              <span className="text-stone-500 font-medium block">1. Modal Saldo Awal</span>
              <span className="text-base font-bold text-[#294D35] font-mono tabular-nums mt-1 block">
                Rp {activeSession.openingCash.toLocaleString('id-ID')}
              </span>
            </div>

            <div className="p-3.5 bg-[#F5F7F2] rounded-xl border border-[#DCE5D6]">
              <span className="text-stone-500 font-medium block">2. Penjualan Tunai (+)</span>
              <span className="text-base font-bold text-emerald-800 font-mono tabular-nums mt-1 block">
                Rp {activeSession.cashSales.toLocaleString('id-ID')}
              </span>
            </div>

            <div className="p-3.5 bg-[#F5F7F2] rounded-xl border border-[#DCE5D6]">
              <span className="text-stone-500 font-medium block">3. Tambahan Kas Masuk (+)</span>
              <span className="text-base font-bold text-blue-800 font-mono tabular-nums mt-1 block">
                Rp {activeSession.cashIn.toLocaleString('id-ID')}
              </span>
            </div>

            <div className="p-3.5 bg-[#F5F7F2] rounded-xl border border-[#DCE5D6]">
              <span className="text-stone-500 font-medium block">4. Pengeluaran Laci (-)</span>
              <span className="text-base font-bold text-red-600 font-mono tabular-nums mt-1 block">
                Rp {activeSession.cashOut.toLocaleString('id-ID')}
              </span>
            </div>
          </div>

          {/* Cash In/Out Movements of current shift */}
          {movements.length > 0 && (
            <div className="pt-2">
              <h4 className="font-bold text-xs text-[#294D35] mb-2">Riwayat Kas Masuk / Keluar Shift Ini:</h4>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {movements.map(m => (
                  <div key={m.id} className="p-2.5 bg-stone-50 rounded-lg border border-stone-200 text-xs flex justify-between items-center">
                    <div>
                      <span className={`font-semibold mr-2 ${m.type === 'cash_in' ? 'text-emerald-700' : 'text-red-600'}`}>
                        {m.type === 'cash_in' ? '+ Kas Masuk' : '- Kas Keluar'}
                      </span>
                      <span className="text-stone-700">{m.reason}</span>
                    </div>
                    <span className="font-mono font-bold text-[#294D35] tabular-nums">
                      Rp {m.amount.toLocaleString('id-ID')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-dashed border-[#DCE5D6] p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mx-auto text-stone-400">
            <Clock className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-base text-[#294D35]">Shift Kasir Belum Dibuka</h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            Buka shift kasir terlebih dahulu dan catat uang modal kembalian di laci kasir sebelum melayani transaksi POS.
          </p>
          <button
            onClick={() => setShowOpenShiftModal(true)}
            className="mt-2 px-5 py-2.5 bg-[#294D35] hover:bg-[#4F7655] text-white rounded-xl text-xs font-semibold transition-colors"
          >
            Buka Shift Sekarang
          </button>
        </div>
      )}

      {/* Historical Shifts Table */}
      <div className="bg-white rounded-xl border border-[#DCE5D6] overflow-hidden shadow-xs">
        <div className="p-4 border-b border-stone-200 flex items-center gap-2">
          <History className="w-4 h-4 text-[#4F7655]" />
          <h3 className="font-bold text-sm text-[#294D35]">Riwayat Shift Kasir Selesai ({pastSessions.length})</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] text-left border-collapse text-xs">
            <thead>
              <tr className="bg-stone-50/80 border-b border-stone-200 text-stone-600 font-semibold">
                <th className="py-3 px-4">Waktu Buka / Tutup</th>
                <th className="py-3 px-3">Kasir</th>
                <th className="py-3 px-3 text-right">Modal Awal</th>
                <th className="py-3 px-3 text-right">Penjualan Tunai</th>
                <th className="py-3 px-3 text-right">Kas Diharapkan</th>
                <th className="py-3 px-3 text-right">Kas Fisik</th>
                <th className="py-3 px-4 text-right">Selisih</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-mono">
              {pastSessions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-stone-400 font-sans">
                    Belum ada riwayat shift yang ditutup.
                  </td>
                </tr>
              ) : (
                pastSessions.map(s => {
                  const diff = s.discrepancy ?? 0;
                  return (
                    <tr key={s.id} className="hover:bg-stone-50/60">
                      <td className="py-3 px-4 font-sans text-stone-600">
                        <p>{new Date(s.openedAt).toLocaleDateString('id-ID')}</p>
                        <p className="text-[10px] text-stone-400 font-mono">
                          {new Date(s.openedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} — {s.closedAt ? new Date(s.closedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : ''}
                        </p>
                      </td>
                      <td className="py-3 px-3 font-sans font-medium text-stone-800">{s.cashierName}</td>
                      <td className="py-3 px-3 text-right tabular-nums">Rp {s.openingCash.toLocaleString('id-ID')}</td>
                      <td className="py-3 px-3 text-right tabular-nums">Rp {s.cashSales.toLocaleString('id-ID')}</td>
                      <td className="py-3 px-3 text-right tabular-nums">Rp {s.expectedCash.toLocaleString('id-ID')}</td>
                      <td className="py-3 px-3 text-right tabular-nums font-bold text-[#294D35]">
                        Rp {(s.actualCash ?? 0).toLocaleString('id-ID')}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums font-bold">
                        <span className={diff === 0 ? 'text-emerald-700' : diff < 0 ? 'text-red-600' : 'text-blue-700'}>
                          {diff === 0 ? 'Rp 0 (Pas)' : `${diff > 0 ? '+' : ''}Rp ${diff.toLocaleString('id-ID')}`}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Open Shift Modal */}
      {showOpenShiftModal && (
        <div className="fixed inset-0 z-50 bg-[rgba(41,77,53,0.55)] backdrop-blur-xs transition-opacity duration-200 ease-out flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-2xl border border-[#DCE5D6] shadow-2xl p-4 sm:p-6 relative max-h-[90dvh] flex flex-col my-auto overflow-hidden">
            <button
              onClick={() => setShowOpenShiftModal(false)}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 text-sm p-1 z-10"
            >
              ✕
            </button>
            <div className="shrink-0 mb-3 pr-6">
              <h3 className="text-base font-bold text-[#294D35] mb-0.5">Buka Shift Kasir Baru</h3>
              <p className="text-xs text-stone-500">
                Hitung dan masukkan modal awal uang kembalian di laci kasir.
              </p>
            </div>

            <form onSubmit={handleOpenShift} className="flex-1 overflow-y-auto min-h-0 space-y-3.5 text-xs pr-1 -mr-1">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Modal Kas Awal di Laci (Rp) *
                </label>
                <input
                  type="number"
                  value={openingFloat}
                  onChange={(e) => setOpeningFloat(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 text-base font-bold text-[#294D35] font-mono border border-stone-300 rounded-lg focus:outline-none focus:border-[#4F7655]"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Catatan / Rincian Pecahan Uang</label>
                <input
                  type="text"
                  value={openingNotes}
                  onChange={(e) => setOpeningNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:border-[#4F7655]"
                />
              </div>

              <div className="pt-3 border-t border-stone-200 shrink-0 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowOpenShiftModal(false)}
                  className="w-1/3 py-2.5 rounded-lg border border-stone-200 text-stone-700 font-semibold cursor-pointer hover:bg-stone-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-lg bg-[#294D35] hover:bg-[#4F7655] text-white font-semibold transition-colors cursor-pointer shadow-xs"
                >
                  Konfirmasi Buka Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cash In/Out Movement Modal */}
      {showMovementModal && activeSession && (
        <div className="fixed inset-0 z-50 bg-[rgba(41,77,53,0.55)] backdrop-blur-xs transition-opacity duration-200 ease-out flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-2xl border border-[#DCE5D6] shadow-2xl p-4 sm:p-6 relative max-h-[90dvh] flex flex-col my-auto overflow-hidden">
            <button
              onClick={() => setShowMovementModal(false)}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 text-sm p-1 z-10"
            >
              ✕
            </button>
            <div className="shrink-0 mb-3 pr-6">
              <h3 className="text-base font-bold text-[#294D35] mb-0.5">Mutasi Kas Laci Kasir</h3>
              <p className="text-xs text-stone-500">Catat penambahan modal atau pengeluaran operasional kecil.</p>
            </div>

            <form onSubmit={handleRecordMovement} className="flex-1 overflow-y-auto min-h-0 space-y-3.5 text-xs pr-1 -mr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMovementType('cash_in')}
                  className={`p-2.5 rounded-lg border font-semibold text-center transition-colors cursor-pointer ${
                    movementType === 'cash_in' ? 'border-[#4F7655] bg-[#4F7655]/10 text-[#294D35]' : 'border-stone-200 text-stone-600'
                  }`}
                >
                  + Kas Masuk (Tambah Modal)
                </button>
                <button
                  type="button"
                  onClick={() => setMovementType('cash_out')}
                  className={`p-2.5 rounded-lg border font-semibold text-center transition-colors cursor-pointer ${
                    movementType === 'cash_out' ? 'border-red-500 bg-red-50 text-red-700' : 'border-stone-200 text-stone-600'
                  }`}
                >
                  - Kas Keluar (Ambil Kas)
                </button>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Jumlah Uang (Rp) *</label>
                <input
                  type="number"
                  value={movementAmount}
                  onChange={(e) => setMovementAmount(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 text-base font-bold text-[#294D35] font-mono border border-stone-300 rounded-lg focus:outline-none focus:border-[#4F7655]"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Alasan Mutasi *</label>
                <input
                  type="text"
                  placeholder="Contoh: Tambah uang receh kembalian / Beli kantong kresek"
                  value={movementReason}
                  onChange={(e) => setMovementReason(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:border-[#4F7655]"
                />
              </div>

              <div className="pt-3 border-t border-stone-200 shrink-0 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowMovementModal(false)}
                  className="w-1/3 py-2.5 rounded-lg border border-stone-200 text-stone-700 font-semibold cursor-pointer hover:bg-stone-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-lg bg-[#294D35] hover:bg-[#4F7655] text-white font-semibold transition-colors cursor-pointer shadow-xs"
                >
                  Simpan Mutasi Kas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Close Shift Modal with 6-Digit PIN Security */}
      {showCloseShiftModal && activeSession && (
        <div className="fixed inset-0 z-50 bg-[rgba(41,77,53,0.55)] backdrop-blur-xs transition-opacity duration-200 ease-out flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-2xl border border-[#DCE5D6] shadow-2xl p-4 sm:p-6 relative max-h-[90dvh] flex flex-col my-auto overflow-hidden">
            <button
              onClick={() => setShowCloseShiftModal(false)}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 text-sm p-1 z-10"
            >
              ✕
            </button>
            <div className="shrink-0 mb-3 pr-6">
              <div className="flex items-center gap-2 mb-1">
                <Lock className="w-4 h-4 text-[#4F7655]" />
                <h3 className="text-base font-bold text-[#294D35]">Tutup Shift & Rekonsiliasi Kas</h3>
              </div>
              <p className="text-xs text-stone-500">
                Hitung uang fisik di laci kasir dan lakukan validasi rekonsiliasi.
              </p>
            </div>

            {closeError && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg shrink-0">
                {closeError}
              </div>
            )}

            <form onSubmit={handleCloseShift} className="flex-1 overflow-y-auto min-h-0 space-y-3.5 text-xs pr-1 -mr-1">
              <div className="p-3 bg-[#F5F7F2] rounded-xl border border-[#DCE5D6] flex justify-between items-center">
                <span className="text-stone-600 font-medium">Kas Diharapkan Sistem:</span>
                <span className="font-bold text-[#294D35] text-base font-mono">
                  Rp {expectedCashAmount.toLocaleString('id-ID')}
                </span>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Uang Fisik Riil Hasil Hitung Laci (Rp) *
                </label>
                <input
                  type="number"
                  value={physicalCash}
                  onChange={(e) => setPhysicalCash(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 text-base font-bold font-mono text-[#294D35] border border-stone-300 rounded-lg focus:outline-none focus:border-[#4F7655]"
                />
              </div>

              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex justify-between items-center text-xs">
                <span className="text-stone-600 font-medium">Selisih Kas Fisik:</span>
                <span className={`font-mono font-bold text-sm ${discrepancy === 0 ? 'text-emerald-700' : discrepancy < 0 ? 'text-red-600' : 'text-blue-700'}`}>
                  {discrepancy === 0 ? 'Rp 0 (Pas)' : `${discrepancy > 0 ? '+' : ''}Rp ${discrepancy.toLocaleString('id-ID')}`}
                </span>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Catatan Kasir</label>
                <input
                  type="text"
                  placeholder="Keterangan penutupan shift"
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:border-[#4F7655]"
                />
              </div>

              <div className="pt-2 border-t border-stone-200">
                <label className="block font-semibold text-stone-700 mb-1">
                  Otorisasi: Masukkan 6-Digit PIN Transaksi *
                </label>
                <input
                  type="password"
                  maxLength={6}
                  placeholder="••••••"
                  value={closePin}
                  onChange={(e) => setClosePin(e.target.value.replace(/\D/g, ''))}
                  required
                  className="w-full px-3 py-2 text-center text-lg tracking-widest font-mono border border-stone-300 rounded-lg focus:outline-none focus:border-[#4F7655]"
                />
              </div>

              <div className="pt-3 border-t border-stone-200 shrink-0 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCloseShiftModal(false)}
                  className="w-1/3 py-2.5 rounded-lg border border-stone-200 text-stone-700 font-semibold cursor-pointer hover:bg-stone-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isClosingShift}
                  className="flex-1 py-2.5 rounded-lg bg-[#294D35] hover:bg-[#4F7655] text-white font-semibold transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {isClosingShift ? 'Memverifikasi...' : 'Kunci & Tutup Shift'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
