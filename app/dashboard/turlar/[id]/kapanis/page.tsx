"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";
import { useParams } from "next/navigation";

import {
  FaArrowLeft,
  FaCheckCircle,
  FaExclamationTriangle,
  FaLock,
  FaRedo,
  FaSyncAlt,
} from "react-icons/fa";

import { supabase } from "@/lib/supabase";
import { getCurrentMembership } from "@/lib/current-user";

type Departure = {
  id: string;
  departure_date: string;
  operation_stage: string | null;
};

type TourLifecycle = {
  operation_stage: string | null;
};

type CloseoutSnapshot = {
  id: string;
  closeout_status:
    | "blocked"
    | "ready"
    | "closed"
    | "reopened";

  operation_stage: string | null;

  ready_to_close: boolean;
  blocker_count: number;
  blockers: unknown;

  open_task_count: number;
  overdue_task_count: number;

  open_incident_count: number;
  critical_incident_count: number;

  open_change_case_count: number;
  open_refund_count: number;

  pending_automation_count: number;
  failed_automation_count: number;

  operational_net_result:
    | number
    | string;

  outstanding_receivable:
    | number
    | string;

  outstanding_payable:
    | number
    | string;

  generated_at: string;
};

type Blocker = {
  key?: unknown;
  label?: unknown;
  count?: unknown;
  amount?: unknown;
};

function getErrorMessage(
  value: unknown
) {
  if (value instanceof Error) {
    return value.message;
  }

  if (
    value &&
    typeof value === "object"
  ) {
    const item =
      value as {
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
      (
        part
      ): part is string =>
        typeof part === "string" &&
        part.trim().length > 0
    );

    if (parts.length) {
      return parts.join(" · ");
    }
  }

  return String(value);
}

function money(
  value:
    | number
    | string
    | null
    | undefined
) {
  const numeric =
    Number(value ?? 0);

  return new Intl.NumberFormat(
    "tr-TR",
    {
      style: "currency",
      currency: "TRY",
      maximumFractionDigits: 0,
    }
  ).format(
    Number.isFinite(numeric)
      ? numeric
      : 0
  );
}

function blockersFrom(
  value: unknown
): Blocker[] {
  return Array.isArray(value)
    ? value.filter(
        (
          item
        ): item is Blocker =>
          Boolean(item) &&
          typeof item === "object"
      )
    : [];
}

function stageLabel(
  value?: string | null
) {
  const labels:
    Record<string, string> = {
      draft: "Taslak",
      sales: "Satış",
      confirmed: "Onaylandı",
      preparing: "Hazırlanıyor",
      ready: "Hazır",
      on_the_way: "Yola Çıktı",
      in_progress: "Tur Devam Ediyor",
      returning: "Dönüşte",
      completed: "Tamamlandı",
      cancelled: "İptal",
    };

  return value
    ? labels[value] ?? value
    : "Belirsiz";
}

export default function TourCloseoutPage() {
  const params = useParams();

  const tourId =
    String(
      params?.id ?? ""
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
    useState<
      Departure[]
    >([]);

  const [
    tourLifecycle,
    setTourLifecycle,
  ] =
    useState<
      TourLifecycle | null
    >(null);

  const [
    departureId,
    setDepartureId,
  ] =
    useState("");

  const [
    snapshot,
    setSnapshot,
  ] =
    useState<
      CloseoutSnapshot | null
    >(null);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    working,
    setWorking,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    success,
    setSuccess,
  ] =
    useState("");

  const [
    reopenReason,
    setReopenReason,
  ] =
    useState("");

  const selectedDeparture =
    useMemo(
      () =>
        departures.find(
          (item) =>
            item.id ===
            departureId
        ) ?? null,
      [
        departures,
        departureId,
      ]
    );

  const blockers =
    useMemo(
      () =>
        blockersFrom(
          snapshot?.blockers
        ),
      [
        snapshot?.blockers,
      ]
    );

  const loadSnapshot =
    useCallback(
      async (
        activeCompanyId: string,
        activeDepartureId: string
      ) => {
        if (!activeDepartureId) {
          setSnapshot(null);
          return;
        }

        const result =
          await supabase
            .from(
              "tour_closeout_snapshots"
            )
            .select("*")
            .eq(
              "company_id",
              activeCompanyId
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
              "generated_at",
              {
                ascending: false,
              }
            )
            .limit(1)
            .maybeSingle();

        if (result.error) {
          throw result.error;
        }

        setSnapshot(
          (
            result.data ??
            null
          ) as unknown as
            CloseoutSnapshot | null
        );
      },
      [tourId]
    );

  const load =
    useCallback(
      async () => {
        setLoading(true);
        setError("");

        try {
          const {
            data,
            error:
              authError,
          } =
            await supabase.auth.getUser();

          if (authError) {
            throw authError;
          }

          if (!data.user) {
            throw new Error(
              "Oturum bulunamadı."
            );
          }

          const membership =
            await getCurrentMembership(
              data.user.id
            );

          if (
            !membership?.company_id
          ) {
            throw new Error(
              "Aktif şirket üyeliği bulunamadı."
            );
          }

          setCompanyId(
            membership.company_id
          );

          const tourResult =
            await supabase
              .from(
                "tours"
              )
              .select(
                "operation_stage"
              )
              .eq(
                "id",
                tourId
              )
              .maybeSingle();

          if (
            tourResult.error
          ) {
            throw tourResult.error;
          }

          setTourLifecycle(
            (
              tourResult.data ??
              null
            ) as unknown as
              TourLifecycle | null
          );

          const departureResult =
            await supabase
              .from(
                "tour_departures"
              )
              .select(
                "id,departure_date,operation_stage"
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

          if (
            departureResult.error
          ) {
            throw departureResult.error;
          }

          const list =
            (
              departureResult.data ??
              []
            ) as unknown as
              Departure[];

          setDepartures(
            list
          );

          const currentDeparture =
            departureId ||
            list[0]?.id ||
            "";

          if (
            !departureId &&
            currentDeparture
          ) {
            setDepartureId(
              currentDeparture
            );
          }

          await loadSnapshot(
            membership.company_id,
            currentDeparture
          );
        } catch (
          currentError
        ) {
          setError(
            getErrorMessage(
              currentError
            )
          );
        } finally {
          setLoading(false);
        }
      },
      [
        tourId,
        departureId,
        loadSnapshot,
      ]
    );

  useEffect(() => {
    void load();
  }, [load]);

  async function refreshCloseout() {
    if (
      !departureId ||
      !companyId
    ) {
      return;
    }

    setWorking(true);
    setError("");
    setSuccess("");

    try {
      const result =
        await supabase.rpc(
          "generate_tour_closeout_snapshot",
          {
            p_tour_id:
              tourId,
            p_departure_id:
              departureId,
          }
        );

      if (result.error) {
        throw result.error;
      }

      await loadSnapshot(
        companyId,
        departureId
      );

      setSuccess(
        "Kapanış kontrolü güncellendi."
      );
    } catch (
      currentError
    ) {
      setError(
        getErrorMessage(
          currentError
        )
      );
    } finally {
      setWorking(false);
    }
  }

  async function closeTour() {
    if (
      !departureId ||
      !snapshot?.ready_to_close
    ) {
      return;
    }

    if (
      !window.confirm(
        "Bu tur çıkışını insan onayı ile kapatmak istediğinize emin misiniz?"
      )
    ) {
      return;
    }

    setWorking(true);
    setError("");
    setSuccess("");

    try {
      const result =
        await supabase.rpc(
          "close_tour_departure_with_human_approval",
          {
            p_tour_id:
              tourId,
            p_departure_id:
              departureId,
            p_reason:
              null,
          }
        );

      if (result.error) {
        throw result.error;
      }

      await loadSnapshot(
        companyId,
        departureId
      );

      setSuccess(
        "Tur çıkışının idari kapanışı tamamlandı."
      );
    } catch (
      currentError
    ) {
      setError(
        getErrorMessage(
          currentError
        )
      );
    } finally {
      setWorking(false);
    }
  }

  async function reopenTour() {
    if (
      reopenReason.trim().length <
      5
    ) {
      setError(
        "Yeniden açma gerekçesi en az 5 karakter olmalıdır."
      );
      return;
    }

    setWorking(true);
    setError("");
    setSuccess("");

    try {
      const result =
        await supabase.rpc(
          "reopen_tour_departure_closeout",
          {
            p_tour_id:
              tourId,
            p_departure_id:
              departureId,
            p_reason:
              reopenReason.trim(),
          }
        );

      if (result.error) {
        throw result.error;
      }

      setReopenReason("");

      await loadSnapshot(
        companyId,
        departureId
      );

      setSuccess(
        "İdari kapanış yeniden açıldı."
      );
    } catch (
      currentError
    ) {
      setError(
        getErrorMessage(
          currentError
        )
      );
    } finally {
      setWorking(false);
    }
  }

  const closed =
    snapshot?.closeout_status ===
    "closed";

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 pb-24 pt-5 md:px-6">
      <section className="rounded-[28px] border border-white/[.08] bg-[#090d13] p-6 md:p-7">
        <Link
          href={`/dashboard/turlar/${tourId}`}
          className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[.12em] text-slate-500 hover:text-white"
        >
          <FaArrowLeft />
          Tur Operasyonuna Dön
        </Link>

        <div className="mt-5 text-[9px] font-black uppercase tracking-[.22em] text-orange-400">
          TUROBÜS · TUR-018
        </div>

        <div className="mt-1 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white">
              Tur Kapanış Merkezi
            </h1>

            <p className="mt-2 max-w-2xl text-sm font-medium text-slate-400">
              Operasyon, vaka, iade, otomasyon ve finans kontrolleri tamamlanmadan tur çıkışı kapatılamaz.
            </p>
          </div>

          <select
            value={
              departureId
            }
            onChange={(event) => {
              setDepartureId(
                event.target.value
              );
              setSuccess("");
              setError("");
            }}
            className="h-11 min-w-[260px] rounded-xl border border-white/[.08] bg-white/[.04] px-3 text-sm font-bold text-white"
          >
            {departures.map(
              (departure) => (
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
        </div>

        {selectedDeparture ? (
          <div className="mt-3 text-xs font-bold text-slate-500">
            Operasyon aşaması:{" "}
            <span className="text-white">
              {stageLabel(
                selectedDeparture.operation_stage ??
                  tourLifecycle?.operation_stage ??
                  "draft"
              )}
            </span>
          </div>
        ) : null}

        {error ? (
          <div className="mt-5 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-xs font-bold text-red-300">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="mt-5 flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-xs font-bold text-emerald-300">
            <FaCheckCircle />
            {success}
          </div>
        ) : null}
      </section>

      {loading ? (
        <div className="mt-4 rounded-[26px] border border-white/[.07] bg-[#0a0f16] p-10 text-center text-slate-500">
          Kapanış verileri yükleniyor...
        </div>
      ) : (
        <section className="mt-4 grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
          <article className="rounded-[26px] border border-white/[.07] bg-[#0a0f16] p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-[9px] font-black uppercase tracking-[.15em] text-slate-600">
                  Kapanış Durumu
                </div>

                <div className="mt-2 text-2xl font-black text-white">
                  {!snapshot
                    ? "Henüz Kontrol Edilmedi"
                    : closed
                      ? "Tur Kapalı"
                      : snapshot.ready_to_close
                        ? "Kapanmaya Hazır"
                        : "Kapanış Engelli"}
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  void refreshCloseout()
                }
                disabled={
                  working ||
                  !departureId ||
                  closed
                }
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-orange-500 px-5 text-xs font-black text-white disabled:opacity-40"
              >
                <FaSyncAlt
                  className={
                    working
                      ? "animate-spin"
                      : ""
                  }
                />

                Kontrolü Yenile
              </button>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                [
                  "Açık Görev",
                  snapshot?.open_task_count ??
                    0,
                ],
                [
                  "Geciken Görev",
                  snapshot?.overdue_task_count ??
                    0,
                ],
                [
                  "Açık Vaka",
                  snapshot?.open_incident_count ??
                    0,
                ],
                [
                  "Kritik Vaka",
                  snapshot?.critical_incident_count ??
                    0,
                ],
                [
                  "Değişiklik",
                  snapshot?.open_change_case_count ??
                    0,
                ],
                [
                  "Açık İade",
                  snapshot?.open_refund_count ??
                    0,
                ],
                [
                  "Bekleyen Otomasyon",
                  snapshot?.pending_automation_count ??
                    0,
                ],
                [
                  "Hatalı Otomasyon",
                  snapshot?.failed_automation_count ??
                    0,
                ],
              ].map(
                ([label, value]) => (
                  <div
                    key={String(
                      label
                    )}
                    className="rounded-xl border border-white/[.055] bg-white/[.025] p-4"
                  >
                    <div className="text-[8px] font-black uppercase tracking-[.10em] text-slate-600">
                      {label}
                    </div>

                    <div className="mt-2 text-2xl font-black text-white">
                      {value}
                    </div>
                  </div>
                )
              )}
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {[
                [
                  "Operasyonel Net",
                  money(
                    snapshot?.operational_net_result
                  ),
                ],
                [
                  "Tahsil Edilecek",
                  money(
                    snapshot?.outstanding_receivable
                  ),
                ],
                [
                  "Ödenecek",
                  money(
                    snapshot?.outstanding_payable
                  ),
                ],
              ].map(
                ([label, value]) => (
                  <div
                    key={String(
                      label
                    )}
                    className="rounded-xl border border-white/[.055] bg-white/[.02] p-4"
                  >
                    <div className="text-[8px] font-black uppercase text-slate-600">
                      {label}
                    </div>

                    <div className="mt-2 text-xl font-black text-white">
                      {value}
                    </div>
                  </div>
                )
              )}
            </div>
          </article>

          <article className="rounded-[26px] border border-white/[.07] bg-[#0a0f16] p-6">
            <div className="text-[9px] font-black uppercase tracking-[.15em] text-orange-400">
              Yönetim Kararı
            </div>

            {!snapshot ? (
              <div className="mt-5 rounded-xl border border-white/[.06] bg-white/[.025] p-4 text-xs font-semibold text-slate-500">
                Önce kapanış kontrolünü çalıştır.
              </div>
            ) : closed ? (
              <>
                <div className="mt-5 flex items-center gap-3 text-emerald-300">
                  <FaLock />
                  <div className="text-xl font-black">
                    İdari Olarak Kapalı
                  </div>
                </div>

                <textarea
                  value={
                    reopenReason
                  }
                  onChange={(event) =>
                    setReopenReason(
                      event.target.value
                    )
                  }
                  placeholder="Yeniden açma gerekçesi"
                  className="mt-5 min-h-24 w-full rounded-xl border border-white/[.08] bg-white/[.035] p-3 text-sm text-white"
                />

                <button
                  type="button"
                  onClick={() =>
                    void reopenTour()
                  }
                  disabled={
                    working
                  }
                  className="mt-3 inline-flex h-10 items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 text-xs font-black text-amber-300 disabled:opacity-40"
                >
                  <FaRedo />
                  Yeniden Aç
                </button>
              </>
            ) : snapshot.ready_to_close ? (
              <>
                <div className="mt-5 flex items-center gap-3 text-emerald-300">
                  <FaCheckCircle />
                  <div className="text-xl font-black">
                    Kapanmaya Hazır
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    void closeTour()
                  }
                  disabled={
                    working
                  }
                  className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 text-sm font-black text-white disabled:opacity-40"
                >
                  <FaLock />
                  İnsan Onayı ile Turu Kapat
                </button>
              </>
            ) : (
              <>
                <div className="mt-5 flex items-center gap-3 text-amber-300">
                  <FaExclamationTriangle />
                  <div className="text-xl font-black">
                    Kapanış Engelli
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {blockers.map(
                    (
                      blocker,
                      index
                    ) => (
                      <div
                        key={index}
                        className="rounded-xl border border-amber-400/10 bg-amber-400/[.04] px-4 py-3"
                      >
                        <div className="text-xs font-black text-amber-200">
                          {String(
                            blocker.label ??
                              blocker.key ??
                              "Kapanış engeli"
                          )}
                        </div>

                        {blocker.count !==
                        undefined ? (
                          <div className="mt-1 text-[10px] text-slate-500">
                            Adet:{" "}
                            {String(
                              blocker.count
                            )}
                          </div>
                        ) : null}

                        {blocker.amount !==
                        undefined ? (
                          <div className="mt-1 text-[10px] text-slate-500">
                            Tutar:{" "}
                            {money(
                              String(
                                blocker.amount
                              )
                            )}
                          </div>
                        ) : null}
                      </div>
                    )
                  )}
                </div>
              </>
            )}
          </article>
        </section>
      )}
    </div>
  );
}
