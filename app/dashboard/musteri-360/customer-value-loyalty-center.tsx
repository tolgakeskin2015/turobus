"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FaBullseye,
  FaCalendarAlt,
  FaChartLine,
  FaCoins,
  FaExchangeAlt,
  FaHistory,
  FaRedo,
  FaStar,
  FaSuitcase,
  FaWallet,
} from "react-icons/fa";

import {
  loadCustomer360FinanceHistory,
  loadCustomer360QuoteHistory,
  loadCustomer360ReservationHistory,
} from "@/lib/customer-360/repository";


type Props = {
  companyId:
    string;

  customerId:
    string;
};


type ReservationRow =
  Awaited<
    ReturnType<
      typeof loadCustomer360ReservationHistory
    >
  >[number];


type FinanceRow =
  Awaited<
    ReturnType<
      typeof loadCustomer360FinanceHistory
    >
  >[number];


function normalizedCurrency(
  value:
    string | null | undefined
) {
  const currency =
    value
      ?.trim()
      .toUpperCase();

  return currency ||
    "BELİRSİZ";
}


function addCurrencyAmount(
  map:
    Map<string, number>,
  currency:
    string | null | undefined,
  amount:
    number | null | undefined,
  multiplier =
    1
) {
  if (
    amount ===
      null ||
    amount ===
      undefined
  ) {
    return;
  }


  const numeric =
    Number(
      amount
    );


  if (
    !Number.isFinite(
      numeric
    )
  ) {
    return;
  }


  const key =
    normalizedCurrency(
      currency
    );


  map.set(
    key,
    (
      map.get(
        key
      ) ??
      0
    ) +
    (
      numeric *
      multiplier
    )
  );
}


function money(
  value:
    number,
  currency:
    string
) {
  if (
    currency ===
      "BELİRSİZ"
  ) {
    return `${value.toLocaleString(
      "tr-TR"
    )} para birimi belirsiz`;
  }


  try {
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
      value
    );

  } catch {
    return `${value.toLocaleString(
      "tr-TR"
    )} ${currency}`;
  }
}


function formatDate(
  value:
    string | null
) {
  if (!value) {
    return "—";
  }


  const date =
    new Date(
      value
    );


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
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
    date
  );
}


function reservationKey(
  row:
    ReservationRow
) {
  if (
    row.source_table &&
    row.source_id
  ) {
    return `${row.source_table}:${row.source_id}`;
  }


  return [
    row.entity_type,
    row.entity_id ??
      row.entity_key ??
      row.id,
  ].join(
    ":"
  );
}


function validDate(
  value:
    string | null
) {
  if (!value) {
    return null;
  }


  const date =
    new Date(
      value
    );


  return Number.isNaN(
    date.getTime()
  )
    ? null
    : date;
}


export default function CustomerValueLoyaltyCenter({
  companyId,
  customerId,
}: Props) {
  const [
    reservations,
    setReservations,
  ] =
    useState<
      ReservationRow[]
    >(
      []
    );


  const [
    finance,
    setFinance,
  ] =
    useState<
      FinanceRow[]
    >(
      []
    );


  const [
    quoteCount,
    setQuoteCount,
  ] =
    useState(
      0
    );


  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    );


  const [
    error,
    setError,
  ] =
    useState("");


  useEffect(() => {
    let active =
      true;


    void (
      async () => {
        setLoading(
          true
        );

        setError("");


        try {
          const [
            reservationResult,
            financeResult,
            quoteResult,
          ] =
            await Promise.all(
              [
                loadCustomer360ReservationHistory(
                  companyId,
                  customerId
                ),

                loadCustomer360FinanceHistory(
                  companyId,
                  customerId
                ),

                loadCustomer360QuoteHistory(
                  companyId,
                  customerId
                ),
              ]
            );


          if (!active) {
            return;
          }


          setReservations(
            reservationResult
          );

          setFinance(
            financeResult
          );

          setQuoteCount(
            quoteResult.length
          );

        } catch (
          currentError
        ) {
          if (!active) {
            return;
          }


          setError(
            currentError instanceof
              Error
              ? currentError.message
              : String(
                  currentError
                )
          );

        } finally {
          if (active) {
            setLoading(
              false
            );
          }
        }
      }
    )();


    return () => {
      active =
        false;
    };

  }, [
    companyId,
    customerId,
  ]);


  const bookingRows =
    useMemo(
      () => {
        const unique =
          new Map<
            string,
            ReservationRow
          >();


        for (
          const row of
          reservations
        ) {
          if (
            row.entity_type ===
              "trip"
          ) {
            continue;
          }


          const key =
            reservationKey(
              row
            );


          if (
            !unique.has(
              key
            )
          ) {
            unique.set(
              key,
              row
            );
          }
        }


        return Array.from(
          unique.values()
        );

      },
      [
        reservations,
      ]
    );


  const tripCount =
    useMemo(
      () =>
        new Set(
          reservations
            .filter(
              (
                row
              ) =>
                row.entity_type ===
                "trip"
            )
            .map(
              (
                row
              ) =>
                reservationKey(
                  row
                )
            )
        ).size,
      [
        reservations,
      ]
    );


  const bookingDates =
    useMemo(
      () =>
        bookingRows
          .map(
            (
              row
            ) =>
              validDate(
                row.occurred_at
              )
          )
          .filter(
            (
              value
            ):
              value is Date =>
                value !==
                null
          )
          .sort(
            (
              a,
              b
            ) =>
              a.getTime() -
              b.getTime()
          ),
      [
        bookingRows,
      ]
    );


  const firstBooking =
    bookingDates[0] ??
    null;


  const lastBooking =
    bookingDates[
      bookingDates.length -
      1
    ] ??
    null;


  const daysSinceLastBooking =
    lastBooking
      ? Math.max(
          0,
          Math.floor(
            (
              Date.now() -
              lastBooking.getTime()
            ) /
            86400000
          )
        )
      : null;


  const bookingsLast365 =
    useMemo(
      () => {
        const limit =
          Date.now() -
          (
            365 *
            86400000
          );


        return bookingRows.filter(
          (
            row
          ) => {
            const date =
              validDate(
                row.occurred_at
              );


            return Boolean(
              date &&
              date.getTime() >=
                limit
            );
          }
        ).length;

      },
      [
        bookingRows,
      ]
    );


  const payments =
    useMemo(
      () =>
        finance.filter(
          (
            row
          ) =>
            row.entity_type ===
            "payment"
        ),
      [
        finance,
      ]
    );


  const refunds =
    useMemo(
      () =>
        finance.filter(
          (
            row
          ) =>
            row.entity_type ===
            "refund"
        ),
      [
        finance,
      ]
    );


  const values =
    useMemo(
      () => {
        const paid =
          new Map<
            string,
            number
          >();

        const refunded =
          new Map<
            string,
            number
          >();

        const net =
          new Map<
            string,
            number
          >();

        const bookingVolume =
          new Map<
            string,
            number
          >();


        for (
          const row of
          payments
        ) {
          addCurrencyAmount(
            paid,
            row.currency,
            row.amount
          );

          addCurrencyAmount(
            net,
            row.currency,
            row.amount
          );
        }


        for (
          const row of
          refunds
        ) {
          addCurrencyAmount(
            refunded,
            row.currency,
            row.amount
          );

          addCurrencyAmount(
            net,
            row.currency,
            row.amount,
            -1
          );
        }


        for (
          const row of
          bookingRows
        ) {
          addCurrencyAmount(
            bookingVolume,
            row.currency,
            row.amount
          );
        }


        const currencies =
          Array.from(
            new Set(
              [
                ...paid.keys(),
                ...refunded.keys(),
                ...net.keys(),
                ...bookingVolume.keys(),
              ]
            )
          ).sort();


        return {
          paid,
          refunded,
          net,
          bookingVolume,
          currencies,
        };

      },
      [
        bookingRows,
        payments,
        refunds,
      ]
    );


  const loyaltyState =
    useMemo(
      () => {
        const count =
          bookingRows.length;


        if (
          count ===
            0
        ) {
          return {
            label:
              "Yeni / Seyahat Yok",

            detail:
              "Henüz bağlı rezervasyon kaydı yok.",

            className:
              "border-white/10 bg-white/[.03] text-slate-400",
          };
        }


        if (
          count ===
            1
        ) {
          return {
            label:
              "İlk Rezervasyon",

            detail:
              "İkinci satış için takip edilebilir.",

            className:
              "border-blue-500/20 bg-blue-500/[.06] text-blue-300",
          };
        }


        if (
          count <=
            3
        ) {
          return {
            label:
              "Tekrar Gelen Sinyali",

            detail:
              "Birden fazla gerçek rezervasyon bağlantısı var.",

            className:
              "border-emerald-500/20 bg-emerald-500/[.06] text-emerald-300",
          };
        }


        return {
          label:
            "Sadık Müşteri Sinyali",

          detail:
            "Dört veya daha fazla gerçek rezervasyon bağlantısı var.",

          className:
            "border-amber-500/20 bg-amber-500/[.07] text-amber-300",
        };

      },
      [
        bookingRows.length,
      ]
    );


  const signals =
    useMemo(
      () => {
        const result:
          {
            title:
              string;

            detail:
              string;

            tone:
              "normal" |
              "good" |
              "attention";
          }[] = [];


        if (
          bookingRows.length ===
            0
        ) {
          result.push(
            {
              title:
                "İlk satış fırsatı",

              detail:
                "Bu müşteri için henüz bağlı rezervasyon bulunmuyor.",

              tone:
                "normal",
            }
          );
        }


        if (
          bookingRows.length ===
            1
        ) {
          result.push(
            {
              title:
                "İkinci rezervasyon takibi",

              detail:
                "Müşterinin bir gerçek rezervasyon geçmişi var; tekrar satış için manuel takip yapılabilir.",

              tone:
                "good",
            }
          );
        }


        if (
          bookingRows.length >=
            2
        ) {
          result.push(
            {
              title:
                "Tekrar rezervasyon geçmişi",

              detail:
                `${bookingRows.length} benzersiz rezervasyon bağlantısı mevcut.`,

              tone:
                "good",
            }
          );
        }


        if (
          daysSinceLastBooking !==
            null &&
          daysSinceLastBooking >=
            180
        ) {
          result.push(
            {
              title:
                "Yeniden temas sinyali",

              detail:
                `Son rezervasyon bağlantısından ${daysSinceLastBooking} gün geçmiş. 180+ gün eşiği nedeniyle takip listesine alınabilir.`,

              tone:
                "attention",
            }
          );
        }


        if (
          quoteCount >
            0
        ) {
          result.push(
            {
              title:
                "Teklif geçmişi mevcut",

              detail:
                `${quoteCount} bağlı paket teklifi mevcut. Yeni satış öncesi geçmiş teklifler incelenebilir.`,

              tone:
                "normal",
            }
          );
        }


        if (
          refunds.length >
            0
        ) {
          result.push(
            {
              title:
                "İade geçmişini kontrol et",

              detail:
                `${refunds.length} bağlı iade kaydı mevcut. Yeni teklif öncesinde geçmiş müşteri deneyimi kontrol edilmeli.`,

              tone:
                "attention",
            }
          );
        }


        return result;

      },
      [
        bookingRows.length,
        daysSinceLastBooking,
        quoteCount,
        refunds.length,
      ]
    );


  if (
    loading
  ) {
    return (
      <section className="rounded-[26px] border border-white/10 bg-[#07131f] p-10 text-center text-[10px] text-slate-600">
        Müşteri değer merkezi yükleniyor...
      </section>
    );
  }


  return (
    <section className="overflow-hidden rounded-[26px] border border-white/10 bg-[#07131f]">

      <div className="border-b border-white/[.07] p-5 lg:p-6">

        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">

          <div>

            <div className="flex items-center gap-2">

              <FaChartLine className="text-orange-300" />

              <h2 className="text-sm font-black">
                Müşteri Değer, Sadakat & Tekrar Satış Merkezi
              </h2>

            </div>


            <p className="mt-2 max-w-3xl text-[9px] leading-5 text-slate-600">
              Gerçek rezervasyon, ödeme, iade ve teklif bağlantılarından müşteri değerini ve tekrar satış sinyallerini üretir. Para birimleri birbirine çevrilmez veya karıştırılmaz.
            </p>

          </div>


          <div
            className={`rounded-xl border px-4 py-3 ${loyaltyState.className}`}
          >

            <div className="text-[7px] font-black uppercase tracking-[.14em] opacity-70">
              Operasyonel Sadakat Sinyali
            </div>

            <div className="mt-1 text-[11px] font-black">
              {loyaltyState.label}
            </div>

          </div>

        </div>


        <div className="mt-5 grid grid-cols-2 gap-2 xl:grid-cols-6">

          <article className="rounded-xl border border-white/[.07] bg-black/20 p-4">

            <div className="flex items-center justify-between">
              <span className="text-[7px] font-black uppercase tracking-[.12em] text-slate-600">
                Rezervasyon
              </span>

              <FaSuitcase className="text-orange-300" />
            </div>

            <div className="mt-2 text-xl font-black">
              {bookingRows.length}
            </div>

          </article>


          <article className="rounded-xl border border-white/[.07] bg-black/20 p-4">

            <div className="flex items-center justify-between">
              <span className="text-[7px] font-black uppercase tracking-[.12em] text-slate-600">
                Son 365 Gün
              </span>

              <FaRedo className="text-emerald-300" />
            </div>

            <div className="mt-2 text-xl font-black">
              {bookingsLast365}
            </div>

          </article>


          <article className="rounded-xl border border-white/[.07] bg-black/20 p-4">

            <div className="flex items-center justify-between">
              <span className="text-[7px] font-black uppercase tracking-[.12em] text-slate-600">
                Seyahat
              </span>

              <FaHistory className="text-blue-300" />
            </div>

            <div className="mt-2 text-xl font-black">
              {tripCount}
            </div>

          </article>


          <article className="rounded-xl border border-white/[.07] bg-black/20 p-4">

            <div className="flex items-center justify-between">
              <span className="text-[7px] font-black uppercase tracking-[.12em] text-slate-600">
                Teklif
              </span>

              <FaBullseye className="text-violet-300" />
            </div>

            <div className="mt-2 text-xl font-black">
              {quoteCount}
            </div>

          </article>


          <article className="rounded-xl border border-white/[.07] bg-black/20 p-4">

            <div className="flex items-center justify-between">
              <span className="text-[7px] font-black uppercase tracking-[.12em] text-slate-600">
                İlk Rezervasyon
              </span>

              <FaCalendarAlt className="text-slate-400" />
            </div>

            <div className="mt-2 text-[10px] font-black">
              {formatDate(
                firstBooking
                  ?.toISOString() ??
                  null
              )}
            </div>

          </article>


          <article className="rounded-xl border border-white/[.07] bg-black/20 p-4">

            <div className="flex items-center justify-between">
              <span className="text-[7px] font-black uppercase tracking-[.12em] text-slate-600">
                Son Rezervasyon
              </span>

              <FaStar className="text-amber-300" />
            </div>

            <div className="mt-2 text-[10px] font-black">
              {formatDate(
                lastBooking
                  ?.toISOString() ??
                  null
              )}
            </div>

            {daysSinceLastBooking !==
              null && (
              <div className="mt-1 text-[7px] font-bold text-slate-600">
                {daysSinceLastBooking} gün önce
              </div>
            )}

          </article>

        </div>

      </div>


      {error && (
        <div className="border-b border-red-500/10 bg-red-500/[.05] px-5 py-4 text-[9px] font-bold text-red-300">
          {error}
        </div>
      )}


      <div className="grid gap-5 p-5 xl:grid-cols-[1.1fr_.9fr]">

        <div className="overflow-hidden rounded-2xl border border-white/[.07] bg-black/20">

          <div className="flex items-center justify-between border-b border-white/[.06] px-4 py-4">

            <div>

              <div className="flex items-center gap-2 text-[10px] font-black">

                <FaCoins className="text-orange-300" />

                Para Birimi Bazlı Müşteri Değeri

              </div>

              <div className="mt-1 text-[8px] text-slate-600">
                Tahsilat, iade, net değer ve rezervasyon hacmi ayrı para birimlerinde tutulur.
              </div>

            </div>

          </div>


          {values.currencies.length ===
          0 ? (
            <div className="p-10 text-center text-[9px] leading-5 text-slate-600">
              Tutar içeren bağlı rezervasyon veya finans kaydı bulunmuyor.
            </div>
          ) : (
            <div className="max-h-[420px] overflow-auto">

              <table className="min-w-[780px] w-full">

                <thead className="sticky top-0 z-10 bg-[#091725]">

                  <tr className="border-b border-white/[.07] text-left text-[7px] font-black uppercase tracking-[.12em] text-slate-600">

                    <th className="px-4 py-3">
                      Para Birimi
                    </th>

                    <th className="px-4 py-3">
                      Tahsilat
                    </th>

                    <th className="px-4 py-3">
                      İade
                    </th>

                    <th className="px-4 py-3">
                      Net Müşteri Değeri
                    </th>

                    <th className="px-4 py-3">
                      Rezervasyon Hacmi
                    </th>

                  </tr>

                </thead>


                <tbody>

                  {values.currencies.map(
                    (
                      currency
                    ) => (
                      <tr
                        key={
                          currency
                        }
                        className="border-b border-white/[.045] hover:bg-white/[.02]"
                      >

                        <td className="px-4 py-4">
                          <span className="rounded-lg border border-white/10 bg-white/[.03] px-2.5 py-1 text-[8px] font-black">
                            {currency}
                          </span>
                        </td>


                        <td className="px-4 py-4 text-[9px] font-black text-emerald-300">
                          {money(
                            values.paid.get(
                              currency
                            ) ??
                              0,
                            currency
                          )}
                        </td>


                        <td className="px-4 py-4 text-[9px] font-black text-red-300">
                          {money(
                            values.refunded.get(
                              currency
                            ) ??
                              0,
                            currency
                          )}
                        </td>


                        <td className="px-4 py-4 text-[10px] font-black text-orange-300">
                          {money(
                            values.net.get(
                              currency
                            ) ??
                              0,
                            currency
                          )}
                        </td>


                        <td className="px-4 py-4 text-[9px] font-black text-slate-300">
                          {money(
                            values.bookingVolume.get(
                              currency
                            ) ??
                              0,
                            currency
                          )}
                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>
          )}

        </div>


        <div className="rounded-2xl border border-white/[.07] bg-black/20 p-4">

          <div className="flex items-center gap-2">

            <FaExchangeAlt className="text-orange-300" />

            <div className="text-[10px] font-black">
              Tekrar Satış Sinyalleri
            </div>

          </div>


          <div className="mt-1 text-[8px] leading-4 text-slate-600">
            Bu alan yapay satış tahmini değildir. Yalnızca gerçek Customer 360 kayıtlarından türetilen operasyonel takip sinyalleridir.
          </div>


          <div className="mt-4 space-y-2">

            {signals.map(
              (
                signal,
                index
              ) => (
                <article
                  key={`${signal.title}-${index}`}
                  className={`rounded-xl border p-4 ${
                    signal.tone ===
                    "good"
                      ? "border-emerald-500/10 bg-emerald-500/[.035]"
                      : signal.tone ===
                          "attention"
                        ? "border-amber-500/10 bg-amber-500/[.035]"
                        : "border-white/[.07] bg-[#030a11]"
                  }`}
                >

                  <div className="text-[9px] font-black">
                    {signal.title}
                  </div>

                  <div className="mt-1 text-[8px] leading-5 text-slate-500">
                    {signal.detail}
                  </div>

                </article>
              )
            )}

          </div>


          <div className="mt-4 rounded-xl border border-blue-500/10 bg-blue-500/[.035] p-4">

            <div className="flex items-center gap-2 text-[8px] font-black text-blue-300">

              <FaWallet />

              Segment Güvenliği

            </div>

            <div className="mt-2 text-[8px] leading-5 text-blue-200/60">
              Buradaki sadakat sınıfı yalnızca ekranda hesaplanan operasyonel sinyaldir. Customer 360 müşteri segmentini otomatik değiştirmez.
            </div>

          </div>

        </div>

      </div>

    </section>
  );
}
