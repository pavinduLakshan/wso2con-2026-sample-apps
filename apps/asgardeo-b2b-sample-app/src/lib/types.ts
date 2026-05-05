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
}

export interface TravelRequest {
  id: number;
  user_id: number;
  type: "flight" | "hotel";
  item_id: number;
  check_in_date: string | null;
  check_out_date: string | null;
  status: "pending" | "approved" | "rejected";
  admin_notes: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: number;
  sub: string;
  name: string;
  email: string;
  organization_id: number | null;
  role: "employee" | "admin";
}
