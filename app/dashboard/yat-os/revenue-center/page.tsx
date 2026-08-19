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
  FaCalendarAlt,
  FaChartLine,
  FaCheckCircle,
  FaCoins,
  FaFilter,
  FaPlus,
  FaSearch,
  FaShip,
  FaTimes,
} from "react-icons/fa";

import {
  getCurrentMembership,
  getCurrentUser,
} from "@/lib/current-user";

import {
  createYachtRatePlan,
  loadYachtRevenueCenter,
  publishYachtRateCalendar,
  setYachtRatePlanStatus,
  updateYachtBaseRate,

  type YachtRatePlan,
} from "@/lib/yacht-os/revenue-center";


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

      year:
        "numeric",
    }
  ).format(
    new Date(
      `${value}T12:00:00`
    )
  );
}


export default function YachtRevenueCenterPage() {

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
    plans,
    setPlans,
  ] =
    useState<
      YachtRatePlan[]
    >([]);

  const [
    calendar,
    setCalendar,
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
    query,
    setQuery,
  ] =
    useState("");

  const [
    filter,
    setFilter,
  ] =
    useState(
      "all"
    );

  const [
    selected,
    setSelected,
  ] =
    useState<any | null>(
      null
    );

  const [
    planName,
    setPlanName,
  ] =
    useState("");

  const [
    planStart,
    setPlanStart,
  ] =
    useState("");

  const [
    planEnd,
    setPlanEnd,
  ] =
    useState("");

  const [
    weekdayPrice,
    setWeekdayPrice,
  ] =
    useState("");

  const [
    weekendPrice,
    setWeekendPrice,
  ] =
    useState("");

  const [
    minimumDays,
    setMinimumDays,
  ] =
    useState("1");

  const [
    priority,
    setPriority,
  ] =
    useState("100");

  const [
    baseRate,
    setBaseRate,
  ] =
    useState("");

  const [
    baseMinimumDays,
    setBaseMinimumDays,
  ] =
    useState("1");

  const [
    publishFrom,
    setPublishFrom,
  ] =
    useState("");

  const [
    publishTo,
    setPublishTo,
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
        activeCompany:
          string
      ) => {

        const data =
          await loadYachtRevenueCenter(
            activeCompany
          );


        setYachts(
          data.yachts
        );

        setPlans(
          data.plans
        );

        setCalendar(
          data.calendar
        );

        setBookings(
          data.bookings
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


  const activePlans =
    plans.filter(
      (
        item
      ) =>
        item.status ===
        "active"
    );


  const futurePriced =
    calendar.filter(
      (
        item
      ) =>
        item.price !==
        null
    );


  const averagePublishedRate =
    futurePriced.length
      ? futurePriced.reduce(
          (
            total,
            item
          ) =>
            total +
            Number(
              item.price ||
              0
            ),
          0
        ) /
        futurePriced.length
      : 0;


  const bookedRevenue =
    bookings.reduce(
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


  const filteredYachts =
    useMemo(
      () => {

        const needle =
          query
            .trim()
            .toLocaleLowerCase(
              "tr"
            );


        return yachts.filter(
          (
            yacht
          ) => {

            const text =
              `${yacht.name} ${yacht.city || ""} ${yacht.marina || ""}`
                .toLocaleLowerCase(
                  "tr"
                );


            const searchOk =
              !needle ||
              text.includes(
                needle
              );


            const yachtPlans =
              plans.filter(
                (
                  item
                ) =>
                  item.yacht_id ===
                  yacht.id &&
                  item.status ===
                  "active"
              );


            const filterOk =
              filter ===
                "all" ||

              (
                filter ===
                  "active-plan" &&
                yachtPlans.length >
                0
              ) ||

              (
                filter ===
                  "no-plan" &&
                yachtPlans.length ===
                0
              );


            return (
              searchOk &&
              filterOk
            );
          }
        );

      },
      [
        yachts,
        plans,
        query,
        filter,
      ]
    );


  const selectedPlans =
    selected
      ? plans.filter(
          (
            item
          ) =>
            item.yacht_id ===
            selected.id
        )
      : [];


  const selectedCalendar =
    selected
      ? calendar.filter(
          (
            item
          ) =>
            item.yacht_id ===
            selected.id
        )
      : [];


  const selectedBookings =
    selected
      ? bookings.filter(
          (
            item
          ) =>
            item.yacht_id ===
            selected.id
        )
      : [];


  function openYacht(
    yacht: any
  ) {

    setSelected(
      yacht
    );

    setBaseRate(
      String(
        yacht.base_daily_price ??
        0
      )
    );

    setBaseMinimumDays(
      String(
        yacht.minimum_days ??
        1
      )
    );


    const today =
      new Date();

    const future =
      new Date();

    future.setDate(
      future.getDate() +
      365
    );


    setPublishFrom(
      today
        .toISOString()
        .slice(
          0,
          10
        )
    );

    setPublishTo(
      future
        .toISOString()
        .slice(
          0,
          10
        )
    );
  }


  async function saveBaseRate() {

    if (!selected) {
      return;
    }


    setSaving(true);


    try {

      await updateYachtBaseRate(
        selected.id,
        Number(
          baseRate
        ) ||
        0,
        Number(
          baseMinimumDays
        ) ||
        1
      );


      await refresh(
        companyId
      );


      toast(
        "Ana fiyat güncellendi."
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


  async function createPlan() {

    if (
      !selected ||
      !planName.trim() ||
      !planStart ||
      !planEnd ||
      !weekdayPrice
    ) {

      setError(
        "Plan adı, tarihler ve hafta içi fiyatı zorunlu."
      );

      return;
    }


    setSaving(true);


    try {

      await createYachtRatePlan({
        yachtId:
          selected.id,

        name:
          planName.trim(),

        startDate:
          planStart,

        endDate:
          planEnd,

        weekdayPrice:
          Number(
            weekdayPrice
          ) ||
          0,

        weekendPrice:
          weekendPrice
            ? Number(
                weekendPrice
              )
            : undefined,

        minimumDays:
          Number(
            minimumDays
          ) ||
          1,

        priority:
          Number(
            priority
          ) ||
          100,

        currency:
          selected.currency ||
          "TRY",
      });


      await refresh(
        companyId
      );


      setPlanName("");
      setPlanStart("");
      setPlanEnd("");
      setWeekdayPrice("");
      setWeekendPrice("");
      setMinimumDays("1");
      setPriority("100");


      toast(
        "Sezon fiyat planı oluşturuldu."
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


  async function publishCalendar() {

    if (
      !selected ||
      !publishFrom ||
      !publishTo
    ) {
      return;
    }


    setSaving(true);


    try {

      await publishYachtRateCalendar(
        selected.id,
        publishFrom,
        publishTo
      );


      await refresh(
        companyId
      );


      toast(
        "Fiyat takvimi yayınlandı."
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


  if (loading) {

    return (
      <main className="grid min-h-[70vh] place-items-center bg-[#030a11] text-white">
        <FaChartLine className="animate-pulse text-4xl text-orange-400" />
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


        <section className="rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,.16),transparent_32%),radial-gradient(circle_at_70%_0%,rgba(16,185,129,.08),transparent_32%),linear-gradient(145deg,#07131f,#040b12)] p-6 lg:p-8">

          <Link
            href="/dashboard/yat-os"
            className="inline-flex items-center gap-2 text-[9px] font-black text-slate-500 hover:text-white"
          >
            <FaArrowLeft />
            YAT & TEKNE OS
          </Link>


          <div className="mt-5 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">

            <div>

              <div className="flex flex-wrap gap-2">

                <span className="rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1.5 text-[8px] font-black uppercase tracking-[.2em] text-orange-300">
                  REVENUE & RATE CENTER
                </span>

                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[8px] font-black text-emerald-300">
                  ● Merkezi Fiyat Yönetimi
                </span>

              </div>


              <h1 className="mt-4 text-3xl font-black tracking-[-.04em] lg:text-5xl">
                Yat Revenue &{" "}
                <span className="text-orange-400">
                  Fiyat Merkezi
                </span>
              </h1>


              <p className="mt-3 max-w-3xl text-xs leading-5 text-slate-400">
                {companyName}
                {" · "}
                Sezon, hafta sonu, minimum konaklama ve ileri tarih fiyat takvimini yönetin.
              </p>

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
            label="Filo"
            value={String(
              yachts.length
            )}
            detail="Fiyat yönetilen tekne"
          />

          <Kpi
            label="Aktif Fiyat Planı"
            value={String(
              activePlans.length
            )}
            detail="Sezon / özel dönem"
          />

          <Kpi
            label="Fiyatlandırılmış Gün"
            value={String(
              futurePriced.length
            )}
            detail="Önümüzdeki 365 gün"
          />

          <Kpi
            label="Ort. Yayın Fiyatı"
            value={money(
              averagePublishedRate
            )}
            detail="Fiyatlı gün ortalaması"
          />

          <Kpi
            label="Rezervasyon Cirosu"
            value={money(
              bookedRevenue
            )}
            detail="İptal olmayan rezervasyonlar"
            success
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
                placeholder="Tekne, marina veya şehir ara..."
                className="h-12 w-full rounded-xl border border-white/10 bg-white/[.025] pl-10 pr-4 text-xs outline-none"
              />

            </div>


            <div className="flex items-center gap-2">

              <FaFilter className="text-slate-600" />

              <select
                value={
                  filter
                }
                onChange={(
                  event
                ) =>
                  setFilter(
                    event.target.value
                  )
                }
                className="h-12 rounded-xl border border-white/10 bg-[#0b1723] px-4 text-[9px] font-black"
              >

                <option value="all">
                  Tüm Filo
                </option>

                <option value="active-plan">
                  Aktif Fiyat Planı Var
                </option>

                <option value="no-plan">
                  Fiyat Planı Yok
                </option>

              </select>

            </div>

          </div>


          <div className="overflow-x-auto">

            <table className="w-full min-w-[1500px] text-left">

              <thead className="sticky top-0 z-10 bg-[#0a1723]">

                <tr className="text-[8px] font-black uppercase tracking-[.1em] text-slate-600">

                  <th className="px-5 py-4">
                    Tekne
                  </th>

                  <th className="px-5 py-4">
                    Marina
                  </th>

                  <th className="px-5 py-4">
                    Ana Fiyat
                  </th>

                  <th className="px-5 py-4">
                    Min. Gün
                  </th>

                  <th className="px-5 py-4">
                    Aktif Plan
                  </th>

                  <th className="px-5 py-4">
                    Yayınlanan Gün
                  </th>

                  <th className="px-5 py-4">
                    Ort. Fiyat
                  </th>

                  <th className="px-5 py-4">
                    Rezervasyon
                  </th>

                  <th className="px-5 py-4">
                    Ciro
                  </th>

                  <th className="px-5 py-4">
                    Aksiyon
                  </th>

                </tr>

              </thead>


              <tbody>

                {filteredYachts.map(
                  (
                    yacht
                  ) => {

                    const yachtPlans =
                      plans.filter(
                        (
                          item
                        ) =>
                          item.yacht_id ===
                            yacht.id &&
                          item.status ===
                            "active"
                      );


                    const yachtCalendar =
                      calendar.filter(
                        (
                          item
                        ) =>
                          item.yacht_id ===
                            yacht.id &&
                          item.price !==
                            null
                      );


                    const yachtBookings =
                      bookings.filter(
                        (
                          item
                        ) =>
                          item.yacht_id ===
                          yacht.id
                      );


                    const avg =
                      yachtCalendar.length
                        ? yachtCalendar.reduce(
                            (
                              total,
                              item
                            ) =>
                              total +
                              Number(
                                item.price ||
                                0
                              ),
                            0
                          ) /
                          yachtCalendar.length
                        : 0;


                    const revenue =
                      yachtBookings.reduce(
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


                    return (
                      <tr
                        key={
                          yacht.id
                        }
                        className="border-t border-white/[.06] transition hover:bg-white/[.025]"
                      >

                        <td className="px-5 py-4">

                          <div className="flex items-center gap-3">

                            <div className="grid h-9 w-9 place-items-center rounded-xl bg-orange-500/10 text-orange-400">
                              <FaShip />
                            </div>

                            <div>

                              <div className="text-[10px] font-black">
                                {
                                  yacht.name
                                }
                              </div>

                              <div className="mt-1 text-[7px] text-slate-600">
                                {
                                  yacht.yacht_type
                                }
                              </div>

                            </div>

                          </div>

                        </td>


                        <td className="px-5 py-4 text-[9px]">
                          {
                            yacht.marina ||
                            yacht.city ||
                            "—"
                          }
                        </td>


                        <td className="px-5 py-4 text-[10px] font-black">
                          {money(
                            yacht.base_daily_price,
                            yacht.currency
                          )}
                        </td>


                        <td className="px-5 py-4 text-[9px] font-black">
                          {
                            yacht.minimum_days
                          }
                        </td>


                        <td className="px-5 py-4">

                          <span className={`rounded-lg px-2.5 py-1.5 text-[8px] font-black ${
                            yachtPlans.length >
                            0
                              ? "bg-emerald-500/10 text-emerald-300"
                              : "bg-slate-500/10 text-slate-500"
                          }`}>
                            {
                              yachtPlans.length
                            }
                          </span>

                        </td>


                        <td className="px-5 py-4 text-[9px] font-black">
                          {
                            yachtCalendar.length
                          }
                        </td>


                        <td className="px-5 py-4 text-[10px] font-black text-orange-300">
                          {money(
                            avg,
                            yacht.currency
                          )}
                        </td>


                        <td className="px-5 py-4 text-[9px] font-black">
                          {
                            yachtBookings.length
                          }
                        </td>


                        <td className="px-5 py-4 text-[10px] font-black text-emerald-300">
                          {money(
                            revenue,
                            yacht.currency
                          )}
                        </td>


                        <td className="px-5 py-4">

                          <button
                            type="button"
                            onClick={() =>
                              openYacht(
                                yacht
                              )
                            }
                            className="h-9 rounded-lg bg-orange-500 px-4 text-[8px] font-black"
                          >
                            Fiyat Dosyası
                          </button>

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


      {selected && (
        <div className="fixed inset-0 z-[150] overflow-y-auto bg-black/80 p-4 backdrop-blur-sm">

          <div className="mx-auto my-5 max-w-6xl overflow-hidden rounded-[30px] border border-white/10 bg-[#07131f] shadow-2xl">


            <div className="flex items-start justify-between border-b border-white/10 p-6">

              <div>

                <div className="text-[8px] font-black uppercase tracking-[.2em] text-orange-400">
                  REVENUE FILE
                </div>

                <div className="mt-2 text-2xl font-black">
                  {
                    selected.name
                  }
                </div>

                <div className="mt-1 text-[9px] text-slate-500">
                  {
                    selected.marina ||
                    selected.city
                  }
                </div>

              </div>


              <button
                type="button"
                onClick={() =>
                  setSelected(
                    null
                  )
                }
                className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-slate-400"
              >
                <FaTimes />
              </button>

            </div>


            <div className="grid gap-5 p-6 xl:grid-cols-[.75fr_1.25fr]">


              <div className="space-y-5">


                <section className="rounded-[24px] border border-white/10 bg-white/[.02] p-5">

                  <div className="text-sm font-black">
                    Ana Fiyat Politikası
                  </div>


                  <Field
                    label="Ana Günlük Fiyat"
                    type="number"
                    value={
                      baseRate
                    }
                    onChange={
                      setBaseRate
                    }
                  />


                  <div className="mt-3">

                    <Field
                      label="Minimum Gün"
                      type="number"
                      value={
                        baseMinimumDays
                      }
                      onChange={
                        setBaseMinimumDays
                      }
                    />

                  </div>


                  <button
                    type="button"
                    disabled={
                      saving
                    }
                    onClick={() =>
                      void saveBaseRate()
                    }
                    className="mt-4 h-11 w-full rounded-xl border border-orange-500/20 bg-orange-500/[.08] text-[8px] font-black text-orange-300"
                  >
                    Ana Fiyatı Kaydet
                  </button>

                </section>


                <section className="rounded-[24px] border border-white/10 bg-white/[.02] p-5">

                  <div className="text-sm font-black">
                    Fiyat Takvimini Yayınla
                  </div>

                  <div className="mt-1 text-[8px] leading-4 text-slate-500">
                    Aktif planlara göre fiyatları availability takvimine yazar.
                    Rezervasyon ve bakım durumlarını değiştirmez.
                  </div>


                  <div className="mt-4 grid grid-cols-2 gap-3">

                    <Field
                      label="Başlangıç"
                      type="date"
                      value={
                        publishFrom
                      }
                      onChange={
                        setPublishFrom
                      }
                    />

                    <Field
                      label="Bitiş"
                      type="date"
                      value={
                        publishTo
                      }
                      onChange={
                        setPublishTo
                      }
                    />

                  </div>


                  <button
                    type="button"
                    disabled={
                      saving
                    }
                    onClick={() =>
                      void publishCalendar()
                    }
                    className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 text-[8px] font-black"
                  >
                    <FaCalendarAlt />
                    Fiyat Takvimini Yayınla
                  </button>

                </section>


                <section className="rounded-[24px] border border-white/10 bg-white/[.02] p-5">

                  <div className="text-sm font-black">
                    Ticari Özet
                  </div>


                  <div className="mt-4 grid grid-cols-2 gap-3">

                    <Mini
                      label="Aktif Plan"
                      value={String(
                        selectedPlans.filter(
                          (
                            item
                          ) =>
                            item.status ===
                            "active"
                        ).length
                      )}
                    />

                    <Mini
                      label="Takvim Günü"
                      value={String(
                        selectedCalendar.length
                      )}
                    />

                    <Mini
                      label="Rezervasyon"
                      value={String(
                        selectedBookings.length
                      )}
                    />

                    <Mini
                      label="Ciro"
                      value={money(
                        selectedBookings.reduce(
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
                        ),
                        selected.currency
                      )}
                    />

                  </div>

                </section>

              </div>


              <div className="space-y-5">


                <section className="rounded-[24px] border border-white/10 bg-white/[.02] p-5">

                  <div className="flex items-center gap-3">

                    <FaCoins className="text-orange-400" />

                    <div>

                      <div className="text-sm font-black">
                        Yeni Sezon Fiyat Planı
                      </div>

                      <div className="mt-1 text-[8px] text-slate-500">
                        Çakışan planlarda yüksek öncelik kazanır.
                      </div>

                    </div>

                  </div>


                  <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">

                    <Field
                      label="Plan Adı"
                      value={
                        planName
                      }
                      onChange={
                        setPlanName
                      }
                    />

                    <Field
                      label="Başlangıç"
                      type="date"
                      value={
                        planStart
                      }
                      onChange={
                        setPlanStart
                      }
                    />

                    <Field
                      label="Bitiş"
                      type="date"
                      value={
                        planEnd
                      }
                      onChange={
                        setPlanEnd
                      }
                    />

                    <Field
                      label="Hafta İçi"
                      type="number"
                      value={
                        weekdayPrice
                      }
                      onChange={
                        setWeekdayPrice
                      }
                    />

                    <Field
                      label="Hafta Sonu"
                      type="number"
                      value={
                        weekendPrice
                      }
                      onChange={
                        setWeekendPrice
                      }
                    />

                    <Field
                      label="Minimum Gün"
                      type="number"
                      value={
                        minimumDays
                      }
                      onChange={
                        setMinimumDays
                      }
                    />

                    <Field
                      label="Öncelik"
                      type="number"
                      value={
                        priority
                      }
                      onChange={
                        setPriority
                      }
                    />


                    <button
                      type="button"
                      disabled={
                        saving
                      }
                      onClick={() =>
                        void createPlan()
                      }
                      className="mt-auto flex h-11 items-center justify-center gap-2 rounded-xl bg-orange-500 text-[8px] font-black"
                    >
                      <FaPlus />
                      Plan Oluştur
                    </button>

                  </div>

                </section>


                <div className="overflow-x-auto rounded-[24px] border border-white/10">

                  <table className="w-full min-w-[1200px] text-left">

                    <thead className="bg-[#0a1723]">

                      <tr className="text-[8px] font-black uppercase text-slate-600">

                        <th className="px-4 py-4">
                          Plan
                        </th>

                        <th className="px-4 py-4">
                          Tarih
                        </th>

                        <th className="px-4 py-4">
                          Hafta İçi
                        </th>

                        <th className="px-4 py-4">
                          Hafta Sonu
                        </th>

                        <th className="px-4 py-4">
                          Min. Gün
                        </th>

                        <th className="px-4 py-4">
                          Öncelik
                        </th>

                        <th className="px-4 py-4">
                          Durum
                        </th>

                        <th className="px-4 py-4">
                          Aksiyon
                        </th>

                      </tr>

                    </thead>


                    <tbody>

                      {selectedPlans.map(
                        (
                          plan
                        ) => (
                          <tr
                            key={
                              plan.id
                            }
                            className="border-t border-white/[.06]"
                          >

                            <td className="px-4 py-4 text-[9px] font-black">
                              {
                                plan.name
                              }
                            </td>


                            <td className="px-4 py-4 text-[8px] text-slate-500">
                              {shortDate(
                                plan.start_date
                              )}
                              {" → "}
                              {shortDate(
                                plan.end_date
                              )}
                            </td>


                            <td className="px-4 py-4 text-[9px] font-black">
                              {money(
                                plan.weekday_price,
                                plan.currency
                              )}
                            </td>


                            <td className="px-4 py-4 text-[9px] font-black text-orange-300">
                              {money(
                                plan.weekend_price ??
                                plan.weekday_price,
                                plan.currency
                              )}
                            </td>


                            <td className="px-4 py-4 text-[9px]">
                              {
                                plan.minimum_days
                              }
                            </td>


                            <td className="px-4 py-4 text-[9px]">
                              {
                                plan.priority
                              }
                            </td>


                            <td className="px-4 py-4">

                              <span className={`rounded-full px-2.5 py-1 text-[8px] font-black ${
                                plan.status ===
                                "active"
                                  ? "bg-emerald-500/10 text-emerald-300"
                                  : "bg-slate-500/10 text-slate-500"
                              }`}>
                                {
                                  plan.status
                                }
                              </span>

                            </td>


                            <td className="px-4 py-4">

                              <button
                                type="button"
                                onClick={async () => {

                                  await setYachtRatePlanStatus(
                                    plan.id,
                                    plan.status ===
                                      "active"
                                      ? "passive"
                                      : "active"
                                  );


                                  await refresh(
                                    companyId
                                  );


                                  toast(
                                    "Fiyat planı durumu güncellendi."
                                  );

                                }}
                                className="rounded-lg border border-white/10 px-3 py-2 text-[8px] font-black text-slate-400"
                              >
                                {plan.status ===
                                "active"
                                  ? "Pasife Al"
                                  : "Aktifleştir"}
                              </button>

                            </td>

                          </tr>
                        )
                      )}

                    </tbody>

                  </table>

                </div>

              </div>

            </div>

          </div>

        </div>
      )}

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


function Mini({
  label,
  value,
}: {
  label: string;
  value: string;
}) {

  return (
    <div className="rounded-xl border border-white/[.07] bg-black/10 p-4">

      <div className="text-[7px] font-black uppercase text-slate-600">
        {label}
      </div>

      <div className="mt-2 text-[10px] font-black">
        {value}
      </div>

    </div>
  );
}


function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange:
    (
      value: string
    ) => void;
  type?: string;
}) {

  return (
    <label>

      <span className="mb-1 block text-[8px] font-black uppercase text-slate-500">
        {label}
      </span>

      <input
        type={
          type
        }
        value={
          value
        }
        onChange={(
          event
        ) =>
          onChange(
            event.target.value
          )
        }
        className="h-11 w-full rounded-xl border border-white/10 bg-white/[.025] px-3 text-[9px] outline-none"
      />

    </label>
  );
}
