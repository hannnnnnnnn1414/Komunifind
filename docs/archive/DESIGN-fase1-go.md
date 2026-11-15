# Komunifind — Desain Fase 1

> Catatan Nov 2026: backend Go (`api/`) dan `nginx/` sudah dihapus. Aplikasi berjalan
> full-stack Next.js (aturan bisnis di `web/lib/store/`, database tetap PostgreSQL
> dengan schema yang sama). Kode Go yang lama tersimpan di branch `archive/go-backend`.
> Dokumen di bawah ini adalah catatan desain aslinya dan tetap dipertahankan sebagai riwayat.

Platform direktori komunitas: landing page publik untuk menemukan komunitas & event,
plus dashboard panitia untuk mengelola page komunitas dan pendaftaran event.

Status: disetujui sebelum implementasi.

---

## 1. Ringkasan

**Apa:** Direktori komunitas multi-tenant. Publik browse/search/filter tanpa akun.
Daftar event wajib akun (Google OAuth). Panitia mengelola komunitasnya sendiri.
Admin pusat membuat komunitas & meng-assign panitia secara manual.

**Kenapa:** Orang susah menemukan komunitas relevan; panitia butuh satu tempat
untuk mengelola page komunitas, event, dan peserta.

**Untuk siapa:**

| Peran | Kapabilitas fase 1 |
|---|---|
| Pengunjung | Browse komunitas & event, read-only, tanpa akun |
| User | Login Google, daftar event, batal, lihat status di `/me` |
| Organizer | Kelola 1 komunitas: profil, event, kuota, approve/reject peserta |
| Admin | Buat komunitas, assign organizer, lihat user |

**Non-goal fase 1:** join komunitas, payment gateway, chat/forum, notifikasi
WhatsApp/push, multi-bahasa, mobile app native, self-service komunitas,
fitur "kick" peserta, refresh token, cron pembersih file yatim.

---

## 2. Arsitektur

```
Browser ──> nginx ──┬─ /            → web:3000 (Next.js)
                    ├─ /api/v1/*    → api:8080 (Go)
                    └─ /uploads/*   → /data/uploads (static)
web ──(server-side fetch + Bearer JWT)──> api ──> db:5432 (Postgres)
```

Satu VPS, Docker Compose, empat container: `web`, `api`, `db`, `nginx`.

### Batas tanggung jawab (non-negotiable)

- **Go = sumber kebenaran domain.** Users & roles, komunitas, event, registrasi,
  kuota, approval, tenant authorization, validasi. Go juga penerbit JWT.
- **Next = presentasi + I/O pinggiran.** Render, alur Google OAuth, cookie
  httpOnly, proxy ke Go, kirim email, terima upload lalu tulis ke storage.
- **Next tidak boleh** query DB langsung atau menghitung aturan bisnis.
- **Browser hanya bicara ke Next.** Tidak ada CORS, token tidak pernah menyentuh JS.

---

## 3. Model Data

```sql
users (id, google_sub UNIQUE, email, name, avatar_url, role, created_at, updated_at)
communities (id, slug UNIQUE, name, tagline, description, logo_key, banner_key,
             category, city, socials JSONB, organizer_id UNIQUE NULL, status,
             created_at, updated_at)
events (id, community_id, title, description, starts_at, ends_at, location_name,
        location_url, capacity NULL, poster_key, external_url NULL,
        external_label, status, price, currency, created_by, created_at, updated_at)
registrations (id, event_id, user_id, status, decided_by, decided_at,
               created_at, updated_at, UNIQUE(event_id, user_id))
email_logs (id, user_id, template, payload JSONB, sent_at, error, created_at)
```

Enum:

- `users.role`: `user` | `organizer` | `admin`
- `events.status`: `draft` | `published` | `cancelled`
- `communities.status`: `draft` | `published` | `archived`
- `registrations.status`: `pending` | `approved` | `rejected` | `cancelled`

Aturan:

- 1 organizer per komunitas (`organizer_id` unik). Migrasi ke tabel join hanya bila
  benar-benar dibutuhkan.
- 1 registrasi per user per event; batal = ubah status, bukan hapus baris.
- `capacity = NULL` berarti tanpa batas.
- `price`/`currency` disiapkan untuk berbayar; fase 1 selalu 0/IDR.
- Filter publik: `category` + `city` (text terindeks; daftar kategori dari config).

---

## 4. API (Go, prefix `/api/v1`)

Auth: `Authorization: Bearer <JWT>`, di-inject Next dari cookie httpOnly.

**Publik**
- `GET /communities?q=&category=&city=&page=`
- `GET /communities/{slug}`
- `GET /communities/{slug}/events` (published, `starts_at >= now`)
- `GET /events/{id}`

**User**
- `POST /auth/google` → verifikasi Google ID token, upsert user, terbitkan JWT
- `GET /me`
- `GET /me/registrations`
- `POST /events/{id}/registrations`
- `POST /registrations/{id}/cancel`

**Organizer** (role + tenant check)
- `GET|PATCH /organizer/community`
- `GET|POST /organizer/events`
- `GET|PATCH /organizer/events/{id}`
- `POST /organizer/events/{id}/publish`
- `GET /organizer/events/{id}/registrations`
- `POST /registrations/{id}/approve` | `/reject`

**Admin**
- `POST /admin/communities`
- `PATCH /admin/communities/{id}` (assign organizer via email)
- `GET /admin/users?role=`

**Internal**
- `POST /internal/email-logs` (header `X-Internal-Secret`)

**Upload** (Next, bukan Go): `POST /api/upload` → `{ key }`.
Go memvalidasi `key`: prefix `community/` atau `event/`, regex ketat, tolak `..`.

Tidak ada endpoint agregat di fase 1; satu halaman boleh memanggil 2–3 endpoint.

---

## 5. Auth & Session

Manual OAuth (tanpa Auth.js):

1. `GET /api/auth/google` → buat `state`, simpan cookie pendek, redirect ke Google.
2. Callback → tukar `code` → ID token.
3. `POST /auth/google` ke Go → Go validasi (signature, `aud`, `exp`) → upsert user
   → terbitkan JWT (`userId`, `role`, `communityId`, exp 7 hari).
4. Next set cookie `kf_session` = JWT, `HttpOnly; Secure; SameSite=Lax`.
5. Middleware Next hanya untuk UX (redirect); authorization tetap di Go.

Logout: hapus cookie. Tanpa refresh token — habis 7 hari, login ulang.

CSRF: `state` param + `SameSite=Lax`; mutasi lewat server action/route handler Next.

---

## 6. Siklus Registrasi & Kuota

```
pending ──approve──> approved ──cancel(user)──> cancelled
   ├──reject(panitia)──> rejected
   └──cancel(user)─────> cancelled
```

- Approve/reject hanya dari `pending`. `approved` tidak bisa di-reject.
- Cancel boleh saat `pending`/`approved` selama event belum mulai.
- Daftar ulang setelah `cancelled` meng-update baris yang sama ke `pending`.
- Submit: bila approved >= capacity → tolak cepat "kuota penuh"; selain itu pending.
- Approve: transaksi `SELECT ... FROM events WHERE id=$1 FOR UPDATE`, hitung ulang
  approved di dalam transaksi, baru update. Men-serialize approval per event.
- Cancel dari approved otomatis membebaskan slot (dihitung ulang, bukan counter).
- Daftar hanya untuk event `published` dan `starts_at > now()`.
- Event `cancelled` → semua pending/approved jadi cancelled + email.
- `capacity` tidak boleh diturunkan di bawah jumlah approved saat ini.

---

## 7. Email & Upload

**Email** dikirim Next setelah Go sukses:

- SMTP: Resend atau Brevo (dev: Mailtrap). Wajib verifikasi domain sejak awal.
- Template: `registration_received`, `registration_approved`,
  `registration_rejected`, `event_cancelled`. HTML sederhana satu kolom.
- Sinkron, retry 2× backoff pendek. Gagal → jangan gagalkan aksi utama; tampilkan
  peringatan di dashboard. `POST /internal/email-logs` fire-and-forget.
- **My Events adalah sumber kebenaran**; email hanya pemberitahuan.

**Upload:**

- `POST /api/upload` (Next), maks 5 MB, `jpeg/png/webp`.
- Re-encode `sharp` → webp, sisi panjang maks 1600px (logo 512px). Membuang EXIF.
- Simpan `/data/uploads/<prefix>/<uuid>.webp`, balikin `key`.
- Disajikan nginx di `/uploads/*` dengan cache header.
- File yatim dibiarkan (pembersihan = next step).

---

## 8. Deployment & Operasional

- Docker Compose: `web`, `api`, `db`, `nginx`; `restart: unless-stopped`.
- Migrasi: SQL bernomor di `api/migrations/`, dijalankan idempotent saat start.
- Secret di `.env` (tidak masuk repo): `DATABASE_URL`, `GOOGLE_CLIENT_ID/SECRET`,
  `JWT_SECRET`, `INTERNAL_SECRET`, `SMTP_*`, `APP_BASE_URL`, `UPLOAD_DIR`.
- Healthcheck `GET /healthz`.
- Backup harian: `pg_dump` + tar `UPLOAD_DIR`, retensi 7 hari (cron host).
- TLS: Let's Encrypt (certbot) di nginx.

---

## 9. Testing

Prioritas pada yang bisa merusak data:

1. **Go unit test:** logika kuota/approve (termasuk concurrency), tenant
   authorization, state machine registrasi.
2. **Go integrasi ringan:** handler via `httptest` + Postgres test DB.
3. **Next:** tanpa unit test UI. Smoke test manual per halaman + 1–2 Playwright
   happy-path bila waktu tersisa.
4. **Seed:** 3 komunitas, 5 event, 2 organizer, 1 admin.

---

## 10. Rencana 7 Hari

| Hari | Fokus | Output |
|---|---|---|
| 1 | Fondasi | DESIGN.md, Compose, skeleton Go + migrasi + `/healthz`, skeleton Next, seed |
| 2 | Domain + publik | Go users/communities/events, JWT + tenant middleware; landing, page komunitas, page event |
| 3 | Auth | OAuth end-to-end, cookie, routing per role, `/me` |
| 4 | Registrasi | submit/cancel/my-events, kuota, state machine + test |
| 5 | Dashboard panitia | profil komunitas, CRUD/publish event, approve/reject + email |
| 6 | Pinggiran | upload, template email, dashboard admin, empty/error states, seed demo |
| 7 | Hardening | test, smoke test, TLS, backup, buffer |

**Urutan potong scope bila meleset:** Playwright → polesan dashboard admin →
template email (jadi teks polos) → filter city.

---

## 11. Risiko

| Risiko | Dampak | Mitigasi |
|---|---|---|
| OAuth consent/test user | Login gagal saat demo | Google Cloud disiapkan hari 1, mode Testing + test users |
| Verifikasi domain email | Email tidak terkirim | Demo pakai Mailtrap; email bukan sumber kebenaran |
| TLS/DNS makan waktu | Deploy telat | DNS hari 1; fallback IP + Let's Encrypt di akhir |
| Race condition kuota | Over-quota | `FOR UPDATE` + recompute, bukan counter |
| Scope creep | Tidak selesai | Non-goal dikunci |
| Solo + 7 hari | Meleset | Urutan potong scope ditetapkan |

---

## 12. Decision Log

| # | Keputusan | Alternatif | Alasan |
|---|---|---|---|
| 1 | Komunitas dibuat manual admin pusat | Self-service | Validasi dulu, hindari moderasi/abuse |
| 2 | Arsitektur C (Go domain, Next UI/I-O) | A fullstack Next, B split penuh | Simpan Go tanpa 2× kerja |
| 3 | Browser → Next saja, Next proxy | Browser langsung ke Go + CORS | Tanpa CORS, token aman |
| 4 | Go pemilik tunggal business rule | Logic tersebar | Cegah boundary bocor |
| 5 | 1 organizer per komunitas | Tabel join | YAGNI, mudah dimigrasi |
| 6 | `approved` tak bisa di-reject; batal = status; daftar ulang baris sama | Fitur kick, insert baru | Kurangi state & duplikasi |
| 7 | Kuota dihitung ulang dalam `FOR UPDATE` | Counter denormalisasi | Correctness > mikro-optimasi |
| 8 | Event gratis, field harga disiapkan | Payment sekarang | Scope payment besar |
| 9 | OAuth manual | Auth.js | Tetap butuh custom callback |
| 10 | JWT 7 hari httpOnly, tanpa refresh | Refresh token | Cukup fase 1 |
| 11 | Email best-effort; My Events sumber kebenaran | Outbox/queue | Hindari kompleksitas |
| 12 | Upload di Next + sharp; serve nginx; Go validasi key | Upload di Go | File transport bukan domain |
| 13 | Filter = category + city | Filter lanjutan | Sesuai referensi, cukup |
| 14 | Tombol Visit (IG) berdampingan dengan Daftar | Visit menggantikan Daftar | Event tanpa IG tetap bisa didaftari |
| 15 | 1 VPS + Compose + migrasi SQL bernomor | Managed services/ORM | Biaya & waktu |
| 16 | Test fokus Go (kuota/tenant/state machine) | Coverage tinggi | Uji yang bisa merusak data |

---

## 13. Catatan Implementasi (fase 1)

Penyimpangan kecil dari desain, semuanya disengaja:

- **Upload** dikerjakan lewat server action Next (`saveImage`), bukan endpoint
  `POST /api/upload`. Tetap di sisi Next, tetap divalidasi ulang oleh Go saat key
  disimpan. Route baca ada di `app/uploads/[...key]` untuk dev; production dilayani
  nginx.
- **Port host** nginx `8088` (bukan 80) agar tidak bentrok dengan web server lokal.
  Production tinggal ganti mapping ke 80/443.
- **DEV_LOGIN** (`true` hanya untuk dev) menambah `POST /api/v1/dev/login` yang
  memerlukan `X-Internal-Secret`. Default `false`; jangan aktifkan di production.
- **storage-init** service satu kali jalan untuk memberi ownership volume uploads
  ke user container Next (uid 1001).
- **Postgres** diekspos di host port `5433` untuk menjalankan test integrasi Go.
- Test integrasi store dijalankan dengan `TEST_DATABASE_URL`; di-skip bila kosong.