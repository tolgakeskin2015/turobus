"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FaArrowDown,
  FaArrowUp,
  FaCheckCircle,
  FaClock,
  FaCommentDots,
  FaEnvelope,
  FaInstagram,
  FaPhone,
  FaPlus,
  FaRedo,
  FaSearch,
  FaSms,
  FaTimes,
  FaTimesCircle,
  FaWhatsapp,
} from "react-icons/fa";

import {
  addCustomer360Message,
  loadCustomer360MessagePage,
  queueCustomer360WhatsAppMessage,
  retryCustomer360WhatsAppMessage,
} from "@/lib/customer-360/repository";

import type {
  Customer360CommunicationChannel,
  Customer360CommunicationDirection,
  Customer360CommunicationRow,
} from "@/lib/customer-360/repository";


type Props = {
  customerId: string;
  companyId: string;
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
    parsed
  );
}


function channelLabel(
  channel:
    Customer360CommunicationChannel
) {
  const map:
    Record<
      Customer360CommunicationChannel,
      string
    > = {
      whatsapp:
        "WhatsApp",

      sms:
        "SMS",

      email:
        "E-posta",

      phone:
        "Telefon",

      instagram:
        "Instagram",

      system:
        "Sistem",

      other:
        "Diğer",
    };

  return map[
    channel
  ];
}


function channelIcon(
  channel:
    Customer360CommunicationChannel
) {
  if (
    channel ===
      "whatsapp"
  ) {
    return <FaWhatsapp />;
  }

  if (
    channel ===
      "sms"
  ) {
    return <FaSms />;
  }

  if (
    channel ===
      "email"
  ) {
    return <FaEnvelope />;
  }

  if (
    channel ===
      "phone"
  ) {
    return <FaPhone />;
  }

  if (
    channel ===
      "instagram"
  ) {
    return <FaInstagram />;
  }

  return <FaCommentDots />;
}


function channelClass(
  channel:
    Customer360CommunicationChannel
) {
  if (
    channel ===
      "whatsapp"
  ) {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
  }

  if (
    channel ===
      "instagram"
  ) {
    return "border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-300";
  }

  if (
    channel ===
      "email"
  ) {
    return "border-blue-500/20 bg-blue-500/10 text-blue-300";
  }

  if (
    channel ===
      "sms"
  ) {
    return "border-cyan-500/20 bg-cyan-500/10 text-cyan-300";
  }

  if (
    channel ===
      "phone"
  ) {
    return "border-orange-500/20 bg-orange-500/10 text-orange-300";
  }

  return "border-white/10 bg-white/[.03] text-slate-400";
}


function deliveryLabel(
  value:
    Customer360CommunicationRow["delivery_status"]
) {
  const status =
    value ||
    "recorded";


  const labels:
    Record<
      string,
      string
    > = {
      recorded:
        "Kayıt",

      queued:
        "Kuyrukta",

      processing:
        "İşleniyor",

      sent:
        "Gönderildi",

      delivered:
        "Teslim Edildi",

      read:
        "Okundu",

      failed:
        "Hata",
    };


  return (
    labels[status] ||
    status
  );
}


function deliveryClass(
  value:
    Customer360CommunicationRow["delivery_status"]
) {
  const status =
    value ||
    "recorded";


  if (
    status ===
      "read"
  ) {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
  }


  if (
    status ===
      "delivered"
  ) {
    return "border-cyan-500/20 bg-cyan-500/10 text-cyan-300";
  }


  if (
    status ===
      "sent"
  ) {
    return "border-blue-500/20 bg-blue-500/10 text-blue-300";
  }


  if (
    status ===
      "queued" ||
    status ===
      "processing"
  ) {
    return "border-amber-500/20 bg-amber-500/10 text-amber-300";
  }


  if (
    status ===
      "failed"
  ) {
    return "border-red-500/20 bg-red-500/10 text-red-300";
  }


  return "border-white/10 bg-white/[.03] text-slate-500";
}


export default function CustomerCommunicationCenter({
  customerId,
  companyId,
}: Props) {
  const [
    messages,
    setMessages,
  ] =
    useState<
      Customer360CommunicationRow[]
    >(
      []
    );


  const [
    totalMessages,
    setTotalMessages,
  ] =
    useState(
      0
    );


  const [
    hasMore,
    setHasMore,
  ] =
    useState(
      false
    );


  const [
    loadingMore,
    setLoadingMore,
  ] =
    useState(
      false
    );


  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    );


  const [
    busy,
    setBusy,
  ] =
    useState(
      false
    );


  const [
    error,
    setError,
  ] =
    useState("");


  const [
    notice,
    setNotice,
  ] =
    useState("");


  const [
    search,
    setSearch,
  ] =
    useState("");


  const [
    channelFilter,
    setChannelFilter,
  ] =
    useState<
      "all" |
      Customer360CommunicationChannel
    >(
      "all"
    );


  const [
    directionFilter,
    setDirectionFilter,
  ] =
    useState<
      "all" |
      Customer360CommunicationDirection
    >(
      "all"
    );


  const [
    deliveryFilter,
    setDeliveryFilter,
  ] =
    useState<
      | "all"
      | "recorded"
      | "queued"
      | "processing"
      | "sent"
      | "delivered"
      | "read"
      | "failed"
    >(
      "all"
    );


  const [
    view,
    setView,
  ] =
    useState<
      "timeline" |
      "table"
    >(
      "timeline"
    );


  const [
    modalOpen,
    setModalOpen,
  ] =
    useState(
      false
    );


  const [
    formChannel,
    setFormChannel,
  ] =
    useState<
      Customer360CommunicationChannel
    >(
      "phone"
    );


  const [
    formDirection,
    setFormDirection,
  ] =
    useState<
      Customer360CommunicationDirection
    >(
      "outbound"
    );


  const [
    formSubject,
    setFormSubject,
  ] =
    useState("");


  const [
    formBody,
    setFormBody,
  ] =
    useState("");


  const [
    formExternalId,
    setFormExternalId,
  ] =
    useState("");


  const refresh =
    useCallback(
      async () => {
        const result =
          await loadCustomer360MessagePage(
            customerId,
            0,
            100
          );

        setMessages(
          result.messages
        );

        setTotalMessages(
          result.total
        );

        setHasMore(
          result.has_more
        );
      },
      [
        customerId,
      ]
    );


  useEffect(() => {
    void (
      async () => {
        try {
          await refresh();

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


  const filtered =
    useMemo(
      () => {
        const rows =
          messages;


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
              channelFilter !==
                "all" &&
              row.channel !==
                channelFilter
            ) {
              return false;
            }


            if (
              directionFilter !==
                "all" &&
              row.direction !==
                directionFilter
            ) {
              return false;
            }


            if (
              deliveryFilter !==
                "all" &&
              (
                row.delivery_status ||
                "recorded"
              ) !==
                deliveryFilter
            ) {
              return false;
            }


            if (!needle) {
              return true;
            }


            return [
              row.subject,
              row.body,
              row.external_id,
              channelLabel(
                row.channel
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
        );

      },
      [
        messages,
        search,
        channelFilter,
        directionFilter,
        deliveryFilter,
      ]
    );


  const stats =
    useMemo(
      () => {
        const rows =
          messages;


        const inbound =
          rows.filter(
            (
              row
            ) =>
              row.direction ===
              "inbound"
          ).length;


        const outbound =
          rows.filter(
            (
              row
            ) =>
              row.direction ===
              "outbound"
          ).length;


        const channels =
          new Set(
            rows.map(
              (
                row
              ) =>
                row.channel
            )
          ).size;


        const thirtyDaysAgo =
          Date.now() -
          (
            30 *
            24 *
            60 *
            60 *
            1000
          );


        const recent =
          rows.filter(
            (
              row
            ) => {
              const ts =
                new Date(
                  row.sent_at
                ).getTime();

              return (
                !Number.isNaN(
                  ts
                ) &&
                ts >=
                  thirtyDaysAgo
              );
            }
          ).length;


        return {
          total:
            totalMessages,

          inbound,

          outbound,

          channels,

          recent,
        };
      },
      [
        messages,
        totalMessages,
      ]
    );


  async function loadMoreMessages() {
    if (
      loadingMore ||
      !hasMore
    ) {
      return;
    }


    setLoadingMore(
      true
    );

    setError(
      ""
    );


    try {
      const result =
        await loadCustomer360MessagePage(
          customerId,
          messages.length,
          100
        );


      setMessages(
        (
          current
        ) => {
          const existingIds =
            new Set(
              current.map(
                (
                  row
                ) =>
                  row.id
              )
            );


          const additions =
            result.messages.filter(
              (
                row
              ) =>
                !existingIds.has(
                  row.id
                )
            );


          return [
            ...current,
            ...additions,
          ];
        }
      );


      setTotalMessages(
        result.total
      );

      setHasMore(
        result.has_more
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
      setLoadingMore(
        false
      );
    }
  }


  async function retryMessage(
    messageId:
      string
  ) {
    if (!companyId) {
      setError(
        "Aktif firma bulunamadı."
      );

      return;
    }


    setBusy(
      true
    );

    setError(
      ""
    );

    setNotice(
      ""
    );


    try {
      await retryCustomer360WhatsAppMessage(
        companyId,
        messageId
      );


      await refresh();


      setNotice(
        "WhatsApp mesajı yeniden gönderim kuyruğuna alındı."
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
      setBusy(
        false
      );
    }
  }


  async function saveMessage() {
    if (
      !formSubject.trim() &&
      !formBody.trim()
    ) {
      setError(
        "Konu veya iletişim notu gerekli."
      );

      return;
    }


    setBusy(
      true
    );

    setError("");
    setNotice("");


    try {
      if (
        formChannel ===
          "whatsapp" &&
        formDirection ===
          "outbound"
      ) {
        if (!companyId) {
          throw new Error(
            "Aktif firma bulunamadı."
          );
        }


        await queueCustomer360WhatsAppMessage(
          {
            companyId,
            customerId,

            subject:
              formSubject.trim(),

            body:
              formBody.trim(),
          }
        );

      } else {
        await addCustomer360Message(
          {
            customerId,

            channel:
              formChannel,

            direction:
              formDirection,

            subject:
              formSubject.trim(),

            body:
              formBody.trim(),

            externalId:
              formExternalId.trim(),
          }
        );
      }


      await refresh();


      setFormSubject("");
      setFormBody("");
      setFormExternalId("");

      setModalOpen(
        false
      );

      setNotice(
        formChannel ===
          "whatsapp" &&
        formDirection ===
          "outbound"
          ? "WhatsApp mesajı gerçek provider kuyruğuna alındı."
          : "İletişim kaydı Customer 360 geçmişine eklendi."
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
      setBusy(
        false
      );
    }
  }


  if (
    loading
  ) {
    return (
      <section className="rounded-[26px] border border-white/10 bg-[#07131f] p-10 text-center text-[10px] text-slate-600">
        İletişim geçmişi yükleniyor...
      </section>
    );
  }


  return (
    <>
      <section className="overflow-hidden rounded-[26px] border border-white/10 bg-[#07131f]">

        <div className="border-b border-white/[.07] p-5 lg:p-6">

          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">

            <div>

              <div className="flex items-center gap-2">
                <FaCommentDots className="text-orange-300" />

                <h2 className="text-sm font-black">
                  Omnichannel İletişim Merkezi
                </h2>
              </div>


              <p className="mt-2 max-w-3xl text-[9px] leading-5 text-slate-600">
                WhatsApp, SMS, e-posta, telefon, Instagram ve sistem iletişimlerinin merkezi müşteri geçmişi. Outbound WhatsApp gerçek provider kuyruğuna gider; SMS ve e-posta doğrulanmış provider entegrasyonu olmadan yalnızca kayıt olarak tutulur.
              </p>

            </div>


            <button
              type="button"
              onClick={() =>
                setModalOpen(
                  true
                )
              }
              className="flex h-10 items-center gap-2 rounded-xl bg-orange-500 px-4 text-[9px] font-black text-white"
            >
              <FaPlus />
              İletişim Kaydı Ekle
            </button>

          </div>


          <div className="mt-5 grid grid-cols-2 gap-2 lg:grid-cols-5">

            {[
              {
                title:
                  "Toplam",

                value:
                  stats.total,
              },

              {
                title:
                  "Gelen",

                value:
                  stats.inbound,
              },

              {
                title:
                  "Giden",

                value:
                  stats.outbound,
              },

              {
                title:
                  "Aktif Kanal",

                value:
                  stats.channels,
              },

              {
                title:
                  "Son 30 Gün",

                value:
                  stats.recent,
              },
            ].map(
              (
                item
              ) => (
                <article
                  key={
                    item.title
                  }
                  className="rounded-xl border border-white/[.07] bg-black/20 p-4"
                >
                  <div className="text-[7px] font-black uppercase tracking-[.12em] text-slate-600">
                    {item.title}
                  </div>

                  <div className="mt-2 text-xl font-black">
                    {item.value}
                  </div>
                </article>
              )
            )}

          </div>


          <div className="mt-5 grid gap-3 xl:grid-cols-[1fr_170px_170px_170px_auto]">

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
                placeholder="Mesaj, konu veya dış referans ara..."
                className="h-11 w-full rounded-xl border border-white/10 bg-[#030a11] pl-10 pr-4 text-[10px] outline-none focus:border-orange-500/40"
              />

            </div>


            <select
              value={
                channelFilter
              }
              onChange={(
                event
              ) =>
                setChannelFilter(
                  event.target.value as
                    | "all"
                    | Customer360CommunicationChannel
                )
              }
              className="h-11 rounded-xl border border-white/10 bg-[#030a11] px-4 text-[9px]"
            >
              <option value="all">
                Tüm Kanallar
              </option>

              <option value="whatsapp">
                WhatsApp
              </option>

              <option value="sms">
                SMS
              </option>

              <option value="email">
                E-posta
              </option>

              <option value="phone">
                Telefon
              </option>

              <option value="instagram">
                Instagram
              </option>

              <option value="system">
                Sistem
              </option>

              <option value="other">
                Diğer
              </option>
            </select>


            <select
              value={
                directionFilter
              }
              onChange={(
                event
              ) =>
                setDirectionFilter(
                  event.target.value as
                    | "all"
                    | Customer360CommunicationDirection
                )
              }
              className="h-11 rounded-xl border border-white/10 bg-[#030a11] px-4 text-[9px]"
            >
              <option value="all">
                Gelen + Giden
              </option>

              <option value="inbound">
                Gelen
              </option>

              <option value="outbound">
                Giden
              </option>
            </select>


            <select
              value={
                deliveryFilter
              }
              onChange={(
                event
              ) =>
                setDeliveryFilter(
                  event.target.value as
                    | "all"
                    | "recorded"
                    | "queued"
                    | "processing"
                    | "sent"
                    | "delivered"
                    | "read"
                    | "failed"
                )
              }
              className="h-11 rounded-xl border border-white/10 bg-[#030a11] px-4 text-[9px]"
            >
              <option value="all">
                Tüm Teslimatlar
              </option>

              <option value="queued">
                Kuyrukta
              </option>

              <option value="processing">
                İşleniyor
              </option>

              <option value="sent">
                Gönderildi
              </option>

              <option value="delivered">
                Teslim Edildi
              </option>

              <option value="read">
                Okundu
              </option>

              <option value="failed">
                Hata
              </option>

              <option value="recorded">
                Sadece Kayıt
              </option>
            </select>


            <div className="flex rounded-xl border border-white/10 bg-[#030a11] p-1">

              <button
                type="button"
                onClick={() =>
                  setView(
                    "timeline"
                  )
                }
                className={`rounded-lg px-3 text-[8px] font-black ${
                  view ===
                  "timeline"
                    ? "bg-orange-500/10 text-orange-300"
                    : "text-slate-600"
                }`}
              >
                Timeline
              </button>


              <button
                type="button"
                onClick={() =>
                  setView(
                    "table"
                  )
                }
                className={`rounded-lg px-3 text-[8px] font-black ${
                  view ===
                  "table"
                    ? "bg-orange-500/10 text-orange-300"
                    : "text-slate-600"
                }`}
              >
                Tablo
              </button>

            </div>

          </div>

        </div>


        {error && (
          <div className="border-b border-red-500/10 bg-red-500/[.05] px-5 py-4 text-[10px] font-bold text-red-300">
            {error}
          </div>
        )}


        {notice && (
          <div className="border-b border-emerald-500/10 bg-emerald-500/[.04] px-5 py-4 text-[10px] font-bold text-emerald-300">
            {notice}
          </div>
        )}


        {filtered.length ===
        0 ? (
          <div className="p-12 text-center">

            <FaCommentDots className="mx-auto text-4xl text-slate-800" />

            <div className="mt-4 text-xs font-black">
              İletişim kaydı bulunamadı
            </div>

            <div className="mt-2 text-[9px] text-slate-600">
              Bağlanan veya manuel kaydedilen gerçek iletişim geçmişi burada görünür.
            </div>

          </div>
        ) : view ===
          "timeline" ? (
          <div className="max-h-[720px] overflow-auto p-5 lg:p-6">

            <div className="mx-auto max-w-5xl space-y-3">

        <div className="border-b border-white/[.06] bg-black/10 px-5 py-3 lg:px-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-[8px] font-bold text-slate-600">
              Yüklenen mesaj: {messages.length} / {totalMessages}
            </div>

            {hasMore && (
              <div className="text-[7px] font-black text-orange-300">
                Daha eski kayıtlar mevcut
              </div>
            )}
          </div>
        </div>


              {filtered.map(
                (
                  message
                ) => (
                  <article
                    key={
                      message.id
                    }
                    className={`rounded-[20px] border p-4 ${
                      message.direction ===
                      "inbound"
                        ? "mr-10 border-white/[.07] bg-black/20"
                        : "ml-10 border-orange-500/10 bg-orange-500/[.035]"
                    }`}
                  >

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

                      <div className="flex items-start gap-3">

                        <div
                          className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${channelClass(
                            message.channel
                          )}`}
                        >
                          {channelIcon(
                            message.channel
                          )}
                        </div>


                        <div>

                          <div className="flex flex-wrap items-center gap-2">

                            <span className="text-[9px] font-black">
                              {channelLabel(
                                message.channel
                              )}
                            </span>


                            <span
                              className={`flex items-center gap-1 rounded-full border px-2 py-1 text-[7px] font-black ${
                                message.direction ===
                                "inbound"
                                  ? "border-blue-500/15 bg-blue-500/[.05] text-blue-300"
                                  : "border-orange-500/15 bg-orange-500/[.05] text-orange-300"
                              }`}
                            >
                              {message.direction ===
                              "inbound"
                                ? <FaArrowDown />
                                : <FaArrowUp />}

                              {message.direction ===
                              "inbound"
                                ? "GELEN"
                                : "GİDEN"}
                            </span>

                            {/* TIMELINE_DELIVERY_STATUS */}
                            {message.direction ===
                              "outbound" && (
                              <span
                                className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[7px] font-black ${deliveryClass(
                                  message.delivery_status
                                )}`}
                              >
                                {message.delivery_status ===
                                  "failed"
                                  ? <FaTimesCircle />
                                  : <FaCheckCircle />}

                                {deliveryLabel(
                                  message.delivery_status
                                )}
                              </span>
                            )}


                            {message.channel ===
                              "whatsapp" &&
                              message.direction ===
                                "outbound" &&
                              message.delivery_status ===
                                "failed" && (
                              <button
                                type="button"
                                disabled={
                                  busy
                                }
                                onClick={() =>
                                  void retryMessage(
                                    message.id
                                  )
                                }
                                className="inline-flex items-center gap-1 rounded-full border border-red-500/20 bg-red-500/[.06] px-2 py-1 text-[7px] font-black text-red-300 disabled:opacity-40"
                              >
                                <FaRedo />
                                Yeniden Gönder
                              </button>
                            )}

                          </div>


                          {message.subject && (
                            <div className="mt-2 text-[10px] font-black text-slate-300">
                              {message.subject}
                            </div>
                          )}


                          {message.body && (
                            <div className="mt-2 whitespace-pre-wrap text-[10px] leading-5 text-slate-400">
                              {message.body}
                            </div>
                          )}

                          {message.provider_error && (
                            <div className="mt-2 rounded-lg border border-red-500/15 bg-red-500/[.04] px-3 py-2 text-[7px] font-bold text-red-300">
                              Provider hatası: {message.provider_error}
                            </div>
                          )}

                        </div>

                      </div>


                      <div className="shrink-0 text-right">

                        <div className="flex items-center justify-end gap-2 text-[8px] text-slate-600">
                          <FaClock />

                          {formatDate(
                            message.sent_at
                          )}
                        </div>


                        {message.external_id && (
                          <div className="mt-2 max-w-[200px] truncate font-mono text-[7px] text-slate-700">
                            {message.external_id}
                          </div>
                        )}

                      </div>

                    </div>

                  </article>
                )
              )}

            </div>

          </div>
        ) : (
          <div className="max-h-[680px] overflow-auto">

            <table className="min-w-[1250px] w-full">

              <thead className="sticky top-0 z-10 bg-[#091725]">

                <tr className="border-b border-white/[.07] text-left text-[8px] font-black uppercase tracking-[.12em] text-slate-600">

                  <th className="px-5 py-4">
                    Kanal
                  </th>

                  <th className="px-5 py-4">
                    Yön
                  </th>

                  <th className="px-5 py-4">
                    Teslimat
                  </th>

                  <th className="px-5 py-4">
                    Konu
                  </th>

                  <th className="px-5 py-4">
                    Mesaj / Not
                  </th>

                  <th className="px-5 py-4">
                    Dış Referans
                  </th>

                  <th className="px-5 py-4">
                    Tarih
                  </th>

                </tr>

              </thead>


              <tbody>

                {filtered.map(
                  (
                    message
                  ) => (
                    <tr
                      key={
                        message.id
                      }
                      className="border-b border-white/[.045] hover:bg-white/[.02]"
                    >

                      <td className="px-5 py-4">

                        <div className="flex items-center gap-3">

                          <div
                            className={`grid h-9 w-9 place-items-center rounded-lg border ${channelClass(
                              message.channel
                            )}`}
                          >
                            {channelIcon(
                              message.channel
                            )}
                          </div>


                          <span className="text-[9px] font-black">
                            {channelLabel(
                              message.channel
                            )}
                          </span>

                        </div>

                      </td>


                      <td className="px-5 py-4">

                        <span
                          className={`rounded-full border px-2.5 py-1 text-[7px] font-black ${
                            message.direction ===
                            "inbound"
                              ? "border-blue-500/15 bg-blue-500/[.05] text-blue-300"
                              : "border-orange-500/15 bg-orange-500/[.05] text-orange-300"
                          }`}
                        >
                          {message.direction ===
                          "inbound"
                            ? "GELEN"
                            : "GİDEN"}
                        </span>

                      </td>


                      {/* TABLE_DELIVERY_STATUS */}
                      <td className="px-5 py-4">

                        {message.direction ===
                        "outbound" ? (
                          <div className="flex flex-wrap items-center gap-2">

                            <span
                              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[7px] font-black ${deliveryClass(
                                message.delivery_status
                              )}`}
                            >
                              {message.delivery_status ===
                                "failed"
                                ? <FaTimesCircle />
                                : <FaCheckCircle />}

                              {deliveryLabel(
                                message.delivery_status
                              )}
                            </span>


                            {message.channel ===
                              "whatsapp" &&
                              message.delivery_status ===
                                "failed" && (
                              <button
                                type="button"
                                disabled={
                                  busy
                                }
                                onClick={() =>
                                  void retryMessage(
                                    message.id
                                  )
                                }
                                className="inline-flex items-center gap-1 rounded-lg border border-red-500/20 bg-red-500/[.05] px-2 py-1 text-[7px] font-black text-red-300 disabled:opacity-40"
                              >
                                <FaRedo />
                                Retry
                              </button>
                            )}

                          </div>
                        ) : (
                          <span className="text-[8px] text-slate-700">
                            —
                          </span>
                        )}

                      </td>


                      <td className="max-w-[220px] px-5 py-4 text-[9px] font-bold text-slate-300">
                        {message.subject ||
                          "—"}
                      </td>


                      <td className="max-w-[420px] px-5 py-4">

                        <div className="line-clamp-2 text-[9px] leading-5 text-slate-500">
                          {message.body ||
                            "—"}
                        </div>

                      </td>


                      <td className="px-5 py-4">

                        <div className="max-w-[180px] truncate font-mono text-[8px] text-slate-600">
                          {message.external_id ||
                            "—"}
                        </div>

                      </td>


                      <td className="px-5 py-4 text-[9px] text-slate-400">
                        {formatDate(
                          message.sent_at
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


      {hasMore && (
        <div className="mt-3 flex justify-center">
          <button
            type="button"
            onClick={() =>
              void loadMoreMessages()
            }
            disabled={
              loadingMore
            }
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-orange-500/20 bg-orange-500/[.06] px-5 text-[9px] font-black text-orange-300 transition hover:bg-orange-500/[.1] disabled:cursor-wait disabled:opacity-50"
          >
            <FaClock />

            {loadingMore
              ? "Eski mesajlar yükleniyor..."
              : `Daha Eski Mesajları Yükle (${messages.length}/${totalMessages})`}
          </button>
        </div>
      )}


      {modalOpen && (
        <div className="fixed inset-0 z-[110] grid place-items-center bg-black/75 p-4 backdrop-blur-sm">

          <div className="w-full max-w-xl overflow-hidden rounded-[28px] border border-white/10 bg-[#07131f] shadow-2xl">

            <div className="flex items-center justify-between border-b border-white/[.07] p-5">

              <div>

                <div className="text-[8px] font-black uppercase tracking-[.18em] text-orange-300">
                  CUSTOMER 360
                </div>

                <div className="mt-1 text-lg font-black">
                  İletişim Kaydı
                </div>

              </div>


              <button
                type="button"
                onClick={() =>
                  setModalOpen(
                    false
                  )
                }
                className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-slate-500"
              >
                <FaTimes />
              </button>

            </div>


            <div className="grid gap-4 p-5">

              <div className="grid gap-4 sm:grid-cols-2">

                <label>

                  <span className="text-[8px] font-black uppercase text-slate-600">
                    Kanal
                  </span>

                  <select
                    value={
                      formChannel
                    }
                    onChange={(
                      event
                    ) =>
                      setFormChannel(
                        event.target.value as
                          Customer360CommunicationChannel
                      )
                    }
                    className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-[#030a11] px-4 text-[10px]"
                  >
                    <option value="whatsapp">
                      WhatsApp
                    </option>

                    <option value="sms">
                      SMS
                    </option>

                    <option value="email">
                      E-posta
                    </option>

                    <option value="phone">
                      Telefon
                    </option>

                    <option value="instagram">
                      Instagram
                    </option>

                    <option value="system">
                      Sistem
                    </option>

                    <option value="other">
                      Diğer
                    </option>
                  </select>

                </label>


                <label>

                  <span className="text-[8px] font-black uppercase text-slate-600">
                    Yön
                  </span>

                  <select
                    value={
                      formDirection
                    }
                    onChange={(
                      event
                    ) =>
                      setFormDirection(
                        event.target.value as
                          Customer360CommunicationDirection
                      )
                    }
                    className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-[#030a11] px-4 text-[10px]"
                  >
                    <option value="outbound">
                      Giden
                    </option>

                    <option value="inbound">
                      Gelen
                    </option>
                  </select>

                </label>

              </div>


              <label>

                <span className="text-[8px] font-black uppercase text-slate-600">
                  Konu
                </span>

                <input
                  value={
                    formSubject
                  }
                  onChange={(
                    event
                  ) =>
                    setFormSubject(
                      event.target.value
                    )
                  }
                  placeholder="Örn. Balayı paketi görüşmesi"
                  className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-[#030a11] px-4 text-[10px] outline-none focus:border-orange-500/40"
                />

              </label>


              <label>

                <span className="text-[8px] font-black uppercase text-slate-600">
                  Görüşme / Mesaj İçeriği
                </span>

                <textarea
                  value={
                    formBody
                  }
                  onChange={(
                    event
                  ) =>
                    setFormBody(
                      event.target.value
                    )
                  }
                  rows={
                    6
                  }
                  placeholder="Gerçek iletişim notunu veya mesaj özetini girin..."
                  className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-[#030a11] p-4 text-[10px] leading-5 outline-none focus:border-orange-500/40"
                />

              </label>


              <label>

                <span className="text-[8px] font-black uppercase text-slate-600">
                  Dış Sistem Referansı
                </span>

                <input
                  value={
                    formExternalId
                  }
                  onChange={(
                    event
                  ) =>
                    setFormExternalId(
                      event.target.value
                    )
                  }
                  placeholder="Varsa provider / mesaj ID"
                  className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-[#030a11] px-4 font-mono text-[9px]"
                />

              </label>


              <div className="rounded-xl border border-amber-500/10 bg-amber-500/[.035] p-4 text-[8px] leading-5 text-amber-200/70">
                Bu işlem mesaj göndermez. Gerçekleşmiş iletişimi Customer 360 geçmişine kaydeder. Canlı sağlayıcı entegrasyonu doğrulandığında ayrıca bağlanacaktır.
              </div>


              <button
                type="button"
                disabled={
                  busy ||
                  (
                    !formSubject.trim() &&
                    !formBody.trim()
                  )
                }
                onClick={() =>
                  void saveMessage()
                }
                className="h-11 rounded-xl bg-orange-500 text-[10px] font-black text-white disabled:opacity-40"
              >
                {busy
                  ? "Kaydediliyor..."
                  : "İletişim Kaydını Kaydet"}
              </button>

            </div>

          </div>

        </div>
      )}

    </>
  );
}
