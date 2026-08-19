"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  FaArrowLeft,
  FaBolt,
  FaCheckCircle,
  FaExclamationTriangle,
  FaLink,
  FaPause,
  FaPlay,
  FaShieldAlt,
  FaSync,
  FaUserPlus,
} from "react-icons/fa";

import {
  getCurrentMembership,
  getCurrentUser,
} from "@/lib/current-user";

import {
  disableCustomer360LiveSync,
  installCustomer360LiveSync,
  loadCustomer360LiveSyncEvents,
  loadCustomer360LiveSyncHealth,
} from "@/lib/customer-360/repository";

import type {
  Customer360LiveSyncEvent,
  Customer360LiveSyncHealth,
} from "@/lib/customer-360/repository";


const emptyHealth:
  Customer360LiveSyncHealth = {
    ok: true,

    enabled: false,

    registered_sources: 0,
    installed_triggers: 0,

    matched_24h: 0,
    created_24h: 0,
    conflict_24h: 0,
    error_24h: 0,
  };


function formatDate(
  value: string
) {
  return new Intl.DateTimeFormat(
    "tr-TR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(
    new Date(
      value
    )
  );
}


function statusTone(
  status:
    Customer360LiveSyncEvent["event_status"]
) {
  if (
    status ===
      "matched"
  ) {
    return "border-blue-500/20 bg-blue-500/10 text-blue-300";
  }

  if (
    status ===
      "created"
  ) {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
  }

  if (
    status ===
      "conflict"
  ) {
    return "border-amber-500/20 bg-amber-500/10 text-amber-300";
  }

  if (
    status ===
      "error"
  ) {
    return "border-red-500/20 bg-red-500/10 text-red-300";
  }

  return "border-white/10 bg-white/[.03] text-slate-400";
}


export default function Customer360LiveSyncPage() {
  const [
    companyId,
    setCompanyId,
  ] =
    useState("");


  const [
    health,
    setHealth,
  ] =
    useState(
      emptyHealth
    );


  const [
    events,
    setEvents,
  ] =
    useState<
      Customer360LiveSyncEvent[]
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


  const refresh =
    useCallback(
      async (
        currentCompanyId:
          string
      ) => {
        const [
          healthData,
          eventData,
        ] =
          await Promise.all([
            loadCustomer360LiveSyncHealth(
              currentCompanyId
            ),

            loadCustomer360LiveSyncEvents(
              currentCompanyId
            ),
          ]);


        setHealth(
          healthData
        );

        setEvents(
          eventData
        );
      },
      []
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


  async function enableSync() {
    if (
      !window.confirm(
        "Yeni uygun rezervasyon ve teklif kayıtları Customer 360 ile anlık eşleştirilecek. Kaynak kayıtlar değiştirilmeyecek. Etkinleştirilsin mi?"
      )
    ) {
      return;
    }


    setBusy(
      true
    );

    setError("");
    setNotice("");


    try {

      const result =
        await installCustomer360LiveSync(
          companyId
        );


      await refresh(
        companyId
      );


      setNotice(
        `Anlık senkronizasyon etkin. ${result.triggers_installed} kaynak tablosu hazırlandı.`
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


  async function disableSync() {
    if (
      !window.confirm(
        "Bu firma için anlık Customer 360 senkronizasyonu durdurulsun mu?"
      )
    ) {
      return;
    }


    setBusy(
      true
    );

    setError("");
    setNotice("");


    try {

      await disableCustomer360LiveSync(
        companyId
      );


      await refresh(
        companyId
      );


      setNotice(
        "Anlık senkronizasyon bu firma için durduruldu."
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
      <main className="grid min-h-[70vh] place-items-center bg-[#030a11] text-white">
        Canlı senkronizasyon merkezi yükleniyor...
      </main>
    );
  }


  return (
    <main className="min-h-screen bg-[#030a11] text-white">

      <div className="mx-auto max-w-[1600px] px-5 py-7 lg:px-8">

        <Link
          href="/dashboard/musteri-360"
          className="inline-flex items-center gap-2 text-[10px] font-black text-slate-500 transition hover:text-orange-300"
        >
          <FaArrowLeft />
          Müşteri 360
        </Link>


        <section className="mt-4 rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,.16),transparent_36%),linear-gradient(145deg,#07131f,#040b12)] p-6 lg:p-8">

          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">

            <div>

              <div className="flex flex-wrap gap-2">

                <span className="rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[.2em] text-orange-300">
                  CUSTOMER LIVE IDENTITY
                </span>


                <span
                  className={`rounded-full border px-3 py-1.5 text-[9px] font-black ${
                    health.enabled
                      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                      : "border-slate-500/20 bg-slate-500/10 text-slate-400"
                  }`}
                >
                  {health.enabled
                    ? "● CANLI SENKRON AKTİF"
                    : "○ SENKRON DURAKLATILDI"}
                </span>

              </div>


              <h1 className="mt-5 text-3xl font-black tracking-[-.04em] lg:text-5xl">
                Anlık{" "}
                <span className="text-orange-400">
                  Müşteri Senkronizasyonu
                </span>
              </h1>


              <p className="mt-3 max-w-3xl text-xs leading-6 text-slate-400">
                Yeni rezervasyon ve teklif kayıtlarını oluşturuldukları anda Müşteri 360 kimliğiyle eşleştirir. Güvenli müşteriyi bulur veya oluşturur; ortak telefon/e-posta ve farklı isim durumlarında otomatik birleştirme yapmaz.
              </p>

            </div>


            <div className="flex flex-wrap gap-3">

              <button
                type="button"
                disabled={
                  busy
                }
                onClick={() =>
                  void refresh(
                    companyId
                  )
                }
                className="flex min-h-12 items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-5 text-xs font-black text-slate-300"
              >
                <FaSync />
                Yenile
              </button>


              {health.enabled ? (
                <button
                  type="button"
                  disabled={
                    busy
                  }
                  onClick={() =>
                    void disableSync()
                  }
                  className="flex min-h-12 items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/[.07] px-5 text-xs font-black text-red-300"
                >
                  <FaPause />
                  Senkronu Durdur
                </button>
              ) : (
                <button
                  type="button"
                  disabled={
                    busy
                  }
                  onClick={() =>
                    void enableSync()
                  }
                  className="flex min-h-12 items-center gap-2 rounded-xl bg-orange-500 px-5 text-xs font-black text-white shadow-lg shadow-orange-500/10"
                >
                  <FaPlay />
                  Canlı Senkronu Etkinleştir
                </button>
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


        {notice && (
          <div className="mt-4 flex gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/[.06] p-4 text-xs font-bold text-emerald-200">
            <FaCheckCircle />
            {notice}
          </div>
        )}


        <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

          {[
            {
              title:
                "Kayıtlı Kaynak",

              value:
                health.registered_sources,

              detail:
                "Tanımlanan uygun işlem tabloları",

              icon:
                <FaLink />,
            },

            {
              title:
                "Aktif Trigger",

              value:
                health.installed_triggers,

              detail:
                "Yeni kayıtları izleyen kaynak tablolar",

              icon:
                <FaBolt />,
            },

            {
              title:
                "Yeni Profil · 24s",

              value:
                health.created_24h,

              detail:
                "Anlık oluşturulan müşteriler",

              icon:
                <FaUserPlus />,
            },

            {
              title:
                "Conflict · 24s",

              value:
                health.conflict_24h,

              detail:
                "Otomatik birleştirilmeyen riskler",

              icon:
                <FaShieldAlt />,
            },
          ].map(
            (
              item
            ) => (
              <article
                key={
                  item.title
                }
                className="rounded-[24px] border border-white/10 bg-[#07131f] p-5"
              >
                <div className="flex items-start justify-between gap-3">

                  <div>

                    <div className="text-[8px] font-black uppercase tracking-[.15em] text-slate-600">
                      {item.title}
                    </div>


                    <div className="mt-3 text-3xl font-black">
                      {item.value}
                    </div>


                    <div className="mt-2 text-[9px] text-slate-500">
                      {item.detail}
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


        <section className="mt-5 grid gap-4 sm:grid-cols-2">

          <article className="rounded-[22px] border border-blue-500/15 bg-[#07131f] p-5">
            <div className="text-[8px] font-black uppercase tracking-[.15em] text-blue-400/70">
              Timeline Bağlantısı · 24s
            </div>

            <div className="mt-3 text-3xl font-black text-blue-300">
              {health.matched_24h}
            </div>

            <div className="mt-2 text-[9px] text-slate-500">
              Customer 360 profiline anlık bağlanan işlem kayıtları
            </div>
          </article>


          <article className="rounded-[22px] border border-red-500/15 bg-[#07131f] p-5">
            <div className="text-[8px] font-black uppercase tracking-[.15em] text-red-400/70">
              Senkron Hatası · 24s
            </div>

            <div className="mt-3 text-3xl font-black text-red-300">
              {health.error_24h}
            </div>

            <div className="mt-2 text-[9px] text-slate-500">
              Kaynak rezervasyonu durdurmadan kayıt altına alınan senkron hataları
            </div>
          </article>

        </section>


        <section className="mt-5 overflow-hidden rounded-[26px] border border-white/10 bg-[#07131f]">

          <div className="flex items-center justify-between border-b border-white/[.07] p-5">

            <div>

              <div className="text-sm font-black">
                Canlı Senkronizasyon Günlüğü
              </div>

              <div className="mt-1 text-[9px] text-slate-600">
                Son 100 olay
              </div>

            </div>


            <FaBolt className="text-orange-300" />

          </div>


          {events.length ===
          0 ? (
            <div className="p-12 text-center">

              <FaBolt className="mx-auto text-4xl text-slate-800" />

              <div className="mt-4 text-sm font-black">
                Henüz canlı senkron olayı yok
              </div>

              <div className="mt-2 text-[10px] text-slate-600">
                Sistem etkinleştirildikten sonra yeni rezervasyon ve teklif kayıtları burada görünür.
              </div>

            </div>
          ) : (
            <div className="overflow-x-auto">

              <table className="min-w-full">

                <thead>

                  <tr className="border-b border-white/[.07] text-left text-[8px] font-black uppercase tracking-[.13em] text-slate-600">

                    <th className="px-5 py-4">
                      Tarih
                    </th>

                    <th className="px-5 py-4">
                      Kaynak
                    </th>

                    <th className="px-5 py-4">
                      Müşteri
                    </th>

                    <th className="px-5 py-4">
                      Temas
                    </th>

                    <th className="px-5 py-4">
                      Durum
                    </th>

                    <th className="px-5 py-4">
                      Açıklama
                    </th>

                  </tr>

                </thead>


                <tbody>

                  {events.map(
                    (
                      event
                    ) => (
                      <tr
                        key={
                          event.id
                        }
                        className="border-b border-white/[.05] hover:bg-white/[.02]"
                      >

                        <td className="whitespace-nowrap px-5 py-4 text-[9px] text-slate-500">
                          {formatDate(
                            event.created_at
                          )}
                        </td>


                        <td className="px-5 py-4">

                          <div className="text-[9px] font-black text-orange-300">
                            {event.entity_type}
                          </div>

                          <div className="mt-1 max-w-[180px] truncate text-[8px] text-slate-700">
                            {event.source_table}
                          </div>

                        </td>


                        <td className="px-5 py-4">

                          {event.customer_id ? (
                            <Link
                              href={`/dashboard/musteri-360/${event.customer_id}`}
                              className="text-[10px] font-black text-slate-300 hover:text-orange-300"
                            >
                              {event.source_name ||
                                "Profili Aç"}
                            </Link>
                          ) : (
                            <span className="text-[10px] font-black text-slate-400">
                              {event.source_name ||
                                "—"}
                            </span>
                          )}

                        </td>


                        <td className="px-5 py-4 text-[8px] leading-5 text-slate-500">

                          <div>
                            {event.source_phone ||
                              "—"}
                          </div>

                          <div>
                            {event.source_email ||
                              "—"}
                          </div>

                        </td>


                        <td className="px-5 py-4">

                          <span
                            className={`rounded-full border px-2.5 py-1 text-[7px] font-black uppercase ${statusTone(
                              event.event_status
                            )}`}
                          >
                            {event.event_status}
                          </span>

                        </td>


                        <td className="px-5 py-4 text-[9px] text-slate-500">
                          {event.event_reason}
                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>
          )}

        </section>


        <section className="mt-5 rounded-[26px] border border-emerald-500/15 bg-emerald-500/[.035] p-5">

          <div className="flex items-start gap-4">

            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-300">
              <FaShieldAlt />
            </div>


            <div>

              <div className="text-xs font-black">
                Non-blocking güvenlik
              </div>


              <p className="mt-2 max-w-5xl text-[9px] leading-5 text-slate-500">
                Customer 360 senkronizasyonunda hata oluşsa bile asıl rezervasyon veya teklif kaydı iptal edilmez. Hata olay günlüğüne alınır. Kaynak tabloya UPDATE veya DELETE uygulanmaz.
              </p>

            </div>

          </div>

        </section>

      </div>

    </main>
  );
}
