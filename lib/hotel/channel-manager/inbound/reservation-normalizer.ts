export type NormalizedInboundReservation = {
  externalEventId: string | null;
  externalReservationId: string;
  eventType:
    | "reservation_create"
    | "reservation_update"
    | "reservation_cancel";
  externalRoomId: string | null;
  externalRatePlanId: string | null;
  checkIn: string | null;
  checkOut: string | null;
  guestFirstName: string;
  guestLastName: string;
  guestEmail: string | null;
  guestPhone: string | null;
  adults: number;
  children: number;
  totalAmount: number;
  currency: string;
  reservationStatus: string;
  raw: Record<string, unknown>;
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function nullableText(value: unknown) {
  const v = text(value);
  return v || null;
}

function numeric(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function normalizeInboundReservation(
  input: Record<string, unknown>
): NormalizedInboundReservation {
  const externalReservationId = text(
    input.external_reservation_id ??
    input.reservation_id ??
    input.booking_id ??
    input.id
  );

  if (!externalReservationId) {
    throw new Error("External reservation ID bulunamadı.");
  }

  const rawEvent = text(
    input.event_type ??
    input.operation ??
    input.action
  ).toLowerCase();

  const eventType =
    rawEvent.includes("cancel")
      ? "reservation_cancel"
      : rawEvent.includes("update") || rawEvent.includes("modify")
        ? "reservation_update"
        : "reservation_create";

  return {
    externalEventId: nullableText(
      input.external_event_id ?? input.event_id
    ),
    externalReservationId,
    eventType,
    externalRoomId: nullableText(
      input.external_room_id ?? input.room_id
    ),
    externalRatePlanId: nullableText(
      input.external_rate_plan_id ?? input.rate_plan_id
    ),
    checkIn: nullableText(
      input.check_in ?? input.checkin ?? input.arrival_date
    ),
    checkOut: nullableText(
      input.check_out ?? input.checkout ?? input.departure_date
    ),
    guestFirstName: text(
      input.guest_first_name ?? input.first_name
    ),
    guestLastName: text(
      input.guest_last_name ?? input.last_name
    ),
    guestEmail: nullableText(
      input.guest_email ?? input.email
    ),
    guestPhone: nullableText(
      input.guest_phone ?? input.phone
    ),
    adults: Math.max(1, numeric(input.adults, 1)),
    children: Math.max(0, numeric(input.children, 0)),
    totalAmount: Math.max(
      0,
      numeric(input.total_amount ?? input.total, 0)
    ),
    currency: text(input.currency) || "TRY",
    reservationStatus: text(input.status) || "confirmed",
    raw: input,
  };
}
