# JALORA — Business Management Platform

> **"Satu Sistem, Kendali Seluruh Bisnis"**  
> Platform manajemen bisnis all-in-one kelas enterprise untuk UMKM, ritel, dan bisnis multi-cabang. Mengintegrasikan Point of Sale (POS), manajemen inventaris, pembukuan akuntansi double-entry, rekonsiliasi kasir, hingga sinkronisasi cloud real-time dengan kemampuan Progressive Web App (PWA) offline-first.

Dikembangkan oleh: **Abdul Jalil**  
Lisensi: **Proprietary / Private Business Application**

---

## 📋 Daftar Isi

1. [Fitur Unggulan](#-fitur-unggulan)
2. [Arsitektur & Tech Stack](#-arsitektur--tech-stack)
3. [Struktur Proyek](#-struktur-proyek)
4. [Panduan Instalasi & Pengembangan Lokal](#-panduan-instalasi--pengembangan-lokal)
5. [Konfigurasi Environment Variable](#-konfigurasi-environment-variable)
6. [Panduan Deployment ke Vercel](#-panduan-deployment-ke-vercel)
7. [Setup Database Supabase & Migrasi](#-setup-database-supabase--migrasi)
8. [Progressive Web App (PWA) & Offline Engine](#-progressive-web-app-pwa--offline-engine)
9. [Backup & Restore Data](#-backup--restore-data)
10. [Panduan Push ke GitHub Repository](#-panduan-push-ke-github-repository)

---

## 🚀 Fitur Unggulan

### 1. Point of Sale (POS) & Transaksi Kasir
- Antarmuka kasir cepat dengan pencarian instan nama produk, SKU, dan barcode scanner.
- Dukungan multi-metode pembayaran: Tunai, QRIS dinamis/statis, Transfer Bank, dan Piutang pelanggan.
- Perhitungan pajak & diskon otomatis (rupiah maupun persentase).
- Cetak struk belanja thermal 58mm/80mm, unduh struk format PDF, atau kirim digital via WhatsApp.
- Proteksi transaksi duplikat menggunakan *Idempotency Key Engine*.

### 2. Multi-Cabang & Manajemen Inventaris
- Pemisahan stok per cabang dengan harga modal rata-rata bergerak (*Moving Average Cost*).
- Riwayat pergerakan stok real-time (*Stock Movement Ledger*): Pembelian, Penjualan, Transfer Antar-Cabang, Penyesuaian, dan Retur.
- Peringatan stok menipis (*Low Stock Alert*) otomatis pada dashboard.
- Fitur Hapus Produk dengan modal konfirmasi internal yang aman dan verifikasi dependensi data transaksi.

### 3. Stok Opname Fisik Berbasis PIN
- Modul stok opname mandiri per cabang dengan proteksi otorisasi PIN Pemilik/Manajer.
- Perhitungan selisih fisik vs sistem secara instan dengan pencatatan jurnal selisih otomatis.

### 4. Akuntansi Double-Entry & Laporan Keuangan
- Bagan Akun Standar (*Chart of Accounts*) bisnis ritel & jasa: Aset, Liabilitas, Ekuitas, Pendapatan, dan Beban.
- Pencatatan jurnal otomatis untuk setiap transaksi kasir, pembelian, dan pengeluaran kas.
- Jurnal penyesuaian manual dengan validasi *Debit = Credit*.
- Laporan keuangan otomatis:
  - **Laporan Laba Rugi (Profit & Loss Statement)**
  - **Laporan Neraca Keuangan (Balance Sheet)**
  - **Buku Besar Akun (General Ledger)**
  - **Laporan Arus Kas Operasional**
- Ekspor laporan dalam format PDF resmi dan spreadsheet CSV.

### 5. Manajemen Pemasok & Pembelian (Purchasing)
- Pembuatan Purchase Order (PO) ke pemasok dengan termin pembayaran (Hutang Dagang).
- Modul penerimaan barang fisik yang langsung memperbarui kuantitas stok dan HPP barang.

### 6. Rekonsiliasi Kasir & Shift Laci Kas
- Pencatatan modal awal kasir (*Opening Cash*).
- Pelacakan kas masuk (*Cash In*) dan kas keluar (*Cash Out*) selama shift berlangsung.
- Rekonsiliasi saat tutup shift (*Close Shift*): Kas sistem vs Kas fisik dihitung otomatis beserta selisihnya (*discrepancy*).

### 7. Backup & Restore Data Atomik
- **Backup Data**: Ekspor seluruh basis data aplikasi (toko, cabang, produk, transaksi, jurnal, pelanggan, pemasok, shift kas) menjadi satu file JSON terstruktur dan terenkripsi ringkas.
- **Pulihkan Data (Restore)**: Impor file JSON cadangan dengan validasi struktur data, ringkasan tinjauan sebelum eksekusi, modal konfirmasi perlindungan data, dan proses restore atomik dengan rollback otomatis jika terjadi kegagalan.

### 8. Arsitektur Hybrid Cloud + Offline Fallback
- Bekerja 100% secara offline menggunakan penyimpanan browser lokal yang terisolasi.
- Terhubung mulus ke cloud Supabase (PostgreSQL 15+) jika kredensial diatur, dengan mekanisme sinkronisasi data dua arah.

---

## 🛠️ Arsitektur & Tech Stack

| Lapisan | Teknologi | Catatan |
|---|---|---|
| **Frontend Framework** | React 19 (TypeScript) | SPA performa tinggi dengan Hooks & Context |
| **Build Tool & Bundler** | Vite 8 + @vitejs/plugin-react | Kompilasi kilat ESBuild/Rolldown |
| **Styling & Design System** | Tailwind CSS v4 | Tema elegan: Forest Green (`#294D35`), Champagne Gold (`#D6BD7A`), Warm Ivory (`#F5F0E5`) |
| **Icons & Animasi** | Lucide React + Motion | Ikonografi modern dan transisi visual halus |
| **Dokumen & Cetak** | jsPDF + jsPDF-AutoTable | Cetak nota kasir, faktur, dan laporan keuangan PDF |
| **Database & Cloud Backend** | Supabase (PostgreSQL 15+) | Row Level Security (RLS), Storage buckets `logos` & `product-images` |
| **Node.js Web Server** | Express 4 + tsx | Dual-mode: Static SPA file serving + dev middleware |
| **PWA & Offline** | Service Worker + Web Manifest | Standalone display mode, cache-first static shell |

---

## 📂 Struktur Proyek

```
JALORA-BUSINESS/
├── .env.example                # Panduan konfigurasi environment variable
├── .gitignore                  # Berkas yang diabaikan oleh Git
├── index.html                  # Dokumen HTML utama aplikasi
├── metadata.json               # Konfigurasi AI Studio Platform metadata
├── package.json                # Daftar dependensi & script proyek
├── package-lock.json           # Lockfile dependency yang terkunci dan teruji
├── tsconfig.json               # Konfigurasi TypeScript
├── vercel.json                 # Konfigurasi routing & header deployment Vercel
├── vite.config.ts              # Konfigurasi Vite bundler
├── server.ts                   # Entry point Express backend / Cloud Run
├── server.js                   # Node.js ESM bridge
├── public/                     # Aset publik statis
│   ├── manifest.json           # Web App Manifest PWA
│   ├── sw.js                   # Progressive Web App Service Worker
│   ├── apple-touch-icon.png    # Ikon untuk perangkat Apple iOS
│   ├── pwa-192x192.png         # Ikon aplikasi PWA resolusi 192px
│   ├── pwa-512x512.png         # Ikon aplikasi PWA resolusi 512px
│   └── pwa-maskable-512x512.png# Ikon aplikasi PWA maskable
├── src/                        # Source code utama aplikasi
│   ├── App.tsx                 # Root component aplikasi Jalora
│   ├── main.tsx                # Entry point React DOM
│   ├── index.css               # Global styles & import Tailwind CSS
│   ├── types/                  # Definisi TypeScript interface & types
│   ├── services/               # Layanan database, storage, audio, & Supabase
│   ├── hooks/                  # Custom React Hooks (PWA install prompt, dll.)
│   ├── utils/                  # Utilitas ekspor PDF, CSV, format tanggal, WhatsApp
│   └── components/             # Komponen UI modular
│       ├── cashier_shift/      # Modul shift kasir & laci kas
│       ├── common/             # Header, Sidebar, Navigation bar
│       ├── dashboard/          # Ringkasan KPI bisnis & transaksi kasir terakhir
│       ├── finance/            # Buku besar, jurnal, laba rugi, & neraca
│       ├── inventory/          # Manajemen produk, stok opname, modal hapus produk
│       ├── knowledge/          # Dokumentasi bantuan & panduan pengguna
│       ├── pos/                # Antarmuka kasir Point of Sale & modal checkout
│       ├── public/             # Nota publik & halaman informasi umum
│       ├── purchasing/         # Purchase order & penerimaan barang
│       ├── pwa/                # Modal prompt instalasi aplikasi PWA
│       └── settings/           # Pengaturan toko, Supabase sync, Backup & Restore
└── supabase/
    └── migrations/             # Skrip migrasi PostgreSQL Supabase
        ├── 20261028_jalora_initial_schema.sql  # 34 tabel, RBAC, dan kebijakan RLS
        └── 20261028_jalora_storage_setup.sql   # Storage bucket & public policies
```

---

## 💻 Panduan Instalasi & Pengembangan Lokal

### 1. Kebutuhan Sistem
- **Node.js**: Versi 18.0.0 atau lebih tinggi (disarankan Node.js 20 LTS / 22)
- **NPM**: Versi 9.0.0 atau lebih tinggi

### 2. Langkah Instalasi
```bash
# Clone repository dari GitHub
git clone https://github.com/Adelkel15/JALORA-BUSINESS.git

# Masuk ke direktori proyek
cd JALORA-BUSINESS

# Install seluruh dependensi menggunakan lockfile
npm install
```

### 3. Menjalankan Server Pengembangan
```bash
npm run dev
```
Aplikasi akan aktif di `http://localhost:3000`.

### 4. Menguji Build & Typecheck
```bash
# Uji typecheck TypeScript tanpa error
npm run lint

# Uji kompilasi build produksi Vite
npm run build
```

---

## 🔐 Konfigurasi Environment Variable

Salin berkas `.env.example` menjadi `.env.local`:
```bash
cp .env.example .env.local
```

Isi variabel sesuai kebutuhan:
```env
# URL & Kunci Publik Supabase (Opsional: jika kosong, Jalora beroperasi via Local Engine)
VITE_SUPABASE_URL="https://your-project-id.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-publishable-key"

# Kunci API Gemini (Opsional: untuk asisten cerdas sisi server)
GEMINI_API_KEY=""

# Host URL
APP_URL="http://localhost:3000"
```

> ⚠️ **Catatan Keamanan:** Jangan pernah menyimpan Service Role Secret Key Supabase ke dalam file frontend atau mengunggahnya ke GitHub.

---

## ☁️ Panduan Deployment ke Vercel

Aplikasi ini telah dilengkapi dengan `vercel.json` dan `package-lock.json` yang telah dioptimasi penuh untuk Vercel.

### Solusi Masalah `vite: command not found` di Vercel
Kesalahan `vite: command not found` terjadi jika:
1. `package-lock.json` tidak disertakan dalam repository sehingga Vercel menggunakan resolusi paket default yang berkonflik.
2. Paket `vite`, `typescript`, dan `@vitejs/plugin-react` berada di luar bagian `dependencies`.

**Solusi yang telah diterapkan di JALORA:**
- `package-lock.json` telah digenerate secara lengkap dan bebas dari konflik peer-dependency.
- `vite`, `typescript`, dan `@vitejs/plugin-react` telah diposisikan dalam `dependencies` sehingga selalu terpasang pada environment produksi Vercel sekalipun flag `NODE_ENV=production` aktif.

### Langkah Deploy di Dashboard Vercel:
1. Buka [Vercel Dashboard](https://vercel.com/new).
2. Pilih opsi **Import Git Repository** dan pilih `Adelkel15/JALORA-BUSINESS`.
3. Pada halaman **Configure Project**:
   - **Framework Preset**: Pilih `Vite`.
   - **Root Directory**: `./` (Default root).
   - **Build Command**: `npm run build` (atau biarkan default).
   - **Output Directory**: `dist` (atau biarkan default).
   - **Install Command**: `npm install`.
4. (Opsional) Di bagian **Environment Variables**, tambahkan:
   - `VITE_SUPABASE_URL` = URL Project Supabase Anda.
   - `VITE_SUPABASE_ANON_KEY` = Anon Key Supabase Anda.
5. Klik tombol **Deploy**. Vercel akan menyelesaikan build dalam waktu < 1 menit.

---

## 🗄️ Setup Database Supabase & Migrasi

Jika Anda ingin mengaktifkan sinkronisasi cloud:
1. Buat proyek baru di [Supabase Dashboard](https://supabase.com).
2. Masuk ke menu **SQL Editor**.
3. Jalankan skrip migrasi utama:
   - Buka berkas `supabase/migrations/20261028_jalora_initial_schema.sql`, salin seluruh kodenya, lalu klik **Run** di SQL Editor.
4. Jalankan skrip setup storage:
   - Buka berkas `supabase/migrations/20261028_jalora_storage_setup.sql`, salin seluruh kodenya, lalu klik **Run**.
5. Buka tab **Project Settings** → **API**, salin **Project URL** dan **anon / public key**, lalu masukkan ke menu **Pengaturan** di dalam aplikasi Jalora atau ke file `.env`.

---

## 📱 Progressive Web App (PWA) & Offline Engine

JALORA merupakan Progressive Web App (PWA) lengkap:
- **Dapat Diinstal (Installable)**: Dapat dipasang langsung ke Home Screen di smartphone (Android/iOS) dan Desktop (Chrome/Edge/Safari/macOS) layaknya aplikasi native.
- **Service Worker (`public/sw.js`)**:
  - Strategi **Network-First with Cache Fallback** untuk navigasi halaman, memastikan pengguna selalu mendapatkan rilis terbaru saat online, dan tetap dapat membuka aplikasi saat koneksi terputus.
  - Strategi **Stale-While-Revalidate** untuk aset statis (CSS, JS, Fonts).
  - Pengecualian otomatis terhadap request API Supabase agar tidak ada data basi yang tersimpan di cache.
- **Web App Manifest (`public/manifest.json`)**: Konfigurasi `standalone` display mode, tema warna `#294D35`, dan ikon adaptif maskable.

---

## 💾 Backup & Restore Data

Fitur Backup dan Restore Data dapat diakses melalui menu **Pengaturan**:
1. **Backup Data**: Klik tombol **Backup Data**. File JSON bernama `jalora_backup_YYYY-MM-DD.json` akan otomatis terunduh ke perangkat Anda.
2. **Pulihkan Data (Restore)**:
   - Klik tombol **Pulihkan Data**.
   - Pilih file JSON backup dari perangkat Anda.
   - Sistem akan melakukan validasi format, integritas data, dan menghitung ringkasan entitas (Produk, Pelanggan, Transaksi, dll.).
   - Tinjau dialog ringkasan data dan klik **Konfirmasi Pulihkan Data**.
   - Notifikasi sukses **“Data berhasil dipulihkan.”** akan muncul dan aplikasi memuat data baru secara atomik.

---

## 📤 Panduan Push ke GitHub Repository

Untuk mengunggah seluruh source code asli ini ke repository GitHub `Adelkel15/JALORA-BUSINESS`:

```bash
# 1. Inisialisasi Git (jika belum diinisialisasi)
git init

# 2. Tambahkan seluruh berkas ke staging area
git add .

# 3. Buat commit perdana dengan pesan deskriptif
git commit -m "feat: complete JALORA Business Management Platform release codebase"

# 4. Pastikan branch utama bernama main
git branch -M main

# 5. Hubungkan dengan remote repository GitHub Anda
git remote add origin https://github.com/Adelkel15/JALORA-BUSINESS.git
# (Jika remote sudah ada, gunakan: git remote set-url origin https://github.com/Adelkel15/JALORA-BUSINESS.git)

# 6. Push seluruh source code ke GitHub
git push -u origin main --force
```

Setelah push berhasil, repository GitHub `Adelkel15/JALORA-BUSINESS` akan berisi struktur source code lengkap dan siap dihubungkan langsung ke Vercel untuk deployment otomatis setiap kali ada update.
