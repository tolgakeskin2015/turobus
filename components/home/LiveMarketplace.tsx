"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import {
  FaArrowRight,
  FaBed,
  FaCalendarAlt,
  FaCar,
  FaCheckCircle,
  FaGift,
  FaGlobeEurope,
  FaHotel,
  FaMapMarkerAlt,
  FaShip,
  FaStar,
  FaUsers,
} from "react-icons/fa";

import { supabase } from "@/lib/supabase";


type MarketKey =
  | "hotel"
  | "villa"
  | "tour"
  | "activity"
  | "package"
  | "yacht"
  | "transfer";


type MarketCard = {
  id: string;
  title: string;
  location: string;
  image: string | null;
  price: number | null;
  currency: string;
  badge: string;
  meta: string;
  href: string;
};


type MarketSection = {
  key: MarketKey;
  title: string;
  kicker: string;
  description: string;
  href: string;
  icon: typeof FaHotel;
  items: MarketCard[];
};


function money(
  value: number,
  currency = "TRY"
) {
  return new Intl.NumberFormat(
    "tr-TR",
    {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }
  ).format(value);
}


function asText(
  values: Array<
    string |
    number |
    null |
    undefined
  >
) {
  return values
    .filter(
      (
        value
      ) =>
        value !== null &&
        value !== undefined &&
        value !== ""
    )
    .join(" · ");
}


function fallbackImage(
  key: MarketKey
) {
  const images:
    Record<
      MarketKey,
      string
    > = {
      hotel:
        "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1400&q=88",

      villa:
        "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1400&q=88",

      tour:
        "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1400&q=88",

      activity:
        "https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&w=1400&q=88",

      package:
        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=88",

      yacht:
        "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?auto=format&fit=crop&w=1400&q=88",

      transfer:
        "https://images.unsplash.com/photo-1515569067071-ec3b51335dd0?auto=format&fit=crop&w=1400&q=88",
    };


  return images[key];
}


export default function LiveMarketplace() {

  const [
    sections,
    setSections,
  ] =
    useState<
      MarketSection[]
    >([]);


  const [
    loading,
    setLoading,
  ] =
    useState(true);


  useEffect(
    () => {

      let mounted =
        true;


      async function load() {

        setLoading(true);


        const [
          hotelsResult,
          villasResult,
          toursResult,
          activitiesResult,
          packagesResult,
          yachtsResult,
          transfersResult,
        ] =
          await Promise.allSettled([
            supabase.rpc(
              "get_public_hotel_marketplace",
              {
                p_destination:
                  null,

                p_guests:
                  2,

                p_star:
                  null,
              }
            ),

            supabase.rpc(
              "get_public_villa_marketplace",
              {
                p_city:
                  null,

                p_guests:
                  2,

                p_check_in:
                  null,

                p_check_out:
                  null,
              }
            ),

            supabase
              .from("tours")
              .select(
                "id,slug,title,city,district,duration,adult_price,cover_image,featured,status"
              )
              .eq(
                "status",
                "active"
              )
              .order(
                "featured",
                {
                  ascending:
                    false,
                }
              )
              .limit(8),

            supabase.rpc(
              "get_public_activity_marketplace_v1",
              {
                p_location:
                  null,

                p_guests:
                  1,

                p_date:
                  null,
              }
            ),

            supabase.rpc(
              "get_public_package_marketplace_v2",
              {
                p_destination:
                  null,

                p_package_type:
                  null,

                p_travel_scope:
                  null,

                p_accommodation_mode:
                  null,

                p_guests:
                  2,

                p_start_date:
                  null,
              }
            ),

            supabase.rpc(
              "get_public_yacht_marketplace",
              {
                p_location:
                  null,

                p_yacht_type:
                  null,

                p_guests:
                  2,

                p_check_in:
                  null,

                p_check_out:
                  null,
              }
            ),

            supabase.rpc(
              "get_public_transfer_marketplace",
              {
                p_origin:
                  null,

                p_destination:
                  null,

                p_service_type:
                  null,

                p_passengers:
                  2,

                p_pickup_at:
                  null,
              }
            ),
          ]);


        if (!mounted) {
          return;
        }


        function dataOf(
          result:
            PromiseSettledResult<any>
        ) {

          if (
            result.status !==
            "fulfilled"
          ) {
            return [];
          }


          const response =
            result.value;


          if (
            response?.error
          ) {
            return [];
          }


          return (
            response?.data ??
            []
          );

        }


        const hotels =
          dataOf(
            hotelsResult
          ).slice(
            0,
            6
          );


        const villas =
          dataOf(
            villasResult
          ).slice(
            0,
            6
          );


        const tours =
          dataOf(
            toursResult
          ).slice(
            0,
            6
          );


        const activities =
          dataOf(
            activitiesResult
          ).slice(
            0,
            6
          );


        const packages =
          dataOf(
            packagesResult
          ).slice(
            0,
            6
          );


        const yachts =
          dataOf(
            yachtsResult
          ).slice(
            0,
            6
          );


        const transfers =
          dataOf(
            transfersResult
          ).slice(
            0,
            6
          );


        const next:
          MarketSection[] = [
            {
              key:
                "hotel",

              title:
                "Oteller",

              kicker:
                "CANLI KONAKLAMA PAZARI",

              description:
                "Farklı otel işletmelerinin Marketplace'e açtığı tesisler.",

              href:
                "/oteller",

              icon:
                FaHotel,

              items:
                hotels.map(
                  (
                    item: any
                  ) => ({
                    id:
                      String(
                        item.id
                      ),

                    title:
                      item.name,

                    location:
                      asText([
                        item.district,
                        item.city,
                      ]),

                    image:
                      item.cover_image,

                    price:
                      null,

                    currency:
                      item.currency ??
                      "TRY",

                    badge:
                      item.verified
                        ? "Doğrulanmış"
                        : "Otel",

                    meta:
                      asText([
                        item.star_rating
                          ? `${item.star_rating}★`
                          : null,

                        item.hotel_type,

                        item.room_type_count
                          ? `${item.room_type_count} oda tipi`
                          : null,
                      ]),

                    href:
                      "/oteller",
                  })
                ),
            },

            {
              key:
                "villa",

              title:
                "Villalar",

              kicker:
                "CANLI VILLA PAZARI",

              description:
                "Villa sahipleri ve işletmelerin gerçek Marketplace villaları.",

              href:
                "/villalar",

              icon:
                FaBed,

              items:
                villas.map(
                  (
                    item: any
                  ) => ({
                    id:
                      item.slug,

                    title:
                      item.name,

                    location:
                      asText([
                        item.district,
                        item.city,
                      ]),

                    image:
                      item.cover_url,

                    price:
                      Number(
                        item.base_nightly_rate ??
                        0
                      ) ||
                      null,

                    currency:
                      item.currency ??
                      "TRY",

                    badge:
                      "Villa",

                    meta:
                      asText([
                        `${item.max_guests} kişi`,
                        `${item.bedrooms} yatak odası`,
                        `${item.minimum_stay} gece min.`,
                      ]),

                    href:
                      `/villalar/${item.slug}`,
                  })
                ),
            },

            {
              key:
                "tour",

              title:
                "Turlar",

              kicker:
                "TUR OPERATÖRLERİ",

              description:
                "Aktif tur operatörü ürünleri ve seyahat rotaları.",

              href:
                "/turlar",

              icon:
                FaGlobeEurope,

              items:
                tours.map(
                  (
                    item: any
                  ) => ({
                    id:
                      String(
                        item.id
                      ),

                    title:
                      item.title,

                    location:
                      asText([
                        item.district,
                        item.city,
                      ]),

                    image:
                      item.cover_image,

                    price:
                      Number(
                        item.adult_price ??
                        0
                      ) ||
                      null,

                    currency:
                      "TRY",

                    badge:
                      item.featured
                        ? "Öne Çıkan"
                        : "Tur",

                    meta:
                      item.duration ||
                      "Tur programı",

                    href:
                      `/turlar/${item.slug}`,
                  })
                ),
            },

            {
              key:
                "activity",

              title:
                "Aktiviteler",

              kicker:
                "ACTIVITY NETWORK",

              description:
                "Gerçek slot, kapasite ve satış fiyatıyla yayınlanan aktiviteler.",

              href:
                "/aktiviteler",

              icon:
                FaStar,

              items:
                activities.map(
                  (
                    item: any
                  ) => ({
                    id:
                      item.product_key,

                    title:
                      item.name,

                    location:
                      asText([
                        item.district,
                        item.city,
                      ]),

                    image:
                      item.cover_image_url,

                    price:
                      Number(
                        item.minimum_price ??
                        0
                      ) ||
                      null,

                    currency:
                      item.currency ??
                      "TRY",

                    badge:
                      item.category ||
                      "Aktivite",

                    meta:
                      asText([
                        item.duration_minutes
                          ? `${item.duration_minutes} dk`
                          : null,

                        item.available_capacity
                          ? `${item.available_capacity} kişilik yer`
                          : null,

                        item.provider_count
                          ? `${item.provider_count} sağlayıcı`
                          : null,
                      ]),

                    href:
                      "/aktiviteler",
                  })
                ),
            },

            {
              key:
                "package",

              title:
                "Tatil Paketleri",

              kicker:
                "PACKAGE MARKETPLACE",

              description:
                "Yurt içi, yurt dışı, balayı, aile ve seçkin tatil paketleri.",

              href:
                "/paketler",

              icon:
                FaGift,

              items:
                packages.map(
                  (
                    item: any
                  ) => ({
                    id:
                      item.slug,

                    title:
                      item.name,

                    location:
                      asText([
                        item.district,
                        item.city,
                        item.country,
                      ]),

                    image:
                      item.cover_url,

                    price:
                      Number(
                        item.base_price ??
                        0
                      ) ||
                      null,

                    currency:
                      item.currency ??
                      "TRY",

                    badge:
                      item.travel_scope ===
                      "international"
                        ? "Yurt Dışı"
                        : "Yurt İçi",

                    meta:
                      asText([
                        `${item.nights} gece`,
                        `${item.days} gün`,

                        item.accommodation_mode ===
                        "villa"
                          ? "Villa"
                          : item.accommodation_mode ===
                              "hotel"
                            ? "Otel"
                            : null,

                        item.included_component_count
                          ? `${item.included_component_count} deneyim`
                          : null,
                      ]),

                    href:
                      `/paketler/${item.slug}`,
                  })
                ),
            },

            {
              key:
                "yacht",

              title:
                "Yat & Tekne",

              kicker:
                "YACHT MARKETPLACE",

              description:
                "Yat ve tekne işletmelerinin gerçek kiralama ürünleri.",

              href:
                "/yatlar",

              icon:
                FaShip,

              items:
                yachts.map(
                  (
                    item: any
                  ) => ({
                    id:
                      item.slug,

                    title:
                      item.name,

                    location:
                      asText([
                        item.marina,
                        item.city,
                      ]),

                    image:
                      item.cover_url,

                    price:
                      Number(
                        item.base_daily_price ??
                        0
                      ) ||
                      null,

                    currency:
                      item.currency ??
                      "TRY",

                    badge:
                      item.verified
                        ? "Doğrulanmış"
                        : "Yat & Tekne",

                    meta:
                      asText([
                        item.yacht_type,
                        `${item.max_guests} kişi`,
                        `${item.cabins} kabin`,
                      ]),

                    href:
                      `/yatlar/${item.slug}`,
                  })
                ),
            },

            {
              key:
                "transfer",

              title:
                "Transferler",

              kicker:
                "TRANSFER MARKETPLACE",

              description:
                "Transfer firmalarının rota ve araç bazlı hizmetleri.",

              href:
                "/transfer",

              icon:
                FaCar,

              items:
                transfers.map(
                  (
                    item: any
                  ) => ({
                    id:
                      item.slug,

                    title:
                      item.name,

                    location:
                      asText([
                        item.origin_name,
                        "→",
                        item.destination_name,
                      ]),

                    image:
                      item.cover_url,

                    price:
                      Number(
                        item.base_price ??
                        0
                      ) ||
                      null,

                    currency:
                      item.currency ??
                      "TRY",

                    badge:
                      item.verified
                        ? "Doğrulanmış"
                        : "Transfer",

                    meta:
                      asText([
                        item.vehicle_type,
                        `${item.max_passengers} kişi`,

                        item.estimated_minutes
                          ? `${item.estimated_minutes} dk`
                          : null,
                      ]),

                    href:
                      `/transfer/${item.slug}`,
                  })
                ),
            },
          ];


        setSections(next);
        setLoading(false);

      }


      void load();


      return () => {
        mounted =
          false;
      };

    },
    []
  );


  const totalProducts =
    useMemo(
      () =>
        sections.reduce(
          (
            total,
            section
          ) =>
            total +
            section.items.length,
          0
        ),
      [
        sections,
      ]
    );


  if (loading) {

    return (
      <section className="border-y border-white/10 bg-[#07131f] px-5 py-20 lg:px-8">

        <div className="mx-auto max-w-[1500px]">

          <div className="h-8 w-56 animate-pulse rounded-xl bg-white/[.05]" />

          <div className="mt-4 h-14 max-w-3xl animate-pulse rounded-2xl bg-white/[.05]" />


          <div className="mt-10 grid gap-4 md:grid-cols-3 xl:grid-cols-4">

            {Array.from({
              length: 8,
            }).map(
              (
                _,
                index
              ) => (

                <div
                  key={
                    index
                  }
                  className="h-[360px] animate-pulse rounded-[28px] bg-white/[.04]"
                />

              )
            )}

          </div>

        </div>

      </section>
    );

  }


  return (
    <section className="border-y border-white/10 bg-[#07131f] px-5 py-20 lg:px-8">

      <div className="mx-auto max-w-[1500px]">

        {/* HEADER */}

        <div className="flex flex-wrap items-end justify-between gap-6">

          <div>

            <div className="flex items-center gap-3">

              <span className="relative flex h-2.5 w-2.5">

                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />

                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />

              </span>


              <div className="text-[10px] font-black uppercase tracking-[.24em] text-emerald-300">
                LIVE MARKETPLACE
              </div>

            </div>


            <h2 className="mt-4 max-w-4xl text-4xl font-black leading-tight md:text-6xl">
              Pazardaki
              <span className="text-orange-500">
                {" "}Gerçek Ürünler.
              </span>
            </h2>


            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400">
              İşletmeler Marketplace&apos;e ürün ekledikçe ana sayfa otomatik güncellenir.
            </p>

          </div>


          <div className="rounded-2xl border border-white/10 bg-[#030a11] px-5 py-4">

            <div className="text-[9px] font-black uppercase tracking-[.15em] text-slate-600">
              ANA SAYFADA
            </div>

            <div className="mt-1 text-2xl font-black">
              {totalProducts}
            </div>

            <div className="text-[9px] text-slate-500">
              canlı ürün gösteriliyor
            </div>

          </div>

        </div>


        {/* SECTIONS */}

        <div className="mt-16 space-y-20">

          {sections.map(
            (
              section
            ) => {

              const Icon =
                section.icon;


              return (
                <div
                  key={
                    section.key
                  }
                >

                  <div className="flex flex-wrap items-end justify-between gap-5">

                    <div className="flex items-start gap-4">

                      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-orange-500/20 bg-orange-500/10 text-xl text-orange-400">
                        <Icon />
                      </div>


                      <div>

                        <div className="text-[9px] font-black uppercase tracking-[.2em] text-orange-400">
                          {section.kicker}
                        </div>

                        <h3 className="mt-1 text-3xl font-black">
                          {section.title}
                        </h3>

                        <p className="mt-2 text-xs text-slate-500">
                          {section.description}
                        </p>

                      </div>

                    </div>


                    <Link
                      href={
                        section.href
                      }
                      className="group flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.03] px-4 py-3 text-xs font-black transition hover:border-orange-500/30 hover:text-orange-400"
                    >
                      Tümünü Gör

                      <FaArrowRight className="transition group-hover:translate-x-1" />
                    </Link>

                  </div>


                  {section.items.length >
                  0 ? (

                    <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">

                      {section.items.map(
                        (
                          item
                        ) => (

                          <Link
                            key={
                              `${section.key}-${item.id}`
                            }
                            href={
                              item.href
                            }
                            className="group overflow-hidden rounded-[24px] border border-white/10 bg-[#030a11] transition hover:-translate-y-1 hover:border-orange-500/30 hover:shadow-2xl"
                          >

                            <div className="relative aspect-[4/3] overflow-hidden">

                              <img
                                src={
                                  item.image ||
                                  fallbackImage(
                                    section.key
                                  )
                                }
                                alt={
                                  item.title
                                }
                                className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                              />


                              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />


                              <div className="absolute left-3 top-3 rounded-full border border-white/15 bg-black/60 px-3 py-1.5 text-[8px] font-black backdrop-blur-xl">
                                {item.badge}
                              </div>


                              <div className="absolute bottom-3 right-3 grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-black/60 text-[10px] backdrop-blur-xl transition group-hover:bg-orange-500">
                                <FaArrowRight />
                              </div>

                            </div>


                            <div className="p-4">

                              <div className="flex items-center gap-1.5 text-[9px] text-slate-500">

                                <FaMapMarkerAlt className="text-orange-400" />

                                <span className="truncate">
                                  {item.location ||
                                    "Turobus Marketplace"}
                                </span>

                              </div>


                              <h4 className="mt-2 line-clamp-2 min-h-[42px] text-sm font-black leading-5">
                                {item.title}
                              </h4>


                              <div className="mt-3 min-h-[18px] text-[9px] leading-4 text-slate-500">
                                {item.meta}
                              </div>


                              <div className="mt-4 border-t border-white/10 pt-3">

                                {item.price ? (

                                  <>
                                    <div className="text-[8px] uppercase text-slate-600">
                                      Başlangıç
                                    </div>

                                    <div className="mt-1 text-lg font-black text-orange-400">
                                      {money(
                                        item.price,
                                        item.currency
                                      )}
                                    </div>
                                  </>

                                ) : (

                                  <div className="flex items-center gap-2 text-[9px] font-black text-emerald-300">

                                    <FaCheckCircle />

                                    Marketplace&apos;te incele

                                  </div>

                                )}

                              </div>

                            </div>

                          </Link>

                        )
                      )}

                    </div>

                  ) : (

                    <Link
                      href={
                        section.href
                      }
                      className="group mt-7 flex min-h-[180px] items-center justify-between gap-6 overflow-hidden rounded-[26px] border border-dashed border-white/10 bg-[#030a11] p-7 transition hover:border-orange-500/30"
                    >

                      <div>

                        <div className="text-sm font-black">
                          Bu pazarda henüz yayınlanmış ürün görünmüyor.
                        </div>

                        <p className="mt-2 text-xs leading-6 text-slate-500">
                          İşletmeler ürünlerini Marketplace&apos;e açtığında bu alan otomatik olarak dolacak.
                        </p>

                      </div>


                      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-white/10 transition group-hover:bg-orange-500">
                        <FaArrowRight />
                      </div>

                    </Link>

                  )}

                </div>
              );

            }
          )}

        </div>

      </div>

    </section>
  );
}
