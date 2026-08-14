"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  supabase,
} from "@/lib/supabase";

import {
  getCurrentMembership,
} from "@/lib/current-user";


type AlertRow = {
  id: string;

  booking_id: string;

  booking_item_id:
    string | null;

  alert_type:
    "critical_task" |
    "sla_overdue";

  severity:
    "warning" |
    "critical";

  title: string;

  description:
    string | null;

  assigned_to:
    string | null;

  read_at:
    string | null;

  muted_until:
    string | null;

  resolved_at:
    string | null;

  metadata:
    Record<string, unknown>;

  created_at:
    string;

  booking_code:
    string;

  customer_name:
    string;

  item_name:
    string | null;
};


function dateTime(
  value:
    string | null
) {

  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat(
    "tr-TR",
    {
      dateStyle:
        "medium",

      timeStyle:
        "short",
    }
  ).format(
    new Date(
      value
    )
  );
}


export default function
PackageAlarmCenterPage() {

  const [
    alerts,
    setAlerts,
  ] =
    useState<
      AlertRow[]
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
    savingId,
    setSavingId,
  ] =
    useState(
      ""
    );


  const [
    filter,
    setFilter,
  ] =
    useState(
      "active"
    );


  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState(
      ""
    );


  const load =
    useCallback(
      async () => {

        setLoading(
          true
        );


        try {

          const {
            data,
          } =
            await supabase.auth.getUser();


          if (!data.user) {
            throw new Error(
              "Oturum bulunamadı."
            );
          }


          const membership =
            await getCurrentMembership(
              data.user.id
            );


          if (!membership) {
            throw new Error(
              "Aktif şirket üyeliği bulunamadı."
            );
          }


          const result =
            await supabase.rpc(
              "get_package_operation_alert_center",
              {
                p_company_id:
                  membership.company_id,
              }
            );


          if (result.error) {
            throw result.error;
          }


          setAlerts(
            (
              result.data ||
              []
            ) as AlertRow[]
          );


          setErrorMessage(
            ""
          );


        } catch (error) {

          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Alarm merkezi yüklenemedi."
          );

        }


        setLoading(
          false
        );

      },
      []
    );


  useEffect(
    () => {

      void load();

    },
    [
      load,
    ]
  );


  const now =
    Date.now();


  const visible =
    useMemo(
      () =>
        alerts.filter(
          alert => {

            if (
              filter ===
              "active"
            ) {
              return (
                !alert.resolved_at
                &&
                (
                  !alert.muted_until
                  ||
                  new Date(
                    alert.muted_until
                  ).getTime() <=
                    now
                )
              );
            }


            if (
              filter ===
              "unread"
            ) {
              return (
                !alert.read_at
                &&
                !alert.resolved_at
              );
            }


            if (
              filter ===
              "critical"
            ) {
              return (
                alert.severity ===
                  "critical"
                &&
                !alert.resolved_at
              );
            }


            if (
              filter ===
              "sla"
            ) {
              return (
                alert.alert_type ===
                  "sla_overdue"
                &&
                !alert.resolved_at
              );
            }


            if (
              filter ===
              "muted"
            ) {
              return (
                Boolean(
                  alert.muted_until
                )
                &&
                new Date(
                  alert.muted_until as string
                ).getTime() >
                  now
              );
            }


            if (
              filter ===
              "resolved"
            ) {
              return Boolean(
                alert.resolved_at
              );
            }


            return true;

          }
        ),
      [
        alerts,
        filter,
        now,
      ]
    );


  const stats =
    useMemo(
      () => ({

        unread:
          alerts.filter(
            alert =>
              !alert.read_at
              &&
              !alert.resolved_at
          ).length,

        critical:
          alerts.filter(
            alert =>
              alert.severity ===
                "critical"
              &&
              !alert.resolved_at
          ).length,

        sla:
          alerts.filter(
            alert =>
              alert.alert_type ===
                "sla_overdue"
              &&
              !alert.resolved_at
          ).length,

        muted:
          alerts.filter(
            alert =>
              Boolean(
                alert.muted_until
              )
              &&
              new Date(
                alert.muted_until as string
              ).getTime() >
                now
          ).length,

      }),
      [
        alerts,
        now,
      ]
    );


  async function action(
    alertId:
      string,
    actionName:
      string
  ) {

    setSavingId(
      alertId
    );

    setErrorMessage(
      ""
    );


    const result =
      await supabase.rpc(
        "package_operation_alert_action",
        {
          p_alert_id:
            alertId,

          p_action:
            actionName,
        }
      );


    if (result.error) {

      setErrorMessage(
        result.error.message
      );

      setSavingId(
        ""
      );

      return;
    }


    await load();

    setSavingId(
      ""
    );
  }


  return (
    <main className="min-h-screen bg-slate-950 p-5 text-white md:p-8">

      <div className="mx-auto max-w-[1500px]">

        <section className="rounded-[30px] border border-white/10 bg-slate-900 p-6 md:p-8">

          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">

            <div>

              <p className="text-xs font-black uppercase tracking-[0.25em] text-red-400">
                PACKAGE OS
              </p>

              <h1 className="mt-3 text-3xl font-black md:text-5xl">
                Operasyon Alarm Merkezi
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
                Kritik görevleri ve SLA gecikmelerini tek ekrandan kontrol edin.
              </p>

            </div>


            <div className="flex flex-wrap gap-3">

              <Link
                href="/dashboard/package-os/task-pool"
                className="rounded-xl border border-white/10 px-5 py-3 text-sm font-black"
              >
                Görev Havuzu →
              </Link>

              <Link
                href="/dashboard/package-os"
                className="rounded-xl bg-red-500 px-5 py-3 text-sm font-black"
              >
                Package OS →
              </Link>

            </div>

          </div>


          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

            <Stat
              label="Okunmamış"
              value={
                stats.unread
              }
              danger={
                stats.unread >
                0
              }
            />

            <Stat
              label="Kritik"
              value={
                stats.critical
              }
              danger={
                stats.critical >
                0
              }
            />

            <Stat
              label="SLA Alarmı"
              value={
                stats.sla
              }
            />

            <Stat
              label="Sessizde"
              value={
                stats.muted
              }
            />

          </div>

        </section>


        {
          errorMessage &&
          (
            <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
              {
                errorMessage
              }
            </div>
          )
        }


        <section className="mt-6 rounded-[24px] border border-white/10 bg-slate-900 p-4">

          <div className="flex flex-wrap gap-2">

            {
              [
                ["active", "Aktif"],
                ["unread", "Okunmamış"],
                ["critical", "Kritik"],
                ["sla", "SLA"],
                ["muted", "Sessizde"],
                ["resolved", "Çözüldü"],
                ["all", "Tümü"],
              ].map(
                option => (
                  <button
                    key={
                      option[0]
                    }
                    type="button"
                    onClick={
                      () =>
                        setFilter(
                          option[0]
                        )
                    }
                    className={`rounded-xl px-4 py-3 text-xs font-black ${
                      filter ===
                        option[0]
                        ? "bg-red-500"
                        : "border border-white/10 bg-slate-950"
                    }`}
                  >
                    {
                      option[1]
                    }
                  </button>
                )
              )
            }

          </div>

        </section>


        <section className="mt-6 space-y-4">

          {
            loading
              ? (
                  <div className="rounded-[24px] border border-white/10 bg-slate-900 p-10 text-center text-slate-400">
                    Alarm merkezi hazırlanıyor...
                  </div>
                )
              : visible.length ===
                  0
                ? (
                    <div className="rounded-[24px] border border-white/10 bg-slate-900 p-10 text-center text-slate-500">
                      Bu filtrede alarm bulunmuyor.
                    </div>
                  )
                : visible.map(
                    alert => {

                      const muted =
                        Boolean(
                          alert.muted_until
                        )
                        &&
                        new Date(
                          alert.muted_until as string
                        ).getTime() >
                          now;


                      return (
                        <article
                          key={
                            alert.id
                          }
                          className={`rounded-[26px] border p-5 md:p-6 ${
                            alert.severity ===
                              "critical"
                              ? "border-red-500/30 bg-red-500/5"
                              : "border-orange-500/20 bg-slate-900"
                          }`}
                        >

                          <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr_auto]">

                            <div>

                              <div className="flex flex-wrap gap-2">

                                {
                                  !alert.read_at &&
                                  (
                                    <span className="rounded-full bg-cyan-500/15 px-3 py-1 text-[10px] font-black text-cyan-300">
                                      OKUNMADI
                                    </span>
                                  )
                                }

                                <span
                                  className={`rounded-full px-3 py-1 text-[10px] font-black ${
                                    alert.severity ===
                                      "critical"
                                      ? "bg-red-500/20 text-red-300"
                                      : "bg-orange-500/15 text-orange-300"
                                  }`}
                                >
                                  {
                                    alert.alert_type ===
                                      "critical_task"
                                      ? "KRİTİK GÖREV"
                                      : "SLA GECİKTİ"
                                  }
                                </span>

                                {
                                  muted &&
                                  (
                                    <span className="rounded-full bg-purple-500/15 px-3 py-1 text-[10px] font-black text-purple-300">
                                      SESSİZDE
                                    </span>
                                  )
                                }

                                {
                                  alert.resolved_at &&
                                  (
                                    <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-[10px] font-black text-emerald-300">
                                      ÇÖZÜLDÜ
                                    </span>
                                  )
                                }

                              </div>


                              <h2 className="mt-3 text-xl font-black">
                                {
                                  alert.title
                                }
                              </h2>


                              <p className="mt-2 text-sm text-slate-400">
                                {
                                  alert.description
                                }
                              </p>


                              <div className="mt-3 text-xs text-slate-500">

                                <span className="font-black text-white">
                                  {
                                    alert.booking_code
                                  }
                                </span>

                                {" · "}

                                {
                                  alert.customer_name
                                }

                                {
                                  alert.item_name
                                    ? ` · ${alert.item_name}`
                                    : ""
                                }

                              </div>

                            </div>


                            <div>

                              <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                                Alarm Zamanı
                              </div>

                              <div className="mt-2 text-sm font-black">
                                {
                                  dateTime(
                                    alert.created_at
                                  )
                                }
                              </div>


                              {
                                alert.muted_until &&
                                (
                                  <>
                                    <div className="mt-4 text-[10px] font-black uppercase tracking-wider text-slate-500">
                                      Sessiz Bitişi
                                    </div>

                                    <div className="mt-1 text-sm">
                                      {
                                        dateTime(
                                          alert.muted_until
                                        )
                                      }
                                    </div>
                                  </>
                                )
                              }

                            </div>


                            <div className="flex flex-wrap gap-2 xl:w-56 xl:flex-col">

                              <Link
                                href={
                                  `/dashboard/package-os/bookings/${alert.booking_id}`
                                }
                                className="rounded-xl bg-red-500 px-4 py-3 text-center text-xs font-black"
                              >
                                Rezervasyona Git →
                              </Link>


                              {
                                !alert.assigned_to &&
                                !alert.resolved_at &&
                                (
                                  <button
                                    type="button"
                                    disabled={
                                      savingId ===
                                      alert.id
                                    }
                                    onClick={
                                      () =>
                                        void action(
                                          alert.id,
                                          "assign_to_me"
                                        )
                                    }
                                    className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-xs font-black text-cyan-300"
                                  >
                                    Bana Ata
                                  </button>
                                )
                              }


                              {
                                alert.read_at
                                  ? (
                                      <button
                                        type="button"
                                        onClick={
                                          () =>
                                            void action(
                                              alert.id,
                                              "unread"
                                            )
                                        }
                                        className="rounded-xl border border-white/10 px-4 py-3 text-xs font-black"
                                      >
                                        Okunmadı Yap
                                      </button>
                                    )
                                  : (
                                      <button
                                        type="button"
                                        onClick={
                                          () =>
                                            void action(
                                              alert.id,
                                              "read"
                                            )
                                        }
                                        className="rounded-xl border border-white/10 px-4 py-3 text-xs font-black"
                                      >
                                        Okundu
                                      </button>
                                    )
                              }


                              {
                                muted
                                  ? (
                                      <button
                                        type="button"
                                        onClick={
                                          () =>
                                            void action(
                                              alert.id,
                                              "unmute"
                                            )
                                        }
                                        className="rounded-xl border border-purple-500/20 bg-purple-500/10 px-4 py-3 text-xs font-black text-purple-300"
                                      >
                                        Sessizi Kaldır
                                      </button>
                                    )
                                  : !alert.resolved_at &&
                                    (
                                      <button
                                        type="button"
                                        onClick={
                                          () =>
                                            void action(
                                              alert.id,
                                              "mute_4h"
                                            )
                                        }
                                        className="rounded-xl border border-purple-500/20 bg-purple-500/10 px-4 py-3 text-xs font-black text-purple-300"
                                      >
                                        4 Saat Sessize Al
                                      </button>
                                    )
                              }


                              {
                                alert.resolved_at
                                  ? (
                                      <button
                                        type="button"
                                        onClick={
                                          () =>
                                            void action(
                                              alert.id,
                                              "reopen"
                                            )
                                        }
                                        className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs font-black text-amber-300"
                                      >
                                        Yeniden Aç
                                      </button>
                                    )
                                  : (
                                      <button
                                        type="button"
                                        onClick={
                                          () =>
                                            void action(
                                              alert.id,
                                              "resolve"
                                            )
                                        }
                                        className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs font-black text-emerald-300"
                                      >
                                        Alarmı Kapat
                                      </button>
                                    )
                              }

                            </div>

                          </div>

                        </article>
                      );

                    }
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
  danger = false,
}: {
  label:
    string;

  value:
    number;

  danger?:
    boolean;
}) {

  return (
    <div
      className={`rounded-2xl border p-5 ${
        danger
          ? "border-red-500/30 bg-red-500/10"
          : "border-white/10 bg-slate-950"
      }`}
    >

      <div className="text-xs font-black uppercase tracking-wider text-slate-500">
        {
          label
        }
      </div>

      <div
        className={`mt-2 text-3xl font-black ${
          danger
            ? "text-red-300"
            : ""
        }`}
      >
        {
          value
        }
      </div>

    </div>
  );
}
