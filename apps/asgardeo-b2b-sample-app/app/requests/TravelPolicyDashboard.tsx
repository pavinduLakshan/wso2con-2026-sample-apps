"use client";

import { useEffect, useRef, useState } from "react";
import WorkspaceShell from "../WorkspaceShell";
import { useAuth } from "../lib/auth/client";
import { UserRole } from "../lib/auth/utils";

export default function TravelPolicyDashboard({ roles }: { roles: UserRole[] }) {
  const { accessToken } = useAuth();

  const [domesticCabin, setDomesticCabin] = useState("Economy");
  const [intlCabin, setIntlCabin] = useState("Business");
  const [longHaulHours, setLongHaulHours] = useState("8");
  const [priceCapPercent, setPriceCapPercent] = useState("20");
  const [minDaysAdvance, setMinDaysAdvance] = useState("14");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [dirty, setDirty] = useState(false);
  const savedRef = useRef<HTMLDivElement>(null);

  const initialRef = useRef({
    domesticCabin: "Economy",
    intlCabin: "Business",
    longHaulHours: "8",
    priceCapPercent: "20",
    minDaysAdvance: "14",
  });

  useEffect(() => {
    if (!accessToken) return;

    fetch("/api/travel-policies", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((res) => res.json())
      .then(
        (data: {
          policy?: {
            domestic_cabin: string;
            intl_cabin: string;
            long_haul_hours: number;
            price_cap_percent: number;
            min_days_advance: number;
          } | null;
        }) => {
          if (data.policy) {
            const loaded = {
              domesticCabin: data.policy.domestic_cabin,
              intlCabin: data.policy.intl_cabin,
              longHaulHours: String(data.policy.long_haul_hours),
              priceCapPercent: String(data.policy.price_cap_percent),
              minDaysAdvance: String(data.policy.min_days_advance),
            };
            setDomesticCabin(loaded.domesticCabin);
            setIntlCabin(loaded.intlCabin);
            setLongHaulHours(loaded.longHaulHours);
            setPriceCapPercent(loaded.priceCapPercent);
            setMinDaysAdvance(loaded.minDaysAdvance);
            initialRef.current = loaded;
          }
        },
      )
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [accessToken]);

  function markDirty() {
    setDirty(true);
  }

  function handleSave() {
    if (!accessToken || saving) return;
    setSaving(true);

    fetch("/api/travel-policies", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        domestic_cabin: domesticCabin,
        intl_cabin: intlCabin,
        long_haul_hours: Number(longHaulHours),
        price_cap_percent: Number(priceCapPercent),
        min_days_advance: Number(minDaysAdvance),
      }),
    })
      .then(() => {
        setSavedAt(new Date());
        setTimeout(() => setSavedAt(null), 4000);
        setDirty(false);
        initialRef.current = {
          domesticCabin,
          intlCabin,
          longHaulHours,
          priceCapPercent,
          minDaysAdvance,
        };
        savedRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      })
      .catch(() => {})
      .finally(() => setSaving(false));
  }

  function handleDiscard() {
    const s = initialRef.current;
    setDomesticCabin(s.domesticCabin);
    setIntlCabin(s.intlCabin);
    setLongHaulHours(s.longHaulHours);
    setPriceCapPercent(s.priceCapPercent);
    setMinDaysAdvance(s.minDaysAdvance);
    setDirty(false);
  }

  const activeSummary = [
    `Domestic flights: ${domesticCabin} (max)`,
    `International flights over ${longHaulHours}h: ${intlCabin} (max)`,
    `Flag approval if price is ${priceCapPercent}% above median`,
    `Minimum ${minDaysAdvance} days advance booking`,
  ];

  return (
    <WorkspaceShell
      activeHref="/requests"
      eyebrow="Admin workspace"
      loading={loading}
      roles={roles}
      title="Travel policy management"
    >
      {/* ── Save confirmation banner ──────────────────────────── */}
      {savedAt && (
        <div ref={savedRef} className="form-status" style={{ marginBottom: 18 }}>
          Policy published — changes are now active for all employees.
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
        <div className="action-cluster">
          <button
            className="button button-primary"
            type="button"
            disabled={loading || saving || !dirty}
            onClick={handleSave}
          >
            {saving ? "Publishing…" : "Publish changes"}
          </button>
          {dirty && (
            <button className="button button-secondary" type="button" onClick={handleDiscard}>
              Discard
            </button>
          )}
        </div>
      </section>

      {/* ── Flight Rules ─────────────────────────────────────── */}
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
              value={domesticCabin}
              onChange={(e) => { setDomesticCabin(e.target.value); markDirty(); }}
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
              value={intlCabin}
              onChange={(e) => { setIntlCabin(e.target.value); markDirty(); }}
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
              value={longHaulHours}
              onChange={(e) => { setLongHaulHours(e.target.value); markDirty(); }}
            />
            <span className="rule-qualifier">hours</span>
          </div>

          <div className="rule-row">
            <label className="rule-label">Flag for approval if price is</label>
            <input
              min="0"
              max="200"
              type="number"
              value={priceCapPercent}
              onChange={(e) => { setPriceCapPercent(e.target.value); markDirty(); }}
            />
            <span className="rule-qualifier">% above the median fare for that route</span>
          </div>
        </div>
      </section>

      {/* ── Booking Window ───────────────────────────────────── */}
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
              value={minDaysAdvance}
              onChange={(e) => { setMinDaysAdvance(e.target.value); markDirty(); }}
            />
            <span className="rule-qualifier">days before departure</span>
          </div>
          <p className="rule-hint">
            Bookings within <strong>{minDaysAdvance} days</strong> of departure will require
            manager approval regardless of price.
          </p>
        </div>
      </section>

      {/* ── Approval Workflow ────────────────────────────────── */}
      <section className="workspace-panel policy-rule-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Workflow</p>
            <h2>Approval mode</h2>
          </div>
          <span className="warning-pill">Coming soon</span>
        </div>
        <p className="rule-hint">
          Configurable approval workflows — including auto-approve and manager sign-off — will be
          available in a future release.
        </p>
      </section>

      {/* ── Policy summary ───────────────────────────────────── */}
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

      {/* ── Sticky unsaved-changes bar ────────────────────────── */}
      {dirty && (
        <div
          style={{
            alignItems: "center",
            background: "var(--app-card)",
            borderTop: "1px solid var(--app-border)",
            bottom: 0,
            boxShadow: "0 -4px 24px rgba(15,23,42,0.08)",
            display: "flex",
            gap: 12,
            justifyContent: "flex-end",
            left: 0,
            padding: "14px 28px",
            position: "sticky",
            right: 0,
            zIndex: 20,
          }}
        >
          <span style={{ color: "var(--app-muted)", fontSize: "0.88rem" }}>
            You have unsaved changes
          </span>
          <button className="button button-secondary" type="button" onClick={handleDiscard}>
            Discard
          </button>
          <button
            className="button button-primary"
            type="button"
            disabled={saving}
            onClick={handleSave}
          >
            {saving ? "Publishing…" : "Publish changes"}
          </button>
        </div>
      )}
    </WorkspaceShell>
  );
}
