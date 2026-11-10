/**
 * JALORA — Business Management Platform
 * Complete Type Definitions & Domain Models
 * Created by Abdul Jalil
 */

export type UserRole = 'owner' | 'manager' | 'cashier';

export interface UserProfile {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: UserRole;
  storeId: string;
  branchId: string;
  pinHash: string; // 6-digit transaction PIN
  pinFailedAttempts: number;
  isPinLocked: boolean;
  avatarUrl?: string;
  createdAt: string;
}

export interface Store {
  id: string;
  name: string;
  tagline?: string;
  phone: string;
  address: string;
  email?: string;
  logoUrl?: string;
  defaultBranchId: string;
  currency: string;
  taxRate: number; // e.g. 0.11 for PPN 11% or 0 for non-PKP
  isTaxActive: boolean;
  enabledPaymentMethods?: PaymentMethod[];
  defaultPaymentMethod?: PaymentMethod;
  createdAt: string;
}

export interface Branch {
  id: string;
  storeId: string;
  name: string;
  code: string;
  phone: string;
  address: string;
  isMain: boolean;
  createdAt: string;
}

export interface Category {
  id: string;
  storeId: string;
  name: string;
  description?: string;
}

export interface Unit {
  id: string;
  storeId: string;
  name: string; // e.g., Pcs, Box, Kg, Liter
  symbol: string;
}

export interface Product {
  id: string;
  storeId: string;
  categoryId: string;
  name: string;
  sku: string;
  barcode?: string;
  unit: string;
  costPrice: number; // Harga Beli (moving weighted average)
  sellingPrice: number; // Harga Jual
  minStock: number; // Minimum stock alert threshold
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
}

export interface StockBalance {
  id: string;
  storeId: string;
  branchId: string;
  productId: string;
  quantity: number;
  avgCost: number;
  lastUpdatedAt: string;
}

export type StockMovementType = 'purchase' | 'sale' | 'adjustment' | 'transfer' | 'return';

export interface StockMovement {
  id: string;
  storeId: string;
  branchId: string;
  productId: string;
  type: StockMovementType;
  quantityDelta: number;
  previousQuantity: number;
  newQuantity: number;
  costPerUnit: number;
  referenceId?: string;
  reason: string;
  createdBy: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  storeId: string;
  name: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  address: string;
  paymentTermsDays: number; // e.g. 0 for cash, 30 for tempo
  createdAt: string;
}

export interface Customer {
  id: string;
  storeId: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  totalSpent: number;
  totalVisits: number;
  createdAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  subtotal: number;
}

export type PaymentMethod = 'cash' | 'qris' | 'transfer' | 'debit_card' | 'credit_card' | 'ewallet';
export type SaleStatus = 'completed' | 'returned' | 'void';

export interface StoreBankAccount {
  id: string;
  bankName: string; // e.g. BSI, BCA, BRI, BNI, Mandiri, atau lainnya
  accountNumber: string;
  holderName: string;
  label?: string; // e.g. Rekening Utama, Rekening Cabang
  isActive: boolean;
}

export interface StoreEWalletAccount {
  id: string;
  provider: string; // e.g. GoPay, DANA, ShopeePay, OVO, Lainnya
  accountName: string;
  accountNumber: string; // nomor HP atau ID akun
  label?: string;
  isActive: boolean;
}

export interface StorePaymentConfig {
  enabledMethods: PaymentMethod[];
  defaultMethod: PaymentMethod;
  qrisNmid: string;
  qrisMerchantName: string;
  qrisImageUrl?: string;
  bankAccounts: StoreBankAccount[];
  eWallets: StoreEWalletAccount[];
}

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  costPrice: number;
  unitPrice: number;
  discountPercent: number;
  subtotal: number;
}

export interface Sale {
  id: string;
  storeId: string;
  branchId: string;
  invoiceNumber: string;
  cashierId: string;
  cashierName: string;
  customerId?: string;
  customerName?: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentReference?: string;
  amountTendered: number;
  changeAmount: number;
  status: SaleStatus;
  idempotencyKey: string;
  notes?: string;
  items: SaleItem[];
  createdAt: string;
}

export interface PurchaseItem {
  id: string;
  purchaseId: string;
  productId: string;
  productName: string;
  quantity: number;
  costPrice: number;
  subtotal: number;
}

export interface Purchase {
  id: string;
  storeId: string;
  branchId: string;
  invoiceNumber: string;
  supplierId: string;
  supplierName: string;
  totalAmount: number;
  paidAmount: number;
  paymentMethod: 'cash' | 'transfer' | 'credit';
  status: 'ordered' | 'received' | 'cancelled';
  notes?: string;
  items: PurchaseItem[];
  createdAt: string;
  receivedAt?: string;
}

export type AccountCategory = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
export type NormalBalance = 'debit' | 'credit';

export interface Account {
  id: string;
  storeId: string;
  code: string; // e.g. 1-1001
  name: string;
  category: AccountCategory;
  normalBalance: NormalBalance;
  description?: string;
  isSystem: boolean;
}

export interface JournalLine {
  accountId: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
}

export interface JournalEntry {
  id: string;
  storeId: string;
  branchId: string;
  entryNumber: string;
  date: string;
  description: string;
  referenceType?: 'sale' | 'purchase' | 'cash_session' | 'manual' | 'adjustment';
  referenceId?: string;
  lines: JournalLine[];
  totalDebit: number;
  totalCredit: number;
  isPosted: boolean;
  createdAt: string;
}

export interface CashSession {
  id: string;
  storeId: string;
  branchId: string;
  cashierId: string;
  cashierName: string;
  openedAt: string;
  closedAt?: string;
  openingCash: number;
  cashSales: number;
  cashIn: number;
  cashOut: number;
  expectedCash: number; // opening + sales + in - out
  actualCash?: number;
  discrepancy?: number; // actual - expected
  status: 'open' | 'closed';
  notes?: string;
}

export interface CashMovement {
  id: string;
  storeId: string;
  sessionId: string;
  type: 'cash_in' | 'cash_out';
  amount: number;
  reason: string;
  createdBy: string;
  createdAt: string;
}

export interface ReceivablePayable {
  id: string;
  storeId: string;
  type: 'receivable' | 'payable';
  partyId: string;
  partyName: string;
  invoiceNumber: string;
  originalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate: string;
  status: 'unpaid' | 'partial' | 'paid';
  createdAt: string;
}

export interface AuditLog {
  id: string;
  storeId: string;
  userName: string;
  userRole: string;
  action: string;
  targetEntity: string;
  targetId?: string;
  details: string;
  timestamp: string;
}

export interface PrinterConfig {
  paperSize: '58mm' | '80mm';
  printerName: string;
  autoPrint: boolean;
  copies: number;
  showStoreLogo: boolean;
  footerNotes: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'stock_low' | 'due_date' | 'sync' | 'security';
  isRead: boolean;
  createdAt: string;
}
