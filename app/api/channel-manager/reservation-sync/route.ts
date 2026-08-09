import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { enqueueChannelOperationForHotel } from "@/lib/hotel/channel-manager/channel-auto-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Impact = {
  hotelId: string;
  roomTypeId: string;
  checkIn: string;
  checkOut: string;
};

function getNightDates(checkIn: string, checkOut: string) {
  const dates: string[] = [];
  const cursor = new Date(`${checkIn}T00:00:00`);
  const end = new Date(`${checkOut}T00:00:00`);

  while (cursor < end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const companyId = String(body.companyId ?? "");
    const impacts = (body.impacts ?? []) as Impact[];

    if (!companyId) {
      return NextResponse.json(
        { ok: false, error: "companyId eksik." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const affected = new Map<
      string,
      { hotelId: string; roomTypeId: string; date: string }
    >();

    for (const impact of impacts) {
      if (
        !impact.hotelId ||
        !impact.roomTypeId ||
        !impact.checkIn ||
        !impact.checkOut
      ) {
        continue;
      }

      for (const date of getNightDates(
        impact.checkIn,
        impact.checkOut
      )) {
        affected.set(
          `${impact.hotelId}:${impact.roomTypeId}:${date}`,
          {
            hotelId: impact.hotelId,
            roomTypeId: impact.roomTypeId,
            date,
          }
        );
      }
    }

    let queued = 0;

    for (const item of affected.values()) {
      const { data: roomType, error: roomError } =
        await supabase
          .from("hotel_room_types")
          .select("total_rooms")
          .eq("company_id", companyId)
          .eq("hotel_id", item.hotelId)
          .eq("id", item.roomTypeId)
          .maybeSingle();

      if (roomError) throw new Error(roomError.message);

      const { data: inventory, error: inventoryError } =
        await supabase
          .from("hotel_inventory")
          .select(
            "total_inventory,blocked_inventory,stop_sale,minimum_stay,closed_to_arrival,closed_to_departure"
          )
          .eq("company_id", companyId)
          .eq("hotel_id", item.hotelId)
          .eq("room_type_id", item.roomTypeId)
          .eq("inventory_date", item.date)
          .maybeSingle();

      if (inventoryError) {
        throw new Error(inventoryError.message);
      }

      const { count, error: reservationError } =
        await supabase
          .from("hotel_reservations")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId)
          .eq("hotel_id", item.hotelId)
          .eq("room_type_id", item.roomTypeId)
          .in("status", [
            "pending",
            "confirmed",
            "checked_in",
          ])
          .lte("check_in", item.date)
          .gt("check_out", item.date);

      if (reservationError) {
        throw new Error(reservationError.message);
      }

      const capacity = Math.max(
        0,
        Number(roomType?.total_rooms ?? 0)
      );

      const total =
        inventory?.total_inventory == null
          ? capacity
          : Math.min(
              capacity,
              Math.max(0, Number(inventory.total_inventory))
            );

      const blocked = Math.max(
        0,
        Number(inventory?.blocked_inventory ?? 0)
      );

      const reserved = Math.max(0, Number(count ?? 0));

      const available = Math.max(
        0,
        total - reserved - blocked
      );

      const result =
        await enqueueChannelOperationForHotel({
          companyId,
          hotelId: item.hotelId,
          operation: "inventory_update",
          priority: 30,
          payload: {
            source: "reservation_change",
            room_type_id: item.roomTypeId,
            inventory_date: item.date,
            total_inventory: total,
            existing_reservations: reserved,
            blocked_inventory: blocked,
            available_inventory: available,
          },
        });

      queued += result.queued ?? 0;
    }

    return NextResponse.json({
      ok: true,
      affectedNights: affected.size,
      queued,
    });
  } catch (error) {
    console.error("Reservation channel sync:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Rezervasyon senkronizasyon hatası.",
      },
      { status: 500 }
    );
  }
}
