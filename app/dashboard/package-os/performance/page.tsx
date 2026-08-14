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


type PersonPerformance = {
  user_id:
    string;

  full_name:
    string;

  role:
    string;

  acknowledged_count:
    number;

  level_2_count:
    number;

  level_3_count:
    number;

  average_response_seconds:
    number;

  fastest_response_seconds:
    number;

  slowest_response_seconds:
    number;
};


type PerformanceData = {
  days:
    number;

  total_acknowledged:
    number;

  level_2_count:
    number;

  level_3_count:
    number;

  average_response_seconds:
    number;

  fastest_response_seconds:
    number;

  slowest_response_seconds:
    number;

  total_escalated:
    number;

  acknowledgement_rate:
    number;

  people:
    PersonPerformance[];
};


const emptyData:
  PerformanceData = {

    days:
      30,

    total_acknowledged:
      0,

    level_2_count:
      0,

    level_3_count:
      0,

    average_response_seconds:
      0,

    fastest_response_seconds:
      0,

    slowest_response_seconds:
      0,

    total_escalated:
      0,

    acknowledgement_rate:
      0,

    people:
      [],
  };


function duration(
  seconds:
    number
) {

  const safe =
    Math.max(
      0,
      Number(
        seconds ||
        0
      )
    );


  if (
    safe <
    60
  ) {
    return `${Math.round(safe)} sn`;
  }


  const minutes =
    Math.floor(
      safe /
      60
    );


  if (
    minutes <
    60
  ) {
    return `${minutes} dk`;
  }


  const hours =
    Math.floor(
      minutes /
      60
    );

  const rest =
    minutes %
    60;


  return `${hours} sa ${rest} dk`;
}


function roleText(
  role:
    string
) {

  if (
    role ===
    "company_owner"
  ) {
    return "Firma Sahibi";
  }


  if (
    role ===
    "operation_manager"
  ) {
    return "Operasyon Müdürü";
  }


  if (
    role ===
    "super_admin"
  ) {
    return "Süper Yönetici";
  }


  return role ||
    "Kullanıcı";
}


export default function
PackagePerformancePage() {

  const [
    days,
    setDays,
  ] =
    useState(
      30
    );


  const [
    data,
    setData,
  ] =
    useState<
      PerformanceData
    >(
      emptyData
    );


  const [
    loading,
    setLoading,
  ] =
    useState(
      true
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

        setErrorMessage(
          ""
        );


        try {

          const auth =
            await supabase.auth.getUser();


          if (
            !auth.data.user
          ) {

            throw new Error(
              "Oturum bulunamadı."
            );

          }


          const membership =
            await getCurrentMembership(
              auth.data.user.id
            );


          if (!membership) {

            throw new Error(
              "Aktif şirket üyeliği bulunamadı."
            );

          }


          const result =
            await supabase.rpc(
              "get_package_management_performance",
              {
                p_company_id:
                  membership.company_id,

                p_days:
                  days,
              }
            );


          if (
            result.error
          ) {
            throw result.error;
          }


          const raw =
            result.data ??
            {};


          setData({

            days:
              Number(
                raw.days ??
                days
              ),

            total_acknowledged:
              Number(
                raw.total_acknowledged ??
                0
              ),

            level_2_count:
              Number(
                raw.level_2_count ??
                0
              ),

            level_3_count:
              Number(
                raw.level_3_count ??
                0
              ),

            average_response_seconds:
              Number(
                raw.average_response_seconds ??
                0
              ),

            fastest_response_seconds:
              Number(
                raw.fastest_response_seconds ??
                0
              ),

            slowest_response_seconds:
              Number(
                raw.slowest_response_seconds ??
                0
              ),

            total_escalated:
              Number(
                raw.total_escalated ??
                0
              ),

            acknowledgement_rate:
              Number(
                raw.acknowledgement_rate ??
                0
              ),

            people:
              Array.isArray(
                raw.people
              )
                ? raw.people
                : [],
          });


        } catch (
          error
        ) {

          setData(
            emptyData
          );


          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Performans verileri alınamadı."
          );

        }


        setLoading(
          false
        );

      },
      [
        days,
      ]
    );


  useEffect(
    () => {

      void load();

    },
    [
      load,
    ]
  );


  const sorted =
    useMemo(
      () =>
        [...data.people].sort(
          (
            first,
            second
          ) => {

            if (
              first.acknowledged_count ===
              0
              &&
              second.acknowledged_count >
              0
            ) {
              return 1;
            }


            if (
              second.acknowledged_count ===
              0
              &&
              first.acknowledged_count >
              0
            ) {
              return -1;
            }


            return (
              first.average_response_seconds
              -
              second.average_response_seconds
            );

          }
        ),
      [
        data.people,
      ]
    );


  return (
    <main className="min-h-screen bg-slate-950 p-5 text-white md:p-8">

      <div className="mx-auto max-w-[1500px]">

        <section className="rounded-[30px] border border-white/10 bg-slate-900 p-6 md:p-8">

          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">

            <div>

              <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-400">
                TUROBUS PACKAGE OS
              </p>

              <h1 className="mt-3 text-3xl font-black md:text-5xl">
                Yönetim & Operasyon Performansı
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
                Eskale edilen kritik operasyon alarmlarında yöneticilerin müdahale hızını ve alarm üstlenme performansını ölçün.
              </p>

            </div>


            <div className="flex flex-wrap gap-2">

              {
                [
                  7,
                  30,
                  90,
                ].map(
                  value => (
                    <button
                      key={
                        value
                      }
                      type="button"
                      onClick={
                        () =>
                          setDays(
                            value
                          )
                      }
                      className={`rounded-xl px-5 py-3 text-sm font-black ${
                        days ===
                          value
                          ? "bg-cyan-400 text-slate-950"
                          : "border border-white/10 bg-slate-950 text-slate-300"
                      }`}
                    >
                      {
                        value
                      }
                      {" Gün"}
                    </button>
                  )
                )
              }

            </div>

          </div>

        </section>


        {
          errorMessage &&
          (
            <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
              {
                errorMessage
              }
            </div>
          )
        }


        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <Metric
            label="Üstlenilen Alarm"
            value={
              loading
                ? "…"
                : String(
                    data.total_acknowledged
                  )
            }
          />

          <Metric
            label="Üstlenme Oranı"
            value={
              loading
                ? "…"
                : `%${data.acknowledgement_rate.toFixed(1)}`
            }
          />

          <Metric
            label="Ort. Müdahale"
            value={
              loading
                ? "…"
                : duration(
                    data.average_response_seconds
                  )
            }
          />

          <Metric
            label="L3 Yönetim"
            value={
              loading
                ? "…"
                : String(
                    data.level_3_count
                  )
            }
            danger={
              data.level_3_count >
              0
            }
          />

          <Metric
            label="L2 Eskalasyon"
            value={
              loading
                ? "…"
                : String(
                    data.level_2_count
                  )
            }
          />

          <Metric
            label="Toplam Eskalasyon"
            value={
              loading
                ? "…"
                : String(
                    data.total_escalated
                  )
            }
          />

          <Metric
            label="En Hızlı Müdahale"
            value={
              loading
                ? "…"
                : duration(
                    data.fastest_response_seconds
                  )
            }
          />

          <Metric
            label="En Yavaş Müdahale"
            value={
              loading
                ? "…"
                : duration(
                    data.slowest_response_seconds
                  )
            }
            danger={
              data.slowest_response_seconds >
              3600
            }
          />

        </section>


        <section className="mt-6 rounded-[28px] border border-white/10 bg-slate-900 p-6">

          <div className="flex flex-wrap items-center justify-between gap-4">

            <div>

              <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                YÖNETİCİ SIRALAMASI
              </p>

              <h2 className="mt-2 text-2xl font-black">
                Müdahale Performansı
              </h2>

            </div>


            <Link
              href="/dashboard/package-os/alarm-center"
              className="rounded-xl border border-white/10 px-4 py-3 text-xs font-black"
            >
              Alarm Merkezi →
            </Link>

          </div>


          <div className="mt-6 overflow-x-auto">

            <table className="min-w-full text-left text-sm">

              <thead className="text-xs uppercase text-slate-500">

                <tr>

                  <th className="px-4 py-3">
                    #
                  </th>

                  <th className="px-4 py-3">
                    Yönetici
                  </th>

                  <th className="px-4 py-3">
                    Rol
                  </th>

                  <th className="px-4 py-3">
                    Üstlendi
                  </th>

                  <th className="px-4 py-3">
                    L2
                  </th>

                  <th className="px-4 py-3">
                    L3
                  </th>

                  <th className="px-4 py-3">
                    Ortalama
                  </th>

                  <th className="px-4 py-3">
                    En Hızlı
                  </th>

                  <th className="px-4 py-3">
                    En Yavaş
                  </th>

                </tr>

              </thead>


              <tbody>

                {
                  loading
                    ? (
                        <tr>
                          <td
                            colSpan={
                              9
                            }
                            className="px-4 py-10 text-center text-slate-500"
                          >
                            Performans hazırlanıyor...
                          </td>
                        </tr>
                      )
                    : sorted.length ===
                        0
                      ? (
                          <tr>
                            <td
                              colSpan={
                                9
                              }
                              className="px-4 py-10 text-center text-slate-500"
                            >
                              Bu dönemde henüz yönetici müdahale kaydı bulunmuyor.
                            </td>
                          </tr>
                        )
                      : sorted.map(
                          (
                            person,
                            index
                          ) => (
                            <tr
                              key={
                                person.user_id
                              }
                              className="border-t border-white/5"
                            >

                              <td className="px-4 py-4 font-black text-slate-500">
                                {
                                  index +
                                  1
                                }
                              </td>

                              <td className="px-4 py-4 font-black">
                                {
                                  person.full_name
                                }
                              </td>

                              <td className="px-4 py-4 text-slate-400">
                                {
                                  roleText(
                                    person.role
                                  )
                                }
                              </td>

                              <td className="px-4 py-4 font-black">
                                {
                                  person.acknowledged_count
                                }
                              </td>

                              <td className="px-4 py-4">
                                {
                                  person.level_2_count
                                }
                              </td>

                              <td className="px-4 py-4">
                                {
                                  person.level_3_count
                                }
                              </td>

                              <td className="px-4 py-4 font-black text-cyan-300">
                                {
                                  duration(
                                    person.average_response_seconds
                                  )
                                }
                              </td>

                              <td className="px-4 py-4 text-emerald-300">
                                {
                                  duration(
                                    person.fastest_response_seconds
                                  )
                                }
                              </td>

                              <td className="px-4 py-4 text-orange-300">
                                {
                                  duration(
                                    person.slowest_response_seconds
                                  )
                                }
                              </td>

                            </tr>
                          )
                        )
                }

              </tbody>

            </table>

          </div>

        </section>


        <section className="mt-6 grid gap-4 md:grid-cols-3">

          <Link
            href="/dashboard/package-os/task-pool"
            className="rounded-2xl border border-white/10 bg-slate-900 p-5 transition hover:border-cyan-500/30"
          >
            <div className="font-black">
              Görev Havuzu
            </div>

            <div className="mt-2 text-sm text-slate-500">
              Açık ve geciken operasyon görevlerini yönet.
            </div>
          </Link>


          <Link
            href="/dashboard/package-os/alarm-center"
            className="rounded-2xl border border-white/10 bg-slate-900 p-5 transition hover:border-red-500/30"
          >
            <div className="font-black">
              Alarm Merkezi
            </div>

            <div className="mt-2 text-sm text-slate-500">
              L1, L2 ve L3 alarm zincirlerini incele.
            </div>
          </Link>


          <Link
            href="/dashboard/package-os"
            className="rounded-2xl border border-white/10 bg-slate-900 p-5 transition hover:border-emerald-500/30"
          >
            <div className="font-black">
              Package OS
            </div>

            <div className="mt-2 text-sm text-slate-500">
              Paket satış merkezinin genel görünümüne dön.
            </div>
          </Link>

        </section>

      </div>

    </main>
  );
}


function Metric({
  label,
  value,
  danger = false,
}: {
  label:
    string;

  value:
    string;

  danger?:
    boolean;
}) {

  return (
    <div
      className={`rounded-2xl border p-5 ${
        danger
          ? "border-red-500/30 bg-red-500/10"
          : "border-white/10 bg-slate-900"
      }`}
    >

      <div className="text-xs font-black uppercase tracking-wider text-slate-500">
        {
          label
        }
      </div>

      <div
        className={`mt-3 text-3xl font-black ${
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
