# PRD Komunifind — Fase 1 (Go-Live)

> Dokumen ini adalah sumber kebenaran produk: *apa* yang dibangun, untuk siapa,
> dan seperti apa "selesai" itu. Detail teknis ada di `docs/archive/DESIGN-fase1-go.md` dan
> `docs/architecture.html`. Status: **live scope, disetujui Nov 2026**.

## 1. Latar & masalah

Orang sulit menemukan komunitas yang relevan di kotanya, dan panitia tidak punya
satu tempat untuk memajang komunitas, mengumumkan event, dan mengelola peserta.
Informasi tersebar di Instagram, grup chat, dan poster — tidak bisa dicari dan
tidak ada alur pendaftaran yang jelas.

## 2. Tujuan & metrik sukses

**Tujuan:** direktori komunitas yang bisa dicari + pendaftaran event end-to-end
(browse → daftar → approve → hadir) untuk fase 1.

**Metrik go-live (fase 1):**
- Loop inti berjalan tanpa error: daftar → approve → cancel, diverifikasi E2E.
- 9 komunitas + 14 event seed tampil dengan benar.
- Login Google asli berfungsi di production.
- Email notifikasi terkirim (bukan hanya tercatat).
- Tidak ada data bocor antar komunitas (tenant isolation teruji).

## 3. Persona & peran

| Persona | Role | Bisa | Tidak bisa (fase 1) |
|---|---|---|---|
| Pengunjung | — (tanpa akun) | Browse, search, filter komunitas & event; buka halaman komunitas/event | Mendaftar event |
| User terdaftar | `user` | Semua milik pengunjung + daftar/batal event, lihat status di “Pendaftaranku” | Mengelola komunitas |
| Panitia | `organizer` | Semua milik user + kelola **tepat 1 komunitas**: profil, event (CRUD/publish/cancel), kuota, approve/reject peserta | Melihat/mengubah komunitas lain |
| Admin pusat | `admin` | Membuat komunitas, assign panitia via email, melihat user | — (tetap 1 panitia per komunitas) |

## 4. Scope fase 1 — fitur & acceptance criteria

### F1. Direktori publik (landing `/`, `/events`)
- [ ] Menampilkan daftar komunitas (paginasi), search nama, filter kategori + kota.
- [ ] Menampilkan event terdekat lintas komunitas.
- [ ] Hero tunnel + carousel komunitas pilihan berfungsi dan tidak merusak layout mobile.
- [ ] Tanpa akun, semua halaman publik bisa dibuka.

### F2. Halaman komunitas (`/communities/[slug]`)
- [ ] Menampilkan profil (logo, banner, deskripsi, sosial) + event mendatang.
- [ ] Slug tidak dikenal / komunitas tidak terbit → halaman 404.

### F3. Halaman event (`/events/[id]`) + pendaftaran
- [ ] Menampilkan detail, kuota tersisa, tombol Visit (bila ada link eksternal) dan Daftar.
- [ ] Tanpa login, tombol Daftar mengarah ke login dan kembali ke event setelah login.
- [ ] User login bisa daftar (status awal `pending`); daftar ganda ditolak dengan pesan jelas.
- [ ] User bisa membatalkan pendaftaran aktif sebelum event mulai; slot kuota kembali.
- [ ] Event penuh / sudah lewat / dibatalkan tidak bisa didaftari, dengan pesan yang benar.

### F4. Autentikasi & sesi
- [ ] Login Google (OAuth): tukar code → verifikasi ID token → JWT di cookie `HttpOnly` (7 hari).
- [ ] Redirect setelah login mengikuti role (`/me`, `/dashboard`, `/admin`) atau `next` bila aman.
- [ ] Middleware melindungi `/me`, `/dashboard/*`, `/admin/*`; user salah role diarahkan pulang.
- [ ] Logout menghapus sesi. Dev-login hanya aktif bila `DEV_LOGIN=true`.

### F5. Dashboard panitia
- [ ] Ringkasan: total/terbit/draft event + peserta disetujui; tabel event dengan status & kuota.
- [ ] Edit profil komunitas (termasuk upload logo/banner) langsung tampil publik.
- [ ] Buat/edit/publish/cancel event; cancel memberi tahu peserta terdaftar.
- [ ] Daftar peserta per event dengan approve/reject; kuota tidak bisa diturunkan di bawah jumlah approved.
- [ ] Panitia **tidak bisa** membuka event komunitas lain (ditolak).

### F6. Admin pusat
- [ ] Buat komunitas (slug otomatis bila kosong) + upload + assign panitia via email.
- [ ] Assign hanya untuk email yang sudah pernah login; role user dipromosikan otomatis.
- [ ] Daftar user dan daftar semua komunitas (termasuk draft/arsip).

### F7. Upload gambar
- [ ] JPG/PNG/WebP maks 5 MB; di-reencode WebP (logo ≤512px, lainnya ≤1600px).
- [ ] Driver `local` (dev) dan `supabase` (prod) lewat variabel env yang sama (`STORAGE_DRIVER`).
- [ ] Key tervalidasi; file yatim tidak merusak apa pun.

### F8. Email notifikasi
- [ ] Terkirim saat: pendaftaran diterima, disetujui, ditolak, event dibatalkan.
- [ ] Pengiriman best-effort: aksi utama tidak pernah gagal karena email; semua hasil tercatat di `email_logs`.
- [ ] Halaman “Pendaftaranku” adalah sumber kebenaran status, bukan email.

### F9. Observabilitas operasional (fase 1, minimal)
- [ ] `GET /healthz` (API era Go) / halaman status setara menjawab OK.
- [ ] Log email tersedia untuk debug notifikasi yang hilang.

## 5. Non-goals (sengaja TIDAK di fase 1)

N1. Event berbayar / payment gateway (field harga disiapkan, selalu 0).
N2. Join/membership komunitas.
N3. Komunitas membuat halaman sendiri (masih dibuat admin pusat).
N4. Chat, forum, komentar.
N5. Notifikasi WhatsApp/push.
N6. Multi-bahasa (UI Indonesia saja), aplikasi mobile native.
N7. Refresh token (sesi 7 hari, habis login ulang).
N8. Lebih dari 1 panitia per komunitas.

Daftar turunan pasca-go-live ada di `docs/ROADMAP.md`.

## 6. Alur utama yang harus selalu jalan (critical path)

```
pengunjung --search--> komunitas --buka--> event --daftar--> pending
  --panitia approve--> approved --user batal?--> cancelled
```

Alur ini dilindungi automated test di dua level: vitest (aturan) + Playwright (klik UI).
Detail strategi ada di `docs/TESTING.md`.

## 7. Kebutuhan non-fungsional

- **Skala:** puluhan komunitas, <500 user, <500 event. Tidak ada target optimasi agresif.
- **Keamanan:** JWT `HttpOnly` saja; otorisasi + tenant check di server setiap request;
  service-role key tidak pernah ke browser; `DEV_LOGIN=false` di production;
  secret prod acak dan unik.
- **Reliabilitas:** approval kuota atomik (transaksi terkunci); migrasi aditif dan idempotent;
  email tidak boleh menggagalkan aksi.
- **Operasional:** deploy Vercel; database + storage Supabase; backup mengikuti fitur bawaan provider.

## 8. Asumsi & dependensi eksternal

- Google Cloud OAuth client + redirect URI per environment (butuh akses Google Cloud).
- Domain + DNS (registrar/Cloudflare) untuk prod dan email.
- Resend dengan domain pengirim terverifikasi.
- Akun Supabase (Postgres + Storage) dan Vercel.

## 9. Risiko

| Risiko | Mitigasi |
|---|---|
| OAuth/DNS/email butuh waktu verifikasi pihak ketiga | Dikerjakan paralel di Fase 2; scope kode tidak tergantung padanya |
| Kuota jebol saat approve bersamaan | Transaksi `SELECT ... FOR UPDATE` + hitung ulang (teruji) |
| Email tidak sampai | Best-effort + `email_logs` + halaman status sebagai kebenaran |
| Scope creep | Non-goal dikunci di §5; perubahan scope butuh PRD amendment |
| Regresi fitur lama | Pintu CI: typecheck + build + vitest + Playwright harus hijau |

## 10. Kriteria go-live (checklist)

- [ ] Semua AC F1–F9 terpenuhi dan terverifikasi (§6 hijau di CI).
- [ ] Login Google asli + email asli terkirim di production.
- [ ] Upload tampil di production (Supabase Storage).
- [ ] Smoke manual di HP + desktop lolos.
- [ ] Secret prod terisi, `DEV_LOGIN=false`.
- [ ] Backup/point-in-time Supabase aktif.
