# ADR-004: Tanpa Tailwind/shadcn (CSS milik sendiri)

- **Tanggal:** Nov 2026
- **Status:** diterima
- **Konteks:** tema monokrom custom sudah jadi; komponen 21st.dev (perspective tunnel
  hero) meminta Tailwind + shadcn.
- **Keputusan:** tidak install Tailwind hanya untuk satu komponen (preflight-nya
  berisiko menabrak tema). Komponen diadaptasi ke CSS Module + `framer-motion`
  dengan efek setara; ditaruh di `components/ui/` sesuai konvensi.
- **Konsekuensi (+):** tidak ada reset global asing; bundle tetap ramping.
- **Konsekuensi (−):** komponen 21st.dev berikutnya harus diadaptasi manual, bukan copy-paste.
