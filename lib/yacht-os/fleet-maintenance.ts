import {
  supabase,
} from "@/lib/supabase";


export type YachtMaintenanceJob = {
  id: string;
  company_id: string;
  yacht_id: string;

  maintenance_type: string;

  title: string;

  description:
    string | null;

  planned_start: string;
  planned_end: string;

  started_at:
    string | null;

  completed_at:
    string | null;

  priority: string;
  status: string;

  service_provider:
    string | null;

  engine_hours_at_service:
    number | null;

  next_service_engine_hours:
    number | null;

  estimated_cost: number;
  actual_cost: number;

  currency: string;

  next_maintenance_date:
    string | null;

  finance_entry_id:
    string | null;

  note:
    string | null;

  created_at: string;
};


export type YachtDocument = {
  id: string;
  company_id: string;
  yacht_id: string;

  document_type: string;

  title: string;

  document_no:
    string | null;

  issuer:
    string | null;

  issue_date:
    string | null;

  expiry_date:
    string | null;

  file_url:
    string | null;

  status: string;

  note:
    string | null;

  created_at: string;
};


export async function loadYachtFleetMaintenance(
  companyId: string
) {

  const [
    yachts,
    maintenance,
    documents,
  ] =
    await Promise.all([

      supabase
        .from(
          "yacht_os_yachts"
        )
        .select(
          "id,name,yacht_type,city,marina,status,engine_hours,last_maintenance_date,next_maintenance_date,captain_name,base_daily_price,currency"
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
          "yacht_os_maintenance_jobs"
        )
        .select("*")
        .eq(
          "company_id",
          companyId
        )
        .order(
          "planned_start",
          {
            ascending:
              false,
          }
        ),

      supabase
        .from(
          "yacht_os_yacht_documents"
        )
        .select("*")
        .eq(
          "company_id",
          companyId
        )
        .order(
          "expiry_date",
          {
            ascending:
              true,
            nullsFirst:
              false,
          }
        ),
    ]);


  const error =
    yachts.error ??
    maintenance.error ??
    documents.error;


  if (error) {
    throw error;
  }


  return {
    yachts:
      yachts.data ??
      [],

    maintenance:
      (
        maintenance.data ??
        []
      ) as
        YachtMaintenanceJob[],

    documents:
      (
        documents.data ??
        []
      ) as
        YachtDocument[],
  };
}


export async function scheduleYachtMaintenance(
  input: {
    yachtId: string;

    maintenanceType: string;

    title: string;

    description?: string;

    plannedStart: string;
    plannedEnd: string;

    priority: string;

    serviceProvider?: string;

    estimatedCost: number;

    currency?: string;

    note?: string;
  }
) {

  const {
    data,
    error,
  } =
    await supabase.rpc(
      "yacht_os_schedule_maintenance",
      {
        p_yacht_id:
          input.yachtId,

        p_maintenance_type:
          input.maintenanceType,

        p_title:
          input.title,

        p_description:
          input.description ??
          null,

        p_planned_start:
          input.plannedStart,

        p_planned_end:
          input.plannedEnd,

        p_priority:
          input.priority,

        p_service_provider:
          input.serviceProvider ??
          null,

        p_estimated_cost:
          input.estimatedCost,

        p_currency:
          input.currency ??
          "TRY",

        p_note:
          input.note ??
          null,
      }
    );


  if (error) {
    throw error;
  }


  return data;
}


export async function updateYachtMaintenanceStatus(
  input: {
    maintenanceId: string;

    status: string;

    actualCost?: number;

    engineHours?: number;

    nextServiceEngineHours?: number;

    nextMaintenanceDate?: string;

    note?: string;
  }
) {

  const {
    data,
    error,
  } =
    await supabase.rpc(
      "yacht_os_update_maintenance_status",
      {
        p_maintenance_id:
          input.maintenanceId,

        p_status:
          input.status,

        p_actual_cost:
          input.actualCost ??
          null,

        p_engine_hours:
          input.engineHours ??
          null,

        p_next_service_engine_hours:
          input.nextServiceEngineHours ??
          null,

        p_next_maintenance_date:
          input.nextMaintenanceDate ??
          null,

        p_note:
          input.note ??
          null,
      }
    );


  if (error) {
    throw error;
  }


  return data;
}


export async function updateYachtEngineHours(
  yachtId: string,
  engineHours: number
) {

  const {
    error,
  } =
    await supabase.rpc(
      "yacht_os_update_engine_hours",
      {
        p_yacht_id:
          yachtId,

        p_engine_hours:
          engineHours,
      }
    );


  if (error) {
    throw error;
  }
}


export async function addYachtDocument(
  input: {
    companyId: string;
    yachtId: string;

    documentType: string;

    title: string;

    documentNo?: string;

    issuer?: string;

    issueDate?: string;

    expiryDate?: string;

    fileUrl?: string;

    note?: string;
  }
) {

  const {
    data:
      userData,
  } =
    await supabase.auth
      .getUser();


  const {
    error,
  } =
    await supabase
      .from(
        "yacht_os_yacht_documents"
      )
      .insert({
        company_id:
          input.companyId,

        yacht_id:
          input.yachtId,

        document_type:
          input.documentType,

        title:
          input.title,

        document_no:
          input.documentNo ??
          null,

        issuer:
          input.issuer ??
          null,

        issue_date:
          input.issueDate ??
          null,

        expiry_date:
          input.expiryDate ??
          null,

        file_url:
          input.fileUrl ??
          null,

        note:
          input.note ??
          null,

        created_by:
          userData.user?.id ??
          null,
      });


  if (error) {
    throw error;
  }
}


export async function updateYachtDocumentStatus(
  documentId: string,
  status: string
) {

  const {
    error,
  } =
    await supabase
      .from(
        "yacht_os_yacht_documents"
      )
      .update({
        status,
      })
      .eq(
        "id",
        documentId
      );


  if (error) {
    throw error;
  }
}
