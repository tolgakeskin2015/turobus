import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { normalizeInboundReservation } from "./reservation-normalizer";
import { createReservationFingerprint } from "./fingerprint";

export async function receiveChannelReservation(input: {
  connectionId: string;
  payload: Record<string, unknown>;
}) {
  const supabase = getSupabaseAdmin();

  const { data: connection, error: connectionError } =
    await supabase
      .from("hotel_channel_connections")
      .select("id,company_id,hotel_id,channel_code,status")
      .eq("id", input.connectionId)
      .maybeSingle();

  if (connectionError) {
    throw new Error(connectionError.message);
  }

  if (!connection) {
    throw new Error("Kanal bağlantısı bulunamadı.");
  }

  if (connection.status !== "active") {
    throw new Error("Kanal bağlantısı aktif değil.");
  }

  const normalized =
    normalizeInboundReservation(input.payload);

  const fingerprint =
    createReservationFingerprint({
      connectionId: connection.id,
      externalEventId: normalized.externalEventId,
      externalReservationId:
        normalized.externalReservationId,
      eventType: normalized.eventType,
      checkIn: normalized.checkIn,
      checkOut: normalized.checkOut,
      externalRoomId: normalized.externalRoomId,
      externalRatePlanId:
        normalized.externalRatePlanId,
      status: normalized.reservationStatus,
      total: normalized.totalAmount,
    });

  const { data: existing, error: existingError } =
    await supabase
      .from("hotel_channel_reservation_inbox")
      .select("id,processing_status")
      .eq("connection_id", connection.id)
      .eq("event_fingerprint", fingerprint)
      .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing) {
    return {
      duplicate: true,
      inboxId: existing.id,
      status: existing.processing_status,
    };
  }

  let mapping:
    | {
        room_type_id: string;
        rate_plan_id: string | null;
      }
    | null = null;

  if (normalized.externalRoomId) {
    let q = supabase
      .from("hotel_channel_room_mappings")
      .select("room_type_id,rate_plan_id")
      .eq("company_id", connection.company_id)
      .eq("hotel_id", connection.hotel_id)
      .eq("connection_id", connection.id)
      .eq("external_room_id", normalized.externalRoomId)
      .eq("is_active", true);

    if (normalized.externalRatePlanId) {
      q = q.eq(
        "external_rate_plan_id",
        normalized.externalRatePlanId
      );
    }

    const { data, error } =
      await q.limit(1).maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    mapping = data;
  }

  const processingStatus =
    mapping ? "ready" : "mapping_required";

  const { data: inbox, error: insertError } =
    await supabase
      .from("hotel_channel_reservation_inbox")
      .insert({
        company_id: connection.company_id,
        hotel_id: connection.hotel_id,
        connection_id: connection.id,
        channel_code: connection.channel_code,
        external_event_id:
          normalized.externalEventId,
        external_reservation_id:
          normalized.externalReservationId,
        event_type: normalized.eventType,
        external_room_id:
          normalized.externalRoomId,
        external_rate_plan_id:
          normalized.externalRatePlanId,
        room_type_id:
          mapping?.room_type_id ?? null,
        rate_plan_id:
          mapping?.rate_plan_id ?? null,
        check_in: normalized.checkIn,
        check_out: normalized.checkOut,
        guest_first_name:
          normalized.guestFirstName,
        guest_last_name:
          normalized.guestLastName,
        guest_email: normalized.guestEmail,
        guest_phone: normalized.guestPhone,
        adults: normalized.adults,
        children: normalized.children,
        total_amount: normalized.totalAmount,
        currency: normalized.currency,
        reservation_status:
          normalized.reservationStatus,
        event_fingerprint: fingerprint,
        processing_status: processingStatus,
        raw_payload: normalized.raw,
        updated_at: new Date().toISOString(),
      })
      .select("id,processing_status")
      .single();

  if (insertError) {
    throw new Error(insertError.message);
  }

  return {
    duplicate: false,
    inboxId: inbox.id,
    status: inbox.processing_status,
    mappingFound: Boolean(mapping),
  };
}
