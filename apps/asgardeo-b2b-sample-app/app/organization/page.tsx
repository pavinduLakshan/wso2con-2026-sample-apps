"use client";

import { useAuth } from "../lib/auth/client";
import { getRoleFromPermissions, UserRole } from "../lib/auth/utils";
import OrganizationDashboard from "./OrganizationDashboard";
import WorkspaceShell from "../WorkspaceShell";

export default function OrganizationPage() {
  const { user } = useAuth();
  const role = user ? getRoleFromPermissions(user.permissions) : UserRole.MEMBER;

  if (role !== UserRole.ADMIN) {
    return (
      <WorkspaceShell activeHref="/organization" eyebrow="Member workspace" role={role} title="Users and roles">
        <section className="workspace-panel">
          <p className="eyebrow">Access restricted</p>
          <h2>You don&apos;t have permission to view this page.</h2>
          <p>User and role management is available to administrators only.</p>
        </section>
      </WorkspaceShell>
    );
  }

  return <OrganizationDashboard role={role} />;
}
