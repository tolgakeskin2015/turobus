"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  useParams,
} from "next/navigation";

import QRCode from "qrcode";

import {
  FaCalendarAlt,
  FaCheckCircle,
  FaClock,
  FaMapMarkerAlt,
  FaPrint,
  FaQrcode,
  FaUsers,
} from "react-icons/fa";

import {
  supabase,
} from "@/lib/supabase";


type Voucher = {
  booking_code: string;
  customer_name: string;
  activity_name: string;
  service_date: string;
  start_time: string | null;
  quantity: number;
  status: string;
  payment_status: string;
  hotel_name: string | null;
  pickup_location: string | null;
  company: {
    name: string;
    logo_url: string | null;
    phone: string | null;
    email: string | null;
  };
};


export default function ActivityVoucherPage() {

  const params =
    useParams<{
      token: string;
    }>();


  const [
    data,
    setData,
  ] =
    useState<Voucher | null>(
      null
    );


  const [
    qr,
    setQr,
  ] =
    useState("");


  const [
    loading,
    setLoading,
  ] =
    useState(true);


  useEffect(
    () => {

      async function load() {

        const {
          data:
            result,
          error,
        } =
          await supabase.rpc(
            "get_public_activity_guest_portal",
            {
              p_token:
                params.token,
            }
          );


        if (
          !error &&
          result
        ) {
          setData(
            result as Voucher
          );


          const checkinUrl =
            `${window.location.origin}/activity-checkin/${params.token}`;


          const image =
            await QRCode.toDataURL(
              checkinUrl,
              {
                width:
                  420,
                margin:
                  1,
              }
            );


          setQr(
            image
          );
        }


        setLoading(
          false
        );

      }


      void load();

    },
    [
      params.token,
    ]
  );


  if (
    loading
  ) {
    return (
      <main className="min-h-screen bg-slate-100 p-8">
        <div className="mx-auto h-[700px] max-w-3xl animate-pulse rounded-3xl bg-white" />
      </main>
    );
  }


  if (
    !data
  ) {
    return (
      <main className="min-h-screen bg-slate-100 p-10 text-center text-slate-900">
        Voucher bulunamadı.
      </main>
    );
  }


  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950 print:bg-white print:p-0">

      <div className="mx-auto max-w-3xl overflow-hidden rounded-[32px] bg-white shadow-2xl print:shadow-none">

        <div className="bg-[#07131f] p-7 text-white">

          <div className="flex items-center justify-between gap-5">

            <div>
              <div className="text-[10px] font-black uppercase tracking-[.18em] text-orange-400">
                TUROBUS ACTIVITY VOUCHER
              </div>

              <h1 className="mt-2 text-3xl font-black">
                {data.activity_name}
              </h1>

              <div className="mt-2 text-sm text-slate-400">
                {data.company.name}
              </div>
            </div>


            {data.company.logo_url && (
              <img
                src={
                  data.company.logo_url
                }
                alt={
                  data.company.name
                }
                className="h-16 w-16 rounded-2xl bg-white object-contain p-2"
              />
            )}

          </div>

        </div>


        <div className="p-7">

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">

            <div className="text-[9px] font-black uppercase text-slate-400">
              Rezervasyon
            </div>

            <div className="mt-1 text-2xl font-black">
              {data.booking_code}
            </div>

            <div className="mt-2 text-lg font-bold">
              {data.customer_name}
            </div>

          </div>


          <div className="mt-5 grid gap-3 sm:grid-cols-2">

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

                const I =
                  Icon as typeof FaCalendarAlt;


                return (
                  <div
                    key={
                      String(
                        label
                      )
                    }
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <I className="text-orange-500" />

                    <div className="mt-3 text-[9px] uppercase text-slate-400">
                      {String(
                        label
                      )}
                    </div>

                    <div className="mt-1 font-black">
                      {String(
                        value
                      )}
                    </div>
                  </div>
                );

              }
            )}

          </div>


          {(data.hotel_name ||
            data.pickup_location) && (
            <div className="mt-5 rounded-2xl border border-orange-200 bg-orange-50 p-5">

              <div className="flex gap-3">
                <FaMapMarkerAlt className="mt-1 text-orange-500" />

                <div>
                  <div className="font-black">
                    Pickup / Konum
                  </div>

                  <div className="mt-1 text-sm text-slate-600">
                    {data.pickup_location ??
                      data.hotel_name}
                  </div>
                </div>
              </div>

            </div>
          )}


          <div className="mt-7 grid gap-6 sm:grid-cols-[1fr_220px] sm:items-center">

            <div>

              <div className="flex items-center gap-2">
                <FaQrcode className="text-orange-500" />

                <div className="font-black">
                  Operasyon QR
                </div>
              </div>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Operasyon personeli bu QR kodu okutarak rezervasyonu kontrol edip check-in yapabilir.
              </p>


              <button
                type="button"
                onClick={() =>
                  window.print()
                }
                className="mt-5 flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white print:hidden"
              >
                <FaPrint />
                Yazdır / PDF
              </button>

            </div>


            {qr && (
              <img
                src={
                  qr
                }
                alt="Check-in QR"
                className="w-full rounded-2xl border border-slate-200"
              />
            )}

          </div>

        </div>

      </div>

    </main>
  );
}
