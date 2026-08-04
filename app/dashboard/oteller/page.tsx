"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  FaEdit,
  FaHotel,
  FaSearch,
  FaStar,
} from "react-icons/fa";
import { supabase } from "@/lib/supabase";
import {
  CurrentMembership,
  getCurrentMembership,
} from "@/lib/current-user";
import HotelForm from "@/components/hotel/HotelForm";
import RoomTypeForm, {
  RoomTypeFormState,
} from "@/components/hotel/RoomTypeForm";
import RoomPlanner, {
  PlannerRoom,
} from "@/components/hotel/room-planner/RoomPlanner";
import {
  emptyHotelForm,
  Hotel,
  HotelForm as HotelFormType,
  hotelTypeLabels,
} from "@/components/hotel/types";

type RoomType = {
  id: string;
  company_id: string;
  hotel_id: string;
  room_type_code: string | null;
  name: string;
  description: string | null;
  max_adults: number;
  max_children: number;
  max_occupancy: number;
  total_rooms: number;
  bed_type: string | null;
  room_size_m2: number | null;
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
};

const emptyRoomTypeForm: RoomTypeFormState = {
  hotel_id: "",
  name: "",
  room_type_code: "",
  max_adults: "2",
  max_children: "0",
  max_occupancy: "2",
  total_rooms: "0",
  bed_type: "",
  room_size_m2: "",
  description: "",
  is_active: true,
};

function firstRelation<T>(
  value: T | T[] | null | undefined
) {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export default function HotelsPage() {
  const [membership, setMembership] =
    useState<CurrentMembership | null>(null);

  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [rooms, setRooms] = useState<PlannerRoom[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [form, setForm] =
    useState<HotelFormType>(emptyHotelForm);

  const [editingId, setEditingId] = useState("");
  const [editingRoomTypeId, setEditingRoomTypeId] = useState("");

  const [roomTypeForm, setRoomTypeForm] =
    useState<RoomTypeFormState>(emptyRoomTypeForm);

  const [savingRoomType, setSavingRoomType] = useState(false);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] =
    useState("");

  const loadHotels = useCallback(
    async (companyId: string) => {
      const [
        { data: hotelData, error: hotelError },
        { data: roomData, error: roomError },
        { data: roomTypeData, error: roomTypeError },
      ] = await Promise.all([
        supabase
          .from("hotels")
          .select("*")
          .eq("company_id", companyId)
          .order("created_at", {
            ascending: false,
          }),

        supabase
          .from("hotel_rooms")
          .select(`
            id,
            room_number,
            floor_number,
            room_status,
            housekeeping_status,
            room_type:hotel_room_types (
              name
            )
          `)
          .eq("company_id", companyId)
          .eq("is_active", true)
          .order("room_number"),

        supabase
          .from("hotel_room_types")
          .select(`
            id,
            company_id,
            hotel_id,
            room_type_code,
            name,
            description,
            max_adults,
            max_children,
            max_occupancy,
            total_rooms,
            bed_type,
            room_size_m2,
            is_active,
            hotel:hotels (
              id,
              name
            )
          `)
          .eq("company_id", companyId)
          .order("created_at", {
            ascending: false,
          }),
      ]);

      const error =
        hotelError ??
        roomError ??
        roomTypeError;

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setHotels((hotelData ?? []) as Hotel[]);
      setRooms((roomData ?? []) as unknown as PlannerRoom[]);
      setRoomTypes(
        (roomTypeData ?? []) as unknown as RoomType[]
      );
    },
    []
  );

  useEffect(() => {
    async function initialize() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setErrorMessage(
          "Kullanıcı oturumu bulunamadı."
        );
        setLoading(false);
        return;
      }

      const currentMembership =
        await getCurrentMembership(user.id);

      if (!currentMembership) {
        setErrorMessage(
          "Aktif şirket üyeliği bulunamadı."
        );
        setLoading(false);
        return;
      }

      setMembership(currentMembership);
      await loadHotels(
        currentMembership.company_id
      );

      setLoading(false);
    }

    void initialize();
  }, [loadHotels]);

  const filteredHotels = useMemo(() => {
    const query = search
      .trim()
      .toLocaleLowerCase("tr-TR");

    if (!query) return hotels;

    return hotels.filter((hotel) =>
      [
        hotel.name,
        hotel.hotel_code,
        hotel.city,
        hotel.district,
        hotelTypeLabels[hotel.hotel_type],
      ]
        .filter(Boolean)
        .some((value) =>
          String(value)
            .toLocaleLowerCase("tr-TR")
            .includes(query)
        )
    );
  }, [hotels, search]);

  function updateForm<K extends keyof HotelFormType>(
    key: K,
    value: HotelFormType[K]
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function resetForm() {
    setForm(emptyHotelForm);
    setEditingId("");
  }
  function updateRoomTypeForm<
    K extends keyof RoomTypeFormState
  >(
    key: K,
    value: RoomTypeFormState[K]
  ) {
    setRoomTypeForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function resetRoomTypeForm() {
    setRoomTypeForm(emptyRoomTypeForm);
    setEditingRoomTypeId("");
  }

  function editRoomType(roomType: RoomType) {
    setEditingRoomTypeId(roomType.id);

    setRoomTypeForm({
      hotel_id: roomType.hotel_id,
      name: roomType.name,
      room_type_code: roomType.room_type_code ?? "",
      max_adults: String(roomType.max_adults),
      max_children: String(roomType.max_children),
      max_occupancy: String(roomType.max_occupancy),
      total_rooms: String(roomType.total_rooms),
      bed_type: roomType.bed_type ?? "",
      room_size_m2:
        roomType.room_size_m2?.toString() ?? "",
      description: roomType.description ?? "",
      is_active: roomType.is_active,
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function saveRoomType(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!membership) return;

    setSavingRoomType(true);
    setErrorMessage("");
    setSuccessMessage("");

    const payload = {
      company_id: membership.company_id,
      hotel_id: roomTypeForm.hotel_id,
      name: roomTypeForm.name.trim(),
      room_type_code:
        roomTypeForm.room_type_code.trim() || null,
      max_adults: Math.max(
        0,
        Number(roomTypeForm.max_adults) || 0
      ),
      max_children: Math.max(
        0,
        Number(roomTypeForm.max_children) || 0
      ),
      max_occupancy: Math.max(
        1,
        Number(roomTypeForm.max_occupancy) || 1
      ),
      total_rooms: Math.max(
        0,
        Number(roomTypeForm.total_rooms) || 0
      ),
      bed_type:
        roomTypeForm.bed_type.trim() || null,
      room_size_m2: roomTypeForm.room_size_m2
        ? Math.max(
            0,
            Number(roomTypeForm.room_size_m2) || 0
          )
        : null,
      description:
        roomTypeForm.description.trim() || null,
      is_active: roomTypeForm.is_active,
      updated_at: new Date().toISOString(),
    };

    const query = editingRoomTypeId
      ? supabase
          .from("hotel_room_types")
          .update(payload)
          .eq("id", editingRoomTypeId)
          .eq(
            "company_id",
            membership.company_id
          )
      : supabase
          .from("hotel_room_types")
          .insert(payload);

    const { error } = await query;

    if (error) {
      setErrorMessage(error.message);
      setSavingRoomType(false);
      return;
    }

    setSuccessMessage(
      editingRoomTypeId
        ? "Oda tipi güncellendi."
        : "Yeni oda tipi eklendi."
    );

    resetRoomTypeForm();

    await loadHotels(
      membership.company_id
    );

    setSavingRoomType(false);
  }


  function editHotel(hotel: Hotel) {
    setEditingId(hotel.id);

    setForm({
      name: hotel.name,
      hotel_code: hotel.hotel_code ?? "",
      hotel_type: hotel.hotel_type,
      star_rating: String(
        hotel.star_rating ?? 0
      ),
      country_code: hotel.country_code,
      city: hotel.city ?? "",
      district: hotel.district ?? "",
      address: hotel.address ?? "",
      phone: hotel.phone ?? "",
      email: hotel.email ?? "",
      website: hotel.website ?? "",
      check_in_time:
        hotel.check_in_time?.slice(0, 5) ??
        "14:00",
      check_out_time:
        hotel.check_out_time?.slice(0, 5) ??
        "12:00",
      currency: hotel.currency ?? "TRY",
      contact_person:
        hotel.contact_person ?? "",
      contact_phone:
        hotel.contact_phone ?? "",
      contact_email:
        hotel.contact_email ?? "",
      description:
        hotel.description ?? "",
      notes: hotel.notes ?? "",
      is_active: hotel.is_active,
      is_verified: hotel.is_verified,
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function saveHotel(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!membership) return;

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const payload = {
      company_id: membership.company_id,
      name: form.name.trim(),
      hotel_code:
        form.hotel_code.trim() || null,
      hotel_type: form.hotel_type,
      star_rating: Number(
        form.star_rating
      ),
      country_code:
        form.country_code.trim() || "TR",
      city: form.city.trim() || null,
      district:
        form.district.trim() || null,
      address:
        form.address.trim() || null,
      phone: form.phone.trim() || null,
      email:
        form.email.trim().toLowerCase() ||
        null,
      website:
        form.website.trim() || null,
      check_in_time:
        form.check_in_time,
      check_out_time:
        form.check_out_time,
      currency: form.currency,
      contact_person:
        form.contact_person.trim() || null,
      contact_phone:
        form.contact_phone.trim() || null,
      contact_email:
        form.contact_email
          .trim()
          .toLowerCase() || null,
      description:
        form.description.trim() || null,
      notes:
        form.notes.trim() || null,
      is_active: form.is_active,
      is_verified: form.is_verified,
      updated_at:
        new Date().toISOString(),
    };

    const query = editingId
      ? supabase
          .from("hotels")
          .update(payload)
          .eq("id", editingId)
          .eq(
            "company_id",
            membership.company_id
          )
      : supabase
          .from("hotels")
          .insert({
            ...payload,
            created_by:
              user?.id ?? null,
          });

    const { error } = await query;

    if (error) {
      setErrorMessage(error.message);
      setSaving(false);
      return;
    }

    setSuccessMessage(
      editingId
        ? "Otel güncellendi."
        : "Yeni otel eklendi."
    );

    resetForm();

    await loadHotels(
      membership.company_id
    );

    setSaving(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-10 text-white">
        Oteller yükleniyor...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-10 text-white lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header>
          <p className="text-sm font-black uppercase tracking-[0.25em] text-orange-400">
            TUROS HOTEL
          </p>

          <h1 className="mt-3 text-4xl font-black md:text-5xl">
            Otel Yönetimi
          </h1>

          <p className="mt-4 max-w-3xl text-slate-400">
            Otelleri, iletişim bilgilerini ve
            temel işletme ayarlarını yönetin.
          </p>
        </header>

        <div className="mt-8">
          <HotelForm
            form={form}
            editing={Boolean(editingId)}
            saving={saving}
            onChange={updateForm}
            onSubmit={saveHotel}
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

        <div className="mt-8">
          <RoomTypeForm
            hotels={hotels.map((hotel) => ({
              id: hotel.id,
              name: hotel.name,
            }))}
            form={roomTypeForm}
            saving={savingRoomType}
            editing={Boolean(editingRoomTypeId)}
            onChange={updateRoomTypeForm}
            onSubmit={saveRoomType}
            onCancel={resetRoomTypeForm}
          />
        </div>

        <section className="mt-8 rounded-[32px] border border-white/10 bg-slate-900 p-6">
          <h2 className="text-2xl font-black">
            Oda Tipleri
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {roomTypes.map((roomType) => {
              const hotel = firstRelation(
                roomType.hotel
              );

              return (
                <article
                  key={roomType.id}
                  className="rounded-3xl bg-slate-950 p-5"
                >
                  <p className="text-xs font-black uppercase tracking-wider text-orange-400">
                    {hotel?.name ??
                      "Otel belirtilmedi"}
                  </p>

                  <h3 className="mt-2 text-xl font-black">
                    {roomType.name}
                  </h3>

                  <p className="mt-2 text-sm text-slate-500">
                    {roomType.room_type_code ??
                      "Kod yok"}{" "}
                    · {roomType.max_adults} yetişkin ·{" "}
                    {roomType.max_children} çocuk
                  </p>

                  <p className="mt-2 text-sm text-slate-500">
                    Kapasite:{" "}
                    {roomType.max_occupancy} kişi ·{" "}
                    Toplam oda: {roomType.total_rooms}
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      editRoomType(roomType)
                    }
                    className="mt-5 min-h-11 w-full rounded-xl bg-orange-500 font-black"
                  >
                    Oda Tipini Düzenle
                  </button>
                </article>
              );
            })}
          </div>

          {roomTypes.length === 0 && (
            <p className="mt-5 text-slate-500">
              Henüz oda tipi kaydı bulunmuyor.
            </p>
          )}
        </section>

        <div className="mt-8">
          <RoomPlanner rooms={rooms} />
        </div>

        <label className="mt-8 flex min-h-14 items-center gap-3 rounded-2xl bg-white px-5">
          <FaSearch className="text-orange-500" />

          <input
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Otel, şehir, ilçe veya kod ara"
            className="w-full bg-transparent font-bold text-slate-950 outline-none"
          />
        </label>

        <section className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredHotels.map((hotel) => (
            <article
              key={hotel.id}
              className="rounded-[30px] border border-white/10 bg-slate-900 p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <FaHotel className="text-2xl text-orange-400" />

                <span className="rounded-full bg-white/[0.06] px-3 py-1 text-xs font-black">
                  {hotel.is_active
                    ? "Aktif"
                    : "Pasif"}
                </span>
              </div>

              <h2 className="mt-5 text-2xl font-black">
                {hotel.name}
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                {
                  hotelTypeLabels[
                    hotel.hotel_type
                  ]
                }
              </p>

              <div className="mt-5 space-y-2 text-sm text-slate-400">
                <p>
                  {hotel.city ||
                    "Şehir belirtilmedi"}
                  {hotel.district
                    ? ` / ${hotel.district}`
                    : ""}
                </p>

                <p className="flex items-center gap-2">
                  <FaStar />
                  {hotel.star_rating ?? 0} yıldız
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  editHotel(hotel)
                }
                className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 font-black"
              >
                <FaEdit />
                Oteli Düzenle
              </button>
            </article>
          ))}
        </section>

        {filteredHotels.length === 0 && (
          <div className="mt-6 rounded-3xl border border-white/10 bg-slate-900 p-10 text-center text-slate-400">
            Henüz otel kaydı bulunmuyor.
          </div>
        )}
      </div>
    </main>
  );
}
