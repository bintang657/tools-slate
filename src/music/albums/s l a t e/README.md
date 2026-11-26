# s l a t e

Taruh file lagu album ini langsung di folder ini. Player akan mendeteksi file audio otomatis saat build—tidak perlu mengedit daftar/manifest lagu.

Format yang didukung: `.mp3`, `.m4a`, `.ogg`, `.wav`, `.aac`.

Nama file menjadi judul lagu. Awalan nomor urut seperti `01 - ` akan dihilangkan dari judul yang ditampilkan.

Untuk mengganti gambar album di pemutar, unggah gambar bernama `cover.jpg` ke folder ini (format yang didukung: `.jpg`, `.jpeg`, `.png`, `.webp`, `.avif`). Gambar akan terdeteksi otomatis saat build; tidak perlu mengubah kode. Sampai gambar diunggah, pemutar menampilkan ikon musik sebagai placeholder.

Untuk album lain, buat folder baru di `src/music/albums/`, letakkan semua lagunya di dalam folder tersebut, dan tambahkan gambar bernama `cover.jpg` jika ingin memakai sampul khusus.
