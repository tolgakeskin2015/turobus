"use client";

import Link from "next/link";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FaChartLine,
  FaClock,
  FaExternalLinkAlt,
  FaFileInvoiceDollar,
  FaFilter,
  FaSearch,
} from "react-icons/fa";

import {
  loadCustomer360QuoteHistory,
} from "@/lib/customer-360/repository";

import type {
  Customer360QuoteHistoryRow,
} from "@/lib/customer-360/repository";


type Props = {
  companyId: string;
  customerId: string;
};


const statusLabels:
  Record<
    string,
    string
  > = {
    draft: "Taslak",
    sent: "Gönderildi",
    viewed: "Görüntülendi",
    accepted: "Kabul Edildi",
    rejected: "Reddedildi",
    expired: "Süresi Doldu",
    converted: "Rezervasyona Döndü",
    cancelled: "İptal",
  };


function money(
  value:
    number | null
) {
  return new Intl.NumberFormat(
    "tr-TR",
    {
      style: "currency",
      currency: "TRY",
      maximumFractionDigits: 0,
    }
  ).format(
    Number(
      value ??
        0
    )
  );
}


function date(
  value:
    string | null
) {
  if (!value) {
    return "—";
  }

  const parsed =
    new Date(
      value
    );

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "tr-TR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  ).format(
    parsed
  );
}


function statusClass(
  status:
    string
) {
  if (
    status ===
      "accepted" ||
    status ===
      "converted"
  ) {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
  }

  if (
    status ===
      "sent" ||
    status ===
      "viewed"
  ) {
    return "border-blue-500/20 bg-blue-500/10 text-blue-300";
  }

  if (
    status ===
      "rejected" ||
    status ===
      "cancelled"
  ) {
    return "border-red-500/20 bg-red-500/10 text-red-300";
  }

  if (
    status ===
      "expired"
  ) {
    return "border-amber-500/20 bg-amber-500/10 text-amber-300";
  }

  return "border-white/10 bg-white/[.03] text-slate-400";
}


export default function CustomerQuoteHistory({
  companyId,
  customerId,
}: Props) {
  const [
    rows,
    setRows,
  ] =
    useState<
      Customer360QuoteHistoryRow[]
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
    status,
    setStatus,
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
            await loadCustomer360QuoteHistory(
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
            const statusOk =
              status ===
                "all" ||
              row.status ===
                status;

            if (!statusOk) {
              return false;
            }

            if (!needle) {
              return true;
            }

            return [
              row.quote_code,
              row.destination,
              row.package_type,
              row.status,
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
        status,
      ]
    );


  const stats =
    useMemo(
      () => {
        const accepted =
          rows.filter(
            (
              row
            ) =>
              row.status ===
                "accepted" ||
              row.status ===
                "converted"
          );

        return {
          total:
            rows.length,

          accepted:
            accepted.length,

          sales:
            accepted.reduce(
              (
                total,
                row
              ) =>
                total +
                Number(
                  row.sale_price ??
                    0
                ),
              0
            ),

          profit:
            accepted.reduce(
              (
                total,
                row
              ) =>
                total +
                Number(
                  row.gross_profit ??
                    0
                ),
              0
            ),
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
              <FaFileInvoiceDollar className="text-orange-300" />

              <h2 className="text-sm font-black">
                Profesyonel Teklif Geçmişi
              </h2>
            </div>

            <p className="mt-2 text-[9px] leading-5 text-slate-600">
              Customer 360 kimliğine bağlanmış gerçek tekliflerin satış, maliyet, kâr, marj ve durum takibi.
            </p>
          </div>


          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">

            <div className="rounded-xl border border-white/[.07] bg-black/20 px-4 py-3">
              <div className="text-[7px] font-black uppercase tracking-[.12em] text-slate-600">
                Toplam
              </div>
              <div className="mt-1 text-lg font-black">
                {stats.total}
              </div>
            </div>

            <div className="rounded-xl border border-emerald-500/10 bg-emerald-500/[.035] px-4 py-3">
              <div className="text-[7px] font-black uppercase tracking-[.12em] text-emerald-600">
                Kazanılan
              </div>
              <div className="mt-1 text-lg font-black text-emerald-300">
                {stats.accepted}
              </div>
            </div>

            <div className="rounded-xl border border-white/[.07] bg-black/20 px-4 py-3">
              <div className="text-[7px] font-black uppercase tracking-[.12em] text-slate-600">
                Satış
              </div>
              <div className="mt-1 text-sm font-black">
                {money(
                  stats.sales
                )}
              </div>
            </div>

            <div className="rounded-xl border border-orange-500/10 bg-orange-500/[.035] px-4 py-3">
              <div className="text-[7px] font-black uppercase tracking-[.12em] text-orange-600">
                Brüt Kâr
              </div>
              <div className="mt-1 text-sm font-black text-orange-300">
                {money(
                  stats.profit
                )}
              </div>
            </div>

          </div>

        </div>


        <div className="mt-5 flex flex-col gap-3 md:flex-row">

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
              placeholder="Teklif no, destinasyon veya paket ara..."
              className="h-11 w-full rounded-xl border border-white/10 bg-[#030a11] pl-10 pr-4 text-[10px] font-bold outline-none transition focus:border-orange-500/40"
            />
          </div>


          <div className="relative min-w-[190px]">
            <FaFilter className="absolute left-4 top-1/2 -translate-y-1/2 text-[9px] text-slate-600" />

            <select
              value={
                status
              }
              onChange={(
                event
              ) =>
                setStatus(
                  event.target.value
                )
              }
              className="h-11 w-full appearance-none rounded-xl border border-white/10 bg-[#030a11] pl-10 pr-4 text-[10px] font-bold outline-none"
            >
              <option value="all">
                Tüm Durumlar
              </option>
              <option value="draft">
                Taslak
              </option>
              <option value="sent">
                Gönderildi
              </option>
              <option value="viewed">
                Görüntülendi
              </option>
              <option value="accepted">
                Kabul Edildi
              </option>
              <option value="converted">
                Rezervasyona Döndü
              </option>
              <option value="rejected">
                Reddedildi
              </option>
              <option value="expired">
                Süresi Doldu
              </option>
              <option value="cancelled">
                İptal
              </option>
            </select>
          </div>

        </div>
      </div>


      {error && (
        <div className="border-b border-red-500/10 bg-red-500/[.04] p-4 text-[10px] font-bold text-red-300">
          Teklif geçmişi yüklenemedi: {error}
        </div>
      )}


      {loading ? (
        <div className="p-10 text-center text-[10px] text-slate-600">
          Teklif geçmişi yükleniyor...
        </div>
      ) : filtered.length ===
      0 ? (
        <div className="p-12 text-center">
          <FaChartLine className="mx-auto text-3xl text-slate-800" />

          <div className="mt-4 text-xs font-black">
            Bağlı teklif bulunamadı
          </div>

          <div className="mt-2 text-[9px] text-slate-600">
            Customer 360 ile ilişkilendirilen teklifler burada otomatik görünür.
          </div>
        </div>
      ) : (
        <div className="max-h-[620px] overflow-auto">

          <table className="min-w-[1450px] w-full">

            <thead className="sticky top-0 z-10 bg-[#091725]">
              <tr className="border-b border-white/[.07] text-left text-[8px] font-black uppercase tracking-[.12em] text-slate-600">
                <th className="px-5 py-4">
                  Teklif
                </th>

                <th className="px-5 py-4">
                  Oluşturma
                </th>

                <th className="px-5 py-4">
                  Paket / Destinasyon
                </th>

                <th className="px-5 py-4">
                  Seyahat
                </th>

                <th className="px-5 py-4">
                  Durum
                </th>

                <th className="px-5 py-4 text-right">
                  Maliyet
                </th>

                <th className="px-5 py-4 text-right">
                  Satış
                </th>

                <th className="px-5 py-4 text-right">
                  Brüt Kâr
                </th>

                <th className="px-5 py-4 text-right">
                  Marj
                </th>

                <th className="px-5 py-4">
                  Geçerlilik
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
                ) => (
                  <tr
                    key={
                      row.id
                    }
                    className="border-b border-white/[.045] transition hover:bg-white/[.02]"
                  >

                    <td className="px-5 py-4">
                      <div className="text-[10px] font-black text-orange-300">
                        {row.quote_code}
                      </div>

                      <div className="mt-1 text-[8px] text-slate-700">
                        {row.id.slice(
                          0,
                          8
                        )}
                      </div>
                    </td>


                    <td className="px-5 py-4 text-[9px] text-slate-400">
                      {date(
                        row.created_at
                      )}
                    </td>


                    <td className="px-5 py-4">
                      <div className="text-[10px] font-black text-slate-300">
                        {row.destination ||
                          "Destinasyon yok"}
                      </div>

                      <div className="mt-1 text-[8px] uppercase text-slate-600">
                        {row.package_type ||
                          "—"}
                      </div>
                    </td>


                    <td className="px-5 py-4 text-[9px] leading-5 text-slate-400">
                      <div>
                        {date(
                          row.check_in
                        )}
                        {" → "}
                        {date(
                          row.check_out
                        )}
                      </div>

                      <div className="text-[8px] text-slate-600">
                        {row.nights ?? 0} gece · {row.adults ?? 0} yetişkin
                        {Number(
                          row.children ??
                            0
                        ) >
                        0
                          ? ` · ${row.children} çocuk`
                          : ""}
                      </div>
                    </td>


                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[7px] font-black ${statusClass(
                          row.status
                        )}`}
                      >
                        {statusLabels[
                          row.status
                        ] ||
                          row.status}
                      </span>
                    </td>


                    <td className="px-5 py-4 text-right text-[10px] font-bold text-slate-400">
                      {money(
                        row.total_cost
                      )}
                    </td>


                    <td className="px-5 py-4 text-right text-[10px] font-black text-white">
                      {money(
                        row.sale_price
                      )}
                    </td>


                    <td className="px-5 py-4 text-right">
                      <div
                        className={`text-[10px] font-black ${
                          Number(
                            row.gross_profit ??
                              0
                          ) >=
                          0
                            ? "text-emerald-300"
                            : "text-red-300"
                        }`}
                      >
                        {money(
                          row.gross_profit
                        )}
                      </div>
                    </td>


                    <td className="px-5 py-4 text-right">
                      <span className="rounded-lg border border-white/[.07] bg-black/20 px-2 py-1 text-[9px] font-black text-slate-300">
                        %{Number(
                          row.margin_percent ??
                            0
                        ).toFixed(
                          1
                        )}
                      </span>
                    </td>


                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 text-[9px] text-slate-400">
                        <FaClock className="text-slate-700" />
                        {date(
                          row.valid_until
                        )}
                      </div>
                    </td>


                    <td className="px-5 py-4 text-right">

                      {row.public_token ? (
                        <Link
                          href={`/teklif/${row.public_token}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-9 items-center gap-2 rounded-lg border border-orange-500/20 bg-orange-500/[.07] px-3 text-[8px] font-black text-orange-300 transition hover:bg-orange-500/10"
                        >
                          Aç
                          <FaExternalLinkAlt />
                        </Link>
                      ) : (
                        <span className="text-[8px] text-slate-700">
                          Link yok
                        </span>
                      )}

                    </td>

                  </tr>
                )
              )}

            </tbody>

          </table>

        </div>
      )}

    </section>
  );
}
