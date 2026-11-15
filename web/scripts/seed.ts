import { closePool, getPool } from "../lib/db";

type UserSeed = {
  email: string;
  name: string;
  role: string;
};

type CommunitySeed = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  category: string;
  city: string;
  organizer: string;
  logo: string;
  banner: string;
  instagram: string;
};

type EventSeed = {
  community: string;
  title: string;
  desc: string;
  days: number;
  hour: number;
  location: string;
  locationURL: string;
  capacity: number | null;
  poster: string;
  instagram: string;
};

function img(name: string): string {
  return `images/${name}`;
}

async function main(): Promise<void> {
  const pool = getPool();

  const users: UserSeed[] = [
    { email: "admin@komunifind.test", name: "Admin Pusat", role: "admin" },
    { email: "rina@komunifind.test", name: "Rina Panitia", role: "organizer" },
    { email: "budi@komunifind.test", name: "Budi Panitia", role: "organizer" },
    { email: "sari@komunifind.test", name: "Sari Peserta", role: "user" },
  ];
  for (const u of users) {
    await pool.query(
      `INSERT INTO users (google_sub, email, name, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (google_sub) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role`,
      [`dev:${u.email}`, u.email, u.name, u.role],
    );
  }

  const communities: CommunitySeed[] = [
    {
      slug: "jakarta-indie-runners",
      name: "Jakarta Indie Runners",
      tagline: "Lari santai tiap akhir pekan, semua level welcome.",
      description:
        "Komunitas lari independen di Jakarta. Kami rutin long run, city walk, dan ngopi bareng setelah lari. Tidak ada biaya anggota, cukup bawa sepatu.",
      category: "Olahraga",
      city: "Jakarta",
      organizer: "rina@komunifind.test",
      logo: "banteng.jpg",
      banner: "citywalk.jpg",
      instagram: "https://instagram.com/runjakarta",
    },
    {
      slug: "bandung-design-circle",
      name: "Bandung Design Circle",
      tagline: "Temu desainer Bandung: sharing, critique, dan kolaborasi.",
      description:
        "Wadah desainer visual, produk, dan UI/UX di Bandung. Setiap bulan ada sesi critique portofolio, doodle jam, dan workshop kecil.",
      category: "Desain",
      city: "Bandung",
      organizer: "budi@komunifind.test",
      logo: "doodle-tiktok.jpg",
      banner: "expo.jpg",
      instagram: "https://instagram.com/desainbandung",
    },
    {
      slug: "kopi-dan-kode",
      name: "Kopi & Kode",
      tagline: "Ngoding bareng sambil ngopi di Yogyakarta.",
      description:
        "Meetup santai untuk developer dan orang yang penasaran dengan teknologi. Bawa laptop, bawa pertanyaan. Kami percaya belajar paling enak sambil cerita.",
      category: "Teknologi",
      city: "Yogyakarta",
      organizer: "",
      logo: "kita-cerita.jpg",
      banner: "kita-cerita.jpg",
      instagram: "",
    },
    {
      slug: "bogor-doodle-art",
      name: "Bogor Doodle Art",
      tagline: "Coret-coret bareng komunitas gambar Bogor.",
      description:
        "Komunitas doodle dan ilustrasi di Bogor. Rutin bikin jam gambar, live sketch, dan ikut pameran bersama Doodle Art Indonesia.",
      category: "Seni",
      city: "Bogor",
      organizer: "",
      logo: "bogor.jpg",
      banner: "bogor.jpg",
      instagram: "",
    },
    {
      slug: "padel-social-jakarta",
      name: "Padel Social Jakarta",
      tagline: "Main padel santai, tanpa tekanan skor.",
      description:
        "Club padel untuk pemula dan yang baru kenal olahraga ini. Kami sediakan sesi ramah pemula, pinjam raket, dan mabar tiap minggu.",
      category: "Olahraga",
      city: "Jakarta",
      organizer: "",
      logo: "padel.jpg",
      banner: "padel.jpg",
      instagram: "",
    },
    {
      slug: "dapur-cerita",
      name: "Dapur Cerita",
      tagline: "Kelas masak kecil-kecilan, pulang bawa hasil.",
      description:
        "Komunitas kuliner yang suka masak bareng. Setiap sesi temanya beda: pastry, masakan rumahan, sampai bekal kerja.",
      category: "Kuliner",
      city: "Jakarta",
      organizer: "",
      logo: "cooking.jpg",
      banner: "cooking.jpg",
      instagram: "",
    },
    {
      slug: "relawan-kota",
      name: "Relawan Kota",
      tagline: "Aksi kecil rutin untuk kota yang lebih nyaman.",
      description:
        "Komunitas relawan yang bergerak di isu kebersihan taman, edukasi anak, dan kegiatan sosial ringan di akhir pekan.",
      category: "Sosial",
      city: "Jakarta",
      organizer: "",
      logo: "volunteer.jpg",
      banner: "volunteer.jpg",
      instagram: "",
    },
    {
      slug: "boardgame-corner",
      name: "Boardgame Corner",
      tagline: "Meja terbuka untuk yang mau belajar board game.",
      description:
        "Kumpul board game tiap dua minggu. Kami bawa koleksi, kamu bawa diri sendiri. Cocok untuk yang belum punya grup main.",
      category: "Hobi",
      city: "Jakarta",
      organizer: "",
      logo: "boardgame.jpg",
      banner: "boardgame.jpg",
      instagram: "",
    },
    {
      slug: "doodle-art-indonesia",
      name: "Doodle Art Indonesia",
      tagline: "Komunitas doodle terbesar, terbuka untuk siapa saja.",
      description:
        "Gerakan doodle Indonesia. Kami mengadakan dream festival, pameran, dan live sketch di berbagai kota.",
      category: "Seni",
      city: "Jakarta",
      organizer: "",
      logo: "gambarbooth.jpg",
      banner: "dreamfest.jpg",
      instagram: "https://instagram.com/doodleartindonesia",
    },
  ];

  for (const c of communities) {
    let organizerId: number | null = null;
    if (c.organizer !== "") {
      const found = await pool.query(`SELECT id FROM users WHERE email = $1`, [c.organizer]);
      if (found.rowCount === 0) {
        throw new Error(`seed: organizer ${c.organizer} tidak ditemukan`);
      }
      organizerId = Number(found.rows[0].id);
    }
    const socials = c.instagram !== "" ? JSON.stringify({ instagram: c.instagram }) : "{}";

    await pool.query(
      `INSERT INTO communities (slug, name, tagline, description, category, city, organizer_id,
         status, logo_key, banner_key, socials)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'published', $8, $9, $10::jsonb)
       ON CONFLICT (slug) DO UPDATE SET
         name = EXCLUDED.name,
         tagline = EXCLUDED.tagline,
         description = EXCLUDED.description,
         category = EXCLUDED.category,
         city = EXCLUDED.city,
         logo_key = EXCLUDED.logo_key,
         banner_key = EXCLUDED.banner_key,
         socials = EXCLUDED.socials,
         organizer_id = COALESCE(communities.organizer_id, EXCLUDED.organizer_id),
         updated_at = now()`,
      [c.slug, c.name, c.tagline, c.description, c.category, c.city, organizerId, img(c.logo), img(c.banner), socials],
    );
  }

  const events: EventSeed[] = [
    {
      community: "jakarta-indie-runners",
      title: "Weekend Long Run 12K",
      desc: "Long run santai 12K dari Senayan ke Sudirman loop. Pace 6:30-7:00, ada water station di KM 6. Setelah lari kami sarapan bareng.",
      days: 3,
      hour: 6,
      location: "GBK Senayan, Jakarta",
      locationURL: "https://maps.google.com/?q=GBK+Senayan",
      capacity: 40,
      poster: "citywalk.jpg",
      instagram: "https://www.instagram.com/explore/tags/runjakarta/",
    },
    {
      community: "jakarta-indie-runners",
      title: "Monas Morning Run 5K",
      desc: "Lari pagi keliling Monas, cocok untuk pemula. 5K santai, dilanjut foto bareng dan sarapan bubur di sekitar Monas.",
      days: 10,
      hour: 6,
      location: "Monas, Jakarta",
      locationURL: "https://maps.google.com/?q=Monas+Jakarta",
      capacity: 50,
      poster: "banteng.jpg",
      instagram: "",
    },
    {
      community: "jakarta-indie-runners",
      title: "Track Session: Interval 400m",
      desc: "Sesi interval di lintasan. Cocok untuk yang mau memperbaiki pace. Pemanasan 15 menit, lalu 8x400m.",
      days: 12,
      hour: 19,
      location: "Stadion Rawamangun, Jakarta",
      locationURL: "",
      capacity: 25,
      poster: "padel.jpg",
      instagram: "",
    },
    {
      community: "bandung-design-circle",
      title: "Portfolio Critique Night",
      desc: "Bawa 3 slide portofolio, dapat feedback dari 2 reviewer. Sesi 2 jam, maksimal 20 orang supaya semua kebagian.",
      days: 5,
      hour: 19,
      location: "Kopi Aroma, Jl. Banceuy, Bandung",
      locationURL: "",
      capacity: 20,
      poster: "doodle-tiktok.jpg",
      instagram: "https://www.instagram.com/explore/tags/desainbandung/",
    },
    {
      community: "bandung-design-circle",
      title: "Workshop Design System Kecil",
      desc: "Belajar bikin design token dan komponen dasar. Bawa laptop, Figma gratis sudah cukup.",
      days: 17,
      hour: 13,
      location: "Bandung Creative Hub",
      locationURL: "",
      capacity: 30,
      poster: "expo.jpg",
      instagram: "",
    },
    {
      community: "bandung-design-circle",
      title: "Doodle Jam Bandung",
      desc: "Jam gambar terbuka. Bawa sketchbook, kami sediakan meja dan teman gambar. Tanpa biaya.",
      days: 24,
      hour: 15,
      location: "Taman Cilaki, Bandung",
      locationURL: "",
      capacity: 35,
      poster: "gambarbooth.jpg",
      instagram: "",
    },
    {
      community: "kopi-dan-kode",
      title: "Ngoding Bareng: Bikin API Pertama",
      desc: "Sesi santai untuk pemula. Kita bikin API sederhana dari nol, lalu ngopi bareng. Tanpa biaya.",
      days: 7,
      hour: 16,
      location: "Kedai Kopi Klotok, Yogyakarta",
      locationURL: "",
      capacity: null,
      poster: "kita-cerita.jpg",
      instagram: "",
    },
    {
      community: "kopi-dan-kode",
      title: "Kita Cerita: Karier Developer",
      desc: "Sharing santai soal perjalanan jadi developer: dari belajar sendiri sampai kerja tim. Terbuka untuk yang masih ragu mulai.",
      days: 14,
      hour: 19,
      location: "Kedai Kopi Klotok, Yogyakarta",
      locationURL: "",
      capacity: 30,
      poster: "kita-cerita.jpg",
      instagram: "",
    },
    {
      community: "bogor-doodle-art",
      title: "Doodle Jam Bogor",
      desc: "Kumpul komunitas gambar Bogor. Bawa alat gambar sendiri, kami sediakan tempat dan kertas.",
      days: 9,
      hour: 10,
      location: "Taman Kencana, Bogor",
      locationURL: "",
      capacity: 40,
      poster: "bogor.jpg",
      instagram: "",
    },
    {
      community: "padel-social-jakarta",
      title: "Padel Beginner Social",
      desc: "Sesi padel untuk yang baru mulai. Ada coach singkat 30 menit, lalu main campuran. Raket bisa dipinjam.",
      days: 4,
      hour: 18,
      location: "Padel Court Kemang, Jakarta",
      locationURL: "",
      capacity: 16,
      poster: "padel.jpg",
      instagram: "",
    },
    {
      community: "dapur-cerita",
      title: "Kelas Masak: Pastry Rumahan",
      desc: "Bikin pastry sederhana di rumah. Semua bahan disediakan, pulang bawa hasil. Cocok untuk pemula.",
      days: 11,
      hour: 10,
      location: "Dapur Cerita Studio, Jakarta Selatan",
      locationURL: "",
      capacity: 14,
      poster: "cooking.jpg",
      instagram: "",
    },
    {
      community: "relawan-kota",
      title: "Aksi Bersih Taman Kota",
      desc: "Kerja bakti ringan: bersihkan taman, edukasi pemilahan sampah untuk anak-anak. Bawa botol minum sendiri.",
      days: 6,
      hour: 7,
      location: "Taman Suropati, Jakarta",
      locationURL: "",
      capacity: 60,
      poster: "volunteer.jpg",
      instagram: "",
    },
    {
      community: "boardgame-corner",
      title: "Boardgame Night: Catan & Friends",
      desc: "Main Catan, Azul, dan game ringan lain. Datang sendiri tidak apa-apa, kami bantu carikan meja.",
      days: 8,
      hour: 19,
      location: "Kopi Kolong, Jakarta Pusat",
      locationURL: "",
      capacity: 24,
      poster: "boardgame.jpg",
      instagram: "",
    },
    {
      community: "doodle-art-indonesia",
      title: "Indonesia Dream Festival Meetup",
      desc: "Kumpul komunitas doodle di festival. Ada live mural, pameran karya, dan sesi foto bersama.",
      days: 20,
      hour: 13,
      location: "Jakarta Convention Center",
      locationURL: "",
      capacity: 100,
      poster: "dreamfest.jpg",
      instagram: "https://instagram.com/doodleartindonesia",
    },
  ];

  const wibNow = new Date(Date.now() + 7 * 3600 * 1000);
  for (const e of events) {
    const found = await pool.query(`SELECT id FROM communities WHERE slug = $1`, [e.community]);
    if (found.rowCount === 0) {
      throw new Error(`seed: community ${e.community} tidak ditemukan`);
    }
    const communityId = Number(found.rows[0].id);
    const start = new Date(
      Date.UTC(
        wibNow.getUTCFullYear(),
        wibNow.getUTCMonth(),
        wibNow.getUTCDate() + e.days,
        e.hour - 7,
        0,
        0,
      ),
    );
    const end = new Date(start.getTime() + 3 * 3600 * 1000);

    const updated = await pool.query(
      `UPDATE events SET
         description = $3,
         starts_at = $4,
         ends_at = $5,
         location_name = $6,
         location_url = $7,
         capacity = $8,
         poster_key = $9,
         external_url = $10,
         status = 'published',
         updated_at = now()
       WHERE community_id = $1 AND title = $2`,
      [
        communityId,
        e.title,
        e.desc,
        start.toISOString(),
        end.toISOString(),
        e.location,
        e.locationURL === "" ? null : e.locationURL,
        e.capacity,
        img(e.poster),
        e.instagram === "" ? null : e.instagram,
      ],
    );
    if ((updated.rowCount ?? 0) > 0) continue;

    await pool.query(
      `INSERT INTO events (community_id, title, description, starts_at, ends_at, location_name,
         location_url, capacity, poster_key, external_url, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'published')`,
      [
        communityId,
        e.title,
        e.desc,
        start.toISOString(),
        end.toISOString(),
        e.location,
        e.locationURL === "" ? null : e.locationURL,
        e.capacity,
        img(e.poster),
        e.instagram === "" ? null : e.instagram,
      ],
    );
  }

  await closePool();
  console.log("seed: selesai");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
