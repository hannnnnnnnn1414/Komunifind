# Komunifind

Direktori komunitas: publik bisa jelajah/search/filter, user login Google untuk daftar
event, panitia mengelola komunitas & event-nya sendiri, admin pusat membuat komunitas.

Arsitektur dan keputusan desain ada di [DESIGN.md](./DESIGN.md). Penjelasan visual: [docs/architecture.html](./docs/architecture.html).

## Stack

- **web** — Next.js 15 (App Router, server actions, OAuth handler, upload, email)
- **api** — Go 1.23 (REST JSON, JWT, seluruh business rule)
- **db** — PostgreSQL 16
- **nginx** — reverse proxy, static `/uploads`, TLS di production
- Semua jalan di satu VPS via Docker Compose.

## Menjalankan (development)

```bash
cp .env.example .env          # isi secret & kredensial bila perlu
docker compose up -d --build
docker compose run --rm --entrypoint /app/seed api
```

Buka <http://localhost:8088>.

Login cepat tanpa Google (seed data, `DEV_LOGIN=true` di `.env`):

| Email | Peran |
|---|---|
| `admin@komunifind.test` | admin pusat |
| `rina@komunifind.test` | panitia Jakarta Indie Runners |
| `budi@komunifind.test` | panitia Bandung Design Circle |
| `sari@komunifind.test` | user biasa |

Reset data: `docker compose down -v` lalu ulangi langkah di atas.

Seed mengisi 9 komunitas dan 14 event, memakai gambar di `web/public/images/`
(referensi disimpan sebagai `images/<nama>.jpg`).

## Google OAuth

1. Buat OAuth Client (Web) di Google Cloud Console.
2. Authorized redirect URI: `{APP_BASE_URL}/api/auth/google/callback`
   (contoh lokal: `http://localhost:8088/api/auth/google/callback`).
3. Isi `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` di `.env`.
4. `docker compose up -d web api`.

Selama kredensial kosong, halaman login menampilkan pesan bahwa OAuth belum dikonfigurasi.

## Email

SMTP dikonfigurasi via `SMTP_HOST/PORT/USER/PASS/FROM` (Mailtrap untuk dev, Resend/Brevo
untuk production). Email bersifat **best-effort**: status pendaftaran tetap tersimpan dan
selalu bisa dilihat di halaman "Pendaftaranku". Kegagalan pengiriman dicatat di tabel
`email_logs`. Tanpa kredensial SMTP, email dilewati dan dicatat sebagai error.

## Upload gambar

- Logo/banner komunitas dan poster event: JPG/PNG/WebP, maks 5 MB.
- Di-reencode ke WebP (logo maks 512px, lainnya 1600px) memakai `sharp`.
- Disimpan di volume `uploads`, disajikan nginx di `/uploads/*`.

## Test

Test Go fokus pada area berisiko: kuota, tenant isolation, state machine registrasi.

```bash
# Postgres dev terekspos di localhost:5433
docker compose exec -T db psql -U komunifind -d postgres -c "CREATE DATABASE komunifind_test;"

cd api
$env:TEST_DATABASE_URL="postgres://komunifind:komunifind_dev@localhost:5433/komunifind_test?sslmode=disable"
go test ./... -count=1
```

Tanpa `TEST_DATABASE_URL`, test di-skip.

```bash
cd web
npm run typecheck
npm run build
```

## Struktur

```
api/
  cmd/api/            server HTTP
  cmd/seed/           data demo (idempotent)
  migrations/         SQL bernomor, dijalankan otomatis saat start
  internal/auth/      JWT + verifikasi Google ID token
  internal/store/     akses data + aturan kuota/tenant/state machine
  internal/httpapi/   router + handler
web/
  app/                halaman & route handler Next
  app/actions.ts      server actions (mutasi + email + upload)
  lib/                api client, session, format, mailer, upload
  public/images/      aset demo (logo, banner, poster event)
nginx/                konfigurasi reverse proxy
```

## Batasan fase 1

- Event gratis (field harga disiapkan, payment belum ada).
- Satu panitia per komunitas; komunitas dibuat admin pusat (belum self-service).
- Belum ada join komunitas, chat/forum, notifikasi WA/push, multi-bahasa.
- Login Google saja (dev login hanya untuk development).
- Tanpa refresh token: sesi 7 hari, habis → login ulang.

## Keamanan

- JWT hanya di cookie `httpOnly`; browser tidak pernah memegang token.
- Next hanya untuk UX; seluruh otorisasi dan pengecekan tenant dilakukan Go.
- **Jangan** aktifkan `DEV_LOGIN` di production.
- Ganti `JWT_SECRET` dan `INTERNAL_SECRET` sebelum deploy.
