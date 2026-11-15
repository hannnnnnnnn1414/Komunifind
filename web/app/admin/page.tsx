import Link from "next/link";
import { requireUser } from "@/lib/session";
import { listAllCommunitiesPaged } from "@/lib/store/communities";
import { Pagination } from "@/components/Pagination";
import { statusLabel } from "@/lib/format";
import type { Community } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminHome({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUser(["admin"]);
  const sp = await searchParams;
  const page = typeof sp.page === "string" ? sp.page : undefined;
  const currentPage = Math.max(Number(page) || 1, 1);

  let communities: Community[] = [];
  let total = 0;
  let failed = false;
  try {
    const result = await listAllCommunitiesPaged(currentPage, 10);
    communities = result.items;
    total = result.total;
  } catch {
    failed = true;
  }
  const totalPages = Math.max(Math.ceil(total / 10), 1);

  return (
    <div>
      {failed ? <div className="notice notice-warn">Data komunitas gagal dimuat.</div> : null}

      <div className="section-head">
        <div>
          <h2>Komunitas</h2>
              <p>{total} komunitas terdaftar</p>
        </div>
        <Link href="/admin/communities/new" className="btn btn-primary btn-sm">
          Komunitas baru
        </Link>
      </div>

      {communities.length > 0 ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nama</th>
                <th>Slug</th>
                <th>Kategori</th>
                <th>Kota</th>
                <th>Panitia</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {communities.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td className="muted">/{c.slug}</td>
                  <td className="muted">{c.category || "—"}</td>
                  <td className="muted">{c.city || "—"}</td>
                  <td className="muted">{c.organizerId ? "Terhubung" : "Belum di-assign"}</td>
                  <td>
                    <span className={`badge badge-${c.status}`}>{statusLabel(c.status)}</span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <Link href={`/admin/communities/${c.id}`} className="btn btn-sm">
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
          <h3>Belum ada komunitas</h3>
          <p className="mb-0">Buat komunitas pertama untuk memulai.</p>
        </div>
      )}
      <Pagination page={currentPage} totalPages={totalPages} basePath="/admin" />
    </div>
  );
}
