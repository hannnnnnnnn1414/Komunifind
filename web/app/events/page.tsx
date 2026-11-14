import { apiFetch } from "@/lib/api";
import type { Event } from "@/lib/types";
import { EventRow } from "@/components/EventRow";

export const dynamic = "force-dynamic";

export const metadata = { title: "Event terdekat" };

export default async function EventsPage() {
  let events: Event[] = [];
  let failed = false;
  try {
    const res = await apiFetch<{ items: Event[] }>("/api/v1/events?limit=24");
    events = res.items;
  } catch {
    failed = true;
  }

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
    </div>
  );
}
