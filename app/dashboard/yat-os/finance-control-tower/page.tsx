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
  FaCashRegister,
  FaChartLine,
  FaCheckCircle,
  FaClock,
  FaCoins,
  FaExclamationTriangle,
  FaFilter,
  FaMoneyBillWave,
  FaSearch,
  FaShip,
  FaTimes,
  FaUndo,
  FaWallet,
} from "react-icons/fa";

import {
  supabase,
} from "@/lib/supabase";

import {
  getCurrentMembership,
  getCurrentUser,
} from "@/lib/current-user";

import {
  loadYachtFinanceControlTower,
  recordYachtManualRefund,
  updateYachtCollectionPlan,

  type YachtFinanceBooking,
  type YachtFinancePayment,
  type YachtFinanceRefund,
} from "@/lib/yacht-os/finance-control-tower";


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

      year:
        "numeric",

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


function priorityTone(
  value: string
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
    "normal"
  ) {
    return "border-amber-500/20 bg-amber-500/10 text-amber-300";
  }


  return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
}


function priorityLabel(
  value: string
) {

  const map:
    Record<
      string,
      string
    > = {
      low:
        "DÜŞÜK",

      normal:
        "NORMAL",

      high:
        "YÜKSEK",

      critical:
        "KRİTİK",
    };


  return (
    map[value] ||
    value
  );
}


export default function YachtFinanceControlTowerPage() {

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
    bookings,
    setBookings,
  ] =
    useState<
      YachtFinanceBooking[]
    >([]);

  const [
    yachts,
    setYachts,
  ] =
    useState<any[]>(
      []
    );

  const [
    payments,
    setPayments,
  ] =
    useState<
      YachtFinancePayment[]
    >([]);

  const [
    refunds,
    setRefunds,
  ] =
    useState<
      YachtFinanceRefund[]
    >([]);

  const [
    paymentLinks,
    setPaymentLinks,
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
    riskFilter,
    setRiskFilter,
  ] =
    useState("all");

  const [
    planBooking,
    setPlanBooking,
  ] =
    useState<
      YachtFinanceBooking |
      null
    >(null);

  const [
    dueAt,
    setDueAt,
  ] =
    useState("");

  const [
    depositTarget,
    setDepositTarget,
  ] =
    useState("0");

  const [
    priority,
    setPriority,
  ] =
    useState<
      "low" |
      "normal" |
      "high" |
      "critical"
    >(
      "normal"
    );

  const [
    collectionNote,
    setCollectionNote,
  ] =
    useState("");

  const [
    refundPayment,
    setRefundPayment,
  ] =
    useState<
      YachtFinancePayment |
      null
    >(null);

  const [
    refundAmount,
    setRefundAmount,
  ] =
    useState("");

  const [
    refundReason,
    setRefundReason,
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
          await loadYachtFinanceControlTower(
            activeCompanyId
          );


        setBookings(
          data.bookings
        );

        setYachts(
          data.yachts
        );

        setPayments(
          data.payments
        );

        setRefunds(
          data.refunds
        );

        setPaymentLinks(
          data.paymentLinks
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
      2300
    );
  }


  const totalSales =
    bookings
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
            item.total_amount
          ),
        0
      );


  const totalCollected =
    bookings.reduce(
      (
        total,
        item
      ) =>
        total +
        Number(
          item.paid_amount
        ),
      0
    );


  const totalRefunded =
    refunds
      .filter(
        (
          item
        ) =>
          item.status ===
          "paid"
      )
      .reduce(
        (
          total,
          item
        ) =>
          total +
          Number(
            item.amount
          ),
        0
      );


  const openBalance =
    Math.max(
      totalSales -
      totalCollected,
      0
    );


  const todayStart =
    new Date();

  todayStart.setHours(
    0,
    0,
    0,
    0
  );


  const tomorrow =
    new Date(
      todayStart
    );

  tomorrow.setDate(
    tomorrow.getDate() +
    1
  );


  const dueToday =
    bookings.filter(
      (
        booking
      ) => {

        if (
          !booking.collection_due_at ||
          Number(
            booking.total_amount
          ) <=
          Number(
            booking.paid_amount
          )
        ) {
          return false;
        }


        const due =
          new Date(
            booking.collection_due_at
          );


        return (
          due >=
            todayStart &&
          due <
            tomorrow
        );
      }
    );


  const overdue =
    bookings.filter(
      (
        booking
      ) =>
        booking.collection_due_at &&
        new Date(
          booking.collection_due_at
        ) <
          todayStart &&
        Number(
          booking.total_amount
        ) >
          Number(
            booking.paid_amount
          )
    );


  const critical =
    bookings.filter(
      (
        booking
      ) =>
        booking.collection_priority ===
        "critical"
    );


  const next7Days =
    new Date();

  next7Days.setDate(
    next7Days.getDate() +
    7
  );


  const next30Days =
    new Date();

  next30Days.setDate(
    next30Days.getDate() +
    30
  );


  const forecast7 =
    bookings
      .filter(
        (
          booking
        ) =>
          booking.collection_due_at &&
          new Date(
            booking.collection_due_at
          ) <=
            next7Days &&
          Number(
            booking.total_amount
          ) >
            Number(
              booking.paid_amount
            )
      )
      .reduce(
        (
          total,
          booking
        ) =>
          total +
          Math.max(
            Number(
              booking.total_amount
            ) -
            Number(
              booking.paid_amount
            ),
            0
          ),
        0
      );


  const forecast30 =
    bookings
      .filter(
        (
          booking
        ) =>
          booking.collection_due_at &&
          new Date(
            booking.collection_due_at
          ) <=
            next30Days &&
          Number(
            booking.total_amount
          ) >
            Number(
              booking.paid_amount
            )
      )
      .reduce(
        (
          total,
          booking
        ) =>
          total +
          Math.max(
            Number(
              booking.total_amount
            ) -
            Number(
              booking.paid_amount
            ),
            0
          ),
        0
      );


  const paidPayments =
    payments.filter(
      (
        item
      ) =>
        [
          "paid",
          "partially_refunded",
          "refunded",
        ].includes(
          item.status
        )
    );


  const cashTotal =
    paidPayments
      .filter(
        (
          item
        ) =>
          item.payment_method ===
          "cash"
      )
      .reduce(
        (
          total,
          item
        ) =>
          total +
          Number(
            item.amount
          ),
        0
      );


  const bankTotal =
    paidPayments
      .filter(
        (
          item
        ) =>
          item.payment_method ===
          "bank_transfer"
      )
      .reduce(
        (
          total,
          item
        ) =>
          total +
          Number(
            item.amount
          ),
        0
      );


  const onlineTotal =
    paidPayments
      .filter(
        (
          item
        ) =>
          item.provider ===
          "iyzico"
      )
      .reduce(
        (
          total,
          item
        ) =>
          total +
          Number(
            item.amount
          ),
        0
      );


  const cardTotal =
    paidPayments
      .filter(
        (
          item
        ) =>
          item.payment_method ===
            "credit_card" &&
          item.provider !==
            "iyzico"
      )
      .reduce(
        (
          total,
          item
        ) =>
          total +
          Number(
            item.amount
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


        return bookings.filter(
          (
            booking
          ) => {

            const yacht =
              yachts.find(
                (
                  item
                ) =>
                  item.id ===
                  booking.yacht_id
              );


            const text =
              `${booking.booking_code} ${booking.guest_name} ${booking.guest_phone || ""} ${yacht?.name || ""}`
                .toLocaleLowerCase(
                  "tr"
                );


            const searchOk =
              !needle ||
              text.includes(
                needle
              );


            const riskOk =
              riskFilter ===
                "all" ||
              booking.collection_priority ===
                riskFilter;


            return (
              searchOk &&
              riskOk
            );
          }
        );
      },
      [
        bookings,
        yachts,
        query,
        riskFilter,
      ]
    );


  function openPlan(
    booking:
      YachtFinanceBooking
  ) {

    setPlanBooking(
      booking
    );


    setDueAt(
      booking.collection_due_at
        ? new Date(
            booking.collection_due_at
          )
            .toISOString()
            .slice(
              0,
              16
            )
        : ""
    );


    setDepositTarget(
      String(
        booking.deposit_target ||
        0
      )
    );


    setPriority(
      booking.collection_priority ||
      "normal"
    );


    setCollectionNote(
      booking.collection_note ||
      ""
    );
  }


  async function savePlan() {

    if (!planBooking) {
      return;
    }


    setSaving(true);
    setError("");


    try {

      await updateYachtCollectionPlan({
        bookingId:
          planBooking.id,

        dueAt:
          dueAt ||
          undefined,

        depositTarget:
          Number(
            depositTarget
          ) ||
          0,

        priority,

        note:
          collectionNote ||
          undefined,
      });


      await refresh(
        companyId
      );


      setPlanBooking(
        null
      );


      toast(
        "Tahsilat planı güncellendi."
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


  function refundableAmount(
    payment:
      YachtFinancePayment
  ) {

    const refunded =
      refunds
        .filter(
          (
            item
          ) =>
            item.payment_id ===
              payment.id &&
            item.status ===
              "paid"
        )
        .reduce(
          (
            total,
            item
          ) =>
            total +
            Number(
              item.amount
            ),
          0
        );


    return Math.max(
      Number(
        payment.amount
      ) -
      refunded,
      0
    );
  }


  function openRefund(
    payment:
      YachtFinancePayment
  ) {

    const refundable =
      refundableAmount(
        payment
      );


    setRefundPayment(
      payment
    );

    setRefundAmount(
      String(
        refundable
      )
    );

    setRefundReason("");
  }


  async function processRefund() {

    if (!refundPayment) {
      return;
    }


    const value =
      Number(
        refundAmount
      );


    if (
      !Number.isFinite(
        value
      ) ||
      value <= 0
    ) {

      setError(
        "Geçerli iade tutarı gir."
      );

      return;
    }


    if (
      value >
      refundableAmount(
        refundPayment
      ) + 0.01
    ) {

      setError(
        "İade tutarı iade edilebilir bakiyeyi aşamaz."
      );

      return;
    }


    setSaving(true);
    setError("");


    try {

      if (
        refundPayment.provider ===
        "iyzico"
      ) {

        const {
          data:
            sessionData,
        } =
          await supabase.auth
            .getSession();


        const token =
          sessionData
            .session
            ?.access_token;


        if (!token) {
          throw new Error(
            "Oturum bulunamadı."
          );
        }


        const response =
          await fetch(
            "/api/yacht-payments/iyzico/refund",
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",

                Authorization:
                  `Bearer ${token}`,
              },

              body:
                JSON.stringify({
                  paymentId:
                    refundPayment.id,

                  amount:
                    value,

                  reason:
                    refundReason ||
                    undefined,
                }),
            }
          );


        const result =
          await response.json();


        if (!response.ok) {
          throw new Error(
            result.error ||
            "Online iade başarısız."
          );
        }

      } else {

        await recordYachtManualRefund({
          paymentId:
            refundPayment.id,

          amount:
            value,

          reason:
            refundReason ||
            undefined,
        });

      }


      await refresh(
        companyId
      );


      setRefundPayment(
        null
      );


      toast(
        "İade finans kayıtlarına işlendi."
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
        <FaChartLine className="animate-pulse text-4xl text-orange-400" />
      </main>
    );
  }


  return (
    <main className="min-h-screen bg-[#030a11] text-white">

      {notice && (
        <div className="fixed right-5 top-5 z-[150] flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-[#07131f] px-5 py-4 shadow-2xl">

          <FaCheckCircle className="text-emerald-400" />

          <span className="text-xs font-black">
            {notice}
          </span>

        </div>
      )}


      <div className="mx-auto max-w-[1850px] px-5 py-7 lg:px-8">


        <section className="rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,.12),transparent_30%),radial-gradient(circle_at_70%_0%,rgba(34,197,94,.10),transparent_35%),linear-gradient(145deg,#07131f,#040b12)] p-6 lg:p-8">

          <Link
            href="/dashboard/yat-os/finance-center"
            className="inline-flex items-center gap-2 text-[9px] font-black text-slate-500 transition hover:text-white"
          >
            <FaArrowLeft />
            FİNANS & TAHSİLAT
          </Link>


          <div className="mt-5 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">

            <div>

              <div className="flex flex-wrap gap-2">

                <span className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-[8px] font-black uppercase tracking-[.22em] text-red-300">
                  FINANCE CONTROL TOWER
                </span>

                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[8px] font-black text-emerald-300">
                  ● Canlı Finans İzleme
                </span>

              </div>


              <h1 className="mt-4 text-3xl font-black tracking-[-.04em] lg:text-5xl">
                Finans{" "}
                <span className="text-orange-400">
                  Kontrol Kulesi
                </span>
              </h1>


              <p className="mt-3 max-w-3xl text-xs leading-5 text-slate-400">
                {companyName}
                {" · "}
                Tahsilat riski, vadeler, kasa dağılımı,
                forecast, online ve manuel iadeler tek merkezde.
              </p>

            </div>


            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">

              <HeaderMetric
                label="Vadesi Geçen"
                value={String(
                  overdue.length
                )}
                danger={
                  overdue.length >
                  0
                }
              />

              <HeaderMetric
                label="Bugün Tahsil"
                value={String(
                  dueToday.length
                )}
              />

              <HeaderMetric
                label="Kritik"
                value={String(
                  critical.length
                )}
                danger={
                  critical.length >
                  0
                }
              />

              <HeaderMetric
                label="Açık Bakiye"
                value={money(
                  openBalance
                )}
                danger={
                  openBalance >
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


        <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">

          <Kpi
            label="Toplam Satış"
            value={money(
              totalSales
            )}
            detail="Aktif rezervasyon"
          />

          <Kpi
            label="Net Tahsilat"
            value={money(
              totalCollected
            )}
            detail="İadeler sonrası mevcut tahsilat"
            success
          />

          <Kpi
            label="Toplam İade"
            value={money(
              totalRefunded
            )}
            detail={`${refunds.filter(
              (
                item
              ) =>
                item.status ===
                "paid"
            ).length} başarılı iade`}
            danger={
              totalRefunded >
              0
            }
          />

          <Kpi
            label="7 Gün Forecast"
            value={money(
              forecast7
            )}
            detail="Vadesi gelen beklenen tahsilat"
          />

          <Kpi
            label="30 Gün Forecast"
            value={money(
              forecast30
            )}
            detail="Yaklaşan tahsilat hacmi"
          />

          <Kpi
            label="Tahsilat Oranı"
            value={
              totalSales > 0
                ? `%${(
                    totalCollected /
                    totalSales *
                    100
                  ).toFixed(
                    1
                  )}`
                : "%0"
            }
            detail="Satış / net tahsilat"
            success
          />

        </section>


        <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <MoneyChannel
            icon={<FaCashRegister />}
            label="Nakit"
            value={money(
              cashTotal
            )}
            count={
              paidPayments.filter(
                (
                  item
                ) =>
                  item.payment_method ===
                  "cash"
              ).length
            }
          />

          <MoneyChannel
            icon={<FaMoneyBillWave />}
            label="Havale / EFT"
            value={money(
              bankTotal
            )}
            count={
              paidPayments.filter(
                (
                  item
                ) =>
                  item.payment_method ===
                  "bank_transfer"
              ).length
            }
          />

          <MoneyChannel
            icon={<FaWallet />}
            label="Fiziki Kart"
            value={money(
              cardTotal
            )}
            count={
              paidPayments.filter(
                (
                  item
                ) =>
                  item.payment_method ===
                    "credit_card" &&
                  item.provider !==
                    "iyzico"
              ).length
            }
          />

          <MoneyChannel
            icon={<FaCoins />}
            label="iyzico Online"
            value={money(
              onlineTotal
            )}
            count={
              paidPayments.filter(
                (
                  item
                ) =>
                  item.provider ===
                  "iyzico"
              ).length
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
                placeholder="Rezervasyon, müşteri, telefon veya tekne ara..."
                className="h-12 w-full rounded-xl border border-white/10 bg-white/[.025] pl-10 pr-4 text-xs outline-none"
              />

            </div>


            <div className="flex items-center gap-2">

              <FaFilter className="text-slate-600" />

              <select
                value={
                  riskFilter
                }
                onChange={(
                  event
                ) =>
                  setRiskFilter(
                    event.target.value
                  )
                }
                className="h-12 rounded-xl border border-white/10 bg-[#0b1723] px-4 text-[9px] font-black outline-none"
              >

                <option value="all">
                  Tüm Tahsilat Riskleri
                </option>

                <option value="critical">
                  Kritik
                </option>

                <option value="high">
                  Yüksek
                </option>

                <option value="normal">
                  Normal
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
                    Rezervasyon
                  </th>

                  <th className="px-5 py-4">
                    Müşteri
                  </th>

                  <th className="px-5 py-4">
                    Tekne
                  </th>

                  <th className="px-5 py-4">
                    Seyahat
                  </th>

                  <th className="px-5 py-4">
                    Satış
                  </th>

                  <th className="px-5 py-4">
                    Tahsil
                  </th>

                  <th className="px-5 py-4">
                    Açık Bakiye
                  </th>

                  <th className="px-5 py-4">
                    Kapora Hedefi
                  </th>

                  <th className="px-5 py-4">
                    Vade
                  </th>

                  <th className="px-5 py-4">
                    Risk
                  </th>

                  <th className="px-5 py-4">
                    Durum
                  </th>

                  <th className="px-5 py-4">
                    Plan
                  </th>

                </tr>

              </thead>


              <tbody>

                {rows.map(
                  (
                    booking
                  ) => {

                    const yacht =
                      yachts.find(
                        (
                          item
                        ) =>
                          item.id ===
                          booking.yacht_id
                      );


                    const remaining =
                      Math.max(
                        Number(
                          booking.total_amount
                        ) -
                        Number(
                          booking.paid_amount
                        ),
                        0
                      );


                    const isOverdue =
                      booking.collection_due_at &&
                      new Date(
                        booking.collection_due_at
                      ) <
                        new Date() &&
                      remaining >
                        0;


                    return (
                      <tr
                        key={
                          booking.id
                        }
                        className={`border-t border-white/[.06] transition hover:bg-white/[.02] ${
                          isOverdue
                            ? "bg-red-500/[.025]"
                            : ""
                        }`}
                      >

                        <td className="px-5 py-4">

                          <div className="text-[9px] font-black">
                            {
                              booking.booking_code
                            }
                          </div>

                          <div className="mt-1 text-[7px] text-slate-600">
                            {
                              booking.status
                            }
                          </div>

                        </td>


                        <td className="px-5 py-4">

                          <div className="text-[9px] font-black">
                            {
                              booking.guest_name
                            }
                          </div>

                          <div className="mt-1 text-[8px] text-slate-600">
                            {
                              booking.guest_phone ||
                              "—"
                            }
                          </div>

                        </td>


                        <td className="px-5 py-4">

                          <div className="flex items-center gap-2">

                            <FaShip className="text-orange-400" />

                            <div>

                              <div className="text-[9px] font-black">
                                {
                                  yacht?.name ||
                                  "—"
                                }
                              </div>

                              <div className="mt-1 text-[7px] text-slate-600">
                                {
                                  yacht?.city ||
                                  "—"
                                }
                              </div>

                            </div>

                          </div>

                        </td>


                        <td className="px-5 py-4 text-[8px] text-slate-500">
                          {
                            booking.start_date
                          }
                          {" → "}
                          {
                            booking.end_date
                          }
                        </td>


                        <td className="px-5 py-4 text-[10px] font-black">
                          {money(
                            booking.total_amount,
                            booking.currency
                          )}
                        </td>


                        <td className="px-5 py-4 text-[10px] font-black text-emerald-300">
                          {money(
                            booking.paid_amount,
                            booking.currency
                          )}
                        </td>


                        <td className="px-5 py-4">

                          <span className={`rounded-lg px-2.5 py-1.5 text-[9px] font-black ${
                            remaining > 0
                              ? "bg-red-500/10 text-red-300"
                              : "bg-emerald-500/10 text-emerald-300"
                          }`}>
                            {money(
                              remaining,
                              booking.currency
                            )}
                          </span>

                        </td>


                        <td className="px-5 py-4 text-[9px] font-black text-blue-300">
                          {money(
                            booking.deposit_target,
                            booking.currency
                          )}
                        </td>


                        <td className="px-5 py-4">

                          <div className={`text-[8px] font-black ${
                            isOverdue
                              ? "text-red-300"
                              : "text-slate-400"
                          }`}>
                            {dateTime(
                              booking.collection_due_at
                            )}
                          </div>

                          {isOverdue && (
                            <div className="mt-1 text-[7px] font-black text-red-400">
                              VADE GEÇTİ
                            </div>
                          )}

                        </td>


                        <td className="px-5 py-4">

                          <span className={`rounded-full border px-2.5 py-1 text-[7px] font-black ${priorityTone(
                            booking.collection_priority
                          )}`}>
                            {priorityLabel(
                              booking.collection_priority
                            )}
                          </span>

                        </td>


                        <td className="px-5 py-4 text-[8px] font-black text-slate-400">
                          {
                            booking.payment_status
                          }
                        </td>


                        <td className="px-5 py-4">

                          <button
                            type="button"
                            onClick={() =>
                              openPlan(
                                booking
                              )
                            }
                            className="flex h-9 items-center gap-2 rounded-lg border border-orange-500/20 bg-orange-500/[.07] px-3 text-[8px] font-black text-orange-300"
                          >
                            <FaCalendarAlt />
                            Tahsilat Planı
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


        <section className="mt-5 overflow-hidden rounded-[28px] border border-white/10 bg-[#07131f]">

          <div className="flex items-center justify-between border-b border-white/10 p-5">

            <div>

              <div className="text-lg font-black">
                İade Merkezi
              </div>

              <div className="mt-1 text-[9px] text-slate-500">
                Online iyzico ve manuel tahsilatların kısmi / tam iade yönetimi
              </div>

            </div>

            <FaUndo className="text-orange-400" />

          </div>


          <div className="overflow-x-auto">

            <table className="w-full min-w-[1550px] text-left">

              <thead className="sticky top-0 bg-[#0a1723]">

                <tr className="text-[8px] font-black uppercase text-slate-600">

                  <th className="px-5 py-4">
                    Ödeme
                  </th>

                  <th className="px-5 py-4">
                    Rezervasyon
                  </th>

                  <th className="px-5 py-4">
                    Müşteri
                  </th>

                  <th className="px-5 py-4">
                    Tutar
                  </th>

                  <th className="px-5 py-4">
                    İade Edildi
                  </th>

                  <th className="px-5 py-4">
                    İade Edilebilir
                  </th>

                  <th className="px-5 py-4">
                    Kanal
                  </th>

                  <th className="px-5 py-4">
                    Ödeme Durumu
                  </th>

                  <th className="px-5 py-4">
                    Tarih
                  </th>

                  <th className="px-5 py-4">
                    Aksiyon
                  </th>

                </tr>

              </thead>


              <tbody>

                {payments
                  .filter(
                    (
                      payment
                    ) =>
                      [
                        "paid",
                        "partially_refunded",
                        "refunded",
                      ].includes(
                        payment.status
                      )
                  )
                  .map(
                    (
                      payment
                    ) => {

                      const booking =
                        bookings.find(
                          (
                            item
                          ) =>
                            item.id ===
                            payment.booking_id
                        );


                      const refunded =
                        refunds
                          .filter(
                            (
                              item
                            ) =>
                              item.payment_id ===
                                payment.id &&
                              item.status ===
                                "paid"
                          )
                          .reduce(
                            (
                              total,
                              item
                            ) =>
                              total +
                              Number(
                                item.amount
                              ),
                            0
                          );


                      const refundable =
                        refundableAmount(
                          payment
                        );


                      return (
                        <tr
                          key={
                            payment.id
                          }
                          className="border-t border-white/[.06]"
                        >

                          <td className="px-5 py-4">

                            <div className="text-[9px] font-black">
                              {
                                payment.id.slice(
                                  0,
                                  8
                                )
                              }
                            </div>

                            <div className="mt-1 text-[7px] text-slate-600">
                              {
                                payment.reference_no ||
                                payment.provider_payment_id ||
                                "—"
                              }
                            </div>

                          </td>


                          <td className="px-5 py-4 text-[9px] font-black">
                            {
                              booking?.booking_code ||
                              "—"
                            }
                          </td>


                          <td className="px-5 py-4 text-[9px]">
                            {
                              booking?.guest_name ||
                              "—"
                            }
                          </td>


                          <td className="px-5 py-4 text-[10px] font-black text-emerald-300">
                            {money(
                              payment.amount,
                              payment.currency
                            )}
                          </td>


                          <td className="px-5 py-4 text-[9px] font-black text-red-300">
                            {money(
                              refunded,
                              payment.currency
                            )}
                          </td>


                          <td className="px-5 py-4 text-[9px] font-black text-orange-300">
                            {money(
                              refundable,
                              payment.currency
                            )}
                          </td>


                          <td className="px-5 py-4">

                            <span className="rounded-lg border border-white/10 bg-white/[.03] px-2.5 py-1 text-[8px] font-black">
                              {payment.provider ===
                              "iyzico"
                                ? "iyzico Online"
                                : payment.payment_method}
                            </span>

                          </td>


                          <td className="px-5 py-4 text-[8px] font-black">
                            {
                              payment.status
                            }
                          </td>


                          <td className="px-5 py-4 text-[8px] text-slate-500">
                            {dateTime(
                              payment.paid_at ||
                              payment.created_at
                            )}
                          </td>


                          <td className="px-5 py-4">

                            {refundable >
                            0 ? (
                              <button
                                type="button"
                                onClick={() =>
                                  openRefund(
                                    payment
                                  )
                                }
                                className="flex h-9 items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/[.07] px-3 text-[8px] font-black text-red-300"
                              >
                                <FaUndo />
                                İade
                              </button>
                            ) : (
                              <span className="flex items-center gap-2 text-[8px] font-black text-slate-600">
                                <FaCheckCircle />
                                Tamamı İade
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


        <section className="mt-5 overflow-hidden rounded-[28px] border border-white/10 bg-[#07131f]">

          <div className="border-b border-white/10 p-5">

            <div className="text-lg font-black">
              İade Hareketleri
            </div>

            <div className="mt-1 text-[9px] text-slate-500">
              Başarılı, işlemde ve başarısız iadelerin denetim tablosu
            </div>

          </div>


          <div className="overflow-x-auto">

            <table className="w-full min-w-[1200px] text-left">

              <thead className="bg-[#0a1723]">

                <tr className="text-[8px] font-black uppercase text-slate-600">

                  <th className="px-5 py-4">
                    Tarih
                  </th>

                  <th className="px-5 py-4">
                    Rezervasyon
                  </th>

                  <th className="px-5 py-4">
                    Tutar
                  </th>

                  <th className="px-5 py-4">
                    Kanal
                  </th>

                  <th className="px-5 py-4">
                    Durum
                  </th>

                  <th className="px-5 py-4">
                    Provider Referans
                  </th>

                  <th className="px-5 py-4">
                    Sebep
                  </th>

                </tr>

              </thead>


              <tbody>

                {refunds.map(
                  (
                    refund
                  ) => {

                    const booking =
                      bookings.find(
                        (
                          item
                        ) =>
                          item.id ===
                          refund.booking_id
                      );


                    return (
                      <tr
                        key={
                          refund.id
                        }
                        className="border-t border-white/[.06]"
                      >

                        <td className="px-5 py-4 text-[8px] text-slate-500">
                          {dateTime(
                            refund.created_at
                          )}
                        </td>


                        <td className="px-5 py-4 text-[9px] font-black">
                          {
                            booking?.booking_code ||
                            "—"
                          }
                        </td>


                        <td className="px-5 py-4 text-[10px] font-black text-red-300">
                          {money(
                            refund.amount,
                            refund.currency
                          )}
                        </td>


                        <td className="px-5 py-4 text-[9px]">
                          {
                            refund.provider ||
                            "manual"
                          }
                        </td>


                        <td className="px-5 py-4">

                          <span className={`rounded-full border px-2.5 py-1 text-[8px] font-black ${
                            refund.status ===
                            "paid"
                              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                              : refund.status ===
                                "processing"
                                ? "border-amber-500/20 bg-amber-500/10 text-amber-300"
                                : "border-red-500/20 bg-red-500/10 text-red-300"
                          }`}>
                            {
                              refund.status
                            }
                          </span>

                        </td>


                        <td className="px-5 py-4 text-[8px] text-slate-500">
                          {
                            refund.provider_reference ||
                            "—"
                          }
                        </td>


                        <td className="px-5 py-4 text-[8px] text-slate-500">
                          {
                            refund.reason ||
                            "—"
                          }
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


      {planBooking && (
        <div className="fixed inset-0 z-[140] grid place-items-center bg-black/75 p-4 backdrop-blur-sm">

          <div className="w-full max-w-xl rounded-[28px] border border-white/10 bg-[#07131f] p-6 shadow-2xl">

            <div className="flex items-start justify-between gap-4">

              <div>

                <div className="text-[8px] font-black uppercase tracking-[.2em] text-orange-400">
                  TAHSİLAT PLANI
                </div>

                <div className="mt-2 text-xl font-black">
                  {
                    planBooking.booking_code
                  }
                </div>

                <div className="mt-1 text-[9px] text-slate-500">
                  {
                    planBooking.guest_name
                  }
                </div>

              </div>


              <button
                type="button"
                onClick={() =>
                  setPlanBooking(
                    null
                  )
                }
                className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-slate-400"
              >
                <FaTimes />
              </button>

            </div>


            <div className="mt-6 grid gap-4">

              <label>

                <span className="mb-1.5 block text-[8px] font-black uppercase text-slate-500">
                  Tahsilat Vadesi
                </span>

                <input
                  type="datetime-local"
                  value={
                    dueAt
                  }
                  onChange={(
                    event
                  ) =>
                    setDueAt(
                      event.target.value
                    )
                  }
                  className="h-12 w-full rounded-xl border border-white/10 bg-white/[.025] px-4 text-xs outline-none"
                />

              </label>


              <label>

                <span className="mb-1.5 block text-[8px] font-black uppercase text-slate-500">
                  Kapora Hedefi
                </span>

                <input
                  type="number"
                  min="0"
                  value={
                    depositTarget
                  }
                  onChange={(
                    event
                  ) =>
                    setDepositTarget(
                      event.target.value
                    )
                  }
                  className="h-12 w-full rounded-xl border border-white/10 bg-white/[.025] px-4 text-xs font-black outline-none"
                />

              </label>


              <label>

                <span className="mb-1.5 block text-[8px] font-black uppercase text-slate-500">
                  Tahsilat Risk Seviyesi
                </span>

                <select
                  value={
                    priority
                  }
                  onChange={(
                    event
                  ) =>
                    setPriority(
                      event.target.value as
                        "low" |
                        "normal" |
                        "high" |
                        "critical"
                    )
                  }
                  className="h-12 w-full rounded-xl border border-white/10 bg-[#0b1723] px-4 text-xs font-black outline-none"
                >

                  <option value="low">
                    Düşük
                  </option>

                  <option value="normal">
                    Normal
                  </option>

                  <option value="high">
                    Yüksek
                  </option>

                  <option value="critical">
                    Kritik
                  </option>

                </select>

              </label>


              <label>

                <span className="mb-1.5 block text-[8px] font-black uppercase text-slate-500">
                  Finans Notu
                </span>

                <textarea
                  value={
                    collectionNote
                  }
                  onChange={(
                    event
                  ) =>
                    setCollectionNote(
                      event.target.value
                    )
                  }
                  className="min-h-24 w-full resize-none rounded-xl border border-white/10 bg-white/[.025] p-4 text-xs outline-none"
                />

              </label>

            </div>


            <button
              type="button"
              disabled={
                saving
              }
              onClick={() =>
                void savePlan()
              }
              className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 text-xs font-black"
            >
              <FaCalendarAlt />
              Tahsilat Planını Kaydet
            </button>

          </div>

        </div>
      )}


      {refundPayment && (
        <div className="fixed inset-0 z-[150] grid place-items-center bg-black/80 p-4 backdrop-blur-sm">

          <div className="w-full max-w-xl rounded-[28px] border border-red-500/20 bg-[#07131f] p-6 shadow-2xl">

            <div className="flex items-start justify-between gap-4">

              <div>

                <div className="text-[8px] font-black uppercase tracking-[.2em] text-red-400">
                  İADE MERKEZİ
                </div>

                <div className="mt-2 text-xl font-black">
                  Kısmi / Tam İade
                </div>

                <div className="mt-1 text-[9px] text-slate-500">
                  {refundPayment.provider ===
                  "iyzico"
                    ? "Gerçek iyzico provider iadesi yapılacaktır."
                    : "Manuel tahsilat finans kayıtlarından düşülecektir."}
                </div>

              </div>


              <button
                type="button"
                onClick={() =>
                  setRefundPayment(
                    null
                  )
                }
                className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-slate-400"
              >
                <FaTimes />
              </button>

            </div>


            <div className="mt-6 grid grid-cols-2 gap-3">

              <MiniMetric
                label="Ödeme"
                value={money(
                  refundPayment.amount,
                  refundPayment.currency
                )}
              />

              <MiniMetric
                label="İade Edilebilir"
                value={money(
                  refundableAmount(
                    refundPayment
                  ),
                  refundPayment.currency
                )}
              />

            </div>


            <label className="mt-5 block">

              <span className="mb-1.5 block text-[8px] font-black uppercase text-slate-500">
                İade Tutarı
              </span>

              <input
                type="number"
                min="0"
                max={
                  refundableAmount(
                    refundPayment
                  )
                }
                value={
                  refundAmount
                }
                onChange={(
                  event
                ) =>
                  setRefundAmount(
                    event.target.value
                  )
                }
                className="h-12 w-full rounded-xl border border-white/10 bg-white/[.025] px-4 text-xs font-black outline-none"
              />

            </label>


            <label className="mt-4 block">

              <span className="mb-1.5 block text-[8px] font-black uppercase text-slate-500">
                İade Sebebi
              </span>

              <textarea
                value={
                  refundReason
                }
                onChange={(
                  event
                ) =>
                  setRefundReason(
                    event.target.value
                  )
                }
                placeholder="Müşteri iptali, fazla tahsilat, operasyon değişikliği..."
                className="min-h-24 w-full resize-none rounded-xl border border-white/10 bg-white/[.025] p-4 text-xs outline-none"
              />

            </label>


            <div className="mt-5 flex items-start gap-3 rounded-xl border border-red-500/15 bg-red-500/[.04] p-4">

              <FaExclamationTriangle className="mt-0.5 shrink-0 text-red-400" />

              <div className="text-[8px] leading-5 text-slate-400">
                İade işlemi finansal kayıt oluşturur. iyzico ödemelerinde provider başarılı cevap vermeden rezervasyon tahsilatı azaltılmaz.
              </div>

            </div>


            <button
              type="button"
              disabled={
                saving
              }
              onClick={() =>
                void processRefund()
              }
              className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-red-500 text-xs font-black"
            >
              <FaUndo />

              {saving
                ? "İade işleniyor..."
                : "İadeyi Gerçekleştir"}
            </button>

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
    <div className={`min-w-[120px] rounded-xl border px-4 py-3 ${
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


function MoneyChannel({
  icon,
  label,
  value,
  count,
}: {
  icon:
    React.ReactNode;
  label: string;
  value: string;
  count: number;
}) {

  return (
    <div className="rounded-[24px] border border-white/10 bg-[#07131f] p-5">

      <div className="flex items-start justify-between gap-4">

        <div>

          <div className="text-[8px] font-black uppercase tracking-[.14em] text-slate-600">
            {label}
          </div>

          <div className="mt-3 text-xl font-black">
            {value}
          </div>

          <div className="mt-2 text-[8px] text-slate-500">
            {count} tahsilat
          </div>

        </div>


        <div className="grid h-10 w-10 place-items-center rounded-xl bg-orange-500/10 text-orange-400">
          {icon}
        </div>

      </div>

    </div>
  );
}


function MiniMetric({
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

      <div className="mt-1 text-sm font-black">
        {value}
      </div>

    </div>
  );
}
