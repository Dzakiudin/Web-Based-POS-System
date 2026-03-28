# 🌌 Midnight Glass POS Pro
> **Sistem Point of Sale & Analitik Komersial Premium**

![Platform](https://img.shields.io/badge/Platform-Web-indigo)
![Architecture](https://img.shields.io/badge/Architecture-MERN-blue?logo=react)
![UI](https://img.shields.io/badge/Design-Card_Dark-green)
![Database](https://img.shields.io/badge/Database-PostgreSQL-336791?logo=postgresql)

Midnight Glass POS adalah sistem Point of Sale premium berkinerja tinggi yang dirancang untuk lingkungan ritel modern. Dibangun dengan estetika yang bersih dan terlihat profesional, sistem ini menyediakan jembatan mulus antara manajemen bisnis yang kuat dan pengalaman pengguna yang mewah dan responsif.

---

## ✨ Penjelasan Detail Fitur Utama Aplikasi

### 🛒 POS Inti & Checkout Layar Penuh
Halaman Kasir (Transaksi) menggunakan pendekatan antarmuka layar penuh (*full-screen view*) khusus, bebas dari gangguan panel *sidebar*.  
- **Navigasi Cepat:** Memungkinkan staf kasir mencari barang dengan panel pencarian yang responsif, menyaring lewat kategori, dan melihat visual gambar maupun detail sisa stok *real-time*.
- **Keranjang Cerdas & Multi-Diskon:** Secara otomatis menghitung harga subtotal produk, dan mendukung integrasi potongan harga spesifik atau persen baik di tingkat produk maupun kupon keranjang keseluruhan.
- **Tindakan Lanjutan:** Termasuk dukungan untuk meletakan pesanan dalam mode "Tunda/Hold" ketika pelanggan belum siap membayar, dan memproses status transaksional seperti *Void* atau *Refund* penuh jika barang bermasalah.

### 📦 Manajemen Inventaris & Manajemen Stok Rinci
Modul Inventaris di desain bukan hanya untuk input stok, namun sebagai *ledger* atau riwayat mutasi stok.
- **Tiga Jenis Mutasi:** Seluruh perubahan stok dicatat dan wajib diklasifikasikan ke dalam: 
  - **Stok Masuk (In):** Pembelian dari pihak penyuplai (*Supplier*).
  - **Stok Keluar (Out):** Retur ke *Supplier* atau barang rusak.
  - **Opname Manual (Adjustment):** Sinkronisasi kecocokan antara pencatatan sistem dan ketersediaan barang di gudang.
- **Low Stock Alerts:** Indikator visual otomatis dan notifikasi di dalam panel lonceng sistem saat barang telah menyentuh batas minimal *Restock*.
- **Multi Varian Produk:** Sistem mendukung produk dengan sifat variatif kompleks (cth: ukuran sepatu, seri warna) dengan harga pokok produksi (HPP) independen *per varian*.

### � Arus Kas Sesi (Cash Management)
Keamanan fisik mesin register uang Anda dapat diandalkan menggunakan modul pengaturan sesi finansial yang ketat.
- **Sistem Shift Kasir:** Setiap staf kasir wajib mencatat jumlah modal/pecahan uang kertas pembuka (*Opening Balance*) di dalam mesin mereka sebelum dapat memulai berjualan pada hari tersebut.
- **Rekonsiliasi (Closing):** Pada penghujung hari operasional kasir wajib melakukan input penghitungan *Closing Balance*. Sistem akan otomatis mengalkulasikan penjualan sistem dan mencari apakah ada fenomena Uang Lebih/Uang Kurang (Diskrepansi) antara laci kas dan data server.

### 📊 Intelijen Bisnis & Laporan Keuangan (BI)
Ekstraksi data transaksi bervolume tinggi menjadi visualisasi yang intuitif.
- **Dashboard Overview:** Representasi *KPI (Key Performance Indicators)* kunci seperti Total Penjualan Hari Ini, Rata-Rata Nilai Transaksi (*AVO*), Status Staf Kasir yang aktif berjaga, beserta Bagan (*Area Chart*) Tren Pendapatan bulanan/harian.
- **Laporan Komprehensif:** Halaman analitik khusus bagi barisan *Manager* & *Owner* untuk menghasilkan metrik spesifik, lengkap dengan fitur untuk mengekspor data yang di_filter_ ini (*Export to Excel/PDF*) sebagai rujukan auditorial dan akuntansi.

### 💎 CRM & Program Loyalitas Voucher
Ekosistem pertahanan daya beli konsumen tingkat tinggi.
- **Tingkatan Pelanggan Otomatis (Tiering):** Sistem mengevaluasi kumulatif total belanja per nomor telepon (*Customer CRM*), memberikan status Bronze, Silver, Gold, atau Platinum secara otomatis.
- **Voucher Dinamis:** Generasi kode promo eksklusif untuk batas waktu tertentu, dapat dikonfigurasi apakah ia dapat dipakai berkali-kali (`maxUses`) atau memiliki batas minimum nominal transaksi belanja.

### 🛡️ Keamanan Lanjutan & *Role-Based Access Control* (RBAC)
Sebuah sistem terkoordinasi yang melindungi area sensitif perangkat lunak.
- **Struktur Perizinan Kuat Lintas Platform:** 
  - **Kasir:** Hanya diperbolehkan melakukan tugas mesin register belanja. Seluruh pengaturan inventori, produk, audit log telah diblokir keamanannya langsung dari dalam level *Backend/Server* API.
  - **Admin:** Memiliki otoritas masuk/keluar inventaris dan pendaftaran staf baru, namun diblokir dari area Audit sistem, hak manajerial, dan penghapusan *Database* (*Hard Delete*).
  - **Owner:** *Super-user* tunggal yang memiliki jangkauan kontrol paripurna sistem operasi perusahaan tanpa terkecuali.
- **Audit Logs Incorruptible:** Jika ada harga sebuah barang yang diedit, atau hak akses kasir yang dinaikkan perannya menjadi Admin, catatan kapan dan siapa pelakunya (*User + IP Address*) akan tercatat diam-diam secara mutlak di dalam _Security Audit Table_. Catatan ini secara pemrograman kebal dari tombol 'Hapus' sekalipun oleh Admin.

---

## 🛠️ Tumpukan Teknologi (*Tech Stack*) Dasar

| Lapisan | Pilihan Teknologi Inti |
| :--- | :--- |
| **Frontend** | React 18, Vite Bundler, Tailwind CSS 3, Lucide React Icons, Axios Client, Recharts.js |
| **Backend** | NodeJS (LTS), ExpressJS Framework, TypeScript Strict Mode |
| **Database** | PostgreSQL Proprietary Relational System |
| **ORM Integrations** | Prisma Client (Schema + Migrations) |
| **Autentikasi** | JSON Web Tokens (Encrypted JWT) tersinkronisasi Middleware *Express* perizinan majemuk |

---

## 🚀 Panduan Instalasi Lokal

### Prasyarat Instalasi
Pastikan PC/Server Anda sudah meng-_install_:
- **Node.js** (Versi v18 ke atas)
- **PostgreSQL Database** (Bisa diunduh via [PostgresApp](https://postgresapp.com/) / pgAdmin Windows)
- Akses terminal (`npm` / `yarn`)

### 1. Konfigurasi Basis Data (*Database Setup*)
```bash
# Arahkan terminal / CMD ke dalam direktori backend program
cd server
npm install

# Buat file environtment lokal baru meniru contoh
cp .env.example .env

# SANGAT PENTING: Buka file .env dan sesuaikan baris DATABASE_URL dengan format:
# postgresql://<user_database>:<password>@localhost:5432/<nama_database>
```

Silakan jalankan perintah migrasi ini untuk menyuntikkan skema *table* kosong beserta identitas pengaturan perizinan dasar perannya:
```bash
npx prisma migrate dev --name init
npx prisma db seed 
```

### 2. Membangkitkan Layanan Backend 
```bash
cd server
npm run dev
# Server sekarang berjalan di http://localhost:5000 dan bersiap melayani perintah / API calls.
```

### 3. Membangkitkan Klien Antarmuka (UI Frontend)
```bash
cd client
npm install
npm run dev
# Selesai! Aplikasi antarmuka Kasir Anda tesedia di http://localhost:5173
```

---

## 🔒 Tata Letak Variabel Lingkungan (*Environment Variables*)
Perhatikan `server/.env` agar program berinteraksi dengan wajar:
- `DATABASE_URL`: URI *Postgres* esensial Anda seperti langkah awal di atas.
- `JWT_SECRET`: Untaian string rahasia unik *(bebas, e.g. "my_super_secure_hash_secret_string"!)* agar klien tidak bisa meretas *cookies* kredensial masuk staf satu sama lain.
- `PORT`: Port mesin backend default `5000`.

---

## 🎨 Konsep Kesepakatan Desain (UI/UX)
Antarmuka sistem sangat dipengaruhi oleh estetika desain gelap korporasi:
- **Card-Dark Contrast Themes:** Kami menggunakan warna arang gelap (`#111813`) dan tepian bergaris (`border-dark`) demi mencegah kelalahan mata staf (*eye-strain*) yang bekerja sif lebih dari 10 jam/hari.
- **Accents:** Penggunaan elemen hijau cerah `#13ec5b` sebagai Call-To-Action yang jelas terlihat mata dalam kegelapan.
- **Perpaduan Form Factor:** Komponen `<Modal>` sistem dirancang mengambang di luar arus dom DOM standar (lapisan *lay-over*) demi interaksi yang tidak merusak aliran posisi ketikan staf.

---

## 📄 Lisensi Atribusi
Sistem sumber didistribusikan di bawah naungan Lisensi MIT Publik. Silakan lihat salinan berkas `LICENSE` (jika tersedia) untuk syarat pengutipan pemanfaatan (*fair use*). 

---
*Dibuat dengan efisiensi rekayasa mesin reaktif untuk mendorong ritel modern.*
