import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { getCommunityById } from "@/lib/store/communities";
import { listEventsByCommunity } from "@/lib/store/events";
import { getUserById } from "@/lib/store/users";
import { Pagination } from "@/components/Pagination";
import { isStoreError } from "@/lib/store/errors";
import { formatDateTime, mediaUrl, statusLabel } from "@/lib/format";
import type { Community, Event } from "@/lib/types";
import { adminUpdateCommunityAction } from "@/app/actions";

export const dynamic = "force-dynamic";

const EVENTS_PER_PAGE = 10;

export default async function AdminCommunityPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUser(["admin"]);
  const { id } = await params;
  const sp = await searchParams;
  const currentPage = Math.max(Number(sp.page) || 1, 1);

  let community: Community;
  let events: Event[] = [];
  let organizerEmail = "";
  try {
    community = await getCommunityById(Number(id));
    events = await listEventsByCommunity(community.id);
    if (community.organizerId) {
      organizerEmail = (await getUserById(community.organizerId)).email;
    }
  } catch (error) {
    if (isStoreError(error) && error.code === "not_found") notFound();
    throw error;
  }
  const totalPages = Math.max(Math.ceil(events.length / EVENTS_PER_PAGE), 1);
  const visibleEvents = events.slice((currentPage - 1) * EVENTS_PER_PAGE, currentPage * EVENTS_PER_PAGE);

  const logo = mediaUrl(community.logoKey);

  return (
    <div>

      <div className="section-head">
        <div>
          <p className="eyebrow" style={{ marginBottom: 4 }}>
            <Link href="/admin">Admin</Link> / komunitas
          </p>
          <h2>{community.name}</h2>
          <p className="muted small">
            /communities/{community.slug} · <span className={`badge badge-${community.status}`}>{statusLabel(community.status)}</span>
          </p>
        </div>
        <Link href={`/communities/${community.slug}`} className="btn btn-sm">
          Lihat publik
        </Link>
      </div>

      <div className="card card-body mb-24">
        <h2 style={{ fontSize: 20 }}>Pengaturan</h2>
        <form action={adminUpdateCommunityAction} style={{ marginTop: 16 }}>
          <input type="hidden" name="communityId" value={community.id} />

          <div className="form-grid">
            <div className="field">
              <label htmlFor="name">Nama</label>
              <input id="name" name="name" type="text" defaultValue={community.name} required />
            </div>
            <div className="field">
              <label htmlFor="status">Status</label>
              <select id="status" name="status" defaultValue={community.status}>
                <option value="published">Terbit</option>
                <option value="draft">Draft</option>
                <option value="archived">Arsip</option>
              </select>
            </div>
          </div>

          <div className="field">
            <label htmlFor="tagline">Tagline</label>
            <input id="tagline" name="tagline" type="text" defaultValue={community.tagline} />
          </div>

          <div className="field">
            <label htmlFor="description">Deskripsi</label>
            <textarea id="description" name="description" defaultValue={community.description} />
          </div>

          <div className="form-grid">
            <div className="field">
              <label htmlFor="category">Kategori</label>
              <input id="category" name="category" type="text" defaultValue={community.category} />
            </div>
            <div className="field">
              <label htmlFor="city">Kota</label>
              <input id="city" name="city" type="text" defaultValue={community.city} />
            </div>
            <div className="field">
              <label htmlFor="organizerEmail">Email panitia</label>
              <input id="organizerEmail" name="organizerEmail" type="email" defaultValue={organizerEmail} placeholder="email panitia" />
              <span className="hint">Kosongkan bila tidak ingin mengubah panitia.</span>
            </div>
          </div>

          {logo ? <img src={logo} alt="" style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 10, border: "1px solid var(--line)", marginBottom: 16 }} /> : null}

          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              Simpan
            </button>
          </div>
        </form>
      </div>

      <div className="section-head">
        <h2>Event komunitas</h2>
      </div>
      {events.length > 0 ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Event</th>
                <th>Jadwal</th>
                <th>Peserta</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {visibleEvents.map((e) => (
                <tr key={e.id}>
                  <td>{e.title}</td>
                  <td className="muted">{formatDateTime(e.startsAt)}</td>
                  <td className="muted">
                    {e.approvedCount}
                    {e.capacity === null ? " / ∞" : ` / ${e.capacity}`}
                  </td>
                  <td>
                    <span className={`badge badge-${e.status}`}>{statusLabel(e.status)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty">
          <h3>Belum ada event</h3>
          <p className="mb-0">Panitia belum membuat event untuk komunitas ini.</p>
        </div>
      )}
      <Pagination
        page={currentPage}
        totalPages={totalPages}
        basePath={`/admin/communities/${community.id}`}
      />
    </div>
  );
}
