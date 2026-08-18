
export type YachtOSYachtStatus =
  | "available"
  | "trip"
  | "maintenance"
  | "passive";

export type YachtOSBookingStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled";

export type YachtOSPaymentStatus =
  | "pending"
  | "partial"
  | "paid"
  | "refunded";

export type YachtOSAvailabilityStatus =
  | "available"
  | "booked"
  | "option"
  | "maintenance"
  | "blocked";

export type YachtOSTaskStatus =
  | "open"
  | "in_progress"
  | "completed"
  | "cancelled";

export type YachtOSTaskPriority =
  | "low"
  | "medium"
  | "high"
  | "critical";

export type YachtOSYacht = {
  id: string;
  company_id: string;
  name: string;
  yacht_type: string;
  city: string;
  marina: string | null;
  departure_point: string | null;
  length_m: number | null;
  cabins: number;
  bathrooms: number;
  max_guests: number;
  crew_count: number;
  captain_name: string | null;
  captain_phone: string | null;
  captain_included: boolean;
  fuel_included: boolean;
  meals_included: boolean;
  base_daily_price: number;
  currency: string;
  minimum_days: number;
  status: YachtOSYachtStatus;
  cover_url: string | null;
  verified: boolean;
  featured: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type YachtOSBooking = {
  id: string;
  company_id: string;
  yacht_id: string;
  booking_code: string;
  guest_name: string;
  guest_phone: string | null;
  guest_email: string | null;
  guest_count: number;
  start_date: string;
  end_date: string;
  departure_time: string | null;
  return_time: string | null;
  source: string;
  total_amount: number;
  paid_amount: number;
  commission_amount: number;
  supplier_cost: number;
  currency: string;
  status: YachtOSBookingStatus;
  payment_status: YachtOSPaymentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type YachtOSTask = {
  id: string;
  company_id: string;
  yacht_id: string | null;
  booking_id: string | null;
  title: string;
  description: string | null;
  due_at: string | null;
  assigned_to_name: string | null;
  priority: YachtOSTaskPriority;
  status: YachtOSTaskStatus;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type YachtOSSupplier = {
  id: string;
  company_id: string;
  name: string;
  category: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  commission_rate: number;
  current_balance: number;
  rating: number | null;
  status:
    | "active"
    | "pending"
    | "passive";
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type YachtOSAvailability = {
  id: string;
  company_id: string;
  yacht_id: string;
  day: string;
  status: YachtOSAvailabilityStatus;
  booking_id: string | null;
  price: number | null;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type YachtOSFinanceEntry = {
  id: string;
  company_id: string;
  booking_id: string | null;
  supplier_id: string | null;
  entry_type:
    | "sale"
    | "payment"
    | "commission"
    | "supplier_payable"
    | "refund"
    | "expense";
  amount: number;
  currency: string;
  due_date: string | null;
  paid_at: string | null;
  description: string | null;
  created_at: string;
};
