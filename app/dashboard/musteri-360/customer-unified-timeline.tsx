"use client";

import Link from "next/link";

import {
  useMemo,
  useState,
} from "react";

import {
  FaCalendarAlt,
  FaClipboardList,
  FaCommentDots,
  FaExclamationTriangle,
  FaFileInvoiceDollar,
  FaHistory,
  FaPlane,
  FaSearch,
  FaStickyNote,
  FaTicketAlt,
  FaUserCircle,
  FaWallet,
} from "react-icons/fa";

import type {
  Customer360Case,
  Customer360Customer,
  Customer360EntityLink,
  Customer360Message,
  Customer360Note,
} from "@/lib/customer-360/types";


type Props = {
  customer:
    Customer360Customer;

  notes:
    Customer360Note[];

  cases:
    Customer360Case[];

  messages:
    Customer360Message[];

  entities:
    Customer360EntityLink[];
};


type TimelineType =
  | "customer"
  | "note"
  | "message"
  | "case"
  | "quote"
  | "booking"
  | "trip"
  | "payment"
  | "refund"
  | "voucher"
  | "other";


type TimelineItem = {
  id:
    string;

  type:
    TimelineType;

  sourceType:
    string;

  title:
    string;

  detail:
    string | null;

  occurredAt:
    string;

  amount:
    number | null;

  currency:
    string | null;

  direction:
    string | null;

  status:
    string | null;

  href:
    string | null;
};


const bookingTypes =
  new Set(
    [
      "booking",
      "package_booking",
      "yacht_booking",
      "hotel_booking",
      "activity_booking",
      "tour_booking",
    ]
  );


function validDate(
  value:
    string | null | undefined
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


function formatDate(
  value:
    string
) {
  const date =
    validDate(
      value
    );


  if (!date) {
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
    date
  );
}


function money(
  amount:
    number,
  currency:
    string | null
) {
  const current =
    currency
      ?.trim()
      .toUpperCase();


  if (!current) {
    return `${amount.toLocaleString(
      "tr-TR"
    )} para birimi belirsiz`;
  }


  try {
    return new Intl.NumberFormat(
      "tr-TR",
      {
        style:
          "currency",

        currency:
          current,

        maximumFractionDigits:
          0,
      }
    ).format(
      amount
    );

  } catch {
    return `${amount.toLocaleString(
      "tr-TR"
    )} ${current}`;
  }
}


function entityTimelineType(
  entityType:
    string
): TimelineType {
  if (
    entityType ===
      "quote"
  ) {
    return "quote";
  }


  if (
    bookingTypes.has(
      entityType
    )
  ) {
    return "booking";
  }


  if (
    entityType ===
      "trip"
  ) {
    return "trip";
  }


  if (
    entityType ===
      "payment"
  ) {
    return "payment";
  }


  if (
    entityType ===
      "refund"
  ) {
    return "refund";
  }


  if (
    entityType ===
      "voucher"
  ) {
    return "voucher";
  }


  return "other";
}


function timelineLabel(
  type:
    TimelineType
) {
  const labels:
    Record<
      TimelineType,
      string
    > = {
      customer:
        "Müşteri",

      note:
        "Not",

      message:
        "İletişim",

      case:
        "Talep / Şikâyet",

      quote:
        "Teklif",

      booking:
        "Rezervasyon",

      trip:
        "Seyahat",

      payment:
        "Ödeme",

      refund:
        "İade",

      voucher:
        "Voucher",

      other:
        "Diğer",
    };


  return labels[
    type
  ];
}


function timelineIcon(
  type:
    TimelineType
) {
  if (
    type ===
      "customer"
  ) {
    return <FaUserCircle />;
  }


  if (
    type ===
      "note"
  ) {
    return <FaStickyNote />;
  }


  if (
    type ===
      "message"
  ) {
    return <FaCommentDots />;
  }


  if (
    type ===
      "case"
  ) {
    return <FaExclamationTriangle />;
  }


  if (
    type ===
      "quote"
  ) {
    return <FaClipboardList />;
  }


  if (
    type ===
      "booking"
  ) {
    return <FaTicketAlt />;
  }


  if (
    type ===
      "trip"
  ) {
    return <FaPlane />;
  }


  if (
    type ===
      "payment"
  ) {
    return <FaWallet />;
  }


  if (
    type ===
      "refund"
  ) {
    return <FaFileInvoiceDollar />;
  }


  if (
    type ===
      "voucher"
  ) {
    return <FaTicketAlt />;
  }


  return <FaHistory />;
}


function timelineClass(
  type:
    TimelineType
) {
  if (
    type ===
      "payment"
  ) {
    return "border-emerald-500/15 bg-emerald-500/[.05] text-emerald-300";
  }


  if (
    type ===
      "refund"
  ) {
    return "border-red-500/15 bg-red-500/[.05] text-red-300";
  }


  if (
    type ===
      "case"
  ) {
    return "border-amber-500/15 bg-amber-500/[.05] text-amber-300";
  }


  if (
    type ===
      "message"
  ) {
    return "border-blue-500/15 bg-blue-500/[.05] text-blue-300";
  }


  if (
    type ===
      "booking"
  ) {
    return "border-orange-500/15 bg-orange-500/[.05] text-orange-300";
  }


  if (
    type ===
      "quote"
  ) {
    return "border-violet-500/15 bg-violet-500/[.05] text-violet-300";
  }


  return "border-white/10 bg-white/[.03] text-slate-400";
}


function entityHref(
  entityType:
    string
) {
  if (
    entityType ===
      "quote"
  ) {
    return "/dashboard/package-os/quotes";
  }


  if (
    entityType ===
      "package_booking"
  ) {
    return "/dashboard/package-os/bookings";
  }


  if (
    entityType ===
      "payment"
  ) {
    return "/dashboard/package-os/payments";
  }


  if (
    entityType ===
      "refund"
  ) {
    return "/dashboard/package-os/finance";
  }


  if (
    entityType ===
      "voucher"
  ) {
    return "/dashboard/package-os/vouchers";
  }


  if (
    entityType ===
      "yacht_booking"
  ) {
    return "/dashboard/yat-os";
  }


  if (
    entityType ===
      "hotel_booking"
  ) {
    return "/dashboard/hotel/rezervasyonlar";
  }


  if (
    entityType ===
      "activity_booking"
  ) {
    return "/dashboard/activity-os";
  }


  return null;
}


export default function CustomerUnifiedTimeline({
  customer,
  notes,
  cases,
  messages,
  entities,
}: Props) {
  const [
    search,
    setSearch,
  ] =
    useState("");


  const [
    typeFilter,
    setTypeFilter,
  ] =
    useState<
      "all" |
      TimelineType
    >(
      "all"
    );


  const [
    direction,
    setDirection,
  ] =
    useState<
      "desc" |
      "asc"
    >(
      "desc"
    );


  const timeline =
    useMemo(
      () => {
        const result:
          TimelineItem[] = [];


        if (
          validDate(
            customer.created_at
          )
        ) {
          result.push(
            {
              id:
                `customer:${customer.id}`,

              type:
                "customer",

              sourceType:
                "customer",

              title:
                "Müşteri profili oluşturuldu",

              detail:
                customer.source
                  ? `Kaynak: ${customer.source}`
                  : null,

              occurredAt:
                customer.created_at,

              amount:
                null,

              currency:
                null,

              direction:
                null,

              status:
                customer.status,

              href:
                null,
            }
          );
        }


        for (
          const note of
          notes
        ) {
          if (
            !validDate(
              note.created_at
            )
          ) {
            continue;
          }


          result.push(
            {
              id:
                `note:${note.id}`,

              type:
                "note",

              sourceType:
                note.note_type,

              title:
                note.is_important
                  ? "Önemli müşteri notu"
                  : "Müşteri notu",

              detail:
                note.note,

              occurredAt:
                note.created_at,

              amount:
                null,

              currency:
                null,

              direction:
                null,

              status:
                note.is_important
                  ? "important"
                  : null,

              href:
                null,
            }
          );
        }


        for (
          const item of
          cases
        ) {
          if (
            !validDate(
              item.created_at
            )
          ) {
            continue;
          }


          result.push(
            {
              id:
                `case:${item.id}`,

              type:
                "case",

              sourceType:
                item.case_type,

              title:
                item.title,

              detail:
                item.detail,

              occurredAt:
                item.created_at,

              amount:
                null,

              currency:
                null,

              direction:
                null,

              status:
                item.status,

              href:
                null,
            }
          );
        }


        for (
          const message of
          messages
        ) {
          if (
            !validDate(
              message.sent_at
            )
          ) {
            continue;
          }


          result.push(
            {
              id:
                `message:${message.id}`,

              type:
                "message",

              sourceType:
                message.channel,

              title:
                message.subject ||
                `${message.channel} iletişimi`,

              detail:
                message.body,

              occurredAt:
                message.sent_at,

              amount:
                null,

              currency:
                null,

              direction:
                message.direction,

              status:
                null,

              href:
                null,
            }
          );
        }


        for (
          const entity of
          entities
        ) {
          if (
            !validDate(
              entity.occurred_at
            )
          ) {
            continue;
          }


          const type =
            entityTimelineType(
              entity.entity_type
            );


          result.push(
            {
              id:
                `entity:${entity.id}`,

              type,

              sourceType:
                entity.entity_type,

              title:
                entity.title ||
                entity.entity_key ||
                timelineLabel(
                  type
                ),

              detail:
                entity.entity_key,

              occurredAt:
                entity.occurred_at as
                  string,

              amount:
                entity.amount,

              currency:
                entity.currency,

              direction:
                null,

              status:
                null,

              href:
                entityHref(
                  entity.entity_type
                ),
            }
          );
        }


        return result;

      },
      [
        customer,
        notes,
        cases,
        messages,
        entities,
      ]
    );


  const filtered =
    useMemo(
      () => {
        const needle =
          search
            .trim()
            .toLocaleLowerCase(
              "tr-TR"
            );


        return timeline
          .filter(
            (
              item
            ) => {
              if (
                typeFilter !==
                  "all" &&
                item.type !==
                  typeFilter
              ) {
                return false;
              }


              if (!needle) {
                return true;
              }


              return [
                item.title,
                item.detail,
                item.sourceType,
                item.status,
                item.direction,
                timelineLabel(
                  item.type
                ),
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
          )
          .sort(
            (
              a,
              b
            ) => {
              const aTime =
                new Date(
                  a.occurredAt
                ).getTime();

              const bTime =
                new Date(
                  b.occurredAt
                ).getTime();


              return direction ===
                "desc"
                ? bTime -
                    aTime
                : aTime -
                    bTime;
            }
          );

      },
      [
        timeline,
        search,
        typeFilter,
        direction,
      ]
    );


  const stats =
    useMemo(
      () => ({
        total:
          timeline.length,

        commercial:
          timeline.filter(
            (
              item
            ) =>
              [
                "quote",
                "booking",
                "trip",
              ].includes(
                item.type
              )
          ).length,

        finance:
          timeline.filter(
            (
              item
            ) =>
              [
                "payment",
                "refund",
                "voucher",
              ].includes(
                item.type
              )
          ).length,

        communication:
          timeline.filter(
            (
              item
            ) =>
              item.type ===
              "message"
          ).length,

        service:
          timeline.filter(
            (
              item
            ) =>
              [
                "case",
                "note",
              ].includes(
                item.type
              )
          ).length,
      }),
      [
        timeline,
      ]
    );


  return (
    <section className="overflow-hidden rounded-[26px] border border-white/10 bg-[#07131f]">

      <div className="border-b border-white/[.07] p-5 lg:p-6">

        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">

          <div>

            <div className="flex items-center gap-2">

              <FaHistory className="text-orange-300" />

              <h2 className="text-sm font-black">
                Birleşik Müşteri Zaman Çizelgesi
              </h2>

            </div>


            <p className="mt-2 max-w-3xl text-[9px] leading-5 text-slate-600">
              Müşteri oluşturma, not, iletişim, talep/şikâyet, teklif, rezervasyon, seyahat ve finans olaylarını tek kronolojik görünümde birleştirir.
            </p>

          </div>


          <div className="flex items-center gap-2 text-[8px] font-black text-slate-500">

            <FaCalendarAlt />

            Gerçek Customer 360 olayları

          </div>

        </div>


        <div className="mt-5 grid grid-cols-2 gap-2 lg:grid-cols-5">

          {[
            [
              "Toplam Olay",
              stats.total,
            ],

            [
              "Ticari",
              stats.commercial,
            ],

            [
              "Finans",
              stats.finance,
            ],

            [
              "İletişim",
              stats.communication,
            ],

            [
              "Servis / Not",
              stats.service,
            ],
          ].map(
            ([
              label,
              value,
            ]) => (
              <article
                key={
                  String(
                    label
                  )
                }
                className="rounded-xl border border-white/[.07] bg-black/20 p-4"
              >

                <div className="text-[7px] font-black uppercase tracking-[.12em] text-slate-600">
                  {label}
                </div>

                <div className="mt-2 text-xl font-black">
                  {value}
                </div>

              </article>
            )
          )}

        </div>


        <div className="mt-5 grid gap-3 xl:grid-cols-[1fr_190px_170px]">

          <div className="relative">

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
              placeholder="Olay, başlık, mesaj, durum veya kaynak ara..."
              className="h-11 w-full rounded-xl border border-white/10 bg-[#030a11] pl-10 pr-4 text-[10px] outline-none focus:border-orange-500/40"
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
                event.target.value as
                  | "all"
                  | TimelineType
              )
            }
            className="h-11 rounded-xl border border-white/10 bg-[#030a11] px-4 text-[9px]"
          >

            <option value="all">
              Tüm Olaylar
            </option>

            <option value="customer">
              Müşteri
            </option>

            <option value="note">
              Not
            </option>

            <option value="message">
              İletişim
            </option>

            <option value="case">
              Talep / Şikâyet
            </option>

            <option value="quote">
              Teklif
            </option>

            <option value="booking">
              Rezervasyon
            </option>

            <option value="trip">
              Seyahat
            </option>

            <option value="payment">
              Ödeme
            </option>

            <option value="refund">
              İade
            </option>

            <option value="voucher">
              Voucher
            </option>

            <option value="other">
              Diğer
            </option>

          </select>


          <select
            value={
              direction
            }
            onChange={(
              event
            ) =>
              setDirection(
                event.target.value as
                  "desc" |
                  "asc"
              )
            }
            className="h-11 rounded-xl border border-white/10 bg-[#030a11] px-4 text-[9px]"
          >

            <option value="desc">
              En Yeni → Eski
            </option>

            <option value="asc">
              En Eski → Yeni
            </option>

          </select>

        </div>

      </div>


      {filtered.length ===
      0 ? (
        <div className="p-12 text-center">

          <FaHistory className="mx-auto text-4xl text-slate-800" />

          <div className="mt-4 text-xs font-black">
            Zaman çizelgesi kaydı bulunamadı
          </div>

          <div className="mt-2 text-[9px] text-slate-600">
            Gerçek müşteri olayları oluştukça burada kronolojik olarak görünür.
          </div>

        </div>
      ) : (
        <div className="max-h-[760px] overflow-auto">

          <table className="min-w-[1200px] w-full">

            <thead className="sticky top-0 z-10 bg-[#091725]">

              <tr className="border-b border-white/[.07] text-left text-[7px] font-black uppercase tracking-[.12em] text-slate-600">

                <th className="px-5 py-4">
                  Tarih
                </th>

                <th className="px-5 py-4">
                  Olay
                </th>

                <th className="px-5 py-4">
                  Kaynak
                </th>

                <th className="px-5 py-4">
                  Detay
                </th>

                <th className="px-5 py-4">
                  Tutar
                </th>

                <th className="px-5 py-4">
                  Durum / Yön
                </th>

                <th className="px-5 py-4 text-right">
                  İşlem
                </th>

              </tr>

            </thead>


            <tbody>

              {filtered.map(
                (
                  item
                ) => (
                  <tr
                    key={
                      item.id
                    }
                    className="border-b border-white/[.045] align-top hover:bg-white/[.02]"
                  >

                    <td className="whitespace-nowrap px-5 py-4 text-[8px] text-slate-500">
                      {formatDate(
                        item.occurredAt
                      )}
                    </td>


                    <td className="px-5 py-4">

                      <div className="flex items-start gap-3">

                        <div
                          className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border ${timelineClass(
                            item.type
                          )}`}
                        >
                          {timelineIcon(
                            item.type
                          )}
                        </div>


                        <div>

                          <div className="text-[7px] font-black uppercase tracking-[.12em] text-slate-600">
                            {timelineLabel(
                              item.type
                            )}
                          </div>

                          <div className="mt-1 max-w-[300px] text-[10px] font-black text-slate-200">
                            {item.title}
                          </div>

                        </div>

                      </div>

                    </td>


                    <td className="px-5 py-4">

                      <span className="rounded-lg border border-white/10 bg-white/[.03] px-2.5 py-1 text-[7px] font-black text-slate-400">
                        {item.sourceType}
                      </span>

                    </td>


                    <td className="max-w-[420px] px-5 py-4">

                      <div className="line-clamp-3 text-[8px] leading-5 text-slate-500">
                        {item.detail ||
                          "—"}
                      </div>

                    </td>


                    <td className="whitespace-nowrap px-5 py-4 text-[9px] font-black text-slate-300">

                      {item.amount !==
                      null
                        ? money(
                            Number(
                              item.amount
                            ),
                            item.currency
                          )
                        : "—"}

                    </td>


                    <td className="px-5 py-4">

                      <div className="flex flex-wrap gap-2">

                        {item.status && (
                          <span className="rounded-full border border-white/10 bg-white/[.03] px-2 py-1 text-[7px] font-black text-slate-400">
                            {item.status}
                          </span>
                        )}


                        {item.direction && (
                          <span className="rounded-full border border-blue-500/15 bg-blue-500/[.04] px-2 py-1 text-[7px] font-black text-blue-300">
                            {item.direction}
                          </span>
                        )}

                      </div>

                    </td>


                    <td className="px-5 py-4 text-right">

                      {item.href ? (
                        <Link
                          href={
                            item.href
                          }
                          className="inline-flex rounded-lg border border-orange-500/15 bg-orange-500/[.04] px-3 py-2 text-[7px] font-black text-orange-300 hover:bg-orange-500/[.08]"
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
                )
              )}

            </tbody>

          </table>

        </div>
      )}


      <div className="border-t border-white/[.06] bg-black/10 px-5 py-4">

        <div className="text-[8px] leading-5 text-slate-600">
          Zaman çizelgesi yeni veri üretmez. Customer 360 altında mevcut olan gerçek müşteri, not, mesaj, talep/şikâyet ve operasyon bağlantılarını tek görünümde birleştirir.
        </div>

      </div>

    </section>
  );
}
