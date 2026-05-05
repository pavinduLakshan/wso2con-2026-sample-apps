"use client";

import { useState, useEffect, useCallback } from "react";
import type { Flight, Hotel, Booking } from "@/lib/types";
import Link from "next/link";

export default function SearchPage() {
  const [tab, setTab] = useState<"flights" | "hotels">("flights");

  return (
    <div className="container">
      <div className="page-header">
        <h1>Find Your Trip</h1>
        <p>Search flights and hotels for your next journey</p>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === "flights" ? "active" : ""}`} onClick={() => setTab("flights")}>
          &#9992; Flights
        </button>
        <button className={`tab ${tab === "hotels" ? "active" : ""}`} onClick={() => setTab("hotels")}>
          &#127968; Hotels
        </button>
      </div>

      {tab === "flights" ? <FlightSearch /> : <HotelSearch />}
    </div>
  );
}

function FlightSearch() {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const searchFlights = useCallback(async (originFilter?: string, destFilter?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (originFilter) params.set("origin", originFilter);
      if (destFilter) params.set("destination", destFilter);
      const res = await fetch(`/api/flights?${params.toString()}`);
      const data = await res.json();
      setFlights(data);
    } catch {
      setFlights([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    searchFlights();
  }, [searchFlights]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchFlights(origin, destination);
  };

  const handleBook = async (flight: Flight) => {
    setMessage(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "flight", item_id: flight.id }),
      });
      if (res.ok) {
        setMessage({ type: "success", text: `Booked ${flight.airline} ${flight.flight_number} successfully!` });
      } else {
        setMessage({ type: "error", text: "Booking failed. Please try again." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error. Please try again." });
    }
    setTimeout(() => setMessage(null), 5000);
  };

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div>
      <form className="search-bar" onSubmit={handleSearch}>
        <div className="search-grid">
          <div className="form-group">
            <label className="form-label">From</label>
            <input
              className="input"
              placeholder="City or airport code (e.g. LHR, Dubai)"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">To</label>
            <input
              className="input"
              placeholder="City or airport code (e.g. JFK, Paris)"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">&nbsp;</label>
            <button type="submit" className="btn btn-primary" style={{ height: "42px" }}>
              Search Flights
            </button>
          </div>
        </div>
      </form>

      {message && (
        <div className={`alert-message alert-${message.type}`}>{message.text}</div>
      )}

      {loading ? (
        <div className="loading-spinner">Loading flights...</div>
      ) : flights.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">&#9992;</div>
          <h3>No flights found</h3>
          <p>Try adjusting your search criteria</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Airline</th>
                <th>Route</th>
                <th>Departure</th>
                <th>Arrival</th>
                <th>Stops</th>
                <th>Price</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {flights.map((flight) => (
                <tr key={flight.id}>
                  <td>
                    <strong>{flight.airline}</strong>
                    <div className="text-muted" style={{ fontSize: "0.75rem" }}>{flight.flight_number}</div>
                  </td>
                  <td>
                    {flight.origin_city} ({flight.origin}) → {flight.destination_city} ({flight.destination})
                  </td>
                  <td>{formatDate(flight.departure_time)}</td>
                  <td>{formatDate(flight.arrival_time)}</td>
                  <td>{flight.stops === 0 ? <span style={{ color: "var(--success)" }}>Direct</span> : `${flight.stops} stop(s)`}</td>
                  <td>
                    <span className="price">${flight.price}</span>
                  </td>
                  <td>
                    <button className="btn btn-primary btn-sm" onClick={() => handleBook(flight)}>
                      Book Now
                    </button>
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

function HotelSearch() {
  const [city, setCity] = useState("");
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(1);

  const searchHotels = useCallback(async (cityFilter?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (cityFilter) params.set("city", cityFilter);
      const res = await fetch(`/api/hotels?${params.toString()}`);
      const data = await res.json();
      setHotels(data);
    } catch {
      setHotels([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    searchHotels();
  }, [searchHotels]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchHotels(city);
  };

  const handleBook = async () => {
    if (!selectedHotel) return;
    setMessage(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "hotel",
          item_id: selectedHotel.id,
          check_in_date: checkIn || new Date().toISOString().split("T")[0],
          check_out_date: checkOut || new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0],
          guests,
        }),
      });
      if (res.ok) {
        const booking = await res.json();
        setMessage({ type: "success", text: `Booked ${selectedHotel.name} — ${guests} guest(s) — $${booking.total_price}` });
        setSelectedHotel(null);
      } else {
        setMessage({ type: "error", text: "Booking failed. Please try again." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error. Please try again." });
    }
    setTimeout(() => setMessage(null), 5000);
  };

  const renderStars = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);

  return (
    <div>
      <form className="search-bar" onSubmit={handleSearch}>
        <div className="search-grid-1">
          <div className="form-group">
            <label className="form-label">City</label>
            <input
              className="input"
              placeholder="Where are you going? (e.g. Dubai, New York)"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">&nbsp;</label>
            <button type="submit" className="btn btn-primary" style={{ height: "42px" }}>
              Search Hotels
            </button>
          </div>
        </div>
      </form>

      {message && (
        <div className={`alert-message alert-${message.type}`}>{message.text}</div>
      )}

      {loading ? (
        <div className="loading-spinner">Loading hotels...</div>
      ) : hotels.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">&#127968;</div>
          <h3>No hotels found</h3>
          <p>Try a different city</p>
        </div>
      ) : (
        <div className="grid-2">
          {hotels.map((hotel) => (
            <div key={hotel.id} className="result-card">
              <div className="result-card-header">
                <div>
                  <div className="result-card-title">{hotel.name}</div>
                  <div className="result-card-subtitle">{hotel.city}, {hotel.country} &middot; {hotel.location}</div>
                </div>
              </div>
              <div className="stars mb-1">{renderStars(hotel.star_rating)}</div>
              <div className="result-card-details">
                {hotel.amenities && hotel.amenities.split(", ").map((amenity) => (
                  <span key={amenity} style={{ background: "var(--border-light)", padding: "2px 8px", borderRadius: "var(--radius-full)" }}>{amenity}</span>
                ))}
              </div>
              <div className="result-card-footer">
                <div>
                  <span className="price">${hotel.price_per_night}</span>
                  <span className="price-detail"> / night</span>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => setSelectedHotel(hotel)}>
                  Book Now
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedHotel && (
        <div className="modal-overlay" onClick={() => setSelectedHotel(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Book {selectedHotel.name}</h2>
            <p className="text-muted mb-3">{selectedHotel.city}, {selectedHotel.country}</p>
            <div className="form-group">
              <label className="form-label">Check-in Date</label>
              <input
                type="date"
                className="input"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Check-out Date</label>
              <input
                type="date"
                className="input"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Guests</label>
              <select className="input" value={guests} onChange={(e) => setGuests(Number(e.target.value))}>
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>{n} guest{n > 1 ? "s" : ""}</option>
                ))}
              </select>
            </div>
            <div className="result-card-footer" style={{ border: "none", paddingBottom: 0 }}>
              <span className="price">${selectedHotel.price_per_night}</span>
              <span className="price-detail"> / night</span>
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline btn-sm" onClick={() => setSelectedHotel(null)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={handleBook}>Confirm Booking</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
