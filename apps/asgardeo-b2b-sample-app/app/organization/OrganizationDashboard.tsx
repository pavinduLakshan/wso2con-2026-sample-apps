"use client";

import { useState } from "react";
import WorkspaceShell from "../WorkspaceShell";
import { UserRole } from "../lib/auth/utils";

type Tab = "users" | "roles" | "enterprise-idp";
type UserStatus = "Active" | "Locked";
type RoleName = "Admin" | "Member" | "Idp-Manager" | "Basic-Branding-Editor" | "Advanced-Branding-Editor";
type Permission = "Flight Booking" | "Travel Policy" | "Impersonate" | "IDP Configure" | "Basic Branding" | "Advanced Branding" | "User Mgt";

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
  permissions: Permission[];
}

interface IdpConfig {
  clientId: string;
  clientSecret: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  jwksEndpoint: string;
}

const ALL_PERMISSIONS: Permission[] = [
  "Flight Booking",
  "Travel Policy",
  "Impersonate",
  "IDP Configure",
  "Basic Branding",
  "Advanced Branding",
  "User Mgt",
];

const ROLES: RoleDef[] = [
  { name: "Admin", description: "Full access to all features and settings.", permissions: [...ALL_PERMISSIONS] },
  { name: "Member", description: "Can book flights for personal travel.", permissions: ["Flight Booking"] },
  { name: "Idp-Manager", description: "Can configure enterprise identity providers.", permissions: ["IDP Configure"] },
  { name: "Basic-Branding-Editor", description: "Can edit basic branding settings.", permissions: ["Basic Branding"] },
  { name: "Advanced-Branding-Editor", description: "Can edit advanced branding settings.", permissions: ["Basic Branding", "Advanced Branding"] },
];

const INITIAL_EMPLOYEES: Employee[] = [
  { id: "u1", name: "Ava Fernando", email: "ava.fernando@acme.example", department: "Marketing", role: "Member", status: "Active", lastLogin: "May 14, 2026 09:22" },
  { id: "u2", name: "Maya Silva", email: "maya.silva@acme.example", department: "Operations", role: "Idp-Manager", status: "Active", lastLogin: "May 15, 2026 08:04" },
  { id: "u3", name: "Nimal Perera", email: "nimal.perera@acme.example", department: "Engineering", role: "Member", status: "Locked", lastLogin: "May 10, 2026 14:02" },
  { id: "u4", name: "Priya Jayawardena", email: "priya.j@acme.example", department: "Human Resources", role: "Admin", status: "Active", lastLogin: "May 13, 2026 14:30" },
  { id: "u5", name: "Tomas Ruiz", email: "tomas.ruiz@acme.example", department: "Finance", role: "Admin", status: "Active", lastLogin: "May 15, 2026 10:18" },
  { id: "u6", name: "Lisa Chen", email: "lisa.chen@acme.example", department: "Sales", role: "Member", status: "Locked", lastLogin: "Apr 28, 2026 16:44" },
  { id: "u7", name: "James Park", email: "james.park@acme.example", department: "Marketing", role: "Basic-Branding-Editor", status: "Active", lastLogin: "May 12, 2026 11:15" },
  { id: "u8", name: "Sara Kim", email: "sara.kim@acme.example", department: "Design", role: "Advanced-Branding-Editor", status: "Active", lastLogin: "May 11, 2026 14:30" },
];

const PAGE_SIZE = 5;

const TABS: { id: Tab; label: string; paid?: boolean }[] = [
  { id: "users", label: "Users" },
  { id: "roles", label: "Roles & Permissions" },
  { id: "enterprise-idp", label: "Enterprise IdP", paid: true },
];

const EMPTY_IDP: IdpConfig = { clientId: "", clientSecret: "", authorizationEndpoint: "", tokenEndpoint: "", jwksEndpoint: "" };

export default function OrganizationDashboard({ role }: { role: UserRole }) {
  const [activeTab, setActiveTab] = useState<Tab>("users");
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [editUser, setEditUser] = useState<Employee | null>(null);

  const [assignRoleTarget, setAssignRoleTarget] = useState<RoleName | null>(null);
  const [assignSearch, setAssignSearch] = useState("");
  const [assignSelected, setAssignSelected] = useState<Set<string>>(new Set());

  const [idpConfig, setIdpConfig] = useState<IdpConfig | null>(null);
  const [idpForm, setIdpForm] = useState<IdpConfig>(EMPTY_IDP);
  const [idpEditing, setIdpEditing] = useState(false);
  const [showPremiumPreview, setShowPremiumPreview] = useState(false);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<RoleName>("Member");
  const [inviteSent, setInviteSent] = useState(false);

  const isPremium = showPremiumPreview;

  const filteredEmployees = employees.filter(
    (u) => !search || u.name.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedEmployees = filteredEmployees.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function handleSearch(v: string) {
    setSearch(v);
    setPage(1);
  }

  function handleToggleStatus(userId: string) {
    setEmployees((prev) =>
      prev.map((u) => {
        if (u.id !== userId) return u;
        const next: UserStatus = u.status === "Active" ? "Locked" : "Active";
        return { ...u, status: next };
      })
    );
    setEditUser((prev) =>
      prev?.id === userId
        ? { ...prev, status: prev.status === "Active" ? "Locked" : "Active" }
        : prev
    );
  }

  function handleImpersonate(user: Employee) {
    localStorage.setItem("wayfinder.impersonating", user.name);
    window.dispatchEvent(new Event("wayfinder:impersonation"));
    setEditUser(null);
  }

  function openAssignRole(roleName: RoleName) {
    setAssignSelected(new Set(employees.filter((e) => e.role === roleName).map((e) => e.id)));
    setAssignSearch("");
    setAssignRoleTarget(roleName);
  }

  function submitAssignRole() {
    if (!assignRoleTarget) return;
    setEmployees((prev) =>
      prev.map((u) => {
        if (assignSelected.has(u.id)) return { ...u, role: assignRoleTarget };
        if (u.role === assignRoleTarget) return { ...u, role: "Member" };
        return u;
      })
    );
    setAssignRoleTarget(null);
  }

  function openInviteModal() {
    setInviteEmail("");
    setInviteRole("Member");
    setInviteSent(false);
    setShowInviteModal(true);
  }

  function handleInviteSubmit() {
    if (!inviteEmail.trim()) return;
    const nameFromEmail = inviteEmail.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    const newUser: Employee = {
      id: `u${Date.now()}`,
      name: nameFromEmail,
      email: inviteEmail.trim().toLowerCase(),
      department: "—",
      role: inviteRole,
      status: "Active",
      lastLogin: "Never",
    };
    setEmployees((prev) => [newUser, ...prev]);
    setInviteSent(true);
  }

  function handleIdpSave() {
    setIdpConfig({ ...idpForm });
    setIdpEditing(false);
  }

  function handleIdpEdit() {
    if (idpConfig) setIdpForm({ ...idpConfig });
    setIdpEditing(true);
  }

  function handleIdpDelete() {
    setIdpConfig(null);
    setIdpForm(EMPTY_IDP);
    setIdpEditing(false);
  }

  const assignFiltered = employees.filter(
    (u) => !assignSearch || u.name.toLowerCase().includes(assignSearch.toLowerCase())
  );

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
          <button className="button button-primary" type="button" onClick={openInviteModal}>
            Invite user
          </button>
          <button className="button button-secondary" type="button" onClick={() => setActiveTab("roles")}>
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
            {tab.paid && !isPremium && <span className="tab-paid-badge">Paid</span>}
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
              <div className="search-input-wrapper">
                <input
                  aria-label="Search users by name"
                  placeholder="Search by name…"
                  type="search"
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="org-user-table" role="table" aria-label="Employee directory">
              <div className="org-user-table-head" role="row">
                <span>Name</span>
                <span>Email</span>
                <span>Status</span>
                <span />
              </div>
              {pagedEmployees.map((user) => (
                <div className="org-user-table-row" key={user.id} role="row">
                  <strong>{user.name}</strong>
                  <span className="cell-muted">{user.email}</span>
                  <span>
                    <em className={`status-badge status-badge--${user.status.toLowerCase()}`}>
                      {user.status}
                    </em>
                  </span>
                  <button
                    className="org-edit-btn"
                    type="button"
                    aria-label={`Edit ${user.name}`}
                    onClick={() => setEditUser(user)}
                  >
                    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path d="M11.5 2.5a1.414 1.414 0 0 1 2 2L5 13H3v-2L11.5 2.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            {filteredEmployees.length === 0 && (
              <p className="empty-state">No users match your search.</p>
            )}

            {totalPages > 1 && (
              <div className="pagination">
                <button
                  className="pagination-btn"
                  disabled={currentPage === 1}
                  type="button"
                  onClick={() => setPage((p) => p - 1)}
                >
                  ← Prev
                </button>
                <span className="pagination-info">
                  {currentPage} / {totalPages}
                </span>
                <button
                  className="pagination-btn"
                  disabled={currentPage === totalPages}
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next →
                </button>
              </div>
            )}
          </section>
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
            </div>

            <div className="roles-perm-grid">
              <div className="roles-perm-header">
                <span>Role</span>
                {ALL_PERMISSIONS.map((p) => (
                  <span key={p}>{p}</span>
                ))}
              </div>
              {ROLES.map((r) => (
                <div className="roles-perm-row" key={r.name}>
                  <span>
                    <strong>{r.name}</strong>
                    <small>{r.description}</small>
                  </span>
                  {ALL_PERMISSIONS.map((p) => (
                    <div key={p} className="roles-perm-cell">
                      {r.permissions.includes(p) ? (
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-label="Allowed">
                          <circle cx="9" cy="9" r="8" fill="#eefbf4" stroke="#bbf7d0" />
                          <path d="M5.5 9l2.5 2.5 4.5-5" stroke="#047857" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : (
                        <span className="roles-perm-dash">—</span>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </section>

          <section className="workspace-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Current assignments</p>
                <h2>Users per role</h2>
              </div>
            </div>
            <div className="policy-list">
              {ROLES.map((r) => {
                const count = employees.filter((u) => u.role === r.name).length;
                return (
                  <article className="policy-row" key={r.name}>
                    <div>
                      <strong>{r.name}</strong>
                      <span>{r.description}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <em style={{ background: "var(--app-success-bg)", color: "var(--app-success)", borderRadius: "999px", fontSize: "0.78rem", fontStyle: "normal", fontWeight: 750, padding: "6px 10px", whiteSpace: "nowrap" }}>
                        {count} {count === 1 ? "user" : "users"}
                      </em>
                      <button
                        className="button button-secondary"
                        type="button"
                        style={{ fontSize: "0.82rem", minHeight: "34px", padding: "0 12px" }}
                        onClick={() => openAssignRole(r.name)}
                      >
                        Assign users
                      </button>
                    </div>
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
            <div className={isPremium ? undefined : "locked-feature-content"}>
              <section className="workspace-panel">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">Single Sign-On · OIDC</p>
                    <h2>Enterprise identity provider</h2>
                  </div>
                  <div className="action-cluster">
                    {idpConfig && !idpEditing && (
                      <>
                        <button className="button button-secondary" type="button" onClick={handleIdpEdit}>
                          Edit
                        </button>
                        <button
                          className="button"
                          type="button"
                          style={{ background: "#fff5f5", border: "1px solid #fecaca", color: "#b91c1c" }}
                          onClick={handleIdpDelete}
                        >
                          Delete
                        </button>
                      </>
                    )}
                    {!idpConfig && !idpEditing && (
                      <button className="button button-primary" type="button" onClick={() => setIdpEditing(true)}>
                        Configure IdP
                      </button>
                    )}
                  </div>
                </div>

                {!idpConfig && !idpEditing && (
                  <div className="idp-empty-state">
                    <div className="idp-empty-icon">
                      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                        <rect x="4" y="8" width="24" height="16" rx="3" stroke="currentColor" strokeWidth="1.8" />
                        <circle cx="16" cy="16" r="4" stroke="currentColor" strokeWidth="1.6" />
                        <path d="M10 8V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="1.6" />
                      </svg>
                    </div>
                    <h3>No identity provider configured</h3>
                    <p>Connect an OIDC provider to enable enterprise SSO for your organization.</p>
                    <button className="button button-primary" type="button" onClick={() => setIdpEditing(true)}>
                      Configure OIDC provider
                    </button>
                  </div>
                )}

                {(idpEditing || idpConfig) && (
                  <div style={{ marginTop: "18px", display: "grid", gap: "20px" }}>
                    <div className="idp-form-grid">
                      <label className="form-field-label">
                        Client ID
                        <input
                          className="form-field-input"
                          placeholder="your-client-id"
                          type="text"
                          readOnly={!idpEditing}
                          value={idpEditing ? idpForm.clientId : (idpConfig?.clientId ?? "")}
                          onChange={(e) => setIdpForm((f) => ({ ...f, clientId: e.target.value }))}
                        />
                      </label>
                      <label className="form-field-label">
                        Client Secret
                        <input
                          className="form-field-input"
                          placeholder="••••••••••••••••"
                          type={idpEditing ? "text" : "password"}
                          readOnly={!idpEditing}
                          value={idpEditing ? idpForm.clientSecret : (idpConfig?.clientSecret ?? "")}
                          onChange={(e) => setIdpForm((f) => ({ ...f, clientSecret: e.target.value }))}
                        />
                      </label>
                      <label className="form-field-label">
                        Authorization Endpoint URL
                        <input
                          className="form-field-input"
                          placeholder="https://idp.example.com/oauth2/authorize"
                          type="url"
                          readOnly={!idpEditing}
                          value={idpEditing ? idpForm.authorizationEndpoint : (idpConfig?.authorizationEndpoint ?? "")}
                          onChange={(e) => setIdpForm((f) => ({ ...f, authorizationEndpoint: e.target.value }))}
                        />
                      </label>
                      <label className="form-field-label">
                        Token Endpoint URL
                        <input
                          className="form-field-input"
                          placeholder="https://idp.example.com/oauth2/token"
                          type="url"
                          readOnly={!idpEditing}
                          value={idpEditing ? idpForm.tokenEndpoint : (idpConfig?.tokenEndpoint ?? "")}
                          onChange={(e) => setIdpForm((f) => ({ ...f, tokenEndpoint: e.target.value }))}
                        />
                      </label>
                      <label className="form-field-label" style={{ gridColumn: "1 / -1" }}>
                        JWKS Endpoint
                        <input
                          className="form-field-input"
                          placeholder="https://idp.example.com/oauth2/jwks"
                          type="url"
                          readOnly={!idpEditing}
                          value={idpEditing ? idpForm.jwksEndpoint : (idpConfig?.jwksEndpoint ?? "")}
                          onChange={(e) => setIdpForm((f) => ({ ...f, jwksEndpoint: e.target.value }))}
                        />
                      </label>
                    </div>

                    {idpEditing && (
                      <div className="action-cluster">
                        <button className="button button-primary" type="button" onClick={handleIdpSave}>
                          Save configuration
                        </button>
                        <button className="button button-secondary" type="button" onClick={() => setIdpEditing(false)}>
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </section>
            </div>

            {!isPremium && (
              <div className="locked-overlay">
                <span className="locked-badge">Premium feature</span>
                <h3>Enterprise SSO requires a Premium plan</h3>
                <p>
                  Connect your workforce IdP (Okta, Azure AD, Google Workspace) so employees sign
                  in through your existing identity provider.
                </p>
                <button className="button button-primary" type="button" onClick={() => setShowPremiumPreview(true)}>
                  Upgrade to Premium
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Invite User Modal ───────────────────────────────────── */}
      {showInviteModal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Invite user" onClick={() => setShowInviteModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="eyebrow">User onboarding</p>
                <h3 style={{ margin: "2px 0 0" }}>Invite a new user</h3>
              </div>
              <button className="modal-close" type="button" aria-label="Close" onClick={() => setShowInviteModal(false)}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="modal-body">
              {inviteSent ? (
                <div className="invite-success">
                  <div className="invite-success-icon">
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                      <circle cx="16" cy="16" r="14" fill="#eefbf4" stroke="#bbf7d0" strokeWidth="1.5" />
                      <path d="M9 16.5l4.5 4.5 9-10" stroke="#047857" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <h4>Invitation sent!</h4>
                  <p>An invite email has been sent to <strong>{inviteEmail}</strong>. They&apos;ll be added as <strong>{inviteRole}</strong> once they accept.</p>
                  <div className="action-cluster" style={{ justifyContent: "center", marginTop: "8px" }}>
                    <button className="button button-secondary" type="button" onClick={() => { setInviteSent(false); setInviteEmail(""); setInviteRole("Member"); }}>
                      Invite another
                    </button>
                    <button className="button button-primary" type="button" onClick={() => setShowInviteModal(false)}>
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="invite-form-intro">
                    <div className="modal-action-icon modal-action-icon--blue" style={{ flexShrink: 0 }}>
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M17 10.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                        <path d="M3 6l7 5 7-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx="15.5" cy="15.5" r="3" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M15.5 14v1.5l1 1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                      </svg>
                    </div>
                    <p style={{ color: "var(--app-muted)", fontSize: "0.88rem", margin: 0 }}>
                      Enter the email address of the person you want to invite. They&apos;ll receive a link to join this workspace.
                    </p>
                  </div>

                  <div style={{ display: "grid", gap: "16px", marginTop: "20px" }}>
                    <label className="form-field-label">
                      Email address
                      <input
                        autoFocus
                        className="form-field-input"
                        placeholder="colleague@company.com"
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleInviteSubmit(); }}
                      />
                    </label>

                    <label className="form-field-label">
                      Assign role
                      <select
                        className="form-field-input"
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value as RoleName)}
                      >
                        {ROLES.map((r) => (
                          <option key={r.name} value={r.name}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="invite-role-hint">
                    <strong>{inviteRole}</strong>
                    <span>{ROLES.find((r) => r.name === inviteRole)?.permissions.join(", ")}</span>
                  </div>

                  <div className="action-cluster" style={{ marginTop: "20px", justifyContent: "flex-end" }}>
                    <button className="button button-secondary" type="button" onClick={() => setShowInviteModal(false)}>
                      Cancel
                    </button>
                    <button
                      className="button button-primary"
                      type="button"
                      disabled={!inviteEmail.trim()}
                      onClick={handleInviteSubmit}
                    >
                      Send invitation
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Edit User Modal ──────────────────────────────────────── */}
      {editUser && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Edit user" onClick={() => setEditUser(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="eyebrow">User management</p>
                <h3 style={{ margin: "2px 0 4px" }}>{editUser.name}</h3>
                <span className="cell-muted">{editUser.email}</span>
              </div>
              <button className="modal-close" type="button" aria-label="Close" onClick={() => setEditUser(null)}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="modal-body">
              <div className="modal-user-info">
                <div className="modal-avatar">{editUser.name.charAt(0)}</div>
                <div style={{ display: "grid", gap: "4px" }}>
                  <strong style={{ fontSize: "1rem" }}>{editUser.name}</strong>
                  <span className="cell-muted">{editUser.email}</span>
                  <em className={`status-badge status-badge--${editUser.status.toLowerCase()}`} style={{ width: "fit-content", marginTop: "2px" }}>
                    {editUser.status}
                  </em>
                </div>
              </div>

              <div className="modal-actions-grid">
                <div className="modal-action-card">
                  <div className="modal-action-icon modal-action-icon--blue">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <rect x="3" y="9" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.6" />
                      <path d="M7 9V6a3 3 0 0 1 6 0v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div style={{ flex: 1, display: "grid", gap: "4px" }}>
                    <strong>Reset Password</strong>
                    <p style={{ color: "var(--app-muted)", fontSize: "0.86rem", margin: 0 }}>
                      Send a password reset link to the user&apos;s email address.
                    </p>
                  </div>
                  <button
                    className="button button-secondary"
                    type="button"
                    style={{ fontSize: "0.82rem", minHeight: "34px", padding: "0 14px", whiteSpace: "nowrap" }}
                    onClick={() => {
                      alert(`Password reset link sent to ${editUser.email}`);
                    }}
                  >
                    Send reset link
                  </button>
                </div>

                <div className="modal-action-card">
                  <div className={`modal-action-icon ${editUser.status === "Active" ? "modal-action-icon--warning" : "modal-action-icon--green"}`}>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      {editUser.status === "Active" ? (
                        <>
                          <rect x="4" y="11" width="12" height="8" rx="2" stroke="currentColor" strokeWidth="1.6" />
                          <path d="M7 11V7a3 3 0 0 1 6 0v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                        </>
                      ) : (
                        <>
                          <rect x="4" y="11" width="12" height="8" rx="2" stroke="currentColor" strokeWidth="1.6" />
                          <path d="M7 11V7c0-1.657 1.343-3 3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                          <path d="M13 4l3 3-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        </>
                      )}
                    </svg>
                  </div>
                  <div style={{ flex: 1, display: "grid", gap: "4px" }}>
                    <strong>{editUser.status === "Active" ? "Lock Account" : "Unlock Account"}</strong>
                    <p style={{ color: "var(--app-muted)", fontSize: "0.86rem", margin: 0 }}>
                      {editUser.status === "Active"
                        ? "Temporarily suspend access for this user."
                        : "Restore access for this locked account."}
                    </p>
                  </div>
                  <button
                    className={`button ${editUser.status === "Active" ? "modal-btn-warning" : "button-secondary"}`}
                    type="button"
                    style={{ fontSize: "0.82rem", minHeight: "34px", padding: "0 14px", whiteSpace: "nowrap" }}
                    onClick={() => handleToggleStatus(editUser.id)}
                  >
                    {editUser.status === "Active" ? "Lock account" : "Unlock account"}
                  </button>
                </div>

                {editUser.status === "Active" && (
                  <div className="modal-action-card">
                    <div className="modal-action-icon modal-action-icon--purple">
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <circle cx="10" cy="7" r="4" stroke="currentColor" strokeWidth="1.6" />
                        <path d="M3 18c0-4 3.134-7 7-7s7 3 7 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                      </svg>
                    </div>
                    <div style={{ flex: 1, display: "grid", gap: "4px" }}>
                      <strong>Impersonate</strong>
                      <p style={{ color: "var(--app-muted)", fontSize: "0.86rem", margin: 0 }}>
                        Act as this user to troubleshoot issues or provide support.
                      </p>
                    </div>
                    <button
                      className="button button-impersonate"
                      type="button"
                      style={{ fontSize: "0.82rem", minHeight: "34px", padding: "0 14px", whiteSpace: "nowrap" }}
                      onClick={() => handleImpersonate(editUser)}
                    >
                      Start session
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Assign Role Modal ────────────────────────────────────── */}
      {assignRoleTarget && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Assign role" onClick={() => setAssignRoleTarget(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="eyebrow">Role assignment</p>
                <h3 style={{ margin: "2px 0 0" }}>Assign users — {assignRoleTarget}</h3>
              </div>
              <button className="modal-close" type="button" aria-label="Close" onClick={() => setAssignRoleTarget(null)}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="search-input-wrapper" style={{ marginBottom: "12px" }}>
                <input
                  aria-label="Search users"
                  placeholder="Search users…"
                  type="search"
                  value={assignSearch}
                  onChange={(e) => setAssignSearch(e.target.value)}
                  style={{ width: "100%" }}
                />
              </div>
              <div className="assign-user-list">
                {assignFiltered.map((u) => (
                  <label key={u.id} className="assign-user-row">
                    <input
                      type="checkbox"
                      checked={assignSelected.has(u.id)}
                      onChange={(e) => {
                        setAssignSelected((prev) => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(u.id);
                          else next.delete(u.id);
                          return next;
                        });
                      }}
                    />
                    <div className="assign-user-avatar">{u.name.charAt(0)}</div>
                    <div style={{ flex: 1, display: "grid", gap: "1px" }}>
                      <strong style={{ fontSize: "0.92rem" }}>{u.name}</strong>
                      <span className="cell-muted">{u.email}</span>
                    </div>
                    <em className={`status-badge status-badge--${u.status.toLowerCase()}`}>{u.status}</em>
                  </label>
                ))}
                {assignFiltered.length === 0 && (
                  <p className="empty-state">No users match your search.</p>
                )}
              </div>
              <div className="action-cluster" style={{ marginTop: "16px", justifyContent: "flex-end" }}>
                <button className="button button-secondary" type="button" onClick={() => setAssignRoleTarget(null)}>
                  Cancel
                </button>
                <button className="button button-primary" type="button" onClick={submitAssignRole}>
                  Save ({assignSelected.size} selected)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </WorkspaceShell>
  );
}
