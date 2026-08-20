"use client";

import Link from "next/link";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FaBell,
  FaChevronRight,
  FaClock,
  FaCommentDots,
  FaExclamationTriangle,
  FaFilter,
  FaSearch,
  FaSuitcase,
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
    Customer360Customer[
      "segment"
    ]
) {
  const labels = {
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


  return labels[
    value
  ];
}


function segmentTone(
  value:
    Customer360Customer[
      "segment"
    ]
) {
  if (
    value ===
      "vip"
  ) {
    return "border-amber-500/20 bg-amber-500/[.07] text-amber-300";
  }


  if (
    value ===
      "repeat"
  ) {
    return "border-blue-500/20 bg-blue-500/[.06] text-blue-300";
  }


  if (
    value ===
      "corporate"
  ) {
    return "border-violet-500/20 bg-violet-500/[.06] text-violet-300";
  }


  if (
    value ===
      "risk"
  ) {
    return "border-red-500/20 bg-red-500/[.07] text-red-300";
  }


  return "border-white/10 bg-white/[.03] text-slate-400";
}


function statusLabel(
  value:
    Customer360Customer[
      "status"
    ]
) {
  if (
    value ===
      "active"
  ) {
    return "Aktif";
  }


  if (
    value ===
      "blocked"
  ) {
    return "Blokeli";
  }


  return "Pasif";
}


function statusTone(
  value:
    Customer360Customer[
      "status"
    ]
) {
  if (
    value ===
      "active"
  ) {
    return "border-emerald-500/15 bg-emerald-500/[.05] text-emerald-300";
  }


  if (
    value ===
      "blocked"
  ) {
    return "border-red-500/15 bg-red-500/[.05] text-red-300";
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
    new Date(
      value
    );


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
  ).format(
    date
  );
}


function daysSince(
  value:
    string | null
) {
  if (!value) {
    return null;
  }


  const date =
    new Date(
      value
    );


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
    >(
      []
    );


  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    );


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
    useState(
      "all"
    );


  const [
    status,
    setStatus,
  ] =
    useState(
      "all"
    );


  const [
    operation,
    setOperation,
  ] =
    useState<
      OperationalFilter
    >(
      "all"
    );


  useEffect(() => {
    let active =
      true;


    void (
      async () => {
        if (!companyId) {
          return;
        }


        setLoading(
          true
        );

        setError("");


        try {
          const result =
            await loadCustomer360CommandCenterSnapshot(
              companyId
            );


          if (!active) {
            return;
          }


          setMetrics(
            result.customers ??
            []
          );

        } catch (
          currentError
        ) {
          if (!active) {
            return;
          }


          setError(
            currentError instanceof
              Error
              ? currentError.message
              : String(
                  currentError
                )
          );

        } finally {
          if (active) {
            setLoading(
              false
            );
          }
        }
      }
    )();


    return () => {
      active =
        false;
    };

  }, [
    companyId,
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
      () => ({
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
      }),
      [
        customers,
        metrics,
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
                  .filter(
                    Boolean
                  )
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


  return (
    <section className="mt-5 overflow-hidden rounded-[26px] border border-white/10 bg-[#07131f]">

      <div className="border-b border-white/[.07] p-5">

        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">

          <div>

            <div className="text-[8px] font-black uppercase tracking-[.18em] text-orange-300">
              CUSTOMER 360 COMMAND CENTER
            </div>

            <h2 className="mt-2 text-lg font-black">
              Müşteri Operasyon / Komuta Merkezi
            </h2>

            <p className="mt-2 max-w-3xl text-[9px] leading-5 text-slate-600">
              Müşteri, rezervasyon, iletişim ve servis risklerini gerçek Customer 360 kayıtlarından tek operasyon tablosunda özetler.
            </p>

          </div>


          <div className="flex items-center gap-2 text-[8px] font-black text-slate-500">

            <FaUserCheck className="text-emerald-300" />

            Şirket izolasyonlu gerçek veri

          </div>

        </div>


        <div className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-8">

          {[
            [
              "Müşteri",
              stats.customers,
            ],

            [
              "Aktif",
              stats.active,
            ],

            [
              "VIP",
              stats.vip,
            ],

            [
              "Tekrar",
              stats.repeat,
            ],

            [
              "Risk",
              stats.risk,
            ],

            [
              "Açık Kayıt",
              stats.openCases,
            ],

            [
              "SLA Gecikmiş",
              stats.overdue,
            ],

            [
              "Rezervasyonlu",
              stats.bookedCustomers,
            ],
          ].map(
            ([
              label,
              value,
            ]) => (
              <article
                key={
                  String(
                    label
                  )
                }
                className="rounded-xl border border-white/[.07] bg-black/20 p-4"
              >

                <div className="text-[7px] font-black uppercase tracking-[.11em] text-slate-600">
                  {label}
                </div>

                <div className="mt-2 text-xl font-black">
                  {value}
                </div>

              </article>
            )
          )}

        </div>


        {(stats.overdue >
          0 ||
          stats.dueSoon >
          0 ||
          stats.complaints >
          0) && (
          <div className="mt-4 flex flex-wrap gap-2">

            {stats.overdue >
              0 && (
              <button
                type="button"
                onClick={() =>
                  setOperation(
                    "overdue"
                  )
                }
                className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/[.06] px-3 py-2 text-[8px] font-black text-red-300"
              >
                <FaBell />
                {stats.overdue} SLA gecikmiş
              </button>
            )}


            {stats.dueSoon >
              0 && (
              <button
                type="button"
                onClick={() =>
                  setOperation(
                    "due_soon"
                  )
                }
                className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/[.06] px-3 py-2 text-[8px] font-black text-amber-300"
              >
                <FaClock />
                {stats.dueSoon} kayıt 24 saat içinde
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
                className="flex items-center gap-2 rounded-xl border border-orange-500/20 bg-orange-500/[.06] px-3 py-2 text-[8px] font-black text-orange-300"
              >
                <FaExclamationTriangle />
                {stats.complaints} açık şikâyet
              </button>
            )}

          </div>
        )}


        <div className="mt-5 grid gap-3 xl:grid-cols-[1fr_180px_160px_220px]">

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
              placeholder="Müşteri, kod, telefon, e-posta, şehir veya kaynak ara..."
              className="h-11 w-full rounded-xl border border-white/10 bg-[#030a11] pl-10 pr-4 text-[10px] outline-none focus:border-orange-500/40"
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
            className="h-11 rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px]"
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
            className="h-11 rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px]"
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
              className="h-11 w-full rounded-xl border border-white/10 bg-[#030a11] pl-10 pr-3 text-[9px]"
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

        </div>

      </div>


      {error && (
        <div className="border-b border-red-500/10 bg-red-500/[.05] px-5 py-4 text-[9px] font-bold text-red-300">
          {error}
        </div>
      )}


      {loading ? (
        <div className="p-12 text-center text-[9px] text-slate-600">
          Operasyon özeti yükleniyor...
        </div>
      ) : filtered.length ===
        0 ? (
        <div className="p-12 text-center">

          <FaUsers className="mx-auto text-4xl text-slate-800" />

          <div className="mt-4 text-xs font-black">
            Filtreye uygun müşteri bulunamadı
          </div>

          <div className="mt-2 text-[9px] text-slate-600">
            Gerçek müşteri ve operasyon kayıtları üzerinden filtre uygulanır.
          </div>

        </div>
      ) : (
        <div className="max-h-[780px] overflow-auto">

          <table className="min-w-[1500px] w-full">

            <thead className="sticky top-0 z-20 bg-[#091725]">

              <tr className="border-b border-white/[.07] text-left text-[7px] font-black uppercase tracking-[.12em] text-slate-600">

                <th className="px-5 py-4">
                  Müşteri
                </th>

                <th className="px-5 py-4">
                  Segment / Durum
                </th>

                <th className="px-5 py-4">
                  Servis
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
                  Teklif / Seyahat
                </th>

                <th className="px-5 py-4">
                  Son Aktivite
                </th>

                <th className="px-5 py-4 text-right">
                  Hızlı İşlem
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


                  return (
                    <tr
                      key={
                        customer.id
                      }
                      className="border-b border-white/[.045] align-top transition hover:bg-white/[.025]"
                    >

                      <td className="px-5 py-4">

                        <div className="text-[11px] font-black text-slate-100">
                          {customer.full_name}
                        </div>

                        <div className="mt-1 font-mono text-[7px] font-bold text-slate-600">
                          {customer.customer_code}
                        </div>

                        <div className="mt-2 text-[8px] text-slate-500">
                          {customer.phone ||
                            customer.email ||
                            "İletişim bilgisi yok"}
                        </div>

                      </td>


                      <td className="px-5 py-4">

                        <div className="flex flex-wrap gap-2">

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

                        <div className="text-[10px] font-black">
                          {metric.open_case_count}
                        </div>

                        <div className="mt-1 text-[7px] text-slate-600">
                          açık kayıt
                        </div>

                        {metric.open_complaint_count >
                          0 && (
                          <div className="mt-2 inline-flex items-center gap-1 rounded-lg border border-orange-500/15 bg-orange-500/[.04] px-2 py-1 text-[7px] font-black text-orange-300">
                            <FaExclamationTriangle />
                            {metric.open_complaint_count} şikâyet
                          </div>
                        )}

                      </td>


                      <td className="px-5 py-4">

                        {metric.overdue_case_count >
                          0 ? (
                          <div className="inline-flex items-center gap-1 rounded-lg border border-red-500/20 bg-red-500/[.06] px-2.5 py-1.5 text-[7px] font-black text-red-300">
                            <FaBell />
                            {metric.overdue_case_count} gecikmiş
                          </div>
                        ) : metric.due_soon_case_count >
                          0 ? (
                          <div className="inline-flex items-center gap-1 rounded-lg border border-amber-500/20 bg-amber-500/[.06] px-2.5 py-1.5 text-[7px] font-black text-amber-300">
                            <FaClock />
                            {metric.due_soon_case_count} yakın
                          </div>
                        ) : (
                          <span className="text-[8px] text-slate-700">
                            Normal
                          </span>
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

                        {(communicationDays ===
                          null ||
                          communicationDays >=
                            30) && (
                          <div className="mt-2 inline-flex items-center gap-1 rounded-lg border border-amber-500/10 bg-amber-500/[.035] px-2 py-1 text-[7px] font-black text-amber-300/80">
                            <FaUserClock />
                            {communicationDays ===
                            null
                              ? "İletişim yok"
                              : `${communicationDays} gün`}
                          </div>
                        )}

                      </td>


                      <td className="px-5 py-4">

                        <div className="text-[9px] font-black">
                          {metric.quote_count} teklif
                        </div>

                        <div className="mt-1 text-[7px] text-slate-600">
                          {metric.trip_count} seyahat · {metric.finance_event_count} finans olayı
                        </div>

                      </td>


                      <td className="px-5 py-4 text-[8px] text-slate-500">
                        {formatDate(
                          metric.last_activity_at
                        )}
                      </td>


                      <td className="px-5 py-4 text-right">

                        <div className="flex justify-end gap-2">

                          <Link
                            href={`/dashboard/musteri-360/${customer.id}`}
                            className="inline-flex h-9 items-center gap-2 rounded-lg border border-orange-500/15 bg-orange-500/[.04] px-3 text-[8px] font-black text-orange-300 transition hover:bg-orange-500/[.08]"
                          >
                            360 Profil
                            <FaChevronRight />
                          </Link>

                        </div>

                      </td>

                    </tr>
                  );
                }
              )}

            </tbody>

          </table>

        </div>
      )}


      <div className="border-t border-white/[.06] bg-black/10 px-5 py-4">

        <div className="text-[8px] leading-5 text-slate-600">
          Operasyon önceliği; gecikmiş SLA, açık şikâyet ve yaklaşan çözüm sürelerini üstte göstermek için yalnızca görünüm sıralamasında kullanılır. Müşteri segmenti veya gerçek veriler otomatik değiştirilmez.
        </div>

      </div>

    </section>
  );
}
