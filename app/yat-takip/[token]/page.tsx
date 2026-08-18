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
  FaClock,
  FaMapMarkerAlt,
  FaShip,
  FaUsers,
} from "react-icons/fa";

import {
  supabase,
} from "@/lib/supabase";


type TrackingData = {
  booking_code: string;
  guest_name: string;
  guest_count: number;
  start_date: string;
  end_date: string;
  departure_time: string | null;
  return_time: string | null;
  status: string;
  payment_status: string;
  operation_status: string;
  yacht: {
    name: string;
    type: string;
    city: string;
    marina: string | null;
    departure_point: string | null;
    captain_name: string | null;
    cover_url: string | null;
  };
};


const steps = [
  ["preparing", "Hazırlanıyor"],
  ["ready", "Tekne Hazır"],
  ["guest_arrived", "Misafir Geldi"],
  ["departed", "Çıkış Yapıldı"],
  ["cruising", "Seyirde"],
  ["returning", "Dönüşte"],
  ["completed", "Tamamlandı"],
];


function dateText(
  value: string
) {
  return new Intl.DateTimeFormat(
    "tr-TR",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }
  ).format(
    new Date(
      `${value}T12:00:00`
    )
  );
}


export default function YachtTrackingPage() {
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
      TrackingData | null
    >(null);

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
        setLoading(true);

        const {
          data:
            response,
          error:
            requestError,
        } =
          await supabase.rpc(
            "get_public_yacht_tracking",
            {
              p_token:
                token,
            }
          );

        if (
          requestError ||
          !response
        ) {
          setError(
            "Takip kaydı bulunamadı."
          );

          setLoading(
            false
          );

          return;
        }

        setData(
          response as
            TrackingData
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


  if (
    error ||
    !data
  ) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#030a11] p-6 text-white">
        <div className="max-w-md rounded-[28px] border border-red-500/20 bg-[#07131f] p-8 text-center">
          <FaAnchor className="mx-auto text-3xl text-red-400" />

          <h1 className="mt-4 text-xl font-black">
            Takip bağlantısı bulunamadı
          </h1>
        </div>
      </main>
    );
  }


  const currentIndex =
    steps.findIndex(
      (
        step
      ) =>
        step[0] ===
        data.operation_status
    );


  return (
    <main className="min-h-screen bg-[#030a11] px-4 py-8 text-white">
      <div className="mx-auto max-w-3xl">

        <div className="rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,.18),transparent_35%),#07131f] p-6 sm:p-8">

          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-orange-500/10 text-xl text-orange-400">
              <FaShip />
            </div>

            <div>
              <div className="text-[9px] font-black uppercase tracking-[.2em] text-orange-400">
                TUROBUS CANLI TAKİP
              </div>

              <h1 className="mt-1 text-2xl font-black">
                {data.yacht.name}
              </h1>
            </div>
          </div>


          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Info
              icon={<FaCalendarAlt />}
              label="Tarih"
              value={dateText(
                data.start_date
              )}
            />

            <Info
              icon={<FaUsers />}
              label="Misafir"
              value={`${data.guest_count} kişi`}
            />

            <Info
              icon={<FaMapMarkerAlt />}
              label="Kalkış"
              value={
                data.yacht
                  .departure_point ??
                data.yacht
                  .marina ??
                data.yacht.city
              }
            />
          </div>
        </div>


        <div className="mt-5 rounded-[28px] border border-white/10 bg-[#07131f] p-6">
          <div className="text-sm font-black">
            Operasyon Durumu
          </div>

          <div className="mt-6 space-y-2">
            {steps.map(
              (
                step,
                index
              ) => {
                const complete =
                  index <
                  currentIndex;

                const active =
                  index ===
                  currentIndex;

                return (
                  <div
                    key={
                      step[0]
                    }
                    className={`flex items-center gap-4 rounded-2xl border p-4 ${
                      active
                        ? "border-orange-500/30 bg-orange-500/[.08]"
                        : complete
                          ? "border-emerald-500/10 bg-emerald-500/[.03]"
                          : "border-white/[.06] bg-white/[.015]"
                    }`}
                  >
                    <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${
                      complete
                        ? "bg-emerald-500/10 text-emerald-400"
                        : active
                          ? "bg-orange-500 text-white"
                          : "bg-white/[.04] text-slate-600"
                    }`}>
                      {complete
                        ? <FaCheckCircle />
                        : <FaClock />}
                    </div>

                    <div>
                      <div className="text-xs font-black">
                        {step[1]}
                      </div>

                      {active && (
                        <div className="mt-1 text-[9px] text-orange-300">
                          Şu anki durum
                        </div>
                      )}
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </div>


        <div className="mt-5 rounded-[28px] border border-white/10 bg-[#07131f] p-6">
          <div className="text-[9px] font-black uppercase tracking-wider text-slate-600">
            Rezervasyon
          </div>

          <div className="mt-2 text-xl font-black">
            {data.booking_code}
          </div>

          <div className="mt-1 text-xs text-slate-400">
            {data.guest_name}
          </div>
        </div>

      </div>
    </main>
  );
}


function Info({
  icon,
  label,
  value,
}: {
  icon:
    React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[.07] bg-black/10 p-4">
      <div className="flex items-center gap-2 text-orange-400">
        {icon}

        <span className="text-[8px] font-black uppercase">
          {label}
        </span>
      </div>

      <div className="mt-2 text-[10px] font-black">
        {value}
      </div>
    </div>
  );
}
