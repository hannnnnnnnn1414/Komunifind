import { requireUser } from "@/lib/session";
import { listUsers } from "@/lib/store/users";
import { Pagination } from "@/components/Pagination";
import type { User } from "@/lib/types";

export const dynamic = "force-dynamic";

const PER_PAGE = 10;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUser(["admin"]);
  const sp = await searchParams;
  const currentPage = Math.max(Number(sp.page) || 1, 1);

  let users: User[] = [];
  let total = 0;
  let failed = false;
  try {
    const result = await listUsers("", currentPage, PER_PAGE);
    users = result.items;
    total = result.total;
  } catch {
    failed = true;
  }
  const totalPages = Math.max(Math.ceil(total / PER_PAGE), 1);

  return (
    <div>
      {failed ? <div className="notice notice-warn">Data pengguna gagal dimuat.</div> : null}
      <div className="section-head">
        <div>
          <h2>Pengguna</h2>
          <p>{users.length} akun terakhir</p>
        </div>
      </div>

      {users.length > 0 ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nama</th>
                <th>Email</th>
                <th>Role</th>
                <th>Terdaftar</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td className="muted">{u.email}</td>
                  <td>
                    <span className="badge">{u.role}</span>
                  </td>
                  <td className="muted">{new Date(u.createdAt).toLocaleDateString("id-ID")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty">
          <h3>Belum ada pengguna</h3>
          <p className="mb-0">Pengguna muncul setelah login pertama.</p>
        </div>
      )}
      <Pagination page={currentPage} totalPages={totalPages} basePath="/admin/users" />
    </div>
  );
}
