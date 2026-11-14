import Link from "next/link";
import { formatTime, spotsLeft } from "@/lib/format";
import type { Event } from "@/lib/types";

const monthFmt = new Intl.DateTimeFormat("id-ID", { month: "short", timeZone: "Asia/Jakarta" });

export function EventRow({ event, showCommunity = true }: { event: Event; showCommunity?: boolean }) {
  const start = new Date(event.startsAt);
  const day = new Intl.DateTimeFormat("id-ID", { day: "2-digit", timeZone: "Asia/Jakarta" }).format(start);

  return (
    <Link href={`/events/${event.id}`} className="event-row">
      <div className="date-block">
        <div className="day">{day}</div>
        <div className="month">{monthFmt.format(start)}</div>
      </div>
      <div className="body">
        <h3>{event.title}</h3>
        <div className="meta">
          {showCommunity && event.communityName ? <span>{event.communityName}</span> : null}
          <span>
            {formatTime(event.startsAt)} WIB
          </span>
          {event.locationName ? <span>{event.locationName}</span> : null}
          <span>{spotsLeft(event.capacity, event.approvedCount)}</span>
        </div>
      </div>
      <span className="badge">{event.status === "published" ? "Terbit" : event.status}</span>
    </Link>
  );
}
