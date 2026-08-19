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
  FaBullseye,
  FaCheckCircle,
  FaFilter,
  FaSearch,
  FaTimes,
  FaUserTie,
  FaUsers,
} from "react-icons/fa";

import {
  getCurrentMembership,
  getCurrentUser,
} from "@/lib/current-user";

import {
  assignYachtLead,
  loadYachtSalesTeamCenter,
  setYachtSalesTarget,
} from "@/lib/yacht-os/sales-team";


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


function pct(
  current: number,
  target: number
) {

  if (!target) {
    return 0;
  }


  return Math.min(
    999,
    (
      current /
      target
    ) *
      100
  );
}


export default function YachtSalesTeamPage() {

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
    currentRole,
    setCurrentRole,
  ] =
    useState("");

  const [
    members,
    setMembers,
  ] =
    useState<any[]>(
      []
    );

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
    targets,
    setTargets,
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
    selectedUser,
    setSelectedUser,
  ] =
    useState<any | null>(
      null
    );

  const [
    leadTarget,
    setLeadTarget,
  ] =
    useState("0");

  const [
    quoteTarget,
    setQuoteTarget,
  ] =
    useState("0");

  const [
    bookingTarget,
    setBookingTarget,
  ] =
    useState("0");

  const [
    revenueTarget,
    setRevenueTarget,
  ] =
    useState("0");

  const [
    profitTarget,
    setProfitTarget,
  ] =
    useState("0");

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


  const managers =
    [
      "super_admin",
      "company_owner",
      "operation_manager",
    ];


  const canManage =
    managers.includes(
      currentRole
    );


  const refresh =
    useCallback(
      async (
        activeCompany:
          string
      ) => {

        const data =
          await loadYachtSalesTeamCenter(
            activeCompany
          );


        setMembers(
          data.members
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

        setTargets(
          data.targets
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

          setCurrentRole(
            membership.role
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


  const monthStart =
    new Date()
      .toISOString()
      .slice(
        0,
        7
      ) +
    "-01";


  const thisMonth =
    new Date()
      .toISOString()
      .slice(
        0,
        7
      );


  function inMonth(
    value: string
  ) {

    return (
      value?.slice(
        0,
        7
      ) ===
      thisMonth
    );
  }


  function stats(
    userId: string
  ) {

    const owned =
      leads.filter(
        (
          item
        ) =>
          item.assigned_to ===
          userId &&
          inMonth(
            item.created_at
          )
      );


    const leadIds =
      new Set(
        owned.map(
          (
            item
          ) =>
            item.id
        )
      );


    const ownedQuotes =
      quotes.filter(
        (
          item
        ) =>
          item.lead_id &&
          leadIds.has(
            item.lead_id
          ) &&
          inMonth(
            item.created_at
          )
      );


    const bookingIds =
      new Set(
        owned
          .map(
            (
              item
            ) =>
              item.converted_booking_id
          )
          .filter(
            Boolean
          )
      );


    const ownedBookings =
      bookings.filter(
        (
          item
        ) =>
          bookingIds.has(
            item.id
          ) &&
          item.status !==
            "cancelled"
      );


    const revenue =
      ownedBookings.reduce(
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


    const profit =
      ownedBookings.reduce(
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


    const won =
      owned.filter(
        (
          item
        ) =>
          item.stage ===
          "won"
      ).length;


    return {
      leads:
        owned.length,

      quotes:
        ownedQuotes.length,

      bookings:
        ownedBookings.length,

      revenue,
      profit,
      won,

      conversion:
        owned.length
          ? (
              won /
              owned.length
            ) *
            100
          : 0,
    };
  }


  const rows =
    useMemo(
      () => {

        const needle =
          query
            .trim()
            .toLocaleLowerCase(
              "tr"
            );


        return members.filter(
          (
            member
          ) =>
            !needle ||
            `${member.full_name || ""} ${member.role}`
              .toLocaleLowerCase(
                "tr"
              )
              .includes(
                needle
              )
        );

      },
      [
        members,
        query,
      ]
    );


  const unassigned =
    leads.filter(
      (
        item
      ) =>
        !item.assigned_to &&
        ![
          "won",
          "lost",
        ].includes(
          item.stage
        )
    );


  function openTarget(
    member: any
  ) {

    setSelectedUser(
      member
    );


    const target =
      targets.find(
        (
          item
        ) =>
          item.user_id ===
          member.user_id
      );


    setLeadTarget(
      String(
        target?.lead_target ??
        0
      )
    );

    setQuoteTarget(
      String(
        target?.quote_target ??
        0
      )
    );

    setBookingTarget(
      String(
        target?.booking_target ??
        0
      )
    );

    setRevenueTarget(
      String(
        target?.revenue_target ??
        0
      )
    );

    setProfitTarget(
      String(
        target?.gross_profit_target ??
        0
      )
    );
  }


  async function saveTarget() {

    if (
      !selectedUser ||
      !canManage
    ) {
      return;
    }


    setSaving(
      true
    );


    try {

      await setYachtSalesTarget({
        companyId,

        userId:
          selectedUser.user_id,

        periodMonth:
          monthStart,

        leadTarget:
          Number(
            leadTarget
          ) ||
          0,

        quoteTarget:
          Number(
            quoteTarget
          ) ||
          0,

        bookingTarget:
          Number(
            bookingTarget
          ) ||
          0,

        revenueTarget:
          Number(
            revenueTarget
          ) ||
          0,

        grossProfitTarget:
          Number(
            profitTarget
          ) ||
          0,
      });


      await refresh(
        companyId
      );


      setSelectedUser(
        null
      );


      toast(
        "Aylık satış hedefleri kaydedildi."
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


  async function assign(
    leadId: string,
    userId: string
  ) {

    if (!canManage) {
      return;
    }


    try {

      await assignYachtLead(
        leadId,
        userId ||
          null
      );


      await refresh(
        companyId
      );


      toast(
        "Lead satış personeline atandı."
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


  const totalRevenue =
    members.reduce(
      (
        total,
        member
      ) =>
        total +
        stats(
          member.user_id
        ).revenue,
      0
    );


  const totalBookings =
    members.reduce(
      (
        total,
        member
      ) =>
        total +
        stats(
          member.user_id
        ).bookings,
      0
    );


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


        <section className="rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,.14),transparent_32%),radial-gradient(circle_at_65%_0%,rgba(249,115,22,.10),transparent_30%),linear-gradient(145deg,#07131f,#040b12)] p-6 lg:p-8">

          <Link
            href="/dashboard/yat-os/sales-performance"
            className="inline-flex items-center gap-2 text-[9px] font-black text-slate-500 hover:text-white"
          >
            <FaArrowLeft />
            SATIŞ PERFORMANS MERKEZİ
          </Link>


          <div className="mt-5">

            <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-[8px] font-black uppercase tracking-[.2em] text-blue-300">
              SALES TEAM & TARGETS
            </span>


            <h1 className="mt-4 text-3xl font-black tracking-[-.04em] lg:text-5xl">
              Satış Ekibi &{" "}
              <span className="text-blue-300">
                Hedef Merkezi
              </span>
            </h1>


            <p className="mt-3 max-w-4xl text-xs leading-5 text-slate-400">
              {companyName}
              {" · "}
              Lead sahipliği, aylık hedefler, ciro, brüt kâr ve
              personel bazlı satış performansı.
            </p>

          </div>

        </section>


        {error && (
          <div className="mt-4 flex items-center justify-between rounded-2xl border border-red-500/20 bg-red-500/[.06] p-4 text-xs font-bold text-red-200">

            {error}

            <button
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
            label="Satış Ekibi"
            value={String(
              members.length
            )}
            detail="Aktif yetkili personel"
          />

          <Kpi
            label="Atanmamış Lead"
            value={String(
              unassigned.length
            )}
            detail="Sorumlu bekleyen"
            danger={
              unassigned.length >
              0
            }
          />

          <Kpi
            label="Bu Ay Rezervasyon"
            value={String(
              totalBookings
            )}
            detail="Ekip toplamı"
            success
          />

          <Kpi
            label="Bu Ay Ciro"
            value={money(
              totalRevenue
            )}
            detail="Ekip toplamı"
            success
          />

          <Kpi
            label="Yönetim Yetkisi"
            value={
              canManage
                ? "AKTİF"
                : "GÖRÜNTÜLE"
            }
            detail={
              canManage
                ? "Atama ve hedef düzenleme"
                : "Salt okunur görünüm"
            }
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
                placeholder="Satış personeli ara..."
                className="h-12 w-full rounded-xl border border-white/10 bg-white/[.025] pl-10 pr-4 text-xs outline-none"
              />

            </div>

            <FaFilter className="text-slate-600" />

          </div>


          <div className="overflow-x-auto">

            <table className="w-full min-w-[1750px] text-left">

              <thead className="sticky top-0 z-10 bg-[#0a1723]">

                <tr className="text-[8px] font-black uppercase tracking-[.1em] text-slate-600">

                  <th className="px-5 py-4">Personel</th>
                  <th className="px-5 py-4">Lead</th>
                  <th className="px-5 py-4">Teklif</th>
                  <th className="px-5 py-4">Rezervasyon</th>
                  <th className="px-5 py-4">Dönüşüm</th>
                  <th className="px-5 py-4">Ciro</th>
                  <th className="px-5 py-4">Brüt Kâr</th>
                  <th className="px-5 py-4">Lead Hedefi</th>
                  <th className="px-5 py-4">Rez. Hedefi</th>
                  <th className="px-5 py-4">Ciro Hedefi</th>
                  <th className="px-5 py-4">Aksiyon</th>

                </tr>

              </thead>


              <tbody>

                {rows.map(
                  (
                    member
                  ) => {

                    const s =
                      stats(
                        member.user_id
                      );


                    const target =
                      targets.find(
                        (
                          item
                        ) =>
                          item.user_id ===
                          member.user_id
                      );


                    return (
                      <tr
                        key={
                          member.id
                        }
                        className="border-t border-white/[.06] transition hover:bg-white/[.025]"
                      >

                        <td className="px-5 py-4">

                          <div className="flex items-center gap-3">

                            <div className="grid h-9 w-9 place-items-center rounded-xl bg-blue-500/10 text-blue-300">
                              <FaUserTie />
                            </div>

                            <div>

                              <div className="text-[10px] font-black">
                                {
                                  member.full_name ||
                                  "İsimsiz Kullanıcı"
                                }
                              </div>

                              <div className="mt-1 text-[7px] text-slate-600">
                                {
                                  member.role
                                }
                              </div>

                            </div>

                          </div>

                        </td>


                        <td className="px-5 py-4 text-[10px] font-black">
                          {s.leads}
                        </td>


                        <td className="px-5 py-4 text-[10px] font-black">
                          {s.quotes}
                        </td>


                        <td className="px-5 py-4 text-[10px] font-black text-emerald-300">
                          {s.bookings}
                        </td>


                        <td className="px-5 py-4 text-[10px] font-black text-blue-300">
                          %{s.conversion.toFixed(
                            1
                          )}
                        </td>


                        <td className="px-5 py-4 text-[10px] font-black">
                          {money(
                            s.revenue
                          )}
                        </td>


                        <td className="px-5 py-4 text-[10px] font-black text-emerald-300">
                          {money(
                            s.profit
                          )}
                        </td>


                        <td className="px-5 py-4">

                          <Progress
                            current={
                              s.leads
                            }
                            target={
                              Number(
                                target?.lead_target ||
                                0
                              )
                            }
                          />

                        </td>


                        <td className="px-5 py-4">

                          <Progress
                            current={
                              s.bookings
                            }
                            target={
                              Number(
                                target?.booking_target ||
                                0
                              )
                            }
                          />

                        </td>


                        <td className="px-5 py-4">

                          <div className="text-[9px] font-black">
                            {money(
                              Number(
                                target?.revenue_target ||
                                0
                              )
                            )}
                          </div>

                          <div className="mt-1 text-[7px] text-slate-600">
                            %{pct(
                              s.revenue,
                              Number(
                                target?.revenue_target ||
                                0
                              )
                            ).toFixed(
                              0
                            )}
                          </div>

                        </td>


                        <td className="px-5 py-4">

                          {canManage ? (
                            <button
                              type="button"
                              onClick={() =>
                                openTarget(
                                  member
                                )
                              }
                              className="h-9 rounded-lg bg-blue-500 px-4 text-[8px] font-black"
                            >
                              Hedef Düzenle
                            </button>
                          ) : (
                            <span className="text-[8px] text-slate-600">
                              Görüntüleme
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


        {canManage && (
          <section className="mt-5 rounded-[28px] border border-orange-500/15 bg-[#07131f] p-5">

            <div className="flex items-center gap-2">

              <FaBullseye className="text-orange-400" />

              <div>

                <div className="text-sm font-black">
                  Atanmamış Lead Havuzu
                </div>

                <div className="mt-1 text-[8px] text-slate-500">
                  Yeni talepleri satış personeline dağıt.
                </div>

              </div>

            </div>


            <div className="mt-4 grid gap-3 xl:grid-cols-3">

              {unassigned.slice(
                0,
                30
              ).map(
                (
                  lead
                ) => (
                  <div
                    key={
                      lead.id
                    }
                    className="rounded-xl border border-white/[.07] bg-black/10 p-4"
                  >

                    <div className="flex items-start justify-between gap-3">

                      <div>

                        <div className="text-[9px] font-black">
                          {
                            lead.customer_name
                          }
                        </div>

                        <div className="mt-1 text-[7px] text-slate-600">
                          {lead.source}
                          {" · "}
                          Skor {lead.score}
                        </div>

                      </div>

                      <div className="text-[9px] font-black text-orange-300">
                        {money(
                          Number(
                            lead.budget_max ||
                            lead.budget_min ||
                            0
                          ),
                          lead.currency
                        )}
                      </div>

                    </div>


                    <select
                      defaultValue=""
                      onChange={(
                        event
                      ) => {

                        if (
                          event.target.value
                        ) {
                          void assign(
                            lead.id,
                            event.target.value
                          );
                        }
                      }}
                      className="mt-3 h-10 w-full rounded-xl border border-white/10 bg-[#0b1723] px-3 text-[8px]"
                    >

                      <option value="">
                        Satış personeli ata
                      </option>

                      {members.map(
                        (
                          member
                        ) => (
                          <option
                            key={
                              member.user_id
                            }
                            value={
                              member.user_id
                            }
                          >
                            {
                              member.full_name ||
                              member.role
                            }
                          </option>
                        )
                      )}

                    </select>

                  </div>
                )
              )}

            </div>

          </section>
        )}

      </div>


      {selectedUser && (
        <div className="fixed inset-0 z-[150] grid place-items-center bg-black/80 p-4 backdrop-blur-sm">

          <div className="w-full max-w-3xl rounded-[30px] border border-white/10 bg-[#07131f] p-6">

            <div className="flex items-start justify-between">

              <div>

                <div className="text-[8px] font-black uppercase tracking-[.2em] text-blue-300">
                  MONTHLY SALES TARGET
                </div>

                <div className="mt-2 text-2xl font-black">
                  {
                    selectedUser.full_name ||
                    "Satış Personeli"
                  }
                </div>

              </div>


              <button
                onClick={() =>
                  setSelectedUser(
                    null
                  )
                }
              >
                <FaTimes />
              </button>

            </div>


            <div className="mt-6 grid gap-3 md:grid-cols-2">

              <Field
                label="Lead Hedefi"
                value={
                  leadTarget
                }
                onChange={
                  setLeadTarget
                }
              />

              <Field
                label="Teklif Hedefi"
                value={
                  quoteTarget
                }
                onChange={
                  setQuoteTarget
                }
              />

              <Field
                label="Rezervasyon Hedefi"
                value={
                  bookingTarget
                }
                onChange={
                  setBookingTarget
                }
              />

              <Field
                label="Ciro Hedefi"
                value={
                  revenueTarget
                }
                onChange={
                  setRevenueTarget
                }
              />

              <Field
                label="Brüt Kâr Hedefi"
                value={
                  profitTarget
                }
                onChange={
                  setProfitTarget
                }
              />

            </div>


            <button
              type="button"
              disabled={
                saving
              }
              onClick={() =>
                void saveTarget()
              }
              className="mt-5 h-12 w-full rounded-xl bg-blue-500 text-[9px] font-black"
            >
              Aylık Hedefleri Kaydet
            </button>

          </div>

        </div>
      )}

    </main>
  );
}


function Progress({
  current,
  target,
}: {
  current: number;
  target: number;
}) {

  const progress =
    pct(
      current,
      target
    );


  return (
    <div className="w-32">

      <div className="flex justify-between text-[7px] font-black">
        <span>
          {current}
        </span>

        <span className="text-slate-600">
          / {target}
        </span>
      </div>


      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[.06]">

        <div
          className="h-full rounded-full bg-blue-500"
          style={{
            width:
              `${Math.min(
                progress,
                100
              )}%`,
          }}
        />

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


function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange:
    (
      value: string
    ) => void;
}) {

  return (
    <label>

      <span className="mb-1 block text-[8px] font-black uppercase text-slate-500">
        {label}
      </span>

      <input
        type="number"
        min="0"
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
