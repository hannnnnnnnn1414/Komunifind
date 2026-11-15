import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { getCommunityByOrganizer } from "@/lib/store/communities";
import { getEvent } from "@/lib/store/events";
import { listRegistrationsByEvent } from "@/lib/store/registrations";
import { isStoreError } from "@/lib/store/errors";
import { formatDateTime, mediaUrl, spotsLeft, statusLabel, toDateTimeLocal } from "@/lib/format";
import { Pagination } from "@/components/Pagination";
import type { Event, Registration } from "@/lib/types";

const REG_PER_PAGE = 10;
import {
  approveRegistrationAction,
  organizerCancelEventAction,
  organizerPublishEventAction,
  organizerUpdateEventAction,
  rejectRegistrationAction,
} from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function ManageEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser(["organizer"]);
  const { id } = await params;
  const sp = await searchParams;
  const regPage = Math.max(Number(sp.page) || 1, 1);
  const back = `/dashboard/events/${id}`;

  let event: Event;
  let registrations: Registration[] = [];
  try {
    const community = await getCommunityByOrganizer(user.id);
    event = await getEvent(Number(id));
    if (event.communityId !== community.id) {
      notFound();
    }
    registrations = await listRegistrationsByEvent(event.id);
  } catch (error) {
    if (isStoreError(error) && error.code === "not_found") notFound();
    throw error;
  }

  const poster = mediaUrl(event.posterKey);
  const pending = registrations.filter((r) => r.status === "pending");
  const approved = registrations.filter((r) => r.status === "approved");
  const full = event.capacity !== null && approved.length >= event.capacity;
  const regPages = Math.max(Math.ceil(registrations.length / REG_PER_PAGE), 1);
  const visibleRegistrations = registrations.slice(
    (regPage - 1) * REG_PER_PAGE,
    regPage * REG_PER_PAGE,
  );

  return (
    <div>

      <div className="section-head">
        <div>
          <p className="eyebrow" style={{ marginBottom: 4 }}>
            <Link href="/dashboard">Dashboard</Link> / event
          </p>
          <h2>{event.title}</h2>
          <p className="muted small">
            {formatDateTime(event.startsAt)} · <span className={`badge badge-${event.status}`}>{statusLabel(event.status)}</span> ·{" "}
            {spotsLeft(event.capacity, event.approvedCount)}
          </p>
        </div>
        <div className="row">
          {event.status === "published" ? (
            <Link href={`/events/${event.id}`} className="btn btn-sm">
              Lihat publik
            </Link>
          ) : (
            <form action={organizerPublishEventAction}>
              <input type="hidden" name="eventId" value={event.id} />
              <input type="hidden" name="redirectTo" value={back} />
              <button type="submit" className="btn btn-primary btn-sm">
                Terbitkan event
              </button>
            </form>
          )}
          {event.status !== "cancelled" ? (
            <form action={organizerCancelEventAction}>
              <input type="hidden" name="eventId" value={event.id} />
              <input type="hidden" name="redirectTo" value={back} />
              <button type="submit" className="btn btn-danger btn-sm">
                Batalkan event
              </button>
            </form>
          ) : null}
        </div>
      </div>

      <div className="stat-grid mb-24">
        <div className="stat">
          <div className="value">{pending.length}</div>
          <div className="label">Menunggu review</div>
        </div>
        <div className="stat">
          <div className="value">{approved.length}</div>
          <div className="label">Peserta disetujui</div>
        </div>
        <div className="stat">
          <div className="value">{event.capacity ?? "∞"}</div>
          <div className="label">Kuota</div>
        </div>
      </div>

      {full ? (
        <div className="notice notice-warn">
          Kuota sudah penuh. Approve peserta berikutnya akan ditolak sistem sampai ada yang membatalkan.
        </div>
      ) : null}

      <div className="section-head">
        <h2>Peserta</h2>
      </div>

      {registrations.length > 0 ? (
        <div className="table-wrap mb-24">
          <table>
            <thead>
              <tr>
                <th>Nama</th>
                <th>Email</th>
                <th>Daftar</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {visibleRegistrations.map((reg) => (
                <tr key={reg.id} className={reg.status === "pending" ? "row-pending" : undefined}>
                  <td>{reg.userName}</td>
                  <td className="muted">{reg.userEmail}</td>
                  <td className="muted">{formatDateTime(reg.createdAt)}</td>
                  <td>
                    <span className={`badge badge-${reg.status}`}>{statusLabel(reg.status)}</span>
                  </td>
                  <td>
                    {reg.status === "pending" ? (
                      <div className="row-actions">
                        <form action={approveRegistrationAction}>
                          <input type="hidden" name="registrationId" value={reg.id} />
                          <input type="hidden" name="redirectTo" value={back} />
                          <button type="submit" className="btn btn-primary btn-sm" disabled={full}>
                            Setujui
                          </button>
                        </form>
                        <form action={rejectRegistrationAction}>
                          <input type="hidden" name="registrationId" value={reg.id} />
                          <input type="hidden" name="redirectTo" value={back} />
                          <button type="submit" className="btn btn-sm">
                            Tolak
                          </button>
                        </form>
                      </div>
                    ) : (
                      <span className="muted small">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty mb-24">
          <h3>Belum ada pendaftar</h3>
          <p className="mb-0">Peserta akan muncul di sini setelah event terbit.</p>
        </div>
      )}
      <Pagination page={regPage} totalPages={regPages} basePath={back} />

      <div className="card card-body">
        <h2 style={{ fontSize: 20 }}>Edit event</h2>
        <form action={organizerUpdateEventAction} encType="multipart/form-data" style={{ marginTop: 16 }}>
          <input type="hidden" name="eventId" value={event.id} />

          <div className="field">
            <label htmlFor="title">Judul</label>
            <input id="title" name="title" type="text" defaultValue={event.title} required />
          </div>

          <div className="field">
            <label htmlFor="description">Deskripsi</label>
            <textarea id="description" name="description" defaultValue={event.description} />
          </div>

          <div className="form-grid">
            <div className="field">
              <label htmlFor="startsAt">Mulai</label>
              <input id="startsAt" name="startsAt" type="datetime-local" defaultValue={toDateTimeLocal(event.startsAt)} required />
            </div>
            <div className="field">
              <label htmlFor="endsAt">Selesai</label>
              <input
                id="endsAt"
                name="endsAt"
                type="datetime-local"
                defaultValue={event.endsAt ? toDateTimeLocal(event.endsAt) : ""}
              />
            </div>
          </div>

          <div className="form-grid">
            <div className="field">
              <label htmlFor="locationName">Lokasi</label>
              <input id="locationName" name="locationName" type="text" defaultValue={event.locationName} />
            </div>
            <div className="field">
              <label htmlFor="locationUrl">Link peta</label>
              <input id="locationUrl" name="locationUrl" type="url" defaultValue={event.locationUrl ?? ""} />
            </div>
          </div>

          <div className="form-grid">
            <div className="field">
              <label htmlFor="capacity">Kuota</label>
              <input id="capacity" name="capacity" type="number" min={1} defaultValue={event.capacity ?? ""} />
              <span className="hint">Tidak bisa lebih kecil dari jumlah peserta yang sudah disetujui.</span>
            </div>
            <div className="field">
              <label htmlFor="externalUrl">Link Instagram / eksternal</label>
              <input id="externalUrl" name="externalUrl" type="url" defaultValue={event.externalUrl ?? ""} />
            </div>
          </div>

          <div className="field">
            <label htmlFor="externalLabel">Label tombol eksternal</label>
            <input id="externalLabel" name="externalLabel" type="text" defaultValue={event.externalLabel} />
          </div>

          <div className="field">
            <label htmlFor="poster">Poster</label>
            {poster ? <img src={poster} alt="" style={{ width: "100%", maxWidth: 260, height: 96, objectFit: "cover", borderRadius: 10, border: "1px solid var(--line)" }} /> : null}
            <input id="poster" name="poster" type="file" accept="image/jpeg,image/png,image/webp" />
            <label className="checkbox">
              <input type="checkbox" name="clearPoster" value="1" /> Hapus poster
            </label>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              Simpan perubahan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
