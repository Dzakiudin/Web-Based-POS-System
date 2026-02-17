<?php
session_start();
include 'config.php'; // Pastikan koneksi ke database sudah ada

// Pastikan session sudah ter-set dan periksa peran pengguna
if (!isset($_SESSION['role'])) {
    header("Location: login.php"); // Jika tidak ada role, arahkan ke halaman login
    exit();
}

$role = $_SESSION['role']; // Role pengguna (admin atau kasir)

// Query untuk mendapatkan data laporan penjualan
$sql = "
SELECT 
    penjualan.PenjualanID, 
    penjualan.TanggalPenjualan, 
    produk.NamaProduk, 
    detailpenjualan.JumlahProduk, 
    detailpenjualan.Subtotal
FROM 
    penjualan
INNER JOIN detailpenjualan ON penjualan.PenjualanID = detailpenjualan.PenjualanID
INNER JOIN produk ON detailpenjualan.ProdukID = produk.ProdukID
ORDER BY penjualan.TanggalPenjualan DESC
";
$result = $conn->query($sql);

// Tambah pelanggan
if (isset($_POST['add_pelanggan'])) {
    $nama = $_POST['NamaPelanggan'];
    $alamat = $_POST['Alamat'];
    $nomor = $_POST['NomorTelepon'];

    $query = "INSERT INTO pelanggan (NamaPelanggan, Alamat, NomorTelepon) VALUES ('$nama', '$alamat', '$nomor')";
    if (mysqli_query($conn, $query)) {
        $_SESSION['message'] = "Data pelanggan berhasil ditambahkan!";
    } else {
        $_SESSION['error'] = "Gagal menambahkan data pelanggan.";
    }
}

// Hapus pelanggan
if (isset($_GET['delete'])) {
    $id = $_GET['delete'];

    // Set PelangganID menjadi NULL pada tabel penjualan yang terkait
    $updateQuery = "UPDATE penjualan SET PelangganID = NULL WHERE PelangganID = $id";
    mysqli_query($conn, $updateQuery);

    // Hapus pelanggan
    $query = "DELETE FROM pelanggan WHERE PelangganID = $id";
    if (mysqli_query($conn, $query)) {
        $_SESSION['message'] = "Data pelanggan berhasil dihapus!";
    } else {
        $_SESSION['error'] = "Gagal menghapus data pelanggan.";
    }
}

?>

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="utf-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
    <meta name="description" content="Pengelolaan Basis Data" />
    <meta name="author" content="" />
    <title>Pengelolaan Basis Data - Laporan Penjualan</title>
    <link href="https://cdn.jsdelivr.net/npm/simple-datatables@7.1.2/dist/style.min.css" rel="stylesheet" />
    <link href="css/styles.css" rel="stylesheet" />
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
                        <a class="nav-link" href="laporan.php">
                            <div class="sb-nav-link-icon"><i class="fas fa-chart-line"></i></div>
                            Laporan Penjualan
                        </a>

                        <!-- Tambahkan tombol Transaksi di sidebar -->
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
                    <h1 class="mt-4">Tambah Pelanggan</h1>

                    <!-- Form tambah pelanggan -->
                    <form method="POST" class="mb-4">
                        <div class="mb-3">
                            <label for="NamaPelanggan" class="form-label">Nama Pelanggan</label>
                            <input type="text" name="NamaPelanggan" class="form-control" required>
                        </div>
                        <div class="mb-3">
                            <label for="Alamat" class="form-label">Alamat</label>
                            <textarea name="Alamat" class="form-control" rows="3"></textarea>
                        </div>
                        <div class="mb-3">
                            <label for="NomorTelepon" class="form-label">Nomor Telepon</label>
                            <input type="text" name="NomorTelepon" class="form-control">
                        </div>
                        <button type="submit" name="add_pelanggan" class="btn btn-primary">Tambah Pelanggan</button>
                    </form>

                    <!-- Pesan sukses atau error -->
                    <?php if (isset($_SESSION['message'])): ?>
                        <div class="alert alert-success"><?php echo $_SESSION['message'];
                        unset($_SESSION['message']); ?>
                        </div>
                    <?php endif; ?>
                    <?php if (isset($_SESSION['error'])): ?>
                        <div class="alert alert-danger"><?php echo $_SESSION['error'];
                        unset($_SESSION['error']); ?></div>
                    <?php endif; ?>

                    <h2 class="mt-4">Data Pelanggan</h2>

                    <!-- Search bar -->
                    <div class="mb-3">
                        <input type="text" id="searchCustomer" class="form-control" placeholder="Cari pelanggan...">
                    </div>

                    <!-- Tabel data pelanggan -->
                    <table class="table table-bordered" id="customerTable">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Nama Pelanggan</th>
                                <th>Alamat</th>
                                <th>Nomor Telepon</th>
                                <th>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php
                            $query = "SELECT * FROM pelanggan";
                            $result = mysqli_query($conn, $query);
                            $no = 1;
                            while ($row = mysqli_fetch_assoc($result)): ?>
                                <tr>
                                    <td><?php echo $no; ?></td>
                                    <td><?php echo $row['NamaPelanggan']; ?></td>
                                    <td><?php echo $row['Alamat']; ?></td>
                                    <td><?php echo $row['NomorTelepon']; ?></td>
                                    <td>
                                        <a href="edit_pelanggan.php?id=<?php echo $row['PelangganID']; ?>"
                                            class="btn btn-warning btn-sm">Edit</a>
                                        <a href="pelanggan.php?delete=<?php echo $row['PelangganID']; ?>"
                                            class="btn btn-danger btn-sm"
                                            onclick="return confirm('Yakin ingin menghapus?');">Hapus</a>
                                    </td>
                                </tr>
                            <?php $no++; ?>
                            <?php endwhile; ?>
                        </tbody>
                    </table>

                </div>
            </main>

            <!-- Footer -->
            <footer class="py-4 bg-light mt-auto">
                <div class="container-fluid px-4">
                    <div class="d-flex align-items-center justify-content-between small">
                        <div class="text-muted">Copyright &copy; zaki</div>
                    </div>
                </div>
            </footer>
        </div>
    </div>

    <!-- JS Scripts -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/js/bootstrap.bundle.min.js"
        crossorigin="anonymous"></script>
    <script src="js/scripts.js"></script>
    <script>
        document.getElementById('searchCustomer').addEventListener('keyup', function() {
            var searchValue = this.value.toLowerCase();
            var rows = document.querySelectorAll('#customerTable tbody tr');
            rows.forEach(function(row) {
                var nama = row.cells[1].textContent.toLowerCase();
                var alamat = row.cells[2].textContent.toLowerCase();
                if (nama.includes(searchValue) || alamat.includes(searchValue)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
    </script>
</body>

</html>

<?php
$conn->close();
?>