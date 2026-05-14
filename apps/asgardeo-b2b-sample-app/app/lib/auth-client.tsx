"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import LoadingScreen from "../LoadingScreen";

type User = Record<string, unknown>;

interface SignInOptions {
  fidp?: string;
  org?: string;
  orgId?: string;
}

interface AuthState {
  isSignedIn: boolean;
  accessToken: string | null;
  idToken: string | null;
  user: User | null;
  signIn: (options?: SignInOptions) => void;
  signOut: () => void;
  switchOrganization: (org: { name?: string; orgId?: string }) => void;
}

const AuthContext = createContext<AuthState>({
  isSignedIn: false,
  accessToken: null,
  idToken: null,
  user: null,
  signIn: () => {},
  signOut: () => {},
  switchOrganization: () => {}
});

function decodeJwtPayload(token: string): User | null {
  const [, payload] = token.split(".");

  if (!payload) {
    return null;
  }

  try {
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(base64);
    return JSON.parse(json) as User;
  } catch {
    return null;
  }
}

function buildAuthorizeUrl(options?: SignInOptions): string {
  const baseUrl = process.env.NEXT_PUBLIC_ASGARDEO_BASE_URL ?? "";
  const clientId = process.env.NEXT_PUBLIC_ASGARDEO_CLIENT_ID ?? "";
  const scopes = process.env.NEXT_PUBLIC_ASGARDEO_SCOPES ?? "openid";
  const redirectUri = process.env.NEXT_PUBLIC_ASGARDEO_AFTER_SIGN_IN_URL ?? window.location.origin;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: scopes
  });

  if (options?.fidp) {
    params.set("fidp", options.fidp);
  }

  if (options?.org) {
    params.set("org", options.org);
  }

  if (options?.orgId) {
    params.set("orgId", options.orgId);
  }

  return `${baseUrl}/oauth2/authorize?${params.toString()}`;
}

export function AuthProvider({ children, initialIsExchanging = false }: { children: ReactNode; initialIsExchanging?: boolean }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [isExchanging, setIsExchanging] = useState(initialIsExchanging);
  const [exchangeError, setExchangeError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isOrgRedirecting, setIsOrgRedirecting] = useState(false);
  const exchangingRef = useRef(false);

  useEffect(() => {
    const storedAccess = localStorage.getItem("access_token");
    const storedId = localStorage.getItem("id_token");

    if (storedAccess) setAccessToken(storedAccess);
    if (storedId) setIdToken(storedId);
  }, []);

  const storeToken = useCallback((access: string, id?: string) => {
    localStorage.setItem("access_token", access);
    setAccessToken(access);

    if (id) {
      localStorage.setItem("id_token", id);
      setIdToken(id);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    if (!code || exchangingRef.current) {
      return;
    }

    setIsExchanging(true);
    exchangingRef.current = true;

    const url = new URL(window.location.href);
    url.searchParams.delete("code");
    url.searchParams.delete("session_state");
    window.history.replaceState({}, "", url.toString());

    fetch("/api/auth/token", {
      body: JSON.stringify({ code }),
      headers: { "Content-Type": "application/json" },
      method: "POST"
    })
      .then((res) => res.json())
      .then((data: { access_token?: string; id_token?: string; error?: string }) => {
        if (data.access_token) {
          storeToken(data.access_token, data.id_token);
          setIsExchanging(false);
        } else {
          setExchangeError(data.error ?? "Authentication failed. Please try again.");
        }
      })
      .catch(() => {
        setExchangeError("Authentication failed. Please try again.");
      })
      .finally(() => {
        exchangingRef.current = false;
      });
  }, [storeToken]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orgId = params.get("orgId");

    if (!orgId) {
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.delete("orgId");
    window.history.replaceState({}, "", url.toString());

    setIsOrgRedirecting(true);
    window.location.href = buildAuthorizeUrl({ fidp: "OrganizationSSO", orgId });
  }, []);

  const signIn = useCallback((options?: SignInOptions) => {
    setIsSigningIn(true);
    window.location.href = buildAuthorizeUrl(options);
  }, []);

  const signOut = useCallback(() => {
    setIsSigningOut(true);
    const currentIdToken = idToken;
    localStorage.removeItem("access_token");
    localStorage.removeItem("id_token");
    setAccessToken(null);
    setIdToken(null);

    const baseUrl = process.env.NEXT_PUBLIC_ASGARDEO_BASE_URL ?? "";
    const clientId = process.env.NEXT_PUBLIC_ASGARDEO_CLIENT_ID ?? "";
    const redirectUri = process.env.NEXT_PUBLIC_ASGARDEO_AFTER_SIGN_OUT_URL ?? window.location.origin;

    if (currentIdToken && baseUrl && clientId) {
      const form = document.createElement("form");
      form.method = "POST";
      form.action = `${baseUrl}/oidc/logout`;

      const addField = (name: string, value: string) => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = name;
        input.value = value;
        form.appendChild(input);
      };

      addField("client_id", clientId);
      addField("post_logout_redirect_uri", redirectUri);
      addField("id_token_hint", currentIdToken);

      document.body.appendChild(form);
      form.submit();
    } else {
      window.location.assign("/");
    }
  }, [idToken]);

  const switchOrganization = useCallback((org: { name?: string; orgId?: string }) => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("id_token");
    setAccessToken(null);
    setIdToken(null);
    window.location.href = buildAuthorizeUrl({ fidp: "OrganizationSSO", org: org.name, orgId: org.orgId });
  }, []);

  const user = accessToken ? decodeJwtPayload(accessToken) : null;

  return (
    <AuthContext.Provider
      value={{
        accessToken,
        idToken,
        isSignedIn: !!accessToken,
        signIn,
        signOut,
        switchOrganization,
        user
      }}
    >
      {children}
      {(isSigningIn || isOrgRedirecting) && (
        <LoadingScreen
          description="You will be redirected to the identity provider shortly."
          steps={[]}
          title="Redirecting…"
        />
      )}
      {isSigningOut && (
        <LoadingScreen
          description="Clearing your session with the identity provider."
          steps={[]}
          title="Signing you out…"
        />
      )}
      {(isExchanging || exchangeError) && (
        <LoadingScreen
          description="Please wait while we complete your sign-in."
          error={exchangeError ?? undefined}
          steps={[]}
          title="Signing you in…"
        />
      )}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
