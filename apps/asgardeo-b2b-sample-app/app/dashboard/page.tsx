"use client";

import Link from "next/link";
import WorkspaceShell from "../WorkspaceShell";
import { useAuth } from "../lib/auth-client";
import { getRoleFromPermissions, UserRole } from "../lib/auth";

const managementCapabilities = [
  {
    action: "Configure",
    description: "Set cabin, spend, route, and approval rules for every employee.",
    href: "/requests",
    label: "Travel policies"
  },
  {
    action: "Maintain",
    description: "Invite, suspend, and review employee access across the workspace.",
    href: "/organization",
    label: "Users"
  },
  {
    action: "Assign",
    description: "Manage ADMIN and MEMBER access for travel operations.",
    href: "/organization",
    label: "Roles"
  },
  {
    action: "Connect",
    description: "Bring an enterprise identity provider into the workspace.",
    href: "/organization",
    label: "Enterprise IdP",
    paid: true
  },
  {
    action: "Customize",
    description: "Update logos, colors, and workspace presentation.",
    href: "/organization",
    label: "Branding",
    paid: true
  },
  {
    action: "Book",
    description: "Search compliant fares and book travel for employees.",
    href: "/bookings",
    label: "Flight booking"
  },
  {
    action: "Review",
    description: "Track payment settings, monthly caps, and invoices.",
    href: "/organization",
    label: "Billing"
  }
];

const adminStats = [
  { label: "Policy compliance", value: "96%", trend: "+8% this quarter" },
  { label: "Managed employees", value: "438", trend: "24 invited this month" },
  { label: "Role assignments", value: "57", trend: "8 admins active" },
  { label: "Monthly travel spend", value: "$128K", trend: "12% under budget" }
];

const fares = [
  { route: "Colombo to Singapore", cabin: "Economy", price: "$482", status: "In policy" },
  { route: "Colombo to Tokyo", cabin: "Premium economy", price: "$1,320", status: "Approval required" },
  { route: "Colombo to London", cabin: "Economy", price: "$1,140", status: "In policy" }
];

function AdminDashboard() {
  return (
    <>
      <section className="command-panel">
        <div>
          <p className="eyebrow">Management console</p>
          <h2>Control policies, people, access, booking, and billing from one workspace.</h2>
          <p>
            Admins can operate the full travel program, including employee policy controls, access
            management, paid identity and branding add-ons, flight booking, and payment oversight.
          </p>
        </div>
        <div className="action-cluster">
          <Link className="button button-primary" href="/requests">
            Set policy
          </Link>
          <Link className="button button-secondary" href="/organization">
            Manage users
          </Link>
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

      <section className="workspace-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Admin capabilities</p>
            <h2>Management tools</h2>
          </div>
          <Link className="button button-secondary" href="/bookings">
            Do flight booking
          </Link>
        </div>
        <div className="capability-grid">
          {managementCapabilities.map((capability) => (
            <Link className="capability-card" href={capability.href} key={capability.label}>
              <span>{capability.action}</span>
              <strong>{capability.label}</strong>
              <p>{capability.description}</p>
              {capability.paid ? <em>Paid feature</em> : null}
            </Link>
          ))}
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
        </div>
        <form className="search-form search-form-horizontal">
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

      <section className="workspace-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Available flights</p>
            <h2>Options</h2>
          </div>
          <Link className="button button-secondary" href="/bookings">
            Open booking
          </Link>
        </div>
        <div className="flight-list">
          {fares.map((fare) => (
            <article className="flight-row" key={fare.route}>
              <div>
                <strong>{fare.route}</strong>
                <span>{fare.cabin}</span>
              </div>
              <strong>{fare.price}</strong>
              <em className={fare.status === "In policy" ? "success-pill" : "warning-pill"}>
                {fare.status}
              </em>
              <button className="button button-secondary">Select</button>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const role = user ? getRoleFromPermissions(user.permissions) : UserRole.MEMBER;

  return (
    <WorkspaceShell
      activeHref={role === UserRole.ADMIN ? "/dashboard" : "/bookings"}
      eyebrow={role === UserRole.ADMIN ? "Admin workspace" : "Member workspace"}
      role={role}
      title={role === UserRole.ADMIN ? "Management console" : "Flight booking"}
    >
      {role === UserRole.ADMIN ? <AdminDashboard /> : <MemberDashboard />}
    </WorkspaceShell>
  );
}
