# Roadmap Pasca Go-Live

> Sumber ide: non-goal PRD (§5) + temuan saat operasional. Urutan prioritas
> ditentukan ulang tiap evaluasi; dokumen ini hanya backlog hidup, bukan janji.

## Prioritas 1 — Monetisasi & pertumbuhan
- Event berbayar (payment gateway; field `price`/`currency` sudah disiapkan).
- Upgrade tier: pantau limit Vercel Hobby, Neon/Supabase free, bandwidth storage.
- SEO lanjutan: sitemap dinamis, metadata per komunitas/event, Open Graph image.

## Prioritas 2 — Kedalaman komunitas
- Join/membership komunitas (bukan sekadar daftar event).
- Self-service pembuatan komunitas (dengan moderasi admin).
- Lebih dari 1 panitia per komunitas (butuh tabel join pengganti `organizer_id` unik).
- Profil publik panitia/anggota.

## Prioritas 3 — Engagement
- Notifikasi WhatsApp/push (saat ini email saja).
- Komentar/diskusi event, rating/ulasan komunitas.
- Kalender“Saya”: sinkronisasi ke Google Calendar (.ics).

## Prioritas 4 — Platform & operasional
- Refresh token + remember-me yang benar.
- Full-text search Postgres (`tsvector`) bila `LIKE` mulai lambat.
- Pembersihan file yatim (cron) + dashboard storage.
- Backup restore drill terjadwal + runbook insiden.
- Multi-bahasa (Indonesia dulu, Inggris menyusul).

## Eksplisit TIDAK (sampai ada keputusan baru)
- Aplikasi mobile native (web responsif sudah cukup).
- Chat real-time internal (gunakan kanal komunitas yang ada).
- Fitur “kick” peserta oleh panitia (peserta batal mandiri).
