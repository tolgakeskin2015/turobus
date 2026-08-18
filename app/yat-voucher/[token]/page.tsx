"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  useParams,
} from "next/navigation";

import {
  FaAnchor,
  FaCalendarAlt,
  FaCheckCircle,
  FaMapMarkerAlt,
  FaShip,
  FaUsers,
} from "react-icons/fa";

import {
  supabase,
} from "@/lib/supabase";


type VoucherData = {
  booking_code: string;
  guest_name: string;
  guest_count: number;
  start_date: string;
  end_date: string;
  departure_time: string | null;
  return_time: string | null;
  status: string;
  payment_status: string;
  total_amount: number;
  paid_amount: number;
  currency: string;
  yacht: {
    name: string;
    type: string;
    city: string;
    marina: string | null;
    departure_point: string | null;
    max_guests: number;
    captain_name: string | null;
    captain_included: boolean;
    fuel_included: boolean;
    meals_included: boolean;
  };
};


function money(
  value: number,
  currency: string
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


export default function YachtVoucherPage() {
  const params =
    useParams<{
      token: string;
    }>();

  const token =
    String(
      params?.token ??
      ""
    );

  const [
    data,
    setData,
  ] =
    useState<
      VoucherData | null
    >(null);

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
            response,
        } =
          await supabase.rpc(
            "get_public_yacht_voucher",
            {
              p_token:
                token,
            }
          );

        setData(
          (
            response ??
            null
          ) as
            VoucherData | null
        );

        setLoading(
          false
        );
      }

      if (token) {
        void load();
      }
    },
    [
      token,
    ]
  );


  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#030a11] text-white">
        <FaShip className="animate-pulse text-4xl text-orange-400" />
      </main>
    );
  }


  if (!data) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#030a11] text-white">
        Voucher bulunamadı.
      </main>
    );
  }


  return (
    <main className="min-h-screen bg-[#030a11] px-4 py-8 text-white">
      <article className="mx-auto max-w-3xl overflow-hidden rounded-[34px] border border-white/10 bg-[#07131f] shadow-2xl">

        <header className="bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,.2),transparent_40%),#07131f] p-7 sm:p-9">
          <div className="text-[9px] font-black uppercase tracking-[.24em] text-orange-400">
            TUROBUS DIGITAL VOUCHER
          </div>

          <div className="mt-5 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black">
                {data.yacht.name}
              </h1>

              <div className="mt-2 text-xs text-slate-400">
                {data.booking_code}
              </div>
            </div>

            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-orange-500 text-xl">
              <FaAnchor />
            </div>
          </div>
        </header>


        <div className="border-t border-white/10 p-7 sm:p-9">

          <div className="grid gap-3 sm:grid-cols-2">
            <Card
              icon={<FaUsers />}
              label="Misafir"
              value={data.guest_name}
              detail={`${data.guest_count} kişi`}
            />

            <Card
              icon={<FaCalendarAlt />}
              label="Tarih"
              value={data.start_date}
              detail={
                data.end_date !==
                data.start_date
                  ? `Bitiş: ${data.end_date}`
                  : "Günlük kiralama"
              }
            />

            <Card
              icon={<FaMapMarkerAlt />}
              label="Kalkış"
              value={
                data.yacht
                  .departure_point ??
                data.yacht
                  .marina ??
                data.yacht.city
              }
              detail={data.yacht.city}
            />

            <Card
              icon={<FaShip />}
              label="Tekne"
              value={data.yacht.name}
              detail={
                data.yacht
                  .captain_name
                  ? `Kaptan: ${data.yacht.captain_name}`
                  : data.yacht.type
              }
            />
          </div>


          <div className="mt-6 rounded-[24px] border border-white/10 bg-black/10 p-5">
            <div className="flex items-center gap-2">
              <FaCheckCircle className="text-emerald-400" />

              <span className="text-xs font-black">
                Rezervasyon Bilgisi
              </span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-4">
              <div>
                <div className="text-[8px] uppercase text-slate-600">
                  Toplam
                </div>

                <div className="mt-1 text-sm font-black">
                  {money(
                    data.total_amount,
                    data.currency
                  )}
                </div>
              </div>

              <div>
                <div className="text-[8px] uppercase text-slate-600">
                  Tahsil
                </div>

                <div className="mt-1 text-sm font-black text-emerald-300">
                  {money(
                    data.paid_amount,
                    data.currency
                  )}
                </div>
              </div>
            </div>
          </div>


          <div className="mt-6 text-center text-[9px] leading-5 text-slate-600">
            Bu belge Turobus Yat & Tekne OS tarafından oluşturulmuş dijital rezervasyon belgesidir.
          </div>

        </div>
      </article>
    </main>
  );
}


function Card({
  icon,
  label,
  value,
  detail,
}: {
  icon:
    React.ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[.07] bg-white/[.02] p-5">
      <div className="flex items-center gap-2 text-orange-400">
        {icon}

        <span className="text-[8px] font-black uppercase">
          {label}
        </span>
      </div>

      <div className="mt-3 text-sm font-black">
        {value}
      </div>

      <div className="mt-1 text-[9px] text-slate-500">
        {detail}
      </div>
    </div>
  );
}
