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

  const { data: queueItem, error: queueError } = await supabase
    .from("hotel_channel_sync_queue")
    .select("*")
    .eq("status", "pending")
    .lte("available_at", new Date().toISOString())
    .order("priority", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(1)
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

  const { error: processingError } = await supabase
    .from("hotel_channel_sync_queue")
    .update({
      status: "processing",
      attempt_count: item.attempt_count + 1,
      started_at: new Date().toISOString(),
      error_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", item.id)
    .eq("status", "pending");

  if (processingError) {
    throw new Error(processingError.message);
  }

  const { data: connection, error: connectionError } =
    await supabase
      .from("hotel_channel_connections")
      .select(
        "id, company_id, hotel_id, channel_code, connection_name, status, external_hotel_id, endpoint_url"
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
  const now = new Date().toISOString();

  await supabase
    .from("hotel_channel_sync_queue")
    .update({
      status: "failed",
      completed_at: now,
      error_message: message,
      updated_at: now,
    })
    .eq("id", item.id);

  await supabase
    .from("hotel_channel_connections")
    .update({
      last_sync_at: now,
      last_error_at: now,
      last_error_message: message,
      updated_at: now,
    })
    .eq("id", item.connection_id);

  await supabase.from("hotel_channel_sync_logs").insert({
    company_id: item.company_id,
    hotel_id: item.hotel_id,
    connection_id: item.connection_id,
    queue_id: item.id,
    direction: "outbound",
    event_type: item.operation_type,
    status: "error",
    request_payload: item.payload,
    message,
    duration_ms: Date.now() - startedAt,
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
  ];

  return !permanentPatterns.some(
    (pattern) => message.includes(pattern)
  );
}
