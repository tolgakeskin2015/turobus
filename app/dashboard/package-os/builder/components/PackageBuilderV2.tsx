"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import {
  supabase,
} from "@/lib/supabase";

import {
  getCurrentMembership,
} from "@/lib/current-user";

import GuestRoster, {
  createInitialGuests,
  type Guest,
} from "./GuestRoster";

type Hotel = {
  id: string;
  name: string;
  city: string | null;
  district: string | null;
  star_rating: number | null;
  cover_image_url: string | null;
};

type Rate = {
  id: string;
  package_hotel_id: string;
  room_type_name: string;
  board_type: string;
  valid_from: string;
  valid_to: string;
  occupancy_adults: number;
  occupancy_children: number;
  allotment: number | null;
  minimum_stay: number;
  stop_sale: boolean;
  pricing_basis:
    | "per_room"
    | "per_person"
    | "occupancy_factor";
  occupancy_1_factor: number;
  occupancy_2_factor: number;
  occupancy_3_factor: number;
  extra_person_factor: number;
  nightly_cost: number | null;
};

type Activity = {
  id: string;
  name: string;
  pricing_unit:
    | "per_person"
    | "per_couple"
    | "per_vehicle"
    | "per_group"
    | "fixed";
  requires_slot: boolean;
  default_cost:
    number |
    null;
};

type SelectedActivity = {
  activityId: string;
  quantity: number;
};

type Expense = {
  id: string;
  name: string;
  amount: number;
  pricingUnit:
    | "fixed"
    | "per_person"
    | "per_night"
    | "per_person_per_night";
};

type PriceResult = {
  sale_price: number;
  per_person_sale_price: number;
  currency: string;
  nights: number;
  people: number;
  can_view_costs: boolean;

  hotel_pricing_basis?: string;
  hotel_base_nightly_cost?: number;
  hotel_factor?: number;
  hotel_cost?: number;

  activity_cost?: number;
  expense_cost?: number;
  total_cost?: number;

  profit_mode?: string;
  profit_value?: number;
  profit_amount?: number;

  subtotal_before_tax?: number;

  vat_rate?: number;
  vat_amount?: number;

  installment_rate?: number;
  installment_amount?: number;

  activity_lines?: Array<{
    id: string;
    name: string;
    pricing_unit: string;
    unit_cost: number;
    quantity: number;
    total_cost: number;
  }>;

  expense_lines?: Array<{
    name: string;
    pricing_unit: string;
    unit_cost: number;
    quantity: number;
    total_cost: number;
  }>;
};

const boardLabels:
  Record<string, string> = {
    room_only:
      "Sadece Oda",
    breakfast:
      "Kahvaltı Dahil",
    half_board:
      "Yarım Pansiyon",
    full_board:
      "Tam Pansiyon",
    all_inclusive:
      "Her Şey Dahil",
    ultra_all_inclusive:
      "Ultra Her Şey Dahil",
    other:
      "Diğer",
  };

const pricingBasisLabels:
  Record<string, string> = {
    per_room:
      "Oda Başı",
    per_person:
      "Kişi Başı",
    occupancy_factor:
      "Single / Double / Triple Katsayılı",
  };

const activityUnitLabels:
  Record<string, string> = {
    per_person:
      "Kişi Başı",
    per_couple:
      "Çift Başı",
    per_vehicle:
      "Araç Başı",
    per_group:
      "Grup Başı",
    fixed:
      "Sabit",
  };

const expenseUnitLabels:
  Record<string, string> = {
    fixed:
      "Sabit",
    per_person:
      "Kişi Başı",
    per_night:
      "Gece Başı",
    per_person_per_night:
      "Kişi × Gece",
  };

function money(
  value:
    number |
    null |
    undefined
) {
  return new Intl.NumberFormat(
    "tr-TR",
    {
      style:
        "currency",
      currency:
        "TRY",
      maximumFractionDigits:
        0,
    }
  ).format(
    Number(
      value ?? 0
    )
  );
}

function nightsBetween(
  start: string,
  end: string
) {
  if (
    !start ||
    !end
  ) {
    return 0;
  }

  const a =
    Date.UTC(
      Number(
        start.slice(
          0,
          4
        )
      ),
      Number(
        start.slice(
          5,
          7
        )
      ) - 1,
      Number(
        start.slice(
          8,
          10
        )
      )
    );

  const b =
    Date.UTC(
      Number(
        end.slice(
          0,
          4
        )
      ),
      Number(
        end.slice(
          5,
          7
        )
      ) - 1,
      Number(
        end.slice(
          8,
          10
        )
      )
    );

  return Math.max(
    0,
    Math.round(
      (
        b -
        a
      ) /
      86400000
    )
  );
}

export default function PackageBuilderV2() {
  const [
    companyId,
    setCompanyId,
  ] =
    useState("");

  const [
    canViewCosts,
    setCanViewCosts,
  ] =
    useState(false);

  const [
    hotels,
    setHotels,
  ] =
    useState<Hotel[]>(
      []
    );

  const [
    rates,
    setRates,
  ] =
    useState<Rate[]>(
      []
    );

  const [
    activities,
    setActivities,
  ] =
    useState<Activity[]>(
      []
    );

  const [
    guests,
    setGuests,
  ] =
    useState<Guest[]>(
      () =>
        createInitialGuests(
          2,
          0
        )
    );

  const [
    checkIn,
    setCheckIn,
  ] =
    useState("");

  const [
    checkOut,
    setCheckOut,
  ] =
    useState("");

  const [
    adults,
    setAdults,
  ] =
    useState(2);

  const [
    children,
    setChildren,
  ] =
    useState(0);

  const [
    selectedHotelId,
    setSelectedHotelId,
  ] =
    useState("");

  const [
    selectedRateId,
    setSelectedRateId,
  ] =
    useState("");

  const [
    selectedActivities,
    setSelectedActivities,
  ] =
    useState<
      SelectedActivity[]
    >([]);

  const [
    expenses,
    setExpenses,
  ] =
    useState<Expense[]>(
      []
    );

  const [
    profitMode,
    setProfitMode,
  ] =
    useState<
      "percent" |
      "fixed"
    >("percent");

  const [
    profitValue,
    setProfitValue,
  ] =
    useState(20);

  const [
    vatRate,
    setVatRate,
  ] =
    useState(0);

  const [
    installmentRate,
    setInstallmentRate,
  ] =
    useState(0);

  const [
    price,
    setPrice,
  ] =
    useState<
      PriceResult |
      null
    >(null);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    calculating,
    setCalculating,
  ] =
    useState(false);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState("");

  const [
    message,
    setMessage,
  ] =
    useState("");

  const nights =
    useMemo(
      () =>
        nightsBetween(
          checkIn,
          checkOut
        ),
      [
        checkIn,
        checkOut,
      ]
    );

  const people =
    Math.max(
      adults +
      children,
      1
    );

  useEffect(
    () => {
      async function load() {
        setLoading(
          true
        );

        setErrorMessage(
          ""
        );

        try {
          const {
            data: {
              user,
            },
          } =
            await supabase
              .auth
              .getUser();

          if (!user) {
            throw new Error(
              "Kullanıcı oturumu bulunamadı."
            );
          }

          const membership =
            await getCurrentMembership(
              user.id
            );

          if (!membership) {
            throw new Error(
              "Aktif şirket üyeliği bulunamadı."
            );
          }

          setCompanyId(
            membership.company_id
          );

          const {
            data,
            error,
          } =
            await supabase.rpc(
              "get_package_builder_catalog_v2",
              {
                p_company_id:
                  membership.company_id,
              }
            );

          if (
            error ||
            !data
          ) {
            throw new Error(
              error?.message ||
              "Paket kataloğu yüklenemedi."
            );
          }

          const catalog =
            data as {
              can_view_costs:
                boolean;

              hotels:
                Hotel[];

              rates:
                Rate[];

              activities:
                Activity[];
            };

          setCanViewCosts(
            Boolean(
              catalog
                .can_view_costs
            )
          );

          setHotels(
            catalog.hotels ??
            []
          );

          setRates(
            catalog.rates ??
            []
          );

          setActivities(
            catalog.activities ??
            []
          );
        } catch (
          caught
        ) {
          console.error(
            caught
          );

          setErrorMessage(
            caught instanceof
            Error
              ? caught.message
              : "Paket motoru yüklenemedi."
          );
        } finally {
          setLoading(
            false
          );
        }
      }

      void load();
    },
    []
  );

  const availableRates =
    useMemo(
      () => {
        if (
          !selectedHotelId ||
          !checkIn ||
          !checkOut ||
          nights < 1
        ) {
          return [];
        }

        return rates.filter(
          rate => {
            if (
              rate.package_hotel_id !==
              selectedHotelId
            ) {
              return false;
            }

            if (
              rate.stop_sale
            ) {
              return false;
            }

            if (
              rate.valid_from >
                checkIn ||
              rate.valid_to <
                checkOut
            ) {
              return false;
            }

            if (
              rate.minimum_stay >
              nights
            ) {
              return false;
            }

            if (
              rate.occupancy_adults <
              adults
            ) {
              return false;
            }

            if (
              rate.occupancy_children <
              children
            ) {
              return false;
            }

            if (
              rate.allotment !==
                null &&
              rate.allotment <=
                0
            ) {
              return false;
            }

            return true;
          }
        );
      },
      [
        rates,
        selectedHotelId,
        checkIn,
        checkOut,
        nights,
        adults,
        children,
      ]
    );

  useEffect(
    () => {
      if (
        selectedRateId &&
        !availableRates.some(
          rate =>
            rate.id ===
            selectedRateId
        )
      ) {
        setSelectedRateId(
          ""
        );
      }
    },
    [
      availableRates,
      selectedRateId,
    ]
  );

  useEffect(
    () => {
      setSelectedActivities(
        current =>
          current.map(
            item => {
              const activity =
                activities.find(
                  candidate =>
                    candidate.id ===
                    item.activityId
                );

              if (!activity) {
                return item;
              }

              let quantity =
                item.quantity;

              if (
                activity.pricing_unit ===
                "per_person"
              ) {
                quantity =
                  people;
              } else if (
                activity.pricing_unit ===
                "per_couple"
              ) {
                quantity =
                  Math.max(
                    1,
                    Math.ceil(
                      people /
                      2
                    )
                  );
              }

              return {
                ...item,
                quantity,
              };
            }
          )
      );
    },
    [
      adults,
      children,
      activities,
      people,
    ]
  );

  useEffect(
    () => {
      if (
        !companyId ||
        !selectedRateId ||
        !checkIn ||
        !checkOut ||
        nights < 1
      ) {
        setPrice(
          null
        );

        return;
      }

      let active =
        true;

      const timer =
        window.setTimeout(
          async () => {
            setCalculating(
              true
            );

            const {
              data,
              error,
            } =
              await supabase.rpc(
                "calculate_package_builder_price_v2",
                {
                  p_company_id:
                    companyId,

                  p_rate_id:
                    selectedRateId,

                  p_check_in:
                    checkIn,

                  p_check_out:
                    checkOut,

                  p_adults:
                    adults,

                  p_children:
                    children,

                  p_activities:
                    selectedActivities,

                  p_expenses:
                    expenses.map(
                      item => ({
                        name:
                          item.name,
                        amount:
                          item.amount,
                        pricingUnit:
                          item.pricingUnit,
                      })
                    ),

                  p_profit_mode:
                    profitMode,

                  p_profit_value:
                    Number(
                      profitValue
                    ) ||
                    0,

                  p_vat_rate:
                    Number(
                      vatRate
                    ) ||
                    0,

                  p_installment_rate:
                    Number(
                      installmentRate
                    ) ||
                    0,
                }
              );

            if (
              !active
            ) {
              return;
            }

            if (
              error ||
              !data
            ) {
              setPrice(
                null
              );

              setErrorMessage(
                error?.message ||
                "Paket fiyatı hesaplanamadı."
              );
            } else {
              setErrorMessage(
                ""
              );

              setPrice(
                data as PriceResult
              );
            }

            setCalculating(
              false
            );
          },
          250
        );

      return () => {
        active =
          false;

        window.clearTimeout(
          timer
        );
      };
    },
    [
      companyId,
      selectedRateId,
      checkIn,
      checkOut,
      nights,
      adults,
      children,
      selectedActivities,
      expenses,
      profitMode,
      profitValue,
      vatRate,
      installmentRate,
    ]
  );

  function toggleActivity(
    activity:
      Activity
  ) {
    setSelectedActivities(
      current => {
        const exists =
          current.some(
            item =>
              item.activityId ===
              activity.id
          );

        if (exists) {
          return current.filter(
            item =>
              item.activityId !==
              activity.id
          );
        }

        let quantity =
          1;

        if (
          activity.pricing_unit ===
          "per_person"
        ) {
          quantity =
            people;
        } else if (
          activity.pricing_unit ===
          "per_couple"
        ) {
          quantity =
            Math.max(
              1,
              Math.ceil(
                people /
                2
              )
            );
        }

        return [
          ...current,
          {
            activityId:
              activity.id,
            quantity,
          },
        ];
      }
    );
  }

  function updateActivityQuantity(
    activityId: string,
    quantity: number
  ) {
    setSelectedActivities(
      current =>
        current.map(
          item =>
            item.activityId ===
            activityId
              ? {
                  ...item,
                  quantity:
                    Math.max(
                      1,
                      quantity ||
                      1
                    ),
                }
              : item
        )
    );
  }

  function addExpense() {
    setExpenses(
      current => [
        ...current,
        {
          id:
            crypto.randomUUID(),
          name:
            "Yeni Gider",
          amount:
            0,
          pricingUnit:
            "fixed",
        },
      ]
    );
  }

  function updateExpense(
    id: string,
    patch:
      Partial<Expense>
  ) {
    setExpenses(
      current =>
        current.map(
          item =>
            item.id ===
            id
              ? {
                  ...item,
                  ...patch,
                }
              : item
        )
    );
  }

  function removeExpense(
    id: string
  ) {
    setExpenses(
      current =>
        current.filter(
          item =>
            item.id !==
            id
        )
    );
  }

  async function saveQuote(
    event:
      FormEvent
  ) {
    event.preventDefault();

    setMessage("");
    setErrorMessage("");

    if (
      !companyId ||
      guests.length !==
        people ||
      !guests[0]?.fullName.trim() ||
      !guests[0]?.phone.trim() ||
      !selectedHotelId ||
      !selectedRateId ||
      !checkIn ||
      !checkOut
    ) {
      setErrorMessage(
        "Misafir bilgileri, tarih, otel ve oda seçimi zorunludur. Misafir sayısı paket kişi sayısıyla aynı olmalıdır."
      );

      return;
    }

    setSaving(
      true
    );

    const {
      data,
      error,
    } =
      await supabase.rpc(
        "create_package_quote_v3",
        {
          p_company_id:
            companyId,

          p_guests:
            guests.map(
              guest => ({
                guestType:
                  guest.guestType,

                fullName:
                  guest.fullName.trim(),

                phone:
                  guest.phone.trim(),

                email:
                  guest.email.trim(),

                address:
                  guest.address.trim(),
              })
            ),

          p_check_in:
            checkIn,

          p_check_out:
            checkOut,

          p_adults:
            adults,

          p_children:
            children,

          p_hotel_id:
            selectedHotelId,

          p_rate_id:
            selectedRateId,

          p_activities:
            selectedActivities,

          p_expenses:
            expenses.map(
              item => ({
                name:
                  item.name,
                amount:
                  item.amount,
                pricingUnit:
                  item.pricingUnit,
              })
            ),

          p_profit_mode:
            profitMode,

          p_profit_value:
            profitValue,

          p_vat_rate:
            vatRate,

          p_installment_rate:
            installmentRate,
        }
      );

    if (
      error ||
      !data
    ) {
      setErrorMessage(
        error?.message ||
        "Teklif oluşturulamadı."
      );

      setSaving(
        false
      );

      return;
    }

    const result =
      data as {
        quote_code:
          string;
        sale_price:
          number;
        per_person_sale_price:
          number;
      };

    setMessage(
      `Teklif oluşturuldu: ${result.quote_code} · Toplam ${money(
        result.sale_price
      )} · Kişi Başı ${money(
        result.per_person_sale_price
      )}`
    );

    setSaving(
      false
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-10 text-white">
        Profesyonel paket motoru yükleniyor...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 p-5 text-white md:p-10">
      <div className="mx-auto max-w-[1500px]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-400">
              TUROBUS PACKAGE OS
            </p>

            <h1 className="mt-2 text-4xl font-black">
              Profesyonel Paket Oluştur
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
              Otel, aktivite, operasyon giderleri, kâr, KDV ve
              ödeme maliyetini tek hesapta yönetin.
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
          <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-300">
            {errorMessage}
          </div>
        )}

        {message && (
          <div className="mt-6 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-300">
            {message}
          </div>
        )}

        <form
          onSubmit={
            saveQuote
          }
          className="mt-8 grid gap-6 xl:grid-cols-[1fr_430px]"
        >
          <div className="space-y-6">
            <Panel
              title="1 · Misafirler & Konaklama"
              description="Rezervasyona dahil olacak tüm misafirlerin iletişim ve konaklama bilgilerini kaydedin."
            >
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <DatePickerField
                  label="Giriş Tarihi"
                  value={
                    checkIn
                  }
                  onChange={
                    value => {
                      setCheckIn(
                        value
                      );

                      if (
                        checkOut &&
                        value >=
                          checkOut
                      ) {
                        setCheckOut(
                          ""
                        );
                      }
                    }
                  }
                />

                <DatePickerField
                  label="Çıkış Tarihi"
                  value={
                    checkOut
                  }
                  min={
                    checkIn ||
                    undefined
                  }
                  disabled={
                    !checkIn
                  }
                  placeholder={
                    checkIn
                      ? "Çıkış tarihini seçin"
                      : "Önce giriş tarihini seçin"
                  }
                  onChange={
                    value =>
                      setCheckOut(
                        value
                      )
                  }
                />

                <div className="rounded-xl border border-white/10 bg-slate-950 p-4">
                  <div className="text-xs text-slate-500">
                    Konaklama
                  </div>

                  <div className="mt-2 text-2xl font-black text-orange-400">
                    {nights} gece
                  </div>
                </div>

                <Field
                  label="Yetişkin Sayısı"
                >
                  <input
                    type="number"
                    min="1"
                    value={
                      adults
                    }
                    onChange={
                      event => {
                        const nextAdults =
                          Math.max(
                            1,
                            Number(
                              event.target.value
                            ) ||
                            1
                          );

                        setAdults(
                          nextAdults
                        );
                      }
                    }
                    className="input"
                  />
                </Field>

                <Field
                  label="Çocuk Sayısı"
                >
                  <input
                    type="number"
                    min="0"
                    value={
                      children
                    }
                    onChange={
                      event => {
                        const nextChildren =
                          Math.max(
                            0,
                            Number(
                              event.target.value
                            ) ||
                            0
                          );

                        setChildren(
                          nextChildren
                        );
                      }
                    }
                    className="input"
                  />
                </Field>

                <div className="rounded-xl border border-white/10 bg-slate-950 p-4">
                  <div className="text-xs text-slate-500">
                    Toplam Misafir
                  </div>

                  <div className="mt-2 text-2xl font-black">
                    {people}
                  </div>
                </div>
              </div>

              <div className="mt-7 border-t border-white/10 pt-7">
                <GuestRoster
                  guests={
                    guests
                  }
                  adults={
                    adults
                  }
                  children={
                    children
                  }
                  onChange={
                    setGuests
                  }
                />
              </div>
            </Panel>


            <Panel
              title="2 · Otel"
              description="Kontrat fiyat modeli otomatik uygulanır: oda başı, kişi başı veya single/double/triple katsayılı."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="Otel"
                >
                  <select
                    value={
                      selectedHotelId
                    }
                    onChange={
                      event => {
                        setSelectedHotelId(
                          event.target.value
                        );

                        setSelectedRateId(
                          ""
                        );
                      }
                    }
                    className="input"
                  >
                    <option value="">
                      Otel seçin
                    </option>

                    {hotels.map(
                      hotel => (
                        <option
                          key={
                            hotel.id
                          }
                          value={
                            hotel.id
                          }
                        >
                          {
                            hotel.name
                          }
                          {
                            hotel.city
                              ? ` · ${hotel.city}`
                              : ""
                          }
                        </option>
                      )
                    )}
                  </select>
                </Field>

                <Field
                  label="Oda / Kontrat Dönemi"
                >
                  <select
                    value={
                      selectedRateId
                    }
                    onChange={
                      event =>
                        setSelectedRateId(
                          event.target.value
                        )
                    }
                    className="input"
                  >
                    <option value="">
                      Oda fiyatı seçin
                    </option>

                    {availableRates.map(
                      rate => (
                        <option
                          key={
                            rate.id
                          }
                          value={
                            rate.id
                          }
                        >
                          {
                            rate.room_type_name
                          }{" "}
                          ·{" "}
                          {
                            boardLabels[
                              rate.board_type
                            ] ||
                            rate.board_type
                          }{" "}
                          ·{" "}
                          {
                            pricingBasisLabels[
                              rate.pricing_basis
                            ]
                          }
                        </option>
                      )
                    )}
                  </select>
                </Field>
              </div>

              {selectedRateId && (
                <RateSummary
                  rate={
                    rates.find(
                      item =>
                        item.id ===
                        selectedRateId
                    )
                  }
                  canViewCosts={
                    canViewCosts
                  }
                  adults={
                    adults
                  }
                />
              )}
            </Panel>

            <Panel
              title="3 · Aktiviteler"
              description="Kişi başı aktivitelerde adet otomatik kişi sayısına göre güncellenir. Diğer tiplerde adet manuel değiştirilebilir."
            >
              <div className="grid gap-3 lg:grid-cols-2">
                {activities.map(
                  activity => {
                    const selected =
                      selectedActivities.find(
                        item =>
                          item.activityId ===
                          activity.id
                      );

                    return (
                      <div
                        key={
                          activity.id
                        }
                        className={`rounded-2xl border p-4 ${
                          selected
                            ? "border-orange-500/40 bg-orange-500/10"
                            : "border-white/10 bg-slate-950"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              toggleActivity(
                                activity
                              )
                            }
                            className="min-w-0 flex-1 text-left"
                          >
                            <div className="font-black">
                              {
                                activity.name
                              }
                            </div>

                            <div className="mt-1 text-xs text-slate-500">
                              {
                                activityUnitLabels[
                                  activity.pricing_unit
                                ] ||
                                activity.pricing_unit
                              }
                            </div>

                            {canViewCosts && (
                              <div className="mt-2 text-sm font-black text-amber-300">
                                Alış:{" "}
                                {money(
                                  activity.default_cost
                                )}
                              </div>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              toggleActivity(
                                activity
                              )
                            }
                            className={`rounded-lg px-3 py-2 text-xs font-black ${
                              selected
                                ? "bg-orange-500 text-white"
                                : "bg-white/5 text-slate-400"
                            }`}
                          >
                            {selected
                              ? "SEÇİLDİ"
                              : "EKLE"}
                          </button>
                        </div>

                        {selected && (
                          <div className="mt-4 flex items-center gap-3">
                            <span className="text-xs text-slate-500">
                              Adet
                            </span>

                            <input
                              type="number"
                              min="1"
                              value={
                                selected.quantity
                              }
                              disabled={
                                activity.pricing_unit ===
                                "per_person"
                              }
                              onChange={
                                event =>
                                  updateActivityQuantity(
                                    activity.id,
                                    Number(
                                      event.target.value
                                    )
                                  )
                              }
                              className="w-24 rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm disabled:opacity-50"
                            />

                            {canViewCosts && (
                              <span className="ml-auto text-sm font-black">
                                {money(
                                  Number(
                                    activity.default_cost ||
                                    0
                                  ) *
                                  selected.quantity
                                )}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  }
                )}
              </div>
            </Panel>

            {canViewCosts && (
              <Panel
                title="4 · Diğer Paket Giderleri"
                description="Transfer, rehber, uçak, araç, yemek, sigorta, oda süsleme, operasyon ve diğer tüm giderleri maliyete ekleyin."
              >
                <div className="space-y-3">
                  {expenses.map(
                    expense => (
                      <div
                        key={
                          expense.id
                        }
                        className="grid gap-3 rounded-2xl border border-white/10 bg-slate-950 p-4 md:grid-cols-[1fr_190px_180px_auto]"
                      >
                        <input
                          value={
                            expense.name
                          }
                          onChange={
                            event =>
                              updateExpense(
                                expense.id,
                                {
                                  name:
                                    event.target.value,
                                }
                              )
                          }
                          className="input"
                          placeholder="Örn: VIP Transfer"
                        />

                        <select
                          value={
                            expense.pricingUnit
                          }
                          onChange={
                            event =>
                              updateExpense(
                                expense.id,
                                {
                                  pricingUnit:
                                    event.target.value as Expense["pricingUnit"],
                                }
                              )
                          }
                          className="input"
                        >
                          {Object.entries(
                            expenseUnitLabels
                          ).map(
                            ([
                              value,
                              label,
                            ]) => (
                              <option
                                key={
                                  value
                                }
                                value={
                                  value
                                }
                              >
                                {
                                  label
                                }
                              </option>
                            )
                          )}
                        </select>

                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={
                            expense.amount
                          }
                          onChange={
                            event =>
                              updateExpense(
                                expense.id,
                                {
                                  amount:
                                    Number(
                                      event.target.value
                                    ) ||
                                    0,
                                }
                              )
                          }
                          className="input"
                          placeholder="Alış maliyeti"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            removeExpense(
                              expense.id
                            )
                          }
                          className="rounded-xl bg-red-500/10 px-4 py-3 text-sm font-black text-red-300"
                        >
                          Sil
                        </button>
                      </div>
                    )
                  )}

                  <button
                    type="button"
                    onClick={
                      addExpense
                    }
                    className="rounded-xl border border-orange-500/30 bg-orange-500/10 px-5 py-3 text-sm font-black text-orange-300"
                  >
                    + Gider Ekle
                  </button>
                </div>
              </Panel>
            )}

            {canViewCosts && (
              <Panel
                title="5 · Satış Fiyatlandırması"
                description="Maliyet üzerine kâr, ardından KDV ve varsa taksit/komisyon maliyeti uygulanır."
              >
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <Field
                    label="Kâr Modeli"
                  >
                    <select
                      value={
                        profitMode
                      }
                      onChange={
                        event =>
                          setProfitMode(
                            event.target.value as
                              | "percent"
                              | "fixed"
                          )
                      }
                      className="input"
                    >
                      <option value="percent">
                        Yüzde Kâr
                      </option>

                      <option value="fixed">
                        Sabit Kâr TL
                      </option>
                    </select>
                  </Field>

                  <Field
                    label={
                      profitMode ===
                      "percent"
                        ? "Kâr Oranı %"
                        : "Kâr Tutarı TL"
                    }
                  >
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        profitValue
                      }
                      onChange={
                        event =>
                          setProfitValue(
                            Number(
                              event.target.value
                            ) ||
                            0
                          )
                      }
                      className="input"
                    />
                  </Field>

                  <Field
                    label="KDV Oranı %"
                  >
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        vatRate
                      }
                      onChange={
                        event =>
                          setVatRate(
                            Number(
                              event.target.value
                            ) ||
                            0
                          )
                      }
                      className="input"
                    />
                  </Field>

                  <Field
                    label="Taksit / Komisyon %"
                  >
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        installmentRate
                      }
                      onChange={
                        event =>
                          setInstallmentRate(
                            Number(
                              event.target.value
                            ) ||
                            0
                          )
                      }
                      className="input"
                    />
                  </Field>
                </div>

                <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs leading-5 text-amber-200">
                  KDV alanı finansal hesaplama aracıdır. Acentenizin
                  vergisel uygulamasına göre kullanılacak oranı muhasebe
                  politikanıza uygun girin.
                </div>
              </Panel>
            )}
          </div>

          <aside className="xl:sticky xl:top-6 xl:h-fit">
            <div className="rounded-[28px] border border-white/10 bg-slate-900 p-6">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-400">
                PAKET SONUCU
              </p>

              <h2 className="mt-2 text-2xl font-black">
                Fiyat Özeti
              </h2>

              {calculating && (
                <div className="mt-4 text-sm text-slate-500">
                  Hesaplanıyor...
                </div>
              )}

              {!price ? (
                <div className="mt-6 rounded-2xl border border-dashed border-white/10 bg-slate-950/60 p-5 text-sm leading-6 text-slate-500">
                  Tarih, otel ve oda seçildiğinde paket fiyatı otomatik hesaplanır.
                </div>
              ) : (
                <div className="mt-6 space-y-3">
                  {price.can_view_costs && (
                    <>
                      <SummaryRow
                        label="Otel Alış"
                        value={
                          price.hotel_cost
                        }
                      />

                      <SummaryRow
                        label="Aktivite Alış"
                        value={
                          price.activity_cost
                        }
                      />

                      <SummaryRow
                        label="Diğer Giderler"
                        value={
                          price.expense_cost
                        }
                      />

                      <div className="border-t border-white/10 pt-3">
                        <SummaryRow
                          label="Toplam Maliyet"
                          value={
                            price.total_cost
                          }
                          strong
                        />
                      </div>

                      <SummaryRow
                        label="Kâr"
                        value={
                          price.profit_amount
                        }
                        accent
                      />

                      <SummaryRow
                        label="KDV Öncesi"
                        value={
                          price.subtotal_before_tax
                        }
                      />

                      <SummaryRow
                        label={`KDV %${price.vat_rate ?? 0}`}
                        value={
                          price.vat_amount
                        }
                      />

                      <SummaryRow
                        label={`Taksit / Komisyon %${price.installment_rate ?? 0}`}
                        value={
                          price.installment_amount
                        }
                      />
                    </>
                  )}

                  <div className="mt-5 rounded-2xl bg-orange-500 p-5">
                    <div className="text-xs font-black uppercase text-orange-100">
                      MİSAFİR PAKET TUTARI
                    </div>

                    <div className="mt-2 text-4xl font-black">
                      {money(
                        price.sale_price
                      )}
                    </div>

                    <div className="mt-4 border-t border-orange-300/40 pt-4">
                      <div className="text-xs font-black uppercase text-orange-100">
                        KİŞİ BAŞI
                      </div>

                      <div className="mt-1 text-2xl font-black">
                        {money(
                          price.per_person_sale_price
                        )}
                      </div>
                    </div>
                  </div>

                  {price.can_view_costs &&
                    price.hotel_pricing_basis ===
                      "occupancy_factor" && (
                      <div className="rounded-xl border border-white/10 bg-slate-950 p-4">
                        <div className="text-xs text-slate-500">
                          Otel Doluluk Katsayısı
                        </div>

                        <div className="mt-2 text-xl font-black text-orange-300">
                          ×{" "}
                          {
                            price.hotel_factor
                          }
                        </div>
                      </div>
                    )}
                </div>
              )}

              <button
                disabled={
                  saving ||
                  !price
                }
                className="mt-6 w-full rounded-xl bg-emerald-500 px-4 py-4 font-black text-white hover:bg-emerald-400 disabled:opacity-40"
              >
                {saving
                  ? "Teklif Kaydediliyor..."
                  : "Teklifi Oluştur"}
              </button>
            </div>
          </aside>
        </form>
      </div>

      <style jsx global>{`
        .input {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgb(2 6 23);
          padding: 0.75rem 1rem;
          outline: none;
        }

        .input:focus {
          border-color: rgba(249,115,22,0.6);
        }

      `}</style>
    </main>
  );
}

function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children:
    React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-slate-900 p-6">
      <h2 className="text-xl font-black">
        {title}
      </h2>

      <p className="mt-2 text-sm leading-6 text-slate-500">
        {description}
      </p>

      <div className="mt-5">
        {children}
      </div>
    </section>
  );
}

function formatPackageDate(
  value: string
) {
  if (!value) {
    return "";
  }

  const [
    year,
    month,
    day,
  ] =
    value
      .split("-")
      .map(Number);

  if (
    !year ||
    !month ||
    !day
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "tr-TR",
    {
      day:
        "2-digit",
      month:
        "long",
      year:
        "numeric",
      weekday:
        "short",
    }
  ).format(
    new Date(
      year,
      month - 1,
      day
    )
  );
}

function DatePickerField({
  label,
  value,
  min,
  disabled = false,
  placeholder = "Tarih seçin",
  onChange,
}: {
  label: string;
  value: string;
  min?: string;
  disabled?: boolean;
  placeholder?: string;
  onChange:
    (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">
        {label}
      </span>

      <div
        className={`relative overflow-hidden rounded-xl border px-4 py-3 transition ${
          disabled
            ? "cursor-not-allowed border-white/5 bg-slate-950/50 opacity-50"
            : "cursor-pointer border-white/10 bg-slate-950 hover:border-orange-500/50"
        }`}
      >
        <div className="pointer-events-none flex min-h-[46px] items-center justify-between gap-4">
          <div>
            <div
              className={`font-black ${
                value
                  ? "text-white"
                  : "text-slate-500"
              }`}
            >
              {value
                ? formatPackageDate(
                    value
                  )
                : placeholder}
            </div>

            {value && (
              <div className="mt-1 text-xs font-bold text-orange-400">
                {value}
              </div>
            )}
          </div>

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-orange-500/20 bg-orange-500/10 text-lg">
            📅
          </div>
        </div>

        <input
          type="date"
          value={
            value
          }
          min={
            min
          }
          disabled={
            disabled
          }
          onChange={
            event =>
              onChange(
                event.target.value
              )
          }
          aria-label={
            label
          }
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
        />
      </div>
    </label>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children:
    React.ReactNode;
}) {
  return (
    <label>
      <span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">
        {label}
      </span>

      {children}
    </label>
  );
}

function SummaryRow({
  label,
  value,
  strong,
  accent,
}: {
  label: string;
  value:
    number |
    null |
    undefined;
  strong?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span
        className={
          strong
            ? "font-black"
            : "text-sm text-slate-400"
        }
      >
        {label}
      </span>

      <span
        className={`font-black ${
          accent
            ? "text-emerald-400"
            : ""
        }`}
      >
        {money(
          value
        )}
      </span>
    </div>
  );
}

function RateSummary({
  rate,
  canViewCosts,
  adults,
}: {
  rate:
    Rate |
    undefined;
  canViewCosts: boolean;
  adults: number;
}) {
  if (!rate) {
    return null;
  }

  let factor =
    1;

  if (
    rate.pricing_basis ===
    "per_person"
  ) {
    factor =
      adults;
  }

  if (
    rate.pricing_basis ===
    "occupancy_factor"
  ) {
    if (
      adults <= 1
    ) {
      factor =
        rate.occupancy_1_factor;
    } else if (
      adults === 2
    ) {
      factor =
        rate.occupancy_2_factor;
    } else if (
      adults === 3
    ) {
      factor =
        rate.occupancy_3_factor;
    } else {
      factor =
        rate.occupancy_3_factor +
        (
          adults -
          3
        ) *
        rate.extra_person_factor;
    }
  }

  return (
    <div className="mt-5 grid gap-3 md:grid-cols-3">
      <div className="rounded-xl border border-white/10 bg-slate-950 p-4">
        <div className="text-xs text-slate-500">
          Fiyatlama
        </div>

        <div className="mt-2 font-black">
          {
            pricingBasisLabels[
              rate.pricing_basis
            ]
          }
        </div>
      </div>

      {canViewCosts && (
        <div className="rounded-xl border border-white/10 bg-slate-950 p-4">
          <div className="text-xs text-slate-500">
            Kontrat Baz Fiyatı
          </div>

          <div className="mt-2 font-black">
            {money(
              rate.nightly_cost
            )}
          </div>
        </div>
      )}

      {rate.pricing_basis ===
        "occupancy_factor" && (
        <div className="rounded-xl border border-orange-500/20 bg-orange-500/10 p-4">
          <div className="text-xs text-orange-200">
            {adults} yetişkin için katsayı
          </div>

          <div className="mt-2 text-xl font-black text-orange-300">
            × {factor}
          </div>
        </div>
      )}
    </div>
  );
}
