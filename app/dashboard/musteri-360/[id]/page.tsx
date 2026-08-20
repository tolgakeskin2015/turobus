"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useParams,
} from "next/navigation";

import {
  FaArrowLeft,
  FaBirthdayCake,
  FaClipboardList,
  FaCommentDots,
  FaEnvelope,
  FaExclamationTriangle,
  FaFileInvoiceDollar,
  FaIdCard,
  FaPlane,
  FaPlus,
  FaPhone,
  FaSuitcase,
  FaTicketAlt,
  FaUserCircle,
  FaUsers,
  FaWallet,
} from "react-icons/fa";

import {
  getCurrentMembership,
  getCurrentUser,
} from "@/lib/current-user";

import {
  addCustomer360Note,
  loadCustomer360Detail,
} from "@/lib/customer-360/repository";


import CustomerQuoteHistory from "../customer-quote-history";

import CustomerReservationHistory from "../customer-reservation-history";

import CustomerFinanceHistory from "../customer-finance-history";

import CustomerFamilyGroupCenter from "../customer-family-group-center";


type Detail =
  Awaited<
    ReturnType<
      typeof loadCustomer360Detail
    >
  >;


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
    }
  ).format(
    date
  );
}


function money(
  value:
    number
) {
  return new Intl.NumberFormat(
    "tr-TR",
    {
      style:
        "currency",

      currency:
        "TRY",

      maximumFractionDigits:
        0,
    }
  ).format(
    value
  );
}


export default function Customer360DetailPage() {
  const params =
    useParams<{
      id:
        string;
    }>();


  const customerId =
    params.id;


  const [
    companyId,
    setCompanyId,
  ] =
    useState("");


  const [
    detail,
    setDetail,
  ] =
    useState<
      Detail | null
    >(
      null
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
    note,
    setNote,
  ] =
    useState("");


  const [
    savingNote,
    setSavingNote,
  ] =
    useState(
      false
    );


  const refresh =
    useCallback(
      async (
        currentCompanyId:
          string
      ) => {
        const result =
          await loadCustomer360Detail(
            currentCompanyId,
            customerId
          );

        setDetail(
          result
        );
      },
      [
        customerId,
      ]
    );


  useEffect(() => {
    void (
      async () => {
        setLoading(
          true
        );

        try {
          const user =
            await getCurrentUser();

          if (!user) {
            throw new Error(
              "Aktif kullanıcı bulunamadı."
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
    )();
  }, [
    refresh,
  ]);


  const entityCounts =
    useMemo(
      () => {
        const counts:
          Record<
            string,
            number
          > = {};

        for (
          const entity of
          detail?.entities ??
          []
        ) {
          counts[
            entity.entity_type
          ] =
            (
              counts[
                entity.entity_type
              ] ??
              0
            ) +
            1;
        }

        return counts;
      },
      [
        detail,
      ]
    );


  const totalLinkedAmount =
    (
      detail?.entities ??
      []
    ).reduce(
      (
        total,
        entity
      ) =>
        total +
        Number(
          entity.amount ??
            0
        ),
      0
    );


  const openCases =
    (
      detail?.cases ??
      []
    ).filter(
      (
        item
      ) =>
        ![
          "resolved",
          "closed",
        ].includes(
          item.status
        )
    );


  async function saveNote() {
    if (
      !note.trim()
    ) {
      return;
    }


    setSavingNote(
      true
    );

    setError("");


    try {
      await addCustomer360Note(
        {
          customerId,
          note:
            note.trim(),
        }
      );

      setNote("");

      await refresh(
        companyId
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
      setSavingNote(
        false
      );
    }
  }


  if (
    loading
  ) {
    return (
      <main className="grid min-h-[70vh] place-items-center bg-[#030a11] text-white">
        Müşteri profili yükleniyor...
      </main>
    );
  }


  if (
    !detail
  ) {
    return (
      <main className="min-h-screen bg-[#030a11] p-8 text-white">
        <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-red-300">
          {error ||
            "Müşteri bulunamadı."}
        </div>
      </main>
    );
  }


  const customer =
    detail.customer;


  return (
    <main className="min-h-screen bg-[#030a11] text-white">
      <div className="mx-auto max-w-[1600px] px-5 py-7 lg:px-8">

        <Link
          href="/dashboard/musteri-360"
          className="mb-4 inline-flex items-center gap-2 text-[10px] font-black text-slate-500 transition hover:text-orange-300"
        >
          <FaArrowLeft />
          Müşteri 360
        </Link>


        <section className="rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,.13),transparent_35%),linear-gradient(145deg,#07131f,#040b12)] p-6 lg:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-start gap-4">
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-[20px] border border-orange-500/20 bg-orange-500/10 text-2xl text-orange-300">
                <FaUserCircle />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-orange-500/20 bg-orange-500/10 px-2.5 py-1 text-[8px] font-black text-orange-300">
                    {customer.customer_code}
                  </span>

                  <span className="rounded-full border border-white/10 bg-white/[.03] px-2.5 py-1 text-[8px] font-black uppercase text-slate-400">
                    {customer.segment}
                  </span>

                  <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[8px] font-black text-emerald-300">
                    {customer.status}
                  </span>
                </div>

                <h1 className="mt-3 text-3xl font-black tracking-tight lg:text-4xl">
                  {customer.full_name}
                </h1>

                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[10px] text-slate-400">
                  <span className="flex items-center gap-2">
                    <FaPhone />
                    {customer.phone ||
                      "Telefon yok"}
                  </span>

                  <span className="flex items-center gap-2">
                    <FaEnvelope />
                    {customer.email ||
                      "E-posta yok"}
                  </span>

                  <span className="flex items-center gap-2">
                    <FaBirthdayCake />
                    {formatDate(
                      customer.birth_date
                    )}
                  </span>
                </div>
              </div>
            </div>


            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                {
                  title:
                    "Bağlı Kayıt",

                  value:
                    detail.entities.length,
                },

                {
                  title:
                    "Yolcu",

                  value:
                    detail.travelers.length,
                },

                {
                  title:
                    "Açık Talep",

                  value:
                    openCases.length,
                },

                {
                  title:
                    "Mesaj",

                  value:
                    detail.messages.length,
                },
              ].map(
                (
                  item
                ) => (
                  <div
                    key={
                      item.title
                    }
                    className="min-w-[110px] rounded-xl border border-white/10 bg-black/20 px-4 py-3"
                  >
                    <div className="text-[8px] font-black uppercase tracking-[.12em] text-slate-600">
                      {item.title}
                    </div>

                    <div className="mt-2 text-xl font-black">
                      {item.value}
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </section>


        {error && (
          <div className="mt-4 flex gap-3 rounded-2xl border border-red-500/20 bg-red-500/[.06] p-4 text-xs font-bold text-red-200">
            <FaExclamationTriangle />
            {error}
          </div>
        )}


        <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[
            {
              title:
                "Teklif",

              value:
                entityCounts.quote ??
                0,

              icon:
                <FaClipboardList />,
            },

            {
              title:
                "Rezervasyon",

              value:
                (
                  entityCounts.booking ??
                  0
                ) +
                (
                  entityCounts.yacht_booking ??
                  0
                ) +
                (
                  entityCounts.package_booking ??
                  0
                ) +
                (
                  entityCounts.hotel_booking ??
                  0
                ) +
                (
                  entityCounts.activity_booking ??
                  0
                ) +
                (
                  entityCounts.tour_booking ??
                  0
                ),

              icon:
                <FaTicketAlt />,
            },

            {
              title:
                "Seyahat",

              value:
                entityCounts.trip ??
                0,

              icon:
                <FaPlane />,
            },

            {
              title:
                "Finansal Kayıt",

              value:
                (
                  entityCounts.payment ??
                  0
                ) +
                (
                  entityCounts.refund ??
                  0
                ),

              icon:
                <FaWallet />,
            },

            {
              title:
                "Bağlı Hacim",

              value:
                money(
                  totalLinkedAmount
                ),

              icon:
                <FaFileInvoiceDollar />,
            },
          ].map(
            (
              item
            ) => (
              <article
                key={
                  item.title
                }
                className="rounded-[22px] border border-white/10 bg-[#07131f] p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[8px] font-black uppercase tracking-[.14em] text-slate-600">
                      {item.title}
                    </div>

                    <div className="mt-3 text-xl font-black">
                      {item.value}
                    </div>
                  </div>

                  <div className="text-orange-300">
                    {item.icon}
                  </div>
                </div>
              </article>
            )
          )}
        </section>


        <div className="mt-5 grid gap-5 xl:grid-cols-[1.15fr_.85fr]">

          <div className="space-y-5">

            <section className="rounded-[26px] border border-white/10 bg-[#07131f] p-5">
              <div className="text-sm font-black">
                Kimlik & İletişim
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  [
                    "Telefon",
                    customer.phone,
                  ],

                  [
                    "E-posta",
                    customer.email,
                  ],

                  [
                    "Doğum Tarihi",
                    formatDate(
                      customer.birth_date
                    ),
                  ],

                  [
                    "Uyruğu",
                    customer.nationality,
                  ],

                  [
                    "Kimlik Türü",
                    customer.identity_type
                      ?.toUpperCase(),
                  ],

                  [
                    "Kimlik / Pasaport",
                    customer.identity_number,
                  ],

                  [
                    "Şehir",
                    customer.city,
                  ],

                  [
                    "Ülke",
                    customer.country,
                  ],

                  [
                    "Dil",
                    customer.preferred_language,
                  ],
                ].map(
                  ([
                    label,
                    value,
                  ]) => (
                    <div
                      key={
                        label
                      }
                      className="rounded-xl border border-white/[.06] bg-black/20 p-4"
                    >
                      <div className="text-[8px] font-black uppercase tracking-[.12em] text-slate-600">
                        {label}
                      </div>

                      <div className="mt-2 break-words text-[11px] font-bold text-slate-300">
                        {value ||
                          "—"}
                      </div>
                    </div>
                  )
                )}
              </div>
            </section>


            <CustomerFamilyGroupCenter
              companyId={companyId}
              customerId={customerId}
            />


            <CustomerQuoteHistory
              companyId={companyId}
              customerId={customerId}
            />


            <CustomerReservationHistory
              companyId={companyId}
              customerId={customerId}
            />


            <CustomerFinanceHistory
              companyId={companyId}
              customerId={customerId}
            />


            <section className="rounded-[26px] border border-white/10 bg-[#07131f] p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-black">
                    Ticari & Seyahat Geçmişi
                  </div>

                  <div className="mt-1 text-[9px] text-slate-600">
                    Teklif, rezervasyon, seyahat, ödeme, iade ve voucher bağlantıları
                  </div>
                </div>

                <FaSuitcase className="text-orange-300" />
              </div>

              {detail.entities.length ===
              0 ? (
                <div className="mt-5 rounded-2xl border border-dashed border-white/10 p-8 text-center text-[10px] leading-5 text-slate-600">
                  Henüz mevcut operasyon kayıtları bu müşteriyle eşleştirilmedi. Sonraki aşamada mevcut teklifler, rezervasyonlar, ödemeler, iadeler ve voucherlar otomatik olarak bu zaman çizelgesine bağlanacak.
                </div>
              ) : (
                <div className="mt-4 space-y-2">
                  {detail.entities.map(
                    (
                      entity
                    ) => (
                      <div
                        key={
                          entity.id
                        }
                        className="flex flex-col gap-2 rounded-xl border border-white/[.06] bg-black/20 p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <div className="text-[8px] font-black uppercase tracking-[.13em] text-orange-300">
                            {entity.entity_type}
                          </div>

                          <div className="mt-1 text-xs font-black">
                            {entity.title ||
                              entity.entity_key ||
                              "Bağlı kayıt"}
                          </div>
                        </div>

                        <div className="text-right">
                          {entity.amount !=
                            null && (
                            <div className="text-xs font-black">
                              {money(
                                Number(
                                  entity.amount
                                )
                              )}
                            </div>
                          )}

                          <div className="mt-1 text-[8px] text-slate-600">
                            {formatDate(
                              entity.occurred_at
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </section>
          </div>


          <div className="space-y-5">

            <section className="rounded-[26px] border border-white/10 bg-[#07131f] p-5">
              <div className="flex items-center gap-2">
                <FaPlus className="text-orange-300" />

                <div className="text-sm font-black">
                  Müşteri Notu
                </div>
              </div>

              <textarea
                value={
                  note
                }
                onChange={(
                  event
                ) =>
                  setNote(
                    event.target.value
                  )
                }
                rows={
                  4
                }
                placeholder="Satış, operasyon veya müşteri hakkında not..."
                className="mt-4 w-full resize-none rounded-xl border border-white/10 bg-[#030a11] p-4 text-xs outline-none focus:border-orange-500/40"
              />

              <button
                type="button"
                disabled={
                  savingNote ||
                  !note.trim()
                }
                onClick={() =>
                  void saveNote()
                }
                className="mt-3 h-10 w-full rounded-xl bg-orange-500 text-[10px] font-black text-white disabled:opacity-40"
              >
                Notu Kaydet
              </button>


              <div className="mt-5 space-y-2">
                {detail.notes.length ===
                0 ? (
                  <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-[9px] text-slate-600">
                    Müşteri notu bulunmuyor.
                  </div>
                ) : (
                  detail.notes
                    .slice(
                      0,
                      8
                    )
                    .map(
                      (
                        item
                      ) => (
                        <div
                          key={
                            item.id
                          }
                          className="rounded-xl border border-white/[.06] bg-black/20 p-4"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[8px] font-black uppercase text-orange-300">
                              {item.note_type}
                            </span>

                            <span className="text-[8px] text-slate-700">
                              {formatDate(
                                item.created_at
                              )}
                            </span>
                          </div>

                          <div className="mt-2 text-[10px] leading-5 text-slate-300">
                            {item.note}
                          </div>
                        </div>
                      )
                    )
                )}
              </div>
            </section>


            <section className="rounded-[26px] border border-white/10 bg-[#07131f] p-5">
              <div className="flex items-center gap-2">
                <FaCommentDots className="text-orange-300" />

                <div className="text-sm font-black">
                  Mesaj Geçmişi
                </div>
              </div>

              {detail.messages.length ===
              0 ? (
                <div className="mt-4 rounded-xl border border-dashed border-white/10 p-7 text-center text-[9px] leading-5 text-slate-600">
                  Henüz WhatsApp, SMS, e-posta veya telefon kaydı bağlanmadı.
                </div>
              ) : (
                <div className="mt-4 space-y-2">
                  {detail.messages
                    .slice(
                      0,
                      10
                    )
                    .map(
                      (
                        message
                      ) => (
                        <div
                          key={
                            message.id
                          }
                          className="rounded-xl border border-white/[.06] bg-black/20 p-4"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[8px] font-black uppercase text-orange-300">
                              {message.channel}
                            </span>

                            <span className="text-[8px] text-slate-700">
                              {formatDate(
                                message.sent_at
                              )}
                            </span>
                          </div>

                          <div className="mt-2 text-[10px] leading-5 text-slate-300">
                            {message.body ||
                              message.subject ||
                              "Mesaj"}
                          </div>
                        </div>
                      )
                    )}
                </div>
              )}
            </section>


            <section className="rounded-[26px] border border-white/10 bg-[#07131f] p-5">
              <div className="text-sm font-black">
                Talepler & Şikâyetler
              </div>

              {detail.cases.length ===
              0 ? (
                <div className="mt-4 rounded-xl border border-dashed border-white/10 p-7 text-center text-[9px] text-slate-600">
                  Açık talep veya şikâyet yok.
                </div>
              ) : (
                <div className="mt-4 space-y-2">
                  {detail.cases.map(
                    (
                      item
                    ) => (
                      <div
                        key={
                          item.id
                        }
                        className="rounded-xl border border-white/[.06] bg-black/20 p-4"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[8px] font-black uppercase text-orange-300">
                            {item.case_type}
                          </span>

                          <span className="text-[8px] font-black uppercase text-slate-600">
                            {item.status}
                          </span>
                        </div>

                        <div className="mt-2 text-xs font-black">
                          {item.title}
                        </div>

                        {item.detail && (
                          <div className="mt-2 text-[9px] leading-5 text-slate-500">
                            {item.detail}
                          </div>
                        )}
                      </div>
                    )
                  )}
                </div>
              )}
            </section>


            <section className="rounded-[26px] border border-white/10 bg-[#07131f] p-5">
              <div className="flex items-center gap-2">
                <FaIdCard className="text-orange-300" />

                <div className="text-sm font-black">
                  Tercihler & Segment
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-white/[.06] bg-black/20 p-4">
                  <div className="text-[8px] font-black uppercase text-slate-600">
                    Segment
                  </div>

                  <div className="mt-2 text-[10px] font-black uppercase">
                    {customer.segment}
                  </div>
                </div>

                <div className="rounded-xl border border-white/[.06] bg-black/20 p-4">
                  <div className="text-[8px] font-black uppercase text-slate-600">
                    KVKK
                  </div>

                  <div className="mt-2 text-[10px] font-black">
                    {customer.kvkk_consent
                      ? "Onaylı"
                      : "Onay yok"}
                  </div>
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-white/[.06] bg-black/20 p-4 text-[9px] leading-5 text-slate-500">
                Tercih motoru için veri tabanı hazır. Otel tipi, oda tercihi, koltuk, yemek, aktivite, destinasyon, iletişim kanalı ve özel istekler sonraki bağlantı aşamasında burada toplanacak.
              </div>
            </section>

          </div>
        </div>
      </div>
    </main>
  );
}
