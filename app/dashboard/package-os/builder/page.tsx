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
};


type SelectedActivity = {
  activityId: string;
  quantity: number;
};


type PriceResult = {
  sale_price: number;
  currency: string;
  nights: number;
  can_view_costs: boolean;
  hotel_cost?: number;
  activity_cost?: number;
  total_cost?: number;
  markup_percent?: number;
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


function money(
  value: number
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
      value ||
      0
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
    new Date(
      `${start}T12:00:00`
    );

  const b =
    new Date(
      `${end}T12:00:00`
    );

  return Math.max(
    0,
    Math.round(
      (
        b.getTime() -
        a.getTime()
      ) /
      86400000
    )
  );
}


export default function PackageBuilderPage() {

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
    customerName,
    setCustomerName,
  ] =
    useState("");


  const [
    customerPhone,
    setCustomerPhone,
  ] =
    useState("");


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
    price,
    setPrice,
  ] =
    useState<
      PriceResult | null
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
    message,
    setMessage,
  ] =
    useState("");


  const [
    errorMessage,
    setErrorMessage,
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


  useEffect(
    () => {

      async function load() {

        setLoading(
          true
        );

        setErrorMessage(
          ""
        );


        const {
          data,
          error,
        } =
          await supabase.rpc(
            "get_package_builder_catalog_secure"
          );


        if (
          error ||
          !data
        ) {

          setErrorMessage(
            error?.message ||
            "Paket kataloğu yüklenemedi."
          );

          setLoading(
            false
          );

          return;
        }


        const catalog =
          data as {
            hotels:
              Hotel[];
            rates:
              Rate[];
            activities:
              Activity[];
          };


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


        setLoading(
          false
        );
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


      async function calculate() {

        setCalculating(
          true
        );


        const {
          data,
          error,
        } =
          await supabase.rpc(
            "calculate_package_builder_price_secure",
            {
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
            }
          );


        if (!active) {
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

          setCalculating(
            false
          );

          return;
        }


        setErrorMessage(
          ""
        );


        setPrice(
          data as PriceResult
        );


        setCalculating(
          false
        );
      }


      void calculate();


      return () => {
        active =
          false;
      };

    },
    [
      selectedRateId,
      checkIn,
      checkOut,
      nights,
      adults,
      children,
      selectedActivities,
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


        const quantity =
          activity.pricing_unit ===
          "per_person"

            ? adults +
              children

            : 1;


        return [
          ...current,
          {
            activityId:
              activity.id,

            quantity:
              Math.max(
                1,
                quantity
              ),
          },
        ];
      }
    );
  }


  async function saveQuote(
    event:
      FormEvent
  ) {

    event.preventDefault();

    setMessage(
      ""
    );

    setErrorMessage(
      ""
    );


    if (
      !customerName.trim() ||
      !selectedHotelId ||
      !selectedRateId ||
      !checkIn ||
      !checkOut
    ) {

      setErrorMessage(
        "Müşteri, tarih, otel ve oda seçimi zorunlu."
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
        "create_package_quote_secure",
        {
          p_customer_name:
            customerName.trim(),

          p_customer_phone:
            customerPhone.trim(),

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
      };


    setMessage(
      `Teklif oluşturuldu: ${result.quote_code} · ${money(
        result.sale_price
      )}`
    );


    setSaving(
      false
    );
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


        {
          errorMessage &&
          (
            <div className="mt-6 rounded-xl bg-red-500/10 p-4 text-red-300">
              {errorMessage}
            </div>
          )
        }


        {
          message &&
          (
            <div className="mt-6 rounded-xl bg-emerald-500/10 p-4 text-emerald-300">
              {message}
            </div>
          )
        }


        <form
          onSubmit={
            saveQuote
          }
          className="mt-8 grid gap-6 xl:grid-cols-[1fr_380px]"
        >

          <div className="space-y-6">

            <section className="rounded-[28px] border border-white/10 bg-slate-900 p-6">

              <h2 className="text-xl font-black">
                Müşteri & Tarih
              </h2>


              <div className="mt-5 grid gap-4 md:grid-cols-2">

                <label>

                  <span className="mb-2 block text-xs font-black uppercase text-slate-400">
                    Müşteri Adı Soyadı
                  </span>

                  <input
                    value={
                      customerName
                    }
                    onChange={
                      e =>
                        setCustomerName(
                          e.target.value
                        )
                    }
                    placeholder="Örn: Ahmet Yılmaz"
                    className="w-full rounded-xl border border-white/10 bg-slate-950 p-3"
                  />

                </label>


                <label>

                  <span className="mb-2 block text-xs font-black uppercase text-slate-400">
                    Telefon
                  </span>

                  <input
                    type="tel"
                    value={
                      customerPhone
                    }
                    onChange={
                      e =>
                        setCustomerPhone(
                          e.target.value
                        )
                    }
                    placeholder="Örn: 0532 123 45 67"
                    className="w-full rounded-xl border border-white/10 bg-slate-950 p-3"
                  />

                </label>


                <label>

                  <span className="mb-2 block text-xs font-black uppercase text-slate-400">
                    Giriş Tarihi
                  </span>

                  <input
                    type="date"
                    value={
                      checkIn
                    }
                    onClick={
                      e =>
                        e.currentTarget
                          .showPicker?.()
                    }
                    onChange={
                      e => {

                        const value =
                          e.target.value;

                        setCheckIn(
                          value
                        );

                        if (
                          checkOut &&
                          checkOut <=
                            value
                        ) {
                          setCheckOut(
                            ""
                          );
                        }
                      }
                    }
                    className="w-full rounded-xl border border-white/10 bg-slate-950 p-3 [color-scheme:dark]"
                  />

                </label>


                <label>

                  <span className="mb-2 block text-xs font-black uppercase text-slate-400">
                    Çıkış Tarihi
                  </span>

                  <input
                    type="date"
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
                    onClick={
                      e =>
                        e.currentTarget
                          .showPicker?.()
                    }
                    onChange={
                      e =>
                        setCheckOut(
                          e.target.value
                        )
                    }
                    className="w-full rounded-xl border border-white/10 bg-slate-950 p-3 disabled:opacity-40 [color-scheme:dark]"
                  />

                </label>


                <label>

                  <span className="mb-2 block text-xs font-black uppercase text-slate-400">
                    Yetişkin
                  </span>

                  <input
                    type="number"
                    min="1"
                    value={
                      adults
                    }
                    onChange={
                      e =>
                        setAdults(
                          Math.max(
                            1,
                            Number(
                              e.target.value
                            )
                          )
                        )
                    }
                    className="w-full rounded-xl border border-white/10 bg-slate-950 p-3"
                  />

                </label>


                <label>

                  <span className="mb-2 block text-xs font-black uppercase text-slate-400">
                    Çocuk
                  </span>

                  <input
                    type="number"
                    min="0"
                    value={
                      children
                    }
                    onChange={
                      e =>
                        setChildren(
                          Math.max(
                            0,
                            Number(
                              e.target.value
                            )
                          )
                        )
                    }
                    className="w-full rounded-xl border border-white/10 bg-slate-950 p-3"
                  />

                </label>

              </div>


              <p className="mt-4 font-black text-orange-400">
                {nights} gece ·{" "}
                {
                  nights > 0
                    ? nights + 1
                    : 0
                }{" "}
                gün
              </p>

            </section>


            <section className="rounded-[28px] border border-white/10 bg-slate-900 p-6">

              <h2 className="text-xl font-black">
                Otel
              </h2>


              <select
                value={
                  selectedHotelId
                }
                onChange={
                  e => {

                    setSelectedHotelId(
                      e.target.value
                    );

                    setSelectedRateId(
                      ""
                    );
                  }
                }
                className="mt-4 w-full rounded-xl border border-white/10 bg-slate-950 p-3"
              >

                <option value="">
                  Otel seçin
                </option>


                {
                  hotels.map(
                    hotel => (

                      <option
                        key={
                          hotel.id
                        }
                        value={
                          hotel.id
                        }
                      >
                        {hotel.name}
                        {
                          hotel.city
                            ? ` · ${hotel.city}`
                            : ""
                        }
                      </option>

                    )
                  )
                }

              </select>


              <div className="mt-4 space-y-3">

                {
                  availableRates.map(
                    rate => (

                      <button
                        key={
                          rate.id
                        }
                        type="button"
                        onClick={
                          () =>
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

                        <strong>
                          {
                            rate.room_type_name
                          }
                        </strong>

                        <p className="mt-1 text-sm text-slate-400">
                          {
                            boardLabels[
                              rate.board_type
                            ] ||
                            rate.board_type
                          }
                        </p>

                        <p className="mt-2 text-xs text-slate-500">
                          Fiyat arka planda otomatik hesaplanır
                        </p>

                      </button>

                    )
                  )
                }

              </div>

            </section>


            <section className="rounded-[28px] border border-white/10 bg-slate-900 p-6">

              <h2 className="text-xl font-black">
                Aktiviteler
              </h2>


              <div className="mt-4 grid gap-3 md:grid-cols-2">

                {
                  activities.map(
                    activity => {

                      const selected =
                        selectedActivities.some(
                          item =>
                            item.activityId ===
                            activity.id
                        );


                      return (

                        <button
                          key={
                            activity.id
                          }
                          type="button"
                          onClick={
                            () =>
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

                          <strong>
                            {
                              activity.name
                            }
                          </strong>

                          <p className="mt-2 text-xs text-slate-500">
                            {
                              selected
                                ? "Pakete eklendi"
                                : "Pakete ekle"
                            }
                          </p>

                        </button>

                      );
                    }
                  )
                }

              </div>

            </section>

          </div>


          <aside className="h-fit rounded-[28px] border border-orange-500/20 bg-slate-900 p-6 xl:sticky xl:top-6">

            <p className="text-xs font-black uppercase tracking-wider text-orange-400">
              PAKET SATIŞ FİYATI
            </p>


            {
              calculating
                ? (
                  <p className="mt-5 text-slate-400">
                    Fiyat hesaplanıyor...
                  </p>
                )
                : (
                  <p className="mt-5 text-4xl font-black">
                    {
                      price
                        ? money(
                            price.sale_price
                          )
                        : "—"
                    }
                  </p>
                )
            }


            <p className="mt-3 text-sm leading-6 text-slate-400">
              Otel, aktivite, kontrat ve şirket fiyatlandırma kuralları arka planda otomatik hesaplanır.
            </p>


            {
              price?.can_view_costs &&
              (
                <div className="mt-5 rounded-xl border border-white/10 bg-slate-950 p-4 text-sm">

                  <p className="font-black text-slate-300">
                    Yönetici Maliyet Özeti
                  </p>

                  <div className="mt-3 flex justify-between">
                    <span>
                      Otel
                    </span>
                    <strong>
                      {
                        money(
                          price.hotel_cost ??
                          0
                        )
                      }
                    </strong>
                  </div>

                  <div className="mt-2 flex justify-between">
                    <span>
                      Aktiviteler
                    </span>
                    <strong>
                      {
                        money(
                          price.activity_cost ??
                          0
                        )
                      }
                    </strong>
                  </div>

                  <div className="mt-2 flex justify-between border-t border-white/10 pt-2">
                    <span>
                      Toplam
                    </span>
                    <strong>
                      {
                        money(
                          price.total_cost ??
                          0
                        )
                      }
                    </strong>
                  </div>

                </div>
              )
            }


            <button
              type="submit"
              disabled={
                saving ||
                !price ||
                price.sale_price <=
                  0
              }
              className="mt-6 w-full rounded-xl bg-orange-500 px-5 py-4 font-black text-white disabled:opacity-40"
            >
              {
                saving
                  ? "Teklif oluşturuluyor..."
                  : "Teklifi Oluştur"
              }
            </button>

          </aside>

        </form>

      </div>

    </main>
  );
}
