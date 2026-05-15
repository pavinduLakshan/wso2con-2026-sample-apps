"use client";

import { useEffect, useState } from "react";
import WorkspaceShell from "../WorkspaceShell";
import { useAuth } from "../lib/auth/client";
import { UserRole } from "../lib/auth/utils";

interface Policy {
  domestic_cabin: string;
  intl_cabin: string;
  long_haul_hours: number;
  price_cap_percent: number;
  min_days_advance: number;
}

interface FormValues {
  domesticCabin: string;
  intlCabin: string;
  longHaulHours: string;
  priceCapPercent: string;
  minDaysAdvance: string;
}

const DEFAULT_FORM: FormValues = {
  domesticCabin: "Economy",
  intlCabin: "Business",
  longHaulHours: "8",
  priceCapPercent: "20",
  minDaysAdvance: "14",
};

function policyToForm(p: Policy): FormValues {
  return {
    domesticCabin: p.domestic_cabin,
    intlCabin: p.intl_cabin,
    longHaulHours: String(p.long_haul_hours),
    priceCapPercent: String(p.price_cap_percent),
    minDaysAdvance: String(p.min_days_advance),
  };
}

export default function TravelPolicyDashboard({ roles }: { roles: UserRole[] }) {
  const { accessToken } = useAuth();

  const [policy, setPolicy] = useState<Policy | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FormValues>(DEFAULT_FORM);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [banner, setBanner] = useState<"saved" | "deleted" | null>(null);

  useEffect(() => {
    if (!accessToken) return;

    fetch("/api/travel-policies", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((res) => res.json())
      .then((data: { policy?: Policy | null }) => {
        if (data.policy) setPolicy(data.policy);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [accessToken]);

  function showBanner(type: "saved" | "deleted") {
    setBanner(type);
    setTimeout(() => setBanner(null), 4000);
  }

  function handleCreate() {
    setForm(DEFAULT_FORM);
    setEditing(true);
  }

  function handleEdit() {
    setForm(policy ? policyToForm(policy) : DEFAULT_FORM);
    setEditing(true);
  }

  function handleCancel() {
    setEditing(false);
  }

  function handleSave() {
    if (!accessToken || saving) return;
    setSaving(true);

    const body = {
      domestic_cabin: form.domesticCabin,
      intl_cabin: form.intlCabin,
      long_haul_hours: Number(form.longHaulHours),
      price_cap_percent: Number(form.priceCapPercent),
      min_days_advance: Number(form.minDaysAdvance),
    };

    fetch("/api/travel-policies", {
      method: policy ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    })
      .then((res) => res.json())
      .then((data: { policy?: Policy }) => {
        if (data.policy) setPolicy(data.policy);
        setEditing(false);
        showBanner("saved");
      })
      .catch(() => {})
      .finally(() => setSaving(false));
  }

  function handleDelete() {
    if (!accessToken || deleting) return;
    setDeleting(true);

    fetch("/api/travel-policies", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(() => {
        setPolicy(null);
        setEditing(false);
        showBanner("deleted");
      })
      .catch(() => {})
      .finally(() => setDeleting(false));
  }

  function field(key: keyof FormValues, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const activeSummary = policy
    ? [
        `Domestic flights: ${policy.domestic_cabin} (max)`,
        `International flights over ${policy.long_haul_hours}h: ${policy.intl_cabin} (max)`,
        `Flag approval if price is ${policy.price_cap_percent}% above median`,
        `Minimum ${policy.min_days_advance} days advance booking`,
      ]
    : [];

  return (
    <WorkspaceShell
      activeHref="/requests"
      eyebrow="Admin workspace"
      roles={roles}
      title="Travel policy management"
    >
      {/* ── Banner ────────────────────────────────────────────── */}
      {banner === "saved" && (
        <div className="form-status" style={{ marginBottom: 18 }}>
          Policy published — changes are now active for all employees.
        </div>
      )}
      {banner === "deleted" && (
        <div className="form-status form-status-warn" style={{ marginBottom: 18 }}>
          Policy removed — no travel guardrails are currently active.
        </div>
      )}

      {/* ── Command panel ────────────────────────────────────── */}
      <section className="command-panel">
        <div>
          <p className="eyebrow">Travel policies</p>
          <h2>Set the guardrails employees must pass before booking.</h2>
          <p>
            Configure cabin classes, advance-purchase windows, and approval thresholds for every
            employee in the organization.
          </p>
        </div>
        {!loading && !editing && (
          <div className="action-cluster">
            {policy ? (
              <>
                <button className="button button-primary" type="button" onClick={handleEdit}>
                  Edit policy
                </button>
                <button
                  className="button button-danger"
                  type="button"
                  disabled={deleting}
                  onClick={handleDelete}
                >
                  {deleting ? "Deleting…" : "Delete policy"}
                </button>
              </>
            ) : (
              <button className="button button-primary" type="button" onClick={handleCreate}>
                Create policy
              </button>
            )}
          </div>
        )}
        {!loading && editing && (
          <div className="action-cluster">
            <button
              className="button button-primary"
              type="button"
              disabled={saving}
              onClick={handleSave}
            >
              {saving ? "Publishing…" : policy ? "Update policy" : "Create policy"}
            </button>
            <button className="button button-secondary" type="button" onClick={handleCancel}>
              Cancel
            </button>
          </div>
        )}
        {loading && (
          <div className="action-cluster">
            <div className="skeleton-block" style={{ borderRadius: "8px", height: "38px", width: "120px" }} />
          </div>
        )}
      </section>

      {/* ── Skeleton loading state ────────────────────────────── */}
      {loading && (
        <>
          <section className="workspace-panel policy-rule-panel" aria-busy="true">
            <div className="section-heading">
              <div>
                <div className="skeleton-block" style={{ height: "12px", width: "80px", marginBottom: "8px" }} />
                <div className="skeleton-block" style={{ height: "22px", width: "200px" }} />
              </div>
            </div>
            <div className="rule-builder">
              {Array.from({ length: 3 }).map((_, i) => (
                <div className="rule-row" key={i}>
                  <div className="skeleton-block skeleton-name" />
                  <div className="skeleton-block skeleton-badge" />
                  <div className="skeleton-block skeleton-email" />
                </div>
              ))}
            </div>
          </section>

          <section className="workspace-panel policy-rule-panel" aria-busy="true">
            <div className="section-heading">
              <div>
                <div className="skeleton-block" style={{ height: "12px", width: "80px", marginBottom: "8px" }} />
                <div className="skeleton-block" style={{ height: "22px", width: "220px" }} />
              </div>
            </div>
            <div className="rule-builder">
              <div className="rule-row">
                <div className="skeleton-block skeleton-name" />
                <div className="skeleton-block skeleton-badge" />
                <div className="skeleton-block skeleton-email" />
              </div>
            </div>
          </section>
        </>
      )}

      {/* ── Empty state ───────────────────────────────────────── */}
      {!loading && !policy && !editing && (
        <section className="workspace-panel" style={{ textAlign: "center", padding: "48px 24px" }}>
          <p className="eyebrow">No policy configured</p>
          <h2 style={{ marginBottom: 8 }}>No travel policy is active</h2>
          <p style={{ color: "var(--app-muted)", marginBottom: 24 }}>
            Create a policy to define cabin classes, booking windows, and approval thresholds for
            your organization.
          </p>
          <button className="button button-primary" type="button" onClick={handleCreate}>
            Create policy
          </button>
        </section>
      )}

      {/* ── Edit / Create form ────────────────────────────────── */}
      {!loading && editing && (
        <>
          <section className="workspace-panel policy-rule-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Flight rules</p>
                <h2>Cabin &amp; spend controls</h2>
              </div>
            </div>
            <div className="rule-builder">
              <div className="rule-row">
                <label className="rule-label">Domestic cabin class (max)</label>
                <select
                  value={form.domesticCabin}
                  onChange={(e) => field("domesticCabin", e.target.value)}
                >
                  <option>Economy</option>
                  <option>Premium Economy</option>
                  <option>Business</option>
                  <option>First Class</option>
                </select>
                <span className="rule-qualifier">for all domestic routes</span>
              </div>

              <div className="rule-row">
                <label className="rule-label">International cabin class (max)</label>
                <select
                  value={form.intlCabin}
                  onChange={(e) => field("intlCabin", e.target.value)}
                >
                  <option>Economy</option>
                  <option>Premium Economy</option>
                  <option>Business</option>
                  <option>First Class</option>
                </select>
                <span className="rule-qualifier">for flights longer than</span>
                <input
                  min="1"
                  max="24"
                  type="number"
                  value={form.longHaulHours}
                  onChange={(e) => field("longHaulHours", e.target.value)}
                />
                <span className="rule-qualifier">hours</span>
              </div>

              <div className="rule-row">
                <label className="rule-label">Flag for approval if price is</label>
                <input
                  min="0"
                  max="200"
                  type="number"
                  value={form.priceCapPercent}
                  onChange={(e) => field("priceCapPercent", e.target.value)}
                />
                <span className="rule-qualifier">% above the median fare for that route</span>
              </div>
            </div>
          </section>

          <section className="workspace-panel policy-rule-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Booking window</p>
                <h2>Advance purchase requirement</h2>
              </div>
            </div>
            <div className="rule-builder">
              <div className="rule-row">
                <label className="rule-label">Minimum days in advance</label>
                <input
                  min="0"
                  max="90"
                  type="number"
                  value={form.minDaysAdvance}
                  onChange={(e) => field("minDaysAdvance", e.target.value)}
                />
                <span className="rule-qualifier">days before departure</span>
              </div>
              <p className="rule-hint">
                Bookings within <strong>{form.minDaysAdvance} days</strong> of departure will
                require manager approval regardless of price.
              </p>
            </div>
          </section>
        </>
      )}

      {/* ── Read-only policy summary ──────────────────────────── */}
      {!loading && policy && !editing && (
        <>
          <section className="workspace-panel policy-rule-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Flight rules</p>
                <h2>Cabin &amp; spend controls</h2>
              </div>
            </div>
            <div className="rule-builder">
              <div className="rule-row">
                <span className="rule-label">Domestic cabin class (max)</span>
                <strong>{policy.domestic_cabin}</strong>
                <span className="rule-qualifier">for all domestic routes</span>
              </div>
              <div className="rule-row">
                <span className="rule-label">International cabin class (max)</span>
                <strong>{policy.intl_cabin}</strong>
                <span className="rule-qualifier">
                  for flights longer than <strong>{policy.long_haul_hours}</strong> hours
                </span>
              </div>
              <div className="rule-row">
                <span className="rule-label">Flag for approval if price is</span>
                <strong>{policy.price_cap_percent}%</strong>
                <span className="rule-qualifier">above the median fare for that route</span>
              </div>
            </div>
          </section>

          <section className="workspace-panel policy-rule-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Booking window</p>
                <h2>Advance purchase requirement</h2>
              </div>
            </div>
            <div className="rule-builder">
              <div className="rule-row">
                <span className="rule-label">Minimum days in advance</span>
                <strong>{policy.min_days_advance}</strong>
                <span className="rule-qualifier">days before departure</span>
              </div>
              <p className="rule-hint">
                Bookings within <strong>{policy.min_days_advance} days</strong> of departure will
                require manager approval regardless of price.
              </p>
            </div>
          </section>

          <section className="workspace-panel policy-rule-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Workflow</p>
                <h2>Approval mode</h2>
              </div>
              <span className="warning-pill">Coming soon</span>
            </div>
            <p className="rule-hint">
              Configurable approval workflows — including auto-approve and manager sign-off — will
              be available in a future release.
            </p>
          </section>

          <section className="workspace-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Policy engine</p>
                <h2>Active controls</h2>
              </div>
            </div>
            <div className="policy-list">
              {activeSummary.map((line) => (
                <article className="policy-row" key={line}>
                  <div>
                    <strong>{line}</strong>
                  </div>
                  <em className="success-pill">Active</em>
                </article>
              ))}
            </div>
          </section>
        </>
      )}
    </WorkspaceShell>
  );
}
