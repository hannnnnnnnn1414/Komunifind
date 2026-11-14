import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { getToken, requireUser } from "@/lib/session";
import { formatDateTime, statusLabel } from "@/lib/format";
import type { Community, Event } from "@/lib/types";
import { Notices } from "@/components/Notices";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser(["organizer"]);
  const token = await getToken();
  const sp = await searchParams;
  const ok = typeof sp.ok === "string" ? sp.ok : undefined;
  const err = typeof sp.err === "string" ? sp.err : undefined;

  let community: Community | null = null;
  let events: Event[] = [];
  let loadError = "";

  try {
    const res = await apiFetch<{ community: Community }>("/api/v1/organizer/community", { token: token ?? undefined });
    community = res.community;
    const ev = await apiFetch<{ items: Event[] }>("/api/v1/organizer/events", { token: token ?? undefined });
    events = ev.items;
  } catch {
    loadError = user.role === "admin"
      ? "Akun admin tidak terikat ke satu komunitas. Buka dashboard panitia lewat akun organizer."
      : "Komunitasmu belum di-assign admin pusat. Hubungi admin untuk mengaitkan akun ini ke sebuah komunitas.";
  }

  const published = events.filter((e) => e.status === "published").length;
  const drafts = events.filter((e) => e.status === "draft").length;
  const totalApproved = events.reduce((sum, e) => sum + e.approvedCount, 0);

  return (
    <div>
      <Notices ok={ok} err={err} />
      {loadError ? <div className="notice notice-warn">{loadError}</div> : null}

      {community ? (
        <>
          <div className="stat-grid mb-24">
            <div className="stat">
              <div className="value">{events.length}</div>
              <div className="label">Total event</div>
            </div>
            <div className="stat">
              <div className="value">{published}</div>
              <div className="label">Event terbit</div>
            </div>
            <div className="stat">
              <div className="value">{drafts}</div>
              <div className="label">Draft</div>
            </div>
            <div className="stat">
              <div className="value">{totalApproved}</div>
              <div className="label">Peserta disetujui</div>
            </div>
          </div>

          <div className="card card-body mb-24">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div>
                <h2 style={{ fontSize: 20 }}>{community.name}</h2>
                <p className="muted small mb-0">
                  /communities/{community.slug} · {community.category || "tanpa kategori"} · {community.city || "tanpa kota"}
                </p>
              </div>
              <div className="row">
                <Link href={`/communities/${community.slug}`} className="btn btn-sm">
                  Lihat halaman publik
                </Link>
                <Link href="/dashboard/community" className="btn btn-sm">
                  Edit profil
                </Link>
              </div>
            </div>
          </div>

          <div className="section-head">
            <h2>Event kamu</h2>
            <Link href="/dashboard/events/new" className="btn btn-primary btn-sm">
              Buat event
            </Link>
          </div>

          {events.length > 0 ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>Jadwal</th>
                    <th>Kuota</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => (
                    <tr key={event.id}>
                      <td>{event.title}</td>
                      <td className="muted">{formatDateTime(event.startsAt)}</td>
                      <td className="muted">
                        {event.approvedCount}
                        {event.capacity === null ? " / ∞" : ` / ${event.capacity}`}
                      </td>
                      <td>
                        <span className={`badge badge-${event.status}`}>{statusLabel(event.status)}</span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <Link href={`/dashboard/events/${event.id}`} className="btn btn-sm">
                          Kelola
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty">
              <h3>Belum ada event</h3>
              <p className="mb-0">Buat event pertamamu, lalu terbitkan agar muncul di halaman publik.</p>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
