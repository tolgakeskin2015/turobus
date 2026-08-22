"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FaArrowLeft,
  FaBell,
  FaCalendarAlt,
  FaCheckCircle,
  FaExchangeAlt,
  FaFilter,
  FaPlus,
  FaSave,
  FaShoppingCart,
  FaTimesCircle,
} from "react-icons/fa";

import {
  useParams,
} from "next/navigation";

import {
  supabase,
} from "@/lib/supabase";

import {
  getCurrentMembership,
} from "@/lib/current-user";


type Product = {
  id: string;
  departure_id: string | null;
  product_type: string;
  title: string;
  destination: string | null;
  source_system: string;
  source_reference: string | null;
  cost_price: number;
  sale_price: number;
  currency: string;
  capacity: number | null;
  available_quantity: number | null;
  active: boolean;
};


type Reservation = {
  id: string;
  reservation_code: string | null;
  full_name: string;
  departure_id: string | null;
  status: string;
};


type PricePeriod = {
  id: string;
  product_id: string;
  valid_from: string;
  valid_to: string;
  cost_price: number;
  sale_price: number;
  available_quantity: number | null;
};


type Alert = {
  id: string;
  product_id: string;
  target_price: number;
  direction: string;
  last_detected_price: number | null;
  last_triggered_at: string | null;
  active: boolean;
};


type AlertEvent = {
  id: string;
  product_id: string;
  detected_price: number;
  target_price: number;
  source: string;
  acknowledged_at: string | null;
  created_at: string;
};


type ReservationItem = {
  id: string;
  reservation_id: string;
  product_type: string;
  product_title: string;
  quantity: number;
  total_sale_price: number;
  gross_profit: number;
  status: string;
};


function money(
  value:
    number
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


export default function CommercialProductCenter() {

  const params =
    useParams<{
      id: string;
    }>();


  const tourId =
    String(
      params.id
    );


  const [
    companyId,
    setCompanyId,
  ] =
    useState("");


  const [
    products,
    setProducts,
  ] =
    useState<Product[]>(
      []
    );


  const [
    reservations,
    setReservations,
  ] =
    useState<Reservation[]>(
      []
    );


  const [
    periods,
    setPeriods,
  ] =
    useState<PricePeriod[]>(
      []
    );


  const [
    alerts,
    setAlerts,
  ] =
    useState<Alert[]>(
      []
    );


  const [
    alertEvents,
    setAlertEvents,
  ] =
    useState<AlertEvent[]>(
      []
    );


  const [
    reservationItems,
    setReservationItems,
  ] =
    useState<ReservationItem[]>(
      []
    );


  const [
    query,
    setQuery,
  ] =
    useState("");


  const [
    typeFilter,
    setTypeFilter,
  ] =
    useState("all");


  const [
    destinationFilter,
    setDestinationFilter,
  ] =
    useState("");


  const [
    minPrice,
    setMinPrice,
  ] =
    useState("");


  const [
    maxPrice,
    setMaxPrice,
  ] =
    useState("");


  const [
    availabilityOnly,
    setAvailabilityOnly,
  ] =
    useState(false);


  const [
    filterName,
    setFilterName,
  ] =
    useState(
      "Favori Ürün Filtrem"
    );


  const [
    productType,
    setProductType,
  ] =
    useState(
      "hotel"
    );


  const [
    productTitle,
    setProductTitle,
  ] =
    useState("");


  const [
    destination,
    setDestination,
  ] =
    useState("");


  const [
    costPrice,
    setCostPrice,
  ] =
    useState("0");


  const [
    salePrice,
    setSalePrice,
  ] =
    useState("0");


  const [
    capacity,
    setCapacity,
  ] =
    useState("");


  const [
    selectedProduct,
    setSelectedProduct,
  ] =
    useState("");


  const [
    priceFrom,
    setPriceFrom,
  ] =
    useState("");


  const [
    priceTo,
    setPriceTo,
  ] =
    useState("");


  const [
    periodCost,
    setPeriodCost,
  ] =
    useState("0");


  const [
    periodSale,
    setPeriodSale,
  ] =
    useState("0");


  const [
    targetPrice,
    setTargetPrice,
  ] =
    useState("");


  const [
    compareIds,
    setCompareIds,
  ] =
    useState<string[]>(
      []
    );


  const [
    selectedReservation,
    setSelectedReservation,
  ] =
    useState("");


  const [
    quantity,
    setQuantity,
  ] =
    useState("1");


  const [
    serviceDate,
    setServiceDate,
  ] =
    useState("");


  const [
    loading,
    setLoading,
  ] =
    useState(true);


  const [
    busy,
    setBusy,
  ] =
    useState(false);


  const [
    error,
    setError,
  ] =
    useState("");


  const [
    notice,
    setNotice,
  ] =
    useState("");


  const load =
    useCallback(
      async (
        currentCompanyId:
          string
      ) => {

        const [
          productResult,
          reservationResult,
          periodResult,
          alertResult,
          alertEventResult,
          reservationItemResult,
        ] =
          await Promise.all([

            supabase
              .from(
                "tour_product_catalog"
              )
              .select(
                "id,departure_id,product_type,title,destination,source_system,source_reference,cost_price,sale_price,currency,capacity,available_quantity,active"
              )
              .eq(
                "company_id",
                currentCompanyId
              )
              .eq(
                "tour_id",
                tourId
              )
              .order(
                "created_at",
                {
                  ascending:
                    false,
                }
              ),

            supabase
              .from(
                "reservations"
              )
              .select(
                "id,reservation_code,full_name,departure_id,status"
              )
              .eq(
                "company_id",
                currentCompanyId
              )
              .eq(
                "tour_id",
                tourId
              )
              .neq(
                "status",
                "cancelled"
              ),

            supabase
              .from(
                "tour_product_price_periods"
              )
              .select(
                "id,product_id,valid_from,valid_to,cost_price,sale_price,available_quantity"
              )
              .eq(
                "company_id",
                currentCompanyId
              )
              .order(
                "valid_from",
                {
                  ascending:
                    true,
                }
              ),

            supabase
              .from(
                "tour_product_price_alerts"
              )
              .select(
                "id,product_id,target_price,direction,last_detected_price,last_triggered_at,active"
              )
              .eq(
                "company_id",
                currentCompanyId
              )
              .eq(
                "tour_id",
                tourId
              )
              .order(
                "created_at",
                {
                  ascending:
                    false,
                }
              ),

            supabase
              .from(
                "tour_product_price_alert_events"
              )
              .select(
                "id,product_id,detected_price,target_price,source,acknowledged_at,created_at"
              )
              .eq(
                "company_id",
                currentCompanyId
              )
              .is(
                "acknowledged_at",
                null
              )
              .order(
                "created_at",
                {
                  ascending:
                    false,
                }
              )
              .limit(50),

            supabase
              .from(
                "tour_reservation_product_items"
              )
              .select(
                "id,reservation_id,product_type,product_title,quantity,total_sale_price,gross_profit,status"
              )
              .eq(
                "company_id",
                currentCompanyId
              )
              .eq(
                "tour_id",
                tourId
              )
              .order(
                "created_at",
                {
                  ascending:
                    false,
                }
              )
              .limit(100),
          ]);


        const firstError =
          [
            productResult.error,
            reservationResult.error,
            periodResult.error,
            alertResult.error,
            alertEventResult.error,
            reservationItemResult.error,
          ].find(Boolean);


        if (
          firstError
        ) {
          throw firstError;
        }


        setProducts(
          (
            productResult.data ??
            []
          ) as unknown as
            Product[]
        );


        setReservations(
          (
            reservationResult.data ??
            []
          ) as unknown as
            Reservation[]
        );


        const productIds =
          new Set(
            (
              productResult.data ??
              []
            ).map(
              item =>
                String(
                  item.id
                )
            )
          );


        setPeriods(
          (
            periodResult.data ??
            []
          )
            .filter(
              item =>
                productIds.has(
                  String(
                    item.product_id
                  )
                )
            ) as unknown as
            PricePeriod[]
        );


        setAlerts(
          (
            alertResult.data ??
            []
          ) as unknown as
            Alert[]
        );


        setAlertEvents(
          (
            alertEventResult.data ??
            []
          )
            .filter(
              item =>
                productIds.has(
                  String(
                    item.product_id
                  )
                )
            ) as unknown as
            AlertEvent[]
        );


        setReservationItems(
          (
            reservationItemResult.data ??
            []
          ) as unknown as
            ReservationItem[]
        );

      },
      [
        tourId,
      ]
    );


  useEffect(() => {

    void (
      async () => {

        try {

          const {
            data:
              authData,
          } =
            await supabase
              .auth
              .getUser();


          if (
            !authData.user
          ) {
            throw new Error(
              "Oturum bulunamadı."
            );
          }


          const membership =
            await getCurrentMembership(
              authData.user.id
            );


          if (
            !membership
          ) {
            throw new Error(
              "Firma üyeliği bulunamadı."
            );
          }


          setCompanyId(
            membership.company_id
          );


          await load(
            membership.company_id
          );

        } catch (
          currentError
        ) {

          setError(
            currentError instanceof
              Error
              ? currentError.message
              : String(
                  currentError
                )
          );

        } finally {

          setLoading(false);
        }

      }
    )();

  }, [
    load,
  ]);


  const productMap =
    useMemo(
      () =>
        new Map(
          products.map(
            product => [
              product.id,
              product,
            ]
          )
        ),
      [
        products,
      ]
    );


  const filteredProducts =
    useMemo(
      () =>
        products.filter(
          product => {

            if (
              typeFilter !==
                "all"
              &&
              product.product_type !==
                typeFilter
            ) {
              return false;
            }


            const q =
              query
                .trim()
                .toLocaleLowerCase(
                  "tr-TR"
                );


            if (
              q
              &&
              !(
                product.title
                  .toLocaleLowerCase(
                    "tr-TR"
                  )
                  .includes(q)
                ||
                (
                  product.destination ??
                  ""
                )
                  .toLocaleLowerCase(
                    "tr-TR"
                  )
                  .includes(q)
              )
            ) {
              return false;
            }


            if (
              destinationFilter.trim()
              &&
              !(
                product.destination ??
                ""
              )
                .toLocaleLowerCase(
                  "tr-TR"
                )
                .includes(
                  destinationFilter
                    .trim()
                    .toLocaleLowerCase(
                      "tr-TR"
                    )
                )
            ) {
              return false;
            }


            if (
              minPrice
              &&
              Number(
                product.sale_price
              ) <
                Number(
                  minPrice
                )
            ) {
              return false;
            }


            if (
              maxPrice
              &&
              Number(
                product.sale_price
              ) >
                Number(
                  maxPrice
                )
            ) {
              return false;
            }


            if (
              availabilityOnly
              &&
              product.available_quantity !==
                null
              &&
              Number(
                product.available_quantity
              ) <=
                0
            ) {
              return false;
            }


            return true;
          }
        ),
      [
        products,
        query,
        typeFilter,
        destinationFilter,
        minPrice,
        maxPrice,
        availabilityOnly,
      ]
    );


  const comparedProducts =
    compareIds
      .map(
        id =>
          productMap.get(
            id
          )
      )
      .filter(
        Boolean
      ) as Product[];


  const commercialRevenue =
    reservationItems
      .filter(
        item =>
          item.status !==
            "cancelled"
      )
      .reduce(
        (
          total,
          item
        ) =>
          total +
          Number(
            item.total_sale_price ||
            0
          ),
        0
      );


  const commercialProfit =
    reservationItems
      .filter(
        item =>
          item.status !==
            "cancelled"
      )
      .reduce(
        (
          total,
          item
        ) =>
          total +
          Number(
            item.gross_profit ||
            0
          ),
        0
      );


  async function run(
    fn:
      string,
    args:
      Record<
        string,
        unknown
      >,
    success:
      string
  ) {

    if (
      !companyId
    ) {
      return;
    }


    setBusy(true);
    setError("");
    setNotice("");


    try {

      const {
        error:
          rpcError,
      } =
        await supabase.rpc(
          fn,
          args
        );


      if (
        rpcError
      ) {
        throw rpcError;
      }


      await load(
        companyId
      );


      setNotice(
        success
      );

    } catch (
      currentError
    ) {

      setError(
        currentError instanceof
          Error
          ? currentError.message
          : String(
              currentError
            )
      );

    } finally {

      setBusy(false);
    }
  }


  function toggleCompare(
    productId:
      string
  ) {

    setCompareIds(
      current => {

        if (
          current.includes(
            productId
          )
        ) {
          return current.filter(
            id =>
              id !==
              productId
          );
        }


        if (
          current.length >=
            4
        ) {
          return current;
        }


        return [
          ...current,
          productId,
        ];
      }
    );
  }


  if (
    loading
  ) {

    return (
      <main className="grid min-h-[70vh] place-items-center bg-[#030a11] text-white">
        Ticari ürün merkezi yükleniyor...
      </main>
    );
  }


  return (
    <main
      data-tour-os-screen="commercial-products"
      className="min-h-screen bg-[#030a11] text-white"
    >

      <div className="mx-auto max-w-[1800px] px-5 py-7 lg:px-8">

        <Link
          href={`/dashboard/turlar/${tourId}`}
          className="inline-flex items-center gap-2 text-[9px] font-black text-slate-500"
        >
          <FaArrowLeft />
          Tur Operasyon Merkezi
        </Link>


        <section className="mt-4 rounded-[30px] border border-orange-500/15 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,.13),transparent_35%),linear-gradient(145deg,#07131f,#03080e)] p-6 lg:p-8">

          <div className="text-[8px] font-black tracking-[.16em] text-orange-300">
            AŞAMA 22–29
          </div>

          <h1 className="mt-2 text-3xl font-black">
            Ticari Ürün & Fiyat Merkezi
          </h1>

          <p className="mt-3 max-w-4xl text-[9px] leading-5 text-slate-400">
            Akıllı filtre, fiyat alarmı, fiyat takvimi, karşılaştırma ve transfer / otel / aktivite / tur / araç kiralama ürünlerini tek ticari katmanda yönetir.
          </p>

        </section>


        {error && (

          <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/[.05] px-4 py-3 text-[9px] text-red-300">
            <FaTimesCircle className="mr-2 inline" />
            {error}
          </div>
        )}


        {notice && (

          <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/[.05] px-4 py-3 text-[9px] text-emerald-300">
            <FaCheckCircle className="mr-2 inline" />
            {notice}
          </div>
        )}


        <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">

          {[
            [
              "Ürün",
              String(
                products.length
              ),
            ],
            [
              "Fiyat Dönemi",
              String(
                periods.length
              ),
            ],
            [
              "Aktif Alarm",
              String(
                alerts.filter(
                  item =>
                    item.active
                ).length
              ),
            ],
            [
              "Ürün Satırı",
              String(
                reservationItems.length
              ),
            ],
            [
              "Ticari Kâr",
              money(
                commercialProfit
              ),
            ],
          ].map(
            item => (

              <article
                key={
                  item[0]
                }
                className="rounded-[22px] border border-white/10 bg-[#07131f] p-5"
              >
                <div className="text-[7px] font-black text-slate-500">
                  {item[0]}
                </div>

                <div className="mt-3 text-2xl font-black">
                  {item[1]}
                </div>
              </article>
            )
          )}

        </section>


        <section className="mt-5 rounded-[24px] border border-white/10 bg-[#07131f] p-5">

          <div className="flex items-center gap-2 text-sm font-black">
            <FaFilter className="text-orange-300" />
            Akıllı Filtre
          </div>


          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">

            <input
              value={
                query
              }
              onChange={
                event =>
                  setQuery(
                    event.target.value
                  )
              }
              placeholder="Ürün ara..."
              className="min-h-11 rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px]"
            />


            <select
              value={
                typeFilter
              }
              onChange={
                event =>
                  setTypeFilter(
                    event.target.value
                  )
              }
              className="min-h-11 rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px]"
            >
              <option value="all">
                Tüm Ürünler
              </option>
              <option value="transfer">
                Transfer
              </option>
              <option value="hotel">
                Otel
              </option>
              <option value="activity">
                Aktivite
              </option>
              <option value="tour">
                Tur
              </option>
              <option value="car_rental">
                Araç Kiralama
              </option>
            </select>


            <input
              value={
                destinationFilter
              }
              onChange={
                event =>
                  setDestinationFilter(
                    event.target.value
                  )
              }
              placeholder="Destinasyon"
              className="min-h-11 rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px]"
            />


            <input
              type="number"
              min="0"
              value={
                minPrice
              }
              onChange={
                event =>
                  setMinPrice(
                    event.target.value
                  )
              }
              placeholder="Min fiyat"
              className="min-h-11 rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px]"
            />


            <input
              type="number"
              min="0"
              value={
                maxPrice
              }
              onChange={
                event =>
                  setMaxPrice(
                    event.target.value
                  )
              }
              placeholder="Max fiyat"
              className="min-h-11 rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px]"
            />


            <label className="flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-[#030a11] px-3 text-[8px]">
              <input
                type="checkbox"
                checked={
                  availabilityOnly
                }
                onChange={
                  event =>
                    setAvailabilityOnly(
                      event.target.checked
                    )
                }
              />
              Sadece müsait
            </label>

          </div>


          <div className="mt-3 flex flex-col gap-3 sm:flex-row">

            <input
              value={
                filterName
              }
              onChange={
                event =>
                  setFilterName(
                    event.target.value
                  )
              }
              className="min-h-11 flex-1 rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px]"
            />


            <button
              disabled={
                busy
              }
              onClick={
                () =>
                  void run(
                    "save_tour_product_filter",
                    {
                      p_tour_id:
                        tourId,

                      p_name:
                        filterName,

                      p_product_types:
                        typeFilter ===
                          "all"
                          ? []
                          : [
                              typeFilter,
                            ],

                      p_destination:
                        destinationFilter ||
                        null,

                      p_min_price:
                        minPrice
                          ? Number(
                              minPrice
                            )
                          : null,

                      p_max_price:
                        maxPrice
                          ? Number(
                              maxPrice
                            )
                          : null,

                      p_min_margin_percent:
                        null,

                      p_availability_only:
                        availabilityOnly,
                    },
                    "Akıllı filtre kaydedildi."
                  )
              }
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-700 px-4 text-[8px] font-black"
            >
              <FaSave />
              Filtreyi Kaydet
            </button>

          </div>

        </section>


        <section className="mt-5 grid gap-5 xl:grid-cols-[430px_minmax(0,1fr)]">

          <article className="rounded-[24px] border border-white/10 bg-[#07131f] p-5">

            <div className="flex items-center gap-2 text-sm font-black">
              <FaPlus className="text-orange-300" />
              Ürün Ekle
            </div>


            <select
              value={
                productType
              }
              onChange={
                event =>
                  setProductType(
                    event.target.value
                  )
              }
              className="mt-4 min-h-11 w-full rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px]"
            >
              <option value="transfer">
                Transfer
              </option>
              <option value="hotel">
                Otel
              </option>
              <option value="activity">
                Aktivite
              </option>
              <option value="tour">
                Tur
              </option>
              <option value="car_rental">
                Araç Kiralama
              </option>
            </select>


            <input
              value={
                productTitle
              }
              onChange={
                event =>
                  setProductTitle(
                    event.target.value
                  )
              }
              placeholder="Ürün adı"
              className="mt-3 min-h-11 w-full rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px]"
            />


            <input
              value={
                destination
              }
              onChange={
                event =>
                  setDestination(
                    event.target.value
                  )
              }
              placeholder="Destinasyon"
              className="mt-3 min-h-11 w-full rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px]"
            />


            <div className="mt-3 grid grid-cols-2 gap-3">

              <input
                type="number"
                min="0"
                value={
                  costPrice
                }
                onChange={
                  event =>
                    setCostPrice(
                      event.target.value
                    )
                }
                placeholder="Maliyet"
                className="min-h-11 rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px]"
              />


              <input
                type="number"
                min="0"
                value={
                  salePrice
                }
                onChange={
                  event =>
                    setSalePrice(
                      event.target.value
                    )
                }
                placeholder="Satış"
                className="min-h-11 rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px]"
              />

            </div>


            <input
              type="number"
              min="0"
              value={
                capacity
              }
              onChange={
                event =>
                  setCapacity(
                    event.target.value
                  )
              }
              placeholder="Kontenjan"
              className="mt-3 min-h-11 w-full rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px]"
            />


            <button
              disabled={
                busy ||
                !productTitle.trim()
              }
              onClick={
                () =>
                  void run(
                    "create_tour_commercial_product",
                    {
                      p_tour_id:
                        tourId,

                      p_departure_id:
                        null,

                      p_product_type:
                        productType,

                      p_title:
                        productTitle,

                      p_destination:
                        destination ||
                        null,

                      p_cost_price:
                        Number(
                          costPrice
                        ) ||
                        0,

                      p_sale_price:
                        Number(
                          salePrice
                        ) ||
                        0,

                      p_currency:
                        "TRY",

                      p_capacity:
                        capacity
                          ? Number(
                              capacity
                            )
                          : null,

                      p_source_system:
                        "manual",

                      p_source_reference:
                        null,
                    },
                    "Ticari ürün oluşturuldu."
                  )
              }
              className="mt-3 min-h-11 w-full rounded-xl bg-orange-500 px-4 text-[8px] font-black"
            >
              Ürünü Kaydet
            </button>

          </article>


          <div className="overflow-x-auto rounded-[22px] border border-white/10">

            <table className="min-w-[1050px] text-left">

              <thead className="bg-[#07131f] text-[7px] font-black uppercase text-slate-500">

                <tr>
                  <th className="px-4 py-3">
                    Karşılaştır
                  </th>
                  <th className="px-4 py-3">
                    Ürün
                  </th>
                  <th className="px-4 py-3">
                    Tür
                  </th>
                  <th className="px-4 py-3">
                    Destinasyon
                  </th>
                  <th className="px-4 py-3 text-right">
                    Maliyet
                  </th>
                  <th className="px-4 py-3 text-right">
                    Satış
                  </th>
                  <th className="px-4 py-3 text-right">
                    Kâr
                  </th>
                  <th className="px-4 py-3">
                    Kaynak
                  </th>
                </tr>

              </thead>

              <tbody>

                {filteredProducts.map(
                  product => {

                    const profit =
                      Number(
                        product.sale_price
                      )
                      -
                      Number(
                        product.cost_price
                      );


                    return (

                      <tr
                        key={
                          product.id
                        }
                        className="border-t border-white/[.06] text-[8px]"
                      >

                        <td className="px-4 py-4">

                          <input
                            type="checkbox"
                            checked={
                              compareIds.includes(
                                product.id
                              )
                            }
                            onChange={
                              () =>
                                toggleCompare(
                                  product.id
                                )
                            }
                          />

                        </td>


                        <td className="px-4 py-4 font-black">
                          {product.title}
                        </td>


                        <td className="px-4 py-4">
                          {product.product_type}
                        </td>


                        <td className="px-4 py-4">
                          {product.destination ||
                            "—"}
                        </td>


                        <td className="px-4 py-4 text-right">
                          {money(
                            product.cost_price
                          )}
                        </td>


                        <td className="px-4 py-4 text-right font-black">
                          {money(
                            product.sale_price
                          )}
                        </td>


                        <td className="px-4 py-4 text-right text-emerald-300">
                          {money(
                            profit
                          )}
                        </td>


                        <td className="px-4 py-4 text-slate-500">
                          {product.source_system}
                        </td>

                      </tr>
                    );
                  }
                )}

              </tbody>

            </table>

          </div>

        </section>


        <section className="mt-5 grid gap-5 xl:grid-cols-3">

          <article className="rounded-[24px] border border-white/10 bg-[#07131f] p-5">

            <div className="flex items-center gap-2 text-sm font-black">
              <FaCalendarAlt className="text-blue-300" />
              Fiyat Takvimi
            </div>


            <select
              value={
                selectedProduct
              }
              onChange={
                event =>
                  setSelectedProduct(
                    event.target.value
                  )
              }
              className="mt-4 min-h-11 w-full rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px]"
            >
              <option value="">
                Ürün seç
              </option>

              {products.map(
                product => (

                  <option
                    key={
                      product.id
                    }
                    value={
                      product.id
                    }
                  >
                    {product.title}
                  </option>
                )
              )}
            </select>


            <div className="mt-3 grid grid-cols-2 gap-3">

              <input
                type="date"
                value={
                  priceFrom
                }
                onChange={
                  event =>
                    setPriceFrom(
                      event.target.value
                    )
                }
                className="min-h-11 rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px]"
              />


              <input
                type="date"
                value={
                  priceTo
                }
                onChange={
                  event =>
                    setPriceTo(
                      event.target.value
                    )
                }
                className="min-h-11 rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px]"
              />

            </div>


            <div className="mt-3 grid grid-cols-2 gap-3">

              <input
                type="number"
                min="0"
                value={
                  periodCost
                }
                onChange={
                  event =>
                    setPeriodCost(
                      event.target.value
                    )
                }
                placeholder="Maliyet"
                className="min-h-11 rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px]"
              />


              <input
                type="number"
                min="0"
                value={
                  periodSale
                }
                onChange={
                  event =>
                    setPeriodSale(
                      event.target.value
                    )
                }
                placeholder="Satış"
                className="min-h-11 rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px]"
              />

            </div>


            <button
              disabled={
                busy ||
                !selectedProduct ||
                !priceFrom ||
                !priceTo
              }
              onClick={
                () =>
                  void run(
                    "set_tour_product_price_period",
                    {
                      p_product_id:
                        selectedProduct,

                      p_valid_from:
                        priceFrom,

                      p_valid_to:
                        priceTo,

                      p_cost_price:
                        Number(
                          periodCost
                        ) ||
                        0,

                      p_sale_price:
                        Number(
                          periodSale
                        ) ||
                        0,

                      p_available_quantity:
                        null,

                      p_note:
                        "Tour OS fiyat takvimi",
                    },
                    "Fiyat dönemi kaydedildi."
                  )
              }
              className="mt-3 min-h-11 w-full rounded-xl bg-blue-500 px-4 text-[8px] font-black"
            >
              Fiyat Dönemi Kaydet
            </button>

          </article>


          <article className="rounded-[24px] border border-white/10 bg-[#07131f] p-5">

            <div className="flex items-center gap-2 text-sm font-black">
              <FaBell className="text-amber-300" />
              Fiyat Alarmı
            </div>


            <select
              value={
                selectedProduct
              }
              onChange={
                event =>
                  setSelectedProduct(
                    event.target.value
                  )
              }
              className="mt-4 min-h-11 w-full rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px]"
            >
              <option value="">
                Ürün seç
              </option>

              {products.map(
                product => (

                  <option
                    key={
                      product.id
                    }
                    value={
                      product.id
                    }
                  >
                    {product.title}
                  </option>
                )
              )}
            </select>


            <input
              type="number"
              min="0"
              value={
                targetPrice
              }
              onChange={
                event =>
                  setTargetPrice(
                    event.target.value
                  )
              }
              placeholder="Hedef fiyat"
              className="mt-3 min-h-11 w-full rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px]"
            />


            <button
              disabled={
                busy ||
                !selectedProduct ||
                !targetPrice
              }
              onClick={
                () =>
                  void run(
                    "create_tour_product_price_alert",
                    {
                      p_product_id:
                        selectedProduct,

                      p_target_price:
                        Number(
                          targetPrice
                        ),

                      p_direction:
                        "at_or_below",
                    },
                    "Fiyat alarmı oluşturuldu."
                  )
              }
              className="mt-3 min-h-11 w-full rounded-xl bg-amber-500 px-4 text-[8px] font-black text-black"
            >
              Alarm Oluştur
            </button>


            <div className="mt-4 text-[8px] leading-5 text-slate-500">
              Fiyat ürün veya fiyat takviminde değiştiğinde alarm motoru otomatik değerlendirir. Dış provider bağlı değilse dış fiyat çekildi iddiası yapılmaz.
            </div>

          </article>


          <article className="rounded-[24px] border border-white/10 bg-[#07131f] p-5">

            <div className="flex items-center gap-2 text-sm font-black">
              <FaShoppingCart className="text-emerald-300" />
              Rezervasyona Ürün Ekle
            </div>


            <select
              value={
                selectedReservation
              }
              onChange={
                event =>
                  setSelectedReservation(
                    event.target.value
                  )
              }
              className="mt-4 min-h-11 w-full rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px]"
            >
              <option value="">
                Rezervasyon seç
              </option>

              {reservations.map(
                reservation => (

                  <option
                    key={
                      reservation.id
                    }
                    value={
                      reservation.id
                    }
                  >
                    {reservation.reservation_code ||
                      reservation.id.slice(
                        0,
                        8
                      )}
                    {" · "}
                    {reservation.full_name}
                  </option>
                )
              )}
            </select>


            <select
              value={
                selectedProduct
              }
              onChange={
                event =>
                  setSelectedProduct(
                    event.target.value
                  )
              }
              className="mt-3 min-h-11 w-full rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px]"
            >
              <option value="">
                Ürün seç
              </option>

              {products.map(
                product => (

                  <option
                    key={
                      product.id
                    }
                    value={
                      product.id
                    }
                  >
                    {product.title}
                  </option>
                )
              )}
            </select>


            <div className="mt-3 grid grid-cols-2 gap-3">

              <input
                type="number"
                min="0.01"
                step="0.01"
                value={
                  quantity
                }
                onChange={
                  event =>
                    setQuantity(
                      event.target.value
                    )
                }
                className="min-h-11 rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px]"
              />


              <input
                type="date"
                value={
                  serviceDate
                }
                onChange={
                  event =>
                    setServiceDate(
                      event.target.value
                    )
                }
                className="min-h-11 rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px]"
              />

            </div>


            <button
              disabled={
                busy ||
                !selectedReservation ||
                !selectedProduct
              }
              onClick={
                () =>
                  void run(
                    "add_tour_product_to_reservation",
                    {
                      p_reservation_id:
                        selectedReservation,

                      p_product_id:
                        selectedProduct,

                      p_quantity:
                        Number(
                          quantity
                        ) ||
                        1,

                      p_service_date:
                        serviceDate ||
                        null,

                      p_notes:
                        "Tour OS ortak ticari ürün",
                    },
                    "Ürün rezervasyona eklendi."
                  )
              }
              className="mt-3 min-h-11 w-full rounded-xl bg-emerald-500 px-4 text-[8px] font-black text-black"
            >
              Rezervasyona Ekle
            </button>

          </article>

        </section>


        <section className="mt-5 rounded-[24px] border border-violet-500/15 bg-[#07131f] p-5">

          <div className="flex items-center justify-between gap-3">

            <div className="flex items-center gap-2 text-sm font-black">
              <FaExchangeAlt className="text-violet-300" />
              Ürün Karşılaştırma
            </div>


            <button
              disabled={
                busy ||
                compareIds.length <
                  2
              }
              onClick={
                () =>
                  void run(
                    "create_tour_product_comparison",
                    {
                      p_tour_id:
                        tourId,

                      p_name:
                        `Karşılaştırma ${new Date().toLocaleDateString("tr-TR")}`,

                      p_product_ids:
                        compareIds,
                    },
                    "Karşılaştırma kaydedildi."
                  )
              }
              className="rounded-xl bg-violet-500 px-4 py-2 text-[8px] font-black disabled:opacity-40"
            >
              Karşılaştırmayı Kaydet
            </button>

          </div>


          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">

            {comparedProducts.map(
              product => {

                const profit =
                  Number(
                    product.sale_price
                  )
                  -
                  Number(
                    product.cost_price
                  );


                const margin =
                  Number(
                    product.sale_price
                  ) >
                    0
                    ? (
                        profit
                        /
                        Number(
                          product.sale_price
                        )
                      )
                      *
                      100
                    : 0;


                return (

                  <article
                    key={
                      product.id
                    }
                    className="rounded-[20px] border border-violet-500/15 bg-[#030a11]/70 p-4"
                  >

                    <div className="text-[7px] font-black text-violet-300">
                      {product.product_type}
                    </div>

                    <div className="mt-2 text-sm font-black">
                      {product.title}
                    </div>

                    <div className="mt-3 text-xl font-black">
                      {money(
                        product.sale_price
                      )}
                    </div>

                    <div className="mt-2 text-[8px] text-emerald-300">
                      Kâr{" "}
                      {money(
                        profit
                      )}
                    </div>

                    <div className="mt-1 text-[8px] text-slate-500">
                      Marj %
                      {margin.toFixed(
                        1
                      )}
                    </div>

                    <div className="mt-1 text-[8px] text-slate-500">
                      Müsait{" "}
                      {product.available_quantity ??
                        "—"}
                    </div>

                  </article>
                );
              }
            )}

          </div>

        </section>


        {alertEvents.length >
          0 && (

          <section className="mt-5 rounded-[24px] border border-amber-500/20 bg-amber-500/[.04] p-5">

            <div className="text-sm font-black text-amber-200">
              Tetiklenen Fiyat Alarmları
            </div>


            <div className="mt-4 space-y-2">

              {alertEvents.map(
                event => (

                  <div
                    key={
                      event.id
                    }
                    className="flex flex-col gap-3 rounded-xl border border-amber-500/10 bg-[#030a11]/70 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >

                    <div className="text-[8px]">

                      <span className="font-black">
                        {productMap.get(
                          event.product_id
                        )?.title ||
                          "Ürün"}
                      </span>

                      {" · "}

                      <span className="text-amber-300">
                        {money(
                          event.detected_price
                        )}
                      </span>

                      {" / hedef "}

                      {money(
                        event.target_price
                      )}

                    </div>


                    <button
                      disabled={
                        busy
                      }
                      onClick={
                        () =>
                          void run(
                            "acknowledge_tour_product_price_alert_event",
                            {
                              p_event_id:
                                event.id,
                            },
                            "Fiyat alarmı görüldü olarak işaretlendi."
                          )
                      }
                      className="rounded-lg bg-amber-500 px-3 py-2 text-[7px] font-black text-black"
                    >
                      Görüldü
                    </button>

                  </div>
                )
              )}

            </div>

          </section>
        )}


        <section className="mt-5 rounded-[24px] border border-white/10 bg-[#07131f] p-5">

          <div className="text-sm font-black">
            Rezervasyon Ticari Ürün Satırları
          </div>


          <div className="mt-4 overflow-x-auto">

            <table className="min-w-[900px] text-left">

              <thead className="text-[7px] font-black text-slate-500">

                <tr>
                  <th className="px-3 py-2">
                    Ürün
                  </th>
                  <th className="px-3 py-2">
                    Tür
                  </th>
                  <th className="px-3 py-2 text-right">
                    Adet
                  </th>
                  <th className="px-3 py-2 text-right">
                    Satış
                  </th>
                  <th className="px-3 py-2 text-right">
                    Kâr
                  </th>
                  <th className="px-3 py-2">
                    Durum
                  </th>
                </tr>

              </thead>

              <tbody>

                {reservationItems.map(
                  item => (

                    <tr
                      key={
                        item.id
                      }
                      className="border-t border-white/[.06] text-[8px]"
                    >

                      <td className="px-3 py-3 font-black">
                        {item.product_title}
                      </td>

                      <td className="px-3 py-3">
                        {item.product_type}
                      </td>

                      <td className="px-3 py-3 text-right">
                        {item.quantity}
                      </td>

                      <td className="px-3 py-3 text-right">
                        {money(
                          item.total_sale_price
                        )}
                      </td>

                      <td className="px-3 py-3 text-right text-emerald-300">
                        {money(
                          item.gross_profit
                        )}
                      </td>

                      <td className="px-3 py-3">
                        {item.status}
                      </td>

                    </tr>
                  )
                )}

              </tbody>

            </table>

          </div>


          <div className="mt-4 text-[8px] text-slate-500">
            Ticari ürün satırı toplamı:{" "}
            <span className="font-black text-white">
              {money(
                commercialRevenue
              )}
            </span>
            . Bu katman mevcut satış/ödeme ledger'ını sessizce değiştirmez.
          </div>

        </section>

      </div>

    </main>
  );
}
