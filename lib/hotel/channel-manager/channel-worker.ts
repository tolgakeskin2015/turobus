import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  sendChannelOperation,
} from "@/lib/hotel/channel-manager/provider-adapter";

type QueueRow = {
  id: string;
  company_id: string;
  hotel_id: string;
  connection_id: string;
  operation_type: string;
  payload: Record<string, unknown>;
  attempt_count: number;
  max_attempts: number;
};

export async function processNextChannelQueueItem() {
  const supabase = getSupabaseAdmin();

  const {
    data: queueItem,
    error: queueError,
  } = await supabase
    .rpc("claim_hotel_channel_queue_item")
    .maybeSingle();

  if (queueError) {
    throw new Error(queueError.message);
  }

  if (!queueItem) {
    return {
      processed: false,
      message: "İşlenecek kuyruk kaydı bulunamadı.",
    };
  }

  const item = queueItem as QueueRow;
  const startedAt = Date.now();

  const { data: connection, error: connectionError } =
    await supabase
      .from("hotel_channel_connections")
      .select(
        "id, company_id, hotel_id, channel_code, connection_name, status, external_hotel_id, endpoint_url, credentials, settings"
      )
      .eq("id", item.connection_id)
      .eq("company_id", item.company_id)
      .maybeSingle();

  if (connectionError) {
    throw new Error(connectionError.message);
  }

  if (!connection) {
    await failQueueItem(
      supabase,
      item,
      "Kanal bağlantısı bulunamadı.",
      startedAt
    );

    return {
      processed: true,
      success: false,
      queueId: item.id,
    };
  }

  if (connection.status !== "active") {
    await failQueueItem(
      supabase,
      item,
      "Kanal bağlantısı aktif değil.",
      startedAt
    );

    return {
      processed: true,
      success: false,
      queueId: item.id,
    };
  }

  let adapterResult;

  try {
    adapterResult = await sendChannelOperation({
      channelCode: connection.channel_code,
      operationType: item.operation_type,
      endpointUrl: connection.endpoint_url,
      payload: item.payload ?? {},
      connection: {
        connectionId: connection.id,
        companyId: connection.company_id,
        hotelId: connection.hotel_id,
        endpointUrl:
          connection.endpoint_url,
        externalHotelId:
          connection.external_hotel_id,
        credentials:
          connection.credentials ?? {},
        settings:
          connection.settings ?? {},
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Provider adapter işlemi başarısız.";

    await failQueueItem(
      supabase,
      item,
      message,
      startedAt
    );

    return {
      processed: true,
      success: false,
      queueId: item.id,
      channel: connection.channel_code,
      operation: item.operation_type,
    };
  }

  if (!adapterResult.success) {
    const message =
      typeof adapterResult.responsePayload?.error === "string"
        ? adapterResult.responsePayload.error
        : "Provider işlemi başarısız.";

    await failQueueItem(
      supabase,
      item,
      message,
      startedAt
    );

    return {
      processed: true,
      success: false,
      queueId: item.id,
      channel: connection.channel_code,
      operation: item.operation_type,
    };
  }

  const responsePayload = {
    ...adapterResult.responsePayload,
    simulated: adapterResult.simulated,
    status_code: adapterResult.statusCode ?? null,
  };

  const completedAt = new Date().toISOString();

  const { error: completeError } = await supabase
    .from("hotel_channel_sync_queue")
    .update({
      status: "completed",
      completed_at: completedAt,
      response_payload: responsePayload,
      error_message: null,
      updated_at: completedAt,
    })
    .eq("id", item.id);

  if (completeError) {
    throw new Error(completeError.message);
  }

  await supabase
    .from("hotel_channel_connections")
    .update({
      last_sync_at: completedAt,
      last_success_at: completedAt,
      last_error_message: null,
      updated_at: completedAt,
    })
    .eq("id", connection.id);

  await supabase.from("hotel_channel_sync_logs").insert({
    company_id: item.company_id,
    hotel_id: item.hotel_id,
    connection_id: item.connection_id,
    queue_id: item.id,
    direction: "outbound",
    event_type: item.operation_type,
    status: "success",
    request_payload: item.payload,
    response_payload: responsePayload,
    message: adapterResult.simulated
      ? "Provider adapter simülasyonu başarıyla tamamlandı."
      : "Provider işlemi başarıyla tamamlandı.",
    duration_ms: Date.now() - startedAt,
  });

  return {
    processed: true,
    success: true,
    queueId: item.id,
    channel: connection.channel_code,
    operation: item.operation_type,
  };
}

async function failQueueItem(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  item: QueueRow,
  message: string,
  startedAt: number
) {
  const now = new Date();
  const nowIso = now.toISOString();

  const attemptsUsed = Math.max(
    1,
    Number(item.attempt_count || 1)
  );

  const maxAttempts = Math.max(
    1,
    Number(item.max_attempts || 1)
  );

  const retryable =
    isRetryableChannelError(message) &&
    attemptsUsed < maxAttempts;

  const retryAt = new Date(
    now.getTime() +
      getRetryDelayMs(attemptsUsed)
  ).toISOString();

  const { error: queueUpdateError } =
    await supabase
      .from("hotel_channel_sync_queue")
      .update(
        retryable
          ? {
              status: "pending",
              available_at: retryAt,
              completed_at: null,
              error_message: message,
              updated_at: nowIso,
            }
          : {
              status: "failed",
              completed_at: nowIso,
              error_message: message,
              updated_at: nowIso,
            }
      )
      .eq("id", item.id);

  if (queueUpdateError) {
    throw new Error(
      queueUpdateError.message
    );
  }

  const terminalFailure =
    !retryable;

  await supabase
    .from("hotel_channel_connections")
    .update({
      last_sync_at: nowIso,
      last_error_at: nowIso,
      last_error_message: message,

      ...(terminalFailure
        ? {
            status: "error",
          }
        : {}),

      updated_at: nowIso,
    })
    .eq("id", item.connection_id);

  await supabase
    .from("hotel_channel_sync_logs")
    .insert({
      company_id: item.company_id,
      hotel_id: item.hotel_id,
      connection_id: item.connection_id,
      queue_id: item.id,
      direction: "outbound",
      event_type: item.operation_type,
      status: "error",
      request_payload: item.payload,
      message: retryable
        ? `${message} | Retry ${attemptsUsed}/${maxAttempts} -> ${retryAt}`
        : `${message} | Terminal ${attemptsUsed}/${maxAttempts}`,
      duration_ms:
        Date.now() - startedAt,
    });
}

export async function processChannelQueueBatch(
  limit = 10
) {
  const results = [];

  for (
    let i = 0;
    i < limit;
    i += 1
  ) {
    const result =
      await processNextChannelQueueItem();

    results.push(result);

    if (!result.processed) {
      break;
    }
  }

  return {
    processedCount:
      results.filter(
        (item) =>
          item.processed
      ).length,

    results,
  };
}


export function getRetryDelayMs(
  attempt: number
): number {
  const normalizedAttempt = Math.max(
    1,
    Number(attempt || 1)
  );

  const baseMs = 30_000;
  const maxMs = 30 * 60_000;

  return Math.min(
    baseMs * 2 ** (normalizedAttempt - 1),
    maxMs
  );
}

export function isRetryableChannelError(
  error: unknown
): boolean {
  if (!error) return false;

  const message =
    error instanceof Error
      ? error.message.toLowerCase()
      : String(error).toLowerCase();

  const permanentPatterns = [
    "invalid mapping",
    "mapping not found",
    "unauthorized",
    "forbidden",
    "invalid credentials",
    "unsupported provider",
    "kanal bağlantısı bulunamadı",
    "kanal bağlantısı aktif değil",
    "mapping bulunamadı",
    "eşleştirme bulunamadı",
  ];

  return !permanentPatterns.some(
    (pattern) => message.includes(pattern)
  );
}
