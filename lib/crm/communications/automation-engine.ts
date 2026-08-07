import {
  supabase,
} from "@/lib/supabase";

export type AutomationRunResult = {
  success: boolean;
  queued: number;
  skipped: number;
  executed_at: string;
};

export type QueueSummary = {
  queued: number;
  ready: number;
  sent: number;
  failed: number;
};

export async function runHotelAutomationEngine(
  companyId: string
): Promise<AutomationRunResult> {
  const {
    data,
    error,
  } = await supabase.rpc(
    "run_crm_hotel_automations",
    {
      p_company_id:
        companyId,
    }
  );

  if (error) {
    throw new Error(
      error.message
    );
  }

  return data as AutomationRunResult;
}

export async function getQueueSummary(
  companyId: string
): Promise<QueueSummary> {
  const {
    data,
    error,
  } = await supabase.rpc(
    "crm_message_queue_summary",
    {
      p_company_id:
        companyId,
    }
  );

  if (error) {
    throw new Error(
      error.message
    );
  }

  const row =
    Array.isArray(data)
      ? data[0]
      : data;

  return {
    queued:
      Number(
        row?.queued ?? 0
      ),

    ready:
      Number(
        row?.ready ?? 0
      ),

    sent:
      Number(
        row?.sent ?? 0
      ),

    failed:
      Number(
        row?.failed ?? 0
      ),
  };
}
