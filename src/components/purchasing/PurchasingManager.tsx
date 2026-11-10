/**
 * JALORA — Purchasing & Supplier Module
 * Purchase Orders, Goods Receipt with Moving Weighted Average, and Accounts Payable
 * Created by Abdul Jalil
 */

import React, { useState, useMemo } from 'react';
import {
  Truck,
  Plus,
  Search,
  CheckCircle,
  Clock,
  UserCheck,
  Building,
  Phone,
  Calendar,
  AlertCircle,
  FileText,
  Download
} from 'lucide-react';
import { Purchase, PurchaseItem, Supplier, Product, Store, Branch, UserProfile } from '../../types';
import { jaloraStorage } from '../../services/storage';
import { formatIndonesianDateTime } from '../../utils/dateFormatter';
import { downloadCsv } from '../../utils/exportCsv';

interface PurchasingManagerProps {
  store: Store;
  branch: Branch;
  user: UserProfile;
  onRefreshData?: () => void;
}

export const PurchasingManager: React.FC<PurchasingManagerProps> = ({ store, branch, user, onRefreshData }) => {
  const [activeTab, setActiveTab] = useState<'purchases' | 'suppliers'>('purchases');
  
  // Modals
  const [showPOModal, setShowPOModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);

  // New PO Form State
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit'>('cash');
  const [poItems, setPoItems] = useState<{ productId: string; quantity: number; costPrice: number }[]>([]);
  const [poNotes, setPoNotes] = useState('');
  const [poError, setPoError] = useState('');
  const [isSubmittingPO, setIsSubmittingPO] = useState(false);

  // New Supplier Form State
  const [supName, setSupName] = useState('');
  const [supContact, setSupContact] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supAddress, setSupAddress] = useState('');
  const [supTerms, setSupTerms] = useState<number>(30);

  // Load Data
  const purchases = useMemo(() => jaloraStorage.getPurchases(store.id, branch.id), [store.id, branch.id, showPOModal]);
  const suppliers = useMemo(() => jaloraStorage.getSuppliers(store.id), [store.id, showSupplierModal]);
  const products = useMemo(() => jaloraStorage.getProducts(store.id), [store.id]);

  // Open Create PO Modal
  const handleOpenCreatePO = () => {
    setSelectedSupplierId(suppliers[0]?.id || '');
    setPaymentMethod('cash');
    setPoItems(products.slice(0, 2).map(p => ({ productId: p.id, quantity: 10, costPrice: p.costPrice })));
    setPoNotes('');
    setPoError('');
    setShowPOModal(true);
  };

  // Add Item Line to PO
  const handleAddPOLine = () => {
    const p = products[0];
    if (p) {
      setPoItems([...poItems, { productId: p.id, quantity: 1, costPrice: p.costPrice }]);
    }
  };

  const handleUpdatePOLine = (index: number, field: 'productId' | 'quantity' | 'costPrice', val: any) => {
    const updated = [...poItems];
    if (field === 'productId') {
      const prod = products.find(p => p.id === val);
      updated[index].productId = val;
      if (prod) updated[index].costPrice = prod.costPrice;
    } else {
      updated[index][field] = Number(val);
    }
    setPoItems(updated);
  };

  const handleRemovePOLine = (index: number) => {
    setPoItems(poItems.filter((_, i) => i !== index));
  };

  // PO Total calculation
  const poTotalAmount = useMemo(() => {
    return poItems.reduce((sum, item) => sum + (item.quantity * item.costPrice), 0);
  }, [poItems]);

  // Submit New PO
  const handleSavePO = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId) {
      setPoError('Pilih supplier terlebih dahulu.');
      return;
    }
    if (poItems.length === 0) {
      setPoError('Minimal harus ada 1 barang dalam pemesanan.');
      return;
    }

    setIsSubmittingPO(true);
    setPoError('');

    try {
      const now = new Date();
      const invoiceNumber = `PO-${branch.code}-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${now.getTime().toString().slice(-4)}`;
      const sup = suppliers.find(s => s.id === selectedSupplierId);

      const items: PurchaseItem[] = poItems.map(item => {
        const prod = products.find(p => p.id === item.productId);
        return {
          id: `pi_${Date.now()}_${item.productId}`,
          purchaseId: `po_${now.getTime()}`,
          productId: item.productId,
          productName: prod?.name || 'Item',
          quantity: item.quantity,
          costPrice: item.costPrice,
          subtotal: item.quantity * item.costPrice,
        };
      });

      const newPurchase: Purchase = {
        id: `po_${now.getTime()}`,
        storeId: store.id,
        branchId: branch.id,
        invoiceNumber,
        supplierId: selectedSupplierId,
        supplierName: sup?.name || 'Supplier',
        totalAmount: poTotalAmount,
        paidAmount: paymentMethod === 'cash' ? poTotalAmount : 0,
        paymentMethod,
        status: 'ordered',
        notes: poNotes.trim(),
        items,
        createdAt: now.toISOString(),
      };

      jaloraStorage.savePurchase(newPurchase);

      jaloraStorage.recordAuditLog({
        storeId: store.id,
        userName: user.name,
        userRole: user.role,
        action: 'BUAT_PO',
        targetEntity: 'Purchase',
        targetId: invoiceNumber,
        details: `Membuat PO #${invoiceNumber} kepada ${newPurchase.supplierName} total Rp ${newPurchase.totalAmount.toLocaleString('id-ID')}`,
        timestamp: new Date().toISOString(),
      });

      setShowPOModal(false);
      onRefreshData?.();
    } catch (err: any) {
      setPoError(err.message || 'Gagal menyimpan PO');
    } finally {
      setIsSubmittingPO(false);
    }
  };

  // Receive Goods Action (Auto stock + Moving weighted average + Double-entry accounting)
  const handleReceiveGoods = (p: Purchase) => {
    if (confirm(`Konfirmasi penerimaan barang untuk PO #${p.invoiceNumber}? Stok akan bertambah dan harga pokok rata-rata (Moving Average) akan diperbarui secara otomatis.`)) {
      const success = jaloraStorage.receivePurchase(p.id, store.id, branch.id, user.name);
      if (success) {
        alert(`Barang untuk PO #${p.invoiceNumber} berhasil diterima! Stok dan jurnal akuntansi telah terposting.`);
        onRefreshData?.();
      } else {
        alert('Gagal memproses penerimaan barang.');
      }
    }
  };

  // Save Supplier
  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supName.trim() || !supPhone.trim()) return;

    const newSup: Supplier = {
      id: `sup_${Date.now()}`,
      storeId: store.id,
      name: supName.trim(),
      contactPerson: supContact.trim(),
      phone: supPhone.trim(),
      address: supAddress.trim(),
      paymentTermsDays: supTerms,
      createdAt: new Date().toISOString(),
    };

    jaloraStorage.saveSupplier(newSup);
    setSupName('');
    setSupContact('');
    setSupPhone('');
    setSupAddress('');
    setShowSupplierModal(false);
    onRefreshData?.();
  };

  // Export Purchases to Excel-compatible CSV
  const handleExportPurchases = () => {
    if (purchases.length === 0) {
      alert('Tidak ada data pembelian untuk diekspor pada cabang ini.');
      return;
    }

    const headers = [
      'Toko',
      'Cabang',
      'No. PO',
      'Waktu Transaksi (WIB)',
      'Pemasok',
      'Metode Bayar',
      'Status Barang',
      'Jumlah Item',
      'Total Pembelian (Rp)',
      'Petugas',
      'Keterangan'
    ];

    const rows = purchases.map(p => [
      store.name,
      branch.name,
      p.invoiceNumber,
      formatIndonesianDateTime(p.createdAt),
      p.supplierName,
      p.paymentMethod === 'credit' ? 'Tempo (Utang Usaha)' : 'Tunai Langsung',
      p.status === 'received' ? 'Sudah Diterima' : 'Menunggu / Pending',
      p.items.reduce((s, it) => s + it.quantity, 0),
      p.totalAmount,
      user.name,
      p.notes || '-'
    ]);

    try {
      const nowStr = new Date().toISOString().split('T')[0];
      const filename = `Jalora_Laporan_Pembelian_${branch.code}_${nowStr}.csv`;
      downloadCsv(filename, headers, rows);
    } catch (err: any) {
      alert(err.message || 'Gagal mengekspor riwayat pembelian.');
    }
  };

  return (
    <div className="p-3.5 sm:p-5 lg:p-8 space-y-4 sm:space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#DCE5D6]">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#294D35]">Pembelian & Pemasok (Purchasing)</h2>
          <p className="text-xs text-stone-500 mt-1">
            Cabang: <strong className="text-[#294D35]">{branch.name}</strong> · Valuasi Moving Weighted Average saat Penerimaan
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportPurchases}
            className="px-3.5 py-2 rounded-lg border border-[#DCE5D6] bg-[#F5F0E5]/50 hover:bg-[#F5F0E5] text-xs font-semibold text-[#294D35] flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Ekspor seluruh data pembelian ke file CSV Excel"
          >
            <Download className="w-4 h-4 text-[#4F7655]" />
            <span>Unduh CSV Pembelian</span>
          </button>

          <button
            onClick={() => setShowSupplierModal(true)}
            className="px-3.5 py-2 rounded-lg border border-[#DCE5D6] bg-white hover:bg-stone-50 text-xs font-semibold text-[#294D35] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Building className="w-4 h-4 text-[#4F7655]" />
            <span>Tambah Pemasok</span>
          </button>

          <button
            onClick={handleOpenCreatePO}
            className="px-4 py-2 rounded-lg bg-[#294D35] hover:bg-[#4F7655] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Buat PO Baru</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 text-xs">
        <button
          onClick={() => setActiveTab('purchases')}
          className={`pb-2.5 px-3 font-semibold transition-colors flex items-center gap-1.5 ${
            activeTab === 'purchases'
              ? 'border-b-2 border-[#4F7655] text-[#294D35]'
              : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Daftar Pembelian ({purchases.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('suppliers')}
          className={`pb-2.5 px-3 font-semibold transition-colors flex items-center gap-1.5 ${
            activeTab === 'suppliers'
              ? 'border-b-2 border-[#4F7655] text-[#294D35]'
              : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Direktori Pemasok ({suppliers.length})</span>
        </button>
      </div>

      {/* Purchases Tab View */}
      {activeTab === 'purchases' && (
        <div className="bg-white rounded-xl border border-[#DCE5D6] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left border-collapse text-xs">
              <thead>
                <tr className="bg-stone-50/80 border-b border-stone-200 text-stone-600 font-semibold">
                  <th className="py-3 px-4">No. PO & Tanggal</th>
                  <th className="py-3 px-3">Pemasok (Supplier)</th>
                  <th className="py-3 px-3">Metode Bayar</th>
                  <th className="py-3 px-3 text-right">Total Tagihan</th>
                  <th className="py-3 px-3 text-center">Status Barang</th>
                  <th className="py-3 px-4 text-center">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {purchases.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-stone-400">
                      Belum ada data pembelian (Purchase Order) pada cabang ini.
                    </td>
                  </tr>
                ) : (
                  purchases.map(p => (
                    <tr key={p.id} className="hover:bg-stone-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <p className="font-semibold text-[#294D35] font-mono">{p.invoiceNumber}</p>
                        <p className="text-[11px] text-stone-500 mt-0.5">
                          {formatIndonesianDateTime(p.createdAt)}
                        </p>
                      </td>
                      <td className="py-3 px-3 text-stone-800 font-medium">
                        {p.supplierName}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-semibold uppercase text-stone-600">
                          {p.paymentMethod === 'credit' ? 'Tempo (Utang)' : 'Tunai / Lunas'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-[#294D35] font-mono tabular-nums">
                        Rp {p.totalAmount.toLocaleString('id-ID')}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          p.status === 'received' ? 'bg-emerald-50 text-emerald-800' :
                          p.status === 'ordered' ? 'bg-amber-50 text-amber-800' : 'bg-red-50 text-red-800'
                        }`}>
                          {p.status === 'received' ? 'Diterima' : p.status === 'ordered' ? 'Menunggu Barang' : 'Dibatalkan'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {p.status === 'ordered' ? (
                          <button
                            onClick={() => handleReceiveGoods(p)}
                            className="px-3 py-1 bg-[#294D35] hover:bg-[#4F7655] text-white rounded font-semibold text-[11px] transition-colors shadow-xs"
                          >
                            Terima Barang
                          </button>
                        ) : (
                          <span className="text-[11px] text-stone-400 font-mono">
                            Selesai {p.receivedAt ? new Date(p.receivedAt).toLocaleDateString('id-ID') : ''}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Suppliers Tab View */}
      {activeTab === 'suppliers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.length === 0 ? (
            <div className="col-span-full bg-white p-8 rounded-xl border border-[#DCE5D6] text-center text-stone-400 text-xs">
              Belum ada pemasok terdaftar. Klik <strong>Tambah Pemasok</strong> untuk menambahkan data supplier.
            </div>
          ) : (
            suppliers.map(sup => (
              <div key={sup.id} className="bg-white p-5 rounded-xl border border-[#DCE5D6] space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-[#294D35] text-sm">{sup.name}</h4>
                  <span className="text-stone-500 font-mono text-[11px]">Tempo: {sup.paymentTermsDays} Hari</span>
                </div>
                {sup.contactPerson && (
                  <p className="text-stone-600">PIC: {sup.contactPerson}</p>
                )}
                <p className="text-stone-600 flex items-center gap-1.5 font-mono">
                  <Phone className="w-3.5 h-3.5 text-stone-400" />
                  <span>{sup.phone}</span>
                </p>
                <p className="text-stone-500">{sup.address || 'Alamat tidak dicantumkan'}</p>
              </div>
            ))
          )}
        </div>
      )}

      {/* Create PO Modal */}
      {showPOModal && (
        <div className="fixed inset-0 z-50 bg-[rgba(41,77,53,0.55)] backdrop-blur-xs transition-opacity duration-200 ease-out flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-2xl border border-[#DCE5D6] shadow-2xl p-4 sm:p-6 relative max-h-[90dvh] flex flex-col my-auto overflow-hidden">
            <button
              onClick={() => setShowPOModal(false)}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 text-sm p-1 z-10"
            >
              ✕
            </button>

            <div className="shrink-0 mb-3 pr-6">
              <h3 className="text-base sm:text-lg font-bold text-[#294D35] mb-0.5">Buat Pesanan Pembelian (Purchase Order)</h3>
              <p className="text-xs text-stone-500">
                Pilih supplier dan barang yang ingin dipesan. Valuasi Moving Weighted Average akan berlaku saat barang diterima.
              </p>
            </div>

            {poError && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg shrink-0">
                {poError}
              </div>
            )}

            <form onSubmit={handleSavePO} className="flex-1 overflow-y-auto min-h-0 space-y-3.5 text-xs pr-1 -mr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Pemasok / Supplier *</label>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg bg-white focus:outline-none focus:border-[#4F7655]"
                  >
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Metode Pembayaran</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg bg-white focus:outline-none focus:border-[#4F7655]"
                  >
                    <option value="cash">Tunai (Kas)</option>
                    <option value="credit">Tempo / Kredit (Utang Usaha)</option>
                  </select>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2 pt-2 border-t border-stone-200">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-stone-700">Daftar Barang yang Dipesan:</span>
                  <button
                    type="button"
                    onClick={handleAddPOLine}
                    className="text-[#4F7655] font-bold hover:underline"
                  >
                    + Tambah Baris
                  </button>
                </div>

                {poItems.map((item, idx) => (
                  <div key={idx} className="p-3 bg-stone-50 rounded-xl border border-stone-200 grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-12 sm:col-span-5">
                      <select
                        value={item.productId}
                        onChange={(e) => handleUpdatePOLine(idx, 'productId', e.target.value)}
                        className="w-full px-2 py-1.5 border border-stone-300 rounded bg-white text-xs"
                      >
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-5 sm:col-span-3">
                      <input
                        type="number"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => handleUpdatePOLine(idx, 'quantity', e.target.value)}
                        className="w-full px-2 py-1.5 border border-stone-300 rounded text-right font-mono"
                      />
                    </div>

                    <div className="col-span-5 sm:col-span-3">
                      <input
                        type="number"
                        placeholder="Harga Beli"
                        value={item.costPrice}
                        onChange={(e) => handleUpdatePOLine(idx, 'costPrice', e.target.value)}
                        className="w-full px-2 py-1.5 border border-stone-300 rounded text-right font-mono tabular-nums"
                      />
                    </div>

                    <div className="col-span-2 sm:col-span-1 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemovePOLine(idx)}
                        className="text-red-500 hover:text-red-700 font-bold cursor-pointer p-1"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total Summary */}
              <div className="p-3 bg-[#F5F7F2] rounded-xl border border-[#DCE5D6] flex justify-between items-center text-sm">
                <span className="font-semibold text-stone-700">Estimasi Total Tagihan:</span>
                <span className="font-bold text-[#294D35] text-base tabular-nums">
                  Rp {poTotalAmount.toLocaleString('id-ID')}
                </span>
              </div>

              <div className="pt-3 border-t border-stone-200 shrink-0 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowPOModal(false)}
                  className="w-1/3 py-2.5 rounded-lg border border-stone-200 text-stone-700 font-semibold cursor-pointer hover:bg-stone-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPO}
                  className="flex-1 py-2.5 rounded-lg bg-[#294D35] hover:bg-[#4F7655] text-white font-semibold transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {isSubmittingPO ? 'Menyimpan PO...' : 'Simpan Purchase Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Supplier Modal */}
      {showSupplierModal && (
        <div className="fixed inset-0 z-50 bg-[rgba(41,77,53,0.55)] backdrop-blur-xs transition-opacity duration-200 ease-out flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-2xl border border-[#DCE5D6] shadow-2xl p-4 sm:p-6 relative max-h-[90dvh] flex flex-col my-auto overflow-hidden">
            <button
              onClick={() => setShowSupplierModal(false)}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 text-sm p-1 z-10"
            >
              ✕
            </button>
            <div className="shrink-0 mb-3 pr-6">
              <h3 className="text-base font-bold text-[#294D35]">Tambah Pemasok (Supplier) Baru</h3>
            </div>
            <form onSubmit={handleSaveSupplier} className="flex-1 overflow-y-auto min-h-0 space-y-3 text-xs pr-1 -mr-1">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Nama Perusahaan / Toko Supplier *</label>
                <input
                  type="text"
                  placeholder="Contoh: PT Sembako Nusantara"
                  value={supName}
                  onChange={(e) => setSupName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:border-[#4F7655]"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Nama Kontak PIC</label>
                <input
                  type="text"
                  placeholder="Contoh: Bapak Joko"
                  value={supContact}
                  onChange={(e) => setSupContact(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:border-[#4F7655]"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Nomor Telepon / WhatsApp *</label>
                <input
                  type="tel"
                  placeholder="Contoh: 08123456789"
                  value={supPhone}
                  onChange={(e) => setSupPhone(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:border-[#4F7655]"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Termin Pembayaran (Hari Tempo)</label>
                <input
                  type="number"
                  placeholder="30"
                  value={supTerms}
                  onChange={(e) => setSupTerms(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:border-[#4F7655]"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Alamat Supplier</label>
                <input
                  type="text"
                  value={supAddress}
                  onChange={(e) => setSupAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:border-[#4F7655]"
                />
              </div>

              <div className="pt-3 border-t border-stone-200 shrink-0">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#294D35] hover:bg-[#4F7655] text-white font-semibold rounded-lg transition-colors cursor-pointer shadow-xs"
                >
                  Simpan Pemasok
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
