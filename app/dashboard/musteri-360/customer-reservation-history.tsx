"use client";

import Link from "next/link";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FaCalendarAlt,
  FaHotel,
  FaMapMarkerAlt,
  FaPlane,
  FaSearch,
  FaShip,
  FaStar,
  FaSuitcase,
  FaTicketAlt,
  FaUmbrellaBeach,
} from "react-icons/fa";

import {
  loadCustomer360ReservationHistory,
} from "@/lib/customer-360/repository";

import type {
  Customer360ReservationHistoryRow,
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
    booking:
      "Rezervasyon",

    package_booking:
      "Paket",

    yacht_booking:
      "Yat & Tekne",

    hotel_booking:
      "Otel",

    activity_booking:
      "Aktivite",

    tour_booking:
      "Tur",

    trip:
      "Seyahat",
  };


function formatDate(
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
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(
    parsed
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


function typeIcon(
  type:
    string
) {
  if (
    type ===
      "yacht_booking"
  ) {
    return <FaShip />;
  }

  if (
    type ===
      "hotel_booking"
  ) {
    return <FaHotel />;
  }

  if (
    type ===
      "activity_booking"
  ) {
    return <FaStar />;
  }

  if (
    type ===
      "tour_booking"
  ) {
    return <FaMapMarkerAlt />;
  }

  if (
    type ===
      "package_booking"
  ) {
    return <FaSuitcase />;
  }

  if (
    type ===
      "trip"
  ) {
    return <FaPlane />;
  }

  return <FaTicketAlt />;
}


function typeClass(
  type:
    string
) {
  if (
    type ===
      "package_booking"
  ) {
    return "border-orange-500/20 bg-orange-500/10 text-orange-300";
  }

  if (
    type ===
      "yacht_booking"
  ) {
    return "border-cyan-500/20 bg-cyan-500/10 text-cyan-300";
  }

  if (
    type ===
      "hotel_booking"
  ) {
    return "border-violet-500/20 bg-violet-500/10 text-violet-300";
  }

  if (
    type ===
      "activity_booking"
  ) {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
  }

  if (
    type ===
      "tour_booking"
  ) {
    return "border-blue-500/20 bg-blue-500/10 text-blue-300";
  }

  if (
    type ===
      "trip"
  ) {
    return "border-sky-500/20 bg-sky-500/10 text-sky-300";
  }

  return "border-white/10 bg-white/[.03] text-slate-400";
}


function moduleHref(
  row:
    Customer360ReservationHistoryRow
) {
  const sourceTable =
    row.source_table ??
    "";

  const sourceId =
    row.source_id ??
    row.entity_id ??
    "";


  if (
    (
      row.entity_type ===
        "package_booking" ||
      sourceTable.includes(
        "package_booking"
      )
    ) &&
    sourceId
  ) {
    return `/dashboard/package-os/bookings/${sourceId}`;
  }


  if (
    row.entity_type ===
      "yacht_booking"
  ) {
    return "/dashboard/yat-os/operation-center";
  }


  if (
    row.entity_type ===
      "hotel_booking"
  ) {
    return "/dashboard/hotel/rezervasyonlar";
  }


  if (
    row.entity_type ===
      "activity_booking"
  ) {
    return "/dashboard/activity-os";
  }


  if (
    row.entity_type ===
      "tour_booking"
  ) {
    return "/dashboard/rezervasyonlar";
  }


  if (
    row.entity_type ===
      "booking"
  ) {
    return "/dashboard/rezervasyonlar";
  }


  return null;
}


export default function CustomerReservationHistory({
  companyId,
  customerId,
}: Props) {
  const [
    rows,
    setRows,
  ] =
    useState<
      Customer360ReservationHistoryRow[]
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
            await loadCustomer360ReservationHistory(
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
        const now =
          Date.now();


        const upcoming =
          rows.filter(
            (
              row
            ) => {
              if (
                !row.occurred_at
              ) {
                return false;
              }


              const ts =
                new Date(
                  row.occurred_at
                ).getTime();


              return (
                !Number.isNaN(
                  ts
                ) &&
                ts >=
                  now
              );
            }
          ).length;


        const totalAmount =
          rows.reduce(
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


        const types =
          new Set(
            rows.map(
              (
                row
              ) =>
                row.entity_type
            )
          );


        return {
          total:
            rows.length,

          upcoming,

          typeCount:
            types.size,

          totalAmount,
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
              <FaSuitcase className="text-orange-300" />

              <h2 className="text-sm font-black">
                Rezervasyon & Seyahat Geçmişi
              </h2>
            </div>

            <p className="mt-2 max-w-2xl text-[9px] leading-5 text-slate-600">
              Paket, otel, yat, aktivite, tur ve diğer rezervasyon bağlantılarının tek müşteri kimliği altında operasyonel görünümü.
            </p>
          </div>


          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">

            <div className="rounded-xl border border-white/[.07] bg-black/20 px-4 py-3">
              <div className="text-[7px] font-black uppercase tracking-[.12em] text-slate-600">
                Toplam Kayıt
              </div>

              <div className="mt-1 text-lg font-black">
                {stats.total}
              </div>
            </div>


            <div className="rounded-xl border border-emerald-500/10 bg-emerald-500/[.035] px-4 py-3">
              <div className="text-[7px] font-black uppercase tracking-[.12em] text-emerald-600">
                Yaklaşan
              </div>

              <div className="mt-1 text-lg font-black text-emerald-300">
                {stats.upcoming}
              </div>
            </div>


            <div className="rounded-xl border border-blue-500/10 bg-blue-500/[.035] px-4 py-3">
              <div className="text-[7px] font-black uppercase tracking-[.12em] text-blue-600">
                Hizmet Türü
              </div>

              <div className="mt-1 text-lg font-black text-blue-300">
                {stats.typeCount}
              </div>
            </div>


            <div className="rounded-xl border border-orange-500/10 bg-orange-500/[.035] px-4 py-3">
              <div className="text-[7px] font-black uppercase tracking-[.12em] text-orange-600">
                Bağlı Hacim
              </div>

              <div className="mt-1 text-sm font-black text-orange-300">
                {money(
                  stats.totalAmount,
                  "TRY"
                )}
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
              placeholder="Rezervasyon, kaynak tablo veya işlem kodu ara..."
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
              Tüm Hizmetler
            </option>

            <option value="booking">
              Genel Rezervasyon
            </option>

            <option value="package_booking">
              Paket
            </option>

            <option value="hotel_booking">
              Otel
            </option>

            <option value="yacht_booking">
              Yat & Tekne
            </option>

            <option value="activity_booking">
              Aktivite
            </option>

            <option value="tour_booking">
              Tur
            </option>

            <option value="trip">
              Seyahat
            </option>
          </select>

        </div>
      </div>


      {error && (
        <div className="border-b border-red-500/10 bg-red-500/[.04] p-4 text-[10px] font-bold text-red-300">
          Rezervasyon geçmişi yüklenemedi: {error}
        </div>
      )}


      {loading ? (
        <div className="p-12 text-center text-[10px] text-slate-600">
          Rezervasyon geçmişi yükleniyor...
        </div>
      ) : filtered.length ===
      0 ? (
        <div className="p-12 text-center">
          <FaUmbrellaBeach className="mx-auto text-4xl text-slate-800" />

          <div className="mt-4 text-xs font-black">
            Bağlı rezervasyon bulunamadı
          </div>

          <div className="mt-2 text-[9px] text-slate-600">
            Customer 360 ile bağlanan rezervasyonlar burada otomatik görünür.
          </div>
        </div>
      ) : (
        <div className="max-h-[650px] overflow-auto">

          <table className="min-w-[1300px] w-full">

            <thead className="sticky top-0 z-10 bg-[#091725]">
              <tr className="border-b border-white/[.07] text-left text-[8px] font-black uppercase tracking-[.12em] text-slate-600">

                <th className="px-5 py-4">
                  Hizmet
                </th>

                <th className="px-5 py-4">
                  Rezervasyon / İşlem
                </th>

                <th className="px-5 py-4">
                  Tarih
                </th>

                <th className="px-5 py-4">
                  Kaynak
                </th>

                <th className="px-5 py-4">
                  Kayıt ID
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
                        <div className="max-w-[300px] truncate text-[10px] font-black text-white">
                          {row.title ||
                            "Başlıksız rezervasyon"}
                        </div>

                        <div className="mt-1 max-w-[300px] truncate text-[8px] text-slate-600">
                          {row.entity_key ||
                            "—"}
                        </div>
                      </td>


                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 text-[9px] text-slate-400">
                          <FaCalendarAlt className="text-slate-700" />

                          {formatDate(
                            row.occurred_at
                          )}
                        </div>
                      </td>


                      <td className="px-5 py-4">
                        <span className="rounded-lg border border-white/[.06] bg-black/20 px-2.5 py-1.5 text-[8px] font-bold text-slate-500">
                          {row.source_table ||
                            "entity_link"}
                        </span>
                      </td>


                      <td className="px-5 py-4">
                        <div className="max-w-[180px] truncate font-mono text-[8px] text-slate-600">
                          {row.source_id ||
                            row.entity_id ||
                            "—"}
                        </div>
                      </td>


                      <td className="px-5 py-4 text-right">
                        <div className="text-[10px] font-black text-slate-300">
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
                            className="inline-flex h-9 items-center rounded-lg border border-orange-500/20 bg-orange-500/[.07] px-3 text-[8px] font-black text-orange-300 transition hover:bg-orange-500/10"
                          >
                            Modülü Aç
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
