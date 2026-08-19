"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  FaArrowLeft,
  FaCheckCircle,
  FaExclamationTriangle,
  FaFingerprint,
  FaLayerGroup,
  FaShieldAlt,
  FaSync,
  FaUserPlus,
  FaUsers,
} from "react-icons/fa";

import {
  getCurrentMembership,
  getCurrentUser,
} from "@/lib/current-user";

import {
  analyzeCustomer360AutoProfiles,
  buildCustomer360MatchQueue,
  createCustomer360SafeProfiles,
  discoverCustomer360Sources,
  loadCustomer360DuplicateHealth,
  loadCustomer360MatchQueue,
} from "@/lib/customer-360/repository";

import type {
  Customer360AutoProfileAnalysis,
  Customer360DuplicateHealth,
  Customer360MatchQueueRow,
} from "@/lib/customer-360/repository";


const emptyAnalysis:
  Customer360AutoProfileAnalysis = {
    ok: true,
    unmatched: 0,
    safe_candidate_rows: 0,
    ambiguous_rows: 0,
    missing_name_rows: 0,
  };


const emptyHealth:
  Customer360DuplicateHealth = {
    ok: true,
    duplicate_phone_groups: 0,
    duplicate_email_groups: 0,
    conflict_queue: 0,
  };


export default function Customer360AutoProfilePage() {
  const [
    companyId,
    setCompanyId,
  ] =
    useState("");


  const [
    analysis,
    setAnalysis,
  ] =
    useState(
      emptyAnalysis
    );


  const [
    health,
    setHealth,
  ] =
    useState(
      emptyHealth
    );


  const [
    queue,
    setQueue,
  ] =
    useState<
      Customer360MatchQueueRow[]
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
          analysisData,
          healthData,
          queueData,
        ] =
          await Promise.all([
            analyzeCustomer360AutoProfiles(
              currentCompanyId
            ),

            loadCustomer360DuplicateHealth(
              currentCompanyId
            ),

            loadCustomer360MatchQueue(
              currentCompanyId
            ),
          ]);


        setAnalysis(
          analysisData
        );

        setHealth(
          healthData
        );

        setQueue(
          queueData
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


  async function rescan() {
    setBusy(
      true
    );

    setError("");
    setNotice("");


    try {
      await discoverCustomer360Sources();

      await buildCustomer360MatchQueue(
        companyId
      );

      await refresh(
        companyId
      );


      setNotice(
        "Tüm uygun kaynaklar yeniden analiz edildi. Eşleşmeyen müşteri adayları da kuyruğa alındı."
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


  async function createProfiles() {
    if (
      !window.confirm(
        "Sistem yalnızca aynı telefon/e-postanın tek müşteri adına ait olduğu güvenli kayıtları yeni Müşteri 360 profiline dönüştürecek. Farklı isim bulunan kayıtlar oluşturulmayacak. Devam edilsin mi?"
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
        await createCustomer360SafeProfiles(
          companyId
        );


      await refresh(
        companyId
      );


      setNotice(
        `${result.customers_created} yeni güvenli müşteri profili oluşturuldu.`
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


  const conflicts =
    queue
      .filter(
        (
          item
        ) =>
          item.status ===
          "conflict"
      )
      .slice(
        0,
        12
      );


  if (
    loading
  ) {
    return (
      <main className="grid min-h-[70vh] place-items-center bg-[#030a11] text-white">
        Otomatik müşteri profilleri analiz ediliyor...
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


        <section className="mt-4 rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,.15),transparent_36%),linear-gradient(145deg,#07131f,#040b12)] p-6 lg:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">

            <div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[.2em] text-orange-300">
                  CUSTOMER IDENTITY CONTROL
                </span>

                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[9px] font-black text-emerald-300">
                  Duplicate Guard Aktif
                </span>
              </div>

              <h1 className="mt-5 text-3xl font-black tracking-[-.04em] lg:text-5xl">
                Otomatik{" "}
                <span className="text-orange-400">
                  Müşteri Profilleri
                </span>
              </h1>

              <p className="mt-3 max-w-3xl text-xs leading-6 text-slate-400">
                Eski rezervasyon ve teklif kayıtlarından henüz merkezi profili bulunmayan müşterileri güvenli biçimde oluşturur. Ortak telefon/e-posta veya farklı isim tespit edilirse işlem otomatik durdurulur ve kayıt manuel incelemeye bırakılır.
              </p>
            </div>


            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={
                  busy
                }
                onClick={() =>
                  void rescan()
                }
                className="flex min-h-12 items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-5 text-xs font-black text-slate-200 transition hover:border-orange-500/20"
              >
                <FaSync />
                Tüm Kaynakları Yeniden Tara
              </button>


              <button
                type="button"
                disabled={
                  busy ||
                  analysis.safe_candidate_rows ===
                    0
                }
                onClick={() =>
                  void createProfiles()
                }
                className="flex min-h-12 items-center gap-2 rounded-xl bg-orange-500 px-5 text-xs font-black text-white shadow-lg shadow-orange-500/10 disabled:opacity-40"
              >
                <FaUserPlus />
                Güvenli Profilleri Oluştur
              </button>
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

          <article className="rounded-[24px] border border-white/10 bg-[#07131f] p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[8px] font-black uppercase tracking-[.15em] text-slate-600">
                  Eşleşmeyen Kayıt
                </div>

                <div className="mt-3 text-3xl font-black">
                  {analysis.unmatched}
                </div>

                <div className="mt-2 text-[9px] text-slate-500">
                  Henüz merkezi profili olmayan kaynak kayıt
                </div>
              </div>

              <FaLayerGroup className="text-orange-300" />
            </div>
          </article>


          <article className="rounded-[24px] border border-emerald-500/15 bg-[#07131f] p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[8px] font-black uppercase tracking-[.15em] text-emerald-500/70">
                  Güvenli Aday Satırı
                </div>

                <div className="mt-3 text-3xl font-black text-emerald-300">
                  {analysis.safe_candidate_rows}
                </div>

                <div className="mt-2 text-[9px] text-slate-500">
                  Tek isimli telefon/e-posta kümeleri
                </div>
              </div>

              <FaUserPlus className="text-emerald-300" />
            </div>
          </article>


          <article className="rounded-[24px] border border-red-500/15 bg-[#07131f] p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[8px] font-black uppercase tracking-[.15em] text-red-500/70">
                  Çakışmalı Kayıt
                </div>

                <div className="mt-3 text-3xl font-black text-red-300">
                  {analysis.ambiguous_rows +
                    health.conflict_queue}
                </div>

                <div className="mt-2 text-[9px] text-slate-500">
                  Otomatik oluşturulmayacak riskli kayıtlar
                </div>
              </div>

              <FaExclamationTriangle className="text-red-300" />
            </div>
          </article>


          <article className="rounded-[24px] border border-white/10 bg-[#07131f] p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[8px] font-black uppercase tracking-[.15em] text-slate-600">
                  Duplicate Health
                </div>

                <div className="mt-3 text-3xl font-black">
                  {health.duplicate_phone_groups +
                    health.duplicate_email_groups}
                </div>

                <div className="mt-2 text-[9px] text-slate-500">
                  Merkezi profillerde duplicate kimlik grubu
                </div>
              </div>

              <FaShieldAlt className="text-orange-300" />
            </div>
          </article>

        </section>


        <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_.9fr]">

          <section className="rounded-[26px] border border-white/10 bg-[#07131f] p-5 lg:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-black">
                  Otomatik Oluşturma Kuralları
                </div>

                <div className="mt-1 text-[9px] text-slate-600">
                  Müşteri verisinin yanlış birleşmesini önleyen güvenlik katmanı
                </div>
              </div>

              <FaFingerprint className="text-orange-300" />
            </div>


            <div className="mt-5 grid gap-3 sm:grid-cols-2">

              {[
                [
                  "Telefon Kontrolü",
                  "Normalize edilmiş telefon mevcut Customer 360 profilleriyle tekrar karşılaştırılır.",
                ],

                [
                  "E-posta Kontrolü",
                  "Normalize edilmiş e-posta ikinci benzersiz kimlik kanalı olarak kullanılır.",
                ],

                [
                  "İsim Çakışması",
                  "Aynı telefon veya e-posta farklı müşteri isimlerinde görülürse otomatik profil oluşturulmaz.",
                ],

                [
                  "Concurrent Guard",
                  "Aynı şirket için eşzamanlı import advisory lock ile korunur.",
                ],

                [
                  "Kaynak Koruma",
                  "Rezervasyon, teklif ve diğer eski tablolara hiçbir UPDATE veya DELETE yapılmaz.",
                ],

                [
                  "Merkezi Kimlik",
                  "Yeni profil oluşturulduğunda aynı kişiyle ilişkili kaynak kayıtlar tek Customer 360 kimliğine yönlendirilir.",
                ],
              ].map(
                ([
                  title,
                  text,
                ]) => (
                  <article
                    key={
                      title
                    }
                    className="rounded-2xl border border-white/[.06] bg-black/20 p-4"
                  >
                    <div className="flex items-center gap-2 text-[10px] font-black">
                      <FaCheckCircle className="text-emerald-400" />
                      {title}
                    </div>

                    <div className="mt-2 text-[9px] leading-5 text-slate-500">
                      {text}
                    </div>
                  </article>
                )
              )}

            </div>
          </section>


          <section className="rounded-[26px] border border-white/10 bg-[#07131f] p-5 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-black">
                  Manuel İnceleme Kuyruğu
                </div>

                <div className="mt-1 text-[9px] text-slate-600">
                  Duplicate riski bulunan son kayıtlar
                </div>
              </div>

              <Link
                href="/dashboard/musteri-360/eslestirme"
                className="text-[9px] font-black text-orange-300"
              >
                Tümünü Aç →
              </Link>
            </div>


            {conflicts.length ===
            0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-white/10 p-9 text-center">
                <FaShieldAlt className="mx-auto text-2xl text-emerald-400" />

                <div className="mt-3 text-[10px] font-black text-emerald-300">
                  Aktif çakışma görünmüyor
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                {conflicts.map(
                  (
                    row
                  ) => (
                    <div
                      key={
                        row.id
                      }
                      className="rounded-xl border border-red-500/10 bg-red-500/[.035] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-[10px] font-black">
                            {row.source_name ||
                              "İsimsiz kayıt"}
                          </div>

                          <div className="mt-1 text-[8px] text-slate-600">
                            {row.source_table}
                          </div>
                        </div>

                        <span className="rounded-full border border-red-500/20 bg-red-500/10 px-2 py-1 text-[7px] font-black text-red-300">
                          MANUEL
                        </span>
                      </div>

                      <div className="mt-3 text-[9px] leading-5 text-slate-500">
                        {row.source_phone ||
                          "Telefon yok"}
                        {" · "}
                        {row.source_email ||
                          "E-posta yok"}
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </section>

        </div>


        <section className="mt-5 rounded-[26px] border border-orange-500/15 bg-orange-500/[.035] p-5">
          <div className="flex items-start gap-4">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-orange-500/10 text-orange-300">
              <FaUsers />
            </div>

            <div>
              <div className="text-xs font-black">
                Veri güvenliği prensibi
              </div>

              <p className="mt-2 max-w-4xl text-[9px] leading-5 text-slate-500">
                Bu ekran eski operasyon kayıtlarını değiştirmez. Yeni müşteri profilleri yalnızca Customer 360 veri katmanında oluşturulur. Belirsiz telefon, ortak aile telefonu, ortak e-posta veya farklı müşteri isimleri otomatik birleştirilmez.
              </p>
            </div>
          </div>
        </section>

      </div>
    </main>
  );
}
