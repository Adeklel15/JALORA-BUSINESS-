/**
 * JALORA — Point of Sale (POS) Terminal
 * High-performance checkout, idempotency key protection, thermal receipt,
 * and official WhatsApp Click to Chat integration with JALORA official color palette.
 * 
 * Colors:
 * - Forest Green (#294D35): Primary brand, headers, primary buttons
 * - Sage Green (#4F7655): Secondary buttons, supporting icons
 * - Olive Green (#4F7655): Accent actions, active indicators
 * - Lime Yellow (#D6BD7A): Highlights, badges, attention indicators
 * - Warm Cream (#F5F0E5): Surface, card backgrounds, panels
 * - Muted Beige (#DCE5D6): Borders, dividers, subtle separators
 * 
 * Created by Abdul Jalil
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CreditCard,
  QrCode,
  Banknote,
  Printer,
  Share2,
  CheckCircle2,
  AlertCircle,
  X,
  User,
  Clock,
  MessageSquare,
  History,
  Calendar,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Building,
  Wallet,
  Smartphone,
  Download,
  FileText,
  Copy,
  Check,
  Maximize2
} from 'lucide-react';
import { Product, CartItem, Sale, Store, Branch, UserProfile, PaymentMethod } from '../../types';
import { jaloraStorage } from '../../services/storage';
import { WhatsAppReceiptModal } from './WhatsAppReceiptModal';
import { formatIndonesianDateTime } from '../../utils/dateFormatter';
import { downloadCsv } from '../../utils/exportCsv';
import { downloadSalesReportPdf } from '../../utils/exportPdf';
import { soundService } from '../../services/soundNotification';

export function getPaymentMethodLabel(method: PaymentMethod): string {
  switch (method) {
    case 'cash': return 'Tunai';
    case 'qris': return 'QRIS';
    case 'transfer': return 'Transfer Bank';
    case 'debit_card': return 'Kartu Debit';
    case 'credit_card': return 'Kartu Kredit';
    case 'ewallet': return 'Dompet Digital';
    default: return method;
  }
}

interface PosTerminalProps {
  store: Store;
  branch: Branch;
  user: UserProfile;
  onRefreshData?: () => void;
}

export const PosTerminal: React.FC<PosTerminalProps> = ({ store, branch, user, onRefreshData }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [mobileCartExpanded, setMobileCartExpanded] = useState<boolean>(true);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Checkout Dialog State
  const paymentConfig = useMemo(() => jaloraStorage.getPaymentConfig(store.id), [store.id]);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paymentReference, setPaymentReference] = useState('');
  const [selectedBankId, setSelectedBankId] = useState<string>('');
  const [selectedEWalletId, setSelectedEWalletId] = useState<string>('');
  const [showQrisZoomModal, setShowQrisZoomModal] = useState(false);
  const [copiedText, setCopiedText] = useState<string>('');
  const [amountTendered, setAmountTendered] = useState<number>(0);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const isExecutingCheckoutRef = useRef(false);
  const [checkoutError, setCheckoutError] = useState('');

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(''), 2000);
  };

  // Receipt & WhatsApp Modal States
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [receiptPaperSize, setReceiptPaperSize] = useState<'58mm' | '80mm'>('58mm');
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [whatsAppSale, setWhatsAppSale] = useState<Sale | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Load products, stocks, categories, customers
  const products = useMemo(() => jaloraStorage.getProducts(store.id).filter(p => p.isActive), [store.id]);
  const categories = useMemo(() => jaloraStorage.getCategories(store.id), [store.id]);
  const customers = useMemo(() => jaloraStorage.getCustomers(store.id), [store.id]);
  const printerConfig = useMemo(() => jaloraStorage.getPrinterConfig(), []);
  const activeCashSession = useMemo(() => jaloraStorage.getActiveCashSession(store.id, branch.id), [store.id, branch.id]);
  
  // Recent sales for Transaction History
  const recentSales = useMemo(() => {
    return jaloraStorage.getSales(store.id, branch.id);
  }, [store.id, branch.id, completedSale]);

  // Selected customer object for pre-filling phone
  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId);
  }, [customers, selectedCustomerId]);

  // Map product stock for current branch
  const productStocks = useMemo(() => {
    const map = new Map<string, number>();
    products.forEach(p => {
      const stock = jaloraStorage.getProductStock(store.id, branch.id, p.id);
      map.set(p.id, stock.quantity);
    });
    return map;
  }, [products, store.id, branch.id, completedSale]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchCat = selectedCategory === 'all' || p.categoryId === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchQuery = !q || 
        p.name.toLowerCase().includes(q) || 
        p.sku.toLowerCase().includes(q) || 
        (p.barcode && p.barcode.toLowerCase().includes(q));
      return matchCat && matchQuery;
    });
  }, [products, selectedCategory, searchQuery]);

  // Cart calculations
  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  }, [cart]);

  const discountAmount = useMemo(() => {
    return Math.round((cartSubtotal * discountPercent) / 100);
  }, [cartSubtotal, discountPercent]);

  const taxAmount = useMemo(() => {
    if (!store.isTaxActive || store.taxRate <= 0) return 0;
    return Math.round((cartSubtotal - discountAmount) * store.taxRate);
  }, [store.isTaxActive, store.taxRate, cartSubtotal, discountAmount]);

  const cartTotal = useMemo(() => {
    return Math.max(0, cartSubtotal - discountAmount + taxAmount);
  }, [cartSubtotal, discountAmount, taxAmount]);

  const changeAmount = useMemo(() => {
    if (paymentMethod !== 'cash') return 0;
    return Math.max(0, amountTendered - cartTotal);
  }, [paymentMethod, amountTendered, cartTotal]);

  // Cart Handlers
  const addToCart = (product: Product) => {
    const stock = productStocks.get(product.id) ?? 0;
    const existingIndex = cart.findIndex(item => item.product.id === product.id);

    if (existingIndex > -1) {
      const currentQty = cart[existingIndex].quantity;
      if (currentQty + 1 > stock) {
        alert(`Peringatan: Stok ${product.name} di cabang ini hanya tersedia ${stock} ${product.unit}.`);
      }
      const updated = [...cart];
      updated[existingIndex].quantity += 1;
      updated[existingIndex].subtotal = updated[existingIndex].quantity * updated[existingIndex].unitPrice;
      setCart(updated);
    } else {
      if (stock <= 0) {
        alert(`Perhatian: Stok ${product.name} saat ini 0. Pastikan barang fisik tersedia di rak.`);
      }
      setCart([...cart, {
        product,
        quantity: 1,
        unitPrice: product.sellingPrice,
        discountPercent: 0,
        subtotal: product.sellingPrice,
      }]);
    }
  };

  const updateCartQuantity = (productId: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.product.id === productId) {
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null;
          return {
            ...item,
            quantity: newQty,
            subtotal: newQty * item.unitPrice,
          };
        }
        return item;
      }).filter(Boolean) as CartItem[];
    });
  };

  const removeCartItem = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  // Open Checkout
  const handleOpenCheckout = () => {
    if (cart.length === 0) return;
    setAmountTendered(cartTotal);
    setPaymentReference('');
    const safeDefault = (paymentConfig.defaultMethod === 'debit_card' || paymentConfig.defaultMethod === 'credit_card')
      ? 'cash'
      : (paymentConfig.defaultMethod || 'cash');
    setPaymentMethod(safeDefault);
    setCheckoutError('');

    // Preselect active bank
    const activeBanks = (paymentConfig.bankAccounts || []).filter(b => b.isActive);
    if (activeBanks.length > 0) {
      setSelectedBankId(activeBanks[0].id);
    } else {
      setSelectedBankId('');
    }

    // Preselect active e-wallet
    const activeEWallets = (paymentConfig.eWallets || []).filter(w => w.isActive);
    if (activeEWallets.length > 0) {
      setSelectedEWalletId(activeEWallets[0].id);
    } else {
      setSelectedEWalletId('');
    }

    setShowCheckoutModal(true);
  };

  // Keyboard Shortcuts: F8 (Bayar), F2 (Fokus Cari), Esc (Tutup Dialog / Struk)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Jangan ganggu jika user sedang mengetik di input teks (kecuali shortcut tombol F)
      const target = e.target as HTMLElement | null;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT');

      if (e.key === 'F8') {
        e.preventDefault();
        if (cart.length > 0 && !showCheckoutModal && !completedSale) {
          handleOpenCheckout();
        }
      } else if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'Escape') {
        if (showWhatsAppModal) {
          setShowWhatsAppModal(false);
        } else if (completedSale) {
          setCompletedSale(null);
        } else if (showCheckoutModal) {
          setShowCheckoutModal(false);
        } else if (showHistoryModal) {
          setShowHistoryModal(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart.length, showCheckoutModal, completedSale, showWhatsAppModal, showHistoryModal, cartTotal, paymentConfig.defaultMethod]);

  // Quick Cash amount buttons
  const setQuickCash = (amount: number) => {
    setAmountTendered(amount);
  };

  // Atomic Checkout Execution
  const handleExecutePayment = () => {
    if (cart.length === 0) return;
    if (isExecutingCheckoutRef.current) return;

    if (paymentMethod === 'cash' && amountTendered < cartTotal) {
      setCheckoutError(`Uang yang diterima (Rp ${amountTendered.toLocaleString('id-ID')}) kurang dari total tagihan.`);
      return;
    }

    isExecutingCheckoutRef.current = true;
    setIsProcessing(true);
    setCheckoutError('');

    try {
      const now = new Date();
      const timestamp = now.getTime();
      const invoiceNumber = `INV-${branch.code}-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${timestamp.toString().slice(-4)}`;
      const idempotencyKey = `sale_${store.id}_${branch.id}_${timestamp}_${Math.random().toString(36).substring(2, 7)}`;

      const customer = customers.find(c => c.id === selectedCustomerId);

      let fullPaymentReference: string | undefined = undefined;
      if (paymentMethod === 'transfer') {
        const bank = (paymentConfig.bankAccounts || []).find(b => b.id === selectedBankId);
        const bankInfo = bank ? `${bank.bankName} (${bank.accountNumber})` : 'Transfer Bank';
        fullPaymentReference = paymentReference.trim()
          ? `${bankInfo} · Ref: ${paymentReference.trim()}`
          : bankInfo;
      } else if (paymentMethod === 'ewallet') {
        const wallet = (paymentConfig.eWallets || []).find(w => w.id === selectedEWalletId);
        const walletInfo = wallet ? `${wallet.provider} (${wallet.accountNumber})` : 'Dompet Digital';
        fullPaymentReference = paymentReference.trim()
          ? `${walletInfo} · Ref: ${paymentReference.trim()}`
          : walletInfo;
      } else if (paymentMethod === 'qris') {
        fullPaymentReference = paymentReference.trim()
          ? `QRIS Ref: ${paymentReference.trim()}`
          : (paymentConfig.qrisMerchantName ? `QRIS (${paymentConfig.qrisMerchantName})` : 'QRIS');
      }

      const newSale: Sale = {
        id: `sale_${timestamp}`,
        storeId: store.id,
        branchId: branch.id,
        invoiceNumber,
        cashierId: user.id,
        cashierName: user.name,
        customerId: customer?.id,
        customerName: customer?.name,
        subtotal: cartSubtotal,
        discountAmount,
        taxAmount,
        totalAmount: cartTotal,
        paymentMethod,
        paymentReference: fullPaymentReference,
        amountTendered: paymentMethod === 'cash' ? amountTendered : cartTotal,
        changeAmount: paymentMethod === 'cash' ? Math.max(0, amountTendered - cartTotal) : 0,
        status: 'completed',
        idempotencyKey,
        items: cart.map(item => ({
          id: `si_${Date.now()}_${item.product.id}`,
          saleId: `sale_${timestamp}`,
          productId: item.product.id,
          productName: item.product.name,
          quantity: item.quantity,
          unit: item.product.unit,
          costPrice: item.product.costPrice,
          unitPrice: item.unitPrice,
          discountPercent: item.discountPercent,
          subtotal: item.subtotal,
        })),
        createdAt: now.toISOString(),
      };

      const result = jaloraStorage.commitSale(newSale, user.name);

      if (!result.success || !result.sale) {
        throw new Error(result.error || 'Gagal menyimpan transaksi.');
      }

      // Trigger transaction success chime & toast notification
      soundService.notifyTransactionSuccess({
        invoiceNumber: result.sale.invoiceNumber,
        totalAmount: result.sale.totalAmount,
        paymentMethod: getPaymentMethodLabel(result.sale.paymentMethod),
        customerName: result.sale.customerName,
      });

      // Restorasi alur kasir: Tampilkan langsung Struk Thermal Kasir
      setCompletedSale(result.sale);
      setWhatsAppSale(result.sale);
      setShowWhatsAppModal(false);

      setCart([]);
      setShowCheckoutModal(false);
      onRefreshData?.();

      if (printerConfig.autoPrint) {
        setTimeout(() => {
          window.print();
        }, 300);
      }
    } catch (err: any) {
      soundService.notifyTransactionError(err.message || 'Gagal menyimpan transaksi kasir.');
      setCheckoutError(err.message || 'Terjadi kesalahan sistem POS.');
    } finally {
      isExecutingCheckoutRef.current = false;
      setIsProcessing(false);
    }
  };

  // Re-open WhatsApp modal for any sale
  const handleOpenWhatsAppForSale = (sale: Sale) => {
    setWhatsAppSale(sale);
    setShowWhatsAppModal(true);
  };

  // Export Sales History to Excel-compatible CSV
  const handleExportSales = () => {
    if (recentSales.length === 0) {
      alert('Tidak ada data riwayat transaksi penjualan untuk diekspor pada cabang ini.');
      return;
    }

    const headers = [
      'Toko',
      'Cabang',
      'No. Faktur',
      'Waktu Transaksi (WIB)',
      'Kasir',
      'Pelanggan',
      'Metode Pembayaran',
      'No. Referensi',
      'Total Item',
      'Subtotal (Rp)',
      'Diskon (Rp)',
      'Pajak (PPN Rp)',
      'Total Akhir (Rp)',
      'Jumlah Diterima (Rp)',
      'Kembalian (Rp)'
    ];

    const rows = recentSales.map(sale => [
      store.name,
      branch.name,
      sale.invoiceNumber,
      formatIndonesianDateTime(sale.createdAt),
      sale.cashierName,
      sale.customerName || 'Pelanggan Umum',
      getPaymentMethodLabel(sale.paymentMethod),
      sale.paymentReference || '-',
      sale.items.reduce((s, it) => s + it.quantity, 0),
      sale.subtotal,
      sale.discountAmount,
      sale.taxAmount,
      sale.totalAmount,
      sale.amountTendered || sale.totalAmount,
      sale.changeAmount || 0
    ]);

    const nowStr = new Date().toISOString().split('T')[0];
    const filename = `Jalora_Laporan_Penjualan_${branch.code}_${nowStr}.csv`;
    downloadCsv(filename, headers, rows);
  };

  // Export Sales History to Official PDF
  const handleExportSalesPdf = () => {
    if (recentSales.length === 0) {
      alert('Tidak ada data riwayat transaksi penjualan untuk diekspor pada cabang ini.');
      return;
    }

    try {
      downloadSalesReportPdf({
        store,
        branch,
        sales: recentSales,
      });
    } catch (err: any) {
      alert(err.message || 'Gagal mengekspor riwayat penjualan ke PDF.');
    }
  };

  return (
    <div className="h-full flex flex-col md:flex-row overflow-hidden bg-[#F5F7F2]">
      {/* Left Area (Upper on Mobile): Product Catalog & Search */}
      <div className="flex-1 flex flex-col border-r-0 md:border-r border-[#DCE5D6] h-full overflow-hidden min-h-0">
        {/* Top Filter Bar */}
        <div className="p-2.5 sm:p-4 bg-white border-b border-[#DCE5D6] space-y-2 sm:space-y-3 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            {/* Full-width Search on Smartphone */}
            <div className="w-full relative">
              <Search className="w-4 h-4 text-[#4F7655] absolute left-3 top-2.5 sm:top-3" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Cari nama produk, SKU, barcode... (F2)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-stone-50 border border-[#DCE5D6] rounded-xl focus:outline-none focus:border-[#4F7655] focus:bg-white text-[#294D35]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-xs text-stone-400 hover:text-stone-700 cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Quick Actions (Shift & History) */}
            <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#F5F0E5]/60 rounded-xl border border-[#DCE5D6] text-[11px] sm:text-xs">
                <Clock className="w-3.5 h-3.5 text-[#4F7655]" />
                {activeCashSession ? (
                  <span className="text-[#294D35] font-medium">Shift Aktif</span>
                ) : (
                  <span className="text-amber-800 font-medium">Shift Tutup</span>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowHistoryModal(true)}
                className="px-2.5 py-1 sm:px-3 sm:py-2 bg-stone-100 hover:bg-[#F5F0E5] text-[#294D35] border border-[#DCE5D6] rounded-xl text-[11px] sm:text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Lihat Riwayat Transaksi Hari Ini"
              >
                <History className="w-3.5 h-3.5 text-[#4F7655]" />
                <span>Riwayat Struk</span>
              </button>
            </div>
          </div>

          {/* Category Tabs: Smooth Horizontal Scrolling */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar flex-nowrap scroll-smooth">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap font-medium transition-colors cursor-pointer shrink-0 ${
                selectedCategory === 'all'
                  ? 'bg-[#294D35] text-white shadow-xs font-semibold'
                  : 'bg-stone-100 text-stone-600 hover:bg-[#F5F0E5]/50 border border-transparent'
              }`}
            >
              Semua Kategori ({products.length})
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl whitespace-nowrap font-medium transition-colors cursor-pointer shrink-0 ${
                  selectedCategory === cat.id
                    ? 'bg-[#294D35] text-white shadow-xs font-semibold'
                    : 'bg-stone-100 text-stone-600 hover:bg-[#F5F0E5]/50'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Product Cards Grid: 2 Columns on Smartphone, 3 on Tablet, 4 on Desktop */}
        <div className="flex-1 overflow-y-auto p-2.5 sm:p-4 min-h-0">
          {filteredProducts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 sm:p-8">
              <div className="w-12 h-12 rounded-full bg-[#F5F0E5]/60 flex items-center justify-center text-[#4F7655] mb-3">
                <Search className="w-6 h-6" />
              </div>
              <p className="font-semibold text-[#294D35] text-sm">Produk tidak ditemukan</p>
              <p className="text-xs text-stone-500 mt-1 max-w-xs">
                Tidak ada produk yang cocok dengan &quot;{searchQuery}&quot;. Pastikan nama atau SKU sesuai.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3">
              {filteredProducts.map(product => {
                const stock = productStocks.get(product.id) ?? 0;
                const isLow = stock <= product.minStock;

                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => addToCart(product)}
                    className="bg-white rounded-2xl border border-[#DCE5D6] hover:border-[#4F7655] p-2.5 sm:p-3 text-left flex flex-col justify-between transition-all hover:shadow-xs group cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 text-[10px] sm:text-[11px] text-stone-500 mb-1">
                        <span className="font-mono truncate max-w-[60px] xs:max-w-[75px] sm:max-w-none">{product.sku}</span>
                        <span className={`font-mono text-[10px] sm:text-[11px] shrink-0 ${isLow ? 'text-amber-800 font-bold bg-[#D6BD7A]/30 px-1 rounded' : 'text-stone-500'}`}>
                          Sisa: {stock} {product.unit}
                        </span>
                      </div>
                      <h4 className="font-semibold text-[#294D35] text-xs sm:text-sm line-clamp-2 min-h-[2.4em] group-hover:text-[#4F7655] transition-colors leading-snug">
                        {product.name}
                      </h4>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-[#DCE5D6]/50 flex items-center justify-between gap-1">
                      <span className="font-bold text-[#294D35] text-xs sm:text-sm tabular-nums truncate">
                        Rp {product.sellingPrice.toLocaleString('id-ID')}
                      </span>
                      <div className="w-7 h-7 sm:w-6 sm:h-6 min-w-[28px] min-h-[28px] rounded-lg bg-[#F5F0E5]/70 group-hover:bg-[#4F7655] group-hover:text-white flex items-center justify-center text-[#294D35] transition-colors shrink-0">
                        <Plus className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right Area (Bottom Panel on Mobile): Responsive Keranjang Kasir */}
      <div className="w-full md:w-[320px] lg:w-[380px] xl:w-[420px] bg-white flex flex-col border-t md:border-t-0 md:border-l border-[#DCE5D6] shadow-lg md:shadow-none shrink-0 md:h-full z-20">
        {/* Cart Header with Mobile Expand/Collapse Toggle */}
        <div className="p-2.5 sm:p-3.5 md:p-4 border-b border-[#DCE5D6] flex items-center justify-between bg-[#F5F0E5]/30 shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 text-[#4F7655]" />
            <h3 className="font-bold text-[#294D35] text-xs sm:text-sm">
              Keranjang Kasir ({cart.reduce((s, i) => s + i.quantity, 0)})
            </h3>
            {/* Mobile Toggle Button */}
            {cart.length > 0 && (
              <button
                type="button"
                onClick={() => setMobileCartExpanded(!mobileCartExpanded)}
                className="md:hidden ml-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center gap-0.5 cursor-pointer"
                title={mobileCartExpanded ? 'Perkecil tampilan daftar item' : 'Buka rincian daftar item'}
              >
                {mobileCartExpanded ? (
                  <>
                    <span>Tutup</span>
                    <ChevronDown className="w-3 h-3 text-stone-500" />
                  </>
                ) : (
                  <>
                    <span>Rincian</span>
                    <ChevronUp className="w-3 h-3 text-stone-500" />
                  </>
                )}
              </button>
            )}
          </div>
          {cart.length > 0 && (
            <button
              type="button"
              onClick={clearCart}
              className="text-[11px] sm:text-xs text-red-600 hover:text-red-700 flex items-center gap-1 font-medium cursor-pointer"
            >
              <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>Kosongkan</span>
            </button>
          )}
        </div>

        {/* Customer Assignment (Walk-in or registered) */}
        <div className={`px-3 py-1.5 sm:px-4 sm:py-2 border-b border-[#DCE5D6]/50 bg-white ${mobileCartExpanded || cart.length === 0 ? 'block' : 'hidden md:block'}`}>
          <div className="flex items-center gap-2 text-xs">
            <User className="w-3.5 h-3.5 text-[#4F7655]" />
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="flex-1 py-1 text-xs border border-[#DCE5D6] rounded-lg bg-stone-50 text-[#294D35] focus:outline-none focus:border-[#4F7655]"
            >
              <option value="">Pelanggan Umum (Tanpa Akun)</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Cart Items List: Scrollable when items are many */}
        <div className={`overflow-y-auto p-2.5 sm:p-4 space-y-2 sm:space-y-2.5 ${mobileCartExpanded ? 'max-h-32 xs:max-h-40 sm:max-h-48 md:max-h-none md:flex-1' : 'hidden md:block md:flex-1'}`}>
          {cart.length === 0 ? (
            <div className="py-3 md:h-full flex flex-col items-center justify-center text-center p-3 sm:p-6 text-stone-400">
              <ShoppingCart className="w-7 h-7 sm:w-10 sm:h-10 stroke-1 mb-1 text-[#4F7655]" />
              <p className="text-xs font-medium text-[#294D35]">Keranjang masih kosong</p>
              <p className="text-[10px] sm:text-[11px] text-stone-500 mt-0.5">Pilih produk di atas untuk menambah pesanan</p>
            </div>
          ) : (
            cart.map(item => (
              <div
                key={item.product.id}
                className="bg-[#F5F7F2] p-2 sm:p-2.5 rounded-xl border border-[#DCE5D6] flex items-center justify-between gap-2 sm:gap-3 text-xs"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#294D35] truncate">{item.product.name}</p>
                  <p className="text-stone-500 text-[10px] sm:text-[11px] tabular-nums">
                    Rp {item.unitPrice.toLocaleString('id-ID')} / {item.product.unit}
                  </p>
                </div>

                {/* Quantity Stepper */}
                <div className="flex items-center gap-1 bg-white border border-[#DCE5D6] rounded-lg p-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => updateCartQuantity(item.product.id, -1)}
                    className="w-5 h-5 flex items-center justify-center text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded cursor-pointer"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-5 text-center font-bold text-[#294D35] tabular-nums text-xs">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateCartQuantity(item.product.id, 1)}
                    className="w-5 h-5 flex items-center justify-center text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="text-right min-w-[65px] sm:min-w-[70px] shrink-0">
                  <p className="font-bold text-[#294D35] tabular-nums text-xs">
                    Rp {item.subtotal.toLocaleString('id-ID')}
                  </p>
                  <button
                    type="button"
                    onClick={() => removeCartItem(item.product.id)}
                    className="text-[10px] text-red-500 hover:text-red-700 cursor-pointer"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart Calculation & Checkout Area (Docked at bottom of cart, shrink-0 so always visible) */}
        <div className="p-2.5 sm:p-3 md:p-4 border-t border-[#DCE5D6] bg-[#F5F0E5]/20 space-y-2 shrink-0">
          {/* 1. Subtotal */}
          <div className="flex justify-between text-xs text-stone-600">
            <span>Subtotal</span>
            <span className="font-semibold text-[#294D35] tabular-nums">
              Rp {cartSubtotal.toLocaleString('id-ID')}
            </span>
          </div>

          {/* 2. Diskon */}
          <div className="flex items-center justify-between text-xs text-stone-600">
            <span>Diskon Toko</span>
            <div className="flex items-center gap-1">
              {[0, 5, 10].map(pct => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setDiscountPercent(pct)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-medium transition-colors cursor-pointer ${
                    discountPercent === pct
                      ? 'bg-[#294D35] text-white font-semibold'
                      : 'bg-white border border-[#DCE5D6] text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          {discountAmount > 0 && (
            <div className="flex justify-between text-xs text-[#4F7655] font-semibold">
              <span>Potongan Diskon ({discountPercent}%)</span>
              <span className="tabular-nums">-Rp {discountAmount.toLocaleString('id-ID')}</span>
            </div>
          )}

          {/* 3. PPN */}
          {store.isTaxActive && (
            <div className="flex justify-between text-xs text-stone-600">
              <span>PPN ({(store.taxRate * 100).toFixed(0)}%)</span>
              <span className="tabular-nums">Rp {taxAmount.toLocaleString('id-ID')}</span>
            </div>
          )}

          {/* 4. TOTAL BAYAR */}
          <div className="pt-1.5 border-t border-[#DCE5D6] flex justify-between items-baseline">
            <span className="text-[11px] sm:text-xs font-bold text-stone-700 uppercase tracking-wide">TOTAL BAYAR</span>
            <span className="text-base sm:text-lg md:text-xl font-bold text-[#294D35] tabular-nums">
              Rp {cartTotal.toLocaleString('id-ID')}
            </span>
          </div>

          {/* 5. LANJUTKAN BAYAR */}
          <button
            type="button"
            onClick={handleOpenCheckout}
            disabled={cart.length === 0}
            className="w-full mt-1.5 bg-[#294D35] hover:bg-[#1e3827] active:scale-[0.99] disabled:opacity-40 disabled:hover:bg-[#294D35] disabled:cursor-not-allowed text-white font-bold py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl transition-all shadow-sm hover:shadow flex items-center justify-between text-xs sm:text-sm md:text-base cursor-pointer group"
            title={cart.length === 0 ? 'Tambahkan produk ke keranjang untuk melanjutkan pembayaran' : 'Lanjutkan ke Pembayaran (F8)'}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Banknote className="w-4 h-4 sm:w-5 sm:h-5 text-[#D6BD7A] shrink-0" />
              <div className="text-left truncate">
                <span className="font-extrabold tracking-wide block leading-tight text-xs sm:text-sm">LANJUTKAN BAYAR</span>
                <span className="text-[9px] sm:text-[10px] text-white/75 font-normal block">Shortcut F8</span>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0 font-mono font-bold text-xs sm:text-sm bg-black/20 px-2.5 py-1 rounded-lg border border-white/10">
              <span>Rp {cartTotal.toLocaleString('id-ID')}</span>
              <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#D6BD7A]" />
            </div>
          </button>
        </div>
      </div>

      {/* Checkout Modal — Rendered into document.body via createPortal for true fullscreen backdrop */}
      {showCheckoutModal && createPortal(
        <div className="fixed inset-0 z-50 bg-[rgba(41,77,53,0.55)] backdrop-blur-xs transition-opacity duration-200 ease-out flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-md sm:max-w-lg rounded-2xl border border-[#DCE5D6] shadow-2xl p-4 sm:p-5 relative my-auto h-auto max-h-[90dvh] flex flex-col overflow-hidden animate-jalora-enter">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-2.5 border-b border-[#DCE5D6]/60 shrink-0">
              <div className="pr-4">
                <h3 className="text-base sm:text-lg font-bold text-[#294D35] leading-tight">
                  Penyelesaian Pembayaran POS
                </h3>
                <p className="text-[11px] sm:text-xs text-stone-500 mt-0.5">
                  Pilih metode pembayaran dan masukkan jumlah uang yang diterima
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCheckoutModal(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer shrink-0"
                title="Tutup Modal Pembayaran"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Modal Body */}
            <div className="flex-1 overflow-y-auto py-2.5 space-y-3 pr-0.5 min-h-0">
              {checkoutError && (
                <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{checkoutError}</span>
                </div>
              )}

              {/* Total Tagihan Banner */}
              <div className="bg-[#F5F0E5]/60 p-3 sm:p-4 rounded-xl border border-[#DCE5D6] text-center">
                <span className="text-[11px] sm:text-xs text-stone-600 uppercase tracking-wider font-semibold">
                  Total Tagihan
                </span>
                <p className="text-2xl sm:text-3xl font-bold text-[#294D35] tabular-nums mt-0.5">
                  Rp {cartTotal.toLocaleString('id-ID')}
                </p>
              </div>

              {/* Payment Methods Grid (Hanya Tunai, Transfer Bank, E-Wallet, QRIS) */}
              <div>
                <label className="block text-xs font-semibold text-[#294D35] mb-1.5">
                  Pilih Metode Pembayaran Pelanggan:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'cash' as PaymentMethod, label: 'Tunai', icon: Banknote },
                    { id: 'transfer' as PaymentMethod, label: 'Transfer Bank', icon: Building },
                    { id: 'ewallet' as PaymentMethod, label: 'E-Wallet', icon: Wallet },
                    { id: 'qris' as PaymentMethod, label: 'QRIS', icon: QrCode },
                  ]
                    .filter((item) => (paymentConfig.enabledMethods || ['cash']).includes(item.id))
                    .map((item) => {
                      const Icon = item.icon;
                      const isSelected = paymentMethod === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setPaymentMethod(item.id);
                            setCheckoutError('');
                          }}
                          className={`p-2 sm:p-2.5 rounded-xl border text-center font-medium text-xs flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                            isSelected
                              ? 'border-[#294D35] bg-[#294D35] text-white font-bold shadow-xs'
                              : 'border-[#DCE5D6] bg-[#F5F7F2] hover:bg-[#F5F0E5]/50 text-stone-700'
                          }`}
                        >
                          <Icon className={`w-4 h-4 ${isSelected ? 'text-[#D6BD7A]' : 'text-[#4F7655]'}`} />
                          <span className="text-[11px] sm:text-xs truncate w-full">{item.label}</span>
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* Method Details Panel */}
              {paymentMethod === 'cash' ? (
                <div className="space-y-2.5 bg-[#F5F7F2] p-3 rounded-xl border border-[#DCE5D6]">
                  <div>
                    <label className="block text-xs font-semibold text-[#294D35] mb-1">
                      Uang Tunai Diterima (Rp)
                    </label>
                    <input
                      type="number"
                      value={amountTendered || ''}
                      onChange={(e) => setAmountTendered(Number(e.target.value))}
                      placeholder="Masukkan nominal uang..."
                      className="w-full px-3 py-2 text-base sm:text-lg font-bold text-[#294D35] tabular-nums border border-[#DCE5D6] rounded-xl focus:outline-none focus:border-[#4F7655] bg-white"
                    />
                  </div>

                  {/* Warning if cash is insufficient */}
                  {amountTendered > 0 && amountTendered < cartTotal && (
                    <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px] flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                      <span>
                        Uang tunai masih kurang{' '}
                        <strong>Rp {(cartTotal - amountTendered).toLocaleString('id-ID')}</strong>
                      </span>
                    </div>
                  )}

                  {/* Quick amount suggestion chips */}
                  <div>
                    <span className="block text-[10px] text-stone-500 font-medium mb-1">Pilihan Cepat:</span>
                    <div className="flex flex-wrap gap-1.5 text-xs">
                      <button
                        type="button"
                        onClick={() => setQuickCash(cartTotal)}
                        className="px-2.5 py-1 bg-white hover:bg-[#F5F0E5] rounded-lg font-semibold text-[#294D35] border border-[#DCE5D6] cursor-pointer text-xs transition-colors"
                      >
                        Uang Pas
                      </button>
                      {[10000, 20000, 50000, 100000, 200000].map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setQuickCash(val)}
                          className="px-2.5 py-1 bg-white hover:bg-[#F5F0E5] rounded-lg font-medium text-[#294D35] tabular-nums border border-[#DCE5D6] cursor-pointer text-xs transition-colors"
                        >
                          Rp {val.toLocaleString('id-ID')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Change indicator */}
                  <div className="p-2.5 bg-white rounded-xl border border-[#DCE5D6] flex justify-between items-center text-xs sm:text-sm">
                    <span className="text-stone-600 font-medium">Uang Kembalian:</span>
                    <span className={`font-bold text-sm sm:text-base tabular-nums ${amountTendered >= cartTotal ? 'text-[#4F7655]' : 'text-red-600'}`}>
                      Rp {changeAmount.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              ) : paymentMethod === 'qris' ? (
                <div className="p-3 bg-stone-50 rounded-xl border border-[#DCE5D6] space-y-2.5">
                  {/* QRIS Photo Display */}
                  {paymentConfig.qrisImageUrl ? (
                    <div className="flex flex-col items-center space-y-2">
                      <div className="relative group">
                        <div className="w-40 h-40 sm:w-48 sm:h-48 bg-white border border-[#DCE5D6] rounded-2xl flex items-center justify-center p-2 shrink-0 shadow-xs">
                          <img
                            src={paymentConfig.qrisImageUrl}
                            alt="Kode QRIS Toko"
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowQrisZoomModal(true)}
                          className="absolute bottom-2 right-2 px-2.5 py-1 bg-[#294D35] hover:bg-[#1e3827] text-white rounded-lg shadow-md cursor-pointer flex items-center gap-1 text-[11px] font-semibold transition-all"
                          title="Klik untuk memperbesar gambar QRIS"
                        >
                          <Maximize2 className="w-3.5 h-3.5 text-[#D6BD7A]" />
                          <span>Perbesar</span>
                        </button>
                      </div>

                      <div className="text-center space-y-0.5">
                        <p className="font-bold text-xs text-[#294D35]">{paymentConfig.qrisMerchantName || store.name}</p>
                        {paymentConfig.qrisNmid && (
                          <p className="font-mono text-[11px] text-stone-500">NMID: {paymentConfig.qrisNmid}</p>
                        )}
                        <p className="text-[10px] text-stone-500">
                          Scan menggunakan BCA, Mandiri, BRI, BNI, GoPay, OVO, DANA, ShopeePay
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-[#DCE5D6]">
                      <div className="w-16 h-16 bg-stone-50 border border-dashed border-[#DCE5D6] rounded-xl flex items-center justify-center p-1.5 shrink-0">
                        <QrCode className="w-10 h-10 text-[#4F7655]" />
                      </div>
                      <div className="space-y-1 text-xs text-stone-600">
                        <p className="font-bold text-[#294D35]">{paymentConfig.qrisMerchantName || store.name}</p>
                        {paymentConfig.qrisNmid && (
                          <p className="font-mono text-[11px] text-stone-500">NMID: {paymentConfig.qrisNmid}</p>
                        )}
                        <p className="text-[11px] text-stone-500">
                          (Foto QRIS belum diunggah. Unggah di menu Pengaturan &gt; Metode Pembayaran)
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="text-[11px] text-[#294D35] bg-[#D6BD7A]/30 py-1 px-2.5 rounded-lg font-semibold border border-[#D6BD7A]">
                    Status: Konfirmasi Kasir Manual (Cek notifikasi saldo masuk sebelum konfirmasi)
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                      Nomor Referensi / RRN QRIS (Opsional)
                    </label>
                    <input
                      type="text"
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      placeholder="Contoh: RRN-99882312"
                      className="w-full px-3 py-1.5 text-xs border border-[#DCE5D6] rounded-lg bg-white"
                    />
                  </div>
                </div>
              ) : paymentMethod === 'transfer' ? (
                <div className="p-3 bg-stone-50 rounded-xl border border-[#DCE5D6] space-y-2.5 text-xs text-stone-600">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#294D35]">Rekening Bank Toko Aktif:</span>
                    {copiedText && (
                      <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-600" /> Tersalin!
                      </span>
                    )}
                  </div>

                  {(!paymentConfig.bankAccounts || paymentConfig.bankAccounts.filter(b => b.isActive).length === 0) ? (
                    <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs space-y-1">
                      <p className="font-bold">Belum Ada Rekening Bank Toko yang Aktif</p>
                      <p className="text-[11px]">Tambahkan rekening di menu <strong>Pengaturan &gt; Rekening Toko</strong>.</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {paymentConfig.bankAccounts.filter(b => b.isActive).map((b) => {
                        const isChosen = selectedBankId === b.id;
                        return (
                          <div
                            key={b.id}
                            onClick={() => setSelectedBankId(b.id)}
                            className={`p-2 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                              isChosen
                                ? 'border-[#294D35] bg-white shadow-xs ring-1 ring-[#294D35]'
                                : 'border-[#DCE5D6] bg-white/80 hover:bg-white'
                            }`}
                          >
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-xs text-[#294D35]">{b.bankName}</span>
                                {b.label && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#F5F0E5] text-[#294D35] font-semibold border border-[#DCE5D6]">
                                    {b.label}
                                  </span>
                                )}
                              </div>
                              <p className="font-mono font-bold text-xs text-stone-800 mt-0.5">{b.accountNumber}</p>
                              <p className="text-[10px] text-stone-500">a.n. {b.holderName}</p>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyText(b.accountNumber, b.id);
                              }}
                              className="px-2 py-1 bg-stone-100 hover:bg-[#F5F0E5] text-[#294D35] rounded-lg text-[10px] font-semibold border border-[#DCE5D6] flex items-center gap-1 cursor-pointer transition-colors"
                              title="Salin Nomor Rekening"
                            >
                              <Copy className="w-3 h-3 text-[#4F7655]" />
                              <span>Salin</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="text-[11px] text-[#294D35] bg-[#D6BD7A]/30 py-1 px-2.5 rounded-lg font-semibold border border-[#D6BD7A]">
                    Status: Konfirmasi Kasir Manual (Cek mutasi rekening sebelum konfirmasi)
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                      Nama Pengirim / Catatan Bukti Transfer (Opsional)
                    </label>
                    <input
                      type="text"
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      placeholder="Contoh: Transfer atas nama Budi Santoso"
                      className="w-full px-3 py-1.5 text-xs border border-[#DCE5D6] rounded-lg bg-white"
                    />
                  </div>
                </div>
              ) : (
                /* E-Wallet */
                <div className="p-3 bg-stone-50 rounded-xl border border-[#DCE5D6] space-y-2.5 text-xs text-stone-600">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Wallet className="w-4 h-4 text-[#4F7655]" />
                      <span className="font-bold text-[#294D35]">Akun E-Wallet Toko Aktif:</span>
                    </div>
                    {copiedText && (
                      <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-600" /> Tersalin!
                      </span>
                    )}
                  </div>

                  {(!paymentConfig.eWallets || paymentConfig.eWallets.filter(w => w.isActive).length === 0) ? (
                    <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs space-y-1">
                      <p className="font-bold">Belum Ada Akun E-Wallet Toko yang Aktif</p>
                      <p className="text-[11px]">Tambahkan akun GoPay, DANA, OVO di menu <strong>Pengaturan &gt; Akun E-Wallet</strong>.</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {paymentConfig.eWallets.filter(w => w.isActive).map((w) => {
                        const isChosen = selectedEWalletId === w.id;
                        return (
                          <div
                            key={w.id}
                            onClick={() => setSelectedEWalletId(w.id)}
                            className={`p-2 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                              isChosen
                                ? 'border-[#294D35] bg-white shadow-xs ring-1 ring-[#294D35]'
                                : 'border-[#DCE5D6] bg-white/80 hover:bg-white'
                            }`}
                          >
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-xs text-[#294D35]">{w.provider}</span>
                                {w.label && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#F5F0E5] text-[#294D35] font-semibold border border-[#DCE5D6]">
                                    {w.label}
                                  </span>
                                )}
                              </div>
                              <p className="font-mono font-bold text-xs text-stone-800 mt-0.5">{w.accountNumber}</p>
                              <p className="text-[10px] text-stone-500">a.n. {w.accountName}</p>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyText(w.accountNumber, w.id);
                              }}
                              className="px-2 py-1 bg-stone-100 hover:bg-[#F5F0E5] text-[#294D35] rounded-lg text-[10px] font-semibold border border-[#DCE5D6] flex items-center gap-1 cursor-pointer transition-colors"
                              title="Salin Nomor HP / ID Akun"
                            >
                              <Copy className="w-3 h-3 text-[#4F7655]" />
                              <span>Salin</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="text-[11px] text-[#294D35] bg-[#D6BD7A]/30 py-1 px-2.5 rounded-lg font-semibold border border-[#D6BD7A]">
                    Status: Konfirmasi Kasir Manual (Cek notifikasi saldo masuk e-wallet sebelum konfirmasi)
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                      ID Transaksi / Nomor HP Pengirim (Opsional)
                    </label>
                    <input
                      type="text"
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      placeholder="Contoh: Transfer dari 081298765432"
                      className="w-full px-3 py-1.5 text-xs border border-[#DCE5D6] rounded-lg bg-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer (Action Buttons) */}
            <div className="pt-2.5 border-t border-[#DCE5D6]/60 flex gap-2.5 shrink-0 bg-white">
              <button
                type="button"
                onClick={() => setShowCheckoutModal(false)}
                className="w-1/3 py-2.5 rounded-xl border border-[#DCE5D6] text-stone-700 text-xs font-semibold hover:bg-stone-50 cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecutePayment}
                disabled={isProcessing || (paymentMethod === 'cash' && amountTendered < cartTotal)}
                className="flex-1 py-2.5 rounded-xl bg-[#294D35] hover:bg-[#1e3827] text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isProcessing ? (
                  <span>Memproses Transaksi...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4 text-[#D6BD7A]" />
                    <span>Konfirmasi & Simpan Transaksi</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* QRIS Zoom Modal (Tampilan Layar Penuh untuk Pelanggan) */}
      {showQrisZoomModal && paymentConfig.qrisImageUrl && createPortal(
        <div className="fixed inset-0 z-60 bg-[rgba(41,77,53,0.55)] backdrop-blur-xs transition-opacity duration-200 ease-out flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-sm w-full flex flex-col items-center text-center space-y-3.5 shadow-2xl border border-[#DCE5D6] relative my-auto h-auto max-h-[92dvh] overflow-y-auto animate-jalora-enter">
            <button
              type="button"
              onClick={() => setShowQrisZoomModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-[#4F7655]">Pindai untuk Membayar</span>
              <h3 className="text-base font-bold text-[#294D35] mt-0.5">
                {paymentConfig.qrisMerchantName || store.name}
              </h3>
              <p className="text-xl font-bold text-[#294D35] mt-1 tabular-nums">
                Rp {cartTotal.toLocaleString('id-ID')}
              </p>
            </div>

            <div className="w-56 h-56 sm:w-64 sm:h-64 bg-white rounded-2xl border-2 border-[#294D35] p-3 shadow-inner flex items-center justify-center shrink-0">
              <img
                src={paymentConfig.qrisImageUrl}
                alt="Kode QRIS Toko Besar"
                className="w-full h-full object-contain"
              />
            </div>

            {paymentConfig.qrisNmid && (
              <p className="text-[11px] font-mono text-stone-500">NMID: {paymentConfig.qrisNmid}</p>
            )}

            <button
              type="button"
              onClick={() => setShowQrisZoomModal(false)}
              className="w-full py-2.5 bg-[#294D35] hover:bg-[#1e3827] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Kembali ke Kasir
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Primary WhatsApp Receipt Modal — Triggers right after transaction is saved */}
      <WhatsAppReceiptModal
        isOpen={showWhatsAppModal}
        sale={whatsAppSale}
        store={store}
        defaultPhone={selectedCustomer?.phone || ''}
        onClose={() => setShowWhatsAppModal(false)}
        onProceedToPrint={() => {
          setShowWhatsAppModal(false);
          // completedSale is already set, so receipt view opens
        }}
      />

      {/* Post-Sale Thermal Receipt Modal */}
      {completedSale && !showWhatsAppModal && createPortal(
        <div className="fixed inset-0 z-40 bg-[rgba(41,77,53,0.55)] backdrop-blur-xs transition-opacity duration-200 ease-out flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-sm rounded-2xl border border-[#DCE5D6] shadow-2xl p-4 sm:p-6 relative flex flex-col h-auto max-h-[92dvh] my-auto">
            <button
              onClick={() => setCompletedSale(null)}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 text-sm p-1 cursor-pointer"
            >
              ✕
            </button>

            <div className="text-center mb-3">
              <div className="w-10 h-10 rounded-full bg-[#F5F0E5] text-[#294D35] flex items-center justify-center mx-auto mb-2 border border-[#DCE5D6]">
                <CheckCircle2 className="w-6 h-6 text-[#4F7655]" />
              </div>
              <h3 className="font-bold text-[#294D35] text-base">Transaksi Berhasil!</h3>
              <p className="text-xs text-stone-500 font-mono">{completedSale.invoiceNumber}</p>
            </div>

            {/* Paper Size selector */}
            <div className="flex items-center justify-center gap-2 mb-3 text-xs">
              <span className="text-stone-500">Kertas:</span>
              <button
                onClick={() => setReceiptPaperSize('58mm')}
                className={`px-2.5 py-1 rounded-lg font-medium cursor-pointer ${receiptPaperSize === '58mm' ? 'bg-[#294D35] text-white font-semibold' : 'bg-stone-100 text-stone-600'}`}
              >
                58 mm
              </button>
              <button
                onClick={() => setReceiptPaperSize('80mm')}
                className={`px-2.5 py-1 rounded-lg font-medium cursor-pointer ${receiptPaperSize === '80mm' ? 'bg-[#294D35] text-white font-semibold' : 'bg-stone-100 text-stone-600'}`}
              >
                80 mm
              </button>
            </div>

            {/* Scrollable Receipt Preview (Printable Area) */}
            <div className="flex-1 overflow-y-auto border border-dashed border-[#DCE5D6] p-4 rounded-xl bg-stone-50 font-mono text-[11px] leading-tight text-stone-800">
              <div id="receipt-print-area" className={`mx-auto ${receiptPaperSize === '58mm' ? 'max-w-[260px]' : 'max-w-[340px]'}`}>
                <div className="text-center space-y-1 pb-3 border-b border-dashed border-stone-400">
                  {store.logoUrl && (
                    <img
                      src={store.logoUrl}
                      alt="Logo"
                      className="w-12 h-12 object-contain mx-auto mb-1.5 filter grayscale contrast-125"
                    />
                  )}
                  <h4 className="font-bold text-xs uppercase">{store.name}</h4>
                  <p className="text-[10px]">{branch.name}</p>
                  <p className="text-[10px]">{branch.address}</p>
                  <p className="text-[10px]">Telp: {branch.phone}</p>
                </div>

                <div className="py-2 border-b border-dashed border-stone-400 text-[10px] space-y-0.5">
                  <div className="flex justify-between">
                    <span>No: {completedSale.invoiceNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tgl: {new Date(completedSale.createdAt).toLocaleDateString('id-ID')}</span>
                    <span>Jam: {new Date(completedSale.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Kasir: {completedSale.cashierName}</span>
                    {completedSale.customerName && <span>Plg: {completedSale.customerName}</span>}
                  </div>
                </div>

                {/* Items */}
                <div className="py-2 border-b border-dashed border-stone-400 space-y-1.5 text-[10px]">
                  {completedSale.items.map((item, idx) => (
                    <div key={idx}>
                      <p className="font-semibold">{item.productName}</p>
                      <div className="flex justify-between pl-2 text-stone-600">
                        <span>{item.quantity} {item.unit} × {item.unitPrice.toLocaleString('id-ID')}</span>
                        <span className="text-stone-900 font-semibold">{item.subtotal.toLocaleString('id-ID')}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Summary */}
                <div className="py-2 border-b border-dashed border-stone-400 space-y-1 text-[10px]">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>Rp {completedSale.subtotal.toLocaleString('id-ID')}</span>
                  </div>
                  {completedSale.discountAmount > 0 && (
                    <div className="flex justify-between">
                      <span>Diskon</span>
                      <span>-Rp {completedSale.discountAmount.toLocaleString('id-ID')}</span>
                    </div>
                  )}
                  {completedSale.taxAmount > 0 && (
                    <div className="flex justify-between">
                      <span>PPN</span>
                      <span>Rp {completedSale.taxAmount.toLocaleString('id-ID')}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-xs pt-1 border-t border-dotted border-stone-400">
                    <span>TOTAL</span>
                    <span>Rp {completedSale.totalAmount.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span>Bayar ({getPaymentMethodLabel(completedSale.paymentMethod)})</span>
                    <span>Rp {completedSale.amountTendered.toLocaleString('id-ID')}</span>
                  </div>
                  {completedSale.paymentReference && (
                    <div className="flex justify-between text-[9px] text-stone-500">
                      <span>No. Ref</span>
                      <span className="font-mono">{completedSale.paymentReference}</span>
                    </div>
                  )}
                  {completedSale.paymentMethod === 'cash' && (
                    <div className="flex justify-between font-semibold">
                      <span>Kembali</span>
                      <span>Rp {completedSale.changeAmount.toLocaleString('id-ID')}</span>
                    </div>
                  )}
                </div>

                {/* Footer notes */}
                <div className="pt-3 text-center text-[9px] text-stone-500 whitespace-pre-line">
                  {printerConfig.footerNotes || 'Terima kasih atas kunjungan Anda!'}
                </div>
              </div>
            </div>

            {/* Actions: Print, WA, Done */}
            <div className="mt-4 space-y-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex-1 bg-[#294D35] hover:bg-[#1e3827] text-white py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Struk</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenWhatsAppForSale(completedSale)}
                  className="flex-1 bg-[#4F7655] hover:bg-[#5a7634] text-white py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Kirim WA</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setCompletedSale(null)}
                className="w-full bg-stone-100 hover:bg-stone-200 text-stone-700 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer border border-[#DCE5D6]/50"
              >
                Transaksi Baru (Esc)
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Transaction History Drawer/Modal */}
      {showHistoryModal && createPortal(
        <div className="fixed inset-0 z-50 bg-[rgba(41,77,53,0.55)] backdrop-blur-xs transition-opacity duration-200 ease-out flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-2xl border border-[#DCE5D6] shadow-2xl p-4 sm:p-6 relative my-auto h-auto max-h-[88dvh] flex flex-col space-y-3.5 animate-jalora-enter">
            <div className="flex items-center justify-between pb-3 border-b border-[#DCE5D6] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#F5F0E5] text-[#294D35] flex items-center justify-center border border-[#DCE5D6]">
                  <History className="w-4 h-4 text-[#4F7655]" />
                </div>
                <div>
                  <h3 className="font-bold text-[#294D35] text-base">Riwayat Transaksi Kasir</h3>
                  <p className="text-xs text-stone-500">Cabang: {branch.name} ({branch.code})</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportSales}
                  className="px-2.5 sm:px-3 py-1.5 bg-[#F5F0E5] hover:bg-[#ebdcc4] text-[#294D35] border border-[#DCE5D6] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  title="Ekspor seluruh riwayat penjualan ke file Excel (CSV)"
                >
                  <Download className="w-3.5 h-3.5 text-[#4F7655]" />
                  <span>Unduh CSV</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportSalesPdf}
                  className="px-2.5 sm:px-3 py-1.5 bg-[#294D35] hover:bg-[#1e3827] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  title="Ekspor seluruh riwayat penjualan ke file PDF resmi"
                >
                  <FileText className="w-3.5 h-3.5 text-[#D6BD7A]" />
                  <span>Unduh PDF</span>
                </button>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="p-1 text-stone-400 hover:text-stone-700 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* List of Recent Sales */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {recentSales.length === 0 ? (
                <div className="text-center py-12 text-stone-400">
                  <Calendar className="w-10 h-10 mx-auto stroke-1 mb-2 text-[#4F7655]" />
                  <p className="text-xs font-semibold text-[#294D35]">Belum ada transaksi di cabang ini</p>
                  <p className="text-[11px] text-stone-500 mt-0.5">Selesaikan transaksi kasir untuk mencatat riwayat</p>
                </div>
              ) : (
                recentSales.slice(0, 50).map(sale => (
                  <div
                    key={sale.id}
                    className="p-3 bg-stone-50 hover:bg-[#F5F0E5]/30 rounded-xl border border-[#DCE5D6] flex items-center justify-between gap-3 text-xs transition-colors"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#294D35]">{sale.invoiceNumber}</span>
                        <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-[#F5F0E5] text-[#294D35] border border-[#DCE5D6]">
                          {getPaymentMethodLabel(sale.paymentMethod)}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500">
                        {formatIndonesianDateTime(sale.createdAt)} · {sale.items.length} item
                        {sale.customerName ? ` · ${sale.customerName}` : ''}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-bold text-[#294D35] tabular-nums text-sm">
                        Rp {sale.totalAmount.toLocaleString('id-ID')}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setCompletedSale(sale);
                            setShowHistoryModal(false);
                          }}
                          className="p-1.5 bg-white hover:bg-stone-100 text-[#294D35] border border-[#DCE5D6] rounded-lg text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                          title="Cetak Struk Thermal"
                        >
                          <Printer className="w-3.5 h-3.5 text-[#4F7655]" />
                          <span className="hidden sm:inline">Cetak</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleOpenWhatsAppForSale(sale);
                            setShowHistoryModal(false);
                          }}
                          className="p-1.5 bg-[#294D35] hover:bg-[#1e3827] text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                          title="Kirim Struk WhatsApp"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-[#D6BD7A]" />
                          <span className="hidden sm:inline">Kirim WA</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-[#DCE5D6] flex justify-end">
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold"
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
