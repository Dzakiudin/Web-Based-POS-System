<?php
session_start();

// Pastikan session sudah ter-set dan periksa peran pengguna
if (!isset($_SESSION['role'])) {
    header("Location: login.php"); // Jika tidak ada role, arahkan ke halaman login
    exit();
}

$role = $_SESSION['role']; // Role pengguna (admin atau kasir)

// Database connection
$conn = new mysqli("localhost", "root", "", "kasir");

// Check connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

// Fetch data counts
$pelangganCount = $conn->query("SELECT COUNT(*) AS count FROM pelanggan")->fetch_assoc()['count'];
$produkCount = $conn->query("SELECT COUNT(*) AS count FROM produk")->fetch_assoc()['count'];
$transaksiCount = $conn->query("SELECT COUNT(*) AS count FROM penjualan")->fetch_assoc()['count'];
$totalTransaksi = $conn->query("SELECT SUM(TotalHarga) AS total FROM penjualan")->fetch_assoc()['total'];

// Fetch data for charts
$pelangganData = $conn->query("SELECT p.NamaPelanggan, COUNT(*) AS count FROM penjualan j JOIN pelanggan p ON j.PelangganID = p.PelangganID GROUP BY p.NamaPelanggan ORDER BY count DESC");
$produkData = $conn->query("SELECT p.NamaProduk, SUM(dp.JumlahProduk) AS count FROM detailpenjualan dp JOIN produk p ON dp.ProdukID = p.ProdukID GROUP BY p.NamaProduk ORDER BY count DESC");
$transaksiData = $conn->query("SELECT TanggalPenjualan, COUNT(*) AS count FROM penjualan GROUP BY TanggalPenjualan");
$totalTransaksiData = $conn->query("SELECT TanggalPenjualan, SUM(TotalHarga) AS total FROM penjualan GROUP BY TanggalPenjualan");

$conn->close();
?>

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="utf-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
    <meta name="description" content="Pengelolaan Basis Data" />
    <meta name="author" content="" />
    <title>Pengelolaan Basis Data - Dashboard</title>
    <link href="https://cdn.jsdelivr.net/npm/simple-datatables@7.1.2/dist/style.min.css" rel="stylesheet" />
    <link href="css/styles.css" rel="stylesheet" />
    <script src="https://use.fontawesome.com/releases/v6.3.0/js/all.js" crossorigin="anonymous"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css" rel="stylesheet" crossorigin="anonymous">
    <style>
        .card-footer {
            padding: 0;
            background-color: white; /* Set background color to white */
        }
        .chart-container {
            position: relative;
            height: 200px;
        }
        .card-body1 {
            height: 300px; /* Adjust the height as needed */
        }
    </style>
</head>

<body class="sb-nav-fixed">
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

                        <!-- Menu yang sama untuk Admin dan Kasir -->
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

                        <!-- Tambahkan tombol Transaksi di sidebar -->
                        <a class="nav-link" href="transaksi.php">
                            <div class="sb-nav-link-icon"><i class="fas fa-shopping-cart"></i></div>
                            Transaksi
                        </a>

                        <!-- Fitur untuk Admin -->
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
                    <h1 class="mt-4">Dashboard</h1>
                    <ol class="breadcrumb mb-4">
                        <li class="breadcrumb-item active">Dashboard</li>
                    </ol>

                    <div class="row">
                        <!-- Display data counts at the top -->
                        <div class="col-xl-3 col-md-6">
                            <div class="card bg-primary text-white mb-4">
                                <div class="card-body">Pelanggan: <?php echo $pelangganCount; ?></div>
                            </div>
                        </div>
                        <div class="col-xl-3 col-md-6">
                            <div class="card bg-info text-white mb-4">
                                <div class="card-body">Produk: <?php echo $produkCount; ?></div>
                            </div>
                        </div>
                        <div class="col-xl-3 col-md-6">
                            <div class="card bg-success text-white mb-4">
                                <div class="card-body">Jumlah Transaksi: <?php echo $transaksiCount; ?></div>
                            </div>
                        </div>
                        <div class="col-xl-3 col-md-6">
                            <div class="card bg-secondary text-white mb-4">
                                <div class="card-body">Total Transaksi: <?php echo number_format($totalTransaksi, 2); ?></div>
                            </div>
                        </div>
                    </div>

                    <!-- Separate sections for each chart -->
                    <div class="row">
                        <div class="col-xl-6">
                            <div class="card mb-4">
                                <div class="card-header">
                                    <i class="fas fa-chart-bar me-1"></i>
                                    Pelanggan
                                </div>
                                <div class="card-body1">
                                    <canvas id="pelangganChart"></canvas>
                                </div>
                            </div>
                        </div>
                        <div class="col-xl-6">
                            <div class="card mb-4">
                                <div class="card-header">
                                    <i class="fas fa-chart-pie me-1"></i>
                                    Produk
                                </div>
                                <div class="card-body2">
                                    <canvas id="produkChart"></canvas>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="row">
                        <div class="col-xl-6">
                            <div class="card mb-4">
                                <div class="card-header">
                                    <i class="fas fa-chart-line me-1"></i>
                                    Transaksi
                                </div>
                                <div class="card-body3">
                                    <canvas id="transaksiChart"></canvas>
                                </div>
                            </div>
                        </div>
                        <div class="col-xl-6">
                            <div class="card mb-4">
                                <div class="card-header">
                                    <i class="fas fa-chart-line me-1"></i>
                                    Keuangan
                                </div>
                                <div class="card-body4">
                                    <canvas id="totalTransaksiChart"></canvas>
                                </div>
                            </div>
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
        // Data for charts
        const pelangganData = <?php echo json_encode($pelangganData->fetch_all(MYSQLI_ASSOC)); ?>;
        const produkData = <?php echo json_encode($produkData->fetch_all(MYSQLI_ASSOC)); ?>;
        const transaksiData = <?php echo json_encode($transaksiData->fetch_all(MYSQLI_ASSOC)); ?>;
        const totalTransaksiData = <?php echo json_encode($totalTransaksiData->fetch_all(MYSQLI_ASSOC)); ?>;

        // Pelanggan Chart
        const pelangganCtx = document.getElementById('pelangganChart').getContext('2d');
        new Chart(pelangganCtx, {
            type: 'bar',
            data: {
                labels: pelangganData.map(data => data.NamaPelanggan),
                datasets: [{
                    label: 'Total Transaksi',
                    data: pelangganData.map(data => data.count),
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });

        // Produk Chart
        const produkCtx = document.getElementById('produkChart').getContext('2d');
        new Chart(produkCtx, {
            type: 'pie',
            data: {
                labels: produkData.map(data => data.NamaProduk),
                datasets: [{
                    label: 'Jumlah Terjual',
                    data: produkData.map(data => data.count),
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.2)',
                        'rgba(54, 162, 235, 0.2)',
                        'rgba(255, 206, 86, 0.2)',
                        'rgba(75, 192, 192, 0.2)',
                        'rgba(153, 102, 255, 0.2)',
                        'rgba(255, 159, 64, 0.2)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(153, 102, 255, 1)',
                        'rgba(255, 159, 64, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });

        // Transaksi Chart
        const transaksiCtx = document.getElementById('transaksiChart').getContext('2d');
        new Chart(transaksiCtx, {
            type: 'line',
            data: {
                labels: transaksiData.map(data => data.TanggalPenjualan),
                datasets: [{
                    label: 'Jumlah Transaksi',
                    data: transaksiData.map(data => data.count),
                    backgroundColor: 'rgba(153, 102, 255, 0.2)',
                    borderColor: 'rgba(153, 102, 255, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });

        // Total Transaksi Chart
        const totalTransaksiCtx = document.getElementById('totalTransaksiChart').getContext('2d');
        new Chart(totalTransaksiCtx, {
            type: 'line',
            data: {
                labels: totalTransaksiData.map(data => data.TanggalPenjualan),
                datasets: [{
                    label: 'Total Keuangan',
                    data: totalTransaksiData.map(data => data.total),
                    backgroundColor: 'rgba(255, 159, 64, 0.2)',
                    borderColor: 'rgba(255, 159, 64, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    </script>
</body>

</html>