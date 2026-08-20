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
