"use client";

import { useState } from "react";
import WorkspaceShell from "../WorkspaceShell";
import { UserRole } from "../lib/auth";

type Tab = "users" | "roles" | "enterprise-idp";
type UserStatus = "Active" | "Inactive" | "Invited";
type RoleName = "Super Admin" | "HR Admin" | "Travel Manager" | "Employee";

interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  role: RoleName;
  status: UserStatus;
  lastLogin: string;
}

interface RoleDef {
  name: RoleName;
  description: string;
  permissions: { billing: boolean; booking: boolean; policy: boolean };
}

interface AuditEntry {
  id: string;
  timestamp: string;
  adminId: string;
  userId: string;
  action: string;
}

const INITIAL_EMPLOYEES: Employee[] = [
  { id: "u1", name: "Ava Fernando", email: "ava.fernando@acme.example", department: "Marketing", role: "Employee", status: "Active", lastLogin: "May 14, 2026 09:22" },
  { id: "u2", name: "Maya Silva", email: "maya.silva@acme.example", department: "Operations", role: "Travel Manager", status: "Active", lastLogin: "May 15, 2026 08:04" },
  { id: "u3", name: "Nimal Perera", email: "nimal.perera@acme.example", department: "Engineering", role: "Employee", status: "Invited", lastLogin: "Never" },
  { id: "u4", name: "Priya Jayawardena", email: "priya.j@acme.example", department: "Human Resources", role: "HR Admin", status: "Active", lastLogin: "May 13, 2026 14:30" },
  { id: "u5", name: "Tomas Ruiz", email: "tomas.ruiz@acme.example", department: "Finance", role: "Super Admin", status: "Active", lastLogin: "May 15, 2026 10:18" },
  { id: "u6", name: "Lisa Chen", email: "lisa.chen@acme.example", department: "Sales", role: "Employee", status: "Inactive", lastLogin: "Apr 28, 2026 16:44" },
];

const INITIAL_ROLES: RoleDef[] = [
  { name: "Super Admin", description: "Full system access including billing, users, and all modules.", permissions: { billing: true, booking: true, policy: true } },
  { name: "HR Admin", description: "Manage users and onboarding. No billing or policy access.", permissions: { billing: false, booking: false, policy: false } },
  { name: "Travel Manager", description: "Book for others and manage travel policies.", permissions: { billing: false, booking: true, policy: true } },
  { name: "Employee", description: "Book personal work travel within policy.", permissions: { billing: false, booking: true, policy: false } },
];

const IS_PREMIUM = false;
const ADMIN_ID = "admin@acme.example";

const TABS: { id: Tab; label: string; paid?: boolean }[] = [
  { id: "users", label: "Users" },
  { id: "roles", label: "Roles & Permissions" },
  { id: "enterprise-idp", label: "Enterprise IdP", paid: true },
];

export default function OrganizationDashboard({ role }: { role: UserRole }) {
  const [activeTab, setActiveTab] = useState<Tab>("users");
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);
  const [roles, setRoles] = useState<RoleDef[]>(INITIAL_ROLES);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [idpProtocol, setIdpProtocol] = useState<"saml" | "oidc">("oidc");

  function addAudit(userId: string, action: string) {
    setAuditLog((prev) => [
      {
        id: `a${Date.now()}`,
        timestamp: new Date().toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        adminId: ADMIN_ID,
        userId,
        action,
      },
      ...prev,
    ]);
  }

  function handleImpersonate(user: Employee) {
    localStorage.setItem("wayfinder.impersonating", user.name);
    window.dispatchEvent(new Event("wayfinder:impersonation"));
    addAudit(user.email, `Started impersonation session for ${user.name}`);
  }

  function handleToggleStatus(userId: string) {
    setEmployees((prev) =>
      prev.map((u) => {
        if (u.id !== userId) return u;
        const next: UserStatus = u.status === "Active" ? "Inactive" : "Active";
        addAudit(u.email, `Account status changed from ${u.status} to ${next}`);
        return { ...u, status: next };
      })
    );
  }

  function handleSendMagicLink(user: Employee) {
    addAudit(user.email, `Password reset / magic link sent to ${user.email}`);
  }

  function togglePermission(roleName: RoleName, module: "billing" | "booking" | "policy") {
    setRoles((prev) =>
      prev.map((r) =>
        r.name !== roleName ? r : { ...r, permissions: { ...r.permissions, [module]: !r.permissions[module] } }
      )
    );
  }

  const filteredEmployees = employees.filter((u) => {
    const matchSearch =
      !search ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.department.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === "All" || u.role === filterRole;
    const matchStatus = filterStatus === "All" || u.status === filterStatus;
    return matchSearch && matchRole && matchStatus;
  });

  return (
    <WorkspaceShell
      activeHref="/organization"
      eyebrow="Admin workspace"
      role={role}
      title="Users, roles & settings"
    >
      <section className="command-panel">
        <div>
          <p className="eyebrow">Management</p>
          <h2>Manage access and commercial settings for the workspace.</h2>
          <p>
            Configure user accounts, assign roles with granular permissions, and enable enterprise
            add-ons from one place.
          </p>
        </div>
        <div className="action-cluster">
          <button
            className="button button-primary"
            type="button"
            onClick={() => addAudit("new@acme.example", "Invite user action triggered")}
          >
            Invite user
          </button>
          <button
            className="button button-secondary"
            type="button"
            onClick={() => setActiveTab("roles")}
          >
            Manage roles
          </button>
        </div>
      </section>

      <nav className="tab-nav" aria-label="Organization settings tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={activeTab === tab.id ? "active" : undefined}
            onClick={() => setActiveTab(tab.id)}
            type="button"
          >
            {tab.label}
            {tab.paid && !IS_PREMIUM && <span className="tab-paid-badge">Paid</span>}
          </button>
        ))}
      </nav>

      {/* ── Users ───────────────────────────────────────────────── */}
      {activeTab === "users" && (
        <div className="tab-content">
          <section className="workspace-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Enterprise employees</p>
                <h2>Access directory</h2>
              </div>
              <div className="action-cluster">
                <div className="search-input-wrapper">
                  <input
                    aria-label="Search users"
                    placeholder="Search name, email, department…"
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <select
                  aria-label="Filter by role"
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                >
                  <option>All</option>
                  <option>Super Admin</option>
                  <option>HR Admin</option>
                  <option>Travel Manager</option>
                  <option>Employee</option>
                </select>
                <select
                  aria-label="Filter by status"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option>All</option>
                  <option>Active</option>
                  <option>Inactive</option>
                  <option>Invited</option>
                </select>
              </div>
            </div>

            <div className="user-table-full" role="table" aria-label="Employee directory">
              <div className="user-table-head" role="row">
                <span>Name</span>
                <span>Email</span>
                <span>Department</span>
                <span>Role</span>
                <span>Status</span>
                <span>Last Login</span>
                <span>Actions</span>
              </div>
              {filteredEmployees.map((user) => (
                <div className="user-table-row" key={user.id} role="row">
                  <strong>{user.name}</strong>
                  <span className="cell-muted">{user.email}</span>
                  <span className="cell-muted">{user.department}</span>
                  <span>{user.role}</span>
                  <span>
                    <em className={`status-badge status-badge--${user.status.toLowerCase()}`}>
                      {user.status}
                    </em>
                  </span>
                  <span className="cell-muted">{user.lastLogin}</span>
                  <div className="user-actions">
                    <button
                      className="text-button"
                      type="button"
                      onClick={() => addAudit(user.email, `Edit user triggered for ${user.name}`)}
                    >
                      Edit
                    </button>
                    <button
                      className="text-button"
                      type="button"
                      onClick={() => handleSendMagicLink(user)}
                    >
                      Reset
                    </button>
                    <button
                      className="text-button"
                      type="button"
                      onClick={() => handleToggleStatus(user.id)}
                    >
                      {user.status === "Active" ? "Deactivate" : "Activate"}
                    </button>
                    {user.status === "Active" && (
                      <button
                        className="button button-impersonate"
                        type="button"
                        onClick={() => handleImpersonate(user)}
                      >
                        Impersonate
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {filteredEmployees.length === 0 && (
              <p className="empty-state">No users match your search and filter criteria.</p>
            )}
          </section>

          {auditLog.length > 0 && (
            <section className="workspace-panel audit-panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Audit trail</p>
                  <h2>Recent admin actions</h2>
                </div>
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={() => setAuditLog([])}
                >
                  Clear log
                </button>
              </div>
              <div className="audit-log">
                {auditLog.map((entry) => (
                  <div className="audit-entry" key={entry.id}>
                    <time dateTime={entry.timestamp}>{entry.timestamp}</time>
                    <p>{entry.action}</p>
                    <span className="admin-badge">{entry.adminId}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* ── Roles & Permissions ─────────────────────────────────── */}
      {activeTab === "roles" && (
        <div className="tab-content">
          <section className="workspace-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Access control</p>
                <h2>Role definitions &amp; permissions</h2>
              </div>
              <button className="button button-secondary" type="button">
                Create role
              </button>
            </div>
            <div className="permissions-grid">
              <div className="permissions-grid-header">
                <span>Role</span>
                <span>Billing</span>
                <span>Booking</span>
                <span>Policy Setting</span>
              </div>
              {roles.map((r) => (
                <div className="permissions-grid-row" key={r.name}>
                  <span>
                    <strong>{r.name}</strong>
                    <small>{r.description}</small>
                  </span>
                  <label aria-label={`${r.name} billing access`}>
                    <input
                      checked={r.permissions.billing}
                      type="checkbox"
                      onChange={() => togglePermission(r.name, "billing")}
                    />
                  </label>
                  <label aria-label={`${r.name} booking access`}>
                    <input
                      checked={r.permissions.booking}
                      type="checkbox"
                      onChange={() => togglePermission(r.name, "booking")}
                    />
                  </label>
                  <label aria-label={`${r.name} policy setting access`}>
                    <input
                      checked={r.permissions.policy}
                      type="checkbox"
                      onChange={() => togglePermission(r.name, "policy")}
                    />
                  </label>
                </div>
              ))}
            </div>
          </section>

          <section className="workspace-panel" style={{ marginTop: "18px" }}>
            <div className="section-heading">
              <div>
                <p className="eyebrow">Current assignments</p>
                <h2>Users per role</h2>
              </div>
              <button className="button button-secondary" type="button">
                Assign role
              </button>
            </div>
            <div className="policy-list">
              {roles.map((r) => {
                const count = employees.filter((u) => u.role === r.name).length;
                return (
                  <article className="policy-row" key={r.name}>
                    <div>
                      <strong>{r.name}</strong>
                      <span>{r.description}</span>
                    </div>
                    <em>{count} {count === 1 ? "user" : "users"}</em>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {/* ── Enterprise IdP ──────────────────────────────────────── */}
      {activeTab === "enterprise-idp" && (
        <div className="tab-content">
          <div className="locked-feature-wrapper">
            <div className={IS_PREMIUM ? undefined : "locked-feature-content"}>
              <section className="workspace-panel">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">Single Sign-On</p>
                    <h2>Enterprise identity provider</h2>
                  </div>
                  <div className="action-cluster">
                    <span className="cell-muted" style={{ fontSize: "0.88rem" }}>Protocol:</span>
                    <button
                      className={`segment-btn${idpProtocol === "oidc" ? " active" : ""}`}
                      type="button"
                      onClick={() => setIdpProtocol("oidc")}
                    >
                      OIDC
                    </button>
                    <button
                      className={`segment-btn${idpProtocol === "saml" ? " active" : ""}`}
                      type="button"
                      onClick={() => setIdpProtocol("saml")}
                    >
                      SAML 2.0
                    </button>
                  </div>
                </div>

                <div className="idp-form-grid">
                  {idpProtocol === "oidc" ? (
                    <>
                      <label className="form-field-label">
                        Discovery / Metadata URL
                        <input
                          className="form-field-input"
                          placeholder="https://login.microsoftonline.com/tenant/.well-known/openid-configuration"
                          type="url"
                        />
                      </label>
                      <label className="form-field-label">
                        Client ID
                        <input
                          className="form-field-input"
                          placeholder="your-client-id"
                          type="text"
                        />
                      </label>
                      <label className="form-field-label">
                        Client Secret
                        <input
                          className="form-field-input"
                          placeholder="••••••••••••••••"
                          type="password"
                        />
                      </label>
                      <label className="form-field-label">
                        SSO Entry Point URL
                        <input
                          className="form-field-input"
                          placeholder="https://login.microsoftonline.com/tenant/saml2"
                          type="url"
                        />
                      </label>
                    </>
                  ) : (
                    <>
                      <label className="form-field-label">
                        Metadata URL
                        <input
                          className="form-field-input"
                          placeholder="https://idp.example.com/saml/metadata"
                          type="url"
                        />
                      </label>
                      <label className="form-field-label">
                        Entity ID
                        <input
                          className="form-field-input"
                          placeholder="https://wayfinder.example.com/saml"
                          type="text"
                        />
                      </label>
                      <label className="form-field-label">
                        SSO Entry Point
                        <input
                          className="form-field-input"
                          placeholder="https://idp.example.com/saml/sso"
                          type="url"
                        />
                      </label>
                      <label className="form-field-label">
                        X.509 Certificate
                        <textarea
                          className="form-field-input form-field-textarea"
                          placeholder={"-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----"}
                          rows={4}
                        />
                      </label>
                    </>
                  )}
                </div>
                <div className="action-cluster" style={{ marginTop: "20px" }}>
                  <button className="button button-primary" type="button">
                    Test connection
                  </button>
                  <button className="button button-secondary" type="button">
                    Save configuration
                  </button>
                </div>
              </section>
            </div>
            {!IS_PREMIUM && (
              <div className="locked-overlay">
                <span className="locked-badge">Premium feature</span>
                <h3>Enterprise SSO requires a Premium plan</h3>
                <p>
                  Connect your workforce IdP (Okta, Azure AD, Google Workspace) so employees sign
                  in through your existing identity provider.
                </p>
                <button className="button button-primary" type="button">
                  Upgrade to Premium
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </WorkspaceShell>
  );
}
