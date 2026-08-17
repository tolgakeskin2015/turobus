"use client";

import {
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import {
  useParams,
} from "next/navigation";

import {
  FaArrowRight,
  FaCalendarAlt,
  FaCheckCircle,
  FaClock,
  FaMapMarkerAlt,
  FaMoneyBillWave,
  FaRoute,
  FaStar,
  FaUsers,
} from "react-icons/fa";

import {
  supabase,
} from "@/lib/supabase";

import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";


type Portal = {
  booking_code: string;
  customer_name: string;

  activity_name: string;
  activity_category: string;

  city: string | null;
  district: string | null;

  service_date: string;
  start_time: string | null;

  quantity: number;
  status: string;

  payment_status: string;

  sale_total: number;
  paid_total: number;
  remaining_total: number;

  currency: string;

  hotel_name: string | null;
  room_no: string | null;

  pickup_required: boolean;
  pickup_location: string | null;
  pickup_time: string | null;

  special_notes: string | null;

  cover_image_url: string | null;

  company: {
    name: string;
    logo_url: string | null;
    phone: string | null;
    email: string | null;
  };
};


function money(
  value: number,
  currency:
    string
) {
  return new Intl.NumberFormat(
    "tr-TR",
    {
      style:
        "currency",
      currency,
      maximumFractionDigits:
        0,
    }
  ).format(value);
}


export default function ActivityGuestPage() {

  const params =
    useParams<{
      token: string;
    }>();


  const [
    data,
    setData,
  ] =
    useState<Portal | null>(
      null
    );


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


  useEffect(
    () => {

      async function load() {

        const {
          data:
            result,
          error:
            rpcError,
        } =
          await supabase.rpc(
            "get_public_activity_guest_portal",
            {
              p_token:
                params.token,
            }
          );


        if (
          rpcError
        ) {

          setError(
            rpcError.message
          );

        } else {

          setData(
            result as Portal
          );

        }


        setLoading(
          false
        );

      }


      if (
        params.token
      ) {
        void load();
      }

    },
    [
      params.token,
    ]
  );


  if (
    loading
  ) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <Navbar />
        <div className="mx-auto max-w-5xl px-5 pt-36">
          <div className="h-96 animate-pulse rounded-3xl bg-white/[.04]" />
        </div>
      </main>
    );
  }


  if (
    error ||
    !data
  ) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <Navbar />

        <div className="mx-auto max-w-3xl px-5 pt-40 text-center">
          <h1 className="text-3xl font-black">
            Rezervasyon bulunamadı.
          </h1>

          <Link
            href="/aktiviteler"
            className="mt-6 inline-flex rounded-xl bg-orange-500 px-6 py-4 font-black"
          >
            Aktivitelere Git
          </Link>
        </div>
      </main>
    );
  }


  return (
    <main className="min-h-screen bg-[#040b12] text-white">

      <Navbar />


      <section className="relative overflow-hidden px-5 pb-14 pt-32 lg:px-8">

        {data.cover_image_url && (
          <img
            src={
              data.cover_image_url
            }
            alt={
              data.activity_name
            }
            className="absolute inset-0 h-full w-full object-cover opacity-25"
          />
        )}


        <div className="absolute inset-0 bg-gradient-to-r from-[#040b12] via-[#040b12]/95 to-[#040b12]/60" />


        <div className="relative mx-auto max-w-6xl">

          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-[10px] font-black uppercase text-emerald-300">

            <FaCheckCircle />

            TUROBUS MİSAFİR PORTALI

          </div>


          <h1 className="mt-6 max-w-4xl text-4xl font-black md:text-6xl">
            {data.activity_name}
          </h1>


          <div className="mt-3 text-sm text-slate-400">
            {data.company.name}
            {" · "}
            {data.booking_code}
          </div>

        </div>

      </section>


      <section className="px-5 py-10 lg:px-8">

        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_360px]">

          <div className="space-y-5">

            <div className="grid gap-4 md:grid-cols-2">

              {[
                [
                  FaCalendarAlt,
                  "Tarih",
                  data.service_date,
                ],

                [
                  FaClock,
                  "Saat",
                  data.start_time?.slice(
                    0,
                    5
                  ) ??
                    "-",
                ],

                [
                  FaUsers,
                  "Kişi",
                  `${data.quantity} kişi`,
                ],

                [
                  FaCheckCircle,
                  "Durum",
                  data.status,
                ],
              ].map(
                ([
                  Icon,
                  label,
                  value,
                ]) => {

                  const ItemIcon =
                    Icon as typeof FaCalendarAlt;


                  return (
                    <div
                      key={
                        String(
                          label
                        )
                      }
                      className="rounded-3xl border border-white/10 bg-[#07131f] p-5"
                    >

                      <ItemIcon className="text-orange-400" />

                      <div className="mt-4 text-[9px] uppercase text-slate-500">
                        {String(
                          label
                        )}
                      </div>

                      <div className="mt-1 text-xl font-black">
                        {String(
                          value
                        )}
                      </div>

                    </div>
                  );

                }
              )}

            </div>


            {data.pickup_required && (

              <div className="rounded-3xl border border-orange-500/20 bg-orange-500/10 p-6">

                <div className="flex items-center gap-3">

                  <FaRoute className="text-orange-400" />

                  <h2 className="text-xl font-black">
                    Transfer / Pickup
                  </h2>

                </div>


                <div className="mt-4 text-sm text-orange-100">
                  {data.pickup_location}
                </div>

              </div>

            )}


            <div className="rounded-3xl border border-white/10 bg-[#07131f] p-6">

              <h2 className="text-xl font-black">
                Misafir Bilgisi
              </h2>

              <div className="mt-4 text-lg font-black">
                {data.customer_name}
              </div>

              {data.hotel_name && (
                <div className="mt-2 flex items-center gap-2 text-sm text-slate-400">
                  <FaMapMarkerAlt />
                  {data.hotel_name}
                  {data.room_no
                    ? ` · Oda ${data.room_no}`
                    : ""}
                </div>
              )}

            </div>

          </div>


          <aside>

            <div className="sticky top-28 rounded-3xl border border-white/10 bg-[#07131f] p-6">

              <div className="flex items-center gap-2 text-[10px] font-black uppercase text-orange-400">
                <FaMoneyBillWave />
                ÖDEME DURUMU
              </div>


              <div className="mt-5">

                <div className="text-[9px] uppercase text-slate-600">
                  Toplam
                </div>

                <div className="mt-1 text-2xl font-black">
                  {money(
                    data.sale_total,
                    data.currency
                  )}
                </div>

              </div>


              <div className="mt-4">

                <div className="text-[9px] uppercase text-slate-600">
                  Ödenen
                </div>

                <div className="mt-1 text-xl font-black text-emerald-400">
                  {money(
                    data.paid_total,
                    data.currency
                  )}
                </div>

              </div>


              <div className="mt-4 border-t border-white/10 pt-4">

                <div className="text-[9px] uppercase text-slate-600">
                  Kalan
                </div>

                <div className="mt-1 text-2xl font-black text-orange-400">
                  {money(
                    data.remaining_total,
                    data.currency
                  )}
                </div>

              </div>

            </div>

          </aside>

        </div>


        <div className="mx-auto mt-10 max-w-6xl rounded-[34px] border border-fuchsia-500/20 bg-gradient-to-r from-fuchsia-500/10 to-transparent p-7">

          <div className="flex items-center gap-2 text-[10px] font-black uppercase text-fuchsia-300">
            <FaStar />
            TUROBUS MARKETPLACE
          </div>


          <h2 className="mt-3 text-3xl font-black">
            Tatiline başka bir deneyim ekle.
          </h2>


          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
            Aynı Turobus hesabıyla aktiviteleri, transferleri, yat & tekne seçeneklerini, otelleri ve villaları keşfedebilirsin.
          </p>


          <div className="mt-6 flex flex-wrap gap-3">

            <Link
              href="/aktiviteler"
              className="flex items-center gap-2 rounded-xl bg-fuchsia-500 px-5 py-3 text-sm font-black"
            >
              Aktiviteler
              <FaArrowRight />
            </Link>


            <Link
              href="/yatlar"
              className="flex items-center gap-2 rounded-xl border border-white/10 px-5 py-3 text-sm font-black"
            >
              Yat & Tekne
              <FaArrowRight />
            </Link>


            <Link
              href="/transfer"
              className="flex items-center gap-2 rounded-xl border border-white/10 px-5 py-3 text-sm font-black"
            >
              Transfer
              <FaArrowRight />
            </Link>


            <Link
              href="/villalar"
              className="flex items-center gap-2 rounded-xl border border-white/10 px-5 py-3 text-sm font-black"
            >
              Villalar
              <FaArrowRight />
            </Link>

          </div>

        </div>

      </section>


      <Footer />

    </main>
  );
}
