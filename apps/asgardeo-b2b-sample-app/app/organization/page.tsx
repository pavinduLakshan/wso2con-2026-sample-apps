import Link from "next/link";

const users = [
  { name: "Ava Fernando", role: "MEMBER", access: "Booking and approvals" },
  { name: "Maya Silva", role: "ADMIN", access: "Policies, billing, users" },
  { name: "Nimal Perera", role: "MEMBER", access: "Invited" }
];

const billing = [
  { label: "Default card", value: "Corporate Visa ending 4821" },
  { label: "Invoice owner", value: "finance@acme.example" },
  { label: "Monthly spend cap", value: "$180,000" }
];

export default function OrganizationPage() {
  return (
    <main className="detail-page">
      <nav className="detail-nav">
        <Link className="brand" href="/dashboard">
          VoyageOps
        </Link>
        <Link className="button button-secondary" href="/dashboard">
          Back to dashboard
        </Link>
      </nav>

      <section className="split-layout">
        <div>
          <p className="eyebrow">Organization</p>
          <h1>Manage people, access, impersonation, and billing.</h1>
          <p>
            Admins can invite or remove users, inspect role assignments, and launch impersonation
            sessions to help employees resolve booking issues.
          </p>
        </div>
        <div className="action-card">
          <span>Organization</span>
          <strong>Acme Global Travel</strong>
          <button className="button button-primary">Invite employee</button>
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
                <button className="text-button">Impersonate</button>
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
    </main>
  );
}
