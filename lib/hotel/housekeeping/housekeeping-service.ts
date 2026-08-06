import { supabase } from "@/lib/supabase";

export type HousekeepingTaskStatus =
  | "pending"
  | "assigned"
  | "in_progress"
  | "completed"
  | "inspected"
  | "cancelled";

export type HousekeepingPriority =
  | "low"
  | "normal"
  | "high"
  | "urgent";

export type HousekeepingTaskType =
  | "checkout_cleaning"
  | "stayover_cleaning"
  | "deep_cleaning"
  | "inspection"
  | "linen_change"
  | "minibar_check"
  | "other";

export type HousekeepingTask = {
  id: string;
  company_id: string;
  hotel_id: string;
  room_id: string;
  reservation_id: string | null;
  task_type: HousekeepingTaskType;
  status: HousekeepingTaskStatus;
  priority: HousekeepingPriority;
  assigned_staff_name: string | null;
  task_date: string;
  notes: string | null;
  started_at: string | null;
  completed_at: string | null;
  inspected_at: string | null;
  created_at: string;

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

  room:
    | {
        id: string;
        room_number: string;
        floor_number: string | null;
        room_status: string;
        housekeeping_status: string;
      }
    | {
        id: string;
        room_number: string;
        floor_number: string | null;
        room_status: string;
        housekeeping_status: string;
      }[]
    | null;
};

export type HousekeepingRoom = {
  id: string;
  company_id: string;
  hotel_id: string;
  room_type_id: string;
  room_number: string;
  floor_number: string | null;
  room_status: string;
  housekeeping_status: string;
  is_active: boolean;

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
};

function getMessage(
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
        "İşlem tamamlanamadı."
    );
  }

  return "İşlem tamamlanamadı.";
}

export async function getHousekeepingData(
  companyId: string
): Promise<{
  tasks: HousekeepingTask[];
  rooms: HousekeepingRoom[];
}> {
  const [
    {
      data: taskData,
      error: taskError,
    },
    {
      data: roomData,
      error: roomError,
    },
  ] = await Promise.all([
    supabase
      .from("hotel_housekeeping_tasks")
      .select(`
        id,
        company_id,
        hotel_id,
        room_id,
        reservation_id,
        task_type,
        status,
        priority,
        assigned_staff_name,
        task_date,
        notes,
        started_at,
        completed_at,
        inspected_at,
        created_at,
        hotel:hotels (
          id,
          name
        ),
        room:hotel_rooms (
          id,
          room_number,
          floor_number,
          room_status,
          housekeeping_status
        )
      `)
      .eq("company_id", companyId)
      .neq("status", "cancelled")
      .order("task_date", {
        ascending: false,
      })
      .order("created_at", {
        ascending: false,
      }),

    supabase
      .from("hotel_rooms")
      .select(`
        id,
        company_id,
        hotel_id,
        room_type_id,
        room_number,
        floor_number,
        room_status,
        housekeeping_status,
        is_active,
        hotel:hotels (
          id,
          name
        ),
        room_type:hotel_room_types (
          id,
          name
        )
      `)
      .eq("company_id", companyId)
      .eq("is_active", true)
      .order("room_number"),
  ]);

  const error =
    taskError ?? roomError;

  if (error) {
    throw new Error(
      getMessage(error)
    );
  }

  return {
    tasks:
      (taskData ??
        []) as unknown as HousekeepingTask[],

    rooms:
      (roomData ??
        []) as unknown as HousekeepingRoom[],
  };
}

export async function syncDirtyRooms(
  companyId: string
): Promise<number> {
  const { data, error } = await supabase
    .rpc(
      "sync_dirty_rooms_to_housekeeping",
      {
        p_company_id: companyId,
      }
    );

  if (error) {
    throw new Error(
      getMessage(error)
    );
  }

  return Number(data ?? 0);
}

export async function createHousekeepingTask(
  input: {
    companyId: string;
    hotelId: string;
    roomId: string;
    taskType: HousekeepingTaskType;
    priority: HousekeepingPriority;
    assignedStaffName?: string | null;
    notes?: string | null;
    userId?: string | null;
  }
): Promise<void> {
  const { error } = await supabase
    .from("hotel_housekeeping_tasks")
    .insert({
      company_id: input.companyId,
      hotel_id: input.hotelId,
      room_id: input.roomId,
      task_type: input.taskType,
      status:
        input.assignedStaffName
          ? "assigned"
          : "pending",
      priority: input.priority,
      assigned_staff_name:
        input.assignedStaffName ?? null,
      task_date:
        new Date()
          .toISOString()
          .slice(0, 10),
      notes: input.notes ?? null,
      created_by:
        input.userId ?? null,
    });

  if (error) {
    throw new Error(
      getMessage(error)
    );
  }
}

export async function updateTaskStatus(
  companyId: string,
  taskId: string,
  status: HousekeepingTaskStatus
): Promise<void> {
  const { error } = await supabase
    .rpc(
      "update_housekeeping_task_status",
      {
        p_company_id: companyId,
        p_task_id: taskId,
        p_status: status,
      }
    );

  if (error) {
    throw new Error(
      getMessage(error)
    );
  }
}

export async function updateTaskDetails(
  input: {
    companyId: string;
    taskId: string;
    assignedStaffName: string | null;
    priority: HousekeepingPriority;
    notes: string | null;
  }
): Promise<void> {
  const { error } = await supabase
    .from("hotel_housekeeping_tasks")
    .update({
      assigned_staff_name:
        input.assignedStaffName,
      priority: input.priority,
      notes: input.notes,
      status:
        input.assignedStaffName
          ? "assigned"
          : "pending",
      updated_at:
        new Date().toISOString(),
    })
    .eq("company_id", input.companyId)
    .eq("id", input.taskId);

  if (error) {
    throw new Error(
      getMessage(error)
    );
  }
}

export async function cancelTask(
  companyId: string,
  taskId: string
): Promise<void> {
  const { error } = await supabase
    .from("hotel_housekeeping_tasks")
    .update({
      status: "cancelled",
      updated_at:
        new Date().toISOString(),
    })
    .eq("company_id", companyId)
    .eq("id", taskId);

  if (error) {
    throw new Error(
      getMessage(error)
    );
  }
}
