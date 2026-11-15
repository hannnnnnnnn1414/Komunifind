import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import "./globals.css";
import { getSessionUser } from "@/lib/session";
import { countPendingByOrganizer } from "@/lib/store/registrations";
import { countUnassignedCommunities } from "@/lib/store/communities";
import { ScrollReveal } from "@/components/ScrollReveal";
import { AppShell } from "@/components/AppShell";
import { Toasts } from "@/components/Toasts";

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

  let pendingTotal = 0;
  let unassignedTotal = 0;
  if (user && (user.role === "organizer" || user.role === "admin")) {
    try {
      pendingTotal = (await countPendingByOrganizer(user.id)).total;
    } catch {
      pendingTotal = 0;
    }
  }
  if (user && user.role === "admin") {
    try {
      unassignedTotal = await countUnassignedCommunities();
    } catch {
      unassignedTotal = 0;
    }
  }

  return (
    <html lang="id">
      <body>
        <ScrollReveal />
        <noscript>
          <style>{`[data-reveal]{opacity:1!important;translate:none!important}`}</style>
        </noscript>
        <Suspense>
          <Toasts />
        </Suspense>

        {user ? (
          <AppShell user={user} pendingTotal={pendingTotal} unassignedTotal={unassignedTotal}>
            {children}
          </AppShell>
        ) : (
          <>
            <header className="site-header">
              <div className="container inner">
                <Link href="/" className="brand">
                  <span className="brand-mark">K</span>
                  Komunifind
                </Link>
                <nav className="nav">
                  <Link href="/">Jelajah</Link>
                  <Link href="/events">Event</Link>
                </nav>
                <div className="header-right">
                  <Link href="/login" className="btn btn-primary btn-sm">
                    Masuk
                  </Link>
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
          </>
        )}
      </body>
    </html>
  );
}
