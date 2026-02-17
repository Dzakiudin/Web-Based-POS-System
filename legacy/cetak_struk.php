<?php
// Koneksi ke database
$host = 'localhost';
$user = 'root';
$password = '';
$database = 'kasir';

$conn = new mysqli($host, $user, $password, $database);
if ($conn->connect_error) {
    die("Koneksi gagal: " . $conn->connect_error);
}

// Ambil penjualanID, uang_dibayar, kembalian, dan is_member dari URL
$penjualanID = $_GET['penjualanID'] ?? 0;
$uang_dibayar = $_GET['uang_dibayar'] ?? 0;
$kembalian = $_GET['kembalian'] ?? 0;
$isMember = $_GET['is_member'] ?? 0;

// Ambil data penjualan
$queryPenjualan = "SELECT * FROM penjualan WHERE PenjualanID = $penjualanID";
$resultPenjualan = $conn->query($queryPenjualan);
$penjualan = $resultPenjualan->fetch_assoc();

if (!$penjualan) {
    die("Transaksi tidak ditemukan.");
}

// Hitung diskon jika member
$diskon = 0;
$namaMember = '';
if ($isMember) {
    $diskon = $penjualan['TotalHarga'] * 0.01;
    $pelangganID = $penjualan['PelangganID'];
    $queryMember = "SELECT NamaPelanggan FROM pelanggan WHERE PelangganID = $pelangganID";
    $resultMember = $conn->query($queryMember);
    $member = $resultMember->fetch_assoc();
    $namaMember = $member['NamaPelanggan'];
}

// Ambil detail produk dalam penjualan
$queryDetail = "SELECT dp.*, p.NamaProduk 
                FROM detailpenjualan dp 
                JOIN produk p ON dp.ProdukID = p.ProdukID 
                WHERE dp.PenjualanID = $penjualanID";
$resultDetail = $conn->query($queryDetail);
?>

<!DOCTYPE html>
<html lang="id">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Struk Transaksi</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            font-size: 14px;
            margin: 0;
            padding: 0;
            text-align: center;
        }

        .container {
            width: 300px;
            margin: 0 auto;
            padding: 10px;
            border: 1px dashed #000;
        }

        .header {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 10px;
            text-align: center;
        }

        .line {
            border-top: 1px dashed #000;
            margin: 10px 0;
        }

        .footer {
            font-size: 12px;
            margin-top: 10px;
            text-align: center;
        }

        @media print {
            body * {
                visibility: hidden;
            }

            .container,
            .container * {
                visibility: visible;
            }

            .container {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
            }

            .modal-footer {
                display: none;
            }
        }
    </style>

    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css" rel="stylesheet">
</head>

<body>
    <div class="modal fade" id="strukModal" tabindex="-1" aria-labelledby="strukModalLabel" aria-hidden="true">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="strukModalLabel">Struk Transaksi</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <div class="container">
                        <div class="header">
                            Aplikasi kasir<br>
                            Pengelolaan Basis Data<br>
                        </div>
                        <div class="line"></div>
                        <p><strong>Tanggal:</strong> <?= $penjualan['TanggalPenjualan'] ?></p>
                        <p><strong>No. Struk:</strong> <?= $penjualan['PenjualanID'] ?></p>
                        <?php if ($isMember) { ?>
                            <p><strong>Nama Member:</strong> <?= $namaMember ?></p>
                        <?php } ?>
                        <div class="line"></div>
                        <?php while ($row = $resultDetail->fetch_assoc()) { ?>
                            <p>
                                <?= $row['NamaProduk'] ?><br>
                                <?= $row['JumlahProduk'] ?> x
                                Rp<?= number_format($row['Subtotal'] / $row['JumlahProduk'], 0, ',', '.') ?> =
                                Rp<?= number_format($row['Subtotal'], 0, ',', '.') ?>
                            </p>
                        <?php } ?>
                        <div class="line"></div>
                        <p><strong>Sub Total:</strong> Rp<?= number_format($penjualan['TotalHarga'], 0, ',', '.') ?></p>
                        <?php if ($isMember) { ?>
                            <p><strong>Potongan Diskon (1%):</strong> Rp<?= number_format($diskon, 0, ',', '.') ?></p>
                        <?php } ?>
                        <p><strong>Uang Dibayar:</strong> Rp<?= number_format($uang_dibayar, 0, ',', '.') ?></p>
                        <p><strong>Kembalian:</strong> Rp<?= number_format($kembalian, 0, ',', '.') ?></p>
                        <div class="line"></div>
                        <div class="footer">
                            No Telp:<br>
                            085707091624
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary"
                        onclick="window.location.href='transaksi.php'">Tutup</button>
                    <button type="button" class="btn btn-primary" onclick="window.print()">Cetak Struk</button>
                </div>
            </div>
        </div>
    </div>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/js/bootstrap.bundle.min.js"
        crossorigin="anonymous"></script>
    <script>
        var strukModal = new bootstrap.Modal(document.getElementById('strukModal'));
        strukModal.show();
    </script>
</body>

</html>