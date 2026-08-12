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

type Hotel = {
  id: string;
  supplier_id: string | null;
  name: string;
  city: string | null;
};

type Rate = {
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
  allotment: number | null;
  minimum_stay: number;
  stop_sale: boolean;
};

type Activity = {
  id: string;
  supplier_id: string | null;
  name: string;
  pricing_unit:
    | "per_person"
    | "per_couple"
    | "per_vehicle"
    | "per_group"
    | "fixed";
  default_cost: number;
  requires_slot: boolean;
};

type SelectedActivity = {
  activityId: string;
  quantity: number;
};

type PricingMode =
  | "target_price"
  | "markup_percent"
  | "fixed_profit";

const boardLabels: Record<
  Rate["board_type"],
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

function money(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function nightsBetween(
  start: string,
  end: string
) {
  if (!start || !end) return 0;

  const a = new Date(`${start}T12:00:00`);
  const b = new Date(`${end}T12:00:00`);

  return Math.max(
    0,
    Math.round(
      (b.getTime() - a.getTime()) /
        86400000
    )
  );
}

function quoteCode() {
  return `PKT-${Date.now()
    .toString()
    .slice(-8)}`;
}

export default function PackageBuilderPage() {
  const [membership, setMembership] =
    useState<CurrentMembership | null>(null);

  const [userId, setUserId] =
    useState("");

  const [hotels, setHotels] =
    useState<Hotel[]>([]);

  const [rates, setRates] =
    useState<Rate[]>([]);

  const [activities, setActivities] =
    useState<Activity[]>([]);

  const [customerName, setCustomerName] =
    useState("");

  const [customerPhone, setCustomerPhone] =
    useState("");

  const [checkIn, setCheckIn] =
    useState("");

  const [checkOut, setCheckOut] =
    useState("");

  const [adults, setAdults] =
    useState(2);

  const [children, setChildren] =
    useState(0);

  const [selectedHotelId, setSelectedHotelId] =
    useState("");

  const [selectedRateId, setSelectedRateId] =
    useState("");

  const [selectedActivities, setSelectedActivities] =
    useState<SelectedActivity[]>([]);

  const [pricingMode, setPricingMode] =
    useState<PricingMode>("target_price");

  const [pricingValue, setPricingValue] =
    useState(0);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [errorMessage, setErrorMessage] =
    useState("");

  const nights = useMemo(
    () => nightsBetween(checkIn, checkOut),
    [checkIn, checkOut]
  );

  const loadData = useCallback(
    async (companyId: string) => {
      const [
        hotelResult,
        rateResult,
        activityResult,
      ] = await Promise.all([
        supabase
          .from("package_catalog_hotels")
          .select("id,supplier_id,name,city")
          .eq("company_id", companyId)
          .eq("is_active", true)
          .order("name"),

        supabase
          .from("package_hotel_rates")
          .select(
            "id,package_hotel_id,room_type_name,board_type,valid_from,valid_to,occupancy_adults,occupancy_children,nightly_cost,allotment,minimum_stay,stop_sale"
          )
          .eq("company_id", companyId)
          .eq("is_active", true),

        supabase
          .from("package_activities")
          .select(
            "id,supplier_id,name,pricing_unit,default_cost,requires_slot"
          )
          .eq("company_id", companyId)
          .eq("is_active", true)
          .order("name"),
      ]);

      if (hotelResult.error)
        throw hotelResult.error;

      if (rateResult.error)
        throw rateResult.error;

      if (activityResult.error)
        throw activityResult.error;

      setHotels(
        (hotelResult.data ?? []) as Hotel[]
      );

      setRates(
        (rateResult.data ?? []) as Rate[]
      );

      setActivities(
        (activityResult.data ?? []) as Activity[]
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

        setMembership(currentMembership);
        setUserId(user.id);

        await loadData(
          currentMembership.company_id
        );
      } catch (error) {
        console.error(error);
        setErrorMessage(
          "Paket verileri yüklenemedi."
        );
      } finally {
        setLoading(false);
      }
    }

    void initialize();
  }, [loadData]);

  const availableRates = useMemo(() => {
    if (
      !selectedHotelId ||
      !checkIn ||
      !checkOut ||
      nights < 1
    ) {
      return [];
    }

    return rates.filter((rate) => {
      if (
        rate.package_hotel_id !==
        selectedHotelId
      ) {
        return false;
      }

      if (rate.stop_sale) return false;

      if (
        rate.valid_from > checkIn ||
        rate.valid_to < checkOut
      ) {
        return false;
      }

      if (
        rate.minimum_stay > nights
      ) {
        return false;
      }

      if (
        rate.occupancy_adults < adults
      ) {
        return false;
      }

      if (
        rate.occupancy_children < children
      ) {
        return false;
      }

      if (
        rate.allotment !== null &&
        rate.allotment <= 0
      ) {
        return false;
      }

      return true;
    });
  }, [
    rates,
    selectedHotelId,
    checkIn,
    checkOut,
    nights,
    adults,
    children,
  ]);

  const selectedHotel =
    hotels.find(
      (hotel) =>
        hotel.id === selectedHotelId
    ) ?? null;

  const selectedRate =
    rates.find(
      (rate) =>
        rate.id === selectedRateId
    ) ?? null;

  const hotelCost =
    selectedRate
      ? Number(selectedRate.nightly_cost) *
        nights
      : 0;

  const activityRows =
    selectedActivities
      .map((selected) => {
        const activity =
          activities.find(
            (item) =>
              item.id ===
              selected.activityId
          );

        if (!activity) return null;

        return {
          activity,
          quantity:
            selected.quantity,
          totalCost:
            Number(
              activity.default_cost
            ) *
            selected.quantity,
        };
      })
      .filter(Boolean) as {
        activity: Activity;
        quantity: number;
        totalCost: number;
      }[];

  const activitiesCost =
    activityRows.reduce(
      (total, row) =>
        total + row.totalCost,
      0
    );

  const totalCost =
    hotelCost + activitiesCost;

  let salePrice = 0;

  if (
    pricingMode ===
    "target_price"
  ) {
    salePrice =
      Math.max(0, pricingValue);
  }

  if (
    pricingMode ===
    "fixed_profit"
  ) {
    salePrice =
      totalCost +
      Math.max(0, pricingValue);
  }

  if (
    pricingMode ===
    "markup_percent"
  ) {
    salePrice =
      totalCost *
      (1 +
        Math.max(
          0,
          pricingValue
        ) /
          100);
  }

  const grossProfit =
    salePrice - totalCost;

  const margin =
    salePrice > 0
      ? (grossProfit / salePrice) *
        100
      : 0;

  function toggleActivity(
    activity: Activity
  ) {
    setSelectedActivities(
      (current) => {
        const exists =
          current.some(
            (item) =>
              item.activityId ===
              activity.id
          );

        if (exists) {
          return current.filter(
            (item) =>
              item.activityId !==
              activity.id
          );
        }

        const quantity =
          activity.pricing_unit ===
          "per_person"
            ? adults + children
            : 1;

        return [
          ...current,
          {
            activityId: activity.id,
            quantity: Math.max(
              1,
              quantity
            ),
          },
        ];
      }
    );
  }

  async function saveQuote(
    event: FormEvent
  ) {
    event.preventDefault();

    if (
      !membership ||
      !userId
    ) {
      return;
    }

    setErrorMessage("");
    setMessage("");

    if (
      !customerName.trim() ||
      !selectedHotel ||
      !selectedRate ||
      nights < 1
    ) {
      setErrorMessage(
        "Müşteri, tarih, otel ve oda seçimi zorunlu."
      );
      return;
    }

    if (salePrice <= 0) {
      setErrorMessage(
        "Satış fiyatı girin."
      );
      return;
    }

    setSaving(true);

    try {
      const code = quoteCode();

      const {
        data: quote,
        error,
      } = await supabase
        .from("package_quotes")
        .insert({
          company_id:
            membership.company_id,
          quote_code: code,
          customer_name:
            customerName.trim(),
          customer_phone:
            customerPhone.trim() ||
            null,
          sales_user_id:
            userId,
          package_type:
            "holiday",
          destination:
            selectedHotel.city,
          check_in: checkIn,
          check_out: checkOut,
          adults,
          children,
          nights,
          currency: "TRY",
          total_cost:
            totalCost,
          gross_profit:
            grossProfit,
          sale_price:
            salePrice,
          margin_percent:
            margin,
          pricing_mode:
            pricingMode,
          pricing_value:
            pricingValue,
          status:
            "draft",
        })
        .select(
          "id,quote_code"
        )
        .single();

      if (error || !quote) {
        throw error ??
          new Error(
            "Teklif oluşturulamadı."
          );
      }

      const factor =
        totalCost > 0
          ? salePrice / totalCost
          : 0;

      const hotelSale =
        hotelCost * factor;

      const items = [
        {
          company_id:
            membership.company_id,
          quote_id:
            quote.id,
          item_type:
            "hotel",
          reference_id:
            selectedHotel.id,
          supplier_id:
            selectedHotel.supplier_id,
          name:
            `${selectedHotel.name} · ${selectedRate.room_type_name} · ${boardLabels[selectedRate.board_type]}`,
          service_date:
            checkIn,
          quantity:
            nights,
          unit_cost:
            Number(
              selectedRate.nightly_cost
            ),
          total_cost:
            hotelCost,
          unit_sale_price:
            nights > 0
              ? hotelSale / nights
              : 0,
          total_sale_price:
            hotelSale,
          currency:
            "TRY",
          cost_snapshot: {
            hotel:
              selectedHotel.name,
            room_type:
              selectedRate.room_type_name,
            board:
              selectedRate.board_type,
            nightly_cost:
              selectedRate.nightly_cost,
            nights,
          },
          sort_order: 0,
        },

        ...activityRows.map(
          (row, index) => {
            const itemSale =
              row.totalCost *
              factor;

            return {
              company_id:
                membership.company_id,
              quote_id:
                quote.id,
              item_type:
                "activity",
              reference_id:
                row.activity.id,
              supplier_id:
                row.activity.supplier_id,
              name:
                row.activity.name,
              service_date:
                null,
              quantity:
                row.quantity,
              unit_cost:
                row.activity.default_cost,
              total_cost:
                row.totalCost,
              unit_sale_price:
                itemSale /
                row.quantity,
              total_sale_price:
                itemSale,
              currency:
                "TRY",
              cost_snapshot: {
                activity:
                  row.activity.name,
                cost:
                  row.activity.default_cost,
                requires_slot:
                  row.activity.requires_slot,
              },
              sort_order:
                index + 1,
            };
          }
        ),
      ];

      const { error: itemError } =
        await supabase
          .from(
            "package_quote_items"
          )
          .insert(items);

      if (itemError) {
        await supabase
          .from("package_quotes")
          .delete()
          .eq("id", quote.id);

        throw itemError;
      }

      setMessage(
        `Teklif oluşturuldu: ${quote.quote_code}`
      );
    } catch (error) {
      console.error(error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Teklif oluşturulamadı."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-10 text-white">
        Paket motoru yükleniyor...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 p-5 text-white md:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-400">
              TUROBUS PACKAGE OS
            </p>

            <h1 className="mt-2 text-4xl font-black">
              Canlı Paket Oluştur
            </h1>
          </div>

          <Link
            href="/dashboard/package-os"
            className="rounded-xl border border-white/10 px-4 py-3 text-sm font-black"
          >
            ← Paket Merkezi
          </Link>
        </div>

        {errorMessage && (
          <div className="mt-6 rounded-xl bg-red-500/10 p-4 text-red-300">
            {errorMessage}
          </div>
        )}

        {message && (
          <div className="mt-6 rounded-xl bg-emerald-500/10 p-4 text-emerald-300">
            {message}
          </div>
        )}

        <form
          onSubmit={saveQuote}
          className="mt-8 grid gap-6 xl:grid-cols-[1fr_380px]"
        >
          <div className="space-y-6">
            <section className="rounded-[28px] border border-white/10 bg-slate-900 p-6">
              <h2 className="text-xl font-black">
                Müşteri & Tarih
              </h2>

              <div className="mt-5 grid gap-4 md:grid-cols-2">

                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">
                    Müşteri Adı Soyadı
                  </span>

                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) =>
                      setCustomerName(
                        e.target.value
                      )
                    }
                    placeholder="Örn: Ahmet Yılmaz"
                    autoComplete="name"
                    className="w-full rounded-xl border border-white/10 bg-slate-950 p-3 outline-none focus:border-orange-500/50"
                  />
                </label>


                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">
                    Telefon Numarası
                  </span>

                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) =>
                      setCustomerPhone(
                        e.target.value
                      )
                    }
                    placeholder="Örn: 0532 123 45 67"
                    autoComplete="tel"
                    inputMode="tel"
                    className="w-full rounded-xl border border-white/10 bg-slate-950 p-3 outline-none focus:border-orange-500/50"
                  />
                </label>


                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">
                    Giriş Tarihi
                  </span>

                  <input
                    type="date"
                    value={checkIn}
                    onClick={(e) =>
                      e.currentTarget
                        .showPicker?.()
                    }
                    onChange={(e) => {
                      const value =
                        e.target.value;

                      setCheckIn(
                        value
                      );

                      if (
                        checkOut &&
                        value &&
                        checkOut <= value
                      ) {
                        setCheckOut(
                          ""
                        );
                      }
                    }}
                    className="w-full cursor-pointer rounded-xl border border-white/10 bg-slate-950 p-3 outline-none focus:border-orange-500/50 [color-scheme:dark]"
                  />
                </label>


                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">
                    Çıkış Tarihi
                  </span>

                  <input
                    type="date"
                    value={checkOut}
                    min={
                      checkIn ||
                      undefined
                    }
                    disabled={
                      !checkIn
                    }
                    onClick={(e) =>
                      e.currentTarget
                        .showPicker?.()
                    }
                    onChange={(e) =>
                      setCheckOut(
                        e.target.value
                      )
                    }
                    className="w-full cursor-pointer rounded-xl border border-white/10 bg-slate-950 p-3 outline-none focus:border-orange-500/50 disabled:cursor-not-allowed disabled:opacity-40 [color-scheme:dark]"
                  />

                  {!checkIn && (
                    <span className="mt-2 block text-xs text-slate-500">
                      Önce giriş tarihini seçin
                    </span>
                  )}
                </label>


                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">
                    Yetişkin Sayısı
                  </span>

                  <input
                    type="number"
                    min="1"
                    value={adults}
                    onChange={(e) =>
                      setAdults(
                        Math.max(
                          1,
                          Number(
                            e.target.value
                          )
                        )
                      )
                    }
                    inputMode="numeric"
                    className="w-full rounded-xl border border-white/10 bg-slate-950 p-3 outline-none focus:border-orange-500/50"
                  />
                </label>


                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">
                    Çocuk Sayısı
                  </span>

                  <input
                    type="number"
                    min="0"
                    value={children}
                    onChange={(e) =>
                      setChildren(
                        Math.max(
                          0,
                          Number(
                            e.target.value
                          )
                        )
                      )
                    }
                    inputMode="numeric"
                    className="w-full rounded-xl border border-white/10 bg-slate-950 p-3 outline-none focus:border-orange-500/50"
                  />
                </label>

              </div>

              <p className="mt-4 font-black text-orange-400">
                {nights} gece ·{" "}
                {nights > 0
                  ? nights + 1
                  : 0}{" "}
                gün
              </p>
            </section>

            <section className="rounded-[28px] border border-white/10 bg-slate-900 p-6">
              <h2 className="text-xl font-black">
                Otel
              </h2>

              <select
                value={selectedHotelId}
                onChange={(e) => {
                  setSelectedHotelId(
                    e.target.value
                  );
                  setSelectedRateId("");
                }}
                className="mt-4 w-full rounded-xl border border-white/10 bg-slate-950 p-3"
              >
                <option value="">
                  Otel seçin
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

              <div className="mt-4 space-y-3">
                {availableRates.map(
                  (rate) => (
                    <button
                      key={rate.id}
                      type="button"
                      onClick={() =>
                        setSelectedRateId(
                          rate.id
                        )
                      }
                      className={`w-full rounded-xl border p-4 text-left ${
                        selectedRateId ===
                        rate.id
                          ? "border-orange-500 bg-orange-500/10"
                          : "border-white/10 bg-slate-950"
                      }`}
                    >
                      <div className="flex justify-between gap-4">
                        <div>
                          <strong>
                            {
                              rate.room_type_name
                            }
                          </strong>

                          <p className="text-sm text-slate-400">
                            {
                              boardLabels[
                                rate.board_type
                              ]
                            }
                          </p>
                        </div>

                        <strong className="text-orange-400">
                          {money(
                            Number(
                              rate.nightly_cost
                            ) * nights
                          )}
                        </strong>
                      </div>
                    </button>
                  )
                )}
              </div>
            </section>

            <section className="rounded-[28px] border border-white/10 bg-slate-900 p-6">
              <h2 className="text-xl font-black">
                Aktiviteler
              </h2>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {activities.map(
                  (activity) => {
                    const selected =
                      selectedActivities.some(
                        (item) =>
                          item.activityId ===
                          activity.id
                      );

                    return (
                      <button
                        key={activity.id}
                        type="button"
                        onClick={() =>
                          toggleActivity(
                            activity
                          )
                        }
                        className={`rounded-xl border p-4 text-left ${
                          selected
                            ? "border-orange-500 bg-orange-500/10"
                            : "border-white/10 bg-slate-950"
                        }`}
                      >
                        <div className="flex justify-between gap-3">
                          <strong>
                            {activity.name}
                          </strong>

                          <strong className="text-orange-400">
                            {money(
                              Number(
                                activity.default_cost
                              )
                            )}
                          </strong>
                        </div>
                      </button>
                    );
                  }
                )}
              </div>
            </section>
          </div>

          <aside className="h-fit rounded-[28px] border border-orange-500/20 bg-slate-900 p-6 xl:sticky xl:top-6">
            <p className="text-xs font-black uppercase tracking-wider text-orange-400">
              CANLI MALİYET
            </p>

            <div className="mt-5 space-y-3">
              <div className="flex justify-between">
                <span>Otel</span>
                <strong>
                  {money(hotelCost)}
                </strong>
              </div>

              <div className="flex justify-between">
                <span>
                  Aktiviteler
                </span>
                <strong>
                  {money(
                    activitiesCost
                  )}
                </strong>
              </div>

              <div className="border-t border-white/10 pt-4">
                <div className="flex justify-between text-lg">
                  <span>
                    Toplam Maliyet
                  </span>
                  <strong>
                    {money(totalCost)}
                  </strong>
                </div>
              </div>
            </div>

            <select
              value={pricingMode}
              onChange={(e) =>
                setPricingMode(
                  e.target.value as PricingMode
                )
              }
              className="mt-6 w-full rounded-xl border border-white/10 bg-slate-950 p-3"
            >
              <option value="target_price">
                Hedef Satış Fiyatı
              </option>

              <option value="markup_percent">
                Maliyete % Ekle
              </option>

              <option value="fixed_profit">
                Sabit Kâr Ekle
              </option>
            </select>

            <input
              value={pricingValue}
              onChange={(e) =>
                setPricingValue(
                  Number(
                    e.target.value
                  )
                )
              }
              type="number"
              min="0"
              step="0.01"
              className="mt-3 w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-xl font-black"
            />

            <div className="mt-6 rounded-xl bg-slate-950 p-4">
              <div className="flex justify-between">
                <span>Satış</span>
                <strong>
                  {money(salePrice)}
                </strong>
              </div>

              <div className="mt-3 flex justify-between">
                <span>
                  Brüt Kâr
                </span>
                <strong className="text-emerald-400">
                  {money(grossProfit)}
                </strong>
              </div>

              <div className="mt-3 flex justify-between">
                <span>
                  Kâr Marjı
                </span>
                <strong>
                  %{margin.toFixed(2)}
                </strong>
              </div>
            </div>

            <button
              disabled={saving}
              className="mt-6 w-full rounded-xl bg-orange-500 p-4 font-black text-black disabled:opacity-50"
            >
              {saving
                ? "Kaydediliyor..."
                : "Teklif Oluştur"}
            </button>
          </aside>
        </form>
      </div>
    </main>
  );
}
