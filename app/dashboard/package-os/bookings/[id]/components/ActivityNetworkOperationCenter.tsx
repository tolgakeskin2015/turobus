"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Provider = {
  provider_company_id: string;
  activity_id: string;
  activity_name: string;
  slot_id: string;
  slot_date: string;
  start_time: string | null;
  capacity: number;
  reserved_count: number;
  available: number;
  cost: number | null;
  sale_price: number | null;
  currency: string;
  staff: Array<{ id: string; name: string; type: string; role: string | null }>;
};

type Request = {
  request_id: string;
  product_key: string;
  activity_name: string;
  city: string | null;
  district: string | null;
  service_date: string;
  quantity: number;
  assignment_id: string | null;
  assignment_status: string | null;
  provider_company_id: string | null;
  activity_id: string | null;
  slot_id: string | null;
  allocation_id: string | null;
  confirmation_code: string | null;
  providers: Provider[];
};

type Props = {
  companyId: string;
  bookingId: string;
  bookingStatus: string;
  onChanged?: () => void;
};

function timeText(value: string | null) {
  return value ? String(value).slice(0, 5) : "Saat yok";
}

export default function ActivityNetworkOperationCenter({
  companyId,
  bookingId,
  bookingStatus,
  onChanged,
}: Props) {
  const [requests, setRequests] = useState<Request[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    const { data, error: rpcError } = await supabase.rpc(
      "get_package_booking_activity_network",
      {
        p_company_id: companyId,
        p_booking_id: bookingId,
      }
    );

    if (rpcError) {
      setError(rpcError.message);
      setRequests([]);
    } else {
      const result = data as { requests?: Request[] };
      const next = result.requests ?? [];
      setRequests(next);
      const defaults: Record<string, string> = {};
      for (const request of next) {
        if (request.slot_id) defaults[request.request_id] = request.slot_id;
        else if (request.providers?.length) defaults[request.request_id] = request.providers[0].slot_id;
      }
      setSelectedSlots(defaults);
    }

    setLoading(false);
  }, [companyId, bookingId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function assign(request: Request) {
    const slotId = selectedSlots[request.request_id];
    if (!slotId) {
      setError("Önce aktivite firması / saati seçin.");
      return;
    }
    if (bookingStatus === "cancelled") {
      setError("İptal edilmiş rezervasyona aktivite atanamaz.");
      return;
    }

    const provider = request.providers.find((item) => item.slot_id === slotId);
    if (!window.confirm(`${request.activity_name} için seçilen firmaya ${request.quantity} kişi gönderilsin mi?`)) return;

    setBusy(request.request_id);
    setError("");
    setMessage("");

    const { data, error: rpcError } = await supabase.rpc(
      "assign_package_activity_network_slot",
      {
        p_company_id: companyId,
        p_booking_id: bookingId,
        p_request_id: request.request_id,
        p_slot_id: slotId,
      }
    );

    if (rpcError) {
      setError(rpcError.message);
    } else {
      const result = data as { confirmation_code?: string; remaining?: number };
      setMessage(
        `${request.activity_name} atandı. ${result.confirmation_code ? `Onay: ${result.confirmation_code}. ` : ""}${
          result.remaining != null ? `Kalan kapasite: ${result.remaining}` : ""
        }`
      );
      await load();
      onChanged?.();
    }

    setBusy(null);
  }

  async function release(request: Request) {
    if (!window.confirm(`${request.activity_name} rezervasyonu iptal edilip kapasite geri açılsın mı?`)) return;

    setBusy(request.request_id);
    setError("");
    setMessage("");

    const { error: rpcError } = await supabase.rpc(
      "release_package_activity_network_assignment",
      {
        p_company_id: companyId,
        p_booking_id: bookingId,
        p_request_id: request.request_id,
        p_reason: "Operasyon tarafından iptal edildi",
      }
    );

    if (rpcError) setError(rpcError.message);
    else {
      setMessage("Aktivite rezervasyonu bırakıldı ve kapasite geri açıldı.");
      await load();
      onChanged?.();
    }

    setBusy(null);
  }

  if (loading || requests.length === 0) return null;

  return (
    <section className="mt-8 rounded-3xl border border-fuchsia-500/20 bg-fuchsia-500/[0.04] p-6">
      <div className="text-xs font-black uppercase tracking-[0.2em] text-fuchsia-400">
        ACTIVITY NETWORK OPERASYONU
      </div>
      <h2 className="mt-2 text-2xl font-black">Firma & Sorti Atama</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
        Satışçı yalnız aktiviteyi sattı. Buradan anlaşmalı firmalar arasından firma, saat ve sortiyi seç.
      </p>

      {error && <div className="mt-5 rounded-xl bg-red-500/10 p-4 text-sm font-bold text-red-300">{error}</div>}
      {message && <div className="mt-5 rounded-xl bg-emerald-500/10 p-4 text-sm font-bold text-emerald-300">{message}</div>}

      <div className="mt-6 space-y-4">
        {requests.map((request) => {
          const active = request.assignment_status === "confirmed";
          const selected = selectedSlots[request.request_id] ?? "";
          const provider = request.providers.find((item) => item.slot_id === selected);

          return (
            <div key={request.request_id} className="rounded-2xl border border-white/10 bg-slate-950 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-black">{request.activity_name}</h3>
                  <div className="mt-1 text-sm text-slate-500">
                    {request.service_date} · {request.quantity} kişi
                  </div>
                </div>
                <span className={`rounded-lg px-3 py-1.5 text-xs font-black ${active ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>
                  {active ? "FİRMA ATANDI" : "OPERASYON BEKLİYOR"}
                </span>
              </div>

              {!active && (
                <div className="mt-5">
                  <label className="text-xs font-black text-slate-400">Firma / Saat / Sorti</label>
                  <select
                    value={selected}
                    onChange={(event) =>
                      setSelectedSlots((current) => ({ ...current, [request.request_id]: event.target.value }))
                    }
                    className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm"
                  >
                    <option value="">Seçiniz</option>
                    {request.providers.map((item) => (
                      <option key={item.slot_id} value={item.slot_id}>
                        {`${timeText(item.start_time)} · Boş ${item.available} · ${
                          item.staff?.map((staff) => staff.name).join(", ") || "Personel atanmamış"
                        }`}
                      </option>
                    ))}
                  </select>

                  {provider && (
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <div className="rounded-xl bg-white/[0.03] p-3"><div className="text-[10px] text-slate-500">Kalan</div><div className="mt-1 font-black text-emerald-300">{provider.available}</div></div>
                      <div className="rounded-xl bg-white/[0.03] p-3"><div className="text-[10px] text-slate-500">Maliyet</div><div className="mt-1 text-xs font-black">{provider.cost ?? "-"}</div></div>
                      <div className="rounded-xl bg-white/[0.03] p-3"><div className="text-[10px] text-slate-500">Saat</div><div className="mt-1 font-black">{timeText(provider.start_time)}</div></div>
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={!selected || busy === request.request_id}
                    onClick={() => assign(request)}
                    className="mt-4 w-full rounded-xl bg-fuchsia-400 px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-50"
                  >
                    {busy === request.request_id ? "Atanıyor..." : "Firmaya Ata · Kapasiteyi Düş"}
                  </button>
                </div>
              )}

              {active && (
                <div className="mt-5">
                  <div className="rounded-xl bg-emerald-500/10 p-4 text-sm">
                    <div className="font-black text-emerald-300">Onay Kodu</div>
                    <div className="mt-1">{request.confirmation_code ?? "-"}</div>
                  </div>
                  <button
                    type="button"
                    disabled={busy === request.request_id}
                    onClick={() => release(request)}
                    className="mt-4 w-full rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-black text-red-300"
                  >
                    Rezervasyonu Bırak · Kapasiteyi Geri Aç
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
