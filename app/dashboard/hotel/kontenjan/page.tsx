"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  FaCalendarAlt,
  FaEdit,
  FaExclamationTriangle,
  FaHotel,
  FaSearch,
} from "react-icons/fa";
import { supabase } from "@/lib/supabase";
import {
  CurrentMembership,
  getCurrentMembership,
} from "@/lib/current-user";
import InventoryForm, {
  InventoryFormState,
} from "@/components/hotel/inventory/InventoryForm";

type HotelOption = {
  id: string;
  name: string;
};

type RoomTypeOption = {
  id: string;
  hotel_id: string;
  name: string;
};

type Inventory = {
  id: string;
  company_id: string;
  hotel_id: string;
  room_type_id: string;
  inventory_date: string;
  total_inventory: number;
  reserved_inventory: number;
  blocked_inventory: number;
  stop_sale: boolean;
  minimum_stay: number;
  closed_to_arrival: boolean;
  closed_to_departure: boolean;
  notes: string | null;
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

const emptyForm: InventoryFormState = {
  hotel_id: "",
  room_type_id: "",
  inventory_date: new Date().toISOString().slice(0, 10),
  total_inventory: "0",
  reserved_inventory: "0",
  blocked_inventory: "0",
  minimum_stay: "1",
  stop_sale: false,
  closed_to_arrival: false,
  closed_to_departure: false,
  notes: "",
};

function firstRelation<T>(
  value: T | T[] | null | undefined
) {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export default function HotelInventoryPage() {
  const [membership, setMembership] =
    useState<CurrentMembership | null>(null);

  const [hotels, setHotels] =
    useState<HotelOption[]>([]);

  const [roomTypes, setRoomTypes] =
    useState<RoomTypeOption[]>([]);

  const [inventory, setInventory] =
    useState<Inventory[]>([]);

  const [form, setForm] =
    useState<InventoryFormState>(emptyForm);

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
        { data: inventoryData, error: inventoryError },
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
          .from("hotel_inventory")
          .select(`
            id,
            company_id,
            hotel_id,
            room_type_id,
            inventory_date,
            total_inventory,
            reserved_inventory,
            blocked_inventory,
            stop_sale,
            minimum_stay,
            closed_to_arrival,
            closed_to_departure,
            notes,
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
          .order("inventory_date", {
            ascending: true,
          }),
      ]);

      const error =
        hotelError ??
        roomTypeError ??
        inventoryError;

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setHotels((hotelData ?? []) as HotelOption[]);
      setRoomTypes(
        (roomTypeData ?? []) as RoomTypeOption[]
      );
      setInventory(
        (inventoryData ?? []) as unknown as Inventory[]
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
      await loadData(currentMembership.company_id);
      setLoading(false);
    }

    void initialize();
  }, [loadData]);

  const filteredInventory = useMemo(() => {
    const query = search
      .trim()
      .toLocaleLowerCase("tr-TR");

    return inventory.filter((item) => {
      if (
        hotelFilter &&
        item.hotel_id !== hotelFilter
      ) {
        return false;
      }

      if (!query) return true;

      const hotel = firstRelation(item.hotel);
      const roomType = firstRelation(item.room_type);

      return [
        hotel?.name,
        roomType?.name,
        item.inventory_date,
        item.notes,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value)
            .toLocaleLowerCase("tr-TR")
            .includes(query)
        );
    });
  }, [hotelFilter, inventory, search]);

  const stats = useMemo(() => {
    return inventory.reduce(
      (result, item) => {
        result.total += item.total_inventory;
        result.reserved += item.reserved_inventory;
        result.blocked += item.blocked_inventory;

        if (item.stop_sale) {
          result.stopSale += 1;
        }

        return result;
      },
      {
        total: 0,
        reserved: 0,
        blocked: 0,
        stopSale: 0,
      }
    );
  }, [inventory]);

  function updateForm<K extends keyof InventoryFormState>(
    key: K,
    value: InventoryFormState[K]
  ) {
    setForm((current: InventoryFormState) => ({
      ...current,
      [key]: value,
    }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId("");
  }

  function editInventory(item: Inventory) {
    setEditingId(item.id);

    setForm({
      hotel_id: item.hotel_id,
      room_type_id: item.room_type_id,
      inventory_date: item.inventory_date,
      total_inventory: String(item.total_inventory),
      reserved_inventory: String(item.reserved_inventory),
      blocked_inventory: String(item.blocked_inventory),
      minimum_stay: String(item.minimum_stay),
      stop_sale: item.stop_sale,
      closed_to_arrival: item.closed_to_arrival,
      closed_to_departure: item.closed_to_departure,
      notes: item.notes ?? "",
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function saveInventory(
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
      inventory_date: form.inventory_date,
      total_inventory: Math.max(
        0,
        Number(form.total_inventory) || 0
      ),
      reserved_inventory: Math.max(
        0,
        Number(form.reserved_inventory) || 0
      ),
      blocked_inventory: Math.max(
        0,
        Number(form.blocked_inventory) || 0
      ),
      minimum_stay: Math.max(
        1,
        Number(form.minimum_stay) || 1
      ),
      stop_sale: form.stop_sale,
      closed_to_arrival:
        form.closed_to_arrival,
      closed_to_departure:
        form.closed_to_departure,
      notes: form.notes.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const query = editingId
      ? supabase
          .from("hotel_inventory")
          .update(payload)
          .eq("id", editingId)
          .eq(
            "company_id",
            membership.company_id
          )
      : supabase
          .from("hotel_inventory")
          .upsert(payload, {
            onConflict:
              "hotel_id,room_type_id,inventory_date",
          });

    const { error } = await query;

    if (error) {
      setErrorMessage(error.message);
      setSaving(false);
      return;
    }

    setSuccessMessage(
      editingId
        ? "Kontenjan güncellendi."
        : "Kontenjan kaydedildi."
    );

    resetForm();
    await loadData(membership.company_id);
    setSaving(false);
  }

  if (loading) {
    return (
      <main className="p-10 text-white">
        Kontenjan yükleniyor...
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
            Kontenjan Yönetimi
          </h1>

          <p className="mt-4 text-slate-400">
            Günlük müsaitlik, rezervasyon, blokaj ve satış durdurma kayıtlarını yönetin.
          </p>
        </header>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Toplam Kontenjan",
              value: stats.total,
              icon: FaHotel,
            },
            {
              label: "Rezerve",
              value: stats.reserved,
              icon: FaCalendarAlt,
            },
            {
              label: "Bloke",
              value: stats.blocked,
              icon: FaExclamationTriangle,
            },
            {
              label: "Stop Sale",
              value: stats.stopSale,
              icon: FaExclamationTriangle,
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
          <InventoryForm
            hotels={hotels}
            roomTypes={roomTypes}
            form={form}
            saving={saving}
            editing={Boolean(editingId)}
            onChange={updateForm}
            onSubmit={saveInventory}
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
              placeholder="Otel, oda tipi, tarih veya not ara"
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
          {filteredInventory.map((item) => {
            const hotel = firstRelation(item.hotel);
            const roomType = firstRelation(item.room_type);

            const available = Math.max(
              item.total_inventory -
                item.reserved_inventory -
                item.blocked_inventory,
              0
            );

            return (
              <article
                key={item.id}
                className="rounded-[30px] border border-white/10 bg-slate-900 p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-orange-400">
                      {new Date(
                        `${item.inventory_date}T00:00:00`
                      ).toLocaleDateString("tr-TR")}
                    </p>

                    <h2 className="mt-2 text-2xl font-black">
                      {roomType?.name ?? "Oda tipi"}
                    </h2>

                    <p className="mt-2 text-sm text-slate-500">
                      {hotel?.name ?? "Otel belirtilmedi"}
                    </p>
                  </div>

                  {item.stop_sale && (
                    <span className="rounded-full bg-red-500/15 px-3 py-1.5 text-xs font-black text-red-400">
                      Stop Sale
                    </span>
                  )}
                </div>

                <div className="mt-6 grid grid-cols-4 gap-3 text-center">
                  <div className="rounded-2xl bg-slate-950 p-3">
                    <p className="text-xs text-slate-500">
                      Toplam
                    </p>
                    <p className="mt-1 font-black">
                      {item.total_inventory}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-950 p-3">
                    <p className="text-xs text-slate-500">
                      Rezerve
                    </p>
                    <p className="mt-1 font-black">
                      {item.reserved_inventory}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-950 p-3">
                    <p className="text-xs text-slate-500">
                      Bloke
                    </p>
                    <p className="mt-1 font-black">
                      {item.blocked_inventory}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-emerald-500/10 p-3">
                    <p className="text-xs text-emerald-300">
                      Müsait
                    </p>
                    <p className="mt-1 font-black text-emerald-400">
                      {available}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => editInventory(item)}
                  className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 font-black"
                >
                  <FaEdit />
                  Kontenjanı Düzenle
                </button>
              </article>
            );
          })}
        </section>

        {filteredInventory.length === 0 && (
          <div className="mt-6 rounded-3xl border border-white/10 bg-slate-900 p-10 text-center text-slate-400">
            Henüz kontenjan kaydı bulunmuyor.
          </div>
        )}
      </div>
    </main>
  );
}
