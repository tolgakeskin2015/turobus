"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FaBus,
  FaCheckCircle,
  FaClock,
  FaMapMarkerAlt,
  FaPhone,
  FaUserTie,
} from "react-icons/fa";

import {
  supabase,
} from "@/lib/supabase";


type Seat = {
  seat_number:
    number;

  seat_type:
    string | null;

  seat_status:
    string | null;

  checkin_status:
    string | null;

  boarded_at:
    string | null;

  boarding_stop_id:
    string | null;

  boarding_stop:
    string | null;

  boarding_address:
    string | null;

  boarding_time:
    string | null;
};


type BusInfo = {
  bus_operation_id:
    string;

  bus_no:
    number;

  status:
    string;

  departure_at:
    string | null;

  return_at:
    string | null;

  guide_name:
    string | null;

  guide_phone:
    string | null;

  operations_phone:
    string | null;

  vehicle_id:
    string | null;

  vehicle_plate:
    string | null;

  vehicle_name:
    string | null;

  seats:
    Seat[];
};


type Props = {
  code:
    string;

  mode:
    "customer" |
    "guide";
};


function dateTime(
  value:
    string | null
) {

  if (!value) {
    return "—";
  }


  const date =
    new Date(value);


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }


  return new Intl.DateTimeFormat(
    "tr-TR",
    {
      day:
        "2-digit",
      month:
        "short",
      hour:
        "2-digit",
      minute:
        "2-digit",
    }
  ).format(date);
}


function statusLabel(
  status:
    string | null
) {

  const labels:
    Record<
      string,
      string
    > = {

      planning:
        "Planlama",

      assigned:
        "Araç Atandı",

      boarding:
        "Biniş Başladı",

      departed:
        "Çıkış Yaptı",

      on_route:
        "Yolda",

      returning:
        "Dönüş Yolunda",

      completed:
        "Tamamlandı",

      cancelled:
        "İptal",
    };


  return (
    labels[
      status || ""
    ]
    ||
    status
    ||
    "—"
  );
}


function checkinLabel(
  value:
    string | null
) {

  if (
    value ===
    "boarded"
  ) {
    return "Bindi";
  }


  if (
    value ===
    "no_show"
  ) {
    return "Gelmedi";
  }


  return "Bekleniyor";
}


export default function BusTrackingContext({
  code,
  mode,
}: Props) {

  const [
    bus,
    setBus,
  ] =
    useState<BusInfo | null>(
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


  const load =
    useCallback(
      async () => {

        const {
          data,
          error:
            rpcError,
        } =
          await supabase.rpc(
            "get_public_tour_tracking",
            {
              p_code:
                code,
            }
          );


        if (
          rpcError
        ) {

          console.error(
            "Otobüs takip bağlamı:",
            rpcError
          );

          setError(
            "Otobüs bilgisi yüklenemedi."
          );

          setBus(
            null
          );

          setLoading(
            false
          );

          return;
        }


        const payload =
          data as {
            bus:
              BusInfo | null;
          } | null;


        setBus(
          payload?.bus ??
          null
        );


        setError("");
        setLoading(false);

      },
      [
        code,
      ]
    );


  useEffect(
    () => {

      void load();


      const timer =
        window.setInterval(
          () => {
            void load();
          },
          20000
        );


      return () => {
        window.clearInterval(
          timer
        );
      };

    },
    [
      load,
    ]
  );


  const seats =
    useMemo(
      () =>
        (
          bus?.seats ??
          []
        ).slice().sort(
          (
            a,
            b
          ) =>
            Number(
              a.seat_number
            )
            -
            Number(
              b.seat_number
            )
        ),
      [
        bus,
      ]
    );


  if (
    loading
  ) {

    return (
      <section className="rounded-[28px] border border-white/10 bg-slate-900 p-6 text-slate-400">
        Otobüs bağlantısı kontrol ediliyor...
      </section>
    );
  }


  if (
    error
  ) {

    return (
      <section className="rounded-[28px] border border-red-500/20 bg-red-500/10 p-6 text-sm text-red-300">
        {error}
      </section>
    );
  }


  if (
    !bus
  ) {

    if (
      mode ===
      "customer"
    ) {
      return null;
    }


    return (
      <section className="rounded-[28px] border border-amber-500/20 bg-amber-500/10 p-6">

        <div className="flex items-start gap-3">

          <FaBus className="mt-1 text-amber-300" />

          <div>

            <h2 className="font-black text-amber-200">
              Rezervasyon henüz otobüse bağlanmamış
            </h2>

            <p className="mt-2 text-sm leading-6 text-amber-100/70">
              Önce Yolcu & Rooming / Otobüs ekranından yolcuyu bir koltuğa bağla. Ardından bu panelden paylaşılan konum aynı otobüsteki müşterilere gider.
            </p>

          </div>

        </div>

      </section>
    );
  }


  return (
    <section className="overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(145deg,#0b1722,#071019)] text-white">

      <div className="border-b border-white/[.07] p-6">

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div className="flex items-center gap-3">

            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-orange-500/15 text-orange-400">
              <FaBus size={22} />
            </div>


            <div>

              <p className="text-[10px] font-black uppercase tracking-[.18em] text-orange-400">

                {mode ===
                  "guide"
                  ? "KONUM PAYLAŞILACAK OTOBÜS"
                  : "OTOBÜS BİLGİLERİNİZ"}

              </p>

              <h2 className="mt-1 text-2xl font-black">

                {bus.bus_no
                  ? `${bus.bus_no}. Otobüs`
                  : "Tur Otobüsü"}

              </h2>

            </div>

          </div>


          <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-xs font-black text-blue-300">
            {statusLabel(
              bus.status
            )}
          </span>

        </div>


        {mode ===
          "guide" && (

          <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/[.07] p-4 text-sm leading-6 text-emerald-200">

            <FaCheckCircle className="mr-2 inline" />

            Bu telefondan başlatacağın canlı konum, bu otobüse bağlı müşterilerin takip ekranında ortak araç konumu olarak görünür.

          </div>
        )}

      </div>


      <div className="grid gap-3 p-6 sm:grid-cols-2 lg:grid-cols-4">

        <div className="rounded-2xl border border-white/[.07] bg-black/20 p-4">

          <p className="text-xs text-slate-500">
            Araç
          </p>

          <p className="mt-2 font-black">
            {bus.vehicle_plate ||
              "Plaka girilmedi"}
          </p>

          {bus.vehicle_name && (
            <p className="mt-1 text-xs text-slate-500">
              {bus.vehicle_name}
            </p>
          )}

        </div>


        <div className="rounded-2xl border border-white/[.07] bg-black/20 p-4">

          <p className="flex items-center gap-2 text-xs text-slate-500">
            <FaUserTie className="text-orange-400" />
            Rehber
          </p>

          <p className="mt-2 font-black">
            {bus.guide_name ||
              "Rehber atanmadı"}
          </p>

          {bus.guide_phone && (

            <a
              href={`tel:${bus.guide_phone}`}
              className="mt-1 inline-flex items-center gap-2 text-xs font-bold text-orange-300"
            >
              <FaPhone />
              {bus.guide_phone}
            </a>
          )}

        </div>


        <div className="rounded-2xl border border-white/[.07] bg-black/20 p-4">

          <p className="flex items-center gap-2 text-xs text-slate-500">
            <FaClock className="text-orange-400" />
            Hareket
          </p>

          <p className="mt-2 font-black">
            {dateTime(
              bus.departure_at
            )}
          </p>

        </div>


        <div className="rounded-2xl border border-white/[.07] bg-black/20 p-4">

          <p className="text-xs text-slate-500">
            Koltuk
          </p>

          <p className="mt-2 text-xl font-black text-orange-300">

            {seats.length
              ? seats
                  .map(
                    seat =>
                      seat.seat_number
                  )
                  .join(", ")
              : "—"}

          </p>

        </div>

      </div>


      {seats.length >
        0 && (

        <div className="border-t border-white/[.07] px-6 py-5">

          <p className="text-xs font-black uppercase tracking-[.15em] text-slate-500">
            Biniş & Koltuk Bilgisi
          </p>


          <div className="mt-4 grid gap-3 md:grid-cols-2">

            {seats.map(
              seat => (

                <article
                  key={
                    `${seat.seat_number}-${seat.boarding_stop_id || ""}`
                  }
                  className="rounded-2xl border border-white/[.07] bg-black/20 p-4"
                >

                  <div className="flex items-center justify-between gap-3">

                    <span className="text-lg font-black">
                      Koltuk {seat.seat_number}
                    </span>

                    <span className={`rounded-full px-3 py-1 text-[10px] font-black ${
                      seat.checkin_status ===
                        "boarded"
                        ? "bg-emerald-500/10 text-emerald-300"
                        : seat.checkin_status ===
                            "no_show"
                          ? "bg-red-500/10 text-red-300"
                          : "bg-amber-500/10 text-amber-300"
                    }`}>
                      {checkinLabel(
                        seat.checkin_status
                      )}
                    </span>

                  </div>


                  <div className="mt-4 space-y-2 text-sm text-slate-400">

                    <p className="flex items-start gap-2">
                      <FaMapMarkerAlt className="mt-1 shrink-0 text-orange-400" />

                      <span>
                        {seat.boarding_stop ||
                          "Biniş noktası henüz girilmedi"}

                        {seat.boarding_address
                          ? ` · ${seat.boarding_address}`
                          : ""}
                      </span>
                    </p>


                    <p className="flex items-center gap-2">
                      <FaClock className="text-orange-400" />

                      {seat.boarding_time
                        ? dateTime(
                            seat.boarding_time
                          )
                        : "Biniş saati henüz girilmedi"}
                    </p>

                  </div>

                </article>
              )
            )}

          </div>

        </div>
      )}

    </section>
  );
}
