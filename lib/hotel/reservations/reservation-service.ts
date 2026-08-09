import { supabase } from "@/lib/supabase";
import {
  ReservationSource,
  ReservationStatus,
} from "@/components/hotel/reservations/ReservationForm";
import { checkHotelAvailability } from "@/lib/hotel/availability-engine";
import { notifyReservationChannelSync, type ReservationChannelImpact } from "@/lib/hotel/channel-manager/reservation-sync";

export type ReservationPayload = {
  company_id: string;
  customer_id?: string | null;
  hotel_id: string;
  room_type_id: string;
  room_id: string | null;
  reservation_no: string;
  source: ReservationSource;
  status: ReservationStatus;
  check_in: string;
  check_out: string;
  adults: number;
  children: number;
  nights: number;
  currency: string;
  base_price: number;
  total_price: number;
  balance: number;
  notes: string | null;
  updated_at: string;
};

export type ReservationRecord = ReservationPayload & {
  id: string;
  created_at: string;
  created_by: string | null;

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

  customer?:
    | {
        id: string;
        customer_code: string | null;
        full_name: string;
        phone: string | null;
        whatsapp_phone: string | null;
        email: string | null;
        vip_level: string;
        lifecycle_stage: string;
      }
    | {
        id: string;
        customer_code: string | null;
        full_name: string;
        phone: string | null;
        whatsapp_phone: string | null;
        email: string | null;
        vip_level: string;
        lifecycle_stage: string;
      }[]
    | null;
};

export type ReservationSaveInput = {
  payload: ReservationPayload;
  editingId?: string | null;
  createdBy?: string | null;
};

export function getReservationErrorMessage(
  error: unknown
): string {
  if (
    error &&
    typeof error === "object" &&
    "message" in error
  ) {
    const message = String(
      (
        error as {
          message?: unknown;
        }
      ).message ?? ""
    );

    if (
      message.includes(
        "bu oda tipinde müsaitlik yok"
      )
    ) {
      return message;
    }

    if (
      message.includes(
        "duplicate key value violates unique constraint"
      )
    ) {
      return "Bu rezervasyon numarası daha önce kullanılmış.";
    }

    if (
      message.includes(
        "violates row-level security policy"
      )
    ) {
      return "Bu işlem için şirket yetkiniz bulunmuyor.";
    }

    if (message) {
      return message;
    }
  }

  return "Rezervasyon işlemi tamamlanamadı.";
}

export async function getReservations(
  companyId: string
): Promise<ReservationRecord[]> {
  const fullSelect = `
    id,
    company_id,
    customer_id,
    hotel_id,
    room_type_id,
    room_id,
    reservation_no,
    source,
    status,
    check_in,
    check_out,
    adults,
    children,
    nights,
    currency,
    base_price,
    total_price,
    balance,
    notes,
    created_at,
    created_by,
    updated_at,
    hotel:hotels (
      id,
      name
    ),
    room_type:hotel_room_types (
      id,
      name
    ),
    room:hotel_rooms (
      id,
      room_number
    ),
      customer:crm_customers (
        id,
        customer_code,
        full_name,
        phone,
        whatsapp_phone,
        email,
        vip_level,
        lifecycle_stage
      )
  `;

  const legacySelect = `
    id,
    company_id,
    hotel_id,
    room_type_id,
    room_id,
    reservation_no,
    source,
    status,
    check_in,
    check_out,
    adults,
    children,
    nights,
    currency,
    base_price,
    total_price,
    balance,
    notes,
    created_at,
    created_by,
    updated_at,
    hotel:hotels (
      id,
      name
    ),
    room_type:hotel_room_types (
      id,
      name
    ),
    room:hotel_rooms (
      id,
      room_number
    ),
      customer:crm_customers (
        id,
        customer_code,
        full_name,
        phone,
        whatsapp_phone,
        email,
        vip_level,
        lifecycle_stage
      )
  `;

  let result = await supabase
    .from("hotel_reservations")
    .select(fullSelect)
    .eq(
      "company_id",
      companyId
    )
    .is(
      "deleted_at",
      null
    )
    .order(
      "created_at",
      {
        ascending: false,
      }
    );

  if (
    result.error &&
    /customer_id.*does not exist|column.*customer_id/i.test(
      result.error.message
    )
  ) {
    const legacyResult =
      await supabase
        .from(
          "hotel_reservations"
        )
        .select(
          legacySelect
        )
        .eq(
          "company_id",
          companyId
        )
        .is(
          "deleted_at",
          null
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        );

    if (legacyResult.error) {
      throw legacyResult.error;
    }

    return (
      legacyResult.data ??
      []
    ).map(
      (row) => ({
        ...row,
        customer_id: null,
      })
    ) as unknown as ReservationRecord[];
  }

  if (result.error) {
    throw result.error;
  }

  return (
    result.data ??
    []
  ) as unknown as ReservationRecord[];
}

function withoutCustomerId(
  payload: ReservationPayload
) {
  const copy = {
    ...payload,
  };

  delete copy.customer_id;

  return copy;
}

function isMissingCustomerColumn(
  message: string
) {
  return /customer_id.*does not exist|column.*customer_id/i.test(
    message
  );
}


export async function saveReservation(
  input: ReservationSaveInput
): Promise<void> {
  const {
    payload,
    editingId = null,
    createdBy = null,
  } = input;

  /*
   * Kullanıcıya kaydetmeden önce anlaşılır
   * müsaitlik uyarısı göstermek için ön kontrol.
   *
   * Asıl kesin kontrol Supabase trigger'ıdır.
   */
  if (
    !["cancelled", "no_show"].includes(
      payload.status
    )
  ) {
    const availability =
      await checkHotelAvailability({
        companyId: payload.company_id,
        hotelId: payload.hotel_id,
        roomTypeId: payload.room_type_id,
        checkIn: payload.check_in,
        checkOut: payload.check_out,
        requestedRooms: 1,
        excludeReservationId: editingId,
      });

    if (!availability.available) {
      throw new Error(
        availability.reason ??
          "Seçilen tarihlerde yeterli müsaitlik bulunmuyor."
      );
    }
  }

  /*
   * Fiziksel oda seçildiyse aynı odadaki
   * tarih çakışmasını ayrıca kontrol et.
   */
  if (
    payload.room_id &&
    !["cancelled", "no_show"].includes(
      payload.status
    )
  ) {
    let conflictQuery = supabase
      .from("hotel_reservations")
      .select("id")
      .eq("company_id", payload.company_id)
      .eq("room_id", payload.room_id)
      .in("status", [
        "pending",
        "confirmed",
        "checked_in",
      ])
      .lt("check_in", payload.check_out)
      .gt("check_out", payload.check_in);

    if (editingId) {
      conflictQuery = conflictQuery.neq(
        "id",
        editingId
      );
    }

    const {
      data: conflictData,
      error: conflictError,
    } = await conflictQuery.limit(1);

    if (conflictError) {
      throw conflictError;
    }

    if (conflictData?.length) {
      throw new Error(
        "Seçilen fiziksel oda bu tarih aralığında başka bir rezervasyona atanmış."
      );
    }
  }

  if (editingId) {
    const {
      data: previousReservation,
      error: previousReservationError,
    } = await supabase
      .from("hotel_reservations")
      .select(
        "hotel_id,room_type_id,check_in,check_out"
      )
      .eq("id", editingId)
      .eq("company_id", payload.company_id)
      .maybeSingle();

    if (previousReservationError) {
      throw previousReservationError;
    }

    let updateResult =
      await supabase
        .from(
          "hotel_reservations"
        )
        .update(payload)
        .eq(
          "id",
          editingId
        )
        .eq(
          "company_id",
          payload.company_id
        );

    if (
      updateResult.error &&
      isMissingCustomerColumn(
        updateResult.error.message
      )
    ) {
      updateResult =
        await supabase
          .from(
            "hotel_reservations"
          )
          .update(
            withoutCustomerId(
              payload
            )
          )
          .eq(
            "id",
            editingId
          )
          .eq(
            "company_id",
            payload.company_id
          );
    }

    if (updateResult.error) {
      throw updateResult.error;
    }

    const impacts: ReservationChannelImpact[] = [];

    if (previousReservation) {
      impacts.push({
        hotelId: previousReservation.hotel_id,
        roomTypeId: previousReservation.room_type_id,
        checkIn: previousReservation.check_in,
        checkOut: previousReservation.check_out,
      });
    }

    impacts.push({
      hotelId: payload.hotel_id,
      roomTypeId: payload.room_type_id,
      checkIn: payload.check_in,
      checkOut: payload.check_out,
    });

    await notifyReservationChannelSync(
      payload.company_id,
      impacts
    );

    return;
  }

  let insertResult =
    await supabase
      .from(
        "hotel_reservations"
      )
      .insert({
        ...payload,
        created_by:
          createdBy,
      });

  if (
    insertResult.error &&
    isMissingCustomerColumn(
      insertResult.error.message
    )
  ) {
    insertResult =
      await supabase
        .from(
          "hotel_reservations"
        )
        .insert({
          ...withoutCustomerId(
            payload
          ),
          created_by:
            createdBy,
        });
  }

  const { error } =
    insertResult;

  /*
   * Supabase trigger müsaitlik yoksa burada
   * P0001 hatası döndürür. Hata asla yutulmaz.
   */
  if (error) {
    throw error;
  }

  await notifyReservationChannelSync(
    payload.company_id,
    [
      {
        hotelId: payload.hotel_id,
        roomTypeId: payload.room_type_id,
        checkIn: payload.check_in,
        checkOut: payload.check_out,
      },
    ]
  );
}

export async function deleteReservation(
  companyId: string,
  reservationId: string
): Promise<void> {
  /*
   * Silmeden önce rezervasyonun hangi oda tipi ve
   * geceleri etkilediğini saklıyoruz.
   */
  const {
    data: previousReservation,
    error: previousError,
  } = await supabase
    .from("hotel_reservations")
    .select(
      "hotel_id,room_type_id,check_in,check_out"
    )
    .eq("id", reservationId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (previousError) {
    throw previousError;
  }

  const { error } = await supabase
    .from("hotel_reservations")
    .delete()
    .eq("id", reservationId)
    .eq("company_id", companyId);

  if (error) {
    throw error;
  }

  /*
   * Rezervasyon artık veritabanında olmadığı için
   * reservation-sync müsaitliği yeniden hesaplar
   * ve OTA kuyruğuna yeni inventory değerini yollar.
   */
  if (previousReservation) {
    await notifyReservationChannelSync(
      companyId,
      [
        {
          hotelId: previousReservation.hotel_id,
          roomTypeId: previousReservation.room_type_id,
          checkIn: previousReservation.check_in,
          checkOut: previousReservation.check_out,
        },
      ]
    );
  }
}

export type HotelCheckInResult = {
  success: boolean;
  already_checked_in: boolean;
  reservation_id: string;
  reservation_no: string;
  status: "checked_in";
  room_id: string;
  room_number?: string | null;
};

export async function checkInHotelReservation(
  companyId: string,
  reservationId: string
): Promise<HotelCheckInResult> {
  const { data, error } = await supabase.rpc(
    "hotel_check_in_reservation",
    {
      p_company_id: companyId,
      p_reservation_id: reservationId,
    }
  );

  if (error) {
    const message =
      error && typeof error === "object" && "message" in error
        ? String(error.message)
        : "Check-in işlemi tamamlanamadı.";

    throw new Error(message);
  }

  if (!data) {
    throw new Error(
      "Check-in işlemi tamamlandı ancak sunucudan sonuç alınamadı."
    );
  }

  return data as HotelCheckInResult;
}

