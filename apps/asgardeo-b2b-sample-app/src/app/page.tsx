"use client";

import { useAsgardeo, SignInButton, SignOutButton, SignedIn, SignedOut } from "@asgardeo/nextjs";
import Link from "next/link";

export default function HomePage() {
  return (
    <div>
      <nav className="navbar">
        <div className="container">
          <Link href="/" className="navbar-brand">
            TravelDesk
          </Link>
          <ul className="navbar-nav">
            <li><Link href="/">Home</Link></li>
            <SignedIn>
              <li><Link href="/employee">Dashboard</Link></li>
              <li><SignOutButton /></li>
            </SignedIn>
            <SignedOut>
              <li><SignInButton /></li>
            </SignedOut>
          </ul>
        </div>
      </nav>

      <section className="hero">
        <div className="container">
          <h1>Corporate Travel Made Simple</h1>
          <p>
            Search flights and hotels, submit travel requests, and get approvals
            all in one place. Powered by Asgardeo B2B authentication.
          </p>
          <div className="mt-3">
            <SignedIn>
              <Link href="/employee" className="btn btn-primary">
                Go to Dashboard
              </Link>
            </SignedIn>
            <SignedOut>
              <SignInButton>
                <span className="btn btn-primary">Sign In to Get Started</span>
              </SignInButton>
            </SignedOut>
          </div>
        </div>
      </section>

      <section style={{ padding: "4rem 0" }}>
        <div className="container">
          <h2 className="section-title" style={{ textAlign: "center" }}>
            How It Works
          </h2>
          <div className="grid grid-3 mt-3">
            <div className="card" style={{ textAlign: "center" }}>
              <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>&#x1F310;</div>
              <h3>Organization Onboarding</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                Register your organization and onboard employees with role-based access control.
              </p>
            </div>
            <div className="card" style={{ textAlign: "center" }}>
              <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>&#x2708;&#xFE0F;</div>
              <h3>Search & Request</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                Employees search flights and hotels, then submit travel arrangement requests.
              </p>
            </div>
            <div className="card" style={{ textAlign: "center" }}>
              <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>&#x2705;</div>
              <h3>Admin Approval</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                Organization administrators review and approve or reject travel requests.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer style={{ background: "var(--primary)", color: "white", padding: "2rem 0", textAlign: "center", fontSize: "0.875rem" }}>
        <div className="container">
          <p>TravelDesk &mdash; Asgardeo B2B Sample Application</p>
        </div>
      </footer>
    </div>
  );
}
