<?php
session_start();
include 'config.php'; // File koneksi ke database

// Pastikan session sudah ter-set dan periksa peran pengguna
if (!isset($_SESSION['role'])) {
    header("Location: login.php"); // Jika tidak ada role, arahkan ke halaman login
    exit();
}

$role = $_SESSION['role']; // Role pengguna (admin atau kasir)

// Tambah pengguna
if (isset($_POST['register'])) {
    $nama = $_POST['nama'];
    $username = $_POST['username'];
    $password = $_POST['password'];
    $confirm_password = $_POST['confirm_password'];
    $level = $_POST['level'];

    // Validasi password
    if ($password !== $confirm_password) {
        $error = "Password dan konfirmasi password tidak cocok!";
    } else {
        // Hash password
        $hashed_password = password_hash($password, PASSWORD_DEFAULT);

        // Query untuk mengecek apakah username sudah ada
        $query = "SELECT * FROM user WHERE username = ? LIMIT 1";
        $stmt = $conn->prepare($query);
        $stmt->bind_param("s", $username);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows > 0) {
            $error = "Username sudah terdaftar!";
        } else {
            // Query untuk menyimpan data pengguna baru
            $query = "INSERT INTO user (nama, username, password, level) VALUES (?, ?, ?, ?)";
            $stmt = $conn->prepare($query);
            $stmt->bind_param("ssss", $nama, $username, $hashed_password, $level);

            if ($stmt->execute()) {
                $_SESSION['success'] = "Pendaftaran berhasil! Pengguna baru telah ditambahkan.";
            } else {
                $error = "Terjadi kesalahan saat pendaftaran!";
            }
        }
    }
}

// Hapus pengguna
if (isset($_GET['delete'])) {
    $id = $_GET['delete'];
    $query = "DELETE FROM user WHERE user_id = $id";
    if (mysqli_query($conn, $query)) {
        $_SESSION['message'] = "Data pengguna berhasil dihapus!";
    } else {
        $_SESSION['error'] = "Gagal menghapus data pengguna.";
    }
}

// Edit pengguna
if (isset($_POST['update'])) {
    $id = $_POST['user_id'];
    $nama = $_POST['nama'];
    $username = $_POST['username'];
    $level = $_POST['level'];

    // Jika password diisi, maka update password
    if (!empty($_POST['password'])) {
        $password = $_POST['password'];
        $hashed_password = password_hash($password, PASSWORD_DEFAULT);
        $query = "UPDATE user SET nama = ?, username = ?, password = ?, level = ? WHERE user_id = ?";
        $stmt = $conn->prepare($query);
        $stmt->bind_param("ssssi", $nama, $username, $hashed_password, $level, $id);
    } else {
        $query = "UPDATE user SET nama = ?, username = ?, level = ? WHERE user_id = ?";
        $stmt = $conn->prepare($query);
        $stmt->bind_param("sssi", $nama, $username, $level, $id);
    }

    if ($stmt->execute()) {
        $_SESSION['success'] = "Data pengguna berhasil diperbarui!";
    } else {
        $error = "Terjadi kesalahan saat memperbarui data pengguna!";
    }
}

// Ambil data pengguna untuk form edit
if (isset($_GET['edit'])) {
    $id = $_GET['edit'];
    $query = "SELECT * FROM user WHERE user_id = $id";
    $result = mysqli_query($conn, $query);
    $user = mysqli_fetch_assoc($result);
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
    <title>Pengelolaan Basis Data - Tambah Petugas/Admin</title>
    <link href="https://cdn.jsdelivr.net/npm/simple-datatables@7.1.2/dist/style.min.css" rel="stylesheet" />
    <link href="css/styles.css" rel="stylesheet" />
    <script src="https://use.fontawesome.com/releases/v6.3.0/js/all.js" crossorigin="anonymous"></script>
</head>
<body class="sb-nav-fixed">
    <!-- Navbar -->
    <nav class="sb-topnav navbar navbar-expand navbar-dark bg-dark">
        <a class="navbar-brand ps-3" href="index.php">Pengelolaan Basis Data</a>
        <button class="btn btn-link btn-sm order-1 order-lg-0 me-4 me-lg-0" id="sidebarToggle" href="#"><i class="fas fa-bars"></i></button>
        <ul class="navbar-nav ms-auto ms-md-0 me-3 me-lg-4">
            <li class="nav-item dropdown">
                <a class="nav-link dropdown-toggle" id="navbarDropdown" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false"><i class="fas fa-user fa-fw"></i></a>
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
                    <h1 class="mt-4"><?php echo isset($user) ? 'Edit Pengguna' : 'Tambah Petugas/Admin'; ?></h1>

                    <!-- Form tambah/edit pengguna -->
                    <form method="POST" class="mb-4">
                        <input type="hidden" name="user_id" value="<?php echo isset($user) ? $user['user_id'] : ''; ?>">
                        <div class="mb-3">
                            <label for="nama" class="form-label">Nama Lengkap</label>
                            <input type="text" name="nama" class="form-control" id="nama" value="<?php echo isset($user) ? $user['nama'] : ''; ?>" required>
                        </div>
                        <div class="mb-3">
                            <label for="username" class="form-label">Username</label>
                            <input type="text" name="username" class="form-control" id="username" value="<?php echo isset($user) ? $user['username'] : ''; ?>" required>
                        </div>
                        <div class="mb-3">
                            <label for="password" class="form-label">Password</label>
                            <input type="password" name="password" class="form-control" id="password">
                            <small class="form-text text-muted">Kosongkan jika tidak ingin mengubah password.</small>
                        </div>
                        <div class="mb-3">
                            <label for="confirm_password" class="form-label">Konfirmasi Password</label>
                            <input type="password" name="confirm_password" class="form-control" id="confirm_password">
                            <small class="form-text text-muted">Kosongkan jika tidak ingin mengubah password.</small>
                        </div>
                        <div class="mb-3">
                            <label for="level" class="form-label">Level</label>
                            <select name="level" class="form-select" id="level" required>
                                <option value="admin" <?php echo (isset($user) && $user['level'] == 'admin') ? 'selected' : ''; ?>>Admin</option>
                                <option value="kasir" <?php echo (isset($user) && $user['level'] == 'kasir') ? 'selected' : ''; ?>>Kasir</option>
                            </select>
                        </div>
                        <button type="submit" name="<?php echo isset($user) ? 'update' : 'register'; ?>" class="btn btn-primary"><?php echo isset($user) ? 'Update' : 'Daftar'; ?></button>
                    </form>

                    <!-- Pesan sukses atau error -->
                    <?php if (isset($error)) { echo "<div class='alert alert-danger'>$error</div>"; } ?>
                    <?php if (isset($_SESSION['success'])) { echo "<div class='alert alert-success'>".$_SESSION['success']."</div>"; unset($_SESSION['success']); } ?>

                    <h2 class="mt-4">Data Pengguna</h2>

                    <!-- Search bar -->
                    <div class="mb-3">
                        <input type="text" id="searchUser" class="form-control" placeholder="Cari pengguna...">
                    </div>

                    <!-- Tabel data pengguna -->
                    <table class="table table-bordered" id="userTable">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Nama</th>
                                <th>Username</th>
                                <th>Level</th>
                                <th>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php
                            $query = "SELECT * FROM user";
                            $result = mysqli_query($conn, $query);
                            $no = 1;
                            while ($row = mysqli_fetch_assoc($result)): ?>
                                <tr>
                                    <td><?php echo $no; ?></td>
                                    <td><?php echo $row['nama']; ?></td>
                                    <td><?php echo $row['username']; ?></td>
                                    <td><?php echo $row['level']; ?></td>
                                    <td>
                                        <a href="register.php?edit=<?php echo $row['user_id']; ?>" class="btn btn-warning btn-sm">Edit</a>
                                        <a href="register.php?delete=<?php echo $row['user_id']; ?>" class="btn btn-danger btn-sm" onclick="return confirm('Yakin ingin menghapus?');">Hapus</a>
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
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/js/bootstrap.bundle.min.js" crossorigin="anonymous"></script>
    <script src="js/scripts.js"></script>
    <script>
    document.getElementById('searchUser').addEventListener('keyup', function() {
        var searchValue = this.value.toLowerCase();
        var rows = document.querySelectorAll('#userTable tbody tr');
        rows.forEach(function(row) {
            var nama = row.cells[1].textContent.toLowerCase();
            var username = row.cells[2].textContent.toLowerCase();
            if (nama.includes(searchValue) || username.includes(searchValue)) {
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

