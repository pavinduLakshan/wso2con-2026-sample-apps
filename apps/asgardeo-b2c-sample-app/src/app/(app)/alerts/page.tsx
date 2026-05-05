"use client";

import { useState, useEffect, useCallback } from "react";
import type { Alert } from "@/lib/types";

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const [alertName, setAlertName] = useState("");
  const [alertType, setAlertType] = useState<"flight" | "hotel">("flight");
  const [alertOrigin, setAlertOrigin] = useState("");
  const [alertDest, setAlertDest] = useState("");
  const [alertCity, setAlertCity] = useState("");
  const [alertMaxPrice, setAlertMaxPrice] = useState("");
  const [alertMinStars, setAlertMinStars] = useState("");

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/alerts");
      const data = await res.json();
      setAlerts(data);
    } catch {
      setAlerts([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    try {
      const body: any = {
        name: alertName,
        type: alertType,
        max_price: alertMaxPrice ? Number(alertMaxPrice) : null,
      };

      if (alertType === "flight") {
        body.origin = alertOrigin || null;
        body.destination = alertDest || null;
      } else {
        body.city = alertCity || null;
        body.min_stars = alertMinStars ? Number(alertMinStars) : null;
      }

      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "Alert created successfully!" });
        setShowCreate(false);
        resetForm();
        fetchAlerts();
      } else {
        const err = await res.json();
        setMessage({ type: "error", text: err.error || "Failed to create alert." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error. Please try again." });
    }
    setTimeout(() => setMessage(null), 5000);
  };

  const resetForm = () => {
    setAlertName("");
    setAlertType("flight");
    setAlertOrigin("");
    setAlertDest("");
    setAlertCity("");
    setAlertMaxPrice("");
    setAlertMinStars("");
  };

  const handleToggle = async (alert: Alert) => {
    try {
      const res = await fetch("/api/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: alert.id, enabled: alert.enabled ? 0 : 1 }),
      });
      if (res.ok) {
        fetchAlerts();
      }
    } catch {}
  };

  const handleDelete = async (alert: Alert) => {
    try {
      const res = await fetch("/api/alerts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: alert.id }),
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Alert deleted." });
        fetchAlerts();
      }
    } catch {
      setMessage({ type: "error", text: "Failed to delete alert." });
    }
    setTimeout(() => setMessage(null), 3000);
  };

  const handleSimulateCiba = async (alert: Alert) => {
    setMessage(null);
    try {
      await fetch("/api/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: alert.id, ciba_status: "pending" }),
      });

      await new Promise((r) => setTimeout(r, 2000));

      const approved = Math.random() > 0.3;
      await fetch("/api/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: alert.id, ciba_status: approved ? "approved" : "denied" }),
      });

      setMessage({
        type: approved ? "success" : "error",
        text: approved
          ? `CIBA push approved! ${alert.name} is now active.`
          : `CIBA push denied for ${alert.name}.`,
      });
      fetchAlerts();
    } catch {
      setMessage({ type: "error", text: "CIBA simulation failed." });
    }
    setTimeout(() => setMessage(null), 6000);
  };

  const cibaStatusLabel = (status: string) => {
    switch (status) {
      case "pending": return <span className="badge badge-pending">Awaiting Approval</span>;
      case "approved": return <span className="badge badge-approved">Approved</span>;
      case "denied": return <span className="badge badge-denied">Denied</span>;
      default: return <span className="badge" style={{ background: "var(--border-light)", color: "var(--text-muted)" }}>Not Initiated</span>;
    }
  };

  return (
    <div className="container">
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1>Price Alerts</h1>
          <p>Configure alerts and manage Asgardeo CIBA push notifications</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowCreate(true); resetForm(); }}>
          + New Alert
        </button>
      </div>

      {message && (
        <div className={`alert-message alert-${message.type}`}>{message.text}</div>
      )}

      <div className="card mb-4">
        <div className="card-body">
          <h3 style={{ fontSize: "1rem", marginBottom: "8px" }}>How CIBA Alerts Work</h3>
          <p className="text-muted" style={{ fontSize: "0.875rem", lineHeight: 1.7 }}>
            When you create a flight or hotel alert, you can trigger a <strong>CIBA (Client Initiated Backchannel Authentication)</strong> push
            notification via Asgardeo. This sends a push to your registered device. Approve the notification to activate the alert. Once active,
            the system monitors prices and notifies you when your criteria are met.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner">Loading alerts...</div>
      ) : alerts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">&#128276;</div>
          <h3>No alerts configured</h3>
          <p>Create your first price alert to get notified about deals.</p>
        </div>
      ) : (
        <div className="grid-2">
          {alerts.map((alert) => (
            <div key={alert.id} className="result-card">
              <div className="result-card-header">
                <div>
                  <div className="result-card-title">{alert.name}</div>
                  <div className="result-card-subtitle">
                    <span className="badge" style={{ background: alert.type === "flight" ? "var(--info-light)" : "var(--accent-light)", color: alert.type === "flight" ? "var(--info)" : "var(--accent)" }}>
                      {alert.type === "flight" ? "✈ Flight" : "🏨 Hotel"}
                    </span>
                  </div>
                </div>
                <label className="toggle">
                  <input type="checkbox" checked={!!alert.enabled} onChange={() => handleToggle(alert)} />
                  <span className="toggle-track"></span>
                  <span className="toggle-label">{alert.enabled ? "On" : "Off"}</span>
                </label>
              </div>
              <div className="result-card-details">
                {alert.type === "flight" && (
                  <>
                    {alert.origin && <span>From: <strong>{alert.origin}</strong></span>}
                    {alert.destination && <span>To: <strong>{alert.destination}</strong></span>}
                  </>
                )}
                {alert.type === "hotel" && alert.city && (
                  <span>City: <strong>{alert.city}</strong></span>
                )}
                {alert.max_price && <span>Max price: <strong>${alert.max_price}</strong></span>}
                {alert.min_stars && <span>Min stars: <strong>{alert.min_stars}★</strong></span>}
              </div>
              <div className="mb-2">
                {cibaStatusLabel(alert.ciba_status)}
              </div>
              <div className="result-card-footer">
                <span className="text-muted" style={{ fontSize: "0.75rem" }}>
                  Created {new Date(alert.created_at).toLocaleDateString()}
                </span>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleSimulateCiba(alert)}>
                    Trigger CIBA Push
                  </button>
                  <button className="btn btn-outline btn-sm" onClick={() => handleDelete(alert)}>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "520px" }}>
            <h2>Create Price Alert</h2>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">Alert Name</label>
                <input
                  className="input"
                  placeholder="e.g. Cheap flights to London"
                  value={alertName}
                  onChange={(e) => setAlertName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Type</label>
                <select className="input" value={alertType} onChange={(e) => setAlertType(e.target.value as "flight" | "hotel")}>
                  <option value="flight">Flight</option>
                  <option value="hotel">Hotel</option>
                </select>
              </div>
              {alertType === "flight" ? (
                <>
                  <div className="search-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
                    <div className="form-group">
                      <label className="form-label">From (optional)</label>
                      <input className="input" placeholder="e.g. LHR" value={alertOrigin} onChange={(e) => setAlertOrigin(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">To (optional)</label>
                      <input className="input" placeholder="e.g. DXB" value={alertDest} onChange={(e) => setAlertDest(e.target.value)} />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="form-group">
                    <label className="form-label">City (optional)</label>
                    <input className="input" placeholder="e.g. Dubai" value={alertCity} onChange={(e) => setAlertCity(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Minimum Stars (optional)</label>
                    <select className="input" value={alertMinStars} onChange={(e) => setAlertMinStars(e.target.value)}>
                      <option value="">Any</option>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>{n} star{n > 1 ? "s" : ""}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
              <div className="form-group">
                <label className="form-label">Maximum Price (optional)</label>
                <input
                  className="input"
                  type="number"
                  placeholder="e.g. 500"
                  value={alertMaxPrice}
                  onChange={(e) => setAlertMaxPrice(e.target.value)}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">Create Alert</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
