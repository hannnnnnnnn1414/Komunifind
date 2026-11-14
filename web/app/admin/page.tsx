import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { getToken, requireUser } from "@/lib/session";
import { statusLabel } from "@/lib/format";
import type { Community } from "@/lib/types";
import { Notices } from "@/components/Notices";

export const dynamic = "force-dynamic";

export default async function AdminHome({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUser(["admin"]);
  const token = await getToken();
  const sp = await searchParams;
  const ok = typeof sp.ok === "string" ? sp.ok : undefined;
  const err = typeof sp.err === "string" ? sp.err : undefined;

  let communities: Community[] = [];
  let failed = false;
  try {
    const res = await apiFetch<{ items: Community[] }>("/api/v1/admin/communities", { token: token ?? undefined });
    communities = res.items;
  } catch {
    failed = true;
  }

  return (
    <div>
      <Notices ok={ok} err={err} />
      {failed ? <div className="notice notice-warn">Data komunitas gagal dimuat.</div> : null}

      <div className="section-head">
        <div>
          <h2>Komunitas</h2>
          <p>{communities.length} komunitas terdaftar</p>
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
    </div>
  );
}
