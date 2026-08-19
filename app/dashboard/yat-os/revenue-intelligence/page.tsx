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
  FaBrain,
  FaCheck,
  FaCheckCircle,
  FaChartLine,
  FaFilter,
  FaSearch,
  FaShip,
  FaTimes,
  FaTimesCircle,
} from "react-icons/fa";

import {
  getCurrentMembership,
  getCurrentUser,
} from "@/lib/current-user";

import {
  generateYachtRateRecommendations,
  loadYachtRevenueIntelligence,
  publishYachtRateRecommendation,
  reviewYachtRateRecommendation,

  type YachtRateRecommendation,
} from "@/lib/yacht-os/revenue-intelligence";


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


function shortDate(
  value: string
) {

  return new Intl.DateTimeFormat(
    "tr-TR",
    {
      day:
        "2-digit",

      month:
        "short",
    }
  ).format(
    new Date(
      `${value}T12:00:00`
    )
  );
}


function adjustmentTone(
  value: number
) {

  if (value >= 10) {
    return "text-emerald-300";
  }

  if (value > 0) {
    return "text-blue-300";
  }

  if (value <= -10) {
    return "text-red-300";
  }

  if (value < 0) {
    return "text-orange-300";
  }

  return "text-slate-300";
}


function statusTone(
  value: string
) {

  if (
    value ===
    "published"
  ) {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
  }


  if (
    value ===
    "approved"
  ) {
    return "border-blue-500/20 bg-blue-500/10 text-blue-300";
  }


  if (
    value ===
    "rejected"
  ) {
    return "border-red-500/20 bg-red-500/10 text-red-300";
  }


  if (
    value ===
    "expired"
  ) {
    return "border-slate-500/20 bg-slate-500/10 text-slate-500";
  }


  return "border-orange-500/20 bg-orange-500/10 text-orange-300";
}


export default function YachtRevenueIntelligencePage() {

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
    yachts,
    setYachts,
  ] =
    useState<any[]>(
      []
    );

  const [
    recommendations,
    setRecommendations,
  ] =
    useState<
      YachtRateRecommendation[]
    >([]);

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
      "pending"
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
          await loadYachtRevenueIntelligence(
            activeCompany
          );


        setYachts(
          data.yachts
        );

        setRecommendations(
          data.recommendations
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


  async function generate() {

    setSaving(true);
    setError("");


    try {

      await generateYachtRateRecommendations(
        companyId
      );


      await refresh(
        companyId
      );


      toast(
        "Revenue önerileri güncellendi."
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


  async function review(
    id: string,
    decision:
      "approved" |
      "rejected"
  ) {

    setSaving(true);


    try {

      await reviewYachtRateRecommendation(
        id,
        decision
      );


      await refresh(
        companyId
      );


      toast(
        decision ===
          "approved"
          ? "Fiyat önerisi onaylandı."
          : "Fiyat önerisi reddedildi."
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


  async function publish(
    id: string
  ) {

    setSaving(true);


    try {

      await publishYachtRateRecommendation(
        id
      );


      await refresh(
        companyId
      );


      toast(
        "Onaylı fiyat planı Revenue Center'a yayınlandı."
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


  const pending =
    recommendations.filter(
      (
        item
      ) =>
        item.status ===
        "pending"
    );


  const approved =
    recommendations.filter(
      (
        item
      ) =>
        item.status ===
        "approved"
    );


  const highConfidence =
    pending.filter(
      (
        item
      ) =>
        Number(
          item.confidence_score
        ) >= 75
    );


  const averageAdjustment =
    pending.length
      ? pending.reduce(
          (
            total,
            item
          ) =>
            total +
            Number(
              item.adjustment_percent
            ),
          0
        ) /
        pending.length
      : 0;


  const rows =
    useMemo(
      () => {

        const needle =
          query
            .trim()
            .toLocaleLowerCase(
              "tr"
            );


        return recommendations.filter(
          (
            item
          ) => {

            const yacht =
              yachts.find(
                (
                  yachtItem
                ) =>
                  yachtItem.id ===
                  item.yacht_id
              );


            const text =
              `${yacht?.name || ""} ${yacht?.city || ""} ${yacht?.marina || ""} ${item.reason_summary || ""}`
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
              item.status ===
                statusFilter;


            return (
              searchOk &&
              statusOk
            );
          }
        );

      },
      [
        recommendations,
        yachts,
        query,
        statusFilter,
      ]
    );


  if (loading) {

    return (
      <main className="grid min-h-[70vh] place-items-center bg-[#030a11] text-white">
        <FaBrain className="animate-pulse text-4xl text-orange-400" />
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


        <section className="rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,.15),transparent_32%),radial-gradient(circle_at_70%_0%,rgba(249,115,22,.12),transparent_30%),linear-gradient(145deg,#07131f,#040b12)] p-6 lg:p-8">

          <Link
            href="/dashboard/yat-os/revenue-center"
            className="inline-flex items-center gap-2 text-[9px] font-black text-slate-500 hover:text-white"
          >
            <FaArrowLeft />
            REVENUE & FİYAT MERKEZİ
          </Link>


          <div className="mt-5 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">

            <div>

              <div className="flex flex-wrap gap-2">

                <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1.5 text-[8px] font-black uppercase tracking-[.2em] text-violet-300">
                  REVENUE INTELLIGENCE
                </span>

                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[8px] font-black text-emerald-300">
                  ● İnsan Onaylı Fiyat Kararı
                </span>

              </div>


              <h1 className="mt-4 text-3xl font-black tracking-[-.04em] lg:text-5xl">
                Revenue{" "}
                <span className="text-violet-300">
                  Intelligence
                </span>
              </h1>


              <p className="mt-3 max-w-3xl text-xs leading-5 text-slate-400">
                {companyName}
                {" · "}
                Doluluk, rezervasyon hızı ve kalkışa kalan süreyi analiz eder.
                Sistem fiyatı kendiliğinden değiştirmez; öneri, onay ve yayın ayrı aşamalardır.
              </p>

            </div>


            <button
              type="button"
              disabled={
                saving
              }
              onClick={() =>
                void generate()
              }
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-violet-500 px-5 text-[9px] font-black"
            >
              <FaBrain />
              Önerileri Yenile
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
            label="Bekleyen Öneri"
            value={String(
              pending.length
            )}
            detail="Karar bekleyen fiyat önerisi"
          />

          <Kpi
            label="Onaylandı"
            value={String(
              approved.length
            )}
            detail="Yayınlanmaya hazır"
          />

          <Kpi
            label="Yüksek Güven"
            value={String(
              highConfidence.length
            )}
            detail="Güven skoru 75+"
            success
          />

          <Kpi
            label="Ort. Fiyat Etkisi"
            value={`${averageAdjustment >= 0 ? "+" : ""}${averageAdjustment.toFixed(
              1
            )}%`}
            detail="Bekleyen öneriler"
          />

          <Kpi
            label="Filo"
            value={String(
              yachts.length
            )}
            detail="Analize dahil tekne"
          />

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
                placeholder="Tekne, marina veya öneri açıklaması ara..."
                className="h-12 w-full rounded-xl border border-white/10 bg-white/[.025] pl-10 pr-4 text-xs outline-none"
              />

            </div>


            <div className="flex items-center gap-2">

              <FaFilter className="text-slate-600" />

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
                className="h-12 rounded-xl border border-white/10 bg-[#0b1723] px-4 text-[9px] font-black"
              >

                <option value="pending">
                  Bekleyen
                </option>

                <option value="approved">
                  Onaylı
                </option>

                <option value="published">
                  Yayınlandı
                </option>

                <option value="rejected">
                  Reddedildi
                </option>

                <option value="expired">
                  Süresi Geçen
                </option>

                <option value="all">
                  Tümü
                </option>

              </select>

            </div>

          </div>


          <div className="overflow-x-auto">

            <table className="w-full min-w-[1900px] text-left">

              <thead className="sticky top-0 z-10 bg-[#0a1723]">

                <tr className="text-[8px] font-black uppercase tracking-[.1em] text-slate-600">

                  <th className="px-5 py-4">
                    Tekne
                  </th>

                  <th className="px-5 py-4">
                    Dönem
                  </th>

                  <th className="px-5 py-4">
                    Doluluk
                  </th>

                  <th className="px-5 py-4">
                    Satılabilir Gün
                  </th>

                  <th className="px-5 py-4">
                    Son 7 Gün Satış
                  </th>

                  <th className="px-5 py-4">
                    Mevcut Ort.
                  </th>

                  <th className="px-5 py-4">
                    Öneri H.İçi
                  </th>

                  <th className="px-5 py-4">
                    Öneri H.Sonu
                  </th>

                  <th className="px-5 py-4">
                    Etki
                  </th>

                  <th className="px-5 py-4">
                    Güven
                  </th>

                  <th className="px-5 py-4">
                    Sebep
                  </th>

                  <th className="px-5 py-4">
                    Durum
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

                    const yacht =
                      yachts.find(
                        (
                          yachtItem
                        ) =>
                          yachtItem.id ===
                          item.yacht_id
                      );


                    return (
                      <tr
                        key={
                          item.id
                        }
                        className="border-t border-white/[.06] transition hover:bg-white/[.025]"
                      >

                        <td className="px-5 py-4">

                          <div className="flex items-center gap-3">

                            <div className="grid h-9 w-9 place-items-center rounded-xl bg-violet-500/10 text-violet-300">
                              <FaShip />
                            </div>

                            <div>

                              <div className="text-[10px] font-black">
                                {
                                  yacht?.name ||
                                  "—"
                                }
                              </div>

                              <div className="mt-1 text-[7px] text-slate-600">
                                {
                                  yacht?.marina ||
                                  yacht?.city ||
                                  "—"
                                }
                              </div>

                            </div>

                          </div>

                        </td>


                        <td className="px-5 py-4 text-[8px] font-black">
                          {shortDate(
                            item.period_start
                          )}
                          {" → "}
                          {shortDate(
                            item.period_end
                          )}
                        </td>


                        <td className="px-5 py-4">

                          <span className={`text-[11px] font-black ${
                            Number(
                              item.occupancy_percent
                            ) >= 70
                              ? "text-emerald-300"
                              : Number(
                                  item.occupancy_percent
                                ) <= 30
                                ? "text-orange-300"
                                : "text-white"
                          }`}>
                            %
                            {Number(
                              item.occupancy_percent
                            ).toFixed(
                              0
                            )}
                          </span>

                        </td>


                        <td className="px-5 py-4 text-[9px] font-black">
                          {
                            item.booked_days
                          }
                          /
                          {
                            item.sellable_days
                          }
                        </td>


                        <td className="px-5 py-4 text-[10px] font-black text-blue-300">
                          {
                            item.bookings_last_7_days
                          }
                        </td>


                        <td className="px-5 py-4 text-[10px] font-black">
                          {money(
                            item.current_average_price,
                            item.currency
                          )}
                        </td>


                        <td className="px-5 py-4 text-[10px] font-black text-violet-300">
                          {money(
                            item.suggested_weekday_price,
                            item.currency
                          )}
                        </td>


                        <td className="px-5 py-4 text-[10px] font-black text-violet-300">
                          {money(
                            item.suggested_weekend_price,
                            item.currency
                          )}
                        </td>


                        <td className={`px-5 py-4 text-[11px] font-black ${adjustmentTone(
                          Number(
                            item.adjustment_percent
                          )
                        )}`}>
                          {Number(
                            item.adjustment_percent
                          ) >= 0
                            ? "+"
                            : ""}
                          {Number(
                            item.adjustment_percent
                          ).toFixed(
                            1
                          )}
                          %
                        </td>


                        <td className="px-5 py-4">

                          <span className={`rounded-lg px-2.5 py-1.5 text-[9px] font-black ${
                            item.confidence_score >=
                            75
                              ? "bg-emerald-500/10 text-emerald-300"
                              : "bg-amber-500/10 text-amber-300"
                          }`}>
                            {
                              item.confidence_score
                            }
                            /100
                          </span>

                        </td>


                        <td className="max-w-[320px] px-5 py-4">

                          <div className="text-[8px] leading-4 text-slate-400">
                            {
                              item.reason_summary ||
                              "—"
                            }
                          </div>

                        </td>


                        <td className="px-5 py-4">

                          <span className={`rounded-full border px-2.5 py-1 text-[8px] font-black ${statusTone(
                            item.status
                          )}`}>
                            {
                              item.status
                            }
                          </span>

                        </td>


                        <td className="px-5 py-4">

                          {item.status ===
                            "pending" && (
                            <div className="flex gap-1.5">

                              <button
                                type="button"
                                disabled={
                                  saving
                                }
                                onClick={() =>
                                  void review(
                                    item.id,
                                    "approved"
                                  )
                                }
                                className="flex h-9 items-center gap-2 rounded-lg bg-emerald-500/10 px-3 text-[8px] font-black text-emerald-300"
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
                                  void review(
                                    item.id,
                                    "rejected"
                                  )
                                }
                                className="flex h-9 items-center gap-2 rounded-lg bg-red-500/10 px-3 text-[8px] font-black text-red-300"
                              >
                                <FaTimesCircle />
                                Reddet
                              </button>

                            </div>
                          )}


                          {item.status ===
                            "approved" && (
                            <button
                              type="button"
                              disabled={
                                saving
                              }
                              onClick={() =>
                                void publish(
                                  item.id
                                )
                              }
                              className="flex h-9 items-center gap-2 rounded-lg bg-violet-500 px-3 text-[8px] font-black"
                            >
                              <FaChartLine />
                              Fiyatı Yayınla
                            </button>
                          )}


                          {item.status ===
                            "published" && (
                            <span className="flex items-center gap-2 text-[8px] font-black text-emerald-300">
                              <FaCheckCircle />
                              Revenue Center'a işlendi
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


        <section className="mt-5 rounded-[28px] border border-violet-500/15 bg-violet-500/[.025] p-5">

          <div className="flex items-start gap-3">

            <FaBrain className="mt-0.5 shrink-0 text-violet-300" />

            <div>

              <div className="text-[10px] font-black">
                Revenue Intelligence çalışma prensibi
              </div>

              <div className="mt-2 max-w-5xl text-[8px] leading-5 text-slate-400">
                Bu katman karar destek sistemidir. Doluluk ve rezervasyon hızına göre fiyat önerir,
                ancak hiçbir öneri kendiliğinden satış fiyatını değiştirmez.
                Önce onay, ardından ayrı yayın işlemi gerekir.
                Yayınlanan öneri mevcut Revenue Center fiyat planına dönüşür ve audit kaydı oluşturur.
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
}: {
  label: string;
  value: string;
  detail: string;
  success?: boolean;
}) {

  return (
    <div className="rounded-[24px] border border-white/10 bg-[#07131f] p-5">

      <div className="text-[8px] font-black uppercase tracking-[.14em] text-slate-600">
        {label}
      </div>

      <div className={`mt-3 text-2xl font-black ${
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
