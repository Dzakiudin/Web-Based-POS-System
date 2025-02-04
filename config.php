<?php
$host = "localhost"; // Nama host database
$username = "root"; // Username database (sesuaikan dengan konfigurasi Anda)
$password = ""; // Password database (sesuaikan dengan konfigurasi Anda)
$dbname = "kasir"; // Nama database Anda

// Membuat koneksi ke database
$conn = new mysqli($host, $username, $password, $dbname);

// Mengecek koneksi
if ($conn->connect_error) {
    die("Koneksi gagal: " . $conn->connect_error);
}
?>
