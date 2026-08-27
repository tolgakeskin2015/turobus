"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useParams } from "next/navigation";
import {
  FaArrowLeft,
  FaBrain,
  FaCheckCircle,
  FaExclamationTriangle,
  FaSyncAlt,
} from "react-icons/fa";

import { supabase } from "@/lib/supabase";
import { getCurrentMembership } from "@/lib/current-user";

type Departure = {
  id: string;
  departure_date: string;
};

type ControlSnapshot = {
  id: string;
  departure_id: string | null;
  operation_status: string | null;
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
  operational_net_result: number | string;
  outstanding_receivable: number | string;
  outstanding_payable: number | string;
  findings: unknown;
  generated_at: string;
};

type AiSnapshot = {
  id: string;
  departure_id: string | null;
  decision_risk_score: number;
  decision_risk_level: string;
  findings: unknown;
  recommended_actions: unknown;
  engine: string;
  external_ai_used: boolean;
  human_approval_required: boolean;
  generated_at: string;
};

function errorMessage(value: unknown) {
  if (value instanceof Error) {
    return value.message;
  }

  if (value && typeof value === "object") {
    const item = value as {
      message?: unknown;
      details?: unknown;
      hint?: unknown;
      code?: unknown;
    };

    const parts = [
      item.message,
      item.details,
      item.hint,
      item.code,
    ].filter(
      (entry): entry is string =>
        typeof entry === "string" &&
        entry.trim().length > 0
    );

    if (parts.length) {
      return parts.join(" · ");
    }
  }

  return String(value);
}

function rows(value: unknown) {
  return Array.isArray(value)
    ? value.filter(
        (
          item
        ): item is Record<string, unknown> =>
          Boolean(item) &&
          typeof item === "object"
      )
    : [];
}

function itemText(
  item: Record<string, unknown>
) {
  for (const key of [
    "message",
    "title",
    "action",
    "description",
    "type",
  ]) {
    const value = item[key];

    if (
      typeof value === "string" &&
      value.trim()
    ) {
      return value;
    }
  }

  return JSON.stringify(item);
}

function money(
  value: number | string | null | undefined
) {
  const numeric = Number(value ?? 0);

  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(
    Number.isFinite(numeric)
      ? numeric
      : 0
  );
}

function riskLabel(value?: string | null) {
  if (value === "critical") return "Kritik";
  if (value === "high") return "Yüksek";
  if (value === "medium") return "Orta";
  if (value === "low") return "Düşük";

  return value || "Bilinmiyor";
}


function financeStatusLabel(value?: string | null) {
  if (!value || value === "unknown") return "Finans Verisi Yok";
  if (value === "profit") return "Kârlı";
  if (value === "loss") return "Zararda";
  if (value === "healthy") return "Sağlıklı";
  if (value === "critical") return "Kritik";
  if (value === "balanced") return "Dengeli";

  return value;
}

function operationStatusLabel(value?: string | null) {
  if (!value) return "Belirsiz";
  if (value === "draft") return "Taslak";
  if (value === "planning") return "Planlama";
  if (value === "ready") return "Hazır";
  if (value === "active") return "Aktif";
  if (value === "completed") return "Tamamlandı";
  if (value === "cancelled") return "İptal";

  return value;
}

export default function ControlTowerPage() {
  const params = useParams();
  const tourId = String(params?.id ?? "");

  const [companyId, setCompanyId] =
    useState("");

  const [departures, setDepartures] =
    useState<Departure[]>([]);

  const [departureId, setDepartureId] =
    useState("");

  const [snapshot, setSnapshot] =
    useState<ControlSnapshot | null>(null);

  const [aiSnapshot, setAiSnapshot] =
    useState<AiSnapshot | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [generating, setGenerating] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const selectedDeparture =
    useMemo(
      () =>
        departures.find(
          (item) =>
            item.id === departureId
        ) ?? null,
      [departures, departureId]
    );

  const loadSnapshots =
    useCallback(
      async (
        activeCompanyId: string,
        activeDepartureId: string
      ) => {
        let controlQuery =
          supabase
            .from(
              "tour_control_tower_snapshots"
            )
            .select(
              [
                "id",
                "departure_id",
                "operation_status",
                "health_score",
                "open_task_count",
                "overdue_task_count",
                "open_incident_count",
                "critical_incident_count",
                "unacknowledged_price_alert_count",
                "new_group_request_count",
                "ai_risk_score",
                "ai_risk_level",
                "finance_status",
                "operational_net_result",
                "outstanding_receivable",
                "outstanding_payable",
                "findings",
                "generated_at",
              ].join(",")
            )
            .eq(
              "company_id",
              activeCompanyId
            )
            .eq(
              "tour_id",
              tourId
            );

        controlQuery =
          activeDepartureId
            ? controlQuery.eq(
                "departure_id",
                activeDepartureId
              )
            : controlQuery.is(
                "departure_id",
                null
              );

        const controlResult =
          await controlQuery
            .order(
              "generated_at",
              {
                ascending: false,
              }
            )
            .limit(1)
            .maybeSingle();

        if (controlResult.error) {
          throw controlResult.error;
        }

        let aiQuery =
          supabase
            .from(
              "tour_ai_control_tower_snapshots"
            )
            .select(
              [
                "id",
                "departure_id",
                "decision_risk_score",
                "decision_risk_level",
                "findings",
                "recommended_actions",
                "engine",
                "external_ai_used",
                "human_approval_required",
                "generated_at",
              ].join(",")
            )
            .eq(
              "company_id",
              activeCompanyId
            )
            .eq(
              "tour_id",
              tourId
            );

        aiQuery =
          activeDepartureId
            ? aiQuery.eq(
                "departure_id",
                activeDepartureId
              )
            : aiQuery.is(
                "departure_id",
                null
              );

        const aiResult =
          await aiQuery
            .order(
              "generated_at",
              {
                ascending: false,
              }
            )
            .limit(1)
            .maybeSingle();

        if (aiResult.error) {
          throw aiResult.error;
        }

        setSnapshot(
          (controlResult.data ??
            null) as unknown as
            ControlSnapshot | null
        );

        setAiSnapshot(
          (aiResult.data ??
            null) as unknown as
            AiSnapshot | null
        );
      },
      [tourId]
    );

  const load =
    useCallback(async () => {
      if (!tourId) return;

      setLoading(true);
      setError("");

      try {
        const {
          data: authData,
          error: authError,
        } =
          await supabase.auth.getUser();

        if (authError) {
          throw authError;
        }

        const user = authData.user;

        if (!user) {
          throw new Error(
            "Oturum bulunamadı."
          );
        }

        const membership =
          await getCurrentMembership(
            user.id
          );

        if (!membership?.company_id) {
          throw new Error(
            "Aktif şirket üyeliği bulunamadı."
          );
        }

        const activeCompanyId =
          membership.company_id;

        setCompanyId(
          activeCompanyId
        );

        const departureResult =
          await supabase
            .from("tour_departures")
            .select(
              "id,departure_date"
            )
            .eq(
              "company_id",
              activeCompanyId
            )
            .eq(
              "tour_id",
              tourId
            )
            .order(
              "departure_date",
              {
                ascending: true,
              }
            );

        if (departureResult.error) {
          throw departureResult.error;
        }

        setDepartures(
          (departureResult.data ??
            []) as unknown as
            Departure[]
        );

        await loadSnapshots(
          activeCompanyId,
          departureId
        );
      } catch (currentError) {
        setError(
          errorMessage(currentError)
        );
      } finally {
        setLoading(false);
      }
    }, [
      tourId,
      departureId,
      loadSnapshots,
    ]);

  useEffect(() => {
    void load();
  }, [load]);

  const generate =
    async () => {
      if (!tourId || !companyId) {
        return;
      }

      setGenerating(true);
      setError("");
      setSuccess("");

      try {
        const scope =
          departureId || null;

        const controlResult =
          await supabase.rpc(
            "generate_tour_control_tower_snapshot",
            {
              p_tour_id: tourId,
              p_departure_id:
                scope,
            }
          );

        if (controlResult.error) {
          throw controlResult.error;
        }

        const aiResult =
          await supabase.rpc(
            "generate_tour_ai_control_tower_snapshot",
            {
              p_tour_id: tourId,
              p_departure_id:
                scope,
            }
          );

        if (aiResult.error) {
          throw aiResult.error;
        }

        await loadSnapshots(
          companyId,
          departureId
        );

        setSuccess(
          "Control Tower güncellendi."
        );
      } catch (currentError) {
        setError(
          errorMessage(currentError)
        );
      } finally {
        setGenerating(false);
      }
    };

  const findings =
    rows(snapshot?.findings);

  const aiFindings =
    rows(aiSnapshot?.findings);

  const actions =
    rows(
      aiSnapshot
        ?.recommended_actions
    );

  const attentionCount =
    Number(snapshot?.overdue_task_count ?? 0) +
    Number(snapshot?.critical_incident_count ?? 0) +
    Number(snapshot?.unacknowledged_price_alert_count ?? 0);

  const needsAttention =
    attentionCount > 0 ||
    (snapshot?.health_score ?? 100) < 75 ||
    ["high", "critical"].includes(
      snapshot?.ai_risk_level ?? ""
    );

  return (
    <div className="mx-auto w-full max-w-[1540px] px-4 pb-24 pt-4 md:px-6">
      {/* COMMAND HEADER */}
      <section className="relative overflow-hidden rounded-[28px] border border-white/[.08] bg-[#090d13]/95 shadow-[0_35px_100px_rgba(0,0,0,.35)]">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="pointer-events-none absolute left-1/3 top-0 h-48 w-48 rounded-full bg-violet-500/[.06] blur-3xl" />

        <div className="relative flex flex-col gap-5 p-5 md:p-7">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <Link
                href={`/dashboard/turlar/${tourId}`}
                className="mb-5 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.12em] text-slate-500 transition hover:text-white"
              >
                <FaArrowLeft />
                Tur Operasyonuna Dön
              </Link>

              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-orange-400/20 bg-orange-500/10 text-orange-400 shadow-[0_0_35px_rgba(249,115,22,.10)]">
                  <FaBrain />
                </div>

                <div>
                  <div className="text-[10px] font-black uppercase tracking-[.24em] text-orange-400">
                    TUROBÜS · TUR-017
                  </div>

                  <h1 className="mt-1 text-2xl font-black tracking-[-.035em] text-white md:text-[34px]">
                    Operasyon Kontrol Kulesi
                  </h1>

                  <p className="mt-1 max-w-2xl text-sm font-medium text-slate-400">
                    Operasyon sağlığı, risk, finans ve müdahale gerektiren noktalar tek merkezde.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-[220px]">
                <div className="mb-1.5 text-[9px] font-black uppercase tracking-[.17em] text-slate-600">
                  Operasyon Kapsamı
                </div>

                <select
                  value={departureId}
                  onChange={(event) => {
                    setDepartureId(
                      event.target.value
                    );
                    setSuccess("");
                  }}
                  className="h-11 w-full rounded-xl border border-white/[.08] bg-white/[.04] px-4 text-xs font-bold text-white outline-none transition focus:border-orange-400/40"
                >
                  <option value="">
                    Tur Geneli
                  </option>

                  {departures.map(
                    (departure) => (
                      <option
                        key={departure.id}
                        value={departure.id}
                      >
                        {departure.departure_date}
                      </option>
                    )
                  )}
                </select>

                <div className="mt-1.5 text-[10px] font-semibold text-slate-600">
                  {selectedDeparture
                    ? `Seçili çıkış · ${selectedDeparture.departure_date}`
                    : "Tüm tur operasyonu"}
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  void generate()
                }
                disabled={
                  generating || loading
                }
                className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 text-xs font-black text-white shadow-[0_12px_35px_rgba(249,115,22,.20)] transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FaSyncAlt
                  className={
                    generating
                      ? "animate-spin"
                      : ""
                  }
                />

                {generating
                  ? "Analiz Ediliyor"
                  : "Kontrol Kulesini Yenile"}
              </button>
            </div>
          </div>

          {error ? (
            <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-xs font-bold text-red-300">
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-400/15 bg-emerald-400/[.07] px-4 py-3 text-xs font-bold text-emerald-300">
              <FaCheckCircle />
              {success}
            </div>
          ) : null}
        </div>
      </section>

      {loading ? (
        <div className="mt-4 rounded-[24px] border border-white/[.07] bg-[#0a0f16] p-12 text-center text-sm font-bold text-slate-500">
          Control Tower yükleniyor...
        </div>
      ) : !snapshot ? (
        <div className="mt-4 rounded-[24px] border border-dashed border-white/10 bg-[#0a0f16] p-12 text-center">
          <FaExclamationTriangle className="mx-auto text-2xl text-orange-400" />

          <div className="mt-4 text-base font-black text-white">
            Henüz operasyon snapshotı yok
          </div>

          <p className="mt-2 text-sm text-slate-500">
            Gerçek operasyon verisini analiz etmek için Control Tower’ı yenile.
          </p>
        </div>
      ) : (
        <>
          {/* EXECUTIVE TOP */}
          <section className="mt-4 grid gap-4 xl:grid-cols-[1.05fr_1.55fr_.9fr]">
            {/* HEALTH */}
            <article className="relative overflow-hidden rounded-[26px] border border-white/[.075] bg-[#0a0f16] p-6 shadow-[0_25px_70px_rgba(0,0,0,.24)]">
              <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-emerald-400/[.05] blur-3xl" />

              <div className="relative">
                <div className="text-[9px] font-black uppercase tracking-[.19em] text-slate-600">
                  Operasyon Sağlığı
                </div>

                <div className="mt-5 flex items-center gap-6">
                  <div className="relative h-[118px] w-[118px] shrink-0">
                    <svg
                      viewBox="0 0 120 120"
                      className="h-full w-full -rotate-90"
                    >
                      <circle
                        cx="60"
                        cy="60"
                        r="49"
                        fill="none"
                        stroke="rgba(255,255,255,.055)"
                        strokeWidth="8"
                      />

                      <circle
                        cx="60"
                        cy="60"
                        r="49"
                        fill="none"
                        stroke={
                          snapshot.health_score >= 75
                            ? "#34d399"
                            : snapshot.health_score >= 50
                              ? "#f59e0b"
                              : "#fb7185"
                        }
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${Math.max(
                          0,
                          Math.min(
                            100,
                            snapshot.health_score
                          )
                        ) * 3.078} 307.8`}
                      />
                    </svg>

                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div className="text-[32px] font-black tracking-[-.06em] text-white">
                        {snapshot.health_score}
                      </div>

                      <div className="text-[8px] font-black uppercase tracking-[.14em] text-slate-600">
                        / 100
                      </div>
                    </div>
                  </div>

                  <div>
                    <div
                      className={`inline-flex rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[.1em] ${
                        snapshot.health_score >= 75
                          ? "bg-emerald-400/10 text-emerald-300"
                          : snapshot.health_score >= 50
                            ? "bg-amber-400/10 text-amber-300"
                            : "bg-rose-400/10 text-rose-300"
                      }`}
                    >
                      {snapshot.health_score >= 75
                        ? "Operasyon Sağlıklı"
                        : snapshot.health_score >= 50
                          ? "Kontrol Gerekiyor"
                          : "Kritik Durum"}
                    </div>

                    <div className="mt-4 text-[11px] font-semibold leading-5 text-slate-500">
                      Görev, vaka, risk ve operasyon göstergelerinden hesaplanan genel sağlık seviyesi.
                    </div>
                  </div>
                </div>
              </div>
            </article>

            {/* CORE STATUS */}
            <article className="rounded-[26px] border border-white/[.075] bg-[#0a0f16] p-6 shadow-[0_25px_70px_rgba(0,0,0,.24)]">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[9px] font-black uppercase tracking-[.19em] text-slate-600">
                    Anlık Operasyon Özeti
                  </div>

                  <div className="mt-1 text-lg font-black text-white">
                    Ana göstergeler
                  </div>
                </div>

                <div className="rounded-full border border-white/[.07] bg-white/[.035] px-3 py-1.5 text-[9px] font-bold text-slate-500">
                  Canlı Snapshot
                </div>
              </div>

              <div className="mt-6 grid grid-cols-3 divide-x divide-white/[.06]">
                <div className="pr-5">
                  <div className="text-[9px] font-black uppercase tracking-[.12em] text-slate-600">
                    AI Risk
                  </div>

                  <div className="mt-2 text-2xl font-black tracking-tight text-white">
                    {snapshot.ai_risk_score}
                  </div>

                  <div className="mt-1 text-[10px] font-bold text-slate-500">
                    {riskLabel(
                      snapshot.ai_risk_level
                    )}
                  </div>
                </div>

                <div className="px-5">
                  <div className="text-[9px] font-black uppercase tracking-[.12em] text-slate-600">
                    Operasyon
                  </div>

                  <div className="mt-2 text-lg font-black text-white">
                    {operationStatusLabel(
                      snapshot.operation_status
                    )}
                  </div>

                  <div className="mt-2 h-1 w-12 rounded-full bg-orange-400" />
                </div>

                <div className="pl-5">
                  <div className="text-[9px] font-black uppercase tracking-[.12em] text-slate-600">
                    Finans
                  </div>

                  <div className="mt-2 text-base font-black text-white">
                    {financeStatusLabel(
                      snapshot.finance_status
                    )}
                  </div>

                  <div className="mt-1 text-[10px] font-semibold text-slate-600">
                    Net {money(
                      snapshot.operational_net_result
                    )}
                  </div>
                </div>
              </div>
            </article>

            {/* ATTENTION CENTER */}
            <article
              className={`rounded-[26px] border p-6 shadow-[0_25px_70px_rgba(0,0,0,.24)] ${
                needsAttention
                  ? "border-amber-400/20 bg-amber-400/[.045]"
                  : "border-emerald-400/15 bg-emerald-400/[.035]"
              }`}
            >
              <div className="text-[9px] font-black uppercase tracking-[.19em] text-slate-600">
                Müdahale Merkezi
              </div>

              <div className="mt-5">
                <div
                  className={`text-2xl font-black ${
                    needsAttention
                      ? "text-amber-300"
                      : "text-emerald-300"
                  }`}
                >
                  {needsAttention
                    ? "Kontrol Gerekiyor"
                    : "Müdahale Gerekmiyor"}
                </div>

                <div className="mt-2 text-[11px] font-semibold leading-5 text-slate-500">
                  {needsAttention
                    ? `${attentionCount} operasyon göstergesi dikkat gerektiriyor.`
                    : "Kritik veya gecikmiş operasyon sinyali bulunmuyor."}
                </div>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-black/20 p-3">
                  <div className="text-[8px] font-bold text-slate-600">
                    Geciken
                  </div>
                  <div className="mt-1 text-lg font-black text-white">
                    {snapshot.overdue_task_count}
                  </div>
                </div>

                <div className="rounded-xl bg-black/20 p-3">
                  <div className="text-[8px] font-bold text-slate-600">
                    Kritik
                  </div>
                  <div className="mt-1 text-lg font-black text-white">
                    {snapshot.critical_incident_count}
                  </div>
                </div>

                <div className="rounded-xl bg-black/20 p-3">
                  <div className="text-[8px] font-bold text-slate-600">
                    Alarm
                  </div>
                  <div className="mt-1 text-lg font-black text-white">
                    {snapshot.unacknowledged_price_alert_count}
                  </div>
                </div>
              </div>
            </article>
          </section>

          {/* OPERATION STRIP */}
          <section className="mt-4 rounded-[24px] border border-white/[.07] bg-[#0a0f16] px-5 py-4">
            <div className="grid grid-cols-2 gap-y-5 sm:grid-cols-3 lg:grid-cols-6">
              {[
                [
                  "Açık Görev",
                  snapshot.open_task_count,
                ],
                [
                  "Geciken Görev",
                  snapshot.overdue_task_count,
                ],
                [
                  "Açık Vaka",
                  snapshot.open_incident_count,
                ],
                [
                  "Kritik Vaka",
                  snapshot.critical_incident_count,
                ],
                [
                  "Fiyat Alarmı",
                  snapshot.unacknowledged_price_alert_count,
                ],
                [
                  "Grup Talebi",
                  snapshot.new_group_request_count,
                ],
              ].map(
                ([label, value], index) => (
                  <div
                    key={String(label)}
                    className={`px-4 ${
                      index > 0
                        ? "lg:border-l lg:border-white/[.055]"
                        : ""
                    }`}
                  >
                    <div className="text-[9px] font-bold uppercase tracking-[.09em] text-slate-600">
                      {label}
                    </div>

                    <div className="mt-1.5 text-2xl font-black tracking-tight text-white">
                      {value}
                    </div>
                  </div>
                )
              )}
            </div>
          </section>

          {/* FINANCE BAR */}
          <section className="mt-4 grid gap-3 md:grid-cols-3">
            {[
              [
                "Operasyonel Net",
                money(
                  snapshot.operational_net_result
                ),
                "Gerçekleşen operasyon sonucu",
              ],
              [
                "Tahsil Edilecek",
                money(
                  snapshot.outstanding_receivable
                ),
                "Bekleyen müşteri alacağı",
              ],
              [
                "Ödenecek",
                money(
                  snapshot.outstanding_payable
                ),
                "Bekleyen operasyon borcu",
              ],
            ].map(
              ([label, value, note]) => (
                <article
                  key={String(label)}
                  className="rounded-[22px] border border-white/[.07] bg-[#0a0f16] px-5 py-5"
                >
                  <div className="text-[9px] font-black uppercase tracking-[.14em] text-slate-600">
                    {label}
                  </div>

                  <div className="mt-2 text-2xl font-black tracking-[-.035em] text-white">
                    {value}
                  </div>

                  <div className="mt-1 text-[9px] font-semibold text-slate-600">
                    {note}
                  </div>
                </article>
              )
            )}
          </section>

          {/* DECISION LAYER */}
          <section className="mt-4 grid gap-4 xl:grid-cols-[1fr_1.15fr]">
            <article className="rounded-[26px] border border-white/[.07] bg-[#0a0f16] p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-[9px] font-black uppercase tracking-[.17em] text-orange-400">
                    Yönetim Bulguları
                  </div>

                  <h2 className="mt-1 text-xl font-black tracking-tight text-white">
                    Dikkat Gerektiren Alanlar
                  </h2>
                </div>

                <span className="rounded-full border border-white/[.07] bg-white/[.035] px-3 py-1 text-[9px] font-black text-slate-500">
                  {findings.length} BULGU
                </span>
              </div>

              <div className="mt-5">
                {findings.length ? (
                  <div className="space-y-2">
                    {findings.map(
                      (item, index) => (
                        <div
                          key={index}
                          className="rounded-xl border border-white/[.055] bg-white/[.025] px-4 py-3 text-[11px] font-semibold leading-5 text-slate-300"
                        >
                          {itemText(item)}
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-3 rounded-xl border border-emerald-400/10 bg-emerald-400/[.035] px-4 py-4">
                    <FaCheckCircle className="text-emerald-400" />

                    <div>
                      <div className="text-xs font-black text-emerald-300">
                        Operasyon temiz
                      </div>

                      <div className="mt-0.5 text-[10px] font-semibold text-slate-600">
                        Aktif yönetim bulgusu bulunmuyor.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </article>

            <article className="rounded-[26px] border border-violet-400/10 bg-[#0a0f16] p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-[9px] font-black uppercase tracking-[.17em] text-violet-400">
                    AI Control Tower
                  </div>

                  <h2 className="mt-1 text-xl font-black tracking-tight text-white">
                    Karar Destek Merkezi
                  </h2>
                </div>

                {aiSnapshot ? (
                  <div className="text-right">
                    <div className="text-[9px] font-bold uppercase tracking-[.1em] text-slate-600">
                      Karar Riski
                    </div>

                    <div className="mt-1 text-lg font-black text-white">
                      {riskLabel(
                        aiSnapshot.decision_risk_level
                      )}{" "}
                      <span className="text-slate-600">
                        ·
                      </span>{" "}
                      {aiSnapshot.decision_risk_score}
                    </div>
                  </div>
                ) : null}
              </div>

              {!aiSnapshot ? (
                <div className="mt-5 rounded-xl border border-white/[.055] bg-white/[.025] p-4 text-xs font-semibold text-slate-500">
                  AI Control Tower snapshotı henüz oluşturulmadı.
                </div>
              ) : (
                <>
                  <div className="mt-5 grid gap-2 sm:grid-cols-3">
                    <div className="rounded-xl bg-white/[.025] p-3">
                      <div className="text-[8px] font-bold uppercase tracking-[.1em] text-slate-600">
                        Motor
                      </div>
                      <div className="mt-1 text-[10px] font-black text-white">
                        {aiSnapshot.engine}
                      </div>
                    </div>

                    <div className="rounded-xl bg-white/[.025] p-3">
                      <div className="text-[8px] font-bold uppercase tracking-[.1em] text-slate-600">
                        İnsan Onayı
                      </div>
                      <div className="mt-1 text-[10px] font-black text-orange-300">
                        {aiSnapshot.human_approval_required
                          ? "Zorunlu"
                          : "Gerekli Değil"}
                      </div>
                    </div>

                    <div className="rounded-xl bg-white/[.025] p-3">
                      <div className="text-[8px] font-bold uppercase tracking-[.1em] text-slate-600">
                        Harici AI
                      </div>
                      <div className="mt-1 text-[10px] font-black text-white">
                        {aiSnapshot.external_ai_used
                          ? "Aktif"
                          : "Kapalı"}
                      </div>
                    </div>
                  </div>

                  {aiFindings.length ? (
                    <div className="mt-4 space-y-2">
                      {aiFindings.map(
                        (item, index) => (
                          <div
                            key={index}
                            className="rounded-xl border border-violet-400/10 bg-violet-400/[.025] px-4 py-3 text-[11px] font-semibold text-slate-300"
                          >
                            {itemText(item)}
                          </div>
                        )
                      )}
                    </div>
                  ) : null}

                  <div className="mt-5 border-t border-white/[.055] pt-4">
                    <div className="mb-3 text-[9px] font-black uppercase tracking-[.14em] text-slate-600">
                      Önerilen Aksiyonlar
                    </div>

                    {actions.length ? (
                      <div className="space-y-2">
                        {actions.map(
                          (item, index) => (
                            <div
                              key={index}
                              className="rounded-xl border border-orange-400/10 bg-orange-400/[.025] px-4 py-3 text-[11px] font-semibold text-slate-300"
                            >
                              {itemText(item)}
                            </div>
                          )
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 rounded-xl border border-emerald-400/10 bg-emerald-400/[.03] px-4 py-3">
                        <FaCheckCircle className="text-emerald-400" />
                        <span className="text-[11px] font-bold text-emerald-300">
                          Aktif AI aksiyon önerisi yok.
                        </span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </article>
          </section>

          <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-white/[.055] bg-black/20 px-4 py-3">
            <div className="text-[9px] font-semibold text-slate-600">
              Control Tower yalnız karar destek üretir.
            </div>

            <div className="text-[9px] font-black uppercase tracking-[.09em] text-orange-300/80">
              Ödeme · İade · Rezervasyon · Durum değişikliği otomatik uygulanmaz
            </div>
          </div>
        </>
      )}
    </div>
  );
}
