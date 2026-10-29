<!--
  Midnight Glass POS Pro
  Professional project documentation
-->

<div align="center">

<img src="https://raw.githubusercontent.com/Dzakiudin/Web-Based-POS-System/main/docs/dashboard.png" alt="Midnight Glass POS Pro dashboard preview" width="100%">

# Midnight Glass POS Pro

**Sistem Point of Sale dan manajemen ritel untuk membantu operasional bisnis lebih terstruktur.**

Kelola transaksi, inventaris, pelanggan, kasir, dan laporan penjualan melalui satu antarmuka modern.

<p>
  <a href="#-fitur-utama">Fitur</a> ·
  <a href="#-pratinjau-aplikasi">Pratinjau</a> ·
  <a href="#-teknologi">Teknologi</a> ·
  <a href="#-instalasi-lokal">Instalasi</a>
</p>

![Platform](https://img.shields.io/badge/Platform-Web-101f19?style=for-the-badge)
![Frontend](https://img.shields.io/badge/Frontend-React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Backend](https://img.shields.io/badge/Backend-Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Database](https://img.shields.io/badge/Database-PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)

</div>

---

## 📌 Tentang Proyek

**Midnight Glass POS Pro** adalah aplikasi *Point of Sale* (POS) berbasis web untuk membantu pengelolaan kegiatan ritel dari proses checkout hingga pemantauan performa penjualan. Antarmuka bertema gelap dengan aksen hijau dirancang agar informasi operasional mudah dipindai.

Proyek ini menggabungkan aplikasi *frontend* React dengan layanan *backend* berbasis Node.js dan Express, serta PostgreSQL sebagai basis data relasional melalui Prisma ORM.

## ✨ Fitur Utama

### 🛒 Kasir dan transaksi
- Antarmuka POS khusus untuk mempercepat proses checkout.
- Pencarian produk dan pemfilteran berdasarkan kategori.
- Penghitungan subtotal dan diskon.
- Dukungan alur transaksi seperti *hold*, *void*, dan *refund* sesuai implementasi aplikasi.

### 📦 Inventaris dan stok
- Pengelolaan produk serta varian produk.
- Pencatatan mutasi stok: stok masuk, stok keluar, dan penyesuaian stok.
- Indikator stok rendah untuk membantu proses pengisian ulang.
- Riwayat perubahan stok sebagai referensi operasional.

### 💵 Manajemen kas
- Pencatatan saldo awal kasir ketika membuka sesi.
- Pencatatan saldo akhir saat menutup sesi.
- Perbandingan nilai kas berdasarkan transaksi dan hasil penghitungan kas fisik.

### 📊 Dasbor dan laporan
- Ringkasan indikator performa penjualan.
- Visualisasi tren pendapatan.
- Riwayat transaksi untuk membantu pemantauan aktivitas toko.
- Fitur ekspor laporan yang tersedia pada aplikasi.

### 👥 Pelanggan dan loyalitas
- Pencatatan informasi pelanggan.
- Pengelompokan tingkat loyalitas pelanggan berdasarkan aturan aplikasi.
- Dukungan voucher atau promosi sesuai konfigurasi sistem.

### 🔐 Hak akses dan audit
- Pemisahan peran pengguna, seperti Kasir, Admin, dan Owner.
- Pembatasan akses fitur berdasarkan peran.
- Pencatatan aktivitas sensitif untuk membantu penelusuran perubahan.

> **Catatan:** Daftar di atas merangkum kemampuan yang didokumentasikan proyek. Rincian fitur dapat berbeda berdasarkan konfigurasi dan implementasi kode pada versi yang digunakan.

## 🖥️ Pratinjau Aplikasi

<div align="center">

### Dasbor Utama

<img src="docs/dashboard.png" alt="Pratinjau dasbor utama" width="100%">

### Kasir — Order & Payment

<img src="docs/order%20%26%20payment.png" alt="Pratinjau halaman order dan pembayaran" width="100%">

### Detail Transaksi

<img src="docs/detail%20transaksi.png" alt="Pratinjau detail transaksi" width="100%">

### Manajemen Pelanggan

<img src="docs/pelanggan.png" alt="Pratinjau manajemen pelanggan" width="100%">

</div>

## 🧰 Teknologi

| Bagian | Teknologi |
|---|---|
| Frontend | React, TypeScript, Vite, Tailwind CSS |
| Navigasi | React Router |
| HTTP client | Axios |
| Visualisasi data | Recharts |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL |
| ORM dan migrasi | Prisma |
| Autentikasi | JSON Web Token (JWT) |
| Ikon | Lucide React |

Teknologi berdasarkan dependensi yang tercantum pada konfigurasi proyek. Pastikan versi paket dan kebutuhan lingkungan disesuaikan dengan berkas konfigurasi di repositori.

## ⚙️ Instalasi Lokal

### Prasyarat

Pastikan perangkat Anda telah memiliki:

- Node.js dan npm.
- PostgreSQL yang sudah berjalan.
- Git (opsional, untuk melakukan *clone* repositori).

### 1. Clone repositori

```bash
git clone https://github.com/Dzakiudin/Web-Based-POS-System.git
cd Web-Based-POS-System
```

### 2. Instal dan konfigurasi backend

```bash
cd server
npm install
```

Siapkan variabel lingkungan backend sesuai konfigurasi proyek. Minimal, periksa nilai koneksi database PostgreSQL dan rahasia JWT sebelum menjalankan server. Jangan mengunggah berkas `.env` atau kredensial pribadi ke repositori.

Contoh format koneksi database:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/NAMA_DATABASE"
JWT_SECRET="ganti_dengan_secret_yang_aman"
PORT=5000
```

Pastikan variabel yang diperlukan cocok dengan skema Prisma serta kode aplikasi di versi proyek yang Anda gunakan.

Jalankan migrasi dan *seed* jika konfigurasi Prisma proyek telah disiapkan:

```bash
npx prisma migrate dev
npx prisma db seed
```

Jalankan layanan backend:

```bash
npm run dev
```

### 3. Instal dan jalankan frontend

Buka terminal baru dari direktori utama repositori:

```bash
cd client
npm install
npm run dev
```

Vite akan menampilkan URL lokal pada terminal, biasanya `http://localhost:5173`. Pastikan alamat API backend dan konfigurasi CORS sesuai lingkungan lokal Anda.

## 🔑 Akun Pengujian

README sebelumnya mencantumkan akun *seed* berikut. Gunakan hanya pada lingkungan lokal setelah menjalankan seeder, dan ubah kredensial sebelum penggunaan yang dapat diakses pihak lain.

| Peran | Username | Password |
|---|---|---|
| Administrator | `admin` | `admin123` |
| Kasir | `user1` | `123456` |

**Keamanan:** kredensial di atas bersifat untuk pengujian lokal dan bukan untuk server produksi. Jangan gunakan kata sandi tersebut pada akun atau layanan lain.

## 🎨 Arah Desain

- **Dark interface:** latar arang kehijauan untuk tampilan yang konsisten.
- **Green accent:** aksen hijau untuk menonjolkan tindakan utama dan informasi penting.
- **Operational dashboard:** kartu ringkasan, grafik, dan tabel transaksi untuk memudahkan pemantauan.
- **Responsive workflow:** susunan antarmuka dibuat untuk mendukung kebutuhan operasional ritel.

## 🗺️ Struktur Direktori

```text
Web-Based-POS-System/
├── client/          # Frontend React + TypeScript
├── server/          # Backend Express + TypeScript
├── docs/            # Banner dan tangkapan layar dokumentasi
└── README.md
```

## 🛡️ Catatan Keamanan

- Simpan kredensial, API key, dan rahasia aplikasi hanya dalam variabel lingkungan.
- Gunakan kata sandi kuat untuk akun di luar pengujian lokal.
- Verifikasi konfigurasi autentikasi, otorisasi, CORS, dan database sebelum *deployment*.
- Lakukan pencadangan basis data secara berkala sesuai kebutuhan operasional.

## 📄 Lisensi

Periksa berkas lisensi yang tersedia pada repositori untuk ketentuan penggunaan, distribusi, dan modifikasi proyek.

---

<div align="center">

**Midnight Glass POS Pro**  
*More clarity in every transaction.*

Dibangun untuk mendukung pengelolaan ritel yang lebih teratur.

</div>
