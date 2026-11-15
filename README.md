# Komunifind

Direktori komunitas: publik bisa jelajah/search/filter, user login Google untuk daftar
event, panitia mengelola komunitas & event-nya sendiri, admin pusat membuat komunitas.

Dokumen arsip desain fase 1 (era Go) ada di
[docs/archive/DESIGN-fase1-go.md](./docs/archive/DESIGN-fase1-go.md). Penjelasan visual:
[docs/architecture.html](./docs/architecture.html). Riwayat backend Go ada di branch
`archive/go-backend`.

## Stack

- **Next.js 15 full-stack** (App Router, server actions, OAuth handler, upload, email, akses database langsung)
- **PostgreSQL 16** — Docker untuk development lokal, Supabase untuk production
- **Storage** — disk lokal untuk development, Supabase Storage untuk production
- **Email** — SMTP (Mailtrap untuk dev, Resend untuk production)
- **Hosting production** — Vercel

Seluruh business rule (kuota, approval, tenant isolation, state machine registrasi) tinggal
di `web/lib/store/`, dengan query SQL yang sama seperti backend Go sebelumnya.

## Menjalankan (development)

```bash
# 1. database
docker compose up -d

# 2. aplikasi (dari folder web/)
cd web
npm install
Copy-Item ..\.env .\.env.local   # PowerShell, sekali saja
npm run db:migrate
npm run db:seed
npm run dev
```

Buka <http://localhost:3000>.

Login cepat tanpa Google (seed data, `DEV_LOGIN=true`):

| Email | Peran |
|---|---|
| `admin@komunifind.test` | admin pusat |
| `rina@komunifind.test` | panitia Jakarta Indie Runners |
| `budi@komunifind.test` | panitia Bandung Design Circle |
| `sari@komunifind.test` | user biasa |

Reset data: `docker compose down -v` lalu ulangi langkah di atas.

Seed mengisi 9 komunitas dan 14 event (idempotent, aman dijalankan ulang), memakai gambar
di `web/public/images/` (referensi disimpan sebagai `images/<nama>.jpg`).

## Google OAuth

1. Buat OAuth Client (Web) di Google Cloud Console.
2. Authorized redirect URI: `{APP_BASE_URL}/api/auth/google/callback`
   (contoh lokal: `http://localhost:3000/api/auth/google/callback`,
   contoh prod: `https://komunifind.id/api/auth/google/callback`).
3. Isi `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`.
4. Restart `npm run dev`.

Selama kredensial kosong, halaman login menampilkan pesan bahwa OAuth belum dikonfigurasi.
Scope yang diminta hanya `openid email profile` (non-sensitif).

## Email

SMTP dikonfigurasi via `SMTP_HOST/PORT/USER/PASS/FROM` (Mailtrap untuk dev, Resend untuk
production). Email bersifat **best-effort**: status pendaftaran tetap tersimpan dan selalu
bisa dilihat di halaman "Pendaftaranku". Kegagalan pengiriman dicatat di tabel
`email_logs`. Tanpa kredensial SMTP, email dilewati dan dicatat sebagai error.

## Upload gambar

- Logo/banner komunitas dan poster event: JPG/PNG/WebP, maks 5 MB.
- Di-reencode ke WebP (logo maks 512px, lainnya 1600px) memakai `sharp`.
- Development (`STORAGE_DRIVER=local`): disimpan di `UPLOAD_DIR`, disajikan route `/uploads/*`.
- Production (`STORAGE_DRIVER=supabase`): diupload ke bucket Supabase Storage.

## Database

Migration SQL bernomor di `web/db/migrations/`, dijalankan manual:

```bash
cd web
npm run db:migrate   # butuh DATABASE_URL (direct connection untuk Supabase)
```

## Test

Test fokus pada area berisiko: kuota, tenant isolation, state machine registrasi.

```bash
# Postgres dev terekspos di localhost:5433
docker compose exec -T db psql -U komunifind -d postgres -c "CREATE DATABASE komunifind_test;"

cd web
$env:TEST_DATABASE_URL="postgres://komunifind:komunifind_dev@localhost:5433/komunifind_test?sslmode=disable"
npm test
```

Tanpa `TEST_DATABASE_URL`, test di-skip.

```bash
cd web
npm run typecheck
npm run build
npm run test:e2e   # Playwright: butuh DB lokal jalan; Chromium di-install otomatis bila belum ada
```

Detail strategi dan konvensi test ada di [docs/TESTING.md](./docs/TESTING.md). CI
(`.github/workflows/ci.yml`) menjalankan semuanya tiap push/PR.

## Struktur

```
web/
  app/                halaman & route handler Next
  app/actions.ts      server actions (mutasi + email + upload)
  lib/
    db.ts             connection pool + helper transaksi
    auth.ts           terbit/verifikasi JWT
    google.ts         verifikasi Google ID token
    session.ts        cookie sesi + requireUser
    store/            akses data + aturan kuota/tenant/state machine
    storage.ts        upload gambar (driver local / supabase)
    supabase.ts       client service-role (server only)
    mailer.ts         template + kirim email + email_logs
    format.ts         format tanggal, status, URL media
  db/migrations/      SQL bernomor
  scripts/            migrate.ts, seed.ts (jalan via tsx)
  public/images/      aset demo (logo, banner, poster event)
  components/         komponen UI
  e2e/                Playwright specs (auth, publik, registrasi, organizer, admin)
  playwright.config.ts  config E2E (DB terisolasi, sekuensial, webServer otomatis)
docker-compose.yml    Postgres untuk development lokal
docs/                 PRD, TESTING, ROADMAP, decisions (ADR), plans
.github/workflows/   CI: typecheck + build + vitest + Playwright
```

## Batasan fase 1

- Event gratis (field harga disiapkan, payment belum ada).
- Satu panitia per komunitas; komunitas dibuat admin pusat (belum self-service).
- Belum ada join komunitas, chat/forum, notifikasi WA/push, multi-bahasa.
- Login Google saja (dev login hanya untuk development).
- Tanpa refresh token: sesi 7 hari, habis → login ulang.

## Keamanan

- JWT hanya di cookie `HttpOnly`; browser tidak pernah memegang token.
- Setiap request mengambil user fresh dari database; klaim role di token tidak dipercaya buta.
- Otorisasi data + pengecekan tenant dilakukan di `lib/store`, bukan di komponen UI.
- Service-role key Supabase hanya di server, **jangan** pernah ke browser.
- **Jangan** aktifkan `DEV_LOGIN` di production.
- Ganti `JWT_SECRET` dengan nilai acak sebelum deploy.
