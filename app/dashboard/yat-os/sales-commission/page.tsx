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
  FaCalculator,
  FaCheck,
  FaCheckCircle,
  FaCoins,
  FaFilter,
  FaMoneyBillWave,
  FaPlus,
  FaSearch,
  FaTimes,
  FaUserTie,
  FaWallet,
} from "react-icons/fa";

import {
  getCurrentMembership,
  getCurrentUser,
} from "@/lib/current-user";

import {
  approveYachtSalesCommission,
  calculateYachtSalesCommissions,
  loadYachtSalesCommissionCenter,
  payYachtSalesCommission,
  setYachtSalesCommissionRule,
} from "@/lib/yacht-os/sales-commission";


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


function statusTone(
  status: string
) {

  if (
    status ===
    "paid"
  ) {
    return "bg-emerald-500/10 text-emerald-300";
  }


  if (
    status ===
    "approved"
  ) {
    return "bg-blue-500/10 text-blue-300";
  }


  if (
    status ===
    "cancelled"
  ) {
    return "bg-red-500/10 text-red-300";
  }


  return "bg-orange-500/10 text-orange-300";
}


export default function YachtSalesCommissionPage() {

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
    rules,
    setRules,
  ] =
    useState<any[]>(
      []
    );

  const [
    earnings,
    setEarnings,
  ] =
    useState<any[]>(
      []
    );

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
    statusFilter,
    setStatusFilter,
  ] =
    useState(
      "all"
    );

  const [
    ruleOpen,
    setRuleOpen,
  ] =
    useState(false);

  const [
    ruleName,
    setRuleName,
  ] =
    useState(
      "Standart Satış Primi"
    );

  const [
    ruleUser,
    setRuleUser,
  ] =
    useState("");

  const [
    basis,
    setBasis,
  ] =
    useState<
      "revenue" |
      "gross_profit"
    >(
      "gross_profit"
    );

  const [
    rate,
    setRate,
  ] =
    useState("10");

  const [
    collectionThreshold,
    setCollectionThreshold,
  ] =
    useState("100");

  const [
    appliesFrom,
    setAppliesFrom,
  ] =
    useState(
      new Date()
        .toISOString()
        .slice(
          0,
          10
        )
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


  const salesManagers =
    [
      "super_admin",
      "company_owner",
      "operation_manager",
    ];


  const financeManagers =
    [
      "super_admin",
      "company_owner",
      "accounting",
    ];


  const canManageSales =
    salesManagers.includes(
      currentRole
    );


  const canPay =
    financeManagers.includes(
      currentRole
    );


  const refresh =
    useCallback(
      async (
        activeCompany:
          string
      ) => {

        const data =
          await loadYachtSalesCommissionCenter(
            activeCompany
          );


        setRules(
          data.rules
        );

        setEarnings(
          data.earnings
        );

        setMembers(
          data.members
        );

        setLeads(
          data.leads
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
      2300
    );
  }


  async function calculate() {

    setSaving(
      true
    );

    setError("");


    try {

      const result:
        any =
          await calculateYachtSalesCommissions(
            companyId
          );


      await refresh(
        companyId
      );


      toast(
        `${Number(
          result?.created ||
          0
        )} yeni hakediş oluşturuldu.`
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


  async function createRule() {

    if (
      !ruleName.trim()
    ) {
      return;
    }


    setSaving(
      true
    );


    try {

      await setYachtSalesCommissionRule({
        companyId,

        userId:
          ruleUser ||
          undefined,

        name:
          ruleName.trim(),

        calculationBasis:
          basis,

        ratePercent:
          Number(
            rate
          ) ||
          0,

        minimumCollectionPercent:
          Number(
            collectionThreshold
          ) ||
          0,

        appliesFrom,

        status:
          "active",
      });


      await refresh(
        companyId
      );


      setRuleOpen(
        false
      );


      toast(
        "Prim kuralı kaydedildi."
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


  async function approve(
    id: string
  ) {

    setSaving(
      true
    );


    try {

      await approveYachtSalesCommission(
        id
      );


      await refresh(
        companyId
      );


      toast(
        "Hakediş yönetici tarafından onaylandı."
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


  async function pay(
    id: string
  ) {

    setSaving(
      true
    );


    try {

      await payYachtSalesCommission(
        id
      );


      await refresh(
        companyId
      );


      toast(
        "Prim ödendi ve finans gideri oluşturuldu."
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
    earnings.filter(
      (
        item
      ) =>
        item.status ===
        "pending"
    );


  const approved =
    earnings.filter(
      (
        item
      ) =>
        item.status ===
        "approved"
    );


  const paid =
    earnings.filter(
      (
        item
      ) =>
        item.status ===
        "paid"
    );


  const pendingAmount =
    pending.reduce(
      (
        total,
        item
      ) =>
        total +
        Number(
          item.commission_amount ||
          0
        ),
      0
    );


  const approvedAmount =
    approved.reduce(
      (
        total,
        item
      ) =>
        total +
        Number(
          item.commission_amount ||
          0
        ),
      0
    );


  const paidAmount =
    paid.reduce(
      (
        total,
        item
      ) =>
        total +
        Number(
          item.commission_amount ||
          0
        ),
      0
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


        return earnings.filter(
          (
            earning
          ) => {

            const member =
              members.find(
                (
                  item
                ) =>
                  item.user_id ===
                  earning.user_id
              );


            const lead =
              leads.find(
                (
                  item
                ) =>
                  item.id ===
                  earning.lead_id
              );


            const booking =
              bookings.find(
                (
                  item
                ) =>
                  item.id ===
                  earning.booking_id
              );


            const text =
              `${member?.full_name || ""} ${lead?.customer_name || ""} ${booking?.booking_code || ""}`
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
              earning.status ===
                statusFilter;


            return (
              searchOk &&
              statusOk
            );
          }
        );

      },
      [
        earnings,
        members,
        leads,
        bookings,
        query,
        statusFilter,
      ]
    );


  if (loading) {

    return (
      <main className="grid min-h-[70vh] place-items-center bg-[#030a11] text-white">
        <FaCoins className="animate-pulse text-4xl text-orange-400" />
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


        <section className="rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,.13),transparent_32%),radial-gradient(circle_at_65%_0%,rgba(249,115,22,.10),transparent_30%),linear-gradient(145deg,#07131f,#040b12)] p-6 lg:p-8">

          <Link
            href="/dashboard/yat-os/sales-team"
            className="inline-flex items-center gap-2 text-[9px] font-black text-slate-500 hover:text-white"
          >
            <FaArrowLeft />
            SATIŞ EKİBİ & HEDEFLER
          </Link>


          <div className="mt-5 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">

            <div>

              <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[8px] font-black uppercase tracking-[.2em] text-emerald-300">
                COMMISSION ENGINE
              </span>


              <h1 className="mt-4 text-3xl font-black tracking-[-.04em] lg:text-5xl">
                Prim &{" "}
                <span className="text-emerald-300">
                  Komisyon Merkezi
                </span>
              </h1>


              <p className="mt-3 max-w-4xl text-xs leading-5 text-slate-400">
                {companyName}
                {" · "}
                Tahsilat gerçekleşmeden personel hakedişi oluşmaz.
                Yönetici onayı ve finans ödeme adımı ayrıdır.
              </p>

            </div>


            <div className="flex flex-wrap gap-2">

              {canManageSales && (
                <button
                  type="button"
                  onClick={() =>
                    setRuleOpen(
                      true
                    )
                  }
                  className="flex h-12 items-center gap-2 rounded-xl border border-white/10 px-5 text-[9px] font-black"
                >
                  <FaPlus />
                  Prim Kuralı
                </button>
              )}


              {canManageSales && (
                <button
                  type="button"
                  disabled={
                    saving
                  }
                  onClick={() =>
                    void calculate()
                  }
                  className="flex h-12 items-center gap-2 rounded-xl bg-emerald-500 px-5 text-[9px] font-black"
                >
                  <FaCalculator />
                  Hakedişleri Hesapla
                </button>
              )}

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
            label="Aktif Kural"
            value={String(
              rules.filter(
                (
                  item
                ) =>
                  item.status ===
                  "active"
              ).length
            )}
            detail="Prim hesaplama politikası"
          />

          <Kpi
            label="Bekleyen Hakediş"
            value={money(
              pendingAmount
            )}
            detail={`${pending.length} kayıt`}
          />

          <Kpi
            label="Onaylı Ödeme"
            value={money(
              approvedAmount
            )}
            detail={`${approved.length} ödeme bekliyor`}
          />

          <Kpi
            label="Ödenen Prim"
            value={money(
              paidAmount
            )}
            detail={`${paid.length} tamamlandı`}
            success
          />

          <Kpi
            label="Finans Yetkisi"
            value={
              canPay
                ? "AKTİF"
                : "YOK"
            }
            detail="Prim ödeme yetkisi"
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
                placeholder="Personel, müşteri veya rezervasyon kodu ara..."
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
                <option value="all">
                  Tümü
                </option>

                <option value="pending">
                  Bekleyen
                </option>

                <option value="approved">
                  Onaylı
                </option>

                <option value="paid">
                  Ödendi
                </option>

                <option value="cancelled">
                  İptal
                </option>
              </select>

            </div>

          </div>


          <div className="overflow-x-auto">

            <table className="w-full min-w-[1850px] text-left">

              <thead className="sticky top-0 z-10 bg-[#0a1723]">

                <tr className="text-[8px] font-black uppercase tracking-[.1em] text-slate-600">

                  <th className="px-5 py-4">
                    Personel
                  </th>

                  <th className="px-5 py-4">
                    Müşteri
                  </th>

                  <th className="px-5 py-4">
                    Rezervasyon
                  </th>

                  <th className="px-5 py-4">
                    Satış
                  </th>

                  <th className="px-5 py-4">
                    Tahsilat
                  </th>

                  <th className="px-5 py-4">
                    Tahsilat %
                  </th>

                  <th className="px-5 py-4">
                    Brüt Kâr
                  </th>

                  <th className="px-5 py-4">
                    Prim Matrahı
                  </th>

                  <th className="px-5 py-4">
                    Oran
                  </th>

                  <th className="px-5 py-4">
                    Hakediş
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
                    earning
                  ) => {

                    const member =
                      members.find(
                        (
                          item
                        ) =>
                          item.user_id ===
                          earning.user_id
                      );


                    const lead =
                      leads.find(
                        (
                          item
                        ) =>
                          item.id ===
                          earning.lead_id
                      );


                    const booking =
                      bookings.find(
                        (
                          item
                        ) =>
                          item.id ===
                          earning.booking_id
                      );


                    return (
                      <tr
                        key={
                          earning.id
                        }
                        className="border-t border-white/[.06] transition hover:bg-white/[.025]"
                      >

                        <td className="px-5 py-4">

                          <div className="flex items-center gap-3">

                            <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500/10 text-emerald-300">
                              <FaUserTie />
                            </div>

                            <div className="text-[9px] font-black">
                              {
                                member?.full_name ||
                                "Personel"
                              }
                            </div>

                          </div>

                        </td>


                        <td className="px-5 py-4 text-[9px] font-black">
                          {
                            lead?.customer_name ||
                            "—"
                          }
                        </td>


                        <td className="px-5 py-4 text-[8px] font-black text-blue-300">
                          {
                            booking?.booking_code ||
                            "—"
                          }
                        </td>


                        <td className="px-5 py-4 text-[10px] font-black">
                          {money(
                            earning.booking_total,
                            earning.currency
                          )}
                        </td>


                        <td className="px-5 py-4 text-[10px] font-black text-emerald-300">
                          {money(
                            earning.collected_amount,
                            earning.currency
                          )}
                        </td>


                        <td className="px-5 py-4 text-[10px] font-black">
                          %
                          {Number(
                            earning.collection_percent
                          ).toFixed(
                            1
                          )}
                        </td>


                        <td className="px-5 py-4 text-[10px] font-black">
                          {money(
                            earning.gross_profit,
                            earning.currency
                          )}
                        </td>


                        <td className="px-5 py-4 text-[10px] font-black">
                          {money(
                            earning.commission_base,
                            earning.currency
                          )}
                        </td>


                        <td className="px-5 py-4 text-[10px] font-black">
                          %
                          {Number(
                            earning.rate_percent
                          ).toFixed(
                            2
                          )}
                        </td>


                        <td className="px-5 py-4 text-[12px] font-black text-emerald-300">
                          {money(
                            earning.commission_amount,
                            earning.currency
                          )}
                        </td>


                        <td className="px-5 py-4">

                          <span className={`rounded-lg px-2.5 py-1.5 text-[8px] font-black ${statusTone(
                            earning.status
                          )}`}>
                            {
                              earning.status
                            }
                          </span>

                        </td>


                        <td className="px-5 py-4">

                          <div className="flex gap-2">

                            {earning.status ===
                              "pending" &&
                              canManageSales && (
                                <button
                                  type="button"
                                  disabled={
                                    saving
                                  }
                                  onClick={() =>
                                    void approve(
                                      earning.id
                                    )
                                  }
                                  className="flex h-9 items-center gap-2 rounded-lg bg-blue-500/10 px-3 text-[8px] font-black text-blue-300"
                                >
                                  <FaCheck />
                                  Onayla
                                </button>
                              )}


                            {earning.status ===
                              "approved" &&
                              canPay && (
                                <button
                                  type="button"
                                  disabled={
                                    saving
                                  }
                                  onClick={() =>
                                    void pay(
                                      earning.id
                                    )
                                  }
                                  className="flex h-9 items-center gap-2 rounded-lg bg-emerald-500 px-3 text-[8px] font-black"
                                >
                                  <FaMoneyBillWave />
                                  Öde
                                </button>
                              )}


                            {earning.status ===
                              "paid" && (
                                <span className="flex items-center gap-2 text-[8px] font-black text-emerald-300">
                                  <FaCheckCircle />
                                  Finans işlendi
                                </span>
                              )}

                          </div>

                        </td>

                      </tr>
                    );
                  }
                )}

              </tbody>

            </table>

          </div>

        </section>


        <section className="mt-5 grid gap-4 xl:grid-cols-3">

          {rules.map(
            (
              rule
            ) => {

              const member =
                members.find(
                  (
                    item
                  ) =>
                    item.user_id ===
                    rule.user_id
                );


              return (
                <div
                  key={
                    rule.id
                  }
                  className="rounded-[24px] border border-white/10 bg-[#07131f] p-5"
                >

                  <div className="flex items-start justify-between gap-3">

                    <div>

                      <div className="text-[10px] font-black">
                        {
                          rule.name
                        }
                      </div>

                      <div className="mt-1 text-[8px] text-slate-500">
                        {
                          member?.full_name ||
                          "Tüm satış ekibi"
                        }
                      </div>

                    </div>


                    <span className={`rounded-lg px-2.5 py-1 text-[8px] font-black ${
                      rule.status ===
                      "active"
                        ? "bg-emerald-500/10 text-emerald-300"
                        : "bg-slate-500/10 text-slate-500"
                    }`}>
                      {
                        rule.status
                      }
                    </span>

                  </div>


                  <div className="mt-5 grid grid-cols-3 gap-2">

                    <Mini
                      label="Matrah"
                      value={
                        rule.calculation_basis ===
                        "gross_profit"
                          ? "Brüt Kâr"
                          : "Tahsilat"
                      }
                    />

                    <Mini
                      label="Oran"
                      value={`%${rule.rate_percent}`}
                    />

                    <Mini
                      label="Tahsilat Şartı"
                      value={`%${rule.minimum_collection_percent}`}
                    />

                  </div>

                </div>
              );
            }
          )}

        </section>

      </div>


      {ruleOpen && (
        <div className="fixed inset-0 z-[150] grid place-items-center bg-black/80 p-4 backdrop-blur-sm">

          <div className="w-full max-w-3xl rounded-[30px] border border-white/10 bg-[#07131f] p-6">

            <div className="flex items-start justify-between">

              <div>

                <div className="text-[8px] font-black uppercase tracking-[.2em] text-emerald-300">
                  COMMISSION RULE
                </div>

                <div className="mt-2 text-2xl font-black">
                  Yeni Prim Kuralı
                </div>

              </div>


              <button
                type="button"
                onClick={() =>
                  setRuleOpen(
                    false
                  )
                }
              >
                <FaTimes />
              </button>

            </div>


            <div className="mt-6 grid gap-3 md:grid-cols-2">

              <Field
                label="Kural Adı"
                value={
                  ruleName
                }
                onChange={
                  setRuleName
                }
              />


              <label>

                <Label>
                  Personel
                </Label>

                <select
                  value={
                    ruleUser
                  }
                  onChange={(
                    event
                  ) =>
                    setRuleUser(
                      event.target.value
                    )
                  }
                  className="h-11 w-full rounded-xl border border-white/10 bg-[#0b1723] px-3 text-[9px]"
                >

                  <option value="">
                    Tüm Satış Ekibi
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

              </label>


              <label>

                <Label>
                  Prim Matrahı
                </Label>

                <select
                  value={
                    basis
                  }
                  onChange={(
                    event
                  ) =>
                    setBasis(
                      event.target.value as
                        | "revenue"
                        | "gross_profit"
                    )
                  }
                  className="h-11 w-full rounded-xl border border-white/10 bg-[#0b1723] px-3 text-[9px]"
                >
                  <option value="gross_profit">
                    Brüt Kâr
                  </option>

                  <option value="revenue">
                    Tahsil Edilen Satış
                  </option>
                </select>

              </label>


              <Field
                label="Prim Oranı %"
                type="number"
                value={
                  rate
                }
                onChange={
                  setRate
                }
              />


              <Field
                label="Minimum Tahsilat %"
                type="number"
                value={
                  collectionThreshold
                }
                onChange={
                  setCollectionThreshold
                }
              />


              <Field
                label="Geçerlilik Başlangıcı"
                type="date"
                value={
                  appliesFrom
                }
                onChange={
                  setAppliesFrom
                }
              />

            </div>


            <div className="mt-4 rounded-xl border border-emerald-500/15 bg-emerald-500/[.04] p-4 text-[8px] leading-5 text-slate-400">
              Örnek: minimum tahsilat %100 ise rezervasyon tamamen
              tahsil edilmeden hakediş oluşmaz. %50 seçilirse tahsil
              edilen kısım oranında prim matrahı oluşur.
            </div>


            <button
              type="button"
              disabled={
                saving
              }
              onClick={() =>
                void createRule()
              }
              className="mt-5 h-12 w-full rounded-xl bg-emerald-500 text-[9px] font-black"
            >
              Prim Kuralını Kaydet
            </button>

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
    <div className="rounded-xl border border-white/[.07] bg-black/10 p-3">

      <div className="text-[7px] font-black uppercase text-slate-600">
        {label}
      </div>

      <div className="mt-2 text-[9px] font-black">
        {value}
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
