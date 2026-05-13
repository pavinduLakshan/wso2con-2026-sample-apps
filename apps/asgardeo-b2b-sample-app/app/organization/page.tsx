import { redirect } from "next/navigation";
import WorkspaceShell from "../WorkspaceShell";
import { getCurrentUserRole } from "../lib/auth";

const users = [
  { name: "Ava Fernando", role: "MEMBER", access: "Flight booking", status: "Active" },
  { name: "Maya Silva", role: "ADMIN", access: "Management and booking", status: "Active" },
  { name: "Nimal Perera", role: "MEMBER", access: "Flight booking", status: "Invited" }
];

const roles = [
  { name: "ADMIN", access: "Policies, users, roles, paid features, booking, billing" },
  { name: "MEMBER", access: "Flight booking only" }
];

const billing = [
  { label: "Default card", value: "Corporate Visa ending 4821" },
  { label: "Invoice owner", value: "finance@acme.example" },
  { label: "Monthly spend cap", value: "$180,000" }
];

const paidFeatures = [
  {
    label: "Enterprise IdP",
    value: "Connect workforce login from an enterprise identity provider."
  },
  {
    label: "Branding changes",
    value: "Customize workspace logo, colors, and customer-facing presentation."
  }
];

export default async function OrganizationPage() {
  const role = await getCurrentUserRole();

  if (role !== "ADMIN") {
    redirect("/bookings");
  }

  return (
    <WorkspaceShell
      activeHref="/organization"
      eyebrow="Admin workspace"
      role={role}
      title="Users, roles, paid features, and billing"
    >
      <section className="command-panel">
        <div>
          <p className="eyebrow">Management</p>
          <h2>Manage access and commercial settings for the workspace.</h2>
          <p>
            Admins can manage users, assign roles, enable paid enterprise features, and update billing
            settings from this view.
          </p>
        </div>
        <div className="action-cluster">
          <button className="button button-primary">Invite user</button>
          <button className="button button-secondary">Create role</button>
        </div>
      </section>

      <div className="dashboard-grid">
        <section className="workspace-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Users</p>
              <h2>Access directory</h2>
            </div>
            <button className="button button-secondary">Remove user</button>
          </div>
          <div className="user-table">
            {users.map((user) => (
              <article className="user-row" key={user.name}>
                <div>
                  <strong>{user.name}</strong>
                  <span>{user.access}</span>
                </div>
                <span>{user.role}</span>
                <em>{user.status}</em>
                <button className="text-button">Edit</button>
              </article>
            ))}
          </div>
        </section>

        <section className="workspace-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Roles</p>
              <h2>Role permissions</h2>
            </div>
            <button className="button button-secondary">Assign role</button>
          </div>
          <div className="policy-list">
            {roles.map((item) => (
              <article className="policy-row" key={item.name}>
                <div>
                  <strong>{item.name}</strong>
                  <span>{item.access}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <div className="dashboard-grid">
        <section className="workspace-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Paid features</p>
              <h2>Enterprise add-ons</h2>
            </div>
            <button className="button button-secondary">Upgrade</button>
          </div>
          <div className="policy-list">
            {paidFeatures.map((feature) => (
              <article className="policy-row" key={feature.label}>
                <div>
                  <strong>{feature.label}</strong>
                  <span>{feature.value}</span>
                </div>
                <em>Paid</em>
              </article>
            ))}
          </div>
        </section>

        <section className="workspace-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Billing</p>
              <h2>Payment settings</h2>
            </div>
            <button className="button button-secondary">Edit billing</button>
          </div>
          <div className="policy-list">
            {billing.map((item) => (
              <article className="policy-row" key={item.label}>
                <div>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}
