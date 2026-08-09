import { supabase } from "@/lib/supabase";

export type CeoDashboardData = {
  hotelCount: number;
  reservationCount: number;
  arrivalsToday: number;
  departuresToday: number;
  inHouse: number;
  noShow: number;

  totalRooms: number;
  occupiedRooms: number;
  dirtyRooms: number;
  maintenanceRooms: number;

  openFolios: number;
  outstandingBalance: number;

  roomRevenueToday: number;
  paymentTotalToday: number;

  occupancyRate: number;
  adr: number;
  revpar: number;

  projectedRevenue30: number;
  projectedOccupancy30: number;
  projectedRoomNights30: number;

  revenueRecommendations: {
    id: string;
    hotel_id: string;
    room_type_id: string;
    business_date: string;
    room_type_name: string;
    occupancy_rate: number;
    current_rate: number;
    recommended_rate: number;
    adjustment_percent: number;
    status: string;
    reason: string | null;
  }[];
};

function localDateText(
  date: Date = new Date()
): string {
  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getMessage(error: unknown): string {
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
      ).message ?? "Dashboard verileri alınamadı."
    );
  }

  return "Dashboard verileri alınamadı.";
}

export async function getCeoDashboardData(
  companyId: string
): Promise<CeoDashboardData> {
  const today = localDateText();

  const [
    hotelResult,
    roomResult,
    reservationResult,
    folioResult,
    chargeResult,
    paymentResult,
    recommendationResult,
    forecastResult,
  ] = await Promise.all([
    supabase
      .from("hotels")
      .select("id")
      .eq("company_id", companyId)
      .eq("is_active", true),

    supabase
      .from("hotel_rooms")
      .select(`
        id,
        room_status,
        housekeeping_status
      `)
      .eq("company_id", companyId)
      .eq("is_active", true),

    supabase
      .from("hotel_reservations")
      .select(`
        id,
        status,
        check_in,
        check_out,
        nights,
        total_price,
        balance
      `)
      .eq("company_id", companyId)
      .is("deleted_at", null),

    supabase
      .from("hotel_folios")
      .select(`
        id,
        status,
        balance
      `)
      .eq("company_id", companyId),

    supabase
      .from("hotel_folio_charges")
      .select(`
        total_amount,
        charge_date,
        category,
        status
      `)
      .eq("company_id", companyId)
      .eq("status", "posted")
      .eq("charge_date", today),

    supabase
      .from("hotel_folio_payments")
      .select(`
        base_amount,
        payment_date,
        transaction_type,
        status
      `)
      .eq("company_id", companyId)
      .eq("status", "completed")
      .gte(
        "payment_date",
        `${today}T00:00:00`
      )
      .lt(
        "payment_date",
        `${today}T23:59:59.999`
      ),

    supabase
      .from(
        "hotel_revenue_intelligence_today"
      )
      .select(`
        id,
        hotel_id,
        room_type_id,
        business_date,
        room_type_name,
        occupancy_rate,
        current_rate,
        recommended_rate,
        adjustment_percent,
        status,
        reason
      `)
      .eq("company_id", companyId)
      .gte("business_date", today)
      .order("business_date", {
        ascending: true,
      })
      .order("occupancy_rate", {
        ascending: false,
      })
      .limit(20),

    supabase
      .from(
        "hotel_revenue_forecast_view"
      )
      .select(`
        projected_revenue,
        projected_rooms,
        inventory
      `)
      .eq("company_id", companyId)
      .gte("forecast_date", today),
  ]);

  const error =
    hotelResult.error ??
    roomResult.error ??
    reservationResult.error ??
    folioResult.error ??
    chargeResult.error ??
    paymentResult.error ??
    recommendationResult.error ??
    forecastResult.error;

  if (error) {
    throw new Error(
      getMessage(error)
    );
  }

  const hotels =
    hotelResult.data ?? [];

  const rooms =
    roomResult.data ?? [];

  const reservations =
    reservationResult.data ?? [];

  const folios =
    folioResult.data ?? [];

  const charges =
    chargeResult.data ?? [];

  const payments =
    paymentResult.data ?? [];

  const activeReservations =
    reservations.filter(
      (reservation) =>
        [
          "pending",
          "confirmed",
          "checked_in",
        ].includes(reservation.status)
    );

  const arrivalsToday =
    reservations.filter(
      (reservation) =>
        reservation.check_in === today &&
        [
          "pending",
          "confirmed",
        ].includes(reservation.status)
    ).length;

  const departuresToday =
    reservations.filter(
      (reservation) =>
        reservation.check_out === today &&
        reservation.status ===
          "checked_in"
    ).length;

  const inHouse =
    reservations.filter(
      (reservation) =>
        reservation.status ===
        "checked_in"
    ).length;

  const noShow =
    reservations.filter(
      (reservation) =>
        reservation.status ===
        "no_show" &&
        reservation.check_in === today
    ).length;

  const totalRooms = rooms.length;

  const occupiedRooms =
    rooms.filter(
      (room) =>
        room.room_status === "occupied"
    ).length;

  const dirtyRooms =
    rooms.filter(
      (room) =>
        room.housekeeping_status ===
        "dirty"
    ).length;

  const maintenanceRooms =
    rooms.filter(
      (room) =>
        room.room_status ===
          "maintenance" ||
        room.room_status ===
          "out_of_order"
    ).length;

  const openFolios =
    folios.filter(
      (folio) =>
        folio.status === "open"
    ).length;

  const outstandingBalance =
    activeReservations.reduce(
      (total, reservation) =>
        total +
        Math.max(
          0,
          Number(
            reservation.balance ?? 0
          )
        ),
      0
    );

  const roomRevenueToday =
    activeReservations
      .filter(
        (reservation) =>
          reservation.check_in <= today &&
          reservation.check_out > today
      )
      .reduce(
        (total, reservation) => {
          const nights = Math.max(
            1,
            Number(
              reservation.nights ?? 1
            )
          );

          return (
            total +
            Number(
              reservation.total_price ?? 0
            ) /
              nights
          );
        },
        0
      );

  const paymentTotalToday =
    payments
      .filter(
        (payment) =>
          payment.transaction_type ===
          "payment"
      )
      .reduce(
        (total, payment) =>
          total +
          Number(
            payment.base_amount ?? 0
          ),
        0
      );

  const soldRoomNights =
    activeReservations.filter(
      (reservation) =>
        reservation.check_in <= today &&
        reservation.check_out > today
    ).length;

  const occupancyRate =
    totalRooms > 0
      ? (
          soldRoomNights /
          totalRooms
        ) * 100
      : 0;

  const adr =
    soldRoomNights > 0
      ? roomRevenueToday /
        soldRoomNights
      : 0;

  const revpar =
    totalRooms > 0
      ? roomRevenueToday /
        totalRooms
      : 0;

  const forecastRows =
    forecastResult.data ?? [];

  const projectedRevenue30 =
    forecastRows.reduce(
      (total, row) =>
        total +
        Number(
          row.projected_revenue ?? 0
        ),
      0
    );

  const projectedRoomNights30 =
    forecastRows.reduce(
      (total, row) =>
        total +
        Number(
          row.projected_rooms ?? 0
        ),
      0
    );

  const projectedInventory30 =
    forecastRows.reduce(
      (total, row) =>
        total +
        Number(
          row.inventory ?? 0
        ),
      0
    );

  const projectedOccupancy30 =
    projectedInventory30 > 0
      ? (
          projectedRoomNights30 /
          projectedInventory30
        ) * 100
      : 0;

  return {
    hotelCount: hotels.length,
    reservationCount:
      activeReservations.length,
    arrivalsToday,
    departuresToday,
    inHouse,
    noShow,

    totalRooms,
    occupiedRooms,
    dirtyRooms,
    maintenanceRooms,

    openFolios,
    outstandingBalance,

    roomRevenueToday,
    paymentTotalToday,

    occupancyRate,
    adr,
    revpar,

    projectedRevenue30,
    projectedOccupancy30,
    projectedRoomNights30,

    revenueRecommendations:
      (
        recommendationResult.data ?? []
      ) as CeoDashboardData["revenueRecommendations"],
  };
}


export async function approveRevenueRecommendation(
  companyId: string,
  hotelId: string,
  roomTypeId: string,
  businessDate: string,
  note?: string
): Promise<void> {
  const { error } = await supabase.rpc(
    "hotel_approve_revenue_recommendation_safe",
    {
      p_company_id: companyId,
      p_hotel_id: hotelId,
      p_room_type_id: roomTypeId,
      p_business_date: businessDate,
      p_note: note ?? null,
    }
  );

  if (error) {
    throw new Error(
      getMessage(error)
    );
  }
}

export async function rejectRevenueRecommendation(
  companyId: string,
  hotelId: string,
  roomTypeId: string,
  businessDate: string,
  note?: string
): Promise<void> {
  const { error } = await supabase.rpc(
    "hotel_reject_revenue_recommendation_safe",
    {
      p_company_id: companyId,
      p_hotel_id: hotelId,
      p_room_type_id: roomTypeId,
      p_business_date: businessDate,
      p_note: note ?? null,
    }
  );

  if (error) {
    throw new Error(
      getMessage(error)
    );
  }
}
