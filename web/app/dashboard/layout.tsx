import Link from "next/link";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser(["organizer"]);

  return (
    <div className="container">
      <div className="page-head">
        <p className="eyebrow">Dashboard panitia</p>
        <h1>Kelola komunitasmu</h1>
        <p className="sub">
          Masuk sebagai {user.name}. Semua perubahan di sini hanya berlaku untuk komunitas yang kamu kelola.
        </p>
      </div>
      <nav className="subnav">
        <Link href="/dashboard">Ringkasan</Link>
        <Link href="/dashboard/events/new">Buat event</Link>
        <Link href="/dashboard/community">Profil komunitas</Link>
      </nav>
      {children}
    </div>
  );
}
