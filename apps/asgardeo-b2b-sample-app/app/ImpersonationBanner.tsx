"use client";

import { useEffect, useState } from "react";

export default function ImpersonationBanner() {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => setName(localStorage.getItem("wayfinder.impersonating"));
    sync();
    window.addEventListener("wayfinder:impersonation", sync);
    return () => window.removeEventListener("wayfinder:impersonation", sync);
  }, []);

  if (!name) return null;

  function exit() {
    localStorage.removeItem("wayfinder.impersonating");
    window.dispatchEvent(new Event("wayfinder:impersonation"));
  }

  return (
    <div className="impersonation-banner" role="alert">
      <span>
        You are currently impersonating <strong>{name}</strong>.
      </span>
      <button onClick={exit} type="button">
        Exit Impersonation
      </button>
    </div>
  );
}
