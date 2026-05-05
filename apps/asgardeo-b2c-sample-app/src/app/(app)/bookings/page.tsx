"use client";

import { useState, useEffect, useCallback } from "react";
import type { Booking } from "@/lib/types";

export default function BookingsPage() {
  const [bookings, setBookings] = useState<(Booking & { item_name?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [filter, setFilter] = useState<"all" | "confirmed" | "cancelled">("all");

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/bookings");
      const data = await res.json();
      setBookings(data);
    } catch {
      setBookings([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleCancel = async (booking: Booking) => {
    setMessage(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: booking.id, status: "cancelled" }),
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Booking cancelled successfully." });
        fetchBookings();
      } else {
        const err = await res.json();
        setMessage({ type: "error", text: err.error || "Cancellation failed." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error. Please try again." });
    }
    setTimeout(() => setMessage(null), 5000);
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  const filtered = filter === "all" ? bookings : bookings.filter((b) => b.status === filter);
  const counts = {
    all: bookings.length,
    confirmed: bookings.filter((b) => b.status === "confirmed").length,
    cancelled: bookings.filter((b) => b.status === "cancelled").length,
  };

  return (
    <div className="container">
      <div className="page-header">
        <h1>My Bookings</h1>
        <p>View and manage your travel bookings</p>
      </div>

      {message && (
        <div className={`alert-message alert-${message.type}`}>{message.text}</div>
      )}

      <div className="summary-cards">
        <div className="summary-card">
          <div className="summary-card-label">Total</div>
          <div className="summary-card-value">{counts.all}</div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">Confirmed</div>
          <div className="summary-card-value" style={{ color: "var(--success)" }}>{counts.confirmed}</div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">Cancelled</div>
          <div className="summary-card-value" style={{ color: "var(--text-muted)" }}>{counts.cancelled}</div>
        </div>
      </div>

      <div className="section-header">
        <div className="tabs">
          <button className={`tab ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>
            All ({counts.all})
          </button>
          <button className={`tab ${filter === "confirmed" ? "active" : ""}`} onClick={() => setFilter("confirmed")}>
            Confirmed ({counts.confirmed})
          </button>
          <button className={`tab ${filter === "cancelled" ? "active" : ""}`} onClick={() => setFilter("cancelled")}>
            Cancelled ({counts.cancelled})
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner">Loading bookings...</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">&#128197;</div>
          <h3>No bookings yet</h3>
          <p>Start by searching for flights or hotels and book your trip.</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Type</th>
                <th>Details</th>
                <th>Dates</th>
                <th>Guests</th>
                <th>Total Price</th>
                <th>Status</th>
                <th>Booked On</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((booking) => (
                <tr key={booking.id}>
                  <td>{booking.id}</td>
                  <td>
                    <span className="badge" style={{ background: booking.type === "flight" ? "var(--info-light)" : "var(--accent-light)", color: booking.type === "flight" ? "var(--info)" : "var(--accent)" }}>
                      {booking.type === "flight" ? "✈ Flight" : "🏨 Hotel"}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{(booking as any).item_name || `Item #${booking.item_id}`}</div>
                  </td>
                  <td>
                    {booking.check_in_date ? (
                      <>
                        {formatDate(booking.check_in_date)} → {formatDate(booking.check_out_date)}
                      </>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td>{booking.guests || 1}</td>
                  <td>
                    <span className="price" style={{ fontSize: "0.9rem" }}>${booking.total_price}</span>
                  </td>
                  <td>
                    <span className={`badge badge-${booking.status}`}>{booking.status}</span>
                  </td>
                  <td>{formatDate(booking.created_at)}</td>
                  <td>
                    {booking.status === "confirmed" && (
                      <button className="btn btn-outline btn-sm" onClick={() => handleCancel(booking)}>
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
