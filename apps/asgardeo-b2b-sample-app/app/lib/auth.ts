export type UserRole = "ADMIN" | "MEMBER";

function normalizeRole(value: unknown): UserRole | null {
  const values = Array.isArray(value) ? value : typeof value === "string" ? value.split(/[,\s]+/) : [];
  const normalizedValues = values.map((item) => String(item).toLowerCase());

  if (normalizedValues.some((item) => item === "admin" || item.endsWith("/admin") || item.endsWith(":admin"))) {
    return "ADMIN";
  }

  if (normalizedValues.some((item) => item === "member" || item.endsWith("/member") || item.endsWith(":member"))) {
    return "MEMBER";
  }

  return null;
}

export async function getCurrentUserRole(): Promise<UserRole> {
  return normalizeRole(process.env.DEMO_USER_ROLE ?? process.env.NEXT_PUBLIC_DEMO_ROLE) ?? "MEMBER";
}
