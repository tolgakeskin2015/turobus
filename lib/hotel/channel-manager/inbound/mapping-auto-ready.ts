import {
  getSupabaseAdmin,
} from "@/lib/supabase-admin";

export async function resolveWaitingInboundMappings(
  input?: {
    companyId?: string;
    connectionId?: string;
  }
) {
  const supabase =
    getSupabaseAdmin();

  let query = supabase
    .from(
      "hotel_channel_reservation_inbox"
    )
    .select(
      "id,company_id,connection_id,external_room_id,external_rate_plan_id"
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

  const {
    data: inboxRows,
    error,
  } = await query.limit(100);

  if (error) {
    throw new Error(
      error.message
    );
  }

  let resolved = 0;

  for (
    const inbox of
    inboxRows ?? []
  ) {
    if (
      !inbox.external_room_id
    ) {
      continue;
    }

    let mappingQuery =
      supabase
        .from(
          "hotel_channel_room_mappings"
        )
        .select(
          "room_type_id,rate_plan_id"
        )
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
        .eq(
          "is_active",
          true
        );

    if (
      inbox.external_rate_plan_id
    ) {
      mappingQuery =
        mappingQuery.eq(
          "external_rate_plan_id",
          inbox.external_rate_plan_id
        );
    } else {
      mappingQuery =
        mappingQuery.is(
          "external_rate_plan_id",
          null
        );
    }

    const {
      data: mapping,
      error: mappingError,
    } =
      await mappingQuery
        .limit(1)
        .maybeSingle();

    if (mappingError) {
      throw new Error(
        mappingError.message
      );
    }

    if (
      !mapping?.room_type_id
    ) {
      continue;
    }

    const {
      error: updateError,
    } = await supabase
      .from(
        "hotel_channel_reservation_inbox"
      )
      .update({
        room_type_id:
          mapping.room_type_id,

        rate_plan_id:
          mapping.rate_plan_id ??
          null,

        processing_status:
          "ready",

        error_message:
          null,

        updated_at:
          new Date()
            .toISOString(),
      })
      .eq(
        "id",
        inbox.id
      )
      .eq(
        "processing_status",
        "mapping_required"
      );

    if (updateError) {
      throw new Error(
        updateError.message
      );
    }

    resolved += 1;
  }

  return {
    checked:
      inboxRows?.length ?? 0,

    resolved,
  };
}
