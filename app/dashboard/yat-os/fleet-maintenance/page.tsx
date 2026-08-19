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
  FaCheckCircle,
  FaClock,
  FaExclamationTriangle,
  FaFileAlt,
  FaFilter,
  FaMoneyBillWave,
  FaPlus,
  FaSearch,
  FaShip,
  FaTimes,
  FaWrench,
} from "react-icons/fa";

import {
  getCurrentMembership,
  getCurrentUser,
} from "@/lib/current-user";

import {
  addYachtDocument,
  loadYachtFleetMaintenance,
  scheduleYachtMaintenance,
  updateYachtDocumentStatus,
  updateYachtEngineHours,
  updateYachtMaintenanceStatus,

  type YachtDocument,
  type YachtMaintenanceJob,
} from "@/lib/yacht-os/fleet-maintenance";


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


function maintenanceTone(
  value: string
) {

  if (
    value ===
    "completed"
  ) {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
  }


  if (
    value ===
    "in_progress"
  ) {
    return "border-orange-500/25 bg-orange-500/10 text-orange-300";
  }


  if (
    value ===
    "cancelled"
  ) {
    return "border-slate-500/20 bg-slate-500/10 text-slate-400";
  }


  return "border-blue-500/20 bg-blue-500/10 text-blue-300";
}


function documentRisk(
  document:
    YachtDocument
) {

  if (
    document.status ===
    "archived"
  ) {
    return {
      key:
        "archived",
      label:
        "Arşiv",
      tone:
        "text-slate-500",
    };
  }


  if (
    !document.expiry_date
  ) {
    return {
      key:
        "none",
      label:
        "Süresiz",
      tone:
        "text-slate-400",
    };
  }


  const today =
    new Date();

  today.setHours(
    0,
    0,
    0,
    0
  );


  const expiry =
    new Date(
      `${document.expiry_date}T12:00:00`
    );


  const days =
    Math.ceil(
      (
        expiry.getTime() -
        today.getTime()
      ) /
      86400000
    );


  if (days < 0) {
    return {
      key:
        "expired",
      label:
        "Süresi Geçti",
      tone:
        "text-red-300",
    };
  }


  if (days <= 30) {
    return {
      key:
        "critical",
      label:
        `${days} gün kaldı`,
      tone:
        "text-orange-300",
    };
  }


  if (days <= 90) {
    return {
      key:
        "warning",
      label:
        `${days} gün kaldı`,
      tone:
        "text-amber-300",
    };
  }


  return {
    key:
      "healthy",
    label:
      `${days} gün`,
    tone:
      "text-emerald-300",
  };
}


export default function YachtFleetMaintenancePage() {

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
    maintenance,
    setMaintenance,
  ] =
    useState<
      YachtMaintenanceJob[]
    >([]);

  const [
    documents,
    setDocuments,
  ] =
    useState<
      YachtDocument[]
    >([]);

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
    tab,
    setTab,
  ] =
    useState<
      "overview" |
      "maintenance" |
      "documents"
    >(
      "overview"
    );

  const [
    maintenanceType,
    setMaintenanceType,
  ] =
    useState(
      "periodic"
    );

  const [
    maintenanceTitle,
    setMaintenanceTitle,
  ] =
    useState("");

  const [
    maintenanceDescription,
    setMaintenanceDescription,
  ] =
    useState("");

  const [
    maintenanceStart,
    setMaintenanceStart,
  ] =
    useState("");

  const [
    maintenanceEnd,
    setMaintenanceEnd,
  ] =
    useState("");

  const [
    maintenancePriority,
    setMaintenancePriority,
  ] =
    useState(
      "medium"
    );

  const [
    serviceProvider,
    setServiceProvider,
  ] =
    useState("");

  const [
    estimatedCost,
    setEstimatedCost,
  ] =
    useState("0");

  const [
    engineHours,
    setEngineHours,
  ] =
    useState("");

  const [
    completionCost,
    setCompletionCost,
  ] =
    useState("");

  const [
    nextMaintenanceDate,
    setNextMaintenanceDate,
  ] =
    useState("");

  const [
    documentType,
    setDocumentType,
  ] =
    useState(
      "insurance"
    );

  const [
    documentTitle,
    setDocumentTitle,
  ] =
    useState("");

  const [
    documentNo,
    setDocumentNo,
  ] =
    useState("");

  const [
    documentIssuer,
    setDocumentIssuer,
  ] =
    useState("");

  const [
    documentIssueDate,
    setDocumentIssueDate,
  ] =
    useState("");

  const [
    documentExpiryDate,
    setDocumentExpiryDate,
  ] =
    useState("");

  const [
    documentUrl,
    setDocumentUrl,
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
          await loadYachtFleetMaintenance(
            activeCompany
          );


        setYachts(
          data.yachts
        );

        setMaintenance(
          data.maintenance
        );

        setDocuments(
          data.documents
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


  const activeMaintenance =
    maintenance.filter(
      (
        item
      ) =>
        [
          "planned",
          "in_progress",
        ].includes(
          item.status
        )
    );


  const maintenanceCost =
    maintenance
      .filter(
        (
          item
        ) =>
          item.status ===
          "completed"
      )
      .reduce(
        (
          total,
          item
        ) =>
          total +
          Number(
            item.actual_cost
          ),
        0
      );


  const expiredDocuments =
    documents.filter(
      (
        item
      ) =>
        documentRisk(
          item
        ).key ===
        "expired"
    );


  const expiring30 =
    documents.filter(
      (
        item
      ) =>
        documentRisk(
          item
        ).key ===
        "critical"
    );


  const maintenanceYachts =
    new Set(
      activeMaintenance.map(
        (
          item
        ) =>
          item.yacht_id
      )
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
              `${yacht.name} ${yacht.city || ""} ${yacht.marina || ""} ${yacht.captain_name || ""}`
                .toLocaleLowerCase(
                  "tr"
                );


            const searchOk =
              !needle ||
              text.includes(
                needle
              );


            const yachtDocs =
              documents.filter(
                (
                  document
                ) =>
                  document.yacht_id ===
                  yacht.id
              );


            const hasRisk =
              yachtDocs.some(
                (
                  document
                ) =>
                  [
                    "expired",
                    "critical",
                  ].includes(
                    documentRisk(
                      document
                    ).key
                  )
              );


            const filterOk =
              filter ===
                "all" ||

              (
                filter ===
                  "maintenance" &&
                maintenanceYachts.has(
                  yacht.id
                )
              ) ||

              (
                filter ===
                  "document-risk" &&
                hasRisk
              ) ||

              (
                filter ===
                  "available" &&
                yacht.status ===
                  "available"
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
        documents,
        query,
        filter,
        maintenanceYachts,
      ]
    );


  const selectedMaintenance =
    selected
      ? maintenance.filter(
          (
            item
          ) =>
            item.yacht_id ===
            selected.id
        )
      : [];


  const selectedDocuments =
    selected
      ? documents.filter(
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

    setTab(
      "overview"
    );

    setEngineHours(
      String(
        yacht.engine_hours ??
        0
      )
    );
  }


  async function createMaintenance() {

    if (
      !selected ||
      !maintenanceTitle.trim() ||
      !maintenanceStart ||
      !maintenanceEnd
    ) {

      setError(
        "Bakım başlığı ve tarihleri zorunlu."
      );

      return;
    }


    setSaving(true);
    setError("");


    try {

      await scheduleYachtMaintenance({
        yachtId:
          selected.id,

        maintenanceType,

        title:
          maintenanceTitle.trim(),

        description:
          maintenanceDescription ||
          undefined,

        plannedStart:
          maintenanceStart,

        plannedEnd:
          maintenanceEnd,

        priority:
          maintenancePriority,

        serviceProvider:
          serviceProvider ||
          undefined,

        estimatedCost:
          Number(
            estimatedCost
          ) ||
          0,

        currency:
          selected.currency ||
          "TRY",
      });


      await refresh(
        companyId
      );


      setMaintenanceTitle("");
      setMaintenanceDescription("");
      setMaintenanceStart("");
      setMaintenanceEnd("");
      setServiceProvider("");
      setEstimatedCost("0");


      toast(
        "Bakım planlandı ve satış takvimi bloke edildi."
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

      setSaving(
        false
      );
    }
  }


  async function maintenanceAction(
    item:
      YachtMaintenanceJob,
    status: string
  ) {

    setSaving(true);
    setError("");


    try {

      await updateYachtMaintenanceStatus({
        maintenanceId:
          item.id,

        status,

        actualCost:
          status ===
          "completed"
            ? Number(
                completionCost ||
                item.actual_cost ||
                item.estimated_cost
              )
            : undefined,

        engineHours:
          engineHours
            ? Number(
                engineHours
              )
            : undefined,

        nextMaintenanceDate:
          nextMaintenanceDate ||
          undefined,
      });


      await refresh(
        companyId
      );


      toast(
        status ===
          "completed"
          ? "Bakım tamamlandı; maliyet finansa işlendi."
          : status ===
            "cancelled"
            ? "Bakım iptal edildi ve bakım günleri açıldı."
            : "Bakım durumu güncellendi."
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

      setSaving(
        false
      );
    }
  }


  async function saveEngineHours() {

    if (!selected) {
      return;
    }


    try {

      await updateYachtEngineHours(
        selected.id,
        Number(
          engineHours
        ) ||
        0
      );


      await refresh(
        companyId
      );


      toast(
        "Motor saati güncellendi."
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
    }
  }


  async function createDocument() {

    if (
      !selected ||
      !documentTitle.trim()
    ) {

      setError(
        "Evrak adı zorunlu."
      );

      return;
    }


    setSaving(true);


    try {

      await addYachtDocument({
        companyId,

        yachtId:
          selected.id,

        documentType,

        title:
          documentTitle.trim(),

        documentNo:
          documentNo ||
          undefined,

        issuer:
          documentIssuer ||
          undefined,

        issueDate:
          documentIssueDate ||
          undefined,

        expiryDate:
          documentExpiryDate ||
          undefined,

        fileUrl:
          documentUrl ||
          undefined,
      });


      await refresh(
        companyId
      );


      setDocumentTitle("");
      setDocumentNo("");
      setDocumentIssuer("");
      setDocumentIssueDate("");
      setDocumentExpiryDate("");
      setDocumentUrl("");


      toast(
        "Yat evrakı kaydedildi."
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

      setSaving(
        false
      );
    }
  }


  if (loading) {

    return (
      <main className="grid min-h-[70vh] place-items-center bg-[#030a11] text-white">
        <FaWrench className="animate-pulse text-4xl text-orange-400" />
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


        <section className="rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,.15),transparent_32%),radial-gradient(circle_at_70%_0%,rgba(59,130,246,.08),transparent_32%),linear-gradient(145deg,#07131f,#040b12)] p-6 lg:p-8">

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
                  FLEET MAINTENANCE
                </span>

                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[8px] font-black text-emerald-300">
                  ● Filo Sağlığı
                </span>

              </div>


              <h1 className="mt-4 text-3xl font-black tracking-[-.04em] lg:text-5xl">
                Filo Bakım &{" "}
                <span className="text-orange-400">
                  Evrak Merkezi
                </span>
              </h1>


              <p className="mt-3 max-w-3xl text-xs leading-5 text-slate-400">
                {companyName}
                {" · "}
                Periyodik bakım, arıza, motor saati, maliyet,
                sigorta ve resmi evrak süreleri tek merkezde.
              </p>

            </div>


            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">

              <HeaderMetric
                label="Filo"
                value={String(
                  yachts.length
                )}
              />

              <HeaderMetric
                label="Aktif Bakım"
                value={String(
                  activeMaintenance.length
                )}
              />

              <HeaderMetric
                label="30 Gün Evrak"
                value={String(
                  expiring30.length
                )}
                danger={
                  expiring30.length >
                  0
                }
              />

              <HeaderMetric
                label="Süresi Geçmiş"
                value={String(
                  expiredDocuments.length
                )}
                danger={
                  expiredDocuments.length >
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
            label="Toplam Tekne"
            value={String(
              yachts.length
            )}
            detail="Yat OS filosu"
          />

          <Kpi
            label="Bakımda / Planlı"
            value={String(
              activeMaintenance.length
            )}
            detail="Takvimi bloke edilen işler"
          />

          <Kpi
            label="Evrak Riski"
            value={String(
              expiredDocuments.length +
              expiring30.length
            )}
            detail="Geçmiş veya 30 gün içinde"
            danger={
              expiredDocuments.length +
              expiring30.length >
              0
            }
          />

          <Kpi
            label="Tamamlanan Bakım"
            value={String(
              maintenance.filter(
                (
                  item
                ) =>
                  item.status ===
                  "completed"
              ).length
            )}
            detail="Bakım geçmişi"
            success
          />

          <Kpi
            label="Bakım Gideri"
            value={money(
              maintenanceCost
            )}
            detail="Tamamlanmış gerçek maliyet"
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
                placeholder="Tekne, marina, şehir veya kaptan ara..."
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

                <option value="maintenance">
                  Bakım Planı Olanlar
                </option>

                <option value="document-risk">
                  Evrak Riski
                </option>

                <option value="available">
                  Müsait
                </option>

              </select>

            </div>

          </div>


          <div className="overflow-x-auto">

            <table className="w-full min-w-[1650px] text-left">

              <thead className="sticky top-0 z-10 bg-[#0a1723]">

                <tr className="text-[8px] font-black uppercase tracking-[.1em] text-slate-600">

                  <th className="px-5 py-4">
                    Tekne
                  </th>

                  <th className="px-5 py-4">
                    Marina
                  </th>

                  <th className="px-5 py-4">
                    Durum
                  </th>

                  <th className="px-5 py-4">
                    Motor Saati
                  </th>

                  <th className="px-5 py-4">
                    Son Bakım
                  </th>

                  <th className="px-5 py-4">
                    Sonraki Bakım
                  </th>

                  <th className="px-5 py-4">
                    Aktif İş
                  </th>

                  <th className="px-5 py-4">
                    Evrak
                  </th>

                  <th className="px-5 py-4">
                    Evrak Riski
                  </th>

                  <th className="px-5 py-4">
                    Bakım Maliyeti
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

                    const yachtJobs =
                      maintenance.filter(
                        (
                          item
                        ) =>
                          item.yacht_id ===
                          yacht.id
                      );


                    const yachtActive =
                      yachtJobs.filter(
                        (
                          item
                        ) =>
                          [
                            "planned",
                            "in_progress",
                          ].includes(
                            item.status
                          )
                      );


                    const yachtDocs =
                      documents.filter(
                        (
                          item
                        ) =>
                          item.yacht_id ===
                          yacht.id
                      );


                    const riskDocs =
                      yachtDocs.filter(
                        (
                          item
                        ) =>
                          [
                            "expired",
                            "critical",
                          ].includes(
                            documentRisk(
                              item
                            ).key
                          )
                      );


                    const cost =
                      yachtJobs
                        .filter(
                          (
                            item
                          ) =>
                            item.status ===
                            "completed"
                        )
                        .reduce(
                          (
                            total,
                            item
                          ) =>
                            total +
                            Number(
                              item.actual_cost
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


                        <td className="px-5 py-4">

                          <div className="text-[9px] font-black">
                            {
                              yacht.marina ||
                              "—"
                            }
                          </div>

                          <div className="mt-1 text-[7px] text-slate-600">
                            {
                              yacht.city
                            }
                          </div>

                        </td>


                        <td className="px-5 py-4 text-[8px] font-black">
                          {
                            yacht.status
                          }
                        </td>


                        <td className="px-5 py-4 text-[10px] font-black">
                          {
                            Number(
                              yacht.engine_hours ||
                              0
                            ).toLocaleString(
                              "tr-TR"
                            )
                          }
                          {" "}
                          <span className="text-[7px] text-slate-600">
                            saat
                          </span>
                        </td>


                        <td className="px-5 py-4 text-[8px] text-slate-400">
                          {shortDate(
                            yacht.last_maintenance_date
                          )}
                        </td>


                        <td className="px-5 py-4 text-[8px] font-black text-orange-300">
                          {shortDate(
                            yacht.next_maintenance_date
                          )}
                        </td>


                        <td className="px-5 py-4">

                          <span className={`rounded-lg px-2.5 py-1.5 text-[8px] font-black ${
                            yachtActive.length >
                            0
                              ? "bg-orange-500/10 text-orange-300"
                              : "bg-emerald-500/10 text-emerald-300"
                          }`}>
                            {
                              yachtActive.length
                            }
                          </span>

                        </td>


                        <td className="px-5 py-4 text-[9px] font-black">
                          {
                            yachtDocs.length
                          }
                        </td>


                        <td className="px-5 py-4">

                          <span className={`text-[9px] font-black ${
                            riskDocs.length >
                            0
                              ? "text-red-300"
                              : "text-emerald-300"
                          }`}>
                            {
                              riskDocs.length
                            }
                          </span>

                        </td>


                        <td className="px-5 py-4 text-[9px] font-black text-slate-300">
                          {money(
                            cost,
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
                            Filo Dosyası
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
                  FLEET ASSET FILE
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
                  {" · "}
                  {
                    selected.status
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


            <div className="flex gap-2 overflow-x-auto border-b border-white/10 px-6 py-3">

              {[
                [
                  "overview",
                  "Filo Özeti",
                ],
                [
                  "maintenance",
                  "Bakım Yönetimi",
                ],
                [
                  "documents",
                  "Evrak Merkezi",
                ],
              ].map(
                (
                  item
                ) => (
                  <button
                    key={
                      item[0]
                    }
                    type="button"
                    onClick={() =>
                      setTab(
                        item[0] as
                          typeof tab
                      )
                    }
                    className={`whitespace-nowrap rounded-xl px-4 py-2 text-[8px] font-black ${
                      tab ===
                      item[0]
                        ? "bg-orange-500 text-white"
                        : "border border-white/10 text-slate-500"
                    }`}
                  >
                    {
                      item[1]
                    }
                  </button>
                )
              )}

            </div>


            <div className="p-6">


              {tab ===
                "overview" && (
                <div className="grid gap-5 xl:grid-cols-2">

                  <section className="rounded-[24px] border border-white/10 bg-white/[.02] p-5">

                    <div className="text-sm font-black">
                      Teknik Özet
                    </div>


                    <div className="mt-4 grid grid-cols-2 gap-3">

                      <Mini
                        label="Motor Saati"
                        value={`${Number(
                          selected.engine_hours ||
                          0
                        ).toLocaleString(
                          "tr-TR"
                        )} saat`}
                      />

                      <Mini
                        label="Durum"
                        value={
                          selected.status
                        }
                      />

                      <Mini
                        label="Son Bakım"
                        value={shortDate(
                          selected.last_maintenance_date
                        )}
                      />

                      <Mini
                        label="Sonraki Bakım"
                        value={shortDate(
                          selected.next_maintenance_date
                        )}
                      />

                      <Mini
                        label="Bakım Geçmişi"
                        value={String(
                          selectedMaintenance.length
                        )}
                      />

                      <Mini
                        label="Evrak"
                        value={String(
                          selectedDocuments.length
                        )}
                      />

                    </div>


                    <div className="mt-5 flex gap-2">

                      <input
                        type="number"
                        min="0"
                        value={
                          engineHours
                        }
                        onChange={(
                          event
                        ) =>
                          setEngineHours(
                            event.target.value
                          )
                        }
                        className="h-11 flex-1 rounded-xl border border-white/10 bg-black/10 px-4 text-xs font-black outline-none"
                        placeholder="Motor saati"
                      />


                      <button
                        type="button"
                        onClick={() =>
                          void saveEngineHours()
                        }
                        className="rounded-xl border border-orange-500/20 bg-orange-500/[.07] px-4 text-[8px] font-black text-orange-300"
                      >
                        Motor Saatini Kaydet
                      </button>

                    </div>

                  </section>


                  <section className="rounded-[24px] border border-white/10 bg-white/[.02] p-5">

                    <div className="text-sm font-black">
                      Risk Özeti
                    </div>


                    <div className="mt-4 space-y-3">

                      <RiskLine
                        label="Aktif bakım işi"
                        value={String(
                          selectedMaintenance.filter(
                            (
                              item
                            ) =>
                              [
                                "planned",
                                "in_progress",
                              ].includes(
                                item.status
                              )
                          ).length
                        )}
                      />

                      <RiskLine
                        label="Süresi geçen evrak"
                        value={String(
                          selectedDocuments.filter(
                            (
                              item
                            ) =>
                              documentRisk(
                                item
                              ).key ===
                              "expired"
                          ).length
                        )}
                        danger
                      />

                      <RiskLine
                        label="30 gün içinde bitecek evrak"
                        value={String(
                          selectedDocuments.filter(
                            (
                              item
                            ) =>
                              documentRisk(
                                item
                              ).key ===
                              "critical"
                          ).length
                        )}
                      />

                    </div>

                  </section>

                </div>
              )}


              {tab ===
                "maintenance" && (
                <div>


                  <section className="rounded-[24px] border border-white/10 bg-white/[.02] p-5">

                    <div className="flex items-center gap-3">

                      <FaWrench className="text-orange-400" />

                      <div>

                        <div className="text-sm font-black">
                          Yeni Bakım Planı
                        </div>

                        <div className="mt-1 text-[8px] text-slate-500">
                          Rezervasyon veya opsiyon ile çakışırsa sistem işlemi reddeder.
                        </div>

                      </div>

                    </div>


                    <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">

                      <label>

                        <span className="mb-1 block text-[8px] font-black uppercase text-slate-500">
                          Bakım Türü
                        </span>

                        <select
                          value={
                            maintenanceType
                          }
                          onChange={(
                            event
                          ) =>
                            setMaintenanceType(
                              event.target.value
                            )
                          }
                          className="h-11 w-full rounded-xl border border-white/10 bg-[#0b1723] px-3 text-[9px]"
                        >

                          <option value="periodic">
                            Periyodik
                          </option>

                          <option value="engine">
                            Motor
                          </option>

                          <option value="mechanical">
                            Mekanik
                          </option>

                          <option value="electrical">
                            Elektrik
                          </option>

                          <option value="electronics">
                            Elektronik
                          </option>

                          <option value="hull">
                            Gövde
                          </option>

                          <option value="safety">
                            Güvenlik
                          </option>

                          <option value="cleaning">
                            Temizlik
                          </option>

                          <option value="repair">
                            Arıza / Tamir
                          </option>

                          <option value="inspection">
                            Kontrol
                          </option>

                          <option value="other">
                            Diğer
                          </option>

                        </select>

                      </label>


                      <Field
                        label="Bakım Başlığı"
                        value={
                          maintenanceTitle
                        }
                        onChange={
                          setMaintenanceTitle
                        }
                      />


                      <Field
                        label="Servis / Usta"
                        value={
                          serviceProvider
                        }
                        onChange={
                          setServiceProvider
                        }
                      />


                      <label>

                        <span className="mb-1 block text-[8px] font-black uppercase text-slate-500">
                          Öncelik
                        </span>

                        <select
                          value={
                            maintenancePriority
                          }
                          onChange={(
                            event
                          ) =>
                            setMaintenancePriority(
                              event.target.value
                            )
                          }
                          className="h-11 w-full rounded-xl border border-white/10 bg-[#0b1723] px-3 text-[9px]"
                        >

                          <option value="low">
                            Düşük
                          </option>

                          <option value="medium">
                            Orta
                          </option>

                          <option value="high">
                            Yüksek
                          </option>

                          <option value="critical">
                            Kritik
                          </option>

                        </select>

                      </label>


                      <Field
                        label="Başlangıç"
                        type="date"
                        value={
                          maintenanceStart
                        }
                        onChange={
                          setMaintenanceStart
                        }
                      />

                      <Field
                        label="Bitiş"
                        type="date"
                        value={
                          maintenanceEnd
                        }
                        onChange={
                          setMaintenanceEnd
                        }
                      />

                      <Field
                        label="Tahmini Maliyet"
                        type="number"
                        value={
                          estimatedCost
                        }
                        onChange={
                          setEstimatedCost
                        }
                      />


                      <button
                        type="button"
                        disabled={
                          saving
                        }
                        onClick={() =>
                          void createMaintenance()
                        }
                        className="mt-auto flex h-11 items-center justify-center gap-2 rounded-xl bg-orange-500 text-[8px] font-black"
                      >
                        <FaCalendarAlt />
                        Bakımı Planla
                      </button>

                    </div>


                    <textarea
                      value={
                        maintenanceDescription
                      }
                      onChange={(
                        event
                      ) =>
                        setMaintenanceDescription(
                          event.target.value
                        )
                      }
                      placeholder="Bakım kapsamı, değişecek parçalar, kontrol notları..."
                      className="mt-3 min-h-20 w-full resize-none rounded-xl border border-white/10 bg-black/10 p-4 text-xs outline-none"
                    />

                  </section>


                  <div className="mt-5 overflow-x-auto rounded-[24px] border border-white/10">

                    <table className="w-full min-w-[1450px] text-left">

                      <thead className="bg-[#0a1723]">

                        <tr className="text-[8px] font-black uppercase text-slate-600">

                          <th className="px-4 py-4">
                            Bakım
                          </th>

                          <th className="px-4 py-4">
                            Tarih
                          </th>

                          <th className="px-4 py-4">
                            Servis
                          </th>

                          <th className="px-4 py-4">
                            Öncelik
                          </th>

                          <th className="px-4 py-4">
                            Durum
                          </th>

                          <th className="px-4 py-4">
                            Tahmin
                          </th>

                          <th className="px-4 py-4">
                            Gerçek
                          </th>

                          <th className="px-4 py-4">
                            Aksiyon
                          </th>

                        </tr>

                      </thead>


                      <tbody>

                        {selectedMaintenance.map(
                          (
                            item
                          ) => (
                            <tr
                              key={
                                item.id
                              }
                              className="border-t border-white/[.06]"
                            >

                              <td className="px-4 py-4">

                                <div className="text-[9px] font-black">
                                  {
                                    item.title
                                  }
                                </div>

                                <div className="mt-1 text-[7px] text-slate-600">
                                  {
                                    item.maintenance_type
                                  }
                                </div>

                              </td>


                              <td className="px-4 py-4 text-[8px] text-slate-400">
                                {shortDate(
                                  item.planned_start
                                )}
                                {" → "}
                                {shortDate(
                                  item.planned_end
                                )}
                              </td>


                              <td className="px-4 py-4 text-[8px]">
                                {
                                  item.service_provider ||
                                  "—"
                                }
                              </td>


                              <td className="px-4 py-4 text-[8px] font-black">
                                {
                                  item.priority
                                }
                              </td>


                              <td className="px-4 py-4">

                                <span className={`rounded-full border px-2.5 py-1 text-[8px] font-black ${maintenanceTone(
                                  item.status
                                )}`}>
                                  {
                                    item.status
                                  }
                                </span>

                              </td>


                              <td className="px-4 py-4 text-[9px] font-black">
                                {money(
                                  item.estimated_cost,
                                  item.currency
                                )}
                              </td>


                              <td className="px-4 py-4 text-[9px] font-black text-orange-300">
                                {money(
                                  item.actual_cost,
                                  item.currency
                                )}
                              </td>


                              <td className="px-4 py-4">

                                <div className="flex gap-1.5">

                                  {item.status ===
                                    "planned" && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void maintenanceAction(
                                          item,
                                          "in_progress"
                                        )
                                      }
                                      className="rounded-lg bg-orange-500/10 px-3 py-2 text-[8px] font-black text-orange-300"
                                    >
                                      Başlat
                                    </button>
                                  )}


                                  {[
                                    "planned",
                                    "in_progress",
                                  ].includes(
                                    item.status
                                  ) && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void maintenanceAction(
                                          item,
                                          "completed"
                                        )
                                      }
                                      className="rounded-lg bg-emerald-500/10 px-3 py-2 text-[8px] font-black text-emerald-300"
                                    >
                                      Tamamla
                                    </button>
                                  )}


                                  {item.status ===
                                    "planned" && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void maintenanceAction(
                                          item,
                                          "cancelled"
                                        )
                                      }
                                      className="rounded-lg bg-red-500/10 px-3 py-2 text-[8px] font-black text-red-300"
                                    >
                                      İptal
                                    </button>
                                  )}

                                </div>

                              </td>

                            </tr>
                          )
                        )}

                      </tbody>

                    </table>

                  </div>


                  <section className="mt-5 rounded-[24px] border border-white/10 bg-white/[.02] p-5">

                    <div className="text-sm font-black">
                      Bakım Kapanış Bilgileri
                    </div>


                    <div className="mt-4 grid gap-3 md:grid-cols-3">

                      <Field
                        label="Güncel Motor Saati"
                        type="number"
                        value={
                          engineHours
                        }
                        onChange={
                          setEngineHours
                        }
                      />

                      <Field
                        label="Gerçek Bakım Maliyeti"
                        type="number"
                        value={
                          completionCost
                        }
                        onChange={
                          setCompletionCost
                        }
                      />

                      <Field
                        label="Sonraki Bakım Tarihi"
                        type="date"
                        value={
                          nextMaintenanceDate
                        }
                        onChange={
                          setNextMaintenanceDate
                        }
                      />

                    </div>

                  </section>

                </div>
              )}


              {tab ===
                "documents" && (
                <div>


                  <section className="rounded-[24px] border border-white/10 bg-white/[.02] p-5">

                    <div className="flex items-center gap-3">

                      <FaFileAlt className="text-orange-400" />

                      <div>

                        <div className="text-sm font-black">
                          Yeni Evrak
                        </div>

                        <div className="mt-1 text-[8px] text-slate-500">
                          Sigorta, ruhsat, sörvey, izin ve marina belgeleri.
                        </div>

                      </div>

                    </div>


                    <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">

                      <label>

                        <span className="mb-1 block text-[8px] font-black uppercase text-slate-500">
                          Evrak Türü
                        </span>

                        <select
                          value={
                            documentType
                          }
                          onChange={(
                            event
                          ) =>
                            setDocumentType(
                              event.target.value
                            )
                          }
                          className="h-11 w-full rounded-xl border border-white/10 bg-[#0b1723] px-3 text-[9px]"
                        >

                          <option value="registration">
                            Ruhsat / Kayıt
                          </option>

                          <option value="insurance">
                            Sigorta
                          </option>

                          <option value="survey">
                            Sörvey
                          </option>

                          <option value="license">
                            Lisans
                          </option>

                          <option value="permit">
                            İzin Belgesi
                          </option>

                          <option value="safety_certificate">
                            Güvenlik Belgesi
                          </option>

                          <option value="maintenance_certificate">
                            Bakım Sertifikası
                          </option>

                          <option value="captain_document">
                            Kaptan Belgesi
                          </option>

                          <option value="marina_contract">
                            Marina Sözleşmesi
                          </option>

                          <option value="other">
                            Diğer
                          </option>

                        </select>

                      </label>


                      <Field
                        label="Evrak Adı"
                        value={
                          documentTitle
                        }
                        onChange={
                          setDocumentTitle
                        }
                      />

                      <Field
                        label="Belge No"
                        value={
                          documentNo
                        }
                        onChange={
                          setDocumentNo
                        }
                      />

                      <Field
                        label="Düzenleyen"
                        value={
                          documentIssuer
                        }
                        onChange={
                          setDocumentIssuer
                        }
                      />

                      <Field
                        label="Düzenleme Tarihi"
                        type="date"
                        value={
                          documentIssueDate
                        }
                        onChange={
                          setDocumentIssueDate
                        }
                      />

                      <Field
                        label="Bitiş Tarihi"
                        type="date"
                        value={
                          documentExpiryDate
                        }
                        onChange={
                          setDocumentExpiryDate
                        }
                      />

                      <Field
                        label="Dosya / Drive URL"
                        value={
                          documentUrl
                        }
                        onChange={
                          setDocumentUrl
                        }
                      />


                      <button
                        type="button"
                        disabled={
                          saving
                        }
                        onClick={() =>
                          void createDocument()
                        }
                        className="mt-auto flex h-11 items-center justify-center gap-2 rounded-xl bg-orange-500 text-[8px] font-black"
                      >
                        <FaPlus />
                        Evrakı Kaydet
                      </button>

                    </div>

                  </section>


                  <div className="mt-5 overflow-x-auto rounded-[24px] border border-white/10">

                    <table className="w-full min-w-[1350px] text-left">

                      <thead className="bg-[#0a1723]">

                        <tr className="text-[8px] font-black uppercase text-slate-600">

                          <th className="px-4 py-4">
                            Evrak
                          </th>

                          <th className="px-4 py-4">
                            Belge No
                          </th>

                          <th className="px-4 py-4">
                            Düzenleyen
                          </th>

                          <th className="px-4 py-4">
                            Başlangıç
                          </th>

                          <th className="px-4 py-4">
                            Bitiş
                          </th>

                          <th className="px-4 py-4">
                            Risk
                          </th>

                          <th className="px-4 py-4">
                            Durum
                          </th>

                          <th className="px-4 py-4">
                            Dosya
                          </th>

                          <th className="px-4 py-4">
                            Aksiyon
                          </th>

                        </tr>

                      </thead>


                      <tbody>

                        {selectedDocuments.map(
                          (
                            document
                          ) => {

                            const risk =
                              documentRisk(
                                document
                              );


                            return (
                              <tr
                                key={
                                  document.id
                                }
                                className="border-t border-white/[.06]"
                              >

                                <td className="px-4 py-4">

                                  <div className="text-[9px] font-black">
                                    {
                                      document.title
                                    }
                                  </div>

                                  <div className="mt-1 text-[7px] text-slate-600">
                                    {
                                      document.document_type
                                    }
                                  </div>

                                </td>


                                <td className="px-4 py-4 text-[8px]">
                                  {
                                    document.document_no ||
                                    "—"
                                  }
                                </td>


                                <td className="px-4 py-4 text-[8px]">
                                  {
                                    document.issuer ||
                                    "—"
                                  }
                                </td>


                                <td className="px-4 py-4 text-[8px] text-slate-500">
                                  {shortDate(
                                    document.issue_date
                                  )}
                                </td>


                                <td className="px-4 py-4 text-[8px]">
                                  {shortDate(
                                    document.expiry_date
                                  )}
                                </td>


                                <td className={`px-4 py-4 text-[8px] font-black ${risk.tone}`}>
                                  {
                                    risk.label
                                  }
                                </td>


                                <td className="px-4 py-4 text-[8px] font-black">
                                  {
                                    document.status
                                  }
                                </td>


                                <td className="px-4 py-4">

                                  {document.file_url ? (
                                    <a
                                      href={
                                        document.file_url
                                      }
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-[8px] font-black text-blue-300"
                                    >
                                      Aç
                                    </a>
                                  ) : (
                                    <span className="text-[8px] text-slate-600">
                                      —
                                    </span>
                                  )}

                                </td>


                                <td className="px-4 py-4">

                                  {document.status !==
                                    "archived" && (
                                    <button
                                      type="button"
                                      onClick={async () => {

                                        await updateYachtDocumentStatus(
                                          document.id,
                                          "archived"
                                        );

                                        await refresh(
                                          companyId
                                        );

                                        toast(
                                          "Evrak arşivlendi."
                                        );

                                      }}
                                      className="rounded-lg border border-white/10 px-3 py-2 text-[8px] font-black text-slate-400"
                                    >
                                      Arşivle
                                    </button>
                                  )}

                                </td>

                              </tr>
                            );
                          }
                        )}

                      </tbody>

                    </table>

                  </div>

                </div>
              )}

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


function RiskLine({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {

  return (
    <div className="flex items-center justify-between rounded-xl border border-white/[.07] bg-black/10 p-4">

      <span className="text-[9px] text-slate-400">
        {label}
      </span>

      <span className={`text-sm font-black ${
        danger
          ? "text-red-300"
          : "text-orange-300"
      }`}>
        {value}
      </span>

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
