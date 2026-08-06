import { supabase } from "@/lib/supabase";

export type PlannerHotel = {
  id: string;
  name: string;
};

export type PlannerRoomType = {
  id: string;
  hotel_id: string;
  name: string;
};

export type PlannerRoom = {
  id: string;
  company_id: string;
  hotel_id: string;
  room_type_id: string;
  room_number: string;
  room_status: string;
  housekeeping_status: string;
  floor_number: string | null;
  is_active: boolean;

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
};

export type PlannerReservationStatus =
  | "pending"
  | "confirmed"
  | "checked_in"
  | "checked_out"
  | "cancelled"
  | "no_show";

export type PlannerReservation = {
  id: string;
  company_id: string;
  hotel_id: string;
  room_type_id: string;
  room_id: string | null;
  reservation_no: string;
  source: string;
  status: PlannerReservationStatus;
  check_in: string;
  check_out: string;
  adults: number;
  children: number;
  nights: number;
  currency: string;
  total_price: number;
  balance: number;
  notes: string | null;

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

  room:
    | {
        id: string;
        room_number: string;
      }
    | {
        id: string;
        room_number: string;
      }[]
    | null;
};

export type RoomPlannerData = {
  hotels: PlannerHotel[];
  roomTypes: PlannerRoomType[];
  rooms: PlannerRoom[];
  reservations: PlannerReservation[];
};

function getErrorMessage(error: unknown): string {
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
      ).message ?? "İşlem tamamlanamadı."
    );
  }

  return "İşlem tamamlanamadı.";
}

export async function getRoomPlannerData(
  companyId: string,
  startDate: string,
  endDate: string
): Promise<RoomPlannerData> {
  const [
    {
      data: hotelData,
      error: hotelError,
    },
    {
      data: roomTypeData,
      error: roomTypeError,
    },
    {
      data: roomData,
      error: roomError,
    },
    {
      data: reservationData,
      error: reservationError,
    },
  ] = await Promise.all([
    supabase
      .from("hotels")
      .select("id, name")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .order("name"),

    supabase
      .from("hotel_room_types")
      .select("id, hotel_id, name")
      .eq("company_id", companyId)
      .order("name"),

    supabase
      .from("hotel_rooms")
      .select(`
        id,
        company_id,
        hotel_id,
        room_type_id,
        room_number,
        room_status,
        housekeeping_status,
        floor_number,
        is_active,
        room_type:hotel_room_types (
          id,
          name
        )
      `)
      .eq("company_id", companyId)
      .eq("is_active", true)
      .order("room_number"),

    supabase
      .from("hotel_reservations")
      .select(`
        id,
        company_id,
        hotel_id,
        room_type_id,
        room_id,
        reservation_no,
        source,
        status,
        check_in,
        check_out,
        adults,
        children,
        nights,
        currency,
        total_price,
        balance,
        notes,
        hotel:hotels (
          id,
          name
        ),
        room_type:hotel_room_types (
          id,
          name
        ),
        room:hotel_rooms (
          id,
          room_number
        )
      `)
      .eq("company_id", companyId)
      .in("status", [
        "pending",
        "confirmed",
        "checked_in",
      ])
      .lt("check_in", endDate)
      .gt("check_out", startDate)
      .order("check_in"),
  ]);

  const error =
    hotelError ??
    roomTypeError ??
    roomError ??
    reservationError;

  if (error) {
    throw new Error(getErrorMessage(error));
  }

  return {
    hotels:
      (hotelData ?? []) as PlannerHotel[],

    roomTypes:
      (roomTypeData ?? []) as PlannerRoomType[],

    rooms:
      (roomData ?? []) as unknown as PlannerRoom[],

    reservations:
      (reservationData ??
        []) as unknown as PlannerReservation[],
  };
}

export async function assignReservationToRoom(
  companyId: string,
  reservation: PlannerReservation,
  room: PlannerRoom
): Promise<void> {
  if (
    room.hotel_id !== reservation.hotel_id
  ) {
    throw new Error(
      "Rezervasyon farklı bir otele ait odaya atanamaz."
    );
  }

  if (
    room.room_type_id !==
    reservation.room_type_id
  ) {
    throw new Error(
      "Rezervasyon yalnızca aynı oda tipindeki bir odaya atanabilir."
    );
  }

  if (
    room.room_status === "maintenance" ||
    room.room_status === "out_of_order"
  ) {
    throw new Error(
      "Bakımda veya kullanım dışı olan odaya rezervasyon atanamaz."
    );
  }

  let conflictQuery = supabase
    .from("hotel_reservations")
    .select(`
      id,
      reservation_no,
      check_in,
      check_out
    `)
    .eq("company_id", companyId)
    .eq("room_id", room.id)
    .in("status", [
      "pending",
      "confirmed",
      "checked_in",
    ])
    .lt("check_in", reservation.check_out)
    .gt("check_out", reservation.check_in)
    .neq("id", reservation.id)
    .limit(1);

  const {
    data: conflictData,
    error: conflictError,
  } = await conflictQuery;

  if (conflictError) {
    throw new Error(
      getErrorMessage(conflictError)
    );
  }

  if (conflictData?.length) {
    const conflict = conflictData[0];

    throw new Error(
      `Oda ${room.room_number}, ${conflict.reservation_no} numaralı rezervasyon nedeniyle bu tarihlerde dolu.`
    );
  }

  const { error } = await supabase
    .from("hotel_reservations")
    .update({
      room_id: room.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", reservation.id)
    .eq("company_id", companyId);

  if (error) {
    throw new Error(getErrorMessage(error));
  }
}

export async function unassignReservationRoom(
  companyId: string,
  reservationId: string
): Promise<void> {
  const { error } = await supabase
    .from("hotel_reservations")
    .update({
      room_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", reservationId)
    .eq("company_id", companyId);

  if (error) {
    throw new Error(getErrorMessage(error));
  }
}

export async function autoAssignReservations(
  companyId: string,
  reservations: PlannerReservation[],
  rooms: PlannerRoom[]
): Promise<{
  assigned: number;
  failed: {
    reservationNo: string;
    reason: string;
  }[];
}> {
  let assigned = 0;

  const failed: {
    reservationNo: string;
    reason: string;
  }[] = [];

  const orderedReservations = reservations
    .filter(
      (reservation) => !reservation.room_id
    )
    .sort((first, second) =>
      first.check_in.localeCompare(
        second.check_in
      )
    );

  for (const reservation of orderedReservations) {
    const compatibleRooms = rooms.filter(
      (room) =>
        room.hotel_id ===
          reservation.hotel_id &&
        room.room_type_id ===
          reservation.room_type_id &&
        room.room_status !==
          "maintenance" &&
        room.room_status !==
          "out_of_order"
    );

    let reservationAssigned = false;
    let lastError = "";

    for (const room of compatibleRooms) {
      try {
        await assignReservationToRoom(
          companyId,
          reservation,
          room
        );

        assigned += 1;
        reservationAssigned = true;
        break;
      } catch (error: unknown) {
        lastError = getErrorMessage(error);
      }
    }

    if (!reservationAssigned) {
      failed.push({
        reservationNo:
          reservation.reservation_no,
        reason:
          lastError ||
          "Uygun fiziksel oda bulunamadı.",
      });
    }
  }

  return {
    assigned,
    failed,
  };
}
