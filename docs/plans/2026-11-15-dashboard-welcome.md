# Plan: Dashboard Index → Welcome + Antrian Kerja

- **Tanggal disetujui:** 15 Nov 2026 (opsi: Welcome + antrian kerja)
- **Masalah:** index dashboard terlihat seperti landing (stat-grid KPI + kartu komunitas
  + tabel penuh), padahal panitia butuh jawaban “apa yang harus kulakukan sekarang”.
- **Prinsip:** tanpa angka KPI, tanpa grafik. Sapaan + daftar kerja + event mendatang.
- **Tidak menyentuh:** schema DB, server action, endpoint, AC PRD F5, role/tenant logic.

## Langkah
1. Store baru `listPendingForOrganizer(organizerId, limit)` — pending + join event
   (id, judul, startsAt) + nama user, urut terbaru — + 1 vitest.
2. Rewrite render `app/dashboard/page.tsx`:
   - Welcome header: “Halo, {nama}.” + konteks komunitas + aksi cepat
     (Buat event primary, Lihat publik, Edit profil). Stat-grid dibuang.
   - “Perlu tindakan”: pending per event → Kelola; draft → Kelola;
     terbit 0 peserta & mulai <7 hari → Lihat publik; kosong → “Semua beres.”
   - “Event mendatang”: maks 5 published terdekat (tanggal, approved/kuota,
     badge pending, Kelola).
   - “Semua event”: tabel lengkap yang sudah ada dipindah ke bawah.
   - loadError, role check, badge, tenant isolation tidak berubah.
3. CSS: welcome header, action list, compact list; monokrom; responsif.
4. E2E: tambah assertion (sapaan, item tindakan link ke kelola, tabel tetap ada).
5. Verifikasi: `tsc` + `next build` + vitest + Playwright penuh hijau.

## Kriteria selesai
- Tidak ada stat-grid/KPI di dashboard index.
- Setiap item tindakan mengarah ke halaman yang benar.
- Semua pintu verifikasi hijau, tanpa perubahan perilaku bisnis.

## Hasil verifikasi (15 Nov 2026)
- `tsc` bersih, `next build` sukses, vitest 13/13 hijau.
- Playwright **24/24 hijau** (termasuk test baru: sapaan + item pending
  mengarah ke kelola; tidak ada menu Jelajah saat login).
- Temuan selama verifikasi (infrastruktur test, bukan aplikasi): folder `.next`
  korup karena build production + dev server + copy manual berbagi folder yang
  sama → render error massal. Solusi: hapus `.next`, E2E selalu jalan di atas
  dev server fresh. Aturan: jangan campur artefak build dan dev dalam satu `.next`.
- Tidak ada perubahan perilaku bisnis; backend tetap nol berubah.
