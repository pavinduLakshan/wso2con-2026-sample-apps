"use client";

import { useState } from "react";
import WorkspaceShell from "../WorkspaceShell";
import { UserRole } from "../lib/auth/utils";

type TripType = "one-way" | "round-trip" | "multi-city";
type PolicyStatus = "in-policy" | "out-of-policy" | "approval-required";

interface Fare {
  id: string;
  airline: string;
  route: string;
  cabin: string;
  price: string;
  duration: string;
  refundable: boolean;
  gds: string;
  policyStatus: PolicyStatus;
}

interface Segment {
  from: string;
  to: string;
  date: string;
}

const ALL_FARES: Fare[] = [
  { id: "f1", airline: "SriLankan Airlines", route: "Colombo → Singapore", cabin: "Economy", price: "$482", duration: "3h 30m", refundable: true, gds: "Amadeus", policyStatus: "in-policy" },
  { id: "f2", airline: "Singapore Airlines", route: "Colombo → Singapore", cabin: "Economy", price: "$540", duration: "3h 45m", refundable: false, gds: "Sabre", policyStatus: "in-policy" },
  { id: "f3", airline: "Emirates", route: "Colombo → Singapore", cabin: "Business", price: "$2,180", duration: "4h 00m", refundable: true, gds: "Amadeus", policyStatus: "out-of-policy" },
  { id: "f4", airline: "Malaysia Airlines", route: "Colombo → Singapore", cabin: "Economy", price: "$468", duration: "4h 15m", refundable: false, gds: "Galileo", policyStatus: "in-policy" },
  { id: "f5", airline: "Qatar Airways", route: "Colombo → Tokyo", cabin: "Premium Economy", price: "$1,320", duration: "12h 10m", refundable: true, gds: "Amadeus", policyStatus: "approval-required" },
  { id: "f6", airline: "Cathay Pacific", route: "Colombo → London", cabin: "Economy", price: "$1,140", duration: "14h 20m", refundable: false, gds: "Sabre", policyStatus: "in-policy" },
  { id: "f7", airline: "Air India", route: "Colombo → London", cabin: "Premium Economy", price: "$1,480", duration: "15h 05m", refundable: true, gds: "Galileo", policyStatus: "approval-required" },
  { id: "f8", airline: "British Airways", route: "Colombo → London", cabin: "Business", price: "$3,640", duration: "13h 55m", refundable: true, gds: "Sabre", policyStatus: "out-of-policy" },
];

const TRAVELERS = [
  "Ava Fernando",
  "Maya Silva",
  "Nimal Perera",
  "Priya Jayawardena",
  "Tomas Ruiz",
  "Lisa Chen",
];

const POLICY_LABEL: Record<PolicyStatus, string> = {
  "in-policy": "In policy",
  "out-of-policy": "Out of policy",
  "approval-required": "Approval required",
};

const POLICY_CLASS: Record<PolicyStatus, string> = {
  "in-policy": "success-pill",
  "out-of-policy": "out-of-policy-pill",
  "approval-required": "warning-pill",
};

export default function BookingsDashboard({ role }: { role: UserRole }) {
  const isAdmin = role === UserRole.ADMIN;

  const [tripType, setTripType] = useState<TripType>("one-way");
  const [traveler, setTraveler] = useState(TRAVELERS[0]);
  const [segments, setSegments] = useState<Segment[]>([
    { from: "Colombo", to: "Singapore", date: "Jun 10, 2026" },
  ]);
  const [returnDate, setReturnDate] = useState("Jun 17, 2026");
  const [gdsFilter, setGdsFilter] = useState("All");
  const [cabinFilter, setCabinFilter] = useState("All");
  const [refundFilter, setRefundFilter] = useState("All");
  const [searched, setSearched] = useState(false);

  function switchTripType(t: TripType) {
    setTripType(t);
    if (t === "multi-city") {
      setSegments([
        { from: "Colombo", to: "Singapore", date: "Jun 10, 2026" },
        { from: "Singapore", to: "Tokyo", date: "Jun 14, 2026" },
      ]);
    } else {
      setSegments([{ from: "Colombo", to: "Singapore", date: "Jun 10, 2026" }]);
    }
    setSearched(false);
  }

  function addSegment() {
    setSegments((prev) => [...prev, { from: "", to: "", date: "" }]);
  }

  function removeSegment(index: number) {
    setSegments((prev) => prev.filter((_, i) => i !== index));
  }

  function updateSegment(index: number, field: keyof Segment, value: string) {
    setSegments((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  }

  const filteredFares = ALL_FARES.filter((f) => {
    if (gdsFilter !== "All" && f.gds !== gdsFilter) return false;
    if (cabinFilter !== "All" && f.cabin !== cabinFilter) return false;
    if (refundFilter === "Refundable" && !f.refundable) return false;
    if (refundFilter === "Non-refundable" && f.refundable) return false;
    return true;
  });

  const sortedFares = [...filteredFares].sort((a, b) => {
    const order: Record<PolicyStatus, number> = { "in-policy": 0, "approval-required": 1, "out-of-policy": 2 };
    return order[a.policyStatus] - order[b.policyStatus];
  });

  return (
    <WorkspaceShell
      activeHref="/bookings"
      eyebrow={isAdmin ? "Admin workspace" : "Member workspace"}
      role={role}
      title={isAdmin ? "Book travel for any employee" : "Book your next flight"}
    >
      <section className="booking-hero">
        <div>
          <p className="eyebrow">Flight search</p>
          <h2>Flight search with policy checks built in.</h2>
          <p>
            {isAdmin
              ? "Book on behalf of employees. All selections are verified against active travel policies."
              : "Compare fares and choose compliant options for your work travel."}
          </p>
        </div>

        <div className="booking-form-area">
          <div className="trip-type-toggle">
            {(["one-way", "round-trip", "multi-city"] as TripType[]).map((t) => (
              <button
                key={t}
                className={`trip-type-btn${tripType === t ? " active" : ""}`}
                type="button"
                onClick={() => switchTripType(t)}
              >
                {t === "one-way" ? "One way" : t === "round-trip" ? "Round trip" : "Multi-city"}
              </button>
            ))}
          </div>

          <form
            className="search-form"
            onSubmit={(e) => {
              e.preventDefault();
              setSearched(true);
            }}
          >
            {isAdmin && (
              <label>
                Book for
                <select
                  className="search-select"
                  value={traveler}
                  onChange={(e) => setTraveler(e.target.value)}
                >
                  {TRAVELERS.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
            )}

            {tripType !== "multi-city" ? (
              <>
                <label>
                  From
                  <input
                    value={segments[0]?.from ?? ""}
                    onChange={(e) => updateSegment(0, "from", e.target.value)}
                  />
                </label>
                <label>
                  To
                  <input
                    value={segments[0]?.to ?? ""}
                    onChange={(e) => updateSegment(0, "to", e.target.value)}
                  />
                </label>
                <label>
                  Depart
                  <input
                    value={segments[0]?.date ?? ""}
                    onChange={(e) => updateSegment(0, "date", e.target.value)}
                  />
                </label>
                {tripType === "round-trip" && (
                  <label>
                    Return
                    <input
                      value={returnDate}
                      onChange={(e) => setReturnDate(e.target.value)}
                    />
                  </label>
                )}
              </>
            ) : (
              <div className="multi-city-segments">
                {segments.map((seg, i) => (
                  <div className="flight-segment" key={i}>
                    <span className="segment-label">Flight {i + 1}</span>
                    {segments.length > 2 && (
                      <button
                        className="remove-segment-btn"
                        type="button"
                        onClick={() => removeSegment(i)}
                      >
                        Remove
                      </button>
                    )}
                    <div className="segment-fields">
                      <label>
                        From
                        <input
                          value={seg.from}
                          onChange={(e) => updateSegment(i, "from", e.target.value)}
                        />
                      </label>
                      <label>
                        To
                        <input
                          value={seg.to}
                          onChange={(e) => updateSegment(i, "to", e.target.value)}
                        />
                      </label>
                      <label>
                        Date
                        <input
                          value={seg.date}
                          onChange={(e) => updateSegment(i, "date", e.target.value)}
                        />
                      </label>
                    </div>
                  </div>
                ))}
                {segments.length < 5 && (
                  <button
                    className="button button-secondary add-segment-btn"
                    type="button"
                    onClick={addSegment}
                  >
                    + Add flight
                  </button>
                )}
              </div>
            )}

            <button className="button button-primary" type="submit">
              Search flights
            </button>
          </form>
        </div>
      </section>

      {searched && (
        <>
          <div className="filter-bar">
            <div className="filter-group">
              <label>GDS</label>
              <select value={gdsFilter} onChange={(e) => setGdsFilter(e.target.value)}>
                <option>All</option>
                <option>Amadeus</option>
                <option>Sabre</option>
                <option>Galileo</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Cabin class</label>
              <select value={cabinFilter} onChange={(e) => setCabinFilter(e.target.value)}>
                <option>All</option>
                <option>Economy</option>
                <option>Premium Economy</option>
                <option>Business</option>
                <option>First Class</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Refundability</label>
              <select value={refundFilter} onChange={(e) => setRefundFilter(e.target.value)}>
                <option>All</option>
                <option>Refundable</option>
                <option>Non-refundable</option>
              </select>
            </div>
            <div className="filter-results-count">
              {sortedFares.length} flight{sortedFares.length !== 1 ? "s" : ""} found
            </div>
          </div>

          <section className="workspace-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Available flights</p>
                <h2>Compliant options first</h2>
              </div>
              {isAdmin && (
                <button className="button button-secondary" type="button">
                  Export quote
                </button>
              )}
            </div>
            <div className="flight-list">
              {sortedFares.map((fare) => (
                <article
                  className={`flight-row-extended${fare.policyStatus === "out-of-policy" ? " flight-row--out-of-policy" : ""}`}
                  key={fare.id}
                >
                  <div className="flight-info">
                    <strong>{fare.airline}</strong>
                    <span>{fare.route}</span>
                    <span className="flight-meta">
                      {fare.cabin} · {fare.duration} · {fare.gds} ·{" "}
                      {fare.refundable ? "Refundable" : "Non-refundable"}
                    </span>
                  </div>
                  <strong className="fare-price">{fare.price}</strong>
                  <em className={POLICY_CLASS[fare.policyStatus]}>
                    {POLICY_LABEL[fare.policyStatus]}
                  </em>
                  <button
                    className={`button ${
                      fare.policyStatus === "out-of-policy" && !isAdmin
                        ? "button-ghost"
                        : "button-secondary"
                    }`}
                    disabled={fare.policyStatus === "out-of-policy" && !isAdmin}
                    type="button"
                  >
                    {fare.policyStatus === "out-of-policy" && !isAdmin ? "Not available" : "Select"}
                  </button>
                </article>
              ))}
              {sortedFares.length === 0 && (
                <p className="empty-state">No flights match your current filters.</p>
              )}
            </div>
          </section>
        </>
      )}

      {!searched && (
        <section className="workspace-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Recent fares</p>
              <h2>Previously searched routes</h2>
            </div>
          </div>
          <div className="flight-list">
            {ALL_FARES.slice(0, 3).map((fare) => (
              <article className="flight-row" key={fare.id}>
                <div>
                  <strong>{fare.route}</strong>
                  <span>{fare.cabin}</span>
                </div>
                <strong>{fare.price}</strong>
                <em className={POLICY_CLASS[fare.policyStatus]}>
                  {POLICY_LABEL[fare.policyStatus]}
                </em>
                <button className="button button-secondary" type="button">
                  Select
                </button>
              </article>
            ))}
          </div>
        </section>
      )}
    </WorkspaceShell>
  );
}
