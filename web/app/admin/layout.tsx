import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireUser(["admin"]);

  return (
    <div className="container">
      <div className="page-head">
        <p className="eyebrow">Admin pusat</p>
        <h1>Operasional Komunifind</h1>
        <p className="sub">Buat komunitas baru dan kaitkan akun panitia yang sudah pernah login.</p>
      </div>
      {children}
    </div>
  );
}
