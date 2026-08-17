export type TicketMode =
  | "bus"
  | "flight"
  | "ferry"
  | "train";

export type TicketTripType =
  | "one_way"
  | "round_trip";

export type TicketSort =
  | "recommended"
  | "price"
  | "fastest"
  | "earliest";

export type TicketSearchInput = {
  mode: TicketMode;
  tripType: TicketTripType;
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  adults: number;
  children: number;
  infants: number;
};

export type TicketOffer = {
  id: string;
  providerId: string;
  providerOfferId: string;
  mode: TicketMode;

  carrierName: string;
  carrierCode: string;

  origin: string;
  destination: string;

  departureDate: string;
  departureTime: string;
  arrivalTime: string;

  durationMinutes: number;

  direct: boolean;
  stops: number;

  vehicleLabel: string;
  cabinLabel: string | null;

  baggageLabel: string | null;
  seatSelection: boolean;

  refundable: boolean;
  changeable: boolean;

  remainingSeats: number | null;

  price: number;
  currency: string;

  badges: string[];
};

export type TicketPassenger = {
  type:
    | "adult"
    | "child"
    | "infant";

  firstName: string;
  lastName: string;
  birthDate: string;

  identityType:
    | "tc"
    | "passport";

  identityNumber: string;

  gender: "" | "male" | "female";

  seatPreference:
    | "any"
    | "window"
    | "aisle";
};

export type TicketHoldResult = {
  ok: boolean;
  holdId: string;
  expiresAt: string;
  providerReference: string;
};

export type TicketBookingDraft = {
  code: string;
  createdAt: string;

  search: TicketSearchInput;
  offer: TicketOffer;

  passengers: TicketPassenger[];

  contact: {
    email: string;
    phone: string;
  };

  hold: TicketHoldResult;

  status: "provider_pending";
};
