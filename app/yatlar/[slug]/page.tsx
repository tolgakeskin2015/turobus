"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useParams,
  useSearchParams,
} from "next/navigation";

import Link from "next/link";

import {
  FaAnchor,
  FaArrowLeft,
  FaBed,
  FaCheck,
  FaCheckCircle,
  FaMapMarkerAlt,
  FaShip,
  FaShieldAlt,
  FaUsers,
} from "react-icons/fa";

import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";

import { supabase } from "@/lib/supabase";


type YachtDetail = {
  id: string;
  slug: string;
  name: string;
  yacht_type: string;
  city: string;
  marina: string | null;
  departure_point: string | null;
  description: string | null;
  length_m: number | null;
  build_year: number | null;
  cabins: number;
  bathrooms: number;
  max_guests: number;
  crew_count: number;
  captain_included: boolean;
  fuel_included: boolean;
  meals_included: boolean;
  base_daily_price: number;
  currency: string;
  minimum_days: number;
  cover_url: string | null;
  gallery: string[];
  amenities: string[];
  verified: boolean;
};


type Quote = {
  available: boolean;
  days: number;
  daily_price: number;
  subtotal: number;
  service_total: number;
  grand_total: number;
  currency: string;
  minimum_days: number;
};


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
  ).format(Number(value || 0));


function yachtTypeLabel(
  type: string
) {
  const labels:
    Record<string,string> = {
      motor_yacht:
        "Motor Yat",
      gulet:
        "Gulet",
      catamaran:
        "Katamaran",
      sailing:
        "Yelkenli",
      daily_boat:
        "Günlük Özel Tekne",
    };

  return labels[type] ?? type;
}


export default function YachtDetailPage() {

  const params =
    useParams<{
      slug: string;
    }>();

  const searchParams =
    useSearchParams();


  const [
    yacht,
    setYacht,
  ] =
    useState<YachtDetail | null>(
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
    form,
    setForm,
  ] =
    useState({
      checkIn:
        searchParams.get(
          "checkIn"
        ) ?? "",

      checkOut:
        searchParams.get(
          "checkOut"
        ) ?? "",

      guests:
        Number(
          searchParams.get(
            "guests"
          ) ??
            2
        ),

      name: "",
      phone: "",
      email: "",
      notes: "",
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
            "get_public_yacht_detail",
            {
              p_slug:
                params.slug,
            }
          );


        if (loadError) {

          setError(
            loadError.message
          );

        } else {

          setYacht(
            data as YachtDetail
          );

        }


        setLoading(false);

      }


      void load();

    },
    [
      params.slug,
    ]
  );


  const gallery =
    useMemo(
      () => {

        const images =
          [
            yacht?.cover_url,
            ...(
              yacht?.gallery ??
              []
            ),
          ].filter(
            (
              item
            ): item is string =>
              Boolean(item)
          );


        return Array.from(
          new Set(images)
        ).slice(
          0,
          5
        );

      },
      [
        yacht,
      ]
    );


  async function getQuote() {

    if (!yacht) {
      return;
    }


    setError("");
    setSuccess("");


    if (
      !form.checkIn ||
      !form.checkOut
    ) {

      setError(
        "Başlangıç ve dönüş tarihini seçin."
      );

      return;
    }


    const {
      data,
      error:
        quoteError,
    } =
      await supabase.rpc(
        "quote_public_yacht_booking",
        {
          p_yacht_id:
            yacht.id,

          p_check_in:
            form.checkIn,

          p_check_out:
            form.checkOut,

          p_guests:
            form.guests,
        }
      );


    if (quoteError) {

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


    if (!yacht) {
      return;
    }


    setBooking(true);
    setError("");
    setSuccess("");


    const {
      data,
      error:
        bookingError,
    } =
      await supabase.rpc(
        "create_public_yacht_reservation",
        {
          p_yacht_id:
            yacht.id,

          p_check_in:
            form.checkIn,

          p_check_out:
            form.checkOut,

          p_guests:
            form.guests,

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


    if (bookingError) {

      setError(
        bookingError.message
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
      `Rezervasyon talebiniz oluşturuldu. Kod: ${result.reservation_code}`
    );

    await getQuote();

    setBooking(false);

  }


  if (loading) {

    return (
      <main className="min-h-screen bg-[#06101b] text-white">
        <Navbar />

        <div className="mx-auto max-w-7xl px-5 pb-20 pt-32">
          <div className="h-[600px] animate-pulse rounded-[30px] bg-white/[.04]" />
        </div>

        <Footer />
      </main>
    );

  }


  if (!yacht) {

    return (
      <main className="min-h-screen bg-[#06101b] text-white">

        <Navbar />

        <div className="mx-auto max-w-7xl px-5 py-40 text-center">

          <FaShip className="mx-auto text-5xl text-slate-700" />

          <h1 className="mt-5 text-2xl font-black">
            Yat bulunamadı
          </h1>

          <p className="mt-2 text-sm text-red-300">
            {error}
          </p>

          <Link
            href="/yatlar"
            className="mt-6 inline-flex rounded-xl bg-orange-500 px-5 py-3 font-black"
          >
            Yatlara Dön
          </Link>

        </div>

        <Footer />

      </main>
    );

  }


  return (
    <main className="min-h-screen bg-[#06101b] text-white">

      <Navbar />


      <section className="border-b border-white/10 bg-[#091522] px-5 pb-10 pt-28 lg:px-8">

        <div className="mx-auto max-w-7xl">

          <Link
            href="/yatlar"
            className="inline-flex items-center gap-2 text-xs font-black text-slate-400 hover:text-orange-400"
          >
            <FaArrowLeft />
            Yatlara Dön
          </Link>


          <div className="mt-6 flex flex-wrap items-start justify-between gap-5">

            <div>

              <div className="flex flex-wrap items-center gap-2">

                <span className="rounded-full bg-cyan-400/10 px-3 py-1.5 text-[9px] font-black text-cyan-300">
                  {yachtTypeLabel(
                    yacht.yacht_type
                  )}
                </span>

                {yacht.verified && (

                  <span className="flex items-center gap-1.5 rounded-full bg-emerald-400 px-3 py-1.5 text-[9px] font-black text-slate-950">
                    <FaCheckCircle />
                    DOĞRULANMIŞ
                  </span>

                )}

              </div>


              <h1 className="mt-4 text-4xl font-black md:text-5xl">
                {yacht.name}
              </h1>

              <div className="mt-3 flex items-center gap-2 text-sm text-slate-400">
                <FaMapMarkerAlt className="text-orange-400" />
                {yacht.city}
                {yacht.marina
                  ? ` · ${yacht.marina}`
                  : ""}
              </div>

            </div>


            <div className="rounded-[20px] border border-white/10 bg-[#07111f] px-5 py-4 text-right">

              <div className="text-[9px] uppercase text-slate-600">
                Günlük başlangıç
              </div>

              <div className="mt-1 text-3xl font-black text-orange-400">
                {money(
                  yacht.base_daily_price,
                  yacht.currency
                )}
              </div>

            </div>

          </div>

        </div>

      </section>


      <section className="px-5 py-8 lg:px-8">

        <div className="mx-auto max-w-7xl">

          {gallery.length ? (

            <div className="grid gap-3 lg:grid-cols-[1.5fr_.75fr_.75fr]">

              <img
                src={gallery[0]}
                alt={yacht.name}
                className="h-[430px] w-full rounded-[26px] object-cover lg:row-span-2"
              />

              {(gallery.slice(
                1,
                5
              )).map(
                (
                  image,
                  index
                ) => (
                  <img
                    key={image}
                    src={image}
                    alt={`${yacht.name} ${index + 2}`}
                    className="h-[208px] w-full rounded-[22px] object-cover"
                  />
                )
              )}

            </div>

          ) : (

            <div className="flex h-[430px] items-center justify-center rounded-[30px] bg-[#0b1825] text-slate-700">
              <FaShip className="text-6xl" />
            </div>

          )}

        </div>

      </section>


      <section className="px-5 pb-20 lg:px-8">

        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_390px]">

          <div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

              {[
                [
                  "Misafir",
                  `${yacht.max_guests} kişi`,
                  FaUsers,
                ],
                [
                  "Kabin",
                  `${yacht.cabins}`,
                  FaBed,
                ],
                [
                  "Uzunluk",
                  yacht.length_m
                    ? `${yacht.length_m} m`
                    : "-",
                  FaShip,
                ],
                [
                  "Mürettebat",
                  `${yacht.crew_count}`,
                  FaAnchor,
                ],
              ].map(
                ([
                  title,
                  value,
                  Icon,
                ]) => {

                  const TypedIcon =
                    Icon as typeof FaUsers;


                  return (
                    <div
                      key={String(title)}
                      className="rounded-[20px] border border-white/10 bg-[#0b1825] p-4"
                    >
                      <TypedIcon className="text-orange-400" />

                      <div className="mt-3 text-[9px] uppercase text-slate-600">
                        {String(title)}
                      </div>

                      <div className="mt-1 font-black">
                        {String(value)}
                      </div>
                    </div>
                  );

                }
              )}

            </div>


            <div className="mt-7 rounded-[28px] border border-white/10 bg-[#0b1825] p-6">

              <div className="text-[10px] font-black uppercase tracking-[.16em] text-orange-400">
                Yat Hakkında
              </div>

              <p className="mt-4 whitespace-pre-line text-sm leading-8 text-slate-400">
                {yacht.description ||
                  "Bu yat için açıklama yakında eklenecek."}
              </p>

            </div>


            <div className="mt-6 rounded-[28px] border border-white/10 bg-[#0b1825] p-6">

              <h2 className="text-xl font-black">
                Kiralamaya Dahil
              </h2>


              <div className="mt-5 grid gap-3 sm:grid-cols-2">

                {[
                  [
                    "Kaptan",
                    yacht.captain_included,
                  ],
                  [
                    "Yakıt",
                    yacht.fuel_included,
                  ],
                  [
                    "Yemek",
                    yacht.meals_included,
                  ],
                  [
                    "Marketplace Takvim",
                    true,
                  ],
                ].map(
                  ([
                    name,
                    active,
                  ]) => (

                    <div
                      key={String(name)}
                      className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[.025] p-4"
                    >
                      <FaCheck className={
                        active
                          ? "text-emerald-400"
                          : "text-slate-700"
                      } />

                      <span className="text-sm font-black">
                        {String(name)}
                      </span>

                      <span className="ml-auto text-[9px] text-slate-500">
                        {active
                          ? "Dahil"
                          : "Dahil Değil"}
                      </span>
                    </div>

                  )
                )}

              </div>

            </div>


            {yacht.amenities?.length >
              0 && (

              <div className="mt-6 rounded-[28px] border border-white/10 bg-[#0b1825] p-6">

                <h2 className="text-xl font-black">
                  Özellikler
                </h2>

                <div className="mt-4 flex flex-wrap gap-2">

                  {yacht.amenities.map(
                    (item) => (
                      <span
                        key={item}
                        className="rounded-full border border-white/10 bg-white/[.03] px-4 py-2 text-xs text-slate-400"
                      >
                        {item}
                      </span>
                    )
                  )}

                </div>

              </div>

            )}

          </div>


          {/* BOOKING ENGINE */}

          <aside>

            <form
              onSubmit={reserve}
              className="sticky top-24 rounded-[30px] border border-orange-500/20 bg-[#0b1825] p-5 shadow-2xl shadow-black/30"
            >

              <div className="text-[10px] font-black uppercase tracking-[.16em] text-orange-400">
                Rezervasyon
              </div>

              <h2 className="mt-2 text-2xl font-black">
                Tarihini Kontrol Et
              </h2>


              <div className="mt-5 grid grid-cols-2 gap-3">

                <label>

                  <span className="mb-2 block text-[9px] font-black uppercase text-slate-600">
                    Başlangıç
                  </span>

                  <input
                    type="date"
                    required
                    value={form.checkIn}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        checkIn:
                          event.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-white/10 bg-[#07111f] px-3 py-3 text-xs"
                  />

                </label>


                <label>

                  <span className="mb-2 block text-[9px] font-black uppercase text-slate-600">
                    Dönüş
                  </span>

                  <input
                    type="date"
                    required
                    value={form.checkOut}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        checkOut:
                          event.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-white/10 bg-[#07111f] px-3 py-3 text-xs"
                  />

                </label>

              </div>


              <label className="mt-4 block">

                <span className="mb-2 block text-[9px] font-black uppercase text-slate-600">
                  Misafir
                </span>

                <input
                  type="number"
                  min="1"
                  max={yacht.max_guests}
                  required
                  value={form.guests}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      guests:
                        Number(
                          event.target.value
                        ),
                    })
                  }
                  className="w-full rounded-xl border border-white/10 bg-[#07111f] px-3 py-3 text-sm"
                />

              </label>


              <button
                type="button"
                onClick={() =>
                  void getQuote()
                }
                className="mt-4 w-full rounded-xl border border-orange-500/30 bg-orange-500/10 py-3 text-xs font-black text-orange-300"
              >
                Müsaitlik & Fiyat Kontrol Et
              </button>


              {quote && (

                <div className={`mt-4 rounded-[20px] border p-4 ${
                  quote.available
                    ? "border-emerald-500/20 bg-emerald-500/[.05]"
                    : "border-red-500/20 bg-red-500/[.05]"
                }`}>

                  <div className={`text-sm font-black ${
                    quote.available
                      ? "text-emerald-300"
                      : "text-red-300"
                  }`}>
                    {quote.available
                      ? "Tarihler müsait"
                      : "Tarihler müsait değil"}
                  </div>


                  {quote.available && (

                    <div className="mt-4 space-y-2 text-xs">

                      <div className="flex justify-between text-slate-400">
                        <span>
                          {quote.days} gün × {money(
                            quote.daily_price,
                            quote.currency
                          )}
                        </span>

                        <span>
                          {money(
                            quote.subtotal,
                            quote.currency
                          )}
                        </span>
                      </div>

                      <div className="flex justify-between text-slate-400">
                        <span>
                          Hizmet
                        </span>

                        <span>
                          {money(
                            quote.service_total,
                            quote.currency
                          )}
                        </span>
                      </div>

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
                      value={form.name}
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
                      value={form.phone}
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
                      value={form.email}
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
                      Not
                    </span>

                    <textarea
                      value={form.notes}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          notes:
                            event.target.value,
                        })
                      }
                      placeholder="Özel talebiniz..."
                      rows={3}
                      className="w-full resize-none rounded-xl border border-white/10 bg-[#07111f] px-3 py-3 text-sm"
                    />

                  </label>


                  <button
                    type="submit"
                    disabled={booking}
                    className="mt-5 w-full rounded-xl bg-orange-500 py-4 font-black hover:bg-orange-600 disabled:opacity-50"
                  >
                    {booking
                      ? "Rezervasyon Oluşturuluyor..."
                      : "Rezervasyon Talebi Oluştur"}
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

                <FaShieldAlt className="mt-0.5 text-emerald-400" />

                <p className="text-[9px] leading-5 text-slate-500">
                  Rezervasyon talebi oluşturulduğunda tarih merkezi stokta tutulur. Kesin onay ve ödeme süreci ayrıca tamamlanır.
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
