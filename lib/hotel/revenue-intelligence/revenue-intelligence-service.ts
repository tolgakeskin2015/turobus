import { supabase } from "@/lib/supabase";

export type RevenueRecommendation = {
  id: string;
  company_id: string;
  hotel_id: string;
  room_type_id: string;
  business_date: string;

  occupancy_rate: number;
  adr: number;
  revpar: number;

  inventory: number;
  reserved_rooms: number;
  remaining_rooms: number;

  current_rate: number;
  recommended_rate: number;
  adjustment_percent: number;

  reason: string | null;
  status: string;

  hotel_name?: string;
  room_type_name?: string;
};

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
      ).message ?? "İşlem tamamlanamadı."
    );
  }

  return "İşlem tamamlanamadı.";
}

export async function calculateRevenueIntelligence(
  companyId: string,
  hotelId: string,
  businessDate: string
): Promise<void> {
  const { error } = await supabase.rpc(
    "hotel_calculate_revenue_intelligence",
    {
      p_company_id: companyId,
      p_hotel_id: hotelId,
      p_business_date: businessDate,
    }
  );

  if (error) {
    throw new Error(
      getMessage(error)
    );
  }
}

export async function getRevenueRecommendations(
  companyId: string,
  hotelId: string,
  businessDate: string
): Promise<RevenueRecommendation[]> {
  const { data, error } = await supabase
    .from(
      "hotel_revenue_intelligence_today"
    )
    .select("*")
    .eq("company_id", companyId)
    .eq("hotel_id", hotelId)
    .eq("business_date", businessDate)
    .order("occupancy_rate", {
      ascending: false,
    });

  if (error) {
    throw new Error(
      getMessage(error)
    );
  }

  return (
    data ?? []
  ) as RevenueRecommendation[];
}
