# 🌌 Midnight Glass POS Pro
> **Sistem Point of Sale & Analitik Komersial Premium**

![Platform](https://img.shields.io/badge/Platform-Web-indigo)
![Architecture](https://img.shields.io/badge/Architecture-MERN-blue?logo=react)
![UI](https://img.shields.io/badge/Design-Stitch_UI-green)
![Database](https://img.shields.io/badge/Database-PostgreSQL-336791?logo=postgresql)

Midnight Glass POS adalah sistem Point of Sale premium berkinerja tinggi yang dirancang untuk lingkungan ritel modern. Dibangun dengan estetika yang bersih dan terlihat profesional, sistem ini menyediakan jembatan mulus antara manajemen bisnis yang kuat dan pengalaman pengguna yang mewah dan responsif.

---

## ✨ Ekosistem Fitur Utama

### 🛒 POS Inti & Transaksi
- **Kasir Cepat:** Alur checkout yang dipoles (*polished*) untuk transaksi berkecepatan tinggi.
- **Keranjang Dinamis:** Kalkulasi seketika (*real-time*) dengan dukungan multi-metode pembayaran (Tunai, QRIS, Kartu, E-Wallet).
- **Pembuatan Struk:** Pencetakan struk digital (*Void/Refund* didukung penuh).

### 📦 Inventaris & Kategori
- **Pelacakan Pintar:** Pengurangan stok otomatis dengan peringatan untuk stok rendah (*Low Stock Alerts*).
- **Categorization:** Manajemen kategori dengan indikator warna (*color-coded*).
- **Manajemen Mutasi:** Pencatatan stok masuk, stok keluar, dan opname stok manual secara terperinci.

### 💎 CRM & Sistem Loyalitas
- **Tingkatan Pelanggan:** Sistem tingkatan/tier pelanggan otomatis (Bronze, Silver, Gold, Platinum).
- **Voucher & Diskon:** Manajemen kode promo (*Voucher*) dan spesifikasi aturan diskon.

### 📊 Intelijen Bisnis (BI)
- **Dashboard Real-time:** Pelacakan pendapatan langsung dan penghitung transaksi berjalan.
- **Laporan Komprehensif:** Tampilan bagan analitik pendapatan historis menggunakan antarmuka interaktif yang dipoles.

### 🛡️ Keamanan & Kontrol Akses (RBAC)
- **Role-Based Access Control:** Perizinan modul spesifik per peran.
  - **Kasir:** Melakukan transaksi dan membuka/menutup sesi kas.
  - **Admin:** Mengelola data produk, stok operasional, dan membuat akun staf kasir.
  - **Owner:** Akses penuh seluruh sistem termasuk manajemen log keamanan dan konfigurasi.
- **Audit Logs:** Pelacakan penuh (*Traceability*) untuk setiap tindakan berisiko di dalam sistem (Login, Refund, Hapus Item, dsb).
- **Cash Management:** Sesi pengaturan kas terstruktur (Verifikasi saldo pembuka dan penutup).

---

## 🛠️ Tumpukan Teknologi (*Tech Stack*)

| Lapisan | Teknologi |
| :--- | :--- |
| **Frontend** | React 18, Vite, Tailwind CSS (Stitch UI), Lucide React, Axios, Recharts |
| **Backend** | Node.js, Express, TypeScript |
| **Database** | PostgreSQL |
| **ORM** | Prisma |
| **Autentikasi** | JWT (JSON Web Tokens) dengan Middleware perizinan berlapis |

---

## 🚀 Memulai Proyek

### Prasyarat
- Node.js (v18 atau lebih baru)
- PostgreSQL Instance
- npm atau yarn

### 1. Pengaturan Database
```bash
# Di dalam direktori /server
npm install
cp .env.example .env
# Edit file .env dan atur string koneksi DATABASE_URL Anda
npx prisma migrate dev --name init
npx prisma db seed # Penting: Untuk memasukkan Role dan Permission wajib
```

### 2. Inisialisasi Backend
```bash
cd server
npm run dev
# Server akan berjalan pada port http://localhost:5000
```

### 3. Inisialisasi Frontend
```bash
cd client
npm install
npm run dev
# Dashboard & Aplikasi klien tersedia di http://localhost:5173
```

---

## 🔒 Variabel Lingkungan (*Environment Variables*)
Pastikan hal berikut telah dikonfigurasi pada `server/.env`:
- `DATABASE_URL`: String koneksi PostgreSQL Anda.
- `JWT_SECRET`: String aman dan rahasia khusus untuk penandatanganan token.
- `PORT`: Port server (secara default `5000`).

---

## 🎨 Filosofi Desain
Aplikasi ini secara eksklusif memanfaatkan pedoman rancangan **"Stitch Design System"**:
- **Kesederhanaan Profesional:** Tema gelap keabuan (*Card Dark* / *Background Dark*) dengan pembatasan yang bersih tanpa *glassmorphism* berlebihan.
- **Aksen Presisi:** Penggunaan indikator sekunder bernuansa *Green Primary* secara optimal.
- **Tipografi:** Keluarga font `Manrope` yang dirancang untuk keterbacaan tingkat lanjut di layar lebat data.
- **Ikonografi:** Integrasi bersih dengan *Google Material Symbols Outlined*.

---

## 📄 Lisensi
Didistribusikan di bawah Lisensi MIT. Lihat file `LICENSE` untuk informasi selengkapnya.

---
*Diciptakan dengan kehati-hatian untuk standar keunggulan ritel.*
