"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useAuth } from "./lib/auth/client";
import AdminSidebar from "./AdminSidebar";
import AgentChatWidget from "./AgentChatWidget";
import ImpersonationBanner from "./ImpersonationBanner";
import LoadingScreen from "./LoadingScreen";
import WorkspaceLoader from "./WorkspaceLoader";
import { UserRole } from "./lib/auth/utils";

const ALL_NAV_ITEMS = [
  { href: "/requests", label: "Travel policies", shortLabel: "P" },
  { href: "/organization", label: "Users and roles", shortLabel: "U" },
  { href: "/enterprise-idp", label: "Enterprise IdP", shortLabel: "IdP" },
  { href: "/bookings", label: "Flight booking", shortLabel: "F" },
  { href: "/personalization", label: "Personalization", shortLabel: "Ps" },
  { href: "/billing", label: "Billing", shortLabel: "Bi" },
];

const IDP_MANAGER_NAV_ITEMS = [
  { href: "/enterprise-idp", label: "Enterprise IdP", shortLabel: "IdP" },
];

const BRANDING_NAV_ITEMS = [
  { href: "/personalization", label: "Personalization", shortLabel: "Ps" },
];

function getNavItems(roles: UserRole[]) {
  if (roles.includes(UserRole.ADMIN)) return ALL_NAV_ITEMS;
  if (roles.includes(UserRole.IDP_MANAGER)) return IDP_MANAGER_NAV_ITEMS;
  if (roles.includes(UserRole.BASIC_BRANDING_EDITOR) || roles.includes(UserRole.ADVANCED_BRANDING_EDITOR)) return BRANDING_NAV_ITEMS;
  return [];
}

function getRoleLabel(roles: UserRole[]): string {
  if (roles.includes(UserRole.ADMIN)) return "ADMIN";
  if (roles.includes(UserRole.IDP_MANAGER)) return "IDP MANAGER";
  if (roles.includes(UserRole.ADVANCED_BRANDING_EDITOR)) return "BRANDING EDITOR";
  if (roles.includes(UserRole.BASIC_BRANDING_EDITOR)) return "BRANDING EDITOR";
  return "MEMBER";
}

function hasAdminShell(roles: UserRole[]) {
  return (
    roles.includes(UserRole.ADMIN) ||
    roles.includes(UserRole.IDP_MANAGER) ||
    roles.includes(UserRole.BASIC_BRANDING_EDITOR) ||
    roles.includes(UserRole.ADVANCED_BRANDING_EDITOR)
  );
}

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
  loading,
  roles,
  title
}: Readonly<{
  activeHref: string;
  children: ReactNode;
  eyebrow: string;
  loading?: boolean;
  roles: UserRole[];
  title: string;
}>) {
  const { isLoading: authLoading } = useAuth();

  if (authLoading) {
    return <LoadingScreen description="Please wait while we set up your workspace." steps={[]} title="Loading your workspace…" />;
  }

  if (!hasAdminShell(roles)) {
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
          <div style={{ position: "relative" }}>
            {loading && <WorkspaceLoader />}
            {children}
          </div>
        </section>
        <AgentChatWidget />
      </main>
    );
  }

  return (
    <main className="app-shell admin-shell">
      <ImpersonationBanner />
      <AdminSidebar activeHref={activeHref} navItems={getNavItems(roles)} roleLabel={getRoleLabel(roles)} />

      <section className="workspace">
        <header className="workspace-header">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
          </div>
          <ProfileActions />
        </header>
        <div style={{ position: "relative" }}>
          {loading && <WorkspaceLoader />}
          {children}
        </div>
      </section>
      <AgentChatWidget />
    </main>
  );
}
