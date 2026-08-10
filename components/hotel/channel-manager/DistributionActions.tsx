"use client";

import { useState } from "react";
import {
  FaArrowsRotate,
  FaLink,
  FaRotate,
} from "react-icons/fa6";

import { supabase } from "@/lib/supabase";

export default function DistributionActions({
  companyId,
  mappingRequired,
  inboundFailed,
  onCompleted,
}: {
  companyId: string;
  mappingRequired: number;
  inboundFailed: number;
  onCompleted: () => Promise<void>;
}) {
  const [processing, setProcessing] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function run(
    action: "resolve_mappings" | "retry_inbound" | "full_sync"
  ) {
    try {
      setProcessing(action);
      setMessage("");
      setErrorMessage("");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const token = session?.access_token;

      if (!token) {
        throw new Error("Oturum bulunamadı.");
      }

      const response = await fetch(
        "/api/channel-manager/distribution-actions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            companyId,
            action,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(
          result.error ?? "İşlem başarısız."
        );
      }

      if (action === "resolve_mappings") {
        setMessage(
          `${result.resolved ?? 0} mapping kaydı çözüldü.`
        );
      }

      if (action === "retry_inbound") {
        setMessage(
          `${result.reset ?? 0} inbound kayıt tekrar kuyruğa alındı.`
        );
      }

      if (action === "full_sync") {
        setMessage(
          `${result.queued ?? 0} aktif kanal için Full Sync kuyruğa alındı.`
        );
      }

      await onCompleted();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "İşlem başarısız."
      );
    } finally {
      setProcessing("");
    }
  }

  return (
    <section className="mt-6 rounded-[30px] border border-slate-800 bg-slate-950/80 p-6">
      <div className="mb-5">
        <div className="text-xs font-black uppercase tracking-[0.2em] text-orange-400">
          OPERASYON KONTROLÜ
        </div>

        <h2 className="mt-2 text-2xl font-black text-white">
          Distribution Actions
        </h2>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <button
          type="button"
          onClick={() => void run("resolve_mappings")}
          disabled={processing !== ""}
          className="rounded-[24px] border border-slate-800 bg-slate-900 p-5 text-left transition hover:border-orange-500/40 disabled:opacity-60"
        >
          <div className="text-xl text-orange-400">
            {processing === "resolve_mappings" ? (
              <FaArrowsRotate className="animate-spin" />
            ) : (
              <FaLink />
            )}
          </div>

          <div className="mt-4 text-lg font-black text-white">
            Mapping Çöz
          </div>

          <div className="mt-2 text-xs text-slate-500">
            {mappingRequired} kayıt bekliyor
          </div>
        </button>

        <button
          type="button"
          onClick={() => void run("retry_inbound")}
          disabled={processing !== ""}
          className="rounded-[24px] border border-slate-800 bg-slate-900 p-5 text-left transition hover:border-orange-500/40 disabled:opacity-60"
        >
          <div className="text-xl text-orange-400">
            {processing === "retry_inbound" ? (
              <FaArrowsRotate className="animate-spin" />
            ) : (
              <FaRotate />
            )}
          </div>

          <div className="mt-4 text-lg font-black text-white">
            Inbound Retry
          </div>

          <div className="mt-2 text-xs text-slate-500">
            {inboundFailed} hatalı kayıt
          </div>
        </button>

    <button
      type="button"
      onClick={() => void run("full_sync")}
      disabled={processing !== ""}
      className="rounded-[24px] border border-slate-800 bg-slate-900 p-5 text-left transition hover:border-orange-500/40 disabled:opacity-60"
    >
      <div className="text-xl text-orange-400">
        {processing === "full_sync" ? (
          <FaArrowsRotate className="animate-spin" />
        ) : (
          <FaRotate />
        )}
      </div>

      <div className="mt-4 text-lg font-black text-white">
        Full Sync
      </div>

      <div className="mt-2 text-xs text-slate-500">
        Tüm aktif OTA kanallarını senkronize et
      </div>
    </button>
      </div>

      {message && (
        <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-300">
          {message}
        </div>
      )}

      {errorMessage && (
        <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-bold text-red-300">
          {errorMessage}
        </div>
      )}
    </section>
  );
}
