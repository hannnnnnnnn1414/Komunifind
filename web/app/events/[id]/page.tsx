import Link from "next/link";
import { notFound } from "next/navigation";
import { getEventPublic } from "@/lib/store/events";
import { listRegistrationsByUser } from "@/lib/store/registrations";
import { isStoreError } from "@/lib/store/errors";
import { formatDate, formatTime, mediaUrl, spotsLeft, statusLabel } from "@/lib/format";
import { getSessionUser } from "@/lib/session";
import type { Event, Registration } from "@/lib/types";
import { cancelRegistrationAction, registerForEventAction } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function EventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let event: Event;
  try {
    event = await getEventPublic(Number(id));
  } catch (error) {
    if (isStoreError(error) && error.code === "not_found") notFound();
    throw error;
  }

  const user = await getSessionUser();
  let myRegistration: Registration | null = null;
  if (user) {
    try {
      const items = await listRegistrationsByUser(user.id);
      myRegistration = items.find((r) => r.eventId === event.id) ?? null;
    } catch {
      myRegistration = null;
    }
  }

  const poster = mediaUrl(event.posterKey);
  const full = event.capacity !== null && event.approvedCount >= event.capacity;
  const past = new Date(event.startsAt).getTime() < Date.now();
  const activeRegistration = myRegistration && myRegistration.status !== "cancelled" && myRegistration.status !== "rejected";

  return (
    <div className="container">
      <div className="page-head">
        <p className="eyebrow">
          {event.communitySlug ? (
            <Link href={`/communities/${event.communitySlug}`}>{event.communityName}</Link>
          ) : (
            event.communityName
          )}
        </p>
        <h1>{event.title}</h1>
        <p className="sub">
          {formatDate(event.startsAt)} · {formatTime(event.startsAt)} WIB
          {event.locationName ? ` · ${event.locationName}` : ""}
        </p>
      </div>

      <div className="detail-grid">
        <div className="prose">
          {poster ? (
            <div className="cover" style={{ height: 300 }}>
              <img src={poster} alt="" />
            </div>
          ) : null}
          <h2>Tentang event</h2>
          <p style={{ whiteSpace: "pre-line" }}>{event.description || "Panitia belum menuliskan detail event."}</p>

          <h2>Detail</h2>
          <div className="meta-list">
            <div className="row">
              <span className="label">Tanggal</span>
              <span>{formatDate(event.startsAt)}</span>
            </div>
            <div className="row">
              <span className="label">Waktu</span>
              <span>
                {formatTime(event.startsAt)} WIB
                {event.endsAt ? ` – ${formatTime(event.endsAt)} WIB` : ""}
              </span>
            </div>
            <div className="row">
              <span className="label">Lokasi</span>
              <span>
                {event.locationName || "Belum ditentukan"}
                {event.locationUrl ? (
                  <>
                    {" · "}
                    <a href={event.locationUrl} target="_blank" rel="noopener noreferrer">
                      Buka peta
                    </a>
                  </>
                ) : null}
              </span>
            </div>
            <div className="row">
              <span className="label">Kuota</span>
              <span>{spotsLeft(event.capacity, event.approvedCount)}</span>
            </div>
            <div className="row">
              <span className="label">Biaya</span>
              <span>{event.price === 0 ? "Gratis" : `${event.price} ${event.currency}`}</span>
            </div>
            <div className="row">
              <span className="label">Status</span>
              <span className={`badge badge-${event.status}`}>{statusLabel(event.status)}</span>
            </div>
          </div>
        </div>

        <aside className="sidebar">
          <div className="card card-body">
            {event.externalUrl ? (
              <a className="btn btn-primary" href={event.externalUrl} target="_blank" rel="noopener noreferrer">
                {event.externalLabel || "Kunjungi Instagram"}
              </a>
            ) : null}

            <div className={event.externalUrl ? "mt-16" : ""}>
              {past ? (
                <div className="notice notice-warn mb-0">Event ini sudah lewat.</div>
              ) : event.status === "cancelled" ? (
                <div className="notice notice-err mb-0">Event dibatalkan panitia.</div>
              ) : !user ? (
                <>
                  <p className="muted small">Masuk dengan Google untuk mendaftar event ini.</p>
                  <Link href={`/login?next=${encodeURIComponent(`/events/${event.id}`)}`} className="btn btn-primary">
                    Masuk untuk daftar
                  </Link>
                </>
              ) : activeRegistration ? (
                <>
                  <p className="small mb-8">
                    Status pendaftaranmu:{" "}
                    <span className={`badge badge-${myRegistration!.status}`}>{statusLabel(myRegistration!.status)}</span>
                  </p>
                  {myRegistration!.status !== "cancelled" ? (
                    <form action={cancelRegistrationAction}>
                      <input type="hidden" name="registrationId" value={myRegistration!.id} />
                      <input type="hidden" name="redirectTo" value={`/events/${event.id}`} />
                      <button type="submit" className="btn btn-danger btn-sm">
                        Batalkan pendaftaran
                      </button>
                    </form>
                  ) : null}
                </>
              ) : full ? (
                <div className="notice notice-warn mb-0">Kuota event sudah penuh.</div>
              ) : (
                <form action={registerForEventAction}>
                  <input type="hidden" name="eventId" value={event.id} />
                  <input type="hidden" name="redirectTo" value={`/events/${event.id}`} />
                  <p className="muted small">Pendaftaran akan direview panitia sebelum disetujui.</p>
                  <button type="submit" className="btn btn-primary">
                    Daftar event
                  </button>
                </form>
              )}
            </div>

            <div className="divider" />
            <p className="muted small mb-0">
              Dikelola oleh {event.communityName}. Pertanyaan spesifik event sebaiknya lewat kanal komunitas.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
