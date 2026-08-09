import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function resolveWaitingInboundMappings(
  input?: {
    companyId?: string;
    connectionId?: string;
  }
) {
  const supabase = getSupabaseAdmin();

  let query = supabase
    .from("hotel_channel_reservation_inbox")
    .select(
      "id,company_id,connection_id,external_room_id"
    )
    .eq(
      "processing_status",
      "mapping_required"
    );

  if (input?.companyId) {
    query = query.eq(
      "company_id",
      input.companyId
    );
  }

  if (input?.connectionId) {
    query = query.eq(
      "connection_id",
      input.connectionId
    );
  }

  const { data: inboxRows, error } =
    await query.limit(100);

  if (error) {
    throw new Error(error.message);
  }

  let resolved = 0;

  for (const inbox of inboxRows ?? []) {
    if (!inbox.external_room_id) continue;

    const { data: mapping, error: mappingError } =
      await supabase
        .from("hotel_channel_room_mappings")
        .select("room_type_id")
        .eq(
          "company_id",
          inbox.company_id
        )
        .eq(
          "connection_id",
          inbox.connection_id
        )
        .eq(
          "external_room_id",
          inbox.external_room_id
        )
        .eq("is_active", true)
        .maybeSingle();

    if (mappingError) {
      throw new Error(mappingError.message);
    }

    if (!mapping?.room_type_id) continue;

    const { error: updateError } =
      await supabase
        .from(
          "hotel_channel_reservation_inbox"
        )
        .update({
          room_type_id:
            mapping.room_type_id,
          processing_status: "ready",
          error_message: null,
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", inbox.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    resolved += 1;
  }

  return {
    checked: inboxRows?.length ?? 0,
    resolved,
  };
}
