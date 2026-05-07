import type { Metadata } from "next";
import { AsgardeoProvider } from "@asgardeo/nextjs/server";
import "./globals.css";

export const metadata: Metadata = {
  title: "VoyageOps",
  description: "B2B travel management secured with Asgardeo"
};

export const dynamic = "force-dynamic";

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AsgardeoProvider>{children}</AsgardeoProvider>
      </body>
    </html>
  );
}
