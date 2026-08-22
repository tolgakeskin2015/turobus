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
  FaBell,
  FaBrain,
  FaChartLine,
  FaCheckCircle,
  FaClipboardCheck,
  FaCog,
  FaDatabase,
  FaExchangeAlt,
  FaFlag,
  FaHeartbeat,
  FaHistory,
  FaRoute,
  FaShieldAlt,
  FaTasks,
  FaTimesCircle,
  FaUserShield,
  FaWallet,
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


type Reservation = {
  id: string;
  reservation_code: string | null;
  full_name: string;
  departure_id: string | null;
};


type TowerSnapshot = {
  id: string;
  health_score: number;
  open_task_count: number;
  overdue_task_count: number;
  open_incident_count: number;
  critical_incident_count: number;
  unacknowledged_price_alert_count: number;
  new_group_request_count: number;
  ai_risk_score: number;
  ai_risk_level: string;
  finance_status: string;
  operational_net_result: number;
  outstanding_receivable: number;
  outstanding_payable: number;
  findings: Record<string, unknown>[];
  generated_at: string;
};


type AISnapshot = {
  id: string;
  decision_risk_score: number;
  decision_risk_level: string;
  findings: Record<string, unknown>[];
  recommended_actions: Record<string, unknown>[];
  engine: string;
  external_ai_used: boolean;
  human_approval_required: boolean;
  generated_at: string;
};


type PaymentPlan = {
  id: string;
  reservation_id: string;
  source_kind: string;
  received_amount: number;
  allocated_amount: number;
  currency: string;
  status: string;
  reconciliation_reference: string | null;
};


type AuditEvent = {
  id: string;
  event_type: string;
  entity_type: string;
  summary: string;
  created_at: string;
};


type RoleCapability = {
  id: string;
  role_key: string;
  capability: string;
  allowed: boolean;
};


type Notification = {
  id: string;
  severity: string;
  title: string;
  body: string;
  status: string;
  created_at: string;
};


type FeatureFlag = {
  id: string;
  flag_key: string;
  enabled: boolean;
  rollout_percent: number;
};


type Provider = {
  id: string;
  provider_key: string;
  provider_type: string;
  display_name: string;
  configured: boolean;
  active: boolean;
  last_status: string;
  last_checked_at: string | null;
};


type Report = {
  id: string;
  report_type: string;
  metrics: Record<string, unknown>;
  findings: Record<string, unknown>[];
  generated_at: string;
};


type Companion = {
  id: string;
  reservation_id: string;
  journey_status: string;
  readiness_score: number;
  checklist: Record<string, unknown>[];
  next_steps: Record<string, unknown>[];
  product_summary: Record<string, unknown>[];
  risk_summary: Record<string, unknown>[];
  generated_at: string;
};


function money(
  value:
    number
) {

  return new Intl.NumberFormat(
    "tr-TR",
    {
      style:
        "currency",
      currency:
        "TRY",
      maximumFractionDigits:
        0,
    }
  ).format(
    Number(
      value ||
      0
    )
  );
}


export default function PlatformControlPage() {

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
    currentUserId,
    setCurrentUserId,
  ] =
    useState("");


  const [
    reservations,
    setReservations,
  ] =
    useState<Reservation[]>(
      []
    );


  const [
    tower,
    setTower,
  ] =
    useState<TowerSnapshot | null>(
      null
    );


  const [
    aiTower,
    setAiTower,
  ] =
    useState<AISnapshot | null>(
      null
    );


  const [
    paymentPlans,
    setPaymentPlans,
  ] =
    useState<PaymentPlan[]>(
      []
    );


  const [
    audits,
    setAudits,
  ] =
    useState<AuditEvent[]>(
      []
    );


  const [
    capabilities,
    setCapabilities,
  ] =
    useState<RoleCapability[]>(
      []
    );


  const [
    notifications,
    setNotifications,
  ] =
    useState<Notification[]>(
      []
    );


  const [
    flags,
    setFlags,
  ] =
    useState<FeatureFlag[]>(
      []
    );


  const [
    providers,
    setProviders,
  ] =
    useState<Provider[]>(
      []
    );


  const [
    reports,
    setReports,
  ] =
    useState<Report[]>(
      []
    );


  const [
    companions,
    setCompanions,
  ] =
    useState<Companion[]>(
      []
    );


  const [
    selectedReservation,
    setSelectedReservation,
  ] =
    useState("");


  const [
    paymentAmount,
    setPaymentAmount,
  ] =
    useState("0");


  const [
    createdPlanId,
    setCreatedPlanId,
  ] =
    useState("");


  const [
    allocationKind,
    setAllocationKind,
  ] =
    useState(
      "base_tour"
    );


  const [
    allocationAmount,
    setAllocationAmount,
  ] =
    useState("0");


  const [
    reconciliationReference,
    setReconciliationReference,
  ] =
    useState("");


  const [
    roleKey,
    setRoleKey,
  ] =
    useState("operator");


  const [
    capabilityKey,
    setCapabilityKey,
  ] =
    useState(
      "tour.operations.manage"
    );


  const [
    notificationTitle,
    setNotificationTitle,
  ] =
    useState(
      "Operasyon bildirimi"
    );


  const [
    notificationBody,
    setNotificationBody,
  ] =
    useState("");


  const [
    flagKey,
    setFlagKey,
  ] =
    useState(
      "tour_os_next"
    );


  const [
    flagEnabled,
    setFlagEnabled,
  ] =
    useState(true);


  const [
    providerKey,
    setProviderKey,
  ] =
    useState("");


  const [
    providerName,
    setProviderName,
  ] =
    useState("");


  const [
    providerType,
    setProviderType,
  ] =
    useState("other");


  const [
    selectedProvider,
    setSelectedProvider,
  ] =
    useState("");


  const [
    healthStatus,
    setHealthStatus,
  ] =
    useState(
      "healthy"
    );


  const [
    latency,
    setLatency,
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
      async (
        currentCompanyId:
          string
      ) => {

        const [
          reservationResult,
          towerResult,
          aiResult,
          paymentResult,
          auditResult,
          capabilityResult,
          notificationResult,
          flagResult,
          providerResult,
          reportResult,
          companionResult,
        ] =
          await Promise.all([

            supabase
              .from(
                "reservations"
              )
              .select(
                "id,reservation_code,full_name,departure_id"
              )
              .eq(
                "company_id",
                currentCompanyId
              )
              .eq(
                "tour_id",
                tourId
              )
              .neq(
                "status",
                "cancelled"
              ),

            supabase
              .from(
                "tour_control_tower_snapshots"
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
                "generated_at",
                {
                  ascending:
                    false,
                }
              )
              .limit(1)
              .maybeSingle(),

            supabase
              .from(
                "tour_ai_control_tower_snapshots"
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
                "generated_at",
                {
                  ascending:
                    false,
                }
              )
              .limit(1)
              .maybeSingle(),

            supabase
              .from(
                "tour_payment_distribution_plans"
              )
              .select(
                "id,reservation_id,source_kind,received_amount,allocated_amount,currency,status,reconciliation_reference"
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
              .limit(20),

            supabase
              .from(
                "tour_audit_events"
              )
              .select(
                "id,event_type,entity_type,summary,created_at"
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
              .limit(30),

            supabase
              .from(
                "tour_role_capabilities"
              )
              .select(
                "id,role_key,capability,allowed"
              )
              .eq(
                "company_id",
                currentCompanyId
              )
              .order(
                "role_key"
              )
              .limit(50),

            supabase
              .from(
                "tour_notifications"
              )
              .select(
                "id,severity,title,body,status,created_at"
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
              .limit(20),

            supabase
              .from(
                "tour_feature_flags"
              )
              .select(
                "id,flag_key,enabled,rollout_percent"
              )
              .eq(
                "company_id",
                currentCompanyId
              )
              .order(
                "flag_key"
              ),

            supabase
              .from(
                "tour_provider_registry"
              )
              .select(
                "id,provider_key,provider_type,display_name,configured,active,last_status,last_checked_at"
              )
              .eq(
                "company_id",
                currentCompanyId
              )
              .order(
                "display_name"
              ),

            supabase
              .from(
                "tour_reporting_snapshots"
              )
              .select(
                "id,report_type,metrics,findings,generated_at"
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
                "generated_at",
                {
                  ascending:
                    false,
                }
              )
              .limit(5),

            supabase
              .from(
                "tour_travel_companion_snapshots"
              )
              .select(
                "id,reservation_id,journey_status,readiness_score,checklist,next_steps,product_summary,risk_summary,generated_at"
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
                "generated_at",
                {
                  ascending:
                    false,
                }
              )
              .limit(100),
          ]);


        const firstError =
          [
            reservationResult.error,
            towerResult.error,
            aiResult.error,
            paymentResult.error,
            auditResult.error,
            capabilityResult.error,
            notificationResult.error,
            flagResult.error,
            providerResult.error,
            reportResult.error,
            companionResult.error,
          ].find(Boolean);


        if (
          firstError
        ) {
          throw firstError;
        }


        setReservations(
          (
            reservationResult.data ??
            []
          ) as unknown as
            Reservation[]
        );


        setTower(
          towerResult.data as
            TowerSnapshot | null
        );


        setAiTower(
          aiResult.data as
            AISnapshot | null
        );


        setPaymentPlans(
          (
            paymentResult.data ??
            []
          ) as unknown as
            PaymentPlan[]
        );


        setAudits(
          (
            auditResult.data ??
            []
          ) as unknown as
            AuditEvent[]
        );


        setCapabilities(
          (
            capabilityResult.data ??
            []
          ) as unknown as
            RoleCapability[]
        );


        setNotifications(
          (
            notificationResult.data ??
            []
          ) as unknown as
            Notification[]
        );


        setFlags(
          (
            flagResult.data ??
            []
          ) as unknown as
            FeatureFlag[]
        );


        setProviders(
          (
            providerResult.data ??
            []
          ) as unknown as
            Provider[]
        );


        setReports(
          (
            reportResult.data ??
            []
          ) as unknown as
            Report[]
        );


        setCompanions(
          (
            companionResult.data ??
            []
          ) as unknown as
            Companion[]
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


          setCurrentUserId(
            authData.user.id
          );


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


  const reservationMap =
    useMemo(
      () =>
        new Map(
          reservations.map(
            reservation => [
              reservation.id,
              reservation,
            ]
          )
        ),
      [
        reservations,
      ]
    );


  const badProviders =
    providers.filter(
      provider =>
        provider.active
        &&
        (
          !provider.configured
          ||
          [
            "down",
            "degraded",
            "misconfigured",
          ].includes(
            provider.last_status
          )
        )
    );


  const unreadNotifications =
    notifications.filter(
      notification =>
        notification.status ===
          "unread"
    ).length;


  async function run(
    fn:
      string,
    args:
      Record<
        string,
        unknown
      >,
    success:
      string
  ) {

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
          fn,
          args
        );


      if (
        rpcError
      ) {
        throw rpcError;
      }


      await load(
        companyId
      );


      setNotice(
        success
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


  async function createPaymentPlan() {

    if (
      !selectedReservation
    ) {
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
          "create_tour_payment_distribution_plan",
          {
            p_reservation_id:
              selectedReservation,

            p_received_amount:
              Number(
                paymentAmount
              ) ||
              0,

            p_currency:
              "TRY",

            p_source_kind:
              "manual",

            p_source_reference:
              null,

            p_notes:
              "Tour OS ödeme dağıtım planı",
          }
        );


      if (
        rpcError
      ) {
        throw rpcError;
      }


      setCreatedPlanId(
        String(
          data
        )
      );


      await load(
        companyId
      );


      setNotice(
        "Ödeme dağıtım planı oluşturuldu."
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
        Platform kontrol merkezi yükleniyor...
      </main>
    );
  }


  return (
    <main data-tour-visual-final
      data-tour-os-screen="platform-control"
      className="min-h-screen bg-[#030a11] text-white"
    >

      <TourExecutiveChrome
        tourId={tourId}
        moduleKey="platform"
      />


      <div className="mx-auto max-w-[1850px] px-5 py-7 lg:px-8">

        <Link
          href={`/dashboard/turlar/${tourId}`}
          className="inline-flex items-center gap-2 text-[9px] font-black text-slate-500"
        >
          <FaArrowLeft />
          Tur Operasyon Merkezi
        </Link>


        <section className="mt-4 rounded-[26px] border border-orange-500/15 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,.13),transparent_35%),linear-gradient(145deg,#07131f,#03080e)] p-6 lg:p-8">

          <div className="text-[8px] font-black tracking-[.16em] text-orange-300">
            AŞAMA 37–50
          </div>

          <h1 className="mt-2 text-3xl font-black">
            Platform Control Tower
          </h1>

          <p className="mt-3 max-w-4xl text-[9px] leading-5 text-slate-400">
            Control Tower, AI karar desteği, mevcut görev/durum/iptal-iade motorları, ödeme dağıtımı, audit, rol, bildirim, feature flags, provider health, raporlama ve Yol Arkadaşı tek yönetim alanında.
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


        <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">

          {[
            [
              "Sağlık",
              tower
                ? `%${tower.health_score}`
                : "—",
            ],
            [
              "AI Risk",
              aiTower
                ? `${aiTower.decision_risk_score}/100`
                : "—",
            ],
            [
              "Gecikmiş Görev",
              String(
                tower?.overdue_task_count ??
                0
              ),
            ],
            [
              "Kritik Vaka",
              String(
                tower?.critical_incident_count ??
                0
              ),
            ],
            [
              "Finans",
              tower?.finance_status ??
              "—",
            ],
            [
              "Bildirim",
              String(
                unreadNotifications
              ),
            ],
            [
              "Provider Risk",
              String(
                badProviders.length
              ),
            ],
            [
              "Yol Arkadaşı",
              String(
                companions.length
              ),
            ],
          ].map(
            item => (

              <article
                key={
                  item[0]
                }
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

          <article className="rounded-[22px] border border-orange-500/15 bg-[#07131f] p-5">

            <div className="flex items-center gap-2 text-sm font-black">
              <FaChartLine className="text-orange-300" />
              37 — Advanced Control Tower
            </div>


            <button
              disabled={
                busy
              }
              onClick={
                () =>
                  void run(
                    "generate_tour_control_tower_snapshot",
                    {
                      p_tour_id:
                        tourId,

                      p_departure_id:
                        null,
                    },
                    "Control Tower snapshot güncellendi."
                  )
              }
              className="mt-4 rounded-xl bg-orange-500 px-4 py-3 text-[8px] font-black"
            >
              Control Tower Yenile
            </button>


            {tower && (

              <div className="mt-4 grid gap-3 sm:grid-cols-3">

                <div className="rounded-xl border border-white/[.07] bg-[#030a11] p-4">
                  <div className="text-[7px] text-slate-500">
                    Sağlık Skoru
                  </div>
                  <div className="mt-2 text-3xl font-black">
                    {tower.health_score}
                  </div>
                </div>


                <div className="rounded-xl border border-white/[.07] bg-[#030a11] p-4">
                  <div className="text-[7px] text-slate-500">
                    Net Sonuç
                  </div>
                  <div className="mt-2 text-lg font-black">
                    {money(
                      tower.operational_net_result
                    )}
                  </div>
                </div>


                <div className="rounded-xl border border-white/[.07] bg-[#030a11] p-4">
                  <div className="text-[7px] text-slate-500">
                    AI Operasyon Riski
                  </div>
                  <div className="mt-2 text-lg font-black">
                    {tower.ai_risk_score}
                    {" · "}
                    {tower.ai_risk_level}
                  </div>
                </div>

              </div>
            )}

          </article>


          <article className="rounded-[22px] border border-violet-500/15 bg-[#07131f] p-5">

            <div className="flex items-center gap-2 text-sm font-black">
              <FaBrain className="text-violet-300" />
              38 — AI Control Tower
            </div>


            <button
              disabled={
                busy
              }
              onClick={
                () =>
                  void run(
                    "generate_tour_ai_control_tower_snapshot",
                    {
                      p_tour_id:
                        tourId,

                      p_departure_id:
                        null,
                    },
                    "AI Control Tower karar destek snapshot'ı oluşturuldu."
                  )
              }
              className="mt-4 rounded-xl bg-violet-500 px-4 py-3 text-[8px] font-black"
            >
              Risk Analizini Çalıştır
            </button>


            {aiTower && (

              <div className="mt-4 rounded-xl border border-violet-500/10 bg-[#030a11] p-4">

                <div className="text-2xl font-black">
                  {aiTower.decision_risk_score}/100
                </div>

                <div className="mt-1 text-[8px] text-violet-300">
                  {aiTower.decision_risk_level}
                </div>

                <div className="mt-2 text-[7px] text-slate-500">
                  Motor: {aiTower.engine}
                  {" · "}
                  External AI:{" "}
                  {aiTower.external_ai_used
                    ? "Evet"
                    : "Hayır"}
                </div>


                <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap text-[7px] leading-5 text-slate-400">
                  {JSON.stringify(
                    aiTower.recommended_actions,
                    null,
                    2
                  )}
                </pre>

              </div>
            )}

          </article>

        </section>


        <section className="mt-5 grid gap-5 lg:grid-cols-3">

          <Link
            href={`/dashboard/turlar/${tourId}/gorevler`}
            className="rounded-[22px] border border-blue-500/15 bg-[#07131f] p-5"
          >
            <FaTasks className="text-blue-300" />
            <div className="mt-3 text-sm font-black">
              39 — Görev Merkezi
            </div>
            <div className="mt-2 text-[8px] leading-5 text-slate-500">
              Mevcut gerçek görev motoru korunuyor ve Control Tower'a bağlı.
            </div>
          </Link>


          <Link
            href={`/dashboard/turlar/${tourId}/durum`}
            className="rounded-[22px] border border-emerald-500/15 bg-[#07131f] p-5"
          >
            <FaRoute className="text-emerald-300" />
            <div className="mt-3 text-sm font-black">
              40 — Durum Motoru
            </div>
            <div className="mt-2 text-[8px] leading-5 text-slate-500">
              Mevcut operasyon lifecycle motoru source of truth olarak devam ediyor.
            </div>
          </Link>


          <Link
            href={`/dashboard/turlar/${tourId}/degisiklikler`}
            className="rounded-[22px] border border-red-500/15 bg-[#07131f] p-5"
          >
            <FaExchangeAlt className="text-red-300" />
            <div className="mt-3 text-sm font-black">
              41 — İptal / İade
            </div>
            <div className="mt-2 text-[8px] leading-5 text-slate-500">
              Mevcut change-case, gerçek refund adapter ve kapanış motoru yeniden yazılmadan kullanılıyor.
            </div>
          </Link>

        </section>


        <section className="mt-5 rounded-[22px] border border-emerald-500/15 bg-[#07131f] p-5">

          <div className="flex items-center gap-2 text-sm font-black">
            <FaWallet className="text-emerald-300" />
            42 — Ödeme Dağıtım & Mutabakat
          </div>


          <div className="mt-4 grid gap-3 lg:grid-cols-4">

            <select
              value={
                selectedReservation
              }
              onChange={
                event =>
                  setSelectedReservation(
                    event.target.value
                  )
              }
              className="min-h-11 rounded-xl border border-white/[.08] bg-[#03080e] px-3 text-[8px]"
            >
              <option value="">
                Rezervasyon seç
              </option>

              {reservations.map(
                reservation => (

                  <option
                    key={
                      reservation.id
                    }
                    value={
                      reservation.id
                    }
                  >
                    {reservation.reservation_code ||
                      reservation.id.slice(
                        0,
                        8
                      )}
                    {" · "}
                    {reservation.full_name}
                  </option>
                )
              )}
            </select>


            <input
              type="number"
              min="0"
              value={
                paymentAmount
              }
              onChange={
                event =>
                  setPaymentAmount(
                    event.target.value
                  )
              }
              placeholder="Gelen tutar"
              className="min-h-11 rounded-xl border border-white/[.08] bg-[#03080e] px-3 text-[8px]"
            />


            <button
              disabled={
                busy ||
                !selectedReservation
              }
              onClick={
                () =>
                  void createPaymentPlan()
              }
              className="min-h-11 rounded-xl bg-emerald-500 px-4 text-[8px] font-black text-black"
            >
              Dağıtım Planı Aç
            </button>


            <div className="rounded-xl border border-white/[.06] bg-[#030a11] p-3 text-[7px] text-slate-500">
              Provider'dan para çekmez veya göndermez. Finans dağıtım kaydıdır.
            </div>

          </div>


          {createdPlanId && (

            <div className="mt-4 grid gap-3 lg:grid-cols-5">

              <select
                value={
                  allocationKind
                }
                onChange={
                  event =>
                    setAllocationKind(
                      event.target.value
                    )
                }
                className="min-h-11 rounded-xl border border-white/[.08] bg-[#03080e] px-3 text-[8px]"
              >
                <option value="base_tour">
                  Ana Tur
                </option>
                <option value="transfer">
                  Transfer
                </option>
                <option value="hotel">
                  Otel
                </option>
                <option value="activity">
                  Aktivite
                </option>
                <option value="tour">
                  Ek Tur
                </option>
                <option value="car_rental">
                  Araç
                </option>
                <option value="refund_reserve">
                  İade Rezervi
                </option>
                <option value="other">
                  Diğer
                </option>
              </select>


              <input
                type="number"
                min="0.01"
                value={
                  allocationAmount
                }
                onChange={
                  event =>
                    setAllocationAmount(
                      event.target.value
                    )
                }
                placeholder="Dağıtılacak"
                className="min-h-11 rounded-xl border border-white/[.08] bg-[#03080e] px-3 text-[8px]"
              />


              <button
                disabled={
                  busy
                }
                onClick={
                  () =>
                    void run(
                      "add_tour_payment_distribution_item",
                      {
                        p_distribution_plan_id:
                          createdPlanId,

                        p_allocation_kind:
                          allocationKind,

                        p_amount:
                          Number(
                            allocationAmount
                          ) ||
                          0,

                        p_reservation_product_item_id:
                          null,

                        p_description:
                          "Tour OS ödeme dağıtımı",
                      },
                      "Dağıtım kalemi eklendi."
                    )
                }
                className="min-h-11 rounded-xl bg-blue-500 px-4 text-[8px] font-black"
              >
                Kalem Ekle
              </button>


              <button
                disabled={
                  busy
                }
                onClick={
                  () =>
                    void run(
                      "confirm_tour_payment_distribution_plan",
                      {
                        p_distribution_plan_id:
                          createdPlanId,
                      },
                      "Ödeme dağıtım planı onaylandı."
                    )
                }
                className="min-h-11 rounded-xl bg-orange-500 px-4 text-[8px] font-black"
              >
                Planı Onayla
              </button>


              <input
                value={
                  reconciliationReference
                }
                onChange={
                  event =>
                    setReconciliationReference(
                      event.target.value
                    )
                }
                placeholder="Mutabakat referansı"
                className="min-h-11 rounded-xl border border-white/[.08] bg-[#03080e] px-3 text-[8px]"
              />


              <button
                disabled={
                  busy ||
                  !reconciliationReference
                }
                onClick={
                  () => {

                    if (
                      !window.confirm(
                        "Bu işlem yalnız finans mutabakat kaydı oluşturur; provider para transferi yapmaz. Devam?"
                      )
                    ) {
                      return;
                    }


                    void run(
                      "reconcile_tour_payment_distribution_plan",
                      {
                        p_distribution_plan_id:
                          createdPlanId,

                        p_reconciliation_reference:
                          reconciliationReference,
                      },
                      "Finans mutabakatı kaydedildi."
                    );
                  }
                }
                className="min-h-11 rounded-xl bg-emerald-600 px-4 text-[8px] font-black"
              >
                Mutabakatı Kapat
              </button>

            </div>
          )}


          <div className="mt-4 overflow-x-auto">

            <table className="min-w-[900px] text-left">

              <thead className="text-[7px] font-black text-slate-500">
                <tr>
                  <th className="px-3 py-2">
                    Rezervasyon
                  </th>
                  <th className="px-3 py-2">
                    Kaynak
                  </th>
                  <th className="px-3 py-2 text-right">
                    Gelen
                  </th>
                  <th className="px-3 py-2 text-right">
                    Dağıtılan
                  </th>
                  <th className="px-3 py-2">
                    Durum
                  </th>
                </tr>
              </thead>


              <tbody>

                {paymentPlans.map(
                  plan => (

                    <tr
                      key={
                        plan.id
                      }
                      className="border-t border-white/[.06] text-[8px]"
                    >
                      <td className="px-3 py-3">
                        {reservationMap.get(
                          plan.reservation_id
                        )?.full_name ||
                          plan.reservation_id.slice(
                            0,
                            8
                          )}
                      </td>

                      <td className="px-3 py-3">
                        {plan.source_kind}
                      </td>

                      <td className="px-3 py-3 text-right">
                        {money(
                          plan.received_amount
                        )}
                      </td>

                      <td className="px-3 py-3 text-right">
                        {money(
                          plan.allocated_amount
                        )}
                      </td>

                      <td className="px-3 py-3">
                        {plan.status}
                      </td>
                    </tr>
                  )
                )}

              </tbody>

            </table>

          </div>

        </section>


        <section className="mt-5 grid gap-5 xl:grid-cols-2">

          <article className="rounded-[22px] border border-white/[.08] bg-[linear-gradient(145deg,#081520,#050c13)] shadow-[0_14px_40px_rgba(0,0,0,.12)] p-5">

            <div className="flex items-center gap-2 text-sm font-black">
              <FaUserShield className="text-cyan-300" />
              44 — Rol & Yetki
            </div>


            <div className="mt-4 grid gap-3 sm:grid-cols-2">

              <input
                value={
                  roleKey
                }
                onChange={
                  event =>
                    setRoleKey(
                      event.target.value
                    )
                }
                placeholder="Rol"
                className="min-h-11 rounded-xl border border-white/[.08] bg-[#03080e] px-3 text-[8px]"
              />


              <input
                value={
                  capabilityKey
                }
                onChange={
                  event =>
                    setCapabilityKey(
                      event.target.value
                    )
                }
                placeholder="Capability"
                className="min-h-11 rounded-xl border border-white/[.08] bg-[#03080e] px-3 text-[8px]"
              />

            </div>


            <button
              disabled={
                busy
              }
              onClick={
                () =>
                  void run(
                    "set_tour_role_capability",
                    {
                      p_company_id:
                        companyId,

                      p_role_key:
                        roleKey,

                      p_capability:
                        capabilityKey,

                      p_allowed:
                        true,
                    },
                    "Rol yetkisi güncellendi."
                  )
              }
              className="mt-3 rounded-xl bg-cyan-500 px-4 py-3 text-[8px] font-black text-black"
            >
              Yetki Ver
            </button>


            <div className="mt-4 space-y-2">

              {capabilities
                .slice(
                  0,
                  8
                )
                .map(
                  capability => (

                    <div
                      key={
                        capability.id
                      }
                      className="rounded-xl border border-white/[.06] bg-[#030a11] p-3 text-[8px]"
                    >
                      <span className="font-black">
                        {capability.role_key}
                      </span>
                      {" → "}
                      {capability.capability}
                      {" · "}
                      {capability.allowed
                        ? "izinli"
                        : "kapalı"}
                    </div>
                  )
                )}

            </div>

          </article>


          <article className="rounded-[22px] border border-white/[.08] bg-[linear-gradient(145deg,#081520,#050c13)] shadow-[0_14px_40px_rgba(0,0,0,.12)] p-5">

            <div className="flex items-center gap-2 text-sm font-black">
              <FaBell className="text-amber-300" />
              45 — Bildirim Merkezi
            </div>


            <input
              value={
                notificationTitle
              }
              onChange={
                event =>
                  setNotificationTitle(
                    event.target.value
                  )
              }
              className="mt-4 min-h-11 w-full rounded-xl border border-white/[.08] bg-[#03080e] px-3 text-[8px]"
            />


            <textarea
              value={
                notificationBody
              }
              onChange={
                event =>
                  setNotificationBody(
                    event.target.value
                  )
              }
              placeholder="Bildirim..."
              className="mt-3 min-h-24 w-full rounded-xl border border-white/[.08] bg-[#03080e] p-3 text-[8px]"
            />


            <button
              disabled={
                busy ||
                !notificationBody.trim()
              }
              onClick={
                () =>
                  void run(
                    "create_tour_notification",
                    {
                      p_company_id:
                        companyId,

                      p_tour_id:
                        tourId,

                      p_departure_id:
                        null,

                      p_reservation_id:
                        null,

                      p_recipient_user_id:
                        currentUserId,

                      p_notification_type:
                        "operation",

                      p_severity:
                        "info",

                      p_title:
                        notificationTitle,

                      p_body:
                        notificationBody,

                      p_source_type:
                        "manual",

                      p_source_reference:
                        null,
                    },
                    "İç bildirim oluşturuldu."
                  )
              }
              className="mt-3 rounded-xl bg-amber-500 px-4 py-3 text-[8px] font-black text-black"
            >
              İç Bildirim Oluştur
            </button>


            <div className="mt-3 text-[7px] leading-5 text-slate-500">
              Bu kayıt e-posta veya WhatsApp gönderildi anlamına gelmez.
            </div>

          </article>

        </section>


        <section className="mt-5 grid gap-5 xl:grid-cols-3">

          <article className="rounded-[22px] border border-white/[.08] bg-[linear-gradient(145deg,#081520,#050c13)] shadow-[0_14px_40px_rgba(0,0,0,.12)] p-5">

            <div className="flex items-center gap-2 text-sm font-black">
              <FaFlag className="text-fuchsia-300" />
              46 — Feature Flags
            </div>


            <input
              value={
                flagKey
              }
              onChange={
                event =>
                  setFlagKey(
                    event.target.value
                  )
              }
              className="mt-4 min-h-11 w-full rounded-xl border border-white/[.08] bg-[#03080e] px-3 text-[8px]"
            />


            <label className="mt-3 flex min-h-11 items-center gap-2 rounded-xl border border-white/[.08] bg-[#03080e] px-3 text-[8px]">
              <input
                type="checkbox"
                checked={
                  flagEnabled
                }
                onChange={
                  event =>
                    setFlagEnabled(
                      event.target.checked
                    )
                }
              />
              Aktif
            </label>


            <button
              disabled={
                busy
              }
              onClick={
                () =>
                  void run(
                    "set_tour_feature_flag",
                    {
                      p_company_id:
                        companyId,

                      p_flag_key:
                        flagKey,

                      p_enabled:
                        flagEnabled,

                      p_rollout_percent:
                        100,

                      p_config:
                        {},

                      p_description:
                        "Tour OS feature flag",
                    },
                    "Feature flag kaydedildi."
                  )
              }
              className="mt-3 rounded-xl bg-fuchsia-500 px-4 py-3 text-[8px] font-black"
            >
              Flag Kaydet
            </button>


            <div className="mt-4 text-[7px] text-slate-500">
              {flags.length} feature flag kayıtlı.
            </div>

          </article>


          <article className="rounded-[22px] border border-white/[.08] bg-[linear-gradient(145deg,#081520,#050c13)] shadow-[0_14px_40px_rgba(0,0,0,.12)] p-5">

            <div className="flex items-center gap-2 text-sm font-black">
              <FaDatabase className="text-blue-300" />
              47 — Provider Registry
            </div>


            <input
              value={
                providerKey
              }
              onChange={
                event =>
                  setProviderKey(
                    event.target.value
                  )
              }
              placeholder="provider_key"
              className="mt-4 min-h-11 w-full rounded-xl border border-white/[.08] bg-[#03080e] px-3 text-[8px]"
            />


            <input
              value={
                providerName
              }
              onChange={
                event =>
                  setProviderName(
                    event.target.value
                  )
              }
              placeholder="Provider adı"
              className="mt-3 min-h-11 w-full rounded-xl border border-white/[.08] bg-[#03080e] px-3 text-[8px]"
            />


            <select
              value={
                providerType
              }
              onChange={
                event =>
                  setProviderType(
                    event.target.value
                  )
              }
              className="mt-3 min-h-11 w-full rounded-xl border border-white/[.08] bg-[#03080e] px-3 text-[8px]"
            >
              <option value="payment">
                Payment
              </option>
              <option value="flight">
                Flight
              </option>
              <option value="bus">
                Bus
              </option>
              <option value="hotel">
                Hotel
              </option>
              <option value="transfer">
                Transfer
              </option>
              <option value="activity">
                Activity
              </option>
              <option value="car_rental">
                Car Rental
              </option>
              <option value="messaging">
                Messaging
              </option>
              <option value="ai">
                AI
              </option>
              <option value="other">
                Other
              </option>
            </select>


            <button
              disabled={
                busy ||
                !providerKey ||
                !providerName
              }
              onClick={
                () =>
                  void run(
                    "register_tour_provider",
                    {
                      p_company_id:
                        companyId,

                      p_provider_key:
                        providerKey,

                      p_provider_type:
                        providerType,

                      p_display_name:
                        providerName,

                      p_configured:
                        false,

                      p_active:
                        true,

                      p_config_metadata:
                        {
                          secrets_stored:
                            false,
                        },
                    },
                    "Provider registry kaydı oluşturuldu."
                  )
              }
              className="mt-3 rounded-xl bg-blue-500 px-4 py-3 text-[8px] font-black"
            >
              Provider Kaydet
            </button>

          </article>


          <article className="rounded-[22px] border border-white/[.08] bg-[linear-gradient(145deg,#081520,#050c13)] shadow-[0_14px_40px_rgba(0,0,0,.12)] p-5">

            <div className="flex items-center gap-2 text-sm font-black">
              <FaHeartbeat className="text-emerald-300" />
              48 — API / Provider Health
            </div>


            <select
              value={
                selectedProvider
              }
              onChange={
                event =>
                  setSelectedProvider(
                    event.target.value
                  )
              }
              className="mt-4 min-h-11 w-full rounded-xl border border-white/[.08] bg-[#03080e] px-3 text-[8px]"
            >
              <option value="">
                Provider seç
              </option>

              {providers.map(
                provider => (

                  <option
                    key={
                      provider.id
                    }
                    value={
                      provider.id
                    }
                  >
                    {provider.display_name}
                    {" · "}
                    {provider.last_status}
                  </option>
                )
              )}
            </select>


            <select
              value={
                healthStatus
              }
              onChange={
                event =>
                  setHealthStatus(
                    event.target.value
                  )
              }
              className="mt-3 min-h-11 w-full rounded-xl border border-white/[.08] bg-[#03080e] px-3 text-[8px]"
            >
              <option value="healthy">
                Healthy
              </option>
              <option value="degraded">
                Degraded
              </option>
              <option value="down">
                Down
              </option>
              <option value="misconfigured">
                Misconfigured
              </option>
            </select>


            <input
              type="number"
              min="0"
              value={
                latency
              }
              onChange={
                event =>
                  setLatency(
                    event.target.value
                  )
              }
              placeholder="Ölçülen latency ms"
              className="mt-3 min-h-11 w-full rounded-xl border border-white/[.08] bg-[#03080e] px-3 text-[8px]"
            />


            <button
              disabled={
                busy ||
                !selectedProvider
              }
              onClick={
                () =>
                  void run(
                    "record_tour_provider_health_check",
                    {
                      p_provider_id:
                        selectedProvider,

                      p_status:
                        healthStatus,

                      p_latency_ms:
                        latency
                          ? Number(
                              latency
                            )
                          : null,

                      p_source:
                        "observed_manual_check",

                      p_message:
                        "Gerçek gözlem sonucu Tour OS üzerinden kaydedildi.",

                      p_metadata:
                        {
                          synthetic:
                            false,
                        },
                    },
                    "Provider health gözlemi kaydedildi."
                  )
              }
              className="mt-3 rounded-xl bg-emerald-500 px-4 py-3 text-[8px] font-black text-black"
            >
              Gerçek Gözlemi Kaydet
            </button>


            <div className="mt-3 text-[7px] leading-5 text-slate-500">
              Bu ekran otomatik sahte ping üretmez. Yalnız gerçek gözlem sonucu kaydeder.
            </div>

          </article>

        </section>


        <section className="mt-5 grid gap-5 xl:grid-cols-2">

          <article className="rounded-[22px] border border-white/[.08] bg-[linear-gradient(145deg,#081520,#050c13)] shadow-[0_14px_40px_rgba(0,0,0,.12)] p-5">

            <div className="flex items-center justify-between gap-3">

              <div className="flex items-center gap-2 text-sm font-black">
                <FaClipboardCheck className="text-green-300" />
                49 — Yönetim Raporlama
              </div>


              <button
                disabled={
                  busy
                }
                onClick={
                  () =>
                    void run(
                      "generate_tour_management_report",
                      {
                        p_tour_id:
                          tourId,

                        p_departure_id:
                          null,
                      },
                      "Yönetim raporu snapshot'ı oluşturuldu."
                    )
                }
                className="rounded-xl bg-green-500 px-4 py-2 text-[8px] font-black text-black"
              >
                Rapor Üret
              </button>

            </div>


            {reports[0] && (

              <pre className="mt-4 max-h-80 overflow-auto whitespace-pre-wrap rounded-xl bg-[#030a11] p-4 text-[7px] leading-5 text-slate-400">
                {JSON.stringify(
                  reports[0].metrics,
                  null,
                  2
                )}
              </pre>
            )}

          </article>


          <article className="rounded-[22px] border border-white/[.08] bg-[linear-gradient(145deg,#081520,#050c13)] shadow-[0_14px_40px_rgba(0,0,0,.12)] p-5">

            <div className="flex items-center gap-2 text-sm font-black">
              <FaRoute className="text-orange-300" />
              50 — Yol Arkadaşı
            </div>


            <select
              value={
                selectedReservation
              }
              onChange={
                event =>
                  setSelectedReservation(
                    event.target.value
                  )
              }
              className="mt-4 min-h-11 w-full rounded-xl border border-white/[.08] bg-[#03080e] px-3 text-[8px]"
            >
              <option value="">
                Rezervasyon seç
              </option>

              {reservations.map(
                reservation => (

                  <option
                    key={
                      reservation.id
                    }
                    value={
                      reservation.id
                    }
                  >
                    {reservation.reservation_code ||
                      reservation.id.slice(
                        0,
                        8
                      )}
                    {" · "}
                    {reservation.full_name}
                  </option>
                )
              )}
            </select>


            <button
              disabled={
                busy ||
                !selectedReservation
              }
              onClick={
                () =>
                  void run(
                    "generate_tour_travel_companion_snapshot",
                    {
                      p_reservation_id:
                        selectedReservation,
                    },
                    "Yol Arkadaşı snapshot'ı güncellendi."
                  )
              }
              className="mt-3 rounded-xl bg-orange-500 px-4 py-3 text-[8px] font-black"
            >
              Yol Arkadaşını Güncelle
            </button>


            {selectedReservation && (

              <div className="mt-4">

                {(() => {

                  const companion =
                    companions.find(
                      item =>
                        item.reservation_id ===
                        selectedReservation
                    );


                  if (
                    !companion
                  ) {
                    return (
                      <div className="text-[8px] text-slate-500">
                        Snapshot henüz yok.
                      </div>
                    );
                  }


                  return (

                    <div className="rounded-xl border border-orange-500/10 bg-[#030a11] p-4">

                      <div className="text-2xl font-black">
                        %{companion.readiness_score}
                      </div>

                      <div className="mt-1 text-[8px] text-orange-300">
                        {companion.journey_status}
                      </div>


                      <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap text-[7px] leading-5 text-slate-400">
                        {JSON.stringify(
                          companion.next_steps,
                          null,
                          2
                        )}
                      </pre>

                    </div>
                  );
                })()}

              </div>
            )}


            <div className="mt-3 text-[7px] text-slate-500">
              Mevcut /seyahat token sistemi korunur; bu onun yerine ikinci public seyahat sistemi kurmaz.
            </div>

          </article>

        </section>


        <section className="mt-5 rounded-[22px] border border-white/[.08] bg-[linear-gradient(145deg,#081520,#050c13)] shadow-[0_14px_40px_rgba(0,0,0,.12)] p-5">

          <div className="flex items-center gap-2 text-sm font-black">
            <FaHistory className="text-slate-300" />
            43 — Immutable Audit Timeline
          </div>


          <div className="mt-4 space-y-2">

            {audits.map(
              event => (

                <div
                  key={
                    event.id
                  }
                  className="flex flex-col gap-1 rounded-xl border border-white/[.06] bg-[#030a11] p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="text-[8px] font-black">
                      {event.summary}
                    </div>

                    <div className="mt-1 text-[7px] text-slate-500">
                      {event.event_type}
                      {" · "}
                      {event.entity_type}
                    </div>
                  </div>


                  <div className="text-[7px] text-slate-600">
                    {new Date(
                      event.created_at
                    ).toLocaleString(
                      "tr-TR"
                    )}
                  </div>

                </div>
              )
            )}

          </div>

        </section>


        <section className="mt-5 rounded-[22px] border border-white/[.08] bg-[linear-gradient(145deg,#081520,#050c13)] shadow-[0_14px_40px_rgba(0,0,0,.12)] p-5">

          <div className="flex items-center gap-2 text-sm font-black">
            <FaShieldAlt className="text-emerald-300" />
            Platform Güvence Durumu
          </div>


          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">

            <div className="rounded-xl border border-emerald-500/10 bg-emerald-500/[.03] p-4 text-[8px] text-emerald-300">
              Görev, durum ve iptal/iade motorları yeniden yazılmadı.
            </div>


            <div className="rounded-xl border border-amber-500/10 bg-amber-500/[.03] p-4 text-[8px] text-amber-300">
              Ödeme dağıtım mutabakatı provider para transferi değildir.
            </div>


            <div className="rounded-xl border border-violet-500/10 bg-violet-500/[.03] p-4 text-[8px] text-violet-300">
              AI Control Tower insan onayı olmadan finans/operasyon mutasyonu yapmaz.
            </div>


            <div className="rounded-xl border border-blue-500/10 bg-blue-500/[.03] p-4 text-[8px] text-blue-300">
              Provider sağlığı yalnız gerçek gözlem kaydedildiğinde değişir.
            </div>

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

// TOUR_VISUAL_FINAL_PLATFORM
