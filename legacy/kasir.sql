-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Waktu pembuatan: 04 Feb 2025 pada 08.32
-- Versi server: 10.4.32-MariaDB
-- Versi PHP: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `kasir`
--

-- --------------------------------------------------------

--
-- Struktur dari tabel `detailpenjualan`
--

CREATE TABLE `detailpenjualan` (
  `DetailID` int(11) NOT NULL,
  `PenjualanID` int(11) DEFAULT NULL,
  `ProdukID` int(11) DEFAULT NULL,
  `JumlahProduk` int(11) NOT NULL,
  `Subtotal` decimal(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `detailpenjualan`
--

INSERT INTO `detailpenjualan` (`DetailID`, `PenjualanID`, `ProdukID`, `JumlahProduk`, `Subtotal`) VALUES
(149, 153, 27, 2, 10000.00),
(150, 153, 28, 1, 3000.00),
(151, 154, 29, 2, 4000.00),
(152, 154, 28, 3, 9000.00),
(153, 154, 27, 1, 5000.00),
(154, 155, 27, 2, 10000.00),
(155, 155, 28, 1, 3000.00),
(156, 155, 29, 3, 6000.00),
(157, 156, 27, 5, 25000.00),
(158, 156, 28, 4, 12000.00),
(159, 156, 29, 5, 10000.00),
(160, 157, 27, 1, 5000.00),
(161, 157, 28, 2, 6000.00),
(162, 157, 29, 3, 6000.00),
(163, 158, 27, 1, 5000.00),
(164, 159, 29, 2, 4000.00),
(165, 159, 28, 1, 3000.00),
(166, 160, 28, 4, 12000.00),
(167, 161, 29, 1, 2000.00),
(168, 161, 28, 1, 3000.00),
(169, 161, 27, 3, 15000.00),
(170, 163, 29, 3, 6000.00),
(171, 163, 28, 2, 6000.00),
(172, 163, 27, 3, 15000.00),
(173, 164, 31, 3, 6000.00),
(174, 164, 30, 1, 10000.00),
(175, 164, 29, 1, 2000.00),
(176, 165, 28, 2, 6000.00),
(177, 165, 27, 1, 5000.00),
(178, 165, 31, 3, 6000.00),
(179, 166, 27, 3, 15000.00),
(180, 167, 29, 3, 6000.00),
(181, 168, 27, 1, 5000.00),
(182, 169, 30, 2, 20000.00),
(183, 169, 31, 1, 2000.00),
(184, 170, 30, 2, 20000.00),
(185, 170, 27, 1, 5000.00),
(186, 170, 28, 1, 3000.00),
(187, 171, 31, 2, 4000.00),
(188, 171, 30, 2, 20000.00),
(189, 172, 27, 1, 5000.00),
(190, 172, 31, 1, 2000.00),
(191, 173, 31, 1, 2000.00),
(192, 173, 30, 2, 20000.00);

-- --------------------------------------------------------

--
-- Struktur dari tabel `pelanggan`
--

CREATE TABLE `pelanggan` (
  `PelangganID` int(11) NOT NULL,
  `NamaPelanggan` varchar(255) NOT NULL,
  `Alamat` text DEFAULT NULL,
  `NomorTelepon` varchar(15) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `pelanggan`
--

INSERT INTO `pelanggan` (`PelangganID`, `NamaPelanggan`, `Alamat`, `NomorTelepon`) VALUES
(32, 'ilyas', 'gapura', '67221987614'),
(34, 'rapli', 'kolor', '69876874214'),
(35, 'wardan', 'juluk', '67886574214'),
(36, 'lanang', 'kalianget', '67221874214'),
(37, 'fajril', 'paberasan', '69875987614'),
(39, 'yono', 'bluto', '69874987614');

-- --------------------------------------------------------

--
-- Struktur dari tabel `penjualan`
--

CREATE TABLE `penjualan` (
  `PenjualanID` int(11) NOT NULL,
  `TanggalPenjualan` date NOT NULL,
  `TotalHarga` decimal(10,2) NOT NULL,
  `PelangganID` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `penjualan`
--

INSERT INTO `penjualan` (`PenjualanID`, `TanggalPenjualan`, `TotalHarga`, `PelangganID`) VALUES
(122, '2025-01-24', 2500.00, NULL),
(123, '2025-01-24', 2500.00, NULL),
(124, '2025-01-24', 8000.00, NULL),
(125, '2025-01-26', 3000.00, NULL),
(126, '2025-01-26', 8000.00, NULL),
(127, '2025-01-26', 8000.00, NULL),
(128, '2025-01-26', 1000.00, NULL),
(129, '2025-01-26', 2000.00, NULL),
(130, '2025-01-26', 3000.00, NULL),
(131, '2025-01-26', 8000.00, NULL),
(132, '2025-01-26', 3000.00, NULL),
(133, '2025-01-26', 8000.00, NULL),
(134, '2025-01-26', 8000.00, NULL),
(135, '2025-01-26', 0.00, NULL),
(136, '2025-01-26', 8000.00, NULL),
(137, '2025-01-26', 8000.00, NULL),
(138, '2025-01-26', 8000.00, NULL),
(139, '2025-01-26', 2500.00, NULL),
(140, '2025-01-26', 0.00, NULL),
(141, '2025-01-26', 8000.00, NULL),
(142, '2025-01-26', 13500.00, NULL),
(143, '2025-01-26', 21500.00, NULL),
(144, '2025-01-26', 2000.00, NULL),
(145, '2025-01-26', 1000.00, NULL),
(146, '2025-01-26', 4000.00, NULL),
(147, '2025-01-26', 4500.00, NULL),
(148, '2025-01-26', 4500.00, NULL),
(149, '2025-01-26', 4500.00, NULL),
(152, '2025-01-26', 13000.00, NULL),
(153, '2025-01-26', 12870.00, NULL),
(154, '2025-01-26', 17820.00, NULL),
(155, '2025-01-26', 18810.00, NULL),
(156, '2025-01-26', 47000.00, NULL),
(157, '2025-01-29', 16830.00, 32),
(158, '2025-01-30', 4950.00, 32),
(159, '2025-01-30', 6930.00, 32),
(160, '2025-01-30', 11880.00, 32),
(161, '2025-01-30', 19800.00, NULL),
(162, '2025-01-30', 0.00, NULL),
(163, '2025-01-30', 26730.00, NULL),
(164, '2025-01-30', 17820.00, 36),
(165, '2025-01-30', 16830.00, 35),
(166, '2025-01-30', 14850.00, 34),
(167, '2025-01-30', 5940.00, NULL),
(168, '2025-02-04', 5000.00, NULL),
(169, '2025-02-04', 21780.00, 34),
(170, '2025-02-04', 27720.00, 34),
(171, '2025-02-04', 23760.00, 35),
(172, '2025-02-04', 7000.00, NULL),
(173, '2025-02-04', 21780.00, 37);

-- --------------------------------------------------------

--
-- Struktur dari tabel `produk`
--

CREATE TABLE `produk` (
  `ProdukID` int(11) NOT NULL,
  `NamaProduk` varchar(255) NOT NULL,
  `Harga` decimal(10,2) NOT NULL,
  `Stok` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `produk`
--

INSERT INTO `produk` (`ProdukID`, `NamaProduk`, `Harga`, `Stok`) VALUES
(27, 'kiko enak tau', 5000.00, 35),
(28, 'cocholatos', 3000.00, 37),
(29, 'AQUA', 2000.00, 37),
(30, 'beras 3kg', 10000.00, 990),
(31, 'pulpen', 2000.00, 139);

-- --------------------------------------------------------

--
-- Struktur dari tabel `user`
--

CREATE TABLE `user` (
  `user_id` int(11) NOT NULL,
  `nama` varchar(255) NOT NULL,
  `username` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `level` enum('admin','kasir') NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `user`
--

INSERT INTO `user` (`user_id`, `nama`, `username`, `password`, `level`) VALUES
(4, 'AHMAD DZAKIUDIN', 'admin', '$2y$10$TxPxCgQ4vsmWFhD/iKvEZuCos40cQZUSENATTwjPfctolgCTQk3K2', 'admin'),
(5, 'AHCMED RAFLI JULIAN SYAHPUTRA', 'petugas', '$2y$10$lzPn9h0Xl7jq6nmjJ6l/Be83J8pHT2dWfQTfE.Tze.fA/ssh.Iim6', 'kasir');

--
-- Indexes for dumped tables
--

--
-- Indeks untuk tabel `detailpenjualan`
--
ALTER TABLE `detailpenjualan`
  ADD PRIMARY KEY (`DetailID`),
  ADD KEY `PenjualanID` (`PenjualanID`),
  ADD KEY `ProdukID` (`ProdukID`);

--
-- Indeks untuk tabel `pelanggan`
--
ALTER TABLE `pelanggan`
  ADD PRIMARY KEY (`PelangganID`);

--
-- Indeks untuk tabel `penjualan`
--
ALTER TABLE `penjualan`
  ADD PRIMARY KEY (`PenjualanID`),
  ADD KEY `PelangganID` (`PelangganID`);

--
-- Indeks untuk tabel `produk`
--
ALTER TABLE `produk`
  ADD PRIMARY KEY (`ProdukID`);

--
-- Indeks untuk tabel `user`
--
ALTER TABLE `user`
  ADD PRIMARY KEY (`user_id`);

--
-- AUTO_INCREMENT untuk tabel yang dibuang
--

--
-- AUTO_INCREMENT untuk tabel `detailpenjualan`
--
ALTER TABLE `detailpenjualan`
  MODIFY `DetailID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=193;

--
-- AUTO_INCREMENT untuk tabel `pelanggan`
--
ALTER TABLE `pelanggan`
  MODIFY `PelangganID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=40;

--
-- AUTO_INCREMENT untuk tabel `penjualan`
--
ALTER TABLE `penjualan`
  MODIFY `PenjualanID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=174;

--
-- AUTO_INCREMENT untuk tabel `produk`
--
ALTER TABLE `produk`
  MODIFY `ProdukID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=32;

--
-- AUTO_INCREMENT untuk tabel `user`
--
ALTER TABLE `user`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- Ketidakleluasaan untuk tabel pelimpahan (Dumped Tables)
--

--
-- Ketidakleluasaan untuk tabel `detailpenjualan`
--
ALTER TABLE `detailpenjualan`
  ADD CONSTRAINT `detailpenjualan_ibfk_2` FOREIGN KEY (`ProdukID`) REFERENCES `produk` (`ProdukID`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `detailpenjualan_ibfk_3` FOREIGN KEY (`PenjualanID`) REFERENCES `penjualan` (`PenjualanID`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Ketidakleluasaan untuk tabel `penjualan`
--
ALTER TABLE `penjualan`
  ADD CONSTRAINT `penjualan_ibfk_1` FOREIGN KEY (`PelangganID`) REFERENCES `pelanggan` (`PelangganID`) ON DELETE SET NULL ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
