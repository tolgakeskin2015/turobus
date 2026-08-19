"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import {
  FaArrowLeft,
  FaBell,
  FaCheck,
  FaCheckCircle,
  FaClock,
  FaExclamationTriangle,
  FaExternalLinkAlt,
  FaFilter,
  FaSearch,
  FaShip,
  FaTimes,
  FaUserTie,
} from "react-icons/fa";

import {
  getCurrentMembership,
  getCurrentUser,
} from "@/lib/current-user";

import {
  approvePartnerChange,
  loadYachtControlTower,
  rejectPartnerChange,
  type PartnerChangeRequest,
  type PartnerTowerAssignment,
  type PartnerTowerBooking,
  type PartnerTowerEvent,
  type PartnerTowerSupplier,
  type PartnerTowerYacht,
} from "@/lib/yacht-os/control-tower";


function money(
  value: number
) {
  return new Intl.NumberFormat(
    "tr-TR",
    {
      style: "currency",
      currency: "TRY",
      maximumFractionDigits: 0,
    }
  ).format(
    Number(
      value || 0
    )
  );
}


function dateTime(
  value:
    string | null
) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "tr-TR",
    {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(
    new Date(value)
  );
}


function hoursBetween(
  start: string,
  end:
    string | null
) {
  const finish =
    end
      ? new Date(end)
      : new Date();

  return Math.max(
    0,
    (
      finish.getTime() -
      new Date(
        start
      ).getTime()
    ) /
      3600000
  );
}


function riskTone(
  value: string
) {
  if (
    value ===
    "critical"
  ) {
    return "border-red-500/30 bg-red-500/10 text-red-300";
  }

  if (
    value ===
    "high"
  ) {
    return "border-orange-500/30 bg-orange-500/10 text-orange-300";
  }

  if (
    value ===
    "normal"
  ) {
    return "border-amber-500/20 bg-amber-500/10 text-amber-300";
  }

  return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
}


function riskText(
  value: string
) {
  if (
    value ===
    "critical"
  ) {
    return "KRİTİK";
  }

  if (
    value ===
    "high"
  ) {
    return "YÜKSEK";
  }

  if (
    value ===
    "normal"
  ) {
    return "NORMAL";
  }

  return "DÜŞÜK";
}


export default function YachtControlTowerPage() {
  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    companyId,
    setCompanyId,
  ] =
    useState("");

  const [
    companyName,
    setCompanyName,
  ] =
    useState("");

  const [
    suppliers,
    setSuppliers,
  ] =
    useState<
      PartnerTowerSupplier[]
    >([]);

  const [
    yachts,
    setYachts,
  ] =
    useState<
      PartnerTowerYacht[]
    >([]);

  const [
    assignments,
    setAssignments,
  ] =
    useState<
      PartnerTowerAssignment[]
    >([]);

  const [
    bookings,
    setBookings,
  ] =
    useState<
      PartnerTowerBooking[]
    >([]);

  const [
    requests,
    setRequests,
  ] =
    useState<
      PartnerChangeRequest[]
    >([]);

  const [
    events,
    setEvents,
  ] =
    useState<
      PartnerTowerEvent[]
    >([]);

  const [
    query,
    setQuery,
  ] =
    useState("");

  const [
    riskFilter,
    setRiskFilter,
  ] =
    useState("all");

  const [
    selectedRequest,
    setSelectedRequest,
  ] =
    useState<
      PartnerChangeRequest | null
    >(null);

  const [
    reviewNote,
    setReviewNote,
  ] =
    useState("");

  const [
    notice,
    setNotice,
  ] =
    useState("");

  const [
    error,
    setError,
  ] =
    useState("");


  const refresh =
    useCallback(
      async (
        activeCompanyId:
          string
      ) => {
        const data =
          await loadYachtControlTower(
            activeCompanyId
          );

        setSuppliers(
          data.suppliers
        );

        setYachts(
          data.yachts
        );

        setAssignments(
          data.assignments
        );

        setBookings(
          data.bookings
        );

        setRequests(
          data.requests
        );

        setEvents(
          data.events
        );
      },
      []
    );


  useEffect(
    () => {
      async function boot() {
        try {
          const user =
            await getCurrentUser();

          if (!user) {
            throw new Error(
              "Aktif oturum bulunamadı."
            );
          }

          const membership =
            await getCurrentMembership(
              user.id
            );

          if (
            !membership
          ) {
            throw new Error(
              "Aktif firma bulunamadı."
            );
          }

          setCompanyId(
            membership.company_id
          );

          setCompanyName(
            membership.company.name
          );

          await refresh(
            membership.company_id
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
        }
      }

      void boot();
    },
    [
      refresh,
    ]
  );


  function toast(
    message: string
  ) {
    setNotice(
      message
    );

    window.setTimeout(
      () =>
        setNotice(""),
      2200
    );
  }


  async function processRequest(
    request:
      PartnerChangeRequest,
    decision:
      "approve" |
      "reject"
  ) {
    setSaving(true);

    try {
      if (
        decision ===
        "approve"
      ) {
        await approvePartnerChange(
          request.id,
          reviewNote
        );
      } else {
        await rejectPartnerChange(
          request.id,
          reviewNote
        );
      }

      await refresh(
        companyId
      );

      setSelectedRequest(
        null
      );

      setReviewNote("");

      toast(
        decision ===
        "approve"
          ? "Değişiklik onaylandı ve uygulandı."
          : "Değişiklik reddedildi."
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
      setSaving(false);
    }
  }


  const supplierRows =
    useMemo(
      () =>
        suppliers.map(
          (
            supplier
          ) => {
            const yachtIds =
              assignments
                .filter(
                  (
                    assignment
                  ) =>
                    assignment.supplier_id ===
                    supplier.id
                )
                .map(
                  (
                    assignment
                  ) =>
                    assignment.yacht_id
                );

            const supplierBookings =
              bookings.filter(
                (
                  booking
                ) =>
                  yachtIds.includes(
                    booking.yacht_id
                  )
              );

            const decisions =
              supplierBookings.filter(
                (
                  booking
                ) =>
                  booking.supplier_decision_at
              );

            const avgResponse =
              decisions.length
                ? decisions.reduce(
                    (
                      total,
                      booking
                    ) =>
                      total +
                      hoursBetween(
                        booking.created_at,
                        booking.supplier_decision_at
                      ),
                    0
                  ) /
                  decisions.length
                : 0;

            const rejected =
              supplierBookings.filter(
                (
                  booking
                ) =>
                  booking.supplier_decision ===
                  "rejected"
              ).length;

            const confirmed =
              supplierBookings.filter(
                (
                  booking
                ) =>
                  booking.supplier_decision ===
                  "confirmed"
              ).length;

            const pending =
              supplierBookings.filter(
                (
                  booking
                ) =>
                  booking.status ===
                  "pending"
              );

            const overdue =
              pending.filter(
                (
                  booking
                ) =>
                  hoursBetween(
                    booking.created_at,
                    null
                  ) >= 4
              ).length;

            const rejectionRate =
              decisions.length
                ? rejected /
                  decisions.length
                : 0;

            const responsePenalty =
              Math.min(
                35,
                avgResponse * 4
              );

            const rejectionPenalty =
              rejectionRate *
              35;

            const overduePenalty =
              Math.min(
                20,
                overdue * 5
              );

            const score =
              Math.max(
                0,
                Math.round(
                  100 -
                    responsePenalty -
                    rejectionPenalty -
                    overduePenalty
                )
              );

            let risk =
              "low";

            if (
              score < 45 ||
              overdue >= 3
            ) {
              risk =
                "critical";
            } else if (
              score < 65 ||
              overdue >= 2
            ) {
              risk =
                "high";
            } else if (
              score < 80 ||
              overdue >= 1
            ) {
              risk =
                "normal";
            }

            return {
              supplier,
              yachtCount:
                yachtIds.length,
              bookingCount:
                supplierBookings.length,
              confirmed,
              rejected,
              pending:
                pending.length,
              overdue,
              avgResponse,
              score,
              risk,
            };
          }
        ),
      [
        suppliers,
        assignments,
        bookings,
      ]
    );


  const filteredSuppliers =
    useMemo(
      () => {
        const needle =
          query
            .trim()
            .toLocaleLowerCase(
              "tr"
            );

        return supplierRows.filter(
          (
            row
          ) => {
            const text =
              `${row.supplier.name} ${row.supplier.contact_name ?? ""}`
                .toLocaleLowerCase(
                  "tr"
                );

            const searchOk =
              !needle ||
              text.includes(
                needle
              );

            const riskOk =
              riskFilter ===
                "all" ||
              row.risk ===
                riskFilter;

            return (
              searchOk &&
              riskOk
            );
          }
        );
      },
      [
        supplierRows,
        query,
        riskFilter,
      ]
    );


  const pendingRequests =
    requests.filter(
      (
        request
      ) =>
        request.status ===
        "pending"
    );


  const overdueBookings =
    bookings.filter(
      (
        booking
      ) =>
        booking.status ===
          "pending" &&
        hoursBetween(
          booking.created_at,
          null
        ) >= 4
    );


  const rejectedToday =
    bookings.filter(
      (
        booking
      ) =>
        booking.supplier_decision ===
          "rejected" &&
        booking.supplier_decision_at &&
        new Date(
          booking.supplier_decision_at
        ).toDateString() ===
          new Date()
            .toDateString()
    ).length;


  const criticalPartners =
    supplierRows.filter(
      (
        row
      ) =>
        row.risk ===
        "critical"
    ).length;


  const priceRequests =
    pendingRequests.filter(
      (
        request
      ) =>
        request.request_type ===
        "base_price"
    );


  const alertRows =
    useMemo(
      () => {
        const alerts:
          Array<{
            id: string;
            severity:
              "critical" |
              "high" |
              "normal";
            title: string;
            detail: string;
            supplier:
              string;
            createdAt:
              string;
          }> = [];

        pendingRequests.forEach(
          (
            request
          ) => {
            const supplier =
              suppliers.find(
                (
                  item
                ) =>
                  item.id ===
                  request.supplier_id
              );

            const yacht =
              yachts.find(
                (
                  item
                ) =>
                  item.id ===
                  request.yacht_id
              );

            alerts.push({
              id:
                `request-${request.id}`,
              severity:
                request.risk_level ===
                "critical"
                  ? "critical"
                  : request.risk_level ===
                    "high"
                    ? "high"
                    : "normal",
              title:
                request.request_type ===
                "base_price"
                  ? "Fiyat değişikliği onay bekliyor"
                  : "Partner değişikliği",
              detail:
                `${yacht?.name ?? "Tekne"} · ${JSON.stringify(
                  request.proposed_value
                )}`,
              supplier:
                supplier?.name ??
                "—",
              createdAt:
                request.created_at,
            });
          }
        );

        overdueBookings.forEach(
          (
            booking
          ) => {
            const assignment =
              assignments.find(
                (
                  item
                ) =>
                  item.yacht_id ===
                  booking.yacht_id
              );

            const supplier =
              suppliers.find(
                (
                  item
                ) =>
                  item.id ===
                  assignment?.supplier_id
              );

            alerts.push({
              id:
                `sla-${booking.id}`,
              severity:
                hoursBetween(
                  booking.created_at,
                  null
                ) >= 8
                  ? "critical"
                  : "high",
              title:
                "Rezervasyon cevap SLA aşıldı",
              detail:
                `${booking.booking_code} · ${hoursBetween(
                  booking.created_at,
                  null
                ).toFixed(1)} saat bekliyor`,
              supplier:
                supplier?.name ??
                "—",
              createdAt:
                booking.created_at,
            });
          }
        );

        events
          .filter(
            (
              event
            ) =>
              event.event_type ===
              "booking_decision" &&
              String(
                event.new_value?.status ??
                ""
              ) ===
              "cancelled"
          )
          .slice(
            0,
            20
          )
          .forEach(
            (
              event
            ) => {
              const supplier =
                suppliers.find(
                  (
                    item
                  ) =>
                    item.id ===
                    event.supplier_id
                );

              alerts.push({
                id:
                  `reject-${event.id}`,
                severity:
                  "high",
                title:
                  "Partner rezervasyonu reddetti",
                detail:
                  "Rezervasyon tekrar satış havuzuna alınmalı.",
                supplier:
                  supplier?.name ??
                  "—",
                createdAt:
                  event.created_at,
              });
            }
          );

        return alerts
          .sort(
            (
              a,
              b
            ) =>
              new Date(
                b.createdAt
              ).getTime() -
              new Date(
                a.createdAt
              ).getTime()
          )
          .slice(
            0,
            80
          );
      },
      [
        pendingRequests,
        overdueBookings,
        events,
        suppliers,
        yachts,
        assignments,
      ]
    );


  if (loading) {
    return (
      <main className="grid min-h-[70vh] place-items-center bg-[#030a11] text-white">
        <FaBell className="animate-pulse text-4xl text-orange-400" />
      </main>
    );
  }


  return (
    <main className="min-h-screen bg-[#030a11] text-white">

      {notice && (
        <div className="fixed right-5 top-5 z-[120] flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-[#07131f] px-5 py-4 shadow-2xl">
          <FaCheckCircle className="text-emerald-400" />
          <span className="text-xs font-black">
            {notice}
          </span>
        </div>
      )}


      <div className="mx-auto max-w-[1800px] px-5 py-7 lg:px-8">

        <section className="rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,.13),transparent_30%),radial-gradient(circle_at_70%_0%,rgba(249,115,22,.13),transparent_35%),linear-gradient(145deg,#07131f,#040b12)] p-6 lg:p-8">

          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">

            <div>
              <Link
                href="/dashboard/yat-os"
                className="inline-flex items-center gap-2 text-[9px] font-black text-slate-500 hover:text-white"
              >
                <FaArrowLeft />
                YAT & TEKNE OS
              </Link>

              <div className="mt-5 flex flex-wrap gap-2">

                <span className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-[8px] font-black uppercase tracking-[.22em] text-red-300">
                  CONTROL TOWER
                </span>

                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[8px] font-black text-emerald-300">
                  ● Canlı Partner İzleme
                </span>

              </div>

              <h1 className="mt-4 text-3xl font-black tracking-[-.04em] lg:text-5xl">
                Partner{" "}
                <span className="text-orange-400">
                  Kontrol Kulesi
                </span>
              </h1>

              <p className="mt-3 max-w-3xl text-xs leading-5 text-slate-400">
                {companyName}
                {" · "}
                Fiyat değişiklikleri, cevap SLA,
                rezervasyon retleri, partner performansı
                ve kritik operasyon riskleri tek merkezde.
              </p>
            </div>


            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">

              <HeaderMetric
                label="Bekleyen Onay"
                value={String(
                  pendingRequests.length
                )}
                danger={
                  pendingRequests.length >
                  0
                }
              />

              <HeaderMetric
                label="SLA Aşımı"
                value={String(
                  overdueBookings.length
                )}
                danger={
                  overdueBookings.length >
                  0
                }
              />

              <HeaderMetric
                label="Bugün Ret"
                value={String(
                  rejectedToday
                )}
                danger={
                  rejectedToday >
                  0
                }
              />

              <HeaderMetric
                label="Kritik Partner"
                value={String(
                  criticalPartners
                )}
                danger={
                  criticalPartners >
                  0
                }
              />

            </div>

          </div>
        </section>


        {error && (
          <div className="mt-4 flex items-center justify-between rounded-2xl border border-red-500/20 bg-red-500/[.06] p-4 text-xs font-bold text-red-200">
            <span>
              {error}
            </span>

            <button
              type="button"
              onClick={() =>
                setError("")
              }
            >
              <FaTimes />
            </button>
          </div>
        )}


        <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">

          <Kpi
            title="Fiyat Onay Kuyruğu"
            value={String(
              priceRequests.length
            )}
            detail="Partner fiyat değişiklikleri"
            danger={
              priceRequests.length >
              0
            }
          />

          <Kpi
            title="4+ Saat Bekleyen"
            value={String(
              overdueBookings.length
            )}
            detail="Rezervasyon cevap SLA"
            danger={
              overdueBookings.length >
              0
            }
          />

          <Kpi
            title="Ortalama Partner Skoru"
            value={
              supplierRows.length
                ? String(
                    Math.round(
                      supplierRows.reduce(
                        (
                          total,
                          row
                        ) =>
                          total +
                          row.score,
                        0
                      ) /
                      supplierRows.length
                    )
                  )
                : "0"
            }
            detail="100 üzerinden performans"
          />

          <Kpi
            title="Aktif Alarm"
            value={String(
              alertRows.length
            )}
            detail="Kontrol gerektiren kayıt"
            danger={
              alertRows.length >
              0
            }
          />

          <Kpi
            title="Partner Ağı"
            value={String(
              suppliers.length
            )}
            detail={`${assignments.length} bağlı tekne`}
          />

        </section>


        <section className="mt-5 grid gap-5 xl:grid-cols-[1.15fr_.85fr]">

          <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#07131f]">

            <div className="flex items-center justify-between border-b border-white/10 p-5">
              <div>
                <div className="text-lg font-black">
                  Kritik Alarm Merkezi
                </div>

                <div className="mt-1 text-[9px] text-slate-500">
                  Önceliğe göre sıralanmış canlı partner olayları
                </div>
              </div>

              <FaBell className="text-orange-400" />
            </div>


            <div className="max-h-[560px] overflow-auto">

              <table className="w-full min-w-[900px] text-left">

                <thead className="sticky top-0 z-10 bg-[#0a1723]">
                  <tr className="text-[8px] font-black uppercase tracking-[.1em] text-slate-600">

                    <th className="px-5 py-4">
                      Risk
                    </th>

                    <th className="px-5 py-4">
                      Alarm
                    </th>

                    <th className="px-5 py-4">
                      Partner
                    </th>

                    <th className="px-5 py-4">
                      Detay
                    </th>

                    <th className="px-5 py-4">
                      Zaman
                    </th>

                  </tr>
                </thead>

                <tbody>
                  {alertRows.map(
                    (
                      alert
                    ) => (
                      <tr
                        key={
                          alert.id
                        }
                        className="border-t border-white/[.06] transition hover:bg-white/[.02]"
                      >

                        <td className="px-5 py-4">
                          <span className={`rounded-full border px-2.5 py-1 text-[7px] font-black ${riskTone(
                            alert.severity
                          )}`}>
                            {riskText(
                              alert.severity
                            )}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="text-[9px] font-black">
                            {
                              alert.title
                            }
                          </div>
                        </td>

                        <td className="px-5 py-4 text-[9px] font-bold">
                          {
                            alert.supplier
                          }
                        </td>

                        <td className="max-w-[320px] px-5 py-4 text-[8px] text-slate-500">
                          {
                            alert.detail
                          }
                        </td>

                        <td className="px-5 py-4 text-[8px] text-slate-500">
                          {dateTime(
                            alert.createdAt
                          )}
                        </td>

                      </tr>
                    )
                  )}

                  {alertRows.length ===
                    0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-5 py-14 text-center text-[10px] text-slate-600"
                      >
                        Aktif kritik alarm bulunmuyor.
                      </td>
                    </tr>
                  )}
                </tbody>

              </table>
            </div>
          </div>


          <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#07131f]">

            <div className="border-b border-white/10 p-5">
              <div className="text-lg font-black">
                Fiyat Değişikliği Onay Kuyruğu
              </div>

              <div className="mt-1 text-[9px] text-slate-500">
                Partner fiyatı merkez onayından geçmeden yayına çıkmaz
              </div>
            </div>


            <div className="max-h-[560px] overflow-auto">

              {priceRequests.map(
                (
                  request
                ) => {
                  const supplier =
                    suppliers.find(
                      (
                        item
                      ) =>
                        item.id ===
                        request.supplier_id
                    );

                  const yacht =
                    yachts.find(
                      (
                        item
                      ) =>
                        item.id ===
                        request.yacht_id
                    );

                  const oldPrice =
                    Number(
                      request.old_value?.price ??
                      0
                    );

                  const newPrice =
                    Number(
                      request.proposed_value?.price ??
                      0
                    );

                  const delta =
                    Number(
                      request.proposed_value?.delta_percent ??
                      0
                    );

                  return (
                    <div
                      key={
                        request.id
                      }
                      className="border-b border-white/[.06] p-5"
                    >

                      <div className="flex items-start justify-between gap-4">

                        <div>
                          <div className="text-[10px] font-black">
                            {
                              yacht?.name ??
                              "Tekne"
                            }
                          </div>

                          <div className="mt-1 text-[8px] text-slate-500">
                            {
                              supplier?.name ??
                              "—"
                            }
                          </div>
                        </div>

                        <span className={`rounded-full border px-2.5 py-1 text-[7px] font-black ${riskTone(
                          request.risk_level
                        )}`}>
                          {riskText(
                            request.risk_level
                          )}
                        </span>

                      </div>


                      <div className="mt-4 grid grid-cols-3 gap-2">

                        <MiniMetric
                          label="Eski Fiyat"
                          value={money(
                            oldPrice
                          )}
                        />

                        <MiniMetric
                          label="Yeni Fiyat"
                          value={money(
                            newPrice
                          )}
                        />

                        <MiniMetric
                          label="Değişim"
                          value={`%${delta.toFixed(
                            1
                          )}`}
                        />

                      </div>


                      <div className="mt-4 flex gap-2">

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRequest(
                              request
                            );

                            setReviewNote("");
                          }}
                          className="h-9 flex-1 rounded-lg border border-white/10 bg-white/[.03] text-[8px] font-black"
                        >
                          İncele
                        </button>

                        <button
                          type="button"
                          disabled={
                            saving
                          }
                          onClick={() =>
                            void processRequest(
                              request,
                              "approve"
                            )
                          }
                          className="flex h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-500 text-[8px] font-black"
                        >
                          <FaCheck />
                          Onayla
                        </button>

                        <button
                          type="button"
                          disabled={
                            saving
                          }
                          onClick={() =>
                            void processRequest(
                              request,
                              "reject"
                            )
                          }
                          className="flex h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-red-500/20 bg-red-500/[.07] text-[8px] font-black text-red-300"
                        >
                          <FaTimes />
                          Reddet
                        </button>

                      </div>

                    </div>
                  );
                }
              )}

              {priceRequests.length ===
                0 && (
                <div className="p-12 text-center">
                  <FaCheckCircle className="mx-auto text-3xl text-emerald-400" />

                  <div className="mt-3 text-sm font-black">
                    Onay kuyruğu temiz
                  </div>

                  <div className="mt-1 text-[9px] text-slate-600">
                    Bekleyen fiyat değişikliği bulunmuyor.
                  </div>
                </div>
              )}

            </div>
          </div>

        </section>


        <section className="mt-5 overflow-hidden rounded-[28px] border border-white/10 bg-[#07131f]">

          <div className="flex flex-col gap-3 border-b border-white/10 p-5 lg:flex-row lg:items-center">

            <div className="relative flex-1">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-xs text-slate-600" />

              <input
                value={
                  query
                }
                onChange={(
                  event
                ) =>
                  setQuery(
                    event.target.value
                  )
                }
                placeholder="Partner veya yetkili ara..."
                className="h-12 w-full rounded-xl border border-white/10 bg-white/[.025] pl-10 pr-4 text-xs outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <FaFilter className="text-slate-600" />

              <select
                value={
                  riskFilter
                }
                onChange={(
                  event
                ) =>
                  setRiskFilter(
                    event.target.value
                  )
                }
                className="h-12 rounded-xl border border-white/10 bg-[#0b1723] px-4 text-[9px] font-black outline-none"
              >
                <option value="all">
                  Tüm Riskler
                </option>

                <option value="critical">
                  Kritik
                </option>

                <option value="high">
                  Yüksek
                </option>

                <option value="normal">
                  Normal
                </option>

                <option value="low">
                  Düşük
                </option>
              </select>
            </div>

          </div>


          <div className="overflow-x-auto">

            <table className="w-full min-w-[1550px] text-left">

              <thead className="sticky top-0 bg-[#0a1723]">

                <tr className="text-[8px] font-black uppercase tracking-[.1em] text-slate-600">

                  <th className="px-5 py-4">
                    Partner
                  </th>

                  <th className="px-5 py-4">
                    Risk
                  </th>

                  <th className="px-5 py-4">
                    Skor
                  </th>

                  <th className="px-5 py-4">
                    Filo
                  </th>

                  <th className="px-5 py-4">
                    Rezervasyon
                  </th>

                  <th className="px-5 py-4">
                    Onay
                  </th>

                  <th className="px-5 py-4">
                    Ret
                  </th>

                  <th className="px-5 py-4">
                    Bekleyen
                  </th>

                  <th className="px-5 py-4">
                    SLA Aşımı
                  </th>

                  <th className="px-5 py-4">
                    Ort. Cevap
                  </th>

                  <th className="px-5 py-4">
                    Portal
                  </th>

                </tr>

              </thead>


              <tbody>

                {filteredSuppliers.map(
                  (
                    row
                  ) => (
                    <tr
                      key={
                        row.supplier.id
                      }
                      className="border-t border-white/[.06] transition hover:bg-white/[.02]"
                    >

                      <td className="px-5 py-4">

                        <div className="flex items-center gap-3">

                          <div className="grid h-10 w-10 place-items-center rounded-xl bg-orange-500/10 text-orange-400">
                            <FaUserTie />
                          </div>

                          <div>
                            <div className="text-[10px] font-black">
                              {
                                row.supplier.name
                              }
                            </div>

                            <div className="mt-1 text-[8px] text-slate-600">
                              {
                                row.supplier.contact_name ??
                                "—"
                              }
                            </div>
                          </div>

                        </div>

                      </td>

                      <td className="px-5 py-4">
                        <span className={`rounded-full border px-2.5 py-1 text-[7px] font-black ${riskTone(
                          row.risk
                        )}`}>
                          {riskText(
                            row.risk
                          )}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className={`text-lg font-black ${
                          row.score >= 80
                            ? "text-emerald-300"
                            : row.score >= 60
                              ? "text-amber-300"
                              : "text-red-300"
                        }`}>
                          {
                            row.score
                          }
                        </div>

                        <div className="text-[7px] text-slate-600">
                          /100
                        </div>
                      </td>

                      <td className="px-5 py-4 text-[10px] font-black">
                        {
                          row.yachtCount
                        }
                      </td>

                      <td className="px-5 py-4 text-[10px] font-black">
                        {
                          row.bookingCount
                        }
                      </td>

                      <td className="px-5 py-4 text-[10px] font-black text-emerald-300">
                        {
                          row.confirmed
                        }
                      </td>

                      <td className="px-5 py-4 text-[10px] font-black text-red-300">
                        {
                          row.rejected
                        }
                      </td>

                      <td className="px-5 py-4 text-[10px] font-black text-amber-300">
                        {
                          row.pending
                        }
                      </td>

                      <td className="px-5 py-4">
                        <span className={`rounded-lg px-2.5 py-1.5 text-[9px] font-black ${
                          row.overdue > 0
                            ? "bg-red-500/10 text-red-300"
                            : "bg-emerald-500/10 text-emerald-300"
                        }`}>
                          {
                            row.overdue
                          }
                        </span>
                      </td>

                      <td className="px-5 py-4 text-[9px] font-black">
                        {
                          row.avgResponse
                            ? `${row.avgResponse.toFixed(
                                1
                              )} saat`
                            : "—"
                        }
                      </td>

                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() =>
                            window.open(
                              `/yat-tedarikci/${row.supplier.portal_token}`,
                              "_blank",
                              "noopener,noreferrer"
                            )
                          }
                          className="grid h-9 w-9 place-items-center rounded-lg bg-orange-500"
                        >
                          <FaExternalLinkAlt />
                        </button>
                      </td>

                    </tr>
                  )
                )}

              </tbody>

            </table>
          </div>
        </section>


        <section className="mt-5 overflow-hidden rounded-[28px] border border-white/10 bg-[#07131f]">

          <div className="border-b border-white/10 p-5">
            <div className="text-lg font-black">
              Geciken Rezervasyon Cevapları
            </div>

            <div className="mt-1 text-[9px] text-slate-500">
              4 saati aşan partner cevapları operasyon riski sayılır
            </div>
          </div>


          <div className="overflow-x-auto">

            <table className="w-full min-w-[1150px] text-left">

              <thead className="sticky top-0 bg-[#0a1723]">
                <tr className="text-[8px] font-black uppercase text-slate-600">

                  <th className="px-5 py-4">
                    Rezervasyon
                  </th>

                  <th className="px-5 py-4">
                    Partner
                  </th>

                  <th className="px-5 py-4">
                    Tekne
                  </th>

                  <th className="px-5 py-4">
                    Misafir
                  </th>

                  <th className="px-5 py-4">
                    Oluşturuldu
                  </th>

                  <th className="px-5 py-4">
                    Bekleme
                  </th>

                  <th className="px-5 py-4">
                    Satış
                  </th>

                  <th className="px-5 py-4">
                    Risk
                  </th>

                </tr>
              </thead>


              <tbody>

                {overdueBookings.map(
                  (
                    booking
                  ) => {
                    const assignment =
                      assignments.find(
                        (
                          item
                        ) =>
                          item.yacht_id ===
                          booking.yacht_id
                      );

                    const supplier =
                      suppliers.find(
                        (
                          item
                        ) =>
                          item.id ===
                          assignment?.supplier_id
                      );

                    const yacht =
                      yachts.find(
                        (
                          item
                        ) =>
                          item.id ===
                          booking.yacht_id
                      );

                    const wait =
                      hoursBetween(
                        booking.created_at,
                        null
                      );

                    return (
                      <tr
                        key={
                          booking.id
                        }
                        className="border-t border-white/[.06]"
                      >

                        <td className="px-5 py-4 text-[9px] font-black">
                          {
                            booking.booking_code
                          }
                        </td>

                        <td className="px-5 py-4 text-[9px] font-bold">
                          {
                            supplier?.name ??
                            "—"
                          }
                        </td>

                        <td className="px-5 py-4 text-[9px]">
                          {
                            yacht?.name ??
                            "—"
                          }
                        </td>

                        <td className="px-5 py-4 text-[9px]">
                          {
                            booking.guest_name
                          }
                        </td>

                        <td className="px-5 py-4 text-[8px] text-slate-500">
                          {dateTime(
                            booking.created_at
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <span className="rounded-lg bg-red-500/10 px-2.5 py-1.5 text-[9px] font-black text-red-300">
                            {
                              wait.toFixed(
                                1
                              )
                            } saat
                          </span>
                        </td>

                        <td className="px-5 py-4 text-[9px] font-black">
                          {money(
                            booking.total_amount
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <span className={`rounded-full border px-2.5 py-1 text-[7px] font-black ${
                            wait >= 8
                              ? riskTone(
                                  "critical"
                                )
                              : riskTone(
                                  "high"
                                )
                          }`}>
                            {wait >= 8
                              ? "KRİTİK"
                              : "YÜKSEK"}
                          </span>
                        </td>

                      </tr>
                    );
                  }
                )}

              </tbody>

            </table>
          </div>
        </section>

      </div>


      {selectedRequest && (
        <div className="fixed inset-0 z-[130] grid place-items-center bg-black/75 p-4 backdrop-blur-sm">

          <div className="w-full max-w-xl rounded-[28px] border border-white/10 bg-[#07131f] p-6 shadow-2xl">

            <div className="flex items-start justify-between gap-4">

              <div>
                <div className="text-[8px] font-black uppercase tracking-[.2em] text-orange-400">
                  DEĞİŞİKLİK İNCELEME
                </div>

                <div className="mt-2 text-xl font-black">
                  Partner Fiyat Talebi
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedRequest(
                    null
                  )
                }
                className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-slate-400"
              >
                <FaTimes />
              </button>

            </div>


            <div className="mt-6 grid grid-cols-2 gap-3">

              <MiniMetric
                label="Mevcut Fiyat"
                value={money(
                  Number(
                    selectedRequest.old_value?.price ??
                    0
                  )
                )}
              />

              <MiniMetric
                label="Talep Edilen"
                value={money(
                  Number(
                    selectedRequest.proposed_value?.price ??
                    0
                  )
                )}
              />

            </div>


            <div className="mt-4">
              <span className={`rounded-full border px-3 py-1.5 text-[8px] font-black ${riskTone(
                selectedRequest.risk_level
              )}`}>
                RİSK:{" "}
                {riskText(
                  selectedRequest.risk_level
                )}
              </span>
            </div>


            <label className="mt-5 block">
              <span className="mb-1.5 block text-[8px] font-black uppercase text-slate-500">
                İnceleme Notu
              </span>

              <textarea
                value={
                  reviewNote
                }
                onChange={(
                  event
                ) =>
                  setReviewNote(
                    event.target.value
                  )
                }
                placeholder="Onay / ret gerekçesi..."
                className="min-h-24 w-full resize-none rounded-xl border border-white/10 bg-white/[.025] p-4 text-xs outline-none"
              />
            </label>


            <div className="mt-6 grid grid-cols-2 gap-3">

              <button
                type="button"
                disabled={
                  saving
                }
                onClick={() =>
                  void processRequest(
                    selectedRequest,
                    "reject"
                  )
                }
                className="h-12 rounded-xl border border-red-500/20 bg-red-500/[.08] text-xs font-black text-red-300"
              >
                Reddet
              </button>

              <button
                type="button"
                disabled={
                  saving
                }
                onClick={() =>
                  void processRequest(
                    selectedRequest,
                    "approve"
                  )
                }
                className="h-12 rounded-xl bg-emerald-500 text-xs font-black"
              >
                Onayla ve Uygula
              </button>

            </div>

          </div>
        </div>
      )}

    </main>
  );
}


function HeaderMetric({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className={`min-w-[115px] rounded-xl border px-4 py-3 ${
      danger
        ? "border-red-500/20 bg-red-500/[.07]"
        : "border-white/10 bg-black/10"
    }`}>
      <div className="text-[7px] font-black uppercase text-slate-600">
        {label}
      </div>

      <div className={`mt-1 text-sm font-black ${
        danger
          ? "text-red-300"
          : "text-white"
      }`}>
        {value}
      </div>
    </div>
  );
}


function Kpi({
  title,
  value,
  detail,
  danger = false,
}: {
  title: string;
  value: string;
  detail: string;
  danger?: boolean;
}) {
  return (
    <div className={`rounded-[24px] border p-5 ${
      danger
        ? "border-red-500/20 bg-red-500/[.04]"
        : "border-white/10 bg-[#07131f]"
    }`}>
      <div className="text-[8px] font-black uppercase tracking-[.15em] text-slate-600">
        {title}
      </div>

      <div className={`mt-3 text-2xl font-black ${
        danger
          ? "text-red-300"
          : "text-white"
      }`}>
        {value}
      </div>

      <div className="mt-2 text-[8px] text-slate-500">
        {detail}
      </div>
    </div>
  );
}


function MiniMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/[.07] bg-black/10 p-3">
      <div className="text-[7px] font-black uppercase text-slate-600">
        {label}
      </div>

      <div className="mt-1 text-[10px] font-black">
        {value}
      </div>
    </div>
  );
}
