# Plan: Urutan Sidebar + Verifikasi Authz + Pagination

- **Tanggal disetujui:** 15 Nov 2026
- **Latar:** (1) menu Dashboard harus paling atas; (2) user melaporkan sari (role
  `user`) melihat menu panitia — investigasi membuktikan **bukan bug kode** melainkan
  data dev: `sari` sudah `role=organizer` + pemilik `e2e-test-komunitas` (sisa testing
  manual); (3) list yang bisa membesar belum ada pagination.
- **Tidak menyentuh:** schema DB, server action, AC PRD, role/tenant logic
  (sudah benar dan teruji).

## Langkah
1. **Data dev:** kembalikan `sari` ke `role=user`, lepas `organizer_id`
   `e2e-test-komunitas` (SQL langsung, DB dev saja).
2. **Sidebar:** Dashboard jadi item pertama untuk organizer/admin; urutan organizer:
   Dashboard, Buat event, Profil komunitas, Event, Pendaftaranku; user murni tetap
   Event, Pendaftaranku. Logo tetap jalan pulang ke `/`.
3. **Authz re-check:** tidak ada perubahan kode (gating `requireUser` + tenant check
   store sudah benar; E2E tenant 500 membuktikan denial). Ditutup via E2E ulang.
4. **Pagination:**
   - Komponen server baru `components/Pagination.tsx` (Prev / “Halaman X dari Y” /
     Next, preserve query param lain, sembunyi bila 1 halaman).
   - SQL `LIMIT/OFFSET` + total untuk list global: admin communities, admin users,
     `/events` (12/halaman; tabel 10/halaman).
   - Slice in-memory untuk sublist yang datanya memang dibutuhkan penuh
     (registrasi per event demi counter, event per komunitas, `/me`).
   - Store baru: `listAllCommunitiesPaged`, `listUsers(role,page,perPage)`,
     `getUserById`, `listPublishedEventsPage`. Landing tidak diubah (sudah ada).
5. **Test:** vitest untuk fungsi paged (total, halaman 2, clamp, not found) +
   E2E: Dashboard item pertama + pagination `/events` 14 event / 12 per halaman.
6. **Verifikasi:** `tsc` + `next build` + vitest + Playwright penuh hijau.

## Kriteria selesai
- Dashboard selalu item pertama sidebar organizer/admin.
- User role `user` murni tidak melihat menu panitia (dibuktikan E2E + data bersih).
- Semua list yang bisa membesar punya pagination yang berfungsi.

## Hasil verifikasi (15 Nov 2026)
- `tsc` bersih, `next build` sukses, vitest 16/16 hijau (termasuk test baru
  untuk fungsi paged + `getUserById`).
- Playwright **26/26 hijau**: urutan sidebar, pagination `/events` (14 event /
  12 per halaman), tenant denial, dan seluruh suite lama.
- Temuan: 1 test lama (`04-organizer` cek event baru di halaman publik) gagal
  karena event ke-15 jatuh di halaman 2 — bukti pagination bekerja; test
  diperbaiki (cek di `?page=2`), bukan bug aplikasi.
