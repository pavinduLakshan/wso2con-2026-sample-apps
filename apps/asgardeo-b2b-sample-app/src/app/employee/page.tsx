"use client";

import { useState, useEffect, useCallback } from "react";
import type { Flight, Hotel } from "@/lib/types";

export default function EmployeeDashboard() {
  const [activeTab, setActiveTab] = useState<"flights" | "hotels">("flights");

  return (
    <div>
      <div className="page-header">
        <h1>Employee Dashboard</h1>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === "flights" ? "active" : ""}`}
          onClick={() => setActiveTab("flights")}
        >
          Flights
        </button>
        <button
          className={`tab ${activeTab === "hotels" ? "active" : ""}`}
          onClick={() => setActiveTab("hotels")}
        >
          Hotels
        </button>
      </div>

      {activeTab === "flights" ? <FlightSearch /> : <HotelSearch />}
    </div>
  );
}

function FlightSearch() {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [message, setMessage] = useState("");

  const searchFlights = useCallback(async () => {
    setLoading(true);
    setSearched(true);
    setMessage("");

    const params = new URLSearchParams();
    if (origin) params.set("origin", origin);
    if (destination) params.set("destination", destination);

    const res = await fetch(`/api/flights?${params.toString()}`);
    const data = await res.json();
    setFlights(data);
    setLoading(false);
  }, [origin, destination]);

  useEffect(() => {
    searchFlights();
  }, []);

  const submitRequest = async (flight: Flight) => {
    const res = await fetch("/api/travel-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "flight", item_id: flight.id }),
    });

    if (res.ok) {
      setMessage(`Request submitted for ${flight.airline} ${flight.flight_number}`);
      setTimeout(() => setMessage(""), 3000);
    } else {
      setMessage("Failed to submit request. Please try again.");
    }
  };

  return (
    <div>
      {message && (
        <div
          className="card mb-3"
          style={{
            background: message.includes("Failed") ? "var(--danger)" : "var(--success)",
            color: "white",
          }}
        >
          {message}
        </div>
      )}

      <div className="search-bar">
        <input
          className="input"
          placeholder="From (city or airport code)"
          value={origin}
          onChange={(e) => setOrigin(e.target.value)}
        />
        <input
          className="input"
          placeholder="To (city or airport code)"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
        />
        <button className="btn btn-primary" onClick={searchFlights}>
          Search Flights
        </button>
      </div>

      <div className="mt-3">
        {loading && <p style={{ textAlign: "center", padding: "2rem" }}>Searching flights...</p>}

        {!loading && searched && flights.length === 0 && (
          <div className="empty-state">
            <h3>No flights found</h3>
            <p>Try adjusting your search criteria.</p>
          </div>
        )}

        {flights.length > 0 && (
          <div className="card">
            {flights.map((flight) => (
              <div key={flight.id} className="result-item">
                <div className="result-info">
                  <h4>{flight.airline} {flight.flight_number}</h4>
                  <p>
                    {flight.origin_city} ({flight.origin}) &rarr;{" "}
                    {flight.destination_city} ({flight.destination})
                    {flight.stops > 0 && ` — ${flight.stops} stop(s)`}
                  </p>
                  <p style={{ fontSize: "0.8rem" }}>
                    Departs: {new Date(flight.departure_time).toLocaleString()} |{" "}
                    Arrives: {new Date(flight.arrival_time).toLocaleString()}
                  </p>
                </div>
                <div className="result-price">
                  <div className="price">${flight.price}</div>
                  <div className="detail">per person</div>
                  <button
                    className="btn btn-primary btn-sm mt-1"
                    onClick={() => submitRequest(flight)}
                  >
                    Request Booking
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function HotelSearch() {
  const [city, setCity] = useState("");
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [message, setMessage] = useState("");

  const searchHotels = useCallback(async () => {
    setLoading(true);
    setSearched(true);
    setMessage("");

    const params = new URLSearchParams();
    if (city) params.set("city", city);

    const res = await fetch(`/api/hotels?${params.toString()}`);
    const data = await res.json();
    setHotels(data);
    setLoading(false);
  }, [city]);

  useEffect(() => {
    searchHotels();
  }, []);

  const submitRequest = async (hotel: Hotel) => {
    const res = await fetch("/api/travel-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "hotel",
        item_id: hotel.id,
        check_in_date: new Date().toISOString().split("T")[0],
        check_out_date: new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0],
      }),
    });

    if (res.ok) {
      setMessage(`Request submitted for ${hotel.name}`);
      setTimeout(() => setMessage(""), 3000);
    } else {
      setMessage("Failed to submit request. Please try again.");
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: rating }, (_, i) => (
      <span key={i} style={{ color: "#f59e0b" }}>&#9733;</span>
    ));
  };

  return (
    <div>
      {message && (
        <div
          className="card mb-3"
          style={{
            background: message.includes("Failed") ? "var(--danger)" : "var(--success)",
            color: "white",
          }}
        >
          {message}
        </div>
      )}

      <div className="search-bar">
        <input
          className="input"
          placeholder="Search by city"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
        <button className="btn btn-primary" onClick={searchHotels}>
          Search Hotels
        </button>
      </div>

      <div className="mt-3">
        {loading && <p style={{ textAlign: "center", padding: "2rem" }}>Searching hotels...</p>}

        {!loading && searched && hotels.length === 0 && (
          <div className="empty-state">
            <h3>No hotels found</h3>
            <p>Try adjusting your search criteria.</p>
          </div>
        )}

        {hotels.length > 0 && (
          <div className="grid grid-2">
            {hotels.map((hotel) => (
              <div key={hotel.id} className="card">
                <h4 style={{ marginBottom: "0.5rem" }}>{hotel.name}</h4>
                <p style={{ marginBottom: "0.25rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                  {renderStars(hotel.star_rating)}
                </p>
                <p style={{ marginBottom: "0.5rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                  {hotel.location}, {hotel.city}, {hotel.country}
                </p>
                {hotel.amenities && (
                  <p style={{ marginBottom: "0.5rem", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                    {hotel.amenities}
                  </p>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem" }}>
                  <div>
                    <span className="price" style={{ color: "var(--accent)", fontWeight: 700, fontSize: "1.25rem" }}>
                      ${hotel.price_per_night}
                    </span>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>/night</span>
                  </div>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => submitRequest(hotel)}
                  >
                    Request Booking
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
