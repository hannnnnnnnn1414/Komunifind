# ADR-002: Supabase + Vercel + Resend untuk production

- **Tanggal:** Nov 2026
- **Status:** diterima (eksekusi Fase 2)
- **Konteks:** go-live cepat, minim operasional, budget awal ~$0.
- **Keputusan:**
  - Hosting: Vercel (mulai Hobby; naik ke Pro saat ada monetisasi/komersial).
  - Database + storage: Supabase (Postgres pooler 6543 untuk runtime,
    direct 5432 untuk migrasi; Storage bucket `uploads`), bukan Neon + R2 —
    satu vendor menutup dua kebutuhan.
  - Email: Resend dengan domain terverifikasi.
- **Konsekuensi (+):** TLS, deploy, backup dasar, dan dashboard data tanpa urus server.
- **Konsekuensi (−):** ketergantungan 3 vendor; limit free tier harus dipantau
  (bandwidth storage, compute Supabase); project free bisa pause bila lama idle.
- **Catatan:** arsitektur Next.js full-stack tetap bisa dipindah ke VPS kapan saja
  tanpa ubah kode bila biaya/kebutuhan berubah.
