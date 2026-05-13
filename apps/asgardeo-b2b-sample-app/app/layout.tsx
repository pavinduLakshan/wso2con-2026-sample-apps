import type { Metadata } from "next";
import { AsgardeoProvider } from "@asgardeo/nextjs/server";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wayfinder Enterprise",
  description: "Enterprise travel management for teams"
};

export const dynamic = "force-dynamic";

const asgardeoClientSecret = process.env.ASGARDEO_CLIENT_SECRET ?? process.env.NEXT_PUBLIC_ASGARDEO_CLIENT_SECRET;
const afterSignInUrl = "/dashboard";
const afterSignOutUrl = "/";

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AsgardeoProvider
          afterSignInUrl={afterSignInUrl}
          afterSignOutUrl={afterSignOutUrl}
          baseUrl={process.env.NEXT_PUBLIC_ASGARDEO_BASE_URL}
          clientId={process.env.NEXT_PUBLIC_ASGARDEO_CLIENT_ID}
          clientSecret={asgardeoClientSecret}
          scopes={process.env.NEXT_PUBLIC_ASGARDEO_SCOPES}
        >
          {children}
        </AsgardeoProvider>
      </body>
    </html>
  );
}
