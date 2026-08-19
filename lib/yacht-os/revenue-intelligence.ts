import {
  supabase,
} from "@/lib/supabase";


export type YachtRateRecommendation = {
  id: string;

  company_id: string;
  yacht_id: string;

  period_start: string;
  period_end: string;

  sellable_days: number;
  booked_days: number;

  occupancy_percent: number;

  bookings_last_7_days: number;

  current_average_price: number;

  suggested_weekday_price: number;
  suggested_weekend_price: number;

  adjustment_percent: number;

  minimum_days: number;

  confidence_score: number;

  reason_codes:
    string[];

  reason_summary:
    string | null;

  currency: string;

  status: string;

  approved_at:
    string | null;

  published_at:
    string | null;

  rate_plan_id:
    string | null;

  created_at: string;
};


export async function loadYachtRevenueIntelligence(
  companyId: string
) {

  const [
    yachts,
    recommendations,
  ] =
    await Promise.all([

      supabase
        .from(
          "yacht_os_yachts"
        )
        .select(
          "id,name,yacht_type,city,marina,status,base_daily_price,currency,minimum_days"
        )
        .eq(
          "company_id",
          companyId
        )
        .order(
          "name"
        ),

      supabase
        .from(
          "yacht_os_rate_recommendations"
        )
        .select("*")
        .eq(
          "company_id",
          companyId
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        ),
    ]);


  const error =
    yachts.error ??
    recommendations.error;


  if (error) {
    throw error;
  }


  return {
    yachts:
      yachts.data ??
      [],

    recommendations:
      (
        recommendations.data ??
        []
      ) as
        YachtRateRecommendation[],
  };
}


export async function generateYachtRateRecommendations(
  companyId: string
) {

  const {
    data,
    error,
  } =
    await supabase.rpc(
      "yacht_os_generate_rate_recommendations",
      {
        p_company_id:
          companyId,
      }
    );


  if (error) {
    throw error;
  }


  return data;
}


export async function reviewYachtRateRecommendation(
  recommendationId: string,
  decision:
    "approved" |
    "rejected"
) {

  const {
    data,
    error,
  } =
    await supabase.rpc(
      "yacht_os_review_rate_recommendation",
      {
        p_recommendation_id:
          recommendationId,

        p_decision:
          decision,
      }
    );


  if (error) {
    throw error;
  }


  return data;
}


export async function publishYachtRateRecommendation(
  recommendationId: string
) {

  const {
    data,
    error,
  } =
    await supabase.rpc(
      "yacht_os_publish_rate_recommendation",
      {
        p_recommendation_id:
          recommendationId,
      }
    );


  if (error) {
    throw error;
  }


  return data;
}
