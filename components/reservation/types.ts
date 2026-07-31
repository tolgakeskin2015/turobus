export type Tour = {
  id: string;
  slug: string;
  title: string;
  city: string;
  district: string | null;
  adult_price: number;
  child_price: number;
  cover_image: string | null;
};

export type Departure = {
  id: string;
  tour_id: string;
  departure_date: string;
  capacity: number;
  reserved_count: number;
  adult_price: number | null;
  child_price: number | null;
  status: "active" | "full" | "cancelled";
};

export type ReservationResult = {
  reservation_id: string;
  reservation_code: string;
  tour_title: string;
  tour_date: string;
  guests: number;
  unit_price: number;
  total_price: number;
};
