import { supabase } from "@/lib/supabase";

export type MaintenancePriority =
  | "low"
  | "normal"
  | "high"
  | "urgent";

export type MaintenanceStatus =
  | "open"
  | "assigned"
  | "in_progress"
  | "waiting_parts"
  | "completed"
  | "cancelled";

export type MaintenanceCategory =
  | "general"
  | "electrical"
  | "plumbing"
  | "air_conditioning"
  | "furniture"
  | "bathroom"
  | "housekeeping"
  | "technical"
  | "safety"
  | "other";

export type MaintenanceRequest = {
  id: string;
  company_id: string;
  hotel_id: string;
  room_id: string | null;
  request_no: string;
  title: string;
  description: string | null;
  category: MaintenanceCategory;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  estimated_cost: number;
  actual_cost: number;
  created_at: string;
  updated_at: string;
};

export type MaintenanceRoom = {
  id: string;
  room_number: string;
};

function getErrorMessage(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "message" in error
  ) {
    return String(
      (error as { message?: string }).message
    );
  }

  return "Bakım işlemi başarısız.";
}

export async function listMaintenanceRequests(
  companyId: string,
  hotelId: string
) {
  const { data, error } = await supabase
    .from("hotel_maintenance_requests")
    .select("*")
    .eq("company_id", companyId)
    .eq("hotel_id", hotelId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(getErrorMessage(error));
  }

  return (data ?? []) as MaintenanceRequest[];
}

export async function listMaintenanceRooms(
  companyId: string,
  hotelId: string
) {
  const { data, error } = await supabase
    .from("hotel_rooms")
    .select("id, room_number")
    .eq("company_id", companyId)
    .eq("hotel_id", hotelId)
    .order("room_number");

  if (error) {
    throw new Error(getErrorMessage(error));
  }

  return (data ?? []) as MaintenanceRoom[];
}

export async function createMaintenanceRequest(input: {
  companyId: string;
  hotelId: string;
  roomId?: string | null;
  title: string;
  description?: string;
  category: MaintenanceCategory;
  priority: MaintenancePriority;
  estimatedCost?: number;
}) {
  const { data, error } = await supabase.rpc(
    "create_hotel_maintenance_request",
    {
      p_company_id: input.companyId,
      p_hotel_id: input.hotelId,
      p_room_id: input.roomId || null,
      p_title: input.title,
      p_description: input.description || null,
      p_category: input.category,
      p_priority: input.priority,
      p_estimated_cost: Number(
        input.estimatedCost ?? 0
      ),
    }
  );

  if (error) {
    throw new Error(getErrorMessage(error));
  }

  return String(data);
}

export async function updateMaintenanceStatus(input: {
  maintenanceId: string;
  status: MaintenanceStatus;
  actualCost?: number | null;
}) {
  const { error } = await supabase.rpc(
    "update_hotel_maintenance_status",
    {
      p_maintenance_id: input.maintenanceId,
      p_status: input.status,
      p_notes: null,
      p_actual_cost:
        input.actualCost === undefined
          ? null
          : input.actualCost,
    }
  );

  if (error) {
    throw new Error(getErrorMessage(error));
  }
}
