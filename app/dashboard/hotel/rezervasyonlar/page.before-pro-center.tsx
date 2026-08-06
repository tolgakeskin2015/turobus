"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  FaCalendarCheck,
  FaEdit,
  FaHotel,
  FaSearch,
  FaTrash,
  FaUserCheck,
} from "react-icons/fa";
import { supabase } from "@/lib/supabase";
import {
  CurrentMembership,
  getCurrentMembership,
} from "@/lib/current-user";
import ReservationForm, {
  ReservationFormState,
  ReservationSource,
  ReservationStatus,
} from "@/components/hotel/reservations/ReservationForm";
import {
  deleteReservation,
  getReservationErrorMessage,
  getReservations,
  ReservationPayload,
  ReservationRecord,
  saveReservation,
} from "@/lib/hotel/reservations/reservation-service";

type HotelOption = {
  id: string;
  name: string;
};

type RoomTypeOption = {
  id: string;
  hotel_id: string;
  name: string;
};

type RoomOption = {
  id: string;
  hotel_id: string;
  room_type_id: string;
  room_number: string;
  room_status: string;
  housekeeping_status: string;
};

const statusLabels: Record<
  ReservationStatus,
  string
> = {
  pending: "Bekliyor",
  confirmed: "Onaylandı",
  checked_in: "Check-in Yapıldı",
  checked_out: "Check-out Yapıldı",
  cancelled: "İptal",
  no_show: "No Show",
};

const sourceLabels: Record<
  ReservationSource,
  string
> = {
  direct: "Doğrudan",
  website: "Web Sitesi",
  booking: "Booking.com",
  expedia: "Expedia",
  hotelbeds: "Hotelbeds",
  ets: "ETS",
  jolly: "Jolly",
  tatilliyoruz: "Tatilliyoruz",
  manual: "Manuel",
};

function localDateText(
  date: Date = new Date()
): string {
  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function tomorrowText(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return localDateText(date);
}

function createReservationNumber(): string {
  const now = new Date();

  const datePart = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(
      2,
      "0"
    ),
    String(now.getDate()).padStart(
      2,
      "0"
    ),
  ].join("");

  const randomPart = Math.floor(
    100000 + Math.random() * 900000
  );

  return `RSV-${datePart}-${randomPart}`;
}

function createEmptyForm(): ReservationFormState {
  return {
    hotel_id: "",
    room_type_id: "",
    room_id: "",
    reservation_no:
      createReservationNumber(),
    source: "direct",
    status: "pending",
    check_in: localDateText(),
    check_out: tomorrowText(),
    adults: "2",
    children: "0",
    currency: "TRY",
    base_price: "0",
    total_price: "0",
    balance: "0",
    notes: "",
  };
}

function calculateNights(
  checkIn: string,
  checkOut: string
): number {
  if (!checkIn || !checkOut) return 0;

  const start = new Date(
    `${checkIn}T00:00:00`
  );

  const end = new Date(
    `${checkOut}T00:00:00`
  );

  return Math.max(
    0,
    Math.round(
      (end.getTime() - start.getTime()) /
        86400000
    )
  );
}

function firstRelation<T>(
  value: T | T[] | null | undefined
): T | null {
  if (!value) return null;

  return Array.isArray(value)
    ? value[0] ?? null
    : value;
}

function money(
  value: number,
  currency: string
): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
  }).format(Number(value || 0));
}

function statusClasses(
  status: ReservationStatus
): string {
  switch (status) {
    case "confirmed":
      return "bg-emerald-500/15 text-emerald-400";

    case "checked_in":
      return "bg-blue-500/15 text-blue-400";

    case "checked_out":
      return "bg-violet-500/15 text-violet-400";

    case "cancelled":
    case "no_show":
      return "bg-red-500/15 text-red-400";

    default:
      return "bg-amber-500/15 text-amber-400";
  }
}

export default function HotelReservationsPage() {
  const [membership, setMembership] =
    useState<CurrentMembership | null>(null);

  const [hotels, setHotels] =
    useState<HotelOption[]>([]);

  const [roomTypes, setRoomTypes] =
    useState<RoomTypeOption[]>([]);

  const [rooms, setRooms] =
    useState<RoomOption[]>([]);

  const [reservations, setReservations] =
    useState<ReservationRecord[]>([]);

  const [form, setForm] =
    useState<ReservationFormState>(
      createEmptyForm()
    );

  const [editingId, setEditingId] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [hotelFilter, setHotelFilter] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [deletingId, setDeletingId] =
    useState("");

  const [errorMessage, setErrorMessage] =
    useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const loadData = useCallback(
    async (companyId: string) => {
      setErrorMessage("");

      const [
        {
          data: hotelData,
          error: hotelError,
        },
        {
          data: roomTypeData,
          error: roomTypeError,
        },
        {
          data: roomData,
          error: roomError,
        },
      ] = await Promise.all([
        supabase
          .from("hotels")
          .select("id, name")
          .eq("company_id", companyId)
          .eq("is_active", true)
          .order("name"),

        supabase
          .from("hotel_room_types")
          .select("id, hotel_id, name")
          .eq("company_id", companyId)
          .order("name"),

        supabase
          .from("hotel_rooms")
          .select(`
            id,
            hotel_id,
            room_type_id,
            room_number,
            room_status,
            housekeeping_status
          `)
          .eq("company_id", companyId)
          .order("room_number"),
      ]);

      const optionError =
        hotelError ??
        roomTypeError ??
        roomError;

      if (optionError) {
        throw optionError;
      }

      const reservationData =
        await getReservations(companyId);

      setHotels(
        (hotelData ?? []) as HotelOption[]
      );

      setRoomTypes(
        (roomTypeData ??
          []) as RoomTypeOption[]
      );

      setRooms(
        (roomData ?? []) as RoomOption[]
      );

      setReservations(reservationData);
    },
    []
  );

  useEffect(() => {
    async function initialize() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          throw new Error(
            "Kullanıcı oturumu bulunamadı."
          );
        }

        const currentMembership =
          await getCurrentMembership(user.id);

        if (!currentMembership) {
          throw new Error(
            "Aktif şirket üyeliği bulunamadı."
          );
        }

        setMembership(currentMembership);

        await loadData(
          currentMembership.company_id
        );
      } catch (error: unknown) {
        setErrorMessage(
          getReservationErrorMessage(error)
        );
      } finally {
        setLoading(false);
      }
    }

    void initialize();
  }, [loadData]);

  const filteredReservations =
    useMemo(() => {
      const query = search
        .trim()
        .toLocaleLowerCase("tr-TR");

      return reservations.filter(
        (reservation) => {
          if (
            hotelFilter &&
            reservation.hotel_id !==
              hotelFilter
          ) {
            return false;
          }

          if (!query) return true;

          const hotel = firstRelation(
            reservation.hotel
          );

          const roomType = firstRelation(
            reservation.room_type
          );

          const room = firstRelation(
            reservation.room
          );

          return [
            reservation.reservation_no,
            hotel?.name,
            roomType?.name,
            room?.room_number,
            statusLabels[
              reservation.status
            ],
            sourceLabels[
              reservation.source
            ],
            reservation.check_in,
            reservation.check_out,
          ]
            .filter(Boolean)
            .some((value) =>
              String(value)
                .toLocaleLowerCase(
                  "tr-TR"
                )
                .includes(query)
            );
        }
      );
    }, [
      hotelFilter,
      reservations,
      search,
    ]);

  const stats = useMemo(
    () => ({
      total: reservations.length,

      confirmed: reservations.filter(
        (item) =>
          item.status === "confirmed"
      ).length,

      checkedIn: reservations.filter(
        (item) =>
          item.status === "checked_in"
      ).length,

      pending: reservations.filter(
        (item) =>
          item.status === "pending"
      ).length,
    }),
    [reservations]
  );

  function updateForm<
    K extends keyof ReservationFormState
  >(
    key: K,
    value: ReservationFormState[K]
  ) {
    setForm((current) => {
      const next: ReservationFormState = {
        ...current,
        [key]: value,
      };

      if (
        key === "hotel_id"
      ) {
        next.room_type_id = "";
        next.room_id = "";
      }

      if (
        key === "room_type_id"
      ) {
        next.room_id = "";
      }

      if (
        key === "base_price" ||
        key === "check_in" ||
        key === "check_out"
      ) {
        const nights = calculateNights(
          next.check_in,
          next.check_out
        );

        const total =
          Math.max(
            0,
            Number(next.base_price) || 0
          ) * nights;

        next.total_price =
          total.toFixed(2);

        next.balance =
          total.toFixed(2);
      }

      return next;
    });
  }

  function resetForm() {
    setForm(createEmptyForm());
    setEditingId("");
  }

  function editReservation(
    reservation: ReservationRecord
  ) {
    setEditingId(reservation.id);

    setForm({
      hotel_id: reservation.hotel_id,
      room_type_id:
        reservation.room_type_id,
      room_id: reservation.room_id ?? "",
      reservation_no:
        reservation.reservation_no,
      source: reservation.source,
      status: reservation.status,
      check_in: reservation.check_in,
      check_out: reservation.check_out,
      adults: String(
        reservation.adults
      ),
      children: String(
        reservation.children
      ),
      currency: reservation.currency,
      base_price: String(
        reservation.base_price
      ),
      total_price: String(
        reservation.total_price
      ),
      balance: String(
        reservation.balance
      ),
      notes: reservation.notes ?? "",
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function handleSave(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!membership || saving) return;

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const nights = calculateNights(
        form.check_in,
        form.check_out
      );

      if (nights < 1) {
        throw new Error(
          "Çıkış tarihi giriş tarihinden sonra olmalıdır."
        );
      }

      if (!form.hotel_id) {
        throw new Error(
          "Otel seçmelisiniz."
        );
      }

      if (!form.room_type_id) {
        throw new Error(
          "Oda tipi seçmelisiniz."
        );
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const payload: ReservationPayload = {
        company_id:
          membership.company_id,
        hotel_id: form.hotel_id,
        room_type_id:
          form.room_type_id,
        room_id:
          form.room_id || null,
        reservation_no:
          form.reservation_no.trim(),
        source: form.source,
        status: form.status,
        check_in: form.check_in,
        check_out: form.check_out,
        adults: Math.max(
          1,
          Number(form.adults) || 1
        ),
        children: Math.max(
          0,
          Number(form.children) || 0
        ),
        nights,
        currency: form.currency,
        base_price: Math.max(
          0,
          Number(form.base_price) || 0
        ),
        total_price: Math.max(
          0,
          Number(form.total_price) || 0
        ),
        balance: Math.max(
          0,
          Number(form.balance) || 0
        ),
        notes:
          form.notes.trim() || null,
        updated_at:
          new Date().toISOString(),
      };

      await saveReservation({
        payload,
        editingId: editingId || null,
        createdBy: user?.id ?? null,
      });

      const wasEditing =
        Boolean(editingId);

      resetForm();

      await loadData(
        membership.company_id
      );

      setSuccessMessage(
        wasEditing
          ? "Rezervasyon güncellendi."
          : "Yeni rezervasyon oluşturuldu."
      );
    } catch (error: unknown) {
      console.error(
        "Rezervasyon kayıt hatası:",
        error
      );

      setErrorMessage(
        getReservationErrorMessage(error)
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(
    reservation: ReservationRecord
  ) {
    if (!membership || deletingId) {
      return;
    }

    const approved = window.confirm(
      `${reservation.reservation_no} numaralı rezervasyon kalıcı olarak silinsin mi?`
    );

    if (!approved) return;

    setDeletingId(reservation.id);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await deleteReservation(
        membership.company_id,
        reservation.id
      );

      if (
        editingId === reservation.id
      ) {
        resetForm();
      }

      await loadData(
        membership.company_id
      );

      setSuccessMessage(
        `${reservation.reservation_no} numaralı rezervasyon silindi.`
      );
    } catch (error: unknown) {
      console.error(
        "Rezervasyon silme hatası:",
        error
      );

      setErrorMessage(
        getReservationErrorMessage(error)
      );
    } finally {
      setDeletingId("");
    }
  }

  if (loading) {
    return (
      <main className="p-10 text-white">
        Rezervasyonlar yükleniyor...
      </main>
    );
  }

  return (
    <main className="px-5 py-10 lg:px-10">
      <div className="mx-auto max-w-[1600px]">
        <header>
          <p className="text-sm font-black uppercase tracking-[0.25em] text-orange-400">
            TUROS HOTEL PMS
          </p>

          <h1 className="mt-3 text-4xl font-black md:text-5xl">
            Rezervasyon Merkezi
          </h1>

          <p className="mt-4 max-w-4xl text-slate-400">
            Rezervasyonları oluşturun,
            müsaitliği denetleyin, oda
            atayın, düzenleyin ve silin.
          </p>
        </header>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label:
                "Toplam Rezervasyon",
              value: stats.total,
              icon: FaCalendarCheck,
            },
            {
              label: "Onaylanan",
              value: stats.confirmed,
              icon: FaUserCheck,
            },
            {
              label: "Konaklayan",
              value: stats.checkedIn,
              icon: FaHotel,
            },
            {
              label: "Bekleyen",
              value: stats.pending,
              icon: FaCalendarCheck,
            },
          ].map((item) => {
            const Icon = item.icon;

            return (
              <article
                key={item.label}
                className="rounded-3xl border border-white/10 bg-slate-900 p-6"
              >
                <Icon className="text-orange-400" />

                <p className="mt-5 text-sm text-slate-500">
                  {item.label}
                </p>

                <p className="mt-2 text-4xl font-black">
                  {item.value}
                </p>
              </article>
            );
          })}
        </section>

        <div className="mt-8">
          <ReservationForm
            hotels={hotels}
            roomTypes={roomTypes}
            rooms={rooms}
            form={form}
            saving={saving}
            editing={Boolean(editingId)}
            onChange={updateForm}
            onSubmit={handleSave}
            onCancel={resetForm}
          />
        </div>

        {errorMessage && (
          <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 font-bold text-red-400">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 font-bold text-emerald-400">
            {successMessage}
          </div>
        )}

        <section className="mt-8 grid gap-4 md:grid-cols-[minmax(0,1fr)_260px]">
          <label className="flex min-h-14 items-center gap-3 rounded-2xl bg-white px-5">
            <FaSearch className="text-orange-500" />

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Rezervasyon, otel, oda veya kaynak ara"
              className="w-full bg-transparent font-bold text-slate-950 outline-none"
            />
          </label>

          <select
            value={hotelFilter}
            onChange={(event) =>
              setHotelFilter(
                event.target.value
              )
            }
            className="min-h-14 rounded-2xl bg-white px-5 font-bold text-slate-950"
          >
            <option value="">
              Tüm oteller
            </option>

            {hotels.map((hotel) => (
              <option
                key={hotel.id}
                value={hotel.id}
              >
                {hotel.name}
              </option>
            ))}
          </select>
        </section>

        <section className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredReservations.map(
            (reservation) => {
              const hotel =
                firstRelation(
                  reservation.hotel
                );

              const roomType =
                firstRelation(
                  reservation.room_type
                );

              const room =
                firstRelation(
                  reservation.room
                );

              const isDeleting =
                deletingId ===
                reservation.id;

              return (
                <article
                  key={reservation.id}
                  className="rounded-[30px] border border-white/10 bg-slate-900 p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider text-orange-400">
                        {
                          reservation.reservation_no
                        }
                      </p>

                      <h2 className="mt-2 text-2xl font-black">
                        {hotel?.name ??
                          "Otel belirtilmedi"}
                      </h2>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1.5 text-xs font-black ${statusClasses(
                        reservation.status
                      )}`}
                    >
                      {
                        statusLabels[
                          reservation.status
                        ]
                      }
                    </span>
                  </div>

                  <div className="mt-5 space-y-2 text-sm text-slate-400">
                    <p>
                      Oda tipi:{" "}
                      {roomType?.name ??
                        "Belirtilmedi"}
                    </p>

                    <p>
                      Oda:{" "}
                      {room
                        ? `Oda ${room.room_number}`
                        : "Henüz atanmadı"}
                    </p>

                    <p>
                      Tarih:{" "}
                      {new Date(
                        `${reservation.check_in}T00:00:00`
                      ).toLocaleDateString(
                        "tr-TR"
                      )}{" "}
                      –{" "}
                      {new Date(
                        `${reservation.check_out}T00:00:00`
                      ).toLocaleDateString(
                        "tr-TR"
                      )}
                    </p>

                    <p>
                      {reservation.adults} yetişkin
                      · {reservation.children} çocuk
                      · {reservation.nights} gece
                    </p>

                    <p>
                      Kaynak:{" "}
                      {
                        sourceLabels[
                          reservation.source
                        ]
                      }
                    </p>
                  </div>

                  <p className="mt-5 text-3xl font-black text-emerald-400">
                    {money(
                      reservation.total_price,
                      reservation.currency
                    )}
                  </p>

                  <p className="mt-2 text-sm text-slate-500">
                    Bakiye:{" "}
                    {money(
                      reservation.balance,
                      reservation.currency
                    )}
                  </p>

                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        editReservation(
                          reservation
                        )
                      }
                      disabled={isDeleting}
                      className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-orange-500 font-black disabled:opacity-50"
                    >
                      <FaEdit />
                      Düzenle
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        void handleDelete(
                          reservation
                        )
                      }
                      disabled={isDeleting}
                      className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-red-500/15 font-black text-red-400 transition hover:bg-red-500 hover:text-white disabled:opacity-50"
                    >
                      <FaTrash />

                      {isDeleting
                        ? "Siliniyor..."
                        : "Sil"}
                    </button>
                  </div>
                </article>
              );
            }
          )}
        </section>

        {filteredReservations.length ===
          0 && (
          <div className="mt-6 rounded-3xl border border-white/10 bg-slate-900 p-10 text-center text-slate-400">
            Henüz rezervasyon kaydı
            bulunmuyor.
          </div>
        )}
      </div>
    </main>
  );
}
