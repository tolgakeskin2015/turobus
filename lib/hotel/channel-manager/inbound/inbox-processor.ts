import { getSupabaseAdmin } from "@/lib/supabase-admin";

type InboxRow = {
  id: string;
  company_id: string;
  hotel_id: string;
  connection_id: string;
  channel_code: string;
  external_reservation_id: string;
  event_type:
    | "reservation_create"
    | "reservation_update"
    | "reservation_cancel";
  room_type_id: string | null;
  check_in: string | null;
  check_out: string | null;
  guest_first_name: string | null;
  guest_last_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  adults: number;
  children: number;
  total_amount: number;
  currency: string;
  reservation_status: string | null;
  local_reservation_id: string | null;
};

function reservationNo(channel: string, externalId: string) {
  return `${channel.toUpperCase()}-${externalId}`;
}

export async function processNextInboundReservation() {
  const supabase = getSupabaseAdmin();

  const {
    data: inbox,
    error: inboxError,
  } = await supabase
    .rpc("claim_hotel_channel_inbox_item")
    .maybeSingle();

  if (inboxError) {
    throw new Error(
      inboxError.message
    );
  }

  if (!inbox) {
    return {
      processed: false,
      message: "İşlenecek inbound rezervasyon yok.",
    };
  }

  const item = inbox as InboxRow;

  try {
    if (!item.room_type_id) {
      throw new Error("Oda tipi eşleştirmesi bulunamadı.");
    }

    const reservationNumber = reservationNo(
      item.channel_code,
      item.external_reservation_id
    );

    const { data: existing, error: existingError } = await supabase
      .from("hotel_reservations")
      .select("id,status")
      .eq("company_id", item.company_id)
      .eq("reservation_no", reservationNumber)
      .maybeSingle();

    if (existingError) {
      throw new Error(existingError.message);
    }

    if (item.event_type === "reservation_cancel") {
      if (existing) {
        const { error } = await supabase
          .from("hotel_reservations")
          .update({
            status: "cancelled",
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id)
          .eq("company_id", item.company_id);

        if (error) {
          throw new Error(error.message);
        }
      }

      await completeInbox(
        supabase,
        item.id,
        existing?.id ?? null
      );

      return {
        processed: true,
        action: "cancelled",
        localReservationId: existing?.id ?? null,
      };
    }

    if (!item.check_in || !item.check_out) {
      throw new Error("Giriş veya çıkış tarihi eksik.");
    }

    const checkIn = new Date(`${item.check_in}T00:00:00`);
    const checkOut = new Date(`${item.check_out}T00:00:00`);

    const nights = Math.max(
      1,
      Math.round(
        (checkOut.getTime() - checkIn.getTime()) / 86400000
      )
    );

    const basePayload = {
      company_id: item.company_id,
      hotel_id: item.hotel_id,
      room_type_id: item.room_type_id,
      room_id: null,
      reservation_no: reservationNumber,
      source: item.channel_code,
      status:
        item.reservation_status === "cancelled"
          ? "cancelled"
          : "confirmed",
      check_in: item.check_in,
      check_out: item.check_out,
      adults: Math.max(1, Number(item.adults ?? 1)),
      children: Math.max(0, Number(item.children ?? 0)),
      nights,
      currency: item.currency || "TRY",
      base_price:
        nights > 0
          ? Number(item.total_amount ?? 0) / nights
          : Number(item.total_amount ?? 0),
      total_price: Number(item.total_amount ?? 0),
      balance: Number(item.total_amount ?? 0),
      notes: `OTA: ${item.channel_code} | External ID: ${item.external_reservation_id}`,
      updated_at: new Date().toISOString(),
    };

    let localReservationId: string;

    if (existing) {
      const { error } = await supabase
        .from("hotel_reservations")
        .update(basePayload)
        .eq("id", existing.id)
        .eq("company_id", item.company_id);

      if (error) {
        throw new Error(error.message);
      }

      localReservationId = existing.id;
    } else {
      const { data: created, error } = await supabase
        .from("hotel_reservations")
        .insert({
          ...basePayload,
          created_by: null,
        })
        .select("id")
        .single();

      if (error) {
        throw new Error(error.message);
      }

      localReservationId = created.id;
    }

    await completeInbox(
      supabase,
      item.id,
      localReservationId
    );

    return {
      processed: true,
      action: existing ? "updated" : "created",
      localReservationId,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Inbound processor hatası.";

    await supabase
      .from("hotel_channel_reservation_inbox")
      .update({
        processing_status: "failed",
        error_message: message,
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id);

    return {
      processed: true,
      success: false,
      error: message,
    };
  }
}

async function completeInbox(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  inboxId: string,
  localReservationId: string | null
) {
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("hotel_channel_reservation_inbox")
    .update({
      processing_status: "completed",
      local_reservation_id: localReservationId,
      processed_at: now,
      updated_at: now,
      error_message: null,
    })
    .eq("id", inboxId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function processInboundReservationBatch(
  limit = 20
) {
  const results = [];

  for (let i = 0; i < limit; i += 1) {
    const result = await processNextInboundReservation();

    results.push(result);

    if (!result.processed) {
      break;
    }
  }

  return {
    processedCount: results.filter(
      (item) => item.processed
    ).length,
    results,
  };
}
