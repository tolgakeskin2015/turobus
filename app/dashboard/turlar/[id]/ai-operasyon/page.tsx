"use client";

import TourExecutiveChrome from "../../../components/TourExecutiveChrome";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  FaArrowLeft,
  FaBrain,
  FaCheckCircle,
  FaSyncAlt,
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



function errorMessage(value: unknown) {
  if (value instanceof Error) return value.message;

  if (
    value &&
    typeof value === "object"
  ) {
    const candidate = value as {
      message?: unknown;
      details?: unknown;
      hint?: unknown;
      code?: unknown;
    };

    const parts = [
      candidate.message,
      candidate.details,
      candidate.hint,
      candidate.code,
    ]
      .filter(
        (item): item is string =>
          typeof item === "string" &&
          item.trim().length > 0
      );

    if (parts.length) {
      return parts.join(" · ");
    }

    try {
      return JSON.stringify(value);
    } catch {
      return "Bilinmeyen hata";
    }
  }

  return String(value);
}

type Departure = {
  id: string;
  departure_date: string;
};


type Snapshot = {
  id: string;
  departure_id: string | null;
  risk_score: number;
  risk_level: string;
  open_incidents: number;
  critical_incidents: number;
  overdue_tasks: number;
  pending_claims: number;
  automation_backlog: number;
  findings:
    Record<
      string,
      unknown
    >[];
  recommended_actions:
    Record<
      string,
      unknown
    >[];
  engine: string;
  external_ai_used: boolean;
  generated_at: string;
};

type ActionProposal = {
  id: string;
  departure_id: string | null;
  snapshot_id: string;
  proposal_type: string;
  priority: string;
  title: string;
  description: string | null;
  source_engine: string;
  source_data:
    Record<
      string,
      unknown
    >;
  proposed_action:
    Record<
      string,
      unknown
    >;
  human_approval_required: boolean;
  status:
    | "pending"
    | "approved"
    | "rejected"
    | "superseded";
  proposed_at: string;
  decided_at: string | null;
  decision_note: string | null;
};


export default function AIOperationsPage() {

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
    departures,
    setDepartures,
  ] =
    useState<Departure[]>(
      []
    );

  const [
    selectedDeparture,
    setSelectedDeparture,
  ] =
    useState("");

  const [
    snapshot,
    setSnapshot,
  ] =
    useState<Snapshot | null>(
      null
    );

  const [
    proposals,
    setProposals,
  ] =
    useState<ActionProposal[]>(
      []
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
        departureId?:
          string
      ) => {

        const [
          departureResult,
          snapshotResult,
          proposalResult,
        ] =
          await Promise.all([

            supabase
              .from(
                "tour_departures"
              )
              .select(
                "id,departure_date"
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
              ),

            departureId
              ? supabase
                  .from(
                    "tour_ai_operation_snapshots"
                  )
                  .select("*")
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
                    departureId
                  )
                  .order(
                    "id",
                    {
                      ascending: false,
                    }
                  )
                  .limit(1)
                  .maybeSingle()

              : supabase
                  .from(
                    "tour_ai_operation_snapshots"
                  )
                  .select("*")
                  .eq(
                    "company_id",
                    currentCompanyId
                  )
                  .eq(
                    "tour_id",
                    tourId
                  )
                  .is(
                    "departure_id",
                    null
                  )
                  .order(
                    "id",
                    {
                      ascending: false,
                    }
                  )
                  .limit(1)
                  .maybeSingle(),

            departureId
              ? supabase
                  .from(
                    "tour_ai_action_proposals"
                  )
                  .select("*")
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
                    departureId
                  )
                  .order(
                    "created_at",
                    {
                      ascending:
                        false,
                    }
                  )

              : supabase
                  .from(
                    "tour_ai_action_proposals"
                  )
                  .select("*")
                  .eq(
                    "company_id",
                    currentCompanyId
                  )
                  .eq(
                    "tour_id",
                    tourId
                  )
                  .is(
                    "departure_id",
                    null
                  )
                  .order(
                    "created_at",
                    {
                      ascending:
                        false,
                    }
                  ),
          ]);


        if (
          departureResult.error
        ) {
          throw departureResult.error;
        }


        if (
          snapshotResult.error
        ) {
          throw snapshotResult.error;
        }

        if (
          proposalResult.error
        ) {
          throw proposalResult.error;
        }


        setDepartures(
          (
            departureResult.data ??
            []
          ) as unknown as
            Departure[]
        );


        setSnapshot(
          snapshotResult.data as
            Snapshot | null
        );

        setProposals(
          (
            proposalResult.data ??
            []
          ) as unknown as
            ActionProposal[]
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
            errorMessage(currentError)
          );

        } finally {

          setLoading(false);
        }

      }
    )();

  }, [
    load,
  ]);


  function changeDeparture(
    departureId:
      string
  ) {

    setSelectedDeparture(
      departureId
    );

    if (
      companyId
    ) {
      void load(
        companyId,
        departureId ||
          undefined
      );
    }
  }


  async function generateProposals() {

    if (
      !companyId
      ||
      !snapshot
    ) {
      setError(
        "Önce güncel bir operasyon risk analizi oluşturun."
      );
      return;
    }


    setBusy(true);
    setError("");
    setNotice("");


    try {

      const {
        data,
        error:
          rpcError,
      } =
        await supabase.rpc(
          "generate_tour_ai_action_proposals",
          {
            p_company_id:
              companyId,

            p_tour_id:
              tourId,

            p_departure_id:
              selectedDeparture ||
              null,
          }
        );


      if (
        rpcError
      ) {
        throw rpcError;
      }


      await load(
        companyId,
        selectedDeparture ||
          undefined
      );


      const result =
        data as
          | {
              created?:
                number;
              existing?:
                number;
            }
          | null;


      setNotice(
        `Onay kuyruğu güncellendi. Yeni: ${
          result?.created ??
          0
        }, mevcut: ${
          result?.existing ??
          0
        }.`
      );

    } catch (
      currentError
    ) {

      setError(
        errorMessage(currentError)
      );

    } finally {

      setBusy(false);
    }
  }


  async function decideProposal(
    proposalId:
      string,
    decision:
      "approve" |
      "reject"
  ) {

    if (
      !companyId
    ) {
      return;
    }


    const message =
      decision ===
        "approve"
        ? "Bu öneriyi ONAYLAMAK istiyor musunuz? Bu aşamada gerçek operasyon işlemi yapılmayacak; yalnız insan kararı kaydedilecektir."
        : "Bu öneriyi REDDETMEK istiyor musunuz?";

    if (
      !window.confirm(
        message
      )
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
          "decide_tour_ai_action_proposal",
          {
            p_company_id:
              companyId,

            p_proposal_id:
              proposalId,

            p_decision:
              decision,

            p_note:
              null,
          }
        );


      if (
        rpcError
      ) {
        throw rpcError;
      }


      await load(
        companyId,
        selectedDeparture ||
          undefined
      );


      setNotice(
        decision ===
          "approve"
          ? "Öneri insan tarafından onaylandı. Gerçek operasyon aksiyonu çalıştırılmadı."
          : "Öneri reddedildi."
      );

    } catch (
      currentError
    ) {

      setError(
        errorMessage(currentError)
      );

    } finally {

      setBusy(false);
    }
  }


  async function generate() {

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
          "generate_tour_operation_risk_snapshot",
          {
            p_tour_id:
              tourId,

            p_departure_id:
              selectedDeparture ||
              null,
          }
        );


      if (
        rpcError
      ) {
        throw rpcError;
      }


      await load(
        companyId,
        selectedDeparture ||
          undefined
      );


      setNotice(
        "Operasyon risk analizi güncellendi."
      );

    } catch (
      currentError
    ) {

      setError(
        errorMessage(currentError)
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
        AI Operasyon Merkezi yükleniyor...
      </main>
    );
  }


  return (
    <main data-tour-visual-final
      data-tour-os-screen="ai-operation-center"
      className="min-h-screen bg-[#030a11] text-white"
    >

      <TourExecutiveChrome
        tourId={tourId}
        moduleKey="ai"
      />


      <div className="mx-auto max-w-[1500px] px-5 py-7 lg:px-8">

        <Link
          href={`/dashboard/turlar/${tourId}`}
          className="inline-flex items-center gap-2 text-[9px] font-black text-slate-500"
        >
          <FaArrowLeft />
          Tur Operasyon Merkezi
        </Link>


        <section className="mt-4 rounded-[26px] border border-violet-500/15 bg-[#07131f] p-6 lg:p-8">

          <div className="flex items-center gap-3">

            <FaBrain className="text-2xl text-violet-300" />

            <div>

              <div className="text-[8px] font-black text-violet-300">
                AŞAMA 19
              </div>

              <h1 className="text-3xl font-black">
                AI Operasyon Asistanı
              </h1>

            </div>

          </div>


          <p className="mt-3 max-w-3xl text-[9px] leading-5 text-slate-400">
            Şu an gerçek operasyon verilerini analiz eden rules_v1 risk motoru çalışır. Harici bir AI sağlayıcısı bağlı olmadığı sürece sistem dış AI kullanıldı iddiası üretmez.
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


        <section className="mt-5 rounded-[22px] border border-white/[.08] bg-[linear-gradient(145deg,#081520,#050c13)] shadow-[0_14px_40px_rgba(0,0,0,.12)] p-5">

          <div className="flex flex-col gap-3 sm:flex-row">

            <select
              value={
                selectedDeparture
              }
              onChange={
                event =>
                  changeDeparture(
                    event.target.value
                  )
              }
              className="min-h-11 flex-1 rounded-xl border border-white/[.08] bg-[#03080e] px-3 text-[9px]"
            >

              <option value="">
                Tur Geneli
              </option>

              {departures.map(
                departure => (

                  <option
                    key={
                      departure.id
                    }
                    value={
                      departure.id
                    }
                  >
                    {departure.departure_date}
                  </option>
                )
              )}

            </select>


            <button
              disabled={
                busy
              }
              onClick={
                () =>
                  void generate()
              }
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-violet-500 px-5 text-[8px] font-black"
            >
              <FaSyncAlt />
              Analizi Yenile
            </button>

            <button
              disabled={
                busy ||
                !snapshot
              }
              onClick={
                () =>
                  void generateProposals()
              }
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-violet-400/25 bg-violet-400/[.08] px-5 text-[8px] font-black text-violet-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Önerileri Onay Kuyruğuna Al
            </button>

          </div>

        </section>


        <section className="mt-5 rounded-[24px] border border-amber-400/15 bg-[linear-gradient(145deg,#0b151e,#060d14)] p-5 lg:p-6">

          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

            <div>

              <div className="text-[8px] font-black text-amber-300">
                TUR-016 · İNSAN ONAY KUYRUĞU
              </div>

              <div className="mt-2 text-lg font-black">
                AI Operasyon Önerileri
              </div>

              <p className="mt-2 max-w-3xl text-[9px] leading-5 text-slate-400">
                AI/rules motoru yalnız öneri üretir.
                Onay veya ret kararı audit kaydına yazılır.
                Bu aşamada ödeme, iade, rezervasyon, görev,
                iptal veya operasyon durum değişikliği uygulanmaz.
              </p>

            </div>

            <div className="rounded-full border border-amber-400/20 bg-amber-400/[.06] px-4 py-2 text-[8px] font-black text-amber-200">
              İnsan Onayı Zorunlu
            </div>

          </div>


          <div className="mt-5 grid gap-3">

            {proposals.length ===
              0 ? (

              <div className="rounded-xl border border-white/[.07] bg-[#030a11] p-5 text-[9px] text-slate-500">
                Bu kapsam için henüz onay kuyruğu yok.
                Önce risk analizini yenileyin, ardından
                “Önerileri Onay Kuyruğuna Al” düğmesini kullanın.
              </div>

            ) : (

              proposals.map(
                proposal => (

                  <article
                    key={
                      proposal.id
                    }
                    className="rounded-[20px] border border-white/[.08] bg-[#030a11] p-4"
                  >

                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">

                      <div className="min-w-0">

                        <div className="flex flex-wrap items-center gap-2">

                          <span className="rounded-full border border-violet-400/20 bg-violet-400/[.06] px-2.5 py-1 text-[7px] font-black text-violet-200">
                            {proposal.priority.toUpperCase()}
                          </span>

                          <span className={`rounded-full border px-2.5 py-1 text-[7px] font-black ${
                            proposal.status ===
                              "pending"
                              ? "border-amber-400/20 bg-amber-400/[.06] text-amber-200"
                              : proposal.status ===
                                  "approved"
                                ? "border-emerald-400/20 bg-emerald-400/[.06] text-emerald-200"
                                : proposal.status ===
                                    "rejected"
                                  ? "border-red-400/20 bg-red-400/[.06] text-red-200"
                                  : "border-slate-400/20 bg-slate-400/[.06] text-slate-300"
                          }`}>
                            {proposal.status ===
                              "pending"
                              ? "Onay Bekliyor"
                              : proposal.status ===
                                  "approved"
                                ? "Onaylandı"
                                : proposal.status ===
                                    "rejected"
                                  ? "Reddedildi"
                                  : "Geçersiz Kılındı"}
                          </span>

                        </div>


                        <div className="mt-3 text-sm font-black">
                          {proposal.title}
                        </div>

                        {proposal.description && (

                          <p className="mt-2 text-[8px] leading-5 text-slate-500">
                            {proposal.description}
                          </p>

                        )}


                        <div className="mt-3 text-[7px] text-slate-600">
                          Kaynak: {proposal.source_engine}
                          {" · "}
                          {new Date(
                            proposal.proposed_at
                          ).toLocaleString(
                            "tr-TR"
                          )}
                        </div>

                      </div>


                      {proposal.status ===
                        "pending" && (

                        <div className="flex shrink-0 gap-2">

                          <button
                            disabled={
                              busy
                            }
                            onClick={
                              () =>
                                void decideProposal(
                                  proposal.id,
                                  "approve"
                                )
                            }
                            className="min-h-9 rounded-lg border border-emerald-400/25 bg-emerald-400/[.08] px-4 text-[8px] font-black text-emerald-200"
                          >
                            Onayla
                          </button>

                          <button
                            disabled={
                              busy
                            }
                            onClick={
                              () =>
                                void decideProposal(
                                  proposal.id,
                                  "reject"
                                )
                            }
                            className="min-h-9 rounded-lg border border-red-400/25 bg-red-400/[.06] px-4 text-[8px] font-black text-red-200"
                          >
                            Reddet
                          </button>

                        </div>

                      )}

                    </div>


                    {proposal.status ===
                      "approved" && (

                      <div className="mt-3 rounded-lg border border-emerald-400/10 bg-emerald-400/[.04] px-3 py-2 text-[8px] text-emerald-200">
                        İnsan onayı kaydedildi.
                        Gerçek operasyon aksiyonu henüz çalıştırılmadı.
                      </div>

                    )}

                  </article>

                )
              )

            )}

          </div>

        </section>


        {snapshot ? (

          <>

            <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">

              {[
                [
                  "Risk Skoru",
                  String(
                    snapshot.risk_score
                  ),
                ],
                [
                  "Risk",
                  snapshot.risk_level,
                ],
                [
                  "Açık Hata",
                  String(
                    snapshot.open_incidents
                  ),
                ],
                [
                  "Kritik",
                  String(
                    snapshot.critical_incidents
                  ),
                ],
                [
                  "Geciken Görev",
                  String(
                    snapshot.overdue_tasks
                  ),
                ],
                [
                  "Otomasyon Kuyruk",
                  String(
                    snapshot.automation_backlog
                  ),
                ],
              ].map(
                item => (

                  <article
                    key={item[0]}
                    className="rounded-[20px] border border-white/[.08] bg-[linear-gradient(145deg,#081520,#050c13)] shadow-[0_14px_40px_rgba(0,0,0,.12)] p-4"
                  >
                    <div className="text-[7px] font-black text-slate-500">
                      {item[0]}
                    </div>
                    <div className="mt-2 text-xl font-black">
                      {item[1]}
                    </div>
                  </article>
                )
              )}

            </section>


            <section className="mt-5 grid gap-5 xl:grid-cols-2">

              <article className="rounded-[22px] border border-white/[.08] bg-[linear-gradient(145deg,#081520,#050c13)] shadow-[0_14px_40px_rgba(0,0,0,.12)] p-5">

                <div className="text-sm font-black">
                  Bulgular
                </div>

                <pre className="mt-4 overflow-auto whitespace-pre-wrap rounded-xl bg-[#030a11] p-4 text-[8px] leading-5 text-slate-400">
                  {JSON.stringify(
                    snapshot.findings,
                    null,
                    2
                  )}
                </pre>

              </article>


              <article className="rounded-[22px] border border-white/[.08] bg-[linear-gradient(145deg,#081520,#050c13)] shadow-[0_14px_40px_rgba(0,0,0,.12)] p-5">

                <div className="text-sm font-black">
                  Önerilen Aksiyonlar
                </div>

                <pre className="mt-4 overflow-auto whitespace-pre-wrap rounded-xl bg-[#030a11] p-4 text-[8px] leading-5 text-slate-400">
                  {JSON.stringify(
                    snapshot.recommended_actions,
                    null,
                    2
                  )}
                </pre>

              </article>

            </section>


            <div className="mt-5 text-[8px] text-slate-500">
              Motor: {snapshot.engine}
              {" · "}
              Harici AI kullanıldı:{" "}
              {snapshot.external_ai_used
                ? "Evet"
                : "Hayır"}
            </div>

          </>

        ) : (

          <section className="mt-5 rounded-[22px] border border-dashed border-white/10 py-16 text-center text-[9px] text-slate-500">
            Henüz operasyon risk snapshot'ı oluşturulmadı.
          </section>
        )}

      </div>

    </main>
  );
}


<style jsx global>{`
  [data-tour-visual-final] {
    min-height: 100vh;
  }

  [data-tour-visual-final] table {
    border-collapse: separate;
    border-spacing: 0;
  }

  [data-tour-visual-final] thead {
    position: sticky;
    top: 0;
    z-index: 10;
    backdrop-filter: blur(14px);
  }

  [data-tour-visual-final] tbody tr {
    transition:
      background-color .16s ease,
      border-color .16s ease;
  }

  [data-tour-visual-final] tbody tr:hover {
    background: rgba(255,255,255,.025);
  }

  [data-tour-visual-final] input,
  [data-tour-visual-final] select,
  [data-tour-visual-final] textarea {
    outline: none;
  }

  [data-tour-visual-final] input:focus,
  [data-tour-visual-final] select:focus,
  [data-tour-visual-final] textarea:focus {
    border-color: rgba(249,115,22,.42);
    box-shadow:
      0 0 0 3px rgba(249,115,22,.06);
  }

  [data-tour-visual-final] button,
  [data-tour-visual-final] a {
    -webkit-tap-highlight-color: transparent;
  }

  @media (max-width: 768px) {
    [data-tour-visual-final] {
      padding-bottom: 86px;
    }

    [data-tour-executive-chrome] {
      border-radius: 22px;
    }
  }
`}</style>

// TOUR_VISUAL_FINAL_AI
