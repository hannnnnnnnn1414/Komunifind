import { listPublishedEventsPage } from "@/lib/store/events";
import { Pagination } from "@/components/Pagination";
import type { Event } from "@/lib/types";
import { EventRow } from "@/components/EventRow";

export const dynamic = "force-dynamic";

export const metadata = { title: "Event terdekat" };

const PER_PAGE = 12;

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const currentPage = Math.max(Number(sp.page) || 1, 1);

  let events: Event[] = [];
  let total = 0;
  let failed = false;
  try {
    const result = await listPublishedEventsPage(currentPage, PER_PAGE);
    events = result.items;
    total = result.total;
  } catch {
    failed = true;
  }
  const totalPages = Math.max(Math.ceil(total / PER_PAGE), 1);

  return (
    <div className="container">
      <div className="page-head">
        <p className="eyebrow">Agenda</p>
        <h1>Event terdekat</h1>
        <p className="sub">Semua event yang sudah terbit dari komunitas di Komunifind.</p>
      </div>

      {failed ? (
        <div className="notice notice-warn">Data event belum bisa dimuat. Coba muat ulang.</div>
      ) : null}

      {events.length > 0 ? (
        <div className="event-list">
          {events.map((event) => (
            <EventRow key={event.id} event={event} />
          ))}
        </div>
      ) : !failed ? (
        <div className="empty">
          <h3>Belum ada event terdekat</h3>
          <p className="mb-0">Panitia belum menerbitkan event baru.</p>
        </div>
      ) : null}
      <Pagination page={currentPage} totalPages={totalPages} basePath="/events" />
    </div>
  );
}
