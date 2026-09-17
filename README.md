# SekolahLab API

API dummy bertema sekolah untuk latihan frontend. Express + Netlify Functions, dengan file JSON lokal tanpa database.

## Status sesi 3

24 endpoint sudah diimplementasikan dan diuji melalui handler Netlify lokal. Belum dipush ke GitHub atau dideploy online.

- Login 10 akun demo dengan tiga role, token JWT satu jam, dan profil pengguna.
- Register simulasi dengan validasi: akun **tidak disimpan**, tidak mendapatkan token, dan tidak bisa digunakan login berikutnya.
- GET publik: siswa, guru, pelajaran, berita, kelas, jurusan; daftar dan detail.
- Pencarian, filter sesuai resource, sorting, dan pagination.
- PATCH/DELETE untuk siswa, guru, pelajaran, berita: khusus admin dan **tidak mengubah data awal**.
- Format error JSON, validasi body/query/relasi, serta CORS tanpa cookie.
- Dokumentasi HTML tersedia di halaman depan.

## Jalankan lokal

Gunakan Node.js 22 atau lebih baru (Netlify dikonfigurasi memakai Node 22).

```sh
npm ci
npm run setup
npm run dev
```

Setup membuat `.env` berisi secret acak tanpa menimpa `.env` yang sudah ada. File ini diabaikan Git. Jika sebelumnya menyalin `.env.example`, isi `JWT_SECRET` minimal 32 karakter terlebih dahulu.

Buka http://localhost:3000 untuk dokumentasi. Contoh API:

- http://localhost:3000/api/v1/health
- http://localhost:3000/api/v1/students?page=1&limit=10
- http://localhost:3000/api/v1/news

`npm run build` menyelaraskan contoh respons di `mapping.json` dan HTML dengan fixture terbaru. Setelah mengedit JSON, jalankan build agar contoh dokumentasi dan jumlah data ikut berubah.

`npm run dev` membangun halaman dokumentasi lalu menjalankan server dengan watch. `npm start` menjalankan server tanpa watch; jalankan `npm run build` jika dokumentasi baru diedit.

```sh
npm test
npm run build
```

## Akun demo

| Role | Email | Password |
| --- | --- | --- |
| Admin | admin@sekolahlab.com | Belajar123! |
| Guru | guru@sekolahlab.com | Belajar123! |
| Siswa | siswa@sekolahlab.com | Belajar123! |

Akun tambahan (password sama: `Belajar123!`):

| Role | Email | Nama |
| --- | --- | --- |
| teacher | ratna@sekolahlab.com | Ratna Wulandari |
| teacher | dewi@sekolahlab.com | Dewi Anggraini |
| teacher | agus@sekolahlab.com | Agus Pratama |
| student | arif@sekolahlab.com | Arif Ramadhan |
| student | citra@sekolahlab.com | Citra Lestari |
| student | danu@sekolahlab.com | Danu Wijaya |
| student | eka@sekolahlab.com | Eka Permata |

Semua akun dan identitas bersifat fiktif. Kirim `POST /api/v1/auth/login` dengan JSON email/password. Gunakan `data.access_token` sebagai `Authorization: Bearer <token>` untuk `/auth/me` atau simulasi perubahan data.

Token ditandatangani HS256 dengan issuer dan audience tetap; role dibaca dari fixture, bukan input klien. Password fixture di-hash menggunakan scrypt; hash tidak dikembalikan API. Secret tidak memiliki nilai bawaan. Jika secret belum tersedia atau terlalu pendek, login/verifikasi token mengembalikan 503; endpoint publik tetap berfungsi. Logout dilakukan dengan menghapus token di frontend; tidak ada revokasi atau refresh token.

## Struktur

```text
index.html                  sumber dokumentasi HTML
mapping.json                kontrak dan contoh respons 24 endpoint
public/index.html           dokumentasi hasil build, tanpa fixture/secret
src/app.js                  Express, CORS, parser JSON, router, error handler
src/server.js               server lokal + halaman dokumentasi
src/routes/index.js         route dan pembatasan HTTP method
src/controllers/            auth, resource sekolah, health
src/services/               verifikasi token/password, query, definisi resource
src/lib/                    respons dan validasi
src/middleware/             respons error
src/data/                   fixture JSON dan pembaca data
netlify/functions/api.js    adapter serverless-http
netlify.toml                konfigurasi deployment
scripts/setup.js            membuat secret lokal
scripts/build.js            menyiapkan dokumen publik
scripts/sync-docs.js        menyelaraskan contoh respons dengan fixture
docs/IMAGE_SOURCES.md       sumber dan pemetaan foto berita
tests/                      pengujian auth, API, dan fixture
```

## Data dan perilaku simulasi

10 akun demo, 30 siswa, 10 guru, 10 pelajaran, 13 kelas, 10 jurusan, dan 10 berita. Setiap koleksi berisi minimal 10 data; semua kelas mempunyai siswa dan setiap jurusan mempunyai kelas. Foto siswa/guru menggunakan URL ilustrasi DiceBear dengan seed unik per ID. Gambar berita memakai empat foto ilustrasi Unsplash yang dipakai ulang pada 10 berita, bukan foto kejadian nyata. Atribusi dan pemetaan ada di [sumber gambar](docs/IMAGE_SOURCES.md). URL pihak ketiga memerlukan internet.

Setiap pembacaan mengembalikan salinan fixture. PATCH mengembalikan gabungan data awal dengan perubahan, sementara DELETE hanya mengembalikan konfirmasi. Keduanya menyertakan `meta.simulation: true` dan `meta.persisted: false`. GET berikutnya tetap sama, bahkan setelah penghapusan berulang. Tidak ada cascade delete. Untuk memperbarui data dasar, edit file JSON lalu deploy ulang.

GET daftar: page default 1, limit default 10 (maksimum 100). Semua filter digabung dengan AND. Halaman di luar hasil mengembalikan array kosong. ID harus integer positif; query berulang/tidak dikenal ditolak. Detail parameter dan field editable ada di dokumentasi HTML.

Data GET bersifat publik. CORS mengizinkan semua origin dengan header Authorization/Content-Type tanpa cookie. POST/PATCH wajib application/json; body maksimal 100 KB. Error menggunakan `{ success: false, message, errors }`. Kode tambahan operasional: 413 untuk body terlalu besar dan 503 untuk secret yang belum dikonfigurasi. HEAD ditolak (405); OPTIONS melayani preflight CORS (204).

## Deploy melalui GitHub ke Netlify

1. Push project ke repository GitHub `sekolahlab-api`; jangan sertakan `.env` atau `node_modules`.
2. Import repository di Netlify. Base directory kosong jika project ada di root repo.
3. Konfigurasi dari `netlify.toml`: build `npm run build`, publish `public`, functions `netlify/functions`, Node 22.
4. Tambahkan `JWT_SECRET` acak minimal 32 karakter sebagai environment variable untuk Functions di Netlify. Jangan gunakan password akun demo sebagai secret.
5. Deploy; periksa `/`, `/api/v1/health`, `/api/v1/students`, lalu login dan `/api/v1/auth/me`.

File JSON ikut bundle function, tidak dipublikasikan sebagai aset statis. Jangan mengatur publish directory ke root project. `app.listen` hanya dipakai server lokal; Netlify memakai function handler.

Tes lokal memeriksa path publik dan path function, tetapi deployment Netlify online belum diuji. Acuan: [Express di Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/express/).

## Berikutnya

Deployment GitHub/Netlify dan smoke test online, lalu jadwal pembelajaran. Jadwal, upload gambar, penyimpanan akun register permanen, dan database belum termasuk versi ini.
