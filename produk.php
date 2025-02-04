<?php
session_start();
include 'config.php'; // Pastikan koneksi ke database sudah benar

// Pastikan session sudah ter-set dan periksa peran pengguna
if (!isset($_SESSION['role'])) {
    header("Location: login.php"); // Jika tidak ada role, arahkan ke halaman login
    exit();
}

$role = $_SESSION['role']; // Role pengguna (admin atau kasir)

// Proses saat form disubmit
if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['submit'])) {
    // Mengambil data dari form
    $NamaProduk = $conn->real_escape_string($_POST['nama_produk']);
    $Harga = $conn->real_escape_string($_POST['harga']);
    $Stok = $conn->real_escape_string($_POST['stok']);

    // Validasi: Pastikan stok tidak kosong dan lebih besar dari 0
    if ($Stok <= 0) {
        echo "<script>alert('Stok produk harus lebih besar dari 0 dan tidak boleh kosong!');</script>";
    } else {
        // Menyimpan data produk ke database
        $sql = "INSERT INTO produk (NamaProduk, Harga, Stok) 
                VALUES ('$NamaProduk', '$Harga', '$Stok')";

        if ($conn->query($sql) === TRUE) {
            echo "<script>alert('Produk berhasil ditambahkan!');</script>";
        } else {
            echo "Error: " . $sql . "<br>" . $conn->error;
        }
    }
}

// Ambil data produk untuk ditampilkan
$sql = "SELECT * FROM produk ORDER BY ProdukID DESC";
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
    <title>Pengelolaan Basis Data - Data Produk</title>
    <link href="https://cdn.jsdelivr.net/npm/simple-datatables@7.1.2/dist/style.min.css" rel="stylesheet" />
    <link href="css/styles.css" rel="stylesheet" />
    <script src="https://use.fontawesome.com/releases/v6.3.0/js/all.js" crossorigin="anonymous"></script>
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
                    <h1 class="mt-4">Data Produk</h1>
                    <ol class="breadcrumb mb-4">
                        <li class="breadcrumb-item active">Data Produk</li>
                    </ol>

                    <!-- Form untuk Menambah Data Produk -->
                    <form action="produk.php" method="post">
                        <div class="mb-3">
                            <label for="nama_produk" class="form-label">Nama Produk</label>
                            <input type="text" class="form-control" id="nama_produk" name="nama_produk" required>
                        </div>
                        <div class="mb-3">
                            <label for="harga" class="form-label">Harga</label>
                            <input type="number" class="form-control" id="harga" name="harga" required>
                        </div>
                        <div class="mb-3">
                            <label for="stok" class="form-label">Stok</label>
                            <input type="number" class="form-control" id="stok" name="stok" required>
                        </div>
                        <button type="submit" class="btn btn-primary" name="submit">Tambah Produk</button>
                    </form>

                    <hr>

                    <h3>Daftar Produk</h3>

                    <!-- Search bar -->
                    <div class="mb-3">
                        <input type="text" id="searchProduct" class="form-control" placeholder="Cari produk...">
                    </div>

                    <!-- Tabel untuk Menampilkan Data Produk -->
                    <table class="table table-bordered" id="productTable">
                        <thead>
                            <tr>
                                <th>No</th>
                                <th>Nama Produk</th>
                                <th>Harga</th>
                                <th>Stok</th>
                                <th>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php
                            if ($result->num_rows > 0) {
                                $no = 1;
                                while ($row = $result->fetch_assoc()) {
                                    echo "<tr>";
                                    echo "<td>" . $no++ . "</td>";
                                    echo "<td>" . $row['NamaProduk'] . "</td>";
                                    echo "<td>" . $row['Harga'] . "</td>";
                                    echo "<td>" . $row['Stok'] . "</td>";
                                    echo "<td>
                                        <a href='edit_produk.php?id=" . $row['ProdukID'] . "' class='btn btn-warning btn-sm'>Edit</a>
                                        <a href='hapus_produk.php?id=" . $row['ProdukID'] . "' class='btn btn-danger btn-sm' onclick='return confirm(\"Apakah Anda yakin ingin menghapus produk ini?\")'>Hapus</a>
                                    </td>";
                                    echo "</tr>";
                                }
                            } else {
                                echo "<tr><td colspan='5'>Tidak ada data produk</td></tr>";
                            }
                            ?>
                        </tbody>
                    </table>
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
    document.getElementById('searchProduct').addEventListener('keyup', function() {
        var searchValue = this.value.toLowerCase();
        var rows = document.querySelectorAll('#productTable tbody tr');
        rows.forEach(function(row) {
            var nama = row.cells[1].textContent.toLowerCase();
            if (nama.includes(searchValue)) {
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