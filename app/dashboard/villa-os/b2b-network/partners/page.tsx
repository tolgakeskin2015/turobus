"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FaBuilding, FaCheck, FaEnvelope, FaSearch, FaTimes, FaUsers } from "react-icons/fa";
import { supabase } from "@/lib/supabase";
import { CurrentMembership, getCurrentMembership } from "@/lib/current-user";

type Villa = { id: string; name: string };
type CompanyRow = { company_id: string; company_name: string; city: string | null; company_type: string | null };
type Invitation = {
  invitation_id: string;
  direction: "incoming" | "outgoing";
  counterparty_company_id: string;
  counterparty_name: string;
  villa_id: string;
  villa_name: string;
  pricing_type: string;
  net_rate: number | null;
  discount_rate: number;
  instant_confirm: boolean;
  status: string;
  note: string | null;
  created_at: string;
  responded_at: string | null;
};

const money = (value: number | null | undefined) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(Number(value ?? 0));

export default function VillaB2BPartnersPage() {
  const [membership, setMembership] = useState<CurrentMembership | null>(null);
  const [villas, setVillas] = useState<Villa[]>([]);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [query, setQuery] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<CompanyRow | null>(null);
  const [villaId, setVillaId] = useState("");
  const [pricingType, setPricingType] = useState("discount");
  const [discount, setDiscount] = useState("10");
  const [netRate, setNetRate] = useState("");
  const [instant, setInstant] = useState(true);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const current = await getCurrentMembership(user.id);
      if (!current) return;
      setMembership(current);

      const [villaR, inviteR] = await Promise.all([
        supabase.from("villas").select("id,name").eq("company_id", current.company_id).eq("is_active", true).order("name"),
        supabase.rpc("get_villa_b2b_invitation_center", { p_company_id: current.company_id }),
      ]);

      if (villaR.error) throw villaR.error;
      if (inviteR.error) throw inviteR.error;
      setVillas((villaR.data ?? []) as Villa[]);
      setInvitations((inviteR.data ?? []) as Invitation[]);
      if (!villaId && villaR.data?.[0]?.id) setVillaId(villaR.data[0].id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Partner merkezi yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [villaId]);

  useEffect(() => { void load(); }, [load]);

  async function searchCompanies() {
    if (!membership) return;
    setBusy(true); setError("");
    const { data, error: rpcError } = await supabase.rpc("search_turobus_partner_companies", {
      p_company_id: membership.company_id,
      p_query: query,
    });
    if (rpcError) setError(rpcError.message); else setCompanies((data ?? []) as CompanyRow[]);
    setBusy(false);
  }

  async function sendInvitation() {
    if (!membership || !selectedCompany || !villaId) return;
    setBusy(true); setError(""); setMessage("");
    const { error: rpcError } = await supabase.rpc("create_villa_b2b_invitation", {
      p_inviter_company_id: membership.company_id,
      p_invitee_company_id: selectedCompany.company_id,
      p_villa_id: villaId,
      p_pricing_type: pricingType,
      p_net_rate: pricingType === "net_rate" && netRate ? Number(netRate) : null,
      p_discount_rate: pricingType === "discount" ? Number(discount || 0) / 100 : 0,
      p_instant_confirm: instant,
      p_note: note || null,
    });
    if (rpcError) setError(rpcError.message); else {
      setMessage(`${selectedCompany.company_name} firmasına davet gönderildi.`);
      setSelectedCompany(null); setCompanies([]); setQuery(""); setNote("");
      await load();
    }
    setBusy(false);
  }

  async function respond(invitationId: string, action: "accept" | "reject") {
    setBusy(true); setError(""); setMessage("");
    const { error: rpcError } = await supabase.rpc("respond_villa_b2b_invitation", { p_invitation_id: invitationId, p_action: action });
    if (rpcError) setError(rpcError.message); else {
      setMessage(action === "accept" ? "Davet kabul edildi. Villa B2B portföyüne eklendi." : "Davet reddedildi.");
      await load();
    }
    setBusy(false);
  }

  async function cancelInvitation(invitationId: string) {
    setBusy(true); setError("");
    const { error: rpcError } = await supabase.rpc("cancel_villa_b2b_invitation", { p_invitation_id: invitationId });
    if (rpcError) setError(rpcError.message); else await load();
    setBusy(false);
  }

  const incoming = useMemo(() => invitations.filter((x) => x.direction === "incoming"), [invitations]);
  const outgoing = useMemo(() => invitations.filter((x) => x.direction === "outgoing"), [invitations]);
  const pendingIncoming = incoming.filter((x) => x.status === "pending").length;
  const accepted = invitations.filter((x) => x.status === "accepted").length;

  if (loading) return <main className="min-h-screen bg-[#06101b] p-8 text-white">Partner ağı hazırlanıyor…</main>;

  return (
    <main className="min-h-screen bg-[#06101b] text-white">
      <header className="border-b border-white/[.07] bg-[#081522] px-5 py-4 lg:px-7">
        <div className="mx-auto flex max-w-[1650px] flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-400 text-slate-950"><FaUsers /></div>
            <div><div className="text-[10px] font-black uppercase tracking-[.22em] text-violet-300">TUROBUS PARTNER NETWORK</div><h1 className="text-2xl font-black">Villa Partner & Davet Merkezi</h1></div>
          </div>
          <div className="flex gap-2"><Link href="/dashboard/villa-os/b2b-network" className="rounded-lg border border-white/10 px-3 py-2 text-xs font-black text-slate-300">← B2B Dağıtım</Link><Link href="/dashboard/villa-os/control-center" className="rounded-lg bg-white/[.05] px-3 py-2 text-xs font-black">Villa Operasyon</Link></div>
        </div>
      </header>

      <div className="mx-auto max-w-[1650px] px-5 py-5 lg:px-7">
        {error && <div className="mb-4 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm font-bold text-red-200">{error}</div>}
        {message && <div className="mb-4 rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm font-bold text-emerald-200">{message}</div>}

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-white/[.07] bg-[#091724] p-4"><div className="text-[9px] font-black uppercase text-slate-500">Gelen Bekleyen</div><div className="mt-2 text-3xl font-black text-amber-300">{pendingIncoming}</div></div>
          <div className="rounded-xl border border-white/[.07] bg-[#091724] p-4"><div className="text-[9px] font-black uppercase text-slate-500">Kabul Edilen</div><div className="mt-2 text-3xl font-black text-emerald-300">{accepted}</div></div>
          <div className="rounded-xl border border-white/[.07] bg-[#091724] p-4"><div className="text-[9px] font-black uppercase text-slate-500">Toplam Davet</div><div className="mt-2 text-3xl font-black">{invitations.length}</div></div>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[430px_1fr]">
          <section className="h-fit rounded-xl border border-white/[.07] bg-[#091724] p-4 xl:sticky xl:top-4">
            <div className="flex items-center gap-2"><FaSearch className="text-violet-300" /><h2 className="font-black">Turobus'ta Firma Bul</h2></div>
            <p className="mt-2 text-xs leading-5 text-slate-500">Firma adıyla ara, partneri seç ve villa satış davetini gönder.</p>

            <div className="mt-4 flex gap-2"><input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void searchCompanies(); }} placeholder="Firma adı ara..." className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#06101b] px-3 py-3 text-sm outline-none focus:border-violet-400/40"/><button onClick={() => void searchCompanies()} disabled={busy} className="rounded-lg bg-violet-400 px-4 text-slate-950 disabled:opacity-50"><FaSearch /></button></div>

            {!!companies.length && <div className="mt-3 max-h-56 space-y-2 overflow-y-auto">{companies.map((company) => <button key={company.company_id} onClick={() => setSelectedCompany(company)} className={`w-full rounded-lg border p-3 text-left transition ${selectedCompany?.company_id === company.company_id ? "border-violet-400/40 bg-violet-400/10" : "border-white/[.06] bg-white/[.02] hover:bg-white/[.04]"}`}><div className="text-sm font-black">{company.company_name}</div><div className="mt-1 text-[10px] text-slate-500">{[company.city, company.company_type].filter(Boolean).join(" · ") || "Turobus firması"}</div></button>)}</div>}

            {selectedCompany && <div className="mt-4 rounded-xl border border-violet-400/20 bg-violet-400/[.06] p-3"><div className="text-[9px] font-black uppercase tracking-wider text-violet-300">SEÇİLEN PARTNER</div><div className="mt-1 font-black">{selectedCompany.company_name}</div></div>}

            <div className="mt-4 space-y-3">
              <select value={villaId} onChange={(e) => setVillaId(e.target.value)} className="w-full rounded-lg border border-white/10 bg-[#06101b] px-3 py-3 text-sm"><option value="">Villa seç</option>{villas.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select>
              <select value={pricingType} onChange={(e) => setPricingType(e.target.value)} className="w-full rounded-lg border border-white/10 bg-[#06101b] px-3 py-3 text-sm"><option value="discount">İndirimli fiyat</option><option value="net_rate">Net gecelik fiyat</option><option value="public_rate">Public fiyat</option></select>
              {pricingType === "discount" && <input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="İndirim %" className="w-full rounded-lg border border-white/10 bg-[#06101b] px-3 py-3 text-sm"/>}
              {pricingType === "net_rate" && <input type="number" value={netRate} onChange={(e) => setNetRate(e.target.value)} placeholder="Net gecelik fiyat" className="w-full rounded-lg border border-white/10 bg-[#06101b] px-3 py-3 text-sm"/>}
              <label className="flex items-center gap-2 rounded-lg bg-white/[.03] p-3 text-xs font-bold"><input type="checkbox" checked={instant} onChange={(e) => setInstant(e.target.checked)}/> Anında rezervasyon onayı</label>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Partner notu (opsiyonel)" className="min-h-20 w-full rounded-lg border border-white/10 bg-[#06101b] px-3 py-3 text-sm"/>
              <button onClick={() => void sendInvitation()} disabled={busy || !selectedCompany || !villaId} className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-400 px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-40"><FaEnvelope /> Davet Gönder</button>
            </div>
          </section>

          <div className="space-y-4">
            <section className="rounded-xl border border-white/[.07] bg-[#091724] p-4"><div className="flex items-center justify-between"><div><div className="text-[9px] font-black uppercase tracking-wider text-slate-500">GELEN DAVETLER</div><h2 className="mt-1 text-lg font-black">Bana Gelen Partner Teklifleri</h2></div><FaEnvelope className="text-violet-300" /></div><div className="mt-4 space-y-2">{incoming.map((x) => <div key={x.invitation_id} className="rounded-xl border border-white/[.06] bg-[#06101b] p-4"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><div className="font-black">{x.counterparty_name}</div><div className="mt-1 text-xs text-slate-500">{x.villa_name} · {x.pricing_type === "discount" ? `%${Math.round(Number(x.discount_rate) * 100)} indirim` : x.pricing_type === "net_rate" ? `${money(x.net_rate)} net` : "Public fiyat"} · {x.instant_confirm ? "Anında onay" : "Talep onaylı"}</div>{x.note && <div className="mt-2 text-xs text-slate-400">{x.note}</div>}</div><div className="flex items-center gap-2">{x.status === "pending" ? <><button disabled={busy} onClick={() => void respond(x.invitation_id, "accept")} className="flex items-center gap-2 rounded-lg bg-emerald-400 px-3 py-2 text-xs font-black text-slate-950"><FaCheck /> Kabul</button><button disabled={busy} onClick={() => void respond(x.invitation_id, "reject")} className="flex items-center gap-2 rounded-lg bg-red-400/10 px-3 py-2 text-xs font-black text-red-300"><FaTimes /> Reddet</button></> : <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${x.status === "accepted" ? "bg-emerald-500/10 text-emerald-300" : "bg-white/[.05] text-slate-400"}`}>{x.status}</span>}</div></div></div>)}{!incoming.length && <div className="rounded-lg border border-dashed border-white/10 p-8 text-center text-xs text-slate-500">Gelen davet yok.</div>}</div></section>

            <section className="rounded-xl border border-white/[.07] bg-[#091724] p-4"><div className="flex items-center justify-between"><div><div className="text-[9px] font-black uppercase tracking-wider text-slate-500">GÖNDERİLEN DAVETLER</div><h2 className="mt-1 text-lg font-black">Partner Davet Takibi</h2></div><FaBuilding className="text-violet-300" /></div><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="py-3">Firma</th><th>Villa</th><th>Fiyatlama</th><th>Durum</th><th>Tarih</th><th className="text-right">İşlem</th></tr></thead><tbody>{outgoing.map((x) => <tr key={x.invitation_id} className="border-t border-white/[.06]"><td className="py-4 font-black">{x.counterparty_name}</td><td>{x.villa_name}</td><td>{x.pricing_type === "discount" ? `%${Math.round(Number(x.discount_rate) * 100)}` : x.pricing_type === "net_rate" ? money(x.net_rate) : "Public"}</td><td><span className={`rounded-full px-2 py-1 text-[9px] font-black uppercase ${x.status === "accepted" ? "bg-emerald-500/10 text-emerald-300" : x.status === "pending" ? "bg-amber-500/10 text-amber-300" : "bg-white/[.05] text-slate-400"}`}>{x.status}</span></td><td className="text-xs text-slate-500">{new Date(x.created_at).toLocaleDateString("tr-TR")}</td><td className="text-right">{x.status === "pending" && <button disabled={busy} onClick={() => void cancelInvitation(x.invitation_id)} className="text-xs font-black text-red-300">İptal</button>}</td></tr>)}</tbody></table>{!outgoing.length && <div className="p-8 text-center text-xs text-slate-500">Gönderilmiş davet yok.</div>}</div></section>
          </div>
        </div>
      </div>
    </main>
  );
}
