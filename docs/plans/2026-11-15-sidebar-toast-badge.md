# Plan: Sidebar Global + Login Split-Screen + Badge + Toast + Logout Modal

- **Tanggal disetujui:** 15 Nov 2026 (opsi: sidebar global saat login, login split-screen, logout modal custom)
- **Tujuan:** navigasi peran yang jelas setelah login, visibilitas request pending,
  feedback aksi via toast, dan konfirmasi logout yang sesuai tema.
- **Tidak menyentuh:** schema DB, server action, endpoint, alur bisnis, AC PRD.

## Langkah
1. **Shell + sidebar + count** — komponen baru: `AppShell` (client: sidebar desktop +
   drawer mobile + topbar ramping), `SidebarNav` (server: menu per role + badge),
   `LogoutButton` (client) + `ConfirmModal` generik; store baru
   `countPendingByOrganizer()` (1 query `GROUP BY`) dan `countUnassignedCommunities()`
   untuk badge admin.
2. **`app/layout.tsx`** — bila ada user: render shell; bila tidak: header lama.
   Subnav di `dashboard/layout.tsx` dan `admin/layout.tsx` dihapus (diganti item sidebar).
3. **Login split-screen** — panel kiri hitam (brand + strip gambar komunitas),
   kanan kartu form (Google + dev-login). Param/query dan logika redirect tidak berubah.
4. **Toast ganti Notices** — `Toasts` (client) baca `?ok=`/`?err=` sekali tampil,
   auto-dismiss 4 detik + tombol tutup, bersihkan URL via `router.replace`.
   Server action tetap redirect query seperti sekarang (backend nol berubah).
   `Notices.tsx` dihapus setelah semua pemakaian diganti.
5. **Badge** — sidebar (total pending organizer; komunitas tanpa panitia untuk admin),
   pill “N menunggu” per baris tabel event dashboard, dan highlight baris `pending`
   di tabel peserta. Tanpa realtime: angka dihitung ulang tiap render/navigasi.
6. **CSS** — shell, sidebar/drawer, badge, toast, modal, login split; monokrom;
   hormati `prefers-reduced-motion`; drawer ≤960px.
7. **Verifikasi** — `tsc`, `next build`, vitest tetap hijau; Playwright lama hijau;
   spec baru `06-shell.spec.ts`: badge bertambah setelah ada pendaftar, toast muncul +
   URL bersih, modal logout (batal menutup / keluar benar logout), drawer mobile,
   reduced-motion tanpa animasi slide.

## Kriteria selesai
- Role user/panitia/admin masing-masing melihat menu yang benar.
- Tidak ada regresi visual halaman publik saat belum login.
- Semua pintu verifikasi hijau.

## Hasil verifikasi (15 Nov 2026)
- `tsc` bersih, `next build` sukses, vitest 12/12 hijau.
- Playwright **22/22 hijau** (15 lama + 7 baru: badge, toast+URL bersih, drawer,
  reduced-motion, login split-screen, sidebar per role, logout modal).
- Temuan selama verifikasi (sudah diperbaiki): helper test menunggu `.notice`
  yang sudah tidak ada (ganti `.toast`); 1 test salah mengenali link Google
  sebagai button.
- Tidak ada perubahan perilaku bisnis; backend tetap nol berubah.
