import {
  supabase,
} from "@/lib/supabase";

import type {
  Customer360Case,
  Customer360Customer,
  Customer360EntityLink,
  Customer360Message,
  Customer360Note,
  Customer360Traveler,
} from "./types";


export async function loadCustomer360List(
  companyId: string
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        "customer_360_customers"
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
      );


  if (error) {
    throw error;
  }


  return (
    data ?? []
  ) as Customer360Customer[];
}


export async function loadCustomer360Detail(
  companyId: string,
  customerId: string
) {
  const [
    customerResult,
    travelerResult,
    noteResult,
    caseResult,
    messageResult,
    entityResult,
    groupResult,
  ] =
    await Promise.all([
      supabase
        .from(
          "customer_360_customers"
        )
        .select("*")
        .eq(
          "company_id",
          companyId
        )
        .eq(
          "id",
          customerId
        )
        .maybeSingle(),

      supabase
        .from(
          "customer_360_travelers"
        )
        .select("*")
        .eq(
          "company_id",
          companyId
        )
        .eq(
          "customer_id",
          customerId
        )
        .order(
          "created_at"
        ),

      supabase
        .from(
          "customer_360_notes"
        )
        .select("*")
        .eq(
          "company_id",
          companyId
        )
        .eq(
          "customer_id",
          customerId
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        ),

      supabase
        .from(
          "customer_360_cases"
        )
        .select("*")
        .eq(
          "company_id",
          companyId
        )
        .eq(
          "customer_id",
          customerId
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        ),

      supabase
        .from(
          "customer_360_messages"
        )
        .select("*")
        .eq(
          "company_id",
          companyId
        )
        .eq(
          "customer_id",
          customerId
        )
        .order(
          "sent_at",
          {
            ascending:
              false,
          }
        )
        .limit(
          100
        ),

      supabase
        .from(
          "customer_360_entity_links"
        )
        .select("*")
        .eq(
          "company_id",
          companyId
        )
        .eq(
          "customer_id",
          customerId
        )
        .order(
          "occurred_at",
          {
            ascending:
              false,
            nullsFirst:
              false,
          }
        ),

      supabase
        .from(
          "customer_360_group_members"
        )
        .select(`
          id,
          member_role,
          group:customer_360_groups (
            id,
            name,
            group_type,
            note
          )
        `)
        .eq(
          "company_id",
          companyId
        )
        .eq(
          "customer_id",
          customerId
        ),
    ]);


  const firstError =
    customerResult.error ||
    travelerResult.error ||
    noteResult.error ||
    caseResult.error ||
    messageResult.error ||
    entityResult.error ||
    groupResult.error;


  if (firstError) {
    throw firstError;
  }


  if (!customerResult.data) {
    throw new Error(
      "Müşteri bulunamadı."
    );
  }


  return {
    customer:
      customerResult.data as
        Customer360Customer,

    travelers:
      (
        travelerResult.data ??
        []
      ) as Customer360Traveler[],

    notes:
      (
        noteResult.data ??
        []
      ) as Customer360Note[],

    cases:
      (
        caseResult.data ??
        []
      ) as Customer360Case[],

    messages:
      (
        messageResult.data ??
        []
      ) as Customer360Message[],

    entities:
      (
        entityResult.data ??
        []
      ) as Customer360EntityLink[],

    groups:
      groupResult.data ??
      [],
  };
}


export async function createCustomer360(
  input: {
    companyId: string;
    fullName: string;
    phone?: string;
    email?: string;
    birthDate?: string;
    identityType?:
      | "tc"
      | "passport"
      | "other"
      | "";
    identityNumber?: string;
    city?: string;
    country?: string;
    source?: string;
  }
) {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      "customer_360_create_customer",
      {
        p_company_id:
          input.companyId,

        p_full_name:
          input.fullName,

        p_phone:
          input.phone ||
          null,

        p_email:
          input.email ||
          null,

        p_birth_date:
          input.birthDate ||
          null,

        p_identity_type:
          input.identityType ||
          null,

        p_identity_number:
          input.identityNumber ||
          null,

        p_city:
          input.city ||
          null,

        p_country:
          input.country ||
          null,

        p_source:
          input.source ||
          null,
      }
    );


  if (error) {
    throw error;
  }


  return data as {
    ok: boolean;
    customer_id: string;
    customer_code: string;
  };
}


export async function addCustomer360Note(
  input: {
    customerId: string;
    note: string;
    noteType?: string;
    important?: boolean;
  }
) {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      "customer_360_add_note",
      {
        p_customer_id:
          input.customerId,

        p_note:
          input.note,

        p_note_type:
          input.noteType ||
          "general",

        p_is_important:
          input.important ??
          false,
      }
    );


  if (error) {
    throw error;
  }


  return data;
}


export type Customer360MatchQueueRow = {
  id: string;

  company_id: string;

  source_table: string;
  entity_type: string;
  source_id: string;

  source_name: string | null;
  source_phone: string | null;
  source_email: string | null;

  suggested_customer_id: string | null;

  match_reason: string;

  confidence: number;

  status:
    | "pending"
    | "matched"
    | "ignored"
    | "conflict";

  created_at: string;
};


export async function discoverCustomer360Sources() {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      "customer_360_discover_sources"
    );


  if (error) {
    throw error;
  }


  return data;
}


export async function buildCustomer360MatchQueue(
  companyId: string
) {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      "customer_360_build_match_queue",
      {
        p_company_id:
          companyId,
      }
    );


  if (error) {
    throw error;
  }


  const {
    error:
      unmatchedError,
  } =
    await supabase.rpc(
      "customer_360_collect_unmatched_sources",
      {
        p_company_id:
          companyId,
      }
    );


  if (unmatchedError) {
    throw unmatchedError;
  }


  return data;
}


export async function loadCustomer360MatchQueue(
  companyId: string
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        "customer_360_match_queue"
      )
      .select("*")
      .eq(
        "company_id",
        companyId
      )
      .order(
        "confidence",
        {
          ascending:
            false,
        }
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        }
      );


  if (error) {
    throw error;
  }


  return (
    data ??
    []
  ) as Customer360MatchQueueRow[];
}


export async function applyCustomer360Match(
  matchId: string
) {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      "customer_360_apply_match",
      {
        p_match_id:
          matchId,
      }
    );


  if (error) {
    throw error;
  }


  return data;
}


export async function applyCustomer360SafeMatches(
  companyId: string
) {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      "customer_360_apply_safe_matches",
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


export async function ignoreCustomer360Match(
  matchId: string
) {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      "customer_360_ignore_match",
      {
        p_match_id:
          matchId,
      }
    );


  if (error) {
    throw error;
  }


  return data;
}


export type Customer360AutoProfileAnalysis = {
  ok: boolean;
  unmatched: number;
  safe_candidate_rows: number;
  ambiguous_rows: number;
  missing_name_rows: number;
};


export type Customer360DuplicateHealth = {
  ok: boolean;
  duplicate_phone_groups: number;
  duplicate_email_groups: number;
  conflict_queue: number;
};


export async function collectCustomer360UnmatchedSources(
  companyId: string
) {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      "customer_360_collect_unmatched_sources",
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


export async function analyzeCustomer360AutoProfiles(
  companyId: string
) {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      "customer_360_analyze_auto_profiles",
      {
        p_company_id:
          companyId,
      }
    );


  if (error) {
    throw error;
  }


  return data as
    Customer360AutoProfileAnalysis;
}


export async function createCustomer360SafeProfiles(
  companyId: string
) {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      "customer_360_create_safe_profiles",
      {
        p_company_id:
          companyId,
      }
    );


  if (error) {
    throw error;
  }


  return data as {
    ok: boolean;
    customers_created: number;
  };
}


export async function loadCustomer360DuplicateHealth(
  companyId: string
) {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      "customer_360_duplicate_health",
      {
        p_company_id:
          companyId,
      }
    );


  if (error) {
    throw error;
  }


  return data as
    Customer360DuplicateHealth;
}


export type Customer360LiveSyncHealth = {
  ok: boolean;

  enabled: boolean;

  registered_sources: number;
  installed_triggers: number;

  matched_24h: number;
  created_24h: number;
  conflict_24h: number;
  error_24h: number;
};


export type Customer360LiveSyncEvent = {
  id: string;

  company_id: string;

  source_table: string;
  source_id: string;

  entity_type: string;

  customer_id: string | null;

  event_status:
    | "matched"
    | "created"
    | "conflict"
    | "skipped"
    | "error";

  event_reason: string;

  source_name: string | null;
  source_phone: string | null;
  source_email: string | null;

  metadata:
    Record<
      string,
      unknown
    >;

  created_at: string;
};


export async function installCustomer360LiveSync(
  companyId: string
) {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      "customer_360_install_live_sync",
      {
        p_company_id:
          companyId,
      }
    );


  if (error) {
    throw error;
  }


  return data as {
    ok: boolean;
    enabled: boolean;
    triggers_installed: number;
  };
}


export async function disableCustomer360LiveSync(
  companyId: string
) {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      "customer_360_disable_live_sync",
      {
        p_company_id:
          companyId,
      }
    );


  if (error) {
    throw error;
  }


  return data as {
    ok: boolean;
    enabled: boolean;
  };
}


export async function loadCustomer360LiveSyncHealth(
  companyId: string
) {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      "customer_360_live_sync_health",
      {
        p_company_id:
          companyId,
      }
    );


  if (error) {
    throw error;
  }


  return data as
    Customer360LiveSyncHealth;
}


export async function loadCustomer360LiveSyncEvents(
  companyId: string
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        "customer_360_live_sync_events"
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
      )
      .limit(
        100
      );


  if (error) {
    throw error;
  }


  return (
    data ??
    []
  ) as Customer360LiveSyncEvent[];
}


export type Customer360QuoteHistoryRow = {
  id: string;

  quote_code: string;

  package_type: string | null;
  destination: string | null;

  check_in: string | null;
  check_out: string | null;

  adults: number | null;
  children: number | null;
  nights: number | null;

  total_cost: number | null;
  gross_profit: number | null;
  sale_price: number | null;
  margin_percent: number | null;

  status: string;

  public_token: string | null;

  valid_until: string | null;
  created_at: string;
};


export async function loadCustomer360QuoteHistory(
  companyId: string,
  customerId: string
) {
  const {
    data:
      links,
    error:
      linkError,
  } =
    await supabase
      .from(
        "customer_360_entity_links"
      )
      .select(
        `
        entity_key,
        metadata
        `
      )
      .eq(
        "company_id",
        companyId
      )
      .eq(
        "customer_id",
        customerId
      )
      .eq(
        "entity_type",
        "quote"
      );


  if (linkError) {
    throw linkError;
  }


  const ids =
    Array.from(
      new Set(
        (
          links ??
          []
        )
          .map(
            (
              link:
                {
                  entity_key:
                    string | null;

                  metadata:
                    Record<
                      string,
                      unknown
                    > | null;
                }
            ) => {
              const metadata =
                link.metadata ??
                {};


              const sourceTable =
                typeof metadata.source_table ===
                  "string"
                  ? metadata.source_table
                  : (
                      link.entity_key
                        ?.split(
                          ":"
                        )[0] ??
                      ""
                    );


              if (
                sourceTable !==
                "package_quotes"
              ) {
                return null;
              }


              const metadataId =
                typeof metadata.source_id ===
                  "string"
                  ? metadata.source_id
                  : null;


              if (
                metadataId
              ) {
                return metadataId;
              }


              const prefix =
                "package_quotes:";


              if (
                link.entity_key
                  ?.startsWith(
                    prefix
                  )
              ) {
                return link.entity_key.slice(
                  prefix.length
                );
              }


              return null;
            }
          )
          .filter(
            (
              value
            ):
              value is string =>
                Boolean(
                  value
                )
          )
      )
    );


  if (
    ids.length ===
    0
  ) {
    return [];
  }


  const {
    data,
    error,
  } =
    await supabase
      .from(
        "package_quotes"
      )
      .select(
        `
        id,
        quote_code,
        package_type,
        destination,
        check_in,
        check_out,
        adults,
        children,
        nights,
        total_cost,
        gross_profit,
        sale_price,
        margin_percent,
        status,
        public_token,
        valid_until,
        created_at
        `
      )
      .eq(
        "company_id",
        companyId
      )
      .in(
        "id",
        ids
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        }
      );


  if (error) {
    throw error;
  }


  return (
    data ??
    []
  ) as Customer360QuoteHistoryRow[];
}


export type Customer360ReservationHistoryRow = {
  id: string;

  entity_type: string;

  entity_id: string | null;
  entity_key: string | null;

  title: string | null;

  amount: number | null;
  currency: string | null;

  occurred_at: string | null;

  source_table: string | null;
  source_id: string | null;

  metadata:
    Record<
      string,
      unknown
    > | null;
};


export async function loadCustomer360ReservationHistory(
  companyId: string,
  customerId: string
) {
  const reservationTypes =
    [
      "booking",
      "package_booking",
      "yacht_booking",
      "hotel_booking",
      "activity_booking",
      "tour_booking",
      "trip",
    ];


  const {
    data,
    error,
  } =
    await supabase
      .from(
        "customer_360_entity_links"
      )
      .select(
        `
        id,
        entity_type,
        entity_id,
        entity_key,
        title,
        amount,
        currency,
        occurred_at,
        metadata
        `
      )
      .eq(
        "company_id",
        companyId
      )
      .eq(
        "customer_id",
        customerId
      )
      .in(
        "entity_type",
        reservationTypes
      )
      .order(
        "occurred_at",
        {
          ascending:
            false,
        }
      );


  if (error) {
    throw error;
  }


  return (
    data ??
    []
  ).map(
    (
      row
    ) => {
      const metadata =
        (
          row.metadata ??
          {}
        ) as Record<
          string,
          unknown
        >;


      const entityKey =
        row.entity_key ??
        null;


      const keyParts =
        entityKey
          ?.split(
            ":"
          ) ??
        [];


      const metadataSourceTable =
        typeof metadata.source_table ===
          "string"
          ? metadata.source_table
          : null;


      const metadataSourceId =
        typeof metadata.source_id ===
          "string"
          ? metadata.source_id
          : null;


      return {
        ...row,

        source_table:
          metadataSourceTable ??
          (
            keyParts.length >
            1
              ? keyParts[0]
              : null
          ),

        source_id:
          metadataSourceId ??
          (
            keyParts.length >
            1
              ? keyParts
                  .slice(
                    1
                  )
                  .join(
                    ":"
                  )
              : row.entity_id
          ),
      } as Customer360ReservationHistoryRow;
    }
  );
}


export type Customer360FinanceHistoryRow = {
  id: string;

  entity_type:
    | "payment"
    | "refund"
    | "voucher";

  entity_id:
    string | null;

  entity_key:
    string | null;

  title:
    string | null;

  amount:
    number | null;

  currency:
    string | null;

  occurred_at:
    string | null;

  source_table:
    string | null;

  source_id:
    string | null;

  metadata:
    Record<
      string,
      unknown
    > | null;
};


export async function loadCustomer360FinanceHistory(
  companyId: string,
  customerId: string
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        "customer_360_entity_links"
      )
      .select(
        `
        id,
        entity_type,
        entity_id,
        entity_key,
        title,
        amount,
        currency,
        occurred_at,
        metadata
        `
      )
      .eq(
        "company_id",
        companyId
      )
      .eq(
        "customer_id",
        customerId
      )
      .in(
        "entity_type",
        [
          "payment",
          "refund",
          "voucher",
        ]
      )
      .order(
        "occurred_at",
        {
          ascending:
            false,
        }
      );


  if (error) {
    throw error;
  }


  return (
    data ??
    []
  ).map(
    (
      row
    ) => {
      const metadata =
        (
          row.metadata ??
          {}
        ) as Record<
          string,
          unknown
        >;


      const keyParts =
        (
          row.entity_key ??
          ""
        ).split(
          ":"
        );


      const sourceTable =
        typeof metadata.source_table ===
          "string"
          ? metadata.source_table
          : keyParts.length >
              1
            ? keyParts[0]
            : null;


      const sourceId =
        typeof metadata.source_id ===
          "string"
          ? metadata.source_id
          : keyParts.length >
              1
            ? keyParts
                .slice(
                  1
                )
                .join(
                  ":"
                )
            : row.entity_id;


      return {
        ...row,

        entity_type:
          row.entity_type as
            | "payment"
            | "refund"
            | "voucher",

        source_table:
          sourceTable,

        source_id:
          sourceId,

        metadata,
      } as Customer360FinanceHistoryRow;
    }
  );
}





export type Customer360Segment =
  | "standard"
  | "repeat"
  | "vip"
  | "corporate"
  | "risk";


export type Customer360PreferenceRow = {
  id: string;

  category:
    string;

  preference_key:
    string;

  preference_value:
    Record<string, unknown>;

  created_by:
    string | null;

  created_at:
    string;

  updated_at:
    string;
};


export type Customer360PreferenceSnapshot = {
  customer: {
    id:
      string;

    customer_code:
      string;

    full_name:
      string;

    segment:
      Customer360Segment;

    preferred_language:
      string | null;

    marketing_consent:
      boolean;

    kvkk_consent:
      boolean;
  };

  preferences:
    Customer360PreferenceRow[];
};


export async function loadCustomer360PreferenceSnapshot(
  customerId:
    string
) {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      "customer_360_preference_snapshot",
      {
        p_customer_id:
          customerId,
      }
    );


  if (error) {
    throw error;
  }


  return data as
    Customer360PreferenceSnapshot;
}


export async function upsertCustomer360Preference(
  input: {
    customerId:
      string;

    category:
      string;

    preferenceKey:
      string;

    preferenceValue:
      Record<string, unknown>;
  }
) {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      "customer_360_upsert_preference",
      {
        p_customer_id:
          input.customerId,

        p_category:
          input.category,

        p_preference_key:
          input.preferenceKey,

        p_preference_value:
          input.preferenceValue,
      }
    );


  if (error) {
    throw error;
  }


  return data as {
    ok:
      boolean;

    preference_id:
      string;
  };
}


export async function deleteCustomer360Preference(
  preferenceId:
    string
) {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      "customer_360_delete_preference",
      {
        p_preference_id:
          preferenceId,
      }
    );


  if (error) {
    throw error;
  }


  return data as {
    ok:
      boolean;

    preference_id:
      string;
  };
}


export async function setCustomer360Segment(
  customerId:
    string,
  segment:
    Customer360Segment
) {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      "customer_360_set_segment",
      {
        p_customer_id:
          customerId,

        p_segment:
          segment,
      }
    );


  if (error) {
    throw error;
  }


  return data as {
    ok:
      boolean;

    customer_id:
      string;

    segment:
      Customer360Segment;
  };
}


export type Customer360CaseType =
  | "request"
  | "complaint";


export type Customer360CasePriority =
  | "low"
  | "medium"
  | "high"
  | "critical";


export type Customer360CaseStatus =
  | "open"
  | "in_progress"
  | "resolved"
  | "closed";


export type Customer360CaseSlaState =
  | "no_deadline"
  | "on_track"
  | "due_soon"
  | "overdue"
  | "completed";


export type Customer360CaseRow = {
  id: string;

  case_type:
    Customer360CaseType;

  title:
    string;

  detail:
    string | null;

  priority:
    Customer360CasePriority;

  status:
    Customer360CaseStatus;

  assigned_to:
    string | null;

  due_at:
    string | null;

  resolution_note:
    string | null;

  resolved_by:
    string | null;

  resolved_at:
    string | null;

  closed_at:
    string | null;

  created_by:
    string | null;

  created_at:
    string;

  updated_at:
    string;

  sla_state:
    Customer360CaseSlaState;
};


export type Customer360CaseSnapshot = {
  customer: {
    id: string;

    customer_code:
      string;

    full_name:
      string;
  };

  cases:
    Customer360CaseRow[];
};


export async function loadCustomer360CaseSnapshot(
  customerId: string
) {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      "customer_360_case_snapshot",
      {
        p_customer_id:
          customerId,
      }
    );


  if (error) {
    throw error;
  }


  return data as
    Customer360CaseSnapshot;
}


export async function addCustomer360Case(
  input: {
    customerId:
      string;

    caseType:
      Customer360CaseType;

    title:
      string;

    detail?:
      string;

    priority:
      Customer360CasePriority;

    dueAt?:
      string;

    takeOwnership?:
      boolean;
  }
) {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      "customer_360_add_case",
      {
        p_customer_id:
          input.customerId,

        p_case_type:
          input.caseType,

        p_title:
          input.title,

        p_detail:
          input.detail ||
          null,

        p_priority:
          input.priority,

        p_due_at:
          input.dueAt ||
          null,

        p_take_ownership:
          input.takeOwnership ??
          true,
      }
    );


  if (error) {
    throw error;
  }


  return data as {
    ok:
      boolean;

    case_id:
      string;
  };
}


export async function updateCustomer360Case(
  input: {
    caseId:
      string;

    status?:
      Customer360CaseStatus;

    priority?:
      Customer360CasePriority;

    dueAt?:
      string;

    resolutionNote?:
      string;

    takeOwnership?:
      boolean;

    clearAssignment?:
      boolean;
  }
) {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      "customer_360_update_case",
      {
        p_case_id:
          input.caseId,

        p_status:
          input.status ||
          null,

        p_priority:
          input.priority ||
          null,

        p_due_at:
          input.dueAt ||
          null,

        p_resolution_note:
          input.resolutionNote ??
          null,

        p_take_ownership:
          input.takeOwnership ??
          false,

        p_clear_assignment:
          input.clearAssignment ??
          false,
      }
    );


  if (error) {
    throw error;
  }


  return data as {
    ok:
      boolean;

    case_id:
      string;

    status:
      Customer360CaseStatus;
  };
}


export type Customer360CommunicationChannel =
  | "whatsapp"
  | "sms"
  | "email"
  | "phone"
  | "instagram"
  | "system"
  | "other";


export type Customer360CommunicationDirection =
  | "inbound"
  | "outbound";


export type Customer360CommunicationRow = {
  id: string;

  channel:
    Customer360CommunicationChannel;

  direction:
    Customer360CommunicationDirection;

  subject:
    string | null;

  body:
    string | null;

  external_id:
    string | null;

  sent_at:
    string;

  created_at:
    string;

  created_by:
    string | null;
};


export type Customer360MessageSnapshot = {
  customer: {
    id: string;

    customer_code:
      string;

    full_name:
      string;

    phone:
      string | null;

    email:
      string | null;
  };

  messages:
    Customer360CommunicationRow[];
};


export async function loadCustomer360MessageSnapshot(
  customerId: string,
  limit = 500
) {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      "customer_360_message_snapshot",
      {
        p_customer_id:
          customerId,

        p_limit:
          limit,
      }
    );


  if (error) {
    throw error;
  }


  return data as
    Customer360MessageSnapshot;
}


export async function addCustomer360Message(
  input: {
    customerId: string;

    channel:
      Customer360CommunicationChannel;

    direction:
      Customer360CommunicationDirection;

    subject?: string;

    body?: string;

    externalId?: string;

    sentAt?: string;
  }
) {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      "customer_360_add_message",
      {
        p_customer_id:
          input.customerId,

        p_channel:
          input.channel,

        p_direction:
          input.direction,

        p_subject:
          input.subject ||
          null,

        p_body:
          input.body ||
          null,

        p_external_id:
          input.externalId ||
          null,

        p_sent_at:
          input.sentAt ||
          null,
      }
    );


  if (error) {
    throw error;
  }


  return data as {
    ok: boolean;
    message_id: string;
  };
}


export type Customer360FamilyTraveler = {
  id: string;

  full_name: string;

  relationship_label:
    string | null;

  phone:
    string | null;

  email:
    string | null;

  birth_date:
    string | null;

  gender:
    string | null;

  nationality:
    string | null;

  identity_type:
    string | null;

  identity_number:
    string | null;

  is_primary:
    boolean;

  created_at:
    string;
};


export type Customer360FamilyRelationship = {
  id: string;

  relation_type:
    string;

  note:
    string | null;

  direction:
    "outbound" | "inbound";

  other_customer_id:
    string;

  other_customer_code:
    string;

  other_customer_name:
    string;

  other_customer_phone:
    string | null;

  other_customer_email:
    string | null;

  other_customer_segment:
    string;

  created_at:
    string;
};


export type Customer360GroupMember = {
  membership_id: string;

  customer_id: string;

  customer_code: string;

  full_name: string;

  phone:
    string | null;

  email:
    string | null;

  segment:
    string;

  member_role:
    string | null;
};


export type Customer360FamilyGroup = {
  id: string;

  name: string;

  group_type:
    | "travel"
    | "family"
    | "corporate"
    | "event"
    | "other";

  note:
    string | null;

  member_role:
    string | null;

  member_count:
    number;

  members:
    Customer360GroupMember[];

  created_at:
    string;
};


export type Customer360FamilyGroupSnapshot = {
  customer: {
    id: string;
    customer_code: string;
    full_name: string;
  };

  travelers:
    Customer360FamilyTraveler[];

  relationships:
    Customer360FamilyRelationship[];

  groups:
    Customer360FamilyGroup[];
};


export async function loadCustomer360FamilyGroupSnapshot(
  customerId: string
) {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      "customer_360_family_group_snapshot",
      {
        p_customer_id:
          customerId,
      }
    );


  if (error) {
    throw error;
  }


  return data as
    Customer360FamilyGroupSnapshot;
}


export async function addCustomer360Traveler(
  input: {
    customerId: string;

    fullName: string;

    relationshipLabel?: string;

    phone?: string;

    email?: string;

    birthDate?: string;

    nationality?: string;

    identityType?:
      | "tc"
      | "passport"
      | "other"
      | "";

    identityNumber?: string;
  }
) {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      "customer_360_add_traveler",
      {
        p_customer_id:
          input.customerId,

        p_full_name:
          input.fullName,

        p_relationship_label:
          input.relationshipLabel ||
          null,

        p_phone:
          input.phone ||
          null,

        p_email:
          input.email ||
          null,

        p_birth_date:
          input.birthDate ||
          null,

        p_nationality:
          input.nationality ||
          null,

        p_identity_type:
          input.identityType ||
          null,

        p_identity_number:
          input.identityNumber ||
          null,
      }
    );


  if (error) {
    throw error;
  }


  return data as {
    ok: boolean;
    traveler_id: string;
  };
}


export async function deleteCustomer360Traveler(
  travelerId: string
) {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      "customer_360_delete_traveler",
      {
        p_traveler_id:
          travelerId,
      }
    );


  if (error) {
    throw error;
  }


  return data;
}


export async function searchCustomer360LinkCandidates(
  companyId: string,
  customerId: string,
  query: string
) {
  let request =
    supabase
      .from(
        "customer_360_customers"
      )
      .select(
        `
        id,
        customer_code,
        full_name,
        phone,
        email,
        segment
        `
      )
      .eq(
        "company_id",
        companyId
      )
      .neq(
        "id",
        customerId
      )
      .eq(
        "status",
        "active"
      )
      .order(
        "full_name"
      )
      .limit(
        20
      );


  const clean =
    query.trim();


  if (clean) {
    request =
      request.or(
        `full_name.ilike.%${clean}%,phone.ilike.%${clean}%,email.ilike.%${clean}%,customer_code.ilike.%${clean}%`
      );
  }


  const {
    data,
    error,
  } =
    await request;


  if (error) {
    throw error;
  }


  return (
    data ??
    []
  ) as {
    id: string;

    customer_code: string;

    full_name: string;

    phone:
      string | null;

    email:
      string | null;

    segment:
      string;
  }[];
}


export async function addCustomer360Relationship(
  input: {
    customerId: string;

    relatedCustomerId:
      string;

    relationType:
      string;

    note?: string;
  }
) {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      "customer_360_add_relationship",
      {
        p_customer_id:
          input.customerId,

        p_related_customer_id:
          input.relatedCustomerId,

        p_relation_type:
          input.relationType,

        p_note:
          input.note ||
          null,
      }
    );


  if (error) {
    throw error;
  }


  return data;
}


export async function deleteCustomer360Relationship(
  relationshipId: string
) {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      "customer_360_delete_relationship",
      {
        p_relationship_id:
          relationshipId,
      }
    );


  if (error) {
    throw error;
  }


  return data;
}


export async function createCustomer360Group(
  input: {
    customerId: string;

    name: string;

    groupType:
      | "travel"
      | "family"
      | "corporate"
      | "event"
      | "other";

    note?: string;

    memberRole?: string;
  }
) {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      "customer_360_create_group",
      {
        p_customer_id:
          input.customerId,

        p_name:
          input.name,

        p_group_type:
          input.groupType,

        p_note:
          input.note ||
          null,

        p_member_role:
          input.memberRole ||
          "primary",
      }
    );


  if (error) {
    throw error;
  }


  return data;
}


export async function addCustomer360GroupMember(
  input: {
    groupId: string;

    customerId: string;

    memberRole?: string;
  }
) {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      "customer_360_add_group_member",
      {
        p_group_id:
          input.groupId,

        p_customer_id:
          input.customerId,

        p_member_role:
          input.memberRole ||
          null,
      }
    );


  if (error) {
    throw error;
  }


  return data;
}


export async function removeCustomer360GroupMember(
  membershipId: string
) {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      "customer_360_remove_group_member",
      {
        p_membership_id:
          membershipId,
      }
    );


  if (error) {
    throw error;
  }


  return data;
}


export async function deleteCustomer360Group(
  groupId: string
) {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      "customer_360_delete_group",
      {
        p_group_id:
          groupId,
      }
    );


  if (error) {
    throw error;
  }


  return data;
}


export type Customer360CommandCenterRow = {
  customer_id:
    string;

  open_case_count:
    number;

  open_complaint_count:
    number;

  overdue_case_count:
    number;

  due_soon_case_count:
    number;

  message_count:
    number;

  inbound_message_count:
    number;

  outbound_message_count:
    number;

  last_message_at:
    string | null;

  booking_count:
    number;

  quote_count:
    number;

  trip_count:
    number;

  finance_event_count:
    number;

  last_booking_at:
    string | null;

  last_activity_at:
    string | null;
};


export type Customer360CommandCenterSnapshot = {
  generated_at:
    string;

  customers:
    Customer360CommandCenterRow[];
};


export async function loadCustomer360CommandCenterSnapshot(
  companyId:
    string
) {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      "customer_360_command_center_snapshot",
      {
        p_company_id:
          companyId,
      }
    );


  if (error) {
    throw error;
  }


  return data as
    Customer360CommandCenterSnapshot;
}


export type Customer360MergePreview = {
  target_customer: {
    id: string;
    customer_code: string;
    full_name: string;
    phone: string | null;
    email: string | null;
    segment: string;
    status: string;
  };

  source_customer: {
    id: string;
    customer_code: string;
    full_name: string;
    phone: string | null;
    email: string | null;
    segment: string;
    status: string;
  };

  travelers: number;
  notes: number;
  preferences: number;
  cases: number;
  messages: number;
  entity_links: number;
  group_memberships: number;
  relationships: number;

  phone_conflict: boolean;
  email_conflict: boolean;
  identity_conflict: boolean;
};


export async function loadCustomer360MergePreview(
  companyId: string,
  targetCustomerId: string,
  sourceCustomerId: string
) {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      "customer_360_merge_preview",
      {
        p_company_id:
          companyId,

        p_target_customer_id:
          targetCustomerId,

        p_source_customer_id:
          sourceCustomerId,
      }
    );


  if (error) {
    throw error;
  }


  return data as
    Customer360MergePreview;
}


export async function mergeCustomer360Profiles(
  companyId: string,
  targetCustomerId: string,
  sourceCustomerId: string
) {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      "customer_360_merge_customers",
      {
        p_company_id:
          companyId,

        p_target_customer_id:
          targetCustomerId,

        p_source_customer_id:
          sourceCustomerId,
      }
    );


  if (error) {
    throw error;
  }


  return data as {
    success: boolean;
    target_customer_id: string;
    removed_customer_id: string;
    summary: Record<string, number>;
  };
}


export type Customer360ConsentHistoryRow = {
  id: string;
  consent_type:
    | "kvkk"
    | "marketing";
  granted: boolean;
  event_type:
    | "snapshot"
    | "change";
  source_channel: string;
  statement_version: string | null;
  note: string | null;
  recorded_by: string | null;
  created_at: string;
};


export type Customer360IdentityAccessRow = {
  id: string;
  subject_type:
    | "customer"
    | "traveler";
  subject_id: string;
  reason: string;
  performed_by: string | null;
  created_at: string;
};


export type Customer360PrivacyDetailSnapshot = {
  can_reveal_identity: boolean;
  consent_history:
    Customer360ConsentHistoryRow[];
  identity_access_log:
    Customer360IdentityAccessRow[];
};


export type Customer360PrivacyCenterRow = {
  id: string;
  customer_code: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  kvkk_consent: boolean;
  marketing_consent: boolean;
  identity_type: string | null;
  identity_masked: string | null;
  status: string;
  segment: string;
};


export type Customer360PrivacyCenterSnapshot = {
  generated_at: string;
  total_customers: number;
  kvkk_granted: number;
  marketing_granted: number;
  protected_identity_count: number;
  customers:
    Customer360PrivacyCenterRow[];
};


export async function loadCustomer360PrivacyDetail(
  companyId: string,
  customerId: string
) {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      "customer_360_privacy_detail_snapshot",
      {
        p_company_id:
          companyId,

        p_customer_id:
          customerId,
      }
    );


  if (error) {
    throw error;
  }


  return data as
    Customer360PrivacyDetailSnapshot;
}


export async function loadCustomer360PrivacyCenter(
  companyId: string
) {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      "customer_360_privacy_center_snapshot",
      {
        p_company_id:
          companyId,
      }
    );


  if (error) {
    throw error;
  }


  return data as
    Customer360PrivacyCenterSnapshot;
}


export async function setCustomer360Consent(
  input: {
    companyId: string;
    customerId: string;
    consentType:
      | "kvkk"
      | "marketing";
    granted: boolean;
    sourceChannel: string;
    statementVersion?: string;
    note?: string;
  }
) {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      "customer_360_set_consent",
      {
        p_company_id:
          input.companyId,

        p_customer_id:
          input.customerId,

        p_consent_type:
          input.consentType,

        p_granted:
          input.granted,

        p_source_channel:
          input.sourceChannel,

        p_statement_version:
          input.statementVersion ||
          null,

        p_note:
          input.note ||
          null,
      }
    );


  if (error) {
    throw error;
  }


  return data as {
    success: boolean;
    customer_id: string;
    consent_type: string;
    granted: boolean;
  };
}


export async function revealCustomer360Identity(
  input: {
    companyId: string;
    subjectType:
      | "customer"
      | "traveler";
    subjectId: string;
    reason: string;
  }
) {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      "customer_360_reveal_identity",
      {
        p_company_id:
          input.companyId,

        p_subject_type:
          input.subjectType,

        p_subject_id:
          input.subjectId,

        p_reason:
          input.reason,
      }
    );


  if (error) {
    throw error;
  }


  return data as {
    subject_type: string;
    subject_id: string;
    identity_type: string | null;
    identity_number: string;
  };
}

export type Customer360MessagePage = {
  messages:
    Customer360CommunicationRow[];

  total:
    number;

  offset:
    number;

  limit:
    number;

  has_more:
    boolean;
};


export async function loadCustomer360MessagePage(
  customerId:
    string,
  offset =
    0,
  limit =
    100
) {
  const safeOffset =
    Math.max(
      0,
      Math.floor(
        Number(
          offset
        ) ||
        0
      )
    );


  const safeLimit =
    Math.min(
      100,
      Math.max(
        1,
        Math.floor(
          Number(
            limit
          ) ||
          100
        )
      )
    );


  const from =
    safeOffset;

  const to =
    safeOffset +
    safeLimit -
    1;


  const {
    data,
    error,
    count,
  } =
    await supabase
      .from(
        "customer_360_messages"
      )
      .select(
        [
          "id",
          "company_id",
          "customer_id",
          "channel",
          "direction",
          "subject",
          "body",
          "external_id",
          "sent_at",
          "created_by",
          "created_at",
        ].join(","),
        {
          count:
            "exact",
        }
      )
      .eq(
        "customer_id",
        customerId
      )
      .order(
        "sent_at",
        {
          ascending:
            false,
        }
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        }
      )
      .range(
        from,
        to
      );


  if (error) {
    throw error;
  }


  const messages =
    (
      data ??
      []
    ) as unknown as
      Customer360CommunicationRow[];


  const total =
    Number(
      count ??
      messages.length
    );


  return {
    messages,
    total,
    offset:
      safeOffset,
    limit:
      safeLimit,
    has_more:
      safeOffset +
        messages.length <
      total,
  } satisfies
    Customer360MessagePage;
}
