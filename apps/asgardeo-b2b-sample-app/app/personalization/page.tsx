"use client";

import { useState } from "react";
import { useAuth } from "../lib/auth/client";
import { getRolesFromPermissions, UserRole } from "../lib/auth/utils";
import WorkspaceShell from "../WorkspaceShell";

const IS_PREMIUM = false;

export default function PersonalizationPage() {
  const { user } = useAuth();
  const roles = user ? getRolesFromPermissions(user.permissions) : [UserRole.MEMBER];
  const [brandColor, setBrandColor] = useState("#2563eb");

  const canAccess =
    roles.includes(UserRole.ADMIN) ||
    roles.includes(UserRole.BASIC_BRANDING_EDITOR) ||
    roles.includes(UserRole.ADVANCED_BRANDING_EDITOR);

  if (!canAccess) {
    return (
      <WorkspaceShell activeHref="/personalization" eyebrow="Member workspace" roles={roles} title="Personalization">
        <section className="workspace-panel">
          <p className="eyebrow">Access restricted</p>
          <h2>You don&apos;t have permission to view this page.</h2>
          <p>Personalization settings are available to administrators and branding editors only.</p>
        </section>
      </WorkspaceShell>
    );
  }

  return (
    <WorkspaceShell
      activeHref="/personalization"
      eyebrow="Admin workspace"
      roles={roles}
      title="Personalization"
    >
      <section className="command-panel">
        <div>
          <p className="eyebrow">Appearance</p>
          <h2>Customize how the workspace looks for your employees.</h2>
          <p>
            Upload your company logo, set brand colors, and configure the workspace identity shown
            across the employee-facing experience.
          </p>
        </div>
      </section>

      <div className="locked-feature-wrapper">
        <div className={IS_PREMIUM ? undefined : "locked-feature-content"}>
          <section className="workspace-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Appearance</p>
                <h2>Workspace branding</h2>
              </div>
            </div>
            <div className="branding-grid">
              <div className="branding-field">
                <span className="form-field-label">Company Logo</span>
                <div className="logo-upload-area">
                  <div className="logo-placeholder">W</div>
                  <div>
                    <p>Upload your company logo to replace the Wayfinder mark in the employee view.</p>
                    <button className="button button-secondary" type="button">
                      Choose file
                    </button>
                  </div>
                </div>
              </div>

              <div className="branding-field">
                <span className="form-field-label">Primary Brand Color</span>
                <div className="color-picker-wrapper">
                  <input
                    className="color-input"
                    type="color"
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                  />
                  <span className="color-preview" style={{ background: brandColor }} />
                  <span className="color-hex">{brandColor.toUpperCase()}</span>
                </div>
                <p className="field-hint">Updates buttons and accents in the employee view.</p>
              </div>

              <div className="branding-field">
                <label className="form-field-label">
                  Custom Support Email
                  <input
                    className="form-field-input"
                    placeholder="travel-support@yourcompany.com"
                    type="email"
                  />
                </label>
                <p className="field-hint">Shown to employees on booking confirmation pages.</p>
              </div>

              <div className="branding-field">
                <label className="form-field-label">
                  Workspace Display Name
                  <input
                    className="form-field-input"
                    defaultValue="ACME Corp Travel"
                    type="text"
                  />
                </label>
              </div>
            </div>
            <div className="action-cluster" style={{ marginTop: "20px" }}>
              <button className="button button-primary" type="button">
                Save branding
              </button>
              <button className="button button-secondary" type="button">
                Preview
              </button>
            </div>
          </section>
        </div>
        {!IS_PREMIUM && (
          <div className="locked-overlay">
            <span className="locked-badge">Premium feature</span>
            <h3>Custom branding requires a Premium plan</h3>
            <p>
              Upload your logo, set brand colors, and customize the employee-facing workspace
              to match your company identity.
            </p>
            <button className="button button-primary" type="button">
              Upgrade to Premium
            </button>
          </div>
        )}
      </div>
    </WorkspaceShell>
  );
}
