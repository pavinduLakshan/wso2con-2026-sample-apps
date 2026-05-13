"use client";

import Link from "next/link";
import { SignInButton, SignOutButton, useAsgardeo } from "@asgardeo/nextjs";

type UserRecord = Record<string, unknown>;

function getStringValue(user: UserRecord | undefined, keys: string[]) {
  for (const key of keys) {
    const value = user?.[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function getEmail(user: UserRecord | undefined) {
  const emails = user?.emails;

  if (Array.isArray(emails)) {
    for (const email of emails) {
      if (typeof email === "string" && email.trim()) {
        return email.trim();
      }

      if (email && typeof email === "object" && "value" in email && typeof email.value === "string") {
        return email.value.trim();
      }
    }
  }

  return getStringValue(user, [
    "email",
    "mail",
    "userName",
    "username",
    "preferred_username",
    "http://wso2.org/claims/emailaddress"
  ]);
}

function getDisplayName(user: UserRecord | undefined) {
  const directName = getStringValue(user, ["displayName", "fullName", "name"]);

  if (directName) {
    return directName;
  }

  const name = user?.name;

  if (name && typeof name === "object") {
    const givenName = "givenName" in name && typeof name.givenName === "string" ? name.givenName : "";
    const familyName = "familyName" in name && typeof name.familyName === "string" ? name.familyName : "";
    const formatted = "formatted" in name && typeof name.formatted === "string" ? name.formatted : "";
    const composed = `${givenName} ${familyName}`.trim();

    return composed || formatted;
  }

  const givenName = getStringValue(user, ["given_name", "givenName", "firstName"]);
  const familyName = getStringValue(user, ["family_name", "familyName", "lastName"]);
  const composed = `${givenName} ${familyName}`.trim();
  const email = getEmail(user);
  const emailName = email ? email.split("@")[0] : "";

  return composed || emailName || "Workspace user";
}

function getFirstName(displayName: string) {
  return displayName.split(/\s+/)[0] || displayName;
}

function getInitials(displayName: string) {
  const parts = displayName.split(/\s+/).filter(Boolean);
  const initials = parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : displayName.slice(0, 2);

  return initials.toUpperCase();
}

function useLandingUser() {
  const { isSignedIn, user } = useAsgardeo();
  const userRecord = user && typeof user === "object" ? (user as UserRecord) : undefined;
  const displayName = getDisplayName(userRecord);
  const email = getEmail(userRecord);

  return {
    displayName,
    email,
    firstName: displayName === "Workspace user" ? "there" : getFirstName(displayName),
    initials: getInitials(displayName),
    isSignedIn: Boolean(isSignedIn)
  };
}

export function LandingHeader() {
  const { displayName, email, initials, isSignedIn } = useLandingUser();

  return (
    <nav className="topbar public-topbar">
      <Link className="brand" href="/">
        Wayfinder Enterprise
      </Link>
      <div className="public-nav-links" aria-label="Landing page sections">
        <a href="#platform">Platform</a>
        <a href="#workflow">Workflow</a>
        <a href="#outcomes">Outcomes</a>
      </div>
      <div className="nav-actions">
        {isSignedIn ? (
          <>
            <div className="header-user" aria-label="Current user">
              <span className="header-user-avatar" aria-hidden="true">
                {initials}
              </span>
              <span className="header-user-copy">
                <strong>{displayName}</strong>
                {email ? <span>{email}</span> : null}
              </span>
            </div>
            <Link className="button button-secondary" href="/dashboard">
              Dashboard
            </Link>
            <SignOutButton className="button button-ghost">Sign out</SignOutButton>
          </>
        ) : (
          <>
            <Link className="button button-secondary" href="/onboarding">
              Onboard
            </Link>
            <SignInButton className="button button-primary">Sign in</SignInButton>
          </>
        )}
      </div>
    </nav>
  );
}

export function LandingHeroCopy() {
  const { firstName, isSignedIn } = useLandingUser();

  if (isSignedIn) {
    return (
      <div className="hero-copy">
        <p className="eyebrow">Welcome back</p>
        <h1>Good to see you, {firstName}.</h1>
        <p className="hero-text">
          Your travel workspace is ready for today&apos;s requests, approvals, policy checks, and spend reviews.
        </p>
        <div className="hero-actions">
          <Link className="button button-primary" href="/dashboard">
            Open workspace
          </Link>
          <Link className="button button-secondary" href="/bookings">
            Book flight
          </Link>
        </div>
        <div className="hero-proof" aria-label="Platform highlights">
          <span>Workspace ready</span>
          <span>Policy-aware booking</span>
          <span>Spend review live</span>
        </div>
      </div>
    );
  }

  return (
    <div className="hero-copy">
      <p className="eyebrow">Enterprise Travel Management</p>
      <h1>Corporate travel control for every client workspace.</h1>
      <p className="hero-text">
        Coordinate flights, approvals, travel policies, and spend across multiple workspaces with a platform built for
        agencies and enterprise travel teams.
      </p>
      <div className="hero-actions">
        <Link className="button button-primary" href="/onboarding">
          Get started
        </Link>
        <SignInButton className="button button-secondary">View demo workspace</SignInButton>
      </div>
      <div className="hero-proof" aria-label="Platform highlights">
        <span>Multi-workspace controls</span>
        <span>Policy-aware booking</span>
        <span>Centralized spend review</span>
      </div>
    </div>
  );
}
