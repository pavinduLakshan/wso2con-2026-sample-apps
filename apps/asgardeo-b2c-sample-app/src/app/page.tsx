"use client";

import { SignInButton, SignOutButton, SignedIn, SignedOut } from "@asgardeo/nextjs";
import Link from "next/link";

export default function HomePage() {
  return (
    <div>
      <nav className="navbar">
        <Link href="/" className="navbar-brand">
          Wander<span>Wise</span>
        </Link>
        <ul className="navbar-nav">
          <SignedIn>
            <Link href="/search" className="nav-link">Search</Link>
            <Link href="/bookings" className="nav-link">My Bookings</Link>
            <Link href="/alerts" className="nav-link">Alerts</Link>
            <SignOutButton>
              <button className="btn btn-outline btn-sm">Sign Out</button>
            </SignOutButton>
          </SignedIn>
          <SignedOut>
            <SignInButton>
              <button className="btn btn-primary btn-sm">Sign In</button>
            </SignInButton>
          </SignedOut>
        </ul>
      </nav>

      <section className="hero">
        <h1>
          Discover & Book<br />
          Your Next <span>Adventure</span>
        </h1>
        <p>
          Search hundreds of flights and hotels worldwide. Book instantly,
          manage your trips, and get smart price alerts — all in one place.
        </p>
        <div className="hero-actions">
          <SignedIn>
            <Link href="/search" className="btn btn-lg" style={{ background: "white", color: "var(--primary)" }}>
              Start Exploring
            </Link>
          </SignedIn>
          <SignedOut>
            <SignInButton>
              <button className="btn btn-lg" style={{ background: "white", color: "var(--primary)" }}>
                Get Started Free
              </button>
            </SignInButton>
          </SignedOut>
        </div>
      </section>

      <section className="features-section">
        <div className="container">
          <div className="grid-3">
            <div className="card feature-card">
              <div className="feature-icon">&#9992;</div>
              <h3>Search Flights</h3>
              <p>Compare hundreds of flights from top airlines worldwide and find the best deals for your journey.</p>
            </div>
            <div className="card feature-card">
              <div className="feature-icon">&#127968;</div>
              <h3>Find Hotels</h3>
              <p>Browse curated hotels from budget-friendly stays to luxury resorts with real-time pricing.</p>
            </div>
            <div className="card feature-card">
              <div className="feature-icon">&#128276;</div>
              <h3>Price Alerts</h3>
              <p>Set custom alerts for price drops on flights and hotels. Get notified and confirm bookings instantly.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="features-section" style={{ background: "var(--surface)", paddingTop: "0" }}>
        <div className="container text-center">
          <h2 className="section-title">How It Works</h2>
          <p className="section-subtitle mb-4">Plan your perfect trip in three simple steps</p>
          <div className="grid-3 mt-3">
            <div className="card feature-card" style={{ border: "none", boxShadow: "none" }}>
              <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--accent)", marginBottom: "12px" }}>1</div>
              <h3>Search & Compare</h3>
              <p>Enter your destination and dates to browse available flights and hotels with transparent pricing.</p>
            </div>
            <div className="card feature-card" style={{ border: "none", boxShadow: "none" }}>
              <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--accent)", marginBottom: "12px" }}>2</div>
              <h3>Book Instantly</h3>
              <p>Select your preferred flight or hotel and confirm your booking with a single click. No hidden fees.</p>
            </div>
            <div className="card feature-card" style={{ border: "none", boxShadow: "none" }}>
              <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--accent)", marginBottom: "12px" }}>3</div>
              <h3>Stay Updated</h3>
              <p>Set up smart alerts for price drops and receive push notifications to approve changes via Asgardeo CIBA.</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="footer">
        <p>WanderWise &mdash; Powered by Asgardeo B2C Authentication</p>
      </footer>
    </div>
  );
}
