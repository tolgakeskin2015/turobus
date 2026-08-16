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
  FaBaby,
  FaCar,
  FaCheck,
  FaCheckCircle,
  FaClock,
  FaMapMarkerAlt,
  FaPlane,
  FaShieldAlt,
  FaSuitcase,
  FaUsers,
} from "react-icons/fa";

import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";

import { supabase } from "@/lib/supabase";


type TransferDetail = {
  id: string;
  slug: string;
  name: string;

  service_type: string;
  vehicle_type: string;

  origin_city: string;
  origin_name: string;

  destination_city: string;
  destination_name: string;

  description: string | null;

  max_passengers: number;
  max_luggage: number;

  fleet_count: number;

  base_price: number;
  return_multiplier: number;

  night_surcharge_rate: number;
  child_seat_price: number;

  included_waiting_minutes: number;

  currency: string;

  estimated_minutes: number | null;
  distance_km: number | null;

  cover_url: string | null;

  amenities: string[];

  meet_and_greet: boolean;
  flight_tracking_supported: boolean;

  verified: boolean;
};


type Quote = {
  available: boolean;

  available_fleet: number;

  outbound_total: number;
  return_total: number;
  extras_total: number;
  grand_total: number;

  currency: string;

  night_surcharge_applied: boolean;
  return_night_surcharge_applied: boolean;

  included_waiting_minutes: number;
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


function vehicleLabel(
  type: string
) {

  const map:
    Record<string,string> = {
      sedan:
        "Sedan",

      vip_van:
        "VIP Van",

      minivan:
        "Minivan",

      sprinter:
        "VIP Sprinter",

      minibus:
        "Minibüs",
  };


  return map[type] ?? type;

}


function serviceLabel(
  type: string
) {

  const map:
    Record<string,string> = {
      airport:
        "Havalimanı Transferi",

      intercity:
        "Şehirler Arası",

      marina:
        "Marina Transferi",

      hourly:
        "Saatlik Şoförlü Araç",
  };


  return map[type] ?? type;

}


export default function TransferDetailPage() {

  const params =
    useParams<{
      slug: string;
    }>();


  const searchParams =
    useSearchParams();


  const [
    service,
    setService,
  ] =
    useState<TransferDetail | null>(
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
      date:
        searchParams.get(
          "date"
        ) ?? "",

      time:
        searchParams.get(
          "time"
        ) ?? "",

      roundTrip:
        false,

      returnDate:
        "",

      returnTime:
        "",

      passengers:
        Number(
          searchParams.get(
            "passengers"
          ) ??
            2
        ),

      luggage:
        2,

      childSeats:
        0,

      pickupAddress:
        "",

      destinationAddress:
        "",

      flightNumber:
        "",

      returnFlightNumber:
        "",

      name:
        "",

      phone:
        "",

      email:
        "",

      meetSignName:
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
            "get_public_transfer_detail",
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

          setService(
            data as TransferDetail
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


  function pickupAt() {

    if (
      !form.date ||
      !form.time
    ) {
      return null;
    }


    return `${form.date}T${form.time}:00+03:00`;

  }


  function returnAt() {

    if (
      !form.roundTrip ||
      !form.returnDate ||
      !form.returnTime
    ) {
      return null;
    }


    return `${form.returnDate}T${form.returnTime}:00+03:00`;

  }


  async function getQuote() {

    if (!service) {
      return;
    }


    setError("");
    setSuccess("");


    const pickup =
      pickupAt();


    if (!pickup) {

      setError(
        "Transfer tarihi ve saatini seçin."
      );

      return;

    }


    if (
      form.roundTrip &&
      !returnAt()
    ) {

      setError(
        "Dönüş tarihi ve saatini seçin."
      );

      return;

    }


    const {
      data,
      error:
        quoteError,
    } =
      await supabase.rpc(
        "quote_public_transfer",
        {
          p_service_id:
            service.id,

          p_pickup_at:
            pickup,

          p_passengers:
            form.passengers,

          p_luggage:
            form.luggage,

          p_child_seats:
            form.childSeats,

          p_is_round_trip:
            form.roundTrip,

          p_return_at:
            returnAt(),
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


    if (!service) {
      return;
    }


    const pickup =
      pickupAt();


    if (!pickup) {

      setError(
        "Tarih ve saat gerekli."
      );

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
        "create_public_transfer_reservation",
        {
          p_service_id:
            service.id,

          p_pickup_at:
            pickup,

          p_return_at:
            returnAt(),

          p_is_round_trip:
            form.roundTrip,

          p_passengers:
            form.passengers,

          p_luggage:
            form.luggage,

          p_child_seats:
            form.childSeats,

          p_pickup_address:
            form.pickupAddress,

          p_destination_address:
            form.destinationAddress,

          p_flight_number:
            form.flightNumber,

          p_return_flight_number:
            form.returnFlightNumber,

          p_customer_name:
            form.name,

          p_customer_phone:
            form.phone,

          p_customer_email:
            form.email,

          p_meet_sign_name:
            form.meetSignName,

          p_notes:
            form.notes,
        }
      );


    if (reservationError) {

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
      `Transfer talebiniz oluşturuldu. Rezervasyon kodu: ${result.reservation_code}`
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


  if (!service) {

    return (
      <main className="min-h-screen bg-[#06101b] text-white">

        <Navbar />

        <div className="mx-auto max-w-7xl px-5 py-40 text-center">

          <FaCar className="mx-auto text-5xl text-slate-700" />

          <h1 className="mt-5 text-2xl font-black">
            Transfer bulunamadı
          </h1>

          <p className="mt-2 text-sm text-red-300">
            {error}
          </p>

          <Link
            href="/transfer"
            className="mt-6 inline-flex rounded-xl bg-orange-500 px-5 py-3 font-black"
          >
            Transferlere Dön
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
            href="/transfer"
            className="inline-flex items-center gap-2 text-xs font-black text-slate-400 hover:text-orange-400"
          >
            <FaArrowLeft />
            Transferlere Dön
          </Link>


          <div className="mt-6 flex flex-wrap items-start justify-between gap-5">

            <div>

              <div className="flex flex-wrap items-center gap-2">

                <span className="rounded-full bg-orange-500/10 px-3 py-1.5 text-[9px] font-black text-orange-300">
                  {serviceLabel(
                    service.service_type
                  )}
                </span>


                {service.verified && (

                  <span className="flex items-center gap-1.5 rounded-full bg-emerald-400 px-3 py-1.5 text-[9px] font-black text-slate-950">
                    <FaCheckCircle />
                    DOĞRULANMIŞ
                  </span>

                )}

              </div>


              <h1 className="mt-4 text-4xl font-black md:text-5xl">
                {service.name}
              </h1>


              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-400">

                <FaMapMarkerAlt className="text-orange-400" />

                {service.origin_name}

                <span>→</span>

                {service.destination_name}

              </div>

            </div>


            <div className="rounded-[20px] border border-white/10 bg-[#07111f] px-5 py-4 text-right">

              <div className="text-[9px] uppercase text-slate-600">
                Tek yön başlangıç
              </div>

              <div className="mt-1 text-3xl font-black text-orange-400">
                {money(
                  service.base_price,
                  service.currency
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

            {/* IMAGE */}

            <div className="overflow-hidden rounded-[30px] bg-[#0b1825]">

              {service.cover_url ? (

                <img
                  src={
                    service.cover_url
                  }
                  alt={
                    service.name
                  }
                  className="h-[430px] w-full object-cover"
                />

              ) : (

                <div className="flex h-[430px] items-center justify-center text-slate-700">
                  <FaCar className="text-7xl" />
                </div>

              )}

            </div>


            {/* METRICS */}

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

              {[
                [
                  "Araç",
                  vehicleLabel(
                    service.vehicle_type
                  ),
                  FaCar,
                ],
                [
                  "Yolcu",
                  `${service.max_passengers} kişi`,
                  FaUsers,
                ],
                [
                  "Bagaj",
                  `${service.max_luggage} adet`,
                  FaSuitcase,
                ],
                [
                  "Tahmini Süre",
                  service.estimated_minutes
                    ? `${service.estimated_minutes} dk`
                    : "-",
                  FaClock,
                ],
              ].map(
                ([
                  title,
                  value,
                  Icon,
                ]) => {

                  const TypedIcon =
                    Icon as typeof FaCar;


                  return (
                    <div
                      key={
                        String(title)
                      }
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


            {/* DESCRIPTION */}

            <div className="mt-6 rounded-[28px] border border-white/10 bg-[#0b1825] p-6">

              <div className="text-[10px] font-black uppercase tracking-[.16em] text-orange-400">
                Transfer Hakkında
              </div>

              <p className="mt-4 whitespace-pre-line text-sm leading-8 text-slate-400">
                {service.description ||
                  "Transfer hizmeti bilgileri yakında eklenecek."}
              </p>

            </div>


            {/* INCLUDED */}

            <div className="mt-6 rounded-[28px] border border-white/10 bg-[#0b1825] p-6">

              <h2 className="text-xl font-black">
                Hizmete Dahil
              </h2>


              <div className="mt-5 grid gap-3 sm:grid-cols-2">

                {[
                  [
                    "Profesyonel Şoför",
                    true,
                  ],
                  [
                    "Karşılama Hizmeti",
                    service.meet_and_greet,
                  ],
                  [
                    `${service.included_waiting_minutes} dk bekleme`,
                    true,
                  ],
                  [
                    "Özel Araç",
                    true,
                  ],
                ].map(
                  ([
                    name,
                    active,
                  ]) => (

                    <div
                      key={
                        String(name)
                      }
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

                    </div>

                  )
                )}

              </div>

            </div>


            {/* AMENITIES */}

            {service.amenities?.length >
              0 && (

              <div className="mt-6 rounded-[28px] border border-white/10 bg-[#0b1825] p-6">

                <h2 className="text-xl font-black">
                  Araç Özellikleri
                </h2>

                <div className="mt-4 flex flex-wrap gap-2">

                  {service.amenities.map(
                    (
                      item
                    ) => (

                      <span
                        key={
                          item
                        }
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


          {/* BOOKING */}

          <aside>

            <form
              onSubmit={
                reserve
              }
              className="sticky top-24 rounded-[30px] border border-orange-500/20 bg-[#0b1825] p-5 shadow-2xl shadow-black/30"
            >

              <div className="text-[10px] font-black uppercase tracking-[.16em] text-orange-400">
                Transfer Rezervasyonu
              </div>

              <h2 className="mt-2 text-2xl font-black">
                Yolculuğunu Planla
              </h2>


              <div className="mt-5 grid grid-cols-2 gap-3">

                <label>

                  <span className="mb-2 block text-[9px] font-black uppercase text-slate-600">
                    Gidiş Tarihi
                  </span>

                  <input
                    type="date"
                    required
                    value={
                      form.date
                    }
                    onChange={(event) =>
                      setForm({
                        ...form,
                        date:
                          event.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-white/10 bg-[#07111f] px-3 py-3 text-xs"
                  />

                </label>


                <label>

                  <span className="mb-2 block text-[9px] font-black uppercase text-slate-600">
                    Gidiş Saati
                  </span>

                  <input
                    type="time"
                    required
                    value={
                      form.time
                    }
                    onChange={(event) =>
                      setForm({
                        ...form,
                        time:
                          event.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-white/10 bg-[#07111f] px-3 py-3 text-xs"
                  />

                </label>

              </div>


              <label className="mt-4 flex cursor-pointer items-center justify-between rounded-xl border border-white/10 bg-[#07111f] p-4">

                <span>

                  <span className="block text-sm font-black">
                    Gidiş-Dönüş
                  </span>

                  <span className="mt-1 block text-[9px] text-slate-600">
                    Dönüş transferini de ekle
                  </span>

                </span>


                <input
                  type="checkbox"
                  checked={
                    form.roundTrip
                  }
                  onChange={(event) =>
                    setForm({
                      ...form,
                      roundTrip:
                        event.target.checked,
                    })
                  }
                  className="h-5 w-5"
                />

              </label>


              {form.roundTrip && (

                <div className="mt-4 grid grid-cols-2 gap-3">

                  <label>

                    <span className="mb-2 block text-[9px] font-black uppercase text-slate-600">
                      Dönüş Tarihi
                    </span>

                    <input
                      type="date"
                      required
                      value={
                        form.returnDate
                      }
                      onChange={(event) =>
                        setForm({
                          ...form,
                          returnDate:
                            event.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-white/10 bg-[#07111f] px-3 py-3 text-xs"
                    />

                  </label>


                  <label>

                    <span className="mb-2 block text-[9px] font-black uppercase text-slate-600">
                      Dönüş Saati
                    </span>

                    <input
                      type="time"
                      required
                      value={
                        form.returnTime
                      }
                      onChange={(event) =>
                        setForm({
                          ...form,
                          returnTime:
                            event.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-white/10 bg-[#07111f] px-3 py-3 text-xs"
                    />

                  </label>

                </div>

              )}


              <div className="mt-4 grid grid-cols-3 gap-3">

                <label>

                  <span className="mb-2 block text-[9px] font-black uppercase text-slate-600">
                    Yolcu
                  </span>

                  <input
                    type="number"
                    min="1"
                    max={
                      service.max_passengers
                    }
                    required
                    value={
                      form.passengers
                    }
                    onChange={(event) =>
                      setForm({
                        ...form,
                        passengers:
                          Number(
                            event.target.value
                          ),
                      })
                    }
                    className="w-full rounded-xl border border-white/10 bg-[#07111f] px-3 py-3 text-xs"
                  />

                </label>


                <label>

                  <span className="mb-2 block text-[9px] font-black uppercase text-slate-600">
                    Bagaj
                  </span>

                  <input
                    type="number"
                    min="0"
                    max={
                      service.max_luggage
                    }
                    value={
                      form.luggage
                    }
                    onChange={(event) =>
                      setForm({
                        ...form,
                        luggage:
                          Number(
                            event.target.value
                          ),
                      })
                    }
                    className="w-full rounded-xl border border-white/10 bg-[#07111f] px-3 py-3 text-xs"
                  />

                </label>


                <label>

                  <span className="mb-2 block text-[9px] font-black uppercase text-slate-600">
                    Çocuk Koltuğu
                  </span>

                  <input
                    type="number"
                    min="0"
                    max={
                      form.passengers
                    }
                    value={
                      form.childSeats
                    }
                    onChange={(event) =>
                      setForm({
                        ...form,
                        childSeats:
                          Number(
                            event.target.value
                          ),
                      })
                    }
                    className="w-full rounded-xl border border-white/10 bg-[#07111f] px-3 py-3 text-xs"
                  />

                </label>

              </div>


              <button
                type="button"
                onClick={() =>
                  void getQuote()
                }
                className="mt-4 w-full rounded-xl border border-orange-500/30 bg-orange-500/10 py-3 text-xs font-black text-orange-300"
              >
                Uygun Araç & Fiyat Kontrol Et
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
                      ? `${quote.available_fleet} uygun araç var`
                      : "Bu saatte uygun araç kalmadı"}
                  </div>


                  {quote.available && (

                    <div className="mt-4 space-y-2 text-xs">

                      <div className="flex justify-between text-slate-400">
                        <span>
                          Gidiş
                        </span>

                        <span>
                          {money(
                            quote.outbound_total,
                            quote.currency
                          )}
                        </span>
                      </div>


                      {form.roundTrip && (

                        <div className="flex justify-between text-slate-400">
                          <span>
                            Dönüş
                          </span>

                          <span>
                            {money(
                              quote.return_total,
                              quote.currency
                            )}
                          </span>
                        </div>

                      )}


                      {quote.extras_total >
                        0 && (

                        <div className="flex justify-between text-slate-400">
                          <span>
                            Ek hizmetler
                          </span>

                          <span>
                            {money(
                              quote.extras_total,
                              quote.currency
                            )}
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
                      Alınış Adresi
                    </span>

                    <input
                      value={
                        form.pickupAddress
                      }
                      onChange={(event) =>
                        setForm({
                          ...form,
                          pickupAddress:
                            event.target.value,
                        })
                      }
                      placeholder="Terminal, otel veya açık adres"
                      className="w-full rounded-xl border border-white/10 bg-[#07111f] px-3 py-3 text-sm"
                    />

                  </label>


                  <label className="mt-4 block">

                    <span className="mb-2 block text-[9px] font-black uppercase text-slate-600">
                      Varış Adresi
                    </span>

                    <input
                      value={
                        form.destinationAddress
                      }
                      onChange={(event) =>
                        setForm({
                          ...form,
                          destinationAddress:
                            event.target.value,
                        })
                      }
                      placeholder="Otel, villa veya açık adres"
                      className="w-full rounded-xl border border-white/10 bg-[#07111f] px-3 py-3 text-sm"
                    />

                  </label>


                  {service.service_type ===
                    "airport" && (

                    <>

                      <label className="mt-4 block">

                        <span className="mb-2 block text-[9px] font-black uppercase text-slate-600">
                          Uçuş Numarası
                        </span>

                        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#07111f] px-3">

                          <FaPlane className="text-slate-600" />

                          <input
                            value={
                              form.flightNumber
                            }
                            onChange={(event) =>
                              setForm({
                                ...form,
                                flightNumber:
                                  event.target.value,
                              })
                            }
                            placeholder="TK2552"
                            className="w-full bg-transparent py-3 text-sm outline-none"
                          />

                        </div>

                      </label>


                      {form.roundTrip && (

                        <label className="mt-4 block">

                          <span className="mb-2 block text-[9px] font-black uppercase text-slate-600">
                            Dönüş Uçuş Numarası
                          </span>

                          <input
                            value={
                              form.returnFlightNumber
                            }
                            onChange={(event) =>
                              setForm({
                                ...form,
                                returnFlightNumber:
                                  event.target.value,
                              })
                            }
                            placeholder="TK2553"
                            className="w-full rounded-xl border border-white/10 bg-[#07111f] px-3 py-3 text-sm"
                          />

                        </label>

                      )}

                    </>

                  )}


                  <label className="mt-4 block">

                    <span className="mb-2 block text-[9px] font-black uppercase text-slate-600">
                      Karşılama Tabelası
                    </span>

                    <input
                      value={
                        form.meetSignName
                      }
                      onChange={(event) =>
                        setForm({
                          ...form,
                          meetSignName:
                            event.target.value,
                        })
                      }
                      placeholder="Tabelada yazacak isim"
                      className="w-full rounded-xl border border-white/10 bg-[#07111f] px-3 py-3 text-sm"
                    />

                  </label>


                  <label className="mt-4 block">

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
                      placeholder="Bebek arabası, özel bagaj vb."
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
                      ? "Transfer Oluşturuluyor..."
                      : "Transfer Talebi Oluştur"}
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
                  Talep oluşturulduğunda araç kapasitesi geçici olarak rezervasyona alınır. Kesin ödeme ve araç/şoför ataması operasyon tarafından tamamlanır.
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
