"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import {
  supabase,
} from "@/lib/supabase";


type AutomationHealth = {
  healthy: boolean;

  scheduler: {
    installed: boolean;
    active: boolean;
    job_id: number | null;
    job_name: string | null;
    schedule: string | null;
  };

  last_run:
    | {
        id: string;
        status: "running" | "success" | "failed";
        run_type: string;
        started_at: string;
        completed_at: string | null;
        duration_ms: number | null;
        error_message: string | null;
      }
    | null;

  recent_failures_24h: number;

  checked_at: string;
};


function formatDate(
  value: string | null
) {
  if (!value) {
    return "-";
  }

  return new Date(
    value
  ).toLocaleString(
    "tr-TR"
  );
}


export default function AutomationHealthPage() {
  const [
    health,
    setHealth,
  ] =
    useState<AutomationHealth | null>(
      null
    );

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
    seconds,
    setSeconds,
  ] =
    useState(30);


  const loadHealth =
    useCallback(
      async () => {
        setErrorMessage("");

        const {
          data,
          error,
        } =
          await supabase.rpc(
            "get_package_os_automation_health"
          );

        if (
          error ||
          !data
        ) {
          setErrorMessage(
            error?.message ||
            "Otomasyon sağlık bilgisi alınamadı."
          );

          setLoading(false);

          return;
        }

        setHealth(
          data as AutomationHealth
        );

        setSeconds(30);

        setLoading(false);
      },
      []
    );


  useEffect(
    () => {
      void loadHealth();
    },
    [
      loadHealth,
    ]
  );


  useEffect(
    () => {
      const timer =
        window.setInterval(
          () => {
            setSeconds(
              current => {
                if (
                  current <= 1
                ) {
                  void loadHealth();

                  return 30;
                }

                return current - 1;
              }
            );
          },
          1000
        );

      return () => {
        window.clearInterval(
          timer
        );
      };
    },
    [
      loadHealth,
    ]
  );


  if (loading) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center bg-slate-950 text-white">
        Otomasyon sistemi kontrol ediliyor...
      </main>
    );
  }


  return (
    <main className="min-h-screen bg-slate-950 p-5 text-white md:p-8">
      <div className="mx-auto max-w-6xl">

        <section className="rounded-[30px] border border-white/10 bg-slate-900 p-6 md:p-8">

          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-400">
                TUROBUS AUTOMATION ENGINE
              </p>

              <h1 className="mt-3 text-3xl font-black md:text-5xl">
                Sistem Sağlık Monitörü
              </h1>

              <p className="mt-3 max-w-2xl text-slate-400">
                Paket operasyon hatırlatmaları,
                gecikme alarmları ve otomatik
                scheduler çalışma durumunu takip eder.
              </p>
            </div>


            <div className="flex flex-wrap gap-2">

              <div
                className={
                  health?.healthy
                    ? "rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-3 font-black text-emerald-300"
                    : "rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-3 font-black text-red-300"
                }
              >
                {
                  health?.healthy
                    ? "● SİSTEM SAĞLIKLI"
                    : "● KONTROL GEREKİYOR"
                }
              </div>

              <button
                type="button"
                onClick={() =>
                  void loadHealth()
                }
                className="rounded-xl bg-white px-5 py-3 text-sm font-black text-slate-950"
              >
                Yenile · {seconds}s
              </button>

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


        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">

          <HealthCard
            title="Scheduler"
            value={
              health?.scheduler.active
                ? "AKTİF"
                : "PASİF"
            }
            good={
              Boolean(
                health?.scheduler.active
              )
            }
          />

          <HealthCard
            title="Çalışma Aralığı"
            value={
              health?.scheduler.schedule ||
              "-"
            }
            good={
              Boolean(
                health?.scheduler.schedule
              )
            }
          />

          <HealthCard
            title="Son Çalışma"
            value={
              health?.last_run?.status
                ? health.last_run.status
                    .toLocaleUpperCase(
                      "tr-TR"
                    )
                : "YOK"
            }
            good={
              health?.last_run?.status ===
              "success"
            }
          />

          <HealthCard
            title="24 Saat Hata"
            value={
              String(
                health
                  ?.recent_failures_24h ??
                0
              )
            }
            good={
              (
                health
                  ?.recent_failures_24h ??
                0
              ) === 0
            }
          />

        </section>


        <section className="mt-6 rounded-[26px] border border-white/10 bg-slate-900 p-6">

          <h2 className="text-xl font-black">
            Scheduler Bilgileri
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-2">

            <InfoRow
              label="Job"
              value={
                health?.scheduler.job_name ||
                "-"
              }
            />

            <InfoRow
              label="Job ID"
              value={
                String(
                  health?.scheduler.job_id ??
                  "-"
                )
              }
            />

            <InfoRow
              label="Cron"
              value={
                health?.scheduler.schedule ||
                "-"
              }
            />

            <InfoRow
              label="Durum"
              value={
                health?.scheduler.active
                  ? "Aktif"
                  : "Pasif"
              }
            />

          </div>

        </section>


        <section className="mt-6 rounded-[26px] border border-white/10 bg-slate-900 p-6">

          <h2 className="text-xl font-black">
            Son Otomasyon Çalışması
          </h2>

          {
            health?.last_run
              ? (
                <div className="mt-5 grid gap-4 md:grid-cols-2">

                  <InfoRow
                    label="Durum"
                    value={
                      health.last_run.status
                    }
                  />

                  <InfoRow
                    label="Tip"
                    value={
                      health.last_run.run_type
                    }
                  />

                  <InfoRow
                    label="Başlangıç"
                    value={
                      formatDate(
                        health.last_run.started_at
                      )
                    }
                  />

                  <InfoRow
                    label="Bitiş"
                    value={
                      formatDate(
                        health.last_run.completed_at
                      )
                    }
                  />

                  <InfoRow
                    label="Süre"
                    value={
                      health.last_run.duration_ms !==
                      null
                        ? `${health.last_run.duration_ms} ms`
                        : "-"
                    }
                  />

                  <InfoRow
                    label="Hata"
                    value={
                      health.last_run.error_message ||
                      "Yok"
                    }
                  />

                </div>
              )
              : (
                <p className="mt-5 text-slate-500">
                  Henüz scheduler çalışma kaydı bulunmuyor.
                </p>
              )
          }

        </section>

      </div>
    </main>
  );
}


function HealthCard({
  title,
  value,
  good,
}: {
  title: string;
  value: string;
  good: boolean;
}) {
  return (
    <div
      className={
        good
          ? "rounded-[22px] border border-emerald-500/20 bg-emerald-500/[0.07] p-5"
          : "rounded-[22px] border border-red-500/20 bg-red-500/[0.07] p-5"
      }
    >
      <p className="text-xs font-black uppercase tracking-wider text-slate-500">
        {title}
      </p>

      <p
        className={
          good
            ? "mt-3 text-2xl font-black text-emerald-300"
            : "mt-3 text-2xl font-black text-red-300"
        }
      >
        {value}
      </p>
    </div>
  );
}


function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950 p-4">
      <p className="text-xs font-black uppercase tracking-wider text-slate-500">
        {label}
      </p>

      <p className="mt-2 break-all font-bold">
        {value}
      </p>
    </div>
  );
}
