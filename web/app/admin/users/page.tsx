import { apiFetch } from "@/lib/api";
import { getToken, requireUser } from "@/lib/session";
import type { User } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  await requireUser(["admin"]);
  const token = await getToken();

  let users: User[] = [];
  let failed = false;
  try {
    const res = await apiFetch<{ items: User[] }>("/api/v1/admin/users", { token: token ?? undefined });
    users = res.items;
  } catch {
    failed = true;
  }

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
    </div>
  );
}
