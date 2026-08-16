"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import {
  useParams,
  useSearchParams,
} from "next/navigation";

import {
  FaArrowLeft,
  FaBed,
  FaBus,
  FaCalendarAlt,
  FaCheck,
  FaCheckCircle,
  FaGift,
  FaGlobeEurope,
  FaHotel,
  FaMapMarkerAlt,
  FaPlane,
  FaShip,
  FaShieldAlt,
  FaSpa,
  FaStar,
  FaSuitcase,
  FaUsers,
} from "react-icons/fa";

import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";

import { supabase } from "@/lib/supabase";


type Departure = {
  id: string;

  start_date: string;
  end_date: string;

  available_capacity: number;

  price: number;
  currency: string;
};


type PackageComponent = {
  id: string;

  component_key: string;
  component_type: string;

  title: string;
  subtitle: string | null;
  description: string | null;

  source_type: string | null;
  source_id: string | null;

  image_url: string | null;

  is_included: boolean;
  is_optional: boolean;
  is_gift_option: boolean;

  price_delta: number;
  price_basis: string;

  quantity: number;
};


type PackageDetail = {
  id: string;
  slug: string;
  name: string;

  package_type: string;
  travel_scope: string;

  country: string | null;
  destination_region: string | null;

  city: string | null;
  district: string | null;

  accommodation_mode: string;
  transport_mode: string;

  package_mode: string;
  experience_theme: string | null;

  customizable: boolean;

  gift_choice_count: number;

  hero_caption: string | null;
  badge_labels: string[];

  short_description: string | null;
  description: string | null;

  nights: number;
  days: number;

  min_guests: number;
  max_guests: number;

  base_price: number;
  old_price: number | null;
  currency: string;

  cover_url: string | null;
  gallery: string[];

  accommodation_type: string | null;
  meal_plan: string | null;

  verified: boolean;

  departures: Departure[];
  components: PackageComponent[];
};


type Quote = {
  available: boolean;

  available_capacity: number;

  base_unit_price: number;
  base_total: number;

  optional_total: number;
  grand_total: number;

  currency: string;

  guests: number;

  gift_choice_count: number;
  selected_gift_count: number;

  start_date: string;
  end_date: string;
};


const iconMap:
  Record<string, typeof FaGift> = {
    accommodation:
      FaHotel,

    flight:
      FaPlane,

    bus:
      FaBus,

    transfer:
      FaSuitcase,

    activity:
      FaStar,

    tour:
      FaMapMarkerAlt,

    yacht:
      FaShip,

    boat:
      FaShip,

    spa:
      FaSpa,

    wellness:
      FaSpa,

    dining:
      FaGift,

    photography:
      FaGift,

    guide:
      FaMapMarkerAlt,

    gift:
      FaGift,

    insurance:
      FaShieldAlt,

    other:
      FaGift,
};


const labels:
  Record<string,string> = {
    holiday:
      "Tatil Paketi",

    honeymoon:
      "Balayı Paketi",

    family:
      "Aile Paketi",

    adventure:
      "Macera Paketi",

    premium:
      "Seçkin Paket",
};


const money = (
  value: number,
  currency = "TRY"
) =>
  new Intl.NumberFormat(
    "tr-TR",
    {
      style:
        "currency",

      currency,

      maximumFractionDigits:
        0,
    }
  ).format(
    Number(
      value || 0
    )
  );


export default function PackageDetailPage() {

  const params =
    useParams<{
      slug: string;
    }>();


  const searchParams =
    useSearchParams();


  const [
    item,
    setItem,
  ] =
    useState<PackageDetail | null>(
      null
    );


  const [
    loading,
    setLoading,
  ] =
    useState(true);


  const [
    quote,
    setQuote,
  ] =
    useState<Quote | null>(
      null
    );


  const [
    error,
    setError,
  ] =
    useState("");


  const [
    success,
    setSuccess,
  ] =
    useState("");


  const [
    booking,
    setBooking,
  ] =
    useState(false);


  const [
    optionalIds,
    setOptionalIds,
  ] =
    useState<string[]>([]);


  const [
    giftIds,
    setGiftIds,
  ] =
    useState<string[]>([]);


  const [
    form,
    setForm,
  ] =
    useState({
      departureId:
        "",

      guests:
        Number(
          searchParams.get(
            "guests"
          ) ??
            2
        ),

      name:
        "",

      phone:
        "",

      email:
        "",

      notes:
        "",
    });


  useEffect(
    () => {

      async function load() {

        setLoading(true);
        setError("");


        const {
          data,
          error:
            loadError,
        } =
          await supabase.rpc(
            "get_public_package_experience_detail",
            {
              p_slug:
                params.slug,
            }
          );


        if (
          loadError
        ) {

          setError(
            loadError.message
          );

        } else {

          const detail =
            data as PackageDetail;


          setItem(
            detail
          );


          if (
            detail.departures?.length
          ) {

            setForm(
              (
                current
              ) => ({
                ...current,

                departureId:
                  detail.departures[0].id,
              })
            );

          }

        }


        setLoading(false);

      }


      void load();

    },
    [
      params.slug,
    ]
  );


  const included =
    useMemo(
      () =>
        item?.components?.filter(
          (
            component
          ) =>
            component.is_included &&
            !component.is_optional &&
            !component.is_gift_option
        ) ??
        [],
      [
        item,
      ]
    );


  const optional =
    useMemo(
      () =>
        item?.components?.filter(
          (
            component
          ) =>
            component.is_optional
        ) ??
        [],
      [
        item,
      ]
    );


  const gifts =
    useMemo(
      () =>
        item?.components?.filter(
          (
            component
          ) =>
            component.is_gift_option
        ) ??
        [],
      [
        item,
      ]
    );


  const gallery =
    useMemo(
      () => {

        if (!item) {
          return [];
        }


        return Array.from(
          new Set(
            [
              item.cover_url,
              ...(item.gallery ?? []),
              ...(
                item.components ??
                []
              )
                .map(
                  (
                    component
                  ) =>
                    component.image_url
                ),
            ].filter(
              (
                value
              ): value is string =>
                Boolean(value)
            )
          )
        ).slice(
          0,
          5
        );

      },
      [
        item,
      ]
    );


  function toggleOptional(
    id: string
  ) {

    setOptionalIds(
      (
        current
      ) =>
        current.includes(
          id
        )
          ? current.filter(
              (
                value
              ) =>
                value !==
                id
            )
          : [
              ...current,
              id,
            ]
    );


    setQuote(null);

  }


  function toggleGift(
    id: string
  ) {

    if (!item) {
      return;
    }


    if (
      giftIds.includes(
        id
      )
    ) {

      setGiftIds(
        giftIds.filter(
          (
            value
          ) =>
            value !==
            id
        )
      );

      setQuote(null);

      return;

    }


    if (
      giftIds.length >=
      item.gift_choice_count
    ) {

      setError(
        `Bu pakette en fazla ${item.gift_choice_count} hediye seçebilirsiniz.`
      );

      return;

    }


    setError("");


    setGiftIds([
      ...giftIds,
      id,
    ]);

    setQuote(null);

  }


  async function getQuote() {

    if (
      !item ||
      !form.departureId
    ) {

      setError(
        "Paket tarihini seçin."
      );

      return;

    }


    setError("");
    setSuccess("");


    const {
      data,
      error:
        quoteError,
    } =
      await supabase.rpc(
        "quote_public_package_experience",
        {
          p_package_id:
            item.id,

          p_departure_id:
            form.departureId,

          p_guests:
            form.guests,

          p_optional_component_ids:
            optionalIds,

          p_gift_component_ids:
            giftIds,
        }
      );


    if (
      quoteError
    ) {

      setQuote(null);

      setError(
        quoteError.message
      );

      return;

    }


    setQuote(
      data as Quote
    );

  }


  async function reserve(
    event:
      FormEvent
  ) {

    event.preventDefault();


    if (
      !item ||
      !form.departureId
    ) {
      return;
    }


    setBooking(true);
    setError("");
    setSuccess("");


    const {
      data,
      error:
        reservationError,
    } =
      await supabase.rpc(
        "create_public_package_experience_reservation",
        {
          p_package_id:
            item.id,

          p_departure_id:
            form.departureId,

          p_guests:
            form.guests,

          p_optional_component_ids:
            optionalIds,

          p_gift_component_ids:
            giftIds,

          p_customer_name:
            form.name,

          p_customer_phone:
            form.phone,

          p_customer_email:
            form.email ||
            null,

          p_notes:
            form.notes ||
            null,
        }
      );


    if (
      reservationError
    ) {

      setError(
        reservationError.message
      );

      setBooking(false);

      return;

    }


    const result =
      data as {
        reservation_code:
          string;
      };


    setSuccess(
      `Tatil deneyiminiz oluşturuldu. Rezervasyon kodunuz: ${result.reservation_code}`
    );


    await getQuote();

    setBooking(false);

  }


  if (
    loading
  ) {

    return (
      <main className="min-h-screen bg-[#06101b] text-white">

        <Navbar />

        <div className="mx-auto max-w-7xl px-5 pb-20 pt-32">

          <div className="h-[650px] animate-pulse rounded-[30px] bg-white/[.04]" />

        </div>

        <Footer />

      </main>
    );

  }


  if (
    !item
  ) {

    return (
      <main className="min-h-screen bg-[#06101b] text-white">

        <Navbar />

        <div className="mx-auto max-w-7xl px-5 py-40 text-center">

          <FaGift className="mx-auto text-5xl text-slate-700" />

          <h1 className="mt-5 text-2xl font-black">
            Paket bulunamadı
          </h1>

          <p className="mt-2 text-sm text-red-300">
            {error}
          </p>

          <Link
            href="/paketler"
            className="mt-6 inline-flex rounded-xl bg-orange-500 px-5 py-3 font-black"
          >
            Paketlere Dön
          </Link>

        </div>

        <Footer />

      </main>
    );

  }


  return (
    <main className="min-h-screen bg-[#06101b] text-white">

      <Navbar />


      {/* HEADER */}

      <section className="border-b border-white/10 bg-[#091522] px-5 pb-10 pt-28 lg:px-8">

        <div className="mx-auto max-w-7xl">

          <Link
            href="/paketler"
            className="inline-flex items-center gap-2 text-xs font-black text-slate-400 hover:text-orange-400"
          >

            <FaArrowLeft />

            Paketlere Dön

          </Link>


          <div className="mt-6 flex flex-wrap items-start justify-between gap-5">

            <div>

              <div className="flex flex-wrap gap-2">

                <span className="rounded-full bg-orange-500 px-3 py-1.5 text-[9px] font-black">

                  {labels[
                    item.package_type
                  ] ??
                    item.package_type}

                </span>


                <span className="rounded-full border border-white/10 bg-white/[.04] px-3 py-1.5 text-[9px] font-black">

                  {item.travel_scope ===
                  "international"
                    ? "YURT DIŞI"
                    : "YURT İÇİ"}

                </span>


                {item.verified && (

                  <span className="flex items-center gap-1.5 rounded-full bg-emerald-400 px-3 py-1.5 text-[9px] font-black text-slate-950">

                    <FaCheckCircle />

                    DOĞRULANMIŞ

                  </span>

                )}


                {item.customizable && (

                  <span className="rounded-full bg-cyan-300 px-3 py-1.5 text-[9px] font-black text-slate-950">
                    ÖZELLEŞTİRİLEBİLİR
                  </span>

                )}

              </div>


              <h1 className="mt-4 max-w-4xl text-4xl font-black md:text-5xl">
                {item.name}
              </h1>


              <div className="mt-3 flex items-center gap-2 text-sm text-slate-400">

                <FaMapMarkerAlt className="text-orange-400" />

                {[
                  item.district,
                  item.city,
                  item.country,
                ]
                  .filter(Boolean)
                  .join(" · ")}

              </div>

            </div>


            <div className="rounded-[20px] border border-white/10 bg-[#07111f] px-5 py-4 text-right">

              {item.old_price &&
                item.old_price >
                  item.base_price && (

                <div className="text-xs text-slate-600 line-through">
                  {money(
                    item.old_price,
                    item.currency
                  )}
                </div>

              )}


              <div className="text-[9px] uppercase text-slate-600">
                Kişi başı başlangıç
              </div>


              <div className="mt-1 text-3xl font-black text-orange-400">
                {money(
                  item.base_price,
                  item.currency
                )}
              </div>

            </div>

          </div>

        </div>

      </section>


      {/* GALLERY */}

      <section className="px-5 py-8 lg:px-8">

        <div className="mx-auto max-w-7xl">

          {gallery.length >
          0 ? (

            <div className="grid gap-3 lg:grid-cols-[1.5fr_.75fr_.75fr]">

              <img
                src={
                  gallery[0]
                }
                alt={
                  item.name
                }
                className="h-[430px] w-full rounded-[26px] object-cover lg:row-span-2"
              />


              {gallery
                .slice(
                  1,
                  5
                )
                .map(
                  (
                    image,
                    index
                  ) => (

                    <img
                      key={
                        image
                      }
                      src={
                        image
                      }
                      alt={`${item.name} ${index + 2}`}
                      className="h-[208px] w-full rounded-[22px] object-cover"
                    />

                  )
                )}

            </div>

          ) : (

            <div className="flex h-[430px] items-center justify-center rounded-[30px] bg-[#0b1825] text-slate-700">

              <FaGift className="text-7xl" />

            </div>

          )}

        </div>

      </section>


      <section className="px-5 pb-20 lg:px-8">

        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_410px]">

          <div>

            {/* SUMMARY */}

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

              <div className="rounded-[20px] border border-white/10 bg-[#0b1825] p-4">

                <FaCalendarAlt className="text-orange-400" />

                <div className="mt-3 text-[9px] uppercase text-slate-600">
                  Süre
                </div>

                <div className="mt-1 font-black">
                  {item.nights} Gece · {item.days} Gün
                </div>

              </div>


              <div className="rounded-[20px] border border-white/10 bg-[#0b1825] p-4">

                <FaUsers className="text-orange-400" />

                <div className="mt-3 text-[9px] uppercase text-slate-600">
                  Katılım
                </div>

                <div className="mt-1 font-black">
                  {item.min_guests}-{item.max_guests} kişi
                </div>

              </div>


              <div className="rounded-[20px] border border-white/10 bg-[#0b1825] p-4">

                {item.accommodation_mode ===
                "villa"
                  ? (
                    <FaBed className="text-orange-400" />
                  )
                  : (
                    <FaHotel className="text-orange-400" />
                  )}


                <div className="mt-3 text-[9px] uppercase text-slate-600">
                  Konaklama
                </div>

                <div className="mt-1 font-black">
                  {item.accommodation_type ||
                    item.accommodation_mode}
                </div>

              </div>


              <div className="rounded-[20px] border border-white/10 bg-[#0b1825] p-4">

                {item.transport_mode ===
                "flight"
                  ? (
                    <FaPlane className="text-orange-400" />
                  )
                  : (
                    <FaBus className="text-orange-400" />
                  )}


                <div className="mt-3 text-[9px] uppercase text-slate-600">
                  Ulaşım
                </div>

                <div className="mt-1 font-black">
                  {item.transport_mode ===
                  "flight"
                    ? "Uçaklı"
                    : item.transport_mode ===
                      "bus"
                      ? "Otobüslü"
                      : "Pakete Göre"}
                </div>

              </div>

            </div>


            {/* ABOUT */}

            <div className="mt-6 rounded-[28px] border border-white/10 bg-[#0b1825] p-6">

              <div className="text-[10px] font-black uppercase tracking-[.16em] text-orange-400">
                Turobus Experience
              </div>


              <h2 className="mt-2 text-2xl font-black">
                Tatilin Tamamı Tek Pakette
              </h2>


              <p className="mt-4 whitespace-pre-line text-sm leading-8 text-slate-400">

                {item.description ||
                  item.short_description ||
                  "Paket deneyim detayları hazırlanıyor."}

              </p>

            </div>


            {/* INCLUDED EXPERIENCE */}

            <div className="mt-6 rounded-[28px] border border-white/10 bg-[#0b1825] p-6">

              <div className="flex flex-wrap items-end justify-between gap-3">

                <div>

                  <div className="text-[10px] font-black uppercase tracking-[.14em] text-emerald-400">
                    Fiyata Dahil
                  </div>

                  <h2 className="mt-2 text-2xl font-black">
                    Paket Deneyimleri
                  </h2>

                </div>


                <div className="text-xs text-slate-500">
                  {included.length} deneyim dahil
                </div>

              </div>


              {included.length >
              0 ? (

                <div className="mt-6 grid gap-4 sm:grid-cols-2">

                  {included.map(
                    (
                      component
                    ) => {

                      const Icon =
                        iconMap[
                          component.component_type
                        ] ??
                        FaGift;


                      return (
                        <div
                          key={
                            component.id
                          }
                          className="overflow-hidden rounded-[20px] border border-white/10 bg-[#07111f]"
                        >

                          {component.image_url && (

                            <img
                              src={
                                component.image_url
                              }
                              alt={
                                component.title
                              }
                              className="h-36 w-full object-cover"
                            />

                          )}


                          <div className="p-4">

                            <div className="flex items-start gap-3">

                              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-400">
                                <Icon />
                              </div>


                              <div>

                                <div className="font-black">
                                  {component.title}
                                </div>

                                {component.subtitle && (

                                  <div className="mt-1 text-[10px] text-slate-500">
                                    {component.subtitle}
                                  </div>

                                )}

                              </div>

                            </div>

                          </div>

                        </div>
                      );

                    }
                  )}

                </div>

              ) : (

                <div className="mt-5 text-sm text-slate-500">
                  Paket bileşenleri Package OS üzerinden eklendiğinde burada görünecek.
                </div>

              )}

            </div>


            {/* GIFTS */}

            {gifts.length >
              0 &&
              item.gift_choice_count >
              0 && (

              <div className="mt-6 rounded-[28px] border border-emerald-500/20 bg-emerald-500/[.035] p-6">

                <div className="flex flex-wrap items-end justify-between gap-3">

                  <div>

                    <div className="text-[10px] font-black uppercase tracking-[.14em] text-emerald-400">
                      Pakete Özel
                    </div>

                    <h2 className="mt-2 text-2xl font-black">
                      {item.gift_choice_count} Hediye Seçme Hakkı
                    </h2>

                  </div>


                  <div className="text-xs font-black text-emerald-300">
                    {giftIds.length}/{item.gift_choice_count} seçildi
                  </div>

                </div>


                <div className="mt-6 grid gap-3 sm:grid-cols-2">

                  {gifts.map(
                    (
                      component
                    ) => {

                      const selected =
                        giftIds.includes(
                          component.id
                        );


                      const Icon =
                        iconMap[
                          component.component_type
                        ] ??
                        FaGift;


                      return (
                        <button
                          key={
                            component.id
                          }
                          type="button"
                          onClick={() =>
                            toggleGift(
                              component.id
                            )
                          }
                          className={`flex items-center gap-4 rounded-[18px] border p-4 text-left transition ${
                            selected
                              ? "border-emerald-400 bg-emerald-500/10"
                              : "border-white/10 bg-[#07111f] hover:border-emerald-500/30"
                          }`}
                        >

                          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-400">
                            <Icon />
                          </div>


                          <div>

                            <div className="font-black">
                              {component.title}
                            </div>

                            <div className="mt-1 text-[9px] text-slate-500">
                              Hediye seçeneği
                            </div>

                          </div>


                          {selected && (
                            <FaCheckCircle className="ml-auto text-emerald-400" />
                          )}

                        </button>
                      );

                    }
                  )}

                </div>

              </div>

            )}


            {/* OPTIONAL */}

            {optional.length >
              0 && (

              <div className="mt-6 rounded-[28px] border border-cyan-400/15 bg-[#0b1825] p-6">

                <div>

                  <div className="text-[10px] font-black uppercase tracking-[.14em] text-cyan-300">
                    Tatilini Genişlet
                  </div>

                  <h2 className="mt-2 text-2xl font-black">
                    Opsiyonel Deneyimler
                  </h2>

                  <p className="mt-2 text-xs text-slate-500">
                    İstediklerini ekle; toplam fiyat otomatik güncellensin.
                  </p>

                </div>


                <div className="mt-6 grid gap-3 sm:grid-cols-2">

                  {optional.map(
                    (
                      component
                    ) => {

                      const selected =
                        optionalIds.includes(
                          component.id
                        );


                      const Icon =
                        iconMap[
                          component.component_type
                        ] ??
                        FaGift;


                      return (
                        <button
                          key={
                            component.id
                          }
                          type="button"
                          onClick={() =>
                            toggleOptional(
                              component.id
                            )
                          }
                          className={`flex items-center gap-4 rounded-[18px] border p-4 text-left transition ${
                            selected
                              ? "border-cyan-300 bg-cyan-400/10"
                              : "border-white/10 bg-[#07111f] hover:border-cyan-400/30"
                          }`}
                        >

                          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-cyan-400/10 text-cyan-300">
                            <Icon />
                          </div>


                          <div className="min-w-0">

                            <div className="font-black">
                              {component.title}
                            </div>


                            <div className="mt-1 text-[9px] text-slate-500">

                              + {money(
                                component.price_delta,
                                item.currency
                              )}

                              {component.price_basis ===
                              "person"
                                ? " / kişi"
                                : " / rezervasyon"}

                            </div>

                          </div>


                          {selected && (
                            <FaCheckCircle className="ml-auto shrink-0 text-cyan-300" />
                          )}

                        </button>
                      );

                    }
                  )}

                </div>

              </div>

            )}

          </div>


          {/* BOOKING */}

          <aside>

            <form
              onSubmit={
                reserve
              }
              className="sticky top-24 rounded-[30px] border border-orange-500/20 bg-[#0b1825] p-5 shadow-2xl shadow-black/30"
            >

              <div className="text-[10px] font-black uppercase tracking-[.16em] text-orange-400">
                Tatilini Oluştur
              </div>


              <h2 className="mt-2 text-2xl font-black">
                Paketini Tamamla
              </h2>


              <label className="mt-5 block">

                <span className="mb-2 block text-[9px] font-black uppercase text-slate-600">
                  Paket Tarihi
                </span>


                <select
                  required
                  value={
                    form.departureId
                  }
                  onChange={(event) => {

                    setForm({
                      ...form,

                      departureId:
                        event.target.value,
                    });

                    setQuote(null);

                  }}
                  className="w-full rounded-xl border border-white/10 bg-[#07111f] px-3 py-3 text-xs"
                >

                  <option value="">
                    Tarih seçin
                  </option>


                  {item.departures?.map(
                    (
                      departure
                    ) => (

                      <option
                        key={
                          departure.id
                        }
                        value={
                          departure.id
                        }
                      >

                        {new Date(
                          `${departure.start_date}T12:00:00`
                        ).toLocaleDateString(
                          "tr-TR"
                        )}

                        {" → "}

                        {new Date(
                          `${departure.end_date}T12:00:00`
                        ).toLocaleDateString(
                          "tr-TR"
                        )}

                        {" · "}

                        {departure.available_capacity} kişilik yer

                      </option>

                    )
                  )}

                </select>

              </label>


              <label className="mt-4 block">

                <span className="mb-2 block text-[9px] font-black uppercase text-slate-600">
                  Misafir
                </span>


                <input
                  type="number"
                  min={
                    item.min_guests
                  }
                  max={
                    item.max_guests
                  }
                  required
                  value={
                    form.guests
                  }
                  onChange={(event) => {

                    setForm({
                      ...form,

                      guests:
                        Number(
                          event.target.value
                        ),
                    });

                    setQuote(null);

                  }}
                  className="w-full rounded-xl border border-white/10 bg-[#07111f] px-3 py-3 text-sm"
                />

              </label>


              {(giftIds.length >
                0 ||
                optionalIds.length >
                0) && (

                <div className="mt-4 rounded-xl border border-white/10 bg-white/[.025] p-4">

                  <div className="text-[9px] font-black uppercase text-slate-600">
                    Seçimlerin
                  </div>


                  <div className="mt-2 space-y-1 text-[10px]">

                    {giftIds.length >
                      0 && (

                      <div className="text-emerald-300">
                        🎁 {giftIds.length} hediye seçildi
                      </div>

                    )}


                    {optionalIds.length >
                      0 && (

                      <div className="text-cyan-300">
                        + {optionalIds.length} ekstra deneyim
                      </div>

                    )}

                  </div>

                </div>

              )}


              <button
                type="button"
                onClick={() =>
                  void getQuote()
                }
                className="mt-4 w-full rounded-xl border border-orange-500/30 bg-orange-500/10 py-3 text-xs font-black text-orange-300"
              >
                Kontenjan & Toplam Fiyat
              </button>


              {quote && (

                <div className={`mt-4 rounded-[20px] border p-4 ${
                  quote.available
                    ? "border-emerald-500/20 bg-emerald-500/[.05]"
                    : "border-red-500/20 bg-red-500/[.05]"
                }`}>

                  <div className={`font-black ${
                    quote.available
                      ? "text-emerald-300"
                      : "text-red-300"
                  }`}>

                    {quote.available
                      ? `${quote.available_capacity} kişilik kontenjan var`
                      : "Yeterli kontenjan kalmadı"}

                  </div>


                  {quote.available && (

                    <div className="mt-4 space-y-2 text-xs">

                      <div className="flex justify-between text-slate-400">

                        <span>
                          Ana paket
                        </span>

                        <span>
                          {money(
                            quote.base_total,
                            quote.currency
                          )}
                        </span>

                      </div>


                      {quote.optional_total >
                        0 && (

                        <div className="flex justify-between text-cyan-300">

                          <span>
                            Ek deneyimler
                          </span>

                          <span>
                            {money(
                              quote.optional_total,
                              quote.currency
                            )}
                          </span>

                        </div>

                      )}


                      {quote.selected_gift_count >
                        0 && (

                        <div className="flex justify-between text-emerald-300">

                          <span>
                            Hediye seçimleri
                          </span>

                          <span>
                            Dahil
                          </span>

                        </div>

                      )}


                      <div className="flex justify-between border-t border-white/10 pt-3 text-lg font-black">

                        <span>
                          Toplam
                        </span>

                        <span className="text-orange-400">
                          {money(
                            quote.grand_total,
                            quote.currency
                          )}
                        </span>

                      </div>

                    </div>

                  )}

                </div>

              )}


              {quote?.available && (

                <>

                  <label className="mt-5 block">

                    <span className="mb-2 block text-[9px] font-black uppercase text-slate-600">
                      Ad Soyad
                    </span>


                    <input
                      required
                      value={
                        form.name
                      }
                      onChange={(event) =>
                        setForm({
                          ...form,

                          name:
                            event.target.value,
                        })
                      }
                      placeholder="Adınız Soyadınız"
                      className="w-full rounded-xl border border-white/10 bg-[#07111f] px-3 py-3 text-sm"
                    />

                  </label>


                  <label className="mt-4 block">

                    <span className="mb-2 block text-[9px] font-black uppercase text-slate-600">
                      Telefon
                    </span>


                    <input
                      required
                      value={
                        form.phone
                      }
                      onChange={(event) =>
                        setForm({
                          ...form,

                          phone:
                            event.target.value,
                        })
                      }
                      placeholder="05xx xxx xx xx"
                      className="w-full rounded-xl border border-white/10 bg-[#07111f] px-3 py-3 text-sm"
                    />

                  </label>


                  <label className="mt-4 block">

                    <span className="mb-2 block text-[9px] font-black uppercase text-slate-600">
                      E-posta
                    </span>


                    <input
                      type="email"
                      value={
                        form.email
                      }
                      onChange={(event) =>
                        setForm({
                          ...form,

                          email:
                            event.target.value,
                        })
                      }
                      placeholder="ornek@email.com"
                      className="w-full rounded-xl border border-white/10 bg-[#07111f] px-3 py-3 text-sm"
                    />

                  </label>


                  <label className="mt-4 block">

                    <span className="mb-2 block text-[9px] font-black uppercase text-slate-600">
                      Özel Talep
                    </span>


                    <textarea
                      rows={3}
                      value={
                        form.notes
                      }
                      onChange={(event) =>
                        setForm({
                          ...form,

                          notes:
                            event.target.value,
                        })
                      }
                      placeholder="Oda süslemesi, özel kutlama, beslenme tercihi vb."
                      className="w-full resize-none rounded-xl border border-white/10 bg-[#07111f] px-3 py-3 text-sm"
                    />

                  </label>


                  <button
                    type="submit"
                    disabled={
                      booking
                    }
                    className="mt-5 w-full rounded-xl bg-orange-500 py-4 font-black hover:bg-orange-600 disabled:opacity-50"
                  >

                    {booking
                      ? "Tatiliniz Oluşturuluyor..."
                      : "Tatil Paketini Rezerve Et"}

                  </button>

                </>

              )}


              {error && (

                <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs font-bold text-red-300">
                  {error}
                </div>

              )}


              {success && (

                <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs font-bold text-emerald-300">
                  {success}
                </div>

              )}


              <div className="mt-5 flex items-start gap-3 rounded-xl border border-white/10 bg-white/[.025] p-3">

                <FaShieldAlt className="mt-0.5 shrink-0 text-emerald-400" />

                <p className="text-[9px] leading-5 text-slate-500">
                  Paket, seçilen tarih ve deneyimlerle birlikte tek rezervasyon kaydı olarak oluşturulur. Marketplace kaynaklı satış olarak işaretlenir.
                </p>

              </div>

            </form>

          </aside>

        </div>

      </section>


      <Footer />

    </main>
  );
}
