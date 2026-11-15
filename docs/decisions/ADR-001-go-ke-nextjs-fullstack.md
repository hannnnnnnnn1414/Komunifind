# ADR-001: Switch backend Go ke Next.js full-stack

- **Tanggal:** Nov 2026
- **Status:** diterima & dieksekusi (Fase 1)
- **Konteks:** butuh go-live secepatnya dengan 1 developer. Arsitektur Next.js + Go
  (2 service, CORS/token bridging, 2 deploy) terlalu berat untuk operasional solo.
- **Keputusan:** satu aplikasi Next.js TypeScript; seluruh business rule di-port 1:1
  ke `web/lib/store/`; schema & SQL tidak berubah; kode Go diarsipkan di branch
  `archive/go-backend` (tidak dihapus dari sejarah).
- **Konsekuensi (+):** satu deploy, satu bahasa, iteration cepat, cocok untuk Vercel.
- **Konsekuensi (−):** kehilangan showcase Go; logika DB dan UI tinggal serumah
  (dijaga lewat aturan “aturan bisnis hanya di `lib/store/`”).
- **Verifikasi:** tsc + build + vitest 12/12 + Playwright 22/22 hijau sebelum Go dihapus.
