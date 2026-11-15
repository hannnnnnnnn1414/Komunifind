"use client";

import Link from "next/link";
import { useState } from "react";
import type { SessionUser } from "@/lib/types";
import { LogoutButton } from "./LogoutButton";
import { SidebarNav } from "./SidebarNav";

export function AppShell({
  user,
  pendingTotal,
  unassignedTotal,
  children,
}: {
  user: SessionUser;
  pendingTotal: number;
  unassignedTotal: number;
  children: React.ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeDrawer = () => setDrawerOpen(false);

  return (
    <div className="shell">
      {drawerOpen ? (
        <div className="drawer-scrim" onClick={closeDrawer} aria-hidden="true" />
      ) : null}

      <aside className={`shell-sidebar${drawerOpen ? " open" : ""}`} aria-label="Menu">
        <Link href="/" className="brand shell-brand" onClick={closeDrawer}>
          <span className="brand-mark">K</span>
          Komunifind
        </Link>
        <SidebarNav
          user={user}
          pendingTotal={pendingTotal}
          unassignedTotal={unassignedTotal}
          onNavigate={closeDrawer}
        />
        <div className="shell-user">
          <span className="user-chip">
            <span className="avatar">{user.name.slice(0, 1).toUpperCase()}</span>
            <span className="name">{user.name}</span>
          </span>
          <LogoutButton />
        </div>
      </aside>

      <div className="shell-main">
        <div className="shell-topbar">
          <button
            type="button"
            className="btn btn-ghost btn-sm shell-menu-btn"
            aria-label="Buka menu"
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen((open) => !open)}
          >
            ☰
          </button>
          <Link href="/" className="brand shell-topbar-brand">
            <span className="brand-mark">K</span>
            Komunifind
          </Link>
          <span className="spacer" />
          <span className="user-chip">
            <span className="avatar">{user.name.slice(0, 1).toUpperCase()}</span>
            <span className="name">{user.name}</span>
          </span>
        </div>
        <main className="shell-content">{children}</main>
      </div>
    </div>
  );
}
