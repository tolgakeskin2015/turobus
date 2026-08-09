import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { enqueueInventoryAndRestrictions } from "../channel-auto-sync";

function parseDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

function formatDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function nightsBetween(
  checkIn: string,
  checkOut: string
) {
  const dates: string[] = [];
  const cursor = parseDate(checkIn);
  const end = parseDate(checkOut);

  while (cursor < end) {
    dates.push(formatDate(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

export async function syncInventoryAfterInboundReservation(
  input: {
    companyId: string;
    hotelId: string;
    roomTypeId: string;
    checkIn: string;
    checkOut: string;
    sourceConnectionId?: string | null;
  }
) {
  const supabase = getSupabaseAdmin();

  const { data: roomType, error: roomTypeError } =
    await supabase
      .from("hotel_room_types")
      .select("total_rooms")
      .eq("id", input.roomTypeId)
      .eq("hotel_id", input.hotelId)
      .eq("company_id", input.companyId)
      .single();

  if (roomTypeError) {
    throw new Error(roomTypeError.message);
  }

  const dates = nightsBetween(
    input.checkIn,
    input.checkOut
  );

  let queued = 0;

  for (const inventoryDate of dates) {
    const { data: reservations, error: reservationError } =
      await supabase
        .from("hotel_reservations")
        .select("id")
        .eq("company_id", input.companyId)
        .eq("hotel_id", input.hotelId)
        .eq("room_type_id", input.roomTypeId)
        .in("status", [
          "pending",
          "confirmed",
          "checked_in",
        ])
        .lte("check_in", inventoryDate)
        .gt("check_out", inventoryDate);

    if (reservationError) {
      throw new Error(reservationError.message);
    }

    const { data: inventory, error: inventoryError } =
      await supabase
        .from("hotel_inventory")
        .select(
          "total_inventory,blocked_inventory,stop_sale,minimum_stay,closed_to_arrival,closed_to_departure"
        )
        .eq("company_id", input.companyId)
        .eq("hotel_id", input.hotelId)
        .eq("room_type_id", input.roomTypeId)
        .eq("inventory_date", inventoryDate)
        .maybeSingle();

    if (inventoryError) {
      throw new Error(inventoryError.message);
    }

    const roomCapacity = Math.max(
      0,
      Number(roomType.total_rooms ?? 0)
    );

    const totalInventory =
      inventory?.total_inventory == null
        ? roomCapacity
        : Math.min(
            roomCapacity,
            Math.max(
              0,
              Number(inventory.total_inventory)
            )
          );

    const result =
      await enqueueInventoryAndRestrictions({
        companyId: input.companyId,
        hotelId: input.hotelId,
        roomTypeId: input.roomTypeId,
        inventoryDate,
        totalInventory,
        reservedInventory:
          reservations?.length ?? 0,
        blockedInventory: Math.max(
          0,
          Number(
            inventory?.blocked_inventory ?? 0
          )
        ),
        stopSale:
          inventory?.stop_sale === true,
        minimumStay: Math.max(
          1,
          Number(inventory?.minimum_stay ?? 1)
        ),
        closedToArrival:
          inventory?.closed_to_arrival === true,
        closedToDeparture:
          inventory?.closed_to_departure === true,
      });

    queued +=
      Number(result.inventory.queued ?? 0) +
      Number(result.restrictions.queued ?? 0);
  }

  return {
    dates: dates.length,
    queued,
  };
}
