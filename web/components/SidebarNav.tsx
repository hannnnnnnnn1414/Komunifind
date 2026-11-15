"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SessionUser } from "@/lib/types";

type Item = {
  href: string;
  label: string;
  badge?: number;
  exact?: boolean;
};

function itemsFor(user: SessionUser, pendingTotal: number, unassignedTotal: number): Item[] {

  const items: Item[] = [];
  if (user.role === "organizer" || user.role === "admin") {
    items.push(
      { href: "/dashboard", label: "Dashboard", badge: pendingTotal, exact: true },
      { href: "/dashboard/events/new", label: "Buat event" },
      { href: "/dashboard/community", label: "Profil komunitas" },
    );
  }
  items.push(
    { href: "/events", label: "Event" },
    { href: "/me", label: "Pendaftaranku" },
  );
  if (user.role === "admin") {
    items.push(
      { href: "/admin", label: "Admin", exact: true },
      { href: "/admin/communities/new", label: "Komunitas baru" },
      { href: "/admin/users", label: "Pengguna", badge: unassignedTotal },
    );
  }
  return items;
}

export function SidebarNav({
  user,
  pendingTotal,
  unassignedTotal,
  onNavigate,
}: {
  user: SessionUser;
  pendingTotal: number;
  unassignedTotal: number;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const items = itemsFor(user, pendingTotal, unassignedTotal);

  return (
    <nav className="sidebar-nav" aria-label="Navigasi utama">
      {items.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={active ? "active" : undefined}
            aria-current={active ? "page" : undefined}
          >
            <span>{item.label}</span>
            {item.badge !== undefined && item.badge > 0 ? (
              <span className="nav-badge" aria-label={`${item.badge} menunggu`}>
                {item.badge > 99 ? "99+" : item.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
