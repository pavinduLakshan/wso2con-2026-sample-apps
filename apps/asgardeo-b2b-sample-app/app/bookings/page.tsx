import WorkspaceShell from "../WorkspaceShell";
import { getCurrentUserRole } from "../lib/auth";

const fares = [
  { route: "Colombo to Singapore", cabin: "Economy", price: "$482", status: "In policy" },
  { route: "Colombo to Tokyo", cabin: "Premium economy", price: "$1,320", status: "Approval required" },
  { route: "Colombo to London", cabin: "Economy", price: "$1,140", status: "In policy" }
];

export default async function BookingsPage() {
  const role = await getCurrentUserRole();
  const isAdmin = role === "ADMIN";

  return (
    <WorkspaceShell
      activeHref="/bookings"
      eyebrow={isAdmin ? "Admin workspace" : "Member workspace"}
      role={role}
      title={isAdmin ? "Book travel for any employee" : "Book your next flight"}
    >
      <section className="booking-hero">
        <div>
          <p className="eyebrow">Flight booking</p>
          <h2>Flight search with policy checks built in.</h2>
          <p>
            {isAdmin
              ? "Admins can book travel for employees while reviewing policy and billing impact."
              : "Members can compare fares and choose compliant options for work travel."}
          </p>
        </div>
        <form className="search-form">
          {isAdmin ? (
            <label>
              Traveler
              <input defaultValue="Ava Fernando" />
            </label>
          ) : null}
          <label>
            From
            <input defaultValue="Colombo" />
          </label>
          <label>
            Destination
            <input defaultValue="Singapore" />
          </label>
          <label>
            Depart
            <input defaultValue="May 28" />
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
          {isAdmin ? <button className="button button-secondary">Export quote</button> : null}
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
    </WorkspaceShell>
  );
}
