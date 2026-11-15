# Strategi Testing Komunifind

Tiga level, tiga tujuan berbeda. Semua harus hijau sebelum merge dan sebelum go-live.

## Level 1 — Vitest (aturan bisnis)

- **Lokasi:** `web/lib/store/*.test.ts` (wajib **satu file** untuk semua test DB —
  lihat catatan di bawah).
- **Cakupan:** kuota, tenant isolation, state machine registrasi, joined fields.
- **Jalankan:**
  ```bash
  docker compose exec -T db psql -U komunifind -d postgres -c "CREATE DATABASE komunifind_test;"
  cd web
  $env:TEST_DATABASE_URL="postgres://komunifind:komunifind_dev@localhost:5433/komunifind_test?sslmode=disable"
  npm test
  ```
- Tanpa `TEST_DATABASE_URL`, test di-skip (tidak gagal).
- **Aturan keras:** test yang berbagi database dan memakai `TRUNCATE` dilarang
  dipecah ke beberapa file — runner mengeksekusi file paralel dan fixture akan
  saling menimpa (pernah kejadian: `duplicate key`, `foreign key violation` palsu).

## Level 2 — Playwright E2E (klik UI asli)

- **Lokasi:** `web/e2e/*.spec.ts` + `playwright.config.ts`.
- **Cakupan:** auth 4 role, landing/search/tunnel, loop registrasi penuh
  (daftar → approve → cancel + duplikat ditolak), tenant 403, organizer
  (dashboard, create + upload + publish), admin (create + upload + assign).
- **Auth di test:** dev-login (`DEV_LOGIN=true`), bukan Google asli.
- **Isolasi:** `global-setup.ts` me-reset DB `komunifind_e2e` (drop → create →
  migrate → seed) sebelum suite jalan; spec berjalan sekuensial (`workers: 1`).
- **Jalankan:**
  ```bash
  cd web
  npx playwright install chromium   # sekali saja per mesin
  npm run test:e2e
  ```
  Playwright menyalakan `npm run dev` sendiri (lihat `webServer` di config) dengan
  `DATABASE_URL` E2E. Jangan jalankan server manual bersamaan di port yang sama.
- Jejak kegagalan otomatis tersimpan (`trace: retain-on-failure`); buka dengan
  `npx playwright show-trace <file>`.

## Level 3 — Smoke checklist manual (pre go-live)

Dilakukan di production setelah deploy, karena butuh kredensial asli:

- [ ] Login Google asli (bukan dev-login) untuk 1 akun.
- [ ] 1 email notifikasi benar-benar masuk inbox (cek juga folder spam).
- [ ] 1 gambar upload tampil di production (URL Supabase Storage, bukan `/uploads`).
- [ ] Halaman 404 + viewport HP 390px dicek visual.
- [ ] `DEV_LOGIN=false` terverifikasi (halaman login tidak menampilkan dev-login).

## CI (`.github/workflows/ci.yml`)

Tiap push/PR: `typecheck` → `next build` → `vitest` (dengan Postgres service)
→ Playwright. Merah = jangan merge.
