"use client";

import { useState } from "react";
import WorkspaceShell from "../WorkspaceShell";
import { UserRole } from "../lib/auth";

interface Policy {
  id: string;
  name: string;
  status: "Active" | "Draft";
  appliesTo: string;
}

interface ApprovalRequest {
  id: string;
  traveler: string;
  reason: string;
  amount: string;
  status: string;
}

const INITIAL_POLICIES: Policy[] = [
  { id: "p1", name: "Economy cabin for trips under 6 hours", status: "Active", appliesTo: "All employees" },
  { id: "p2", name: "Manager approval above $1,200", status: "Active", appliesTo: "Flights" },
  { id: "p3", name: "Hotel nightly cap by region", status: "Draft", appliesTo: "APAC, EMEA" },
];

const INITIAL_APPROVALS: ApprovalRequest[] = [
  { id: "a1", traveler: "Nimal Perera", reason: "Premium economy over cabin policy", amount: "$1,320", status: "Manager review" },
  { id: "a2", traveler: "Ava Fernando", reason: "Last-minute fare variance (< 14 days)", amount: "$940", status: "Finance review" },
  { id: "a3", traveler: "Maya Silva", reason: "Hotel exceeds EMEA nightly cap", amount: "$260/night", status: "Policy exception" },
];

export default function TravelPolicyDashboard({ role }: { role: UserRole }) {
  const [approvalMode, setApprovalMode] = useState<"auto" | "manager">("manager");
  const [domesticCabin, setDomesticCabin] = useState("Economy");
  const [intlCabin, setIntlCabin] = useState("Business");
  const [longHaulHours, setLongHaulHours] = useState("8");
  const [priceCapPercent, setPriceCapPercent] = useState("20");
  const [minDaysAdvance, setMinDaysAdvance] = useState("14");
  const [approvals, setApprovals] = useState<ApprovalRequest[]>(INITIAL_APPROVALS);
  const [policies] = useState<Policy[]>(INITIAL_POLICIES);
  const [saved, setSaved] = useState(false);

  function handleApprovalAction(id: string) {
    setApprovals((prev) => prev.filter((a) => a.id !== id));
  }

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <WorkspaceShell
      activeHref="/requests"
      eyebrow="Admin workspace"
      role={role}
      title="Travel policy management"
    >
      <section className="command-panel">
        <div>
          <p className="eyebrow">Travel policies</p>
          <h2>Set the guardrails employees must pass before booking.</h2>
          <p>
            Configure cabin classes, advance-purchase windows, approval thresholds, and exception
            handling for every employee in the organization.
          </p>
        </div>
        <div className="action-cluster">
          <button className="button button-primary" type="button">
            Create policy
          </button>
          <button className="button button-secondary" type="button" onClick={handleSave}>
            {saved ? "Saved!" : "Publish changes"}
          </button>
        </div>
      </section>

      {/* ── Flight Rules ─────────────────────────────────────────── */}
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
            <select value={domesticCabin} onChange={(e) => setDomesticCabin(e.target.value)}>
              <option>Economy</option>
              <option>Premium Economy</option>
              <option>Business</option>
              <option>First Class</option>
            </select>
            <span className="rule-qualifier">for all domestic routes</span>
          </div>

          <div className="rule-row">
            <label className="rule-label">International cabin class (max)</label>
            <select value={intlCabin} onChange={(e) => setIntlCabin(e.target.value)}>
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
              onChange={(e) => setLongHaulHours(e.target.value)}
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
              onChange={(e) => setPriceCapPercent(e.target.value)}
            />
            <span className="rule-qualifier">% above the median fare for that route</span>
          </div>
        </div>
      </section>

      {/* ── Booking Window ───────────────────────────────────────── */}
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
              onChange={(e) => setMinDaysAdvance(e.target.value)}
            />
            <span className="rule-qualifier">days before departure</span>
          </div>
          <p className="rule-hint">
            Bookings within <strong>{minDaysAdvance} days</strong> of departure will require manager
            approval regardless of price.
          </p>
        </div>
      </section>

      {/* ── Approval Workflow ────────────────────────────────────── */}
      <section className="workspace-panel policy-rule-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Workflow</p>
            <h2>Approval mode</h2>
          </div>
        </div>
        <div className="rule-builder">
          <div className="rule-row">
            <label className="rule-label">Booking approval</label>
            <div className="approval-mode-toggle">
              <button
                className={`approval-mode-btn${approvalMode === "auto" ? " selected" : ""}`}
                type="button"
                onClick={() => setApprovalMode("auto")}
              >
                Auto-approve
              </button>
              <button
                className={`approval-mode-btn${approvalMode === "manager" ? " selected" : ""}`}
                type="button"
                onClick={() => setApprovalMode("manager")}
              >
                Requires Manager Approval
              </button>
            </div>
          </div>
          <p className="rule-hint">
            {approvalMode === "auto"
              ? "Compliant bookings are approved instantly. Exceptions still require manual review."
              : "All bookings require manager sign-off before the ticket is issued."}
          </p>
        </div>
      </section>

      {/* ── Policy List + Exception Queue ────────────────────────── */}
      <div className="dashboard-grid">
        <section className="workspace-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Policy engine</p>
              <h2>Active controls</h2>
            </div>
            <button className="button button-secondary" type="button">
              Edit rules
            </button>
          </div>
          <div className="policy-list">
            {policies.map((policy) => (
              <article className="policy-row" key={policy.id}>
                <div>
                  <strong>{policy.name}</strong>
                  <span>{policy.appliesTo}</span>
                </div>
                <em className={policy.status === "Active" ? "success-pill" : "warning-pill"}>
                  {policy.status}
                </em>
              </article>
            ))}
          </div>
        </section>

        <section className="workspace-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Exception queue</p>
              <h2>Requests needing action</h2>
            </div>
            {approvals.length > 0 && (
              <span className="count-badge">{approvals.length}</span>
            )}
          </div>
          <div className="request-list">
            {approvals.length === 0 && (
              <p className="empty-state">All exceptions have been reviewed.</p>
            )}
            {approvals.map((approval) => (
              <article className="request-row-extended" key={approval.id}>
                <div>
                  <strong>{approval.traveler}</strong>
                  <span>{approval.reason}</span>
                </div>
                <strong>{approval.amount}</strong>
                <em>{approval.status}</em>
                <div className="approval-actions">
                  <button
                    className="button button-approve"
                    type="button"
                    onClick={() => handleApprovalAction(approval.id)}
                  >
                    Approve
                  </button>
                  <button
                    className="button button-reject"
                    type="button"
                    onClick={() => handleApprovalAction(approval.id)}
                  >
                    Reject
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}
