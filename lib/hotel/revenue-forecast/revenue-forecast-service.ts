import { supabase } from "@/lib/supabase";

export type RevenueForecast = {
  id: string;

  company_id: string;
  hotel_id: string;

  forecast_date: string;

  inventory: number;
  booked_rooms: number;
  projected_rooms: number;

  booked_occupancy: number;
  projected_occupancy: number;

  booked_revenue: number;
  projected_revenue: number;

  adr: number;
  revpar: number;

  days_ahead: number;
  confidence: number;

  hotel_name?: string;
};

export type ForecastSummary = {
  projectedRevenue: number;
  projectedRoomNights: number;
  availableRoomNights: number;
  projectedOccupancy: number;
};

function message(
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
        "Forecast işlemi tamamlanamadı."
    );
  }

  return "Forecast işlemi tamamlanamadı.";
}

export async function generateRevenueForecast(
  companyId: string,
  hotelId: string,
  startDate: string,
  days = 30
): Promise<ForecastSummary> {
  const { data, error } =
    await supabase.rpc(
      "hotel_generate_revenue_forecast",
      {
        p_company_id: companyId,
        p_hotel_id: hotelId,
        p_start_date: startDate,
        p_days: days,
      }
    );

  if (error) {
    throw new Error(
      message(error)
    );
  }

  const result =
    data as {
      projected_revenue?: number;
      projected_room_nights?: number;
      available_room_nights?: number;
      projected_occupancy?: number;
    };

  return {
    projectedRevenue:
      Number(
        result.projected_revenue ?? 0
      ),

    projectedRoomNights:
      Number(
        result.projected_room_nights ?? 0
      ),

    availableRoomNights:
      Number(
        result.available_room_nights ?? 0
      ),

    projectedOccupancy:
      Number(
        result.projected_occupancy ?? 0
      ),
  };
}

export async function getRevenueForecast(
  companyId: string,
  hotelId: string,
  startDate: string,
  endDate: string
): Promise<RevenueForecast[]> {
  const { data, error } =
    await supabase
      .from(
        "hotel_revenue_forecast_view"
      )
      .select("*")
      .eq(
        "company_id",
        companyId
      )
      .eq(
        "hotel_id",
        hotelId
      )
      .gte(
        "forecast_date",
        startDate
      )
      .lte(
        "forecast_date",
        endDate
      )
      .order(
        "forecast_date"
      );

  if (error) {
    throw new Error(
      message(error)
    );
  }

  return (
    data ?? []
  ) as RevenueForecast[];
}
