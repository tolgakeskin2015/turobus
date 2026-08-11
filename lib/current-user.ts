import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export type AppRole =
  | "super_admin"
  | "company_owner"
  | "operation_manager"
  | "sales"
  | "accounting"
  | "guide"
  | "driver";

export type CurrentMembership = {
  id: string;
  user_id: string;
  company_id: string;
  role: AppRole;
  full_name: string | null;
  phone: string | null;
  is_active: boolean;
  company: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    primary_color: string | null;
    phone: string | null;
    whatsapp_phone: string | null;
    email: string | null;
    is_active: boolean;
  };
};

export const ACTIVE_COMPANY_STORAGE_KEY =
  "turobus_active_company_id";

export async function getCurrentUser(): Promise<User | null> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error(
      "Kullanıcı alınamadı:",
      error
    );
    return null;
  }

  return user;
}

function normalizeMembership(
  rawValue: unknown
): CurrentMembership | null {
  if (
    !rawValue ||
    typeof rawValue !== "object"
  ) {
    return null;
  }

  const raw =
    rawValue as Record<string, unknown>;

  const rawCompany =
    Array.isArray(raw.company)
      ? raw.company[0]
      : raw.company;

  if (
    !rawCompany ||
    typeof rawCompany !== "object"
  ) {
    return null;
  }

  const membership = {
    ...raw,
    company: rawCompany,
  } as unknown as CurrentMembership;

  if (
    !membership.company_id ||
    !membership.company?.id
  ) {
    return null;
  }

  return membership;
}

export function getStoredActiveCompanyId():
  | string
  | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage.getItem(
      ACTIVE_COMPANY_STORAGE_KEY
    );
  } catch {
    return null;
  }
}

export function setActiveCompanyId(
  companyId: string
) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      ACTIVE_COMPANY_STORAGE_KEY,
      companyId
    );
  } catch {
    // Storage kapalıysa fallback üyelik kullanılır.
  }
}

export function clearActiveCompanyId() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(
      ACTIVE_COMPANY_STORAGE_KEY
    );
  } catch {
    // no-op
  }
}

export async function getUserMemberships(
  userId: string
): Promise<CurrentMembership[]> {
  const {
    data,
    error,
  } = await supabase
    .from("company_members")
    .select(`
      id,
      user_id,
      company_id,
      role,
      full_name,
      phone,
      is_active,
      company:companies (
        id,
        name,
        slug,
        logo_url,
        primary_color,
        phone,
        whatsapp_phone,
        email,
        is_active
      )
    `)
    .eq(
      "user_id",
      userId
    )
    .eq(
      "is_active",
      true
    );

  if (error) {
    console.error(
      "Firma üyelikleri alınamadı:",
      error
    );
    throw error;
  }

  return (data ?? [])
    .map(normalizeMembership)
    .filter(
      (
        item
      ): item is CurrentMembership =>
        Boolean(
          item &&
            item.company.is_active
        )
    );
}

export function resolveActiveMembership(
  memberships: CurrentMembership[]
): CurrentMembership | null {
  if (!memberships.length) {
    clearActiveCompanyId();
    return null;
  }

  const storedCompanyId =
    getStoredActiveCompanyId();

  if (storedCompanyId) {
    const storedMembership =
      memberships.find(
        (item) =>
          item.company_id ===
          storedCompanyId
      );

    if (storedMembership) {
      return storedMembership;
    }
  }

  const fallback =
    memberships[0];

  setActiveCompanyId(
    fallback.company_id
  );

  return fallback;
}

export async function getCurrentMembership(
  userId: string
): Promise<CurrentMembership | null> {
  const memberships =
    await getUserMemberships(
      userId
    );

  return resolveActiveMembership(
    memberships
  );
}
