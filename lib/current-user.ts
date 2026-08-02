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

export async function getCurrentUser(): Promise<User | null> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error("Kullanıcı alınamadı:", error);
    return null;
  }

  return user;
}

export async function getCurrentMembership(
  userId: string
): Promise<CurrentMembership | null> {
  const { data, error } = await supabase
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
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("Firma üyeliği alınamadı:", error);
    throw error;
  }

  if (!data) return null;

  const rawCompany = Array.isArray(data.company)
    ? data.company[0]
    : data.company;

  if (!rawCompany) return null;

  return {
    ...data,
    company: rawCompany,
  } as unknown as CurrentMembership;
}
