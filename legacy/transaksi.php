<?php
// Koneksi ke database
$host = 'localhost';
$user = 'root'; // Sesuaikan dengan username database Anda
$password = ''; // Sesuaikan dengan password database Anda
$database = 'kasir';

$conn = new mysqli($host, $user, $password, $database);


// Cek koneksi
if ($conn->connect_error) {
    die("Koneksi gagal: " . $conn->connect_error);
}

// Inisialisasi session untuk keranjang
session_start();
if (!isset($_SESSION['keranjang'])) {
    $_SESSION['keranjang'] = [];
}

// Pastikan session sudah ter-set dan periksa peran pengguna
if (!isset($_SESSION['role'])) {
    header("Location: login.php"); // Jika tidak ada role, arahkan ke halaman login
    exit();
}

$role = $_SESSION['role']; // Role pengguna (admin atau kasir)

// Tambahkan produk ke keranjang
if (isset($_POST['add_to_cart'])) {
    $produkID = $_POST['produkID'];
    $jumlah = $_POST['jumlah'];

    // Ambil detail produk
    $queryProduk = "SELECT * FROM produk WHERE ProdukID = $produkID";
    $resultProduk = $conn->query($queryProduk);
    $produk = $resultProduk->fetch_assoc();

    if ($produk && $produk['Stok'] >= $jumlah) {
        if (isset($_SESSION['keranjang'][$produkID])) {
            $_SESSION['keranjang'][$produkID]['jumlah'] += $jumlah;
        } else {
            $_SESSION['keranjang'][$produkID] = [
                'NamaProduk' => $produk['NamaProduk'],
                'Harga' => $produk['Harga'],
                'jumlah' => $jumlah,
            ];
        }
    } else {
        echo "<script>alert('Stok tidak mencukupi!');</script>";
    }
}

// Hapus produk dari keranjang
if (isset($_POST['remove_from_cart'])) {
    $produkID = $_POST['produkID'];
    unset($_SESSION['keranjang'][$produkID]);
}

// Ambil data pelanggan
$queryPelanggan = "SELECT * FROM pelanggan";
$resultPelanggan = $conn->query($queryPelanggan);

// Tambahkan sistem member
$isMember = false;
$pelangganID = null;
if (isset($_POST['pelanggan_id'])) {
    $pelangganID = $_POST['pelanggan_id'];
    if ($pelangganID != '') {
        $isMember = true;
    }
}

// Proses transaksi
if (isset($_POST['checkout'])) {
    $totalHarga = 0;
    foreach ($_SESSION['keranjang'] as $produkID => $item) {
        $totalHarga += $item['Harga'] * $item['jumlah'];
    }

    // Terapkan diskon 1% jika member
    if ($isMember) {
        $totalHarga *= 0.99;
    }

    $uangDibayar = $_POST['uang_dibayar'];
    $kembalian = $uangDibayar - $totalHarga;

    if ($kembalian < 0) {
        echo "<script>alert('Uang yang dibayar tidak cukup!');</script>";
    } else {
        $tanggal = date('Y-m-d');
        $pelangganIDValue = $pelangganID ? $pelangganID : 'NULL';
        $conn->query("INSERT INTO penjualan (TanggalPenjualan, TotalHarga, PelangganID) VALUES ('$tanggal', $totalHarga, $pelangganIDValue)");
        $penjualanID = $conn->insert_id;

        foreach ($_SESSION['keranjang'] as $produkID => $item) {
            $subtotal = $item['Harga'] * $item['jumlah'];
            $conn->query("INSERT INTO detailpenjualan (PenjualanID, ProdukID, JumlahProduk, Subtotal) 
                          VALUES ($penjualanID, $produkID, {$item['jumlah']}, $subtotal)");

            $conn->query("UPDATE produk SET Stok = Stok - {$item['jumlah']} WHERE ProdukID = $produkID");
        }

        $_SESSION['keranjang'] = [];

        // Redirect ke halaman cetak struk tanpa pop-up
        header("Location: cetak_struk.php?penjualanID=$penjualanID&kembalian=$kembalian&uang_dibayar=$uangDibayar&is_member=$isMember");
        exit();
    }
}


// Ambil data produk
$queryProduk = "SELECT * FROM produk";
$resultProduk = $conn->query($queryProduk);
?>

<!DOCTYPE html>
<html lang="id">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Transaksi</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="css/styles.css" rel="stylesheet">
    <script src="https://use.fontawesome.com/releases/v6.3.0/js/all.js" crossorigin="anonymous"></script>
</head>

<body class="sb-nav-fixed">
    <!-- Navbar -->
    <nav class="sb-topnav navbar navbar-expand navbar-dark bg-dark">
        <a class="navbar-brand ps-3" href="index.php">Pengelolaan Basis Data</a>
        <button class="btn btn-link btn-sm order-1 order-lg-0 me-4 me-lg-0" id="sidebarToggle" href="#"><i
                class="fas fa-bars"></i></button>
        <ul class="navbar-nav ms-auto ms-md-0 me-3 me-lg-4">
            <li class="nav-item dropdown">
                <a class="nav-link dropdown-toggle" id="navbarDropdown" href="#" role="button" data-bs-toggle="dropdown"
                    aria-expanded="false"><i class="fas fa-user fa-fw"></i></a>
                <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="navbarDropdown">
                    <li><a class="dropdown-item" href="logout.php">Logout</a></li>
                </ul>
            </li>
        </ul>
    </nav>

    <div id="layoutSidenav">
        <div id="layoutSidenav_nav">
            <nav class="sb-sidenav accordion sb-sidenav-dark" id="sidenavAccordion">
                <div class="sb-sidenav-menu">
                    <div class="nav">
                        <div class="sb-sidenav-menu-heading">Menu</div>
                        <a class="nav-link" href="index.php">
                            <div class="sb-nav-link-icon"><i class="fas fa-tachometer-alt"></i></div>
                            Dashboard
                        </a>
                        <a class="nav-link" href="produk.php">
                            <div class="sb-nav-link-icon"><i class="fas fa-box"></i></div>
                            Data Produk
                        </a>
                        <!-- Tambahkan tombol Laporan Penjualan di sidebar -->
                        <?php if ($role == 'admin') { ?>
                            <a class="nav-link" href="laporan.php">
                                <div class="sb-nav-link-icon"><i class="fas fa-chart-line"></i></div>
                                Laporan Penjualan
                            </a>
                        <?php } ?>
                        <a class="nav-link" href="transaksi.php">
                            <div class="sb-nav-link-icon"><i class="fas fa-shopping-cart"></i></div>
                            Transaksi
                        </a>
                        <!-- Menu Register hanya untuk Admin -->
                        <?php if ($role == 'admin') { ?>
                            <a class="nav-link" href="register.php">
                                <div class="sb-nav-link-icon"><i class="fas fa-user-plus"></i></div>
                                Tambah User
                            </a>
                        <?php } ?>

                        <!-- Tambahkan tombol Data Pelanggan di sidebar -->
                        <?php if ($role == 'admin') { ?>
                            <a class="nav-link" href="pelanggan.php">
                                <div class="sb-nav-link-icon"><i class="fas fa-users"></i></div>
                                Data Pelanggan
                            </a>
                        <?php } ?>
                    </div>
                </div>
                <div class="sb-sidenav-footer">
                    <div class="small">Logged in as:</div>
                    <?php echo ucfirst($role); ?>
                </div>
            </nav>
        </div>

        <div id="layoutSidenav_content">
            <main>
                <div class="container-fluid px-4">
                    <h1 class="mt-4">Transaksi</h1>

                    <div class="card mb-4">
                        <div class="card-header">
                            <i class="fas fa-user me-1"></i>
                            Data Pelanggan
                        </div>
                        <div class="card-body">
                            <form method="POST">
                                <div class="mb-3">
                                    <label for="pelanggan_id" class="form-label">Pilih Pelanggan:</label>
                                    <select name="pelanggan_id" id="pelanggan_id" class="form-select">
                                        <option value="">Pilih Pelanggan</option>
                                        <?php while ($row = $resultPelanggan->fetch_assoc()) { ?>
                                            <option value="<?= $row['PelangganID'] ?>" <?= isset($pelangganID) && $pelangganID == $row['PelangganID'] ? 'selected' : '' ?>><?= $row['NamaPelanggan'] ?></option>
                                        <?php } ?>
                                    </select>
                                </div>
                                <button type="submit" class="btn btn-primary">Pilih Pelanggan</button>
                            </form>
                        </div>
                    </div>

                    <div class="card mb-4">
                        <div class="card-header">
                            <i class="fas fa-shopping-cart me-1"></i>
                            Tambah Produk ke Keranjang
                        </div>
                        <div class="card-body">
                            <form method="POST">
                                <input type="hidden" name="pelanggan_id" value="<?= $pelangganID ?>">
                                <div class="mb-3">
                                    <label for="produkID" class="form-label">Pilih Produk:</label>
                                    <select name="produkID" id="produkID" class="form-select" required>
                                        <option value="">Pilih Produk</option>
                                        <?php while ($row = $resultProduk->fetch_assoc()) { ?>
                                            <option value="<?= $row['ProdukID'] ?>">
                                                <?= $row['NamaProduk'] ?> - Rp<?= number_format($row['Harga'], 2) ?> (Stok:
                                                <?= $row['Stok'] ?>)
                                            </option>
                                        <?php } ?>
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label for="jumlah" class="form-label">Jumlah:</label>
                                    <input type="number" name="jumlah" id="jumlah" class="form-control" required
                                        min="1">
                                </div>
                                <button type="submit" name="add_to_cart" class="btn btn-primary">Tambah ke
                                    Keranjang</button>
                            </form>
                        </div>
                    </div>

                    <div class="card mb-4">
                        <div class="card-header">
                            <i class="fas fa-cart-arrow-down me-1"></i>
                            Keranjang Belanja
                        </div>
                        <div class="card-body">
                            <table class="table table-bordered">
                                <thead>
                                    <tr>
                                        <th>Nama Produk</th>
                                        <th>Harga</th>
                                        <th>Jumlah</th>
                                        <th>Subtotal</th>
                                        <th>Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php $totalHarga = 0; ?>
                                    <?php foreach ($_SESSION['keranjang'] as $produkID => $item) { ?>
                                        <tr>
                                            <td><?= $item['NamaProduk'] ?></td>
                                            <td>Rp<?= number_format($item['Harga'], 2) ?></td>
                                            <td><?= $item['jumlah'] ?></td>
                                            <td>Rp<?= number_format($item['Harga'] * $item['jumlah'], 2) ?></td>
                                            <td>
                                                <form method="POST" style="display:inline;">
                                                    <input type="hidden" name="produkID" value="<?= $produkID ?>">
                                                    <button type="submit" name="remove_from_cart"
                                                        class="btn btn-danger btn-sm">Hapus</button>
                                                </form>
                                            </td>
                                        </tr>
                                        <?php $totalHarga += $item['Harga'] * $item['jumlah']; ?>
                                    <?php } ?>
                                    <tr></tr>
                                        <td colspan="3"><strong>Total Harga</strong></td>
                                        <td colspan="2"><strong>Rp<?= number_format($totalHarga, 2) ?></strong></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div class="card mb-4">
                        <div class="card-header">
                            <i class="fas fa-cash-register me-1"></i>
                            Checkout
                        </div>
                        <div class="card-body">
                            <form method="POST">
                                <input type="hidden" name="pelanggan_id" value="<?= $pelangganID ?>">
                                <div class="mb-3">
                                    <label for="uang_dibayar" class="form-label">Uang Dibayar:</label>
                                    <input type="number" name="uang_dibayar" id="uang_dibayar" class="form-control"
                                        required min="<?= $totalHarga ?>">
                                </div>
                                <button type="submit" name="checkout" class="btn btn-success">Bayar</button>
                            </form>
                        </div>
                    </div>
                </div>
            </main>

            <footer class="py-4 bg-light mt-auto">
                <div class="container-fluid px-4">
                    <div class="d-flex align-items-center justify-content-between small">
                        <div class="text-muted">Copyright &copy; zaki</div>
                    </div>
                </div>
            </footer>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/js/bootstrap.bundle.min.js"
        crossorigin="anonymous"></script>
    <script src="js/scripts.js"></script>
    <script>
        // Function to show the modal with the receipt
        function showReceiptModal(penjualanID, uangDibayar, kembalian) {
            var modal = new bootstrap.Modal(document.getElementById('strukModal'));
            document.getElementById('strukModalLabel').innerText = 'Struk Transaksi #' + penjualanID;
            document.getElementById('uangDibayar').innerText = 'Rp' + uangDibayar.toFixed(2);
            document.getElementById('kembalian').innerText = 'Rp' + kembalian.toFixed(2);
            modal.show();
        }
    </script>
</body>

</html>