"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import {
  FaArrowLeft,
  FaCreditCard,
  FaMoneyBillWave,
  FaRedoAlt,
  FaSearch,
  FaUndoAlt,
} from "react-icons/fa";

import {
  supabase,
} from "@/lib/supabase";

import {
  getCurrentMembership,
} from "@/lib/current-user";


type Payment = {
  id: string;
  booking_id: string;

  payment_type: string;
  payment_method: string;

  amount: number;
  currency: string;

  provider: string;

  provider_reference:
    string | null;

  provider_payment_id:
    string | null;

  provider_transaction_id:
    string | null;

  status: string;

  paid_at: string | null;

  created_at: string;
};


type Booking = {
  id: string;
  booking_code: string;
  customer_name: string;
  sale_total: number;
  paid_total: number;
  payment_status: string;
};


function money(
  value:
    number |
    null |
    undefined,
  currency = "TRY"
) {

  return new Intl.NumberFormat(
    "tr-TR",
    {
      style:
        "currency",

      currency,

      maximumFractionDigits:
        2,
    }
  ).format(
    Number(
      value ??
      0
    )
  );

}


export default function ActivityPaymentCenter() {

  const [
    companyId,
    setCompanyId,
  ] =
    useState("");


  const [
    payments,
    setPayments,
  ] =
    useState<Payment[]>(
      []
    );


  const [
    bookings,
    setBookings,
  ] =
    useState<Booking[]>(
      []
    );


  const [
    summary,
    setSummary,
  ] =
    useState<Record<
      string,
      number
    >>({});


  const [
    query,
    setQuery,
  ] =
    useState("");


  const [
    loading,
    setLoading,
  ] =
    useState(true);


  const [
    error,
    setError,
  ] =
    useState("");


  async function load(
    cid: string
  ) {

    setLoading(
      true
    );

    setError("");


    const [
      paymentResult,
      bookingResult,
      summaryResult,
    ] =
      await Promise.all([
        supabase
          .from(
            "activity_os_payments"
          )
          .select(
            "id,booking_id,payment_type,payment_method,amount,currency,provider,provider_reference,provider_payment_id,provider_transaction_id,status,paid_at,created_at"
          )
          .eq(
            "company_id",
            cid
          )
          .order(
            "created_at",
            {
              ascending:
                false,
            }
          )
          .limit(
            500
          ),

        supabase
          .from(
            "activity_os_bookings"
          )
          .select(
            "id,booking_code,customer_name,sale_total,paid_total,payment_status"
          )
          .eq(
            "company_id",
            cid
          ),

        supabase.rpc(
          "get_activity_os_payment_dashboard",
          {
            p_company_id:
              cid,
          }
        ),
      ]);


    if (
      paymentResult.error
    ) {

      setError(
        paymentResult.error.message
      );

      setLoading(
        false
      );

      return;

    }


    setPayments(
      (
        paymentResult.data ??
        []
      ) as Payment[]
    );


    setBookings(
      (
        bookingResult.data ??
        []
      ) as Booking[]
    );


    setSummary(
      (
        summaryResult.data ??
        {}
      ) as Record<
        string,
        number
      >
    );


    setLoading(
      false
    );

  }


  useEffect(
    () => {

      async function init() {

        const {
          data: {
            user,
          },
        } =
          await supabase.auth.getUser();


        if (
          !user
        ) {

          window.location.href =
            "/giris?next=/dashboard/activity-payment-center";

          return;

        }


        const membership =
          await getCurrentMembership(
            user.id
          );


        if (
          !membership
        ) {

          setError(
            "Aktif şirket üyeliği bulunamadı."
          );

          setLoading(
            false
          );

          return;

        }


        setCompanyId(
          membership.company_id
        );


        await load(
          membership.company_id
        );

      }


      void init();

    },
    []
  );


  useEffect(
    () => {

      if (
        !companyId
      ) {
        return;
      }


      const channel =
        supabase
          .channel(
            `activity-payments-${companyId}`
          )
          .on(
            "postgres_changes",
            {
              event:
                "*",

              schema:
                "public",

              table:
                "activity_os_payments",

              filter:
                `company_id=eq.${companyId}`,
            },
            () => {
              void load(
                companyId
              );
            }
          )
          .subscribe();


      return () => {
        void supabase.removeChannel(
          channel
        );
      };

    },
    [
      companyId,
    ]
  );


  const bookingMap =
    useMemo(
      () =>
        new Map(
          bookings.map(
            (
              booking
            ) => [
              booking.id,
              booking,
            ]
          )
        ),
      [
        bookings,
      ]
    );


  const filtered =
    useMemo(
      () => {

        const normalized =
          query
            .trim()
            .toLocaleLowerCase(
              "tr-TR"
            );


        if (
          !normalized
        ) {
          return payments;
        }


        return payments.filter(
          (
            payment
          ) => {

            const booking =
              bookingMap.get(
                payment.booking_id
              );


            return [
              booking?.booking_code,
              booking?.customer_name,
              payment.provider_reference,
              payment.provider_payment_id,
            ]
              .filter(Boolean)
              .some(
                (
                  value
                ) =>
                  String(
                    value
                  )
                    .toLocaleLowerCase(
                      "tr-TR"
                    )
                    .includes(
                      normalized
                    )
              );

          }
        );

      },
      [
        payments,
        bookingMap,
        query,
      ]
    );


  async function refund(
    payment: Payment
  ) {

    if (
      payment.payment_type !==
        "collection" ||
      payment.provider !==
        "iyzico" ||
      payment.status !==
        "paid"
    ) {

      window.alert(
        "Bu işlem online iade için uygun değil."
      );

      return;

    }


    const value =
      window.prompt(
        `İade edilecek tutarı yazın. Maksimum işlem tutarı: ${money(
          payment.amount,
          payment.currency
        )}`,
        String(
          payment.amount
        )
      );


    if (
      !value
    ) {
      return;
    }


    const amount =
      Number(
        value.replace(
          ",",
          "."
        )
      );


    if (
      !Number.isFinite(
        amount
      ) ||
      amount <= 0
    ) {

      window.alert(
        "Geçerli bir tutar girin."
      );

      return;

    }


    const reason =
      window.prompt(
        "İade açıklaması / nedeni",
        ""
      ) ||
      "";


    const {
      data:
        sessionData,
    } =
      await supabase.auth.getSession();


    const response =
      await fetch(
        "/api/activity-payments/iyzico/refund",
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json",

            "Authorization":
              `Bearer ${sessionData.session?.access_token ?? ""}`,
          },

          body:
            JSON.stringify({
              paymentId:
                payment.id,

              amount,

              reason,
            }),
        }
      );


    const result =
      await response.json();


    if (
      !response.ok
    ) {

      window.alert(
        result.error ||
        "İade başarısız."
      );

      return;

    }


    window.alert(
      "İade işlemi başarıyla gerçekleştirildi."
    );


    await load(
      companyId
    );

  }


  if (
    loading
  ) {

    return (
      <div className="min-h-screen bg-slate-950 p-6 text-white">

        <div className="mx-auto max-w-[1500px]">

          <div className="h-40 animate-pulse rounded-3xl bg-white/[.04]" />

          <div className="mt-5 h-96 animate-pulse rounded-3xl bg-white/[.04]" />

        </div>

      </div>
    );

  }


  return (
    <main className="min-h-screen bg-slate-950 p-4 text-white md:p-6">

      <div className="mx-auto max-w-[1500px]">

        <div className="rounded-[30px] border border-white/10 bg-gradient-to-r from-orange-500/10 via-slate-950 to-emerald-500/[.06] p-6">

          <Link
            href="/dashboard/activity-os"
            className="inline-flex items-center gap-2 text-xs font-black text-slate-500 hover:text-white"
          >
            <FaArrowLeft />
            Activity OS
          </Link>


          <div className="mt-5 flex flex-wrap items-end justify-between gap-5">

            <div>

              <div className="text-[10px] font-black uppercase tracking-[.2em] text-orange-400">
                ACTIVITY OS · FİNANS
              </div>

              <h1 className="mt-2 text-3xl font-black md:text-4xl">
                Ödeme & Tahsilat Merkezi
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-400">
                Nakit, manuel ve online ödemeleri; kalan bakiyeleri, iyzico işlemlerini ve iadeleri tek merkezden takip edin.
              </p>

            </div>


            <button
              type="button"
              onClick={() =>
                void load(
                  companyId
                )
              }
              className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-xs font-black"
            >
              <FaRedoAlt />
              Yenile
            </button>

          </div>

        </div>


        {error && (

          <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>

        )}


        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">

          <Metric
            label="Bugün Tahsilat"
            value={money(
              summary.today_collected
            )}
          />

          <Metric
            label="Bugün İade"
            value={money(
              summary.today_refunded
            )}
          />

          <Metric
            label="Online Tahsilat"
            value={money(
              summary.online_collected
            )}
          />

          <Metric
            label="Kalan Alacak"
            value={money(
              summary.outstanding
            )}
          />

          <Metric
            label="Bekleyen Ödeme"
            value={String(
              summary.pending_payments ??
              0
            )}
          />

        </div>


        <div className="mt-6 rounded-[28px] border border-white/10 bg-white/[.03] p-5">

          <div className="flex flex-wrap items-center justify-between gap-4">

            <div>

              <div className="text-xl font-black">
                Ödeme Hareketleri
              </div>

              <div className="mt-1 text-xs text-slate-500">
                Tüm ödeme ve iade geçmişi
              </div>

            </div>


            <label className="relative w-full max-w-sm">

              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />

              <input
                value={
                  query
                }
                onChange={(event) =>
                  setQuery(
                    event.target.value
                  )
                }
                placeholder="Rezervasyon, misafir, ödeme no..."
                className="w-full rounded-xl border border-white/10 bg-slate-950 py-3 pl-11 pr-4 text-sm outline-none"
              />

            </label>

          </div>


          <div className="mt-5 overflow-x-auto">

            <table className="w-full min-w-[1100px] text-left">

              <thead className="text-[9px] font-black uppercase tracking-[.12em] text-slate-600">

                <tr>

                  <th className="p-3">
                    Rezervasyon
                  </th>

                  <th className="p-3">
                    Misafir
                  </th>

                  <th className="p-3">
                    Tür
                  </th>

                  <th className="p-3">
                    Yöntem
                  </th>

                  <th className="p-3">
                    Tutar
                  </th>

                  <th className="p-3">
                    Sağlayıcı
                  </th>

                  <th className="p-3">
                    Durum
                  </th>

                  <th className="p-3">
                    Tarih
                  </th>

                  <th className="p-3">
                    İşlem
                  </th>

                </tr>

              </thead>


              <tbody>

                {filtered.map(
                  (
                    payment
                  ) => {

                    const booking =
                      bookingMap.get(
                        payment.booking_id
                      );


                    return (

                      <tr
                        key={
                          payment.id
                        }
                        className="border-t border-white/10"
                      >

                        <td className="p-3 text-xs font-black">
                          {booking?.booking_code ??
                            "-"}
                        </td>

                        <td className="p-3 text-xs">
                          {booking?.customer_name ??
                            "-"}
                        </td>

                        <td className="p-3 text-xs">
                          {payment.payment_type ===
                          "refund"
                            ? "İade"
                            : "Tahsilat"}
                        </td>

                        <td className="p-3 text-xs">
                          {payment.payment_method}
                        </td>

                        <td className={`p-3 text-sm font-black ${
                          payment.payment_type ===
                          "refund"
                            ? "text-red-300"
                            : "text-emerald-300"
                        }`}>
                          {payment.payment_type ===
                          "refund"
                            ? "-"
                            : "+"}
                          {money(
                            payment.amount,
                            payment.currency
                          )}
                        </td>

                        <td className="p-3 text-xs">
                          {payment.provider}
                        </td>

                        <td className="p-3">

                          <span className={`rounded-full px-3 py-1.5 text-[9px] font-black ${
                            payment.status ===
                            "paid"
                              ? "bg-emerald-500/10 text-emerald-300"
                              : payment.status ===
                                "failed"
                                ? "bg-red-500/10 text-red-300"
                                : payment.status ===
                                  "refunded"
                                  ? "bg-orange-500/10 text-orange-300"
                                  : "bg-white/[.05] text-slate-400"
                          }`}>
                            {payment.status}
                          </span>

                        </td>

                        <td className="p-3 text-[10px] text-slate-500">
                          {new Date(
                            payment.paid_at ||
                            payment.created_at
                          ).toLocaleString(
                            "tr-TR"
                          )}
                        </td>

                        <td className="p-3">

                          {payment.provider ===
                            "iyzico" &&
                          payment.payment_type ===
                            "collection" &&
                          payment.status ===
                            "paid" && (

                            <button
                              type="button"
                              onClick={() =>
                                void refund(
                                  payment
                                )
                              }
                              className="flex items-center gap-2 rounded-xl border border-orange-500/20 bg-orange-500/10 px-3 py-2 text-[10px] font-black text-orange-300"
                            >
                              <FaUndoAlt />
                              İade
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

      </div>

    </main>
  );

}


function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[.03] p-5">

      <div className="text-[9px] font-black uppercase tracking-[.13em] text-slate-500">
        {label}
      </div>

      <div className="mt-3 text-2xl font-black">
        {value}
      </div>

    </div>
  );

}
