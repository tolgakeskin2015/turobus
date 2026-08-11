"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  CurrentMembership,
  getCurrentMembership,
} from "@/lib/current-user";

type PackageHotel = {
  id: string;
  company_id: string;
  supplier_id: string | null;
  name: string;
  city: string | null;
  district: string | null;
  star_rating: number | null;
  description: string | null;
  cover_image_url: string | null;
  video_url: string | null;
  currency: string;
  is_active: boolean;
  created_at: string;
};

type HotelRate = {
  id: string;
  package_hotel_id: string;
  room_type_name: string;
  board_type:
    | "room_only"
    | "breakfast"
    | "half_board"
    | "full_board"
    | "all_inclusive"
    | "ultra_all_inclusive"
    | "other";
  valid_from: string;
  valid_to: string;
  occupancy_adults: number;
  occupancy_children: number;
  nightly_cost: number;
  nightly_sale_price: number | null;
  currency: string;
  allotment: number | null;
  minimum_stay: number;
  stop_sale: boolean;
  is_active: boolean;
};

type SupplierOption = {
  id: string;
  name: string;
  supplier_type: string;
};

type HotelForm = {
  supplier_id: string;
  name: string;
  city: string;
  district: string;
  star_rating: string;
  description: string;
  cover_image_url: string;
  video_url: string;
};

type RateForm = {
  room_type_name: string;
  board_type: HotelRate["board_type"];
  valid_from: string;
  valid_to: string;
  occupancy_adults: string;
  occupancy_children: string;
  nightly_cost: string;
  nightly_sale_price: string;
  allotment: string;
  minimum_stay: string;
  stop_sale: boolean;
};

const emptyHotelForm: HotelForm = {
  supplier_id: "",
  name: "",
  city: "",
  district: "",
  star_rating: "",
  description: "",
  cover_image_url: "",
  video_url: "",
};

const emptyRateForm: RateForm = {
  room_type_name: "",
  board_type: "half_board",
  valid_from: "",
  valid_to: "",
  occupancy_adults: "2",
  occupancy_children: "0",
  nightly_cost: "0",
  nightly_sale_price: "",
  allotment: "",
  minimum_stay: "1",
  stop_sale: false,
};

const boardLabels: Record<
  HotelRate["board_type"],
  string
> = {
  room_only: "Sadece Oda",
  breakfast: "Kahvaltı Dahil",
  half_board: "Yarım Pansiyon",
  full_board: "Tam Pansiyon",
  all_inclusive: "Her Şey Dahil",
  ultra_all_inclusive: "Ultra Her Şey Dahil",
  other: "Diğer",
};

function money(value: number | null) {
  if (value === null) return "-";

  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function numeric(value: string) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
}

function nullableNumeric(value: string) {
  if (!value.trim()) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
}

export default function PackageHotelsPage() {
  const [membership, setMembership] =
    useState<CurrentMembership | null>(null);

  const [hotels, setHotels] =
    useState<PackageHotel[]>([]);

  const [rates, setRates] =
    useState<HotelRate[]>([]);

  const [suppliers, setSuppliers] =
    useState<SupplierOption[]>([]);

  const [selectedHotelId, setSelectedHotelId] =
    useState("");

  const [hotelForm, setHotelForm] =
    useState<HotelForm>(emptyHotelForm);

  const [rateForm, setRateForm] =
    useState<RateForm>(emptyRateForm);

  const [editingHotelId, setEditingHotelId] =
    useState("");

  const [editingRateId, setEditingRateId] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [savingHotel, setSavingHotel] =
    useState(false);

  const [savingRate, setSavingRate] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const loadHotels = useCallback(
    async (companyId: string) => {
      const { data, error } =
        await supabase
          .from("package_catalog_hotels")
          .select(`
            id,
            company_id,
            supplier_id,
            name,
            city,
            district,
            star_rating,
            description,
            cover_image_url,
            video_url,
            currency,
            is_active,
            created_at
          `)
          .eq("company_id", companyId)
          .order("created_at", {
            ascending: false,
          });

      if (error) {
        throw new Error(error.message);
      }

      setHotels(
        (data ?? []) as PackageHotel[]
      );
    },
    []
  );

  const loadSuppliers = useCallback(
    async (companyId: string) => {
      const { data, error } =
        await supabase
          .from("suppliers")
          .select(
            "id,name,supplier_type"
          )
          .eq("company_id", companyId)
          .eq("is_active", true)
          .order("name");

      if (error) {
        console.error(error);
        return;
      }

      setSuppliers(
        (data ?? []) as SupplierOption[]
      );
    },
    []
  );

  const loadRates = useCallback(
    async (
      companyId: string,
      hotelId: string
    ) => {
      if (!hotelId) {
        setRates([]);
        return;
      }

      const { data, error } =
        await supabase
          .from("package_hotel_rates")
          .select(`
            id,
            package_hotel_id,
            room_type_name,
            board_type,
            valid_from,
            valid_to,
            occupancy_adults,
            occupancy_children,
            nightly_cost,
            nightly_sale_price,
            currency,
            allotment,
            minimum_stay,
            stop_sale,
            is_active
          `)
          .eq("company_id", companyId)
          .eq(
            "package_hotel_id",
            hotelId
          )
          .order("valid_from", {
            ascending: false,
          });

      if (error) {
        throw new Error(error.message);
      }

      setRates(
        (data ?? []) as HotelRate[]
      );
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
          setErrorMessage(
            "Kullanıcı oturumu bulunamadı."
          );
          return;
        }

        const currentMembership =
          await getCurrentMembership(user.id);

        if (!currentMembership) {
          setErrorMessage(
            "Aktif şirket üyeliği bulunamadı."
          );
          return;
        }

        setMembership(
          currentMembership
        );

        await Promise.all([
          loadHotels(
            currentMembership.company_id
          ),
          loadSuppliers(
            currentMembership.company_id
          ),
        ]);
      } catch (error) {
        console.error(error);

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Otel kataloğu yüklenemedi."
        );
      } finally {
        setLoading(false);
      }
    }

    void initialize();
  }, [loadHotels, loadSuppliers]);

  useEffect(() => {
    if (
      !membership ||
      !selectedHotelId
    ) {
      setRates([]);
      return;
    }

    void loadRates(
      membership.company_id,
      selectedHotelId
    );
  }, [
    membership,
    selectedHotelId,
    loadRates,
  ]);

  const selectedHotel =
    hotels.find(
      (hotel) =>
        hotel.id === selectedHotelId
    ) ?? null;

  const filteredHotels =
    useMemo(() => {
      const query = search
        .trim()
        .toLocaleLowerCase("tr-TR");

      if (!query) {
        return hotels;
      }

      return hotels.filter((hotel) =>
        [
          hotel.name,
          hotel.city,
          hotel.district,
        ]
          .filter(Boolean)
          .some((value) =>
            String(value)
              .toLocaleLowerCase(
                "tr-TR"
              )
              .includes(query)
          )
      );
    }, [hotels, search]);

  async function saveHotel(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!membership) return;

    if (!hotelForm.name.trim()) {
      setErrorMessage(
        "Otel adı zorunludur."
      );
      return;
    }

    setSavingHotel(true);
    setErrorMessage("");
    setSuccessMessage("");

    const payload = {
      company_id:
        membership.company_id,
      supplier_id:
        hotelForm.supplier_id ||
        null,
      name: hotelForm.name.trim(),
      city:
        hotelForm.city.trim() ||
        null,
      district:
        hotelForm.district.trim() ||
        null,
      star_rating:
        nullableNumeric(
          hotelForm.star_rating
        ),
      description:
        hotelForm.description.trim() ||
        null,
      cover_image_url:
        hotelForm.cover_image_url.trim() ||
        null,
      video_url:
        hotelForm.video_url.trim() ||
        null,
      currency: "TRY",
      is_active: true,
      updated_at:
        new Date().toISOString(),
    };

    const query = editingHotelId
      ? supabase
          .from(
            "package_catalog_hotels"
          )
          .update(payload)
          .eq("id", editingHotelId)
          .eq(
            "company_id",
            membership.company_id
          )
      : supabase
          .from(
            "package_catalog_hotels"
          )
          .insert(payload);

    const { error } = await query;

    if (error) {
      setErrorMessage(
        error.message
      );
      setSavingHotel(false);
      return;
    }

    await loadHotels(
      membership.company_id
    );

    setHotelForm(
      emptyHotelForm
    );
    setEditingHotelId("");

    setSuccessMessage(
      editingHotelId
        ? "Otel güncellendi."
        : "Otel eklendi."
    );

    setSavingHotel(false);
  }

  function editHotel(
    hotel: PackageHotel
  ) {
    setEditingHotelId(hotel.id);

    setHotelForm({
      supplier_id:
        hotel.supplier_id ?? "",
      name: hotel.name,
      city: hotel.city ?? "",
      district:
        hotel.district ?? "",
      star_rating:
        hotel.star_rating?.toString() ??
        "",
      description:
        hotel.description ?? "",
      cover_image_url:
        hotel.cover_image_url ?? "",
      video_url:
        hotel.video_url ?? "",
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function saveRate(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      !membership ||
      !selectedHotelId
    ) {
      setErrorMessage(
        "Önce otel seçin."
      );
      return;
    }

    if (
      !rateForm.room_type_name.trim() ||
      !rateForm.valid_from ||
      !rateForm.valid_to
    ) {
      setErrorMessage(
        "Oda tipi ve tarih aralığı zorunludur."
      );
      return;
    }

    setSavingRate(true);
    setErrorMessage("");
    setSuccessMessage("");

    const payload = {
      company_id:
        membership.company_id,
      package_hotel_id:
        selectedHotelId,
      room_type_name:
        rateForm.room_type_name.trim(),
      board_type:
        rateForm.board_type,
      valid_from:
        rateForm.valid_from,
      valid_to:
        rateForm.valid_to,
      occupancy_adults:
        Math.max(
          1,
          numeric(
            rateForm.occupancy_adults
          )
        ),
      occupancy_children:
        Math.max(
          0,
          numeric(
            rateForm.occupancy_children
          )
        ),
      nightly_cost:
        Math.max(
          0,
          numeric(
            rateForm.nightly_cost
          )
        ),
      nightly_sale_price:
        nullableNumeric(
          rateForm.nightly_sale_price
        ),
      allotment:
        nullableNumeric(
          rateForm.allotment
        ),
      minimum_stay:
        Math.max(
          1,
          numeric(
            rateForm.minimum_stay
          )
        ),
      stop_sale:
        rateForm.stop_sale,
      currency: "TRY",
      is_active: true,
      updated_at:
        new Date().toISOString(),
    };

    const query = editingRateId
      ? supabase
          .from(
            "package_hotel_rates"
          )
          .update(payload)
          .eq("id", editingRateId)
          .eq(
            "company_id",
            membership.company_id
          )
      : supabase
          .from(
            "package_hotel_rates"
          )
          .insert(payload);

    const { error } = await query;

    if (error) {
      setErrorMessage(
        error.message
      );
      setSavingRate(false);
      return;
    }

    await loadRates(
      membership.company_id,
      selectedHotelId
    );

    setRateForm(
      emptyRateForm
    );
    setEditingRateId("");

    setSuccessMessage(
      editingRateId
        ? "Fiyat dönemi güncellendi."
        : "Fiyat dönemi eklendi."
    );

    setSavingRate(false);
  }

  function editRate(
    rate: HotelRate
  ) {
    setEditingRateId(rate.id);

    setRateForm({
      room_type_name:
        rate.room_type_name,
      board_type:
        rate.board_type,
      valid_from:
        rate.valid_from,
      valid_to:
        rate.valid_to,
      occupancy_adults:
        String(
          rate.occupancy_adults
        ),
      occupancy_children:
        String(
          rate.occupancy_children
        ),
      nightly_cost:
        String(rate.nightly_cost),
      nightly_sale_price:
        rate.nightly_sale_price ===
        null
          ? ""
          : String(
              rate.nightly_sale_price
            ),
      allotment:
        rate.allotment === null
          ? ""
          : String(rate.allotment),
      minimum_stay:
        String(rate.minimum_stay),
      stop_sale:
        rate.stop_sale,
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-10 text-white">
        Otel kataloğu yükleniyor...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 p-5 text-white md:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-400">
              TUROBUS PACKAGE OS
            </p>

            <h1 className="mt-3 text-4xl font-black">
              Otel Ürün Havuzu
            </h1>

            <p className="mt-3 text-slate-400">
              Anlaşmalı oteller, oda tipleri,
              pansiyonlar, sezon alış fiyatları
              ve kontenjan.
            </p>
          </div>

          <Link
            href="/dashboard/package-os"
            className="rounded-xl border border-white/10 px-4 py-3 text-sm font-black"
          >
            ← Paket Merkezi
          </Link>
        </div>

        {errorMessage && (
          <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-300">
            {successMessage}
          </div>
        )}

        <div className="mt-8 grid gap-6 xl:grid-cols-[420px_1fr]">
          <form
            onSubmit={saveHotel}
            className="rounded-[28px] border border-white/10 bg-slate-900 p-6"
          >
            <p className="text-xs font-black uppercase tracking-wider text-orange-400">
              {editingHotelId
                ? "Otel Düzenle"
                : "Yeni Otel"}
            </p>

            <div className="mt-5 space-y-4">
              <input
                value={hotelForm.name}
                onChange={(event) =>
                  setHotelForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="Otel adı"
                className="w-full rounded-xl border border-white/10 bg-slate-950 p-3"
              />

              <select
                value={
                  hotelForm.supplier_id
                }
                onChange={(event) =>
                  setHotelForm((current) => ({
                    ...current,
                    supplier_id:
                      event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-white/10 bg-slate-950 p-3"
              >
                <option value="">
                  Tedarikçi seçilmedi
                </option>

                {suppliers.map(
                  (supplier) => (
                    <option
                      key={supplier.id}
                      value={supplier.id}
                    >
                      {supplier.name}
                    </option>
                  )
                )}
              </select>

              <div className="grid grid-cols-2 gap-3">
                <input
                  value={hotelForm.city}
                  onChange={(event) =>
                    setHotelForm(
                      (current) => ({
                        ...current,
                        city:
                          event.target
                            .value,
                      })
                    )
                  }
                  placeholder="Şehir"
                  className="rounded-xl border border-white/10 bg-slate-950 p-3"
                />

                <input
                  value={
                    hotelForm.district
                  }
                  onChange={(event) =>
                    setHotelForm(
                      (current) => ({
                        ...current,
                        district:
                          event.target
                            .value,
                      })
                    )
                  }
                  placeholder="Bölge"
                  className="rounded-xl border border-white/10 bg-slate-950 p-3"
                />
              </div>

              <input
                value={
                  hotelForm.star_rating
                }
                onChange={(event) =>
                  setHotelForm((current) => ({
                    ...current,
                    star_rating:
                      event.target.value,
                  }))
                }
                placeholder="Yıldız"
                type="number"
                min="0"
                max="5"
                step="0.5"
                className="w-full rounded-xl border border-white/10 bg-slate-950 p-3"
              />

              <textarea
                value={
                  hotelForm.description
                }
                onChange={(event) =>
                  setHotelForm((current) => ({
                    ...current,
                    description:
                      event.target.value,
                  }))
                }
                placeholder="Otel açıklaması"
                className="min-h-28 w-full rounded-xl border border-white/10 bg-slate-950 p-3"
              />

              <input
                value={
                  hotelForm.cover_image_url
                }
                onChange={(event) =>
                  setHotelForm((current) => ({
                    ...current,
                    cover_image_url:
                      event.target.value,
                  }))
                }
                placeholder="Kapak görsel URL"
                className="w-full rounded-xl border border-white/10 bg-slate-950 p-3"
              />

              <input
                value={
                  hotelForm.video_url
                }
                onChange={(event) =>
                  setHotelForm((current) => ({
                    ...current,
                    video_url:
                      event.target.value,
                  }))
                }
                placeholder="Video URL"
                className="w-full rounded-xl border border-white/10 bg-slate-950 p-3"
              />

              <button
                disabled={savingHotel}
                className="w-full rounded-xl bg-orange-500 px-4 py-3 font-black text-black disabled:opacity-50"
              >
                {savingHotel
                  ? "Kaydediliyor..."
                  : editingHotelId
                    ? "Oteli Güncelle"
                    : "Oteli Kaydet"}
              </button>

              {editingHotelId && (
                <button
                  type="button"
                  onClick={() => {
                    setHotelForm(
                      emptyHotelForm
                    );
                    setEditingHotelId("");
                  }}
                  className="w-full rounded-xl border border-white/10 px-4 py-3"
                >
                  Vazgeç
                </button>
              )}
            </div>
          </form>

          <section>
            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Otel ara..."
              className="mb-4 w-full rounded-xl border border-white/10 bg-slate-900 p-4"
            />

            <div className="grid gap-4 md:grid-cols-2">
              {filteredHotels.map(
                (hotel) => (
                  <div
                    key={hotel.id}
                    className={`rounded-[24px] border p-5 ${
                      selectedHotelId ===
                      hotel.id
                        ? "border-orange-500 bg-orange-500/5"
                        : "border-white/10 bg-slate-900"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-black">
                          {hotel.name}
                        </h2>

                        <p className="mt-1 text-sm text-slate-400">
                          {[
                            hotel.city,
                            hotel.district,
                          ]
                            .filter(Boolean)
                            .join(" / ") ||
                            "Konum girilmedi"}
                        </p>
                      </div>

                      <span className="rounded-lg bg-slate-950 px-3 py-1 text-xs font-black">
                        {hotel.star_rating
                          ? `${hotel.star_rating} ★`
                          : "★ -"}
                      </span>
                    </div>

                    <div className="mt-5 flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedHotelId(
                            hotel.id
                          )
                        }
                        className="rounded-xl bg-white px-3 py-2 text-xs font-black text-black"
                      >
                        Fiyatlar
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          editHotel(hotel)
                        }
                        className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black"
                      >
                        Düzenle
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          </section>
        </div>

        {selectedHotel && (
          <div className="mt-10 rounded-[30px] border border-white/10 bg-slate-900 p-6">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-emerald-400">
                Sezon & Kontrat
              </p>

              <h2 className="mt-2 text-2xl font-black">
                {selectedHotel.name}
              </h2>
            </div>

            <form
              onSubmit={saveRate}
              className="mt-6 grid gap-3 md:grid-cols-3 xl:grid-cols-5"
            >
              <input
                value={
                  rateForm.room_type_name
                }
                onChange={(event) =>
                  setRateForm((current) => ({
                    ...current,
                    room_type_name:
                      event.target.value,
                  }))
                }
                placeholder="Oda tipi"
                className="rounded-xl border border-white/10 bg-slate-950 p-3"
              />

              <select
                value={
                  rateForm.board_type
                }
                onChange={(event) =>
                  setRateForm((current) => ({
                    ...current,
                    board_type:
                      event.target
                        .value as HotelRate["board_type"],
                  }))
                }
                className="rounded-xl border border-white/10 bg-slate-950 p-3"
              >
                {Object.entries(
                  boardLabels
                ).map(
                  ([value, label]) => (
                    <option
                      key={value}
                      value={value}
                    >
                      {label}
                    </option>
                  )
                )}
              </select>

              <input
                type="date"
                value={
                  rateForm.valid_from
                }
                onChange={(event) =>
                  setRateForm((current) => ({
                    ...current,
                    valid_from:
                      event.target.value,
                  }))
                }
                className="rounded-xl border border-white/10 bg-slate-950 p-3"
              />

              <input
                type="date"
                value={rateForm.valid_to}
                onChange={(event) =>
                  setRateForm((current) => ({
                    ...current,
                    valid_to:
                      event.target.value,
                  }))
                }
                className="rounded-xl border border-white/10 bg-slate-950 p-3"
              />

              <input
                value={
                  rateForm.nightly_cost
                }
                onChange={(event) =>
                  setRateForm((current) => ({
                    ...current,
                    nightly_cost:
                      event.target.value,
                  }))
                }
                placeholder="Gecelik alış"
                type="number"
                min="0"
                step="0.01"
                className="rounded-xl border border-white/10 bg-slate-950 p-3"
              />

              <input
                value={
                  rateForm.nightly_sale_price
                }
                onChange={(event) =>
                  setRateForm((current) => ({
                    ...current,
                    nightly_sale_price:
                      event.target.value,
                  }))
                }
                placeholder="Gecelik satış"
                type="number"
                min="0"
                step="0.01"
                className="rounded-xl border border-white/10 bg-slate-950 p-3"
              />

              <input
                value={
                  rateForm.occupancy_adults
                }
                onChange={(event) =>
                  setRateForm((current) => ({
                    ...current,
                    occupancy_adults:
                      event.target.value,
                  }))
                }
                placeholder="Yetişkin"
                type="number"
                min="1"
                className="rounded-xl border border-white/10 bg-slate-950 p-3"
              />

              <input
                value={
                  rateForm.occupancy_children
                }
                onChange={(event) =>
                  setRateForm((current) => ({
                    ...current,
                    occupancy_children:
                      event.target.value,
                  }))
                }
                placeholder="Çocuk"
                type="number"
                min="0"
                className="rounded-xl border border-white/10 bg-slate-950 p-3"
              />

              <input
                value={
                  rateForm.allotment
                }
                onChange={(event) =>
                  setRateForm((current) => ({
                    ...current,
                    allotment:
                      event.target.value,
                  }))
                }
                placeholder="Kontenjan"
                type="number"
                min="0"
                className="rounded-xl border border-white/10 bg-slate-950 p-3"
              />

              <input
                value={
                  rateForm.minimum_stay
                }
                onChange={(event) =>
                  setRateForm((current) => ({
                    ...current,
                    minimum_stay:
                      event.target.value,
                  }))
                }
                placeholder="Min. gece"
                type="number"
                min="1"
                className="rounded-xl border border-white/10 bg-slate-950 p-3"
              />

              <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-950 p-3 text-sm">
                <input
                  type="checkbox"
                  checked={
                    rateForm.stop_sale
                  }
                  onChange={(event) =>
                    setRateForm(
                      (current) => ({
                        ...current,
                        stop_sale:
                          event.target
                            .checked,
                      })
                    )
                  }
                />
                Stop Sale
              </label>

              <button
                disabled={savingRate}
                className="rounded-xl bg-emerald-500 px-4 py-3 font-black text-black disabled:opacity-50"
              >
                {savingRate
                  ? "Kaydediliyor..."
                  : editingRateId
                    ? "Fiyatı Güncelle"
                    : "Fiyat Ekle"}
              </button>
            </form>

            <div className="mt-7 overflow-x-auto">
              <table className="w-full min-w-[950px] text-sm">
                <thead className="text-left text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="p-3">
                      Oda
                    </th>
                    <th className="p-3">
                      Pansiyon
                    </th>
                    <th className="p-3">
                      Dönem
                    </th>
                    <th className="p-3">
                      Alış
                    </th>
                    <th className="p-3">
                      Satış
                    </th>
                    <th className="p-3">
                      Kontenjan
                    </th>
                    <th className="p-3">
                      Durum
                    </th>
                    <th className="p-3">
                      İşlem
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {rates.map((rate) => (
                    <tr
                      key={rate.id}
                      className="border-t border-white/5"
                    >
                      <td className="p-3 font-black">
                        {
                          rate.room_type_name
                        }
                      </td>

                      <td className="p-3">
                        {
                          boardLabels[
                            rate.board_type
                          ]
                        }
                      </td>

                      <td className="p-3">
                        {rate.valid_from}
                        {" → "}
                        {rate.valid_to}
                      </td>

                      <td className="p-3">
                        {money(
                          rate.nightly_cost
                        )}
                      </td>

                      <td className="p-3">
                        {money(
                          rate.nightly_sale_price
                        )}
                      </td>

                      <td className="p-3">
                        {rate.allotment ??
                          "Sınırsız"}
                      </td>

                      <td className="p-3">
                        {rate.stop_sale
                          ? "STOP SALE"
                          : "Açık"}
                      </td>

                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() =>
                            editRate(rate)
                          }
                          className="rounded-lg border border-white/10 px-3 py-2 text-xs font-black"
                        >
                          Düzenle
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
