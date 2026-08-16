"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import {
  useParams,
  useSearchParams,
} from "next/navigation";

import {
  FaArrowLeft,
  FaCalendarAlt,
  FaCheck,
  FaCheckCircle,
  FaGift,
  FaHotel,
  FaMapMarkerAlt,
  FaShieldAlt,
  FaUsers,
} from "react-icons/fa";

import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";

import { supabase } from "@/lib/supabase";


type Departure = {
  id: string;

  start_date: string;
  end_date: string;

  capacity: number;
  sold_count: number;
  available_capacity: number;

  price: number;
  currency: string;
};


type PackageDetail = {
  id: string;
  slug: string;
  name: string;

  package_type: string;

  city: string | null;
  district: string | null;

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

  included_items: string[];
  optional_items: string[];
  highlights: string[];

  accommodation_type: string | null;
  meal_plan: string | null;

  transfer_included: boolean;

  verified: boolean;

  departures: Departure[];
};


type Quote = {
  available: boolean;
  available_capacity: number;

  unit_price: number;
  guests: number;

  grand_total: number;
  currency: string;

  start_date: string;
  end_date: string;
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
  ).format(
    Number(
      value || 0
    )
  );


const packageLabels:
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
    form,
    setForm,
  ] =
    useState({
      departureId: "",

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
            "get_public_package_detail",
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
        "quote_public_package_booking",
        {
          p_package_id:
            item.id,

          p_departure_id:
            form.departureId,

          p_guests:
            form.guests,
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
        "create_public_package_reservation",
        {
          p_package_id:
            item.id,

          p_departure_id:
            form.departureId,

          p_guests:
            form.guests,

          p_customer_name:
            form.name,

          p_customer_phone:
            form.phone,

          p_customer_email:
            form.email,

          p_notes:
            form.notes,
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
      `Paket rezervasyon talebiniz oluşturuldu. Kod: ${result.reservation_code}`
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

          <div className="h-[600px] animate-pulse rounded-[30px] bg-white/[.04]" />

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

              <div className="flex flex-wrap items-center gap-2">

                <span className="rounded-full bg-orange-500/10 px-3 py-1.5 text-[9px] font-black text-orange-300">
                  {packageLabels[
                    item.package_type
                  ] ??
                    item.package_type}
                </span>


                {item.verified && (

                  <span className="flex items-center gap-1.5 rounded-full bg-emerald-400 px-3 py-1.5 text-[9px] font-black text-slate-950">
                    <FaCheckCircle />
                    DOĞRULANMIŞ
                  </span>

                )}

              </div>


              <h1 className="mt-4 text-4xl font-black md:text-5xl">
                {item.name}
              </h1>


              <div className="mt-3 flex items-center gap-2 text-sm text-slate-400">

                <FaMapMarkerAlt className="text-orange-400" />

                {[item.district, item.city]
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


      {/* BODY */}

      <section className="px-5 py-8 lg:px-8">

        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_400px]">

          <div>

            {/* COVER */}

            <div className="overflow-hidden rounded-[30px] bg-[#0b1825]">

              {item.cover_url ? (

                <img
                  src={
                    item.cover_url
                  }
                  alt={
                    item.name
                  }
                  className="h-[460px] w-full object-cover"
                />

              ) : (

                <div className="flex h-[460px] items-center justify-center text-slate-700">
                  <FaGift className="text-7xl" />
                </div>

              )}

            </div>


            {/* METRICS */}

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

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

                <FaHotel className="text-orange-400" />

                <div className="mt-3 text-[9px] uppercase text-slate-600">
                  Konaklama
                </div>

                <div className="mt-1 font-black">
                  {item.accommodation_type ||
                    "Programa Göre"}
                </div>

              </div>


              <div className="rounded-[20px] border border-white/10 bg-[#0b1825] p-4">

                <FaShieldAlt className="text-orange-400" />

                <div className="mt-3 text-[9px] uppercase text-slate-600">
                  Pansiyon
                </div>

                <div className="mt-1 font-black">
                  {item.meal_plan ||
                    "Programa Göre"}
                </div>

              </div>

            </div>


            {/* DESCRIPTION */}

            <div className="mt-6 rounded-[28px] border border-white/10 bg-[#0b1825] p-6">

              <div className="text-[10px] font-black uppercase tracking-[.16em] text-orange-400">
                Paket Hakkında
              </div>

              <h2 className="mt-2 text-2xl font-black">
                Tatilin Tek Rezervasyonda
              </h2>

              <p className="mt-4 whitespace-pre-line text-sm leading-8 text-slate-400">
                {item.description ||
                  item.short_description ||
                  "Paket detayları yakında eklenecek."}
              </p>

            </div>


            {/* INCLUDED */}

            <div className="mt-6 rounded-[28px] border border-white/10 bg-[#0b1825] p-6">

              <h2 className="text-xl font-black">
                Pakete Dahil
              </h2>


              {item.included_items?.length ? (

                <div className="mt-5 grid gap-3 sm:grid-cols-2">

                  {item.included_items.map(
                    (
                      included
                    ) => (

                      <div
                        key={
                          included
                        }
                        className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[.025] p-4"
                      >

                        <FaCheck className="text-emerald-400" />

                        <span className="text-sm font-black">
                          {included}
                        </span>

                      </div>

                    )
                  )}

                </div>

              ) : (

                <div className="mt-5 text-sm text-slate-500">
                  Dahil hizmet bilgileri hazırlanıyor.
                </div>

              )}

            </div>


            {/* HIGHLIGHTS */}

            {item.highlights?.length >
              0 && (

              <div className="mt-6 rounded-[28px] border border-white/10 bg-[#0b1825] p-6">

                <h2 className="text-xl font-black">
                  Paketin Öne Çıkanları
                </h2>


                <div className="mt-5 grid gap-3 sm:grid-cols-2">

                  {item.highlights.map(
                    (
                      highlight
                    ) => (

                      <div
                        key={
                          highlight
                        }
                        className="rounded-xl bg-orange-500/[.05] p-4 text-sm font-black text-orange-200"
                      >
                        {highlight}
                      </div>

                    )
                  )}

                </div>

              </div>

            )}


            {/* OPTIONAL */}

            {item.optional_items?.length >
              0 && (

              <div className="mt-6 rounded-[28px] border border-white/10 bg-[#0b1825] p-6">

                <h2 className="text-xl font-black">
                  Opsiyonel Hizmetler
                </h2>


                <div className="mt-5 flex flex-wrap gap-2">

                  {item.optional_items.map(
                    (
                      optional
                    ) => (

                      <span
                        key={
                          optional
                        }
                        className="rounded-full border border-white/10 bg-white/[.03] px-4 py-2 text-xs text-slate-400"
                      >
                        {optional}
                      </span>

                    )
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
                Paket Rezervasyonu
              </div>

              <h2 className="mt-2 text-2xl font-black">
                Tarihini Seç
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
                        {" - "}
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
                  required
                  min={
                    item.min_guests
                  }
                  max={
                    item.max_guests
                  }
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


              <button
                type="button"
                onClick={() =>
                  void getQuote()
                }
                className="mt-4 w-full rounded-xl border border-orange-500/30 bg-orange-500/10 py-3 text-xs font-black text-orange-300"
              >
                Kontenjan & Fiyat Kontrol Et
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
                          {quote.guests} kişi × {money(
                            quote.unit_price,
                            quote.currency
                          )}
                        </span>

                        <span>
                          {money(
                            quote.grand_total,
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
                      Not
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
                      placeholder="Özel talebiniz..."
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
                      ? "Rezervasyon Oluşturuluyor..."
                      : "Paket Rezervasyon Talebi Oluştur"}
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
                  Paket talebi oluşturulduğunda kontenjan rezervasyona alınır. Kesin ödeme ve operasyon onayı sonraki aşamada tamamlanır.
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
