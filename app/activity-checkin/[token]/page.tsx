"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  useParams,
} from "next/navigation";

import Link from "next/link";

import {
  FaCheckCircle,
  FaQrcode,
} from "react-icons/fa";

import {
  supabase,
} from "@/lib/supabase";


export default function ActivityCheckinPage() {

  const params =
    useParams<{
      token: string;
    }>();


  const [
    loading,
    setLoading,
  ] =
    useState(true);


  const [
    result,
    setResult,
  ] =
    useState<{
      booking_code?: string;
      customer_name?: string;
      status?: string;
    } | null>(
      null
    );


  const [
    error,
    setError,
  ] =
    useState("");


  useEffect(
    () => {

      async function run() {

        const {
          data: {
            user,
          },
        } =
          await supabase.auth.getUser();


        if (!user) {
          window.location.href =
            `/giris?next=/activity-checkin/${params.token}`;
          return;
        }


        const {
          data,
          error:
            rpcError,
        } =
          await supabase.rpc(
            "activity_os_checkin_by_token",
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
          setResult(
            data
          );
        }


        setLoading(
          false
        );

      }


      void run();

    },
    [
      params.token,
    ]
  );


  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 p-5 text-white">

      <div className="w-full max-w-lg rounded-[32px] border border-white/10 bg-[#07131f] p-8 text-center">

        {loading ? (
          <>
            <FaQrcode className="mx-auto animate-pulse text-5xl text-orange-400" />

            <div className="mt-5 text-xl font-black">
              Rezervasyon kontrol ediliyor...
            </div>
          </>
        ) : error ? (
          <>
            <div className="text-3xl">
              ⚠️
            </div>

            <h1 className="mt-4 text-2xl font-black">
              Check-in yapılamadı
            </h1>

            <p className="mt-3 text-sm text-red-300">
              {error}
            </p>
          </>
        ) : (
          <>
            <FaCheckCircle className="mx-auto text-6xl text-emerald-400" />

            <div className="mt-5 text-[10px] font-black uppercase tracking-[.18em] text-emerald-300">
              CHECK-IN BAŞARILI
            </div>

            <h1 className="mt-2 text-3xl font-black">
              {result?.customer_name}
            </h1>

            <div className="mt-2 text-sm text-slate-500">
              {result?.booking_code}
            </div>

            <div className="mt-6 rounded-xl bg-emerald-500/10 p-4 font-black text-emerald-300">
              Rezervasyon check-in durumuna geçirildi.
            </div>
          </>
        )}


        <Link
          href="/dashboard/activity-control-center"
          className="mt-7 inline-flex rounded-xl bg-orange-500 px-5 py-3 text-sm font-black"
        >
          Operasyon Merkezine Dön
        </Link>

      </div>

    </main>
  );
}
