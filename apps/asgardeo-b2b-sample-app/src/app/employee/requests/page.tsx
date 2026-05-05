"use client";

import { useState, useEffect } from "react";
import type { TravelRequest } from "@/lib/types";

export default function MyRequestsPage() {
  const [requests, setRequests] = useState<(TravelRequest & { user_name?: string; user_email?: string })[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return <p style={{ textAlign: "center", padding: "2rem" }}>Loading your requests...</p>;
  }

  return (
    <div>
      <div className="page-header">
        <h1>My Travel Requests</h1>
      </div>

      {requests.length === 0 ? (
        <div className="empty-state">
          <h3>No requests yet</h3>
          <p>Go to the search page to find flights and hotels, then submit a travel request.</p>
        </div>
      ) : (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Type</th>
                <th>Item ID</th>
                <th>Dates</th>
                <th>Status</th>
                <th>Admin Notes</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req.id}>
                  <td>{req.id}</td>
                  <td style={{ textTransform: "capitalize" }}>{req.type}</td>
                  <td>{req.item_id}</td>
                  <td>
                    {req.check_in_date
                      ? `${req.check_in_date}${req.check_out_date ? ` → ${req.check_out_date}` : ""}`
                      : "—"}
                  </td>
                  <td>
                    <span className={`badge badge-${req.status}`}>{req.status}</span>
                  </td>
                  <td>{req.admin_notes || "—"}</td>
                  <td style={{ fontSize: "0.8rem" }}>
                    {new Date(req.created_at).toLocaleDateString()}
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
