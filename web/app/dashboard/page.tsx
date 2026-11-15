import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getCommunityByOrganizer } from "@/lib/store/communities";
import { listEventsByCommunity } from "@/lib/store/events";
import { countPendingByOrganizer, listPendingForOrganizer } from "@/lib/store/registrations";
import { formatDateTime, formatShortDate, formatTime, statusLabel } from "@/lib/format";
import { Pagination } from "@/components/Pagination";
import type { Community, Event } from "@/lib/types";

export const dynamic = "force-dynamic";

const WEEK_MS = 7 * 24 * 3600 * 1000;
const TABLE_PER_PAGE = 10;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser(["organizer"]);
  const sp = await searchParams;
  const tablePage = Math.max(Number(sp.page) || 1, 1);

  let community: Community | null = null;
  let events: Event[] = [];
  let pendingByEvent = new Map<number, number>();
  let pendingItems: Awaited<ReturnType<typeof listPendingForOrganizer>> = [];
  let loadError = "";

  try {
    community = await getCommunityByOrganizer(user.id);
    events = await listEventsByCommunity(community.id);
    pendingByEvent = (await countPendingByOrganizer(user.id)).perEvent;
    pendingItems = await listPendingForOrganizer(user.id, 5);
  } catch {
    loadError =
      user.role === "admin"
        ? "Akun admin tidak terikat ke satu komunitas. Buka dashboard panitia lewat akun organizer."
        : "Komunitasmu belum di-assign admin pusat. Hubungi admin untuk mengaitkan akun ini ke sebuah komunitas.";
  }

  const tablePages = Math.max(Math.ceil(events.length / TABLE_PER_PAGE), 1);
  const visibleEvents = events.slice((tablePage - 1) * TABLE_PER_PAGE, tablePage * TABLE_PER_PAGE);

  const now = Date.now();
  const drafts = events.filter((e) => e.status === "draft");
  const upcoming = events
    .filter((e) => e.status === "published" && new Date(e.startsAt).getTime() >= now)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
    .slice(0, 5);
  const needsPromo = events.filter(
    (e) =>
      e.status === "published" &&
      e.approvedCount === 0 &&
      new Date(e.startsAt).getTime() >= now &&
      new Date(e.startsAt).getTime() - now < WEEK_MS,
  );
  const actionCount = pendingItems.length + drafts.length + needsPromo.length;

  return (
    <div>
      {loadError ? <div className="notice notice-warn">{loadError}</div> : null}

      {community ? (
        <>
          <div className="welcome-head">
            <div>
              <p className="eyebrow">Dashboard panitia</p>
              <h1>Halo, {user.name}.</h1>
              <p className="muted mb-0">
                {community.name}
                {actionCount > 0
                  ? ` — ada ${actionCount} hal yang perlu perhatianmu.`
                  : " — semua beres, tidak ada yang menunggu."}
              </p>
            </div>
            <div className="row welcome-actions">
              <Link href="/dashboard/events/new" className="btn btn-primary btn-sm">
                Buat event
              </Link>
              <Link href={`/communities/${community.slug}`} className="btn btn-sm">
                Lihat halaman publik
              </Link>
              <Link href="/dashboard/community" className="btn btn-sm">
                Edit profil
              </Link>
            </div>
          </div>

          <div className="section-head">
            <h2>Perlu tindakan</h2>
            {actionCount > 0 ? <span className="chip">{actionCount}</span> : null}
          </div>

          {actionCount === 0 ? (
            <div className="empty mb-24">
              <h3>Semua beres.</h3>
              <p className="mb-0">Tidak ada pendaftaran menunggu atau draft yang tertunda.</p>
            </div>
          ) : (
            <div className="action-list mb-24">
              {pendingItems.map((item) => (
                <Link
                  key={`pending-${item.registrationId}`}
                  href={`/dashboard/events/${item.eventId}`}
                  className="action-item"
                >
                  <span className="action-dot" aria-hidden="true" />
                  <span className="action-body">
                    <strong>
                      {item.userName} menunggu persetujuan
                    </strong>
                    <span className="muted small">
                      {item.eventTitle} · {formatDateTime(item.eventStartsAt)}
                    </span>
                  </span>
                  <span className="badge badge-pending">Review</span>
                </Link>
              ))}
              {drafts.map((event) => (
                <Link
                  key={`draft-${event.id}`}
                  href={`/dashboard/events/${event.id}`}
                  className="action-item"
                >
                  <span className="action-dot" aria-hidden="true" />
                  <span className="action-body">
                    <strong>{event.title} masih draft</strong>
                    <span className="muted small">Terbitkan supaya muncul di halaman publik.</span>
                  </span>
                  <span className="badge badge-draft">Draft</span>
                </Link>
              ))}
              {needsPromo.map((event) => (
                <Link
                  key={`promo-${event.id}`}
                  href={`/communities/${community.slug}`}
                  className="action-item"
                >
                  <span className="action-dot" aria-hidden="true" />
                  <span className="action-body">
                    <strong>{event.title} belum ada peserta</strong>
                    <span className="muted small">
                      Mulai {formatDateTime(event.startsAt)} — bagikan halaman komunitasmu.
                    </span>
                  </span>
                  <span className="badge">0 peserta</span>
                </Link>
              ))}
            </div>
          )}

          <div className="section-head">
            <h2>Event mendatang</h2>
          </div>

          {upcoming.length > 0 ? (
            <div className="event-list mb-24">
              {upcoming.map((event) => {
                const pending = pendingByEvent.get(event.id) ?? 0;
                const start = new Date(event.startsAt);
                const day = new Intl.DateTimeFormat("id-ID", {
                  day: "2-digit",
                  timeZone: "Asia/Jakarta",
                }).format(start);
                const month = new Intl.DateTimeFormat("id-ID", {
                  month: "short",
                  timeZone: "Asia/Jakarta",
                }).format(start);
                return (
                  <Link key={event.id} href={`/dashboard/events/${event.id}`} className="event-row">
                    <div className="date-block">
                      <div className="day">{day}</div>
                      <div className="month">{month}</div>
                    </div>
                    <div className="body">
                      <h3>{event.title}</h3>
                      <div className="meta">
                        <span>
                          {formatShortDate(event.startsAt)} · {formatTime(event.startsAt)} WIB
                        </span>
                        <span>
                          {event.approvedCount}
                          {event.capacity === null ? " / ∞" : ` / ${event.capacity}`} peserta
                        </span>
                        {pending > 0 ? (
                          <span className="badge badge-pending">{pending} menunggu</span>
                        ) : null}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="empty mb-24">
              <h3>Belum ada event mendatang</h3>
              <p className="mb-0">Buat event baru untuk mengisi agenda komunitasmu.</p>
            </div>
          )}

          <div className="section-head">
            <h2>Semua event</h2>
            <Link href="/dashboard/events/new" className="btn btn-primary btn-sm">
              Buat event
            </Link>
          </div>

          {events.length > 0 ? (
            <>
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
                    {visibleEvents.map((event) => {
                      const pending = pendingByEvent.get(event.id) ?? 0;
                      return (
                        <tr key={event.id}>
                          <td>
                            {event.title}
                            {pending > 0 ? (
                              <span className="badge badge-pending row-badge">{pending} menunggu</span>
                            ) : null}
                          </td>
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
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination page={tablePage} totalPages={tablePages} basePath="/dashboard" />
            </>
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
