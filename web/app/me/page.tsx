import Link from "next/link";
import { requireUser } from "@/lib/session";
import { listRegistrationsByUser } from "@/lib/store/registrations";
import { Pagination } from "@/components/Pagination";
import { formatDateTime, statusLabel } from "@/lib/format";
import type { Registration } from "@/lib/types";
import { cancelRegistrationAction } from "@/app/actions";

export const dynamic = "force-dynamic";

const PER_PAGE = 10;

export default async function MyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const currentPage = Math.max(Number(sp.page) || 1, 1);

  let items: Registration[] = [];
  try {
    items = await listRegistrationsByUser(user.id);
  } catch {
    items = [];
  }

  const active = items.filter((r) => r.status === "pending" || r.status === "approved");
  const history = items.filter((r) => r.status === "rejected" || r.status === "cancelled");
  const activePages = Math.max(Math.ceil(active.length / PER_PAGE), 1);
  const visibleActive = active.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  return (
    <div className="container">
      <div className="page-head">
        <p className="eyebrow">Akun</p>
        <h1>Halo, {user.name}</h1>
        <p className="sub">{user.email}</p>
      </div>

      <div className="stat-grid mb-24">
        <div className="stat">
          <div className="value">{active.length}</div>
          <div className="label">Pendaftaran aktif</div>
        </div>
        <div className="stat">
          <div className="value">{items.filter((r) => r.status === "approved").length}</div>
          <div className="label">Disetujui</div>
        </div>
        <div className="stat">
          <div className="value">{items.filter((r) => r.status === "pending").length}</div>
          <div className="label">Menunggu</div>
        </div>
      </div>

      <h2 style={{ fontSize: 22, marginBottom: 12 }}>Pendaftaran aktif</h2>
      {active.length > 0 ? (
        <div className="table-wrap mb-24">
          <table>
            <thead>
              <tr>
                <th>Event</th>
                <th>Komunitas</th>
                <th>Jadwal</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {visibleActive.map((reg) => {
                const past = new Date(reg.startsAt).getTime() < Date.now();
                return (
                  <tr key={reg.id}>
                    <td>
                      <Link href={`/events/${reg.eventId}`}>{reg.eventTitle}</Link>
                    </td>
                    <td className="muted">{reg.communityName}</td>
                    <td className="muted">{formatDateTime(reg.startsAt)}</td>
                    <td>
                      <span className={`badge badge-${reg.status}`}>{statusLabel(reg.status)}</span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {past ? (
                        <span className="muted small">Sudah lewat</span>
                      ) : (
                        <form action={cancelRegistrationAction}>
                          <input type="hidden" name="registrationId" value={reg.id} />
                          <input type="hidden" name="redirectTo" value="/me" />
                          <button type="submit" className="btn btn-danger btn-sm">
                            Batalkan
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty mb-24">
          <h3>Belum ada pendaftaran aktif</h3>
          <p className="mb-0">
            <Link href="/events">Lihat event terdekat</Link> dan daftar dari halaman event.
          </p>
        </div>
      )}
      <Pagination page={currentPage} totalPages={activePages} basePath="/me" />

      {history.length > 0 ? (
        <>
          <h2 style={{ fontSize: 22, marginBottom: 12 }}>Riwayat</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Jadwal</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map((reg) => (
                  <tr key={reg.id}>
                    <td>
                      <Link href={`/events/${reg.eventId}`}>{reg.eventTitle}</Link>
                    </td>
                    <td className="muted">{formatDateTime(reg.startsAt)}</td>
                    <td>
                      <span className={`badge badge-${reg.status}`}>{statusLabel(reg.status)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}
