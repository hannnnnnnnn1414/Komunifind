package main

import (
	"context"
	"log"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"komunifind/api/internal/config"
	"komunifind/api/internal/db"
)

type userSeed struct {
	email string
	name  string
	role  string
}

type communitySeed struct {
	slug        string
	name        string
	tagline     string
	description string
	category    string
	city        string
	organizer   string
	logo        string
	banner      string
	instagram   string
}

type eventSeed struct {
	community   string
	title       string
	desc        string
	days        int
	hour        int
	location    string
	locationURL string
	capacity    *int
	poster      string
	instagram   string
}

func ptr(v int) *int { return &v }

func img(name string) string { return "images/" + name }

func main() {
	ctx := context.Background()
	cfg := config.Load()

	pool, err := db.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("seed: db: %v", err)
	}
	defer pool.Close()

	if err := db.Migrate(ctx, pool, cfg.MigrationsDir); err != nil {
		log.Fatalf("seed: migrate: %v", err)
	}

	if err := seed(ctx, pool); err != nil {
		log.Fatalf("seed: %v", err)
	}
	log.Print("seed: selesai")
}

func seed(ctx context.Context, pool *pgxpool.Pool) error {
	users := []userSeed{
		{email: "admin@komunifind.test", name: "Admin Pusat", role: "admin"},
		{email: "rina@komunifind.test", name: "Rina Panitia", role: "organizer"},
		{email: "budi@komunifind.test", name: "Budi Panitia", role: "organizer"},
		{email: "sari@komunifind.test", name: "Sari Peserta", role: "user"},
	}
	for _, u := range users {
		if _, err := pool.Exec(ctx, `
			INSERT INTO users (google_sub, email, name, role)
			VALUES ($1, $2, $3, $4)
			ON CONFLICT (google_sub) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role`,
			"dev:"+u.email, u.email, u.name, u.role); err != nil {
			return err
		}
	}

	communities := []communitySeed{
		{
			slug: "jakarta-indie-runners", name: "Jakarta Indie Runners",
			tagline:     "Lari santai tiap akhir pekan, semua level welcome.",
			description: "Komunitas lari independen di Jakarta. Kami rutin long run, city walk, dan ngopi bareng setelah lari. Tidak ada biaya anggota, cukup bawa sepatu.",
			category:    "Olahraga", city: "Jakarta", organizer: "rina@komunifind.test",
			logo: "banteng.jpg", banner: "citywalk.jpg", instagram: "https://instagram.com/runjakarta",
		},
		{
			slug: "bandung-design-circle", name: "Bandung Design Circle",
			tagline:     "Temu desainer Bandung: sharing, critique, dan kolaborasi.",
			description: "Wadah desainer visual, produk, dan UI/UX di Bandung. Setiap bulan ada sesi critique portofolio, doodle jam, dan workshop kecil.",
			category:    "Desain", city: "Bandung", organizer: "budi@komunifind.test",
			logo: "doodle-tiktok.jpg", banner: "expo.jpg", instagram: "https://instagram.com/desainbandung",
		},
		{
			slug: "kopi-dan-kode", name: "Kopi & Kode",
			tagline:     "Ngoding bareng sambil ngopi di Yogyakarta.",
			description: "Meetup santai untuk developer dan orang yang penasaran dengan teknologi. Bawa laptop, bawa pertanyaan. Kami percaya belajar paling enak sambil cerita.",
			category:    "Teknologi", city: "Yogyakarta",
			logo: "kita-cerita.jpg", banner: "kita-cerita.jpg",
		},
		{
			slug: "bogor-doodle-art", name: "Bogor Doodle Art",
			tagline:     "Coret-coret bareng komunitas gambar Bogor.",
			description: "Komunitas doodle dan ilustrasi di Bogor. Rutin bikin jam gambar, live sketch, dan ikut pameran bersama Doodle Art Indonesia.",
			category:    "Seni", city: "Bogor",
			logo: "bogor.jpg", banner: "bogor.jpg",
		},
		{
			slug: "padel-social-jakarta", name: "Padel Social Jakarta",
			tagline:     "Main padel santai, tanpa tekanan skor.",
			description: "Club padel untuk pemula dan yang baru kenal olahraga ini. Kami sediakan sesi ramah pemula, pinjam raket, dan mabar tiap minggu.",
			category:    "Olahraga", city: "Jakarta",
			logo: "padel.jpg", banner: "padel.jpg",
		},
		{
			slug: "dapur-cerita", name: "Dapur Cerita",
			tagline:     "Kelas masak kecil-kecilan, pulang bawa hasil.",
			description: "Komunitas kuliner yang suka masak bareng. Setiap sesi temanya beda: pastry, masakan rumahan, sampai bekal kerja.",
			category:    "Kuliner", city: "Jakarta",
			logo: "cooking.jpg", banner: "cooking.jpg",
		},
		{
			slug: "relawan-kota", name: "Relawan Kota",
			tagline:     "Aksi kecil rutin untuk kota yang lebih nyaman.",
			description: "Komunitas relawan yang bergerak di isu kebersihan taman, edukasi anak, dan kegiatan sosial ringan di akhir pekan.",
			category:    "Sosial", city: "Jakarta",
			logo: "volunteer.jpg", banner: "volunteer.jpg",
		},
		{
			slug: "boardgame-corner", name: "Boardgame Corner",
			tagline:     "Meja terbuka untuk yang mau belajar board game.",
			description: "Kumpul board game tiap dua minggu. Kami bawa koleksi, kamu bawa diri sendiri. Cocok untuk yang belum punya grup main.",
			category:    "Hobi", city: "Jakarta",
			logo: "boardgame.jpg", banner: "boardgame.jpg",
		},
		{
			slug: "doodle-art-indonesia", name: "Doodle Art Indonesia",
			tagline:     "Komunitas doodle terbesar, terbuka untuk siapa saja.",
			description: "Gerakan doodle Indonesia. Kami mengadakan dream festival, pameran, dan live sketch di berbagai kota.",
			category:    "Seni", city: "Jakarta",
			logo: "gambarbooth.jpg", banner: "dreamfest.jpg", instagram: "https://instagram.com/doodleartindonesia",
		},
	}

	for _, c := range communities {
		var organizerID *int64
		if c.organizer != "" {
			var id int64
			if err := pool.QueryRow(ctx, `SELECT id FROM users WHERE email = $1`, c.organizer).Scan(&id); err != nil {
				return err
			}
			organizerID = &id
		}
		socials := "{}"
		if c.instagram != "" {
			socials = `{"instagram":"` + c.instagram + `"}`
		}

		if _, err := pool.Exec(ctx, `
			INSERT INTO communities (slug, name, tagline, description, category, city, organizer_id,
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
			c.slug, c.name, c.tagline, c.description, c.category, c.city, organizerID,
			img(c.logo), img(c.banner), socials); err != nil {
			return err
		}
	}

	events := []eventSeed{
		{
			community: "jakarta-indie-runners", title: "Weekend Long Run 12K",
			desc: "Long run santai 12K dari Senayan ke Sudirman loop. Pace 6:30-7:00, ada water station di KM 6. Setelah lari kami sarapan bareng.",
			days: 3, hour: 6, location: "GBK Senayan, Jakarta", locationURL: "https://maps.google.com/?q=GBK+Senayan",
			capacity: ptr(40), poster: "citywalk.jpg", instagram: "https://www.instagram.com/explore/tags/runjakarta/",
		},
		{
			community: "jakarta-indie-runners", title: "Monas Morning Run 5K",
			desc: "Lari pagi keliling Monas, cocok untuk pemula. 5K santai, dilanjut foto bareng dan sarapan bubur di sekitar Monas.",
			days: 10, hour: 6, location: "Monas, Jakarta", locationURL: "https://maps.google.com/?q=Monas+Jakarta",
			capacity: ptr(50), poster: "banteng.jpg",
		},
		{
			community: "jakarta-indie-runners", title: "Track Session: Interval 400m",
			desc: "Sesi interval di lintasan. Cocok untuk yang mau memperbaiki pace. Pemanasan 15 menit, lalu 8x400m.",
			days: 12, hour: 19, location: "Stadion Rawamangun, Jakarta",
			capacity: ptr(25), poster: "padel.jpg",
		},
		{
			community: "bandung-design-circle", title: "Portfolio Critique Night",
			desc: "Bawa 3 slide portofolio, dapat feedback dari 2 reviewer. Sesi 2 jam, maksimal 20 orang supaya semua kebagian.",
			days: 5, hour: 19, location: "Kopi Aroma, Jl. Banceuy, Bandung",
			capacity: ptr(20), poster: "doodle-tiktok.jpg", instagram: "https://www.instagram.com/explore/tags/desainbandung/",
		},
		{
			community: "bandung-design-circle", title: "Workshop Design System Kecil",
			desc: "Belajar bikin design token dan komponen dasar. Bawa laptop, Figma gratis sudah cukup.",
			days: 17, hour: 13, location: "Bandung Creative Hub",
			capacity: ptr(30), poster: "expo.jpg",
		},
		{
			community: "bandung-design-circle", title: "Doodle Jam Bandung",
			desc: "Jam gambar terbuka. Bawa sketchbook, kami sediakan meja dan teman gambar. Tanpa biaya.",
			days: 24, hour: 15, location: "Taman Cilaki, Bandung",
			capacity: ptr(35), poster: "gambarbooth.jpg",
		},
		{
			community: "kopi-dan-kode", title: "Ngoding Bareng: Bikin API Pertama",
			desc: "Sesi santai untuk pemula. Kita bikin API sederhana dari nol, lalu ngopi bareng. Tanpa biaya.",
			days: 7, hour: 16, location: "Kedai Kopi Klotok, Yogyakarta",
			poster: "kita-cerita.jpg",
		},
		{
			community: "kopi-dan-kode", title: "Kita Cerita: Karier Developer",
			desc: "Sharing santai soal perjalanan jadi developer: dari belajar sendiri sampai kerja tim. Terbuka untuk yang masih ragu mulai.",
			days: 14, hour: 19, location: "Kedai Kopi Klotok, Yogyakarta",
			capacity: ptr(30), poster: "kita-cerita.jpg",
		},
		{
			community: "bogor-doodle-art", title: "Doodle Jam Bogor",
			desc: "Kumpul komunitas gambar Bogor. Bawa alat gambar sendiri, kami sediakan tempat dan kertas.",
			days: 9, hour: 10, location: "Taman Kencana, Bogor",
			capacity: ptr(40), poster: "bogor.jpg",
		},
		{
			community: "padel-social-jakarta", title: "Padel Beginner Social",
			desc: "Sesi padel untuk yang baru mulai. Ada coach singkat 30 menit, lalu main campuran. Raket bisa dipinjam.",
			days: 4, hour: 18, location: "Padel Court Kemang, Jakarta",
			capacity: ptr(16), poster: "padel.jpg",
		},
		{
			community: "dapur-cerita", title: "Kelas Masak: Pastry Rumahan",
			desc: "Bikin pastry sederhana di rumah. Semua bahan disediakan, pulang bawa hasil. Cocok untuk pemula.",
			days: 11, hour: 10, location: "Dapur Cerita Studio, Jakarta Selatan",
			capacity: ptr(14), poster: "cooking.jpg",
		},
		{
			community: "relawan-kota", title: "Aksi Bersih Taman Kota",
			desc: "Kerja bakti ringan: bersihkan taman, edukasi pemilahan sampah untuk anak-anak. Bawa botol minum sendiri.",
			days: 6, hour: 7, location: "Taman Suropati, Jakarta",
			capacity: ptr(60), poster: "volunteer.jpg",
		},
		{
			community: "boardgame-corner", title: "Boardgame Night: Catan & Friends",
			desc: "Main Catan, Azul, dan game ringan lain. Datang sendiri tidak apa-apa, kami bantu carikan meja.",
			days: 8, hour: 19, location: "Kopi Kolong, Jakarta Pusat",
			capacity: ptr(24), poster: "boardgame.jpg",
		},
		{
			community: "doodle-art-indonesia", title: "Indonesia Dream Festival Meetup",
			desc: "Kumpul komunitas doodle di festival. Ada live mural, pameran karya, dan sesi foto bersama.",
			days: 20, hour: 13, location: "Jakarta Convention Center",
			capacity: ptr(100), poster: "dreamfest.jpg", instagram: "https://instagram.com/doodleartindonesia",
		},
	}

	now := time.Now().In(time.FixedZone("WIB", 7*3600))
	for _, e := range events {
		var communityID int64
		if err := pool.QueryRow(ctx, `SELECT id FROM communities WHERE slug = $1`, e.community).Scan(&communityID); err != nil {
			return err
		}
		start := time.Date(now.Year(), now.Month(), now.Day(), e.hour, 0, 0, 0, now.Location()).AddDate(0, 0, e.days)
		end := start.Add(3 * time.Hour)

		var locationURL, externalURL any
		if e.locationURL != "" {
			locationURL = e.locationURL
		}
		if e.instagram != "" {
			externalURL = e.instagram
		}

		tag, err := pool.Exec(ctx, `
			UPDATE events SET
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
			communityID, e.title, e.desc, start, end, e.location, locationURL, e.capacity, img(e.poster), externalURL)
		if err != nil {
			return err
		}
		if tag.RowsAffected() > 0 {
			continue
		}

		if _, err := pool.Exec(ctx, `
			INSERT INTO events (community_id, title, description, starts_at, ends_at, location_name,
				location_url, capacity, poster_key, external_url, status)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'published')`,
			communityID, e.title, e.desc, start, end, e.location, locationURL, e.capacity, img(e.poster), externalURL); err != nil {
			return err
		}
	}

	return nil
}
