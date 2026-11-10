/**
 * JALORA — Settings, Multi-Branch, Printer, Supabase, Backup, and Creator Tribute
 * Created by Abdul Jalil
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Store as StoreIcon,
  Printer,
  ShieldCheck,
  Database,
  Download,
  Upload,
  RefreshCw,
  Copy,
  Check,
  Building,
  Plus,
  Trash2,
  FileText,
  Key,
  Info,
  CheckCircle2,
  Users,
  Star,
  Share2,
  MessageSquare,
  Image as ImageIcon,
  CreditCard,
  Bell,
  Volume2,
  VolumeX,
  Sliders,
  Smartphone,
  QrCode,
  Wallet,
  Edit2,
  AlertCircle,
  AlertTriangle,
  X
} from 'lucide-react';
import { Store, Branch, UserProfile, PrinterConfig, PaymentMethod, StoreBankAccount, StoreEWalletAccount } from '../../types';
import { hashPin, jaloraStorage, StorePaymentConfig, BackupValidationResult } from '../../services/storage';
import { soundService, SoundConfig } from '../../services/soundNotification';
import { formatIndonesianDateTime } from '../../utils/dateFormatter';
import {
  getSupabaseConfig,
  saveSupabaseConfig,
  testSupabaseConnection,
  runFullSupabaseDiagnostics,
  DiagnosticCheckItem,
  JALORA_SUPABASE_SQL_MIGRATION,
  JALORA_STORAGE_SQL_SNIPPET,
  uploadStoreLogo,
  deleteStoreLogo,
  SupabaseConfig
} from '../../services/supabase';
import { PWAInstallButton } from '../pwa/PWAInstallButton';

interface SettingsManagerProps {
  store: Store;
  branch: Branch;
  user: UserProfile;
  initialTab?: string;
  onRefreshData?: () => void;
  onSelectBranch: (branchId: string) => void;
}

export const SettingsManager: React.FC<SettingsManagerProps> = ({
  store,
  branch,
  user,
  initialTab = 'store',
  onRefreshData,
  onSelectBranch
}) => {
  const sanitizeTab = (tab?: string): 'store' | 'payments' | 'branches' | 'printer' | 'notifications' | 'users' | 'backup' | 'feedback' | 'share' | 'audit' | 'about' => {
    if (!tab || tab === 'supabase') return 'store';
    const allowed = ['store', 'payments', 'branches', 'printer', 'notifications', 'users', 'backup', 'feedback', 'share', 'audit', 'about'];
    return (allowed.includes(tab) ? tab : 'store') as any;
  };

  const [activeTab, setActiveTab] = useState<'store' | 'payments' | 'branches' | 'printer' | 'notifications' | 'users' | 'backup' | 'feedback' | 'share' | 'audit' | 'about'>(sanitizeTab(initialTab));

  // Backup & Restore State
  const [selectedRestoreFile, setSelectedRestoreFile] = useState<File | null>(null);
  const [restoreValidation, setRestoreValidation] = useState<BackupValidationResult | null>(null);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoreSuccessMsg, setRestoreSuccessMsg] = useState<string | null>(null);
  const [backupDownloadSuccessMsg, setBackupDownloadSuccessMsg] = useState<string | null>(null);
  const restoreFileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(sanitizeTab(initialTab));
    }
  }, [initialTab]);

  // Store Profile State
  const [storeName, setStoreName] = useState(store.name);
  const [storeTagline, setStoreTagline] = useState(store.tagline || '');
  const [storePhone, setStorePhone] = useState(store.phone);
  const [storeAddress, setStoreAddress] = useState(store.address);
  const [storeTaxActive, setStoreTaxActive] = useState(store.isTaxActive);
  const [storeTaxRate, setStoreTaxRate] = useState(store.taxRate * 100);
  const [storeLogoUrl, setStoreLogoUrl] = useState(store.logoUrl || '');
  const [storeSavedMessage, setStoreSavedMessage] = useState('');

  // Branch State
  const branches = useMemo(() => jaloraStorage.getBranches(store.id), [store.id]);
  const [showAddBranchModal, setShowAddBranchModal] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchCode, setNewBranchCode] = useState('');
  const [newBranchPhone, setNewBranchPhone] = useState('');
  const [newBranchAddress, setNewBranchAddress] = useState('');

  // Printer State
  const [printerConfig, setPrinterConfig] = useState<PrinterConfig>(() => jaloraStorage.getPrinterConfig());
  const [printerSavedMsg, setPrinterSavedMsg] = useState('');

  // Payment Methods State
  const [paymentConfig, setPaymentConfig] = useState<StorePaymentConfig>(() => jaloraStorage.getPaymentConfig(store.id));
  const [paymentSavedMsg, setPaymentSavedMsg] = useState('');
  const [qrisUploadError, setQrisUploadError] = useState('');

  // Sound Notification State
  const [soundConfig, setSoundConfig] = useState<SoundConfig>(() => soundService.getSoundConfig());
  const [soundSavedMessage, setSoundSavedMessage] = useState('');

  const handleUpdateSoundConfig = (updates: Partial<SoundConfig>) => {
    const updated = soundService.saveSoundConfig(updates);
    setSoundConfig(updated);
    setSoundSavedMessage('Preferensi suara & notifikasi transaksi berhasil disimpan.');
    setTimeout(() => setSoundSavedMessage(''), 2500);
  };

  // Unified Account Modal (Tambah / Edit Akun Bank & E-Wallet Toko — Zero Scroll)
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [accountModalMode, setAccountModalMode] = useState<'create' | 'edit'>('create');
  const [accountType, setAccountType] = useState<'bank' | 'ewallet'>('bank');
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [providerSelection, setProviderSelection] = useState<string>('Bank Syariah Indonesia (BSI)');
  const [customProviderName, setCustomProviderName] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [accountHolderName, setAccountHolderName] = useState<string>('');
  const [accountLabel, setAccountLabel] = useState<string>('Utama');
  const [accountIsActive, setAccountIsActive] = useState<boolean>(true);
  const [accountFormError, setAccountFormError] = useState<string>('');
  const accountNumberInputRef = useRef<HTMLInputElement>(null);

  // Mencegah scroll halaman di belakang saat popup terbuka (Scroll Lock)
  useEffect(() => {
    if (showAccountModal) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      // Auto-focus instan ke input nomor agar pengguna bisa langsung mengetik tanpa scroll
      const timer = setTimeout(() => {
        accountNumberInputRef.current?.focus();
      }, 60);
      return () => {
        document.body.style.overflow = originalOverflow;
        clearTimeout(timer);
      };
    }
  }, [showAccountModal]);

  // Handler membuka Modal Tambah / Edit Akun
  const handleOpenAccountModal = (type: 'bank' | 'ewallet' = 'bank', editItem?: StoreBankAccount | StoreEWalletAccount) => {
    setAccountFormError('');
    if (editItem) {
      setAccountModalMode('edit');
      setEditingAccountId(editItem.id);
      setAccountIsActive(editItem.isActive !== false);
      setAccountLabel(editItem.label || '');

      if ('bankName' in editItem) {
        setAccountType('bank');
        const b = editItem as StoreBankAccount;
        setAccountNumber(b.accountNumber);
        setAccountHolderName(b.holderName);
        const standardBanks = ['Bank Syariah Indonesia (BSI)', 'BCA', 'BRI', 'BNI', 'Mandiri'];
        if (standardBanks.includes(b.bankName)) {
          setProviderSelection(b.bankName);
          setCustomProviderName('');
        } else {
          setProviderSelection('Lainnya');
          setCustomProviderName(b.bankName);
        }
      } else {
        setAccountType('ewallet');
        const w = editItem as StoreEWalletAccount;
        setAccountNumber(w.accountNumber);
        setAccountHolderName(w.accountName);
        const standardEWallets = ['GoPay', 'DANA', 'ShopeePay', 'OVO'];
        if (standardEWallets.includes(w.provider)) {
          setProviderSelection(w.provider);
          setCustomProviderName('');
        } else {
          setProviderSelection('Lainnya');
          setCustomProviderName(w.provider);
        }
      }
    } else {
      setAccountModalMode('create');
      setEditingAccountId(null);
      setAccountType(type);
      setAccountNumber('');
      setAccountHolderName('');
      setAccountLabel('Utama');
      setAccountIsActive(true);
      setCustomProviderName('');
      if (type === 'bank') {
        setProviderSelection('Bank Syariah Indonesia (BSI)');
      } else {
        setProviderSelection('GoPay');
      }
    }
    setShowAccountModal(true);
  };

  // Handler dropdown penyedia
  const handleProviderSelectChange = (val: string) => {
    setProviderSelection(val);
    setAccountFormError('');
    if (['Bank Syariah Indonesia (BSI)', 'BCA', 'BRI', 'BNI', 'Mandiri'].includes(val)) {
      setAccountType('bank');
    } else if (['GoPay', 'DANA', 'ShopeePay', 'OVO'].includes(val)) {
      setAccountType('ewallet');
    }
  };

  // Handler Simpan Akun (Validasi & Atomic Storage)
  const handleSaveAccountForm = (e: React.FormEvent) => {
    e.preventDefault();
    setAccountFormError('');

    let finalProvider = providerSelection;
    if (providerSelection === 'Lainnya') {
      finalProvider = customProviderName.trim();
    }
    if (!finalProvider) {
      setAccountFormError('Nama bank atau penyedia e-wallet harus diisi.');
      return;
    }

    if (!accountNumber.trim()) {
      setAccountFormError(accountType === 'bank' ? 'Nomor rekening harus diisi.' : 'Nomor HP atau ID akun harus diisi.');
      return;
    }

    if (!accountHolderName.trim()) {
      setAccountFormError(accountType === 'bank' ? 'Nama pemilik rekening harus diisi.' : 'Nama pemilik akun harus diisi.');
      return;
    }

    if (accountType === 'bank') {
      const updatedBanks = editingAccountId
        ? (paymentConfig.bankAccounts || []).map(b => b.id === editingAccountId ? {
            ...b,
            bankName: finalProvider,
            accountNumber: accountNumber.trim(),
            holderName: accountHolderName.trim(),
            label: accountLabel.trim() || 'Rekening Toko',
            isActive: accountIsActive
          } : b)
        : [
            ...(paymentConfig.bankAccounts || []),
            {
              id: `bank_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              bankName: finalProvider,
              accountNumber: accountNumber.trim(),
              holderName: accountHolderName.trim(),
              label: accountLabel.trim() || 'Rekening Toko',
              isActive: accountIsActive
            }
          ];

      const updatedConfig: StorePaymentConfig = { ...paymentConfig, bankAccounts: updatedBanks };
      setPaymentConfig(updatedConfig);
      jaloraStorage.savePaymentConfig(store.id, updatedConfig);
      setShowAccountModal(false);
      setPaymentSavedMsg(editingAccountId ? 'Rekening bank berhasil diperbarui!' : 'Rekening bank baru berhasil ditambahkan!');
      setTimeout(() => setPaymentSavedMsg(''), 3000);
    } else {
      const updatedEWallets = editingAccountId
        ? (paymentConfig.eWallets || []).map(w => w.id === editingAccountId ? {
            ...w,
            provider: finalProvider,
            accountName: accountHolderName.trim(),
            accountNumber: accountNumber.trim(),
            label: accountLabel.trim() || 'Akun E-Wallet',
            isActive: accountIsActive
          } : w)
        : [
            ...(paymentConfig.eWallets || []),
            {
              id: `ewallet_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              provider: finalProvider,
              accountName: accountHolderName.trim(),
              accountNumber: accountNumber.trim(),
              label: accountLabel.trim() || 'Akun E-Wallet',
              isActive: accountIsActive
            }
          ];

      const updatedConfig: StorePaymentConfig = { ...paymentConfig, eWallets: updatedEWallets };
      setPaymentConfig(updatedConfig);
      jaloraStorage.savePaymentConfig(store.id, updatedConfig);
      setShowAccountModal(false);
      setPaymentSavedMsg(editingAccountId ? 'Akun e-wallet berhasil diperbarui!' : 'Akun e-wallet baru berhasil ditambahkan!');
      setTimeout(() => setPaymentSavedMsg(''), 3000);
    }
  };

  // Backward-compatible open helpers for bank & ewallet
  const handleOpenBankModal = (bank?: StoreBankAccount) => handleOpenAccountModal('bank', bank);
  const handleOpenEWalletModal = (ewallet?: StoreEWalletAccount) => handleOpenAccountModal('ewallet', ewallet);

  const handleToggleBankActive = (id: string) => {
    const updatedBanks = (paymentConfig.bankAccounts || []).map(b =>
      b.id === id ? { ...b, isActive: !b.isActive } : b
    );
    const updatedConfig: StorePaymentConfig = { ...paymentConfig, bankAccounts: updatedBanks };
    setPaymentConfig(updatedConfig);
    jaloraStorage.savePaymentConfig(store.id, updatedConfig);
  };

  const handleDeleteBank = (id: string) => {
    if (!confirm('Hapus rekening bank ini dari konfigurasi pembayaran toko?')) return;
    const updatedBanks = (paymentConfig.bankAccounts || []).filter(b => b.id !== id);
    const updatedConfig: StorePaymentConfig = { ...paymentConfig, bankAccounts: updatedBanks };
    setPaymentConfig(updatedConfig);
    jaloraStorage.savePaymentConfig(store.id, updatedConfig);
    setPaymentSavedMsg('Rekening bank berhasil dihapus.');
    setTimeout(() => setPaymentSavedMsg(''), 2500);
  };

  const handleDeleteEWallet = (id: string) => {
    if (!confirm('Hapus akun e-wallet ini dari konfigurasi pembayaran toko?')) return;
    const updatedEWallets = (paymentConfig.eWallets || []).filter(w => w.id !== id);
    const updatedConfig: StorePaymentConfig = { ...paymentConfig, eWallets: updatedEWallets };
    setPaymentConfig(updatedConfig);
    jaloraStorage.savePaymentConfig(store.id, updatedConfig);
    setPaymentSavedMsg('Akun e-wallet berhasil dihapus.');
    setTimeout(() => setPaymentSavedMsg(''), 2500);
  };

  const handleToggleEWalletActive = (id: string) => {
    const updatedEWallets = (paymentConfig.eWallets || []).map(w => w.id === id ? { ...w, isActive: !w.isActive } : w);
    const updatedConfig: StorePaymentConfig = { ...paymentConfig, eWallets: updatedEWallets };
    setPaymentConfig(updatedConfig);
    jaloraStorage.savePaymentConfig(store.id, updatedConfig);
  };

  // QRIS File Upload Handler
  const handleQrisImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setQrisUploadError('Format file tidak didukung. Harap pilih gambar PNG, JPG, atau WEBP.');
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      setQrisUploadError('Ukuran gambar terlalu besar (maksimal 3MB).');
      return;
    }

    setQrisUploadError('');
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const updatedConfig: StorePaymentConfig = { ...paymentConfig, qrisImageUrl: result };
      setPaymentConfig(updatedConfig);
      jaloraStorage.savePaymentConfig(store.id, updatedConfig);
      setPaymentSavedMsg('Foto kode QRIS toko berhasil diunggah dan disimpan!');
      setTimeout(() => setPaymentSavedMsg(''), 3000);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveQrisImage = () => {
    if (!confirm('Hapus gambar kode QRIS toko?')) return;
    const updatedConfig: StorePaymentConfig = { ...paymentConfig, qrisImageUrl: '' };
    setPaymentConfig(updatedConfig);
    jaloraStorage.savePaymentConfig(store.id, updatedConfig);
    setPaymentSavedMsg('Gambar QRIS telah dihapus.');
    setTimeout(() => setPaymentSavedMsg(''), 2500);
  };

  const handleSavePaymentConfig = (e: React.FormEvent) => {
    e.preventDefault();
    jaloraStorage.savePaymentConfig(store.id, paymentConfig);
    setPaymentSavedMsg('Pengaturan metode pembayaran kasir berhasil disimpan!');
    setTimeout(() => setPaymentSavedMsg(''), 3000);
  };

  // Supabase State
  const [supabaseConfig, setSupabaseState] = useState<SupabaseConfig>(() => getSupabaseConfig());
  const [testingSupabase, setTestingSupabase] = useState(false);
  const [supabaseTestResult, setSupabaseTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [diagnosticsList, setDiagnosticsList] = useState<DiagnosticCheckItem[] | null>(null);
  const [sqlCopied, setSqlCopied] = useState(false);
  const [storageSqlCopied, setStorageSqlCopied] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState('');
  const [logoUploadSuccess, setLogoUploadSuccess] = useState('');

  // Users & Roles State
  const usersList = useMemo(() => jaloraStorage.getUsers().filter(u => u.storeId === store.id || true), [store.id]);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserRole, setNewUserRole] = useState<'manager' | 'cashier'>('cashier');
  const [newUserPin, setNewUserPin] = useState('123456');

  // Feedback & Rating State
  const [userRating, setUserRating] = useState<number>(5);
  const [feedbackCategory, setFeedbackCategory] = useState<'saran' | 'kendala' | 'pertanyaan'>('saran');
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackSentMessage, setFeedbackSentMessage] = useState('');

  // Share Modal / State
  const [shareCopied, setShareCopied] = useState(false);

  // Audit Logs
  const auditLogs = useMemo(() => jaloraStorage.getAuditLogs(store.id), [store.id]);

  // Save Store Profile
  const handleSaveStoreProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: Store = {
      ...store,
      name: storeName.trim(),
      tagline: storeTagline.trim(),
      phone: storePhone.trim(),
      address: storeAddress.trim(),
      isTaxActive: storeTaxActive,
      taxRate: storeTaxActive ? storeTaxRate / 100 : 0,
      logoUrl: storeLogoUrl.trim() || undefined,
    };
    jaloraStorage.saveStore(updated);
    jaloraStorage.setCurrentStore(updated);

    jaloraStorage.recordAuditLog({
      storeId: store.id,
      userName: user.name,
      userRole: user.role,
      action: 'UPDATE_PROFIL_TOKO',
      targetEntity: 'Store',
      targetId: updated.name,
      details: `Memperbarui profil toko ${updated.name}`,
      timestamp: new Date().toISOString(),
    });

    setStoreSavedMessage('Profil toko berhasil disimpan!');
    setTimeout(() => setStoreSavedMessage(''), 3000);
    onRefreshData?.();
  };

  // Add Branch
  const handleAddBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim() || !newBranchCode.trim()) return;

    const newBranch: Branch = {
      id: `branch_${Date.now()}`,
      storeId: store.id,
      name: newBranchName.trim(),
      code: newBranchCode.trim().toUpperCase(),
      phone: newBranchPhone.trim(),
      address: newBranchAddress.trim(),
      isMain: false,
      createdAt: new Date().toISOString(),
    };

    jaloraStorage.saveBranch(newBranch);

    jaloraStorage.recordAuditLog({
      storeId: store.id,
      userName: user.name,
      userRole: user.role,
      action: 'TAMBAH_CABANG',
      targetEntity: 'Branch',
      targetId: newBranch.name,
      details: `Menambahkan cabang baru "${newBranch.name}" (Kode: ${newBranch.code})`,
      timestamp: new Date().toISOString(),
    });

    setNewBranchName('');
    setNewBranchCode('');
    setNewBranchPhone('');
    setNewBranchAddress('');
    setShowAddBranchModal(false);
    onRefreshData?.();
  };

  // Save Printer Config
  const handleSavePrinter = (e: React.FormEvent) => {
    e.preventDefault();
    jaloraStorage.savePrinterConfig(printerConfig);
    setPrinterSavedMsg('Pengaturan printer disimpan!');
    setTimeout(() => setPrinterSavedMsg(''), 3000);
  };

  const handleTestPrint = () => {
    window.print();
  };

  // Test Supabase Connection
  const handleTestSupabase = async () => {
    setTestingSupabase(true);
    setSupabaseTestResult(null);
    const result = await testSupabaseConnection(supabaseConfig.url, supabaseConfig.anonKey);
    setSupabaseTestResult(result);
    setTestingSupabase(false);

    if (result.success) {
      saveSupabaseConfig({
        ...supabaseConfig,
        isConnected: true,
        lastCheckedAt: new Date().toISOString(),
      });
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(JALORA_SUPABASE_SQL_MIGRATION);
    setSqlCopied(true);
    setTimeout(() => setSqlCopied(false), 3000);
  };

  const handleDownloadSql = () => {
    try {
      const blob = new Blob([JALORA_SUPABASE_SQL_MIGRATION], { type: 'text/sql' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '20261028_jalora_initial_schema.sql';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Gagal mengunduh file skrip SQL: ' + (err.message || 'Error'));
    }
  };

  const handleCopyStorageSql = () => {
    navigator.clipboard.writeText(JALORA_STORAGE_SQL_SNIPPET);
    setStorageSqlCopied(true);
    setTimeout(() => setStorageSqlCopied(false), 3000);
  };

  const handleDownloadStorageSql = () => {
    try {
      const blob = new Blob([JALORA_STORAGE_SQL_SNIPPET], { type: 'text/sql' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '20261028_jalora_storage_setup.sql';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Gagal mengunduh file skrip SQL Storage: ' + (err.message || 'Error'));
    }
  };

  const handleLogoFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);
    setLogoUploadError('');
    setLogoUploadSuccess('');

    try {
      const result = await uploadStoreLogo(file, store.id);
      if (result.success && result.url) {
        setStoreLogoUrl(result.url);

        const updatedStore: Store = { ...store, logoUrl: result.url };
        jaloraStorage.saveStore(updatedStore);
        jaloraStorage.setCurrentStore(updatedStore);

        jaloraStorage.recordAuditLog({
          storeId: store.id,
          userName: user.name,
          userRole: user.role,
          action: 'UNGGAH_LOGO_TOKO',
          targetEntity: 'Store',
          targetId: store.name,
          details: result.isCloud 
            ? 'Mengunggah logo toko ke Supabase Storage (bucket "logos")'
            : 'Menyimpan logo toko secara lokal (offline fallback)',
          timestamp: new Date().toISOString(),
        });

        setLogoUploadSuccess(result.isCloud 
          ? 'Logo toko berhasil diunggah dan terhubung ke Supabase Storage!'
          : 'Logo toko berhasil disimpan di penyimpanan lokal browser.');
        onRefreshData?.();
      } else {
        setLogoUploadError(result.error || 'Gagal mengunggah logo toko.');
      }
    } catch (err: any) {
      setLogoUploadError(err.message || 'Terjadi kendala saat membaca file gambar.');
    } finally {
      setIsUploadingLogo(false);
      e.target.value = '';
    }
  };

  const handleDeleteLogo = async () => {
    if (!storeLogoUrl) return;
    if (!confirm('Apakah Anda yakin ingin menghapus logo toko? (Data transaksi, kasir, dan produk tetap 100% aman).')) {
      return;
    }

    try {
      await deleteStoreLogo(store.id, storeLogoUrl);
      setStoreLogoUrl('');

      const updatedStore: Store = { ...store, logoUrl: undefined };
      jaloraStorage.saveStore(updatedStore);
      jaloraStorage.setCurrentStore(updatedStore);

      jaloraStorage.recordAuditLog({
        storeId: store.id,
        userName: user.name,
        userRole: user.role,
        action: 'HAPUS_LOGO_TOKO',
        targetEntity: 'Store',
        targetId: store.name,
        details: 'Menghapus logo toko tanpa memengaruhi data transaksi',
        timestamp: new Date().toISOString(),
      });

      setLogoUploadSuccess('Logo toko berhasil dihapus.');
      onRefreshData?.();
    } catch (err: any) {
      setLogoUploadError('Gagal menghapus file logo: ' + err.message);
    }
  };

  // Export & Restore Backup Handlers
  const handleDownloadBackup = () => {
    try {
      setRestoreError(null);
      const json = jaloraStorage.exportFullBackup();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `JALORA_BACKUP_${store.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setBackupDownloadSuccessMsg('File backup berhasil diunduh ke perangkat Anda.');
      setTimeout(() => setBackupDownloadSuccessMsg(null), 4000);
    } catch (err: any) {
      setRestoreError('Gagal mengunduh file backup: ' + (err.message || 'Error'));
    }
  };

  const handleTriggerRestoreFileSelect = () => {
    setRestoreError(null);
    if (restoreFileInputRef.current) {
      restoreFileInputRef.current.value = '';
      restoreFileInputRef.current.click();
    }
  };

  const handleRestoreFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedRestoreFile(file);
    setRestoreError(null);

    // Read and validate file content
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const validation = jaloraStorage.validateBackup(content);

        if (!validation.isValid) {
          setRestoreError(validation.error || 'Format berkas cadangan tidak valid atau rusak.');
          setSelectedRestoreFile(null);
          setRestoreValidation(null);
          return;
        }

        setRestoreValidation(validation);
        setShowRestoreModal(true);
      } catch (err: any) {
        setRestoreError(`Gagal membaca berkas: ${err?.message || 'Format tidak didukung'}`);
        setSelectedRestoreFile(null);
        setRestoreValidation(null);
      }
    };
    reader.onerror = () => {
      setRestoreError('Gagal membaca berkas dari perangkat Anda. Silakan coba kembali.');
      setSelectedRestoreFile(null);
      setRestoreValidation(null);
    };
    reader.readAsText(file);
  };

  const handleConfirmExecuteRestore = () => {
    if (!restoreValidation?.parsedData) return;
    setIsRestoring(true);
    setRestoreError(null);

    try {
      const result = jaloraStorage.restoreFullBackup(restoreValidation.parsedData, user.name);

      if (!result.success) {
        setRestoreError(result.error || 'Gagal memulihkan data.');
        setIsRestoring(false);
        return;
      }

      setShowRestoreModal(false);
      setRestoreSuccessMsg('Data berhasil dipulihkan.');

      // Refresh parent app state
      onRefreshData?.();

      // Smooth reload to apply all restored collections fresh
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err: any) {
      setRestoreError(`Terjadi kesalahan saat memulihkan data: ${err?.message || 'Gagal'}`);
      setIsRestoring(false);
    }
  };

  const handleCancelRestore = () => {
    setShowRestoreModal(false);
    setSelectedRestoreFile(null);
    setRestoreValidation(null);
    setRestoreError(null);
  };

  // Run 9-Point Supabase Diagnostics
  const handleRunFullDiagnostics = async () => {
    setTestingSupabase(true);
    const results = await runFullSupabaseDiagnostics(supabaseConfig.url, supabaseConfig.anonKey);
    setDiagnosticsList(results);
    setTestingSupabase(false);
  };

  // Add User / Role
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserPhone.trim()) return;

    const hashed = await hashPin(newUserPin);
    const newUser: UserProfile = {
      id: `user_${Date.now()}`,
      name: newUserName.trim(),
      phone: newUserPhone.trim(),
      role: newUserRole,
      storeId: store.id,
      branchId: branch.id,
      pinHash: hashed,
      pinFailedAttempts: 0,
      isPinLocked: false,
      createdAt: new Date().toISOString(),
    };

    jaloraStorage.saveUser(newUser);

    jaloraStorage.recordAuditLog({
      storeId: store.id,
      userName: user.name,
      userRole: user.role,
      action: 'TAMBAH_PENGGUNA',
      targetEntity: 'UserProfile',
      targetId: newUser.name,
      details: `Menambahkan staf "${newUser.name}" sebagai ${newUserRole.toUpperCase()}`,
      timestamp: new Date().toISOString(),
    });

    setNewUserName('');
    setNewUserPhone('');
    setNewUserPin('123456');
    setShowAddUserModal(false);
    onRefreshData?.();
  };

  // Submit Feedback & Rating
  const handleSubmitFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackComment.trim()) return;

    jaloraStorage.recordAuditLog({
      storeId: store.id,
      userName: user.name,
      userRole: user.role,
      action: 'KIRIM_MASUKAN',
      targetEntity: 'Feedback',
      targetId: feedbackCategory,
      details: `Rating: ${userRating} Bintang. Kategori: ${feedbackCategory}. Masukan: ${feedbackComment.trim()}`,
      timestamp: new Date().toISOString(),
    });

    setFeedbackSentMessage('Terima kasih atas masukan dan rating Anda! Masukan telah tercatat.');
    setFeedbackComment('');
    setTimeout(() => setFeedbackSentMessage(''), 4000);
  };

  // Share Application link
  const handleShareApp = () => {
    const shareUrl = window.location.origin;
    const text = `Gunakan *JALORA* — Platform Manajemen Bisnis Terpadu: POS × Finance × Inventory × Multi-Branch (Dibuat oleh Abdul Jalil). Akses di: ${shareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="p-3.5 sm:p-5 lg:p-8 space-y-4 sm:space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="pb-4 border-b border-[#DCE5D6]">
        <h2 className="text-xl sm:text-2xl font-bold text-[#294D35]">Pengaturan & Manajemen Sistem</h2>
        <p className="text-xs text-stone-500 mt-1">
          Profil Usaha · Multi-Cabang · Printer Struk · Supabase Cloud · Audit & Keamanan
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 text-xs overflow-x-auto no-scrollbar pb-1">
        <button
          onClick={() => setActiveTab('store')}
          className={`pb-2.5 px-3 font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'store' ? 'border-b-2 border-[#4F7655] text-[#294D35]' : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          <StoreIcon className="w-4 h-4" />
          <span>Profil Toko</span>
        </button>

        <button
          onClick={() => setActiveTab('payments')}
          className={`pb-2.5 px-3 font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'payments' ? 'border-b-2 border-[#4F7655] text-[#294D35]' : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Metode Pembayaran</span>
        </button>

        <button
          onClick={() => setActiveTab('branches')}
          className={`pb-2.5 px-3 font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'branches' ? 'border-b-2 border-[#4F7655] text-[#294D35]' : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Cabang ({branches.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('printer')}
          className={`pb-2.5 px-3 font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'printer' ? 'border-b-2 border-[#4F7655] text-[#294D35]' : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          <Printer className="w-4 h-4" />
          <span>Printer &amp; Struk</span>
        </button>

        <button
          onClick={() => setActiveTab('notifications')}
          className={`pb-2.5 px-3 font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'notifications' ? 'border-b-2 border-[#4F7655] text-[#294D35]' : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Notifikasi &amp; Suara</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`pb-2.5 px-3 font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'users' ? 'border-b-2 border-[#4F7655] text-[#294D35]' : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Pengguna & Peran</span>
        </button>

        <button
          onClick={() => setActiveTab('backup')}
          className={`pb-2.5 px-3 font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'backup' ? 'border-b-2 border-[#4F7655] text-[#294D35]' : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Backup &amp; Pulihkan</span>
        </button>

        <button
          onClick={() => setActiveTab('feedback')}
          className={`pb-2.5 px-3 font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'feedback' ? 'border-b-2 border-[#4F7655] text-[#294D35]' : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          <Star className="w-4 h-4" />
          <span>Masukan & Rating</span>
        </button>

        <button
          onClick={() => setActiveTab('share')}
          className={`pb-2.5 px-3 font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'share' ? 'border-b-2 border-[#4F7655] text-[#294D35]' : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          <Share2 className="w-4 h-4" />
          <span>Bagikan Aplikasi</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-2.5 px-3 font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'audit' ? 'border-b-2 border-[#4F7655] text-[#294D35]' : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Audit Log ({auditLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('about')}
          className={`pb-2.5 px-3 font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'about' ? 'border-b-2 border-[#4F7655] text-[#294D35]' : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          <Info className="w-4 h-4" />
          <span>Tentang JALORA</span>
        </button>
      </div>

      {/* Store Profile Tab */}
      {activeTab === 'store' && (
        <div className="bg-white rounded-2xl border border-[#DCE5D6] p-6 lg:p-8 max-w-2xl shadow-xs space-y-6">
          {/* PWA App Installation Card */}
          <PWAInstallButton variant="settings" />

          <div>
            <h3 className="font-bold text-base text-[#294D35] mb-1">Informasi Usaha & Toko</h3>
            <p className="text-xs text-stone-500">Informasi ini akan dicetak pada kepala struk kasir dan laporan resmi.</p>
          </div>

          {storeSavedMessage && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>{storeSavedMessage}</span>
            </div>
          )}

          <form onSubmit={handleSaveStoreProfile} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Nama Toko *</label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:border-[#4F7655]"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Tagline Toko</label>
              <input
                type="text"
                placeholder="Contoh: Pusat Grosir & Retail Terlengkap"
                value={storeTagline}
                onChange={(e) => setStoreTagline(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:border-[#4F7655]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Nomor Telepon / WhatsApp</label>
                <input
                  type="text"
                  value={storePhone}
                  onChange={(e) => setStorePhone(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm font-mono focus:outline-none focus:border-[#4F7655]"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Pajak Pertambahan Nilai (PPN)</label>
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="taxCheck"
                    checked={storeTaxActive}
                    onChange={(e) => setStoreTaxActive(e.target.checked)}
                    className="w-4 h-4 text-[#4F7655] rounded"
                  />
                  <label htmlFor="taxCheck" className="text-xs text-stone-700 font-medium">
                    Aktifkan PPN 11% di Kasir
                  </label>
                </div>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Alamat Lengkap Toko</label>
              <textarea
                rows={2}
                value={storeAddress}
                onChange={(e) => setStoreAddress(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:border-[#4F7655]"
              />
            </div>

            {/* Logo Toko: Supabase Storage & Offline Fallback */}
            <div className="pt-2 border-t border-stone-200">
              <label className="block font-semibold text-stone-700 mb-2">Logo Toko (Supabase Storage)</label>

              {logoUploadSuccess && (
                <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{logoUploadSuccess}</span>
                </div>
              )}

              {logoUploadError && (
                <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <Info className="w-4 h-4 shrink-0" />
                  <span>{logoUploadError}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl border border-stone-200 bg-stone-50/70">
                {/* Logo Preview */}
                <div className="w-20 h-20 rounded-xl bg-white border border-stone-300 shadow-2xs overflow-hidden flex items-center justify-center shrink-0">
                  {storeLogoUrl ? (
                    <img src={storeLogoUrl} alt="Logo Toko" className="w-full h-full object-contain p-1" />
                  ) : (
                    <div className="text-center p-2 text-stone-400">
                      <ImageIcon className="w-7 h-7 mx-auto mb-0.5 opacity-60" />
                      <span className="text-[10px] block font-medium">Belum ada</span>
                    </div>
                  )}
                </div>

                {/* Actions & Status */}
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="px-3.5 py-1.5 bg-[#294D35] hover:bg-[#4F7655] text-white rounded-lg font-semibold text-xs cursor-pointer inline-flex items-center gap-1.5 transition-colors shadow-2xs">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{isUploadingLogo ? 'Mengunggah...' : storeLogoUrl ? 'Ganti Logo' : 'Unggah Logo Baru'}</span>
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/webp, image/svg+xml"
                        onChange={handleLogoFileSelect}
                        disabled={isUploadingLogo}
                        className="hidden"
                      />
                    </label>

                    {storeLogoUrl && (
                      <button
                        type="button"
                        onClick={handleDeleteLogo}
                        className="px-3 py-1.5 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus Logo</span>
                      </button>
                    )}
                  </div>

                  {/* Storage Status Badge */}
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-stone-500">Status Penyimpanan:</span>
                    {storeLogoUrl ? (
                      storeLogoUrl.includes('supabase.co') ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold text-[10px]">
                          <Check className="w-3 h-3" /> Supabase Storage (Cloud: bucket &apos;logos&apos;)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold text-[10px]">
                          Penyimpanan Lokal Browser (Offline Fallback)
                        </span>
                      )
                    ) : (
                      <span className="text-stone-400">Belum diunggah</span>
                    )}
                  </div>

                  <p className="text-[11px] text-stone-500 leading-normal">
                    Format: PNG, JPG, WebP, SVG (Maks. 5 MB). Logo otomatis tampil di header, profil toko, dan struk kasir termal. Menghapus logo aman tanpa menghapus data transaksi.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="mt-2 px-5 py-2.5 bg-[#294D35] hover:bg-[#4F7655] text-white font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Simpan Perubahan Profil
            </button>
          </form>

          {/* Backup & Restore Data Section */}
          <div className="pt-6 border-t border-stone-200 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#294D35] text-[#D6BD7A] flex items-center justify-center shrink-0 shadow-xs">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-[#294D35]">
                  Pencadangan &amp; Pemulihan Data (Backup &amp; Restore)
                </h4>
                <p className="text-[11px] text-stone-500">
                  Unduh file cadangan mandiri untuk mengamankan data toko, atau pulihkan data dari berkas JSON sebelumnya.
                </p>
              </div>
            </div>

            {backupDownloadSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{backupDownloadSuccessMsg}</span>
              </div>
            )}

            {restoreError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold">Kendala Pemulihan Data</p>
                  <p className="text-[11px] mt-0.5">{restoreError}</p>
                </div>
                <button onClick={() => setRestoreError(null)} className="text-red-500 hover:text-red-700">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Action Buttons: Backup Data & Pulihkan Data */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Tombol Backup Data */}
              <button
                type="button"
                onClick={handleDownloadBackup}
                className="p-3.5 bg-[#294D35] hover:bg-[#1e3827] text-white rounded-xl text-left flex items-start gap-3 transition-all shadow-xs cursor-pointer group active:scale-[0.99]"
              >
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Download className="w-4 h-4 text-[#D6BD7A]" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-bold text-xs block text-white">Backup Data</span>
                  <span className="text-[10px] text-stone-300 block leading-tight mt-0.5">
                    Unduh berkas JSON cadangan seluruh data usaha
                  </span>
                </div>
              </button>

              {/* Tombol Pulihkan Data */}
              <button
                type="button"
                onClick={handleTriggerRestoreFileSelect}
                className="p-3.5 bg-[#F5F0E5] hover:bg-[#eae2d0] text-[#263328] rounded-xl border border-[#D6BD7A] text-left flex items-start gap-3 transition-all shadow-xs cursor-pointer group active:scale-[0.99]"
              >
                <div className="w-8 h-8 rounded-lg bg-[#294D35]/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Upload className="w-4 h-4 text-[#294D35]" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-bold text-xs block text-[#294D35]">Pulihkan Data</span>
                  <span className="text-[10px] text-stone-600 block leading-tight mt-0.5">
                    Pilih &amp; pulihkan file backup JSON dari perangkat
                  </span>
                </div>
              </button>
            </div>

            <p className="text-[10px] text-stone-400 leading-relaxed">
              Berkas cadangan mencakup profil toko, cabang, katalog produk, saldo stok, riwayat transaksi kasir, daftar pelanggan &amp; pemasok, akun rekening bank/e-wallet, serta seluruh entri jurnal keuangan.
            </p>
          </div>
        </div>
      )}

      {/* Backup & Restore Dedicated Tab */}
      {activeTab === 'backup' && (
        <div className="bg-white rounded-2xl border border-[#DCE5D6] p-6 lg:p-8 max-w-2xl shadow-xs space-y-6">
          <div>
            <h3 className="font-bold text-base text-[#294D35] mb-1">
              Pencadangan &amp; Pemulihan Data (Backup &amp; Restore)
            </h3>
            <p className="text-xs text-stone-500">
              Kelola salinan data cadangan lokal Anda secara mandiri untuk mencegah kehilangan data atau memindahkan data ke perangkat lain.
            </p>
          </div>

          {backupDownloadSuccessMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{backupDownloadSuccessMsg}</span>
            </div>
          )}

          {restoreError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold">Kendala Pemulihan Data</p>
                <p className="text-[11px] mt-0.5">{restoreError}</p>
              </div>
              <button onClick={() => setRestoreError(null)} className="text-red-500 hover:text-red-700">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Card Backup */}
            <div className="p-5 bg-[#F5F7F2] rounded-2xl border border-[#DCE5D6] space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-[#294D35] text-[#D6BD7A] flex items-center justify-center shadow-xs">
                  <Download className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-sm text-[#294D35]">Unduh Cadangan (Backup Data)</h4>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Menyimpan seluruh katalog produk, stok tiap cabang, transaksi kasir POS, data pelanggan, supplier, dan jurnal akuntansi ke dalam 1 file JSON aman.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownloadBackup}
                className="w-full py-2.5 bg-[#294D35] hover:bg-[#1e3827] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer active:scale-[0.99]"
              >
                <Download className="w-4 h-4 text-[#D6BD7A]" />
                <span>Unduh File Backup Sekarang</span>
              </button>
            </div>

            {/* Card Restore */}
            <div className="p-5 bg-[#F5F0E5]/40 rounded-2xl border border-[#D6BD7A] space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-[#294D35]/10 text-[#294D35] flex items-center justify-center shadow-xs">
                  <Upload className="w-5 h-5 text-[#294D35]" />
                </div>
                <h4 className="font-bold text-sm text-[#294D35]">Pulihkan Data (Restore)</h4>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Pilih file backup JSON dari komputer atau HP Anda. Sistem akan memvalidasi keutuhan berkas dan menampilkan ringkasan data sebelum konfirmasi pemulihan.
                </p>
              </div>
              <button
                type="button"
                onClick={handleTriggerRestoreFileSelect}
                className="w-full py-2.5 bg-[#294D35] hover:bg-[#1e3827] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer active:scale-[0.99]"
              >
                <Upload className="w-4 h-4 text-[#D6BD7A]" />
                <span>Pilih Berkas JSON untuk Dipulihkan</span>
              </button>
            </div>
          </div>

          {/* Guide Callout */}
          <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200 text-xs text-emerald-900 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-[#294D35]">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>Panduan Kedaulatan &amp; Keamanan Data</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-stone-700 leading-relaxed">
              <li>Lakukan Backup Data secara berkala (misalnya setiap akhir hari atau akhir pekan) untuk mengarsipkan catatan transaksi kasir.</li>
              <li>File backup dapat dipindahkan ke perangkat lain (komputer/laptop kasir baru) dengan menggunakan tombol Pulihkan Data.</li>
              <li>Sistem memvalidasi keaslian format berkas dan mencegah penimpaan data bila berkas yang dipilih rusak atau bukan berkas resmi Jalora.</li>
            </ul>
          </div>
        </div>
      )}

      {/* Branches Tab */}
      {activeTab === 'branches' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-base text-[#294D35]">Cabang Toko Terdaftar</h3>
              <p className="text-xs text-stone-500">Kelola stok dan staf kasir per cabang lokasi fisik.</p>
            </div>
            <button
              onClick={() => setShowAddBranchModal(true)}
              className="px-4 py-2 bg-[#294D35] hover:bg-[#4F7655] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Cabang Baru</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {branches.map(b => (
              <div
                key={b.id}
                className={`p-5 rounded-2xl border transition-all text-xs space-y-2 ${
                  b.id === branch.id
                    ? 'border-[#4F7655] bg-[#4F7655]/5 shadow-xs'
                    : 'border-[#DCE5D6] bg-white'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-[#294D35] text-sm">{b.name}</h4>
                    <span className="font-mono text-stone-500 text-[11px]">Kode: {b.code}</span>
                  </div>
                  {b.isMain && (
                    <span className="px-2 py-0.5 bg-[#294D35] text-white rounded text-[10px] font-semibold">
                      Cabang Utama
                    </span>
                  )}
                </div>

                <p className="text-stone-600">{b.address || 'Alamat cabang'}</p>
                <p className="text-stone-500 font-mono">Telp: {b.phone}</p>

                <div className="pt-2 flex justify-between items-center border-t border-stone-200">
                  {b.id === branch.id ? (
                    <span className="text-emerald-800 font-bold text-[11px]">● Sedang Aktif</span>
                  ) : (
                    <button
                      onClick={() => onSelectBranch(b.id)}
                      className="text-[#4F7655] font-bold hover:underline"
                    >
                      Beralih ke Cabang Ini &rarr;
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payments Configuration Tab */}
      {activeTab === 'payments' && (
        <div className="bg-white rounded-2xl border border-[#DCE5D6] p-6 lg:p-8 max-w-3xl shadow-xs space-y-8">
          <div>
            <h3 className="font-bold text-base text-[#294D35] mb-1">Pengaturan Metode Pembayaran & Rekening Toko</h3>
            <p className="text-xs text-stone-500">
              Konfigurasikan metode pembayaran kasir, nomor rekening bank toko, akun e-wallet, dan kode QRIS resmi toko Anda.
            </p>
          </div>

          {paymentSavedMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{paymentSavedMsg}</span>
            </div>
          )}

          {/* 1. Enabled Methods & Default */}
          <div className="space-y-4 pt-2">
            <div>
              <label className="block font-bold text-xs text-[#294D35] mb-1.5">
                Metode Pembayaran yang Aktif di Kasir POS:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  { id: 'cash' as PaymentMethod, label: 'Tunai (Cash)', desc: 'Pembayaran fisik laci kasir tunai' },
                  { id: 'transfer' as PaymentMethod, label: 'Transfer Bank', desc: 'Transfer ke rekening bank toko yang aktif' },
                  { id: 'ewallet' as PaymentMethod, label: 'Dompet Digital (E-Wallet)', desc: 'Pembayaran ke akun e-wallet toko' },
                  { id: 'qris' as PaymentMethod, label: 'QRIS Toko (Scan QR)', desc: 'Pindai kode QRIS toko oleh pelanggan' },
                ].map((m) => {
                  const isChecked = paymentConfig.enabledMethods.includes(m.id);
                  return (
                    <label
                      key={m.id}
                      className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-colors ${
                        isChecked ? 'border-[#4F7655] bg-[#F5F0E5]/30' : 'border-stone-200 bg-stone-50 opacity-75'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          const updated: PaymentMethod[] = e.target.checked
                            ? [...paymentConfig.enabledMethods, m.id]
                            : paymentConfig.enabledMethods.filter(item => item !== m.id);
                          const finalMethods: PaymentMethod[] = updated.length > 0 ? updated : ['cash'];
                          const newConfig: StorePaymentConfig = {
                            ...paymentConfig,
                            enabledMethods: finalMethods,
                            defaultMethod: finalMethods.includes(paymentConfig.defaultMethod) ? paymentConfig.defaultMethod : finalMethods[0]
                          };
                          setPaymentConfig(newConfig);
                          jaloraStorage.savePaymentConfig(store.id, newConfig);
                        }}
                        className="mt-0.5 accent-[#294D35]"
                      />
                      <div>
                        <span className="font-bold text-[#294D35] block">{m.label}</span>
                        <span className="text-[11px] text-stone-500">{m.desc}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Default Method */}
            <div>
              <label className="block font-bold text-xs text-[#294D35] mb-1">
                Metode Pembayaran Default di Kasir:
              </label>
              <select
                value={paymentConfig.defaultMethod}
                onChange={(e) => {
                  const newMethod = e.target.value as PaymentMethod;
                  const newConfig = { ...paymentConfig, defaultMethod: newMethod };
                  setPaymentConfig(newConfig);
                  jaloraStorage.savePaymentConfig(store.id, newConfig);
                }}
                className="w-full sm:w-1/2 px-3 py-2 border border-[#DCE5D6] rounded-xl bg-white text-xs font-semibold text-[#294D35] focus:outline-none focus:border-[#4F7655]"
              >
                <option value="cash">Tunai (Cash)</option>
                <option value="transfer">Transfer Bank</option>
                <option value="ewallet">Dompet Digital (E-Wallet)</option>
                <option value="qris">QRIS Toko (Scan QR)</option>
              </select>
            </div>
          </div>

          {/* 2. QRIS Toko & Unggah Foto Kode QR */}
          <div className="p-4 sm:p-5 bg-[#F5F7F2] rounded-2xl border border-[#DCE5D6] space-y-4">
            <div className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-[#4F7655]" />
              <h4 className="font-bold text-sm text-[#294D35]">Pengaturan & Foto Kode QRIS Toko</h4>
            </div>
            <p className="text-[11px] text-stone-500">
              Unggah gambar kode QRIS resmi dari bank atau penyedia pembayaran Anda. Gambar ini akan langsung ditampilkan dalam ukuran besar dan tajam di layar kasir untuk dipindai pelanggan.
            </p>

            {qrisUploadError && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{qrisUploadError}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-5 items-start">
              {/* QRIS Image Preview Area */}
              <div className="w-full sm:w-48 shrink-0 flex flex-col items-center">
                <div className="w-44 h-44 rounded-xl border border-dashed border-[#DCE5D6] bg-white flex items-center justify-center p-2 relative overflow-hidden shadow-xs">
                  {paymentConfig.qrisImageUrl ? (
                    <img
                      src={paymentConfig.qrisImageUrl}
                      alt="Kode QRIS Toko"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="text-center p-3 text-stone-400 space-y-1">
                      <QrCode className="w-12 h-12 mx-auto stroke-1 text-[#4F7655]" />
                      <span className="text-[10px] block font-medium">Belum ada foto QRIS</span>
                    </div>
                  )}
                </div>

                <div className="mt-2.5 flex items-center gap-2 w-full justify-center">
                  <label className="px-3 py-1.5 bg-[#294D35] hover:bg-[#1e3827] text-white rounded-lg text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors">
                    <Upload className="w-3.5 h-3.5 text-[#D6BD7A]" />
                    <span>{paymentConfig.qrisImageUrl ? 'Ganti QRIS' : 'Unggah QRIS'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleQrisImageUpload}
                      className="hidden"
                    />
                  </label>
                  {paymentConfig.qrisImageUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveQrisImage}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg border border-red-200 text-[11px] cursor-pointer"
                      title="Hapus gambar QRIS"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* QRIS Metadata Inputs */}
              <div className="flex-1 space-y-3 w-full">
                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 mb-1">Nama Merchant / Toko QRIS</label>
                  <input
                    type="text"
                    placeholder="Contoh: TOKO BERKAH JALORA"
                    value={paymentConfig.qrisMerchantName}
                    onChange={(e) => {
                      const newConfig = { ...paymentConfig, qrisMerchantName: e.target.value };
                      setPaymentConfig(newConfig);
                      jaloraStorage.savePaymentConfig(store.id, newConfig);
                    }}
                    className="w-full px-3 py-2 border border-[#DCE5D6] rounded-xl bg-white text-xs text-[#294D35] font-medium focus:outline-none focus:border-[#4F7655]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 mb-1">NMID QRIS (Opsional)</label>
                  <input
                    type="text"
                    placeholder="Contoh: ID1020304050607"
                    value={paymentConfig.qrisNmid}
                    onChange={(e) => {
                      const newConfig = { ...paymentConfig, qrisNmid: e.target.value };
                      setPaymentConfig(newConfig);
                      jaloraStorage.savePaymentConfig(store.id, newConfig);
                    }}
                    className="w-full px-3 py-2 border border-[#DCE5D6] rounded-xl bg-white text-xs font-mono text-[#294D35] focus:outline-none focus:border-[#4F7655]"
                  />
                </div>
                <div className="text-[11px] text-stone-500 bg-[#F5F0E5]/40 p-2.5 rounded-xl border border-[#DCE5D6]/60 leading-relaxed">
                  💡 <strong>Tips Kasir:</strong> Pastikan kode QRIS yang diunggah memiliki kontras tinggi dan tidak terpotong tepi sudut agar kamera ponsel pelanggan dapat memindai dalam 1 detik.
                </div>
              </div>
            </div>
          </div>

          {/* Quick Action Header: Rekening Bank & E-Wallet Toko */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-gradient-to-r from-[#F5F0E5]/40 via-white to-white rounded-2xl border border-[#DCE5D6]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#294D35] text-[#D6BD7A] flex items-center justify-center shrink-0 shadow-xs">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-[#294D35]">Rekening Bank & E-Wallet Toko</h4>
                <p className="text-[11px] text-stone-500">Kelola akun pembayaran untuk metode Transfer Bank dan E-Wallet di Kasir POS</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleOpenAccountModal('bank')}
              className="px-3.5 py-1.5 bg-[#294D35] hover:bg-[#1e3827] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs shrink-0"
            >
              <Plus className="w-4 h-4 text-[#D6BD7A]" />
              <span>Tambah Akun</span>
            </button>
          </div>

          {/* 3. Rekening Bank Toko */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#DCE5D6]">
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-[#4F7655]" />
                <div>
                  <h4 className="font-bold text-xs text-[#294D35]">Rekening Bank Toko</h4>
                  <p className="text-[11px] text-stone-500">Daftar rekening bank operasional untuk transaksi Transfer Bank di kasir</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleOpenBankModal()}
                className="px-3 py-1.5 bg-[#294D35] hover:bg-[#1e3827] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5 text-[#D6BD7A]" />
                <span>Tambah Rekening Bank</span>
              </button>
            </div>

            {(!paymentConfig.bankAccounts || paymentConfig.bankAccounts.length === 0) ? (
              <div className="p-6 text-center bg-stone-50 rounded-xl border border-dashed border-[#DCE5D6] text-stone-500">
                <Building className="w-8 h-8 mx-auto text-[#4F7655] mb-1.5 stroke-1" />
                <p className="font-semibold text-xs text-[#294D35]">Belum ada rekening bank yang ditambahkan</p>
                <p className="text-[11px] mt-0.5">Klik tombol &quot;Tambah Rekening Bank&quot; untuk mendaftarkan nomor rekening toko Anda.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {paymentConfig.bankAccounts.map((bank) => (
                  <div
                    key={bank.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      bank.isActive
                        ? 'border-[#4F7655] bg-white shadow-xs'
                        : 'border-stone-200 bg-stone-50 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-[#294D35]">{bank.bankName}</span>
                          {bank.label && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F5F0E5] text-[#294D35] font-medium border border-[#DCE5D6]">
                              {bank.label}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-mono font-bold text-[#294D35] mt-1 tracking-wide">
                          {bank.accountNumber}
                        </p>
                        <p className="text-[11px] text-stone-600 mt-0.5">
                          a.n. <strong className="text-stone-800">{bank.holderName}</strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleToggleBankActive(bank.id)}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-colors cursor-pointer ${
                            bank.isActive
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-stone-200 text-stone-600 hover:bg-stone-300'
                          }`}
                          title="Klik untuk mengubah status aktif/nonaktif"
                        >
                          {bank.isActive ? 'Aktif' : 'Nonaktif'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenBankModal(bank)}
                          className="p-1 text-stone-500 hover:text-[#294D35] hover:bg-stone-100 rounded-lg cursor-pointer"
                          title="Edit Rekening"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteBank(bank.id)}
                          className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg cursor-pointer"
                          title="Hapus Rekening"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 4. Akun E-Wallet Toko */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#DCE5D6]">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-[#4F7655]" />
                <div>
                  <h4 className="font-bold text-xs text-[#294D35]">Akun E-Wallet Toko</h4>
                  <p className="text-[11px] text-stone-500">Daftar dompet digital toko untuk menerima pembayaran pelanggan di kasir</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleOpenEWalletModal()}
                className="px-3 py-1.5 bg-[#294D35] hover:bg-[#1e3827] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5 text-[#D6BD7A]" />
                <span>Tambah Akun E-Wallet</span>
              </button>
            </div>

            {(!paymentConfig.eWallets || paymentConfig.eWallets.length === 0) ? (
              <div className="p-6 text-center bg-stone-50 rounded-xl border border-dashed border-[#DCE5D6] text-stone-500">
                <Wallet className="w-8 h-8 mx-auto text-[#4F7655] mb-1.5 stroke-1" />
                <p className="font-semibold text-xs text-[#294D35]">Belum ada akun e-wallet yang ditambahkan</p>
                <p className="text-[11px] mt-0.5">Klik tombol &quot;Tambah Akun E-Wallet&quot; untuk mendaftarkan GoPay, DANA, ShopeePay, OVO, dll.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {paymentConfig.eWallets.map((wallet) => (
                  <div
                    key={wallet.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      wallet.isActive
                        ? 'border-[#4F7655] bg-white shadow-xs'
                        : 'border-stone-200 bg-stone-50 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-[#294D35]">{wallet.provider}</span>
                          {wallet.label && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F5F0E5] text-[#294D35] font-medium border border-[#DCE5D6]">
                              {wallet.label}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-mono font-bold text-[#294D35] mt-1 tracking-wide">
                          {wallet.accountNumber}
                        </p>
                        <p className="text-[11px] text-stone-600 mt-0.5">
                          a.n. <strong className="text-stone-800">{wallet.accountName}</strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleToggleEWalletActive(wallet.id)}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-colors cursor-pointer ${
                            wallet.isActive
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-stone-200 text-stone-600 hover:bg-stone-300'
                          }`}
                          title="Klik untuk mengubah status aktif/nonaktif"
                        >
                          {wallet.isActive ? 'Aktif' : 'Nonaktif'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEWalletModal(wallet)}
                          className="p-1 text-stone-500 hover:text-[#294D35] hover:bg-stone-100 rounded-lg cursor-pointer"
                          title="Edit Akun"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteEWallet(wallet.id)}
                          className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg cursor-pointer"
                          title="Hapus Akun"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Dialog Form Tambah / Edit Akun Toko (Bank & E-Wallet — Zero Scroll) */}
      {showAccountModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 bg-[rgba(41,77,53,0.55)] backdrop-blur-xs transition-opacity duration-200 ease-out flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-2xl border border-[#DCE5D6] shadow-2xl p-4 sm:p-5 relative animate-jalora-enter space-y-3 my-auto max-h-[94dvh] overflow-y-auto">
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-2 border-b border-[#DCE5D6]/60">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#294D35] text-[#D6BD7A] flex items-center justify-center shrink-0">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#294D35] leading-tight">
                    {accountModalMode === 'edit'
                      ? (accountType === 'bank' ? 'Edit Rekening Bank Toko' : 'Edit Akun E-Wallet Toko')
                      : 'Tambah Akun Pembayaran Toko'}
                  </h3>
                  <p className="text-[10px] text-stone-500">
                    Formulir instan siap ketik tanpa perlu scroll
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAccountModal(false)}
                className="text-stone-400 hover:text-stone-700 p-1 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
                title="Tutup Modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error Notification */}
            {accountFormError && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span className="font-medium">{accountFormError}</span>
              </div>
            )}

            {/* Form Input */}
            <form onSubmit={handleSaveAccountForm} className="space-y-2.5 text-xs">
              {/* Jenis Akun Segmented Selector */}
              <div>
                <label className="block text-[11px] font-bold text-[#294D35] mb-1">
                  Jenis Akun Pembayaran:
                </label>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-stone-100 rounded-xl border border-stone-200">
                  <button
                    type="button"
                    onClick={() => {
                      setAccountType('bank');
                      if (!['Bank Syariah Indonesia (BSI)', 'BCA', 'BRI', 'BNI', 'Mandiri'].includes(providerSelection)) {
                        setProviderSelection('Bank Syariah Indonesia (BSI)');
                        setCustomProviderName('');
                      }
                      accountNumberInputRef.current?.focus();
                    }}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      accountType === 'bank'
                        ? 'bg-[#294D35] text-white shadow-xs'
                        : 'text-stone-600 hover:text-[#294D35]'
                    }`}
                  >
                    <Building className="w-3.5 h-3.5" />
                    <span>Rekening Bank</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAccountType('ewallet');
                      if (!['GoPay', 'DANA', 'ShopeePay', 'OVO'].includes(providerSelection)) {
                        setProviderSelection('GoPay');
                        setCustomProviderName('');
                      }
                      accountNumberInputRef.current?.focus();
                    }}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      accountType === 'ewallet'
                        ? 'bg-[#294D35] text-white shadow-xs'
                        : 'text-stone-600 hover:text-[#294D35]'
                    }`}
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    <span>Dompet Digital (E-Wallet)</span>
                  </button>
                </div>
              </div>

              {/* Dropdown Pilihan Penyedia (BSI, BCA, BRI, BNI, Mandiri, GoPay, DANA, ShopeePay, OVO, Lainnya) */}
              <div>
                <label className="block text-[11px] font-bold text-[#294D35] mb-1">
                  {accountType === 'bank' ? 'Pilih Bank:' : 'Pilih Layanan E-Wallet:'}
                </label>
                <select
                  value={providerSelection}
                  onChange={(e) => handleProviderSelectChange(e.target.value)}
                  className="w-full px-3 py-1.5 border border-[#DCE5D6] rounded-xl bg-white text-xs font-semibold text-[#294D35] focus:outline-none focus:border-[#4F7655]"
                >
                  {accountType === 'bank' ? (
                    <>
                      <option value="Bank Syariah Indonesia (BSI)">Bank Syariah Indonesia (BSI)</option>
                      <option value="BCA">BCA (Bank Central Asia)</option>
                      <option value="BRI">BRI (Bank Rakyat Indonesia)</option>
                      <option value="BNI">BNI (Bank Negara Indonesia)</option>
                      <option value="Mandiri">Bank Mandiri</option>
                      <option value="Lainnya">Bank Lainnya (Ketik Manual)</option>
                    </>
                  ) : (
                    <>
                      <option value="GoPay">GoPay</option>
                      <option value="DANA">DANA</option>
                      <option value="ShopeePay">ShopeePay</option>
                      <option value="OVO">OVO</option>
                      <option value="Lainnya">E-Wallet Lainnya (Ketik Manual)</option>
                    </>
                  )}
                </select>
              </div>

              {/* Input Manual Jika Memilih 'Lainnya' */}
              {providerSelection === 'Lainnya' && (
                <div>
                  <label className="block text-[11px] font-bold text-[#294D35] mb-1">
                    {accountType === 'bank' ? 'Ketik Nama Bank:' : 'Ketik Nama Layanan E-Wallet:'}
                  </label>
                  <input
                    type="text"
                    placeholder={accountType === 'bank' ? 'Contoh: Bank Muamalat / Bank Jatim' : 'Contoh: LinkAja / i.saku'}
                    value={customProviderName}
                    onChange={(e) => setCustomProviderName(e.target.value)}
                    className="w-full px-3 py-1.5 border border-[#DCE5D6] rounded-xl bg-white text-xs text-[#294D35] focus:outline-none focus:border-[#4F7655]"
                  />
                </div>
              )}

              {/* Nomor Rekening / Nomor HP (Auto Focus Langsung) */}
              <div>
                <label className="block text-[11px] font-bold text-[#294D35] mb-1">
                  {accountType === 'bank' ? 'Nomor Rekening Bank:' : 'Nomor HP / ID Akun:'}
                </label>
                <input
                  ref={accountNumberInputRef}
                  type="text"
                  placeholder={accountType === 'bank' ? 'Contoh: 7123456789' : 'Contoh: 081234567890'}
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full px-3 py-1.5 border border-[#DCE5D6] rounded-xl bg-white text-xs font-mono font-bold text-[#294D35] focus:outline-none focus:border-[#4F7655]"
                />
              </div>

              {/* Nama Pemilik Rekening / Akun */}
              <div>
                <label className="block text-[11px] font-bold text-[#294D35] mb-1">
                  {accountType === 'bank' ? 'Nama Pemilik Rekening (a.n.):' : 'Nama Pemilik Akun (a.n.):'}
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Toko Berkah / Abdul Jalil"
                  value={accountHolderName}
                  onChange={(e) => setAccountHolderName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-[#DCE5D6] rounded-xl bg-white text-xs text-[#294D35] focus:outline-none focus:border-[#4F7655]"
                />
              </div>

              {/* Baris 2 Kolom Kompak: Label Akun + Checkbox Status Aktif */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                    Label Akun (Opsional):
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Utama / Kasir 1"
                    value={accountLabel}
                    onChange={(e) => setAccountLabel(e.target.value)}
                    className="w-full px-3 py-1.5 border border-[#DCE5D6] rounded-xl bg-white text-xs text-[#294D35] focus:outline-none focus:border-[#4F7655]"
                  />
                </div>
                <div className="flex items-center gap-2 sm:pt-5">
                  <input
                    type="checkbox"
                    id="accountIsActive"
                    checked={accountIsActive}
                    onChange={(e) => setAccountIsActive(e.target.checked)}
                    className="accent-[#294D35] w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="accountIsActive" className="text-xs font-semibold text-[#294D35] cursor-pointer">
                    Aktif di Kasir POS
                  </label>
                </div>
              </div>

              {/* Footer Tombol Aksi (Tepat di bawah formulir tanpa scrolling) */}
              <div className="pt-2 border-t border-[#DCE5D6]/60 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAccountModal(false)}
                  className="px-3.5 py-1.5 border border-[#DCE5D6] rounded-xl text-stone-600 hover:bg-stone-50 font-semibold text-xs cursor-pointer transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#294D35] hover:bg-[#1e3827] text-white rounded-xl font-bold text-xs shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
                >
                  <Check className="w-3.5 h-3.5 text-[#D6BD7A]" />
                  <span>{accountModalMode === 'edit' ? 'Simpan Perubahan' : 'Simpan Akun'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Printer Tab */}
      {activeTab === 'printer' && (
        <div className="bg-white rounded-2xl border border-[#DCE5D6] p-6 lg:p-8 max-w-xl shadow-xs">
          <h3 className="font-bold text-base text-[#294D35] mb-1">Konfigurasi Printer Struk Kasir</h3>
          <p className="text-xs text-stone-500 mb-6">Mendukung printer thermal USB, Bluetooth, dan driver printer sistem.</p>

          {printerSavedMsg && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>{printerSavedMsg}</span>
            </div>
          )}

          <form onSubmit={handleSavePrinter} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Ukuran Kertas Thermal</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPrinterConfig({ ...printerConfig, paperSize: '58mm' })}
                  className={`p-3 rounded-xl border text-center font-semibold transition-colors ${
                    printerConfig.paperSize === '58mm'
                      ? 'border-[#4F7655] bg-[#4F7655]/10 text-[#294D35]'
                      : 'border-stone-200 text-stone-600'
                  }`}
                >
                  58 mm (Standar Portable)
                </button>
                <button
                  type="button"
                  onClick={() => setPrinterConfig({ ...printerConfig, paperSize: '80mm' })}
                  className={`p-3 rounded-xl border text-center font-semibold transition-colors ${
                    printerConfig.paperSize === '80mm'
                      ? 'border-[#4F7655] bg-[#4F7655]/10 text-[#294D35]'
                      : 'border-stone-200 text-stone-600'
                  }`}
                >
                  80 mm (Desktop POS Lebar)
                </button>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Nama Printer</label>
              <input
                type="text"
                value={printerConfig.printerName}
                onChange={(e) => setPrinterConfig({ ...printerConfig, printerName: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:border-[#4F7655]"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="autoPrintCheck"
                checked={printerConfig.autoPrint}
                onChange={(e) => setPrinterConfig({ ...printerConfig, autoPrint: e.target.checked })}
                className="w-4 h-4 text-[#4F7655] rounded"
              />
              <label htmlFor="autoPrintCheck" className="text-xs text-stone-700 font-medium">
                Cetak Struk Otomatis Setiap Transaksi Selesai
              </label>
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Catatan Kaki Struk (Footer Notes)</label>
              <textarea
                rows={2}
                value={printerConfig.footerNotes}
                onChange={(e) => setPrinterConfig({ ...printerConfig, footerNotes: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs focus:outline-none focus:border-[#4F7655]"
              />
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="submit"
                className="px-5 py-2.5 bg-[#294D35] hover:bg-[#4F7655] text-white font-semibold rounded-lg transition-colors"
              >
                Simpan Konfigurasi
              </button>
              <button
                type="button"
                onClick={handleTestPrint}
                className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold rounded-lg transition-colors"
              >
                Uji Cetak Struk (Test Print)
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Notifikasi & Suara Transaksi Tab */}
      {activeTab === 'notifications' && (
        <div className="bg-white rounded-2xl border border-[#DCE5D6] p-6 lg:p-8 max-w-2xl shadow-xs space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-stone-100">
            <div className="w-10 h-10 rounded-xl bg-[#294D35] text-white flex items-center justify-center shadow-xs">
              <Bell className="w-5 h-5 text-[#D6BD7A]" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#294D35]">Pengaturan Notifikasi &amp; Suara Transaksi</h3>
              <p className="text-xs text-stone-500">Kelola umpan balik audio lonceng kasir, getaran haptic, dan notifikasi transaksi</p>
            </div>
          </div>

          {soundSavedMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{soundSavedMessage}</span>
            </div>
          )}

          <div className="space-y-4 text-xs">
            {/* Sakelar Suara Notifikasi Transaksi */}
            <div className="p-4 bg-stone-50 rounded-2xl border border-[#DCE5D6] flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  {soundConfig.soundEnabled ? (
                    <Volume2 className="w-4 h-4 text-[#4F7655]" />
                  ) : (
                    <VolumeX className="w-4 h-4 text-stone-400" />
                  )}
                  <span className="font-bold text-sm text-[#294D35]">Suara Notifikasi Transaksi</span>
                </div>
                <p className="text-stone-500 text-[11px] leading-relaxed">
                  Bunyikan lonceng konfirmasi khas POS saat transaksi kasir berhasil tersimpan.
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={soundConfig.soundEnabled}
                  onChange={(e) => handleUpdateSoundConfig({ soundEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#294D35]"></div>
              </label>
            </div>

            {/* Volume Slider */}
            {soundConfig.soundEnabled && (
              <div className="p-4 bg-stone-50 rounded-2xl border border-[#DCE5D6] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-[#4F7655]" />
                    <span className="font-bold text-[#294D35]">Tingkat Volume Suara</span>
                  </div>
                  <span className="font-mono font-bold text-xs text-[#294D35] bg-white px-2 py-0.5 rounded border border-[#DCE5D6]">
                    {Math.round(soundConfig.volume * 100)}%
                  </span>
                </div>

                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={soundConfig.volume}
                  onChange={(e) => handleUpdateSoundConfig({ volume: parseFloat(e.target.value) })}
                  className="w-full accent-[#294D35] cursor-pointer"
                />

                <div className="flex justify-between text-[10px] text-stone-400 font-medium">
                  <span>Lembut (10%)</span>
                  <span>Standar (80%)</span>
                  <span>Maksimal (100%)</span>
                </div>
              </div>
            )}

            {/* Getar Perangkat */}
            <div className="p-4 bg-stone-50 rounded-2xl border border-[#DCE5D6] flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-[#4F7655]" />
                  <span className="font-bold text-sm text-[#294D35]">Getaran Umpan Balik (Haptic)</span>
                </div>
                <p className="text-stone-500 text-[11px] leading-relaxed">
                  Berikan getaran singkat pada smartphone atau tablet Android saat kasir menyelesaikan pembayaran.
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={soundConfig.vibrateEnabled}
                  onChange={(e) => handleUpdateSoundConfig({ vibrateEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#294D35]"></div>
              </label>
            </div>

            {/* Test Audio Button */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-[#F5F7F2] rounded-2xl border border-[#DCE5D6]">
              <div>
                <p className="font-bold text-xs text-[#294D35]">Uji Coba Lonceng Kasir</p>
                <p className="text-[11px] text-stone-500">Dengarkan sampel suara yang akan berbunyi saat transaksi berhasil</p>
              </div>

              <button
                type="button"
                onClick={() => soundService.playTestSound()}
                className="px-4 py-2 bg-[#294D35] hover:bg-[#1e3827] text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors shadow-xs cursor-pointer shrink-0"
              >
                <Volume2 className="w-4 h-4 text-[#D6BD7A]" />
                <span>Tes Bunyi Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Users & Roles Tab */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-base text-[#294D35]">Manajemen Pengguna & Hak Akses (RBAC)</h3>
              <p className="text-xs text-stone-500">Prinsip Least Privilege: Pemilik (Owner), Manajer, dan Kasir.</p>
            </div>
            <button
              onClick={() => setShowAddUserModal(true)}
              className="px-4 py-2 bg-[#294D35] hover:bg-[#4F7655] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Staf / Kasir</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {usersList.map(u => (
              <div key={u.id} className="bg-white p-5 rounded-xl border border-[#DCE5D6] text-xs space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-[#294D35] text-sm">{u.name}</h4>
                    <p className="text-stone-500 font-mono text-[11px] mt-0.5">{u.phone}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    u.role === 'owner' ? 'bg-[#294D35] text-white' :
                    u.role === 'manager' ? 'bg-[#4F7655] text-white' : 'bg-stone-100 text-stone-700'
                  }`}>
                    {u.role}
                  </span>
                </div>

                <div className="pt-2 border-t border-stone-100 flex justify-between text-[11px] text-stone-500">
                  <span>Keamanan PIN:</span>
                  <span className={u.isPinLocked ? 'text-red-600 font-bold' : 'text-emerald-700 font-semibold'}>
                    {u.isPinLocked ? 'Terkunci (5x Gagal)' : '6-Digit Aktif'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Feedback & Rating Tab */}
      {activeTab === 'feedback' && (
        <div className="bg-white rounded-2xl border border-[#DCE5D6] p-6 lg:p-8 max-w-xl shadow-xs space-y-5">
          <div>
            <h3 className="font-bold text-base text-[#294D35]">Beri Rating & Masukan Aplikasi</h3>
            <p className="text-xs text-stone-500">Bantu kami terus menyempurnakan JALORA Business Management Platform.</p>
          </div>

          {feedbackSentMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>{feedbackSentMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmitFeedback} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-stone-700 mb-2">Penilaian Anda (Bintang):</label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map(starNum => (
                  <button
                    key={starNum}
                    type="button"
                    onClick={() => setUserRating(starNum)}
                    className="p-1 hover:scale-110 transition-transform"
                  >
                    <Star
                      className={`w-7 h-7 ${starNum <= userRating ? 'fill-amber-400 text-amber-400' : 'text-stone-300'}`}
                    />
                  </button>
                ))}
                <span className="ml-2 font-bold text-stone-700 text-sm">{userRating} dari 5 Bintang</span>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Kategori Masukan:</label>
              <select
                value={feedbackCategory}
                onChange={(e) => setFeedbackCategory(e.target.value as any)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg bg-white focus:outline-none focus:border-[#4F7655]"
              >
                <option value="saran">Saran Fitur Baru</option>
                <option value="kendala">Laporan Kendala / Bug</option>
                <option value="pertanyaan">Pertanyaan Operasional</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Ulasan / Pesan Anda *</label>
              <textarea
                rows={4}
                required
                placeholder="Tuliskan pengalaman atau saran Anda untuk tim pengembang JALORA..."
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:border-[#4F7655]"
              />
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 bg-[#294D35] hover:bg-[#4F7655] text-white font-semibold rounded-lg transition-colors text-xs shadow-xs"
            >
              Kirim Masukan & Rating
            </button>
          </form>
        </div>
      )}

      {/* Share Application Tab */}
      {activeTab === 'share' && (
        <div className="bg-white rounded-2xl border border-[#DCE5D6] p-6 lg:p-8 max-w-xl shadow-xs space-y-5">
          <div>
            <h3 className="font-bold text-base text-[#294D35]">Bagikan JALORA ke Rekan Bisnis</h3>
            <p className="text-xs text-stone-500">Bantu sesama pemilik toko dan UMKM memiliki kendali penuh atas bisnis mereka.</p>
          </div>

          <div className="p-4 bg-[#F5F7F2] rounded-xl border border-[#DCE5D6] space-y-2 text-xs">
            <p className="font-semibold text-[#294D35]">Tautan Akses Aplikasi:</p>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={window.location.origin}
                className="flex-1 px-3 py-2 bg-white border border-stone-300 rounded-lg font-mono text-xs text-stone-700"
              />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.origin);
                  setShareCopied(true);
                  setTimeout(() => setShareCopied(false), 3000);
                }}
                className="px-3 py-2 bg-[#294D35] text-white rounded-lg font-semibold flex items-center gap-1"
              >
                {shareCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{shareCopied ? 'Tersalin' : 'Salin'}</span>
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleShareApp}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-xs"
          >
            <Share2 className="w-4 h-4" />
            <span>Bagikan via WhatsApp</span>
          </button>
        </div>
      )}

      {/* Audit Log Tab */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-xl border border-[#DCE5D6] overflow-hidden shadow-xs">
          <div className="p-4 border-b border-stone-200">
            <h3 className="font-bold text-sm text-[#294D35]">Catatan Audit Keamanan (Audit Log)</h3>
            <p className="text-xs text-stone-500 mt-0.5">Catatan tidak dapat dihapus oleh kasir untuk mencegah fraud dan manipulasi data</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold">
                  <th className="py-2.5 px-4">Waktu</th>
                  <th className="py-2.5 px-3">Petugas & Peran</th>
                  <th className="py-2.5 px-3">Aksi</th>
                  <th className="py-2.5 px-3">Objek / Entitas</th>
                  <th className="py-2.5 px-4">Rincian Perubahan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-stone-400">
                      Belum ada catatan audit log.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map(l => (
                    <tr key={l.id} className="hover:bg-stone-50/60">
                      <td className="py-2.5 px-4 font-mono text-stone-500 text-[11px] whitespace-nowrap">
                        {new Date(l.timestamp).toLocaleString('id-ID')}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-stone-800">
                        {l.userName} ({l.userRole})
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-mono text-[10px] font-bold text-[#4F7655] bg-emerald-50 px-2 py-0.5 rounded">
                          {l.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-stone-700">{l.targetId || l.targetEntity}</td>
                      <td className="py-2.5 px-4 text-stone-600 text-[11px]">{l.details}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* About Tab: Creator Tribute & Credit */}
      {activeTab === 'about' && (
        <div className="bg-white rounded-2xl border border-[#DCE5D6] p-8 lg:p-12 max-w-4xl shadow-xs">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="w-48 h-64 shrink-0 rounded-xl overflow-hidden border-2 border-[#DCE5D6] shadow-md bg-stone-100 relative">
              <img
                src="/assets/aistudio/Gemini_Generated_Image_o4rim4o4rim4o4ri_08f3b9f5.jpeg"
                alt="Abdul Jalil - Pencipta JALORA"
                className="w-full h-full object-cover object-top"
                referrerPolicy="no-referrer"
              />
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 text-center">
                <span className="text-[11px] text-white font-medium">Abdul Jalil</span>
              </div>
            </div>

            <div className="space-y-4 text-center md:text-left">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#294D35] flex items-center justify-center p-1.5 shadow-xs border border-[#DCE5D6] shrink-0">
                  <img
                    src="/assets/aistudio/Logo_Aplikasi_Jalora_Hijau_Modern_d93205db.png"
                    alt="Logo JALORA"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <div className="inline-block px-2.5 py-0.5 bg-[#F5F0E5] text-[#294D35] rounded text-[11px] font-bold">
                    Identitas Resmi JALORA
                  </div>
                  <h2 className="text-xl lg:text-2xl font-bold text-[#294D35]">
                    Dibuat oleh Abdul Jalil
                  </h2>
                </div>
              </div>

              <p className="text-sm text-stone-700 leading-relaxed">
                <strong>JALORA (Jalil Integrated Business Platform)</strong> dirancang dengan visi &ldquo;Satu Sistem, Kendali Seluruh Bisnis&rdquo;. Menghubungkan titik penjualan (POS), pergudangan inventaris multi-cabang, valuasi moving average, dan sistem pembukuan double-entry yang akurat.
              </p>

              <p className="text-xs text-stone-600 leading-relaxed">
                Dibangun menggunakan teknologi web terkini (React, TypeScript, Tailwind CSS, Supabase PostgreSQL) untuk menjamin keandalan, keamanan otorisasi 6-digit PIN, dan kemudahan pencetakan struk thermal di Indonesia.
              </p>

              <div className="pt-2 text-xs text-stone-400 font-mono">
                JALORA Platform Versi 1.0.0 · All Rights Reserved
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Branch Modal */}
      {showAddBranchModal && (
        <div className="fixed inset-0 z-50 bg-[rgba(41,77,53,0.55)] backdrop-blur-xs transition-opacity duration-200 ease-out flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-2xl border border-[#DCE5D6] shadow-2xl p-4 sm:p-6 relative max-h-[90dvh] flex flex-col my-auto overflow-hidden">
            <button
              onClick={() => setShowAddBranchModal(false)}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 text-sm p-1 z-10"
            >
              ✕
            </button>
            <div className="shrink-0 mb-3 pr-6">
              <h3 className="text-base font-bold text-[#294D35] mb-0.5">Tambah Cabang Toko Baru</h3>
              <p className="text-xs text-stone-500">Setiap cabang memiliki stok barang dan pencatatan kasir mandiri.</p>
            </div>

            <form onSubmit={handleAddBranch} className="flex-1 overflow-y-auto min-h-0 space-y-3 text-xs pr-1 -mr-1">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Nama Cabang *</label>
                <input
                  type="text"
                  placeholder="Contoh: Cabang Rungkut Megah"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:border-[#4F7655]"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Kode Cabang (Singkatan) *</label>
                <input
                  type="text"
                  placeholder="Contoh: CAB-02"
                  value={newBranchCode}
                  onChange={(e) => setNewBranchCode(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg font-mono uppercase focus:outline-none focus:border-[#4F7655]"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Telepon Cabang</label>
                <input
                  type="tel"
                  placeholder="0812345678"
                  value={newBranchPhone}
                  onChange={(e) => setNewBranchPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:border-[#4F7655]"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Alamat Cabang</label>
                <input
                  type="text"
                  placeholder="Jl. Raya..."
                  value={newBranchAddress}
                  onChange={(e) => setNewBranchAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:border-[#4F7655]"
                />
              </div>

              <div className="pt-3 border-t border-stone-200 shrink-0 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddBranchModal(false)}
                  className="w-1/3 py-2.5 rounded-lg border border-stone-200 text-stone-700 font-semibold cursor-pointer hover:bg-stone-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-lg bg-[#294D35] hover:bg-[#4F7655] text-white font-semibold transition-colors cursor-pointer shadow-xs"
                >
                  Simpan Cabang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 bg-[rgba(41,77,53,0.55)] backdrop-blur-xs transition-opacity duration-200 ease-out flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-2xl border border-[#DCE5D6] shadow-2xl p-4 sm:p-6 relative max-h-[90dvh] flex flex-col my-auto overflow-hidden">
            <button
              onClick={() => setShowAddUserModal(false)}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 text-sm p-1 z-10"
            >
              ✕
            </button>
            <div className="shrink-0 mb-3 pr-6">
              <h3 className="text-base font-bold text-[#294D35] mb-0.5">Tambah Pengguna & Peran</h3>
              <p className="text-xs text-stone-500">Pengguna baru akan memiliki akses sesuai peran yang dipilih.</p>
            </div>

            <form onSubmit={handleAddUser} className="flex-1 overflow-y-auto min-h-0 space-y-3 text-xs pr-1 -mr-1">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  placeholder="Contoh: Siti Rahmawati"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:border-[#4F7655]"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Nomor Handphone (WhatsApp) *</label>
                <input
                  type="tel"
                  placeholder="081234567890"
                  value={newUserPhone}
                  onChange={(e) => setNewUserPhone(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:border-[#4F7655]"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Peran (Role) *</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as any)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg bg-white focus:outline-none focus:border-[#4F7655]"
                >
                  <option value="cashier">Kasir (Akses Kasir POS & Shift Saja)</option>
                  <option value="manager">Manajer (Akses Operasional, Stok Opname & Laporan)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Buat 6-Digit PIN Transaksi *</label>
                <input
                  type="password"
                  maxLength={6}
                  placeholder="123456"
                  value={newUserPin}
                  onChange={(e) => setNewUserPin(e.target.value.replace(/\D/g, ''))}
                  required
                  className="w-full px-3 py-2 text-center text-lg tracking-widest font-mono border border-stone-300 rounded-lg focus:outline-none focus:border-[#4F7655]"
                />
              </div>

              <div className="pt-3 border-t border-stone-200 shrink-0 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="w-1/3 py-2.5 rounded-lg border border-stone-200 text-stone-700 font-semibold cursor-pointer hover:bg-stone-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-lg bg-[#294D35] hover:bg-[#4F7655] text-white font-semibold transition-colors cursor-pointer shadow-xs"
                >
                  Simpan Pengguna
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hidden File Input for Restore */}
      <input
        type="file"
        ref={restoreFileInputRef}
        accept=".json,application/json"
        onChange={handleRestoreFileSelected}
        className="hidden"
      />

      {/* Restore Confirmation Modal */}
      {showRestoreModal && restoreValidation && createPortal(
        <div className="fixed inset-0 z-50 bg-[rgba(41,77,53,0.55)] backdrop-blur-xs transition-opacity duration-200 ease-out flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full border border-[#DCE5D6] shadow-2xl p-4 sm:p-6 relative max-h-[90dvh] flex flex-col my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={handleCancelRestore}
              disabled={isRestoring}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 p-1 rounded-lg transition-colors cursor-pointer z-10"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-start gap-3 shrink-0 mb-3 pr-6">
              <div className="w-10 h-10 rounded-xl bg-[#F5F0E5] text-[#294D35] border border-[#D6BD7A] flex items-center justify-center shrink-0 shadow-xs">
                <RefreshCw className="w-5 h-5 text-[#294D35]" />
              </div>
              <div>
                <h3 className="font-bold text-base text-[#294D35]">
                  Konfirmasi Pulihkan Data (Restore)
                </h3>
                <p className="text-xs text-stone-500">
                  Periksa ringkasan data sebelum melakukan pemulihan
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 space-y-3.5 pr-1 -mr-1">

            {/* File Info */}
            <div className="p-3 bg-[#F5F7F2] rounded-2xl border border-[#DCE5D6] text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-stone-500">Nama Berkas:</span>
                <span className="font-mono font-bold text-stone-800 truncate max-w-[240px]">
                  {selectedRestoreFile?.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Waktu Cadangan:</span>
                <span className="font-semibold text-stone-800">
                  {formatIndonesianDateTime(restoreValidation.metadata?.exportedAt)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Usaha / Toko:</span>
                <span className="font-bold text-[#294D35]">
                  {restoreValidation.summary?.storeName || 'Toko JALORA'}
                </span>
              </div>
            </div>

            {/* Data Summary Grid */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-[#294D35] block">
                Ringkasan Data yang Akan Dipulihkan:
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200">
                  <span className="text-[10px] text-stone-500 block">Katalog Produk:</span>
                  <span className="font-bold text-[#294D35] font-mono text-sm">
                    {restoreValidation.summary?.productCount || 0} produk
                  </span>
                </div>

                <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200">
                  <span className="text-[10px] text-stone-500 block">Riwayat Transaksi:</span>
                  <span className="font-bold text-[#294D35] font-mono text-sm">
                    {restoreValidation.summary?.saleCount || 0} transaksi
                  </span>
                </div>

                <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200">
                  <span className="text-[10px] text-stone-500 block">Cabang Usaha:</span>
                  <span className="font-bold text-stone-800 font-mono text-sm">
                    {restoreValidation.summary?.branchCount || 0} cabang
                  </span>
                </div>

                <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200">
                  <span className="text-[10px] text-stone-500 block">Jurnal Keuangan:</span>
                  <span className="font-bold text-stone-800 font-mono text-sm">
                    {restoreValidation.summary?.journalCount || 0} entri
                  </span>
                </div>

                <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200">
                  <span className="text-[10px] text-stone-500 block">Pelanggan:</span>
                  <span className="font-semibold text-stone-700 font-mono">
                    {restoreValidation.summary?.customerCount || 0} orang
                  </span>
                </div>

                <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200">
                  <span className="text-[10px] text-stone-500 block">Pemasok (Supplier):</span>
                  <span className="font-semibold text-stone-700 font-mono">
                    {restoreValidation.summary?.supplierCount || 0} rekanan
                  </span>
                </div>
              </div>
            </div>

            {/* Warning Box */}
            <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl text-xs text-amber-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Peringatan Penimpaan Data</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-900">
                Pemulihan data akan mengganti seluruh data operasional toko saat ini pada perangkat ini dengan data dari file backup. Data baru yang belum dicadangkan akan tertimpa. Pastikan Anda telah membuat cadangan data saat ini jika diperlukan.
              </p>
            </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-3 border-t border-stone-200 shrink-0 flex items-center gap-2">
              <button
                type="button"
                onClick={handleCancelRestore}
                disabled={isRestoring}
                className="w-1/3 py-2.5 rounded-xl border border-stone-300 text-stone-700 font-semibold text-xs hover:bg-stone-50 transition-colors cursor-pointer text-center"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmExecuteRestore}
                disabled={isRestoring}
                className="flex-1 py-2.5 rounded-xl bg-[#294D35] hover:bg-[#1e3827] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 text-[#D6BD7A] ${isRestoring ? 'animate-spin' : ''}`} />
                <span>{isRestoring ? 'Memulihkan Data...' : 'Ya, Pulihkan Data Sekarang'}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Success Toast */}
      {restoreSuccessMsg && createPortal(
        <div className="fixed top-5 right-5 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-4 py-3 rounded-2xl shadow-lg border bg-[#294D35] text-white border-[#4F7655] flex items-center gap-2.5 text-xs font-semibold">
            <CheckCircle2 className="w-5 h-5 text-[#D6BD7A] shrink-0" />
            <div>
              <p className="font-bold">{restoreSuccessMsg}</p>
              <p className="text-[11px] text-stone-200">Sistem sedang memuat ulang data...</p>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
