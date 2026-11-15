# Plan: PRD + docs + E2E repo + CI

> Kebiasaan baru yang disepakati: setiap perubahan diawali mode plan dan
> didokumentasikan di `docs/plans/<tanggal>-<slug>.md` sebelum dieksekusi.
> File ini adalah contoh pertama kebiasaan itu.

- **Tanggal disetujui:** 14 Nov 2026
- **Tujuan:** melengkapi “kertas kerja” repo — PRD, struktur docs, E2E resmi, CI.
- **Tidak menyentuh:** logika aplikasi, schema database, UI.

## Langkah
1. `docs/PRD.md` — scope fase 1 + acceptance criteria F1–F9, non-goal, NFR, kriteria go-live.
2. `docs/ROADMAP.md` — backlog pasca-go-live dari non-goal.
3. `docs/decisions/ADR-001..004` — arsip keputusan yang sudah terjadi
   (Go→Next.js, Supabase stack, custom auth, tanpa Tailwind).
4. `docs/TESTING.md` — strategi 3 level + cara menjalankan semuanya.
5. Playwright resmi di repo: `@playwright/test` + `playwright.config.ts`
   + `web/e2e/{helpers,auth,public,registration,organizer,admin}.spec.ts`
   + `web/e2e/global-setup.ts` (reset DB E2E → migrate → seed) + script `test:e2e`.
   Port dari skenario Temp yang sudah hijau 22/22; DB terpisah (`komunifind_e2e`);
   spec jalan sekuensial (`workers: 1`); auth via dev-login.
6. `.github/workflows/ci.yml` — push/PR: typecheck → build → vitest (Postgres service)
   → Playwright (Chromium).
7. Verifikasi: `tsc`, `next build`, `vitest`, full `test:e2e` hijau; update README.

## Kriteria selesai
- Semua file di atas ada dan terverifikasi berjalan (bukan sekadar ditulis).
- Tidak ada perubahan perilaku aplikasi.
