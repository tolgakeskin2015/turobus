import { supabase } from "@/lib/supabase";

export type MappingChannelCode =
  | "booking"
  | "expedia"
  | "hotelbeds"
  | "airbnb"
  | "ets"
  | "jolly"
  | "tatilliyoruz"
  | "website"
  | "custom";

export type MappingConnection = {
  id: string;
  company_id: string;
  hotel_id: string;
  channel_code: MappingChannelCode;
  connection_name: string;
  status: string;

  hotel:
    | {
        id: string;
        name: string;
      }
    | {
        id: string;
        name: string;
      }[]
    | null;
};

export type MappingRoomType = {
  id: string;
  hotel_id: string;
  name: string;
  total_rooms: number | null;
  is_active: boolean | null;
};

export type MappingRatePlan = {
  id: string;
  hotel_id: string;
  room_type_id: string | null;
  name: string;
  currency: string | null;
  is_active: boolean | null;
};

export type ChannelRoomMapping = {
  id: string;
  company_id: string;
  hotel_id: string;
  connection_id: string;
  room_type_id: string;
  rate_plan_id: string | null;

  external_room_id: string;
  external_room_name: string | null;

  external_rate_plan_id: string | null;
  external_rate_plan_name: string | null;

  occupancy_code: string | null;

  pricing_model:
    | "per_room"
    | "per_person"
    | "occupancy_based";

  currency: string;

  markup_percent: number;
  commission_percent: number;

  is_active: boolean;

  last_sync_at: string | null;
  last_error_message: string | null;

  room_type:
    | {
        id: string;
        name: string;
      }
    | {
        id: string;
        name: string;
      }[]
    | null;

  rate_plan:
    | {
        id: string;
        name: string;
      }
    | {
        id: string;
        name: string;
      }[]
    | null;

  connection:
    | {
        id: string;
        connection_name: string;
        channel_code: MappingChannelCode;
      }
    | {
        id: string;
        connection_name: string;
        channel_code: MappingChannelCode;
      }[]
    | null;
};

export type MappingValidation = {
  ready: boolean;
  connection_id: string;
  channel_code: string;
  total_room_types: number;
  active_mappings: number;
  missing_room_types: number;
  missing_rate_plans: number;
  message: string;
};

function errorMessage(
  error: unknown
): string {
  if (
    error &&
    typeof error === "object" &&
    "message" in error
  ) {
    return String(
      (
        error as {
          message?: unknown;
        }
      ).message ??
        "İşlem tamamlanamadı."
    );
  }

  return "İşlem tamamlanamadı.";
}

export async function getChannelMappingData(
  companyId: string
): Promise<{
  connections: MappingConnection[];
  roomTypes: MappingRoomType[];
  ratePlans: MappingRatePlan[];
  mappings: ChannelRoomMapping[];
}> {
  const [
    {
      data: connectionData,
      error: connectionError,
    },
    {
      data: roomTypeData,
      error: roomTypeError,
    },
    {
      data: ratePlanData,
      error: ratePlanError,
    },
    {
      data: mappingData,
      error: mappingError,
    },
  ] = await Promise.all([
    supabase
      .from(
        "hotel_channel_connections"
      )
      .select(`
        id,
        company_id,
        hotel_id,
        channel_code,
        connection_name,
        status,
        hotel:hotels (
          id,
          name
        )
      `)
      .eq("company_id", companyId)
      .order("connection_name"),

    supabase
      .from("hotel_room_types")
      .select(`
        id,
        hotel_id,
        name,
        total_rooms,
        is_active
      `)
      .eq("company_id", companyId)
      .order("name"),

    supabase
      .from("hotel_rate_plans")
      .select(`
        id,
        hotel_id,
        room_type_id,
        name,
        currency,
        is_active
      `)
      .eq("company_id", companyId)
      .order("name"),

    supabase
      .from(
        "hotel_channel_room_mappings"
      )
      .select(`
        id,
        company_id,
        hotel_id,
        connection_id,
        room_type_id,
        rate_plan_id,

        external_room_id,
        external_room_name,

        external_rate_plan_id,
        external_rate_plan_name,

        occupancy_code,
        pricing_model,
        currency,
        markup_percent,
        commission_percent,

        is_active,
        last_sync_at,
        last_error_message,

        room_type:hotel_room_types (
          id,
          name
        ),

        rate_plan:hotel_rate_plans (
          id,
          name
        ),

        connection:hotel_channel_connections (
          id,
          connection_name,
          channel_code
        )
      `)
      .eq("company_id", companyId)
      .order("created_at", {
        ascending: false,
      }),
  ]);

  const error =
    connectionError ??
    roomTypeError ??
    ratePlanError ??
    mappingError;

  if (error) {
    throw new Error(
      errorMessage(error)
    );
  }

  return {
    connections:
      (connectionData ??
        []) as unknown as MappingConnection[],

    roomTypes:
      (roomTypeData ??
        []) as MappingRoomType[],

    ratePlans:
      (ratePlanData ??
        []) as MappingRatePlan[],

    mappings:
      (mappingData ??
        []) as unknown as ChannelRoomMapping[],
  };
}

export async function createChannelMapping(
  input: {
    companyId: string;
    hotelId: string;
    connectionId: string;
    roomTypeId: string;
    ratePlanId?: string | null;

    externalRoomId: string;
    externalRoomName?: string | null;

    externalRatePlanId?: string | null;
    externalRatePlanName?: string | null;

    occupancyCode?: string | null;

    pricingModel:
      | "per_room"
      | "per_person"
      | "occupancy_based";

    currency: string;

    markupPercent: number;
    commissionPercent: number;
  }
): Promise<void> {
  const { error } = await supabase
    .from(
      "hotel_channel_room_mappings"
    )
    .insert({
      company_id: input.companyId,
      hotel_id: input.hotelId,
      connection_id:
        input.connectionId,
      room_type_id:
        input.roomTypeId,
      rate_plan_id:
        input.ratePlanId ?? null,

      external_room_id:
        input.externalRoomId,

      external_room_name:
        input.externalRoomName ?? null,

      external_rate_plan_id:
        input.externalRatePlanId ??
        null,

      external_rate_plan_name:
        input.externalRatePlanName ??
        null,

      occupancy_code:
        input.occupancyCode ?? null,

      pricing_model:
        input.pricingModel,

      currency: input.currency,

      markup_percent:
        input.markupPercent,

      commission_percent:
        input.commissionPercent,

      is_active: true,

      updated_at:
        new Date().toISOString(),
    });

  if (error) {
    throw new Error(
      errorMessage(error)
    );
  }
}

export async function updateChannelMapping(
  input: {
    companyId: string;
    mappingId: string;
    ratePlanId?: string | null;

    externalRoomId: string;
    externalRoomName?: string | null;

    externalRatePlanId?: string | null;
    externalRatePlanName?: string | null;

    occupancyCode?: string | null;

    pricingModel:
      | "per_room"
      | "per_person"
      | "occupancy_based";

    currency: string;

    markupPercent: number;
    commissionPercent: number;

    isActive: boolean;
  }
): Promise<void> {
  const { error } = await supabase
    .from(
      "hotel_channel_room_mappings"
    )
    .update({
      rate_plan_id:
        input.ratePlanId ?? null,

      external_room_id:
        input.externalRoomId,

      external_room_name:
        input.externalRoomName ?? null,

      external_rate_plan_id:
        input.externalRatePlanId ??
        null,

      external_rate_plan_name:
        input.externalRatePlanName ??
        null,

      occupancy_code:
        input.occupancyCode ?? null,

      pricing_model:
        input.pricingModel,

      currency: input.currency,

      markup_percent:
        input.markupPercent,

      commission_percent:
        input.commissionPercent,

      is_active: input.isActive,

      updated_at:
        new Date().toISOString(),
    })
    .eq("company_id", input.companyId)
    .eq("id", input.mappingId);

  if (error) {
    throw new Error(
      errorMessage(error)
    );
  }
}

export async function deleteChannelMapping(
  companyId: string,
  mappingId: string
): Promise<void> {
  const { error } = await supabase
    .from(
      "hotel_channel_room_mappings"
    )
    .delete()
    .eq("company_id", companyId)
    .eq("id", mappingId);

  if (error) {
    throw new Error(
      errorMessage(error)
    );
  }
}

export async function validateChannelMapping(
  companyId: string,
  connectionId: string
): Promise<MappingValidation> {
  const { data, error } =
    await supabase.rpc(
      "validate_hotel_channel_mapping",
      {
        p_company_id: companyId,
        p_connection_id:
          connectionId,
      }
    );

  if (error) {
    throw new Error(
      errorMessage(error)
    );
  }

  return data as MappingValidation;
}

export async function enqueueValidatedFullSync(
  companyId: string,
  connectionId: string
): Promise<string> {
  const { data, error } =
    await supabase.rpc(
      "enqueue_validated_channel_full_sync",
      {
        p_company_id: companyId,
        p_connection_id:
          connectionId,
      }
    );

  if (error) {
    throw new Error(
      errorMessage(error)
    );
  }

  const result = data as {
    id?: string;
  };

  if (!result?.id) {
    throw new Error(
      "Senkronizasyon kuyruğu oluşturulamadı."
    );
  }

  return result.id;
}
