"use client";

import { SignOutButton, SignedIn } from "@asgardeo/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div>
      <nav className="navbar">
        <Link href="/" className="navbar-brand">
          Wander<span>Wise</span>
        </Link>
        <ul className="navbar-nav">
          <Link href="/search" className={`nav-link ${pathname === "/search" ? "active" : ""}`}>Search</Link>
          <Link href="/bookings" className={`nav-link ${pathname === "/bookings" ? "active" : ""}`}>My Bookings</Link>
          <Link href="/alerts" className={`nav-link ${pathname === "/alerts" ? "active" : ""}`}>Alerts</Link>
          <SignedIn>
            <SignOutButton>
              <button className="btn btn-outline btn-sm">Sign Out</button>
            </SignOutButton>
          </SignedIn>
        </ul>
      </nav>
      <main>{children}</main>
    </div>
  );
}
