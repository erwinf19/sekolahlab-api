# Sumber gambar

Semua identitas dan berita bersifat fiktif. Foto berita hanya ilustrasi, bukan bukti kegiatan nyata. File gambar tidak disimpan di backend; frontend memakai URL HTTPS langsung. Ketersediaan URL bergantung pada penyedia.

## Siswa dan guru

Setiap profil menggunakan [DiceBear Avataaars](https://www.dicebear.com/styles/avataaars/) dengan seed unik `sekolahlab-student-ID` atau `sekolahlab-teacher-ID`. Ini ilustrasi avatar, bukan foto orang asli. Akun yang terkait profil memakai avatar yang sama.

## Berita

Foto berasal dari halaman Unsplash dengan [lisensi Unsplash](https://unsplash.com/license). Empat gambar dipakai ulang untuk 10 berita.

| ID berita | Foto / fotografer |
| --- | --- |
| 1, 7 | [Buku terbuka — Taylor Burnfield](https://unsplash.com/photos/books-are-open-on-a-wooden-table-79IBSeVqN88) |
| 3, 4, 9 | [Tumpukan buku — Eman Ali](https://unsplash.com/photos/a-stack-of-books-FDuxrHs9zpE) |
| 6, 10 | [Lapangan basket — travis jones](https://unsplash.com/photos/empty-basketball-court-YO1A16JteXg) |
| 2, 5, 8 | [Komputer — Fernando Hernandez](https://unsplash.com/photos/flat-screen-monitor-turned-on-CosHjyONRk8) |

URL CDN lengkap disimpan pada `src/data/news.json`. Tidak ada upload gambar atau ketergantungan jaringan pada pengambilan data JSON. Gunakan gambar fallback di frontend jika layanan gambar tidak bisa diakses.
