import Link from "next/link";
import { SignOutButton, UserDropdown } from "@asgardeo/nextjs";

const travelStats = [
  { label: "Active organizations", value: "12" },
  { label: "Employees invited", value: "438" },
  { label: "Open allocation requests", value: "26" },
  { label: "Bookings this month", value: "184" }
];

const pendingRequests = [
  {
    traveler: "Ava Fernando",
    route: "Colombo to Tokyo",
    type: "Flight allocation",
    status: "Needs approval"
  },
  {
    traveler: "Nimal Perera",
    route: "Singapore hotel",
    type: "Hotel budget",
    status: "Policy review"
  },
  {
    traveler: "Maya Silva",
    route: "London client visit",
    type: "Trip package",
    status: "Manager review"
  }
];

export default function Dashboard() {
  return (
    <main className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/">
          VoyageOps
        </Link>
        <nav className="side-nav" aria-label="Workspace navigation">
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/bookings">Bookings</Link>
          <Link href="/requests">Requests</Link>
          <Link href="/organization">Organization</Link>
        </nav>
      </aside>

      <section className="workspace">
        <header className="workspace-header">
          <div>
            <p className="eyebrow">Secure workspace</p>
            <h1>Travel operations</h1>
          </div>
          <div className="profile-actions">
            <UserDropdown />
            <SignOutButton className="button button-ghost">Sign out</SignOutButton>
          </div>
        </header>

        <section className="welcome-panel">
          <div>
            <p className="eyebrow">Signed in as</p>
            <h2>Authenticated user</h2>
          </div>
          <p>
            This protected route is ready for the organization registration,
            employee invitation, booking search, and allocation request flows.
          </p>
        </section>

        <section className="stats-grid" aria-label="Travel operations summary">
          {travelStats.map((stat) => (
            <article className="stat-card" key={stat.label}>
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
            </article>
          ))}
        </section>

        <section className="requests-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Allocation queue</p>
              <h2>Pending requests</h2>
            </div>
            <Link className="button button-secondary" href="/requests">
              Review all
            </Link>
          </div>
          <div className="request-list">
            {pendingRequests.map((request) => (
              <article className="request-row" key={request.traveler}>
                <div>
                  <strong>{request.traveler}</strong>
                  <span>{request.route}</span>
                </div>
                <span>{request.type}</span>
                <em>{request.status}</em>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
