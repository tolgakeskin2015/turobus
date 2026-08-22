"use client";

import TourExecutiveChrome from "../../../components/TourExecutiveChrome";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FaArrowLeft,
  FaArrowRight,
  FaBus,
  FaCheckCircle,
  FaClipboardCheck,
  FaExclamationTriangle,
  FaFileAlt,
  FaFlagCheckered,
  FaHotel,
  FaPaperPlane,
  FaPlane,
  FaRoute,
  FaTasks,
  FaUsers,
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


type OperationStage =
  | "draft"
  | "sales"
  | "confirmed"
  | "preparing"
  | "ready"
  | "on_the_way"
  | "in_progress"
  | "returning"
  | "completed"
  | "cancelled";


type Tour = {
  id: string;
  title: string;
  transport_mode: string;
  operation_stage:
    OperationStage;
  operation_status: string;
};


type Readiness = {
  transport_mode: string;
  blockers: number;
  warnings: number;
  critical_tasks: number;
  open_tasks: number;
  required_documents: number;
  missing_documents: number;
  expired_documents: number;
  supplier_pending: number;
  supplier_issues: number;
  flight_count: number;
  flight_pnr_missing: number;
  ticketing_risk: number;
  bus_count: number;
  bus_vehicle_missing: number;
  bus_driver_missing: number;
  bus_guide_missing: number;
  passenger_count: number;
  identity_missing: number;
  ready_for_departure: boolean;
};


type HistoryRow = {
  id: string;
  from_stage:
    OperationStage | null;
  to_stage:
    OperationStage;
  transition_type: string;
  transition_note:
    string | null;
  changed_by:
    string | null;
  created_at: string;
};


const STAGES:
  Array<{
    key:
      OperationStage;
    label:
      string;
    description:
      string;
  }> = [

  {
    key:
      "draft",
    label:
      "Taslak",
    description:
      "Tur oluşturuluyor",
  },

  {
    key:
      "sales",
    label:
      "Satışta",
    description:
      "Rezervasyona açık",
  },

  {
    key:
      "confirmed",
    label:
      "Kesinleşti",
    description:
      "Tur çıkışı kesin",
  },

  {
    key:
      "preparing",
    label:
      "Operasyon Hazırlığı",
    description:
      "Ulaşım, görev, belge ve tedarikçi hazırlanıyor",
  },

  {
    key:
      "ready",
    label:
      "Çıkış Hazır",
    description:
      "Kritik engel kalmadı",
  },

  {
    key:
      "on_the_way",
    label:
      "Yolda",
    description:
      "Çıkış başladı",
  },

  {
    key:
      "in_progress",
    label:
      "Tur Devam Ediyor",
    description:
      "Operasyon aktif",
  },

  {
    key:
      "returning",
    label:
      "Dönüş",
    description:
      "Dönüş operasyonu",
  },

  {
    key:
      "completed",
    label:
      "Tamamlandı",
    description:
      "Tur kapatıldı",
  },

];


const NEXT:
  Partial<
    Record<
      OperationStage,
      OperationStage
    >
  > = {

    draft:
      "sales",

    sales:
      "confirmed",

    confirmed:
      "preparing",

    preparing:
      "ready",

    ready:
      "on_the_way",

    on_the_way:
      "in_progress",

    in_progress:
      "returning",

    returning:
      "completed",
  };


function label(
  stage:
    OperationStage | null
) {

  if (
    !stage
  ) {
    return "—";
  }


  if (
    stage ===
    "cancelled"
  ) {
    return "İptal";
  }


  return (
    STAGES.find(
      item =>
        item.key ===
        stage
    )?.label ||
    stage
  );

}


function formatDate(
  value:
    string
) {

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
  ).format(
    date
  );

}


export default function TourStateEnginePage() {

  const params =
    useParams<{
      id:
        string;
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
    tour,
    setTour,
  ] =
    useState<Tour | null>(
      null
    );


  const [
    readiness,
    setReadiness,
  ] =
    useState<Readiness | null>(
      null
    );


  const [
    history,
    setHistory,
  ] =
    useState<HistoryRow[]>(
      []
    );


  const [
    note,
    setNote,
  ] =
    useState("");


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
      async () => {

        setLoading(
          true
        );

        setError(
          ""
        );


        try {

          const {
            data:
              authData,

            error:
              authError,
          } =
            await supabase
              .auth
              .getUser();


          if (
            authError ||
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


          const currentCompanyId =
            membership.company_id;


          setCompanyId(
            currentCompanyId
          );


          const [
            tourResult,
            readinessResult,
            historyResult,
          ] =
            await Promise.all([

              supabase
                .from(
                  "tours"
                )
                .select(
                  [
                    "id",
                    "title",
                    "transport_mode",
                    "operation_stage",
                    "operation_status",
                  ].join(",")
                )
                .eq(
                  "company_id",
                  currentCompanyId
                )
                .eq(
                  "id",
                  tourId
                )
                .maybeSingle(),


              supabase.rpc(
                "get_tour_operation_readiness",
                {
                  p_company_id:
                    currentCompanyId,

                  p_tour_id:
                    tourId,
                }
              ),


              supabase
                .from(
                  "tour_operation_state_history"
                )
                .select(
                  [
                    "id",
                    "from_stage",
                    "to_stage",
                    "transition_type",
                    "transition_note",
                    "changed_by",
                    "created_at",
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
                  "created_at",
                  {
                    ascending:
                      false,
                  }
                )
                .limit(
                  30
                ),
            ]);


          const firstError =
            tourResult.error ||
            readinessResult.error ||
            historyResult.error;


          if (
            firstError
          ) {
            throw firstError;
          }


          if (
            !tourResult.data
          ) {
            throw new Error(
              "Tur bulunamadı."
            );
          }


          setTour(
            tourResult.data as unknown as
              Tour
          );


          setReadiness(
            readinessResult.data as unknown as
              Readiness
          );


          setHistory(
            (
              historyResult.data ??
              []
            ) as unknown as
              HistoryRow[]
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

      },
      [
        tourId,
      ]
    );


  useEffect(() => {

    void load();

  }, [
    load,
  ]);


  const currentIndex =
    useMemo(
      () =>
        STAGES.findIndex(
          item =>
            item.key ===
            tour?.operation_stage
        ),
      [
        tour?.operation_stage,
      ]
    );


  async function transition(
    target:
      OperationStage
  ) {

    if (
      !companyId ||
      !tour
    ) {
      return;
    }


    const targetLabel =
      label(
        target
      );


    if (
      !window.confirm(
        `Tur durumunu "${targetLabel}" aşamasına geçirmek istiyor musunuz?`
      )
    ) {
      return;
    }


    setBusy(
      true
    );

    setError(
      ""
    );

    setNotice(
      ""
    );


    try {

      const {
        data,
        error:
          transitionError,
      } =
        await supabase.rpc(
          "transition_tour_operation_stage",
          {

            p_company_id:
              companyId,

            p_tour_id:
              tour.id,

            p_target_stage:
              target,

            p_note:
              note.trim() ||
              null,

          }
        );


      if (
        transitionError
      ) {
        throw transitionError;
      }


      setNote(
        ""
      );


      setNotice(
        `Durum "${targetLabel}" aşamasına geçirildi.`
      );


      console.info(
        "TOUR_STATE_TRANSITION",
        data
      );


      await load();


    } catch (
      currentError
    ) {

      const message =
        currentError instanceof
          Error
          ? currentError.message
          : String(
              currentError
            );


      if (
        message.includes(
          "READINESS_BLOCKED"
        )
      ) {

        setError(
          "Çıkış Hazır durumuna geçilemiyor. Aşağıdaki kritik engelleri tamamlayın."
        );

      } else {

        setError(
          message
        );

      }


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
        Durum motoru yükleniyor...
      </main>
    );

  }


  const nextStage =
    tour
      ? NEXT[
          tour.operation_stage
        ]
      : undefined;


  const blockers =
    readiness?.blockers ??
    0;


  return (
    <main data-tour-visual-final data-tour-os-screen="state-engine" className="min-h-screen bg-[#030a11] text-white">

      <TourExecutiveChrome
        tourId={tourId}
        moduleKey="status"
      />


      <div className="mx-auto max-w-[1700px] px-5 py-7 lg:px-8">

        <Link
          href={`/dashboard/turlar/${tourId}`}
          className="inline-flex items-center gap-2 text-[8px] font-black text-slate-500"
        >
          <FaArrowLeft />
          Tur Operasyon Merkezi
        </Link>


        <section className="mt-4 rounded-[26px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,.16),transparent_36%),linear-gradient(145deg,#07131f,#03080e)] p-6 lg:p-8">

          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">

            <div>

              <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/[.07] px-3 py-1.5 text-[8px] font-black uppercase tracking-[.14em] text-orange-300">
                <FaRoute />
                DURUM MOTORU & OPERASYON AKIŞI
              </div>


              <h1 className="mt-4 text-3xl font-black tracking-[-.04em] lg:text-4xl">
                {tour?.title ||
                  "Tur"}
              </h1>


              <div className="mt-3 flex flex-wrap gap-2">

                <span className="rounded-full border border-blue-500/20 bg-blue-500/[.06] px-3 py-1.5 text-[8px] font-black text-blue-300">
                  {label(
                    tour?.operation_stage ||
                    null
                  )}
                </span>


                <span className="rounded-full border border-white/10 bg-white/[.025] px-3 py-1.5 text-[8px] font-black text-slate-500">
                  Legacy:{" "}
                  {tour?.operation_status}
                </span>

              </div>

            </div>


            <div
              className={`rounded-[22px] border px-5 py-4 ${
                blockers ===
                0
                  ? "border-emerald-500/20 bg-emerald-500/[.05]"
                  : "border-red-500/20 bg-red-500/[.05]"
              }`}
            >

              <div className="text-[7px] font-black text-slate-500">
                ÇIKIŞ HAZIRLIK SONUCU
              </div>


              <div
                className={`mt-2 text-xl font-black ${
                  blockers ===
                  0
                    ? "text-emerald-300"
                    : "text-red-300"
                }`}
              >
                {blockers ===
                0
                  ? "HAZIR"
                  : `${blockers} KRİTİK ENGEL`}
              </div>

            </div>

          </div>

        </section>


        {error && (
          <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/[.06] px-4 py-3 text-[8px] font-black text-red-300">
            {error}
          </div>
        )}


        {notice && (
          <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/[.06] px-4 py-3 text-[8px] font-black text-emerald-300">
            {notice}
          </div>
        )}


        <section className="mt-5 overflow-x-auto pb-2">

          <div className="flex min-w-[1250px] items-stretch gap-2">

            {STAGES.map(
              (
                stage,
                index
              ) => {

                const current =
                  tour?.operation_stage ===
                  stage.key;


                const done =
                  currentIndex >
                  index;


                return (
                  <article
                    key={
                      stage.key
                    }
                    className={`min-w-[130px] flex-1 rounded-[20px] border p-4 ${
                      current
                        ? "border-orange-500/30 bg-orange-500/[.08]"
                        : done
                          ? "border-emerald-500/15 bg-emerald-500/[.035]"
                          : "border-white/[.07] bg-[#07131f]"
                    }`}
                  >

                    <div className="flex items-center justify-between">

                      <div
                        className={`grid h-7 w-7 place-items-center rounded-full text-[8px] font-black ${
                          current
                            ? "bg-orange-500 text-black"
                            : done
                              ? "bg-emerald-500/15 text-emerald-300"
                              : "bg-white/[.04] text-slate-600"
                        }`}
                      >
                        {done ? (
                          <FaCheckCircle />
                        ) : (
                          index +
                          1
                        )}
                      </div>

                    </div>


                    <div className="mt-3 text-[8px] font-black">
                      {stage.label}
                    </div>


                    <div className="mt-2 text-[7px] leading-4 text-slate-600">
                      {stage.description}
                    </div>

                  </article>
                );

              }
            )}

          </div>

        </section>


        <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">

          <article className="rounded-[22px] border border-red-500/15 bg-red-500/[.04] p-5">
            <div className="text-[7px] font-black text-red-300">
              KRİTİK GÖREV
            </div>
            <div className="mt-3 text-3xl font-black">
              {readiness?.critical_tasks ??
                0}
            </div>
          </article>


          <article className="rounded-[22px] border border-amber-500/15 bg-amber-500/[.04] p-5">
            <div className="text-[7px] font-black text-amber-300">
              ZORUNLU BELGE
            </div>
            <div className="mt-3 text-3xl font-black">
              {(
                readiness?.missing_documents ??
                0
              ) +
                (
                  readiness?.expired_documents ??
                  0
                )}
            </div>
          </article>


          <article className="rounded-[22px] border border-violet-500/15 bg-violet-500/[.04] p-5">
            <div className="text-[7px] font-black text-violet-300">
              TEDARİKÇİ
            </div>
            <div className="mt-3 text-3xl font-black">
              {(
                readiness?.supplier_pending ??
                0
              ) +
                (
                  readiness?.supplier_issues ??
                  0
                )}
            </div>
          </article>


          <article className="rounded-[22px] border border-blue-500/15 bg-blue-500/[.04] p-5">
            <div className="text-[7px] font-black text-blue-300">
              UÇUŞ RİSKİ
            </div>
            <div className="mt-3 text-3xl font-black">
              {(
                readiness?.flight_pnr_missing ??
                0
              ) +
                (
                  readiness?.ticketing_risk ??
                  0
                )}
            </div>
          </article>


          <article className="rounded-[22px] border border-cyan-500/15 bg-cyan-500/[.04] p-5">
            <div className="text-[7px] font-black text-cyan-300">
              OTOBÜS EKSİĞİ
            </div>
            <div className="mt-3 text-3xl font-black">
              {(
                readiness?.bus_vehicle_missing ??
                0
              ) +
                (
                  readiness?.bus_driver_missing ??
                  0
                )}
            </div>
          </article>


          <article className="rounded-[22px] border border-white/[.08] bg-[linear-gradient(145deg,#081520,#050c13)] shadow-[0_14px_40px_rgba(0,0,0,.12)] p-5">
            <div className="text-[7px] font-black text-slate-600">
              UYARI
            </div>
            <div className="mt-3 text-3xl font-black">
              {readiness?.warnings ??
                0}
            </div>
          </article>

        </section>


        <section className="mt-5 grid gap-5 2xl:grid-cols-[1fr_430px]">

          <section className="rounded-[26px] border border-white/[.08] bg-[linear-gradient(145deg,#081520,#050c13)] shadow-[0_14px_40px_rgba(0,0,0,.12)] p-5">

            <div className="flex items-center gap-2 text-[9px] font-black">
              <FaClipboardCheck className="text-orange-300" />
              Operasyon Kontrolü
            </div>


            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">

              <Link
                href={`/dashboard/turlar/${tourId}/gorevler`}
                className="rounded-[18px] border border-white/[.07] bg-[#030a11] p-4"
              >
                <FaTasks className="text-orange-300" />
                <div className="mt-3 text-[8px] font-black">
                  Görev & Personel
                </div>
                <div className="mt-1 text-[7px] text-slate-600">
                  {readiness?.open_tasks ??
                    0}
                  {" açık görev"}
                </div>
              </Link>


              <Link
                href={`/dashboard/turlar/${tourId}/belgeler`}
                className="rounded-[18px] border border-white/[.07] bg-[#030a11] p-4"
              >
                <FaFileAlt className="text-blue-300" />
                <div className="mt-3 text-[8px] font-black">
                  Belge & Voucher
                </div>
                <div className="mt-1 text-[7px] text-slate-600">
                  {readiness?.missing_documents ??
                    0}
                  {" zorunlu eksik"}
                </div>
              </Link>


              <Link
                href={`/dashboard/turlar/${tourId}/tedarikciler`}
                className="rounded-[18px] border border-white/[.07] bg-[#030a11] p-4"
              >
                <FaHotel className="text-violet-300" />
                <div className="mt-3 text-[8px] font-black">
                  Tedarikçi
                </div>
                <div className="mt-1 text-[7px] text-slate-600">
                  {readiness?.supplier_pending ??
                    0}
                  {" teyit bekliyor"}
                </div>
              </Link>


              {tour?.transport_mode ===
                "air" && (
                <Link
                  href={`/dashboard/turlar/${tourId}/ucus`}
                  className="rounded-[18px] border border-white/[.07] bg-[#030a11] p-4"
                >
                  <FaPlane className="text-blue-300" />
                  <div className="mt-3 text-[8px] font-black">
                    Uçuş Yönetimi
                  </div>
                  <div className="mt-1 text-[7px] text-slate-600">
                    {readiness?.flight_count ??
                      0}
                    {" segment"}
                  </div>
                </Link>
              )}


              {tour?.transport_mode ===
                "bus" && (
                <Link
                  href={`/dashboard/turlar/${tourId}/otobus`}
                  className="rounded-[18px] border border-white/[.07] bg-[#030a11] p-4"
                >
                  <FaBus className="text-cyan-300" />
                  <div className="mt-3 text-[8px] font-black">
                    Otobüs Operasyonu
                  </div>
                  <div className="mt-1 text-[7px] text-slate-600">
                    {readiness?.bus_count ??
                      0}
                    {" araç operasyonu"}
                  </div>
                </Link>
              )}


              <Link
                href={`/dashboard/turlar/${tourId}/yolcular`}
                className="rounded-[18px] border border-white/[.07] bg-[#030a11] p-4"
              >
                <FaUsers className="text-emerald-300" />
                <div className="mt-3 text-[8px] font-black">
                  Yolcular
                </div>
                <div className="mt-1 text-[7px] text-slate-600">
                  {readiness?.passenger_count ??
                    0}
                  {" gerçek yolcu"}
                </div>
              </Link>


              <Link
                href={`/dashboard/turlar/${tourId}/mesajlar`}
                className="rounded-[18px] border border-white/[.07] bg-[#030a11] p-4"
              >
                <FaPaperPlane className="text-emerald-300" />
                <div className="mt-3 text-[8px] font-black">
                  Mesajlaşma
                </div>
                <div className="mt-1 text-[7px] text-slate-600">
                  Operasyon iletişimini aç
                </div>
              </Link>

            </div>

          </section>


          <aside className="rounded-[26px] border border-orange-500/15 bg-orange-500/[.035] p-5">

            <div className="text-[9px] font-black">
              Sonraki Durum
            </div>


            {tour?.operation_stage ===
              "cancelled" ? (

              <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/[.06] p-4 text-[8px] font-black text-red-300">
                Tur iptal edilmiş.
              </div>

            ) : tour?.operation_stage ===
              "completed" ? (

              <div className="mt-5 rounded-xl border border-emerald-500/20 bg-emerald-500/[.06] p-4 text-[8px] font-black text-emerald-300">
                Tur operasyonu tamamlanmış.
              </div>

            ) : (

              <>

                <div className="mt-4 rounded-[18px] border border-white/[.08] bg-[#03080e] p-4">

                  <div className="text-[7px] text-slate-600">
                    ŞİMDİ
                  </div>

                  <div className="mt-2 text-sm font-black">
                    {label(
                      tour?.operation_stage ||
                      null
                    )}
                  </div>


                  <FaArrowRight className="my-4 text-orange-300" />


                  <div className="text-[7px] text-slate-600">
                    SONRAKİ
                  </div>

                  <div className="mt-2 text-sm font-black text-orange-300">
                    {nextStage
                      ? label(
                          nextStage
                        )
                      : "—"}
                  </div>

                </div>


                <textarea
                  value={
                    note
                  }
                  onChange={event =>
                    setNote(
                      event.target.value
                    )
                  }
                  rows={3}
                  placeholder="Durum değişikliği operasyon notu..."
                  className="mt-4 w-full rounded-xl border border-white/[.08] bg-[#03080e] p-3 text-[8px]"
                />


                {nextStage && (

                  <button
                    type="button"
                    disabled={
                      busy
                    }
                    onClick={() =>
                      void transition(
                        nextStage
                      )
                    }
                    className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 text-[8px] font-black disabled:opacity-40"
                  >
                    <FaFlagCheckered />
                    {label(
                      nextStage
                    )}
                    {" Durumuna Geç"}
                  </button>

                )}


                <button
                  type="button"
                  disabled={
                    busy
                  }
                  onClick={() =>
                    void transition(
                      "cancelled"
                    )
                  }
                  className="mt-3 h-10 w-full rounded-xl border border-red-500/20 bg-red-500/[.05] text-[7px] font-black text-red-300 disabled:opacity-40"
                >
                  Turu İptal Et
                </button>

              </>

            )}

          </aside>

        </section>


        <section className="mt-5 rounded-[26px] border border-white/[.08] bg-[linear-gradient(145deg,#081520,#050c13)] shadow-[0_14px_40px_rgba(0,0,0,.12)]">

          <div className="border-b border-white/[.06] p-5">

            <div className="text-[9px] font-black">
              Durum Geçmişi
            </div>

            <div className="mt-1 text-[7px] text-slate-600">
              Audit kaydı silinmez; her geçiş kayıt altındadır.
            </div>

          </div>


          <div className="divide-y divide-white/[.045]">

            {history.length ===
            0 ? (

              <div className="p-10 text-center text-[8px] text-slate-600">
                Henüz durum geçiş kaydı yok.
              </div>

            ) : (

              history.map(
                item => (
                  <div
                    key={
                      item.id
                    }
                    className="flex flex-col gap-3 p-5 lg:flex-row lg:items-center lg:justify-between"
                  >

                    <div>

                      <div className="flex items-center gap-2 text-[8px] font-black">

                        <span className="text-slate-500">
                          {label(
                            item.from_stage
                          )}
                        </span>

                        <FaArrowRight className="text-orange-300" />

                        <span>
                          {label(
                            item.to_stage
                          )}
                        </span>

                      </div>


                      {item.transition_note && (
                        <div className="mt-2 text-[7px] text-slate-500">
                          {item.transition_note}
                        </div>
                      )}

                    </div>


                    <div className="text-[7px] text-slate-600">
                      {formatDate(
                        item.created_at
                      )}
                    </div>

                  </div>
                )
              )

            )}

          </div>

        </section>

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

// TOUR_VISUAL_FINAL_STATUS
