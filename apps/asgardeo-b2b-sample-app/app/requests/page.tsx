"use client";

import { useAuth } from "../lib/auth-client";
import { getRoleFromPermissions, UserRole } from "../lib/auth";
import TravelPolicyDashboard from "./TravelPolicyDashboard";
import WorkspaceShell from "../WorkspaceShell";

export default function RequestsPage() {
  const { user } = useAuth();
  const role = user ? getRoleFromPermissions(user.permissions) : UserRole.MEMBER;

  if (role !== UserRole.ADMIN) {
    return (
      <WorkspaceShell activeHref="/requests" eyebrow="Member workspace" role={role} title="Travel policies">
        <section className="workspace-panel">
          <p className="eyebrow">Access restricted</p>
          <h2>You don&apos;t have permission to view this page.</h2>
          <p>Travel policy management is available to administrators only.</p>
        </section>
      </WorkspaceShell>
    );
  }

  return <TravelPolicyDashboard role={role} />;
}
