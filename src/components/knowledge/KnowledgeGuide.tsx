/**
 * JALORA — Rumus & Pengertian Aplikasi (Knowledge Base & Interactive Guide)
 * 
 * Fitur:
 * 1. Panduan lengkap seluruh modul aktual JALORA (Arti, kegunaan, kapan, cara pakai, tombol penting, contoh, kesalahan umum, modul terkait)
 * 2. Kamus istilah bisnis dan rumus akuntansi teruji (Formula, contoh angka riil, interpretasi hasil, status kalkulasi otomatis)
 * 3. Kolom Pencarian Pintar (Smart Search) dengan sinonim, relevansi multi-kata, dan reset instan
 * 4. Kategori filter responsif & artikel populer
 * 5. Visual identitas resmi JALORA (#294D35, #4F7655, #4F7655, #D6BD7A, #F5F0E5, #DCE5D6)
 * 
 * Created by Abdul Jalil
 */

import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Search,
  X,
  ChevronRight,
  ArrowLeft,
  LayoutDashboard,
  ShoppingCart,
  Boxes,
  Truck,
  Wallet,
  Receipt,
  Building,
  UserRound,
  Settings,
  ShieldCheck,
  CreditCard,
  LogOut,
  HelpCircle,
  Sparkles,
  Calculator,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  FileSpreadsheet,
  Info,
  Layers,
  Database,
  Printer,
  Scale,
  Bell,
  Smartphone
} from 'lucide-react';
import { Store, Branch, UserProfile } from '../../types';

export interface GuideArticle {
  id: string;
  title: string;
  category: 'sidebar' | 'pos' | 'inventory' | 'finance' | 'shift' | 'payment' | 'users' | 'settings' | 'database' | 'formula';
  categoryLabel: string;
  icon: any;
  summary: string;
  meaning: string;
  purpose: string;
  whenToUse: string;
  howToUse: string[];
  keyButtonsAndFields: { name: string; description: string }[];
  example: string;
  commonMistakes: string[];
  relatedMenus: { id: string; label: string }[];
  formula?: {
    equation: string;
    exampleCalculation: string;
    interpretation: string;
    isAutomated: boolean;
  };
  keywords: string[];
}

interface KnowledgeGuideProps {
  store: Store;
  branch: Branch;
  user: UserProfile;
  onNavigateMenu?: (menuId: string) => void;
}

export const KNOWLEDGE_ARTICLES: GuideArticle[] = [
  // --- KASIR & TRANSAKSI ---
  {
    id: 'pos-terminal',
    title: 'Kasir (POS — Point of Sale)',
    category: 'pos',
    categoryLabel: 'Kasir & Transaksi',
    icon: ShoppingCart,
    summary: 'Modul checkout penjualan retail cepat dengan proteksi idempotency key, struk thermal, dan struk WhatsApp.',
    meaning: 'Kasir (POS) adalah modul utama transaksi penjualan langsung di toko yang menghubungkan kasir dengan pelanggan.',
    purpose: 'Mencatat penjualan produk, menghitung total belanja, diskon, PPN, memproses aneka metode pembayaran, memotong stok secara real-time, dan mencatat jurnal akuntansi otomatis.',
    whenToUse: 'Digunakan setiap kali ada pembeli yang melakukan transaksi belanja di toko fisik.',
    howToUse: [
      'Pilih atau cari produk melalui kolom pencarian atau filter kategori di sebelah kiri.',
      'Klik tombol tambah (+) pada produk untuk memasukkannya ke keranjang kasir.',
      'Tentukan pelanggan jika walk-in terdaftar, atau biarkan Pelanggan Umum.',
      'Terapkan diskon toko (0%, 5%, 10%) jika berlaku promo.',
      'Tekan tombol "Bayar Sekarang (F8)" atau tombol checkout hijau.',
      'Pilih metode pembayaran (Tunai, QRIS, Transfer, Debit, Kredit, E-Wallet).',
      'Jika Tunai, masukkan uang yang diterima dan periksa nilai kembalian.',
      'Klik "Konfirmasi & Simpan Transaksi" untuk menyelesaikan.',
      'Cetak struk thermal atau kirim struk belanja resmi via WhatsApp Click to Chat.'
    ],
    keyButtonsAndFields: [
      { name: 'Keranjang Kasir', description: 'Daftar barang belanjaan, jumlah pesanan, dan subtotal harga.' },
      { name: 'Diskon Toko (%)', description: 'Potongan harga promo persentase dari subtotal sebelum pajak.' },
      { name: 'Uang Pas / Quick Cash', description: 'Tombol pintas nominal rupiah umum (10k, 20k, 50k, 100k, 200k).' },
      { name: 'Kembalian', description: 'Perhitungan otomatis selisih uang diterima dikurangi total tagihan.' },
      { name: 'Kirim WA', description: 'Membuka WhatsApp Click to Chat resmi dengan nomor format internasional 628.' }
    ],
    example: 'Pelanggan membeli Beras 5 Kg seharga Rp75.000 dan Minyak Goreng 2L Rp35.000 (Total Rp110.000). Pelanggan membayar uang tunai Rp150.000. Kasir memilih metode Tunai, sistem menampilkan kembalian Rp40.000, transaksi disimpan dan struk dicetak.',
    commonMistakes: [
      'Menyelesaikan transaksi tunai ketika uang yang diterima kurang dari total belanja.',
      'Lupa membuka shift kasir (Rekonsiliasi Kas) di awal hari sehingga uang masuk tidak terekam dalam shift aktif.',
      'Menekan tombol berkali-kali saat koneksi lambat (JALORA sudah dilengkapi proteksi idempotency key).'
    ],
    relatedMenus: [
      { id: 'shift', label: 'Rekonsiliasi Kasir' },
      { id: 'inventory', label: 'Produk & Inventaris' },
      { id: 'finance', label: 'Keuangan & Jurnal' }
    ],
    keywords: ['kasir', 'pos', 'jual', 'penjualan', 'struk', 'f8', 'checkout', 'belanja', 'keranjang', 'uang masuk', 'transaksi']
  },
  {
    id: 'payment-methods-guide',
    title: 'Pilihan Metode Pembayaran Kasir',
    category: 'payment',
    categoryLabel: 'Pembayaran',
    icon: CreditCard,
    summary: 'Panduan 6 metode pembayaran resmi JALORA: Tunai, QRIS, Transfer Bank, Kartu Debit, Kartu Kredit, dan E-Wallet.',
    meaning: 'Fitur fleksibilitas pembayaran yang memungkinkan kasir menerima berbagai cara bayar pelanggan sesuai kenyamanan pembeli.',
    purpose: 'Memberikan kepastian pencatatan metode bayar, memisahkan uang fisik laci kasir dengan saldo rekening bank toko.',
    whenToUse: 'Dipilih di layar checkout kasir saat pelanggan hendak menyelesaikan pembayaran tagihan belanja.',
    howToUse: [
      'Pada jendela pembayaran, klik salah satu dari 6 kartu metode pembayaran yang tersedia.',
      'Untuk TUNAI: Masukkan uang diterima atau klik chip uang pecahan. Pastikan kembalian sesuai.',
      'Untuk QRIS: Minta pelanggan scan barcode QRIS toko. Tunggu notifikasi saldo masuk di aplikasi QRIS merchant Anda, lalu konfirmasi.',
      'Untuk TRANSFER BANK: Tunjukkan nomor rekening operasional toko (BCA, Mandiri, BRI). Cek mutasi masuk m-banking kasir/owner, lalu masukkan nomor referensi.',
      'Untuk KARTU DEBIT / KREDIT: Gesek/masukkan kartu pada mesin EDC toko. Masukkan 4 digit kartu atau kode approval EDC pada catatan transaksi.',
      'Untuk E-WALLET: Konfirmasi transfer GoPay/OVO/DANA/ShopeePay pelanggan.'
    ],
    keyButtonsAndFields: [
      { name: 'Tunai (Cash)', description: 'Pembayaran uang kertas/koin fisik yang langsung masuk ke Kas Kasir laci (Akun 1-1001).' },
      { name: 'QRIS Dinamis/Statis', description: 'Pembayaran kode QR standar Indonesia yang masuk ke Bank Operasional (Akun 1-1002).' },
      { name: 'Transfer Bank', description: 'Transfer antar rekening langsung ke rekening resmi toko.' },
      { name: 'Kartu Debit & Kredit', description: 'Transaksi via mesin EDC toko dengan bukti struk fisik EDC.' },
      { name: 'No. Referensi', description: 'Kolom catatan nomor approval EDC, RRN QRIS, atau nama pengirim transfer.' }
    ],
    example: 'Pembeli memilih bayar via QRIS senilai Rp45.000. Kasir memilih kartu "QRIS Dinamis", pelanggan scan QRIS Toko Berkah. Begitu kasir menerima notifikasi masuk di ponsel merchant, kasir klik "Konfirmasi & Simpan".',
    commonMistakes: [
      'Mengonfirmasi pembayaran non-tunai sebelum memeriksa mutasi dana atau struk EDC berhasil keluar.',
      'Menganggap status QRIS/Transfer terverifikasi otomatis oleh bank (JALORA mencatat konfirmasi manual kasir yang jujur dan aman tanpa ketergantungan API pihak ketiga yang rentan error).'
    ],
    relatedMenus: [
      { id: 'pos', label: 'Kasir (POS)' },
      { id: 'finance', label: 'Keuangan & Jurnal' },
      { id: 'settings', label: 'Profil Toko & Sistem' }
    ],
    keywords: ['cara bayar', 'pembayaran', 'tunai', 'cash', 'qris', 'transfer', 'debit', 'kredit', 'edc', 'ewallet', 'gopay', 'ovo', 'dana']
  },

  // --- PRODUK & INVENTARIS ---
  {
    id: 'inventory-guide',
    title: 'Produk & Inventaris',
    category: 'inventory',
    categoryLabel: 'Produk & Stok',
    icon: Boxes,
    summary: 'Katalog barang dagang, manajemen SKU/barcode, penetapan harga modal vs harga jual, batas stok minimum, dan valuasi.',
    meaning: 'Pusat manajemen master data barang dagang dan saldo stok fisik yang dimiliki oleh toko di masing-masing cabang.',
    purpose: 'Mencegah kehabisan stok barang laris, memantau perputaran produk, dan menjaga nilai persediaan barang dagang toko.',
    whenToUse: 'Saat menambahkan barang baru, memperbarui harga jual, mengatur batas stok minimum, atau memantau sisa stok barang.',
    howToUse: [
      'Buka menu Produk & Inventaris dari sidebar.',
      'Klik tombol "Tambah Produk Baru" untuk menambahkan master barang.',
      'Isi Nama Produk, Kategori, Satuan (Pcs, Box, Kg, Liter, dll.), dan SKU/Barcode unik.',
      'Tentukan Harga Pokok (Modal) dan Harga Jual eceran.',
      'Tentukan Batas Stok Minimum (misal: 5 pcs) agar sistem otomatis memberi alarm saat barang menipis.',
      'Gunakan tombol Edit atau Hapus untuk pemeliharaan katalog.'
    ],
    keyButtonsAndFields: [
      { name: 'SKU / Barcode', description: 'Kode identitas unik barang untuk pencarian cepat dan pemindaian barcode.' },
      { name: 'Harga Modal (HPP)', description: 'Biaya perolehan barang per unit yang dihitung dengan metode Moving Weighted Average.' },
      { name: 'Harga Jual', description: 'Harga eceran yang ditagihkan kepada pembeli di kasir POS.' },
      { name: 'Stok Minimum', description: 'Ambang batas sisa stok sebelum produk masuk daftar prioritas kulakan.' }
    ],
    example: 'Toko menambahkan "Minyak Goreng Sawit 2L" dengan SKU "MNY-002", harga modal Rp30.000, harga jual Rp36.000, stok minimum 10 botol. Ketika stok sisa 8, dashboard akan langsung memberi peringatan kulakan.',
    commonMistakes: [
      'Menetapkan harga jual lebih rendah dari harga modal barang.',
      'Tidak mengisi batas stok minimum sehingga produk sering kosong tanpa disadari.',
      'Mengubah stok secara manual tanpa melalui Stok Opname atau Penerimaan Pembelian.'
    ],
    relatedMenus: [
      { id: 'dashboard', label: 'Dashboard' },
      { id: 'purchasing', label: 'Pembelian & Pemasok' },
      { id: 'pos', label: 'Kasir (POS)' }
    ],
    keywords: ['produk', 'inventaris', 'barang', 'sku', 'barcode', 'stok', 'stok habis', 'harga modal', 'harga jual', 'katalog']
  },
  {
    id: 'stock-opname-guide',
    title: 'Stok Opname & Mutasi Stok',
    category: 'inventory',
    categoryLabel: 'Produk & Stok',
    icon: Layers,
    summary: 'Penghitungan fisik stok gudang secara periodik dengan verifikasi PIN transaksi dan pencatatan riwayat kartu stok.',
    meaning: 'Kegiatan pencocokan antara jumlah fisik barang nyata di rak/gudang dengan angka catatan saldo sistem.',
    purpose: 'Menemukan selisih fisik barang akibat kerusakan, kadaluarsa, kebocoran, atau kehilangan, serta mengoreksi data stok ke angka riil.',
    whenToUse: 'Dilakukan secara berkala (mingguan atau bulanan) atau saat terjadi indikasi perbedaan fisik barang.',
    howToUse: [
      'Buka tab "Stok Opname" di menu Produk & Inventaris.',
      'Pilih produk yang akan disesuaikan fisiknya.',
      'Masukkan jumlah fisik hasil hitungan nyata di rak toko.',
      'Tulis alasan penyesuaian (contoh: "Kemasan bocor", "Selisih hitung mingguan").',
      'Masukkan 6-digit PIN Transaksi untuk otorisasi keamanan.',
      'Sistem akan mencatat mutasi stok opname dan memperbarui saldo persediaan.'
    ],
    keyButtonsAndFields: [
      { name: 'Fisik Aktual', description: 'Jumlah barang riil yang dihitung kasir/staf di rak pajangan.' },
      { name: 'Alasan Opname', description: 'Keterangan audit wajib agar pemilik mengetahui asal-usul selisih barang.' },
      { name: 'PIN Transaksi', description: 'Kunci pengaman 6-digit untuk mencegah manipulasi stok oleh oknum.' }
    ],
    example: 'Catatan sistem menunjukkan Beras 5 Kg ada 20 karung, namun di rak hanya tersisa 18 karung karena 2 karung rusak digigit tikus. Kasir melakukan stok opname menjadi 18 karung dengan alasan "2 karung rusak".',
    commonMistakes: [
      'Melakukan stok opname tanpa menghitung fisik barang secara jujur di lapangan.',
      'Membagikan PIN transaksi kepada pihak yang tidak berhak.'
    ],
    relatedMenus: [
      { id: 'inventory', label: 'Produk & Inventaris' },
      { id: 'purchasing', label: 'Pembelian & Pemasok' }
    ],
    keywords: ['stok opname', 'mutasi stok', 'hitung fisik', 'kartu stok', 'selisih stok', 'barang rusak', 'pin transaksi']
  },

  // --- PEMBELIAN & PEMASOK ---
  {
    id: 'purchasing-guide',
    title: 'Pembelian & Pemasok',
    category: 'inventory',
    categoryLabel: 'Produk & Stok',
    icon: Truck,
    summary: 'Pengadaan barang dagang dari supplier, termin tempo/tunai, dan perhitungan Moving Weighted Average otomatis.',
    meaning: 'Modul kulakan barang untuk mengisi kembali stok dagangan toko dari distributor atau pemasok.',
    purpose: 'Mencatat transaksi kulakan, memperbarui stok masuk, menghitung HPP rata-rata bergerak, dan mencatat utang supplier jika tempo.',
    whenToUse: 'Saat menerima kiriman barang dagang baru dari supplier atau saat melakukan order pengadaan.',
    howToUse: [
      'Buka menu Pembelian & Pemasok.',
      'Pilih pemasok yang sudah terdaftar atau tambahkan pemasok baru beserta termin tempo.',
      'Pilih barang yang dibeli, jumlah barang masuk, dan harga beli per unit dari faktur.',
      'Tentukan metode pembayaran: Tunai (langsung lunas) atau Kredit/Tempo.',
      'Simpan penerimaan pembelian.',
      'Stok barang langsung bertambah dan HPP barang otomatis diperbarui.'
    ],
    keyButtonsAndFields: [
      { name: 'Termin Tempo (Hari)', description: 'Jangka waktu pembayaran faktur supplier (misal: 0 untuk tunai, 14 atau 30 hari).' },
      { name: 'Harga Beli Faktur', description: 'Harga modal baru dari distributor yang akan diintegrasikan ke rata-rata tertimbang.' },
      { name: 'Penerimaan PO', description: 'Tombol untuk menyelesaikan proses pengadaan barang masuk ke gudang toko.' }
    ],
    example: 'Toko membeli 50 karton Susu UHT dari PT Sumber Makmur seharga Rp120.000/karton dengan tempo 14 hari. Sistem menambah stok susu 50 karton dan otomatis mencatat Utang Usaha Rp6.000.000 di modul keuangan.',
    commonMistakes: [
      'Lupa mencatat pembelian ketika barang datang, sehingga stok di kasir menjadi minus.',
      'Keliru memasukkan harga beli satuan vs harga beli per karton/dus.'
    ],
    relatedMenus: [
      { id: 'inventory', label: 'Produk & Inventaris' },
      { id: 'finance', label: 'Keuangan & Jurnal' }
    ],
    keywords: ['pembelian', 'pemasok', 'supplier', 'kulakan', 'moving average', 'uang keluar', 'faktur', 'tempo', 'utang']
  },

  // --- KEUANGAN & JURNAL ---
  {
    id: 'finance-guide',
    title: 'Keuangan & Jurnal Akuntansi',
    category: 'finance',
    categoryLabel: 'Keuangan & Akuntansi',
    icon: Wallet,
    summary: 'Sistem pembukuan double-entry berstandar akuntansi: Jurnal Umum, Buku Besar, Neraca Saldo, dan Bagan Akun.',
    meaning: 'Pusat catatan finansial resmi yang mencatat seluruh aliran dana masuk dan keluar dengan prinsip Debit = Kredit berimbang.',
    purpose: 'Menghasilkan laporan keuangan yang akurat, mencegah kebocoran dana, dan memantau aset serta kewajiban toko.',
    whenToUse: 'Dipantau setiap hari atau di akhir periode untuk mengevaluasi kesehatan finansial usaha.',
    howToUse: [
      'Buka menu Keuangan & Jurnal.',
      'Tab Laporan: Lihat Laba Rugi, Neraca, dan Arus Kas.',
      'Tab Jurnal: Telusuri seluruh riwayat jurnal otomatis dari kasir POS dan pembelian.',
      'Gunakan tombol "Tambah Jurnal Manual" untuk mencatat beban seperti bayar listrik, sewa ruko, atau prive pemilik.',
      'Tab Buku Besar: Telusuri mutasi mutlak per akun tertentu (Kas, Bank, Persediaan, dll.).',
      'Tab Utang & Piutang: Kelola pelunasan tagihan tempo pelanggan dan supplier.'
    ],
    keyButtonsAndFields: [
      { name: 'Chart of Accounts (COA)', description: 'Daftar kode akun standar (1-1001 Kas, 1-1002 Bank, 4-1001 Penjualan, dll.).' },
      { name: 'Jurnal Manual Berimbang', description: 'Formulir input jurnal dengan validasi wajib total Debit sama persis dengan total Kredit.' },
      { name: 'Pelunasan Piutang/Utang', description: 'Tombol untuk mencatat cicilan atau pelunasan tagihan tempo.' }
    ],
    example: 'Pemilik membayar listrik toko Rp500.000 dari rekening bank. Pemilik membuat jurnal manual: Debit Beban Operasional Toko (6-1001) Rp500.000, Kredit Bank Operasional (1-1002) Rp500.000. Jurnal berimbang Rp500.000.',
    commonMistakes: [
      'Membuat jurnal manual dengan total debit dan kredit yang tidak berimbang.',
      'Mencampuradukkan pengeluaran pribadi dengan biaya operasional toko.'
    ],
    relatedMenus: [
      { id: 'dashboard', label: 'Dashboard' },
      { id: 'shift', label: 'Rekonsiliasi Kasir' },
      { id: 'pos', label: 'Kasir (POS)' }
    ],
    keywords: ['keuangan', 'jurnal', 'buku besar', 'neraca', 'laba rugi', 'debit', 'kredit', 'coa', 'akuntansi', 'uang masuk', 'uang keluar']
  },

  // --- REKONSILIASI KASIR ---
  {
    id: 'cash-reconciliation-guide',
    title: 'Rekonsiliasi Kasir (Shift)',
    category: 'shift',
    categoryLabel: 'Laporan & Rekonsiliasi',
    icon: Receipt,
    summary: 'Pengelolaan sesi shift kasir, pencatatan kas masuk/keluar laci, dan perhitungan selisih kas fisik vs sistem.',
    meaning: 'Proses pembuktian kebenaran uang fisik yang ada di laci kasir terhadap seluruh transaksi penjualan selama kasir bertugas.',
    purpose: 'Mencegah kehilangan uang laci kasir, memantau pengeluaran kecil toko (petty cash), dan mendeteksi selisih lebih/kurang.',
    whenToUse: 'Dilakukan setiap pergantian shift kasir atau saat toko buka di pagi hari dan tutup di malam hari.',
    howToUse: [
      'Pagi Hari: Buka shift dengan memasukkan Saldo Kas Awal (modal uang kembalian, misal: Rp200.000).',
      'Selama Toko Buka: Setiap kali ada pengeluaran kecil (beli lakban, isi bensin kurir), gunakan tombol "Catat Kas Keluar".',
      'Setiap kali ada tambahan uang kasir selain penjualan, gunakan tombol "Catat Kas Masuk".',
      'Malam Hari (Tutup Toko): Kasir menghitung seluruh uang tunai fisik yang ada di laci.',
      'Klik tombol "Tutup Sesi Kasir", masukkan jumlah uang fisik yang dihitung.',
      'Sistem akan otomatis menghitung selisih kas: Jika pas (Rp0), jika kurang (selisih minus), jika lebih (selisih plus).'
    ],
    keyButtonsAndFields: [
      { name: 'Saldo Awal (Opening Cash)', description: 'Uang pecahan kecil yang disediakan di laci untuk modal kembalian belanja.' },
      { name: 'Kas Masuk (Cash In)', description: 'Penyetoran uang modal tambahan ke dalam laci selama shift berlangsung.' },
      { name: 'Kas Keluar (Cash Out)', description: 'Pengambilan uang tunai laci untuk keperluan operasional darurat.' },
      { name: 'Kas Fisik Aktual', description: 'Jumlah uang riil hasil hitungan tangan kasir saat penutupan shift.' },
      { name: 'Kas Seharusnya (Expected Cash)', description: 'Saldo Awal + Penjualan Tunai + Kas Masuk - Kas Keluar.' }
    ],
    example: 'Saldo awal Rp200.000. Penjualan tunai hari ini Rp1.500.000. Kas keluar beli kresek Rp20.000. Kas yang seharusnya ada di laci = Rp1.680.000. Saat kasir hitung fisik ada Rp1.680.000, selisih Rp0 (Pas/Sempurna).',
    commonMistakes: [
      'Kasir mengambil uang dari laci untuk beli perlengkapan toko tanpa mencatatnya di menu "Kas Keluar".',
      'Tidak menghitung uang fisik secara teliti sebelum memasukkan angka penutupan shift.'
    ],
    relatedMenus: [
      { id: 'pos', label: 'Kasir (POS)' },
      { id: 'finance', label: 'Keuangan & Jurnal' }
    ],
    keywords: ['rekonsiliasi', 'shift', 'kasir', 'laci kas', 'selisih kas', 'kas masuk', 'kas keluar', 'closing', 'tutup toko']
  },

  // --- CABANG TOKO ---
  {
    id: 'branches-guide',
    title: 'Cabang Toko (Multi-Branch)',
    category: 'settings',
    categoryLabel: 'Pengaturan Sistem',
    icon: Building,
    summary: 'Manajemen multi-cabang terpadu untuk memisahkan stok barang, laporan penjualan, dan kas laci antar lokasi toko.',
    meaning: 'Fitur arsitektur multi-toko JALORA yang memungkinkan satu akun pemilik mengelola banyak outlet atau gudang cabang.',
    purpose: 'Memastikan setiap cabang memiliki pembukuan dan stok independen, namun tetap dapat dipantau dari satu dashboard pusat.',
    whenToUse: 'Saat bisnis membuka cabang outlet baru atau memindahkan operasional staf ke cabang lain.',
    howToUse: [
      'Buka menu Cabang Toko dari sidebar atau Pengaturan.',
      'Klik tombol "Tambah Cabang Baru".',
      'Isi Nama Cabang (misal: "Cabang Rungkut"), Kode Cabang unik (misal: "CAB-02"), Telepon, dan Alamat.',
      'Pilih cabang aktif di pojok kiri atas header untuk beralih antar cabang.'
    ],
    keyButtonsAndFields: [
      { name: 'Kode Cabang', description: 'Prefix pengenal cabang yang disematkan pada nomor faktur transaksi (misal: INV-CAB01-...).' },
      { name: 'Cabang Utama', description: 'Cabang sentral default yang pertama kali dibuka saat sistem diinisialisasi.' },
      { name: 'Pilih Cabang Aktif', description: 'Pengganti konteks cabang untuk melihat stok dan penjualan lokasi tersebut.' }
    ],
    example: 'Toko Berkah Utama memiliki Cabang Utama (Ahmad Yani) dan Cabang 2 (Rungkut). Penjualan di kasir Rungkut hanya akan memotong persediaan barang yang ada di Cabang Rungkut.',
    commonMistakes: [
      'Melakukan transaksi di cabang yang salah karena lupa memeriksa indikator cabang aktif di header atas.'
    ],
    relatedMenus: [
      { id: 'dashboard', label: 'Dashboard' },
      { id: 'inventory', label: 'Produk & Inventaris' },
      { id: 'settings', label: 'Profil Toko & Sistem' }
    ],
    keywords: ['cabang', 'multi-branch', 'outlet', 'gudang', 'lokasi toko', 'cab-01', 'cab-02']
  },

  // --- PENGGUNA & PERAN ---
  {
    id: 'users-roles-guide',
    title: 'Pengguna & Peran (Role RBAC)',
    category: 'users',
    categoryLabel: 'Pengguna & Keamanan',
    icon: UserRound,
    summary: 'Pembagian wewenang hak akses (OWNER, MANAGER, KASIR) dan pengamanan transaksi menggunakan PIN 6-digit.',
    meaning: 'Sistem keamanan berbasis peran (Role-Based Access Control) yang membatasi hak akses menu sesuai jabatan staf.',
    purpose: 'Mencegah kasir membuka laporan keuangan rahasia pemilik toko dan melindungi data penting dari modifikasi tanpa izin.',
    whenToUse: 'Saat mendaftarkan staf kasir baru, mengganti manajer toko, atau mereset PIN transaksi pengguna yang terkunci.',
    howToUse: [
      'Buka tab "Pengguna & Peran" di menu Pengaturan.',
      'Klik "Tambah Pengguna Baru".',
      'Pilih Peran yang sesuai: OWNER (Akses penuh), MANAGER (Operasional & stok), KASIR (POS & Rekonsiliasi).',
      'Tetapkan PIN Transaksi 6-angka awal.',
      'Jika pengguna salah memasukkan PIN sebanyak 5 kali, akun otomatis terkunci dan dapat di-reset oleh Owner.'
    ],
    keyButtonsAndFields: [
      { name: 'Peran OWNER', description: 'Pemilik usaha dengan akses penuh ke seluruh modul, keuangan, dan pengaturan.' },
      { name: 'Peran MANAGER', description: 'Pengawas operasional yang dapat mengelola stok, pembelian, dan harga.' },
      { name: 'Peran KASIR', description: 'Staf kasir yang difokuskan pada transaksi POS dan rekonsiliasi shift laci.' },
      { name: 'Auto-Lock PIN', description: 'Proteksi otomatis pembekuan akun saat terjadi percobaan PIN salah 5 kali berturut-turut.' }
    ],
    example: 'Pemilik mengangkat Budi sebagai Kasir. Budi hanya dapat membuka kasir POS dan shift-nya sendiri, tanpa bisa melihat total laba bersih atau mengubah modal pemilik di buku besar.',
    commonMistakes: [
      'Memberikan peran OWNER kepada kasir yang baru bekerja.',
      'Memakai PIN transaksi yang terlalu mudah ditebak seperti 123456 atau tanggal lahir.'
    ],
    relatedMenus: [
      { id: 'settings', label: 'Profil Toko & Sistem' },
      { id: 'dashboard', label: 'Dashboard' }
    ],
    keywords: ['pengguna', 'user', 'role', 'peran', 'owner', 'manager', 'kasir', 'pin', 'kunci akun', 'keamanan']
  },

  // --- PRINTER STRUK ---
  {
    id: 'printer-guide',
    title: 'Printer Struk & Format Cetak',
    category: 'settings',
    categoryLabel: 'Pengaturan Sistem',
    icon: Printer,
    summary: 'Konfigurasi printer thermal receipt 58mm & 80mm, header nota belanja, dan catatan kaki struk.',
    meaning: 'Pengaturan perangkat keras pencetakan nota fisik belanja pelanggan di kasir.',
    purpose: 'Menghasilkan bukti pembayaran fisik yang rapi, profesional, dan sesuai dengan lebar kertas printer kasir toko.',
    whenToUse: 'Saat memasang printer struk baru atau memperbarui pesan ucapan di bagian bawah nota belanja.',
    howToUse: [
      'Buka tab "Printer Struk" di menu Pengaturan.',
      'Pilih ukuran kertas: 58mm (Kompak/Mini) atau 80mm (Standar Toko Besar).',
      'Atur jumlah salinan cetak (1 rangkap atau 2 rangkap untuk arsip kasir).',
      'Tulis catatan kaki struk (misal: "Barang yang sudah dibeli tidak dapat ditukar").',
      'Klik tombol "Simpan Konfigurasi Printer".'
    ],
    keyButtonsAndFields: [
      { name: 'Lebar 58mm', description: 'Format cetak paling hemat untuk printer thermal mini USB/Bluetooth.' },
      { name: 'Lebar 80mm', description: 'Format cetak lebar untuk printer kasir supermarket / minimarket.' },
      { name: 'Catatan Kaki (Footer)', description: 'Teks penutup struk yang dapat diubah sesuai kebijakan toko.' }
    ],
    example: 'Toko Berkah menggunakan printer USB ukuran 58mm. Pemilik mengatur footer struk: "Terima kasih atas kunjungan Anda! Ikuti Instagram @tokoberkah". Hasil cetak akan selalu mencantumkan pesan tersebut.',
    commonMistakes: [
      'Memilih format 80mm padahal printer yang digunakan berukuran 58mm, sehingga tulisan di struk terpotong.'
    ],
    relatedMenus: [
      { id: 'pos', label: 'Kasir (POS)' },
      { id: 'settings', label: 'Profil Toko & Sistem' }
    ],
    keywords: ['printer', 'cetak struk', 'thermal', '58mm', '80mm', 'nota', 'kertas kasir', 'footer struk']
  },

  // --- NOTIFIKASI & SUARA TRANSAKSI ---
  {
    id: 'sound-notifications-guide',
    title: 'Notifikasi & Suara Transaksi Kasir',
    category: 'settings',
    categoryLabel: 'Perangkat & Notifikasi',
    icon: Bell,
    summary: 'Sistem umpan balik lonceng audio kasir, getaran haptic perangkat, dan toast notifikasi visual instan saat pembayaran berhasil.',
    meaning: 'Fitur konfirmasi kasir yang memberikan kepastian suara dan visual bahwa transaksi telah sah dan tersimpan aman di database.',
    purpose: 'Memastikan kasir dan pembeli mendengar bunyi konfirmasi belanja yang jelas dan meyakinkan tanpa risiko salah input.',
    whenToUse: 'Dikonfigurasi pada menu Pengaturan > Notifikasi & Suara.',
    howToUse: [
      'Buka menu "Notifikasi & Suara" di Pengaturan.',
      'Aktifkan sakelar "Suara Notifikasi Transaksi".',
      'Atur tingkat volume yang diinginkan (10% hingga 100%).',
      'Tekan tombol "Tes Bunyi Sekarang" untuk mendengarkan sampel lonceng.',
      'Aktifkan opsi "Getaran Umpan Balik" jika kasir menggunakan smartphone atau tablet.'
    ],
    keyButtonsAndFields: [
      { name: 'Suara Notifikasi Transaksi', description: 'Sakelar mengaktifkan/menonaktifkan lonceng konfirmasi POS.' },
      { name: 'Tingkat Volume', description: 'Pengatur kenyamanan intensitas suara lonceng di toko.' },
      { name: 'Uji Coba Lonceng', description: 'Pratinjau audio instan tanpa perlu memproses transaksi riil.' }
    ],
    example: 'Kasir menyelesaikan pembayaran Rp 150.000 dengan QRIS. Saat menekan Konfirmasi, terdengar lonceng kasir "Ting-Ting!" yang elegan dan muncul spanduk hijau bahwa pembayaran berhasil.',
    commonMistakes: [
      'Menonaktifkan suara saat toko sedang ramai sehingga kasir tidak mendengar konfirmasi pembayaran sukses.'
    ],
    relatedMenus: [
      { id: 'notifications', label: 'Notifikasi & Suara' },
      { id: 'pos', label: 'Kasir (POS)' }
    ],
    keywords: ['suara transaksi', 'notifikasi', 'lonceng kasir', 'chime', 'audio', 'getar', 'haptic', 'volume']
  },

  // --- INSTALASI APLIKASI (PWA) ---
  {
    id: 'pwa-install-guide',
    title: 'Instalasi Aplikasi JALORA (PWA)',
    category: 'settings',
    categoryLabel: 'Perangkat & Notifikasi',
    icon: Smartphone,
    summary: 'Pemasangan aplikasi JALORA di layar utama perangkat Android, iPhone/iPad, dan laptop tanpa bilah alamat browser.',
    meaning: 'Teknologi Progressive Web App (PWA) yang memungkinkan JALORA dipasang dan dioperasikan layaknya aplikasi toko mandiri.',
    purpose: 'Memberikan akses cepat satu ketukan dari beranda perangkat dan tampilan layar penuh (fullscreen) yang luas untuk kasir.',
    whenToUse: 'Direkomendasikan dipasang di semua smartphone staf dan komputer kasir.',
    howToUse: [
      'Klik tombol "Instal Aplikasi" pada header atas atau sidebar aplikasi.',
      'Pilih jenis perangkat Anda (Android, iPhone/iPad, atau Komputer).',
      'Tekan tombol "Download Aplikasi" atau ikuti langkah sesuai browser Anda.',
      'Buka aplikasi langsung dari ikon JALORA yang muncul di layar utama.'
    ],
    keyButtonsAndFields: [
      { name: 'Download Aplikasi', description: 'Memicu dialog instalasi resmi peramban perangkat.' },
      { name: 'Petunjuk Perangkat', description: 'Panduan langkah manual untuk Chrome, Safari iOS, dan Desktop.' }
    ],
    example: 'Pemilik membuka JALORA di Safari iPhone, memilih Bagikan lalu "Tambahkan ke Layar Utama". Aplikasi JALORA kini terbuka fullscreen tanpa bilah URL Safari.',
    commonMistakes: [
      'Mencari JALORA di toko aplikasi umum tanpa memasangnya langsung dari tombol resmi yang tersedia di aplikasi.'
    ],
    relatedMenus: [
      { id: 'settings', label: 'Profil Toko & Sistem' },
      { id: 'dashboard', label: 'Dashboard' }
    ],
    keywords: ['instal aplikasi', 'pwa', 'fullscreen', 'layar penuh', 'android', 'iphone', 'ipad', 'laptop', 'desktop']
  },

  // --- LOGOUT & KEAMANAN AKUN ---
  {
    id: 'logout-security-guide',
    title: 'Logout & Keamanan Sesi Akun',
    category: 'users',
    categoryLabel: 'Pengguna & Keamanan',
    icon: LogOut,
    summary: 'Mekanisme keluar akun aman, pembersihan sesi Supabase Auth, pembersihan storage sesi, dan sanitasi navigasi browser.',
    meaning: 'Fitur proteksi akhir sesi yang mengunci halaman privat toko saat kasir atau pemilik selesai menggunakan aplikasi.',
    purpose: 'Mencegah orang lain mengakses transaksi toko atau melakukan penjualan palsu setelah operator meninggalkan kasir.',
    whenToUse: 'Dilakukan setiap kali pergantian operator kasir, saat kasir pulang, atau saat meninggalkan perangkat.',
    howToUse: [
      'Klik tombol ikon Logout di pojok kanan atas header samping nama pengguna, atau tombol "Keluar Akun" di drawer mobile.',
      'Modal Konfirmasi Keluar Akun resmi JALORA akan muncul menampilkan nama pengguna dan peran aktif.',
      'Klik tombol merah "Ya, Keluar Akun".',
      'Sistem akan memproses sign-out Supabase, membersihkan session storage, dan mengembalikan tampilan ke halaman login awal.',
      'Data transaksi, stok, laporan, dan pengaturan toko tetap tersimpan aman di database.'
    ],
    keyButtonsAndFields: [
      { name: 'Tombol Logout Header', description: 'Ikon pintu keluar di samping nama pengguna aktif.' },
      { name: 'Modal Konfirmasi', description: 'Dialog protektif in-app yang ramah lingkungan iframe tanpa dialog browser yang rentan macet.' },
      { name: 'Sanitasi Navigasi', description: 'Pembersihan riwayat browser agar penekanan tombol Back tidak membuka kembali sesi privat.' }
    ],
    example: 'Kasir Siti selesai bertugas pada pukul 14.00. Siti menekan tombol Logout, mengonfirmasi di modal, dan layar kembali ke halaman login. Kasir Budi kemudian masuk menggunakan nomor HP dan PIN-nya sendiri.',
    commonMistakes: [
      'Menutup browser tanpa logout di komputer kasir umum yang dapat diakses orang lain.'
    ],
    relatedMenus: [
      { id: 'users', label: 'Pengguna & Peran' },
      { id: 'shift', label: 'Rekonsiliasi Kasir' }
    ],
    keywords: ['logout', 'keluar', 'keluar akun', 'sesi', 'keamanan', 'signout', 'ganti kasir', 'tutup akun']
  },

  // --- KAMUS ISTILAH & RUMUS BISNIS ---
  {
    id: 'formula-laba-kotor',
    title: 'Rumus: Laba Kotor (Gross Profit)',
    category: 'formula',
    categoryLabel: 'Kamus Istilah & Rumus',
    icon: Calculator,
    summary: 'Keuntungan penjualan barang dagang sebelum dikurangi biaya operasional toko.',
    meaning: 'Laba kotor adalah selisih positif antara pendapatan penjualan bersih dengan beban pokok barang yang terjual (HPP).',
    purpose: 'Mengukur efektivitas margin keuntungan barang dagang yang dijual toko.',
    whenToUse: 'Dianalisis setiap hari di Dashboard Overview dan Laporan Laba Rugi Keuangan.',
    howToUse: [
      'Hitung seluruh Penjualan Bersih (Total penjualan kasir setelah diskon dan retur).',
      'Hitung total Harga Pokok Penjualan (HPP) dari barang yang terjual.',
      'Kurangkan Penjualan Bersih dengan HPP.'
    ],
    keyButtonsAndFields: [
      { name: 'Penjualan Bersih', description: 'Omzet nyata yang masuk dari pembeli.' },
      { name: 'HPP', description: 'Modal awal saat kulakan barang tersebut.' }
    ],
    example: 'Penjualan bersih hari ini Rp5.000.000. Total harga modal (HPP) dari seluruh barang yang laku adalah Rp3.800.000. Maka Laba Kotor = Rp5.000.000 − Rp3.800.000 = Rp1.200.000.',
    commonMistakes: [
      'Mengira bahwa seluruh uang omzet penjualan adalah keuntungan yang bisa diambil pemilik usaha.',
      'Lupa memperhitungkan potongan diskon dalam penjualan bersih.'
    ],
    relatedMenus: [
      { id: 'dashboard', label: 'Dashboard' },
      { id: 'finance', label: 'Keuangan & Jurnal' }
    ],
    formula: {
      equation: 'Laba Kotor = Penjualan Bersih − Harga Pokok Penjualan (HPP)',
      exampleCalculation: 'Rp5.000.000 − Rp3.800.000 = Rp1.200.000',
      interpretation: 'Toko menghasilkan margin laba kotor sebesar 24% dari omzet penjualan sebelum dipotong biaya listrik dan gaji.',
      isAutomated: true
    },
    keywords: ['laba kotor', 'untung', 'gross profit', 'rumus laba', 'margin laba', 'keuntungan', 'hpp']
  },
  {
    id: 'formula-moving-average',
    title: 'Rumus: Moving Weighted Average (HPP Rata-Rata)',
    category: 'formula',
    categoryLabel: 'Kamus Istilah & Rumus',
    icon: TrendingUp,
    summary: 'Metode penilaian persediaan barang dagang yang menghitung ulang harga modal setiap ada pembelian baru.',
    meaning: 'Metode akuntansi resmi JALORA untuk menghitung nilai modal barang saat harga beli dari distributor berubah-ubah naik turun.',
    purpose: 'Mencegah distorsi laba rugi akibat fluktuasi harga pasar sembako dan barang kebutuhan pokok.',
    whenToUse: 'Otomatis dihitung oleh mesin JALORA setiap kali transaksi Penerimaan Pembelian disimpan.',
    howToUse: [
      'Kalikan stok sisa lama dengan HPP lama untuk mendapatkan Nilai Persediaan Lama.',
      'Kalikan stok barang masuk baru dengan Harga Beli Baru untuk mendapatkan Nilai Pembelian Baru.',
      'Jumlahkan kedua nilai tersebut, lalu bagi dengan Total Jumlah Stok Keseluruhan.'
    ],
    keyButtonsAndFields: [
      { name: 'Stok Lama & HPP Lama', description: 'Jumlah barang dan biaya modal per unit sebelum kulakan baru datang.' },
      { name: 'Stok Baru & Harga Beli', description: 'Faktur pengadaan barang baru dari pemasok.' }
    ],
    example: 'Di toko ada sisa 10 bungkus kopi HPP Rp10.000 (Nilai: Rp100.000). Toko membeli lagi 20 bungkus kopi dengan harga beli baru Rp13.000 (Nilai: Rp260.000). Total nilai = Rp360.000. Total stok = 30 bungkus. HPP baru = Rp360.000 ÷ 30 = Rp12.000/bungkus.',
    commonMistakes: [
      'Menetapkan HPP hanya berdasarkan harga beli barang terakhir tanpa memperhitungkan stok lama yang masih ada.',
      'Menghitung secara manual (JALORA secara matematis menghitung formula ini secara atomik di storage engine).'
    ],
    relatedMenus: [
      { id: 'purchasing', label: 'Pembelian & Pemasok' },
      { id: 'inventory', label: 'Produk & Inventaris' }
    ],
    formula: {
      equation: 'HPP Baru = (Nilai Stok Lama + Nilai Pembelian Baru) ÷ (Jumlah Stok Lama + Jumlah Barang Masuk)',
      exampleCalculation: '(Rp100.000 + Rp260.000) ÷ (10 + 20) = Rp360.000 ÷ 30 = Rp12.000/unit',
      interpretation: 'Setiap kali produk tersebut terjual di kasir, biaya modal yang didebitkan ke HPP adalah Rp12.000/unit.',
      isAutomated: true
    },
    keywords: ['moving average', 'hpp', 'harga modal', 'rata-rata bergerak', 'valuasi stok', 'kulakan', 'rumus hpp']
  },
  {
    id: 'formula-selisih-kas',
    title: 'Rumus: Selisih Kas Shift (Over / Short)',
    category: 'formula',
    categoryLabel: 'Kamus Istilah & Rumus',
    icon: Scale,
    summary: 'Perhitungan selisih antara uang fisik di laci dengan saldo kas yang seharusnya menurut sistem.',
    meaning: 'Indikator audit harian kasir untuk memastikan uang fisik yang diserahkan sesuai dengan rekaman transaksi.',
    purpose: 'Mendeteksi adanya uang kembalian salah, nota kasir terlewat, atau uang kasir tercecer.',
    whenToUse: 'Dihitung saat penutupan shift kasir pada menu Rekonsiliasi Kasir.',
    howToUse: [
      'Hitung seluruh uang fisik tunai di laci kasir (Koin + Uang Kertas).',
      'Lihat angka "Kas Seharusnya" yang dihitung sistem dari modal awal + penjualan tunai + kas masuk − kas keluar.',
      'Kurangkan Kas Fisik Aktual dengan Kas Seharusnya.'
    ],
    keyButtonsAndFields: [
      { name: 'Kas Fisik Aktual', description: 'Jumlah uang nyata yang ada di laci.' },
      { name: 'Expected Cash', description: 'Saldo perhitungan sistem berdasarkan riwayat mutasi.' },
      { name: 'Selisih Pas (Rp0)', description: 'Hasil ideal, kasir tertib dan akurat 100%.' }
    ],
    example: 'Kas Seharusnya di laci adalah Rp1.450.000. Saat kasir menghitung fisik ada Rp1.440.000. Selisih = Rp1.440.000 − Rp1.450.000 = -Rp10.000 (Selisih Kurang Rp10.000).',
    commonMistakes: [
      'Menyamakan uang fisik dengan angka sistem secara rekayasa tanpa menghitung uang fisik nyata.',
      'Memasukkan uang transaksi non-tunai (QRIS/Transfer) ke dalam hitungan fisik laci kasir tunai.'
    ],
    relatedMenus: [
      { id: 'shift', label: 'Rekonsiliasi Kasir' },
      { id: 'finance', label: 'Keuangan & Jurnal' }
    ],
    formula: {
      equation: 'Selisih Kas = Kas Fisik yang Dihitung − Kas Seharusnya (Expected Cash)',
      exampleCalculation: 'Rp1.440.000 − Rp1.450.000 = -Rp10.000 (Kurang)',
      interpretation: 'Jika minus: otomatis dicatat sebagai Beban Selisih Kas di laporan akuntansi. Jika plus: dicatat sebagai Pendapatan Lain-lain.',
      isAutomated: true
    },
    keywords: ['selisih kas', 'rekonsiliasi', 'expected cash', 'kas fisik', 'tutup shift', 'kas kurang', 'kas lebih']
  },
  {
    id: 'formula-laba-bersih',
    title: 'Rumus: Laba Bersih (Net Profit)',
    category: 'formula',
    categoryLabel: 'Kamus Istilah & Rumus',
    icon: TrendingUp,
    summary: 'Keuntungan murni usaha setelah seluruh beban operasional, selisih kas, dan pajak dipotong.',
    meaning: 'Ukuran hasil akhir kinerja bisnis yang dapat diambil sebagai deviden/prive atau ditahan sebagai modal cadangan ekspansi.',
    purpose: 'Menilai apakah usaha toko benar-benar menguntungkan secara berkelanjutan setelah membiayai seluruh operasional.',
    whenToUse: 'Dilihat pada Laporan Laba Rugi akhir bulan di menu Keuangan & Jurnal.',
    howToUse: [
      'Ambil angka Laba Kotor periode tersebut.',
      'Jumlahkan seluruh Beban Operasional (listrik, sewa, gaji karyawan, plastik kresek, bensin).',
      'Kurangkan Laba Kotor dengan seluruh total Beban Usaha.'
    ],
    keyButtonsAndFields: [
      { name: 'Laba Kotor', description: 'Keuntungan dari selisih harga jual dan harga modal barang.' },
      { name: 'Beban Operasional', description: 'Biaya rutin yang dikeluarkan untuk menjalankan toko.' }
    ],
    example: 'Laba Kotor bulan ini Rp25.000.000. Total biaya operasional (listrik Rp1.500.000, sewa Rp3.000.000, gaji staf Rp12.000.000, kresek Rp500.000 = Rp17.000.000). Maka Laba Bersih = Rp25.000.000 − Rp17.000.000 = Rp8.000.000.',
    commonMistakes: [
      'Mengambil uang kasir untuk keperluan belanja pribadi sebelum laporan laba bersih dihitung dengan benar.'
    ],
    relatedMenus: [
      { id: 'finance', label: 'Keuangan & Jurnal' },
      { id: 'dashboard', label: 'Dashboard' }
    ],
    formula: {
      equation: 'Laba Bersih = Laba Kotor − Beban Operasional − Beban Selisih Kas',
      exampleCalculation: 'Rp25.000.000 − Rp17.000.000 = Rp8.000.000',
      interpretation: 'Toko berhasil membukukan laba bersih nyata sebesar Rp8.000.000 yang dapat disisihkan untuk laba ditahan atau dividen pemilik.',
      isAutomated: true
    },
    keywords: ['laba bersih', 'net profit', 'untung bersih', 'laba rugi', 'biaya operasional', 'gaji', 'sewa']
  },
  {
    id: 'formula-persediaan-akhir',
    title: 'Rumus: Nilai Persediaan Akhir',
    category: 'formula',
    categoryLabel: 'Kamus Istilah & Rumus',
    icon: Boxes,
    summary: 'Total nilai aset barang dagangan yang masih tersedia di rak dan gudang toko.',
    meaning: 'Jumlah fisik barang dagang dikalikan dengan biaya perolehan HPP Moving Average pada saat cut-off pelaporan.',
    purpose: 'Mencantumkan nilai aset lancar persediaan secara wajar pada Neraca Keuangan (Akun 1-1004).',
    whenToUse: 'Dihitung saat penyusunan Neraca Keuangan di menu Keuangan & Jurnal.',
    howToUse: [
      'Ambil data Persediaan Awal periode.',
      'Tambahkan total Pembelian Barang Masuk.',
      'Kurangkan dengan total HPP Barang Keluar yang terjual atau rusak.'
    ],
    keyButtonsAndFields: [
      { name: 'Valuasi Stok', description: 'Total rupiah modal yang sedang tertanam dalam wujud stok barang di toko.' }
    ],
    example: 'Persediaan awal Rp50.000.000. Toko membeli barang baru Rp30.000.000. Terjual barang dengan total HPP Rp45.000.000. Maka Persediaan Akhir = Rp50.000.000 + Rp30.000.000 − Rp45.000.000 = Rp35.000.000.',
    commonMistakes: [
      'Mengalikan jumlah fisik barang dengan harga jual, bukannya harga modal HPP (Persediaan wajib dinilai berdasarkan harga pokok/perolehan).',
    ],
    relatedMenus: [
      { id: 'inventory', label: 'Produk & Inventaris' },
      { id: 'finance', label: 'Keuangan & Jurnal' }
    ],
    formula: {
      equation: 'Persediaan Akhir = Persediaan Awal + Pembelian Masuk − HPP Penjualan Keluar',
      exampleCalculation: 'Rp50.000.000 + Rp30.000.000 − Rp45.000.000 = Rp35.000.000',
      interpretation: 'Toko memiliki persediaan barang dagang senilai Rp35.000.000 sebagai aset lancar di neraca.',
      isAutomated: true
    },
    keywords: ['persediaan akhir', 'stok akhir', 'valuasi persediaan', 'neraca', 'aset lancar', 'stok barang']
  },
  {
    id: 'formula-diskon-belanja',
    title: 'Rumus: Perhitungan Diskon & Potongan Harga',
    category: 'formula',
    categoryLabel: 'Kamus Istilah & Rumus',
    icon: Calculator,
    summary: 'Kalkulasi nilai potongan harga promo dari subtotal belanja pelanggan di kasir POS.',
    meaning: 'Pengurangan harga dasar yang diberikan toko kepada pelanggan dalam bentuk persentase promo.',
    purpose: 'Meningkatkan loyalitas pelanggan dan volume penjualan barang promosi.',
    whenToUse: 'Dihitung otomatis di kasir saat kasir memilih tombol diskon 5%, 10%, atau memasukkan nominal promo.',
    howToUse: [
      'Hitung subtotal belanja seluruh item di keranjang.',
      'Kalikan subtotal dengan persentase diskon yang diberikan, lalu bagi 100.'
    ],
    keyButtonsAndFields: [
      { name: 'Diskon 5%', description: 'Potongan harga promo 5% dari subtotal.' },
      { name: 'Diskon 10%', description: 'Potongan harga promo 10% dari subtotal.' }
    ],
    example: 'Subtotal belanja Rp200.000. Diberikan diskon promo 10%. Nilai diskon = 10% × Rp200.000 = Rp20.000. Total yang harus dibayar pembeli = Rp180.000.',
    commonMistakes: [
      'Menghitung diskon setelah pajak (Diskon dihitung dari subtotal sebelum pajak PPN).',
    ],
    relatedMenus: [
      { id: 'pos', label: 'Kasir (POS)' }
    ],
    formula: {
      equation: 'Nilai Diskon = (Persen Diskon ÷ 100) × Subtotal Belanja',
      exampleCalculation: '(10 ÷ 100) × Rp200.000 = Rp20.000',
      interpretation: 'Pelanggan mendapatkan potongan harga Rp20.000 dan membayar Rp180.000.',
      isAutomated: true
    },
    keywords: ['diskon', 'potongan harga', 'promo', 'persen diskon', 'hemat', 'f8']
  },
  {
    id: 'formula-kembalian-tunai',
    title: 'Rumus: Uang Diterima & Kembalian Kasir',
    category: 'formula',
    categoryLabel: 'Kamus Istilah & Rumus',
    icon: BanknoteIcon,
    summary: 'Perhitungan selisih pembayaran uang tunai fisik yang wajib dikembalikan kasir kepada pembeli.',
    meaning: 'Jumlah uang kembalian yang harus diberikan kasir kepada pelanggan.',
    purpose: 'Mencegah kasir salah memberikan uang kembalian saat melayani pembeli di jam sibuk.',
    whenToUse: 'Setiap transaksi tunai di kasir POS.',
    howToUse: [
      'Masukkan nominal uang yang diserahkan pembeli.',
      'Sistem otomatis mengurangkan dengan total tagihan.',
      'Jika uang yang diserahkan kurang dari total tagihan, transaksi otomatis ditolak oleh sistem JALORA.'
    ],
    keyButtonsAndFields: [
      { name: 'Uang Diterima', description: 'Nominal lembaran uang kertas/koin dari pembeli.' },
      { name: 'Uang Pas', description: 'Tombol jika pembeli membayar tanpa perlu kembalian.' },
      { name: 'Kembalian', description: 'Angka rupiah yang harus dikembalikan ke pembeli.' }
    ],
    example: 'Total tagihan Rp73.000. Pembeli menyerahkan uang pecahan Rp100.000. Kembalian = Rp100.000 − Rp73.000 = Rp27.000.',
    commonMistakes: [
      'Menyelesaikan transaksi tunai ketika pembeli belum menyerahkan uang yang cukup.'
    ],
    relatedMenus: [
      { id: 'pos', label: 'Kasir (POS)' },
      { id: 'shift', label: 'Rekonsiliasi Kasir' }
    ],
    formula: {
      equation: 'Kembalian = Uang Tunai Diterima − Total Tagihan',
      exampleCalculation: 'Rp100.000 − Rp73.000 = Rp27.000',
      interpretation: 'Kasir menyerahkan barang belanjaan bersama uang kembalian tunai Rp27.000.',
      isAutomated: true
    },
    keywords: ['kembalian', 'uang diterima', 'uang pas', 'tunai', 'cash', 'kasir']
  },
  {
    id: 'formula-persamaan-akuntansi',
    title: 'Rumus: Persamaan Dasar Akuntansi (Neraca)',
    category: 'formula',
    categoryLabel: 'Kamus Istilah & Rumus',
    icon: Scale,
    summary: 'Fondasi utama akuntansi: Total Aset (Aktiva) wajib selalu sama dengan Liabilitas + Ekuitas (Pasiva).',
    meaning: 'Prinsip keseimbangan neraca keuangan bahwa seluruh kekayaan yang dimiliki toko bersumber dari utang (liabilitas) atau modal pemilik (ekuitas).',
    purpose: 'Memastikan pembukuan tidak memiliki kebocoran atau kesalahan pencatatan transaksi ganjil.',
    whenToUse: 'Diverifikasi pada Neraca Keuangan di menu Keuangan & Jurnal.',
    howToUse: [
      'Buka tab Laporan > Neraca Keuangan.',
      'Periksa total Aset (Kas, Bank, Piutang, Persediaan).',
      'Periksa total Liabilitas (Utang Supplier, Utang Pajak) + Ekuitas (Modal, Laba Bersih).',
      'Kedua sisi wajib berimbang sempurna.'
    ],
    keyButtonsAndFields: [
      { name: 'Aset (Aktiva)', description: 'Seluruh kekayaan: Kas laci, Rekening Bank, Piutang Usaha, dan Persediaan Barang.' },
      { name: 'Liabilitas (Utang)', description: 'Kewajiban kepada pihak luar (supplier tempo, pajak).' },
      { name: 'Ekuitas (Modal)', description: 'Hak pemilik atas aset toko setelah dikurangi seluruh utang.' }
    ],
    example: 'Aset toko terdiri dari Kas Rp5.000.000, Bank Rp20.000.000, Persediaan Rp40.000.000 (Total Aset = Rp65.000.000). Pasiva terdiri dari Utang Supplier Rp15.000.000 dan Modal Pemilik Rp50.000.000 (Total Pasiva = Rp65.000.000). Neraca seimbang.',
    commonMistakes: [
      'Menghapus akun sistem yang menjadi pilar persamaan dasar akuntansi.'
    ],
    relatedMenus: [
      { id: 'finance', label: 'Keuangan & Jurnal' }
    ],
    formula: {
      equation: 'Aset = Liabilitas (Utang Usaha) + Ekuitas (Modal Pemilik)',
      exampleCalculation: 'Rp65.000.000 = Rp15.000.000 + Rp50.000.000',
      interpretation: 'Setiap rupiah aset toko dapat dipertanggungjawabkan sumber pendanaannya secara transparan.',
      isAutomated: true
    },
    keywords: ['persamaan akuntansi', 'neraca', 'aset', 'liabilitas', 'ekuitas', 'modal', 'utang', 'aktiva', 'pasiva']
  }
];

function BanknoteIcon(props: any) {
  return <CreditCard {...props} />;
}

export const KnowledgeGuide: React.FC<KnowledgeGuideProps> = ({
  store,
  branch,
  user,
  onNavigateMenu
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeArticleId, setActiveArticleId] = useState<string | null>(null);

  // Categories list
  const categories = [
    { id: 'all', label: 'Semua Panduan' },
    { id: 'sidebar', label: 'Menu Sidebar' },
    { id: 'pos', label: 'Kasir & Transaksi' },
    { id: 'inventory', label: 'Produk & Stok' },
    { id: 'finance', label: 'Keuangan & Akuntansi' },
    { id: 'shift', label: 'Laporan & Rekonsiliasi' },
    { id: 'payment', label: 'Pembayaran' },
    { id: 'users', label: 'Pengguna & Keamanan' },
    { id: 'settings', label: 'Pengaturan Sistem' },
    { id: 'database', label: 'Backup & Database' },
    { id: 'formula', label: 'Kamus Istilah & Rumus' },
  ];

  // Quick popular search keywords suggested by prompt
  const popularKeywords = [
    'uang masuk',
    'uang keluar',
    'stok habis',
    'untung',
    'cara bayar',
    'logout',
    'backup data',
    'selisih kas',
    'moving average'
  ];

  // Smart Search & Scoring Algorithm
  const searchResults = useMemo(() => {
    const rawQuery = searchQuery.trim().toLowerCase();

    return KNOWLEDGE_ARTICLES.filter(article => {
      // Category filter
      if (selectedCategory !== 'all' && article.category !== selectedCategory) {
        return false;
      }

      if (!rawQuery) return true;

      // Split query into terms
      const terms = rawQuery.split(/\s+/).filter(Boolean);

      // Check matches across multiple fields
      const titleLower = article.title.toLowerCase();
      const summaryLower = article.summary.toLowerCase();
      const meaningLower = article.meaning.toLowerCase();
      const purposeLower = article.purpose.toLowerCase();
      const exampleLower = article.example.toLowerCase();
      const keywordsStr = article.keywords.join(' ').toLowerCase();
      const formulaStr = article.formula ? (article.formula.equation + ' ' + article.formula.interpretation).toLowerCase() : '';

      // Check if all or any terms match
      return terms.some(term => 
        titleLower.includes(term) ||
        summaryLower.includes(term) ||
        meaningLower.includes(term) ||
        purposeLower.includes(term) ||
        keywordsStr.includes(term) ||
        exampleLower.includes(term) ||
        formulaStr.includes(term)
      );
    }).map(article => {
      // Relevance scoring
      let score = 0;
      const rawQuery = searchQuery.trim().toLowerCase();
      if (!rawQuery) return { article, score: 0 };

      const titleLower = article.title.toLowerCase();
      const keywordsStr = article.keywords.join(' ').toLowerCase();

      if (titleLower === rawQuery) score += 100;
      else if (titleLower.includes(rawQuery)) score += 50;

      if (keywordsStr.includes(rawQuery)) score += 40;
      if (article.summary.toLowerCase().includes(rawQuery)) score += 20;
      if (article.meaning.toLowerCase().includes(rawQuery)) score += 15;

      return { article, score };
    }).sort((a, b) => b.score - a.score).map(item => item.article);
  }, [searchQuery, selectedCategory]);

  const activeArticle = useMemo(() => {
    if (!activeArticleId) return null;
    return KNOWLEDGE_ARTICLES.find(a => a.id === activeArticleId) || null;
  }, [activeArticleId]);

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header Banner with official JALORA brand */}
      <div className="bg-white rounded-2xl border border-[#DCE5D6] p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#294D35] text-white flex items-center justify-center p-2.5 shadow-sm border border-[#DCE5D6]/50 shrink-0">
            <img
              src="/assets/aistudio/Logo_Aplikasi_Jalora_Hijau_Modern_d93205db.png"
              alt="Logo JALORA"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#4F7655] uppercase tracking-wide">
              <span>Pusat Pengetahuan Bisnis & POS</span>
              <span>·</span>
              <span>Panduan Bahasa Indonesia</span>
            </div>
            <h1 className="text-2xl font-bold text-[#294D35] tracking-tight">
              Rumus & Pengertian Aplikasi JALORA
            </h1>
            <p className="text-xs text-stone-500 mt-1 max-w-2xl leading-relaxed">
              Panduan lengkap cara kerja fitur, arti tombol, alur transaksi kasir, metode pembayaran, dan kamus rumus keuangan toko Anda.
            </p>
          </div>
        </div>

        {/* Quick count badges */}
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 bg-[#F5F0E5]/50 rounded-xl border border-[#DCE5D6] text-center">
            <span className="block text-lg font-bold text-[#294D35] leading-none">17</span>
            <span className="text-[10px] text-stone-600 font-medium">Modul Lengkap</span>
          </div>
          <div className="px-3.5 py-2 bg-[#F5F0E5]/50 rounded-xl border border-[#DCE5D6] text-center">
            <span className="block text-lg font-bold text-[#4F7655] leading-none">8</span>
            <span className="text-[10px] text-stone-600 font-medium">Rumus Bisnis</span>
          </div>
        </div>
      </div>

      {/* Main Content Area: Detail Article View vs Search & List */}
      {activeArticle ? (
        <div className="bg-white rounded-2xl border border-[#DCE5D6] p-6 lg:p-8 shadow-xs space-y-6 animate-in fade-in duration-150">
          {/* Back button & Category */}
          <div className="flex items-center justify-between pb-4 border-b border-stone-100">
            <button
              onClick={() => setActiveArticleId(null)}
              className="flex items-center gap-2 text-xs font-semibold text-[#294D35] hover:text-[#4F7655] px-3 py-1.5 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke Daftar Panduan</span>
            </button>
            <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#294D35] text-white">
              {activeArticle.categoryLabel}
            </span>
          </div>

          {/* Article Title */}
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#F5F0E5] text-[#294D35] flex items-center justify-center border border-[#DCE5D6]">
                <activeArticle.icon className="w-5 h-5 text-[#4F7655]" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#294D35]">{activeArticle.title}</h2>
                <p className="text-xs text-stone-500 mt-0.5">{activeArticle.summary}</p>
              </div>
            </div>
          </div>

          {/* Formula Callout if formula article */}
          {activeArticle.formula && (
            <div className="p-5 bg-[#F5F0E5]/50 rounded-2xl border-2 border-[#4F7655] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-[#294D35]" />
                  <span className="font-bold text-sm text-[#294D35]">Formula Rumus Akuntansi</span>
                </div>
                {activeArticle.formula.isAutomated ? (
                  <span className="px-2.5 py-1 text-[10px] font-bold text-[#294D35] bg-[#D6BD7A] rounded-lg">
                    ✓ Dihitung Otomatis oleh JALORA
                  </span>
                ) : (
                  <span className="px-2.5 py-1 text-[10px] font-semibold text-stone-600 bg-white border border-[#DCE5D6] rounded-lg">
                    Rumus umum — belum tentu dihitung otomatis oleh Jalora
                  </span>
                )}
              </div>

              <div className="p-3.5 bg-white rounded-xl border border-[#DCE5D6] font-mono text-sm font-bold text-[#294D35] text-center shadow-xs">
                {activeArticle.formula.equation}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                <div className="p-3 bg-white/80 rounded-xl border border-[#DCE5D6]/60">
                  <span className="font-semibold text-stone-500 block mb-1">Contoh Angka Nyata:</span>
                  <span className="font-mono text-[#4F7655] font-bold">{activeArticle.formula.exampleCalculation}</span>
                </div>
                <div className="p-3 bg-white/80 rounded-xl border border-[#DCE5D6]/60">
                  <span className="font-semibold text-stone-500 block mb-1">Cara Membaca Hasil:</span>
                  <span className="text-stone-700">{activeArticle.formula.interpretation}</span>
                </div>
              </div>
            </div>
          )}

          {/* 4 Pillars Grid: Arti, Kegunaan, Kapan, Contoh */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-[#F5F7F2] rounded-xl border border-[#DCE5D6]">
              <h4 className="text-xs font-bold text-[#294D35] uppercase tracking-wide mb-1 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-[#4F7655]" />
                <span>Apa arti menu/fitur ini?</span>
              </h4>
              <p className="text-xs text-stone-600 leading-relaxed">{activeArticle.meaning}</p>
            </div>

            <div className="p-4 bg-[#F5F7F2] rounded-xl border border-[#DCE5D6]">
              <h4 className="text-xs font-bold text-[#294D35] uppercase tracking-wide mb-1 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#4F7655]" />
                <span>Apa kegunaannya bagi toko?</span>
              </h4>
              <p className="text-xs text-stone-600 leading-relaxed">{activeArticle.purpose}</p>
            </div>

            <div className="p-4 bg-[#F5F7F2] rounded-xl border border-[#DCE5D6]">
              <h4 className="text-xs font-bold text-[#294D35] uppercase tracking-wide mb-1 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-[#4F7655]" />
                <span>Kapan fitur ini digunakan?</span>
              </h4>
              <p className="text-xs text-stone-600 leading-relaxed">{activeArticle.whenToUse}</p>
            </div>

            <div className="p-4 bg-[#F5F7F2] rounded-xl border border-[#DCE5D6]">
              <h4 className="text-xs font-bold text-[#294D35] uppercase tracking-wide mb-1 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#4F7655]" />
                <span>Contoh Penggunaan Nyata</span>
              </h4>
              <p className="text-xs text-stone-600 leading-relaxed">{activeArticle.example}</p>
            </div>
          </div>

          {/* Step-by-Step Instructions */}
          {activeArticle.howToUse.length > 0 && (
            <div className="p-5 bg-white rounded-xl border border-[#DCE5D6] space-y-3">
              <h4 className="text-sm font-bold text-[#294D35] flex items-center gap-2">
                <span>Langkah Praktis Cara Menggunakan:</span>
              </h4>
              <ol className="space-y-2 list-decimal list-inside text-xs text-stone-700">
                {activeArticle.howToUse.map((step, idx) => (
                  <li key={idx} className="leading-relaxed pl-1">
                    <span className="font-normal">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Key Buttons & Fields Description */}
          {activeArticle.keyButtonsAndFields.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-[#294D35]">
                Arti Tombol & Kolom Penting:
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeArticle.keyButtonsAndFields.map((field, idx) => (
                  <div key={idx} className="p-3 bg-stone-50 rounded-xl border border-[#DCE5D6] text-xs">
                    <span className="font-bold text-[#294D35] block mb-0.5">{field.name}</span>
                    <span className="text-stone-600">{field.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Common Mistakes to Avoid */}
          {activeArticle.commonMistakes.length > 0 && (
            <div className="p-4 bg-red-50/70 rounded-xl border border-red-200 space-y-2">
              <h4 className="text-xs font-bold text-red-800 uppercase tracking-wide flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span>Kesalahan Umum yang Harus Dihindari:</span>
              </h4>
              <ul className="list-disc list-inside space-y-1 text-xs text-red-700">
                {activeArticle.commonMistakes.map((mistake, idx) => (
                  <li key={idx}>{mistake}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Related Menus Shortcuts */}
          {activeArticle.relatedMenus.length > 0 && (
            <div className="pt-4 border-t border-stone-100 flex items-center justify-between flex-wrap gap-3">
              <span className="text-xs font-semibold text-stone-500">Menu JALORA Terkait:</span>
              <div className="flex items-center gap-2">
                {activeArticle.relatedMenus.map(m => (
                  <button
                    key={m.id}
                    onClick={() => {
                      if (onNavigateMenu) {
                        onNavigateMenu(m.id);
                      }
                    }}
                    className="px-3 py-1.5 bg-[#294D35] hover:bg-[#1e3827] text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <span>Buka {m.label}</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-[#D6BD7A]" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Search, Categories, and Articles Listing */
        <div className="space-y-6">
          {/* Smart Search Bar */}
          <div className="bg-white rounded-2xl border border-[#DCE5D6] p-4 sm:p-5 shadow-xs space-y-3">
            <div className="relative">
              <Search className="w-5 h-5 text-stone-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama menu, fitur, istilah, rumus, atau pertanyaan..."
                className="w-full pl-11 pr-10 py-3 text-sm border border-[#DCE5D6] rounded-xl bg-[#F5F7F2] text-[#294D35] placeholder:text-stone-400 focus:outline-none focus:border-[#4F7655] focus:bg-white transition-all font-medium"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-3 p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-lg cursor-pointer"
                  title="Hapus Pencarian"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Quick Keyword Suggestion Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs text-stone-500 scrollbar-none">
              <span className="shrink-0 font-medium text-stone-400">Paling Sering Dicari:</span>
              {popularKeywords.map(kw => (
                <button
                  key={kw}
                  onClick={() => setSearchQuery(kw)}
                  className="px-2.5 py-1 bg-stone-100 hover:bg-[#F5F0E5] text-[#294D35] rounded-lg transition-colors shrink-0 border border-[#DCE5D6]/50 font-medium cursor-pointer"
                >
                  {kw}
                </button>
              ))}
            </div>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {categories.map(cat => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#294D35] text-white shadow-xs'
                      : 'bg-white border border-[#DCE5D6] text-stone-600 hover:bg-[#F5F0E5]/50 hover:text-[#294D35]'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Results Summary Header */}
          <div className="flex items-center justify-between text-xs text-stone-500 px-1">
            <span>
              Menampilkan <strong>{searchResults.length}</strong> panduan & rumus
              {searchQuery && <span> untuk kata kunci "<strong>{searchQuery}</strong>"</span>}
            </span>
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="text-[#4F7655] hover:underline font-semibold cursor-pointer"
              >
                Reset Semua Filter
              </button>
            )}
          </div>

          {/* Articles Grid */}
          {searchResults.length === 0 ? (
            /* Empty State */
            <div className="bg-white rounded-2xl border border-[#DCE5D6] p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
                <HelpCircle className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-[#294D35]">Tidak Ditemukan Panduan yang Sesuai</h3>
              <p className="text-xs text-stone-500 max-w-md mx-auto">
                Kata pencarian "<strong>{searchQuery}</strong>" belum cocok dengan artikel mana pun. Coba gunakan istilah lain atau pilih kategori di atas.
              </p>
              <div className="pt-2 flex flex-wrap justify-center gap-2">
                {popularKeywords.slice(0, 5).map(kw => (
                  <button
                    key={kw}
                    onClick={() => setSearchQuery(kw)}
                    className="text-xs px-3 py-1 bg-[#F5F0E5] text-[#294D35] font-semibold rounded-lg hover:bg-[#D6BD7A] transition-colors"
                  >
                    Cari: {kw}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {searchResults.map(article => {
                const Icon = article.icon;
                return (
                  <div
                    key={article.id}
                    onClick={() => setActiveArticleId(article.id)}
                    className="bg-white rounded-2xl border border-[#DCE5D6] p-5 hover:border-[#4F7655] hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="w-10 h-10 rounded-xl bg-[#F5F0E5]/70 text-[#294D35] flex items-center justify-center border border-[#DCE5D6] group-hover:scale-105 transition-transform">
                          <Icon className="w-5 h-5 text-[#4F7655]" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-stone-100 text-stone-600">
                          {article.categoryLabel}
                        </span>
                      </div>

                      <div>
                        <h3 className="font-bold text-sm text-[#294D35] group-hover:text-[#4F7655] transition-colors line-clamp-1">
                          {article.title}
                        </h3>
                        <p className="text-xs text-stone-500 mt-1 line-clamp-2 leading-relaxed">
                          {article.summary}
                        </p>
                      </div>

                      {article.formula && (
                        <div className="p-2 bg-[#F5F0E5]/40 rounded-lg border border-[#DCE5D6]/50 font-mono text-[11px] text-[#294D35] truncate">
                          {article.formula.equation}
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-semibold text-[#4F7655]">
                      <span>Baca Panduan Lengkap</span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
