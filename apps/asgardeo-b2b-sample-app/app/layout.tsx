import type { Metadata } from "next";
import { headers } from "next/headers";
import { AuthProvider } from "./lib/auth/client";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wayfinder Enterprise",
  description: "Enterprise travel management for teams"
};

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const url = headersList.get("x-url") ?? "/";
  const urlParams = new URLSearchParams(url.split("?")[1] ?? "");
  const hasCode = urlParams.has("code");
  const hasOrgId = urlParams.has("orgId");

  return (
    <html lang="en">
      <body>
        <AuthProvider initialIsExchanging={hasCode || hasOrgId}>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
