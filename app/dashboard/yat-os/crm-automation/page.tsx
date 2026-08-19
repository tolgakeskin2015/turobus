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
  FaBolt,
  FaCheck,
  FaCheckCircle,
  FaClock,
  FaExclamationTriangle,
  FaFilter,
  FaSearch,
  FaTasks,
  FaTimes,
  FaUsers,
  FaWhatsapp,
} from "react-icons/fa";

import {
  getCurrentMembership,
  getCurrentUser,
} from "@/lib/current-user";

import {
  loadYachtCRMAutomationCenter,
  resolveYachtCRMAutomationEvent,
  runYachtCRMAutomations,

  type YachtCRMAutomationEvent,
} from "@/lib/yacht-os/crm-automation";


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
    new Date(
      value
    )
  );
}


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


function severityTone(
  value: string
) {

  if (
    value ===
    "critical"
  ) {
    return "border-red-500/20 bg-red-500/10 text-red-300";
  }


  if (
    value ===
    "high"
  ) {
    return "border-orange-500/20 bg-orange-500/10 text-orange-300";
  }


  if (
    value ===
    "medium"
  ) {
    return "border-amber-500/20 bg-amber-500/10 text-amber-300";
  }


  return "border-slate-500/20 bg-slate-500/10 text-slate-400";
}


function ruleLabel(
  value: string
) {

  const map:
    Record<
      string,
      string
    > = {

      overdue_followup:
        "Geciken Takip",

      hot_lead:
        "Sıcak Lead",

      stale_lead:
        "Temassız Lead",

      quote_viewed_no_response:
        "Teklif Görüntülendi",

      quote_sent_no_response:
        "Teklif Takibi",
    };


  return (
    map[value] ||
    value
  );
}


export default function YachtCRMAutomationPage() {

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
    events,
    setEvents,
  ] =
    useState<
      YachtCRMAutomationEvent[]
    >([]);

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
    tasks,
    setTasks,
  ] =
    useState<any[]>(
      []
    );

  const [
    query,
    setQuery,
  ] =
    useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState(
      "open"
    );

  const [
    severityFilter,
    setSeverityFilter,
  ] =
    useState(
      "all"
    );

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
        activeCompany:
          string
      ) => {

        const data =
          await loadYachtCRMAutomationCenter(
            activeCompany
          );


        setEvents(
          data.events
        );

        setLeads(
          data.leads
        );

        setQuotes(
          data.quotes
        );

        setTasks(
          data.tasks
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


  async function runEngine() {

    setSaving(true);
    setError("");


    try {

      const result:
        any =
          await runYachtCRMAutomations(
            companyId
          );


      await refresh(
        companyId
      );


      toast(
        `${Number(
          result?.created ||
          0
        )} yeni CRM alarmı üretildi.`
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

      setSaving(
        false
      );
    }
  }


  async function resolve(
    eventId: string,
    status:
      "resolved" |
      "dismissed"
  ) {

    setSaving(true);


    try {

      await resolveYachtCRMAutomationEvent(
        eventId,
        status
      );


      await refresh(
        companyId
      );


      toast(
        status ===
          "resolved"
          ? "Alarm ve bağlı görev tamamlandı."
          : "Alarm kapatıldı."
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

      setSaving(
        false
      );
    }
  }


  const openEvents =
    events.filter(
      (
        item
      ) =>
        item.status ===
        "open"
    );


  const critical =
    openEvents.filter(
      (
        item
      ) =>
        item.severity ===
        "critical"
    );


  const overdue =
    openEvents.filter(
      (
        item
      ) =>
        item.due_at &&
        new Date(
          item.due_at
        ).getTime() <
        Date.now()
    );


  const hot =
    openEvents.filter(
      (
        item
      ) =>
        item.rule_code ===
        "hot_lead"
    );


  const openTasks =
    tasks.filter(
      (
        item
      ) =>
        [
          "open",
          "in_progress",
        ].includes(
          item.status
        )
    );


  const rows =
    useMemo(
      () => {

        const needle =
          query
            .trim()
            .toLocaleLowerCase(
              "tr"
            );


        return events.filter(
          (
            event
          ) => {

            const lead =
              leads.find(
                (
                  item
                ) =>
                  item.id ===
                  event.lead_id
              );


            const text =
              `${event.title} ${event.message || ""} ${lead?.customer_name || ""} ${lead?.customer_phone || ""}`
                .toLocaleLowerCase(
                  "tr"
                );


            const searchOk =
              !needle ||
              text.includes(
                needle
              );


            const statusOk =
              statusFilter ===
                "all" ||
              event.status ===
                statusFilter;


            const severityOk =
              severityFilter ===
                "all" ||
              event.severity ===
                severityFilter;


            return (
              searchOk &&
              statusOk &&
              severityOk
            );
          }
        );

      },
      [
        events,
        leads,
        query,
        statusFilter,
        severityFilter,
      ]
    );


  if (loading) {

    return (
      <main className="grid min-h-[70vh] place-items-center bg-[#030a11] text-white">
        <FaBolt className="animate-pulse text-4xl text-orange-400" />
      </main>
    );
  }


  return (
    <main className="min-h-screen bg-[#030a11] text-white">

      {notice && (
        <div className="fixed right-5 top-5 z-[160] flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-[#07131f] px-5 py-4 shadow-2xl">

          <FaCheckCircle className="text-emerald-400" />

          <span className="text-xs font-black">
            {notice}
          </span>

        </div>
      )}


      <div className="mx-auto max-w-[1850px] px-5 py-7 lg:px-8">


        <section className="rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,.16),transparent_32%),radial-gradient(circle_at_65%_0%,rgba(239,68,68,.08),transparent_30%),linear-gradient(145deg,#07131f,#040b12)] p-6 lg:p-8">

          <Link
            href="/dashboard/yat-os/crm-center"
            className="inline-flex items-center gap-2 text-[9px] font-black text-slate-500 hover:text-white"
          >
            <FaArrowLeft />
            CRM & LEAD CENTER
          </Link>


          <div className="mt-5 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">

            <div>

              <div className="flex flex-wrap gap-2">

                <span className="rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1.5 text-[8px] font-black uppercase tracking-[.2em] text-orange-300">
                  CRM AUTOMATION CENTER
                </span>

                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[8px] font-black text-emerald-300">
                  ● Görev Üreten Satış Alarmı
                </span>

              </div>


              <h1 className="mt-4 text-3xl font-black tracking-[-.04em] lg:text-5xl">
                CRM Otomasyon &{" "}
                <span className="text-orange-400">
                  Alarm Merkezi
                </span>
              </h1>


              <p className="mt-3 max-w-4xl text-xs leading-5 text-slate-400">
                {companyName}
                {" · "}
                Geciken takipleri, sıcak müşterileri ve cevapsız teklifleri
                satış fırsatı kaybolmadan tespit eder; Yacht OS görev havuzuna
                otomatik görev üretir.
              </p>

            </div>


            <button
              type="button"
              disabled={
                saving
              }
              onClick={() =>
                void runEngine()
              }
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 text-[9px] font-black disabled:opacity-50"
            >
              <FaBolt />
              Otomasyonları Tara
            </button>

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
            label="Açık Alarm"
            value={String(
              openEvents.length
            )}
            detail="Aktif CRM uyarısı"
          />

          <Kpi
            label="Kritik"
            value={String(
              critical.length
            )}
            detail="Acil satış müdahalesi"
            danger={
              critical.length >
              0
            }
          />

          <Kpi
            label="Süresi Geçen"
            value={String(
              overdue.length
            )}
            detail="Görev zamanı geçmiş"
            danger={
              overdue.length >
              0
            }
          />

          <Kpi
            label="Sıcak Lead"
            value={String(
              hot.length
            )}
            detail="Skor 75+ takip alarmı"
            success
          />

          <Kpi
            label="CRM Görevi"
            value={String(
              openTasks.length
            )}
            detail="Aktif otomasyon görevleri"
          />

        </section>


        <section className="mt-5 grid gap-4 xl:grid-cols-5">

          <RuleCard
            title="Geciken Takip"
            detail="Planlanan takip zamanı geçtiğinde görev üretir."
            count={
              openEvents.filter(
                (
                  item
                ) =>
                  item.rule_code ===
                  "overdue_followup"
              ).length
            }
          />

          <RuleCard
            title="Sıcak Lead"
            detail="Skoru 75+ olan fırsatları satış ekibine taşır."
            count={
              openEvents.filter(
                (
                  item
                ) =>
                  item.rule_code ===
                  "hot_lead"
              ).length
            }
          />

          <RuleCard
            title="Temassız Lead"
            detail="48 saat satış teması olmayan açık leadleri yakalar."
            count={
              openEvents.filter(
                (
                  item
                ) =>
                  item.rule_code ===
                  "stale_lead"
              ).length
            }
          />

          <RuleCard
            title="Teklif Görüntülendi"
            detail="Müşteri baktı ama iki saat içinde yanıt vermedi."
            count={
              openEvents.filter(
                (
                  item
                ) =>
                  item.rule_code ===
                  "quote_viewed_no_response"
              ).length
            }
          />

          <RuleCard
            title="Teklif Takibi"
            detail="24 saatten uzun süre yanıtsız kalan teklifi yakalar."
            count={
              openEvents.filter(
                (
                  item
                ) =>
                  item.rule_code ===
                  "quote_sent_no_response"
              ).length
            }
          />

        </section>


        <section className="mt-5 overflow-hidden rounded-[28px] border border-white/10 bg-[#07131f]">


          <div className="flex flex-col gap-3 border-b border-white/10 p-5 lg:flex-row">

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
                placeholder="Müşteri, alarm veya telefon ara..."
                className="h-12 w-full rounded-xl border border-white/10 bg-white/[.025] pl-10 pr-4 text-xs outline-none"
              />

            </div>


            <div className="flex gap-2">

              <FaFilter className="mt-4 text-slate-600" />

              <select
                value={
                  statusFilter
                }
                onChange={(
                  event
                ) =>
                  setStatusFilter(
                    event.target.value
                  )
                }
                className="h-12 rounded-xl border border-white/10 bg-[#0b1723] px-3 text-[9px] font-black"
              >
                <option value="open">
                  Açık
                </option>
                <option value="resolved">
                  Çözüldü
                </option>
                <option value="dismissed">
                  Kapatıldı
                </option>
                <option value="all">
                  Tümü
                </option>
              </select>


              <select
                value={
                  severityFilter
                }
                onChange={(
                  event
                ) =>
                  setSeverityFilter(
                    event.target.value
                  )
                }
                className="h-12 rounded-xl border border-white/10 bg-[#0b1723] px-3 text-[9px] font-black"
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

          </div>


          <div className="overflow-x-auto">

            <table className="w-full min-w-[1850px] text-left">

              <thead className="sticky top-0 z-10 bg-[#0a1723]">

                <tr className="text-[8px] font-black uppercase tracking-[.1em] text-slate-600">

                  <th className="px-5 py-4">
                    Alarm
                  </th>

                  <th className="px-5 py-4">
                    Müşteri
                  </th>

                  <th className="px-5 py-4">
                    Kural
                  </th>

                  <th className="px-5 py-4">
                    Öncelik
                  </th>

                  <th className="px-5 py-4">
                    Lead Skoru
                  </th>

                  <th className="px-5 py-4">
                    Pipeline
                  </th>

                  <th className="px-5 py-4">
                    Teklif
                  </th>

                  <th className="px-5 py-4">
                    Görev
                  </th>

                  <th className="px-5 py-4">
                    Son Tarih
                  </th>

                  <th className="px-5 py-4">
                    Algılandı
                  </th>

                  <th className="px-5 py-4">
                    Aksiyon
                  </th>

                </tr>

              </thead>


              <tbody>

                {rows.map(
                  (
                    item
                  ) => {

                    const lead =
                      leads.find(
                        (
                          leadItem
                        ) =>
                          leadItem.id ===
                          item.lead_id
                      );


                    const quote =
                      quotes.find(
                        (
                          quoteItem
                        ) =>
                          quoteItem.id ===
                          item.quote_id
                      );


                    const task =
                      tasks.find(
                        (
                          taskItem
                        ) =>
                          taskItem.id ===
                          item.task_id
                      );


                    return (
                      <tr
                        key={
                          item.id
                        }
                        className="border-t border-white/[.06] transition hover:bg-white/[.025]"
                      >

                        <td className="max-w-[340px] px-5 py-4">

                          <div className="flex items-start gap-3">

                            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-orange-500/10 text-orange-400">
                              <FaBell />
                            </div>

                            <div>

                              <div className="text-[10px] font-black">
                                {
                                  item.title
                                }
                              </div>

                              <div className="mt-1 text-[8px] leading-4 text-slate-500">
                                {
                                  item.message ||
                                  "—"
                                }
                              </div>

                            </div>

                          </div>

                        </td>


                        <td className="px-5 py-4">

                          <div className="text-[9px] font-black">
                            {
                              lead?.customer_name ||
                              "—"
                            }
                          </div>

                          <div className="mt-1 text-[7px] text-slate-600">
                            {
                              lead?.customer_phone ||
                              "—"
                            }
                          </div>

                        </td>


                        <td className="px-5 py-4 text-[8px] font-black">
                          {ruleLabel(
                            item.rule_code
                          )}
                        </td>


                        <td className="px-5 py-4">

                          <span className={`rounded-full border px-2.5 py-1 text-[8px] font-black ${severityTone(
                            item.severity
                          )}`}>
                            {
                              item.severity
                            }
                          </span>

                        </td>


                        <td className="px-5 py-4">

                          <span className="text-sm font-black text-orange-300">
                            {
                              lead?.score ??
                              "—"
                            }
                          </span>

                        </td>


                        <td className="px-5 py-4 text-[8px] font-black">
                          {
                            lead?.stage ||
                            "—"
                          }
                        </td>


                        <td className="px-5 py-4">

                          {quote ? (
                            <div>

                              <div className="text-[8px] font-black text-blue-300">
                                {
                                  quote.quote_code
                                }
                              </div>

                              <div className="mt-1 text-[7px] text-slate-600">
                                {money(
                                  quote.sale_price,
                                  quote.currency
                                )}
                              </div>

                            </div>
                          ) : (
                            <span className="text-[8px] text-slate-600">
                              —
                            </span>
                          )}

                        </td>


                        <td className="px-5 py-4">

                          {task ? (
                            <div>

                              <div className="flex items-center gap-2 text-[8px] font-black">
                                <FaTasks className="text-blue-400" />
                                {
                                  task.status
                                }
                              </div>

                              <div className="mt-1 text-[7px] text-slate-600">
                                {
                                  task.title
                                }
                              </div>

                            </div>
                          ) : (
                            <span className="text-[8px] text-slate-600">
                              —
                            </span>
                          )}

                        </td>


                        <td className="px-5 py-4 text-[8px] font-black text-slate-400">
                          {dateTime(
                            item.due_at
                          )}
                        </td>


                        <td className="px-5 py-4 text-[8px] text-slate-500">
                          {dateTime(
                            item.detected_at
                          )}
                        </td>


                        <td className="px-5 py-4">

                          {item.status ===
                            "open" ? (
                            <div className="flex gap-1.5">

                              {lead?.customer_phone && (
                                <a
                                  href={`https://wa.me/${String(
                                    lead.customer_phone
                                  ).replace(
                                    /\D/g,
                                    ""
                                  )}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-500/10 text-emerald-300"
                                >
                                  <FaWhatsapp />
                                </a>
                              )}


                              <button
                                type="button"
                                disabled={
                                  saving
                                }
                                onClick={() =>
                                  void resolve(
                                    item.id,
                                    "resolved"
                                  )
                                }
                                className="flex h-9 items-center gap-2 rounded-lg bg-blue-500/10 px-3 text-[8px] font-black text-blue-300"
                              >
                                <FaCheck />
                                Çözüldü
                              </button>


                              <button
                                type="button"
                                disabled={
                                  saving
                                }
                                onClick={() =>
                                  void resolve(
                                    item.id,
                                    "dismissed"
                                  )
                                }
                                className="h-9 rounded-lg border border-white/10 px-3 text-[8px] font-black text-slate-500"
                              >
                                Kapat
                              </button>

                            </div>
                          ) : (
                            <span className="text-[8px] font-black text-slate-500">
                              {
                                item.status
                              }
                            </span>
                          )}

                        </td>

                      </tr>
                    );
                  }
                )}

              </tbody>

            </table>

          </div>

        </section>


        <section className="mt-5 rounded-[28px] border border-orange-500/15 bg-orange-500/[.025] p-5">

          <div className="flex items-start gap-3">

            <FaExclamationTriangle className="mt-0.5 shrink-0 text-orange-300" />

            <div>

              <div className="text-[10px] font-black">
                Otomasyon güvenlik prensibi
              </div>

              <div className="mt-2 max-w-5xl text-[8px] leading-5 text-slate-400">
                Aynı olay için açık alarm varken ikinci görev oluşturulmaz.
                CRM alarmı satış fiyatını, rezervasyonu veya müşteri durumunu
                kendiliğinden değiştirmez. Yalnızca takip alarmı ve Yacht OS
                görevi oluşturur. Satış kararı yine kullanıcıdadır.
              </div>

            </div>

          </div>

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


function RuleCard({
  title,
  detail,
  count,
}: {
  title: string;
  detail: string;
  count: number;
}) {

  return (
    <div className="rounded-[22px] border border-white/10 bg-[#07131f] p-4">

      <div className="flex items-center justify-between gap-3">

        <div className="text-[9px] font-black">
          {title}
        </div>

        <div className="grid h-7 min-w-7 place-items-center rounded-lg bg-orange-500/10 px-2 text-[9px] font-black text-orange-300">
          {count}
        </div>

      </div>

      <div className="mt-2 text-[7px] leading-4 text-slate-600">
        {detail}
      </div>

    </div>
  );
}
