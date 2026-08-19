export type Customer360Customer = {
  id: string;
  company_id: string;
  customer_code: string;

  full_name: string;

  phone: string | null;
  email: string | null;

  birth_date: string | null;

  gender:
    | "male"
    | "female"
    | "other"
    | "unspecified"
    | null;

  nationality: string | null;

  identity_type:
    | "tc"
    | "passport"
    | "other"
    | null;

  identity_number: string | null;

  address: string | null;
  city: string | null;
  country: string | null;

  preferred_language:
    string | null;

  segment:
    | "standard"
    | "repeat"
    | "vip"
    | "corporate"
    | "risk";

  status:
    | "active"
    | "inactive"
    | "blocked";

  source: string | null;

  marketing_consent: boolean;
  kvkk_consent: boolean;

  notes_summary: string | null;

  created_at: string;
  updated_at: string;
};


export type Customer360Traveler = {
  id: string;
  customer_id: string;
  full_name: string;
  relationship_label: string | null;
  phone: string | null;
  email: string | null;
  birth_date: string | null;
  nationality: string | null;
  identity_type: string | null;
  identity_number: string | null;
  is_primary: boolean;
};


export type Customer360Note = {
  id: string;
  customer_id: string;
  note: string;
  note_type: string;
  is_important: boolean;
  created_at: string;
};


export type Customer360Case = {
  id: string;
  customer_id: string;
  case_type:
    | "request"
    | "complaint";

  title: string;

  detail: string | null;

  priority: string;
  status: string;

  created_at: string;
};


export type Customer360Message = {
  id: string;
  customer_id: string;
  channel: string;
  direction: string;
  subject: string | null;
  body: string | null;
  sent_at: string;
};


export type Customer360EntityLink = {
  id: string;
  customer_id: string;
  entity_type: string;
  entity_id: string | null;
  entity_key: string | null;
  title: string | null;
  amount: number | null;
  currency: string | null;
  occurred_at: string | null;
};
