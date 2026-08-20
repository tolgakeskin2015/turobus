"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FaArrowLeft,
  FaCheckCircle,
  FaClock,
  FaExclamationTriangle,
  FaRedo,
  FaServer,
  FaWhatsapp,
} from "react-icons/fa";

import {
  getCurrentMembership,
  getCurrentUser,
} from "@/lib/current-user";

import {
  loadCustomer360WhatsAppHealth,
  retryCustomer360WhatsAppMessage,
} from "@/lib/customer-360/repository";

import type {
  Customer360WhatsAppHealthSnapshot,
} from "@/lib/customer-360/repository";


function dateTime(
  value:
    string | null
) {
  if (!value) {
    return "Henüz yok";
  }


  const date =
    new Date(value);


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
  ).format(date);
}


export default function Customer360ProviderHealthPage() {
  const [
    companyId,
    setCompanyId,
  ] =
    useState("");


  const [
    snapshot,
    setSnapshot,
  ] =
    useState<
      Customer360WhatsAppHealthSnapshot | null
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
    busyId,
    setBusyId,
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
        currentCompanyId:
          string
      ) => {
        const result =
          await loadCustomer360WhatsAppHealth(
            currentCompanyId
          );


        setSnapshot(
          result
        );
      },
      []
    );


  useEffect(() => {
    void (
      async () => {
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


  const deliveryRate =
    useMemo(
      () => {
        if (!snapshot) {
          return 0;
        }


        const accepted =
          snapshot.sent +
          snapshot.delivered +
          snapshot.read;


        if (
          accepted ===
          0
        ) {
          return 0;
        }


        return Math.round(
          (
            (
              snapshot.delivered +
              snapshot.read
            ) /
            accepted
          ) *
          100
        );
      },
      [
        snapshot,
      ]
    );


  async function retry(
    messageId:
      string
  ) {
    if (!companyId) {
      return;
    }


    setBusyId(
      messageId
    );

    setError(
      ""
    );


    try {
      await retryCustomer360WhatsAppMessage(
        companyId,
        messageId
      );


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
      setBusyId(
        ""
      );
    }
  }


  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#030a11] text-white">
        Provider sağlık verisi yükleniyor...
      </main>
    );
  }


  return (
    <main className="min-h-screen bg-[#030a11] text-white">

      <div className="mx-auto max-w-[1550px] px-5 py-7 lg:px-8">

        <Link
          href="/dashboard/musteri-360"
          className="inline-flex items-center gap-2 text-[9px] font-black text-slate-500 hover:text-orange-300"
        >
          <FaArrowLeft />
          Müşteri 360
        </Link>


        <section className="mt-4 overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,.08),transparent_35%),linear-gradient(145deg,#07131f,#040b12)]">

          <div className="border-b border-white/[.07] p-6 lg:p-8">

            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">

              <div>

                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/[.06] px-3 py-1.5 text-[8px] font-black uppercase tracking-[.16em] text-emerald-300">
                  <FaWhatsapp />
                  PROVIDER HEALTH CENTER
                </div>


                <h1 className="mt-4 text-3xl font-black tracking-[-.04em] lg:text-4xl">
                  WhatsApp
                  <span className="text-emerald-400">
                    {" "}
                    Teslimat Merkezi
                  </span>
                </h1>


                <p className="mt-3 max-w-3xl text-[10px] leading-6 text-slate-500">
                  Gerçek Customer 360 WhatsApp queue, provider ve webhook verilerini izler.
                </p>

              </div>


              <button
                type="button"
                onClick={() =>
                  companyId &&
                  void refresh(
                    companyId
                  )
                }
                className="flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[.03] px-4 text-[8px] font-black"
              >
                <FaRedo />
                Yenile
              </button>

            </div>


            {error && (
              <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/[.04] px-4 py-3 text-[8px] text-red-300">
                {error}
              </div>
            )}


            <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-8">

              {[
                [
                  "Toplam WA",
                  snapshot?.total_whatsapp ??
                    0,
                ],
                [
                  "Kuyruk",
                  snapshot?.queued ??
                    0,
                ],
                [
                  "İşleniyor",
                  snapshot?.processing ??
                    0,
                ],
                [
                  "Gönderildi",
                  snapshot?.sent ??
                    0,
                ],
                [
                  "Teslim",
                  snapshot?.delivered ??
                    0,
                ],
                [
                  "Okundu",
                  snapshot?.read ??
                    0,
                ],
                [
                  "Hata",
                  snapshot?.failed ??
                    0,
                ],
                [
                  "Teslim Oranı",
                  `${deliveryRate}%`,
                ],
              ].map(
                (
                  [
                    title,
                    value,
                  ]
                ) => (
                  <article
                    key={
                      title
                    }
                    className="rounded-2xl border border-white/[.07] bg-black/20 p-4"
                  >
                    <div className="text-[7px] font-black uppercase tracking-[.1em] text-slate-600">
                      {title}
                    </div>

                    <div className="mt-2 text-xl font-black">
                      {value}
                    </div>
                  </article>
                )
              )}

            </div>

          </div>


          <div className="grid gap-5 p-5 lg:grid-cols-3 lg:p-6">

            <article className="rounded-2xl border border-white/[.07] bg-black/20 p-5">

              <div className="flex items-center gap-2 text-[9px] font-black">
                <FaServer className="text-emerald-300" />
                Queue Sağlığı
              </div>


              <div className="mt-4 space-y-3">

                {[
                  [
                    "Bekleyen",
                    snapshot?.outbox.queued ??
                      0,
                  ],
                  [
                    "İşlenen",
                    snapshot?.outbox.processing ??
                      0,
                  ],
                  [
                    "Gönderilen",
                    snapshot?.outbox.sent ??
                      0,
                  ],
                  [
                    "Retry Edilebilir",
                    snapshot?.outbox.retryable_failed ??
                      0,
                  ],
                  [
                    "Maks. Deneme",
                    snapshot?.outbox.max_attempt_failed ??
                      0,
                  ],
                ].map(
                  (
                    [
                      title,
                      value,
                    ]
                  ) => (
                    <div
                      key={
                        title
                      }
                      className="flex justify-between border-b border-white/[.05] pb-3 text-[8px]"
                    >
                      <span className="text-slate-500">
                        {title}
                      </span>

                      <span className="font-black">
                        {value}
                      </span>
                    </div>
                  )
                )}

              </div>

            </article>


            <article className="rounded-2xl border border-white/[.07] bg-black/20 p-5">

              <div className="flex items-center gap-2 text-[9px] font-black">
                <FaCheckCircle className="text-cyan-300" />
                Provider Aktivitesi
              </div>


              <div className="mt-5 text-[7px] font-black uppercase text-slate-600">
                Provider ID Bağlı
              </div>


              <div className="mt-2 text-3xl font-black">
                {snapshot?.provider_linked ??
                  0}
              </div>


              <div className="mt-5 text-[7px] font-black uppercase text-slate-600">
                Son Provider Aktivitesi
              </div>


              <div className="mt-2 text-[9px] font-black">
                {dateTime(
                  snapshot?.last_provider_activity_at ??
                    null
                )}
              </div>

            </article>


            <article className="rounded-2xl border border-white/[.07] bg-black/20 p-5">

              <div className="flex items-center gap-2 text-[9px] font-black">
                <FaClock className="text-orange-300" />
                Gerçek Telemetri
              </div>


              <div className="mt-4 rounded-xl border border-emerald-500/15 bg-emerald-500/[.04] p-4 text-[8px] leading-5 text-slate-500">
                Sahte provider health üretilmez. Yalnızca gerçek Customer 360 queue ve webhook verileri gösterilir.
              </div>

            </article>

          </div>


          <div className="border-t border-white/[.07]">

            <div className="border-b border-white/[.07] px-5 py-4">

              <div className="flex items-center gap-2 text-[9px] font-black">
                <FaExclamationTriangle className="text-red-300" />
                Son Başarısız WhatsApp Mesajları
              </div>

            </div>


            <div className="overflow-auto">

              <table className="min-w-[1000px] w-full">

                <thead className="bg-[#081522]">

                  <tr className="text-left text-[7px] font-black uppercase text-slate-600">

                    <th className="px-5 py-4">
                      Müşteri
                    </th>

                    <th className="px-5 py-4">
                      Mesaj
                    </th>

                    <th className="px-5 py-4">
                      Hata
                    </th>

                    <th className="px-5 py-4">
                      Tarih
                    </th>

                    <th className="px-5 py-4 text-right">
                      İşlem
                    </th>

                  </tr>

                </thead>


                <tbody>

                  {(snapshot?.recent_failed ??
                    []).length ===
                  0 ? (
                    <tr>

                      <td
                        colSpan={5}
                        className="px-5 py-10 text-center text-[9px] text-slate-600"
                      >
                        Başarısız WhatsApp mesajı yok.
                      </td>

                    </tr>
                  ) : (
                    snapshot?.recent_failed.map(
                      (
                        item
                      ) => (
                        <tr
                          key={
                            item.message_id
                          }
                          className="border-t border-white/[.045]"
                        >

                          <td className="px-5 py-4">

                            <Link
                              href={`/dashboard/musteri-360/${item.customer_id}`}
                              className="text-[8px] font-black text-orange-300"
                            >
                              360 Profile Git
                            </Link>

                          </td>


                          <td className="max-w-[300px] px-5 py-4 text-[8px]">
                            {item.body ||
                              item.subject ||
                              "—"}
                          </td>


                          <td className="max-w-[330px] px-5 py-4 text-[8px] text-red-300">
                            {item.provider_error ||
                              "Hata detayı yok"}
                          </td>


                          <td className="px-5 py-4 text-[8px] text-slate-500">
                            {dateTime(
                              item.failed_at
                            )}
                          </td>


                          <td className="px-5 py-4 text-right">

                            <button
                              type="button"
                              disabled={
                                busyId ===
                                item.message_id
                              }
                              onClick={() =>
                                void retry(
                                  item.message_id
                                )
                              }
                              className="inline-flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/[.05] px-3 py-2 text-[7px] font-black text-red-300 disabled:opacity-40"
                            >
                              <FaRedo />

                              {busyId ===
                              item.message_id
                                ? "Kuyruğa alınıyor..."
                                : "Retry"}
                            </button>

                          </td>

                        </tr>
                      )
                    )
                  )}

                </tbody>

              </table>

            </div>

          </div>

        </section>

      </div>

    </main>
  );
}
