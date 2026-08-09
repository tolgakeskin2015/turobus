import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function retryFailedInboundReservations(
  limit = 20
) {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("hotel_channel_reservation_inbox")
    .select("id")
    .eq("processing_status", "failed")
    .order("received_at", {
      ascending: true,
    })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.length) {
    return {
      reset: 0,
    };
  }

  const ids = data.map((item) => item.id);

  const { error: updateError } = await supabase
    .from("hotel_channel_reservation_inbox")
    .update({
      processing_status: "ready",
      error_message: null,
      processed_at: null,
      updated_at: new Date().toISOString(),
    })
    .in("id", ids);

  if (updateError) {
    throw new Error(updateError.message);
  }

  return {
    reset: ids.length,
  };
}
