import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { mediaUrl, pageUrl } from "@/lib/format";
import type { Community, Event, ListResult } from "@/lib/types";
import { CommunityCard } from "@/components/CommunityCard";
import { EventRow } from "@/components/EventRow";
import { HeroCarousel } from "@/components/HeroCarousel";
import { PerspectiveTunnelHero } from "@/components/ui/PerspectiveTunnelHero";
import { Notices } from "@/components/Notices";

export const dynamic = "force-dynamic";

type Facets = { categories: string[]; cities: string[] };

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const category = typeof sp.category === "string" ? sp.category : "";
  const city = typeof sp.city === "string" ? sp.city : "";
  const page = Math.max(Number(typeof sp.page === "string" ? sp.page : "1") || 1, 1);
  const ok = typeof sp.ok === "string" ? sp.ok : undefined;
  const err = typeof sp.err === "string" ? sp.err : undefined;

  let list: ListResult<Community> | null = null;
  let facets: Facets = { categories: [], cities: [] };
  let events: Event[] = [];
  let failed = false;

  try {
    const query = new URLSearchParams({ q, category, city, page: String(page), perPage: "12" });
    [list, facets, { items: events }] = await Promise.all([
      apiFetch<ListResult<Community>>(`/api/v1/communities?${query.toString()}`),
      apiFetch<Facets>("/api/v1/communities/facets"),
      apiFetch<{ items: Event[] }>("/api/v1/events?limit=6"),
    ]);
  } catch {
    failed = true;
  }

  const filtering = Boolean(q || category || city);
  const totalPages = list ? Math.max(Math.ceil(list.total / list.perPage), 1) : 1;

  const featuredOrder = [
    "doodle-art-indonesia",
    "jakarta-indie-runners",
    "padel-social-jakarta",
    "dapur-cerita",
    "bandung-design-circle",
    "bogor-doodle-art",
  ];
  const allCommunities = list?.items ?? [];
  const preferred = featuredOrder
    .map((slug) => allCommunities.find((c) => c.slug === slug))
    .filter((c): c is Community => Boolean(c));
  const tunnelItems = allCommunities
    .filter((c) => Boolean(mediaUrl(c.bannerKey)))
    .map((c) => ({
      src: mediaUrl(c.bannerKey) as string,
      title: c.name,
      href: `/communities/${c.slug}`,
    }));

  const slides = (preferred.length > 0 ? preferred : allCommunities)
    .map((c) => ({
      slug: c.slug,
      name: c.name,
      tagline: c.tagline,
      category: c.category,
      city: c.city,
      bannerUrl: mediaUrl(c.bannerKey) ?? "",
      logoUrl: mediaUrl(c.logoKey),
    }))
    .filter((s) => s.bannerUrl)
    .slice(0, 6);

  return (
    <>
      <PerspectiveTunnelHero items={tunnelItems} />

      <section className="hero">
        <div className="container">
          <div className="hero-grid">
            <div className="hero-copy">
              <p className="lede">
                Jelajahi komunitas di kotamu, lihat event terdekat, lalu daftar langsung dari halaman
                event. Setiap komunitas dikelola panitianya sendiri.
              </p>

              <form className="searchbar" action="/" method="get">
                <input
                  type="search"
                  name="q"
                  placeholder="Cari nama komunitas, misal: lari, desain, kopi"
                  defaultValue={q}
                  aria-label="Cari komunitas"
                />
                <select name="category" defaultValue={category} aria-label="Kategori">
                  <option value="">Semua kategori</option>
                  {facets.categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <select name="city" defaultValue={city} aria-label="Kota">
                  <option value="">Semua kota</option>
                  {facets.cities.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <button type="submit" className="btn btn-primary">
                  Cari
                </button>
              </form>

              <div className="hero-stats">
                <span className="chip chip-accent">{list?.total ?? 0} komunitas</span>
                <span className="chip">{facets.cities.length} kota</span>
                <span className="chip">{facets.categories.length} kategori</span>
                <span className="chip">Gratis untuk diikuti</span>
              </div>
            </div>

            <HeroCarousel slides={slides} />
          </div>
        </div>
      </section>

      <div className="container">
        <Notices ok={ok} err={err} />
        {failed ? (
          <div className="notice notice-warn mt-24">
            Data belum bisa dimuat. Pastikan API sedang berjalan, lalu muat ulang halaman.
          </div>
        ) : null}
      </div>

      <section className="section" id="komunitas">
        <div className="container">
          <div className="section-head">
            <div>
              <h2>{filtering ? "Hasil pencarian" : "Komunitas untuk dijelajahi"}</h2>
              <p>
                {list ? `${list.total} komunitas` : "—"}
                {filtering ? " cocok dengan filtermu" : " sudah terdaftar"}
              </p>
            </div>
            {filtering ? (
              <Link href="/" className="btn btn-ghost btn-sm">
                Reset filter
              </Link>
            ) : null}
          </div>

          {list && list.items.length > 0 ? (
            <div className="grid">
              {list.items.map((community) => (
                <CommunityCard key={community.id} community={community} />
              ))}
            </div>
          ) : (
            <div className="empty">
              <h3>Belum ada komunitas yang cocok</h3>
              <p className="mb-0">Coba kata kunci lain, atau ganti kategori dan kota.</p>
            </div>
          )}

          {totalPages > 1 ? (
            <div className="row mt-24">
              {page > 1 ? (
                <Link className="btn btn-sm" href={pageUrl("/", { q, category, city, page: page - 1 })}>
                  Sebelumnya
                </Link>
              ) : null}
              <span className="muted small">
                Halaman {page} dari {totalPages}
              </span>
              {page < totalPages ? (
                <Link className="btn btn-sm" href={pageUrl("/", { q, category, city, page: page + 1 })}>
                  Berikutnya
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      {events.length > 0 ? (
        <section className="section" id="event-terdekat" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="section-head">
              <div>
                <h2>Event terdekat</h2>
                <p>Daftar langsung, tanpa perlu chat panitia.</p>
              </div>
              <Link href="/events" className="btn btn-sm">
                Lihat semua event
              </Link>
            </div>
            <div className="event-list">
              {events.map((event) => (
                <EventRow key={event.id} event={event} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="card" style={{ padding: "28px 26px" }}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div>
                <h2 style={{ fontSize: 24 }}>Punya komunitas?</h2>
                <p className="muted mb-0" style={{ marginTop: 8 }}>
                  Halaman komunitas dan event dikelola panitia masing-masing. Hubungi admin Komunifind
                  untuk mendapatkan akses.
                </p>
              </div>
              <Link href="/login" className="btn btn-primary">
                Masuk sebagai panitia
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
