const v = require('../lib/validation');
const name = [v.string(2, 150), 'Nama/judul harus 2–150 karakter.'];
const code = [v.string(1, 30), 'Kode harus 1–30 karakter.'];
const description = [v.string(1, 500), 'Teks harus 1–500 karakter.'];
const gender = [v.oneOf(['male', 'female']), 'Gender harus male atau female.'];
module.exports = {
  students: { search: ['name', 'nis'], sort: ['id', 'name', 'nis'], filters: { class_id: 'id', gender: ['male', 'female'] }, unique: ['nis'], fields: {
    nis: code, name, gender, birth_date: [v.date, 'Tanggal harus valid YYYY-MM-DD dan tidak di masa depan.'], class_id: [v.reference('classes'), 'Kelas tidak ditemukan.']
  } },
  teachers: { search: ['name', 'teacher_code'], sort: ['id', 'name', 'teacher_code'], filters: { subject_id: 'id', gender: ['male', 'female'] }, unique: ['teacher_code'], fields: {
    teacher_code: code, name, gender, subject_ids: [v.referenceArray('subjects'), 'Gunakan minimal satu ID pelajaran yang valid, tanpa duplikat.']
  } },
  subjects: { search: ['name', 'code'], sort: ['id', 'name', 'code'], filters: {}, unique: ['code'], fields: { code, name, description } },
  news: { search: ['title', 'excerpt'], sort: ['id', 'title', 'published_at'], defaultSort: 'published_at', defaultOrder: 'desc', filters: { category: ['kegiatan', 'prestasi', 'pengumuman'] }, unique: [], fields: {
    title: name, excerpt: description, content: [v.string(1, 10000), 'Isi berita harus 1–10.000 karakter.'], image_url: [v.httpsUrl, 'Gunakan URL HTTPS valid maksimal 2.048 karakter, tanpa username/password.'], category: [v.oneOf(['kegiatan', 'prestasi', 'pengumuman']), 'Kategori tidak valid.']
  } },
  classes: { search: ['name'], sort: ['id', 'name'], filters: { major_id: 'id', grade: ['10', '11', '12'] } },
  majors: { search: ['name', 'code'], sort: ['id', 'name'], filters: {} }
};
