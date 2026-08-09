import { getSupabaseAdmin } from "@/lib/supabase-admin";

export type AutoSyncOperation =
  | "inventory_update"
  | "rate_update"
  | "restriction_update";

type EnqueueInput = {
  companyId: string;
  hotelId: string;
  operation: AutoSyncOperation;
  payload: Record<string, unknown>;
  priority?: number;
};

export async function enqueueChannelOperationForHotel(
  input: EnqueueInput
) {
  const supabase = getSupabaseAdmin();

  const { data: connections, error: connectionError } =
    await supabase
      .from("hotel_channel_connections")
      .select(
        "id, channel_code, sync_inventory, sync_rates, sync_restrictions"
      )
      .eq("company_id", input.companyId)
      .eq("hotel_id", input.hotelId)
      .eq("status", "active");

  if (connectionError) {
    throw new Error(connectionError.message);
  }

  if (!connections?.length) {
    return {
      queued: 0,
      message: "Aktif kanal bağlantısı bulunamadı.",
    };
  }

  const rows = connections
    .filter((connection) => {
      if (
        input.operation === "inventory_update"
      ) {
        return connection.sync_inventory !== false;
      }

      if (
        input.operation === "rate_update"
      ) {
        return connection.sync_rates !== false;
      }

      if (
        input.operation === "restriction_update"
      ) {
        return connection.sync_restrictions !== false;
      }

      return true;
    })
    .map((connection) => ({
      company_id: input.companyId,
      hotel_id: input.hotelId,
      connection_id: connection.id,
      operation_type: input.operation,
      payload: {
        ...input.payload,
        channel_code: connection.channel_code,
        auto_generated: true,
        generated_at: new Date().toISOString(),
      },
      priority: input.priority ?? 100,
      status: "pending",
      attempt_count: 0,
      available_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

  if (!rows.length) {
    return {
      queued: 0,
      message:
        "Aktif bağlantılarda bu senkronizasyon türü kapalı.",
    };
  }

  const { error: insertError } = await supabase
    .from("hotel_channel_sync_queue")
    .insert(rows);

  if (insertError) {
    throw new Error(insertError.message);
  }

  return {
    queued: rows.length,
    operation: input.operation,
  };
}

export async function enqueueInventoryAndRestrictions(
  input: {
    companyId: string;
    hotelId: string;
    roomTypeId: string;
    inventoryDate: string;
    totalInventory: number;
    reservedInventory: number;
    blockedInventory: number;
    stopSale: boolean;
    minimumStay: number;
    closedToArrival: boolean;
    closedToDeparture: boolean;
  }
) {
  const availableInventory = Math.max(
    0,
    input.totalInventory -
      input.reservedInventory -
      input.blockedInventory
  );

  const inventoryResult =
    await enqueueChannelOperationForHotel({
      companyId: input.companyId,
      hotelId: input.hotelId,
      operation: "inventory_update",
      priority: 50,
      payload: {
        room_type_id: input.roomTypeId,
        inventory_date: input.inventoryDate,
        total_inventory: input.totalInventory,
        reserved_inventory:
          input.reservedInventory,
        blocked_inventory:
          input.blockedInventory,
        available_inventory:
          availableInventory,
      },
    });

  const restrictionResult =
    await enqueueChannelOperationForHotel({
      companyId: input.companyId,
      hotelId: input.hotelId,
      operation: "restriction_update",
      priority: 60,
      payload: {
        room_type_id: input.roomTypeId,
        inventory_date: input.inventoryDate,
        stop_sale: input.stopSale,
        minimum_stay: input.minimumStay,
        closed_to_arrival:
          input.closedToArrival,
        closed_to_departure:
          input.closedToDeparture,
      },
    });

  return {
    inventory: inventoryResult,
    restrictions: restrictionResult,
  };
}
