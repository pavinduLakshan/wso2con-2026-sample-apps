"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useAuth } from "./lib/auth-client";
import AdminSidebar from "./AdminSidebar";
import ImpersonationBanner from "./ImpersonationBanner";
import { UserRole } from "./lib/auth";

const adminNavItems = [
  { href: "/requests", label: "Travel policies", shortLabel: "P" },
  { href: "/organization", label: "Users and roles", shortLabel: "U" },
  { href: "/bookings", label: "Flight booking", shortLabel: "F" },
  { href: "/personalization", label: "Personalization", shortLabel: "Ps" },
  { href: "/billing", label: "Billing", shortLabel: "Bi" }
];

function ProfileActions() {
  const { signOut } = useAuth();

  return (
    <div className="profile-actions">
      <button className="button button-ghost" onClick={signOut} type="button">
        Sign out
      </button>
    </div>
  );
}

export default function WorkspaceShell({
  activeHref,
  children,
  eyebrow,
  role,
  title
}: Readonly<{
  activeHref: string;
  children: ReactNode;
  eyebrow: string;
  role: UserRole;
  title: string;
}>) {
  if (role !== UserRole.ADMIN) {
    return (
      <main className="member-shell">
        <ImpersonationBanner />
        <header className="member-topbar">
          <Link className="sidebar-brand" href="/">
            <span className="sidebar-brand-mark">W</span>
            <span className="sidebar-brand-label">Wayfinder Enterprise</span>
          </Link>
          <ProfileActions />
        </header>

        <section className="workspace member-workspace">
          <header className="workspace-header">
            <div>
              <p className="eyebrow">{eyebrow}</p>
              <h1>{title}</h1>
            </div>
          </header>
          {children}
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell admin-shell">
      <ImpersonationBanner />
      <AdminSidebar activeHref={activeHref} navItems={adminNavItems} />

      <section className="workspace">
        <header className="workspace-header">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
          </div>
          <ProfileActions />
        </header>
        {children}
      </section>
    </main>
  );
}
