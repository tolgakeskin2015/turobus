import { supabase } from "@/lib/supabase";

export type ChannelCode =
  | "booking"
  | "expedia"
  | "hotelbeds"
  | "airbnb"
  | "ets"
  | "jolly"
  | "tatilliyoruz"
  | "website"
  | "custom";

export type ConnectionStatus =
  | "draft"
  | "active"
  | "paused"
  | "error"
  | "disconnected";

export type QueueStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export type ChannelHotel = {
  id: string;
  name: string;
};

export type ChannelConnection = {
  id: string;
  company_id: string;
  hotel_id: string;
  channel_code: ChannelCode;
  connection_name: string;
  status: ConnectionStatus;
  external_hotel_id: string | null;
  endpoint_url: string | null;
  sync_inventory: boolean;
  sync_rates: boolean;
  sync_restrictions: boolean;
  import_reservations: boolean;
  last_sync_at: string | null;
  last_success_at: string | null;
  last_error_at: string | null;
  last_error_message: string | null;
  created_at: string;

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

export type ChannelQueueItem = {
  id: string;
  company_id: string;
  hotel_id: string;
  connection_id: string;
  operation_type: string;
  entity_type: string | null;
  entity_id: string | null;
  payload: Record<string, unknown>;
  status: QueueStatus;
  priority: number;
  attempt_count: number;
  max_attempts: number;
  available_at: string;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  response_payload:
    | Record<string, unknown>
    | null;
  created_at: string;

  connection:
    | {
        id: string;
        connection_name: string;
        channel_code: ChannelCode;
      }
    | {
        id: string;
        connection_name: string;
        channel_code: ChannelCode;
      }[]
    | null;
};

export type ChannelLog = {
  id: string;
  connection_id: string;
  queue_id: string | null;
  direction:
    | "outbound"
    | "inbound";
  event_type: string;
  status:
    | "success"
    | "warning"
    | "error";
  message: string | null;
  duration_ms: number | null;
  created_at: string;

  connection:
    | {
        id: string;
        connection_name: string;
        channel_code: ChannelCode;
      }
    | {
        id: string;
        connection_name: string;
        channel_code: ChannelCode;
      }[]
    | null;
};

function getMessage(
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

export async function getChannelManagerData(
  companyId: string
): Promise<{
  hotels: ChannelHotel[];
  connections: ChannelConnection[];
  queue: ChannelQueueItem[];
  logs: ChannelLog[];
}> {
  const [
    {
      data: hotelData,
      error: hotelError,
    },
    {
      data: connectionData,
      error: connectionError,
    },
    {
      data: queueData,
      error: queueError,
    },
    {
      data: logData,
      error: logError,
    },
  ] = await Promise.all([
    supabase
      .from("hotels")
      .select("id, name")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .order("name"),

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
        external_hotel_id,
        endpoint_url,
        sync_inventory,
        sync_rates,
        sync_restrictions,
        import_reservations,
        last_sync_at,
        last_success_at,
        last_error_at,
        last_error_message,
        created_at,
        hotel:hotels (
          id,
          name
        )
      `)
      .eq("company_id", companyId)
      .order("created_at", {
        ascending: false,
      }),

    supabase
      .from(
        "hotel_channel_sync_queue"
      )
      .select(`
        id,
        company_id,
        hotel_id,
        connection_id,
        operation_type,
        entity_type,
        entity_id,
        payload,
        status,
        priority,
        attempt_count,
        max_attempts,
        available_at,
        started_at,
        completed_at,
        error_message,
        response_payload,
        created_at,
        connection:hotel_channel_connections (
          id,
          connection_name,
          channel_code
        )
      `)
      .eq("company_id", companyId)
      .order("created_at", {
        ascending: false,
      })
      .limit(100),

    supabase
      .from(
        "hotel_channel_sync_logs"
      )
      .select(`
        id,
        connection_id,
        queue_id,
        direction,
        event_type,
        status,
        message,
        duration_ms,
        created_at,
        connection:hotel_channel_connections (
          id,
          connection_name,
          channel_code
        )
      `)
      .eq("company_id", companyId)
      .order("created_at", {
        ascending: false,
      })
      .limit(100),
  ]);

  const error =
    hotelError ??
    connectionError ??
    queueError ??
    logError;

  if (error) {
    throw new Error(
      getMessage(error)
    );
  }

  return {
    hotels:
      (hotelData ??
        []) as ChannelHotel[],

    connections:
      (connectionData ??
        []) as unknown as ChannelConnection[],

    queue:
      (queueData ??
        []) as unknown as ChannelQueueItem[],

    logs:
      (logData ??
        []) as unknown as ChannelLog[],
  };
}

export async function createConnection(
  input: {
    companyId: string;
    hotelId: string;
    channelCode: ChannelCode;
    connectionName: string;
    externalHotelId?: string | null;
    endpointUrl?: string | null;
  }
): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const token =
    session?.access_token;

  if (!token) {
    throw new Error(
      "Oturum gerekli."
    );
  }

  const response = await fetch(
    "/api/channel-manager/connections",
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",

        Authorization:
          `Bearer ${token}`,
      },

      body: JSON.stringify({
        action:
          "create_connection",

        companyId:
          input.companyId,

        hotelId:
          input.hotelId,

        channelCode:
          input.channelCode,

        connectionName:
          input.connectionName,

        externalHotelId:
          input.externalHotelId ??
          null,

        endpointUrl:
          input.endpointUrl ??
          null,
      }),
    }
  );

  const result =
    await response.json();

  if (
    !response.ok ||
    !result.ok
  ) {
    throw new Error(
      String(
        result.error ??
        "Bağlantı oluşturulamadı."
      )
    );
  }
}

export async function saveConnectionCredentials(
  input: {
    companyId: string;
    connectionId: string;
    credentials:
      Record<string, unknown>;
    settings?:
      Record<string, unknown>;
    endpointUrl?: string | null;
  }
): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const token =
    session?.access_token;

  if (!token) {
    throw new Error(
      "Oturum gerekli."
    );
  }

  const response = await fetch(
    "/api/channel-manager/connections",
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",

        Authorization:
          `Bearer ${token}`,
      },

      body: JSON.stringify({
        action:
          "save_credentials",

        companyId:
          input.companyId,

        connectionId:
          input.connectionId,

        credentials:
          input.credentials,

        settings:
          input.settings ?? {},

        endpointUrl:
          input.endpointUrl ??
          null,
      }),
    }
  );

  const result =
    await response.json();

  if (
    !response.ok ||
    !result.ok
  ) {
    throw new Error(
      String(
        result.error ??
        "Credential kaydedilemedi."
      )
    );
  }
}

export async function testChannelConnection(
  companyId: string,
  connectionId: string
): Promise<{
  success: boolean;
  simulated: boolean;
  mode:
    | "simulation"
    | "live";
  statusCode:
    | number
    | null;
}> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const token =
    session?.access_token;

  if (!token) {
    throw new Error(
      "Oturum gerekli."
    );
  }

  const response = await fetch(
    "/api/channel-manager/connections",
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",

        Authorization:
          `Bearer ${token}`,
      },

      body: JSON.stringify({
        action:
          "test_connection",

        companyId,
        connectionId,
      }),
    }
  );

  const result =
    await response.json();

  if (
    !response.ok ||
    !result.ok
  ) {
    throw new Error(
      String(
        result.error ??
        "Bağlantı testi başarısız."
      )
    );
  }

  return {
    success:
      Boolean(
        result.success
      ),

    simulated:
      Boolean(
        result.simulated
      ),

    mode:
      result.mode === "live"
        ? "live"
        : "simulation",

    statusCode:
      typeof result.statusCode ===
      "number"
        ? result.statusCode
        : null,
  };
}

export async function getChannelRuntimeStatus(
  companyId: string
): Promise<{
  liveMode: boolean;
  mode:
    | "simulation"
    | "live";
}> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const token =
    session?.access_token;

  if (!token) {
    throw new Error(
      "Oturum gerekli."
    );
  }

  const response = await fetch(
    `/api/channel-manager/connections?companyId=${encodeURIComponent(companyId)}`,
    {
      headers: {
        Authorization:
          `Bearer ${token}`,
      },

      cache:
        "no-store",
    }
  );

  const result =
    await response.json();

  if (
    !response.ok ||
    !result.ok
  ) {
    throw new Error(
      String(
        result.error ??
        "Runtime durumu alınamadı."
      )
    );
  }

  return {
    liveMode:
      Boolean(
        result.runtime?.liveMode
      ),

    mode:
      result.runtime?.mode ===
      "live"
        ? "live"
        : "simulation",
  };
}

export async function updateConnectionStatus(
  companyId: string,
  connectionId: string,
  status: ConnectionStatus
): Promise<void> {
  const { error } = await supabase
    .from(
      "hotel_channel_connections"
    )
    .update({
      status,
      updated_at:
        new Date().toISOString(),
    })
    .eq("company_id", companyId)
    .eq("id", connectionId);

  if (error) {
    throw new Error(
      getMessage(error)
    );
  }
}

export async function deleteConnection(
  companyId: string,
  connectionId: string
): Promise<void> {
  const { error } = await supabase
    .from(
      "hotel_channel_connections"
    )
    .delete()
    .eq("company_id", companyId)
    .eq("id", connectionId);

  if (error) {
    throw new Error(
      getMessage(error)
    );
  }
}

export async function enqueueSync(
  input: {
    companyId: string;
    hotelId: string;
    connectionId: string;
    operationType:
      | "inventory_update"
      | "rate_update"
      | "restriction_update"
      | "reservation_import"
      | "full_sync"
      | "connection_test";
    payload?: Record<
      string,
      unknown
    >;
    priority?: number;
  }
): Promise<ChannelQueueItem> {
  const { data, error } =
    await supabase.rpc(
      "enqueue_hotel_channel_sync",
      {
        p_company_id:
          input.companyId,
        p_hotel_id: input.hotelId,
        p_connection_id:
          input.connectionId,
        p_operation_type:
          input.operationType,
        p_payload:
          input.payload ?? {},
        p_priority:
          input.priority ?? 100,
      }
    );

  if (error) {
    throw new Error(
      getMessage(error)
    );
  }

  return data as ChannelQueueItem;
}

export async function simulateQueueItem(
  companyId: string,
  queueId: string
): Promise<void> {
  const { error } = await supabase
    .rpc(
      "simulate_hotel_channel_queue_item",
      {
        p_company_id: companyId,
        p_queue_id: queueId,
      }
    );

  if (error) {
    throw new Error(
      getMessage(error)
    );
  }
}

export async function cancelQueueItem(
  companyId: string,
  queueId: string
): Promise<void> {
  const { error } = await supabase
    .from(
      "hotel_channel_sync_queue"
    )
    .update({
      status: "cancelled",
      updated_at:
        new Date().toISOString(),
    })
    .eq("company_id", companyId)
    .eq("id", queueId)
    .in("status", [
      "pending",
      "failed",
    ]);

  if (error) {
    throw new Error(
      getMessage(error)
    );
  }
}
