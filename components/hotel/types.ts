export type HotelType =
  | "hotel"
  | "boutique_hotel"
  | "apart_hotel"
  | "resort"
  | "hostel"
  | "bungalow"
  | "holiday_village"
  | "other";

export type Hotel = {
  id: string;
  company_id: string;
  hotel_code: string | null;
  name: string;
  star_rating: number | null;
  hotel_type: HotelType;
  country_code: string;
  city: string | null;
  district: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  check_in_time: string;
  check_out_time: string;
  currency: string;
  contact_person: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  description: string | null;
  notes: string | null;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
};

export type HotelForm = {
  name: string;
  hotel_code: string;
  hotel_type: HotelType;
  star_rating: string;
  country_code: string;
  city: string;
  district: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  check_in_time: string;
  check_out_time: string;
  currency: string;
  contact_person: string;
  contact_phone: string;
  contact_email: string;
  description: string;
  notes: string;
  is_active: boolean;
  is_verified: boolean;
};

export const emptyHotelForm: HotelForm = {
  name: "",
  hotel_code: "",
  hotel_type: "hotel",
  star_rating: "0",
  country_code: "TR",
  city: "",
  district: "",
  address: "",
  phone: "",
  email: "",
  website: "",
  check_in_time: "14:00",
  check_out_time: "12:00",
  currency: "TRY",
  contact_person: "",
  contact_phone: "",
  contact_email: "",
  description: "",
  notes: "",
  is_active: true,
  is_verified: false,
};

export const hotelTypeLabels: Record<HotelType, string> = {
  hotel: "Otel",
  boutique_hotel: "Butik Otel",
  apart_hotel: "Apart Otel",
  resort: "Resort",
  hostel: "Hostel",
  bungalow: "Bungalov",
  holiday_village: "Tatil Köyü",
  other: "Diğer",
};
