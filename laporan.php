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
    pelanggan.NamaPelanggan, 
    produk.NamaProduk, 
    detailpenjualan.JumlahProduk, 
    detailpenjualan.Subtotal
FROM 
    penjualan
LEFT JOIN pelanggan ON penjualan.PelangganID = pelanggan.PelangganID
INNER JOIN detailpenjualan ON penjualan.PenjualanID = detailpenjualan.PenjualanID
INNER JOIN produk ON detailpenjualan.ProdukID = produk.ProdukID
ORDER BY penjualan.TanggalPenjualan DESC, penjualan.PenjualanID DESC
";
$result = $conn->query($sql);
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
                <!-- Sidebar Menu -->
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
                        <a class="nav-link" href="transaksi.php">
                            <div class="sb-nav-link-icon"><i class="fas fa-shopping-cart"></i></div>
                            Transaksi
                        </a>
                        <?php if ($role == 'admin') { ?>
                            <a class="nav-link" href="register.php">
                                <div class="sb-nav-link-icon"><i class="fas fa-user-plus"></i></div>
                                Tambah User
                            </a>
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
                    <h1 class="mt-4">Laporan Penjualan</h1>
                    <ol class="breadcrumb mb=4">
                        <li class="breadcrumb-item active">Laporan Penjualan</li>
                    </ol>

                    <!-- Tabel untuk Menampilkan Data Laporan Penjualan -->
                    <h3>Data Laporan Penjualan</h3>
                    <div class="table-responsive">
                        <table id="salesReportTable" class="table table-bordered table-hover">
                            <thead class="thead-dark">
                                <tr>
                                    <th>No</th>
                                    <th>Tanggal Penjualan</th>
                                    <th>Nama Member</th>
                                    <th>Nama Produk</th>
                                    <th>Jumlah Produk</th>
                                    <th>Subtotal</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php
                                if ($result->num_rows > 0) {
                                    $no = 1;
                                    while ($row = $result->fetch_assoc()) {
                                        echo "<tr>";
                                        echo "<td>" . $no++ . "</td>";
                                        echo "<td>" . $row['TanggalPenjualan'] . "</td>";
                                        echo "<td>" . ($row['NamaPelanggan'] ?? 'Non-Member') . "</td>";
                                        echo "<td>" . $row['NamaProduk'] . "</td>";
                                        echo "<td>" . $row['JumlahProduk'] . "</td>";
                                        echo "<td>Rp" . number_format($row['Subtotal'], 0, ',', '.') . "</td>";
                                        echo "</tr>";
                                    }
                                } else {
                                    echo "<tr><td colspan='6'>Tidak ada data laporan penjualan</td></tr>";
                                }
                                ?>
                            </tbody>
                        </table>
                    </div>
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
    <script src="https://cdn.jsdelivr.net/npm/simple-datatables@7.1.2/dist/umd/simple-datatables.min.js"></script>
    <script>
        window.addEventListener('DOMContentLoaded', event => {
            const dataTable = new simpleDatatables.DataTable("#salesReportTable", {
                searchable: true,
                fixedHeight: true,
                perPage: 10
            });
        });
    </script>
</body>

</html>


<?php
$conn->close();
?>