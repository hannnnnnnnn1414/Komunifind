import Link from "next/link";
import { notFound } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { mediaUrl } from "@/lib/format";
import type { Community, Event } from "@/lib/types";
import { EventRow } from "@/components/EventRow";

export const dynamic = "force-dynamic";

export default async function CommunityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let community: Community;
  let events: Event[] = [];
  try {
    const res = await apiFetch<{ community: Community; events: Event[] }>(`/api/v1/communities/${slug}`);
    community = res.community;
    events = res.events;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  const logo = mediaUrl(community.logoKey);
  const banner = mediaUrl(community.bannerKey);
  const socials = Object.entries(community.socials ?? {}).filter(([, v]) => Boolean(v));

  return (
    <div className="container">
      <div className="page-head" style={{ borderBottom: "none", marginBottom: 0 }}>
        <div className="row">
          <div
            className="logo-wrap"
            style={{
              width: 66,
              height: 66,
              borderRadius: 16,
              border: "1px solid var(--line)",
              display: "grid",
              placeItems: "center",
              overflow: "hidden",
              background: "var(--surface)",
              fontSize: 26,
              fontFamily: "var(--font-display)",
              color: "var(--accent-dark)",
            }}
          >
            {logo ? <img src={logo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : community.name.slice(0, 1)}
          </div>
          <div>
            <h1 style={{ fontSize: "clamp(26px, 3.4vw, 38px)" }}>{community.name}</h1>
            <div className="chips mt-8">
              {community.category ? <span className="chip chip-accent">{community.category}</span> : null}
              {community.city ? <span className="chip">{community.city}</span> : null}
            </div>
          </div>
        </div>
        {community.tagline ? <p className="sub">{community.tagline}</p> : null}
      </div>

      {banner ? (
        <div className="cover">
          <img src={banner} alt="" />
        </div>
      ) : null}

      <div className="detail-grid">
        <div className="prose">
          <h2>Tentang komunitas</h2>
          <p style={{ whiteSpace: "pre-line" }}>
            {community.description || "Panitia belum menuliskan deskripsi komunitas."}
          </p>

          {socials.length > 0 ? (
            <>
              <h2>Tautan</h2>
              <div className="chips">
                {socials.map(([key, value]) => (
                  <a key={key} className="chip" href={value} target="_blank" rel="noopener noreferrer">
                    {key}
                  </a>
                ))}
              </div>
            </>
          ) : null}
        </div>

        <aside className="sidebar">
          <div className="card card-body">
            <h2 style={{ fontSize: 19 }}>Event mendatang</h2>
            <p className="muted small" style={{ marginTop: 6 }}>
              {events.length} event terbit dari komunitas ini.
            </p>
            {events.length === 0 ? (
              <p className="muted small mb-0">Belum ada event mendatang.</p>
            ) : (
              <div className="stack" style={{ gap: 8, marginTop: 8 }}>
                {events.slice(0, 3).map((event) => (
                  <Link key={event.id} href={`/events/${event.id}`} className="small">
                    {event.title}
                  </Link>
                ))}
              </div>
            )}
            <Link href="/events" className="btn btn-sm mt-16">
              Semua event
            </Link>
          </div>
        </aside>
      </div>

      <section className="section">
        <div className="section-head">
          <h2>Event dari {community.name}</h2>
        </div>
        {events.length > 0 ? (
          <div className="event-list">
            {events.map((event) => (
              <EventRow key={event.id} event={event} showCommunity={false} />
            ))}
          </div>
        ) : (
          <div className="empty">
            <h3>Belum ada event</h3>
            <p className="mb-0">Panitia belum menerbitkan event mendatang.</p>
          </div>
        )}
      </section>
    </div>
  );
}
