"use client";

import { useState } from "react";
import WorkspaceShell from "../WorkspaceShell";
import { UserRole } from "../lib/auth/utils";

interface IdpConfig {
  clientId: string;
  clientSecret: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  jwksEndpoint: string;
}

const EMPTY_IDP: IdpConfig = { clientId: "", clientSecret: "", authorizationEndpoint: "", tokenEndpoint: "", jwksEndpoint: "" };

export default function EnterpriseIdpDashboard({ roles }: { roles: UserRole[] }) {
  const [idpConfig, setIdpConfig] = useState<IdpConfig | null>(null);
  const [idpForm, setIdpForm] = useState<IdpConfig>(EMPTY_IDP);
  const [idpEditing, setIdpEditing] = useState(false);
  const [showPremiumPreview, setShowPremiumPreview] = useState(false);

  const isPremium = showPremiumPreview;

  function handleIdpSave() {
    setIdpConfig({ ...idpForm });
    setIdpEditing(false);
  }

  function handleIdpEdit() {
    if (idpConfig) setIdpForm({ ...idpConfig });
    setIdpEditing(true);
  }

  function handleIdpDelete() {
    setIdpConfig(null);
    setIdpForm(EMPTY_IDP);
    setIdpEditing(false);
  }

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
        <div className="locked-feature-wrapper">
          <div className={isPremium ? undefined : "locked-feature-content"}>
            <section className="workspace-panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Single Sign-On · OIDC</p>
                  <h2>Enterprise identity provider</h2>
                </div>
                <div className="action-cluster">
                  {idpConfig && !idpEditing && (
                    <>
                      <button className="button button-secondary" type="button" onClick={handleIdpEdit}>
                        Edit
                      </button>
                      <button
                        className="button"
                        type="button"
                        style={{ background: "#fff5f5", border: "1px solid #fecaca", color: "#b91c1c" }}
                        onClick={handleIdpDelete}
                      >
                        Delete
                      </button>
                    </>
                  )}
                  {!idpConfig && !idpEditing && (
                    <button className="button button-primary" type="button" onClick={() => setIdpEditing(true)}>
                      Configure IdP
                    </button>
                  )}
                </div>
              </div>

              {!idpConfig && !idpEditing && (
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
                  <button className="button button-primary" type="button" onClick={() => setIdpEditing(true)}>
                    Configure OIDC provider
                  </button>
                </div>
              )}

              {(idpEditing || idpConfig) && (
                <div style={{ marginTop: "18px", display: "grid", gap: "20px" }}>
                  <div className="idp-form-grid">
                    <label className="form-field-label">
                      Client ID
                      <input
                        className="form-field-input"
                        placeholder="your-client-id"
                        type="text"
                        readOnly={!idpEditing}
                        value={idpEditing ? idpForm.clientId : (idpConfig?.clientId ?? "")}
                        onChange={(e) => setIdpForm((f) => ({ ...f, clientId: e.target.value }))}
                      />
                    </label>
                    <label className="form-field-label">
                      Client Secret
                      <input
                        className="form-field-input"
                        placeholder="••••••••••••••••"
                        type={idpEditing ? "text" : "password"}
                        readOnly={!idpEditing}
                        value={idpEditing ? idpForm.clientSecret : (idpConfig?.clientSecret ?? "")}
                        onChange={(e) => setIdpForm((f) => ({ ...f, clientSecret: e.target.value }))}
                      />
                    </label>
                    <label className="form-field-label">
                      Authorization Endpoint URL
                      <input
                        className="form-field-input"
                        placeholder="https://idp.example.com/oauth2/authorize"
                        type="url"
                        readOnly={!idpEditing}
                        value={idpEditing ? idpForm.authorizationEndpoint : (idpConfig?.authorizationEndpoint ?? "")}
                        onChange={(e) => setIdpForm((f) => ({ ...f, authorizationEndpoint: e.target.value }))}
                      />
                    </label>
                    <label className="form-field-label">
                      Token Endpoint URL
                      <input
                        className="form-field-input"
                        placeholder="https://idp.example.com/oauth2/token"
                        type="url"
                        readOnly={!idpEditing}
                        value={idpEditing ? idpForm.tokenEndpoint : (idpConfig?.tokenEndpoint ?? "")}
                        onChange={(e) => setIdpForm((f) => ({ ...f, tokenEndpoint: e.target.value }))}
                      />
                    </label>
                    <label className="form-field-label" style={{ gridColumn: "1 / -1" }}>
                      JWKS Endpoint
                      <input
                        className="form-field-input"
                        placeholder="https://idp.example.com/oauth2/jwks"
                        type="url"
                        readOnly={!idpEditing}
                        value={idpEditing ? idpForm.jwksEndpoint : (idpConfig?.jwksEndpoint ?? "")}
                        onChange={(e) => setIdpForm((f) => ({ ...f, jwksEndpoint: e.target.value }))}
                      />
                    </label>
                  </div>

                  {idpEditing && (
                    <div className="action-cluster">
                      <button className="button button-primary" type="button" onClick={handleIdpSave}>
                        Save configuration
                      </button>
                      <button className="button button-secondary" type="button" onClick={() => setIdpEditing(false)}>
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>

          {!isPremium && (
            <div className="locked-overlay">
              <span className="locked-badge">Premium feature</span>
              <h3>Enterprise SSO requires a Premium plan</h3>
              <p>
                Connect your workforce IdP (Okta, Azure AD, Google Workspace) so employees sign
                in through your existing identity provider.
              </p>
              <button className="button button-primary" type="button" onClick={() => setShowPremiumPreview(true)}>
                Upgrade to Premium
              </button>
            </div>
          )}
        </div>
      </div>
    </WorkspaceShell>
  );
}
