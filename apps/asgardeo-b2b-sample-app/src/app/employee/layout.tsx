"use client";

import { SignOutButton } from "@asgardeo/nextjs";
import Link from "next/link";

export default function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <nav className="navbar">
        <div className="container">
          <Link href="/" className="navbar-brand">
            TravelDesk
          </Link>
          <ul className="navbar-nav">
            <li><Link href="/employee">Search</Link></li>
            <li><Link href="/employee/requests">My Requests</Link></li>
            <li><SignOutButton /></li>
          </ul>
        </div>
      </nav>
      <div className="container" style={{ paddingTop: "2rem", paddingBottom: "4rem" }}>
        {children}
      </div>
    </div>
  );
}
