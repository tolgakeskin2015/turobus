"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaArrowLeft,
  FaCheckCircle,
  FaExclamationTriangle,
  FaMoneyBillWave,
  FaPlay,
  FaPlus,
  FaTimesCircle,
} from "react-icons/fa";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getCurrentMembership } from "@/lib/current-user";

type ChangeCase = {
  id: string;
  company_id: string;
  tour_id: string;
  reservation_id: string | null;
  case_number: string;
  case_type: string;
  status: string;
  currency: string;
  requested_refund_amount: number;
  approved_refund_amount: number;
  supplier_cancellation_cost: number;
  customer_penalty_amount: number;
};

type Refund = {
  id: string;
  refund_type: "full" | "partial";
  method: "manual" | "provider";
  provider: string | null;
  amount: number;
  currency: string;
  status: string;
  reason: string | null;
  provider_reference: string | null;
  idempotency_key: string;
  created_at: string;
  completed_at: string | null;
  provider_error?: string | null;
};

function money(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function dateLabel(value: string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function TourRefundFinancePage() {
  const params = useParams<{ id: string; caseId: string }>();
  const tourId = String(params.id);
  const caseId = String(params.caseId);

  const [companyId, setCompanyId] = useState("");
  const [changeCase, setChangeCase] = useState<ChangeCase | null>(null);
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [approvedAmount, setApprovedAmount] = useState("0");
  const [refundAmount, setRefundAmount] = useState("0");
  const [refundMethod, setRefundMethod] = useState<"manual" | "provider">("manual");
  const [provider, setProvider] = useState("iyzico");
  const [reason, setReason] = useState("");
  const [manualReference, setManualReference] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(
    async (currentCompanyId: string) => {
      const [caseResult, refundResult] = await Promise.all([
        supabase
          .from("tour_change_cases")
          .select(
            "id,company_id,tour_id,reservation_id,case_number,case_type,status,currency,requested_refund_amount,approved_refund_amount,supplier_cancellation_cost,customer_penalty_amount"
          )
          .eq("company_id", currentCompanyId)
          .eq("tour_id", tourId)
          .eq("id", caseId)
          .maybeSingle(),
        supabase
          .from("tour_change_refunds")
          .select(
            "id,refund_type,method,provider,amount,currency,status,reason,provider_reference,idempotency_key,created_at,completed_at,provider_error"
          )
          .eq("company_id", currentCompanyId)
          .eq("case_id", caseId)
          .order("created_at", { ascending: false }),
      ]);

      if (caseResult.error) throw caseResult.error;
      if (refundResult.error) throw refundResult.error;
      if (!caseResult.data) throw new Error("Vaka bulunamadı.");

      const loadedCase = caseResult.data as unknown as ChangeCase;
      setChangeCase(loadedCase);
      setApprovedAmount(String(loadedCase.approved_refund_amount ?? 0));
      setRefunds((refundResult.data ?? []) as unknown as Refund[]);
    },
    [caseId, tourId]
  );

  useEffect(() => {
    void (async () => {
      try {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError || !authData.user) throw new Error("Oturum bulunamadı.");

        const membership = await getCurrentMembership(authData.user.id);
        if (!membership) throw new Error("Firma üyeliği bulunamadı.");

        setCompanyId(membership.company_id);
        await load(membership.company_id);
      } catch (currentError) {
        setError(currentError instanceof Error ? currentError.message : String(currentError));
      } finally {
        setLoading(false);
      }
    })();
  }, [load]);

  const paidTotal = useMemo(
    () =>
      refunds
        .filter((item) => item.status === "paid")
        .reduce((total, item) => total + Number(item.amount || 0), 0),
    [refunds]
  );

  const openTotal = useMemo(
    () =>
      refunds
        .filter((item) => ["draft", "approved", "processing"].includes(item.status))
        .reduce((total, item) => total + Number(item.amount || 0), 0),
    [refunds]
  );

  const remaining = Math.max(
    Number(changeCase?.approved_refund_amount || 0) - paidTotal - openTotal,
    0
  );

  async function rpc(fn: string, args: Record<string, unknown>, success: string) {
    if (!companyId) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const { error: rpcError } = await supabase.rpc(fn, args);
      if (rpcError) throw rpcError;
      await load(companyId);
      setNotice(success);
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : String(currentError));
    } finally {
      setBusy(false);
    }
  }

  async function approveRefundLimit() {
    await rpc(
      "approve_tour_change_case_refund",
      {
        p_case_id: caseId,
        p_approved_amount: Math.max(Number(approvedAmount) || 0, 0),
        p_note: "Finans onay tutarı güncellendi.",
      },
      "İade onay tutarı kaydedildi."
    );
  }

  async function createRefund() {
    const amount = Number(refundAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Geçerli iade tutarı girin.");
      return;
    }

    await rpc(
      "create_tour_change_refund",
      {
        p_case_id: caseId,
        p_amount: amount,
        p_method: refundMethod,
        p_provider: refundMethod === "provider" ? provider : null,
        p_reason: reason.trim() || null,
        p_idempotency_key: `tour-refund-${caseId}-${Date.now()}`,
      },
      "İade finans defterine oluşturuldu."
    );

    setRefundAmount("0");
    setReason("");
  }

  async function completeManual(refundId: string) {
    if (!window.confirm("Manuel iadenin müşteriye gerçekten ödendiğini onaylıyor musunuz?")) {
      return;
    }

    await rpc(
      "complete_manual_tour_change_refund",
      {
        p_refund_id: refundId,
        p_reference: manualReference.trim() || null,
        p_note: "Manuel ödeme finans tarafından tamamlandı.",
      },
      "Manuel iade ödendi olarak kaydedildi."
    );
  }

  async function executeProviderRefund(refundId: string) {
    if (
      !window.confirm(
        "Bu işlem iyzico üzerinden GERÇEK kart/ödeme iadesi yapacaktır. Devam etmek istiyor musunuz?"
      )
    ) {
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !sessionData.session?.access_token) {
        throw new Error("Oturum doğrulanamadı.");
      }

      const response = await fetch("/api/tour-payments/iyzico/refund", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({ refundId }),
      });

      const result = (await response.json()) as {
        success?: boolean;
        error?: string;
        providerRefundSucceeded?: boolean;
      };

      if (!response.ok) {
        if (result.providerRefundSucceeded) {
          throw new Error(
            result.error ||
              "Provider iadesi gerçekleşti ancak finans defteri kapanamadı. Tekrar çalıştırmayın."
          );
        }

        throw new Error(result.error || "İyzico iadesi gerçekleştirilemedi.");
      }

      await load(companyId);
      setNotice("İyzico üzerinden gerçek iade başarıyla tamamlandı.");
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : String(currentError));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <main className="grid min-h-[70vh] place-items-center bg-[#030a11] text-white">
        İade finans merkezi yükleniyor...
      </main>
    );
  }

  return (
    <main
      data-tour-os-screen="refund-finance"
      data-provider-refund="real-iyzico"
      className="min-h-screen bg-[#030a11] text-white"
    >
      <div className="mx-auto max-w-[1600px] px-5 py-7 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={`/dashboard/turlar/${tourId}/degisiklikler/${caseId}`}
            className="inline-flex items-center gap-2 text-[9px] font-black text-slate-500 hover:text-orange-300"
          >
            <FaArrowLeft />
            Vaka Detayı
          </Link>

          <Link
            href={`/dashboard/turlar/${tourId}/degisiklikler/${caseId}/iade/kapanis`}
            className="inline-flex items-center gap-2 rounded-xl border border-orange-500/20 bg-orange-500/[.05] px-4 py-2 text-[8px] font-black text-orange-300"
          >
            Kapanış & Mutabakat
          </Link>

          <div className="rounded-full border border-emerald-500/20 bg-emerald-500/[.05] px-3 py-1.5 text-[8px] font-black text-emerald-300">
            GERÇEK IYZICO REFUND ADAPTER
          </div>
        </div>

        <section className="mt-4 rounded-[30px] border border-emerald-500/15 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,.12),transparent_34%),linear-gradient(145deg,#07131f,#03080e)] p-6 lg:p-8">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="text-[8px] font-black uppercase tracking-[.16em] text-emerald-300">
                İADE & FİNANS
              </div>
              <h1 className="mt-2 text-3xl font-black tracking-[-.04em]">
                {changeCase?.case_number || "Vaka"}
              </h1>
              <p className="mt-2 text-[9px] text-slate-400">
                Onaylı iade limiti, tam/kısmi iade defteri ve güvenli provider işlemleri.
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[.03] px-4 py-3 text-right">
              <div className="text-[7px] font-black uppercase text-slate-500">
                Kalan Onaylı İade
              </div>
              <div className="mt-1 text-xl font-black text-emerald-300">
                {money(remaining)}
              </div>
            </div>
          </div>
        </section>

        {error && (
          <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/[.05] px-4 py-3 text-[9px] font-bold text-red-300">
            <FaTimesCircle className="mr-2 inline" />
            {error}
          </div>
        )}

        {notice && (
          <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/[.05] px-4 py-3 text-[9px] font-bold text-emerald-300">
            <FaCheckCircle className="mr-2 inline" />
            {notice}
          </div>
        )}

        <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Talep Edilen", money(changeCase?.requested_refund_amount || 0)],
            ["Finans Onayı", money(changeCase?.approved_refund_amount || 0)],
            ["Ödenen İade", money(paidTotal)],
            ["Açık İade", money(openTotal)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-[20px] border border-white/10 bg-white/[.025] p-4">
              <div className="text-[7px] font-black uppercase tracking-[.12em] text-slate-500">
                {label}
              </div>
              <div className="mt-3 text-xl font-black">{value}</div>
            </div>
          ))}
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-2">
          <div className="rounded-[24px] border border-white/10 bg-[#07131f]/80 p-5">
            <div className="flex items-center gap-2 text-sm font-black">
              <FaMoneyBillWave className="text-emerald-300" />
              Finans Onayı
            </div>

            <label className="mt-4 grid gap-1.5">
              <span className="text-[8px] font-black text-slate-400">
                Onaylanan Maksimum İade
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={approvedAmount}
                onChange={(event) => setApprovedAmount(event.target.value)}
                className="min-h-11 rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px] font-bold outline-none"
              />
            </label>

            <button
              type="button"
              disabled={busy}
              onClick={() => void approveRefundLimit()}
              className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-500 px-4 text-[8px] font-black text-white disabled:opacity-50"
            >
              <FaCheckCircle />
              Finans İadesini Onayla
            </button>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-[#07131f]/80 p-5">
            <div className="flex items-center gap-2 text-sm font-black">
              <FaPlus className="text-orange-300" />
              Yeni İade Hareketi
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5">
                <span className="text-[8px] font-black text-slate-400">Tutar</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={refundAmount}
                  onChange={(event) => setRefundAmount(event.target.value)}
                  className="min-h-11 rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px] font-bold outline-none"
                />
              </label>

              <label className="grid gap-1.5">
                <span className="text-[8px] font-black text-slate-400">İade Yöntemi</span>
                <select
                  value={refundMethod}
                  onChange={(event) =>
                    setRefundMethod(event.target.value as "manual" | "provider")
                  }
                  className="min-h-11 rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px] font-bold outline-none"
                >
                  <option value="manual">Manuel</option>
                  <option value="provider">Ödeme Sağlayıcısı</option>
                </select>
              </label>
            </div>

            {refundMethod === "provider" && (
              <label className="mt-3 grid gap-1.5">
                <span className="text-[8px] font-black text-slate-400">Provider</span>
                <select
                  value={provider}
                  onChange={(event) => setProvider(event.target.value)}
                  className="min-h-11 rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px] font-bold outline-none"
                >
                  <option value="iyzico">iyzico</option>
                </select>
              </label>
            )}

            <label className="mt-3 grid gap-1.5">
              <span className="text-[8px] font-black text-slate-400">Açıklama</span>
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={2}
                className="rounded-xl border border-white/10 bg-[#030a11] px-3 py-3 text-[9px] outline-none"
              />
            </label>

            <button
              type="button"
              disabled={busy || remaining <= 0}
              onClick={() => void createRefund()}
              className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-orange-500 px-4 text-[8px] font-black text-white disabled:opacity-40"
            >
              <FaPlus />
              İade Hareketini Oluştur
            </button>
          </div>
        </section>

        <section className="mt-5 rounded-[24px] border border-white/10 bg-white/[.02] p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-black">İade Finans Defteri</div>
              <div className="mt-1 text-[8px] text-slate-500">
                Tüm tam/kısmi iadeler vaka ve idempotency anahtarı ile tutulur.
              </div>
            </div>

            <input
              value={manualReference}
              onChange={(event) => setManualReference(event.target.value)}
              placeholder="Manuel ödeme referansı"
              className="min-h-10 rounded-xl border border-white/10 bg-[#030a11] px-3 text-[8px] outline-none"
            />
          </div>

          <div className="mt-4 overflow-x-auto rounded-xl border border-white/[.07]">
            <table className="min-w-[1150px] text-left">
              <thead className="bg-[#07131f]">
                <tr className="text-[7px] font-black uppercase text-slate-500">
                  <th className="px-4 py-3">İade</th>
                  <th className="px-4 py-3">Tip</th>
                  <th className="px-4 py-3">Yöntem</th>
                  <th className="px-4 py-3 text-right">Tutar</th>
                  <th className="px-4 py-3">Durum</th>
                  <th className="px-4 py-3">Referans</th>
                  <th className="px-4 py-3">Tarih</th>
                  <th className="px-4 py-3 text-right">İşlem</th>
                </tr>
              </thead>

              <tbody>
                {refunds.map((refund) => (
                  <tr key={refund.id} className="border-t border-white/[.055] text-[8px] font-bold">
                    <td className="px-4 py-4 font-black">{refund.id.slice(0, 8)}</td>
                    <td className="px-4 py-4">{refund.refund_type === "full" ? "Tam" : "Kısmi"}</td>
                    <td className="px-4 py-4">
                      {refund.method === "manual" ? "Manuel" : refund.provider || "Provider"}
                    </td>
                    <td className="px-4 py-4 text-right font-black">{money(refund.amount)}</td>
                    <td className="px-4 py-4">
                      <span className="rounded-full border border-white/10 bg-white/[.03] px-2 py-1 text-[7px]">
                        {refund.status}
                      </span>
                      {refund.provider_error && (
                        <div className="mt-1 max-w-[220px] text-[7px] text-red-300">
                          {refund.provider_error}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 text-slate-500">{refund.provider_reference || "—"}</td>
                    <td className="px-4 py-4 text-slate-500">
                      {dateLabel(refund.completed_at || refund.created_at)}
                    </td>
                    <td className="px-4 py-4 text-right">
                      {refund.method === "manual" && refund.status === "approved" && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void completeManual(refund.id)}
                          className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-[7px] font-black text-white disabled:opacity-50"
                        >
                          <FaCheckCircle />
                          Ödendi
                        </button>
                      )}

                      {refund.method === "provider" && refund.status === "approved" && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void executeProviderRefund(refund.id)}
                          className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-3 py-2 text-[7px] font-black text-white disabled:opacity-50"
                        >
                          <FaPlay />
                          iyzico İadesini Uygula
                        </button>
                      )}
                    </td>
                  </tr>
                ))}

                {refunds.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-[8px] text-slate-600">
                      Henüz iade finans hareketi yok.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-5 rounded-[20px] border border-amber-500/15 bg-amber-500/[.035] p-4">
          <div className="flex gap-3">
            <FaExclamationTriangle className="mt-0.5 shrink-0 text-amber-300" />
            <div className="text-[8px] font-bold leading-5 text-amber-100/75">
              “iyzico İadesini Uygula” gerçek banka/kart iadesi yapar. Sistem önce orijinal ödeme ve checkout tokenını doğrular, iyzico’dan paymentTransactionId bilgisini yeniden alır, tutar ve para birimini kontrol eder; ancak bundan sonra provider refund çağrısını yapar. Processing durumundaki bir iade otomatik tekrar çalıştırılmaz.
            </div>
          </div>
        </section>
      </div>

      {/* TOUR_OS_15_1D_B_REAL_PROVIDER_REFUND */}
    </main>
  );
}

// TOUR_OS_15_1E_CLOSURE_LINK
