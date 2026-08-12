"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import {
  supabase,
} from "@/lib/supabase";

import {
  getCurrentMembership,
} from "@/lib/current-user";


type QueueStatus =
  | "pending"
  | "processing"
  | "sent"
  | "delivered"
  | "read"
  | "retry"
  | "failed"
  | "cancelled";


type QueueRow = {
  id: string;

  company_id: string;

  supplier_id:
    string | null;

  to_phone: string;

  supplier_name:
    string | null;

  title: string;

  message:
    string | null;

  status:
    QueueStatus;

  attempts: number;

  max_attempts: number;

  next_attempt_at: string;

  sent_at:
    string | null;

  delivered_at:
    string | null;

  read_at:
    string | null;

  failed_at:
    string | null;

  provider_message_id:
    string | null;

  last_error:
    string | null;

  created_at: string;
};


type QueueStats = {
  pending: number;
  processing: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  today: number;
};


function statusLabel(
  status: QueueStatus
) {
  const labels:
    Record<
      QueueStatus,
      string
    > = {
      pending:
        "Bekliyor",

      processing:
        "Gönderiliyor",

      sent:
        "Gönderildi",

      delivered:
        "Teslim Edildi",

      read:
        "Okundu",

      retry:
        "Tekrar Denenecek",

      failed:
        "Başarısız",

      cancelled:
        "İptal",
    };

  return labels[
    status
  ];
}


function statusClass(
  status: QueueStatus
) {
  if (
    status ===
      "read" ||
    status ===
      "delivered"
  ) {
    return "bg-emerald-500/10 text-emerald-300";
  }

  if (
    status ===
    "sent"
  ) {
    return "bg-blue-500/10 text-blue-300";
  }

  if (
    status ===
      "failed" ||
    status ===
      "cancelled"
  ) {
    return "bg-red-500/10 text-red-300";
  }

  if (
    status ===
      "retry" ||
    status ===
      "pending"
  ) {
    return "bg-amber-500/10 text-amber-300";
  }

  return "bg-violet-500/10 text-violet-300";
}


export default function WhatsAppQueuePage() {
  const [
    rows,
    setRows,
  ] =
    useState<
      QueueRow[]
    >([]);

  const [
    stats,
    setStats,
  ] =
    useState<QueueStats>({
      pending:
        0,

      processing:
        0,

      sent:
        0,

      delivered:
        0,

      read:
        0,

      failed:
        0,

      today:
        0,
    });

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState("");

  const [
    filter,
    setFilter,
  ] =
    useState<
      QueueStatus |
      "all"
    >(
      "all"
    );

  const [
    search,
    setSearch,
  ] =
    useState("");


  const loadData =
    useCallback(
      async () => {
        setErrorMessage("");

        const {
          data:
            authData,
          error:
            authError,
        } =
          await supabase.auth
            .getUser();

        if (
          authError ||
          !authData.user
        ) {
          setErrorMessage(
            "Oturum bulunamadı."
          );

          setLoading(false);

          return;
        }

        const membership =
          await getCurrentMembership(
            authData.user.id
          );

        if (!membership) {
          setErrorMessage(
            "Aktif şirket üyeliği bulunamadı."
          );

          setLoading(false);

          return;
        }

        const [
          queueResult,
          statsResult,
        ] =
          await Promise.all([
            supabase
              .from(
                "package_whatsapp_queue"
              )
              .select(`
                id,
                company_id,
                supplier_id,
                to_phone,
                supplier_name,
                title,
                message,
                status,
                attempts,
                max_attempts,
                next_attempt_at,
                sent_at,
                delivered_at,
                read_at,
                failed_at,
                provider_message_id,
                last_error,
                created_at
              `)
              .eq(
                "company_id",
                membership
                  .company_id
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

            supabase.rpc(
              "get_package_whatsapp_queue_stats"
            ),
          ]);

        if (
          queueResult.error
        ) {
          setErrorMessage(
            queueResult.error
              .message
          );

          setLoading(false);

          return;
        }

        if (
          statsResult.error
        ) {
          setErrorMessage(
            statsResult.error
              .message
          );

          setLoading(false);

          return;
        }

        setRows(
          (
            queueResult.data ??
            []
          ) as QueueRow[]
        );

        setStats(
          statsResult.data as
            QueueStats
        );

        setLoading(false);
      },
      []
    );


  useEffect(
    () => {
      void loadData();

      const timer =
        window.setInterval(
          () => {
            void loadData();
          },
          30000
        );

      return () =>
        window.clearInterval(
          timer
        );
    },
    [
      loadData,
    ]
  );


  const filteredRows =
    useMemo(
      () => {
        const query =
          search
            .trim()
            .toLocaleLowerCase(
              "tr-TR"
            );

        return rows.filter(
          row => {
            if (
              filter !==
                "all" &&
              row.status !==
                filter
            ) {
              return false;
            }

            if (!query) {
              return true;
            }

            return [
              row.supplier_name,
              row.to_phone,
              row.title,
              row.message,
              row.provider_message_id,
            ]
              .filter(
                Boolean
              )
              .join(
                " "
              )
              .toLocaleLowerCase(
                "tr-TR"
              )
              .includes(
                query
              );
          }
        );
      },
      [
        rows,
        search,
        filter,
      ]
    );


  if (loading) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center bg-slate-950 text-white">
        WhatsApp kuyruğu hazırlanıyor...
      </main>
    );
  }


  return (
    <main className="min-h-screen bg-slate-950 p-5 text-white md:p-8">

      <div className="mx-auto max-w-[1500px]">

        <section className="rounded-[30px] border border-white/10 bg-slate-900 p-6 md:p-8">

          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-400">
                TUROBUS WHATSAPP ENGINE
              </p>

              <h1 className="mt-3 text-3xl font-black md:text-5xl">
                WhatsApp Gönderim Kuyruğu
              </h1>

              <p className="mt-3 max-w-3xl text-slate-400">
                Tedarikçi operasyon mesajlarını,
                gönderim denemelerini, teslim ve
                okunma durumlarını takip edin.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">

              <button
                type="button"
                onClick={() =>
                  void loadData()
                }
                className="rounded-xl bg-white px-5 py-3 text-sm font-black text-slate-950"
              >
                Yenile
              </button>

              <Link
                href="/dashboard/package-os/automation-health"
                className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-3 text-sm font-black text-emerald-300"
              >
                Otomasyon Sağlığı
              </Link>

              <Link
                href="/dashboard/package-os/control-tower"
                className="rounded-xl border border-white/10 px-5 py-3 text-sm font-black"
              >
                Kontrol Kulesi
              </Link>

            </div>

          </div>

        </section>

        {
          errorMessage &&
          (
            <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-300">
              {errorMessage}
            </div>
          )
        }

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">

          <Stat
            label="Bugün"
            value={stats.today}
          />

          <Stat
            label="Bekliyor"
            value={stats.pending}
          />

          <Stat
            label="İşleniyor"
            value={stats.processing}
          />

          <Stat
            label="Gönderildi"
            value={stats.sent}
          />

          <Stat
            label="Teslim"
            value={stats.delivered}
          />

          <Stat
            label="Okundu"
            value={stats.read}
          />

          <Stat
            label="Başarısız"
            value={stats.failed}
          />

        </section>

        <section className="mt-6 rounded-[24px] border border-white/10 bg-slate-900 p-5">

          <div className="grid gap-3 lg:grid-cols-[1fr_240px]">

            <input
              value={search}
              onChange={
                event =>
                  setSearch(
                    event.target
                      .value
                  )
              }
              placeholder="Tedarikçi, telefon veya mesaj ara..."
              className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3 outline-none"
            />

            <select
              value={filter}
              onChange={
                event =>
                  setFilter(
                    event.target
                      .value as
                      QueueStatus |
                      "all"
                  )
              }
              className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
            >
              <option value="all">
                Tüm Durumlar
              </option>

              <option value="pending">
                Bekliyor
              </option>

              <option value="retry">
                Tekrar Denenecek
              </option>

              <option value="processing">
                Gönderiliyor
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
                Başarısız
              </option>
            </select>

          </div>

        </section>

        <section className="mt-6 space-y-4">

          {
            filteredRows.length ===
            0
              ? (
                <div className="rounded-[24px] border border-white/10 bg-slate-900 p-8 text-center text-slate-500">
                  Kuyruk kaydı bulunamadı.
                </div>
              )
              : filteredRows.map(
                  row => (
                    <article
                      key={row.id}
                      className="rounded-[24px] border border-white/10 bg-slate-900 p-5 md:p-6"
                    >

                      <div className="grid gap-5 xl:grid-cols-[1fr_180px_180px]">

                        <div>

                          <div className="flex flex-wrap items-center gap-2">

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-black ${statusClass(
                                row.status
                              )}`}
                            >
                              {
                                statusLabel(
                                  row.status
                                )
                              }
                            </span>

                            <span className="text-xs text-slate-500">
                              Deneme {row.attempts}/{row.max_attempts}
                            </span>

                          </div>

                          <h2 className="mt-3 text-lg font-black">
                            {row.title}
                          </h2>

                          <p className="mt-2 text-sm text-slate-300">
                            {
                              row.message ||
                              "-"
                            }
                          </p>

                          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-400">

                            <span>
                              <strong className="text-slate-500">
                                Tedarikçi:
                              </strong>{" "}
                              {
                                row.supplier_name ||
                                "-"
                              }
                            </span>

                            <span>
                              <strong className="text-slate-500">
                                Telefon:
                              </strong>{" "}
                              {row.to_phone}
                            </span>

                          </div>

                          {
                            row.last_error &&
                            (
                              <p className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
                                {row.last_error}
                              </p>
                            )
                          }

                        </div>

                        <div>

                          <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                            Oluşturuldu
                          </p>

                          <p className="mt-2 text-sm">
                            {
                              new Date(
                                row.created_at
                              ).toLocaleString(
                                "tr-TR"
                              )
                            }
                          </p>

                          {
                            row.sent_at &&
                            (
                              <p className="mt-3 text-xs text-blue-300">
                                Gönderildi:{" "}
                                {
                                  new Date(
                                    row.sent_at
                                  ).toLocaleString(
                                    "tr-TR"
                                  )
                                }
                              </p>
                            )
                          }

                        </div>

                        <div>

                          <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                            Teslim Durumu
                          </p>

                          {
                            row.delivered_at &&
                            (
                              <p className="mt-2 text-xs text-emerald-300">
                                Teslim:{" "}
                                {
                                  new Date(
                                    row.delivered_at
                                  ).toLocaleString(
                                    "tr-TR"
                                  )
                                }
                              </p>
                            )
                          }

                          {
                            row.read_at &&
                            (
                              <p className="mt-2 text-xs text-emerald-300">
                                Okundu:{" "}
                                {
                                  new Date(
                                    row.read_at
                                  ).toLocaleString(
                                    "tr-TR"
                                  )
                                }
                              </p>
                            )
                          }

                          {
                            row.provider_message_id &&
                            (
                              <p className="mt-3 break-all text-[11px] text-slate-600">
                                {row.provider_message_id}
                              </p>
                            )
                          }

                        </div>

                      </div>

                    </article>
                  )
                )
          }

        </section>

      </div>

    </main>
  );
}


function Stat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-[20px] border border-white/10 bg-slate-900 p-5">

      <p className="text-xs font-black uppercase tracking-wider text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-3xl font-black">
        {value}
      </p>

    </div>
  );
}
