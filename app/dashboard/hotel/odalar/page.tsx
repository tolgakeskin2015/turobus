"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  FaBed,
  FaBroom,
  FaDoorOpen,
  FaEdit,
  FaHotel,
  FaSearch,
} from "react-icons/fa";
import { supabase } from "@/lib/supabase";
import {
  CurrentMembership,
  getCurrentMembership,
} from "@/lib/current-user";
import RoomForm, {
  RoomFormState,
} from "@/components/hotel/rooms/RoomForm";

type HotelOption = {
  id: string;
  name: string;
};

type RoomTypeOption = {
  id: string;
  hotel_id: string;
  name: string;
};

type Room = {
  id: string;
  company_id: string;
  hotel_id: string;
  room_type_id: string;
  room_number: string;
  floor_number: string | null;
  room_status: RoomFormState["room_status"];
  housekeeping_status: RoomFormState["housekeeping_status"];
  notes: string | null;
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
};

const emptyForm: RoomFormState = {
  hotel_id: "",
  room_type_id: "",
  room_number: "",
  floor_number: "",
  room_status: "available",
  housekeeping_status: "clean",
  notes: "",
  is_active: true,
};

const roomStatusLabels: Record<
  RoomFormState["room_status"],
  string
> = {
  available: "Müsait",
  occupied: "Dolu",
  dirty: "Kirli",
  cleaning: "Temizleniyor",
  inspection: "Kontrol Bekliyor",
  maintenance: "Bakımda",
  out_of_order: "Kullanım Dışı",
  blocked: "Bloke",
};

const housekeepingLabels: Record<
  RoomFormState["housekeeping_status"],
  string
> = {
  clean: "Temiz",
  dirty: "Kirli",
  cleaning: "Temizleniyor",
  inspected: "Kontrol Edildi",
};

function firstRelation<T>(
  value: T | T[] | null | undefined
) {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function roomStatusClasses(
  status: RoomFormState["room_status"]
) {
  if (status === "available") {
    return "bg-emerald-500/15 text-emerald-400";
  }

  if (status === "occupied") {
    return "bg-blue-500/15 text-blue-400";
  }

  if (
    status === "maintenance" ||
    status === "out_of_order" ||
    status === "blocked"
  ) {
    return "bg-red-500/15 text-red-400";
  }

  return "bg-amber-500/15 text-amber-400";
}

export default function HotelRoomsPage() {
  const [membership, setMembership] =
    useState<CurrentMembership | null>(null);

  const [hotels, setHotels] =
    useState<HotelOption[]>([]);

  const [roomTypes, setRoomTypes] =
    useState<RoomTypeOption[]>([]);

  const [rooms, setRooms] = useState<Room[]>([]);
  const [form, setForm] =
    useState<RoomFormState>(emptyForm);

  const [editingId, setEditingId] = useState("");
  const [search, setSearch] = useState("");
  const [hotelFilter, setHotelFilter] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] =
    useState("");

  const loadData = useCallback(
    async (companyId: string) => {
      const [
        { data: hotelData, error: hotelError },
        { data: roomTypeData, error: roomTypeError },
        { data: roomData, error: roomError },
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
          .eq("is_active", true)
          .order("name"),

        supabase
          .from("hotel_rooms")
          .select(`
            id,
            company_id,
            hotel_id,
            room_type_id,
            room_number,
            floor_number,
            room_status,
            housekeeping_status,
            notes,
            is_active,
            hotel:hotels (
              id,
              name
            ),
            room_type:hotel_room_types (
              id,
              name
            )
          `)
          .eq("company_id", companyId)
          .order("room_number"),
      ]);

      const error =
        hotelError ?? roomTypeError ?? roomError;

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setHotels((hotelData ?? []) as HotelOption[]);
      setRoomTypes(
        (roomTypeData ?? []) as RoomTypeOption[]
      );
      setRooms((roomData ?? []) as unknown as Room[]);
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
      await loadData(currentMembership.company_id);
      setLoading(false);
    }

    void initialize();
  }, [loadData]);

  const filteredRooms = useMemo(() => {
    const query = search
      .trim()
      .toLocaleLowerCase("tr-TR");

    return rooms.filter((room) => {
      if (
        hotelFilter &&
        room.hotel_id !== hotelFilter
      ) {
        return false;
      }

      if (!query) return true;

      const hotel = firstRelation(room.hotel);
      const roomType = firstRelation(room.room_type);

      return [
        room.room_number,
        room.floor_number,
        hotel?.name,
        roomType?.name,
        roomStatusLabels[room.room_status],
        housekeepingLabels[
          room.housekeeping_status
        ],
      ]
        .filter(Boolean)
        .some((value) =>
          String(value)
            .toLocaleLowerCase("tr-TR")
            .includes(query)
        );
    });
  }, [hotelFilter, rooms, search]);

  const stats = useMemo(
    () => ({
      total: rooms.length,
      available: rooms.filter(
        (room) => room.room_status === "available"
      ).length,
      occupied: rooms.filter(
        (room) => room.room_status === "occupied"
      ).length,
      cleaning: rooms.filter(
        (room) =>
          room.housekeeping_status === "dirty" ||
          room.housekeeping_status === "cleaning"
      ).length,
    }),
    [rooms]
  );

  function updateForm<K extends keyof RoomFormState>(
    key: K,
    value: RoomFormState[K]
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId("");
  }

  function editRoom(room: Room) {
    setEditingId(room.id);

    setForm({
      hotel_id: room.hotel_id,
      room_type_id: room.room_type_id,
      room_number: room.room_number,
      floor_number: room.floor_number ?? "",
      room_status: room.room_status,
      housekeeping_status:
        room.housekeeping_status,
      notes: room.notes ?? "",
      is_active: room.is_active,
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function saveRoom(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!membership) return;

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    const payload = {
      company_id: membership.company_id,
      hotel_id: form.hotel_id,
      room_type_id: form.room_type_id,
      room_number: form.room_number.trim(),
      floor_number:
        form.floor_number.trim() || null,
      room_status: form.room_status,
      housekeeping_status:
        form.housekeeping_status,
      notes: form.notes.trim() || null,
      is_active: form.is_active,
      updated_at: new Date().toISOString(),
    };

    const query = editingId
      ? supabase
          .from("hotel_rooms")
          .update(payload)
          .eq("id", editingId)
          .eq(
            "company_id",
            membership.company_id
          )
      : supabase
          .from("hotel_rooms")
          .insert(payload);

    const { error } = await query;

    if (error) {
      setErrorMessage(error.message);
      setSaving(false);
      return;
    }

    setSuccessMessage(
      editingId
        ? "Oda güncellendi."
        : "Yeni oda eklendi."
    );

    resetForm();
    await loadData(membership.company_id);
    setSaving(false);
  }

  if (loading) {
    return (
      <main className="p-10 text-white">
        Odalar yükleniyor...
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
            Odalar
          </h1>

          <p className="mt-4 text-slate-400">
            Oda numaralarını, katları, oda tiplerini,
            doluluk ve temizlik durumlarını yönetin.
          </p>
        </header>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Toplam Oda",
              value: stats.total,
              icon: FaDoorOpen,
            },
            {
              label: "Müsait",
              value: stats.available,
              icon: FaBed,
            },
            {
              label: "Dolu",
              value: stats.occupied,
              icon: FaHotel,
            },
            {
              label: "Temizlik Bekleyen",
              value: stats.cleaning,
              icon: FaBroom,
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
          <RoomForm
            hotels={hotels}
            roomTypes={roomTypes}
            form={form}
            saving={saving}
            editing={Boolean(editingId)}
            onChange={updateForm}
            onSubmit={saveRoom}
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
                setSearch(event.target.value)
              }
              placeholder="Oda, kat, otel veya oda tipi ara"
              className="w-full bg-transparent font-bold text-slate-950 outline-none"
            />
          </label>

          <select
            value={hotelFilter}
            onChange={(event) =>
              setHotelFilter(event.target.value)
            }
            className="min-h-14 rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
          >
            <option value="">Tüm oteller</option>

            {hotels.map((hotel) => (
              <option key={hotel.id} value={hotel.id}>
                {hotel.name}
              </option>
            ))}
          </select>
        </section>

        <section className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredRooms.map((room) => {
            const hotel = firstRelation(room.hotel);
            const roomType = firstRelation(room.room_type);

            return (
              <article
                key={room.id}
                className="rounded-[30px] border border-white/10 bg-slate-900 p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-400">
                    <FaDoorOpen />
                  </div>

                  <span
                    className={`rounded-full px-3 py-1.5 text-xs font-black ${roomStatusClasses(
                      room.room_status
                    )}`}
                  >
                    {roomStatusLabels[room.room_status]}
                  </span>
                </div>

                <h2 className="mt-5 text-2xl font-black">
                  Oda {room.room_number}
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  {hotel?.name ?? "Otel belirtilmedi"}
                </p>

                <div className="mt-5 space-y-2 text-sm text-slate-400">
                  <p>
                    Oda tipi:{" "}
                    {roomType?.name ?? "Belirtilmedi"}
                  </p>

                  <p>
                    Kat: {room.floor_number || "Belirtilmedi"}
                  </p>

                  <p>
                    Temizlik:{" "}
                    {
                      housekeepingLabels[
                        room.housekeeping_status
                      ]
                    }
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => editRoom(room)}
                  className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 font-black"
                >
                  <FaEdit />
                  Odayı Düzenle
                </button>
              </article>
            );
          })}
        </section>

        {filteredRooms.length === 0 && (
          <div className="mt-6 rounded-3xl border border-white/10 bg-slate-900 p-10 text-center text-slate-400">
            Henüz oda kaydı bulunmuyor.
          </div>
        )}
      </div>
    </main>
  );
}
