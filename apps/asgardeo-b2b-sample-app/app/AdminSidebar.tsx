"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type NavItem = {
  href: string;
  label: string;
  shortLabel: string;
};

export default function AdminSidebar({
  activeHref,
  navItems
}: Readonly<{
  activeHref: string;
  navItems: NavItem[];
}>) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    setIsCollapsed(window.localStorage.getItem("wayfinder.sidebar.collapsed") === "true");
  }, []);

  function toggleSidebar() {
    setIsCollapsed((current) => {
      const nextValue = !current;

      window.localStorage.setItem("wayfinder.sidebar.collapsed", String(nextValue));

      return nextValue;
    });
  }

  return (
    <aside className={isCollapsed ? "sidebar collapsed" : "sidebar"}>
      <div className="sidebar-top">
        <Link className="sidebar-brand" href="/">
          <span className="sidebar-brand-mark">W</span>
          <span className="sidebar-brand-label">Wayfinder Enterprise</span>
        </Link>
        <button
          aria-label={isCollapsed ? "Expand navigation" : "Collapse navigation"}
          className="sidebar-toggle"
          onClick={toggleSidebar}
          type="button"
        >
          <span aria-hidden="true" />
        </button>
      </div>
      <span className="role-badge">ADMIN</span>
      <nav className="side-nav" aria-label="Workspace navigation">
        {navItems.map((item) => (
          <Link
            aria-label={item.label}
            className={item.href === activeHref ? "active" : undefined}
            href={item.href}
            key={item.href}
            title={isCollapsed ? item.label : undefined}
          >
            <span className="side-nav-icon" aria-hidden="true">
              {item.shortLabel}
            </span>
            <span className="side-nav-label">{item.label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}
