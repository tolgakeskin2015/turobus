"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  useParams,
  useSearchParams,
} from "next/navigation";

import Link from "next/link";

import {
  FaBed,
  FaCalendarCheck,
  FaCheckCircle,
  FaMapMarkerAlt,
  FaShieldAlt,
  FaUsers,
} from "react-icons/fa";

import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";

import { supabase } from "@/lib/supabase";


type VillaDetail = {
  slug: string;
  name: string;
  city: string | null;
  district: string | null;
  bedrooms: number;
  bathrooms: number;
  max_guests: number;
  base_nightly_rate: number;
  currency: string;
  cleaning_fee: number;
  cleaning_fee_under_nights: number | null;
  security_deposit: number;
  minimum_stay: number;
  check_in_time: string | null;
  check_out_time: string | null;
  description: string | null;
  amenities: unknown;
  house_rules: unknown;
  photos: Array<{
    url: string | null;
    caption: string | null;
    category: string | null;
    is_cover: boolean;
  }>;
};


type Quote = {
  available: boolean;
  nights: number;
  nightly_total: number;
  cleaning_fee: number;
  security_deposit: number;
  grand_total: number;
  currency: string;
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


export default function VillaDetailPage() {

  const params =
    useParams<{
      slug: string;
    }>();

  const searchParams =
    useSearchParams();

  const slug =
    params.slug;


  const [
    villa,
    setVilla,
  ] =
    useState<VillaDetail | null>(
      null
    );

  const [
    quote,
    setQuote,
  ] =
    useState<Quote | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    quoting,
    setQuoting,
  ] =
    useState(false);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    success,
    setSuccess,
  ] =
    useState<{
      code: string;
    } | null>(
      null
    );


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
        searchParams.get(
          "guests"
        ) ?? "2",

      guestName: "",

      phone: "",

      email: "",

    });


  const loadVilla =
    useCallback(
      async () => {

        setLoading(true);
        setError("");

        const {
          data,
          error: rpcError,
        } =
          await supabase.rpc(
            "get_public_villa_detail",
            {
              p_slug:
                slug,
            }
          );


        if (rpcError) {

          setError(
            rpcError.message
          );

        } else {

          setVilla(
            data as VillaDetail
          );

        }

        setLoading(false);

      },
      [
        slug,
      ]
    );


  useEffect(
    () => {
      void loadVilla();
    },
    [
      loadVilla,
    ]
  );


  async function getQuote() {

    if (
      !form.checkIn ||
      !form.checkOut
    ) {

      setError(
        "Giriş ve çıkış tarihlerini seç."
      );

      return;

    }


    setQuoting(true);
    setError("");
    setQuote(null);


    const {
      data,
      error: rpcError,
    } =
      await supabase.rpc(
        "public_quote_villa_marketplace",
        {

          p_slug:
            slug,

          p_guest_count:
            Number(
              form.guests ||
                1
            ),

          p_check_in:
            form.checkIn,

          p_check_out:
            form.checkOut,

        }
      );


    if (rpcError) {

      setError(
        rpcError.message
      );

    } else {

      setQuote(
        data as Quote
      );

    }

    setQuoting(false);

  }


  async function createReservation(
    event: FormEvent
  ) {

    event.preventDefault();

    if (!quote) {

      setError(
        "Önce tarihlerin müsaitliğini kontrol et."
      );

      return;

    }


    if (
      !form.guestName.trim() ||
      !form.phone.trim()
    ) {

      setError(
        "Ad soyad ve telefon zorunludur."
      );

      return;

    }


    setSaving(true);
    setError("");


    const {
      data,
      error: rpcError,
    } =
      await supabase.rpc(
        "create_public_villa_marketplace_reservation",
        {

          p_slug:
            slug,

          p_guest_name:
            form.guestName,

          p_guest_phone:
            form.phone,

          p_guest_email:
            form.email,

          p_guest_count:
            Number(
              form.guests ||
                1
            ),

          p_check_in:
            form.checkIn,

          p_check_out:
            form.checkOut,

        }
      );


    if (rpcError) {

      setError(
        rpcError.message
      );

      setQuote(null);

    } else {

      const result =
        data as {
          reservation_code:
            string;
        };

      setSuccess({
        code:
          result.reservation_code,
      });

    }

    setSaving(false);

  }


  if (loading) {

    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <Navbar />
        <div className="flex min-h-screen items-center justify-center text-slate-500">
          Villa hazırlanıyor...
        </div>
      </main>
    );

  }


  if (!villa) {

    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <Navbar />

        <div className="mx-auto max-w-4xl px-5 pb-20 pt-36 text-center">

          <h1 className="text-3xl font-black">
            Villa bulunamadı
          </h1>

          <Link
            href="/villalar"
            className="mt-6 inline-block rounded-xl bg-orange-500 px-5 py-3 font-black"
          >
            Villalara Dön
          </Link>

        </div>

      </main>
    );

  }


  const images =
    villa.photos
      ?.filter(
        (photo) =>
          Boolean(photo.url)
      )
      .slice(0, 5) ?? [];


  return (
    <main className="min-h-screen bg-slate-950 text-white">

      <Navbar />


      <div className="mx-auto max-w-7xl px-5 pb-20 pt-28">


        <Link
          href="/villalar"
          className="text-sm font-black text-orange-400"
        >
          ← Villalara Dön
        </Link>


        <div className="mt-5 flex flex-wrap items-start justify-between gap-4">

          <div>

            <h1 className="text-3xl font-black md:text-5xl">
              {villa.name}
            </h1>

            <div className="mt-3 flex items-center gap-2 text-sm text-slate-400">
              <FaMapMarkerAlt className="text-orange-400" />
              {[villa.city, villa.district]
                .filter(Boolean)
                .join(" · ")}
            </div>

          </div>


          <div className="rounded-2xl border border-white/10 bg-white/[.04] px-5 py-4">

            <div className="text-[10px] font-black uppercase text-slate-500">
              Gecelik başlangıç
            </div>

            <div className="mt-1 text-2xl font-black text-orange-400">
              {money(
                villa.base_nightly_rate,
                villa.currency
              )}
            </div>

          </div>

        </div>


        {images.length > 0 && (

          <div className="mt-7 grid gap-2 overflow-hidden rounded-[28px] md:grid-cols-2">

            <div className="aspect-[4/3] overflow-hidden bg-slate-900 md:row-span-2">

              <img
                src={
                  images[0]?.url ??
                  ""
                }
                alt={villa.name}
                className="h-full w-full object-cover"
              />

            </div>


            <div className="grid grid-cols-2 gap-2">

              {images
                .slice(1, 5)
                .map(
                  (
                    photo,
                    index
                  ) => (

                    <div
                      key={
                        `${photo.url}-${index}`
                      }
                      className="aspect-[4/3] overflow-hidden bg-slate-900"
                    >

                      <img
                        src={
                          photo.url ??
                          ""
                        }
                        alt=""
                        className="h-full w-full object-cover"
                      />

                    </div>

                  )
                )}

            </div>

          </div>

        )}


        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_390px]">


          <div>

            <div className="flex flex-wrap gap-3">

              <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[.04] px-4 py-2 text-sm font-bold">
                <FaUsers className="text-orange-400" />
                {villa.max_guests} misafir
              </span>

              <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[.04] px-4 py-2 text-sm font-bold">
                <FaBed className="text-orange-400" />
                {villa.bedrooms} yatak odası
              </span>

              <span className="rounded-full border border-white/10 bg-white/[.04] px-4 py-2 text-sm font-bold">
                {villa.bathrooms} banyo
              </span>

              <span className="rounded-full border border-white/10 bg-white/[.04] px-4 py-2 text-sm font-bold">
                Min. {villa.minimum_stay} gece
              </span>

            </div>


            <section className="mt-8 border-t border-white/10 pt-8">

              <h2 className="text-2xl font-black">
                Villa hakkında
              </h2>

              <p className="mt-4 whitespace-pre-line leading-8 text-slate-400">
                {villa.description ||
                  "Turobus Villa ağı üzerinden merkezi müsaitlik ve güvenli rezervasyon yönetimiyle sunulmaktadır."}
              </p>

            </section>


            <section className="mt-8 border-t border-white/10 pt-8">

              <h2 className="text-xl font-black">
                Konaklama Bilgileri
              </h2>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">

                <div className="rounded-2xl bg-white/[.04] p-4">
                  <div className="text-xs text-slate-500">
                    Giriş
                  </div>
                  <div className="mt-1 font-black">
                    {villa.check_in_time ||
                      "15:00"}
                  </div>
                </div>

                <div className="rounded-2xl bg-white/[.04] p-4">
                  <div className="text-xs text-slate-500">
                    Çıkış
                  </div>
                  <div className="mt-1 font-black">
                    {villa.check_out_time ||
                      "11:00"}
                  </div>
                </div>

              </div>

            </section>

          </div>


          <aside>

            <div className="sticky top-28 rounded-[28px] border border-white/10 bg-slate-900 p-5 shadow-2xl">


              {success ? (

                <div className="py-5 text-center">

                  <FaCheckCircle className="mx-auto text-5xl text-emerald-400" />

                  <h3 className="mt-5 text-2xl font-black">
                    Talebin alındı
                  </h3>

                  <p className="mt-3 text-sm leading-6 text-slate-400">
                    Rezervasyon kodun:
                  </p>

                  <div className="mt-3 rounded-xl bg-white/[.05] p-4 text-xl font-black text-orange-400">
                    {success.code}
                  </div>

                  <p className="mt-4 text-xs leading-5 text-slate-500">
                    Rezervasyon Villa OS operasyon merkezine aktarıldı.
                  </p>

                </div>

              ) : (

                <form
                  onSubmit={
                    createReservation
                  }
                >

                  <div className="text-lg font-black">
                    Tarihini seç
                  </div>


                  <div className="mt-4 grid grid-cols-2 gap-2">

                    <label>
                      <span className="mb-1 block text-[10px] font-black uppercase text-slate-500">
                        Giriş
                      </span>

                      <input
                        type="date"
                        value={
                          form.checkIn
                        }
                        onChange={(event) => {
                          setForm({
                            ...form,
                            checkIn:
                              event.target.value,
                          });
                          setQuote(null);
                        }}
                        className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 outline-none"
                      />
                    </label>


                    <label>
                      <span className="mb-1 block text-[10px] font-black uppercase text-slate-500">
                        Çıkış
                      </span>

                      <input
                        type="date"
                        value={
                          form.checkOut
                        }
                        onChange={(event) => {
                          setForm({
                            ...form,
                            checkOut:
                              event.target.value,
                          });
                          setQuote(null);
                        }}
                        className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 outline-none"
                      />
                    </label>

                  </div>


                  <label className="mt-3 block">

                    <span className="mb-1 block text-[10px] font-black uppercase text-slate-500">
                      Misafir Sayısı
                    </span>

                    <input
                      type="number"
                      min="1"
                      max={
                        villa.max_guests
                      }
                      value={
                        form.guests
                      }
                      onChange={(event) => {
                        setForm({
                          ...form,
                          guests:
                            event.target.value,
                        });
                        setQuote(null);
                      }}
                      className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 outline-none"
                    />

                  </label>


                  <button
                    type="button"
                    disabled={quoting}
                    onClick={() =>
                      void getQuote()
                    }
                    className="mt-3 w-full rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-sm font-black text-orange-400"
                  >
                    {quoting
                      ? "Müsaitlik kontrol ediliyor..."
                      : "Müsaitliği ve Fiyatı Kontrol Et"}
                  </button>


                  {error && (
                    <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">
                      {error}
                    </div>
                  )}


                  {quote && (

                    <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/[.04] p-4">

                      <div className="flex items-center gap-2 text-sm font-black text-emerald-300">
                        <FaCalendarCheck />
                        Tarihler müsait
                      </div>


                      <div className="mt-4 space-y-2 text-sm">

                        <div className="flex justify-between">
                          <span className="text-slate-500">
                            {quote.nights} gece
                          </span>
                          <strong>
                            {money(
                              quote.nightly_total,
                              quote.currency
                            )}
                          </strong>
                        </div>

                        <div className="flex justify-between">
                          <span className="text-slate-500">
                            Temizlik
                          </span>
                          <strong>
                            {money(
                              quote.cleaning_fee,
                              quote.currency
                            )}
                          </strong>
                        </div>

                        <div className="border-t border-white/10 pt-3">

                          <div className="text-[10px] uppercase text-slate-500">
                            Toplam Konaklama
                          </div>

                          <div className="mt-1 text-2xl font-black text-orange-400">
                            {money(
                              quote.grand_total,
                              quote.currency
                            )}
                          </div>

                        </div>

                        <div className="text-[10px] text-slate-500">
                          Hasar depozitosu:{" "}
                          {money(
                            quote.security_deposit,
                            quote.currency
                          )}
                        </div>

                      </div>

                    </div>

                  )}


                  {quote && (

                    <>

                      <div className="mt-5 border-t border-white/10 pt-5">

                        <div className="text-sm font-black">
                          İletişim Bilgileri
                        </div>

                      </div>


                      <label className="mt-3 block">

                        <span className="mb-1 block text-[10px] font-black uppercase text-slate-500">
                          Ad Soyad
                        </span>

                        <input
                          value={
                            form.guestName
                          }
                          onChange={(event) =>
                            setForm({
                              ...form,
                              guestName:
                                event.target.value,
                            })
                          }
                          placeholder="Ad Soyad"
                          className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 outline-none"
                        />

                      </label>


                      <label className="mt-3 block">

                        <span className="mb-1 block text-[10px] font-black uppercase text-slate-500">
                          Telefon
                        </span>

                        <input
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
                          className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 outline-none"
                        />

                      </label>


                      <label className="mt-3 block">

                        <span className="mb-1 block text-[10px] font-black uppercase text-slate-500">
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
                          className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 outline-none"
                        />

                      </label>


                      <button
                        disabled={saving}
                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-4 font-black transition hover:bg-orange-600 disabled:opacity-50"
                      >
                        <FaCheckCircle />
                        {saving
                          ? "Rezervasyon oluşturuluyor..."
                          : "Rezervasyon Talebi Oluştur"}
                      </button>

                    </>

                  )}


                  <div className="mt-4 flex items-start gap-2 rounded-xl bg-white/[.03] p-3 text-[10px] leading-5 text-slate-500">

                    <FaShieldAlt className="mt-1 shrink-0 text-emerald-400" />

                    <span>
                      Müsaitlik kaydetme anında tekrar kontrol edilir. Aynı villa aynı tarihlerde iki kez satılamaz.
                    </span>

                  </div>

                </form>

              )}

            </div>

          </aside>

        </div>

      </div>


      <Footer />

    </main>
  );
}
