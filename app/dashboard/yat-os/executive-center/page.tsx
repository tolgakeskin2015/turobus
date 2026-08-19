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
  FaCalendarAlt,
  FaChartLine,
  FaCheckCircle,
  FaCoins,
  FaExclamationTriangle,
  FaFilter,
  FaFire,
  FaSearch,
  FaRobot,
  FaShip,
  FaTasks,
  FaTimes,
  FaUserTie,
  FaUsers,
  FaWallet,
} from "react-icons/fa";

import {
  getCurrentMembership,
  getCurrentUser,
} from "@/lib/current-user";

import {
  loadYachtExecutiveCenter,
} from "@/lib/yacht-os/executive-center";

import {
  supabase,
} from "@/lib/supabase";


type ExecutiveData =
  Awaited<
    ReturnType<
      typeof loadYachtExecutiveCenter
    >
  >;


type ActionItem = {
  id: string;

  category:
    | "finance"
    | "crm"
    | "revenue"
    | "operation"
    | "fleet";

  severity:
    | "critical"
    | "high"
    | "medium"
    | "low";

  title: string;
  detail: string;

  value?: string;

  href: string;
};


function money(
  value: number,
  currency = "TRY"
) {
  return new Intl.NumberFormat(
    "tr-TR",
    {
      style:
        "currency",

      currency,

      maximumFractionDigits:
        0,
    }
  ).format(
    Number(
      value || 0
    )
  );
}


function dateText(
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
  ).format(
    date
  );
}


function dayText(
  value: string
) {
  const date =
    new Date(
      `${value}T12:00:00`
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
    }
  ).format(
    date
  );
}


function severityLabel(
  value:
    ActionItem[
      "severity"
    ]
) {
  if (
    value ===
    "critical"
  ) {
    return "Kritik";
  }

  if (
    value ===
    "high"
  ) {
    return "Yüksek";
  }

  if (
    value ===
    "medium"
  ) {
    return "Orta";
  }

  return "Düşük";
}


function severityTone(
  value:
    ActionItem[
      "severity"
    ]
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
    "medium"
  ) {
    return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  }

  return "border-blue-500/30 bg-blue-500/10 text-blue-300";
}


function categoryLabel(
  value:
    ActionItem[
      "category"
    ]
) {
  if (
    value ===
    "finance"
  ) {
    return "Finans";
  }

  if (
    value ===
    "crm"
  ) {
    return "CRM";
  }

  if (
    value ===
    "revenue"
  ) {
    return "Revenue";
  }

  if (
    value ===
    "operation"
  ) {
    return "Operasyon";
  }

  return "Filo";
}


function StatCard({
  title,
  value,
  detail,
  icon,
}: {
  title: string;
  value: string;
  detail: string;
  icon:
    React.ReactNode;
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-[#07131f] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[9px] font-black uppercase tracking-[.18em] text-slate-600">
            {title}
          </div>

          <div className="mt-3 text-2xl font-black tracking-tight">
            {value}
          </div>

          <div className="mt-2 text-[10px] text-slate-500">
            {detail}
          </div>
        </div>

        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-orange-500/10 text-orange-400">
          {icon}
        </div>
      </div>
    </div>
  );
}


function SectionHeader({
  title,
  detail,
  icon,
}: {
  title: string;
  detail: string;
  icon:
    React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-white/10 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex items-center gap-2 text-sm font-black">
          <span className="text-orange-400">
            {icon}
          </span>

          {title}
        </div>

        <div className="mt-1 text-[10px] text-slate-500">
          {detail}
        </div>
      </div>
    </div>
  );
}


export default function YachtExecutiveCenterPage() {
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
    data,
    setData,
  ] =
    useState<
      ExecutiveData | null
    >(
      null
    );

  const [
    query,
    setQuery,
  ] =
    useState("");

  const [
    category,
    setCategory,
  ] =
    useState("all");

  const [
    severity,
    setSeverity,
  ] =
    useState("all");


  const [
    copilotQuestion,
    setCopilotQuestion,
  ] =
    useState(
      "Bugün yönetici olarak önce hangi 3 konuya müdahale etmeliyim?"
    );

  const [
    copilotAnswer,
    setCopilotAnswer,
  ] =
    useState("");

  const [
    copilotError,
    setCopilotError,
  ] =
    useState("");

  const [
    copilotLoading,
    setCopilotLoading,
  ] =
    useState(false);


  const refresh =
    useCallback(
      async (
        nextCompanyId:
          string
      ) => {
        const result =
          await loadYachtExecutiveCenter(
            nextCompanyId
          );

        setData(
          result
        );
      },
      []
    );


  useEffect(
    () => {
      async function boot() {
        setLoading(
          true
        );

        setError("");

        try {
          const user =
            await getCurrentUser();

          if (!user) {
            throw new Error(
              "Oturum bulunamadı."
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
              "Aktif firma üyeliği bulunamadı."
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
          setLoading(
            false
          );
        }
      }

      void boot();
    },
    [
      refresh,
    ]
  );


  async function askCopilot(
    suggestedQuestion?:
      string
  ) {
    const currentQuestion =
      (
        suggestedQuestion ??
        copilotQuestion
      ).trim();


    if (
      !companyId ||
      !currentQuestion
    ) {
      return;
    }


    setCopilotLoading(
      true
    );

    setCopilotError("");


    try {
      const {
        data:
          sessionResult,
      } =
        await supabase.auth.getSession();


      const accessToken =
        sessionResult
          .session
          ?.access_token;


      if (!accessToken) {
        throw new Error(
          "Copilot için aktif oturum bulunamadı."
        );
      }


      const response =
        await fetch(
          "/api/yacht-os/copilot",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${accessToken}`,
            },

            body:
              JSON.stringify({
                companyId,

                question:
                  currentQuestion,
              }),
          }
        );


      const payload =
        await response.json() as {
          answer?: string;
          error?: string;
        };


      if (
        !response.ok
      ) {
        throw new Error(
          payload.error ||
          "Copilot yanıt üretemedi."
        );
      }


      setCopilotQuestion(
        currentQuestion
      );

      setCopilotAnswer(
        payload.answer ||
        ""
      );

    } catch (
      currentError
    ) {
      setCopilotError(
        currentError instanceof
          Error
          ? currentError.message
          : String(
              currentError
            )
      );
    } finally {
      setCopilotLoading(
        false
      );
    }
  }


  const metrics =
    useMemo(
      () => {
        if (!data) {
          return {
            totalSales:
              0,

            collected:
              0,

            openBalance:
              0,

            criticalBalance:
              0,

            hotLeads:
              0,

            openAlerts:
              0,

            criticalAlerts:
              0,

            openTasks:
              0,

            todayBookings:
              0,

            next7Bookings:
              0,

            pendingRates:
              0,

            fleetActive:
              0,

            fleetMaintenance:
              0,
          };
        }


        const now =
          new Date();

        const today =
          now
            .toISOString()
            .slice(
              0,
              10
            );

        const end =
          new Date(
            now
          );

        end.setDate(
          end.getDate() +
            7
        );

        const endText =
          end
            .toISOString()
            .slice(
              0,
              10
            );


        const activeBookings =
          data.finance.bookings.filter(
            (
              booking
            ) =>
              booking.status !==
              "cancelled"
          );


        const totalSales =
          activeBookings.reduce(
            (
              total,
              booking
            ) =>
              total +
              Number(
                booking.total_amount ||
                  0
              ),
            0
          );


        const collected =
          activeBookings.reduce(
            (
              total,
              booking
            ) =>
              total +
              Number(
                booking.paid_amount ||
                  0
              ),
            0
          );


        const openBalance =
          activeBookings.reduce(
            (
              total,
              booking
            ) =>
              total +
              Math.max(
                0,
                Number(
                  booking.total_amount ||
                    0
                ) -
                  Number(
                    booking.paid_amount ||
                      0
                  )
              ),
            0
          );


        const criticalBalance =
          activeBookings
            .filter(
              (
                booking
              ) =>
                (
                  booking.collection_priority ===
                    "critical" ||
                  booking.collection_priority ===
                    "high"
                ) &&
                Number(
                  booking.total_amount ||
                    0
                ) >
                  Number(
                    booking.paid_amount ||
                      0
                  )
            )
            .reduce(
              (
                total,
                booking
              ) =>
                total +
                Math.max(
                  0,
                  Number(
                    booking.total_amount ||
                      0
                  ) -
                    Number(
                      booking.paid_amount ||
                        0
                    )
                ),
              0
            );


        const hotLeads =
          data.crm.leads.filter(
            (
              lead
            ) =>
              Number(
                lead.score ||
                  0
              ) >=
                75 &&
              ![
                "won",
                "lost",
              ].includes(
                String(
                  lead.stage
                )
              )
          ).length;


        const openEvents =
          data.crm.events.filter(
            (
              event
            ) =>
              event.status ===
              "open"
          );


        const criticalAlerts =
          openEvents.filter(
            (
              event
            ) =>
              event.severity ===
                "critical" ||
              event.severity ===
                "high"
          ).length;


        const openTasks =
          data.os.tasks.filter(
            (
              task
            ) =>
              task.status !==
                "completed" &&
              task.status !==
                "cancelled"
          ).length;


        const todayBookings =
          activeBookings.filter(
            (
              booking
            ) =>
              booking.start_date ===
              today
          ).length;


        const next7Bookings =
          activeBookings.filter(
            (
              booking
            ) =>
              booking.start_date >=
                today &&
              booking.start_date <=
                endText
          ).length;


        const pendingRates =
          data.revenue.recommendations.filter(
            (
              recommendation
            ) =>
              recommendation.status ===
              "pending"
          ).length;


        const fleetActive =
          data.os.yachts.filter(
            (
              yacht
            ) =>
              yacht.status !==
              "passive"
          ).length;


        const fleetMaintenance =
          data.os.yachts.filter(
            (
              yacht
            ) =>
              yacht.status ===
              "maintenance"
          ).length;


        return {
          totalSales,
          collected,
          openBalance,
          criticalBalance,

          hotLeads,

          openAlerts:
            openEvents.length,

          criticalAlerts,

          openTasks,

          todayBookings,

          next7Bookings,

          pendingRates,

          fleetActive,

          fleetMaintenance,
        };
      },
      [
        data,
      ]
    );


  const actionItems =
    useMemo<
      ActionItem[]
    >(
      () => {
        if (!data) {
          return [];
        }

        const rows:
          ActionItem[] = [];

        const now =
          new Date();


        for (
          const booking
          of data.finance.bookings
        ) {
          if (
            booking.status ===
            "cancelled"
          ) {
            continue;
          }

          const remaining =
            Math.max(
              0,
              Number(
                booking.total_amount ||
                  0
              ) -
                Number(
                  booking.paid_amount ||
                    0
                )
            );


          if (
            remaining <= 0.01
          ) {
            continue;
          }


          const due =
            booking.collection_due_at
              ? new Date(
                  booking.collection_due_at
                )
              : null;


          const overdue =
            Boolean(
              due &&
              due.getTime() <
                now.getTime()
            );


          if (
            overdue ||
            booking.collection_priority ===
              "critical" ||
            booking.collection_priority ===
              "high"
          ) {
            rows.push({
              id:
                `finance-${booking.id}`,

              category:
                "finance",

              severity:
                booking.collection_priority ===
                  "critical"
                  ? "critical"
                  : overdue
                    ? "high"
                    : "medium",

              title:
                `${booking.booking_code} tahsilat riski`,

              detail:
                overdue
                  ? `Tahsilat vadesi geçti · ${booking.guest_name}`
                  : `Yüksek öncelikli açık bakiye · ${booking.guest_name}`,

              value:
                money(
                  remaining,
                  booking.currency
                ),

              href:
                "/dashboard/yat-os/finance-control-tower",
            });
          }
        }


        for (
          const event
          of data.crm.events
        ) {
          if (
            event.status !==
            "open"
          ) {
            continue;
          }

          rows.push({
            id:
              `crm-${event.id}`,

            category:
              "crm",

            severity:
              event.severity ===
                "critical"
                ? "critical"
                : event.severity ===
                    "high"
                  ? "high"
                  : event.severity ===
                      "medium"
                    ? "medium"
                    : "low",

            title:
              event.title,

            detail:
              event.message ||
              event.rule_code,

            href:
              "/dashboard/yat-os/crm-automation",
          });
        }


        for (
          const lead
          of data.crm.leads
        ) {
          const score =
            Number(
              lead.score ||
                0
            );

          if (
            score >= 75 &&
            ![
              "won",
              "lost",
            ].includes(
              String(
                lead.stage
              )
            )
          ) {
            rows.push({
              id:
                `lead-${lead.id}`,

              category:
                "crm",

              severity:
                score >= 90
                  ? "critical"
                  : "high",

              title:
                `Sıcak lead: ${lead.customer_name}`,

              detail:
                `${lead.source || "Kaynak yok"} · Lead skoru ${score}/100`,

              value:
                lead.budget_max
                  ? money(
                      Number(
                        lead.budget_max
                      ),
                      lead.currency ||
                        "TRY"
                    )
                  : undefined,

              href:
                "/dashboard/yat-os/crm-center",
            });
          }


          if (
            lead.next_follow_up_at
          ) {
            const follow =
              new Date(
                lead.next_follow_up_at
              );

            if (
              follow.getTime() <
                now.getTime() &&
              ![
                "won",
                "lost",
              ].includes(
                String(
                  lead.stage
                )
              )
            ) {
              rows.push({
                id:
                  `follow-${lead.id}`,

                category:
                  "crm",

                severity:
                  "high",

                title:
                  `Geciken takip: ${lead.customer_name}`,

                detail:
                  `Planlanan takip ${dateText(
                    lead.next_follow_up_at
                  )}`,

                href:
                  "/dashboard/yat-os/crm-center",
              });
            }
          }
        }


        for (
          const recommendation
          of data.revenue.recommendations
        ) {
          if (
            recommendation.status !==
            "pending"
          ) {
            continue;
          }


          const yacht =
            data.revenue.yachts.find(
              (
                item
              ) =>
                item.id ===
                recommendation.yacht_id
            );


          const adjustment =
            Number(
              recommendation.adjustment_percent ||
                0
            );


          rows.push({
            id:
              `revenue-${recommendation.id}`,

            category:
              "revenue",

            severity:
              Math.abs(
                adjustment
              ) >= 15
                ? "high"
                : "medium",

            title:
              `${yacht?.name || "Tekne"} fiyat önerisi`,

            detail:
              `${dayText(
                recommendation.period_start
              )} – ${dayText(
                recommendation.period_end
              )} · Doluluk %${Math.round(
                Number(
                  recommendation.occupancy_percent ||
                    0
                )
              )}`,

            value:
              `${adjustment > 0 ? "+" : ""}${adjustment.toFixed(
                1
              )}%`,

            href:
              "/dashboard/yat-os/revenue-intelligence",
          });
        }


        for (
          const task
          of data.os.tasks
        ) {
          if (
            task.status ===
              "completed" ||
            task.status ===
              "cancelled"
          ) {
            continue;
          }

          if (
            !task.due_at
          ) {
            continue;
          }


          const due =
            new Date(
              task.due_at
            );


          if (
            due.getTime() <
            now.getTime()
          ) {
            rows.push({
              id:
                `task-${task.id}`,

              category:
                "operation",

              severity:
                task.priority ===
                  "critical"
                  ? "critical"
                  : task.priority ===
                      "high"
                    ? "high"
                    : "medium",

              title:
                `Geciken görev: ${task.title}`,

              detail:
                `Son tarih ${dateText(
                  task.due_at
                )}`,

              href:
                "/dashboard/yat-os/operation-center",
            });
          }
        }


        for (
          const yacht
          of data.os.yachts
        ) {
          if (
            yacht.status ===
            "maintenance"
          ) {
            rows.push({
              id:
                `fleet-${yacht.id}`,

              category:
                "fleet",

              severity:
                "medium",

              title:
                `${yacht.name} bakımda`,

              detail:
                `${yacht.city}${yacht.marina ? ` · ${yacht.marina}` : ""}`,

              href:
                "/dashboard/yat-os/fleet-maintenance",
            });
          }
        }


        const order:
          Record<
            ActionItem[
              "severity"
            ],
            number
          > = {
            critical:
              4,

            high:
              3,

            medium:
              2,

            low:
              1,
          };


        return rows.sort(
          (
            a,
            b
          ) =>
            order[
              b.severity
            ] -
            order[
              a.severity
            ]
        );
      },
      [
        data,
      ]
    );


  const filteredActions =
    useMemo(
      () => {
        const needle =
          query
            .trim()
            .toLocaleLowerCase(
              "tr"
            );


        return actionItems.filter(
          (
            item
          ) => {
            const matchesText =
              !needle ||
              `${item.title} ${item.detail} ${categoryLabel(
                item.category
              )}`
                .toLocaleLowerCase(
                  "tr"
                )
                .includes(
                  needle
                );


            const matchesCategory =
              category ===
                "all" ||
              item.category ===
                category;


            const matchesSeverity =
              severity ===
                "all" ||
              item.severity ===
                severity;


            return (
              matchesText &&
              matchesCategory &&
              matchesSeverity
            );
          }
        );
      },
      [
        actionItems,
        query,
        category,
        severity,
      ]
    );


  const upcomingBookings =
    useMemo(
      () => {
        if (!data) {
          return [];
        }

        const today =
          new Date()
            .toISOString()
            .slice(
              0,
              10
            );


        return data.finance.bookings
          .filter(
            (
              booking
            ) =>
              booking.status !==
                "cancelled" &&
              booking.start_date >=
                today
          )
          .sort(
            (
              a,
              b
            ) =>
              a.start_date.localeCompare(
                b.start_date
              )
          )
          .slice(
            0,
            10
          );
      },
      [
        data,
      ]
    );


  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#030a11] text-white">
        <div className="text-center">
          <FaChartLine className="mx-auto animate-pulse text-4xl text-orange-400" />

          <div className="mt-4 text-sm font-black">
            Yönetici Karar Merkezi hazırlanıyor...
          </div>
        </div>
      </main>
    );
  }


  return (
    <main className="min-h-screen bg-[#030a11] text-white">
      <div className="mx-auto max-w-[1650px] px-5 py-7 lg:px-8">

        <section className="rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,.18),transparent_34%),linear-gradient(145deg,#07131f,#040b12)] p-6 lg:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[.2em] text-orange-300">
                  TUROBUS YACHT OS
                </span>

                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[9px] font-black text-emerald-300">
                  ● Gerçek zamanlı yönetim görünümü
                </span>
              </div>

              <h1 className="mt-5 text-3xl font-black tracking-[-.04em] lg:text-5xl">
                Yönetici &{" "}
                <span className="text-orange-400">
                  Karar Merkezi
                </span>
              </h1>

              <p className="mt-3 max-w-3xl text-xs leading-6 text-slate-400">
                {companyName || "Aktif firma"} · Satış, tahsilat,
                CRM, revenue, filo ve operasyon sinyallerini tek
                ekranda önceliklendirir.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/dashboard/yat-os"
                className="flex min-h-12 items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-5 text-xs font-black text-slate-300 transition hover:bg-white/[.08] hover:text-white"
              >
                <FaShip />
                Yat OS Ana Merkez
              </Link>

              <button
                type="button"
                onClick={() => {
                  if (!companyId) {
                    return;
                  }

                  setLoading(
                    true
                  );

                  setError("");

                  void refresh(
                    companyId
                  )
                    .catch(
                      (
                        currentError
                      ) => {
                        setError(
                          currentError instanceof
                            Error
                            ? currentError.message
                            : String(
                                currentError
                              )
                        );
                      }
                    )
                    .finally(
                      () =>
                        setLoading(
                          false
                        )
                    );
                }}
                className="flex min-h-12 items-center gap-2 rounded-xl bg-orange-500 px-5 text-xs font-black text-white transition hover:bg-orange-400"
              >
                <FaChartLine />
                Veriyi Yenile
              </button>
            </div>
          </div>
        </section>


        {error && (
          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/[.06] p-4">
            <FaExclamationTriangle className="mt-0.5 shrink-0 text-red-400" />

            <div className="min-w-0 flex-1 text-xs font-bold text-red-200">
              {error}
            </div>

            <button
              type="button"
              onClick={() =>
                setError("")
              }
              className="text-red-300"
            >
              <FaTimes />
            </button>
          </div>
        )}


        <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <StatCard
            title="Toplam Satış"
            value={money(
              metrics.totalSales
            )}
            detail="İptal dışı rezervasyon cirosu"
            icon={<FaCoins />}
          />

          <StatCard
            title="Tahsil Edildi"
            value={money(
              metrics.collected
            )}
            detail={`${money(
              metrics.openBalance
            )} açık bakiye`}
            icon={<FaWallet />}
          />

          <StatCard
            title="Riskli Bakiye"
            value={money(
              metrics.criticalBalance
            )}
            detail="Yüksek/kritik tahsilat"
            icon={<FaExclamationTriangle />}
          />

          <StatCard
            title="Sıcak Lead"
            value={String(
              metrics.hotLeads
            )}
            detail="Lead skoru 75+"
            icon={<FaFire />}
          />

          <StatCard
            title="Açık Alarm"
            value={String(
              metrics.openAlerts
            )}
            detail={`${metrics.criticalAlerts} yüksek/kritik`}
            icon={<FaBell />}
          />

          <StatCard
            title="Açık Görev"
            value={String(
              metrics.openTasks
            )}
            detail="Aktif operasyon görevleri"
            icon={<FaTasks />}
          />
        </section>


        <section className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Bugün Çıkış"
            value={String(
              metrics.todayBookings
            )}
            detail={`${metrics.next7Bookings} rezervasyon / 7 gün`}
            icon={<FaCalendarAlt />}
          />

          <StatCard
            title="Aktif Filo"
            value={String(
              metrics.fleetActive
            )}
            detail={`${metrics.fleetMaintenance} tekne bakımda`}
            icon={<FaShip />}
          />

          <StatCard
            title="Fiyat Önerisi"
            value={String(
              metrics.pendingRates
            )}
            detail="İncelenmeyi bekleyen öneri"
            icon={<FaChartLine />}
          />

          <StatCard
            title="Karar Kuyruğu"
            value={String(
              actionItems.length
            )}
            detail="Önceliklendirilmiş aksiyon"
            icon={<FaCheckCircle />}
          />
        </section>


        <section className="mt-5 overflow-hidden rounded-[28px] border border-violet-500/20 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,.16),transparent_35%),linear-gradient(145deg,#07131f,#040b12)]">
          <div className="border-b border-white/10 p-5 lg:p-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-500/10 text-violet-300">
                    <FaRobot />
                  </div>

                  <div>
                    <div className="text-sm font-black">
                      Yacht OS AI Copilot
                    </div>

                    <div className="mt-1 text-[10px] text-slate-500">
                      Gerçek şirket verisini analiz eder · V1 salt-okunur · Kendiliğinden işlem yapmaz
                    </div>
                  </div>
                </div>
              </div>

              <span className="w-fit rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[9px] font-black text-emerald-300">
                READ-ONLY CONTROL
              </span>
            </div>


            <div className="mt-5 flex flex-wrap gap-2">
              {[
                "Bugün önce hangi 3 konuya müdahale etmeliyim?",
                "Tahsilat açısından en büyük riskler neler?",
                "Hangi lead'lere bugün dönmeliyiz?",
                "Hangi teknelerde fiyat fırsatı var?",
                "Yaklaşan operasyonlarda risk görüyor musun?",
              ].map(
                (
                  prompt
                ) => (
                  <button
                    key={
                      prompt
                    }
                    type="button"
                    disabled={
                      copilotLoading
                    }
                    onClick={() => {
                      setCopilotQuestion(
                        prompt
                      );

                      void askCopilot(
                        prompt
                      );
                    }}
                    className="rounded-xl border border-white/10 bg-white/[.035] px-3 py-2 text-[9px] font-black text-slate-400 transition hover:border-violet-500/30 hover:text-violet-300 disabled:opacity-40"
                  >
                    {prompt}
                  </button>
                )
              )}
            </div>


            <div className="mt-4 grid gap-3 xl:grid-cols-[1fr_auto]">
              <textarea
                value={
                  copilotQuestion
                }
                onChange={(
                  event
                ) =>
                  setCopilotQuestion(
                    event.target.value
                  )
                }
                maxLength={
                  2000
                }
                rows={
                  3
                }
                placeholder="Yat OS verilerine sor..."
                className="w-full resize-none rounded-2xl border border-white/10 bg-[#030a11] px-4 py-3 text-xs font-bold leading-6 outline-none transition focus:border-violet-500/40"
              />

              <button
                type="button"
                disabled={
                  copilotLoading ||
                  !copilotQuestion.trim()
                }
                onClick={() =>
                  void askCopilot()
                }
                className="min-h-14 rounded-2xl bg-violet-500 px-6 text-xs font-black text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-40 xl:min-w-[160px]"
              >
                {copilotLoading
                  ? "Analiz Ediyor..."
                  : "Copilot'a Sor"}
              </button>
            </div>


            {copilotError && (
              <div className="mt-4 flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/[.06] p-4">
                <FaExclamationTriangle className="mt-0.5 shrink-0 text-red-400" />

                <div className="text-[10px] font-bold leading-5 text-red-200">
                  {copilotError}
                </div>
              </div>
            )}


            {copilotAnswer && (
              <div className="mt-4 rounded-2xl border border-violet-500/20 bg-violet-500/[.05] p-5">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.16em] text-violet-300">
                  <FaRobot />
                  Copilot Analizi
                </div>

                <div className="mt-4 whitespace-pre-wrap text-xs font-medium leading-7 text-slate-300">
                  {copilotAnswer}
                </div>

                <div className="mt-4 border-t border-white/10 pt-3 text-[9px] leading-5 text-slate-600">
                  Bu ekran karar desteği verir. Rezervasyon, tahsilat, fiyat,
                  operasyon veya CRM kaydını kendi başına değiştirmez.
                </div>
              </div>
            )}
          </div>
        </section>


        <section className="mt-5 overflow-hidden rounded-[26px] border border-white/10 bg-[#07131f]">
          <SectionHeader
            title="Yönetici Aksiyon Kuyruğu"
            detail="Kritik konuları farklı modüllerden tek listede toplar."
            icon={<FaExclamationTriangle />}
          />

          <div className="grid gap-3 border-b border-white/10 p-4 xl:grid-cols-[1fr_180px_180px]">
            <label className="relative">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-xs text-slate-600" />

              <input
                value={query}
                onChange={(
                  event
                ) =>
                  setQuery(
                    event.target.value
                  )
                }
                placeholder="Rezervasyon, müşteri, alarm, tekne ara..."
                className="h-12 w-full rounded-xl border border-white/10 bg-[#030a11] pl-10 pr-4 text-xs font-bold outline-none transition focus:border-orange-500/40"
              />
            </label>

            <label className="relative">
              <FaFilter className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xs text-slate-600" />

              <select
                value={category}
                onChange={(
                  event
                ) =>
                  setCategory(
                    event.target.value
                  )
                }
                className="h-12 w-full appearance-none rounded-xl border border-white/10 bg-[#030a11] pl-10 pr-4 text-xs font-black outline-none"
              >
                <option value="all">
                  Tüm Alanlar
                </option>

                <option value="finance">
                  Finans
                </option>

                <option value="crm">
                  CRM
                </option>

                <option value="revenue">
                  Revenue
                </option>

                <option value="operation">
                  Operasyon
                </option>

                <option value="fleet">
                  Filo
                </option>
              </select>
            </label>

            <select
              value={severity}
              onChange={(
                event
              ) =>
                setSeverity(
                  event.target.value
                )
              }
              className="h-12 rounded-xl border border-white/10 bg-[#030a11] px-4 text-xs font-black outline-none"
            >
              <option value="all">
                Tüm Öncelikler
              </option>

              <option value="critical">
                Kritik
              </option>

              <option value="high">
                Yüksek
              </option>

              <option value="medium">
                Orta
              </option>

              <option value="low">
                Düşük
              </option>
            </select>
          </div>


          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left">
              <thead className="bg-white/[.025] text-[9px] uppercase tracking-[.16em] text-slate-600">
                <tr>
                  <th className="px-5 py-4">
                    Öncelik
                  </th>

                  <th className="px-5 py-4">
                    Alan
                  </th>

                  <th className="px-5 py-4">
                    Konu
                  </th>

                  <th className="px-5 py-4">
                    Detay
                  </th>

                  <th className="px-5 py-4 text-right">
                    Değer
                  </th>

                  <th className="px-5 py-4 text-right">
                    Aksiyon
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredActions.map(
                  (
                    item
                  ) => (
                    <tr
                      key={item.id}
                      className="border-t border-white/[.06] transition hover:bg-white/[.02]"
                    >
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-[9px] font-black ${severityTone(
                            item.severity
                          )}`}
                        >
                          {severityLabel(
                            item.severity
                          )}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-[10px] font-black text-slate-400">
                        {categoryLabel(
                          item.category
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <div className="text-xs font-black">
                          {item.title}
                        </div>
                      </td>

                      <td className="max-w-[420px] px-5 py-4 text-[10px] leading-5 text-slate-500">
                        {item.detail}
                      </td>

                      <td className="px-5 py-4 text-right text-xs font-black text-orange-300">
                        {item.value ||
                          "—"}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <Link
                          href={item.href}
                          className="inline-flex min-h-9 items-center rounded-xl border border-white/10 bg-white/[.035] px-3 text-[9px] font-black text-slate-300 transition hover:border-orange-500/30 hover:text-orange-300"
                        >
                          Merkeze Git
                        </Link>
                      </td>
                    </tr>
                  )
                )}

                {filteredActions.length ===
                  0 && (
                  <tr>
                    <td
                      colSpan={
                        6
                      }
                      className="px-5 py-14 text-center"
                    >
                      <FaCheckCircle className="mx-auto text-3xl text-emerald-400" />

                      <div className="mt-4 text-sm font-black">
                        Filtreye uyan kritik aksiyon bulunmuyor.
                      </div>

                      <div className="mt-2 text-[10px] text-slate-500">
                        Yönetici kuyruğu temiz görünüyor.
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>


        <section className="mt-5 grid gap-5 xl:grid-cols-[1.45fr_.85fr]">

          <div className="overflow-hidden rounded-[26px] border border-white/10 bg-[#07131f]">
            <SectionHeader
              title="Yaklaşan Rezervasyonlar"
              detail="En yakın 10 aktif yat rezervasyonu."
              icon={<FaCalendarAlt />}
            />

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead className="bg-white/[.025] text-[9px] uppercase tracking-[.16em] text-slate-600">
                  <tr>
                    <th className="px-5 py-4">
                      Rezervasyon
                    </th>

                    <th className="px-5 py-4">
                      Misafir
                    </th>

                    <th className="px-5 py-4">
                      Tarih
                    </th>

                    <th className="px-5 py-4 text-right">
                      Tutar
                    </th>

                    <th className="px-5 py-4 text-right">
                      Açık
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {upcomingBookings.map(
                    (
                      booking
                    ) => {
                      const remaining =
                        Math.max(
                          0,
                          Number(
                            booking.total_amount ||
                              0
                          ) -
                            Number(
                              booking.paid_amount ||
                                0
                            )
                        );

                      return (
                        <tr
                          key={
                            booking.id
                          }
                          className="border-t border-white/[.06]"
                        >
                          <td className="px-5 py-4 text-xs font-black">
                            {booking.booking_code}
                          </td>

                          <td className="px-5 py-4">
                            <div className="text-xs font-bold">
                              {booking.guest_name}
                            </div>

                            <div className="mt-1 text-[9px] text-slate-600">
                              {booking.payment_status}
                            </div>
                          </td>

                          <td className="px-5 py-4 text-[10px] text-slate-400">
                            {dayText(
                              booking.start_date
                            )}
                            {" → "}
                            {dayText(
                              booking.end_date
                            )}
                          </td>

                          <td className="px-5 py-4 text-right text-xs font-black">
                            {money(
                              Number(
                                booking.total_amount ||
                                  0
                              ),
                              booking.currency
                            )}
                          </td>

                          <td className="px-5 py-4 text-right text-xs font-black text-orange-300">
                            {money(
                              remaining,
                              booking.currency
                            )}
                          </td>
                        </tr>
                      );
                    }
                  )}

                  {upcomingBookings.length ===
                    0 && (
                    <tr>
                      <td
                        colSpan={
                          5
                        }
                        className="px-5 py-12 text-center text-xs text-slate-500"
                      >
                        Yaklaşan rezervasyon bulunamadı.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>


          <div className="overflow-hidden rounded-[26px] border border-white/10 bg-[#07131f]">
            <SectionHeader
              title="Hızlı Yönetim"
              detail="Doğrudan operasyon merkezlerine geçiş."
              icon={<FaUserTie />}
            />

            <div className="grid gap-3 p-4">

              <Link
                href="/dashboard/yat-os/finance-control-tower"
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[.025] p-4 transition hover:border-emerald-500/30"
              >
                <div>
                  <div className="text-xs font-black">
                    Finans Control Tower
                  </div>

                  <div className="mt-1 text-[9px] text-slate-500">
                    Tahsilat, refund ve risk
                  </div>
                </div>

                <FaWallet className="text-emerald-400" />
              </Link>


              <Link
                href="/dashboard/yat-os/crm-automation"
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[.025] p-4 transition hover:border-red-500/30"
              >
                <div>
                  <div className="text-xs font-black">
                    CRM Alarm Merkezi
                  </div>

                  <div className="mt-1 text-[9px] text-slate-500">
                    Lead takip ve satış alarmı
                  </div>
                </div>

                <FaBell className="text-red-400" />
              </Link>


              <Link
                href="/dashboard/yat-os/revenue-intelligence"
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[.025] p-4 transition hover:border-violet-500/30"
              >
                <div>
                  <div className="text-xs font-black">
                    Revenue Intelligence
                  </div>

                  <div className="mt-1 text-[9px] text-slate-500">
                    Fiyat ve doluluk kararları
                  </div>
                </div>

                <FaChartLine className="text-violet-400" />
              </Link>


              <Link
                href="/dashboard/yat-os/operation-center"
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[.025] p-4 transition hover:border-blue-500/30"
              >
                <div>
                  <div className="text-xs font-black">
                    Operasyon Merkezi
                  </div>

                  <div className="mt-1 text-[9px] text-slate-500">
                    Sefer, görev ve hizmet takibi
                  </div>
                </div>

                <FaTasks className="text-blue-400" />
              </Link>


              <Link
                href="/dashboard/yat-os/sales-performance"
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[.025] p-4 transition hover:border-orange-500/30"
              >
                <div>
                  <div className="text-xs font-black">
                    Satış Performansı
                  </div>

                  <div className="mt-1 text-[9px] text-slate-500">
                    Kaynak, dönüşüm ve performans
                  </div>
                </div>

                <FaUsers className="text-orange-400" />
              </Link>

            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
