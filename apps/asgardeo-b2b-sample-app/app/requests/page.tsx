import Link from "next/link";

const approvals = [
  { traveler: "Nimal Perera", reason: "Premium economy over cabin policy", amount: "$1,320", status: "Manager review" },
  { traveler: "Ava Fernando", reason: "Last-minute fare variance", amount: "$940", status: "Finance review" },
  { traveler: "Maya Silva", reason: "Hotel exceeds EMEA nightly cap", amount: "$260/night", status: "Policy exception" }
];

const policies = [
  "Economy cabin is required below 6 flight hours.",
  "Flights above $1,200 require manager approval.",
  "Out-of-policy hotel rates route to finance before checkout."
];

export default function RequestsPage() {
  return (
    <main className="detail-page">
      <nav className="detail-nav">
        <Link className="brand" href="/dashboard">
          VoyageOps
        </Link>
        <Link className="button button-secondary" href="/dashboard">
          Back to dashboard
        </Link>
      </nav>

      <section className="split-layout">
        <div>
          <p className="eyebrow">Policies and approvals</p>
          <h1>Keep exceptions visible before money moves.</h1>
          <p>
            Admins can review policy configuration while members can track booking approvals and
            understand what triggered an exception.
          </p>
        </div>
        <div className="policy-summary">
          {policies.map((policy) => (
            <article key={policy}>
              <span>Rule</span>
              <strong>{policy}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="workspace-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Approval queue</p>
            <h2>Requests needing action</h2>
          </div>
          <button className="button button-primary">Create policy</button>
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
    </main>
  );
}
