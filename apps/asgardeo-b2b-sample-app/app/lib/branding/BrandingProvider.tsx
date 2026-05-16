"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "../auth/client";

export interface BrandingConfig {
  primaryColor: string;
  secondaryColor: string;
  textPrimaryColor: string;
  fontFamily: string;
  fontImportUrl: string;
  logoUrl: string;
  faviconUrl: string;
  displayName: string;
  supportEmail: string;
}

interface BrandingState {
  branding: BrandingConfig | null;
}

const BrandingContext = createContext<BrandingState>({ branding: null });

export function BrandingProvider({ children }: { children: ReactNode }) {
  const { accessToken, isSignedIn } = useAuth();
  const [branding, setBranding] = useState<BrandingConfig | null>(null);

  useEffect(() => {
    if (!isSignedIn || !accessToken) return;

    fetch("/api/organization/branding", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((res) => res.json())
      .then((data: { branding?: BrandingConfig | null }) => {
        setBranding(data.branding ?? null);
      })
      .catch(() => {});
  }, [isSignedIn, accessToken]);

  useEffect(() => {
    if (!branding) return;

    const root = document.documentElement;
    root.style.setProperty("--primary", branding.primaryColor);
    root.style.setProperty("--accent", branding.secondaryColor);
    root.style.setProperty("--foreground", branding.textPrimaryColor);

    if (branding.fontImportUrl) {
      const styleId = "branding-font-import";
      let el = document.getElementById(styleId) as HTMLStyleElement | null;
      if (!el) {
        el = document.createElement("style");
        el.id = styleId;
        document.head.appendChild(el);
      }
      el.textContent = `@import url('${branding.fontImportUrl}');`;
    }

    if (branding.fontFamily) {
      document.body.style.fontFamily = `${branding.fontFamily}, Inter, sans-serif`;
    }

    if (branding.faviconUrl) {
      const link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
      if (link) link.href = branding.faviconUrl;
    }
  }, [branding]);

  return (
    <BrandingContext.Provider value={{ branding }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding(): BrandingState {
  return useContext(BrandingContext);
}
