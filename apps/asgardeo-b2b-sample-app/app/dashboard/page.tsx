import Link from "next/link";
import type { ReactNode } from "react";
import { SignOutButton, UserDropdown } from "@asgardeo/nextjs";
import { getCurrentUserRole, type UserRole } from "../lib/auth";

const adminStats = [
  { label: "Policy compliance", value: "96%", trend: "+8% this quarter" },
  { label: "Managed employees", value: "438", trend: "24 invited this month" },
  { label: "Open support sessions", value: "7", trend: "3 impersonations active" },
  { label: "Monthly travel spend", value: "$128K", trend: "12% under budget" }
];

const policyRules = [
  { name: "Economy cabin for trips under 6 hours", status: "Active", limit: "All teams" },
  { name: "Manager approval above $1,200", status: "Active", limit: "Flights" },
  { name: "Hotel nightly cap by region", status: "Draft", limit: "APAC, EMEA" }
];

const employees = [
  { name: "Ava Fernando", email: "ava@acme.example", role: "MEMBER", status: "Active" },
  { name: "Nimal Perera", email: "nimal@acme.example", role: "MEMBER", status: "Invited" },
  { name: "Maya Silva", email: "maya@acme.example", role: "ADMIN", status: "Active" }
];

const flightOptions = [
  {
    route: "Colombo to Singapore",
    carrier: "SriLankan UL 308",
    time: "08:10 - 14:40",
    price: "$482",
    policy: "In policy"
  },
  {
    route: "Colombo to Dubai",
    carrier: "Emirates EK 651",
    time: "10:05 - 13:05",
    price: "$690",
    policy: "Needs approval"
  },
  {
    route: "Colombo to London",
    carrier: "Qatar QR 663",
    time: "03:35 - 13:25",
    price: "$1,140",
    policy: "In policy"
  }
];

const memberTrips = [
  { label: "Upcoming trips", value: "3" },
  { label: "Policy budget left", value: "$2,840" },
  { label: "Pending approvals", value: "1" },
  { label: "Rewarded savings", value: "$360" }
];

function WorkspaceShell({
  children,
  role
}: Readonly<{
  children: ReactNode;
  role: UserRole;
}>) {
  const navItems =
    role === "ADMIN"
      ? [
          { href: "/dashboard", label: "Admin overview" },
          { href: "/organization", label: "Users" },
          { href: "/requests", label: "Policies" },
          { href: "/bookings", label: "Billing" }
        ]
      : [
          { href: "/dashboard", label: "Trip desk" },
          { href: "/bookings", label: "Book flights" },
          { href: "/requests", label: "Approvals" },
          { href: "/organization", label: "Company policy" }
        ];

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/">
          VoyageOps
        </Link>
        <span className="role-badge">{role}</span>
        <nav className="side-nav" aria-label="Workspace navigation">
          {navItems.map((item) => (
            <Link href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <section className="workspace">
        <header className="workspace-header">
          <div>
            <p className="eyebrow">{role === "ADMIN" ? "Admin workspace" : "Member workspace"}</p>
            <h1>{role === "ADMIN" ? "Corporate travel control center" : "Book travel within policy"}</h1>
          </div>
          <div className="profile-actions">
            <UserDropdown />
            <SignOutButton className="button button-ghost">Sign out</SignOutButton>
          </div>
        </header>
        {children}
      </section>
    </main>
  );
}

function AdminDashboard() {
  return (
    <>
      <section className="command-panel">
        <div>
          <p className="eyebrow">Policy engine</p>
          <h2>Configure the rules every booking must pass.</h2>
          <p>
            Set cabin classes, approval thresholds, regional hotel budgets, and exception handling for
            every employee in the organization.
          </p>
        </div>
        <div className="action-cluster">
          <button className="button button-primary">New policy</button>
          <button className="button button-secondary">Invite users</button>
        </div>
      </section>

      <section className="stats-grid" aria-label="Admin travel summary">
        {adminStats.map((stat) => (
          <article className="stat-card" key={stat.label}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
            <small>{stat.trend}</small>
          </article>
        ))}
      </section>

      <div className="dashboard-grid">
        <section className="workspace-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Travel policies</p>
              <h2>Active controls</h2>
            </div>
            <button className="button button-secondary">Edit rules</button>
          </div>
          <div className="policy-list">
            {policyRules.map((rule) => (
              <article className="policy-row" key={rule.name}>
                <div>
                  <strong>{rule.name}</strong>
                  <span>{rule.limit}</span>
                </div>
                <em>{rule.status}</em>
              </article>
            ))}
          </div>
        </section>

        <section className="workspace-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">User management</p>
              <h2>Employees</h2>
            </div>
            <button className="button button-secondary">Add user</button>
          </div>
          <div className="user-table">
            {employees.map((employee) => (
              <article className="user-row" key={employee.email}>
                <div>
                  <strong>{employee.name}</strong>
                  <span>{employee.email}</span>
                </div>
                <span>{employee.role}</span>
                <em>{employee.status}</em>
                <button className="text-button">Impersonate</button>
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className="workspace-panel billing-panel">
        <div>
          <p className="eyebrow">Billing</p>
          <h2>Centralized payment settings</h2>
          <p>Corporate card ending 4821 is the default payment method for compliant bookings.</p>
        </div>
        <div className="billing-meter">
          <span>May spend</span>
          <strong>$128,420 / $180,000</strong>
          <div aria-hidden="true">
            <span />
          </div>
        </div>
      </section>
    </>
  );
}

function MemberDashboard() {
  return (
    <>
      <section className="booking-hero">
        <div>
          <p className="eyebrow">Flight booking</p>
          <h2>Search routes that already understand your company policy.</h2>
          <p>
            Choose a destination, compare fares, and send anything outside policy through approval
            before checkout.
          </p>
        </div>
        <form className="search-form">
          <label>
            From
            <input defaultValue="Colombo" />
          </label>
          <label>
            To
            <input defaultValue="Singapore" />
          </label>
          <label>
            Depart
            <input defaultValue="May 28" />
          </label>
          <button className="button button-primary" type="button">
            Search flights
          </button>
        </form>
      </section>

      <section className="stats-grid" aria-label="Member travel summary">
        {memberTrips.map((stat) => (
          <article className="stat-card" key={stat.label}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
          </article>
        ))}
      </section>

      <section className="workspace-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Recommended fares</p>
            <h2>Policy-aware flight options</h2>
          </div>
          <Link className="button button-secondary" href="/bookings">
            View all
          </Link>
        </div>
        <div className="flight-list">
          {flightOptions.map((flight) => (
            <article className="flight-row" key={flight.carrier}>
              <div>
                <strong>{flight.route}</strong>
                <span>{flight.carrier}</span>
              </div>
              <span>{flight.time}</span>
              <strong>{flight.price}</strong>
              <em className={flight.policy === "In policy" ? "success-pill" : "warning-pill"}>
                {flight.policy}
              </em>
              <button className="button button-secondary">Select</button>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

export default async function Dashboard() {
  const role = await getCurrentUserRole();

  return (
    <WorkspaceShell role={role}>
      {role === "ADMIN" ? <AdminDashboard /> : <MemberDashboard />}
    </WorkspaceShell>
  );
}
