import Link from "next/link";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignOutButton,
  SignUpButton
} from "@asgardeo/nextjs";

export default function Home() {
  return (
    <main className="public-shell">
      <nav className="topbar">
        <Link className="brand" href="/">
          VoyageOps
        </Link>
        <div className="nav-actions">
          <SignedOut>
            <SignInButton className="button button-primary">Sign in</SignInButton>
          </SignedOut>
          <SignedIn>
            <Link className="button button-secondary" href="/dashboard">
              Dashboard
            </Link>
            <SignOutButton className="button button-ghost">Sign out</SignOutButton>
          </SignedIn>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">B2B Travel Management</p>
          <h1>Manage corporate travel across every organization you serve.</h1>
          <p className="hero-text">
            Register organizations, invite employees, search flights and hotels,
            and route allocation requests through a secure Asgardeo-backed app.
          </p>
          <div className="hero-actions">
            <SignedOut>
              <SignUpButton className="button button-primary">Getting Started</SignUpButton>
            </SignedOut>
            <SignedIn>
              <Link className="button button-primary" href="/dashboard">
                Open workspace
              </Link>
            </SignedIn>
          </div>
        </div>
        <div className="travel-board" aria-label="Travel management preview">
          <div className="board-header">
            <span>Q2 Travel Desk</span>
            <strong>84%</strong>
          </div>
          <div className="metric-grid">
            <div>
              <span>Flight requests</span>
              <strong>128</strong>
            </div>
            <div>
              <span>Hotel bookings</span>
              <strong>42</strong>
            </div>
            <div>
              <span>Pending allocations</span>
              <strong>17</strong>
            </div>
          </div>
          <div className="route-card">
            <span>Next review</span>
            <strong>Colombo to Singapore</strong>
            <p>Engineering offsite, 9 travelers</p>
          </div>
        </div>
      </section>
    </main>
  );
}
