import { supabase } from "@/lib/supabase";

export type GuestVipLevel =
  | "standard"
  | "vip"
  | "vip_plus"
  | "blacklist";

export type GuestIdentityType =
  | "tc_identity"
  | "passport"
  | "foreign_identity"
  | "driving_license"
  | "other";

export type HotelGuest = {
  id: string;
  company_id: string;

  first_name: string;
  last_name: string;

  gender: string | null;
  birth_date: string | null;
  nationality: string | null;

  identity_type:
    | GuestIdentityType
    | null;

  identity_number: string | null;
  passport_expiry_date: string | null;

  phone: string | null;
  email: string | null;

  country: string | null;
  city: string | null;
  address: string | null;
  postal_code: string | null;

  language: string | null;

  vip_level: GuestVipLevel;
  tags: string[];

  preferences: Record<
    string,
    unknown
  >;

  notes: string | null;

  marketing_consent: boolean;
  kvkk_consent: boolean;
  kvkk_consent_at: string | null;

  total_stays: number;
  total_nights: number;
  total_spend: number;
  last_stay_at: string | null;

  created_at: string;
  updated_at: string;
};

export type GuestReservation = {
  id: string;
  reservation_no: string;
  hotel_id: string;
  check_in: string;
  check_out: string;
  status: string;

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
      }
    | {
        id: string;
        room_number: string;
      }[]
    | null;
};

export type ReservationGuestRelation = {
  id: string;
  reservation_id: string;
  guest_id: string;
  is_primary: boolean;
  guest_type:
    | "adult"
    | "child"
    | "infant";

  check_in_completed: boolean;
  checked_in_at: string | null;
  checked_out_at: string | null;

  reservation:
    | GuestReservation
    | GuestReservation[]
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

export async function getGuestCenterData(
  companyId: string
): Promise<{
  guests: HotelGuest[];
  reservations: GuestReservation[];
  relations: ReservationGuestRelation[];
}> {
  const [
    {
      data: guestData,
      error: guestError,
    },
    {
      data: reservationData,
      error: reservationError,
    },
    {
      data: relationData,
      error: relationError,
    },
  ] = await Promise.all([
    supabase
      .from("hotel_guests")
      .select("*")
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .order("created_at", {
        ascending: false,
      }),

    supabase
      .from("hotel_reservations")
      .select(`
        id,
        reservation_no,
        hotel_id,
        check_in,
        check_out,
        status,
        hotel:hotels (
          id,
          name
        ),
        room:hotel_rooms (
          id,
          room_number
        )
      `)
      .eq("company_id", companyId)
      .not(
        "status",
        "in",
        '("cancelled","no_show")'
      )
      .order("created_at", {
        ascending: false,
      })
      .limit(250),

    supabase
      .from(
        "hotel_reservation_guests"
      )
      .select(`
        id,
        reservation_id,
        guest_id,
        is_primary,
        guest_type,
        check_in_completed,
        checked_in_at,
        checked_out_at,
        reservation:hotel_reservations (
          id,
          reservation_no,
          hotel_id,
          check_in,
          check_out,
          status,
          hotel:hotels (
            id,
            name
          ),
          room:hotel_rooms (
            id,
            room_number
          )
        )
      `)
      .eq("company_id", companyId)
      .order("created_at", {
        ascending: false,
      }),
  ]);

  const error =
    guestError ??
    reservationError ??
    relationError;

  if (error) {
    throw new Error(
      getMessage(error)
    );
  }

  return {
    guests:
      (guestData ??
        []) as HotelGuest[],

    reservations:
      (reservationData ??
        []) as unknown as GuestReservation[],

    relations:
      (relationData ??
        []) as unknown as ReservationGuestRelation[],
  };
}

export async function createGuest(
  input: {
    companyId: string;

    firstName: string;
    lastName: string;

    gender?: string | null;
    birthDate?: string | null;
    nationality?: string | null;

    identityType?:
      | GuestIdentityType
      | null;

    identityNumber?: string | null;
    passportExpiryDate?: string | null;

    phone?: string | null;
    email?: string | null;

    country?: string | null;
    city?: string | null;
    address?: string | null;

    language?: string | null;

    vipLevel: GuestVipLevel;
    tags: string[];

    notes?: string | null;

    marketingConsent: boolean;
    kvkkConsent: boolean;

    userId?: string | null;
  }
): Promise<HotelGuest> {
  const { data, error } =
    await supabase
      .from("hotel_guests")
      .insert({
        company_id:
          input.companyId,

        first_name:
          input.firstName,

        last_name:
          input.lastName,

        gender:
          input.gender ?? null,

        birth_date:
          input.birthDate ?? null,

        nationality:
          input.nationality ?? null,

        identity_type:
          input.identityType ?? null,

        identity_number:
          input.identityNumber ?? null,

        passport_expiry_date:
          input.passportExpiryDate ??
          null,

        phone:
          input.phone ?? null,

        email:
          input.email ?? null,

        country:
          input.country ?? null,

        city:
          input.city ?? null,

        address:
          input.address ?? null,

        language:
          input.language ?? "tr",

        vip_level:
          input.vipLevel,

        tags:
          input.tags,

        notes:
          input.notes ?? null,

        marketing_consent:
          input.marketingConsent,

        kvkk_consent:
          input.kvkkConsent,

        kvkk_consent_at:
          input.kvkkConsent
            ? new Date().toISOString()
            : null,

        created_by:
          input.userId ?? null,
      })
      .select("*")
      .single();

  if (error) {
    throw new Error(
      getMessage(error)
    );
  }

  return data as HotelGuest;
}

export async function updateGuest(
  input: {
    companyId: string;
    guestId: string;

    firstName: string;
    lastName: string;

    gender?: string | null;
    birthDate?: string | null;
    nationality?: string | null;

    identityType?:
      | GuestIdentityType
      | null;

    identityNumber?: string | null;
    passportExpiryDate?: string | null;

    phone?: string | null;
    email?: string | null;

    country?: string | null;
    city?: string | null;
    address?: string | null;

    language?: string | null;

    vipLevel: GuestVipLevel;
    tags: string[];

    notes?: string | null;

    marketingConsent: boolean;
    kvkkConsent: boolean;
  }
): Promise<void> {
  const { error } = await supabase
    .from("hotel_guests")
    .update({
      first_name:
        input.firstName,

      last_name:
        input.lastName,

      gender:
        input.gender ?? null,

      birth_date:
        input.birthDate ?? null,

      nationality:
        input.nationality ?? null,

      identity_type:
        input.identityType ?? null,

      identity_number:
        input.identityNumber ?? null,

      passport_expiry_date:
        input.passportExpiryDate ??
        null,

      phone:
        input.phone ?? null,

      email:
        input.email ?? null,

      country:
        input.country ?? null,

      city:
        input.city ?? null,

      address:
        input.address ?? null,

      language:
        input.language ?? "tr",

      vip_level:
        input.vipLevel,

      tags:
        input.tags,

      notes:
        input.notes ?? null,

      marketing_consent:
        input.marketingConsent,

      kvkk_consent:
        input.kvkkConsent,

      kvkk_consent_at:
        input.kvkkConsent
          ? new Date().toISOString()
          : null,

      updated_at:
        new Date().toISOString(),
    })
    .eq("company_id", input.companyId)
    .eq("id", input.guestId);

  if (error) {
    throw new Error(
      getMessage(error)
    );
  }
}

export async function deleteGuest(
  companyId: string,
  guestId: string,
  reason?: string | null
): Promise<void> {
  const { error } = await supabase.rpc(
    "soft_delete_hotel_guest",
    {
      p_company_id: companyId,
      p_guest_id: guestId,
      p_reason: reason ?? null,
    }
  );

  if (error) {
    throw new Error(
      getMessage(error)
    );
  }
}

export async function attachGuestToReservation(
  input: {
    companyId: string;
    reservationId: string;
    guestId: string;
    isPrimary: boolean;
    guestType:
      | "adult"
      | "child"
      | "infant";
  }
): Promise<void> {
  const { error } = await supabase
    .from(
      "hotel_reservation_guests"
    )
    .upsert(
      {
        company_id:
          input.companyId,

        reservation_id:
          input.reservationId,

        guest_id:
          input.guestId,

        is_primary:
          input.isPrimary,

        guest_type:
          input.guestType,

        updated_at:
          new Date().toISOString(),
      },
      {
        onConflict:
          "reservation_id,guest_id",
      }
    );

  if (error) {
    throw new Error(
      getMessage(error)
    );
  }
}

export async function detachGuestFromReservation(
  companyId: string,
  relationId: string
): Promise<void> {
  const { error } = await supabase
    .from(
      "hotel_reservation_guests"
    )
    .delete()
    .eq("company_id", companyId)
    .eq("id", relationId);

  if (error) {
    throw new Error(
      getMessage(error)
    );
  }
}
