import { redirect } from "next/navigation";
import WorkspaceShell from "../WorkspaceShell";
import { getCurrentUserRole } from "../lib/auth";

const policies = [
  { name: "Economy cabin for trips under 6 hours", status: "Active", limit: "All employees" },
  { name: "Manager approval above $1,200", status: "Active", limit: "Flights" },
  { name: "Hotel nightly cap by region", status: "Draft", limit: "APAC, EMEA" }
];

const approvals = [
  { traveler: "Nimal Perera", reason: "Premium economy over cabin policy", amount: "$1,320", status: "Manager review" },
  { traveler: "Ava Fernando", reason: "Last-minute fare variance", amount: "$940", status: "Finance review" },
  { traveler: "Maya Silva", reason: "Hotel exceeds EMEA nightly cap", amount: "$260/night", status: "Policy exception" }
];

export default async function RequestsPage() {
  const role = await getCurrentUserRole();

  if (role !== "ADMIN") {
    redirect("/bookings");
  }

  return (
    <WorkspaceShell activeHref="/requests" eyebrow="Admin workspace" role={role} title="Travel policy management">
      <section className="command-panel">
        <div>
          <p className="eyebrow">Travel policies</p>
          <h2>Set the rules employees must pass before booking.</h2>
          <p>
            Configure cabin classes, approval thresholds, destination budgets, and exception handling
            for every employee in the organization.
          </p>
        </div>
        <div className="action-cluster">
          <button className="button button-primary">Create policy</button>
          <button className="button button-secondary">Publish changes</button>
        </div>
      </section>

      <div className="dashboard-grid">
        <section className="workspace-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Policy engine</p>
              <h2>Active controls</h2>
            </div>
            <button className="button button-secondary">Edit rules</button>
          </div>
          <div className="policy-list">
            {policies.map((policy) => (
              <article className="policy-row" key={policy.name}>
                <div>
                  <strong>{policy.name}</strong>
                  <span>{policy.limit}</span>
                </div>
                <em>{policy.status}</em>
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
            <button className="button button-secondary">Review all</button>
          </div>
          <div className="request-list">
            {approvals.map((approval) => (
              <article className="request-row" key={approval.traveler}>
                <div>
                  <strong>{approval.traveler}</strong>
                  <span>{approval.reason}</span>
                </div>
                <span>{approval.amount}</span>
                <em>{approval.status}</em>
              </article>
            ))}
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}
