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
  FaFilter,
  FaPhone,
  FaPlus,
  FaSearch,
  FaShip,
  FaTimes,
  FaUserTie,
  FaUsers,
  FaWhatsapp,
} from "react-icons/fa";

import {
  getCurrentMembership,
  getCurrentUser,
} from "@/lib/current-user";

import {
  addYachtLeadActivity,
  createYachtLead,
  linkYachtLeadQuote,
  loadYachtCRMCenter,
  setYachtLeadStage,
  syncYachtLeadConversions,
  updateYachtLead,

  type YachtLead,
  type YachtLeadActivity,
} from "@/lib/yacht-os/crm-center";


function money(
  value:
    number | null,
  currency = "TRY"
) {

  if (
    value === null
  ) {
    return "—";
  }


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


function stageLabel(
  value: string
) {

  const map:
    Record<
      string,
      string
    > = {
      new:
        "Yeni",

      contacted:
        "İletişim",

      qualified:
        "Nitelikli",

      quote_sent:
        "Teklif",

      negotiation:
        "Pazarlık",

      won:
        "Kazanıldı",

      lost:
        "Kaybedildi",
    };


  return (
    map[value] ||
    value
  );
}


function stageTone(
  value: string
) {

  if (
    value ===
    "won"
  ) {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
  }


  if (
    value ===
    "lost"
  ) {
    return "border-red-500/20 bg-red-500/10 text-red-300";
  }


  if (
    [
      "quote_sent",
      "negotiation",
    ].includes(
      value
    )
  ) {
    return "border-blue-500/20 bg-blue-500/10 text-blue-300";
  }


  return "border-orange-500/20 bg-orange-500/10 text-orange-300";
}


export default function YachtCRMCenterPage() {

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
    leads,
    setLeads,
  ] =
    useState<
      YachtLead[]
    >([]);

  const [
    activities,
    setActivities,
  ] =
    useState<
      YachtLeadActivity[]
    >([]);

  const [
    yachts,
    setYachts,
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
    query,
    setQuery,
  ] =
    useState("");

  const [
    stageFilter,
    setStageFilter,
  ] =
    useState(
      "all"
    );

  const [
    selected,
    setSelected,
  ] =
    useState<
      YachtLead |
      null
    >(null);

  const [
    createOpen,
    setCreateOpen,
  ] =
    useState(false);

  const [
    customerName,
    setCustomerName,
  ] =
    useState("");

  const [
    customerPhone,
    setCustomerPhone,
  ] =
    useState("");

  const [
    customerEmail,
    setCustomerEmail,
  ] =
    useState("");

  const [
    source,
    setSource,
  ] =
    useState(
      "whatsapp"
    );

  const [
    priority,
    setPriority,
  ] =
    useState(
      "medium"
    );

  const [
    preferredYachtId,
    setPreferredYachtId,
  ] =
    useState("");

  const [
    startDate,
    setStartDate,
  ] =
    useState("");

  const [
    endDate,
    setEndDate,
  ] =
    useState("");

  const [
    guestCount,
    setGuestCount,
  ] =
    useState("2");

  const [
    budgetMin,
    setBudgetMin,
  ] =
    useState("");

  const [
    budgetMax,
    setBudgetMax,
  ] =
    useState("");

  const [
    requestNote,
    setRequestNote,
  ] =
    useState("");

  const [
    followUp,
    setFollowUp,
  ] =
    useState("");

  const [
    score,
    setScore,
  ] =
    useState("50");

  const [
    internalNote,
    setInternalNote,
  ] =
    useState("");

  const [
    activityType,
    setActivityType,
  ] =
    useState(
      "whatsapp"
    );

  const [
    activityTitle,
    setActivityTitle,
  ] =
    useState("");

  const [
    activityNote,
    setActivityNote,
  ] =
    useState("");

  const [
    linkedQuote,
    setLinkedQuote,
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
          await loadYachtCRMCenter(
            activeCompany
          );


        setLeads(
          data.leads
        );

        setActivities(
          data.activities
        );

        setYachts(
          data.yachts
        );

        setQuotes(
          data.quotes
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


          await syncYachtLeadConversions(
            membership.company_id
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


  function openLead(
    lead:
      YachtLead
  ) {

    setSelected(
      lead
    );

    setPriority(
      lead.priority
    );

    setPreferredYachtId(
      lead.preferred_yacht_id ||
      ""
    );

    setStartDate(
      lead.start_date ||
      ""
    );

    setEndDate(
      lead.end_date ||
      ""
    );

    setGuestCount(
      String(
        lead.guest_count
      )
    );

    setBudgetMin(
      lead.budget_min !==
        null
        ? String(
            lead.budget_min
          )
        : ""
    );

    setBudgetMax(
      lead.budget_max !==
        null
        ? String(
            lead.budget_max
          )
        : ""
    );

    setInternalNote(
      lead.internal_note ||
      ""
    );

    setFollowUp(
      lead.next_follow_up_at
        ? new Date(
            lead.next_follow_up_at
          )
            .toISOString()
            .slice(
              0,
              16
            )
        : ""
    );

    setScore(
      String(
        lead.score
      )
    );

    setLinkedQuote(
      lead.converted_quote_id ||
      ""
    );
  }


  const openLeads =
    leads.filter(
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


  const now =
    Date.now();


  const overdue =
    openLeads.filter(
      (
        item
      ) =>
        item.next_follow_up_at &&
        new Date(
          item.next_follow_up_at
        ).getTime() <
        now
    );


  const won =
    leads.filter(
      (
        item
      ) =>
        item.stage ===
        "won"
    );


  const conversion =
    leads.length > 0
      ? (
          won.length /
          leads.length
        ) *
        100
      : 0;


  const pipelineValue =
    openLeads.reduce(
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


  const filtered =
    useMemo(
      () => {

        const needle =
          query
            .trim()
            .toLocaleLowerCase(
              "tr"
            );


        return leads.filter(
          (
            lead
          ) => {

            const yacht =
              yachts.find(
                (
                  item
                ) =>
                  item.id ===
                  lead.preferred_yacht_id
              );


            const text =
              `${lead.customer_name} ${lead.customer_phone || ""} ${lead.customer_email || ""} ${yacht?.name || ""}`
                .toLocaleLowerCase(
                  "tr"
                );


            const searchOk =
              !needle ||
              text.includes(
                needle
              );


            const stageOk =
              stageFilter ===
                "all" ||
              lead.stage ===
                stageFilter;


            return (
              searchOk &&
              stageOk
            );
          }
        );

      },
      [
        leads,
        yachts,
        query,
        stageFilter,
      ]
    );


  const selectedActivities =
    selected
      ? activities.filter(
          (
            item
          ) =>
            item.lead_id ===
            selected.id
        )
      : [];


  async function createLead() {

    if (
      !customerName.trim()
    ) {
      return;
    }


    setSaving(true);


    try {

      await createYachtLead({
        companyId,

        customerName:
          customerName.trim(),

        customerPhone:
          customerPhone ||
          undefined,

        customerEmail:
          customerEmail ||
          undefined,

        source,

        priority,

        preferredYachtId:
          preferredYachtId ||
          undefined,

        startDate:
          startDate ||
          undefined,

        endDate:
          endDate ||
          undefined,

        guestCount:
          Number(
            guestCount
          ) ||
          2,

        budgetMin:
          budgetMin
            ? Number(
                budgetMin
              )
            : undefined,

        budgetMax:
          budgetMax
            ? Number(
                budgetMax
              )
            : undefined,

        requestNote:
          requestNote ||
          undefined,

        nextFollowUpAt:
          followUp ||
          undefined,
      });


      await refresh(
        companyId
      );


      setCreateOpen(
        false
      );

      setCustomerName("");
      setCustomerPhone("");
      setCustomerEmail("");
      setRequestNote("");
      setStartDate("");
      setEndDate("");
      setBudgetMin("");
      setBudgetMax("");
      setFollowUp("");
      setPreferredYachtId("");


      toast(
        "Yeni yat talebi CRM'e eklendi."
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


  async function saveLead() {

    if (!selected) {
      return;
    }


    setSaving(true);


    try {

      await updateYachtLead({
        leadId:
          selected.id,

        priority,

        preferredYachtId:
          preferredYachtId ||
          undefined,

        startDate:
          startDate ||
          undefined,

        endDate:
          endDate ||
          undefined,

        guestCount:
          Number(
            guestCount
          ) ||
          1,

        budgetMin:
          budgetMin
            ? Number(
                budgetMin
              )
            : undefined,

        budgetMax:
          budgetMax
            ? Number(
                budgetMax
              )
            : undefined,

        internalNote:
          internalNote ||
          undefined,

        nextFollowUpAt:
          followUp ||
          undefined,

        score:
          Number(
            score
          ) ||
          0,
      });


      await refresh(
        companyId
      );


      toast(
        "Lead dosyası güncellendi."
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


  async function changeStage(
    stage: string
  ) {

    if (!selected) {
      return;
    }


    try {

      await setYachtLeadStage(
        selected.id,
        stage
      );


      await refresh(
        companyId
      );


      setSelected({
        ...selected,
        stage,
      });


      toast(
        "Satış aşaması güncellendi."
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
    }
  }


  async function addActivity() {

    if (
      !selected ||
      !activityTitle.trim()
    ) {
      return;
    }


    setSaving(true);


    try {

      await addYachtLeadActivity({
        leadId:
          selected.id,

        activityType,

        title:
          activityTitle.trim(),

        note:
          activityNote ||
          undefined,

        nextFollowUpAt:
          followUp ||
          undefined,
      });


      await refresh(
        companyId
      );


      setActivityTitle("");
      setActivityNote("");


      toast(
        "Müşteri görüşmesi kaydedildi."
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


  async function linkQuote() {

    if (
      !selected ||
      !linkedQuote
    ) {
      return;
    }


    setSaving(true);


    try {

      await linkYachtLeadQuote(
        selected.id,
        linkedQuote
      );


      await refresh(
        companyId
      );


      toast(
        "Teklif CRM lead'ine bağlandı."
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
        <FaUsers className="animate-pulse text-4xl text-orange-400" />
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


        <section className="rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,.15),transparent_32%),radial-gradient(circle_at_70%_0%,rgba(59,130,246,.10),transparent_30%),linear-gradient(145deg,#07131f,#040b12)] p-6 lg:p-8">

          <Link
            href="/dashboard/yat-os"
            className="inline-flex items-center gap-2 text-[9px] font-black text-slate-500 hover:text-white"
          >
            <FaArrowLeft />
            YAT & TEKNE OS
          </Link>


          <div className="mt-5 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">

            <div>

              <span className="rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1.5 text-[8px] font-black uppercase tracking-[.2em] text-orange-300">
                CRM & LEAD CENTER
              </span>


              <h1 className="mt-4 text-3xl font-black tracking-[-.04em] lg:text-5xl">
                Yat CRM &{" "}
                <span className="text-orange-400">
                  Satış Pipeline
                </span>
              </h1>


              <p className="mt-3 max-w-3xl text-xs leading-5 text-slate-400">
                {companyName}
                {" · "}
                WhatsApp, telefon, Instagram, web ve partner taleplerini
                teklif ve rezervasyona kadar yönetin.
              </p>

            </div>


            <div className="flex flex-wrap gap-2">

              <Link
                href="/dashboard/yat-os/sales-center"
                className="flex h-12 items-center gap-2 rounded-xl border border-white/10 px-5 text-[9px] font-black"
              >
                <FaShip />
                Teklif Merkezi
              </Link>


              <button
                type="button"
                onClick={() =>
                  setCreateOpen(
                    true
                  )
                }
                className="flex h-12 items-center gap-2 rounded-xl bg-orange-500 px-5 text-[9px] font-black"
              >
                <FaPlus />
                Yeni Lead
              </button>

            </div>

          </div>

        </section>


        {error && (
          <div className="mt-4 flex items-center justify-between rounded-2xl border border-red-500/20 bg-red-500/[.06] p-4 text-xs font-bold text-red-200">
            {error}

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
            label="Açık Lead"
            value={String(
              openLeads.length
            )}
            detail="Aktif satış fırsatı"
          />

          <Kpi
            label="Geciken Takip"
            value={String(
              overdue.length
            )}
            detail="Takip tarihi geçmiş"
            danger={
              overdue.length >
              0
            }
          />

          <Kpi
            label="Pipeline Değeri"
            value={money(
              pipelineValue
            )}
            detail="Açık lead bütçeleri"
          />

          <Kpi
            label="Kazanılan"
            value={String(
              won.length
            )}
            detail="Satışa dönüşen lead"
            success
          />

          <Kpi
            label="Dönüşüm"
            value={`%${conversion.toFixed(
              1
            )}`}
            detail="Lead → satış"
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
                placeholder="Müşteri, telefon, e-posta veya tekne ara..."
                className="h-12 w-full rounded-xl border border-white/10 bg-white/[.025] pl-10 pr-4 text-xs outline-none"
              />

            </div>


            <div className="flex items-center gap-2">

              <FaFilter className="text-slate-600" />

              <select
                value={
                  stageFilter
                }
                onChange={(
                  event
                ) =>
                  setStageFilter(
                    event.target.value
                  )
                }
                className="h-12 rounded-xl border border-white/10 bg-[#0b1723] px-4 text-[9px] font-black"
              >

                <option value="all">
                  Tüm Pipeline
                </option>

                <option value="new">
                  Yeni
                </option>

                <option value="contacted">
                  İletişim
                </option>

                <option value="qualified">
                  Nitelikli
                </option>

                <option value="quote_sent">
                  Teklif
                </option>

                <option value="negotiation">
                  Pazarlık
                </option>

                <option value="won">
                  Kazanıldı
                </option>

                <option value="lost">
                  Kaybedildi
                </option>

              </select>

            </div>

          </div>


          <div className="overflow-x-auto">

            <table className="w-full min-w-[1800px] text-left">

              <thead className="sticky top-0 z-10 bg-[#0a1723]">

                <tr className="text-[8px] font-black uppercase tracking-[.1em] text-slate-600">

                  <th className="px-5 py-4">
                    Müşteri
                  </th>

                  <th className="px-5 py-4">
                    Kaynak
                  </th>

                  <th className="px-5 py-4">
                    Tekne
                  </th>

                  <th className="px-5 py-4">
                    Tarih
                  </th>

                  <th className="px-5 py-4">
                    Kişi
                  </th>

                  <th className="px-5 py-4">
                    Bütçe
                  </th>

                  <th className="px-5 py-4">
                    Öncelik
                  </th>

                  <th className="px-5 py-4">
                    Skor
                  </th>

                  <th className="px-5 py-4">
                    Takip
                  </th>

                  <th className="px-5 py-4">
                    Aşama
                  </th>

                  <th className="px-5 py-4">
                    Teklif
                  </th>

                  <th className="px-5 py-4">
                    Aksiyon
                  </th>

                </tr>

              </thead>


              <tbody>

                {filtered.map(
                  (
                    lead
                  ) => {

                    const yacht =
                      yachts.find(
                        (
                          item
                        ) =>
                          item.id ===
                          lead.preferred_yacht_id
                      );


                    const quote =
                      quotes.find(
                        (
                          item
                        ) =>
                          item.id ===
                          lead.converted_quote_id
                      );


                    const isOverdue =
                      lead.next_follow_up_at &&
                      ![
                        "won",
                        "lost",
                      ].includes(
                        lead.stage
                      ) &&
                      new Date(
                        lead.next_follow_up_at
                      ).getTime() <
                      now;


                    return (
                      <tr
                        key={
                          lead.id
                        }
                        className="border-t border-white/[.06] transition hover:bg-white/[.025]"
                      >

                        <td className="px-5 py-4">

                          <div className="text-[10px] font-black">
                            {
                              lead.customer_name
                            }
                          </div>

                          <div className="mt-1 text-[8px] text-slate-600">
                            {
                              lead.customer_phone ||
                              lead.customer_email ||
                              "—"
                            }
                          </div>

                        </td>


                        <td className="px-5 py-4 text-[8px] font-black">
                          {
                            lead.source
                          }
                        </td>


                        <td className="px-5 py-4 text-[9px] font-black">
                          {
                            yacht?.name ||
                            "Belirlenmedi"
                          }
                        </td>


                        <td className="px-5 py-4 text-[8px] text-slate-400">
                          {
                            lead.start_date ||
                            "—"
                          }
                          {" → "}
                          {
                            lead.end_date ||
                            "—"
                          }
                        </td>


                        <td className="px-5 py-4 text-[9px] font-black">
                          {
                            lead.guest_count
                          }
                        </td>


                        <td className="px-5 py-4">

                          <div className="text-[9px] font-black">
                            {money(
                              lead.budget_min,
                              lead.currency
                            )}
                          </div>

                          <div className="mt-1 text-[7px] text-slate-600">
                            max{" "}
                            {money(
                              lead.budget_max,
                              lead.currency
                            )}
                          </div>

                        </td>


                        <td className="px-5 py-4 text-[8px] font-black">
                          {
                            lead.priority
                          }
                        </td>


                        <td className="px-5 py-4">

                          <span className={`text-sm font-black ${
                            lead.score >=
                            75
                              ? "text-emerald-300"
                              : lead.score >=
                                50
                                ? "text-orange-300"
                                : "text-red-300"
                          }`}>
                            {
                              lead.score
                            }
                          </span>

                        </td>


                        <td className={`px-5 py-4 text-[8px] font-black ${
                          isOverdue
                            ? "text-red-300"
                            : "text-slate-400"
                        }`}>
                          {dateTime(
                            lead.next_follow_up_at
                          )}
                        </td>


                        <td className="px-5 py-4">

                          <span className={`rounded-full border px-2.5 py-1 text-[8px] font-black ${stageTone(
                            lead.stage
                          )}`}>
                            {stageLabel(
                              lead.stage
                            )}
                          </span>

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
                                {
                                  quote.status
                                }
                              </div>

                            </div>
                          ) : (
                            <span className="text-[8px] text-slate-600">
                              —
                            </span>
                          )}

                        </td>


                        <td className="px-5 py-4">

                          <button
                            type="button"
                            onClick={() =>
                              openLead(
                                lead
                              )
                            }
                            className="h-9 rounded-lg bg-orange-500 px-4 text-[8px] font-black"
                          >
                            Lead Dosyası
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


      {createOpen && (
        <div className="fixed inset-0 z-[150] overflow-y-auto bg-black/80 p-4 backdrop-blur-sm">

          <div className="mx-auto my-8 max-w-4xl rounded-[30px] border border-white/10 bg-[#07131f] p-6">

            <div className="flex items-center justify-between">

              <div>

                <div className="text-[8px] font-black uppercase tracking-[.2em] text-orange-400">
                  NEW SALES LEAD
                </div>

                <h2 className="mt-2 text-2xl font-black">
                  Yeni Yat Talebi
                </h2>

              </div>


              <button
                type="button"
                onClick={() =>
                  setCreateOpen(
                    false
                  )
                }
              >
                <FaTimes />
              </button>

            </div>


            <div className="mt-6 grid gap-3 md:grid-cols-2">

              <Field
                label="Müşteri"
                value={
                  customerName
                }
                onChange={
                  setCustomerName
                }
              />

              <Field
                label="Telefon"
                value={
                  customerPhone
                }
                onChange={
                  setCustomerPhone
                }
              />

              <Field
                label="E-posta"
                value={
                  customerEmail
                }
                onChange={
                  setCustomerEmail
                }
              />


              <label>

                <Label>
                  Kaynak
                </Label>

                <select
                  value={
                    source
                  }
                  onChange={(
                    event
                  ) =>
                    setSource(
                      event.target.value
                    )
                  }
                  className="h-11 w-full rounded-xl border border-white/10 bg-[#0b1723] px-3 text-[9px]"
                >
                  <option value="whatsapp">WhatsApp</option>
                  <option value="phone">Telefon</option>
                  <option value="instagram">Instagram</option>
                  <option value="website">Website</option>
                  <option value="google">Google</option>
                  <option value="referral">Referans</option>
                  <option value="partner">Partner</option>
                  <option value="walk_in">Ofis</option>
                  <option value="manual">Manuel</option>
                  <option value="other">Diğer</option>
                </select>

              </label>


              <label>

                <Label>
                  İlgilenilen Tekne
                </Label>

                <select
                  value={
                    preferredYachtId
                  }
                  onChange={(
                    event
                  ) =>
                    setPreferredYachtId(
                      event.target.value
                    )
                  }
                  className="h-11 w-full rounded-xl border border-white/10 bg-[#0b1723] px-3 text-[9px]"
                >

                  <option value="">
                    Belirlenmedi
                  </option>

                  {yachts.map(
                    (
                      yacht
                    ) => (
                      <option
                        key={
                          yacht.id
                        }
                        value={
                          yacht.id
                        }
                      >
                        {yacht.name}
                      </option>
                    )
                  )}

                </select>

              </label>


              <Field
                label="Başlangıç"
                type="date"
                value={
                  startDate
                }
                onChange={
                  setStartDate
                }
              />

              <Field
                label="Bitiş"
                type="date"
                value={
                  endDate
                }
                onChange={
                  setEndDate
                }
              />

              <Field
                label="Kişi"
                type="number"
                value={
                  guestCount
                }
                onChange={
                  setGuestCount
                }
              />

              <Field
                label="Min. Bütçe"
                type="number"
                value={
                  budgetMin
                }
                onChange={
                  setBudgetMin
                }
              />

              <Field
                label="Max. Bütçe"
                type="number"
                value={
                  budgetMax
                }
                onChange={
                  setBudgetMax
                }
              />

              <Field
                label="Takip Tarihi"
                type="datetime-local"
                value={
                  followUp
                }
                onChange={
                  setFollowUp
                }
              />

            </div>


            <textarea
              value={
                requestNote
              }
              onChange={(
                event
              ) =>
                setRequestNote(
                  event.target.value
                )
              }
              placeholder="Müşteri talebi, özel istekler, rota, kutlama vb..."
              className="mt-3 min-h-24 w-full resize-none rounded-xl border border-white/10 bg-black/10 p-4 text-xs outline-none"
            />


            <button
              type="button"
              disabled={
                saving
              }
              onClick={() =>
                void createLead()
              }
              className="mt-4 h-12 w-full rounded-xl bg-orange-500 text-[9px] font-black"
            >
              Lead Oluştur
            </button>

          </div>

        </div>
      )}


      {selected && (
        <div className="fixed inset-0 z-[150] overflow-y-auto bg-black/80 p-4 backdrop-blur-sm">

          <div className="mx-auto my-5 max-w-6xl overflow-hidden rounded-[30px] border border-white/10 bg-[#07131f] shadow-2xl">


            <div className="flex items-start justify-between border-b border-white/10 p-6">

              <div>

                <div className="text-[8px] font-black uppercase tracking-[.2em] text-orange-400">
                  CRM LEAD FILE
                </div>

                <div className="mt-2 text-2xl font-black">
                  {
                    selected.customer_name
                  }
                </div>

                <div className="mt-2 flex flex-wrap gap-2">

                  <span className={`rounded-full border px-3 py-1 text-[8px] font-black ${stageTone(
                    selected.stage
                  )}`}>
                    {stageLabel(
                      selected.stage
                    )}
                  </span>

                  <span className="rounded-full border border-white/10 px-3 py-1 text-[8px] font-black text-slate-400">
                    SKOR {selected.score}/100
                  </span>

                </div>

              </div>


              <button
                type="button"
                onClick={() =>
                  setSelected(
                    null
                  )
                }
                className="grid h-10 w-10 place-items-center rounded-xl border border-white/10"
              >
                <FaTimes />
              </button>

            </div>


            <div className="grid gap-5 p-6 xl:grid-cols-[1fr_.9fr]">


              <div className="space-y-5">


                <section className="rounded-[24px] border border-white/10 bg-white/[.02] p-5">

                  <div className="text-sm font-black">
                    Satış Dosyası
                  </div>


                  <div className="mt-4 grid gap-3 md:grid-cols-2">

                    <label>

                      <Label>
                        Tekne
                      </Label>

                      <select
                        value={
                          preferredYachtId
                        }
                        onChange={(
                          event
                        ) =>
                          setPreferredYachtId(
                            event.target.value
                          )
                        }
                        className="h-11 w-full rounded-xl border border-white/10 bg-[#0b1723] px-3 text-[9px]"
                      >

                        <option value="">
                          Belirlenmedi
                        </option>

                        {yachts.map(
                          (
                            yacht
                          ) => (
                            <option
                              key={
                                yacht.id
                              }
                              value={
                                yacht.id
                              }
                            >
                              {yacht.name}
                            </option>
                          )
                        )}

                      </select>

                    </label>


                    <Field
                      label="Skor"
                      type="number"
                      value={
                        score
                      }
                      onChange={
                        setScore
                      }
                    />

                    <Field
                      label="Başlangıç"
                      type="date"
                      value={
                        startDate
                      }
                      onChange={
                        setStartDate
                      }
                    />

                    <Field
                      label="Bitiş"
                      type="date"
                      value={
                        endDate
                      }
                      onChange={
                        setEndDate
                      }
                    />

                    <Field
                      label="Kişi"
                      type="number"
                      value={
                        guestCount
                      }
                      onChange={
                        setGuestCount
                      }
                    />

                    <Field
                      label="Takip Tarihi"
                      type="datetime-local"
                      value={
                        followUp
                      }
                      onChange={
                        setFollowUp
                      }
                    />

                    <Field
                      label="Min. Bütçe"
                      type="number"
                      value={
                        budgetMin
                      }
                      onChange={
                        setBudgetMin
                      }
                    />

                    <Field
                      label="Max. Bütçe"
                      type="number"
                      value={
                        budgetMax
                      }
                      onChange={
                        setBudgetMax
                      }
                    />

                  </div>


                  <textarea
                    value={
                      internalNote
                    }
                    onChange={(
                      event
                    ) =>
                      setInternalNote(
                        event.target.value
                      )
                    }
                    placeholder="İç satış notu..."
                    className="mt-3 min-h-20 w-full resize-none rounded-xl border border-white/10 bg-black/10 p-4 text-xs outline-none"
                  />


                  <button
                    type="button"
                    disabled={
                      saving
                    }
                    onClick={() =>
                      void saveLead()
                    }
                    className="mt-3 h-11 rounded-xl bg-orange-500 px-5 text-[8px] font-black"
                  >
                    Dosyayı Kaydet
                  </button>

                </section>


                <section className="rounded-[24px] border border-white/10 bg-white/[.02] p-5">

                  <div className="text-sm font-black">
                    Pipeline Aşaması
                  </div>


                  <div className="mt-4 flex flex-wrap gap-2">

                    {[
                      ["new", "Yeni"],
                      ["contacted", "İletişim"],
                      ["qualified", "Nitelikli"],
                      ["quote_sent", "Teklif"],
                      ["negotiation", "Pazarlık"],
                      ["won", "Kazanıldı"],
                      ["lost", "Kaybedildi"],
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
                            void changeStage(
                              item[0]
                            )
                          }
                          className={`rounded-xl px-4 py-2 text-[8px] font-black ${
                            selected.stage ===
                            item[0]
                              ? "bg-orange-500"
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

                </section>


                <section className="rounded-[24px] border border-white/10 bg-white/[.02] p-5">

                  <div className="text-sm font-black">
                    Görüşme Kaydı
                  </div>


                  <div className="mt-4 grid gap-3 md:grid-cols-2">

                    <label>

                      <Label>
                        Kanal
                      </Label>

                      <select
                        value={
                          activityType
                        }
                        onChange={(
                          event
                        ) =>
                          setActivityType(
                            event.target.value
                          )
                        }
                        className="h-11 w-full rounded-xl border border-white/10 bg-[#0b1723] px-3 text-[9px]"
                      >

                        <option value="whatsapp">
                          WhatsApp
                        </option>

                        <option value="call">
                          Telefon
                        </option>

                        <option value="email">
                          E-posta
                        </option>

                        <option value="meeting">
                          Görüşme
                        </option>

                        <option value="note">
                          Not
                        </option>

                        <option value="follow_up">
                          Takip
                        </option>

                      </select>

                    </label>


                    <Field
                      label="Başlık"
                      value={
                        activityTitle
                      }
                      onChange={
                        setActivityTitle
                      }
                    />

                  </div>


                  <textarea
                    value={
                      activityNote
                    }
                    onChange={(
                      event
                    ) =>
                      setActivityNote(
                        event.target.value
                      )
                    }
                    placeholder="Görüşme özeti..."
                    className="mt-3 min-h-20 w-full resize-none rounded-xl border border-white/10 bg-black/10 p-4 text-xs"
                  />


                  <button
                    type="button"
                    disabled={
                      saving
                    }
                    onClick={() =>
                      void addActivity()
                    }
                    className="mt-3 h-10 rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 text-[8px] font-black text-blue-300"
                  >
                    Görüşmeyi Kaydet
                  </button>

                </section>

              </div>


              <div className="space-y-5">


                <section className="rounded-[24px] border border-white/10 bg-white/[.02] p-5">

                  <div className="text-sm font-black">
                    Hızlı İletişim
                  </div>


                  <div className="mt-4 grid grid-cols-2 gap-2">

                    {selected.customer_phone && (
                      <a
                        href={`tel:${selected.customer_phone}`}
                        className="flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 text-[8px] font-black"
                      >
                        <FaPhone />
                        Ara
                      </a>
                    )}


                    {selected.customer_phone && (
                      <a
                        href={`https://wa.me/${selected.customer_phone.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-500 text-[8px] font-black"
                      >
                        <FaWhatsapp />
                        WhatsApp
                      </a>
                    )}

                  </div>

                </section>


                <section className="rounded-[24px] border border-blue-500/15 bg-blue-500/[.025] p-5">

                  <div className="text-sm font-black">
                    Teklif Bağlantısı
                  </div>


                  <div className="mt-1 text-[8px] leading-4 text-slate-500">
                    Satış Merkezi'nde hazırlanan gerçek teklifi bu lead ile ilişkilendir.
                  </div>


                  <select
                    value={
                      linkedQuote
                    }
                    onChange={(
                      event
                    ) =>
                      setLinkedQuote(
                        event.target.value
                      )
                    }
                    className="mt-4 h-11 w-full rounded-xl border border-white/10 bg-[#0b1723] px-3 text-[9px]"
                  >

                    <option value="">
                      Teklif seç
                    </option>

                    {quotes.map(
                      (
                        quote
                      ) => (
                        <option
                          key={
                            quote.id
                          }
                          value={
                            quote.id
                          }
                        >
                          {quote.quote_code}
                          {" · "}
                          {quote.customer_name}
                          {" · "}
                          {money(
                            quote.sale_price,
                            quote.currency
                          )}
                        </option>
                      )
                    )}

                  </select>


                  <div className="mt-3 grid grid-cols-2 gap-2">

                    <Link
                      href="/dashboard/yat-os/sales-center"
                      className="flex h-10 items-center justify-center rounded-xl border border-blue-500/20 text-[8px] font-black text-blue-300"
                    >
                      Teklif Merkezi
                    </Link>


                    <button
                      type="button"
                      disabled={
                        !linkedQuote ||
                        saving
                      }
                      onClick={() =>
                        void linkQuote()
                      }
                      className="h-10 rounded-xl bg-blue-500 text-[8px] font-black disabled:opacity-40"
                    >
                      Teklife Bağla
                    </button>

                  </div>

                </section>


                <section className="rounded-[24px] border border-white/10 bg-white/[.02] p-5">

                  <div className="text-sm font-black">
                    CRM Timeline
                  </div>


                  <div className="mt-4 space-y-2">

                    {selectedActivities.map(
                      (
                        activity
                      ) => (
                        <div
                          key={
                            activity.id
                          }
                          className="rounded-xl border border-white/[.07] bg-black/10 p-4"
                        >

                          <div className="flex items-center justify-between gap-3">

                            <div className="text-[9px] font-black">
                              {
                                activity.title
                              }
                            </div>

                            <div className="text-[7px] text-slate-600">
                              {dateTime(
                                activity.created_at
                              )}
                            </div>

                          </div>


                          <div className="mt-1 text-[7px] font-black uppercase text-orange-400">
                            {
                              activity.activity_type
                            }
                          </div>


                          {activity.note && (
                            <div className="mt-2 text-[8px] leading-4 text-slate-400">
                              {
                                activity.note
                              }
                            </div>
                          )}

                        </div>
                      )
                    )}

                  </div>

                </section>

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


function Label({
  children,
}: {
  children:
    React.ReactNode;
}) {

  return (
    <span className="mb-1 block text-[8px] font-black uppercase text-slate-500">
      {children}
    </span>
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

      <Label>
        {label}
      </Label>

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
