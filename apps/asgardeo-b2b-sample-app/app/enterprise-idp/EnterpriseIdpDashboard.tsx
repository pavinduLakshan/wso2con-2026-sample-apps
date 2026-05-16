"use client";

import { useEffect, useState } from "react";
import WorkspaceShell from "../WorkspaceShell";
import { useAuth } from "../lib/auth/client";
import { UserRole } from "../lib/auth/utils";

interface IdpConfig {
  name: string;
  clientId: string;
  clientSecret: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  jwksUri: string;
}

interface IdpDetail extends IdpConfig {
  id: string;
}

const EMPTY_FORM: IdpConfig = {
  name: "",
  clientId: "",
  clientSecret: "",
  authorizationEndpoint: "",
  tokenEndpoint: "",
  jwksUri: "",
};

export default function EnterpriseIdpDashboard({ roles }: { roles: UserRole[] }) {
  const { accessToken } = useAuth();

  const [idp, setIdp] = useState<IdpDetail | null>(null);
  const [form, setForm] = useState<IdpConfig>(EMPTY_FORM);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canManage = roles.includes(UserRole.IDP_MANAGER);

  useEffect(() => {
    if (!accessToken) return;

    const controller = new AbortController();

    setIsLoading(true);
    fetch("/api/organization/enterprise-idp", {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data: { idp?: IdpDetail | null; error?: string }) => {
        if (data.error) {
          setError(data.error);
        } else {
          setIdp(data.idp ?? null);
        }
      })
      .catch((err) => {
        if (err instanceof Error && err.name !== "AbortError") {
          setError("Failed to load identity provider configuration.");
        }
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [accessToken]);

  function handleEdit() {
    if (idp) {
      setForm({
        name: idp.name,
        clientId: idp.clientId,
        clientSecret: idp.clientSecret,
        authorizationEndpoint: idp.authorizationEndpoint,
        tokenEndpoint: idp.tokenEndpoint,
        jwksUri: idp.jwksUri,
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setError(null);
    setIsEditing(true);
  }

  function handleCancel() {
    setIsEditing(false);
    setError(null);
  }

  async function handleSave() {
    if (!accessToken) return;

    setIsSaving(true);
    setError(null);

    const method = idp ? "PUT" : "POST";

    try {
      const res = await fetch("/api/organization/enterprise-idp", {
        method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await res.json() as { idp?: IdpDetail; error?: string };

      if (!res.ok || data.error) {
        setError(data.error ?? "Failed to save identity provider.");
        return;
      }

      setIdp(data.idp ?? null);
      setIsEditing(false);
    } catch {
      setError("Failed to save identity provider.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!accessToken || !idp) return;

    setIsDeleting(true);
    setError(null);

    try {
      const res = await fetch("/api/organization/enterprise-idp", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setError(data.error ?? "Failed to delete identity provider.");
        return;
      }

      setIdp(null);
      setForm(EMPTY_FORM);
    } catch {
      setError("Failed to delete identity provider.");
    } finally {
      setIsDeleting(false);
    }
  }

  const field = (key: keyof IdpConfig) => (isEditing ? form[key] : (idp?.[key as keyof IdpDetail] as string | undefined) ?? "");
  const setField = (key: keyof IdpConfig) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <WorkspaceShell
      activeHref="/enterprise-idp"
      eyebrow="Admin workspace"
      roles={roles}
      title="Enterprise identity provider"
    >
      <section className="command-panel">
        <div>
          <p className="eyebrow">Single Sign-On</p>
          <h2>Connect your enterprise identity provider.</h2>
          <p>
            Configure an OIDC provider to enable enterprise SSO so employees sign in through your
            existing identity provider.
          </p>
        </div>
      </section>

      <div className="tab-content">
        <section className="workspace-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Single Sign-On · OIDC</p>
              <h2>Enterprise identity provider</h2>
            </div>
            {canManage && (
              <div className="action-cluster">
                {idp && !isEditing && (
                  <>
                    <button className="button button-secondary" type="button" onClick={handleEdit}>
                      Edit
                    </button>
                    <button
                      className="button"
                      type="button"
                      disabled={isDeleting}
                      style={{ background: "#fff5f5", border: "1px solid #fecaca", color: "#b91c1c" }}
                      onClick={handleDelete}
                    >
                      {isDeleting ? "Deleting…" : "Delete"}
                    </button>
                  </>
                )}
                {!idp && !isEditing && !isLoading && (
                  <button className="button button-primary" type="button" onClick={handleEdit}>
                    Configure IdP
                  </button>
                )}
              </div>
            )}
          </div>

          {error && (
            <div style={{ marginTop: "12px", padding: "10px 14px", background: "#fff5f5", border: "1px solid #fecaca", borderRadius: "6px", color: "#b91c1c", fontSize: "14px" }}>
              {error}
            </div>
          )}

          {isLoading && (
            <p style={{ marginTop: "16px", color: "var(--color-text-subtle, #6b7280)" }}>
              Loading…
            </p>
          )}

          {!isLoading && !idp && !isEditing && (
            <div className="idp-empty-state">
              <div className="idp-empty-icon">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <rect x="4" y="8" width="24" height="16" rx="3" stroke="currentColor" strokeWidth="1.8" />
                  <circle cx="16" cy="16" r="4" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M10 8V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="1.6" />
                </svg>
              </div>
              <h3>No identity provider configured</h3>
              <p>Connect an OIDC provider to enable enterprise SSO for your organization.</p>
              {canManage && (
                <button className="button button-primary" type="button" onClick={handleEdit}>
                  Configure OIDC provider
                </button>
              )}
            </div>
          )}

          {!isLoading && (isEditing || idp) && (
            <div style={{ marginTop: "18px", display: "grid", gap: "20px" }}>
              <div className="idp-form-grid">
                <label className="form-field-label" style={{ gridColumn: "1 / -1" }}>
                  Name <span style={{ color: "#b91c1c" }}>*</span>
                  <input
                    className="form-field-input"
                    placeholder="My Enterprise IdP"
                    type="text"
                    readOnly={!isEditing || !canManage}
                    value={field("name")}
                    onChange={setField("name")}
                  />
                </label>
                <label className="form-field-label">
                  Client ID <span style={{ color: "#b91c1c" }}>*</span>
                  <input
                    className="form-field-input"
                    placeholder="your-client-id"
                    type="text"
                    readOnly={!isEditing || !canManage}
                    value={field("clientId")}
                    onChange={setField("clientId")}
                  />
                </label>
                <label className="form-field-label">
                  Client Secret <span style={{ color: "#b91c1c" }}>*</span>
                  <input
                    className="form-field-input"
                    placeholder="••••••••••••••••"
                    type={isEditing && canManage ? "text" : "password"}
                    readOnly={!isEditing || !canManage}
                    value={field("clientSecret")}
                    onChange={setField("clientSecret")}
                  />
                </label>
                <label className="form-field-label">
                  Authorization Endpoint URL <span style={{ color: "#b91c1c" }}>*</span>
                  <input
                    className="form-field-input"
                    placeholder="https://idp.example.com/oauth2/authorize"
                    type="url"
                    readOnly={!isEditing || !canManage}
                    value={field("authorizationEndpoint")}
                    onChange={setField("authorizationEndpoint")}
                  />
                </label>
                <label className="form-field-label">
                  Token Endpoint URL <span style={{ color: "#b91c1c" }}>*</span>
                  <input
                    className="form-field-input"
                    placeholder="https://idp.example.com/oauth2/token"
                    type="url"
                    readOnly={!isEditing || !canManage}
                    value={field("tokenEndpoint")}
                    onChange={setField("tokenEndpoint")}
                  />
                </label>
                <label className="form-field-label" style={{ gridColumn: "1 / -1" }}>
                  JWKS Endpoint <span style={{ color: "var(--color-text-subtle, #6b7280)", fontSize: "12px", fontWeight: 400 }}>(optional)</span>
                  <input
                    className="form-field-input"
                    placeholder="https://idp.example.com/oauth2/jwks"
                    type="url"
                    readOnly={!isEditing || !canManage}
                    value={field("jwksUri")}
                    onChange={setField("jwksUri")}
                  />
                </label>
              </div>

              {isEditing && canManage && (
                <div className="action-cluster">
                  <button
                    className="button button-primary"
                    type="button"
                    disabled={isSaving}
                    onClick={handleSave}
                  >
                    {isSaving ? "Saving…" : "Save configuration"}
                  </button>
                  <button className="button button-secondary" type="button" onClick={handleCancel}>
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </WorkspaceShell>
  );
}
