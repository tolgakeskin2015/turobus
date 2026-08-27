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
  FaTimesCircle,
} from "react-icons/fa";

import {
  useParams,
} from "next/navigation";

import {
  supabase,
} from "@/lib/supabase";

import {
  getCurrentMembership,
} from "@/lib/current-user";


type Rule = {
  id: string;
  name: string;
  event_key: string;
  channel: string;
  recipient_type: string;
  active: boolean;
  requires_provider: boolean;
};


type Outbox = {
  id: string;
  departure_id: string | null;
  event_key: string;
  channel: string;
  recipient_name: string | null;
  recipient_address: string | null;
  status: string;
  provider: string | null;
  provider_error: string | null;
  created_at: string;
};


type TourDeparture = {
  id: string;
  departure_date: string;
};


type EvaluationResult = {
  ok?: boolean;
  eligible?: boolean;
  reason?: string;
  event_key?: string;
  departure_date?: string;
  rules_evaluated?: number;
  reservation_rule_evaluations?: number;
  queued_or_deduplicated?: number;
  skipped_missing_contact?: number;
  skipped_non_customer_rule?: number;
};

type SchedulerHealth = {
  healthy?: boolean;

  scheduler?: {
    installed?: boolean;
    active?: boolean;
    job_id?: number | null;
    job_name?: string | null;
    schedule?: string | null;
  } | null;

  last_run?: {
    id?: string;
    status?: string;
    run_type?: string;
    reference_date?: string;
    candidate_departures?: number;
    evaluated_departures?: number;
    eligible_departures?: number;
    queued_or_deduplicated?: number;
    skipped_missing_contact?: number;
    error_count?: number;
    started_at?: string;
    completed_at?: string | null;
    duration_ms?: number | null;
  } | null;

  recent_problem_runs_24h?: number;
  checked_at?: string;
};


function localDateYmd() {
  const now = new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      now.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}


export default function AutomationPage() {

  const params =
    useParams<{
      id: string;
    }>();

  const tourId =
    String(
      params.id
    );

  const [
    companyId,
    setCompanyId,
  ] =
    useState("");

  const [
    rules,
    setRules,
  ] =
    useState<Rule[]>(
      []
    );

  const [
    outbox,
    setOutbox,
  ] =
    useState<Outbox[]>(
      []
    );

  const [
    departures,
    setDepartures,
  ] =
    useState<TourDeparture[]>(
      []
    );

  const [
    selectedDepartureId,
    setSelectedDepartureId,
  ] =
    useState("");

  const [
    lastEvaluation,
    setLastEvaluation,
  ] =
    useState<EvaluationResult | null>(
      null
    );

  const [
    schedulerHealth,
    setSchedulerHealth,
  ] =
    useState<SchedulerHealth | null>(
      null
    );


  const [
    name,
    setName,
  ] =
    useState(
      "Tur Öncesi Hatırlatma"
    );

  const [
    eventKey,
    setEventKey,
  ] =
    useState(
      "departure_24h"
    );

  const [
    channel,
    setChannel,
  ] =
    useState(
      "whatsapp"
    );

  const [
    body,
    setBody,
  ] =
    useState(
      "Turunuz için son kontrollerinizi yapmayı unutmayın."
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    busy,
    setBusy,
  ] =
    useState(false);

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


  const load =
    useCallback(
      async (
        currentCompanyId:
          string,
        requestedDepartureId = ""
      ) => {

        const {
          data:
            departureData,
          error:
            departureError,
        } =
          await supabase
            .from(
              "tour_departures"
            )
            .select(
              [
                "id",
                "departure_date",
              ].join(",")
            )
            .eq(
              "company_id",
              currentCompanyId
            )
            .eq(
              "tour_id",
              tourId
            )
            .order(
              "departure_date",
              {
                ascending:
                  true,
              }
            );


        if (
          departureError
        ) {
          throw departureError;
        }


        const departureRows =
          (
            departureData ??
            []
          ) as unknown as
            TourDeparture[];


        const activeDepartureId =
          requestedDepartureId &&
          departureRows.some(
            departure =>
              departure.id ===
              requestedDepartureId
          )
            ? requestedDepartureId
            : departureRows[0]?.id ??
              "";


        setDepartures(
          departureRows
        );

        setSelectedDepartureId(
          activeDepartureId
        );


        const [
          ruleResult,
          outboxResult,
          schedulerHealthResult,
        ] =
          await Promise.all([

            supabase
              .from(
                "tour_automation_rules"
              )
              .select(
                "id,name,event_key,channel,recipient_type,active,requires_provider"
              )
              .eq(
                "company_id",
                currentCompanyId
              )
              .order(
                "created_at",
                {
                  ascending:
                    false,
                }
              ),

            activeDepartureId
              ? supabase
                  .from(
                    "tour_automation_outbox"
                  )
                  .select(
                    "id,departure_id,event_key,channel,recipient_name,recipient_address,status,provider,provider_error,created_at"
                  )
                  .eq(
                    "company_id",
                    currentCompanyId
                  )
                  .eq(
                    "tour_id",
                    tourId
                  )
                  .eq(
                    "departure_id",
                    activeDepartureId
                  )
                  .order(
                    "created_at",
                    {
                      ascending:
                        false,
                    }
                  )
                  .limit(100)
              : Promise.resolve({
                  data: [],
                  error: null,
                }),

            supabase.rpc(
              "get_tour_24h_automation_scheduler_health"
            ),
          ]);


        if (
          ruleResult.error
        ) {
          throw ruleResult.error;
        }


        if (
          outboxResult.error
        ) {
          throw outboxResult.error;
        }

        if (
          schedulerHealthResult.error
        ) {
          throw schedulerHealthResult.error;
        }


        setRules(
          (
            ruleResult.data ??
            []
          ) as unknown as
            Rule[]
        );


        setOutbox(
          (
            outboxResult.data ??
            []
          ) as unknown as
            Outbox[]
        );

        setSchedulerHealth(
          (
            schedulerHealthResult.data ??
            null
          ) as unknown as
            SchedulerHealth | null
        );

      },
      [
        tourId,
      ]
    );


  useEffect(() => {

    void (
      async () => {

        try {

          const {
            data:
              authData,
          } =
            await supabase
              .auth
              .getUser();


          if (
            !authData.user
          ) {
            throw new Error(
              "Oturum bulunamadı."
            );
          }


          const membership =
            await getCurrentMembership(
              authData.user.id
            );


          if (
            !membership
          ) {
            throw new Error(
              "Firma üyeliği bulunamadı."
            );
          }


          setCompanyId(
            membership.company_id
          );


          await load(
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

          setLoading(false);
        }

      }
    )();

  }, [
    load,
  ]);


  async function createRule() {

    if (
      !companyId
    ) {
      return;
    }


    setBusy(true);
    setError("");
    setNotice("");


    try {

      const {
        error:
          rpcError,
      } =
        await supabase.rpc(
          "create_tour_automation_rule",
          {
            p_company_id:
              companyId,

            p_name:
              name,

            p_event_key:
              eventKey,

            p_channel:
              channel,

            p_recipient_type:
              "customer",

            p_subject:
              "Turobüs Bilgilendirme",

            p_body:
              body,

            p_requires_provider:
              channel !==
              "system",
          }
        );


      if (
        rpcError
      ) {
        throw rpcError;
      }


      await load(
        companyId,
        selectedDepartureId
      );


      setNotice(
        "Otomasyon kuralı oluşturuldu."
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

      setBusy(false);
    }
  }


  async function changeDeparture(
    departureId: string
  ) {
    setSelectedDepartureId(
      departureId
    );

    setLastEvaluation(
      null
    );

    if (
      !companyId
    ) {
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");

    try {
      await load(
        companyId,
        departureId
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
      setBusy(false);
    }
  }


  async function evaluateDeparture24h() {
    if (
      !companyId ||
      !selectedDepartureId
    ) {
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");
    setLastEvaluation(
      null
    );

    try {
      const {
        data,
        error:
          rpcError,
      } =
        await supabase.rpc(
          "evaluate_tour_departure_24h_automation",
          {
            p_company_id:
              companyId,

            p_tour_id:
              tourId,

            p_departure_id:
              selectedDepartureId,

            p_reference_date:
              localDateYmd(),
          }
        );


      if (
        rpcError
      ) {
        throw rpcError;
      }


      const result =
        (
          data ??
          {}
        ) as unknown as
          EvaluationResult;


      setLastEvaluation(
        result
      );


      if (
        result.eligible ===
        false
      ) {
        setNotice(
          `Seçilen çıkış 24 saat penceresinde değil. Çıkış: ${
            result.departure_date ??
            "—"
          }. Kuyruğa kayıt eklenmedi.`
        );
      } else {
        setNotice(
          `24 saat otomasyonu değerlendirildi. Kuyruk/tekrar kontrolü: ${
            result.queued_or_deduplicated ??
            0
          }, iletişim bilgisi eksik: ${
            result.skipped_missing_contact ??
            0
          }.`
        );
      }


      await load(
        companyId,
        selectedDepartureId
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
      setBusy(false);
    }
  }


  if (
    loading
  ) {

    return (
      <main className="grid min-h-[70vh] place-items-center bg-[#030a11] text-white">
        Otomasyon merkezi yükleniyor...
      </main>
    );
  }


  const blocked =
    outbox.filter(
      item =>
        item.status ===
          "blocked_no_provider"
    ).length;


  const failed =
    outbox.filter(
      item =>
        item.status ===
          "failed"
    ).length;


  return (
    <main
      data-tour-os-screen="automation-center"
      className="min-h-screen bg-[#030a11] text-white"
    >

      <div className="mx-auto max-w-[1600px] px-5 py-7 lg:px-8">

        <Link
          href={`/dashboard/turlar/${tourId}`}
          className="inline-flex items-center gap-2 text-[9px] font-black text-slate-500"
        >
          <FaArrowLeft />
          Tur Operasyon Merkezi
        </Link>


        <section className="mt-4 rounded-[30px] border border-orange-500/15 bg-[#07131f] p-6 lg:p-8">

          <div className="flex items-center gap-3">

            <FaBolt className="text-2xl text-orange-300" />

            <div>
              <div className="text-[8px] font-black text-orange-300">
                AŞAMA 18
              </div>
              <h1 className="text-3xl font-black">
                Mesaj & Otomasyon Merkezi
              </h1>
            </div>

          </div>


          <p className="mt-3 text-[9px] text-slate-400">
            Provider bağlı değilse dış kanallar gönderilmiş sayılmaz; blocked_no_provider olarak bekler.
          </p>

        </section>


        {error && (
          <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/[.05] px-4 py-3 text-[9px] text-red-300">
            <FaTimesCircle className="mr-2 inline" />
            {error}
          </div>
        )}


        {notice && (
          <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/[.05] px-4 py-3 text-[9px] text-emerald-300">
            <FaCheckCircle className="mr-2 inline" />
            {notice}
          </div>
        )}


        <section className="mt-5 rounded-[24px] border border-white/10 bg-[#07131f] p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="text-[8px] font-black text-orange-300">
                TUR-015A · ÇIKIŞ BAZLI OTOMASYON
              </div>

              <div className="mt-2 text-sm font-black">
                24 Saat Öncesi Değerlendirme
              </div>

              <p className="mt-2 max-w-3xl text-[9px] leading-5 text-slate-400">
                Yalnız seçilen tur çıkışını değerlendirir. Aynı kural, rezervasyon ve çıkış için mevcut idempotency koruması tekrar kayıt üretmez. WhatsApp, SMS ve e-posta provider bağlı değilse gönderilmiş sayılmaz.
              </p>
            </div>

            <div className="grid w-full gap-3 sm:grid-cols-[minmax(0,1fr)_auto] lg:max-w-[680px]">
              <select
                value={
                  selectedDepartureId
                }
                disabled={
                  busy ||
                  departures.length ===
                    0
                }
                onChange={
                  event =>
                    void changeDeparture(
                      event.target.value
                    )
                }
                className="min-h-11 rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px]"
              >
                {departures.length ===
                0 ? (
                  <option value="">
                    Kayıtlı çıkış yok
                  </option>
                ) : (
                  departures.map(
                    departure => (
                      <option
                        key={
                          departure.id
                        }
                        value={
                          departure.id
                        }
                      >
                        {
                          departure.departure_date
                        }
                      </option>
                    )
                  )
                )}
              </select>

              <button
                type="button"
                disabled={
                  busy ||
                  !selectedDepartureId
                }
                onClick={
                  () =>
                    void evaluateDeparture24h()
                }
                className="min-h-11 rounded-xl bg-orange-500 px-5 text-[8px] font-black disabled:cursor-not-allowed disabled:opacity-40"
              >
                24 Saat Otomasyonunu Değerlendir
              </button>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-amber-500/15 bg-amber-500/[.04] px-4 py-3 text-[8px] leading-5 text-amber-200/80">
            3 saat kala otomasyonu şu anda çalıştırılmaz. Tur çıkışı için kanonik kalkış saati tanımlanmadan uçuş veya otobüs saatinden tahmin yapılmaz.
          </div>

          {lastEvaluation && (
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {[
                [
                  "Uygun Pencere",
                  lastEvaluation.eligible
                    ? "Evet"
                    : "Hayır",
                ],
                [
                  "Kurallar",
                  String(
                    lastEvaluation.rules_evaluated ??
                      0
                  ),
                ],
                [
                  "Kuyruk / Tekrar",
                  String(
                    lastEvaluation.queued_or_deduplicated ??
                      0
                  ),
                ],
                [
                  "Eksik İletişim",
                  String(
                    lastEvaluation.skipped_missing_contact ??
                      0
                  ),
                ],
              ].map(
                item => (
                  <div
                    key={item[0]}
                    className="rounded-xl border border-white/[.07] bg-[#030a11] px-4 py-3"
                  >
                    <div className="text-[7px] font-black text-slate-500">
                      {item[0]}
                    </div>
                    <div className="mt-2 text-sm font-black">
                      {item[1]}
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </section>


        <section className="mt-5 rounded-[24px] border border-white/10 bg-[#07131f] p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-[8px] font-black text-orange-300">
                TUR-015A4 · OTOMATİK SCHEDULER
              </div>

              <div className="mt-2 text-sm font-black">
                24 Saat Otomasyon Sağlığı
              </div>

              <p className="mt-2 text-[9px] leading-5 text-slate-400">
                Yarınki çıkışlar Europe/Istanbul tarihine göre
                saatlik kontrol edilir. Bu alan yalnız durum
                gösterir; scheduler buradan çalıştırılmaz.
              </p>
            </div>

            <div
              className={`inline-flex min-h-9 items-center rounded-full border px-4 text-[8px] font-black ${
                schedulerHealth?.healthy
                  ? "border-emerald-500/30 bg-emerald-500/[.08] text-emerald-300"
                  : "border-amber-500/30 bg-amber-500/[.08] text-amber-200"
              }`}
            >
              {schedulerHealth?.healthy
                ? "Scheduler Sağlıklı"
                : schedulerHealth
                  ? "Kontrol Gerekli"
                  : "Bilgi Yok"}
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {[
              [
                "Kurulum",
                schedulerHealth?.scheduler?.installed
                  ? "Kurulu"
                  : "Yok",
              ],
              [
                "Aktif",
                schedulerHealth?.scheduler?.active
                  ? "Evet"
                  : "Hayır",
              ],
              [
                "Cron",
                schedulerHealth?.scheduler?.schedule ??
                  "—",
              ],
              [
                "24s Problem",
                String(
                  schedulerHealth?.recent_problem_runs_24h ??
                    0
                ),
              ],
            ].map(item => (
              <div
                key={item[0]}
                className="rounded-xl border border-white/[.07] bg-[#030a11] px-4 py-3"
              >
                <div className="text-[7px] font-black text-slate-500">
                  {item[0]}
                </div>

                <div className="mt-2 text-sm font-black">
                  {item[1]}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 rounded-xl border border-white/[.07] bg-[#030a11] p-4">
            <div className="text-[7px] font-black text-slate-500">
              SON OTOMATİK ÇALIŞMA
            </div>

            <div className="mt-2 text-[9px] font-black">
              {schedulerHealth?.last_run
                ? `${schedulerHealth.last_run.status ?? "—"} · ${schedulerHealth.last_run.reference_date ?? "—"}`
                : "Henüz çalışma kaydı yok"}
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {[
                [
                  "Aday",
                  String(
                    schedulerHealth?.last_run?.candidate_departures ??
                      0
                  ),
                ],
                [
                  "Değerlendirilen",
                  String(
                    schedulerHealth?.last_run?.evaluated_departures ??
                      0
                  ),
                ],
                [
                  "Uygun",
                  String(
                    schedulerHealth?.last_run?.eligible_departures ??
                      0
                  ),
                ],
                [
                  "Kuyruk / Tekrar",
                  String(
                    schedulerHealth?.last_run?.queued_or_deduplicated ??
                      0
                  ),
                ],
                [
                  "Hata",
                  String(
                    schedulerHealth?.last_run?.error_count ??
                      0
                  ),
                ],
              ].map(item => (
                <div
                  key={item[0]}
                  className="rounded-lg border border-white/[.05] px-3 py-2"
                >
                  <div className="text-[6px] font-black text-slate-600">
                    {item[0]}
                  </div>

                  <div className="mt-1 text-xs font-black">
                    {item[1]}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>


        <section className="mt-5 grid gap-3 md:grid-cols-3">

          {[
            [
              "Aktif Kural",
              String(
                rules.filter(
                  item =>
                    item.active
                ).length
              ),
            ],
            [
              "Provider Bekliyor",
              String(blocked),
            ],
            [
              "Hatalı",
              String(failed),
            ],
          ].map(
            item => (
              <article
                key={item[0]}
                className="rounded-[22px] border border-white/10 bg-[#07131f] p-5"
              >
                <div className="text-[7px] font-black text-slate-500">
                  {item[0]}
                </div>
                <div className="mt-3 text-2xl font-black">
                  {item[1]}
                </div>
              </article>
            )
          )}

        </section>


        <section className="mt-5 grid gap-5 xl:grid-cols-[440px_minmax(0,1fr)]">

          <article className="rounded-[24px] border border-white/10 bg-[#07131f] p-5">

            <div className="text-sm font-black">
              Yeni Otomasyon
            </div>


            <input
              value={name}
              onChange={
                event =>
                  setName(
                    event.target.value
                  )
              }
              className="mt-4 min-h-11 w-full rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px]"
            />


            <select
              value={eventKey}
              onChange={
                event =>
                  setEventKey(
                    event.target.value
                  )
              }
              className="mt-3 min-h-11 w-full rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px]"
            >
              {[
                "reservation_created",
                "payment_pending",
                "payment_completed",
                "departure_24h",
                "departure_3h",
                "document_missing",
                "incident_created",
                "incident_critical",
                "refund_completed",
                "protection_claim_created",
                "tour_completed",
              ].map(
                item => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                )
              )}
            </select>


            <select
              value={channel}
              onChange={
                event =>
                  setChannel(
                    event.target.value
                  )
              }
              className="mt-3 min-h-11 w-full rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px]"
            >
              <option value="system">
                Sistem İçi
              </option>
              <option value="email">
                E-posta
              </option>
              <option value="whatsapp">
                WhatsApp
              </option>
              <option value="sms">
                SMS
              </option>
            </select>


            <textarea
              value={body}
              onChange={
                event =>
                  setBody(
                    event.target.value
                  )
              }
              rows={4}
              className="mt-3 w-full rounded-xl border border-white/10 bg-[#030a11] px-3 py-3 text-[9px]"
            />


            <button
              disabled={busy}
              onClick={
                () =>
                  void createRule()
              }
              className="mt-3 min-h-11 rounded-xl bg-orange-500 px-4 text-[8px] font-black"
            >
              Otomasyon Oluştur
            </button>

          </article>


          <div className="overflow-x-auto rounded-[22px] border border-white/10">

            <table className="min-w-[900px] text-left">

              <thead className="bg-[#07131f] text-[7px] font-black text-slate-500">
                <tr>
                  <th className="px-4 py-3">Olay</th>
                  <th className="px-4 py-3">Kanal</th>
                  <th className="px-4 py-3">Alıcı</th>
                  <th className="px-4 py-3">Durum</th>
                  <th className="px-4 py-3">Provider</th>
                </tr>
              </thead>

              <tbody>

                {outbox.map(
                  item => (
                    <tr
                      key={item.id}
                      className="border-t border-white/[.06] text-[8px]"
                    >
                      <td className="px-4 py-4">
                        {item.event_key}
                      </td>
                      <td className="px-4 py-4">
                        {item.channel}
                      </td>
                      <td className="px-4 py-4">
                        {item.recipient_name ||
                          item.recipient_address ||
                          "—"}
                      </td>
                      <td className="px-4 py-4">
                        {item.status}
                      </td>
                      <td className="px-4 py-4">
                        {item.provider ||
                          "Bağlı değil"}
                      </td>
                    </tr>
                  )
                )}

              </tbody>

            </table>

          </div>

        </section>

      </div>

    </main>
  );
}
