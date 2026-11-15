# ADR-003: Tetap custom Google OAuth + JWT (bukan Supabase Auth)

- **Tanggal:** Nov 2026
- **Status:** diterima
- **Konteks:** Supabase Auth tersedia, tapi alur custom (Google ID token → upsert →
  JWT `HttpOnly` 7 hari + role + tenant) sudah jadi, dites, dan dipahami tim.
- **Keputusan:** Supabase dipakai murni sebagai Postgres + Storage. Autentikasi tidak
  dimigrasi untuk saat ini.
- **Konsekuensi (+):** nol rewrite auth menjelang go-live; session/role/routing tidak berubah.
- **Konsekuensi (−):** kita menanggung sendiri refresh token (belum ada), verifikasi
  Google, dan rotasi secret; service-role key wajib server-only selamanya.
- **Tinjau ulang bila:** butuh social login tambahan, MFA, atau refresh token —
  saat itu evaluasi migrasi ke Supabase Auth.
