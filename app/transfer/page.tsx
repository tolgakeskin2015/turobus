"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import Link from "next/link";

import {
  FaArrowRight,
  FaBaby,
  FaBus,
  FaCar,
  FaCheck,
  FaCheckCircle,
  FaChevronDown,
  FaClock,
  FaFilter,
  FaMapMarkerAlt,
  FaPlane,
  FaRoute,
  FaSearch,
  FaShip,
  FaShieldAlt,
  FaSuitcase,
  FaTimes,
  FaUsers,
} from "react-icons/fa";

import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";

import { supabase } from "@/lib/supabase";


type Transfer = {
  id: string;
  slug: string;
  name: string;

  service_type: string;
  vehicle_type: string;

  origin_city: string;
  origin_name: string;

  destination_city: string;
  destination_name: string;

  max_passengers: number;
  max_luggage: number;

  fleet_count: number;

  base_price: number;
  currency: string;

  estimated_minutes: number | null;
  distance_km: number | null;

  included_waiting_minutes: number;

  cover_url: string | null;

  meet_and_greet: boolean;
  flight_tracking_supported: boolean;

  verified: boolean;
  featured: boolean;

  available_fleet: number;
};


type SortMode =
  | "recommended"
  | "priceAsc"
  | "priceDesc"
  | "capacity";


const serviceTypes = [
  {
    value: "",
    label: "Tüm Transferler",
    icon: FaRoute,
  },
  {
    value: "airport",
    label: "Havalimanı",
    icon: FaPlane,
  },
  {
    value: "intercity",
    label: "Şehirler Arası",
    icon: FaCar,
  },
  {
    value: "marina",
    label: "Marina",
    icon: FaShip,
  },
  {
    value: "hourly",
    label: "Saatlik Şoförlü",
    icon: FaClock,
  },
];


const vehicleTypes = [
  {
    value: "",
    label: "Tüm Araçlar",
  },
  {
    value: "sedan",
    label: "Sedan",
  },
  {
    value: "vip_van",
    label: "VIP Van",
  },
  {
    value: "minivan",
    label: "Minivan",
  },
  {
    value: "sprinter",
    label: "VIP Sprinter",
  },
  {
    value: "minibus",
    label: "Minibüs",
  },
];


const previewTransfers = [
  {
    name: "Dalaman Havalimanı → Fethiye VIP",
    type: "Havalimanı Transferi",
    vehicle: "VIP Van",
    passengers: 6,
    luggage: 6,
    duration: "45 dk",
    price: 2500,
    image:
      "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=1400&q=90",
  },
  {
    name: "Dalaman Havalimanı → Ölüdeniz",
    type: "Havalimanı Transferi",
    vehicle: "VIP Sprinter",
    passengers: 12,
    luggage: 10,
    duration: "60 dk",
    price: 3500,
    image:
      "https://images.unsplash.com/photo-1515569067071-ec3b51335dd0?auto=format&fit=crop&w=1400&q=90",
  },
  {
    name: "Fethiye → Göcek Marina",
    type: "Marina Transferi",
    vehicle: "VIP Van",
    passengers: 6,
    luggage: 6,
    duration: "35 dk",
    price: 2200,
    image:
      "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1400&q=90",
  },
];


const money = (
  value: number,
  currency = "TRY"
) =>
  new Intl.NumberFormat(
    "tr-TR",
    {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }
  ).format(
    Number(
      value || 0
    )
  );


function vehicleLabel(
  type: string
) {
  return (
    vehicleTypes.find(
      (item) =>
        item.value === type
    )?.label ?? type
  );
}


function serviceLabel(
  type: string
) {
  return (
    serviceTypes.find(
      (item) =>
        item.value === type
    )?.label ?? type
  );
}


export default function TransferPage() {

  const resultsRef =
    useRef<HTMLDivElement | null>(
      null
    );


  const [
    transfers,
    setTransfers,
  ] =
    useState<Transfer[]>([]);


  const [
    loading,
    setLoading,
  ] =
    useState(true);


  const [
    error,
    setError,
  ] =
    useState("");


  const [
    mobileFilters,
    setMobileFilters,
  ] =
    useState(false);


  const [
    sort,
    setSort,
  ] =
    useState<SortMode>(
      "recommended"
    );


  const [
    filters,
    setFilters,
  ] =
    useState({
      origin: "",
      destination: "",
      serviceType: "",
      vehicleType: "",
      pickupDate: "",
      pickupTime: "",
      passengers: 2,
      maxPrice: "",
    });


  const pickupAt =
    filters.pickupDate &&
    filters.pickupTime
      ? `${filters.pickupDate}T${filters.pickupTime}:00+03:00`
      : null;


  const load =
    useCallback(
      async (
        next = filters
      ) => {

        setLoading(true);
        setError("");


        const nextPickupAt =
          next.pickupDate &&
          next.pickupTime
            ? `${next.pickupDate}T${next.pickupTime}:00+03:00`
            : null;


        const {
          data,
          error:
            rpcError,
        } =
          await supabase.rpc(
            "get_public_transfer_marketplace",
            {
              p_origin:
                next.origin ||
                null,

              p_destination:
                next.destination ||
                null,

              p_service_type:
                next.serviceType ||
                null,

              p_passengers:
                next.passengers ||
                null,

              p_pickup_at:
                nextPickupAt,
            }
          );


        if (rpcError) {

          setError(
            rpcError.message
          );

          setTransfers([]);

        } else {

          setTransfers(
            (data ??
              []) as Transfer[]
          );

        }


        setLoading(false);

      },
      [
        filters,
      ]
    );


  useEffect(
    () => {

      void load();

      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    []
  );


  const results =
    useMemo(
      () => {

        let rows =
          transfers.filter(
            (
              transfer
            ) => {

              const vehicleMatch =
                !filters.vehicleType ||
                transfer.vehicle_type ===
                  filters.vehicleType;


              const priceMatch =
                !filters.maxPrice ||
                transfer.base_price <=
                  Number(
                    filters.maxPrice
                  );


              return (
                vehicleMatch &&
                priceMatch
              );

            }
          );


        if (
          sort ===
          "priceAsc"
        ) {

          rows =
            [...rows].sort(
              (
                first,
                second
              ) =>
                first.base_price -
                second.base_price
            );

        }


        if (
          sort ===
          "priceDesc"
        ) {

          rows =
            [...rows].sort(
              (
                first,
                second
              ) =>
                second.base_price -
                first.base_price
            );

        }


        if (
          sort ===
          "capacity"
        ) {

          rows =
            [...rows].sort(
              (
                first,
                second
              ) =>
                second.max_passengers -
                first.max_passengers
            );

        }


        if (
          sort ===
          "recommended"
        ) {

          rows =
            [...rows].sort(
              (
                first,
                second
              ) => {

                const firstScore =
                  Number(
                    first.featured
                  ) *
                    10 +
                  Number(
                    first.verified
                  ) *
                    5;


                const secondScore =
                  Number(
                    second.featured
                  ) *
                    10 +
                  Number(
                    second.verified
                  ) *
                    5;


                return (
                  secondScore -
                  firstScore
                );

              }
            );

        }


        return rows;

      },
      [
        transfers,
        filters.vehicleType,
        filters.maxPrice,
        sort,
      ]
    );


  async function searchTransfers() {

    if (
      !filters.pickupDate ||
      !filters.pickupTime
    ) {

      setError(
        "Transfer tarihi ve saatini seçin."
      );

      return;

    }


    await load();


    window.setTimeout(
      () =>
        resultsRef.current?.scrollIntoView({
          behavior:
            "smooth",
          block:
            "start",
        }),
      100
    );

  }


  function clearFilters() {

    const next = {
      origin: "",
      destination: "",
      serviceType: "",
      vehicleType: "",
      pickupDate: "",
      pickupTime: "",
      passengers: 2,
      maxPrice: "",
    };


    setFilters(next);

    setSort(
      "recommended"
    );

    void load(next);

  }


  return (
    <main className="min-h-screen bg-[#06101b] text-white">

      <Navbar />


      {/* HERO */}

      <section className="relative overflow-hidden border-b border-white/10 pt-20">

        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              'url("https://images.unsplash.com/photo-1515569067071-ec3b51335dd0?auto=format&fit=crop&w=2200&q=92")',
          }}
        />


        <div className="absolute inset-0 bg-gradient-to-r from-[#06101b]/98 via-[#06101b]/87 to-[#06101b]/35" />

        <div className="absolute inset-0 bg-gradient-to-t from-[#06101b] via-transparent to-[#06101b]/30" />


        <div className="relative mx-auto max-w-7xl px-5 pb-20 pt-20 lg:px-8 lg:pt-28">

          <div className="grid items-end gap-10 lg:grid-cols-[1fr_.72fr]">

            <div>

              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-black/30 px-3 py-2 text-[10px] font-black uppercase tracking-[.2em] text-emerald-300 backdrop-blur-xl">

                <FaCheckCircle />

                Turobus Transfer Network

              </div>


              <h1 className="mt-6 max-w-4xl text-5xl font-black leading-[.93] tracking-tight md:text-7xl">

                Yolculuğun

                <span className="mt-3 block text-orange-500">
                  Kapıdan Başlasın.
                </span>

              </h1>


              <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300 md:text-lg">

                Havalimanı, marina,
                şehirler arası ve
                şoförlü VIP transferi
                tek profesyonel
                sistemden rezerve et.

              </p>

            </div>


            <div className="hidden lg:block">

              <div className="ml-auto max-w-[420px] rounded-[30px] border border-white/15 bg-black/30 p-6 backdrop-blur-2xl">

                <div className="text-[10px] font-black uppercase tracking-[.18em] text-orange-300">
                  Turobus Transfer
                </div>


                <div className="mt-4 text-3xl font-black">
                  Araç çağırma değil. Transfer operasyonu.
                </div>


                <div className="mt-6 space-y-3">

                  {[
                    "Gerçek araç kapasitesi",
                    "Gidiş & dönüş fiyatlama",
                    "Gece tarifesi",
                    "Bagaj ve çocuk koltuğu",
                  ].map(
                    (
                      item
                    ) => (

                      <div
                        key={item}
                        className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[.04] px-4 py-3 text-xs font-bold"
                      >
                        <FaCheck className="text-emerald-400" />
                        {item}
                      </div>

                    )
                  )}

                </div>

              </div>

            </div>

          </div>


          {/* SEARCH */}

          <div className="mt-10 grid overflow-hidden rounded-[24px] border border-white/15 bg-[#081522]/95 shadow-2xl shadow-black/60 backdrop-blur-2xl lg:grid-cols-[1fr_1fr_.8fr_.7fr_auto]">

            <label className="border-b border-white/10 p-5 lg:border-b-0 lg:border-r">

              <span className="mb-2 flex items-center gap-2 text-[9px] font-black uppercase tracking-[.12em] text-slate-500">
                <FaMapMarkerAlt />
                Nereden?
              </span>


              <input
                value={
                  filters.origin
                }
                onChange={(event) =>
                  setFilters({
                    ...filters,
                    origin:
                      event.target.value,
                  })
                }
                placeholder="Dalaman Havalimanı"
                className="w-full bg-transparent text-sm font-black outline-none placeholder:text-slate-600"
              />

            </label>


            <label className="border-b border-white/10 p-5 lg:border-b-0 lg:border-r">

              <span className="mb-2 flex items-center gap-2 text-[9px] font-black uppercase tracking-[.12em] text-slate-500">
                <FaRoute />
                Nereye?
              </span>


              <input
                value={
                  filters.destination
                }
                onChange={(event) =>
                  setFilters({
                    ...filters,
                    destination:
                      event.target.value,
                  })
                }
                placeholder="Fethiye, Ölüdeniz..."
                className="w-full bg-transparent text-sm font-black outline-none placeholder:text-slate-600"
              />

            </label>


            <label className="border-b border-white/10 p-5 lg:border-b-0 lg:border-r">

              <span className="mb-2 block text-[9px] font-black uppercase tracking-[.12em] text-slate-500">
                Tarih
              </span>


              <input
                type="date"
                value={
                  filters.pickupDate
                }
                onChange={(event) =>
                  setFilters({
                    ...filters,
                    pickupDate:
                      event.target.value,
                  })
                }
                className="w-full bg-transparent text-sm font-black outline-none"
              />

            </label>


            <label className="border-b border-white/10 p-5 lg:border-b-0 lg:border-r">

              <span className="mb-2 block text-[9px] font-black uppercase tracking-[.12em] text-slate-500">
                Saat
              </span>


              <input
                type="time"
                value={
                  filters.pickupTime
                }
                onChange={(event) =>
                  setFilters({
                    ...filters,
                    pickupTime:
                      event.target.value,
                  })
                }
                className="w-full bg-transparent text-sm font-black outline-none"
              />

            </label>


            <div className="flex items-center p-3">

              <button
                type="button"
                onClick={() =>
                  void searchTransfers()
                }
                className="flex min-h-[58px] w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-7 font-black hover:bg-orange-600"
              >
                <FaSearch />
                Transfer Ara
              </button>

            </div>

          </div>


          {/* SERVICE TYPES */}

          <div className="mt-4 flex flex-wrap gap-2">

            {serviceTypes.map(
              (
                item
              ) => {

                const Icon =
                  item.icon;


                return (
                  <button
                    key={
                      item.value
                    }
                    type="button"
                    onClick={() =>
                      setFilters({
                        ...filters,
                        serviceType:
                          item.value,
                      })
                    }
                    className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-black ${
                      filters.serviceType ===
                      item.value
                        ? "border-orange-500 bg-orange-500 text-white"
                        : "border-white/10 bg-black/30 text-slate-400"
                    }`}
                  >
                    <Icon />
                    {item.label}
                  </button>
                );

              }
            )}

          </div>


          <div className="mt-4 grid overflow-hidden rounded-[18px] border border-white/10 bg-black/30 backdrop-blur-xl sm:grid-cols-2 xl:grid-cols-4">

            {[
              "VIP & Özel Transfer",
              "Gerçek Araç Kapasitesi",
              "Karşılama Hizmeti",
              "Sabit Fiyat",
            ].map(
              (
                text
              ) => (

                <div
                  key={text}
                  className="flex items-center gap-3 px-5 py-4"
                >
                  <FaShieldAlt className="text-emerald-400" />
                  <div className="text-xs font-black">
                    {text}
                  </div>
                </div>

              )
            )}

          </div>

        </div>

      </section>


      {/* DISCOVERY */}

      <section className="px-5 py-14 lg:px-8">

        <div className="mx-auto max-w-7xl">

          <div className="text-[10px] font-black uppercase tracking-[.2em] text-orange-400">
            Transfer Tipini Seç
          </div>

          <h2 className="mt-2 text-3xl font-black">
            Nasıl Yolculuk Edeceksin?
          </h2>


          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

            {[
              [
                "airport",
                "Havalimanı",
                "Uçuş sonrası kapıda karşılama",
                FaPlane,
              ],
              [
                "intercity",
                "Şehirler Arası",
                "Kapıdan kapıya özel araç",
                FaCar,
              ],
              [
                "marina",
                "Marina Transferi",
                "Otel, villa ve marina bağlantısı",
                FaShip,
              ],
              [
                "hourly",
                "Saatlik Şoförlü",
                "Araç ve şoför emrinizde",
                FaClock,
              ],
            ].map(
              ([
                value,
                title,
                description,
                Icon,
              ]) => {

                const TypedIcon =
                  Icon as typeof FaPlane;


                return (
                  <button
                    key={
                      String(value)
                    }
                    type="button"
                    onClick={() => {

                      setFilters({
                        ...filters,
                        serviceType:
                          String(value),
                      });

                      resultsRef.current?.scrollIntoView({
                        behavior:
                          "smooth",
                      });

                    }}
                    className="group rounded-[24px] border border-white/10 bg-[#0b1825] p-5 text-left transition hover:-translate-y-1 hover:border-orange-500/30"
                  >

                    <div className="flex items-center justify-between">

                      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-orange-500/10 text-orange-400">
                        <TypedIcon />
                      </div>

                      <FaArrowRight className="text-slate-700 group-hover:text-orange-400" />

                    </div>


                    <div className="mt-4 font-black">
                      {String(title)}
                    </div>

                    <div className="mt-1 text-xs text-slate-500">
                      {String(description)}
                    </div>

                  </button>
                );

              }
            )}

          </div>

        </div>

      </section>


      {/* RESULTS */}

      <section
        ref={
          resultsRef
        }
        className="scroll-mt-24 border-t border-white/10 bg-[#091522] px-5 py-14 lg:px-8"
      >

        <div className="mx-auto max-w-7xl">

          <div className="flex flex-wrap items-end justify-between gap-5">

            <div>

              <div className="text-[10px] font-black uppercase tracking-[.2em] text-orange-400">
                Transfer Marketplace
              </div>

              <h2 className="mt-2 text-3xl font-black md:text-4xl">
                Uygun Transferler
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                {loading
                  ? "Transfer ağı kontrol ediliyor..."
                  : `${results.length} uygun araç bulundu`}
              </p>

            </div>


            <div className="flex gap-2">

              <button
                type="button"
                onClick={() =>
                  setMobileFilters(
                    true
                  )
                }
                className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-xs font-black lg:hidden"
              >
                <FaFilter />
                Filtre
              </button>


              <div className="relative">

                <select
                  value={
                    sort
                  }
                  onChange={(event) =>
                    setSort(
                      event.target
                        .value as SortMode
                    )
                  }
                  className="appearance-none rounded-xl border border-white/10 bg-[#07111f] px-4 py-3 pr-9 text-xs font-black"
                >
                  <option value="recommended">
                    Önerilen
                  </option>
                  <option value="priceAsc">
                    Fiyat Artan
                  </option>
                  <option value="priceDesc">
                    Fiyat Azalan
                  </option>
                  <option value="capacity">
                    Kapasite
                  </option>
                </select>

                <FaChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-slate-600" />

              </div>

            </div>

          </div>


          <div className="mt-7 grid gap-7 lg:grid-cols-[270px_1fr]">

            {/* FILTERS */}

            <aside className="hidden lg:block">

              <div className="sticky top-24 rounded-[24px] border border-white/10 bg-[#07111f] p-5">

                <h3 className="font-black">
                  Transfer Filtreleri
                </h3>


                <label className="mt-5 block">

                  <span className="mb-2 block text-[9px] font-black uppercase text-slate-600">
                    Yolcu
                  </span>


                  <select
                    value={
                      filters.passengers
                    }
                    onChange={(event) =>
                      setFilters({
                        ...filters,
                        passengers:
                          Number(
                            event.target.value
                          ),
                      })
                    }
                    className="w-full rounded-xl border border-white/10 bg-[#0c1825] px-4 py-3"
                  >

                    {Array.from(
                      {
                        length: 16,
                      },
                      (
                        _,
                        index
                      ) =>
                        index + 1
                    ).map(
                      (
                        count
                      ) => (

                        <option
                          key={
                            count
                          }
                          value={
                            count
                          }
                        >
                          {count} Kişi
                        </option>

                      )
                    )}

                  </select>

                </label>


                <label className="mt-5 block">

                  <span className="mb-2 block text-[9px] font-black uppercase text-slate-600">
                    Araç Tipi
                  </span>


                  <select
                    value={
                      filters.vehicleType
                    }
                    onChange={(event) =>
                      setFilters({
                        ...filters,
                        vehicleType:
                          event.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-white/10 bg-[#0c1825] px-4 py-3"
                  >

                    {vehicleTypes.map(
                      (
                        item
                      ) => (

                        <option
                          key={
                            item.value
                          }
                          value={
                            item.value
                          }
                        >
                          {item.label}
                        </option>

                      )
                    )}

                  </select>

                </label>


                <label className="mt-5 block">

                  <span className="mb-2 block text-[9px] font-black uppercase text-slate-600">
                    Maksimum Fiyat
                  </span>


                  <input
                    type="number"
                    min="0"
                    value={
                      filters.maxPrice
                    }
                    onChange={(event) =>
                      setFilters({
                        ...filters,
                        maxPrice:
                          event.target.value,
                      })
                    }
                    placeholder="Örn. 5000"
                    className="w-full rounded-xl border border-white/10 bg-[#0c1825] px-4 py-3"
                  />

                </label>


                <button
                  type="button"
                  onClick={
                    clearFilters
                  }
                  className="mt-5 w-full rounded-xl border border-white/10 py-3 text-xs font-black text-slate-400"
                >
                  Filtreleri Temizle
                </button>

              </div>

            </aside>


            {/* LIST */}

            <div>

              {error && (

                <div className="mb-5 flex items-center justify-between rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">

                  {error}

                  <button
                    type="button"
                    onClick={() =>
                      setError("")
                    }
                  >
                    <FaTimes />
                  </button>

                </div>

              )}


              {loading ? (

                <div className="space-y-5">

                  {[1,2,3].map(
                    (
                      item
                    ) => (
                      <div
                        key={
                          item
                        }
                        className="h-[300px] animate-pulse rounded-[28px] bg-white/[.04]"
                      />
                    )
                  )}

                </div>

              ) : results.length ? (

                <div className="space-y-5">

                  {results.map(
                    (
                      transfer
                    ) => (

                      <article
                        key={
                          transfer.id
                        }
                        className="group grid overflow-hidden rounded-[28px] border border-white/10 bg-[#0b1825] transition hover:border-orange-500/30 hover:shadow-2xl md:grid-cols-[350px_1fr]"
                      >

                        <div className="relative min-h-[290px] overflow-hidden bg-slate-900">

                          {transfer.cover_url ? (

                            <img
                              src={
                                transfer.cover_url
                              }
                              alt={
                                transfer.name
                              }
                              className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                            />

                          ) : (

                            <div className="flex h-full min-h-[290px] flex-col items-center justify-center text-slate-600">
                              <FaCar className="text-5xl" />
                              <span className="mt-3 text-xs">
                                Araç görseli hazırlanıyor
                              </span>
                            </div>

                          )}


                          {transfer.verified && (

                            <div className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-emerald-400 px-3 py-1.5 text-[8px] font-black text-slate-950">
                              <FaCheckCircle />
                              DOĞRULANMIŞ
                            </div>

                          )}

                        </div>


                        <div className="flex flex-col p-5 md:p-6">

                          <div className="flex flex-wrap items-start justify-between gap-4">

                            <div>

                              <div className="text-[10px] font-black uppercase text-orange-400">
                                {serviceLabel(
                                  transfer.service_type
                                )}
                              </div>


                              <h3 className="mt-2 text-2xl font-black">
                                {transfer.name}
                              </h3>


                              <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                                <FaMapMarkerAlt className="text-orange-400" />
                                {transfer.origin_name}
                                <FaArrowRight />
                                {transfer.destination_name}
                              </div>

                            </div>


                            <div className="rounded-xl border border-white/10 bg-white/[.03] px-4 py-3 text-right">

                              <div className="text-[9px] uppercase text-slate-600">
                                Başlangıç
                              </div>

                              <div className="mt-1 text-xl font-black text-orange-400">
                                {money(
                                  transfer.base_price,
                                  transfer.currency
                                )}
                              </div>

                            </div>

                          </div>


                          <div className="mt-5 grid gap-2 sm:grid-cols-4">

                            <div className="rounded-xl border border-white/10 bg-white/[.025] p-3">

                              <FaCar className="text-orange-400" />

                              <div className="mt-2 text-[9px] uppercase text-slate-600">
                                Araç
                              </div>

                              <div className="mt-1 text-sm font-black">
                                {vehicleLabel(
                                  transfer.vehicle_type
                                )}
                              </div>

                            </div>


                            <div className="rounded-xl border border-white/10 bg-white/[.025] p-3">

                              <FaUsers className="text-orange-400" />

                              <div className="mt-2 text-[9px] uppercase text-slate-600">
                                Yolcu
                              </div>

                              <div className="mt-1 text-sm font-black">
                                {transfer.max_passengers}
                              </div>

                            </div>


                            <div className="rounded-xl border border-white/10 bg-white/[.025] p-3">

                              <FaSuitcase className="text-orange-400" />

                              <div className="mt-2 text-[9px] uppercase text-slate-600">
                                Bagaj
                              </div>

                              <div className="mt-1 text-sm font-black">
                                {transfer.max_luggage}
                              </div>

                            </div>


                            <div className="rounded-xl border border-white/10 bg-white/[.025] p-3">

                              <FaClock className="text-orange-400" />

                              <div className="mt-2 text-[9px] uppercase text-slate-600">
                                Tahmini
                              </div>

                              <div className="mt-1 text-sm font-black">
                                {transfer.estimated_minutes
                                  ? `${transfer.estimated_minutes} dk`
                                  : "-"}
                              </div>

                            </div>

                          </div>


                          <div className="mt-auto flex flex-wrap items-end justify-between gap-5 border-t border-white/10 pt-5">

                            <div>

                              <div className="text-[9px] uppercase text-slate-600">
                                Uygun Araç
                              </div>

                              <div className="mt-1 text-xs font-black text-emerald-300">
                                {pickupAt
                                  ? `${transfer.available_fleet} araç`
                                  : "Tarih seçerek kontrol et"}
                              </div>

                            </div>


                            <Link
                              href={{
                                pathname:
                                  `/transfer/${transfer.slug}`,

                                query: {
                                  ...(filters.pickupDate
                                    ? {
                                        date:
                                          filters.pickupDate,
                                      }
                                    : {}),

                                  ...(filters.pickupTime
                                    ? {
                                        time:
                                          filters.pickupTime,
                                      }
                                    : {}),

                                  passengers:
                                    String(
                                      filters.passengers
                                    ),
                                },
                              }}
                              className="flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-xs font-black hover:bg-orange-600"
                            >
                              Transferi İncele
                              <FaArrowRight />
                            </Link>

                          </div>

                        </div>

                      </article>

                    )
                  )}

                </div>

              ) : (

                <div>

                  <div className="rounded-[24px] border border-orange-500/15 bg-orange-500/[.04] p-5">

                    <div className="font-black text-orange-300">
                      Marketplace Tasarım Önizlemesi
                    </div>

                    <p className="mt-2 text-xs leading-6 text-slate-500">
                      Gerçek transfer hizmetleri sisteme eklenene kadar aşağıdaki araçlar yalnızca tasarım önizlemesidir ve rezervasyon alınmaz.
                    </p>

                  </div>


                  <div className="mt-5 grid gap-5 md:grid-cols-3">

                    {previewTransfers.map(
                      (
                        transfer
                      ) => (

                        <article
                          key={
                            transfer.name
                          }
                          className="overflow-hidden rounded-[26px] border border-white/10 bg-[#0b1825]"
                        >

                          <div className="relative aspect-[4/3] overflow-hidden">

                            <img
                              src={
                                transfer.image
                              }
                              alt={
                                transfer.name
                              }
                              className="h-full w-full object-cover"
                            />

                            <div className="absolute left-3 top-3 rounded-full bg-black/70 px-3 py-1.5 text-[8px] font-black text-orange-300">
                              TASARIM ÖNİZLEME
                            </div>

                          </div>


                          <div className="p-4">

                            <div className="text-[9px] text-orange-400">
                              {transfer.type}
                            </div>

                            <h3 className="mt-2 font-black">
                              {transfer.name}
                            </h3>

                            <div className="mt-4 flex flex-wrap gap-2 text-[9px] text-slate-400">

                              <span className="rounded-full bg-white/[.05] px-3 py-1.5">
                                {transfer.vehicle}
                              </span>

                              <span className="rounded-full bg-white/[.05] px-3 py-1.5">
                                {transfer.passengers} kişi
                              </span>

                              <span className="rounded-full bg-white/[.05] px-3 py-1.5">
                                {transfer.luggage} bagaj
                              </span>

                            </div>


                            <div className="mt-4 text-xl font-black text-orange-400">
                              {money(
                                transfer.price
                              )}
                            </div>

                          </div>

                        </article>

                      )
                    )}

                  </div>

                </div>

              )}

            </div>

          </div>

        </div>

      </section>


      {/* NETWORK */}

      <section className="border-t border-white/10 px-5 py-16 lg:px-8">

        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_.8fr]">

          <div>

            <div className="text-[10px] font-black uppercase tracking-[.2em] text-orange-400">
              Turobus Transfer Network
            </div>

            <h2 className="mt-2 max-w-2xl text-3xl font-black">
              Transfer formu değil. Araç, kapasite, fiyat ve operasyon altyapısı.
            </h2>


            <div className="mt-8 grid gap-4 sm:grid-cols-2">

              {[
                [
                  "Araç Kapasitesi",
                  "Aynı saat aralığında filo kapasitesi otomatik kontrol edilir.",
                ],
                [
                  "Gidiş & Dönüş",
                  "Tek yön veya gidiş-dönüş rezervasyonu aynı sistemde fiyatlanır.",
                ],
                [
                  "Ek Hizmetler",
                  "Çocuk koltuğu, bagaj, karşılama tabelası ve uçuş numarası tutulur.",
                ],
                [
                  "Marketplace Komisyonu",
                  "Turobus komisyonu yalnızca Marketplace kaynaklı rezervasyonda oluşur.",
                ],
              ].map(
                ([
                  title,
                  description,
                ]) => (

                  <div
                    key={title}
                    className="rounded-[22px] border border-white/10 bg-white/[.025] p-5"
                  >
                    <FaShieldAlt className="text-orange-400" />

                    <div className="mt-4 font-black">
                      {title}
                    </div>

                    <p className="mt-2 text-xs leading-6 text-slate-500">
                      {description}
                    </p>
                  </div>

                )
              )}

            </div>

          </div>


          <div className="rounded-[30px] border border-orange-500/20 bg-gradient-to-br from-orange-500/10 to-transparent p-7">

            <div className="text-[10px] font-black uppercase tracking-[.2em] text-orange-400">
              TUROBUS TRANSFER
            </div>

            <div className="mt-4 text-4xl font-black leading-tight">
              Rota.
              <br />
              Araç.
              <br />
              Saat.
              <br />
              Operasyon.
            </div>

          </div>

        </div>

      </section>


      {/* MOBILE FILTER */}

      {mobileFilters && (

        <div className="fixed inset-0 z-[95] bg-black/80 backdrop-blur-md">

          <div className="absolute inset-x-0 bottom-0 max-h-[90vh] overflow-y-auto rounded-t-[30px] border-t border-white/10 bg-[#091522] p-5">

            <div className="flex items-center justify-between">

              <h3 className="text-xl font-black">
                Transfer Filtreleri
              </h3>

              <button
                type="button"
                onClick={() =>
                  setMobileFilters(
                    false
                  )
                }
                className="grid h-10 w-10 place-items-center rounded-xl border border-white/10"
              >
                <FaTimes />
              </button>

            </div>


            <label className="mt-5 block">

              <span className="mb-2 block text-[9px] font-black uppercase text-slate-600">
                Araç Tipi
              </span>

              <select
                value={
                  filters.vehicleType
                }
                onChange={(event) =>
                  setFilters({
                    ...filters,
                    vehicleType:
                      event.target.value,
                  })
                }
                className="w-full rounded-xl border border-white/10 bg-[#07111f] px-4 py-3"
              >

                {vehicleTypes.map(
                  (
                    item
                  ) => (
                    <option
                      key={
                        item.value
                      }
                      value={
                        item.value
                      }
                    >
                      {item.label}
                    </option>
                  )
                )}

              </select>

            </label>


            <label className="mt-5 block">

              <span className="mb-2 block text-[9px] font-black uppercase text-slate-600">
                Maksimum Fiyat
              </span>

              <input
                type="number"
                value={
                  filters.maxPrice
                }
                onChange={(event) =>
                  setFilters({
                    ...filters,
                    maxPrice:
                      event.target.value,
                  })
                }
                className="w-full rounded-xl border border-white/10 bg-[#07111f] px-4 py-3"
              />

            </label>


            <button
              type="button"
              onClick={() => {

                setMobileFilters(
                  false
                );

                resultsRef.current?.scrollIntoView({
                  behavior:
                    "smooth",
                });

              }}
              className="mt-6 w-full rounded-xl bg-orange-500 py-4 font-black"
            >
              Sonuçları Göster
            </button>

          </div>

        </div>

      )}


      <Footer />

    </main>
  );
}
