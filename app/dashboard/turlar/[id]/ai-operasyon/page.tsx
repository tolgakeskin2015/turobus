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
                  .maybeSingle(),
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
                  setSelectedDeparture(
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
