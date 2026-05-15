"use client";

import { useAuth } from "../lib/auth-client";
import { getRoleFromPermissions, UserRole } from "../lib/auth";
import BookingsDashboard from "./BookingsDashboard";

export default function BookingsPage() {
  const { user } = useAuth();
  const role = user ? getRoleFromPermissions(user.permissions) : UserRole.MEMBER;

  return <BookingsDashboard role={role} />;
}
