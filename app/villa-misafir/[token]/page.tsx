"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Portal = {
  reservation: { code: string; guest_name: string; check_in: string; check_out: string; guest_count: number; status: string; paid_total: number; balance: number; currency: string };
  villa: { id: string; name: string; city: string | null; district: string | null; address: string | null; latitude: number | null; longitude: number | null; check_in_time: string | null; check_out_time: string | null; wifi_name: string | null; wifi_password: string | null; guest_notes: string | null; house_rules: string[]; amenities: string[] };
  photos: Array<{ url: string | null; caption: string | null; category: string | null; is_cover: boolean }>;
  upsell_enabled: boolean;
};

const money = (v: number, currency: string) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: currency || "TRY", maximumFractionDigits: 0 }).format(Number(v ?? 0));

export default function VillaGuestPage() {
  const params = useParams<{ token: string }>();
  const [portal, setPortal] = useState<Portal | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const { data, error: rpcError } = await supabase.rpc("get_villa_guest_portal", { p_token: params.token });
      if (rpcError) return setError(rpcError.message);
      setPortal((data ?? null) as Portal | null);
    })();
  }, [params.token]);

  if (error) return <main className="min-h-screen bg-slate-950 p-6 text-white"><div className="mx-auto max-w-3xl rounded-2xl bg-red-500/10 p-5 text-red-300">{error}</div></main>;
  if (!portal) return <main className="min-h-screen bg-slate-950 p-6 text-white"><div className="mx-auto max-w-3xl text-slate-400">Tatil bilgilerin yükleniyor...</div></main>;

  const { reservation, villa, photos } = portal;
  const cover = photos.find(p => p.is_cover)?.url ?? photos[0]?.url;

  return <main className="min-h-screen bg-slate-950 text-white">
    {cover && <div className="h-[340px] w-full bg-cover bg-center" style={{ backgroundImage: `linear-gradient(to top, rgb(2 6 23), transparent), url(${cover})` }} />}
    <div className="mx-auto max-w-5xl px-5 pb-16 pt-8">
      <div className="text-xs font-black uppercase tracking-[.25em] text-cyan-400">TUROBUS · TATİLİM</div>
      <h1 className="mt-2 text-4xl font-black">{villa.name}</h1>
      <div className="mt-2 text-slate-400">{[villa.city, villa.district].filter(Boolean).join(" · ")}</div>

      <div className="mt-8 grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4"><div className="text-[10px] uppercase text-slate-500">Giriş</div><div className="mt-2 font-black">{reservation.check_in}</div><div className="text-xs text-slate-500">{villa.check_in_time?.slice(0,5) ?? "15:00"}</div></div>
        <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4"><div className="text-[10px] uppercase text-slate-500">Çıkış</div><div className="mt-2 font-black">{reservation.check_out}</div><div className="text-xs text-slate-500">{villa.check_out_time?.slice(0,5) ?? "11:00"}</div></div>
        <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4"><div className="text-[10px] uppercase text-slate-500">Misafir</div><div className="mt-2 font-black">{reservation.guest_count} kişi</div><div className="text-xs text-slate-500">{reservation.code}</div></div>
        <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4"><div className="text-[10px] uppercase text-slate-500">Kalan Ödeme</div><div className="mt-2 font-black text-amber-300">{money(reservation.balance,reservation.currency)}</div></div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-white/10 bg-white/[.03] p-5"><h2 className="text-xl font-black">Villa Bilgileri</h2><div className="mt-4 space-y-3 text-sm text-slate-300"><div><span className="text-slate-500">Adres:</span> {villa.address ?? "Yetkili tarafından paylaşılacak"}</div><div><span className="text-slate-500">Wi‑Fi:</span> {villa.wifi_name ?? "-"}</div><div><span className="text-slate-500">Wi‑Fi Şifre:</span> {villa.wifi_password ?? "-"}</div>{villa.guest_notes && <div className="rounded-xl bg-cyan-500/10 p-3 text-cyan-200">{villa.guest_notes}</div>}</div></section>
        <section className="rounded-3xl border border-white/10 bg-white/[.03] p-5"><h2 className="text-xl font-black">Tatilini Geliştir</h2><p className="mt-2 text-sm text-slate-400">Villa misafirlerine özel Turobus fırsatları.</p><div className="mt-5 grid gap-2 sm:grid-cols-2"><Link href="/turlar" className="rounded-xl bg-cyan-400 px-4 py-3 text-center text-sm font-black text-slate-950">Turları Gör</Link><Link href="/rezervasyon" className="rounded-xl border border-white/10 px-4 py-3 text-center text-sm font-black">Aktivite & Transfer</Link></div></section>
      </div>

      {photos.length > 0 && <section className="mt-8"><h2 className="text-xl font-black">Villa Fotoğrafları</h2><div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">{photos.filter(p=>p.url).map((p,i)=><img key={i} src={p.url ?? ""} alt={p.caption ?? villa.name} className="aspect-[4/3] w-full rounded-2xl object-cover" />)}</div></section>}
    </div>
  </main>;
}
