import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { getSessionUser } from "@/lib/session";
import { ScrollReveal } from "@/components/ScrollReveal";
import { logoutAction } from "./actions";

export const metadata: Metadata = {
  title: {
    default: "Komunifind — temukan komunitasmu",
    template: "%s · Komunifind",
  },
  description:
    "Direktori komunitas dan event di Indonesia. Temukan komunitas yang cocok, lalu daftar event-nya.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();

  return (
    <html lang="id">
      <body>
        <ScrollReveal />
        <noscript>
          <style>{`[data-reveal]{opacity:1!important;translate:none!important}`}</style>
        </noscript>
        <header className="site-header">
          <div className="container inner">
            <Link href="/" className="brand">
              <span className="brand-mark">K</span>
              Komunifind
            </Link>
            <nav className="nav">
              <Link href="/">Jelajah</Link>
              <Link href="/events">Event</Link>
              {user ? <Link href="/me">Pendaftaranku</Link> : null}
              {user && (user.role === "organizer" || user.role === "admin") ? (
                <Link href="/dashboard">Dashboard</Link>
              ) : null}
              {user && user.role === "admin" ? <Link href="/admin">Admin</Link> : null}
            </nav>
            <div className="header-right">
              {user ? (
                <>
                  <span className="user-chip">
                    <span className="avatar">{user.name.slice(0, 1).toUpperCase()}</span>
                    <span className="name">{user.name}</span>
                  </span>
                  <form action={logoutAction}>
                    <button type="submit" className="btn btn-ghost btn-sm">
                      Keluar
                    </button>
                  </form>
                </>
              ) : (
                <Link href="/login" className="btn btn-primary btn-sm">
                  Masuk
                </Link>
              )}
            </div>
          </div>
        </header>

        <main>{children}</main>

        <footer className="site-footer">
          <div className="container inner">
            <span>Komunifind — direktori komunitas, dikelola panitia sendiri.</span>
            <span>Dibuat untuk komunitas di Indonesia.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
