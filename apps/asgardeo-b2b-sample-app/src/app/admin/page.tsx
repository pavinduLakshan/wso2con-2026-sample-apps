"use client";

import { useState, useEffect } from "react";
import type { TravelRequest } from "@/lib/types";

export default function AdminDashboard() {
  const [requests, setRequests] = useState<(TravelRequest & { user_name?: string; user_email?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [note, setNote] = useState<Record<number, string>>({});

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    const res = await fetch("/api/travel-requests");
    const data = await res.json();
    if (Array.isArray(data)) {
      setRequests(data);
    }
    setLoading(false);
  };

  const updateRequest = async (id: number, status: "approved" | "rejected") => {
    const res = await fetch(`/api/travel-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, admin_notes: note[id] || "" }),
    });

    if (res.ok) {
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status, admin_notes: note[id] || "" } : r))
      );
    }
  };

  const filtered = requests.filter((r) => (filter === "all" ? true : r.status === filter));

  const counts = {
    all: requests.length,
    pending: requests.filter((r) => r.status === "pending").length,
    approved: requests.filter((r) => r.status === "approved").length,
    rejected: requests.filter((r) => r.status === "rejected").length,
  };

  if (loading) {
    return <p style={{ textAlign: "center", padding: "2rem" }}>Loading requests...</p>;
  }

  return (
    <div>
      <div className="page-header">
        <h1>Admin Dashboard</h1>
      </div>

      <div className="grid grid-3 mb-3">
        <div className="card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2rem", fontWeight: 700 }}>{counts.all}</div>
          <div style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>Total Requests</div>
        </div>
        <div className="card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2rem", fontWeight: 700, color: "#f59e0b" }}>{counts.pending}</div>
          <div style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>Pending</div>
        </div>
        <div className="card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2rem", fontWeight: 700, color: "#10b981" }}>{counts.approved}</div>
          <div style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>Approved</div>
        </div>
      </div>

      <div className="tabs">
        {(["all", "pending", "approved", "rejected"] as const).map((tab) => (
          <button
            key={tab}
            className={`tab ${filter === tab ? "active" : ""}`}
            onClick={() => setFilter(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)} ({counts[tab]})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <h3>No {filter} requests</h3>
          <p>There are no travel requests matching this filter.</p>
        </div>
      ) : (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Employee</th>
                <th>Type</th>
                <th>Item ID</th>
                <th>Dates</th>
                <th>Status</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((req) => (
                <tr key={req.id}>
                  <td>{req.id}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{req.user_name}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                      {req.user_email}
                    </div>
                  </td>
                  <td style={{ textTransform: "capitalize" }}>{req.type}</td>
                  <td>{req.item_id}</td>
                  <td style={{ fontSize: "0.8rem" }}>
                    {req.check_in_date
                      ? `${req.check_in_date}${req.check_out_date ? ` → ${req.check_out_date}` : ""}`
                      : "—"}
                  </td>
                  <td>
                    <span className={`badge badge-${req.status}`}>{req.status}</span>
                  </td>
                  <td style={{ fontSize: "0.8rem" }}>{req.admin_notes || "—"}</td>
                  <td>
                    {req.status === "pending" ? (
                      <div className="actions">
                        <input
                          className="input"
                          style={{ width: "120px", fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
                          placeholder="Add note"
                          value={note[req.id] || ""}
                          onChange={(e) => setNote({ ...note, [req.id]: e.target.value })}
                        />
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => updateRequest(req.id, "approved")}
                        >
                          Approve
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => updateRequest(req.id, "rejected")}
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                        {req.status === "approved" ? "Approved" : "Rejected"}
                      </span>
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
