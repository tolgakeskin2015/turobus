"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FaBell,
  FaBolt,
  FaChartLine,
  FaCheckCircle,
  FaChevronRight,
  FaClock,
  FaCommentDots,
  FaExclamationTriangle,
  FaFilter,
  FaRedo,
  FaSearch,
  FaSuitcase,
  FaSyncAlt,
  FaTimes,
  FaUserCheck,
  FaUserClock,
  FaUsers,
} from "react-icons/fa";

import {
  loadCustomer360CommandCenterSnapshot,
} from "@/lib/customer-360/repository";

import type {
  Customer360CommandCenterRow,
} from "@/lib/customer-360/repository";

import type {
  Customer360Customer,
} from "@/lib/customer-360/types";


type Props = {
  companyId:
    string;

  customers:
    Customer360Customer[];
};


type OperationalFilter =
  | "all"
  | "open_cases"
  | "complaints"
  | "overdue"
  | "due_soon"
  | "booked"
  | "no_communication_30"
  | "risk";


function segmentLabel(
  value:
    Customer360Customer["segment"]
) {
  const labels:
    Record<
      Customer360Customer["segment"],
      string
    > = {
      standard:
        "Standart",

      repeat:
        "Tekrar Müşteri",

      vip:
        "VIP",

      corporate:
        "Kurumsal",

      risk:
        "Risk",
    };


  return labels[value];
}


function segmentTone(
  value:
    Customer360Customer["segment"]
) {
  if (value === "vip") {
    return "border-amber-500/25 bg-amber-500/[.08] text-amber-300";
  }

  if (value === "repeat") {
    return "border-blue-500/25 bg-blue-500/[.08] text-blue-300";
  }

  if (value === "corporate") {
    return "border-violet-500/25 bg-violet-500/[.08] text-violet-300";
  }

  if (value === "risk") {
    return "border-red-500/25 bg-red-500/[.08] text-red-300";
  }

  return "border-white/10 bg-white/[.035] text-slate-400";
}


function statusLabel(
  value:
    Customer360Customer["status"]
) {
  if (value === "active") {
    return "Aktif";
  }

  if (value === "blocked") {
    return "Blokeli";
  }

  return "Pasif";
}


function statusTone(
  value:
    Customer360Customer["status"]
) {
  if (value === "active") {
    return "border-emerald-500/20 bg-emerald-500/[.06] text-emerald-300";
  }

  if (value === "blocked") {
    return "border-red-500/20 bg-red-500/[.06] text-red-300";
  }

  return "border-white/10 bg-white/[.03] text-slate-500";
}


function formatDate(
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
    return "—";
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
  ).format(date);
}


function formatDateTime(
  value:
    string | null
) {
  if (!value) {
    return "Henüz senkronize edilmedi";
  }


  const date =
    new Date(value);


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
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


function daysSince(
  value:
    string | null
) {
  if (!value) {
    return null;
  }


  const date =
    new Date(value);


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }


  return Math.max(
    0,
    Math.floor(
      (
        Date.now() -
        date.getTime()
      ) /
      86400000
    )
  );
}


function emptyMetric(
  customerId:
    string
): Customer360CommandCenterRow {
  return {
    customer_id:
      customerId,

    open_case_count:
      0,

    open_complaint_count:
      0,

    overdue_case_count:
      0,

    due_soon_case_count:
      0,

    message_count:
      0,

    inbound_message_count:
      0,

    outbound_message_count:
      0,

    last_message_at:
      null,

    booking_count:
      0,

    quote_count:
      0,

    trip_count:
      0,

    finance_event_count:
      0,

    last_booking_at:
      null,

    last_activity_at:
      null,
  };
}


export default function CustomerCommandCenter({
  companyId,
  customers,
}: Props) {
  const [
    metrics,
    setMetrics,
  ] =
    useState<
      Customer360CommandCenterRow[]
    >([]);


  const [
    generatedAt,
    setGeneratedAt,
  ] =
    useState<string | null>(
      null
    );


  const [
    loading,
    setLoading,
  ] =
    useState(true);


  const [
    refreshing,
    setRefreshing,
  ] =
    useState(false);


  const [
    error,
    setError,
  ] =
    useState("");


  const [
    search,
    setSearch,
  ] =
    useState("");


  const [
    segment,
    setSegment,
  ] =
    useState("all");


  const [
    status,
    setStatus,
  ] =
    useState("all");


  const [
    operation,
    setOperation,
  ] =
    useState<OperationalFilter>(
      "all"
    );


  const loadSnapshot =
    useCallback(
      async (
        silent = false
      ) => {
        if (!companyId) {
          return;
        }


        if (silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }


        setError("");


        try {
          const result =
            await loadCustomer360CommandCenterSnapshot(
              companyId
            );


          setMetrics(
            Array.isArray(
              result?.customers
            )
              ? result.customers
              : []
          );


          setGeneratedAt(
            result?.generated_at ??
            new Date().toISOString()
          );

        } catch (
          currentError
        ) {
          setError(
            currentError instanceof
              Error
              ? currentError.message
              : String(
                  currentError
                )
          );

        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [
        companyId,
      ]
    );


  useEffect(() => {
    void loadSnapshot();
  }, [
    loadSnapshot,
  ]);


  const metricMap =
    useMemo(
      () =>
        new Map(
          metrics.map(
            (
              row
            ) => [
              row.customer_id,
              row,
            ]
          )
        ),
      [
        metrics,
      ]
    );


  const rows =
    useMemo(
      () =>
        customers.map(
          (
            customer
          ) => ({
            customer,

            metric:
              metricMap.get(
                customer.id
              ) ??
              emptyMetric(
                customer.id
              ),
          })
        ),
      [
        customers,
        metricMap,
      ]
    );


  const stats =
    useMemo(
      () => {
        const noCommunication30 =
          rows.filter(
            ({
              metric,
            }) => {
              const days =
                daysSince(
                  metric.last_message_at
                );


              return (
                days ===
                  null ||
                days >=
                  30
              );
            }
          ).length;


        return {
          customers:
            customers.length,

          active:
            customers.filter(
              (
                customer
              ) =>
                customer.status ===
                "active"
            ).length,

          vip:
            customers.filter(
              (
                customer
              ) =>
                customer.segment ===
                "vip"
            ).length,

          repeat:
            customers.filter(
              (
                customer
              ) =>
                customer.segment ===
                "repeat"
            ).length,

          risk:
            customers.filter(
              (
                customer
              ) =>
                customer.segment ===
                "risk"
            ).length,

          openCases:
            metrics.reduce(
              (
                total,
                row
              ) =>
                total +
                row.open_case_count,
              0
            ),

          complaints:
            metrics.reduce(
              (
                total,
                row
              ) =>
                total +
                row.open_complaint_count,
              0
            ),

          overdue:
            metrics.reduce(
              (
                total,
                row
              ) =>
                total +
                row.overdue_case_count,
              0
            ),

          dueSoon:
            metrics.reduce(
              (
                total,
                row
              ) =>
                total +
                row.due_soon_case_count,
              0
            ),

          bookedCustomers:
            metrics.filter(
              (
                row
              ) =>
                row.booking_count >
                0
            ).length,

          noCommunication30,
        };
      },
      [
        customers,
        metrics,
        rows,
      ]
    );


  const filtered =
    useMemo(
      () => {
        const needle =
          search
            .trim()
            .toLocaleLowerCase(
              "tr-TR"
            );


        return rows
          .filter(
            ({
              customer,
              metric,
            }) => {
              if (
                segment !==
                  "all" &&
                customer.segment !==
                  segment
              ) {
                return false;
              }


              if (
                status !==
                  "all" &&
                customer.status !==
                  status
              ) {
                return false;
              }


              if (
                operation ===
                  "open_cases" &&
                metric.open_case_count ===
                  0
              ) {
                return false;
              }


              if (
                operation ===
                  "complaints" &&
                metric.open_complaint_count ===
                  0
              ) {
                return false;
              }


              if (
                operation ===
                  "overdue" &&
                metric.overdue_case_count ===
                  0
              ) {
                return false;
              }


              if (
                operation ===
                  "due_soon" &&
                metric.due_soon_case_count ===
                  0
              ) {
                return false;
              }


              if (
                operation ===
                  "booked" &&
                metric.booking_count ===
                  0
              ) {
                return false;
              }


              if (
                operation ===
                  "risk" &&
                customer.segment !==
                  "risk"
              ) {
                return false;
              }


              if (
                operation ===
                  "no_communication_30"
              ) {
                const days =
                  daysSince(
                    metric.last_message_at
                  );


                if (
                  days !==
                    null &&
                  days <
                    30
                ) {
                  return false;
                }
              }


              if (!needle) {
                return true;
              }


              const haystack =
                [
                  customer.full_name,
                  customer.customer_code,
                  customer.phone,
                  customer.email,
                  customer.city,
                  customer.country,
                  customer.source,
                  customer.segment,
                  customer.status,
                ]
                  .filter(Boolean)
                  .join(" ")
                  .toLocaleLowerCase(
                    "tr-TR"
                  );


              return haystack.includes(
                needle
              );
            }
          )
          .sort(
            (
              a,
              b
            ) => {
              const aPriority =
                (
                  a.metric.overdue_case_count *
                  1000
                ) +
                (
                  a.metric.open_complaint_count *
                  100
                ) +
                (
                  a.metric.due_soon_case_count *
                  10
                ) +
                (
                  a.customer.segment ===
                  "risk"
                    ? 5
                    : 0
                );


              const bPriority =
                (
                  b.metric.overdue_case_count *
                  1000
                ) +
                (
                  b.metric.open_complaint_count *
                  100
                ) +
                (
                  b.metric.due_soon_case_count *
                  10
                ) +
                (
                  b.customer.segment ===
                  "risk"
                    ? 5
                    : 0
                );


              if (
                bPriority !==
                aPriority
              ) {
                return bPriority -
                  aPriority;
              }


              const aTime =
                a.metric.last_activity_at
                  ? new Date(
                      a.metric.last_activity_at
                    ).getTime()
                  : 0;


              const bTime =
                b.metric.last_activity_at
                  ? new Date(
                      b.metric.last_activity_at
                    ).getTime()
                  : 0;


              return bTime -
                aTime;
            }
          );
      },
      [
        rows,
        search,
        segment,
        status,
        operation,
      ]
    );


  const activeFilterCount =
    [
      search.trim()
        ? 1
        : 0,

      segment !== "all"
        ? 1
        : 0,

      status !== "all"
        ? 1
        : 0,

      operation !== "all"
        ? 1
        : 0,
    ].reduce(
      (
        total,
        value
      ) =>
        total +
        value,
      0
    );


  function clearFilters() {
    setSearch("");
    setSegment("all");
    setStatus("all");
    setOperation("all");
  }


  const criticalCount =
    stats.overdue +
    stats.complaints;


  return (
    <section className="mt-5 overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,.08),transparent_30%),linear-gradient(180deg,#081522_0%,#06111c_100%)] shadow-2xl shadow-black/20">

      <div className="border-b border-white/[.07] p-5 lg:p-7">

        <div className="flex flex-col gap-6 2xl:flex-row 2xl:items-start 2xl:justify-between">

          <div className="max-w-3xl">

            <div className="flex flex-wrap items-center gap-2">

              <span className="rounded-full border border-orange-500/20 bg-orange-500/[.08] px-3 py-1.5 text-[8px] font-black uppercase tracking-[.18em] text-orange-300">
                CUSTOMER 360 COMMAND CENTER
              </span>


              <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/15 bg-emerald-500/[.05] px-3 py-1.5 text-[8px] font-black text-emerald-300">
                <FaCheckCircle />
                Gerçek veri
              </span>

            </div>


            <h2 className="mt-4 text-2xl font-black tracking-[-.035em] lg:text-3xl">
              Müşteri Operasyon
              <span className="text-orange-400">
                {" "}
                Komuta Merkezi
              </span>
            </h2>


            <p className="mt-3 max-w-2xl text-[10px] leading-6 text-slate-500">
              Müşteri riski, rezervasyon, iletişim ve servis olaylarını tek operasyon ekranında izleyin. Kritik kayıtlar otomatik olarak listenin üstüne taşınır.
            </p>

          </div>


          <div className="flex flex-wrap items-center gap-2">

            <div className="rounded-xl border border-white/[.07] bg-black/20 px-4 py-3">

              <div className="text-[7px] font-black uppercase tracking-[.12em] text-slate-600">
                Son veri
              </div>

              <div className="mt-1 text-[9px] font-black text-slate-300">
                {formatDateTime(
                  generatedAt
                )}
              </div>

            </div>


            <button
              type="button"
              onClick={() =>
                void loadSnapshot(
                  true
                )
              }
              disabled={
                refreshing
              }
              className="flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-4 text-[9px] font-black text-slate-200 transition hover:border-orange-500/25 hover:text-orange-300 disabled:cursor-wait disabled:opacity-50"
            >
              <FaSyncAlt
                className={
                  refreshing
                    ? "animate-spin"
                    : ""
                }
              />

              {refreshing
                ? "Yenileniyor"
                : "Veriyi Yenile"}
            </button>

          </div>

        </div>


        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4 2xl:grid-cols-8">

          {[
            {
              label:
                "Toplam Müşteri",

              value:
                stats.customers,

              detail:
                `${stats.active} aktif`,

              icon:
                <FaUsers />,

              tone:
                "text-slate-300",
            },

            {
              label:
                "VIP",

              value:
                stats.vip,

              detail:
                "Öncelikli müşteri",

              icon:
                <FaUserCheck />,

              tone:
                "text-amber-300",
            },

            {
              label:
                "Tekrar",

              value:
                stats.repeat,

              detail:
                "Tekrar müşteri",

              icon:
                <FaRedo />,

              tone:
                "text-blue-300",
            },

            {
              label:
                "Risk",

              value:
                stats.risk,

              detail:
                "Risk segmenti",

              icon:
                <FaExclamationTriangle />,

              tone:
                "text-red-300",
            },

            {
              label:
                "Açık Kayıt",

              value:
                stats.openCases,

              detail:
                `${stats.complaints} şikâyet`,

              icon:
                <FaBell />,

              tone:
                "text-orange-300",
            },

            {
              label:
                "SLA Gecikmiş",

              value:
                stats.overdue,

              detail:
                `${stats.dueSoon} yaklaşan`,

              icon:
                <FaClock />,

              tone:
                stats.overdue >
                  0
                  ? "text-red-300"
                  : "text-emerald-300",
            },

            {
              label:
                "Rezervasyonlu",

              value:
                stats.bookedCustomers,

              detail:
                "Bağlı müşteri",

              icon:
                <FaSuitcase />,

              tone:
                "text-emerald-300",
            },

            {
              label:
                "30+ Gün Sessiz",

              value:
                stats.noCommunication30,

              detail:
                "İletişim takibi",

              icon:
                <FaUserClock />,

              tone:
                "text-violet-300",
            },
          ].map(
            (
              item
            ) => (
              <article
                key={
                  item.label
                }
                className="group rounded-2xl border border-white/[.07] bg-black/20 p-4 transition hover:-translate-y-0.5 hover:border-white/[.12] hover:bg-white/[.025]"
              >

                <div className="flex items-start justify-between gap-3">

                  <div>

                    <div className="text-[7px] font-black uppercase tracking-[.11em] text-slate-600">
                      {item.label}
                    </div>

                    <div className="mt-2 text-2xl font-black">
                      {item.value}
                    </div>

                    <div className="mt-1 text-[7px] font-bold text-slate-600">
                      {item.detail}
                    </div>

                  </div>


                  <div
                    className={`grid h-9 w-9 place-items-center rounded-xl border border-white/[.06] bg-white/[.025] ${item.tone}`}
                  >
                    {item.icon}
                  </div>

                </div>

              </article>
            )
          )}

        </div>


        <div className="mt-5 grid gap-3 xl:grid-cols-[1.3fr_.7fr]">

          <div
            className={`rounded-2xl border p-4 ${
              criticalCount >
              0
                ? "border-red-500/15 bg-red-500/[.035]"
                : "border-emerald-500/15 bg-emerald-500/[.035]"
            }`}
          >

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">

              <div className="flex items-start gap-3">

                <div
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                    criticalCount >
                    0
                      ? "bg-red-500/10 text-red-300"
                      : "bg-emerald-500/10 text-emerald-300"
                  }`}
                >
                  {criticalCount >
                  0
                    ? <FaBolt />
                    : <FaCheckCircle />}
                </div>


                <div>

                  <div className="text-[10px] font-black">
                    {criticalCount >
                    0
                      ? "Operasyon müdahalesi gereken kayıtlar var"
                      : "Kritik operasyon alarmı bulunmuyor"}
                  </div>

                  <div className="mt-1 text-[8px] leading-5 text-slate-500">
                    {criticalCount >
                    0
                      ? `${stats.overdue} SLA gecikmiş · ${stats.complaints} açık şikâyet`
                      : "SLA ve şikâyet tarafında kritik kayıt görünmüyor."}
                  </div>

                </div>

              </div>


              {criticalCount >
                0 && (
                <div className="flex flex-wrap gap-2">

                  {stats.overdue >
                    0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setOperation(
                          "overdue"
                        )
                      }
                      className="rounded-xl border border-red-500/20 bg-red-500/[.06] px-3 py-2 text-[8px] font-black text-red-300"
                    >
                      Gecikenleri Göster
                    </button>
                  )}


                  {stats.complaints >
                    0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setOperation(
                          "complaints"
                        )
                      }
                      className="rounded-xl border border-orange-500/20 bg-orange-500/[.06] px-3 py-2 text-[8px] font-black text-orange-300"
                    >
                      Şikâyetleri Göster
                    </button>
                  )}

                </div>
              )}

            </div>

          </div>


          <div className="rounded-2xl border border-white/[.07] bg-black/20 p-4">

            <div className="flex items-center gap-2 text-[9px] font-black">
              <FaChartLine className="text-orange-300" />
              Operasyon Özeti
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">

              <div className="rounded-xl bg-white/[.025] p-3">
                <div className="text-[7px] text-slate-600">
                  Yaklaşan
                </div>
                <div className="mt-1 text-base font-black text-amber-300">
                  {stats.dueSoon}
                </div>
              </div>

              <div className="rounded-xl bg-white/[.025] p-3">
                <div className="text-[7px] text-slate-600">
                  Açık kayıt
                </div>
                <div className="mt-1 text-base font-black">
                  {stats.openCases}
                </div>
              </div>

              <div className="rounded-xl bg-white/[.025] p-3">
                <div className="text-[7px] text-slate-600">
                  Sessiz
                </div>
                <div className="mt-1 text-base font-black text-violet-300">
                  {stats.noCommunication30}
                </div>
              </div>

            </div>

          </div>

        </div>

      </div>


      {error && (
        <div className="border-b border-red-500/15 bg-red-500/[.045] px-5 py-4 lg:px-7">

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

            <div className="flex items-start gap-3">

              <FaExclamationTriangle className="mt-0.5 shrink-0 text-red-300" />

              <div>

                <div className="text-[9px] font-black text-red-200">
                  Operasyon özeti yüklenemedi
                </div>

                <div className="mt-1 max-w-3xl text-[8px] leading-5 text-red-200/60">
                  {error}
                </div>

              </div>

            </div>


            <button
              type="button"
              onClick={() =>
                void loadSnapshot()
              }
              className="flex min-h-9 items-center justify-center gap-2 rounded-lg border border-red-500/20 bg-red-500/[.06] px-3 text-[8px] font-black text-red-200"
            >
              <FaRedo />
              Tekrar Dene
            </button>

          </div>

        </div>
      )}


      <div className="border-b border-white/[.07] bg-black/10 p-4 lg:p-5">

        <div className="grid gap-3 2xl:grid-cols-[1fr_180px_160px_230px_auto]">

          <div className="relative">

            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] text-slate-600" />

            <input
              value={
                search
              }
              onChange={(
                event
              ) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Müşteri, telefon, e-posta, şehir, kod veya kaynak ara..."
              className="h-11 w-full rounded-xl border border-white/10 bg-[#030a11] pl-10 pr-4 text-[10px] font-bold outline-none transition focus:border-orange-500/35"
            />

          </div>


          <select
            value={
              segment
            }
            onChange={(
              event
            ) =>
              setSegment(
                event.target.value
              )
            }
            className="h-11 rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px] font-bold outline-none"
          >
            <option value="all">
              Tüm Segmentler
            </option>

            <option value="standard">
              Standart
            </option>

            <option value="repeat">
              Tekrar Müşteri
            </option>

            <option value="vip">
              VIP
            </option>

            <option value="corporate">
              Kurumsal
            </option>

            <option value="risk">
              Risk
            </option>
          </select>


          <select
            value={
              status
            }
            onChange={(
              event
            ) =>
              setStatus(
                event.target.value
              )
            }
            className="h-11 rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px] font-bold outline-none"
          >
            <option value="all">
              Tüm Durumlar
            </option>

            <option value="active">
              Aktif
            </option>

            <option value="inactive">
              Pasif
            </option>

            <option value="blocked">
              Blokeli
            </option>
          </select>


          <div className="relative">

            <FaFilter className="absolute left-4 top-1/2 -translate-y-1/2 text-[9px] text-slate-600" />

            <select
              value={
                operation
              }
              onChange={(
                event
              ) =>
                setOperation(
                  event.target.value as
                    OperationalFilter
                )
              }
              className="h-11 w-full rounded-xl border border-white/10 bg-[#030a11] pl-10 pr-3 text-[9px] font-bold outline-none"
            >
              <option value="all">
                Tüm Operasyonlar
              </option>

              <option value="open_cases">
                Açık Talep / Şikâyet
              </option>

              <option value="complaints">
                Açık Şikâyet
              </option>

              <option value="overdue">
                SLA Gecikmiş
              </option>

              <option value="due_soon">
                24 Saat İçinde
              </option>

              <option value="booked">
                Rezervasyonlu
              </option>

              <option value="no_communication_30">
                30+ Gün İletişimsiz
              </option>

              <option value="risk">
                Risk Segmenti
              </option>
            </select>

          </div>


          <button
            type="button"
            onClick={
              clearFilters
            }
            disabled={
              activeFilterCount ===
              0
            }
            className="flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[.03] px-4 text-[8px] font-black text-slate-400 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
          >
            <FaTimes />
            Filtreleri Temizle
            {activeFilterCount >
              0 && (
              <span className="rounded-full bg-orange-500 px-1.5 py-0.5 text-[7px] text-white">
                {activeFilterCount}
              </span>
            )}
          </button>

        </div>


        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">

          <div className="text-[8px] font-bold text-slate-600">
            {filtered.length} / {customers.length} müşteri gösteriliyor
          </div>


          {operation !==
            "all" && (
            <div className="rounded-lg border border-orange-500/15 bg-orange-500/[.04] px-2.5 py-1.5 text-[7px] font-black text-orange-300">
              Operasyon filtresi aktif
            </div>
          )}

        </div>

      </div>


      {loading ? (
        <div className="grid min-h-[360px] place-items-center">

          <div className="text-center">

            <FaSyncAlt className="mx-auto animate-spin text-2xl text-orange-300" />

            <div className="mt-4 text-[10px] font-black">
              Komuta merkezi hazırlanıyor
            </div>

            <div className="mt-2 text-[8px] text-slate-600">
              Gerçek müşteri operasyon verileri yükleniyor...
            </div>

          </div>

        </div>
      ) : filtered.length ===
        0 ? (
        <div className="grid min-h-[320px] place-items-center p-8">

          <div className="max-w-sm text-center">

            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-white/[.07] bg-white/[.025]">
              <FaUsers className="text-xl text-slate-700" />
            </div>

            <div className="mt-4 text-xs font-black">
              Filtreye uygun müşteri bulunamadı
            </div>

            <div className="mt-2 text-[9px] leading-5 text-slate-600">
              Arama veya filtreleri temizleyerek tüm müşteri operasyonlarını tekrar görüntüleyebilirsiniz.
            </div>

            {activeFilterCount >
              0 && (
              <button
                type="button"
                onClick={
                  clearFilters
                }
                className="mt-4 rounded-xl bg-orange-500 px-4 py-2.5 text-[8px] font-black text-white"
              >
                Tüm Müşterileri Göster
              </button>
            )}

          </div>

        </div>
      ) : (
        <div className="max-h-[760px] overflow-auto">

          <table className="min-w-[1460px] w-full">

            <thead className="sticky top-0 z-20 bg-[#0a1826]/95 backdrop-blur-xl">

              <tr className="border-b border-white/[.08] text-left text-[7px] font-black uppercase tracking-[.12em] text-slate-600">

                <th className="sticky left-0 z-30 bg-[#0a1826] px-5 py-4">
                  Müşteri
                </th>

                <th className="px-5 py-4">
                  Segment
                </th>

                <th className="px-5 py-4">
                  Operasyon
                </th>

                <th className="px-5 py-4">
                  SLA
                </th>

                <th className="px-5 py-4">
                  Rezervasyon
                </th>

                <th className="px-5 py-4">
                  İletişim
                </th>

                <th className="px-5 py-4">
                  Ticari Geçmiş
                </th>

                <th className="px-5 py-4">
                  Son Aktivite
                </th>

                <th className="px-5 py-4 text-right">
                  İşlem
                </th>

              </tr>

            </thead>


            <tbody>

              {filtered.map(
                ({
                  customer,
                  metric,
                }) => {
                  const communicationDays =
                    daysSince(
                      metric.last_message_at
                    );


                  const isCritical =
                    metric.overdue_case_count >
                      0 ||
                    metric.open_complaint_count >
                      0;


                  return (
                    <tr
                      key={
                        customer.id
                      }
                      className={`border-b border-white/[.045] align-top transition ${
                        isCritical
                          ? "bg-red-500/[.018] hover:bg-red-500/[.035]"
                          : "hover:bg-white/[.025]"
                      }`}
                    >

                      <td className="sticky left-0 z-10 bg-[#07131f] px-5 py-4">

                        <div className="flex items-start gap-3">

                          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/[.07] bg-gradient-to-br from-orange-500/10 to-white/[.02] text-[11px] font-black text-orange-300">
                            {customer.full_name
                              .trim()
                              .split(/\s+/)
                              .slice(0, 2)
                              .map(
                                (
                                  part
                                ) =>
                                  part[0]
                              )
                              .join("")
                              .toUpperCase() ||
                              "M"}
                          </div>


                          <div className="min-w-0">

                            <div className="max-w-[240px] truncate text-[11px] font-black text-slate-100">
                              {customer.full_name}
                            </div>

                            <div className="mt-1 font-mono text-[7px] font-bold text-slate-600">
                              {customer.customer_code}
                            </div>

                            <div className="mt-1 max-w-[230px] truncate text-[8px] text-slate-500">
                              {customer.phone ||
                                customer.email ||
                                "İletişim bilgisi yok"}
                            </div>

                          </div>

                        </div>

                      </td>


                      <td className="px-5 py-4">

                        <div className="flex flex-col items-start gap-2">

                          <span
                            className={`rounded-full border px-2.5 py-1 text-[7px] font-black ${segmentTone(
                              customer.segment
                            )}`}
                          >
                            {segmentLabel(
                              customer.segment
                            )}
                          </span>


                          <span
                            className={`rounded-full border px-2.5 py-1 text-[7px] font-black ${statusTone(
                              customer.status
                            )}`}
                          >
                            {statusLabel(
                              customer.status
                            )}
                          </span>

                        </div>

                      </td>


                      <td className="px-5 py-4">

                        <div className="text-[11px] font-black">
                          {metric.open_case_count}
                        </div>

                        <div className="mt-1 text-[7px] font-bold text-slate-600">
                          açık kayıt
                        </div>


                        {metric.open_complaint_count >
                          0 && (
                          <div className="mt-2 inline-flex items-center gap-1 rounded-lg border border-orange-500/15 bg-orange-500/[.05] px-2 py-1 text-[7px] font-black text-orange-300">
                            <FaExclamationTriangle />
                            {metric.open_complaint_count} şikâyet
                          </div>
                        )}

                      </td>


                      <td className="px-5 py-4">

                        {metric.overdue_case_count >
                          0 ? (
                          <div className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/[.07] px-2.5 py-1.5 text-[7px] font-black text-red-300">
                            <FaBell />
                            {metric.overdue_case_count} gecikmiş
                          </div>
                        ) : metric.due_soon_case_count >
                          0 ? (
                          <div className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/[.07] px-2.5 py-1.5 text-[7px] font-black text-amber-300">
                            <FaClock />
                            {metric.due_soon_case_count} yaklaşan
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/10 bg-emerald-500/[.035] px-2.5 py-1.5 text-[7px] font-black text-emerald-300/70">
                            <FaCheckCircle />
                            Normal
                          </div>
                        )}

                      </td>


                      <td className="px-5 py-4">

                        <div className="flex items-center gap-2 text-[10px] font-black">
                          <FaSuitcase className="text-orange-300" />
                          {metric.booking_count}
                        </div>

                        <div className="mt-1 text-[7px] text-slate-600">
                          Son: {formatDate(
                            metric.last_booking_at
                          )}
                        </div>

                      </td>


                      <td className="px-5 py-4">

                        <div className="flex items-center gap-2 text-[10px] font-black">
                          <FaCommentDots className="text-blue-300" />
                          {metric.message_count}
                        </div>

                        <div className="mt-1 text-[7px] text-slate-600">
                          {metric.inbound_message_count} gelen · {metric.outbound_message_count} giden
                        </div>


                        {(
                          communicationDays ===
                            null ||
                          communicationDays >=
                            30
                        ) && (
                          <div className="mt-2 inline-flex items-center gap-1 rounded-lg border border-violet-500/15 bg-violet-500/[.045] px-2 py-1 text-[7px] font-black text-violet-300">
                            <FaUserClock />
                            {communicationDays ===
                            null
                              ? "İletişim yok"
                              : `${communicationDays} gün sessiz`}
                          </div>
                        )}

                      </td>


                      <td className="px-5 py-4">

                        <div className="text-[9px] font-black">
                          {metric.quote_count} teklif
                        </div>

                        <div className="mt-1 text-[7px] text-slate-600">
                          {metric.trip_count} seyahat
                        </div>

                        <div className="mt-1 text-[7px] text-slate-600">
                          {metric.finance_event_count} finans olayı
                        </div>

                      </td>


                      <td className="px-5 py-4">

                        <div className="text-[8px] font-black text-slate-400">
                          {formatDate(
                            metric.last_activity_at
                          )}
                        </div>

                        <div className="mt-1 text-[7px] text-slate-700">
                          Son müşteri aktivitesi
                        </div>

                      </td>


                      <td className="px-5 py-4 text-right">

                        <Link
                          href={`/dashboard/musteri-360/${customer.id}`}
                          className="inline-flex h-9 items-center gap-2 rounded-xl border border-orange-500/20 bg-orange-500/[.055] px-3 text-[8px] font-black text-orange-300 transition hover:bg-orange-500/[.1]"
                        >
                          360 Profil
                          <FaChevronRight />
                        </Link>

                      </td>

                    </tr>
                  );
                }
              )}

            </tbody>

          </table>

        </div>
      )}


      <div className="border-t border-white/[.06] bg-black/15 px-5 py-4 lg:px-7">

        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">

          <div className="text-[8px] leading-5 text-slate-600">
            Komuta merkezi yalnızca gerçek Customer 360 verilerini özetler. Görsel öncelik sırası segment veya operasyon verisini değiştirmez.
          </div>


          <div className="flex items-center gap-2 text-[7px] font-black text-slate-700">
            <FaCheckCircle />
            Read-only operasyon görünümü
          </div>

        </div>

      </div>

    </section>
  );
}
