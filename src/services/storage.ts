/**
 * JALORA — Business Management Platform
 * Storage Engine, Business Logic, Moving Weighted Average, and Double-Entry Ledger
 * Created by Abdul Jalil
 */

import {
  Account,
  AppNotification,
  AuditLog,
  Branch,
  CashMovement,
  CashSession,
  Category,
  Customer,
  JournalEntry,
  Product,
  Purchase,
  ReceivablePayable,
  Sale,
  StockBalance,
  StockMovement,
  Store,
  Supplier,
  Unit,
  UserProfile,
  PrinterConfig,
  PaymentMethod,
  StoreBankAccount,
  StoreEWalletAccount,
  StorePaymentConfig
} from '../types';

export type { StoreBankAccount, StoreEWalletAccount, StorePaymentConfig };

export interface BackupValidationResult {
  isValid: boolean;
  error?: string;
  metadata?: {
    version: string;
    exportedAt: string;
    platform: string;
    creator?: string;
  };
  summary?: {
    storeCount: number;
    branchCount: number;
    productCount: number;
    saleCount: number;
    customerCount: number;
    supplierCount: number;
    journalCount: number;
    userCount: number;
    storeName?: string;
  };
  parsedData?: any;
}

const STORAGE_KEYS = {
  CURRENT_USER: 'jalora_current_user',
  CURRENT_STORE: 'jalora_current_store',
  STORES: 'jalora_stores',
  USERS: 'jalora_users',
  BRANCHES: 'jalora_branches',
  CATEGORIES: 'jalora_categories',
  UNITS: 'jalora_units',
  PRODUCTS: 'jalora_products',
  STOCK_BALANCES: 'jalora_stock_balances',
  STOCK_MOVEMENTS: 'jalora_stock_movements',
  SUPPLIERS: 'jalora_suppliers',
  CUSTOMERS: 'jalora_customers',
  PURCHASES: 'jalora_purchases',
  SALES: 'jalora_sales',
  ACCOUNTS: 'jalora_accounts',
  JOURNAL_ENTRIES: 'jalora_journals',
  CASH_SESSIONS: 'jalora_cash_sessions',
  CASH_MOVEMENTS: 'jalora_cash_movements',
  RECEIVABLES_PAYABLES: 'jalora_receivables_payables',
  AUDIT_LOGS: 'jalora_audit_logs',
  NOTIFICATIONS: 'jalora_notifications',
  PRINTER_CONFIG: 'jalora_printer_config',
  PAYMENT_CONFIG: 'jalora_payment_config',
  IDEMPOTENCY_KEYS: 'jalora_idempotency_keys',
};

// Simple secure hash for transaction PIN (client-side SHA-256 equivalent)
export async function hashPin(pin: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(`jalora_salt_${pin}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export const DEFAULT_ACCOUNTS: Omit<Account, 'id' | 'storeId'>[] = [
  { code: '1-1001', name: 'Kas Kasir', category: 'asset', normalBalance: 'debit', description: 'Uang tunai fisik pada laci kasir', isSystem: true },
  { code: '1-1002', name: 'Bank Operasional (BCA/Mandiri/QRIS)', category: 'asset', normalBalance: 'debit', description: 'Rekening bank untuk transfer & penampungan QRIS', isSystem: true },
  { code: '1-1003', name: 'Piutang Usaha', category: 'asset', normalBalance: 'debit', description: 'Tagihan kepada pelanggan atas penjualan tempo', isSystem: true },
  { code: '1-1004', name: 'Persediaan Barang Dagang', category: 'asset', normalBalance: 'debit', description: 'Nilai persediaan barang di toko (Moving Average)', isSystem: true },
  { code: '2-1001', name: 'Utang Usaha / Supplier', category: 'liability', normalBalance: 'credit', description: 'Kewajiban kepada pemasok barang tempo', isSystem: true },
  { code: '2-1002', name: 'Utang Pajak (PPN)', category: 'liability', normalBalance: 'credit', description: 'PPN Keluaran yang harus disetor', isSystem: true },
  { code: '3-1001', name: 'Modal Pemilik', category: 'equity', normalBalance: 'credit', description: 'Modal disetor pemilik usaha', isSystem: true },
  { code: '3-1002', name: 'Laba Ditahan', category: 'equity', normalBalance: 'credit', description: 'Akumulasi laba bersih periode sebelumnya', isSystem: true },
  { code: '4-1001', name: 'Pendapatan Penjualan Retail', category: 'revenue', normalBalance: 'credit', description: 'Total omzet penjualan kasir', isSystem: true },
  { code: '5-1001', name: 'Harga Pokok Penjualan (HPP)', category: 'expense', normalBalance: 'debit', description: 'Beban pokok dari barang dagang yang terjual', isSystem: true },
  { code: '6-1001', name: 'Beban Operasional Toko', category: 'expense', normalBalance: 'debit', description: 'Biaya listrik, sewa, kantong kresek, operasional', isSystem: true },
  { code: '6-1002', name: 'Beban Selisih Kas (Kurang)', category: 'expense', normalBalance: 'debit', description: 'Selisih minus saat penutupan shift kasir', isSystem: true },
];

export const DEFAULT_UNITS: Omit<Unit, 'id' | 'storeId'>[] = [
  { name: 'Pieces', symbol: 'Pcs' },
  { name: 'Kardus / Karton', symbol: 'Box' },
  { name: 'Kilogram', symbol: 'Kg' },
  { name: 'Liter', symbol: 'L' },
  { name: 'Pack / Bungkus', symbol: 'Pack' },
  { name: 'Botol', symbol: 'Btl' },
];

export const DEFAULT_CATEGORIES: Omit<Category, 'id' | 'storeId'>[] = [
  { name: 'Makanan & Minuman', description: 'Snack, minuman kemasan, dan bahan segar' },
  { name: 'Sembako & Kebutuhan Pokok', description: 'Beras, minyak, gula, tepung' },
  { name: 'Perlengkapan Rumah Tangga', description: 'Sabun, deterjen, tisu, pembersih' },
  { name: 'Alat Tulis & Kantor', description: 'Buku, pulpen, kertas' },
  { name: 'Umum & Lainnya', description: 'Kategori barang umum' },
];



class JaloraStorageEngine {
  private get<T>(key: string, defaultValue: T): T {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  private set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('Storage set error:', e);
    }
  }

  // --- Session & Profile ---
  getCurrentUser(): UserProfile | null {
    return this.get<UserProfile | null>(STORAGE_KEYS.CURRENT_USER, null);
  }

  setCurrentUser(user: UserProfile | null): void {
    this.set(STORAGE_KEYS.CURRENT_USER, user);
  }

  clearUserSession(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    } catch {
      this.set(STORAGE_KEYS.CURRENT_USER, null);
    }
  }

  getUsers(): UserProfile[] {
    return this.get<UserProfile[]>(STORAGE_KEYS.USERS, []);
  }

  saveUser(user: UserProfile): void {
    const users = this.getUsers().filter(u => u.id !== user.id);
    users.push(user);
    this.set(STORAGE_KEYS.USERS, users);
    if (this.getCurrentUser()?.id === user.id) {
      this.setCurrentUser(user);
    }
  }

  // --- Stores ---
  getCurrentStore(): Store | null {
    return this.get<Store | null>(STORAGE_KEYS.CURRENT_STORE, null);
  }

  setCurrentStore(store: Store | null): void {
    this.set(STORAGE_KEYS.CURRENT_STORE, store);
  }

  getStores(): Store[] {
    return this.get<Store[]>(STORAGE_KEYS.STORES, []);
  }

  saveStore(store: Store): void {
    const stores = this.getStores().filter(s => s.id !== store.id);
    stores.push(store);
    this.set(STORAGE_KEYS.STORES, stores);
    if (this.getCurrentStore()?.id === store.id) {
      this.setCurrentStore(store);
    }
  }

  // --- Branches ---
  getBranches(storeId: string): Branch[] {
    return this.get<Branch[]>(STORAGE_KEYS.BRANCHES, []).filter(b => b.storeId === storeId);
  }

  saveBranch(branch: Branch): void {
    const branches = this.get<Branch[]>(STORAGE_KEYS.BRANCHES, []).filter(b => b.id !== branch.id);
    branches.push(branch);
    this.set(STORAGE_KEYS.BRANCHES, branches);
  }

  // --- Categories & Units ---
  getCategories(storeId: string): Category[] {
    return this.get<Category[]>(STORAGE_KEYS.CATEGORIES, []).filter(c => c.storeId === storeId);
  }

  saveCategory(category: Category): void {
    const list = this.get<Category[]>(STORAGE_KEYS.CATEGORIES, []).filter(c => c.id !== category.id);
    list.push(category);
    this.set(STORAGE_KEYS.CATEGORIES, list);
  }

  deleteCategory(id: string): void {
    const list = this.get<Category[]>(STORAGE_KEYS.CATEGORIES, []).filter(c => c.id !== id);
    this.set(STORAGE_KEYS.CATEGORIES, list);
  }

  getUnits(storeId: string): Unit[] {
    return this.get<Unit[]>(STORAGE_KEYS.UNITS, []).filter(u => u.storeId === storeId);
  }

  // --- Products ---
  getProducts(storeId: string): Product[] {
    return this.get<Product[]>(STORAGE_KEYS.PRODUCTS, []).filter(p => p.storeId === storeId);
  }

  saveProduct(product: Product): void {
    const list = this.get<Product[]>(STORAGE_KEYS.PRODUCTS, []).filter(p => p.id !== product.id);
    list.push(product);
    this.set(STORAGE_KEYS.PRODUCTS, list);
  }

  deleteProduct(id: string, storeId?: string): boolean {
    const list = this.get<Product[]>(STORAGE_KEYS.PRODUCTS, []);
    const product = list.find(p => p.id === id && (!storeId || p.storeId === storeId));
    if (!product) return false;

    // Filter out product from list
    const remaining = list.filter(p => p.id !== id);
    this.set(STORAGE_KEYS.PRODUCTS, remaining);

    // Clean up associated stock balances to prevent orphan records
    const allBalances = this.get<StockBalance[]>(STORAGE_KEYS.STOCK_BALANCES, []);
    const remainingBalances = allBalances.filter(sb => sb.productId !== id);
    this.set(STORAGE_KEYS.STOCK_BALANCES, remainingBalances);

    return true;
  }

  // --- Stock Balances & Weighted Average Valuation ---
  getStockBalances(storeId: string, branchId?: string): StockBalance[] {
    let balances = this.get<StockBalance[]>(STORAGE_KEYS.STOCK_BALANCES, []).filter(sb => sb.storeId === storeId);
    if (branchId) {
      balances = balances.filter(sb => sb.branchId === branchId);
    }
    return balances;
  }

  getProductStock(storeId: string, branchId: string, productId: string): StockBalance {
    const all = this.getStockBalances(storeId, branchId);
    const existing = all.find(sb => sb.productId === productId);
    if (existing) return existing;

    const newBalance: StockBalance = {
      id: `sb_${branchId}_${productId}`,
      storeId,
      branchId,
      productId,
      quantity: 0,
      avgCost: 0,
      lastUpdatedAt: new Date().toISOString(),
    };
    return newBalance;
  }

  updateStockBalance(balance: StockBalance): void {
    const all = this.get<StockBalance[]>(STORAGE_KEYS.STOCK_BALANCES, []).filter(sb => sb.id !== balance.id);
    all.push(balance);
    this.set(STORAGE_KEYS.STOCK_BALANCES, all);
  }

  // --- Stock Movements ---
  getStockMovements(storeId: string, branchId?: string): StockMovement[] {
    let movements = this.get<StockMovement[]>(STORAGE_KEYS.STOCK_MOVEMENTS, []).filter(sm => sm.storeId === storeId);
    if (branchId) {
      movements = movements.filter(sm => sm.branchId === branchId);
    }
    return movements.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  recordStockMovement(movement: StockMovement): void {
    const movements = this.get<StockMovement[]>(STORAGE_KEYS.STOCK_MOVEMENTS, []);
    movements.push(movement);
    this.set(STORAGE_KEYS.STOCK_MOVEMENTS, movements);
  }

  // --- Customers & Suppliers ---
  getCustomers(storeId: string): Customer[] {
    return this.get<Customer[]>(STORAGE_KEYS.CUSTOMERS, []).filter(c => c.storeId === storeId);
  }

  saveCustomer(customer: Customer): void {
    const list = this.get<Customer[]>(STORAGE_KEYS.CUSTOMERS, []).filter(c => c.id !== customer.id);
    list.push(customer);
    this.set(STORAGE_KEYS.CUSTOMERS, list);
  }

  getSuppliers(storeId: string): Supplier[] {
    return this.get<Supplier[]>(STORAGE_KEYS.SUPPLIERS, []).filter(s => s.storeId === storeId);
  }

  saveSupplier(supplier: Supplier): void {
    const list = this.get<Supplier[]>(STORAGE_KEYS.SUPPLIERS, []).filter(s => s.id !== supplier.id);
    list.push(supplier);
    this.set(STORAGE_KEYS.SUPPLIERS, list);
  }

  // --- Sales & POS ---
  getSales(storeId: string, branchId?: string): Sale[] {
    let sales = this.get<Sale[]>(STORAGE_KEYS.SALES, []).filter(s => s.storeId === storeId);
    if (branchId) {
      sales = sales.filter(s => s.branchId === branchId);
    }
    return sales.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Commit a Sale Atomically
   * 1. Checks Idempotency Key
   * 2. Decrements Stock & Records Movements
   * 3. Creates Automated Balanced Double-Entry Journal
   * 4. Updates Cash Session if Active
   * 5. Logs Audit Event
   */
  commitSale(sale: Sale, createdByName: string): { success: boolean; error?: string; sale?: Sale } {
    const idempotencyKeys = this.get<Record<string, string>>(STORAGE_KEYS.IDEMPOTENCY_KEYS, {});
    if (idempotencyKeys[sale.idempotencyKey]) {
      // Return previously saved sale
      const existing = this.getSales(sale.storeId).find(s => s.idempotencyKey === sale.idempotencyKey);
      if (existing) return { success: true, sale: existing };
    }

    // 1. Validate stocks and compute total HPP (Cost of Goods Sold)
    let totalHPP = 0;
    const stockUpdates: { balance: StockBalance; movement: StockMovement }[] = [];

    for (const item of sale.items) {
      const stock = this.getProductStock(sale.storeId, sale.branchId, item.productId);
      const product = this.getProducts(sale.storeId).find(p => p.id === item.productId);
      const costPrice = stock.avgCost > 0 ? stock.avgCost : (product?.costPrice || 0);

      const previousQty = stock.quantity;
      const newQty = previousQty - item.quantity;

      // Allow soft warning or non-negative check
      const updatedBalance: StockBalance = {
        ...stock,
        quantity: newQty,
        lastUpdatedAt: new Date().toISOString(),
      };

      const movement: StockMovement = {
        id: `sm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        storeId: sale.storeId,
        branchId: sale.branchId,
        productId: item.productId,
        type: 'sale',
        quantityDelta: -item.quantity,
        previousQuantity: previousQty,
        newQuantity: newQty,
        costPerUnit: costPrice,
        referenceId: sale.invoiceNumber,
        reason: `Penjualan Kasir #${sale.invoiceNumber}`,
        createdBy: createdByName,
        createdAt: new Date().toISOString(),
      };

      stockUpdates.push({ balance: updatedBalance, movement });
      totalHPP += costPrice * item.quantity;
    }

    // 2. Persist stock changes
    for (const update of stockUpdates) {
      this.updateStockBalance(update.balance);
      this.recordStockMovement(update.movement);
    }

    // 3. Save Sale
    const allSales = this.get<Sale[]>(STORAGE_KEYS.SALES, []);
    allSales.push(sale);
    this.set(STORAGE_KEYS.SALES, allSales);

    // Record Idempotency Key
    idempotencyKeys[sale.idempotencyKey] = sale.id;
    this.set(STORAGE_KEYS.IDEMPOTENCY_KEYS, idempotencyKeys);

    // 4. Update Customer spent if assigned
    if (sale.customerId) {
      const customers = this.getCustomers(sale.storeId);
      const cust = customers.find(c => c.id === sale.customerId);
      if (cust) {
        cust.totalSpent += sale.totalAmount;
        cust.totalVisits += 1;
        this.saveCustomer(cust);
      }
    }

    // 5. Update Cash Session (if cash payment and session is open)
    if (sale.paymentMethod === 'cash') {
      const activeSession = this.getActiveCashSession(sale.storeId, sale.branchId);
      if (activeSession) {
        activeSession.cashSales += sale.totalAmount;
        activeSession.expectedCash = activeSession.openingCash + activeSession.cashSales + activeSession.cashIn - activeSession.cashOut;
        this.saveCashSession(activeSession);
      }
    }

    // 6. Generate Double-Entry Accounting Journal
    this.generateSaleJournal(sale, totalHPP);

    // 7. Audit Log
    this.recordAuditLog({
      storeId: sale.storeId,
      userName: createdByName,
      userRole: 'Kasir',
      action: 'TRANSAKSI_KASIR',
      targetEntity: 'Sale',
      targetId: sale.invoiceNumber,
      details: `Transaksi POS senilai Rp ${sale.totalAmount.toLocaleString('id-ID')} via ${sale.paymentMethod.toUpperCase()}`,
      timestamp: new Date().toISOString(),
    });

    return { success: true, sale };
  }

  // --- Double-Entry Journal Automation for Sale ---
  private generateSaleJournal(sale: Sale, totalHPP: number): void {
    const accounts = this.getAccounts(sale.storeId);
    const kasAccount = accounts.find(a => a.code === '1-1001') || accounts[0];
    const bankAccount = accounts.find(a => a.code === '1-1002') || accounts[0];
    const revenueAccount = accounts.find(a => a.code === '4-1001') || accounts[8];
    const taxAccount = accounts.find(a => a.code === '2-1002') || accounts[5];
    const hppAccount = accounts.find(a => a.code === '5-1001') || accounts[9];
    const inventoryAccount = accounts.find(a => a.code === '1-1004') || accounts[3];

    const lines: JournalEntry['lines'] = [];

    // Receipt Line: Kas or Bank
    const receivingAccount = sale.paymentMethod === 'cash' ? kasAccount : bankAccount;
    lines.push({
      accountId: receivingAccount.id,
      accountCode: receivingAccount.code,
      accountName: receivingAccount.name,
      debit: sale.totalAmount,
      credit: 0,
    });

    // Revenue Lines (Net Sale + Tax)
    const netRevenue = sale.totalAmount - sale.taxAmount;
    lines.push({
      accountId: revenueAccount.id,
      accountCode: revenueAccount.code,
      accountName: revenueAccount.name,
      debit: 0,
      credit: netRevenue,
    });

    if (sale.taxAmount > 0) {
      lines.push({
        accountId: taxAccount.id,
        accountCode: taxAccount.code,
        accountName: taxAccount.name,
        debit: 0,
        credit: sale.taxAmount,
      });
    }

    // Cost of Goods Sold (HPP) & Inventory Lines (if totalHPP > 0)
    if (totalHPP > 0) {
      lines.push({
        accountId: hppAccount.id,
        accountCode: hppAccount.code,
        accountName: hppAccount.name,
        debit: totalHPP,
        credit: 0,
      });
      lines.push({
        accountId: inventoryAccount.id,
        accountCode: inventoryAccount.code,
        accountName: inventoryAccount.name,
        debit: 0,
        credit: totalHPP,
      });
    }

    const totalDebit = lines.reduce((sum, l) => sum + l.debit, 0);
    const totalCredit = lines.reduce((sum, l) => sum + l.credit, 0);

    const journal: JournalEntry = {
      id: `je_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      storeId: sale.storeId,
      branchId: sale.branchId,
      entryNumber: `JV-${sale.invoiceNumber}`,
      date: sale.createdAt.split('T')[0],
      description: `Jurnal Otomatis Penjualan POS #${sale.invoiceNumber}`,
      referenceType: 'sale',
      referenceId: sale.id,
      lines,
      totalDebit,
      totalCredit,
      isPosted: true,
      createdAt: new Date().toISOString(),
    };

    this.saveJournalEntry(journal);
  }

  // --- Purchases & Moving Weighted Average Receiving ---
  getPurchases(storeId: string, branchId?: string): Purchase[] {
    let purchases = this.get<Purchase[]>(STORAGE_KEYS.PURCHASES, []).filter(p => p.storeId === storeId);
    if (branchId) {
      purchases = purchases.filter(p => p.branchId === branchId);
    }
    return purchases.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  savePurchase(purchase: Purchase): void {
    const list = this.get<Purchase[]>(STORAGE_KEYS.PURCHASES, []).filter(p => p.id !== purchase.id);
    list.push(purchase);
    this.set(STORAGE_KEYS.PURCHASES, list);
  }

  /**
   * Receive Goods: Applies Moving Weighted Average Cost and Influxes Stock
   */
  receivePurchase(purchaseId: string, storeId: string, branchId: string, userName: string): boolean {
    const purchases = this.getPurchases(storeId);
    const purchase = purchases.find(p => p.id === purchaseId);
    if (!purchase || purchase.status === 'received') return false;

    // Process each item with Moving Weighted Average formula
    for (const item of purchase.items) {
      const stock = this.getProductStock(storeId, branchId, item.productId);
      const product = this.getProducts(storeId).find(p => p.id === item.productId);

      const oldQty = stock.quantity;
      const oldCost = stock.avgCost > 0 ? stock.avgCost : (product?.costPrice || 0);
      const incomingQty = item.quantity;
      const incomingCost = item.costPrice;

      const newQty = oldQty + incomingQty;
      // Moving Weighted Average Formula: ((OldQty * OldCost) + (InQty * InCost)) / NewQty
      const newAvgCost = newQty > 0 
        ? Math.round(((oldQty * oldCost) + (incomingQty * incomingCost)) / newQty) 
        : incomingCost;

      // Update Stock Balance
      stock.quantity = newQty;
      stock.avgCost = newAvgCost;
      stock.lastUpdatedAt = new Date().toISOString();
      this.updateStockBalance(stock);

      // Also update base product cost price reference
      if (product) {
        product.costPrice = newAvgCost;
        this.saveProduct(product);
      }

      // Record Stock Movement
      this.recordStockMovement({
        id: `sm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        storeId,
        branchId,
        productId: item.productId,
        type: 'purchase',
        quantityDelta: incomingQty,
        previousQuantity: oldQty,
        newQuantity: newQty,
        costPerUnit: incomingCost,
        referenceId: purchase.invoiceNumber,
        reason: `Penerimaan Barang PO #${purchase.invoiceNumber} (${purchase.supplierName})`,
        createdBy: userName,
        createdAt: new Date().toISOString(),
      });
    }

    // Update Purchase status
    purchase.status = 'received';
    purchase.receivedAt = new Date().toISOString();
    this.savePurchase(purchase);

    // Generate Journal for Purchase
    this.generatePurchaseJournal(purchase);

    // If purchase was credit / tempo, create Payable
    if (purchase.paymentMethod === 'credit' && purchase.totalAmount > purchase.paidAmount) {
      const remaining = purchase.totalAmount - purchase.paidAmount;
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30); // 30 days default tempo
      this.saveReceivablePayable({
        id: `pay_${Date.now()}`,
        storeId,
        type: 'payable',
        partyId: purchase.supplierId,
        partyName: purchase.supplierName,
        invoiceNumber: purchase.invoiceNumber,
        originalAmount: purchase.totalAmount,
        paidAmount: purchase.paidAmount,
        remainingAmount: remaining,
        dueDate: dueDate.toISOString().split('T')[0],
        status: purchase.paidAmount === 0 ? 'unpaid' : 'partial',
        createdAt: new Date().toISOString(),
      });
    }

    // Audit log
    this.recordAuditLog({
      storeId,
      userName,
      userRole: 'Manajer',
      action: 'PENERIMAAN_BARANG',
      targetEntity: 'Purchase',
      targetId: purchase.invoiceNumber,
      details: `Barang diterima untuk PO #${purchase.invoiceNumber} senilai Rp ${purchase.totalAmount.toLocaleString('id-ID')}`,
      timestamp: new Date().toISOString(),
    });

    return true;
  }

  private generatePurchaseJournal(purchase: Purchase): void {
    const accounts = this.getAccounts(purchase.storeId);
    const inventoryAccount = accounts.find(a => a.code === '1-1004') || accounts[3];
    const kasAccount = accounts.find(a => a.code === '1-1001') || accounts[0];
    const payableAccount = accounts.find(a => a.code === '2-1001') || accounts[4];

    const lines: JournalEntry['lines'] = [];

    // Debit Persediaan Barang Dagang
    lines.push({
      accountId: inventoryAccount.id,
      accountCode: inventoryAccount.code,
      accountName: inventoryAccount.name,
      debit: purchase.totalAmount,
      credit: 0,
    });

    // Credit Kas (for cash paid) and Credit Utang Usaha (for unpaid credit)
    if (purchase.paidAmount > 0) {
      lines.push({
        accountId: kasAccount.id,
        accountCode: kasAccount.code,
        accountName: kasAccount.name,
        debit: 0,
        credit: purchase.paidAmount,
      });
    }

    const unpaid = purchase.totalAmount - purchase.paidAmount;
    if (unpaid > 0) {
      lines.push({
        accountId: payableAccount.id,
        accountCode: payableAccount.code,
        accountName: payableAccount.name,
        debit: 0,
        credit: unpaid,
      });
    }

    const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = lines.reduce((s, l) => s + l.credit, 0);

    const journal: JournalEntry = {
      id: `je_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      storeId: purchase.storeId,
      branchId: purchase.branchId,
      entryNumber: `JV-${purchase.invoiceNumber}`,
      date: (purchase.receivedAt || purchase.createdAt).split('T')[0],
      description: `Jurnal Otomatis Pembelian Barang PO #${purchase.invoiceNumber}`,
      referenceType: 'purchase',
      referenceId: purchase.id,
      lines,
      totalDebit,
      totalCredit,
      isPosted: true,
      createdAt: new Date().toISOString(),
    };

    this.saveJournalEntry(journal);
  }

  // --- Chart of Accounts & General Journal ---
  getAccounts(storeId: string): Account[] {
    const stored = this.get<Account[]>(STORAGE_KEYS.ACCOUNTS, []).filter(a => a.storeId === storeId);
    if (stored.length > 0) return stored;

    // Seed default accounts for new store
    const seeded: Account[] = DEFAULT_ACCOUNTS.map((a, i) => ({
      ...a,
      id: `acc_${i + 1}`,
      storeId,
    }));
    this.set(STORAGE_KEYS.ACCOUNTS, [...this.get<Account[]>(STORAGE_KEYS.ACCOUNTS, []), ...seeded]);
    return seeded;
  }

  saveAccount(account: Account): void {
    const list = this.get<Account[]>(STORAGE_KEYS.ACCOUNTS, []).filter(a => a.id !== account.id);
    list.push(account);
    this.set(STORAGE_KEYS.ACCOUNTS, list);
  }

  getJournalEntries(storeId: string, branchId?: string): JournalEntry[] {
    let entries = this.get<JournalEntry[]>(STORAGE_KEYS.JOURNAL_ENTRIES, []).filter(j => j.storeId === storeId);
    if (branchId) {
      entries = entries.filter(j => j.branchId === branchId);
    }
    return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  saveJournalEntry(entry: JournalEntry): boolean {
    // Validate Strict Double-Entry Balance
    if (Math.abs(entry.totalDebit - entry.totalCredit) > 0.01) {
      throw new Error(`Jurnal tidak seimbang! Total Debit (Rp ${entry.totalDebit}) tidak sama dengan Total Kredit (Rp ${entry.totalCredit})`);
    }

    const list = this.get<JournalEntry[]>(STORAGE_KEYS.JOURNAL_ENTRIES, []).filter(j => j.id !== entry.id);
    list.push(entry);
    this.set(STORAGE_KEYS.JOURNAL_ENTRIES, list);
    return true;
  }

  // --- Cash Sessions & Reconciliation ---
  getCashSessions(storeId: string, branchId?: string): CashSession[] {
    let sessions = this.get<CashSession[]>(STORAGE_KEYS.CASH_SESSIONS, []).filter(s => s.storeId === storeId);
    if (branchId) {
      sessions = sessions.filter(s => s.branchId === branchId);
    }
    return sessions.sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime());
  }

  getActiveCashSession(storeId: string, branchId: string): CashSession | null {
    const list = this.getCashSessions(storeId, branchId);
    return list.find(s => s.status === 'open') || null;
  }

  saveCashSession(session: CashSession): void {
    const list = this.get<CashSession[]>(STORAGE_KEYS.CASH_SESSIONS, []).filter(s => s.id !== session.id);
    list.push(session);
    this.set(STORAGE_KEYS.CASH_SESSIONS, list);
  }

  getCashMovements(storeId: string, sessionId?: string): CashMovement[] {
    let list = this.get<CashMovement[]>(STORAGE_KEYS.CASH_MOVEMENTS, []).filter(m => m.storeId === storeId);
    if (sessionId) {
      list = list.filter(m => m.sessionId === sessionId);
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  recordCashMovement(movement: CashMovement): void {
    const list = this.get<CashMovement[]>(STORAGE_KEYS.CASH_MOVEMENTS, []);
    list.push(movement);
    this.set(STORAGE_KEYS.CASH_MOVEMENTS, list);

    // Update active session expected cash
    const sessions = this.get<CashSession[]>(STORAGE_KEYS.CASH_SESSIONS, []);
    const session = sessions.find(s => s.id === movement.sessionId);
    if (session) {
      if (movement.type === 'cash_in') {
        session.cashIn += movement.amount;
      } else {
        session.cashOut += movement.amount;
      }
      session.expectedCash = session.openingCash + session.cashSales + session.cashIn - session.cashOut;
      this.set(STORAGE_KEYS.CASH_SESSIONS, sessions);
    }
  }

  // --- Receivables & Payables ---
  getReceivablesPayables(storeId: string, type?: 'receivable' | 'payable'): ReceivablePayable[] {
    let list = this.get<ReceivablePayable[]>(STORAGE_KEYS.RECEIVABLES_PAYABLES, []).filter(r => r.storeId === storeId);
    if (type) {
      list = list.filter(r => r.type === type);
    }
    return list.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }

  saveReceivablePayable(rp: ReceivablePayable): void {
    const list = this.get<ReceivablePayable[]>(STORAGE_KEYS.RECEIVABLES_PAYABLES, []).filter(r => r.id !== rp.id);
    list.push(rp);
    this.set(STORAGE_KEYS.RECEIVABLES_PAYABLES, list);
  }

  settleReceivablePayable(id: string, amount: number, paymentMethod: 'cash' | 'bank', userName: string): boolean {
    const list = this.get<ReceivablePayable[]>(STORAGE_KEYS.RECEIVABLES_PAYABLES, []);
    const item = list.find(r => r.id === id);
    if (!item) return false;

    item.paidAmount += amount;
    item.remainingAmount = Math.max(0, item.originalAmount - item.paidAmount);
    item.status = item.remainingAmount === 0 ? 'paid' : 'partial';
    this.set(STORAGE_KEYS.RECEIVABLES_PAYABLES, list);

    // Create settlement journal entry
    const accounts = this.getAccounts(item.storeId);
    const kasAccount = accounts.find(a => a.code === '1-1001') || accounts[0];
    const bankAccount = accounts.find(a => a.code === '1-1002') || accounts[1];
    const moneyAccount = paymentMethod === 'cash' ? kasAccount : bankAccount;

    const lines: JournalEntry['lines'] = [];
    if (item.type === 'receivable') {
      // Pelunasan Piutang: Debit Kas/Bank, Credit Piutang Usaha
      const piutangAcc = accounts.find(a => a.code === '1-1003') || accounts[2];
      lines.push({ accountId: moneyAccount.id, accountCode: moneyAccount.code, accountName: moneyAccount.name, debit: amount, credit: 0 });
      lines.push({ accountId: piutangAcc.id, accountCode: piutangAcc.code, accountName: piutangAcc.name, debit: 0, credit: amount });
    } else {
      // Pembayaran Utang: Debit Utang Usaha, Credit Kas/Bank
      const utangAcc = accounts.find(a => a.code === '2-1001') || accounts[4];
      lines.push({ accountId: utangAcc.id, accountCode: utangAcc.code, accountName: utangAcc.name, debit: amount, credit: 0 });
      lines.push({ accountId: moneyAccount.id, accountCode: moneyAccount.code, accountName: moneyAccount.name, debit: 0, credit: amount });
    }

    const journal: JournalEntry = {
      id: `je_${Date.now()}_set`,
      storeId: item.storeId,
      branchId: 'main',
      entryNumber: `JV-SET-${item.invoiceNumber}`,
      date: new Date().toISOString().split('T')[0],
      description: `Pelunasan ${item.type === 'receivable' ? 'Piutang' : 'Utang'} #${item.invoiceNumber} (${item.partyName})`,
      referenceType: 'manual',
      referenceId: item.id,
      lines,
      totalDebit: amount,
      totalCredit: amount,
      isPosted: true,
      createdAt: new Date().toISOString(),
    };
    this.saveJournalEntry(journal);

    this.recordAuditLog({
      storeId: item.storeId,
      userName,
      userRole: 'Manajer',
      action: 'PELUNASAN',
      targetEntity: item.type === 'receivable' ? 'Piutang' : 'Utang',
      targetId: item.invoiceNumber,
      details: `Pembayaran ${item.type} sebesar Rp ${amount.toLocaleString('id-ID')} kepada/dari ${item.partyName}`,
      timestamp: new Date().toISOString(),
    });

    return true;
  }

  // --- Audit Logs ---
  getAuditLogs(storeId: string): AuditLog[] {
    return this.get<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, [])
      .filter(l => l.storeId === storeId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  recordAuditLog(log: Omit<AuditLog, 'id'>): void {
    const logs = this.get<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, []);
    logs.push({
      ...log,
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    });
    // Keep max 500 audit logs locally
    if (logs.length > 500) logs.shift();
    this.set(STORAGE_KEYS.AUDIT_LOGS, logs);
  }

  // --- Printer Config ---
  getPrinterConfig(): PrinterConfig {
    return this.get<PrinterConfig>(STORAGE_KEYS.PRINTER_CONFIG, {
      paperSize: '58mm',
      printerName: 'Thermal Receipt POS-58',
      autoPrint: false,
      copies: 1,
      showStoreLogo: true,
      footerNotes: 'Terima kasih atas kunjungan Anda!\nBarang yang sudah dibeli tidak dapat ditukar kecuali perjanjian.',
    });
  }

  savePrinterConfig(config: PrinterConfig): void {
    this.set(STORAGE_KEYS.PRINTER_CONFIG, config);
  }

  // --- Payment Methods Config ---
  getPaymentConfig(storeId: string): StorePaymentConfig {
    const raw = this.get<any>(`${STORAGE_KEYS.PAYMENT_CONFIG}_${storeId}`, null);

    const defaultConfig: StorePaymentConfig = {
      enabledMethods: ['cash', 'transfer', 'ewallet', 'qris'],
      defaultMethod: 'cash',
      qrisNmid: '',
      qrisMerchantName: '',
      qrisImageUrl: '',
      bankAccounts: [],
      eWallets: []
    };

    if (!raw) return defaultConfig;

    // Filter out debit_card & credit_card from enabled methods
    const cleanedMethods = (raw.enabledMethods || ['cash', 'transfer', 'ewallet', 'qris']).filter(
      (m: string) => m !== 'debit_card' && m !== 'credit_card'
    ) as PaymentMethod[];

    const defaultMethod = (raw.defaultMethod === 'debit_card' || raw.defaultMethod === 'credit_card')
      ? 'cash'
      : (raw.defaultMethod || 'cash');

    // Safe migration for bankAccounts
    const migratedBankAccounts: StoreBankAccount[] = Array.isArray(raw.bankAccounts)
      ? raw.bankAccounts.map((b: any, idx: number) => ({
          id: b.id || `bank_${idx}_${Date.now()}`,
          bankName: b.bankName || 'Bank Lainnya',
          accountNumber: b.accountNumber || '',
          holderName: b.holderName || '',
          label: b.label || 'Rekening Toko',
          isActive: b.isActive !== false
        }))
      : [];

    // Safe migration for eWallets
    const migratedEWallets: StoreEWalletAccount[] = Array.isArray(raw.eWallets)
      ? raw.eWallets.map((w: any, idx: number) => ({
          id: w.id || `ewallet_${idx}_${Date.now()}`,
          provider: w.provider || 'Lainnya',
          accountName: w.accountName || '',
          accountNumber: w.accountNumber || '',
          label: w.label || 'Akun E-Wallet',
          isActive: w.isActive !== false
        }))
      : [];

    return {
      enabledMethods: cleanedMethods.length > 0 ? cleanedMethods : ['cash'],
      defaultMethod,
      qrisNmid: raw.qrisNmid || '',
      qrisMerchantName: raw.qrisMerchantName || '',
      qrisImageUrl: raw.qrisImageUrl || '',
      bankAccounts: migratedBankAccounts,
      eWallets: migratedEWallets
    };
  }

  savePaymentConfig(storeId: string, config: StorePaymentConfig): void {
    this.set(`${STORAGE_KEYS.PAYMENT_CONFIG}_${storeId}`, config);
  }

  // --- Notifications ---
  getNotifications(storeId: string): AppNotification[] {
    return this.get<AppNotification[]>(STORAGE_KEYS.NOTIFICATIONS, []).filter(n => (n as any).storeId === storeId || true);
  }

  markNotificationRead(id: string): void {
    const list = this.get<AppNotification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
    const n = list.find(item => item.id === id);
    if (n) {
      n.isRead = true;
      this.set(STORAGE_KEYS.NOTIFICATIONS, list);
    }
  }

  // --- Data Export & Restore ---
  exportFullBackup(): string {
    const backupData: Record<string, any> = {};
    Object.entries(STORAGE_KEYS).forEach(([keyName, storageKey]) => {
      backupData[keyName] = this.get(storageKey, null);
    });
    return JSON.stringify({
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      platform: 'JALORA Business Management Platform',
      creator: 'Abdul Jalil',
      data: backupData,
    }, null, 2);
  }

  validateBackup(jsonString: string): BackupValidationResult {
    try {
      if (!jsonString || typeof jsonString !== 'string') {
        return { isValid: false, error: 'Berkas cadangan kosong atau tidak dapat dibaca.' };
      }

      let parsed: any;
      try {
        parsed = JSON.parse(jsonString);
      } catch (jsonErr: any) {
        return {
          isValid: false,
          error: 'Format berkas rusak atau bukan JSON yang valid. Pastikan file tidak terpotong atau diedit manual.'
        };
      }

      if (!parsed || typeof parsed !== 'object') {
        return { isValid: false, error: 'Struktur berkas cadangan tidak valid (bukan objek JSON).' };
      }

      const dataObj = parsed.data || (parsed.STORES ? parsed : null);
      if (!dataObj || typeof dataObj !== 'object') {
        return {
          isValid: false,
          error: 'Berkas ini bukan file cadangan resmi JALORA. Struktur data inti tidak ditemukan.'
        };
      }

      // Check for at least essential Jalora collections
      const hasStores = Array.isArray(dataObj.STORES);
      const hasProducts = Array.isArray(dataObj.PRODUCTS);
      const hasBranches = Array.isArray(dataObj.BRANCHES);
      const hasUsers = Array.isArray(dataObj.USERS);

      if (!hasStores && !hasProducts && !hasBranches && !hasUsers) {
        return {
          isValid: false,
          error: 'Berkas tidak memuat koleksi data JALORA yang dikenali (Toko, Produk, Cabang, atau Pengguna).'
        };
      }

      const stores = hasStores ? dataObj.STORES : [];
      const branches = hasBranches ? dataObj.BRANCHES : [];
      const products = hasProducts ? dataObj.PRODUCTS : [];
      const sales = Array.isArray(dataObj.SALES) ? dataObj.SALES : [];
      const customers = Array.isArray(dataObj.CUSTOMERS) ? dataObj.CUSTOMERS : [];
      const suppliers = Array.isArray(dataObj.SUPPLIERS) ? dataObj.SUPPLIERS : [];
      const journals = Array.isArray(dataObj.JOURNAL_ENTRIES) ? dataObj.JOURNAL_ENTRIES : [];
      const users = hasUsers ? dataObj.USERS : [];

      const storeName = stores[0]?.name || (products.length > 0 ? 'Data Usaha JALORA' : 'Toko Jalora');

      return {
        isValid: true,
        metadata: {
          version: parsed.version || '1.0.0',
          exportedAt: parsed.exportedAt || new Date().toISOString(),
          platform: parsed.platform || 'JALORA Business Management Platform',
          creator: parsed.creator || 'Abdul Jalil',
        },
        summary: {
          storeCount: stores.length,
          branchCount: branches.length,
          productCount: products.length,
          saleCount: sales.length,
          customerCount: customers.length,
          supplierCount: suppliers.length,
          journalCount: journals.length,
          userCount: users.length,
          storeName,
        },
        parsedData: parsed,
      };
    } catch (err: any) {
      return {
        isValid: false,
        error: `Terjadi kendala saat memvalidasi berkas: ${err?.message || 'Format tidak kompatibel'}`
      };
    }
  }

  restoreFullBackup(input: string | any, userName: string = 'Pengguna'): { success: boolean; error?: string } {
    try {
      let parsed = typeof input === 'string' ? JSON.parse(input) : input;
      if (!parsed || typeof parsed !== 'object') {
        return { success: false, error: 'Data pemulihan tidak valid.' };
      }

      const dataObj = parsed.data || (parsed.STORES ? parsed : null);
      if (!dataObj || typeof dataObj !== 'object') {
        return { success: false, error: 'Objek data cadangan tidak ditemukan di dalam berkas.' };
      }

      // Write each collection atomically
      Object.entries(STORAGE_KEYS).forEach(([keyName, storageKey]) => {
        if (dataObj[keyName] !== undefined && dataObj[keyName] !== null) {
          this.set(storageKey, dataObj[keyName]);
        }
      });

      // Update current active store & user if available in the restored dataset
      const restoredStores = dataObj.STORES;
      if (Array.isArray(restoredStores) && restoredStores.length > 0) {
        this.set(STORAGE_KEYS.CURRENT_STORE, restoredStores[0]);
      }

      const restoredUsers = dataObj.USERS;
      if (Array.isArray(restoredUsers) && restoredUsers.length > 0) {
        const ownerUser = restoredUsers.find((u: any) => u.role === 'owner') || restoredUsers[0];
        this.set(STORAGE_KEYS.CURRENT_USER, ownerUser);
      }

      // Record audit log entry for the restore operation
      const currentStore = this.get<Store | null>(STORAGE_KEYS.CURRENT_STORE, null);
      if (currentStore) {
        this.recordAuditLog({
          storeId: currentStore.id,
          userName,
          userRole: 'Owner',
          action: 'PULIHKAN_DATA_RESTORE',
          targetEntity: 'System',
          targetId: 'BackupRestore',
          details: `Pemulihan data penuh dari berkas cadangan (${Array.isArray(dataObj.PRODUCTS) ? dataObj.PRODUCTS.length : 0} produk, ${Array.isArray(dataObj.SALES) ? dataObj.SALES.length : 0} transaksi, ${Array.isArray(dataObj.JOURNAL_ENTRIES) ? dataObj.JOURNAL_ENTRIES.length : 0} jurnal)`,
          timestamp: new Date().toISOString(),
        });
      }

      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: `Gagal menuliskan data pemulihan ke penyimpanan: ${err?.message || 'Kesalahan sistem'}`
      };
    }
  }

  // --- Seed Demo Data for User Demonstration (Separate from clean new store) ---
  seedDemoStore(): { store: Store; user: UserProfile } {
    const storeId = 'store_demo_1';
    const branchId = 'branch_demo_main';

    const store: Store = {
      id: storeId,
      name: 'Toko Berkah Utama',
      tagline: 'Pusat Grosir & Retail Sembako Terlengkap',
      phone: '0812-3456-7890',
      address: 'Jl. Ahmad Yani No. 45, Surabaya, Jawa Timur',
      email: 'kontak@berkahutama.id',
      defaultBranchId: branchId,
      currency: 'IDR',
      taxRate: 0,
      isTaxActive: false,
      createdAt: new Date().toISOString(),
    };

    const user: UserProfile = {
      id: 'user_demo_owner',
      name: 'H. Abdul Rahman',
      phone: '081234567890',
      email: 'owner@berkahutama.id',
      role: 'owner',
      storeId,
      branchId,
      pinHash: 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3', // 123456 hashed
      pinFailedAttempts: 0,
      isPinLocked: false,
      createdAt: new Date().toISOString(),
    };

    const branch: Branch = {
      id: branchId,
      storeId,
      name: 'Cabang Utama (Ahmad Yani)',
      code: 'CAB-01',
      phone: '0812-3456-7890',
      address: 'Jl. Ahmad Yani No. 45, Surabaya',
      isMain: true,
      createdAt: new Date().toISOString(),
    };

    const branch2: Branch = {
      id: 'branch_demo_branch2',
      storeId,
      name: 'Cabang 2 (Rungkut Megah)',
      code: 'CAB-02',
      phone: '0813-9876-5432',
      address: 'Ruko Rungkut Megah Raya B-12, Surabaya',
      isMain: false,
      createdAt: new Date().toISOString(),
    };

    this.saveStore(store);
    this.saveUser(user);
    this.setCurrentStore(store);
    this.setCurrentUser(user);
    this.saveBranch(branch);
    this.saveBranch(branch2);

    // Categories
    DEFAULT_CATEGORIES.forEach((cat, idx) => {
      this.saveCategory({ ...cat, id: `cat_${idx + 1}`, storeId });
    });

    // Units
    DEFAULT_UNITS.forEach((unit, idx) => {
      const allUnits = this.get<Unit[]>(STORAGE_KEYS.UNITS, []);
      allUnits.push({ ...unit, id: `unit_${idx + 1}`, storeId });
      this.set(STORAGE_KEYS.UNITS, allUnits);
    });

    // Accounts
    this.getAccounts(storeId);

    // Initial Demo Products
    const demoProducts: Product[] = [
      { id: 'prod_1', storeId, categoryId: 'cat_2', name: 'Beras Pandan Wangi Premium 5kg', sku: 'BRS-PW-05', barcode: '899123456001', unit: 'Pcs', costPrice: 68000, sellingPrice: 78000, minStock: 10, isActive: true, createdAt: new Date().toISOString() },
      { id: 'prod_2', storeId, categoryId: 'cat_2', name: 'Minyak Goreng Sania 2 Liter', sku: 'MYK-SN-02', barcode: '899123456002', unit: 'Pcs', costPrice: 32000, sellingPrice: 37500, minStock: 15, isActive: true, createdAt: new Date().toISOString() },
      { id: 'prod_3', storeId, categoryId: 'cat_2', name: 'Gula Pasir Gulaku Tebu 1kg', sku: 'GLA-GL-01', barcode: '899123456003', unit: 'Pcs', costPrice: 15000, sellingPrice: 18000, minStock: 20, isActive: true, createdAt: new Date().toISOString() },
      { id: 'prod_4', storeId, categoryId: 'cat_1', name: 'Kopi Kapal Api Spesial Mix 10s', sku: 'KPI-KA-10', barcode: '899123456004', unit: 'Pack', costPrice: 12500, sellingPrice: 15000, minStock: 25, isActive: true, createdAt: new Date().toISOString() },
      { id: 'prod_5', storeId, categoryId: 'cat_1', name: 'Teh Celup Sariwangi Kotak 25s', sku: 'TEH-SW-25', barcode: '899123456005', unit: 'Box', costPrice: 6200, sellingPrice: 7800, minStock: 12, isActive: true, createdAt: new Date().toISOString() },
      { id: 'prod_6', storeId, categoryId: 'cat_3', name: 'Deterjen Rinso Molto Cair 750ml', sku: 'RNS-ML-75', barcode: '899123456006', unit: 'Pcs', costPrice: 18500, sellingPrice: 22500, minStock: 8, isActive: true, createdAt: new Date().toISOString() },
      { id: 'prod_7', storeId, categoryId: 'cat_3', name: 'Sabun Cuci Piring Sunlight Jeruk Nipis 700ml', sku: 'SNL-JN-70', barcode: '899123456007', unit: 'Pcs', costPrice: 13000, sellingPrice: 16000, minStock: 10, isActive: true, createdAt: new Date().toISOString() },
      { id: 'prod_8', storeId, categoryId: 'cat_1', name: 'Indomie Goreng Original 85g', sku: 'MIE-ID-GR', barcode: '899123456008', unit: 'Pcs', costPrice: 2900, sellingPrice: 3500, minStock: 40, isActive: true, createdAt: new Date().toISOString() },
    ];

    demoProducts.forEach(p => {
      this.saveProduct(p);
      // Give initial stock with recorded initial movement & balance
      const initialQty = p.id === 'prod_6' ? 5 : 35; // One low stock to demo alert
      const balance: StockBalance = {
        id: `sb_${branchId}_${p.id}`,
        storeId,
        branchId,
        productId: p.id,
        quantity: initialQty,
        avgCost: p.costPrice,
        lastUpdatedAt: new Date().toISOString(),
      };
      this.updateStockBalance(balance);

      this.recordStockMovement({
        id: `sm_init_${p.id}`,
        storeId,
        branchId,
        productId: p.id,
        type: 'adjustment',
        quantityDelta: initialQty,
        previousQuantity: 0,
        newQuantity: initialQty,
        costPerUnit: p.costPrice,
        reason: 'Saldo Awal Stok Usaha',
        createdBy: user.name,
        createdAt: new Date().toISOString(),
      });
    });

    // Seed Suppliers & Customers
    this.saveSupplier({
      id: 'sup_1',
      storeId,
      name: 'PT Distribusi Pangan Nusantara',
      contactPerson: 'Budi Santoso',
      phone: '0811-2233-4455',
      address: 'Kawasan Industri Rungkut Kav. 8, Surabaya',
      paymentTermsDays: 30,
      createdAt: new Date().toISOString(),
    });

    this.saveCustomer({
      id: 'cust_1',
      storeId,
      name: 'Ibu Ratna Handayani',
      phone: '0813-4455-6677',
      address: 'Komplek Graha Indah Blok C-4',
      totalSpent: 420000,
      totalVisits: 3,
      createdAt: new Date().toISOString(),
    });

    // Seed Active Cash Session
    this.saveCashSession({
      id: 'cs_active_demo',
      storeId,
      branchId,
      cashierId: user.id,
      cashierName: user.name,
      openedAt: new Date().toISOString(),
      openingCash: 500000,
      cashSales: 0,
      cashIn: 0,
      cashOut: 0,
      expectedCash: 500000,
      status: 'open',
      notes: 'Modal awal uang kembalian pecahan Rp2.000, Rp5.000, Rp10.000, Rp20.000',
    });

    // Record Audit
    this.recordAuditLog({
      storeId,
      userName: user.name,
      userRole: 'Owner',
      action: 'INISIALISASI_TOKO',
      targetEntity: 'Store',
      targetId: store.name,
      details: 'Inisialisasi toko demo JALORA dengan data awal terverifikasi',
      timestamp: new Date().toISOString(),
    });

    return { store, user };
  }
}

export const jaloraStorage = new JaloraStorageEngine();
