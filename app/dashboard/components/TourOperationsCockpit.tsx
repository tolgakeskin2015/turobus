"use client";

import Link from "next/link";

import {
  FaBus,
  FaCheckCircle,
  FaClipboardCheck,
  FaExclamationTriangle,
  FaFileAlt,
  FaMoneyBillWave,
  FaPlane,
  FaRoute,
  FaTasks,
  FaUsers,
} from "react-icons/fa";


type Props = {
  tourId: string;

  transportMode:
    | "air"
    | "bus"
    | "other";

  operationStatus:
    string;

  departureDate:
    string | null;

  returnDate:
    string | null;

  occupancy:
    number;

  expectedPassenger:
    number;

  passengerCount:
    number;

  documentReadyCount:
    number;

  roomingCount:
    number;

  manifestReady:
    boolean;

  revenue:
    number;

  grossProfit:
    number;

  expenseTotal:
    number;

  operationalContribution:
    number;

  overviewReadiness:
    number;

  deadlineRisk:
    boolean;

  linkedSeatCount:
    number;

  boardedCount:
    number;
};


function money(
  value: number
) {

  return new Intl.NumberFormat(
    "tr-TR",
    {
      style:
        "currency",
      currency:
        "TRY",
      maximumFractionDigits:
        0,
    }
  ).format(
    Number(
      value ||
      0
    )
  );
}


function dateLabel(
  value:
    string | null
) {

  if (!value) {
    return "—";
  }


  const date =
    new Date(
      `${value.slice(0, 10)}T00:00:00`
    );


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
      year:
        "numeric",
    }
  ).format(
    date
  );
}


export default function TourOperationsCockpit({
  tourId,
  transportMode,
  operationStatus,
  departureDate,
  returnDate,
  occupancy,
  expectedPassenger,
  passengerCount,
  documentReadyCount,
  roomingCount,
  manifestReady,
  revenue,
  grossProfit,
  expenseTotal,
  operationalContribution,
  overviewReadiness,
  deadlineRisk,
  linkedSeatCount,
  boardedCount,
}: Props) {

  const transportLabel =
    transportMode ===
      "air"
      ? "Uçak Operasyonu"
      : transportMode ===
          "bus"
        ? "Otobüs Operasyonu"
        : "Ulaşım";


  const TransportIcon =
    transportMode ===
      "air"
      ? FaPlane
      : transportMode ===
          "bus"
        ? FaBus
        : FaRoute;


  const readyTone =
    overviewReadiness >=
      85
      ? "text-emerald-300"
      : overviewReadiness >=
          60
        ? "text-amber-300"
        : "text-red-300";


  const readyBorder =
    overviewReadiness >=
      85
      ? "border-emerald-500/20"
      : overviewReadiness >=
          60
        ? "border-amber-500/20"
        : "border-red-500/20";


  const issues = [
    passengerCount !==
      expectedPassenger
      ? "Yolcu kayıt sayısı rezervasyon toplamı ile eşleşmiyor."
      : null,

    passengerCount >
        0 &&
    documentReadyCount <
      passengerCount
      ? `${
          passengerCount -
          documentReadyCount
        } yolcunun kimlik/belge hazırlığı eksik.`
      : null,

    !manifestReady
      ? "Manifest henüz tam hazır değil."
      : null,

    deadlineRisk
      ? "Uçuş ticketing deadline riski var."
      : null,

    transportMode ===
        "bus" &&
    passengerCount >
      0 &&
    linkedSeatCount <
      passengerCount
      ? "Koltuk ataması tamamlanmamış yolcular var."
      : null,

    operationalContribution <
      0
      ? "Operasyon katkısı negatif."
      : null,
  ].filter(Boolean) as string[];


  const quickActions = [
    {
      label:
        "Hazırlık",
      href:
        `/dashboard/turlar/${tourId}/hazirlik`,
      icon:
        FaClipboardCheck,
    },
    {
      label:
        "Yolcular",
      href:
        `/dashboard/turlar/${tourId}/yolcular`,
      icon:
        FaUsers,
    },
    {
      label:
        transportLabel,
      href:
        transportMode ===
          "air"
          ? `/dashboard/turlar/${tourId}/ucus`
          : `/dashboard/turlar/${tourId}/otobus`,
      icon:
        TransportIcon,
    },
    {
      label:
        "Görevler",
      href:
        `/dashboard/turlar/${tourId}/gorevler`,
      icon:
        FaTasks,
    },
    {
      label:
        "Belgeler",
      href:
        `/dashboard/turlar/${tourId}/belgeler`,
      icon:
        FaFileAlt,
    },
    {
      label:
        "Finans",
      href:
        `/dashboard/turlar/${tourId}/finans-yonetim`,
      icon:
        FaMoneyBillWave,
    },
  ];


  return (
    <section
      data-tour-operations-cockpit
      className="mt-4 overflow-hidden rounded-[30px] border border-white/[.08] bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,.11),transparent_32%),linear-gradient(145deg,#07131f,#03080e)] shadow-[0_28px_90px_rgba(0,0,0,.22)]"
    >

      <div className="grid xl:grid-cols-[minmax(0,1fr)_330px]">

        <div className="p-5 lg:p-6">

          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

            <div>

              <div className="flex flex-wrap items-center gap-2">

                <span className="rounded-full border border-orange-500/20 bg-orange-500/[.07] px-3 py-1.5 text-[7px] font-black uppercase tracking-[.15em] text-orange-300">
                  Operasyon Cockpit
                </span>

                <span className="rounded-full border border-white/[.08] bg-white/[.025] px-3 py-1.5 text-[7px] font-black text-slate-400">
                  {operationStatus}
                </span>

              </div>


              <h2 className="mt-3 text-xl font-black tracking-[-.03em] lg:text-2xl">
                Bugün neye müdahale etmeliyiz?
              </h2>

              <p className="mt-1.5 text-[8px] leading-5 text-slate-500">
                Gerçek yolcu, belge, ulaşım ve finans verilerinden anlık operasyon özeti.
              </p>

            </div>


            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:flex">

              {quickActions.map(
                item => {

                  const Icon =
                    item.icon;


                  return (

                    <Link
                      key={
                        item.href
                      }
                      href={
                        item.href
                      }
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/[.07] bg-black/20 px-3 text-[7px] font-black text-slate-300 transition hover:border-orange-500/20 hover:bg-orange-500/[.06] hover:text-orange-300"
                    >
                      <Icon />
                      {item.label}
                    </Link>
                  );
                }
              )}

            </div>

          </div>


          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">

            <div className="rounded-[18px] border border-white/[.07] bg-black/20 p-4">

              <div className="text-[7px] font-black uppercase tracking-[.12em] text-slate-600">
                Yolcu
              </div>

              <div className="mt-2 text-2xl font-black">
                {passengerCount}
                <span className="ml-1 text-xs text-slate-600">
                  / {expectedPassenger}
                </span>
              </div>

              <div className="mt-1 text-[7px] text-slate-500">
                Doluluk %{occupancy}
              </div>

            </div>


            <div className="rounded-[18px] border border-white/[.07] bg-black/20 p-4">

              <div className="text-[7px] font-black uppercase tracking-[.12em] text-slate-600">
                Belge Hazırlığı
              </div>

              <div className="mt-2 text-2xl font-black">
                {documentReadyCount}
                <span className="ml-1 text-xs text-slate-600">
                  / {passengerCount}
                </span>
              </div>

              <div className="mt-1 text-[7px] text-slate-500">
                Rooming {roomingCount}/{passengerCount}
              </div>

            </div>


            <div className="rounded-[18px] border border-white/[.07] bg-black/20 p-4">

              <div className="text-[7px] font-black uppercase tracking-[.12em] text-slate-600">
                Operasyon Katkısı
              </div>

              <div className={`mt-2 text-xl font-black ${
                operationalContribution >=
                  0
                  ? "text-emerald-300"
                  : "text-red-300"
              }`}>
                {money(
                  operationalContribution
                )}
              </div>

              <div className="mt-1 text-[7px] text-slate-500">
                Ciro {money(revenue)}
              </div>

            </div>


            <div className="rounded-[18px] border border-white/[.07] bg-black/20 p-4">

              <div className="text-[7px] font-black uppercase tracking-[.12em] text-slate-600">
                Tarih
              </div>

              <div className="mt-2 text-[10px] font-black">
                {dateLabel(
                  departureDate
                )}
              </div>

              <div className="mt-1 text-[7px] text-slate-500">
                → {dateLabel(
                  returnDate
                )}
              </div>

            </div>

          </div>


          <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_1fr]">

            <div className="rounded-[18px] border border-white/[.07] bg-black/20 p-4">

              <div className="flex items-center justify-between">

                <span className="text-[8px] font-black">
                  Manifest
                </span>

                {manifestReady ? (
                  <FaCheckCircle className="text-emerald-300" />
                ) : (
                  <FaExclamationTriangle className="text-amber-300" />
                )}

              </div>

              <div className="mt-2 text-[7px] text-slate-500">
                {manifestReady
                  ? "Manifest rezervasyon kapsamıyla eşleşiyor."
                  : "Manifest tamamlanmalı."}
              </div>

            </div>


            <div className="rounded-[18px] border border-white/[.07] bg-black/20 p-4">

              <div className="flex items-center justify-between">

                <span className="text-[8px] font-black">
                  Ulaşım
                </span>

                <TransportIcon className="text-blue-300" />

              </div>

              <div className="mt-2 text-[7px] text-slate-500">

                {transportMode ===
                  "bus"
                  ? `${linkedSeatCount}/${passengerCount} koltuk bağlı · ${boardedCount} check-in`
                  : deadlineRisk
                    ? "Ticketing deadline kontrolü gerekiyor."
                    : "Kritik deadline sinyali yok."}

              </div>

            </div>


            <div className="rounded-[18px] border border-white/[.07] bg-black/20 p-4">

              <div className="text-[8px] font-black">
                Finans
              </div>

              <div className="mt-2 grid grid-cols-2 gap-3 text-[7px]">

                <div>
                  <span className="text-slate-600">
                    Brüt Kâr
                  </span>

                  <div className="mt-1 font-black text-emerald-300">
                    {money(
                      grossProfit
                    )}
                  </div>
                </div>


                <div>
                  <span className="text-slate-600">
                    Gider
                  </span>

                  <div className="mt-1 font-black text-white">
                    {money(
                      expenseTotal
                    )}
                  </div>
                </div>

              </div>

            </div>

          </div>

        </div>


        <aside className="border-t border-white/[.07] bg-black/20 p-5 xl:border-l xl:border-t-0">

          <div className={`rounded-[24px] border ${readyBorder} bg-[#03080e] p-5`}>

            <div className="flex items-center justify-between">

              <div>

                <div className="text-[7px] font-black uppercase tracking-[.14em] text-slate-600">
                  Operasyon Sağlığı
                </div>

                <div className={`mt-2 text-4xl font-black ${readyTone}`}>
                  %{overviewReadiness}
                </div>

              </div>


              <div className={`grid h-16 w-16 place-items-center rounded-full border-4 ${readyBorder} ${readyTone}`}>
                <FaRoute />
              </div>

            </div>


            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[.05]">

              <div
                className={`h-full rounded-full ${
                  overviewReadiness >=
                    85
                    ? "bg-emerald-400"
                    : overviewReadiness >=
                        60
                      ? "bg-amber-400"
                      : "bg-red-400"
                }`}
                style={{
                  width:
                    `${Math.max(
                      0,
                      Math.min(
                        100,
                        overviewReadiness
                      )
                    )}%`,
                }}
              />

            </div>

          </div>


          <div className="mt-4">

            <div className="text-[7px] font-black uppercase tracking-[.14em] text-slate-600">
              Öncelikli Kontroller
            </div>


            <div className="mt-3 space-y-2">

              {issues.length ===
                0 ? (

                <div className="flex gap-2 rounded-xl border border-emerald-500/15 bg-emerald-500/[.04] p-3 text-[7px] leading-5 text-emerald-300">
                  <FaCheckCircle className="mt-1 shrink-0" />
                  Bu görünümde kritik operasyon açığı tespit edilmedi.
                </div>

              ) : (

                issues
                  .slice(
                    0,
                    5
                  )
                  .map(
                    issue => (

                      <div
                        key={
                          issue
                        }
                        className="flex gap-2 rounded-xl border border-amber-500/15 bg-amber-500/[.04] p-3 text-[7px] leading-5 text-amber-200"
                      >
                        <FaExclamationTriangle className="mt-1 shrink-0 text-amber-300" />
                        {issue}
                      </div>
                    )
                  )
              )}

            </div>

          </div>

        </aside>

      </div>

    </section>
  );
}
