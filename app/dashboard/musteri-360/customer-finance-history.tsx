"use client";

import Link from "next/link";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FaArrowDown,
  FaArrowUp,
  FaExchangeAlt,
  FaFileInvoiceDollar,
  FaSearch,
  FaTicketAlt,
  FaWallet,
} from "react-icons/fa";

import {
  loadCustomer360FinanceHistory,
} from "@/lib/customer-360/repository";

import type {
  Customer360FinanceHistoryRow,
} from "@/lib/customer-360/repository";


type Props = {
  companyId: string;
  customerId: string;
};


const typeLabels:
  Record<
    string,
    string
  > = {
    payment:
      "Ödeme",

    refund:
      "İade",

    voucher:
      "Voucher",
  };


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
    return value;
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
    date
  );
}


function money(
  value:
    number | null,
  currency:
    string | null
) {
  if (
    value === null ||
    value === undefined
  ) {
    return "—";
  }

  try {
    return new Intl.NumberFormat(
      "tr-TR",
      {
        style:
          "currency",

        currency:
          currency ||
          "TRY",

        maximumFractionDigits:
          0,
      }
    ).format(
      Number(
        value
      )
    );

  } catch {
    return `${Number(
      value
    ).toLocaleString(
      "tr-TR"
    )} ${currency || "TRY"}`;
  }
}


function typeClass(
  type:
    string
) {
  if (
    type ===
      "payment"
  ) {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
  }

  if (
    type ===
      "refund"
  ) {
    return "border-red-500/20 bg-red-500/10 text-red-300";
  }

  return "border-violet-500/20 bg-violet-500/10 text-violet-300";
}


function typeIcon(
  type:
    string
) {
  if (
    type ===
      "payment"
  ) {
    return <FaArrowDown />;
  }

  if (
    type ===
      "refund"
  ) {
    return <FaArrowUp />;
  }

  return <FaTicketAlt />;
}


function moduleHref(
  row:
    Customer360FinanceHistoryRow
) {
  if (
    row.entity_type ===
      "voucher"
  ) {
    return "/dashboard/package-os/vouchers";
  }

  if (
    row.entity_type ===
      "payment"
  ) {
    return "/dashboard/package-os/payments";
  }

  if (
    row.entity_type ===
      "refund"
  ) {
    return "/dashboard/package-os/finance";
  }

  return null;
}


export default function CustomerFinanceHistory({
  companyId,
  customerId,
}: Props) {
  const [
    rows,
    setRows,
  ] =
    useState<
      Customer360FinanceHistoryRow[]
    >(
      []
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


  const [
    search,
    setSearch,
  ] =
    useState("");


  const [
    typeFilter,
    setTypeFilter,
  ] =
    useState(
      "all"
    );


  useEffect(() => {
    let active =
      true;


    void (
      async () => {
        setLoading(
          true
        );

        try {
          const result =
            await loadCustomer360FinanceHistory(
              companyId,
              customerId
            );

          if (active) {
            setRows(
              result
            );
          }

        } catch (
          currentError
        ) {
          if (active) {
            setError(
              currentError instanceof
                Error
                ? currentError.message
                : String(
                    currentError
                  )
            );
          }

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


  const filtered =
    useMemo(
      () => {
        const needle =
          search
            .trim()
            .toLocaleLowerCase(
              "tr-TR"
            );


        return rows.filter(
          (
            row
          ) => {
            if (
              typeFilter !==
                "all" &&
              row.entity_type !==
                typeFilter
            ) {
              return false;
            }


            if (!needle) {
              return true;
            }


            return [
              row.title,
              row.entity_type,
              row.entity_key,
              row.source_table,
              row.source_id,
            ]
              .filter(
                Boolean
              )
              .join(" ")
              .toLocaleLowerCase(
                "tr-TR"
              )
              .includes(
                needle
              );
          }
        );

      },
      [
        rows,
        search,
        typeFilter,
      ]
    );


  const stats =
    useMemo(
      () => {
        const payments =
          rows.filter(
            (
              row
            ) =>
              row.entity_type ===
              "payment"
          );


        const refunds =
          rows.filter(
            (
              row
            ) =>
              row.entity_type ===
              "refund"
          );


        const vouchers =
          rows.filter(
            (
              row
            ) =>
              row.entity_type ===
              "voucher"
          );


        const paid =
          payments.reduce(
            (
              total,
              row
            ) =>
              total +
              Number(
                row.amount ??
                  0
              ),
            0
          );


        const refunded =
          refunds.reduce(
            (
              total,
              row
            ) =>
              total +
              Number(
                row.amount ??
                  0
              ),
            0
          );


        return {
          paid,

          refunded,

          net:
            paid -
            refunded,

          vouchers:
            vouchers.length,

          transactions:
            payments.length +
            refunds.length,
        };

      },
      [
        rows,
      ]
    );


  return (
    <section className="overflow-hidden rounded-[26px] border border-white/10 bg-[#07131f]">

      <div className="border-b border-white/[.07] p-5 lg:p-6">

        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">

          <div>

            <div className="flex items-center gap-2">

              <FaWallet className="text-orange-300" />

              <h2 className="text-sm font-black">
                Ödeme, İade & Voucher Merkezi
              </h2>

            </div>


            <p className="mt-2 max-w-3xl text-[9px] leading-5 text-slate-600">
              Müşteriye bağlı tahsilat, iade ve voucher kayıtlarını tek finans görünümünde izleyin. Bu ekran mevcut finans kayıtlarını değiştirmez.
            </p>

          </div>


          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">

            <div className="rounded-xl border border-emerald-500/10 bg-emerald-500/[.035] px-4 py-3">
              <div className="text-[7px] font-black uppercase tracking-[.12em] text-emerald-600">
                Tahsilat
              </div>

              <div className="mt-1 text-sm font-black text-emerald-300">
                {money(
                  stats.paid,
                  "TRY"
                )}
              </div>
            </div>


            <div className="rounded-xl border border-red-500/10 bg-red-500/[.035] px-4 py-3">
              <div className="text-[7px] font-black uppercase tracking-[.12em] text-red-600">
                İade
              </div>

              <div className="mt-1 text-sm font-black text-red-300">
                {money(
                  stats.refunded,
                  "TRY"
                )}
              </div>
            </div>


            <div className="rounded-xl border border-orange-500/10 bg-orange-500/[.035] px-4 py-3">
              <div className="text-[7px] font-black uppercase tracking-[.12em] text-orange-600">
                Net Tahsilat
              </div>

              <div className="mt-1 text-sm font-black text-orange-300">
                {money(
                  stats.net,
                  "TRY"
                )}
              </div>
            </div>


            <div className="rounded-xl border border-violet-500/10 bg-violet-500/[.035] px-4 py-3">
              <div className="text-[7px] font-black uppercase tracking-[.12em] text-violet-600">
                Voucher
              </div>

              <div className="mt-1 text-lg font-black text-violet-300">
                {stats.vouchers}
              </div>
            </div>


            <div className="rounded-xl border border-white/[.07] bg-black/20 px-4 py-3">
              <div className="text-[7px] font-black uppercase tracking-[.12em] text-slate-600">
                Finans İşlemi
              </div>

              <div className="mt-1 text-lg font-black">
                {stats.transactions}
              </div>
            </div>

          </div>

        </div>


        <div className="mt-5 flex flex-col gap-3 lg:flex-row">

          <div className="relative flex-1">

            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] text-slate-600" />

            <input
              value={
                search
              }
              onChange={(
                event
              ) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="İşlem, voucher, kaynak tablo veya referans ara..."
              className="h-11 w-full rounded-xl border border-white/10 bg-[#030a11] pl-10 pr-4 text-[10px] font-bold outline-none transition focus:border-orange-500/40"
            />

          </div>


          <select
            value={
              typeFilter
            }
            onChange={(
              event
            ) =>
              setTypeFilter(
                event.target.value
              )
            }
            className="h-11 min-w-[220px] rounded-xl border border-white/10 bg-[#030a11] px-4 text-[10px] font-bold outline-none"
          >
            <option value="all">
              Tüm Finans Kayıtları
            </option>

            <option value="payment">
              Ödemeler
            </option>

            <option value="refund">
              İadeler
            </option>

            <option value="voucher">
              Voucherlar
            </option>
          </select>

        </div>

      </div>


      {error && (
        <div className="border-b border-red-500/10 bg-red-500/[.04] p-4 text-[10px] font-bold text-red-300">
          Finans geçmişi yüklenemedi: {error}
        </div>
      )}


      {loading ? (
        <div className="p-12 text-center text-[10px] text-slate-600">
          Finans kayıtları yükleniyor...
        </div>
      ) : filtered.length ===
      0 ? (
        <div className="p-12 text-center">

          <FaFileInvoiceDollar className="mx-auto text-4xl text-slate-800" />

          <div className="mt-4 text-xs font-black">
            Bağlı finans kaydı bulunamadı
          </div>

          <div className="mt-2 text-[9px] text-slate-600">
            Customer 360 ile ilişkilendirilen ödeme, iade ve voucher kayıtları burada görünür.
          </div>

        </div>
      ) : (
        <div className="max-h-[650px] overflow-auto">

          <table className="min-w-[1250px] w-full">

            <thead className="sticky top-0 z-10 bg-[#091725]">

              <tr className="border-b border-white/[.07] text-left text-[8px] font-black uppercase tracking-[.12em] text-slate-600">

                <th className="px-5 py-4">
                  İşlem Tipi
                </th>

                <th className="px-5 py-4">
                  Açıklama
                </th>

                <th className="px-5 py-4">
                  Tarih
                </th>

                <th className="px-5 py-4">
                  Kaynak
                </th>

                <th className="px-5 py-4">
                  Referans
                </th>

                <th className="px-5 py-4 text-right">
                  Tutar
                </th>

                <th className="px-5 py-4 text-right">
                  İşlem
                </th>

              </tr>

            </thead>


            <tbody>

              {filtered.map(
                (
                  row
                ) => {
                  const href =
                    moduleHref(
                      row
                    );


                  return (
                    <tr
                      key={
                        row.id
                      }
                      className="border-b border-white/[.045] transition hover:bg-white/[.02]"
                    >

                      <td className="px-5 py-4">

                        <div className="flex items-center gap-3">

                          <div
                            className={`grid h-10 w-10 place-items-center rounded-xl border ${typeClass(
                              row.entity_type
                            )}`}
                          >
                            {typeIcon(
                              row.entity_type
                            )}
                          </div>


                          <div>

                            <div className="text-[10px] font-black text-slate-300">
                              {typeLabels[
                                row.entity_type
                              ] ||
                                row.entity_type}
                            </div>


                            <div className="mt-1 text-[8px] text-slate-700">
                              Customer 360
                            </div>

                          </div>

                        </div>

                      </td>


                      <td className="px-5 py-4">

                        <div className="max-w-[320px] truncate text-[10px] font-black text-slate-300">
                          {row.title ||
                            "Finans işlemi"}
                        </div>


                        <div className="mt-1 max-w-[320px] truncate text-[8px] text-slate-600">
                          {row.entity_key ||
                            "—"}
                        </div>

                      </td>


                      <td className="px-5 py-4 text-[9px] text-slate-400">
                        {formatDate(
                          row.occurred_at
                        )}
                      </td>


                      <td className="px-5 py-4">

                        <span className="rounded-lg border border-white/[.06] bg-black/20 px-2.5 py-1.5 text-[8px] font-bold text-slate-500">
                          {row.source_table ||
                            "entity_link"}
                        </span>

                      </td>


                      <td className="px-5 py-4">

                        <div className="max-w-[190px] truncate font-mono text-[8px] text-slate-600">
                          {row.source_id ||
                            row.entity_id ||
                            "—"}
                        </div>

                      </td>


                      <td className="px-5 py-4 text-right">

                        <div
                          className={`text-[10px] font-black ${
                            row.entity_type ===
                            "refund"
                              ? "text-red-300"
                              : row.entity_type ===
                                  "payment"
                                ? "text-emerald-300"
                                : "text-slate-300"
                          }`}
                        >
                          {row.entity_type ===
                            "refund" &&
                          row.amount !==
                            null
                            ? "- "
                            : ""}

                          {money(
                            row.amount,
                            row.currency
                          )}
                        </div>

                      </td>


                      <td className="px-5 py-4 text-right">

                        {href ? (
                          <Link
                            href={
                              href
                            }
                            className="inline-flex h-9 items-center gap-2 rounded-lg border border-orange-500/20 bg-orange-500/[.07] px-3 text-[8px] font-black text-orange-300 transition hover:bg-orange-500/10"
                          >
                            Merkezi Aç
                            <FaExchangeAlt />
                          </Link>
                        ) : (
                          <span className="text-[8px] text-slate-700">
                            —
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
      )}

    </section>
  );
}
