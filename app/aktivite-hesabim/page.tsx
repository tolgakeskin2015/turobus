"use client";

import {
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import {
  FaArrowRight,
  FaCalendarAlt,
  FaCheckCircle,
  FaMapMarkerAlt,
} from "react-icons/fa";

import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";

import {
  supabase,
} from "@/lib/supabase";


type Reservation = {
  booking_code: string;
  guest_token: string;
  activity_name: string;
  company_name: string;
  service_date: string;
  start_time: string | null;
  quantity: number;
  status: string;
  payment_status: string;
  sale_total: number;
  paid_total: number;
  currency: string;
  hotel_name: string | null;
  pickup_location: string | null;
  cover_image_url: string | null;
};


export default function ActivityAccountPage() {

  const [
    reservations,
    setReservations,
  ] =
    useState<Reservation[]>(
      []
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
          data: {
            user,
          },
        } =
          await supabase.auth.getUser();


        if (!user) {
          window.location.href =
            "/giris?next=/aktivite-hesabim";
          return;
        }


        const {
          data,
          error:
            rpcError,
        } =
          await supabase.rpc(
            "get_my_activity_guest_reservations"
          );


        if (
          rpcError
        ) {
          setError(
            rpcError.message
          );
        } else {
          setReservations(
            (
              data ??
              []
            ) as Reservation[]
          );
        }


        setLoading(
          false
        );

      }


      void load();

    },
    []
  );


  return (
    <main className="min-h-screen bg-[#040b12] text-white">

      <Navbar />


      <section className="px-5 pb-20 pt-32 lg:px-8">

        <div className="mx-auto max-w-6xl">

          <div className="text-[10px] font-black uppercase tracking-[.18em] text-orange-400">
            TUROBUS HESABIM
          </div>

          <h1 className="mt-2 text-4xl font-black">
            Aktivite Rezervasyonlarım
          </h1>

          <p className="mt-3 text-sm text-slate-500">
            Turobus hesabına bağlanan tüm aktivite rezervasyonlarını tek yerden takip et.
          </p>


          {error && (
            <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-300">
              {error}
            </div>
          )}


          {loading ? (
            <div className="mt-8 h-72 animate-pulse rounded-3xl bg-white/[.04]" />
          ) : (
            <div className="mt-8 grid gap-5 md:grid-cols-2">

              {reservations.map(
                (
                  item
                ) => (

                  <div
                    key={
                      item.booking_code
                    }
                    className="overflow-hidden rounded-3xl border border-white/10 bg-[#07131f]"
                  >

                    {item.cover_image_url && (
                      <img
                        src={
                          item.cover_image_url
                        }
                        alt={
                          item.activity_name
                        }
                        className="h-48 w-full object-cover"
                      />
                    )}


                    <div className="p-6">

                      <div className="flex items-center justify-between gap-4">

                        <div>
                          <div className="text-[9px] font-black uppercase text-orange-400">
                            {item.booking_code}
                          </div>

                          <h2 className="mt-1 text-xl font-black">
                            {item.activity_name}
                          </h2>

                          <div className="mt-1 text-xs text-slate-500">
                            {item.company_name}
                          </div>
                        </div>


                        <FaCheckCircle className="text-emerald-400" />

                      </div>


                      <div className="mt-5 space-y-2 text-sm text-slate-400">

                        <div className="flex items-center gap-2">
                          <FaCalendarAlt />
                          {item.service_date}
                          {" · "}
                          {item.start_time?.slice(
                            0,
                            5
                          ) ??
                            "-"}
                        </div>

                        {(item.pickup_location ||
                          item.hotel_name) && (
                          <div className="flex items-center gap-2">
                            <FaMapMarkerAlt />
                            {item.pickup_location ??
                              item.hotel_name}
                          </div>
                        )}

                      </div>


                      <Link
                        href={`/activity-misafir/${item.guest_token}`}
                        className="mt-5 flex items-center justify-between rounded-xl bg-orange-500 px-5 py-4 text-sm font-black"
                      >
                        Rezervasyonu Aç
                        <FaArrowRight />
                      </Link>

                    </div>

                  </div>
                )
              )}


              {reservations.length ===
                0 && (
                <div className="md:col-span-2 rounded-3xl border border-dashed border-white/10 p-12 text-center text-slate-500">
                  Henüz hesabına bağlı aktivite rezervasyonu bulunmuyor.
                </div>
              )}

            </div>
          )}

        </div>

      </section>


      <Footer />

    </main>
  );
}
