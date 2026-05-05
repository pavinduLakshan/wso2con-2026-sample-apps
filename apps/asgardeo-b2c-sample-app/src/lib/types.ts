export interface Flight {
  id: number;
  airline: string;
  flight_number: string;
  origin: string;
  origin_city: string;
  destination: string;
  destination_city: string;
  departure_time: string;
  arrival_time: string;
  price: number;
  stops: number;
  created_at: string;
}

export interface Hotel {
  id: number;
  name: string;
  location: string;
  city: string;
  country: string;
  star_rating: number;
  price_per_night: number;
  amenities: string;
  image_url: string;
  created_at: string;
}

export interface Booking {
  id: number;
  user_id: number;
  type: "flight" | "hotel";
  item_id: number;
  check_in_date: string | null;
  check_out_date: string | null;
  guests: number;
  status: "confirmed" | "cancelled";
  total_price: number;
  created_at: string;
  updated_at: string;
}

export interface Alert {
  id: number;
  user_id: number;
  name: string;
  type: "flight" | "hotel";
  origin: string | null;
  destination: string | null;
  city: string | null;
  max_price: number | null;
  min_stars: number | null;
  enabled: number;
  ciba_status: "pending" | "approved" | "denied" | "none";
  created_at: string;
  updated_at: string;
}

export interface User {
  id: number;
  sub: string;
  name: string;
  email: string;
  created_at: string;
}
