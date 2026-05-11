import Link from "next/link";

const fares = [
  { route: "Colombo to Singapore", cabin: "Economy", price: "$482", status: "In policy" },
  { route: "Colombo to Tokyo", cabin: "Premium economy", price: "$1,320", status: "Approval required" },
  { route: "Colombo to London", cabin: "Economy", price: "$1,140", status: "In policy" }
];

export default function BookingsPage() {
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

      <section className="booking-hero">
        <div>
          <p className="eyebrow">Bookings</p>
          <h1>Flight search with policy checks built in.</h1>
          <p>
            Members can compare fares before booking. Admins can use this same surface to inspect
            billing impact and out-of-policy requests.
          </p>
        </div>
        <form className="search-form">
          <label>
            Traveler
            <input defaultValue="Ava Fernando" />
          </label>
          <label>
            Destination
            <input defaultValue="Singapore" />
          </label>
          <label>
            Budget cap
            <input defaultValue="$900" />
          </label>
          <button className="button button-primary" type="button">
            Check fares
          </button>
        </form>
      </section>

      <section className="workspace-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Available flights</p>
            <h2>Compliant options first</h2>
          </div>
          <button className="button button-secondary">Export quote</button>
        </div>
        <div className="flight-list">
          {fares.map((fare) => (
            <article className="flight-row" key={fare.route}>
              <div>
                <strong>{fare.route}</strong>
                <span>{fare.cabin}</span>
              </div>
              <strong>{fare.price}</strong>
              <em className={fare.status === "In policy" ? "success-pill" : "warning-pill"}>
                {fare.status}
              </em>
              <button className="button button-secondary">Select</button>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
