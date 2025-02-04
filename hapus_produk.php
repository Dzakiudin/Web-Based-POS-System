<?php
include 'config.php'; // Pastikan koneksi ke database sudah benar

if (isset($_GET['id'])) {
    $ProdukID = $conn->real_escape_string($_GET['id']);

    
        // Jika tidak ada data terkait, hapus produk
        $sql = "DELETE FROM produk WHERE ProdukID = '$ProdukID'";
        if ($conn->query($sql) === TRUE) {
            echo "<script>
                    alert('Produk berhasil dihapus!');
                    window.location.href='produk.php';
                  </script>";
        } else {
            echo "Error: " . $sql . "<br>" . $conn->error;
        }
} else {
    echo "<script>
            alert('ID produk tidak ditemukan!');
            window.location.href='produk.php';
          </script>";
}

$conn->close();
?>
