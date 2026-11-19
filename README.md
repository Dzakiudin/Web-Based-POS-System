<div align="center">

# ⚡ POS System Pro Max

**Sistem Point of Sale (POS) & Manajemen Ritel Berperforma Tinggi**  
*Dibangun dengan arsitektur modern Rust (Axum) & React (Meta Astryx Design System)*

[![Rust](https://img.shields.io/badge/Backend-Rust_2.0-orange?style=for-the-badge&logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![Axum](https://img.shields.io/badge/Framework-Axum_0.8-red?style=for-the-badge&logo=tokio&logoColor=white)](https://github.com/tokio-rs/axum)
[![React](https://img.shields.io/badge/Frontend-React_19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript_5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL_17%2F18-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Astryx](https://img.shields.io/badge/Design_System-Meta_Astryx-18181b?style=for-the-badge)](https://astryx.design)

<p align="center">
  <a href="#-tentang-proyek">Tentang</a> •
  <a href="#-fitur-utama">Fitur Utama</a> •
  <a href="#-arsitektur--teknologi">Arsitektur & Teknologi</a> •
  <a href="#-panduan-instalasi--menjalankan">Instalasi & Menjalankan</a> •
  <a href="#-data-demo-100-hari">Data Demo (100 Hari)</a> •
  <a href="#-kredensial-pengujian">Akun Uji Coba</a> •
  <a href="#-struktur-direktori">Struktur Direktori</a>
</p>

</div>

---

## 📌 Tentang Proyek

**POS System Pro Max** adalah aplikasi kasir dan manajemen ritel *end-to-end* kelas enterprise yang dirancang untuk kecepatan transaksi maksimal, keandalan data tinggi, serta pengalaman visual yang profesional dan intuitif.

Aplikasi ini telah dimigrasikan ke arsitektur **Rust 2.0 (Axum + SQLx + Tokio)** untuk menangani ribuan transaksi per detik secara konkuren dengan konsumsi memori yang sangat efisien, dipadukan dengan **Frontend React 19** berbasis **Meta Astryx Design System** (`@astryxdesign/core`) yang mengusung tema clean neutral, transisi navigasi halus sekelas aplikasi mobile native (60–120 FPS View Transitions API), serta tata letak responsif *edge-to-edge* untuk perangkat desktop dan tablet/smartphone.

---

## ✨ Fitur Utama

### 🛒 1. Kasir POS & Checkout Cepat
- **Antarmuka Kasir Responsif:** Tampilan katalog produk berbasis grid dan kartu visual interaktif dengan kategori scroll horizontal.
- **Dukungan Barcode & SKU:** Pencarian instan dan integrasi barcode scanner via keyboard shortcut (`F1` cari produk, `F2` bayar, `F4` tahan transaksi).
- **Multi-Payment Otomatis:** Mendukung pembayaran via **QRIS**, **Tunai (Cash)**, **Kartu Debit/Kredit (Card)**, dan **E-Wallet / Transfer**.
- **Kalkulasi Kembalian Otomatis:** Perhitungan presisi tinggi dengan dukungan pecahan uang tunai cepat (quick cash buttons: Rp 20.000, 50.000, 100.000, Uang Pas).
- **Hold & Resume Order:** Simpan sementara pesanan antrean pelanggan yang belum selesai dan buka kembali kapan saja.
- **Struk Digital & Cetak:** Pratinjau struk penjualan yang rapi dengan opsi cetak langsung.
- **Audio Feedback Haptic:** Efek suara tactile lembut saat menambah produk, mengubah jumlah, dan menyelesaikan transaksi.

### 💵 2. Manajemen Arus Kas & Shift Kasir
- **Buka & Tutup Shift:** Pencatatan saldo kas awal kasir (*opening balance*) saat membuka toko.
- **Estimasi Kas Real-Time:** Perhitungan otomatis penerimaan uang tunai dari transaksi yang terjadi selama shift berjalan.
- **Catat Kas Masuk & Keluar:** Dokumentasi pergerakan kas kecil (misalnya untuk beli es batu, kembalian tambahan, atau operasional toko) beserta alasan.
- **Rekonsiliasi Kas Fisik:** Perbandingan otomatis antara uang fisik di laci kasir dengan estimasi sistem serta kalkulasi selisih (*difference*).

### 📦 3. Manajemen Produk, Varian & Kategori
- **Katalog Produk Terstruktur:** Tambah, edit, dan kelola produk lengkap dengan SKU, Barcode, Harga Jual, Harga Modal (*Cost Price*), dan foto produk.
- **Kategori Berlabel Warna:** Pengelompokan produk dengan ikon dan warna label dinamis untuk kemudahan navigasi kasir.
- **Indikator Stok Rendah:** Peringatan visual otomatis apabila stok produk berada di bawah batas minimum (*threshold*).

### 📊 4. Manajemen Stok & Opname Inventaris
- **Log Pergerakan Stok Lengkap:** Pencatatan setiap riwayat stok masuk (`IN`), stok keluar checkout (`OUT`), penyesuaian opname (`ADJUSTMENT`), dan pengembalian (`REFUND`).
- **Penyesuaian Stok Cepat:** Modal penyesuaian stok opname langsung dari antarmuka kasir/admin.

### 👥 5. CRM & Pelanggan Loyalitas
- **Manajemen Data Member:** Pencatatan nama, nomor telepon, email, dan alamat pelanggan.
- **Tingkat Keanggotaan (Membership Tiers):** Kategori otomatis pelanggan mulai dari *Bronze*, *Silver*, *Gold*, hingga *Platinum*.
- **Poin Loyalitas & Riwayat Transaksi:** Akumulasi poin belanja dan pelacakan riwayat pembelian pelanggan.

### 🎟️ 6. Aturan Diskon & Voucher Belanja
- **Aturan Diskon Fleksibel:** Mendukung diskon persentase (`%`) maupun potongan nominal tetap (`Rp`) dengan syarat minimum belanja.
- **Voucher Belanja Terikat Pelanggan:** Penerbitan kupon belanja khusus per member atau kupon promo umum dengan batas kedaluwarsa dan pemakaian maksimal.

### 📈 7. Dasbor Bisnis & Laporan Keuangan
- **Ringkasan Indikator Kunci (KPI):** Total omzet harian, jumlah transaksi, estimasi laba kotor, dan pelanggan aktif.
- **Visualisasi Tren Pendapatan:** Grafik grafik analitik performa penjualan harian, mingguan, dan bulanan.
- **Analisis Produk Terlaris:** Identifikasi produk *top performer* berdasarkan volume terjual dan kontribusi pendapatan.

### 🛡️ 8. Hak Akses (RBAC) & Audit Log
- **Role-Based Access Control:** Pembagian peran pengguna (*Owner*, *Administrator*, *Cashier*) dengan izin fitur granular (`permission`).
- **Audit Trail Keamanan:** Pencatatan riwayat setiap aksi sensitif (*login*, perubahan harga, *void*, *refund*, hapus data) lengkap dengan identitas pengguna dan cap waktu (*timestamp*).

---

## 📱 Desain & Pengalaman Pengguna (Mobile Native Feel)

- **Meta Astryx Design System:** Menggunakan paket resmi `@astryxdesign/core` dengan token desain bertema *wash/neutral* yang modern, bersih, dan berstandar internasional.
- **Transisi Native Ultra-Smooth (60–120 FPS):** Mengimplementasikan native **View Transitions API** dan akselerasi GPU (`will-change: opacity, transform`) untuk perpindahan halaman yang mulus tanpa kedip/stutter.
- **Bottom Navigation Bar Mobile:** Navigasi bawah ramah sentuhan satu tangan (*thumb zone*) khusus tampilan mobile dengan tab Kasir, Dashboard, Riwayat, Stok, dan Menu Lengkap.
- **Tampilan Edge-to-Edge:** Layout responsif penuh kiri-ke-kanan tanpa potongan margin atau layout spill pada layar smartphone.

---

## 🧰 Arsitektur & Teknologi

```mermaid
graph TD
    Client["Client: React 19 + TypeScript + Vite + Meta Astryx Core"]
    Router["Axum HTTP Router & Static File Server (:5000)"]
    Auth["JWT Authentication & RBAC Middleware"]
    Handlers["Domain Handlers: Sales, Stock, Cash, Catalog, Reports, Audit"]
    DB[(PostgreSQL Database: pos_db)]

    Client -->|REST API / View Transitions| Router
    Router --> Auth
    Auth --> Handlers
    Handlers -->|SQLx Connection Pool| DB
    Router -.->|Serves Built Dist| Client
```

| Lapisan | Komponen / Teknologi | Keterangan |
|---|---|---|
| **Backend** | **Rust 2.0**, **Axum 0.8**, **Tokio** | Server asynchronous berkinerja tinggi, concurrency aman, konsumsi memori hemat |
| **Database Driver** | **SQLx 0.8** (PostgreSQL) | Query compile-time verified, connection pool otomatis, zero-overhead |
| **Frontend UI** | **React 19**, **TypeScript 5**, **Vite 7** | Frontend modular, cepat dimuat, strict type safety |
| **Design System** | **@astryxdesign/core** | Design system profesional bertema neutral/wash |
| **Visualisasi** | **Recharts**, **Lucide React** | Grafik analitik interaktif dan ikon modern |
| **Database** | **PostgreSQL 17 / 18** | Basis data relasional dengan indeks performa dan integritas ACID |

---

## ⚙️ Panduan Instalasi & Menjalankan

### Prasyarat Perangkat
1. **Rust Toolchain:** `rustc` dan `cargo` (instal via [rustup.rs](https://rustup.rs/)).
2. **Node.js & npm:** Node.js v18+ dan npm.
3. **PostgreSQL:** Server PostgreSQL aktif (versi 16, 17, atau 18).

---

### Langkah 1: Clone Repositori
```bash
git clone https://github.com/Dzakiudin/Web-Based-POS-System.git
cd Web-Based-POS-System
```

---

### Langkah 2: Konfigurasi Database PostgreSQL
1. Buat database baru bernama `pos_db` pada PostgreSQL Anda:
   ```sql
   CREATE DATABASE pos_db;
   ```
2. Salin berkas `.env.example` ke `.env` di folder `server-rust/` (atau buat file `server-rust/.env`):
   ```env
   DATABASE_URL=postgresql://postgres:password_anda@127.0.0.1:5433/pos_db
   JWT_SECRET=super_secret_pos_key_2026_change_in_production
   PORT=5000
   ```
   *(Sesuaikan port dan password database PostgreSQL lokal Anda).*

---

### Langkah 3: Import Skema & Data Realistis 100 Hari (Opsional & Sangat Disarankan)
Tersedia berkas SQL data historis riil selama 100 hari (`seed_100days.sql`):
```bash
# Contoh eksekusi via psql:
psql -h 127.0.0.1 -p 5433 -U postgres -d pos_db -f seed_100days.sql
```
Data ini menyuntikkan:
- **2.755 transaksi penjualan** riil dengan sebaran metode pembayaran (QRIS, Tunai, Kartu, E-Wallet).
- **101 sesi shift kasir** (100 shift selesai + 1 shift aktif hari ini).
- **24 produk katalog** lintas 5 kategori menu.
- **15 data member pelanggan loyalitas**.
- Total omzet tercatat **Rp 144.050.000,00**.

---

### Langkah 4: Build Frontend Client
```bash
cd client
npm install
npm run build
cd ..
```
*Build artifacts akan dihasilkan di `client/dist` dan otomatis dilayani oleh backend Rust.*

---

### Langkah 5: Jalankan Server Rust
```bash
cd server-rust
cargo run --release
```
Server akan aktif dan menampilkan:
```text
🚀 POS Pro Max Server (Rust) running on http://localhost:5000
```
Buka browser Anda dan akses: **`http://localhost:5000`**

---

## 🔑 Kredensial Pengujian

Gunakan akun default berikut untuk pengujian di lingkungan lokal:

| Peran | Username | Password Default | Izin Utama |
|---|---|---|---|
| **Owner / Administrator** | `admin` | `admin123` | Akses penuh: Kasir, Laporan, Stok, Karyawan, CRM, Diskon, Audit |
| **Kasir (Cashier)** | `user1` | `123456` | Transaksi POS Kasir, Buka/Tutup Kas Sesi, Cetak Struk |

---

## 🗺️ Struktur Direktori

```text
Web-Based-POS-System/
├── client/                     # Frontend React 19 + TypeScript (Meta Astryx)
│   ├── src/
│   │   ├── components/         # Layout, BottomNavBar, Sidebar, Toast, Modal, Chart
│   │   ├── pages/              # Kasir, Dashboard, Riwayat, Produk, Stok, CRM, Laporan
│   │   ├── context/            # AuthContext & State Manajemen
│   │   └── lib/                # Axios instance & audio feedback
│   ├── index.html              # Entry HTML
│   └── vite.config.ts          # Konfigurasi Vite
├── server-rust/                # Backend Microservice Rust (Axum + SQLx)
│   ├── src/
│   │   ├── handlers/           # Sale, Stock, Cash, Customer, Product, Discount, Report
│   │   ├── middleware/         # Auth JWT & RBAC permission guard
│   │   ├── models/             # Data structs, DTOs & decimal serialization
│   │   ├── state.rs            # Application shared state & DB pool
│   │   └── main.rs             # Axum router & static file serving
│   └── Cargo.toml              # Dependensi Rust
├── seed_100days.sql            # Script SQL data realistis 100 hari (2.755 transaksi)
├── .gitignore                  # Git ignore root (client + server-rust target)
└── README.md                   # Dokumentasi proyek
```

---

<div align="center">

**POS System Pro Max**  
*High performance. Zero latency. Built for scale.*

</div>
