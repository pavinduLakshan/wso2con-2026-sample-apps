"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/auth/client";
import { getRoleFromPermissions, UserRole } from "../lib/auth/utils";
import LoadingScreen from "../LoadingScreen";

export default function Dashboard() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    const role = user ? getRoleFromPermissions(user.permissions) : UserRole.MEMBER;
    router.replace(role === UserRole.ADMIN ? "/requests" : "/bookings");
  }, [isLoading, user, router]);

  return <LoadingScreen description="Taking you to your workspace…" steps={[]} title="Loading…" />;
}
