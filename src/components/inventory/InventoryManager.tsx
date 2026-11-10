/**
 * JALORA — Inventory & Stock Management Module
 * Moving Weighted Average, Stock Opname with 6-digit PIN verification, and Audit Ledger
 * Created by Abdul Jalil
 */

import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Boxes,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  AlertCircle,
  History,
  Lock,
  Edit2,
  Trash2,
  FolderTree,
  Tag,
  CheckCircle2,
  X,
  ArrowUpDown,
  Image as ImageIcon,
  Upload,
  Download,
  Sparkles,
  Check,
  LayoutGrid,
  List
} from 'lucide-react';
import { Product, Category, Store, Branch, UserProfile, StockMovement, Unit } from '../../types';
import { hashPin, jaloraStorage } from '../../services/storage';
import { uploadProductImage } from '../../services/supabase';
import { formatIndonesianDateTime } from '../../utils/dateFormatter';
import { downloadCsv } from '../../utils/exportCsv';

export const STANDARD_CATEGORY_OPTIONS = [
  'Makanan',
  'Minuman',
  'Sembako',
  'Perawatan Tubuh',
  'Perawatan Rumah',
  'Perlengkapan',
  'Elektronik',
  'Pakaian',
  'Alat Tulis',
  'Obat-obatan'
];

export const STANDARD_UNIT_OPTIONS = [
  'Pcs',
  'Buah',
  'Botol',
  'Kaleng',
  'Kotak',
  'Bungkus',
  'Sachet',
  'Pak',
  'Lusin',
  'Kg',
  'Gram',
  'Liter',
  'Mililiter',
  'Meter',
  'Karung',
  'Dus'
];

interface ProductSuggestion {
  categoryName: string;
  unit: string;
  reason: string;
}

export function getProductSuggestion(productName: string): ProductSuggestion | null {
  const q = productName.toLowerCase().trim();
  if (q.length < 3) return null;

  // 1. Minyak & sembako cair
  if (/minyak|sania|bimoli|filma|tropical|sunco|barco|santan/.test(q)) {
    return { categoryName: 'Sembako', unit: 'Liter', reason: 'Kata kunci minyak goreng & sembako cair' };
  }
  // 2. Beras
  if (/beras|pandan wangi|rojo lele|setra ramos|beras merah|ketan/.test(q)) {
    if (/karung|25kg|50kg/.test(q)) {
      return { categoryName: 'Sembako', unit: 'Karung', reason: 'Kata kunci beras kemasan besar' };
    }
    return { categoryName: 'Sembako', unit: 'Kg', reason: 'Kata kunci beras bahan pokok' };
  }
  // 3. Gula, tepung, terigu, telur, garam
  if (/gula|gulaku|terigu|segitiga biru|cakra kembar|tepung|garam|telur|bawang|cabai|bumbu/.test(q)) {
    return { categoryName: 'Sembako', unit: 'Kg', reason: 'Kata kunci bahan pokok & bumbu dapur' };
  }
  // 4. Perawatan Tubuh (Sabun mandi, shampo, odol, lotion, deodorant, dll.)
  if (/sabun mandi|lifebuoy|dettol|lux|biore|shampoo|sampo|pantene|sunsilk|clear|pepsodent|odol|pasta gigi|close up|sikat gigi|deodorant|rexona|handbody|vaseline|facial|garnier|parfum|bedak|skincare|hand wash/.test(q)) {
    return { categoryName: 'Perawatan Tubuh', unit: 'Pcs', reason: 'Kata kunci produk perawatan tubuh & mandi' };
  }
  // 5. Perawatan Rumah (Deterjen, sabun cuci piring, pembersih lantai, dll.)
  if (/rinso|daia|soklin|attack|sunlight|mama lemon|ekonomi|molto|downy|wipol|so klin|karbol|bayclin|superpel|hit |baygon|tisu|tissu|tissues|sapu|pel |sikat cuci|pembersih/.test(q)) {
    return { categoryName: 'Perawatan Rumah', unit: 'Pcs', reason: 'Kata kunci produk pembersih rumah tangga' };
  }
  // 6. Minuman (kopi, teh, susu, sirup, air mineral, soda)
  if (/kopi|kapal api|torabika|luwak|nescafe|teh|sariwangi|sosro|pucuk|susu|indomilk|frisian flag|ultra milk|dancow|bear brand|sirup|marjan|abc sirup|air mineral|aqua|le minerale|cleo|club|fanta|coca|sprite|pocari|floridina|good day/.test(q)) {
    if (/botol/.test(q)) return { categoryName: 'Minuman', unit: 'Botol', reason: 'Kata kunci minuman kemasan botol' };
    if (/kaleng/.test(q)) return { categoryName: 'Minuman', unit: 'Kaleng', reason: 'Kata kunci minuman kemasan kaleng' };
    if (/kotak/.test(q)) return { categoryName: 'Minuman', unit: 'Kotak', reason: 'Kata kunci minuman kemasan kotak' };
    if (/sachet/.test(q)) return { categoryName: 'Minuman', unit: 'Sachet', reason: 'Kata kunci minuman sachet bubuk' };
    return { categoryName: 'Minuman', unit: 'Botol', reason: 'Kata kunci produk minuman' };
  }
  // 7. Makanan (Mie, biskuit, roti, snack, keripik, cokelat, dll.)
  if (/indomie|sedap|mie goreng|mie kuah|pop mie|sarimi|biskuit|roma|oreo|tango|khong guan|roti|sari roti|snack|chitato|lays|taro|chiki|keripik|wafer|permen|kopiko|relaxa|cokelat|silverqueen|cadbury|sosis|sozzis|nugget/.test(q)) {
    if (/bungkus/.test(q)) return { categoryName: 'Makanan', unit: 'Bungkus', reason: 'Kata kunci makanan bungkus' };
    if (/dus|karton|box/.test(q)) return { categoryName: 'Makanan', unit: 'Dus', reason: 'Kata kunci makanan kardus' };
    return { categoryName: 'Makanan', unit: 'Bungkus', reason: 'Kata kunci produk makanan & camilan' };
  }
  // 8. Obat-obatan & Kesehatan
  if (/paracetamol|panadol|bodrex|obat|vitamin|enervon|tolak angin|antangin|promag|diapet|betadine|hansaplast|plester|minyak kayu putih|freshcare|salonpas|sanmol/.test(q)) {
    if (/botol/.test(q)) return { categoryName: 'Obat-obatan', unit: 'Botol', reason: 'Kata kunci obat sirup / botolan' };
    if (/sachet/.test(q)) return { categoryName: 'Obat-obatan', unit: 'Sachet', reason: 'Kata kunci suplemen sachet herbal' };
    return { categoryName: 'Obat-obatan', unit: 'Kotak', reason: 'Kata kunci obat-obatan & suplemen' };
  }
  // 9. Alat Tulis
  if (/pulpen|buku tulis|buku gambar|pensil|penghapus|spidol|kertas a4|kertas hvs|map |stapler|gunting|lem |tipex|correction pen|penggaris/.test(q)) {
    if (/pak/.test(q)) return { categoryName: 'Alat Tulis', unit: 'Pak', reason: 'Kata kunci alat tulis kemasan pak' };
    if (/lusin/.test(q)) return { categoryName: 'Alat Tulis', unit: 'Lusin', reason: 'Kata kunci alat tulis grosir lusinan' };
    return { categoryName: 'Alat Tulis', unit: 'Pcs', reason: 'Kata kunci perlengkapan alat tulis kantor' };
  }
  // 10. Elektronik
  if (/lampu|philips|hannochs|kabel|colokan|charger|baterai|panasonic|energizer|stop kontak|saklar|kipas|setrika|headset|earphone/.test(q)) {
    return { categoryName: 'Elektronik', unit: 'Buah', reason: 'Kata kunci perlengkapan elektronik' };
  }
  // 11. Pakaian
  if (/kaos|baju|celana|jaket|kemeja|kerudung|jilbab|rok|kaos kaki|daster|sarung|mukena/.test(q)) {
    return { categoryName: 'Pakaian', unit: 'Pcs', reason: 'Kata kunci produk pakaian & garmen' };
  }
  // 12. Perlengkapan
  if (/piring|gelas|mangkok|sendok|garpu|wajan|panci|ember|baskom|gantungan|hanger|payung/.test(q)) {
    return { categoryName: 'Perlengkapan', unit: 'Buah', reason: 'Kata kunci perlengkapan rumah tangga' };
  }

  return null;
}

interface InventoryManagerProps {
  store: Store;
  branch: Branch;
  user: UserProfile;
  onRefreshData?: () => void;
}

export const InventoryManager: React.FC<InventoryManagerProps> = ({ store, branch, user, onRefreshData }) => {
  const [activeTab, setActiveTab] = useState<'products' | 'movements' | 'categories'>('products');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modals
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [showOpnameModal, setShowOpnameModal] = useState(false);
  const [opnameProduct, setOpnameProduct] = useState<Product | null>(null);
  const [opnameNewQty, setOpnameNewQty] = useState<number>(0);
  const [opnameReason, setOpnameReason] = useState<string>('Selisih Hitung Fisik (Opname Rutin)');
  const [opnamePin, setOpnamePin] = useState<string>('');
  const [opnameError, setOpnameError] = useState<string>('');
  const [isSubmittingOpname, setIsSubmittingOpname] = useState(false);

  // Category Modal
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');

  // Form states for Add/Edit Product
  const [prodName, setProdName] = useState('');
  const [prodCatMode, setProdCatMode] = useState<string>('Makanan');
  const [customCatName, setCustomCatName] = useState('');
  const [prodUnitMode, setProdUnitMode] = useState<string>('Pcs');
  const [customUnitName, setCustomUnitName] = useState('');
  const [prodSku, setProdSku] = useState('');
  const [prodBarcode, setProdBarcode] = useState('');
  const [prodCostPrice, setProdCostPrice] = useState<number>(0);
  const [prodSellingPrice, setProdSellingPrice] = useState<number>(0);
  const [prodMinStock, setProdMinStock] = useState<number>(5);
  const [prodImageUrl, setProdImageUrl] = useState('');
  const [isUploadingProdImage, setIsUploadingProdImage] = useState(false);
  const [prodImageError, setProdImageError] = useState('');
  const [prodFormError, setProdFormError] = useState('');

  // Auto suggestion states
  const [dismissedSuggestion, setDismissedSuggestion] = useState(false);
  const [appliedSuggestionMessage, setAppliedSuggestionMessage] = useState<string | null>(null);

  // Stock Movement filter and export states
  const [movementFilterType, setMovementFilterType] = useState<'all' | 'sale' | 'purchase' | 'adjustment'>('all');
  const [movementSearch, setMovementSearch] = useState('');
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string | null>(null);

  // Deletion modal and feedback states
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeletingProduct, setIsDeletingProduct] = useState(false);
  const [productFeedbackMsg, setProductFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Load Data
  const products = useMemo(() => jaloraStorage.getProducts(store.id), [store.id, showProductModal, showOpnameModal, refreshKey]);
  const categories = useMemo(() => jaloraStorage.getCategories(store.id), [store.id, showCategoryModal]);
  const units = useMemo(() => jaloraStorage.getUnits(store.id), [store.id]);
  const movements = useMemo(() => jaloraStorage.getStockMovements(store.id, branch.id), [store.id, branch.id, showOpnameModal]);

  // Combined list of category options (standard + custom in database)
  const availableCategoryNames = useMemo(() => {
    const set = new Set<string>(STANDARD_CATEGORY_OPTIONS);
    categories.forEach(c => {
      if (c.name) set.add(c.name);
    });
    return Array.from(set);
  }, [categories]);

  // Combined list of unit options (standard + custom in database)
  const availableUnitSymbols = useMemo(() => {
    const set = new Set<string>(STANDARD_UNIT_OPTIONS);
    units.forEach(u => {
      if (u.symbol) set.add(u.symbol);
    });
    return Array.from(set);
  }, [units]);

  // Auto suggestion computed from product name
  const autoSuggestion = useMemo(() => {
    return getProductSuggestion(prodName);
  }, [prodName]);

  const handleApplySuggestion = (sug: ProductSuggestion) => {
    setProdCatMode(sug.categoryName);
    setCustomCatName('');
    setProdUnitMode(sug.unit);
    setCustomUnitName('');
    setAppliedSuggestionMessage(`Saran diterapkan: Kategori "${sug.categoryName}" & Satuan "${sug.unit}"`);
    setDismissedSuggestion(true);
    setTimeout(() => setAppliedSuggestionMessage(null), 3500);
  };

  // Branch Stocks
  const productStocks = useMemo(() => {
    const map = new Map<string, { quantity: number; avgCost: number }>();
    products.forEach(p => {
      const stock = jaloraStorage.getProductStock(store.id, branch.id, p.id);
      map.set(p.id, { quantity: stock.quantity, avgCost: stock.avgCost });
    });
    return map;
  }, [products, store.id, branch.id, showOpnameModal]);

  // Stock status statistics
  const stockStats = useMemo(() => {
    let low = 0;
    let out = 0;
    products.forEach(p => {
      const stockInfo = productStocks.get(p.id) || { quantity: 0, avgCost: 0 };
      if (stockInfo.quantity <= 0) out++;
      else if (stockInfo.quantity <= p.minStock) low++;
    });
    return { all: products.length, low, out };
  }, [products, productStocks]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchCat = selectedCategory === 'all' || p.categoryId === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchQuery = !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q));

      const stockInfo = productStocks.get(p.id) || { quantity: 0, avgCost: 0 };
      let matchStock = true;
      if (stockFilter === 'low') matchStock = stockInfo.quantity <= p.minStock && stockInfo.quantity > 0;
      if (stockFilter === 'out') matchStock = stockInfo.quantity <= 0;

      return matchCat && matchQuery && matchStock;
    });
  }, [products, selectedCategory, searchQuery, stockFilter, productStocks]);

  // Filtered Movements for movements tab and export
  const filteredMovements = useMemo(() => {
    return movements.filter(m => {
      const matchType = movementFilterType === 'all' || m.type === movementFilterType;
      const prod = products.find(p => p.id === m.productId);
      const prodName = prod?.name?.toLowerCase() || '';
      const q = movementSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        prodName.includes(q) ||
        (m.referenceId && m.referenceId.toLowerCase().includes(q)) ||
        m.reason.toLowerCase().includes(q);

      return matchType && matchSearch;
    });
  }, [movements, movementFilterType, movementSearch, products]);

  // Export Movements to Excel-compatible CSV
  const handleExportMovements = () => {
    if (filteredMovements.length === 0) {
      alert('Tidak ada data riwayat mutasi stok untuk diekspor pada filter aktif.');
      return;
    }

    const headers = [
      'Toko',
      'Cabang',
      'Waktu Transaksi (WIB)',
      'Nama Produk',
      'SKU',
      'Kategori',
      'Jenis Mutasi',
      'Perubahan Stok',
      'Saldo Akhir',
      'Satuan',
      'Harga Satuan (Rp)',
      'Alasan Mutasi',
      'Petugas',
      'No. Referensi'
    ];

    const rows = filteredMovements.map(m => {
      const prod = products.find(p => p.id === m.productId);
      const cat = categories.find(c => c.id === prod?.categoryId);
      const isPositive = m.quantityDelta > 0;
      const deltaStr = isPositive ? `+${m.quantityDelta}` : `${m.quantityDelta}`;
      const typeLabel =
        m.type === 'sale' ? 'Penjualan' :
        m.type === 'purchase' ? 'Pembelian' :
        m.type === 'adjustment' ? 'Penyesuaian' :
        m.type === 'transfer' ? 'Transfer Cabang' : m.type;

      return [
        store.name,
        branch.name,
        formatIndonesianDateTime(m.createdAt),
        prod?.name || `Produk ID: ${m.productId}`,
        prod?.sku || '-',
        cat?.name || 'Umum',
        typeLabel,
        deltaStr,
        m.newQuantity,
        prod?.unit || 'Pcs',
        m.costPerUnit || prod?.costPrice || 0,
        m.reason,
        m.createdBy,
        m.referenceId || '-'
      ];
    });

    try {
      const nowStr = new Date().toISOString().split('T')[0];
      const filename = `Jalora_Riwayat_Mutasi_Stok_${branch.code}_${nowStr}.csv`;
      downloadCsv(filename, headers, rows);

      setExportSuccessMsg(`Berhasil mengunduh file ${filename} (${rows.length} mutasi).`);
      setTimeout(() => setExportSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Gagal mengekspor riwayat mutasi stok.');
    }
  };

  // Handle Product Image Upload
  const handleProductImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingProdImage(true);
    setProdImageError('');

    try {
      const prodTempId = editingProduct ? editingProduct.id : `prod_${Date.now()}`;
      const res = await uploadProductImage(file, store.id, prodTempId);
      if (res.success && res.url) {
        setProdImageUrl(res.url);
      } else {
        setProdImageError(res.error || 'Gagal mengunggah gambar produk.');
      }
    } catch (err: any) {
      setProdImageError(err.message || 'Error saat upload gambar.');
    } finally {
      setIsUploadingProdImage(false);
      e.target.value = '';
    }
  };

  // Open Add Product
  const handleOpenAdd = () => {
    setEditingProduct(null);
    setProdName('');
    setProdCatMode('Makanan');
    setCustomCatName('');
    setProdUnitMode('Pcs');
    setCustomUnitName('');
    setProdSku(`SKU-${Date.now().toString().slice(-5)}`);
    setProdBarcode('');
    setProdCostPrice(0);
    setProdSellingPrice(0);
    setProdMinStock(5);
    setProdImageUrl('');
    setProdImageError('');
    setProdFormError('');
    setDismissedSuggestion(false);
    setAppliedSuggestionMessage(null);
    setShowProductModal(true);
  };

  // Open Edit Product
  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setProdName(p.name);

    // Set Category Mode
    const foundCat = categories.find(c => c.id === p.categoryId);
    if (foundCat) {
      setProdCatMode(foundCat.name);
      setCustomCatName('');
    } else {
      setProdCatMode('__custom__');
      setCustomCatName(p.categoryId);
    }

    // Set Unit Mode
    if (availableUnitSymbols.includes(p.unit)) {
      setProdUnitMode(p.unit);
      setCustomUnitName('');
    } else {
      setProdUnitMode('__custom__');
      setCustomUnitName(p.unit);
    }

    setProdSku(p.sku);
    setProdBarcode(p.barcode || '');
    setProdCostPrice(p.costPrice);
    setProdSellingPrice(p.sellingPrice);
    setProdMinStock(p.minStock);
    setProdImageUrl(p.imageUrl || '');
    setProdImageError('');
    setProdFormError('');
    setDismissedSuggestion(true);
    setAppliedSuggestionMessage(null);
    setShowProductModal(true);
  };

  // Save Product
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName.trim()) {
      setProdFormError('Nama produk wajib diisi.');
      return;
    }

    // Resolve Category
    let finalCatName = prodCatMode;
    if (prodCatMode === '__custom__') {
      if (!customCatName.trim()) {
        setProdFormError('Nama kategori kustom tidak boleh kosong.');
        return;
      }
      finalCatName = customCatName.trim();
    }
    if (!finalCatName) {
      setProdFormError('Kategori produk wajib dipilih.');
      return;
    }

    let resolvedCatId = '';
    const existingCat = categories.find(c => c.name.toLowerCase() === finalCatName.toLowerCase());
    if (existingCat) {
      resolvedCatId = existingCat.id;
    } else {
      const newCatId = `cat_${Date.now()}`;
      const newCat: Category = {
        id: newCatId,
        storeId: store.id,
        name: finalCatName,
        description: `Kategori ${finalCatName}`,
      };
      jaloraStorage.saveCategory(newCat);
      resolvedCatId = newCatId;
    }

    // Resolve Unit
    let finalUnit = prodUnitMode;
    if (prodUnitMode === '__custom__') {
      if (!customUnitName.trim()) {
        setProdFormError('Nama satuan kustom tidak boleh kosong.');
        return;
      }
      finalUnit = customUnitName.trim();
    }
    if (!finalUnit) {
      setProdFormError('Satuan produk wajib dipilih.');
      return;
    }

    if (prodSellingPrice < 0) {
      setProdFormError('Harga jual tidak boleh negatif.');
      return;
    }

    const productId = editingProduct ? editingProduct.id : `prod_${Date.now()}`;
    const newProd: Product = {
      id: productId,
      storeId: store.id,
      categoryId: resolvedCatId,
      name: prodName.trim(),
      sku: prodSku.trim() || `SKU-${Date.now().toString().slice(-4)}`,
      barcode: prodBarcode.trim() || undefined,
      unit: finalUnit,
      costPrice: prodCostPrice,
      sellingPrice: prodSellingPrice,
      minStock: prodMinStock,
      imageUrl: prodImageUrl.trim() || undefined,
      isActive: true,
      createdAt: editingProduct ? editingProduct.createdAt : new Date().toISOString(),
    };

    jaloraStorage.saveProduct(newProd);

    // If new product, initialize stock balance cleanly at 0
    if (!editingProduct) {
      const balance = jaloraStorage.getProductStock(store.id, branch.id, productId);
      jaloraStorage.updateStockBalance(balance);
    }

    jaloraStorage.recordAuditLog({
      storeId: store.id,
      userName: user.name,
      userRole: user.role,
      action: editingProduct ? 'UBAH_PRODUK' : 'TAMBAH_PRODUK',
      targetEntity: 'Product',
      targetId: newProd.name,
      details: `${editingProduct ? 'Memperbarui' : 'Menambahkan'} produk ${newProd.name} (Harga Jual Rp ${newProd.sellingPrice.toLocaleString('id-ID')})`,
      timestamp: new Date().toISOString(),
    });

    setShowProductModal(false);
    onRefreshData?.();
  };

  // Delete Product - Trigger in-app confirmation modal (eliminates window.confirm popup blocking)
  const handleDeleteProduct = (p: Product) => {
    // Role check: Only Owner and Manager can delete catalog products
    if (user.role === 'cashier') {
      setProductFeedbackMsg({
        type: 'error',
        text: 'Akses Ditolak: Hanya Pemilik (Owner) atau Manajer yang berwenang menghapus produk katalog.',
      });
      setTimeout(() => setProductFeedbackMsg(null), 4500);
      return;
    }

    setProductToDelete(p);
  };

  // Confirm and execute product deletion
  const handleConfirmDeleteProduct = () => {
    if (!productToDelete) return;
    if (isDeletingProduct) return;

    setIsDeletingProduct(true);
    try {
      const deleted = jaloraStorage.deleteProduct(productToDelete.id, store.id);

      if (deleted) {
        // Record audit ledger
        jaloraStorage.recordAuditLog({
          storeId: store.id,
          userName: user.name,
          userRole: user.role,
          action: 'HAPUS_PRODUK',
          targetEntity: 'Product',
          targetId: productToDelete.name,
          details: `Menghapus produk ${productToDelete.name} (SKU: ${productToDelete.sku}) dari katalog toko`,
          timestamp: new Date().toISOString(),
        });

        // Trigger reactive UI refresh across all tabs/components
        setRefreshKey(k => k + 1);

        // If currently in the edit modal for this product, close it
        if (showProductModal && editingProduct?.id === productToDelete.id) {
          setShowProductModal(false);
          setEditingProduct(null);
        }

        setProductFeedbackMsg({
          type: 'success',
          text: `Produk "${productToDelete.name}" berhasil dihapus dari katalog toko.`,
        });
        setTimeout(() => setProductFeedbackMsg(null), 4000);

        onRefreshData?.();
      } else {
        setProductFeedbackMsg({
          type: 'error',
          text: `Gagal menghapus produk: Data produk tidak ditemukan atau sudah dihapus sebelumnya.`,
        });
        setTimeout(() => setProductFeedbackMsg(null), 4000);
      }
    } catch (err: any) {
      setProductFeedbackMsg({
        type: 'error',
        text: `Terjadi kendala saat menghapus produk: ${err?.message || 'Gagal menyimpan perubahan'}`,
      });
      setTimeout(() => setProductFeedbackMsg(null), 4000);
    } finally {
      setIsDeletingProduct(false);
      setProductToDelete(null);
    }
  };

  // Open Stock Opname Modal
  const handleOpenOpname = (p: Product) => {
    const stockInfo = productStocks.get(p.id) || { quantity: 0, avgCost: 0 };
    setOpnameProduct(p);
    setOpnameNewQty(stockInfo.quantity);
    setOpnameReason('Selisih Hitung Fisik (Opname Rutin)');
    setOpnamePin('');
    setOpnameError('');
    setShowOpnameModal(true);
  };

  // Execute Stock Opname with 6-Digit PIN
  const handleExecuteOpname = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!opnameProduct) return;

    if (opnamePin.length !== 6) {
      setOpnameError('PIN transaksi harus 6 digit.');
      return;
    }

    setIsSubmittingOpname(true);
    setOpnameError('');

    try {
      const hashed = await hashPin(opnamePin);
      if (user.pinHash && user.pinHash !== hashed) {
        setOpnameError('PIN Transaksi Salah! Otorisasi ditolak.');
        setIsSubmittingOpname(false);
        return;
      }

      const stock = jaloraStorage.getProductStock(store.id, branch.id, opnameProduct.id);
      const previousQty = stock.quantity;
      const delta = opnameNewQty - previousQty;

      stock.quantity = opnameNewQty;
      stock.lastUpdatedAt = new Date().toISOString();
      jaloraStorage.updateStockBalance(stock);

      const movement: StockMovement = {
        id: `sm_opn_${Date.now()}`,
        storeId: store.id,
        branchId: branch.id,
        productId: opnameProduct.id,
        type: 'adjustment',
        quantityDelta: delta,
        previousQuantity: previousQty,
        newQuantity: opnameNewQty,
        costPerUnit: stock.avgCost > 0 ? stock.avgCost : opnameProduct.costPrice,
        referenceId: `OPN-${Date.now().toString().slice(-4)}`,
        reason: `${opnameReason} (Diverifikasi PIN oleh ${user.name})`,
        createdBy: user.name,
        createdAt: new Date().toISOString(),
      };
      jaloraStorage.recordStockMovement(movement);

      // Create accounting adjustment journal if delta != 0 and cost > 0
      const cost = stock.avgCost > 0 ? stock.avgCost : opnameProduct.costPrice;
      const adjustmentValue = Math.abs(delta) * cost;

      if (delta !== 0 && adjustmentValue > 0) {
        const accounts = jaloraStorage.getAccounts(store.id);
        const invAcc = accounts.find(a => a.code === '1-1004') || accounts[3];
        const lossAcc = accounts.find(a => a.code === '6-1002') || accounts[11] || accounts[10];

        const lines = delta < 0 ? [
          // Stock deficit: Debit Beban Selisih, Credit Persediaan
          { accountId: lossAcc.id, accountCode: lossAcc.code, accountName: lossAcc.name, debit: adjustmentValue, credit: 0 },
          { accountId: invAcc.id, accountCode: invAcc.code, accountName: invAcc.name, debit: 0, credit: adjustmentValue },
        ] : [
          // Stock surplus: Debit Persediaan, Credit Modal/Pendapatan Lain
          { accountId: invAcc.id, accountCode: invAcc.code, accountName: invAcc.name, debit: adjustmentValue, credit: 0 },
          { accountId: lossAcc.id, accountCode: lossAcc.code, accountName: lossAcc.name, debit: 0, credit: adjustmentValue },
        ];

        jaloraStorage.saveJournalEntry({
          id: `je_opn_${Date.now()}`,
          storeId: store.id,
          branchId: branch.id,
          entryNumber: `JV-OPN-${opnameProduct.sku}`,
          date: new Date().toISOString().split('T')[0],
          description: `Penyesuaian Stok Opname ${opnameProduct.name} (${delta > 0 ? '+' : ''}${delta} ${opnameProduct.unit})`,
          referenceType: 'adjustment',
          referenceId: movement.id,
          lines,
          totalDebit: adjustmentValue,
          totalCredit: adjustmentValue,
          isPosted: true,
          createdAt: new Date().toISOString(),
        });
      }

      jaloraStorage.recordAuditLog({
        storeId: store.id,
        userName: user.name,
        userRole: user.role,
        action: 'STOK_OPNAME',
        targetEntity: 'Product',
        targetId: opnameProduct.name,
        details: `Stok opname ${opnameProduct.name}: ${previousQty} -> ${opnameNewQty} (${delta > 0 ? '+' : ''}${delta} ${opnameProduct.unit}). Alasan: ${opnameReason}`,
        timestamp: new Date().toISOString(),
      });

      setShowOpnameModal(false);
      onRefreshData?.();
    } catch (err: any) {
      setOpnameError(`Gagal memproses opname: ${err.message || 'Coba lagi'}`);
    } finally {
      setIsSubmittingOpname(false);
    }
  };

  // Add Category Handler
  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    jaloraStorage.saveCategory({
      id: `cat_${Date.now()}`,
      storeId: store.id,
      name: newCatName.trim(),
      description: newCatDesc.trim(),
    });

    setNewCatName('');
    setNewCatDesc('');
    setShowCategoryModal(false);
    onRefreshData?.();
  };

  return (
    <div className="p-3.5 sm:p-5 lg:p-8 space-y-4 sm:space-y-6 max-w-7xl mx-auto w-full">
      {/* Top Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#CECDA9]/60">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-[#294D35] tracking-tight">Katalog Produk & Inventaris</h2>
          <p className="text-xs text-[#5C6B58] mt-1">
            Cabang Aktif: <strong className="text-[#294D35] font-bold">{branch.name}</strong> · Moving Weighted Average
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCategoryModal(true)}
            className="px-3.5 py-2.5 rounded-2xl border border-[#CECDA9]/60 bg-white hover:bg-[#F5F0E5]/60 text-xs font-bold text-[#294D35] flex items-center gap-2 transition-all cursor-pointer shadow-xs min-h-[44px]"
          >
            <FolderTree className="w-4 h-4 text-[#4F7655]" />
            <span>Kategori</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2.5 rounded-2xl bg-[#294D35] hover:bg-[#1e3827] text-white text-xs font-bold flex items-center gap-2 transition-all shadow-sm cursor-pointer min-h-[44px]"
          >
            <Plus className="w-4 h-4 text-[#D3D464]" />
            <span>+ Tambah Produk</span>
          </button>
        </div>
      </div>

      {/* Main Tabs: Produk vs Mutasi */}
      <div className="flex items-center gap-2 border-b border-[#CECDA9]/60 text-xs pb-1">
        <button
          type="button"
          onClick={() => setActiveTab('products')}
          className={`pb-2 px-3.5 font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'products'
              ? 'border-b-2 border-[#294D35] text-[#294D35]'
              : 'text-[#5C6B58] hover:text-[#294D35]'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>Daftar Produk ({products.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('movements')}
          className={`pb-2 px-3.5 font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'movements'
              ? 'border-b-2 border-[#294D35] text-[#294D35]'
              : 'text-[#5C6B58] hover:text-[#294D35]'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Riwayat Mutasi Stok ({movements.length})</span>
        </button>
      </div>

      {/* Products Tab View */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          {/* Stock Status Tabs (Semua • Hampir Habis • Habis) */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white/70 p-2 rounded-2xl border border-[#CECDA9]/50">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setStockFilter('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 min-h-[36px] ${
                  stockFilter === 'all'
                    ? 'bg-[#294D35] text-white shadow-xs'
                    : 'bg-white text-[#5C6B58] hover:bg-[#F5F0E5]/60 border border-[#CECDA9]/40'
                }`}
              >
                <span>Semua</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${stockFilter === 'all' ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-600'}`}>
                  {stockStats.all}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setStockFilter('low')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 min-h-[36px] ${
                  stockFilter === 'low'
                    ? 'bg-amber-700 text-white shadow-xs'
                    : 'bg-white text-[#5C6B58] hover:bg-[#F5F0E5]/60 border border-[#CECDA9]/40'
                }`}
              >
                <span>Hampir Habis</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${stockFilter === 'low' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'}`}>
                  {stockStats.low}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setStockFilter('out')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 min-h-[36px] ${
                  stockFilter === 'out'
                    ? 'bg-red-700 text-white shadow-xs'
                    : 'bg-white text-[#5C6B58] hover:bg-[#F5F0E5]/60 border border-[#CECDA9]/40'
                }`}
              >
                <span>Habis</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${stockFilter === 'out' ? 'bg-white/20 text-white' : 'bg-red-100 text-red-700'}`}>
                  {stockStats.out}
                </span>
              </button>
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-[#CECDA9]/60 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'grid' ? 'bg-[#294D35] text-white shadow-xs' : 'text-stone-500 hover:text-stone-800'
                }`}
                title="Tampilan Kartu (Grid)"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'table' ? 'bg-[#294D35] text-white shadow-xs' : 'text-stone-500 hover:text-stone-800'
                }`}
                title="Tampilan Tabel"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search & Category Filter */}
          <div className="bg-white p-3.5 sm:p-4 rounded-3xl border border-[#CECDA9]/60 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="flex-1 w-full relative">
              <Search className="w-4 h-4 text-[#4F7655] absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Cari nama produk, SKU, atau barcode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-[#F5F7F2] border border-[#CECDA9]/60 rounded-2xl focus:outline-none focus:border-[#4F7655] focus:bg-white text-[#294D35]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-2.5 text-xs text-stone-400 hover:text-stone-700 cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Category Dropdown */}
            <div className="w-full md:w-auto shrink-0">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full md:w-auto px-4 py-2.5 text-xs font-medium border border-[#CECDA9]/60 rounded-2xl bg-white text-[#294D35] focus:outline-none focus:border-[#4F7655] cursor-pointer"
              >
                <option value="all">Semua Kategori</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Product Cards Grid (Default Modern UI) */}
          {viewMode === 'grid' ? (
            <div>
              {filteredProducts.length === 0 ? (
                <div className="bg-white rounded-3xl border border-[#CECDA9]/60 p-10 text-center">
                  <div className="w-12 h-12 rounded-full bg-[#EBE4C2] flex items-center justify-center text-[#294D35] mx-auto mb-3">
                    <Boxes className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-[#294D35] text-sm">Tidak ada produk ditemukan</h3>
                  <p className="text-xs text-[#5C6B58] mt-1 max-w-xs mx-auto">
                    Coba sesuaikan pencarian atau filter status stok.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                  {filteredProducts.map(p => {
                    const cat = categories.find(c => c.id === p.categoryId);
                    const stockInfo = productStocks.get(p.id) || { quantity: 0, avgCost: 0 };
                    const isLow = stockInfo.quantity <= p.minStock && stockInfo.quantity > 0;
                    const isOut = stockInfo.quantity <= 0;

                    return (
                      <div
                        key={p.id}
                        className="bg-white rounded-3xl border border-[#CECDA9]/60 hover:border-[#4F7655] p-3 sm:p-4 text-left flex flex-col justify-between transition-all hover:shadow-md group shadow-xs"
                      >
                        <div>
                          {/* Image Thumbnail / Visual Fallback */}
                          <div className="relative w-full aspect-4/3 rounded-2xl bg-[#F5F7F2] border border-[#CECDA9]/40 overflow-hidden flex items-center justify-center mb-2.5">
                            {p.imageUrl ? (
                              <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            ) : (
                              <Boxes className="w-8 h-8 text-[#4F7655]/50" />
                            )}
                            {/* Category Pill Tag */}
                            <span className="absolute top-2 left-2 px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-xs text-white text-[10px] font-semibold">
                              {cat?.name || 'Umum'}
                            </span>
                          </div>

                          {/* SKU & Stock Pill */}
                          <div className="flex items-center justify-between gap-1 text-[11px] mb-1">
                            <span className="font-mono text-stone-400 truncate max-w-[80px]">{p.sku}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isOut
                                ? 'bg-red-100 text-red-700'
                                : isLow
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-[#EBE4C2] text-[#294D35]'
                            }`}>
                              {isOut ? 'Habis' : isLow ? `Sisa: ${stockInfo.quantity}` : `${stockInfo.quantity} ${p.unit}`}
                            </span>
                          </div>

                          {/* Product Name */}
                          <h4 className="font-bold text-[#294D35] text-xs sm:text-sm line-clamp-2 min-h-[2.4em] leading-snug">
                            {p.name}
                          </h4>

                          {/* Price */}
                          <div className="mt-2">
                            <p className="font-black text-[#294D35] text-sm sm:text-base tabular-nums">
                              Rp {p.sellingPrice.toLocaleString('id-ID')}
                            </p>
                            <p className="text-[10px] text-[#5C6B58] tabular-nums">
                              HPP: Rp {(stockInfo.avgCost > 0 ? stockInfo.avgCost : p.costPrice).toLocaleString('id-ID')}
                            </p>
                          </div>
                        </div>

                        {/* Actions (Large Touch Targets min-h-[38px]) */}
                        <div className="mt-3 pt-2.5 border-t border-[#CECDA9]/40 flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenOpname(p)}
                            title="Stok Opname / Koreksi Fisik"
                            className="flex-1 py-1.5 px-2 bg-[#EBE4C2] hover:bg-[#D3D464]/60 text-[#294D35] rounded-xl font-bold text-xs transition-colors min-h-[38px] flex items-center justify-center cursor-pointer"
                          >
                            Opname
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(p)}
                            title="Ubah Produk"
                            className="p-2 text-[#4F7655] hover:bg-stone-100 rounded-xl transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center cursor-pointer border border-[#CECDA9]/40"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(p)}
                            title="Hapus Produk"
                            className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center cursor-pointer border border-red-200"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Table View */
            <div className="bg-white rounded-3xl border border-[#CECDA9]/60 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#F5F7F2] border-b border-[#CECDA9]/60 text-[#294D35] font-bold">
                      <th className="py-3 px-4">Nama Produk & SKU</th>
                      <th className="py-3 px-3">Kategori</th>
                      <th className="py-3 px-3 text-right">Harga Beli (HPP)</th>
                      <th className="py-3 px-3 text-right">Harga Jual</th>
                      <th className="py-3 px-3 text-right">Stok ({branch.name})</th>
                      <th className="py-3 px-4 text-center">Aksi Operasional</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#CECDA9]/30">
                    {filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-stone-400">
                          Tidak ada produk yang sesuai dengan kriteria filter.
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map(p => {
                        const cat = categories.find(c => c.id === p.categoryId);
                        const stockInfo = productStocks.get(p.id) || { quantity: 0, avgCost: 0 };
                        const isLow = stockInfo.quantity <= p.minStock && stockInfo.quantity > 0;
                        const isOut = stockInfo.quantity <= 0;

                        return (
                          <tr key={p.id} className="hover:bg-[#F5F0E5]/30 transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-stone-100 border border-[#CECDA9]/60 overflow-hidden flex items-center justify-center shrink-0">
                                  {p.imageUrl ? (
                                    <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <Boxes className="w-4 h-4 text-stone-400" />
                                  )}
                                </div>
                                <div>
                                  <p className="font-bold text-[#294D35]">{p.name}</p>
                                  <div className="flex items-center gap-2 text-[11px] text-stone-500 font-mono mt-0.5">
                                    <span>SKU: {p.sku}</span>
                                    {p.barcode && <span>· Barcode: {p.barcode}</span>}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-3 text-stone-600 font-medium">
                              {cat?.name || 'Umum'}
                            </td>
                            <td className="py-3 px-3 text-right font-mono tabular-nums text-stone-600">
                              Rp {(stockInfo.avgCost > 0 ? stockInfo.avgCost : p.costPrice).toLocaleString('id-ID')}
                            </td>
                            <td className="py-3 px-3 text-right font-black text-[#294D35] font-mono tabular-nums">
                              Rp {p.sellingPrice.toLocaleString('id-ID')}
                            </td>
                            <td className="py-3 px-3 text-right font-mono tabular-nums">
                              <span className={`font-bold ${isOut ? 'text-red-700' : isLow ? 'text-amber-700' : 'text-[#294D35]'}`}>
                                {stockInfo.quantity} {p.unit}
                              </span>
                              {isOut && <span className="block text-[10px] text-red-600 font-sans">Habis</span>}
                              {isLow && <span className="block text-[10px] text-amber-600 font-sans">Stok Kritis</span>}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenOpname(p)}
                                  title="Stok Opname / Penyesuaian Fisik"
                                  className="px-2.5 py-1 bg-[#EBE4C2] hover:bg-[#D3D464] text-[#294D35] rounded-xl font-bold text-[11px] transition-colors cursor-pointer min-h-[34px]"
                                >
                                  Opname
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(p)}
                                  title="Edit Produk"
                                  className="p-1.5 text-stone-500 hover:text-stone-900 rounded-xl hover:bg-stone-100 cursor-pointer min-h-[34px] min-w-[34px] flex items-center justify-center"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteProduct(p)}
                                  title="Hapus Produk"
                                  className="p-1.5 text-red-500 hover:text-red-700 rounded-xl hover:bg-stone-100 cursor-pointer min-h-[34px] min-w-[34px] flex items-center justify-center"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Movements Tab View */}
      {activeTab === 'movements' && (
        <div className="bg-white rounded-xl border border-[#DCE5D6] overflow-hidden shadow-xs space-y-0">
          {/* Header & Controls */}
          <div className="p-4 border-b border-stone-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm text-[#294D35]">Buku Log Mutasi Stok ({branch.name})</h3>
              <p className="text-xs text-stone-500 mt-0.5">Catatan audit pergerakan keluar-masuk barang secara kronologis (WIB)</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Type Filter */}
              <div className="flex items-center gap-1 bg-stone-100 p-0.5 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setMovementFilterType('all')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    movementFilterType === 'all' ? 'bg-white text-[#294D35] shadow-xs font-semibold' : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Semua
                </button>
                <button
                  type="button"
                  onClick={() => setMovementFilterType('sale')}
                  className={`px-2 py-1 rounded-md font-medium transition-colors ${
                    movementFilterType === 'sale' ? 'bg-white text-blue-700 shadow-xs font-semibold' : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Penjualan
                </button>
                <button
                  type="button"
                  onClick={() => setMovementFilterType('purchase')}
                  className={`px-2 py-1 rounded-md font-medium transition-colors ${
                    movementFilterType === 'purchase' ? 'bg-white text-emerald-700 shadow-xs font-semibold' : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Pembelian
                </button>
                <button
                  type="button"
                  onClick={() => setMovementFilterType('adjustment')}
                  className={`px-2 py-1 rounded-md font-medium transition-colors ${
                    movementFilterType === 'adjustment' ? 'bg-white text-amber-700 shadow-xs font-semibold' : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Opname
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari produk / alasan..."
                  value={movementSearch}
                  onChange={(e) => setMovementSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 border border-stone-300 rounded-lg text-xs focus:outline-none focus:border-[#4F7655] w-40 sm:w-48"
                />
              </div>

              {/* Download / Export Button */}
              <button
                type="button"
                onClick={handleExportMovements}
                className="px-3.5 py-1.5 bg-[#294D35] hover:bg-[#1e3827] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs shrink-0"
                title="Ekspor seluruh riwayat mutasi stok ke file CSV Excel"
              >
                <Download className="w-3.5 h-3.5 text-[#D6BD7A]" />
                <span>Unduh CSV Mutasi</span>
              </button>
            </div>
          </div>

          {/* Success Banner */}
          {exportSuccessMsg && (
            <div className="p-3 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{exportSuccessMsg}</span>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left border-collapse text-xs">
              <thead>
                <tr className="bg-stone-50/80 border-b border-stone-200 text-stone-600 font-semibold">
                  <th className="py-3 px-4">Waktu (Hari, Tanggal, Jam WIB)</th>
                  <th className="py-3 px-3">Produk</th>
                  <th className="py-3 px-3">Jenis Mutasi</th>
                  <th className="py-3 px-3 text-right">Perubahan</th>
                  <th className="py-3 px-3 text-right">Saldo Akhir</th>
                  <th className="py-3 px-4">Alasan & Petugas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredMovements.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-stone-400">
                      {movements.length === 0
                        ? 'Belum ada pergerakan stok yang tercatat pada cabang ini.'
                        : 'Tidak ada riwayat mutasi yang cocok dengan filter pencarian.'}
                    </td>
                  </tr>
                ) : (
                  filteredMovements.map(m => {
                    const prod = products.find(p => p.id === m.productId);
                    const isPositive = m.quantityDelta > 0;

                    return (
                      <tr key={m.id} className="hover:bg-stone-50/60">
                        <td className="py-3 px-4 text-stone-800 font-medium text-[11px] whitespace-nowrap">
                          {formatIndonesianDateTime(m.createdAt)}
                        </td>
                        <td className="py-3 px-3 font-semibold text-[#294D35]">
                          {prod?.name || 'Produk ID: ' + m.productId}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            m.type === 'sale' ? 'bg-blue-50 text-blue-700' :
                            m.type === 'purchase' ? 'bg-emerald-50 text-emerald-700' :
                            m.type === 'adjustment' ? 'bg-amber-50 text-amber-700' : 'bg-stone-100 text-stone-700'
                          }`}>
                            {m.type === 'sale' ? 'Penjualan' :
                             m.type === 'purchase' ? 'Pembelian' :
                             m.type === 'adjustment' ? 'Penyesuaian' : m.type}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums font-bold">
                          <span className={isPositive ? 'text-emerald-700' : 'text-red-600'}>
                            {isPositive ? `+${m.quantityDelta}` : m.quantityDelta}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums text-stone-700">
                          {m.newQuantity} {prod?.unit || 'Pcs'}
                        </td>
                        <td className="py-3 px-4 text-stone-600">
                          <p>{m.reason}</p>
                          <span className="text-[10px] text-stone-400 font-mono">Oleh: {m.createdBy}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 bg-[rgba(41,77,53,0.55)] backdrop-blur-xs transition-opacity duration-200 ease-out flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-2xl border border-[#DCE5D6] shadow-2xl p-4 sm:p-6 relative max-h-[90dvh] flex flex-col my-auto overflow-hidden">
            <button
              onClick={() => setShowProductModal(false)}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 text-sm p-1 z-10"
            >
              ✕
            </button>

            <div className="shrink-0 mb-3 pr-6">
              <h3 className="text-base sm:text-lg font-bold text-[#294D35] mb-0.5">
                {editingProduct ? 'Edit Informasi Produk' : 'Tambah Produk Baru'}
              </h3>
              <p className="text-xs text-stone-500">
                Lengkapi informasi produk, harga pokok, dan harga jual retail.
              </p>
            </div>

            {prodFormError && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg shrink-0">
                {prodFormError}
              </div>
            )}

            <form onSubmit={handleSaveProduct} className="flex-1 overflow-y-auto min-h-0 space-y-3.5 text-xs pr-1 -mr-1">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Nama Produk *</label>
                <input
                  type="text"
                  placeholder="Contoh: Sabun Mandi Lifebuoy / Minyak Goreng Sania 2L"
                  value={prodName}
                  onChange={(e) => {
                    setProdName(e.target.value);
                    setDismissedSuggestion(false);
                  }}
                  required
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:border-[#4F7655]"
                />

                {/* Smart Auto Suggestion Banner (Optional Confirmation) */}
                {autoSuggestion && !dismissedSuggestion && (
                  <div className="mt-2 p-2.5 bg-[#F5F0E5]/50 border border-[#DCE5D6] rounded-xl flex items-center justify-between gap-3 animate-in fade-in">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#4F7655] shrink-0" />
                      <div className="text-xs text-[#294D35]">
                        <span className="font-semibold">Saran Otomatis:</span> Kategori{' '}
                        <span className="font-bold underline text-[#294D35]">{autoSuggestion.categoryName}</span> &middot; Satuan{' '}
                        <span className="font-bold underline text-[#294D35]">{autoSuggestion.unit}</span>
                        <span className="text-[10px] text-stone-500 block">({autoSuggestion.reason})</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleApplySuggestion(autoSuggestion)}
                        className="px-2.5 py-1 bg-[#294D35] hover:bg-[#1e3827] text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                      >
                        <Check className="w-3 h-3 text-[#D6BD7A]" />
                        <span>Terapkan</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDismissedSuggestion(true)}
                        className="p-1 text-stone-400 hover:text-stone-600 rounded"
                        title="Abaikan saran"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Applied Confirmation Notice */}
                {appliedSuggestionMessage && (
                  <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-1.5 animate-in fade-in">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{appliedSuggestionMessage}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Kategori Field */}
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Kategori <span className="text-stone-400 font-normal">(Pilihan / Saran)</span>
                  </label>
                  <select
                    value={prodCatMode}
                    onChange={(e) => {
                      setProdCatMode(e.target.value);
                      if (e.target.value !== '__custom__') setCustomCatName('');
                    }}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg bg-white focus:outline-none focus:border-[#4F7655]"
                  >
                    {availableCategoryNames.map(cName => (
                      <option key={cName} value={cName}>{cName}</option>
                    ))}
                    <option value="__custom__">+ Lainnya (Tulis Kategori Sendiri)</option>
                  </select>

                  {prodCatMode === '__custom__' && (
                    <div className="mt-1.5 animate-in fade-in">
                      <input
                        type="text"
                        placeholder="Ketik kategori baru (misal: Beku/Frozen)..."
                        value={customCatName}
                        onChange={(e) => setCustomCatName(e.target.value)}
                        required
                        className="w-full px-3 py-1.5 border border-[#4F7655] bg-[#F5F7F2] rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#4F7655]"
                      />
                    </div>
                  )}
                </div>

                {/* Satuan Field */}
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Satuan <span className="text-stone-400 font-normal">(Pilihan / Saran)</span>
                  </label>
                  <select
                    value={prodUnitMode}
                    onChange={(e) => {
                      setProdUnitMode(e.target.value);
                      if (e.target.value !== '__custom__') setCustomUnitName('');
                    }}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg bg-white focus:outline-none focus:border-[#4F7655]"
                  >
                    {availableUnitSymbols.map(uSym => (
                      <option key={uSym} value={uSym}>{uSym}</option>
                    ))}
                    <option value="__custom__">+ Lainnya (Tulis Satuan Sendiri)</option>
                  </select>

                  {prodUnitMode === '__custom__' && (
                    <div className="mt-1.5 animate-in fade-in">
                      <input
                        type="text"
                        placeholder="Ketik satuan baru (misal: Roll, Lusin, Pasang)..."
                        value={customUnitName}
                        onChange={(e) => setCustomUnitName(e.target.value)}
                        required
                        className="w-full px-3 py-1.5 border border-[#4F7655] bg-[#F5F7F2] rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#4F7655]"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">SKU (Kode Unik)</label>
                  <input
                    type="text"
                    value={prodSku}
                    onChange={(e) => setProdSku(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg font-mono focus:outline-none focus:border-[#4F7655]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Barcode Scanner (Opsional)</label>
                  <input
                    type="text"
                    placeholder="Contoh: 89912345678"
                    value={prodBarcode}
                    onChange={(e) => setProdBarcode(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg font-mono focus:outline-none focus:border-[#4F7655]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Harga Beli / HPP Awal (Rp)</label>
                  <input
                    type="number"
                    value={prodCostPrice || ''}
                    onChange={(e) => setProdCostPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg font-mono tabular-nums focus:outline-none focus:border-[#4F7655]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Harga Jual Kasir (Rp) *</label>
                  <input
                    type="number"
                    value={prodSellingPrice || ''}
                    onChange={(e) => setProdSellingPrice(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg font-mono tabular-nums font-bold text-[#294D35] focus:outline-none focus:border-[#4F7655]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Batas Minimum Peringatan Stok Rendah</label>
                <input
                  type="number"
                  value={prodMinStock}
                  onChange={(e) => setProdMinStock(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg font-mono focus:outline-none focus:border-[#4F7655]"
                />
              </div>

              {/* Product Image Upload Section */}
              <div className="space-y-1.5 pt-1">
                <label className="block font-semibold text-stone-700">Foto / Gambar Produk (Supabase Storage)</label>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl border border-stone-300 bg-stone-50 overflow-hidden flex items-center justify-center shrink-0">
                    {prodImageUrl ? (
                      <img src={prodImageUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-stone-400" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-semibold cursor-pointer border border-stone-300 transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{isUploadingProdImage ? 'Mengunggah...' : prodImageUrl ? 'Ganti Foto Produk' : 'Pilih Foto Produk'}</span>
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/webp"
                        onChange={handleProductImageFileChange}
                        disabled={isUploadingProdImage}
                        className="hidden"
                      />
                    </label>
                    {prodImageUrl && (
                      <button
                        type="button"
                        onClick={() => setProdImageUrl('')}
                        className="block text-[11px] text-red-600 hover:underline"
                      >
                        Hapus Foto
                      </button>
                    )}
                    <p className="text-[10px] text-stone-400">Maksimal 10 MB (PNG, JPG, WebP). Disimpan ke bucket &apos;product-images&apos; atau &apos;logos&apos;.</p>
                  </div>
                </div>
                {prodImageError && (
                  <p className="text-[11px] text-red-600">{prodImageError}</p>
                )}
              </div>

              <div className="pt-3 border-t border-stone-200 shrink-0 flex items-center gap-2">
                {editingProduct && user.role !== 'cashier' && (
                  <button
                    type="button"
                    onClick={() => handleDeleteProduct(editingProduct)}
                    className="py-2.5 px-3 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                    title="Hapus produk ini dari katalog toko"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                    <span>Hapus</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="w-1/3 py-2.5 rounded-lg border border-stone-200 text-stone-700 font-semibold hover:bg-stone-50 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-lg bg-[#294D35] hover:bg-[#4F7655] text-white font-semibold transition-colors cursor-pointer shadow-xs"
                >
                  {editingProduct ? 'Perbarui Produk' : 'Simpan Produk Baru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Opname Modal with 6-Digit PIN Security */}
      {showOpnameModal && opnameProduct && (
        <div className="fixed inset-0 z-50 bg-[rgba(41,77,53,0.55)] backdrop-blur-xs transition-opacity duration-200 ease-out flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-2xl border border-[#DCE5D6] shadow-2xl p-4 sm:p-6 relative max-h-[90dvh] flex flex-col my-auto overflow-hidden">
            <button
              onClick={() => setShowOpnameModal(false)}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 text-sm p-1 z-10"
            >
              ✕
            </button>

            <div className="shrink-0 mb-3 pr-6">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                  <Lock className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-[#294D35]">Stok Opname & Penyesuaian Fisik</h3>
              </div>

              <p className="text-xs text-stone-500">
                Produk: <strong>{opnameProduct.name}</strong> ({branch.name})
              </p>
            </div>

            {opnameError && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg shrink-0">
                {opnameError}
              </div>
            )}

            <form onSubmit={handleExecuteOpname} className="flex-1 overflow-y-auto min-h-0 space-y-3.5 text-xs pr-1 -mr-1">
              <div className="bg-[#F5F7F2] p-3 rounded-xl border border-[#DCE5D6] flex justify-between items-center">
                <span className="text-stone-600 font-medium">Stok Sistem Saat Ini:</span>
                <span className="font-bold text-[#294D35] text-sm font-mono">
                  {(productStocks.get(opnameProduct.id)?.quantity ?? 0)} {opnameProduct.unit}
                </span>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Jumlah Stok Fisik Riil Terhitung *
                </label>
                <input
                  type="number"
                  value={opnameNewQty}
                  onChange={(e) => setOpnameNewQty(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2.5 text-base font-bold font-mono text-[#294D35] border border-stone-300 rounded-lg focus:outline-none focus:border-[#4F7655]"
                />
                <span className="text-[11px] text-stone-500 mt-1 block">
                  Selisih: {opnameNewQty - (productStocks.get(opnameProduct.id)?.quantity ?? 0)} {opnameProduct.unit}
                </span>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Alasan Penyesuaian *</label>
                <select
                  value={opnameReason}
                  onChange={(e) => setOpnameReason(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg bg-white focus:outline-none focus:border-[#4F7655]"
                >
                  <option value="Selisih Hitung Fisik (Opname Rutin)">Selisih Hitung Fisik (Opname Rutin)</option>
                  <option value="Barang Rusak / Pecah di Toko">Barang Rusak / Pecah di Toko</option>
                  <option value="Barang Hilang / Selisih Kasir">Barang Hilang / Selisih Kasir</option>
                  <option value="Barang Kedaluwarsa (Expired)">Barang Kedaluwarsa (Expired)</option>
                  <option value="Koreksi Saldo Awal Toko">Koreksi Saldo Awal Toko</option>
                </select>
              </div>

              <div className="pt-2 border-t border-stone-200">
                <label className="block font-semibold text-stone-700 mb-1">
                  Otorisasi: Masukkan 6-Digit PIN Transaksi *
                </label>
                <input
                  type="password"
                  maxLength={6}
                  placeholder="••••••"
                  value={opnamePin}
                  onChange={(e) => setOpnamePin(e.target.value.replace(/\D/g, ''))}
                  required
                  className="w-full px-3 py-2 text-center text-lg tracking-widest font-mono border border-stone-300 rounded-lg focus:outline-none focus:border-[#4F7655]"
                />
              </div>

              <div className="pt-3 border-t border-stone-200 shrink-0 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowOpnameModal(false)}
                  className="w-1/3 py-2.5 rounded-lg border border-stone-200 text-stone-700 font-semibold cursor-pointer hover:bg-stone-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingOpname}
                  className="flex-1 py-2.5 rounded-lg bg-[#294D35] hover:bg-[#4F7655] text-white font-semibold transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {isSubmittingOpname ? 'Memverifikasi PIN...' : 'Konfirmasi Opname Stok'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 bg-[rgba(41,77,53,0.55)] backdrop-blur-xs transition-opacity duration-200 ease-out flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-sm rounded-2xl border border-[#DCE5D6] shadow-2xl p-4 sm:p-6 relative max-h-[90dvh] flex flex-col my-auto overflow-hidden">
            <button
              onClick={() => setShowCategoryModal(false)}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 text-sm p-1 z-10"
            >
              ✕
            </button>
            <div className="shrink-0 mb-3 pr-6">
              <h3 className="text-base font-bold text-[#294D35]">Kelola Kategori Produk</h3>
            </div>
            <form onSubmit={handleAddCategory} className="space-y-3 text-xs mb-4 shrink-0">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Nama Kategori Baru</label>
                <input
                  type="text"
                  placeholder="Contoh: Frozen Food"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:border-[#4F7655]"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-[#294D35] hover:bg-[#4F7655] text-white font-semibold rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                Tambah Kategori
              </button>
            </form>

            <div className="pt-3 border-t border-stone-200 flex-1 overflow-y-auto min-h-0 pr-1">
              <span className="font-semibold text-stone-700 block mb-2 text-xs">Daftar Kategori ({categories.length}):</span>
              <div className="space-y-1">
                {categories.map(c => (
                  <div key={c.id} className="p-2 bg-stone-50 rounded-lg border border-stone-200 text-xs flex justify-between items-center">
                    <span className="font-medium text-stone-800">{c.name}</span>
                    <button
                      onClick={() => {
                        jaloraStorage.deleteCategory(c.id);
                        onRefreshData?.();
                      }}
                      className="text-stone-400 hover:text-red-600 text-[10px] cursor-pointer"
                    >
                      Hapus
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom In-App Modal: Konfirmasi Hapus Produk (Menghilangkan window.confirm) */}
      {productToDelete && createPortal(
        <div className="fixed inset-0 z-50 bg-[rgba(41,77,53,0.55)] backdrop-blur-xs transition-opacity duration-200 ease-out flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-2xl border border-[#DCE5D6] shadow-2xl p-4 sm:p-6 relative max-h-[90dvh] flex flex-col my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-200 space-y-3.5">
            <button
              onClick={() => {
                if (!isDeletingProduct) setProductToDelete(null);
              }}
              disabled={isDeletingProduct}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 text-sm p-1 rounded-lg transition-colors cursor-pointer z-10"
            >
              ✕
            </button>

            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#294D35]">Hapus Produk dari Katalog</h3>
                <p className="text-xs text-stone-500">Konfirmasi tindakan penghapusan produk</p>
              </div>
            </div>

            {/* Product Detail Card */}
            <div className="p-3.5 bg-[#F5F7F2] border border-[#DCE5D6] rounded-xl space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white border border-stone-200 overflow-hidden flex items-center justify-center shrink-0">
                  {productToDelete.imageUrl ? (
                    <img src={productToDelete.imageUrl} alt={productToDelete.name} className="w-full h-full object-cover" />
                  ) : (
                    <Boxes className="w-5 h-5 text-stone-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-[#294D35] truncate">{productToDelete.name}</h4>
                  <div className="flex items-center gap-2 text-[11px] text-stone-500 font-mono">
                    <span>SKU: {productToDelete.sku}</span>
                    <span>· {productToDelete.unit}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#DCE5D6] text-xs">
                <div>
                  <span className="text-stone-500 block text-[10px]">Harga Jual:</span>
                  <span className="font-bold text-[#294D35] font-mono">
                    Rp {productToDelete.sellingPrice.toLocaleString('id-ID')}
                  </span>
                </div>
                <div>
                  <span className="text-stone-500 block text-[10px]">Stok ({branch.name}):</span>
                  <span className="font-semibold text-stone-800 font-mono">
                    {(productStocks.get(productToDelete.id)?.quantity || 0)} {productToDelete.unit}
                  </span>
                </div>
              </div>
            </div>

            {/* Safety Guarantee Notice */}
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Integritas Data Keuangan Terjamin</span>
              </div>
              <p className="text-[11px] leading-relaxed text-emerald-800">
                Riwayat transaksi kasir, laporan penjualan, dan pembukuan jurnal keuangan masa lalu tetap tersimpan utuh dan tidak berubah. Produk hanya akan dihapus dari katalog pencarian kasir POS aktif.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                disabled={isDeletingProduct}
                className="w-1/3 py-2.5 rounded-xl border border-stone-300 text-stone-700 font-semibold text-xs hover:bg-stone-100 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteProduct}
                disabled={isDeletingProduct}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeletingProduct ? 'Menghapus Produk...' : 'Ya, Hapus Produk'}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Reactive Feedback Toast */}
      {productFeedbackMsg && createPortal(
        <div className="fixed top-5 right-5 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className={`px-4 py-3 rounded-xl shadow-lg border flex items-center gap-2.5 text-xs font-semibold ${
            productFeedbackMsg.type === 'success'
              ? 'bg-[#294D35] text-white border-[#4F7655]'
              : 'bg-red-600 text-white border-red-700'
          }`}>
            {productFeedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-[#D6BD7A] shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-white shrink-0" />
            )}
            <span>{productFeedbackMsg.text}</span>
            <button
              onClick={() => setProductFeedbackMsg(null)}
              className="ml-2 text-white/70 hover:text-white p-0.5"
            >
              ✕
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
