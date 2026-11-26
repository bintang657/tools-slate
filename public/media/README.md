# Media Tools Slate

Upload media melalui GitHub ke folder `public/media/`.

## Video hero
- Upload video bernama `hero.mp4` ke folder ini.
- Video diputar otomatis tanpa suara sebagai latar hero.

## Musik
1. Upload file MP3 atau OGG ke folder `public/media/`.
2. Buka `playlist.json` di folder yang sama.
3. Tambahkan satu objek untuk setiap lagu di dalam array `tracks`, misalnya:

```json
{
  "tracks": [
    { "title": "Judul Lagu", "artist": "Nama Artis", "src": "/media/judul-lagu.mp3" },
    { "title": "Lagu Kedua", "artist": "Nama Artis", "src": "/media/lagu-kedua.mp3" }
  ]
}
```

Untuk lagu Oasis yang dikonfigurasi saat ini, pastikan file `oasis.mp3` benar-benar diunggah ke folder `public/media/` (sejajar dengan `playlist.json`). Path yang dipakai adalah `/media/oasis.mp3`. Setelah commit dan deploy selesai, pemutar musik membaca `playlist.json` otomatis. Penambahan lagu berikutnya cukup dengan mengunggah file audio dan memperbarui daftar di `playlist.json`; source code React tidak perlu diedit. Nama file dan path harus sama persis, termasuk huruf besar/kecil.

## Background utama website
- Upload gambar background pilihanmu dengan nama `background.jpg` ke folder ini.
- Path yang digunakan website adalah `/media/background.jpg`.
- Gambar ini menjadi latar seluruh halaman di belakang panel, kartu, dan area konten (bukan menggantikan video hero).
- Untuk mengganti gambar, cukup timpa file `background.jpg` dengan gambar baru lalu commit/deploy ulang.
- Disarankan memakai gambar landscape beresolusi tinggi; overlay gelap sudah diterapkan melalui CSS agar teks dan kartu tetap terbaca.
