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
  FaChartBar,
  FaCheckCircle,
  FaClock,
  FaCoins,
  FaFilter,
  FaFire,
  FaSearch,
  FaTimes,
  FaUsers,
} from "react-icons/fa";

import {
  getCurrentMembership,
  getCurrentUser,
} from "@/lib/current-user";

import {
  loadYachtSalesPerformance,
} from "@/lib/yacht-os/sales-performance";


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


function percent(
  value: number
) {

  return `%${Number(
    value || 0
  ).toFixed(
    1
  )}`;
}


function sourceLabel(
  value: string
) {

  const map:
    Record<
      string,
      string
    > = {
      whatsapp:
        "WhatsApp",

      phone:
        "Telefon",

      instagram:
        "Instagram",

      website:
        "Website",

      google:
        "Google",

      referral:
        "Referans",

      partner:
        "Partner",

      walk_in:
        "Ofis",

      manual:
        "Manuel",

      other:
        "Diğer",
    };


  return (
    map[value] ||
    value
  );
}


export default function YachtSalesPerformancePage() {

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    companyName,
    setCompanyName,
  ] =
    useState("");

  const [
    leads,
    setLeads,
  ] =
    useState<any[]>(
      []
    );

  const [
    quotes,
    setQuotes,
  ] =
    useState<any[]>(
      []
    );

  const [
    bookings,
    setBookings,
  ] =
    useState<any[]>(
      []
    );

  const [
    activities,
    setActivities,
  ] =
    useState<any[]>(
      []
    );

  const [
    alarms,
    setAlarms,
  ] =
    useState<any[]>(
      []
    );

  const [
    range,
    setRange,
  ] =
    useState("30");

  const [
    query,
    setQuery,
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
        companyId:
          string
      ) => {

        const data =
          await loadYachtSalesPerformance(
            companyId
          );


        setLeads(
          data.leads
        );

        setQuotes(
          data.quotes
        );

        setBookings(
          data.bookings
        );

        setActivities(
          data.activities
        );

        setAlarms(
          data.alarms
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


          if (!membership) {
            throw new Error(
              "Aktif firma bulunamadı."
            );
          }


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
            currentError instanceof Error
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


  const since =
    useMemo(
      () => {

        const date =
          new Date();


        date.setDate(
          date.getDate() -
          Number(
            range
          )
        );


        return date;

      },
      [
        range,
      ]
    );


  const periodLeads =
    leads.filter(
      (
        item
      ) =>
        new Date(
          item.created_at
        ) >=
        since
    );


  const periodQuotes =
    quotes.filter(
      (
        item
      ) =>
        new Date(
          item.created_at
        ) >=
        since
    );


  const periodBookings =
    bookings.filter(
      (
        item
      ) =>
        new Date(
          item.created_at
        ) >=
        since
    );


  const wonLeads =
    periodLeads.filter(
      (
        item
      ) =>
        item.stage ===
        "won"
    );


  const lostLeads =
    periodLeads.filter(
      (
        item
      ) =>
        item.stage ===
        "lost"
    );


  const activeLeads =
    periodLeads.filter(
      (
        item
      ) =>
        ![
          "won",
          "lost",
        ].includes(
          item.stage
        )
    );


  const hotLeads =
    activeLeads.filter(
      (
        item
      ) =>
        Number(
          item.score ||
          0
        ) >=
        75
    );


  const pipelineValue =
    activeLeads.reduce(
      (
        total,
        item
      ) =>
        total +
        Number(
          item.budget_max ||
          item.budget_min ||
          0
        ),
      0
    );


  const sentQuotes =
    periodQuotes.filter(
      (
        item
      ) =>
        [
          "sent",
          "viewed",
          "accepted",
          "converted",
        ].includes(
          item.status
        )
    );


  const viewedQuotes =
    periodQuotes.filter(
      (
        item
      ) =>
        item.viewed_at ||
        [
          "viewed",
          "accepted",
          "converted",
        ].includes(
          item.status
        )
    );


  const convertedQuotes =
    periodQuotes.filter(
      (
        item
      ) =>
        item.converted_booking_id ||
        item.status ===
        "converted"
    );


  const totalQuoteValue =
    periodQuotes.reduce(
      (
        total,
        item
      ) =>
        total +
        Number(
          item.sale_price ||
          0
        ),
      0
    );


  const bookedRevenue =
    periodBookings
      .filter(
        (
          item
        ) =>
          item.status !==
          "cancelled"
      )
      .reduce(
        (
          total,
          item
        ) =>
          total +
          Number(
            item.total_amount ||
            0
          ),
        0
      );


  const grossProfit =
    periodBookings
      .filter(
        (
          item
        ) =>
          item.status !==
          "cancelled"
      )
      .reduce(
        (
          total,
          item
        ) =>
          total +
          (
            Number(
              item.total_amount ||
              0
            ) -
            Number(
              item.supplier_cost ||
              0
            )
          ),
        0
      );


  const averageLeadScore =
    periodLeads.length
      ? periodLeads.reduce(
          (
            total,
            item
          ) =>
            total +
            Number(
              item.score ||
              0
            ),
          0
        ) /
        periodLeads.length
      : 0;


  const leadConversion =
    periodLeads.length
      ? (
          wonLeads.length /
          periodLeads.length
        ) *
        100
      : 0;


  const quoteViewRate =
    sentQuotes.length
      ? (
          viewedQuotes.length /
          sentQuotes.length
        ) *
        100
      : 0;


  const quoteConversion =
    periodQuotes.length
      ? (
          convertedQuotes.length /
          periodQuotes.length
        ) *
        100
      : 0;


  const sourceRows =
    useMemo(
      () => {

        const sources =
          Array.from(
            new Set(
              periodLeads.map(
                (
                  item
                ) =>
                  item.source ||
                  "other"
              )
            )
          );


        return sources
          .map(
            (
              source
            ) => {

              const sourceLeads =
                periodLeads.filter(
                  (
                    item
                  ) =>
                    (
                      item.source ||
                      "other"
                    ) ===
                    source
                );


              const sourceWon =
                sourceLeads.filter(
                  (
                    item
                  ) =>
                    item.stage ===
                    "won"
                );


              const sourceLost =
                sourceLeads.filter(
                  (
                    item
                  ) =>
                    item.stage ===
                    "lost"
                );


              const sourceOpen =
                sourceLeads.filter(
                  (
                    item
                  ) =>
                    ![
                      "won",
                      "lost",
                    ].includes(
                      item.stage
                    )
                );


              const sourcePipeline =
                sourceOpen.reduce(
                  (
                    total,
                    item
                  ) =>
                    total +
                    Number(
                      item.budget_max ||
                      item.budget_min ||
                      0
                    ),
                  0
                );


              return {
                source,

                total:
                  sourceLeads.length,

                won:
                  sourceWon.length,

                lost:
                  sourceLost.length,

                open:
                  sourceOpen.length,

                pipeline:
                  sourcePipeline,

                conversion:
                  sourceLeads.length
                    ? (
                        sourceWon.length /
                        sourceLeads.length
                      ) *
                      100
                    : 0,
              };
            }
          )
          .sort(
            (
              a,
              b
            ) =>
              b.total -
              a.total
          );

      },
      [
        periodLeads,
      ]
    );


  const lostReasonRows =
    useMemo(
      () => {

        const counts:
          Record<
            string,
            number
          > = {};


        lostLeads.forEach(
          (
            item
          ) => {

            const reason =
              (
                item.lost_reason ||
                "Sebep girilmedi"
              )
                .trim();


            counts[reason] =
              (
                counts[reason] ||
                0
              ) +
              1;
          }
        );


        return Object.entries(
          counts
        )
          .map(
            (
              [
                reason,
                count,
              ]
            ) => ({
              reason,
              count,
            })
          )
          .sort(
            (
              a,
              b
            ) =>
              b.count -
              a.count
          )
          .slice(
            0,
            10
          );

      },
      [
        lostLeads,
      ]
    );


  const filteredLeads =
    useMemo(
      () => {

        const needle =
          query
            .trim()
            .toLocaleLowerCase(
              "tr"
            );


        if (!needle) {
          return activeLeads;
        }


        return activeLeads.filter(
          (
            item
          ) =>
            `${item.customer_name} ${item.source} ${item.stage}`
              .toLocaleLowerCase(
                "tr"
              )
              .includes(
                needle
              )
        );

      },
      [
        activeLeads,
        query,
      ]
    );


  if (loading) {

    return (
      <main className="grid min-h-[70vh] place-items-center bg-[#030a11] text-white">
        <FaChartBar className="animate-pulse text-4xl text-orange-400" />
      </main>
    );
  }


  return (
    <main className="min-h-screen bg-[#030a11] text-white">

      <div className="mx-auto max-w-[1850px] px-5 py-7 lg:px-8">


        <section className="rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,.13),transparent_32%),radial-gradient(circle_at_60%_0%,rgba(249,115,22,.12),transparent_30%),linear-gradient(145deg,#07131f,#040b12)] p-6 lg:p-8">

          <Link
            href="/dashboard/yat-os/crm-center"
            className="inline-flex items-center gap-2 text-[9px] font-black text-slate-500 hover:text-white"
          >
            <FaArrowLeft />
            CRM & LEAD CENTER
          </Link>


          <div className="mt-5 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">

            <div>

              <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-[8px] font-black uppercase tracking-[.2em] text-blue-300">
                SALES PERFORMANCE
              </span>


              <h1 className="mt-4 text-3xl font-black tracking-[-.04em] lg:text-5xl">
                Satış Performans &{" "}
                <span className="text-blue-300">
                  Yönetici Merkezi
                </span>
              </h1>


              <p className="mt-3 max-w-4xl text-xs leading-5 text-slate-400">
                {companyName}
                {" · "}
                Lead, teklif, rezervasyon ve CRM alarm verisini tek ticari
                görünümde yönetin.
              </p>

            </div>


            <div className="flex items-center gap-2">

              <FaFilter className="text-slate-500" />

              <select
                value={
                  range
                }
                onChange={(
                  event
                ) =>
                  setRange(
                    event.target.value
                  )
                }
                className="h-12 rounded-xl border border-white/10 bg-[#0b1723] px-4 text-[9px] font-black"
              >
                <option value="7">
                  Son 7 Gün
                </option>

                <option value="30">
                  Son 30 Gün
                </option>

                <option value="90">
                  Son 90 Gün
                </option>

                <option value="365">
                  Son 12 Ay
                </option>
              </select>

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


        <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">

          <Kpi
            label="Yeni Lead"
            value={String(
              periodLeads.length
            )}
            detail={`Son ${range} gün`}
          />

          <Kpi
            label="Açık Pipeline"
            value={money(
              pipelineValue
            )}
            detail={`${activeLeads.length} açık fırsat`}
          />

          <Kpi
            label="Lead Dönüşüm"
            value={percent(
              leadConversion
            )}
            detail={`${wonLeads.length} kazanılan`}
            success
          />

          <Kpi
            label="Teklif Görüntüleme"
            value={percent(
              quoteViewRate
            )}
            detail={`${viewedQuotes.length}/${sentQuotes.length} teklif`}
          />

          <Kpi
            label="Teklif → Rezervasyon"
            value={percent(
              quoteConversion
            )}
            detail={`${convertedQuotes.length} dönüşüm`}
            success
          />

          <Kpi
            label="Açık CRM Alarmı"
            value={String(
              alarms.length
            )}
            detail="Satış müdahalesi bekliyor"
            danger={
              alarms.length >
              0
            }
          />

        </section>


        <section className="mt-5 grid gap-4 xl:grid-cols-4">

          <Metric
            icon={<FaCoins />}
            label="Teklif Hacmi"
            value={money(
              totalQuoteValue
            )}
            detail={`${periodQuotes.length} teklif`}
          />

          <Metric
            icon={<FaCheckCircle />}
            label="Rezervasyon Cirosu"
            value={money(
              bookedRevenue
            )}
            detail={`${periodBookings.length} rezervasyon`}
            success
          />

          <Metric
            icon={<FaChartBar />}
            label="Tahmini Brüt Kâr"
            value={money(
              grossProfit
            )}
            detail="Satış - tedarik maliyeti"
            success
          />

          <Metric
            icon={<FaFire />}
            label="Ortalama Lead Skoru"
            value={averageLeadScore.toFixed(
              1
            )}
            detail={`${hotLeads.length} sıcak fırsat`}
          />

        </section>


        <section className="mt-5 grid gap-5 xl:grid-cols-[1.15fr_.85fr]">


          <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#07131f]">

            <div className="border-b border-white/10 p-5">

              <div className="text-sm font-black">
                Kaynak Bazlı Satış Performansı
              </div>

              <div className="mt-1 text-[8px] text-slate-500">
                Hangi kanal gerçek satış getiriyor?
              </div>

            </div>


            <div className="overflow-x-auto">

              <table className="w-full min-w-[950px] text-left">

                <thead className="bg-[#0a1723]">

                  <tr className="text-[8px] font-black uppercase tracking-[.1em] text-slate-600">

                    <th className="px-5 py-4">
                      Kaynak
                    </th>

                    <th className="px-5 py-4">
                      Lead
                    </th>

                    <th className="px-5 py-4">
                      Açık
                    </th>

                    <th className="px-5 py-4">
                      Kazanılan
                    </th>

                    <th className="px-5 py-4">
                      Kaybedilen
                    </th>

                    <th className="px-5 py-4">
                      Dönüşüm
                    </th>

                    <th className="px-5 py-4">
                      Pipeline
                    </th>

                  </tr>

                </thead>


                <tbody>

                  {sourceRows.map(
                    (
                      row
                    ) => (
                      <tr
                        key={
                          row.source
                        }
                        className="border-t border-white/[.06]"
                      >

                        <td className="px-5 py-4 text-[10px] font-black">
                          {sourceLabel(
                            row.source
                          )}
                        </td>

                        <td className="px-5 py-4 text-[9px]">
                          {
                            row.total
                          }
                        </td>

                        <td className="px-5 py-4 text-[9px] font-black text-orange-300">
                          {
                            row.open
                          }
                        </td>

                        <td className="px-5 py-4 text-[9px] font-black text-emerald-300">
                          {
                            row.won
                          }
                        </td>

                        <td className="px-5 py-4 text-[9px] font-black text-red-300">
                          {
                            row.lost
                          }
                        </td>

                        <td className="px-5 py-4 text-[10px] font-black text-blue-300">
                          {percent(
                            row.conversion
                          )}
                        </td>

                        <td className="px-5 py-4 text-[10px] font-black">
                          {money(
                            row.pipeline
                          )}
                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>

          </div>


          <div className="rounded-[28px] border border-white/10 bg-[#07131f] p-5">

            <div className="text-sm font-black">
              Kaybedilen Satış Nedenleri
            </div>

            <div className="mt-1 text-[8px] text-slate-500">
              Satış ekibinin en çok nerede müşteri kaybettiğini gösterir.
            </div>


            <div className="mt-5 space-y-2">

              {lostReasonRows.length ===
              0 ? (
                <div className="rounded-xl border border-dashed border-white/10 p-5 text-center text-[8px] text-slate-600">
                  Bu dönemde kayıp nedeni verisi yok.
                </div>
              ) : (
                lostReasonRows.map(
                  (
                    item
                  ) => (
                    <div
                      key={
                        item.reason
                      }
                      className="flex items-center justify-between rounded-xl border border-white/[.07] bg-black/10 p-4"
                    >

                      <div className="max-w-[75%] text-[8px] font-bold leading-4 text-slate-400">
                        {
                          item.reason
                        }
                      </div>

                      <div className="grid h-8 min-w-8 place-items-center rounded-lg bg-red-500/10 px-2 text-[9px] font-black text-red-300">
                        {
                          item.count
                        }
                      </div>

                    </div>
                  )
                )
              )}

            </div>

          </div>

        </section>


        <section className="mt-5 overflow-hidden rounded-[28px] border border-white/10 bg-[#07131f]">

          <div className="flex flex-col gap-3 border-b border-white/10 p-5 lg:flex-row lg:items-center lg:justify-between">

            <div>

              <div className="text-sm font-black">
                Aktif Satış Fırsatları
              </div>

              <div className="mt-1 text-[8px] text-slate-500">
                Yönetici için yüksek skorlu ve açık pipeline görünümü.
              </div>

            </div>


            <div className="relative w-full lg:max-w-md">

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
                placeholder="Müşteri veya kaynak ara..."
                className="h-11 w-full rounded-xl border border-white/10 bg-white/[.025] pl-10 pr-4 text-xs outline-none"
              />

            </div>

          </div>


          <div className="overflow-x-auto">

            <table className="w-full min-w-[1350px] text-left">

              <thead className="sticky top-0 z-10 bg-[#0a1723]">

                <tr className="text-[8px] font-black uppercase tracking-[.1em] text-slate-600">

                  <th className="px-5 py-4">
                    Müşteri
                  </th>

                  <th className="px-5 py-4">
                    Kaynak
                  </th>

                  <th className="px-5 py-4">
                    Aşama
                  </th>

                  <th className="px-5 py-4">
                    Skor
                  </th>

                  <th className="px-5 py-4">
                    Pipeline
                  </th>

                  <th className="px-5 py-4">
                    Son Temas
                  </th>

                  <th className="px-5 py-4">
                    Sonraki Takip
                  </th>

                  <th className="px-5 py-4">
                    Alarm
                  </th>

                </tr>

              </thead>


              <tbody>

                {filteredLeads
                  .sort(
                    (
                      a,
                      b
                    ) =>
                      Number(
                        b.score ||
                        0
                      ) -
                      Number(
                        a.score ||
                        0
                      )
                  )
                  .map(
                    (
                      lead
                    ) => {

                      const leadAlarms =
                        alarms.filter(
                          (
                            item
                          ) =>
                            item.lead_id ===
                            lead.id
                        );


                      return (
                        <tr
                          key={
                            lead.id
                          }
                          className="border-t border-white/[.06]"
                        >

                          <td className="px-5 py-4 text-[10px] font-black">
                            {
                              lead.customer_name
                            }
                          </td>

                          <td className="px-5 py-4 text-[8px] font-black">
                            {sourceLabel(
                              lead.source
                            )}
                          </td>

                          <td className="px-5 py-4 text-[8px] font-black">
                            {
                              lead.stage
                            }
                          </td>

                          <td className="px-5 py-4">

                            <span className={`text-sm font-black ${
                              Number(
                                lead.score
                              ) >= 75
                                ? "text-emerald-300"
                                : Number(
                                    lead.score
                                  ) >= 50
                                  ? "text-orange-300"
                                  : "text-red-300"
                            }`}>
                              {
                                lead.score
                              }
                            </span>

                          </td>

                          <td className="px-5 py-4 text-[10px] font-black">
                            {money(
                              Number(
                                lead.budget_max ||
                                lead.budget_min ||
                                0
                              ),
                              lead.currency
                            )}
                          </td>

                          <td className="px-5 py-4 text-[8px] text-slate-500">
                            {
                              lead.last_contact_at
                                ? new Date(
                                    lead.last_contact_at
                                  ).toLocaleString(
                                    "tr-TR"
                                  )
                                : "—"
                            }
                          </td>

                          <td className="px-5 py-4 text-[8px] text-slate-500">
                            {
                              lead.next_follow_up_at
                                ? new Date(
                                    lead.next_follow_up_at
                                  ).toLocaleString(
                                    "tr-TR"
                                  )
                                : "—"
                            }
                          </td>

                          <td className="px-5 py-4">

                            <span className={`rounded-lg px-2.5 py-1 text-[8px] font-black ${
                              leadAlarms.length >
                              0
                                ? "bg-red-500/10 text-red-300"
                                : "bg-emerald-500/10 text-emerald-300"
                            }`}>
                              {
                                leadAlarms.length >
                                0
                                  ? `${leadAlarms.length} alarm`
                                  : "Temiz"
                              }
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


        <section className="mt-5 grid gap-4 md:grid-cols-3">

          <SummaryCard
            icon={<FaUsers />}
            label="CRM Görüşme Aktivitesi"
            value={String(
              activities.filter(
                (
                  item
                ) =>
                  new Date(
                    item.created_at
                  ) >=
                  since
              ).length
            )}
            text={`Son ${range} gündeki lead aktivitesi`}
          />

          <SummaryCard
            icon={<FaClock />}
            label="Bekleyen Satış"
            value={String(
              activeLeads.length
            )}
            text="Won/Lost olmamış açık fırsatlar"
          />

          <SummaryCard
            icon={<FaFire />}
            label="Sıcak Pipeline"
            value={money(
              hotLeads.reduce(
                (
                  total,
                  item
                ) =>
                  total +
                  Number(
                    item.budget_max ||
                    item.budget_min ||
                    0
                  ),
                0
              )
            )}
            text="Skoru 75+ olan satış fırsatları"
          />

        </section>

      </div>

    </main>
  );
}


function Kpi({
  label,
  value,
  detail,
  success = false,
  danger = false,
}: {
  label: string;
  value: string;
  detail: string;
  success?: boolean;
  danger?: boolean;
}) {

  return (
    <div className="rounded-[24px] border border-white/10 bg-[#07131f] p-5">

      <div className="text-[8px] font-black uppercase tracking-[.14em] text-slate-600">
        {label}
      </div>

      <div className={`mt-3 text-2xl font-black ${
        success
          ? "text-emerald-300"
          : danger
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


function Metric({
  icon,
  label,
  value,
  detail,
  success = false,
}: {
  icon:
    React.ReactNode;
  label: string;
  value: string;
  detail: string;
  success?: boolean;
}) {

  return (
    <div className="rounded-[24px] border border-white/10 bg-[#07131f] p-5">

      <div className="flex items-center gap-2 text-[8px] font-black uppercase text-slate-600">
        <span className="text-orange-400">
          {icon}
        </span>

        {label}
      </div>

      <div className={`mt-3 text-xl font-black ${
        success
          ? "text-emerald-300"
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


function SummaryCard({
  icon,
  label,
  value,
  text,
}: {
  icon:
    React.ReactNode;
  label: string;
  value: string;
  text: string;
}) {

  return (
    <div className="rounded-[24px] border border-white/10 bg-[#07131f] p-5">

      <div className="flex items-center gap-2 text-orange-400">
        {icon}

        <span className="text-[9px] font-black text-white">
          {label}
        </span>
      </div>

      <div className="mt-4 text-2xl font-black">
        {value}
      </div>

      <div className="mt-2 text-[8px] text-slate-500">
        {text}
      </div>

    </div>
  );
}
