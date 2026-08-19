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
  FaCheckCircle,
  FaCoins,
  FaCopy,
  FaExternalLinkAlt,
  FaFilter,
  FaHandshake,
  FaMoneyBillWave,
  FaPlus,
  FaSearch,
  FaShip,
  FaTimes,
  FaTrash,
  FaUserTie,
  FaWallet,
} from "react-icons/fa";

import {
  getCurrentMembership,
  getCurrentUser,
} from "@/lib/current-user";

import {
  assignYachtToSupplier,
  createSettlement,
  createSupplierPayment,
  loadPartnerControl,
  removeYachtFromSupplier,
  updateSettlementStatus,
  type YachtSettlement,
  type YachtSettlementStatus,
} from "@/lib/yacht-os/partner-control";


type Supplier = {
  id: string;
  name: string;
  contact_name:
    string | null;
  phone:
    string | null;
  email:
    string | null;
  commission_rate: number;
  current_balance: number;
  rating:
    number | null;
  status: string;
  portal_token: string;
};


type Yacht = {
  id: string;
  name: string;
  yacht_type: string;
  city: string;
  marina:
    string | null;
  base_daily_price: number;
  currency: string;
  max_guests: number;
  status: string;
};


type Booking = {
  id: string;
  yacht_id: string;
  total_amount: number;
  supplier_cost: number;
  commission_amount: number;
  status: string;
  start_date: string;
};


type Assignment = {
  supplier_id: string;
  yacht_id: string;
  created_at: string;
};


function money(
  value: number,
  currency = "TRY"
) {
  return new Intl.NumberFormat(
    "tr-TR",
    {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }
  ).format(
    Number(
      value || 0
    )
  );
}


function statusText(
  value: string
) {
  const map:
    Record<
      string,
      string
    > = {
      draft:
        "Taslak",

      waiting_approval:
        "Onay Bekliyor",

      approved:
        "Onaylandı",

      partially_paid:
        "Kısmi Ödeme",

      paid:
        "Ödendi",

      cancelled:
        "İptal",
    };

  return (
    map[value] ??
    value
  );
}


function statusTone(
  value: string
) {
  if (
    value ===
    "paid"
  ) {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
  }

  if (
    value ===
      "approved" ||
    value ===
      "partially_paid"
  ) {
    return "border-blue-500/20 bg-blue-500/10 text-blue-300";
  }

  if (
    value ===
    "cancelled"
  ) {
    return "border-red-500/20 bg-red-500/10 text-red-300";
  }

  return "border-amber-500/20 bg-amber-500/10 text-amber-300";
}


export default function YachtPartnerCenterPage() {
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
    userId,
    setUserId,
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
      Supplier[]
    >([]);

  const [
    yachts,
    setYachts,
  ] =
    useState<
      Yacht[]
    >([]);

  const [
    bookings,
    setBookings,
  ] =
    useState<
      Booking[]
    >([]);

  const [
    assignments,
    setAssignments,
  ] =
    useState<
      Assignment[]
    >([]);

  const [
    settlements,
    setSettlements,
  ] =
    useState<
      YachtSettlement[]
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
    useState("all");

  const [
    selectedSupplier,
    setSelectedSupplier,
  ] =
    useState("");

  const [
    selectedYacht,
    setSelectedYacht,
  ] =
    useState("");

  const [
    settlementSupplier,
    setSettlementSupplier,
  ] =
    useState("");

  const [
    settlementStart,
    setSettlementStart,
  ] =
    useState("");

  const [
    settlementEnd,
    setSettlementEnd,
  ] =
    useState("");

  const [
    settlementDue,
    setSettlementDue,
  ] =
    useState("");

  const [
    paymentSettlement,
    setPaymentSettlement,
  ] =
    useState("");

  const [
    paymentAmount,
    setPaymentAmount,
  ] =
    useState("");

  const [
    referenceNo,
    setReferenceNo,
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
          await loadPartnerControl(
            activeCompanyId
          );

        setSuppliers(
          data.suppliers as
            Supplier[]
        );

        setYachts(
          data.yachts as
            Yacht[]
        );

        setAssignments(
          data.assignments as
            Assignment[]
        );

        setBookings(
          data.bookings as
            Booking[]
        );

        setSettlements(
          data.settlements
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

          setUserId(
            user.id
          );

          setCompanyId(
            membership.company_id
          );

          setCompanyName(
            membership.company
              .name
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


  const supplierRows =
    useMemo(
      () => {
        const needle =
          query
            .trim()
            .toLocaleLowerCase(
              "tr"
            );

        return suppliers
          .map(
            (
              supplier
            ) => {
              const supplierYachtIds =
                assignments
                  .filter(
                    (
                      assignment
                    ) =>
                      assignment
                        .supplier_id ===
                      supplier.id
                  )
                  .map(
                    (
                      assignment
                    ) =>
                      assignment
                        .yacht_id
                  );

              const supplierBookings =
                bookings.filter(
                  (
                    booking
                  ) =>
                    supplierYachtIds
                      .includes(
                        booking
                          .yacht_id
                      ) &&
                    booking
                      .status !==
                      "cancelled"
                );

              const gross =
                supplierBookings
                  .reduce(
                    (
                      total,
                      booking
                    ) =>
                      total +
                      Number(
                        booking
                          .total_amount
                      ),
                    0
                  );

              const payable =
                supplierBookings
                  .reduce(
                    (
                      total,
                      booking
                    ) =>
                      total +
                      Number(
                        booking
                          .supplier_cost
                      ),
                    0
                  );

              const commission =
                supplierBookings
                  .reduce(
                    (
                      total,
                      booking
                    ) =>
                      total +
                      Number(
                        booking
                          .commission_amount
                      ),
                    0
                  );

              const settlementTotal =
                settlements
                  .filter(
                    (
                      settlement
                    ) =>
                      settlement
                        .supplier_id ===
                      supplier.id
                  )
                  .reduce(
                    (
                      total,
                      settlement
                    ) =>
                      total +
                      Number(
                        settlement
                          .paid_amount
                      ),
                    0
                  );

              return {
                supplier,
                yachtCount:
                  supplierYachtIds
                    .length,

                bookingCount:
                  supplierBookings
                    .length,

                gross,
                payable,
                commission,
                paid:
                  settlementTotal,

                balance:
                  Math.max(
                    0,
                    payable -
                      settlementTotal
                  ),
              };
            }
          )
          .filter(
            (
              row
            ) => {
              const text =
                `${row.supplier.name} ${row.supplier.contact_name ?? ""} ${row.supplier.phone ?? ""}`
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
                row.supplier
                  .status ===
                  statusFilter;

              return (
                searchOk &&
                statusOk
              );
            }
          );
      },
      [
        suppliers,
        assignments,
        bookings,
        settlements,
        query,
        statusFilter,
      ]
    );


  const totalGross =
    supplierRows.reduce(
      (
        total,
        row
      ) =>
        total +
        row.gross,
      0
    );


  const totalPayable =
    supplierRows.reduce(
      (
        total,
        row
      ) =>
        total +
        row.payable,
      0
    );


  const totalPaid =
    supplierRows.reduce(
      (
        total,
        row
      ) =>
        total +
        row.paid,
      0
    );


  const totalOpen =
    Math.max(
      0,
      totalPayable -
        totalPaid
    );


  async function assign() {
    if (
      !selectedSupplier ||
      !selectedYacht
    ) {
      setError(
        "Tedarikçi ve tekne seç."
      );

      return;
    }

    setSaving(true);

    try {
      await assignYachtToSupplier(
        selectedSupplier,
        selectedYacht
      );

      await refresh(
        companyId
      );

      toast(
        "Tekne tedarikçiye atandı."
      );

      setSelectedYacht("");
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


  async function unassign(
    supplierId: string,
    yachtId: string
  ) {
    setSaving(true);

    try {
      await removeYachtFromSupplier(
        supplierId,
        yachtId
      );

      await refresh(
        companyId
      );

      toast(
        "Tekne bağlantısı kaldırıldı."
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


  async function createNewSettlement() {
    if (
      !settlementSupplier ||
      !settlementStart ||
      !settlementEnd
    ) {
      setError(
        "Tedarikçi ve dönem tarihleri zorunlu."
      );

      return;
    }

    const row =
      supplierRows.find(
        (
          item
        ) =>
          item.supplier.id ===
          settlementSupplier
      );

    if (!row) {
      return;
    }

    setSaving(true);

    try {
      await createSettlement({
        companyId,
        userId,

        supplierId:
          settlementSupplier,

        periodStart:
          settlementStart,

        periodEnd:
          settlementEnd,

        grossSales:
          row.gross,

        supplierPayable:
          row.payable,

        platformCommission:
          row.commission,

        dueDate:
          settlementDue ||
          undefined,
      });

      await refresh(
        companyId
      );

      toast(
        "Mutabakat oluşturuldu."
      );

      setSettlementStart("");
      setSettlementEnd("");
      setSettlementDue("");
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


  async function changeSettlement(
    settlement:
      YachtSettlement,
    status:
      YachtSettlementStatus
  ) {
    setSaving(true);

    try {
      await updateSettlementStatus(
        settlement.id,
        status
      );

      await refresh(
        companyId
      );

      toast(
        "Mutabakat durumu güncellendi."
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


  async function pay() {
    const settlement =
      settlements.find(
        (
          item
        ) =>
          item.id ===
          paymentSettlement
      );

    if (
      !settlement ||
      Number(
        paymentAmount
      ) <= 0
    ) {
      setError(
        "Mutabakat ve ödeme tutarı seç."
      );

      return;
    }

    setSaving(true);

    try {
      await createSupplierPayment({
        companyId,
        userId,

        supplierId:
          settlement
            .supplier_id,

        settlementId:
          settlement.id,

        amount:
          Number(
            paymentAmount
          ),

        referenceNo:
          referenceNo ||
          undefined,
      });

      await refresh(
        companyId
      );

      toast(
        "Tedarikçi ödemesi kaydedildi."
      );

      setPaymentAmount("");
      setReferenceNo("");
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


  async function copyPortal(
    token: string
  ) {
    const url =
      `${window.location.origin}/yat-tedarikci/${token}`;

    await navigator
      .clipboard
      .writeText(
        url
      );

    toast(
      "Partner portal linki kopyalandı."
    );
  }


  if (loading) {
    return (
      <main className="grid min-h-[70vh] place-items-center bg-[#030a11] text-white">
        <FaHandshake className="animate-pulse text-4xl text-orange-400" />
      </main>
    );
  }


  return (
    <main className="min-h-screen bg-[#030a11] text-white">

      {notice && (
        <div className="fixed right-5 top-5 z-[100] flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-[#07131f] px-5 py-4 shadow-2xl">
          <FaCheckCircle className="text-emerald-400" />
          <span className="text-xs font-black">
            {notice}
          </span>
        </div>
      )}


      <div className="mx-auto max-w-[1750px] px-5 py-7 lg:px-8">

        <section className="rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,.16),transparent_35%),linear-gradient(145deg,#07131f,#040b12)] p-6 lg:p-8">

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
                <span className="rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1.5 text-[8px] font-black uppercase tracking-[.2em] text-orange-300">
                  PARTNER CONTROL CENTER
                </span>

                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[8px] font-black text-emerald-300">
                  ● Canlı Finans
                </span>
              </div>

              <h1 className="mt-4 text-3xl font-black tracking-[-.04em] lg:text-5xl">
                Tedarikçi{" "}
                <span className="text-orange-400">
                  Kontrol Merkezi
                </span>
              </h1>

              <p className="mt-3 text-xs text-slate-400">
                {companyName}
                {" · "}
                Filo bağlantıları, rezervasyon hacmi,
                hakediş, mutabakat ve ödeme kontrolü.
              </p>
            </div>


            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <TopMetric
                label="Partner"
                value={String(
                  suppliers.length
                )}
              />

              <TopMetric
                label="Bağlı Tekne"
                value={String(
                  assignments.length
                )}
              />

              <TopMetric
                label="Mutabakat"
                value={String(
                  settlements.length
                )}
              />

              <TopMetric
                label="Açık Ödeme"
                value={money(
                  totalOpen
                )}
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


        <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <Kpi
            label="Partner Satış Hacmi"
            value={money(
              totalGross
            )}
            sub="Bağlı tekneler üzerinden"
            icon={<FaCoins />}
          />

          <Kpi
            label="Tedarikçi Hakedişi"
            value={money(
              totalPayable
            )}
            sub="Hesaplanan toplam"
            icon={<FaHandshake />}
          />

          <Kpi
            label="Ödenen"
            value={money(
              totalPaid
            )}
            sub="Mutabakat ödemeleri"
            icon={<FaMoneyBillWave />}
          />

          <Kpi
            label="Açık Bakiye"
            value={money(
              totalOpen
            )}
            sub="Ödeme bekleyen"
            icon={<FaWallet />}
          />

        </section>


        <section className="mt-5 grid gap-5 xl:grid-cols-[1.3fr_.7fr]">

          <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#07131f]">

            <div className="flex flex-col gap-3 border-b border-white/10 p-5 lg:flex-row lg:items-center">

              <div className="relative flex-1">
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
                  placeholder="Partner, yetkili veya telefon ara..."
                  className="h-12 w-full rounded-xl border border-white/10 bg-white/[.025] pl-10 pr-4 text-xs outline-none focus:border-orange-500/40"
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
                  className="h-12 rounded-xl border border-white/10 bg-[#0b1723] px-4 text-[9px] font-black outline-none"
                >
                  <option value="all">
                    Tüm Partnerler
                  </option>

                  <option value="active">
                    Aktif
                  </option>

                  <option value="pending">
                    Onay Bekleyen
                  </option>

                  <option value="passive">
                    Pasif
                  </option>
                </select>
              </div>
            </div>


            <div className="overflow-x-auto">
              <table className="w-full min-w-[1350px] text-left">

                <thead className="sticky top-0 z-10 bg-[#0a1723]">
                  <tr className="text-[8px] font-black uppercase tracking-[.13em] text-slate-600">

                    <th className="px-5 py-4">
                      Partner
                    </th>

                    <th className="px-5 py-4">
                      İletişim
                    </th>

                    <th className="px-5 py-4">
                      Filo
                    </th>

                    <th className="px-5 py-4">
                      Rez.
                    </th>

                    <th className="px-5 py-4">
                      Satış
                    </th>

                    <th className="px-5 py-4">
                      Hakediş
                    </th>

                    <th className="px-5 py-4">
                      Komisyon
                    </th>

                    <th className="px-5 py-4">
                      Ödenen
                    </th>

                    <th className="px-5 py-4">
                      Açık
                    </th>

                    <th className="px-5 py-4">
                      Portal
                    </th>

                  </tr>
                </thead>

                <tbody>
                  {supplierRows.map(
                    (
                      row
                    ) => (
                      <tr
                        key={
                          row.supplier.id
                        }
                        className="border-t border-white/[.06] transition hover:bg-white/[.025]"
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
                                Komisyon %
                                {
                                  row.supplier.commission_rate
                                }
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="text-[9px] font-bold">
                            {
                              row.supplier.contact_name ??
                              "—"
                            }
                          </div>

                          <div className="mt-1 text-[8px] text-slate-600">
                            {
                              row.supplier.phone ??
                              row.supplier.email ??
                              "—"
                            }
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

                        <td className="px-5 py-4 text-[10px] font-black">
                          {money(
                            row.gross
                          )}
                        </td>

                        <td className="px-5 py-4 text-[10px] font-black text-blue-300">
                          {money(
                            row.payable
                          )}
                        </td>

                        <td className="px-5 py-4 text-[10px] font-black text-orange-300">
                          {money(
                            row.commission
                          )}
                        </td>

                        <td className="px-5 py-4 text-[10px] font-black text-emerald-300">
                          {money(
                            row.paid
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <span className={`rounded-lg px-2.5 py-1.5 text-[9px] font-black ${
                            row.balance > 0
                              ? "bg-red-500/10 text-red-300"
                              : "bg-emerald-500/10 text-emerald-300"
                          }`}>
                            {money(
                              row.balance
                            )}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex gap-1.5">

                            <button
                              type="button"
                              onClick={() =>
                                void copyPortal(
                                  row.supplier.portal_token
                                )
                              }
                              className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/[.03] text-slate-300"
                            >
                              <FaCopy />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                window.open(
                                  `/yat-tedarikci/${row.supplier.portal_token}`,
                                  "_blank"
                                )
                              }
                              className="grid h-8 w-8 place-items-center rounded-lg bg-orange-500 text-white"
                            >
                              <FaExternalLinkAlt />
                            </button>

                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>


          <section className="rounded-[28px] border border-white/10 bg-[#07131f] p-5">

            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-orange-500/10 text-orange-400">
                <FaShip />
              </div>

              <div>
                <div className="text-sm font-black">
                  Filo Atama Merkezi
                </div>

                <div className="text-[8px] text-slate-500">
                  Tekneyi partner hesabına bağla
                </div>
              </div>
            </div>


            <div className="mt-5 space-y-3">

              <select
                value={
                  selectedSupplier
                }
                onChange={(
                  event
                ) =>
                  setSelectedSupplier(
                    event.target.value
                  )
                }
                className="h-12 w-full rounded-xl border border-white/10 bg-[#0b1723] px-4 text-[9px] font-black outline-none"
              >
                <option value="">
                  Partner seç
                </option>

                {suppliers.map(
                  (
                    supplier
                  ) => (
                    <option
                      key={
                        supplier.id
                      }
                      value={
                        supplier.id
                      }
                    >
                      {
                        supplier.name
                      }
                    </option>
                  )
                )}
              </select>


              <select
                value={
                  selectedYacht
                }
                onChange={(
                  event
                ) =>
                  setSelectedYacht(
                    event.target.value
                  )
                }
                className="h-12 w-full rounded-xl border border-white/10 bg-[#0b1723] px-4 text-[9px] font-black outline-none"
              >
                <option value="">
                  Tekne seç
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
                      {" · "}
                      {yacht.city}
                    </option>
                  )
                )}
              </select>


              <button
                type="button"
                disabled={
                  saving
                }
                onClick={() =>
                  void assign()
                }
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 text-[9px] font-black"
              >
                <FaPlus />
                Tekneyi Partnere Ata
              </button>
            </div>


            {selectedSupplier && (
              <div className="mt-6 border-t border-white/10 pt-5">

                <div className="mb-3 text-[8px] font-black uppercase tracking-wider text-slate-600">
                  Partner Filosundaki Tekneler
                </div>

                <div className="space-y-2">
                  {assignments
                    .filter(
                      (
                        assignment
                      ) =>
                        assignment.supplier_id ===
                        selectedSupplier
                    )
                    .map(
                      (
                        assignment
                      ) => {
                        const yacht =
                          yachts.find(
                            (
                              item
                            ) =>
                              item.id ===
                              assignment.yacht_id
                          );

                        if (!yacht) {
                          return null;
                        }

                        return (
                          <div
                            key={
                              assignment.yacht_id
                            }
                            className="flex items-center justify-between rounded-xl border border-white/[.07] bg-white/[.02] p-3"
                          >
                            <div>
                              <div className="text-[9px] font-black">
                                {
                                  yacht.name
                                }
                              </div>

                              <div className="mt-1 text-[8px] text-slate-600">
                                {
                                  yacht.city
                                }
                                {" · "}
                                {
                                  yacht.max_guests
                                } kişi
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                void unassign(
                                  selectedSupplier,
                                  yacht.id
                                )
                              }
                              className="grid h-8 w-8 place-items-center rounded-lg border border-red-500/20 bg-red-500/[.06] text-red-300"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        );
                      }
                    )}
                </div>
              </div>
            )}

          </section>
        </section>


        <section className="mt-5 grid gap-5 xl:grid-cols-[1.3fr_.7fr]">

          <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#07131f]">

            <div className="border-b border-white/10 p-5">
              <div className="text-lg font-black">
                Mutabakat & Hakediş Tablosu
              </div>

              <div className="mt-1 text-[9px] text-slate-500">
                Tedarikçi dönem kapatma, onay ve ödeme takibi
              </div>
            </div>


            <div className="overflow-x-auto">
              <table className="w-full min-w-[1150px] text-left">

                <thead className="sticky top-0 bg-[#0a1723]">
                  <tr className="text-[8px] font-black uppercase text-slate-600">

                    <th className="px-5 py-4">
                      Kod
                    </th>

                    <th className="px-5 py-4">
                      Partner
                    </th>

                    <th className="px-5 py-4">
                      Dönem
                    </th>

                    <th className="px-5 py-4">
                      Brüt Satış
                    </th>

                    <th className="px-5 py-4">
                      Hakediş
                    </th>

                    <th className="px-5 py-4">
                      Komisyon
                    </th>

                    <th className="px-5 py-4">
                      Ödenen
                    </th>

                    <th className="px-5 py-4">
                      Kalan
                    </th>

                    <th className="px-5 py-4">
                      Durum
                    </th>

                  </tr>
                </thead>

                <tbody>
                  {settlements.map(
                    (
                      settlement
                    ) => {
                      const supplier =
                        suppliers.find(
                          (
                            item
                          ) =>
                            item.id ===
                            settlement.supplier_id
                        );

                      const remaining =
                        Math.max(
                          0,
                          settlement.supplier_payable -
                            settlement.paid_amount
                        );

                      return (
                        <tr
                          key={
                            settlement.id
                          }
                          className="border-t border-white/[.06]"
                        >

                          <td className="px-5 py-4 text-[9px] font-black">
                            {
                              settlement.settlement_code
                            }
                          </td>

                          <td className="px-5 py-4">
                            <div className="text-[9px] font-black">
                              {
                                supplier?.name ??
                                "—"
                              }
                            </div>
                          </td>

                          <td className="px-5 py-4 text-[8px] text-slate-400">
                            {
                              settlement.period_start
                            }
                            {" → "}
                            {
                              settlement.period_end
                            }
                          </td>

                          <td className="px-5 py-4 text-[9px] font-black">
                            {money(
                              settlement.gross_sales
                            )}
                          </td>

                          <td className="px-5 py-4 text-[9px] font-black text-blue-300">
                            {money(
                              settlement.supplier_payable
                            )}
                          </td>

                          <td className="px-5 py-4 text-[9px] font-black text-orange-300">
                            {money(
                              settlement.platform_commission
                            )}
                          </td>

                          <td className="px-5 py-4 text-[9px] font-black text-emerald-300">
                            {money(
                              settlement.paid_amount
                            )}
                          </td>

                          <td className="px-5 py-4 text-[9px] font-black text-red-300">
                            {money(
                              remaining
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <select
                              value={
                                settlement.status
                              }
                              onChange={(
                                event
                              ) =>
                                void changeSettlement(
                                  settlement,
                                  event.target.value as
                                    YachtSettlementStatus
                                )
                              }
                              className={`h-9 rounded-lg border px-2 text-[8px] font-black outline-none ${statusTone(
                                settlement.status
                              )}`}
                            >
                              <option value="draft">
                                Taslak
                              </option>

                              <option value="waiting_approval">
                                Onay Bekliyor
                              </option>

                              <option value="approved">
                                Onaylandı
                              </option>

                              <option value="partially_paid">
                                Kısmi Ödeme
                              </option>

                              <option value="paid">
                                Ödendi
                              </option>

                              <option value="cancelled">
                                İptal
                              </option>
                            </select>

                            <div className="mt-1 text-[7px] text-slate-600">
                              {statusText(
                                settlement.status
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
          </div>


          <div className="space-y-5">

            <section className="rounded-[28px] border border-white/10 bg-[#07131f] p-5">

              <div className="text-sm font-black">
                Yeni Mutabakat
              </div>

              <div className="mt-1 text-[8px] text-slate-500">
                Partner için dönem hakediş kaydı oluştur
              </div>


              <div className="mt-5 space-y-3">

                <select
                  value={
                    settlementSupplier
                  }
                  onChange={(
                    event
                  ) =>
                    setSettlementSupplier(
                      event.target.value
                    )
                  }
                  className="h-11 w-full rounded-xl border border-white/10 bg-[#0b1723] px-3 text-[9px] font-black outline-none"
                >
                  <option value="">
                    Partner seç
                  </option>

                  {suppliers.map(
                    (
                      supplier
                    ) => (
                      <option
                        key={
                          supplier.id
                        }
                        value={
                          supplier.id
                        }
                      >
                        {
                          supplier.name
                        }
                      </option>
                    )
                  )}
                </select>


                <div className="grid grid-cols-2 gap-2">

                  <input
                    type="date"
                    value={
                      settlementStart
                    }
                    onChange={(
                      event
                    ) =>
                      setSettlementStart(
                        event.target.value
                      )
                    }
                    className="h-11 rounded-xl border border-white/10 bg-[#0b1723] px-3 text-[9px] outline-none"
                  />

                  <input
                    type="date"
                    value={
                      settlementEnd
                    }
                    onChange={(
                      event
                    ) =>
                      setSettlementEnd(
                        event.target.value
                      )
                    }
                    className="h-11 rounded-xl border border-white/10 bg-[#0b1723] px-3 text-[9px] outline-none"
                  />

                </div>


                <input
                  type="date"
                  value={
                    settlementDue
                  }
                  onChange={(
                    event
                  ) =>
                    setSettlementDue(
                      event.target.value
                    )
                  }
                  className="h-11 w-full rounded-xl border border-white/10 bg-[#0b1723] px-3 text-[9px] outline-none"
                />


                <button
                  type="button"
                  disabled={
                    saving
                  }
                  onClick={() =>
                    void createNewSettlement()
                  }
                  className="h-11 w-full rounded-xl bg-orange-500 text-[9px] font-black"
                >
                  Mutabakat Oluştur
                </button>

              </div>
            </section>


            <section className="rounded-[28px] border border-white/10 bg-[#07131f] p-5">

              <div className="text-sm font-black">
                Ödeme Kaydı
              </div>

              <div className="mt-1 text-[8px] text-slate-500">
                Tedarikçiye yapılan ödemeyi işle
              </div>


              <div className="mt-5 space-y-3">

                <select
                  value={
                    paymentSettlement
                  }
                  onChange={(
                    event
                  ) =>
                    setPaymentSettlement(
                      event.target.value
                    )
                  }
                  className="h-11 w-full rounded-xl border border-white/10 bg-[#0b1723] px-3 text-[9px] font-black outline-none"
                >
                  <option value="">
                    Mutabakat seç
                  </option>

                  {settlements
                    .filter(
                      (
                        settlement
                      ) =>
                        settlement.status !==
                          "paid" &&
                        settlement.status !==
                          "cancelled"
                    )
                    .map(
                      (
                        settlement
                      ) => (
                        <option
                          key={
                            settlement.id
                          }
                          value={
                            settlement.id
                          }
                        >
                          {
                            settlement.settlement_code
                          }
                          {" · "}
                          {money(
                            Math.max(
                              0,
                              settlement.supplier_payable -
                                settlement.paid_amount
                            )
                          )}
                        </option>
                      )
                    )}
                </select>


                <input
                  type="number"
                  min="0"
                  placeholder="Ödeme tutarı"
                  value={
                    paymentAmount
                  }
                  onChange={(
                    event
                  ) =>
                    setPaymentAmount(
                      event.target.value
                    )
                  }
                  className="h-11 w-full rounded-xl border border-white/10 bg-white/[.025] px-3 text-[9px] outline-none"
                />


                <input
                  placeholder="Dekont / referans no"
                  value={
                    referenceNo
                  }
                  onChange={(
                    event
                  ) =>
                    setReferenceNo(
                      event.target.value
                    )
                  }
                  className="h-11 w-full rounded-xl border border-white/10 bg-white/[.025] px-3 text-[9px] outline-none"
                />


                <button
                  type="button"
                  disabled={
                    saving
                  }
                  onClick={() =>
                    void pay()
                  }
                  className="h-11 w-full rounded-xl bg-emerald-500 text-[9px] font-black text-white"
                >
                  Ödemeyi Kaydet
                </button>

              </div>
            </section>

          </div>
        </section>

      </div>
    </main>
  );
}


function TopMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-[110px] rounded-xl border border-white/10 bg-black/10 px-4 py-3">
      <div className="text-[7px] font-black uppercase text-slate-600">
        {label}
      </div>

      <div className="mt-1 text-sm font-black">
        {value}
      </div>
    </div>
  );
}


function Kpi({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string;
  sub: string;
  icon:
    React.ReactNode;
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-[#07131f] p-5">

      <div className="flex items-start justify-between gap-4">

        <div>
          <div className="text-[8px] font-black uppercase tracking-[.15em] text-slate-600">
            {label}
          </div>

          <div className="mt-3 text-2xl font-black">
            {value}
          </div>

          <div className="mt-2 text-[8px] text-slate-500">
            {sub}
          </div>
        </div>

        <div className="grid h-10 w-10 place-items-center rounded-xl bg-orange-500/10 text-orange-400">
          {icon}
        </div>

      </div>
    </div>
  );
}
