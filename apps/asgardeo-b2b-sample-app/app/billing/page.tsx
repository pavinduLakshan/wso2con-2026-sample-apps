"use client";

import { useAuth } from "../lib/auth/client";
import { getRoleFromPermissions, UserRole } from "../lib/auth/utils";
import WorkspaceShell from "../WorkspaceShell";

const INVOICES = [
  { month: "April 2026", amount: "$128,400", status: "Paid" },
  { month: "March 2026", amount: "$114,200", status: "Paid" },
  { month: "February 2026", amount: "$98,760", status: "Paid" },
  { month: "January 2026", amount: "$142,880", status: "Paid" },
];

const COST_CENTERS = [
  { id: "cc1", name: "Marketing", code: "MKT-001", monthlySpend: "$18,200", limit: "$22,000" },
  { id: "cc2", name: "Engineering", code: "ENG-002", monthlySpend: "$34,100", limit: "$40,000" },
  { id: "cc3", name: "Sales", code: "SLS-003", monthlySpend: "$28,600", limit: "$35,000" },
  { id: "cc4", name: "Human Resources", code: "HR-004", monthlySpend: "$12,400", limit: "$15,000" },
];

export default function BillingPage() {
  const { user } = useAuth();
  const role = user ? getRoleFromPermissions(user.permissions) : UserRole.MEMBER;

  if (role !== UserRole.ADMIN) {
    return (
      <WorkspaceShell activeHref="/billing" eyebrow="Member workspace" role={role} title="Billing">
        <section className="workspace-panel">
          <p className="eyebrow">Access restricted</p>
          <h2>You don&apos;t have permission to view this page.</h2>
          <p>Billing settings are available to administrators only.</p>
        </section>
      </WorkspaceShell>
    );
  }

  return (
    <WorkspaceShell
      activeHref="/billing"
      eyebrow="Admin workspace"
      role={role}
      title="Billing"
    >
      <section className="command-panel">
        <div>
          <p className="eyebrow">Financials</p>
          <h2>Track payment settings, monthly caps, and invoices.</h2>
          <p>
            Monitor your corporate travel wallet, manage billing details, download invoices, and
            review cost center spend across departments.
          </p>
        </div>
      </section>

      <div className="billing-summary-grid">
        <section className="workspace-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Corporate balance</p>
              <h2>Travel wallet</h2>
            </div>
          </div>
          <div className="wallet-card">
            <span className="cell-muted">Available credit</span>
            <strong className="wallet-amount">$51,600</strong>
            <div className="billing-meter">
              <div>
                <span style={{ width: "71%" }} />
              </div>
            </div>
            <small>$128,400 of $180,000 monthly cap used (71%)</small>
          </div>
        </section>

        <section className="workspace-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Payment</p>
              <h2>Billing settings</h2>
            </div>
            <button className="button button-secondary" type="button">
              Edit billing
            </button>
          </div>
          <div className="policy-list">
            {[
              { label: "Default card", value: "Corporate Visa ending 4821" },
              { label: "Invoice owner", value: "finance@acme.example" },
              { label: "Monthly spend cap", value: "$180,000" },
            ].map((item) => (
              <article className="policy-row" key={item.label}>
                <div>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <div className="dashboard-grid">
        <section className="workspace-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Financials</p>
              <h2>Monthly invoices</h2>
            </div>
            <button className="button button-secondary" type="button">
              Download all
            </button>
          </div>
          <div className="invoice-table">
            {INVOICES.map((inv) => (
              <div className="invoice-row" key={inv.month}>
                <span>{inv.month}</span>
                <strong>{inv.amount}</strong>
                <em className="success-pill">{inv.status}</em>
                <button className="text-button" type="button">
                  Download PDF
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="workspace-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Internal accounting</p>
              <h2>Cost centers</h2>
            </div>
            <button className="button button-secondary" type="button">
              Add center
            </button>
          </div>
          <div className="cost-center-table">
            {COST_CENTERS.map((cc) => (
              <div className="cost-center-row" key={cc.id}>
                <div>
                  <strong>{cc.name}</strong>
                  <span className="cell-muted">{cc.code}</span>
                </div>
                <div>
                  <span className="cell-muted">Spent</span>
                  <strong>{cc.monthlySpend}</strong>
                </div>
                <div>
                  <span className="cell-muted">Cap</span>
                  <strong>{cc.limit}</strong>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}
