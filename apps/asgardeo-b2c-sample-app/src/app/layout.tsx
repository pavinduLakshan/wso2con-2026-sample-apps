import { AsgardeoProvider } from "@asgardeo/nextjs/server";
import "./globals.css";

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AsgardeoProvider
          baseUrl={process.env.NEXT_PUBLIC_ASGARDEO_BASE_URL}
          afterSignInUrl={process.env.NEXT_PUBLIC_ASGARDEO_SIGN_IN_REDIRECT_URL || "http://localhost:3000/api/auth/callback/asgardeo"}
          afterSignOutUrl={process.env.NEXT_PUBLIC_ASGARDEO_SIGN_OUT_REDIRECT_URL || "http://localhost:3000"}
          clientId={process.env.NEXT_PUBLIC_ASGARDEO_CLIENT_ID || ""}
          clientSecret={process.env.ASGARDEO_CLIENT_SECRET || ""}
          scopes={["openid", "profile", "email"]}
        >
          {children}
        </AsgardeoProvider>
      </body>
    </html>
  );
}
