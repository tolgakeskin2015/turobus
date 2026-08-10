"use client";

import { useState } from "react";
import {
  FaArrowsRotate,
  FaPause,
  FaPlay,
  FaWifi,
} from "react-icons/fa6";

import { supabase } from "@/lib/supabase";

export default function ChannelConnectionActions({
  companyId,
  connectionId,
  status,
  onCompleted,
}: {
  companyId: string;
  connectionId: string;
  status: string;
  onCompleted: () => Promise<void>;
}) {
  const [processing, setProcessing] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function run(
    action:
      | "pause_connection"
      | "activate_connection"
      | "connection_test"
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
            connectionId,
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

      if (action === "pause_connection") {
        setMessage("Kanal duraklatıldı.");
      }

      if (action === "activate_connection") {
        setMessage("Kanal aktifleştirildi.");
      }

      if (action === "connection_test") {
        setMessage("Bağlantı testi kuyruğa alındı.");
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
    <div className="mt-4">
      <div className="flex flex-wrap gap-2">
        {status === "active" ? (
          <button
            type="button"
            onClick={() => void run("pause_connection")}
            disabled={processing !== ""}
            className="inline-flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs font-black text-amber-300"
          >
            {processing === "pause_connection" ? (
              <FaArrowsRotate className="animate-spin" />
            ) : (
              <FaPause />
            )}
            Duraklat
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void run("activate_connection")}
            disabled={processing !== ""}
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-black text-emerald-300"
          >
            {processing === "activate_connection" ? (
              <FaArrowsRotate className="animate-spin" />
            ) : (
              <FaPlay />
            )}
            Aktifleştir
          </button>
        )}

        <button
          type="button"
          onClick={() => void run("connection_test")}
          disabled={processing !== ""}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-black text-white"
        >
          {processing === "connection_test" ? (
            <FaArrowsRotate className="animate-spin" />
          ) : (
            <FaWifi />
          )}
          Bağlantı Testi
        </button>
      </div>

      {message && (
        <div className="mt-3 text-xs font-bold text-emerald-300">
          {message}
        </div>
      )}

      {errorMessage && (
        <div className="mt-3 text-xs font-bold text-red-300">
          {errorMessage}
        </div>
      )}
    </div>
  );
}
