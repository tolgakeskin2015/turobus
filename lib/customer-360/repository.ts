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
