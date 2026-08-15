"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { CurrentMembership, getCurrentMembership } from "@/lib/current-user";

type Staff = {
  id: string;
  full_name: string;
  staff_type: string;
  phone: string | null;
  license_no: string | null;
  daily_capacity: number | null;
  is_active: boolean;
};

type Booking = {
  assignment_id: string;
  booking_id: string;
  booking_code: string;
  customer_name: string;
  customer_phone: string | null;
  activity_name: string;
  slot_date: string;
  start_time: string | null;
  quantity: number;
  status: string;
  confirmation_code: string | null;
};

export default function ActivityNetworkPage() {
  const [membership, setMembership] = useState<CurrentMembership | null>(null);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState("pilot");
  const [phone, setPhone] = useState("");
  const [license, setLicense] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async (companyId: string) => {
    const [staffResult, bookingResult] = await Promise.all([
      supabase
        .from("activity_network_staff")
        .select("id,full_name,staff_type,phone,license_no,daily_capacity,is_active")
        .eq("company_id", companyId)
        .order("full_name"),
      supabase.rpc("get_activity_provider_network_bookings", {
        p_company_id: companyId,
      }),
    ]);

    if (staffResult.error) throw new Error(staffResult.error.message);
    if (bookingResult.error) throw new Error(bookingResult.error.message);

    setStaff((staffResult.data ?? []) as Staff[]);
    const result = bookingResult.data as { bookings?: Booking[] };
    setBookings(result.bookings ?? []);
  }, []);

  useEffect(() => {
    async function init() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const current = await getCurrentMembership(user.id);
        if (!current) return;
        setMembership(current);
        await load(current.company_id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Activity Network yüklenemedi.");
      }
    }
    void init();
  }, [load]);

  async function saveStaff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!membership || !name.trim()) return;
    setError("");
    setMessage("");

    const { error: insertError } = await supabase.from("activity_network_staff").insert({
      company_id: membership.company_id,
      full_name: name.trim(),
      staff_type: type,
      phone: phone.trim() || null,
      license_no: license.trim() || null,
      is_active: true,
    });

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setName("");
    setPhone("");
    setLicense("");
    setMessage("Personel eklendi.");
    await load(membership.company_id);
  }

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.22em] text-fuchsia-400">TUROBUS ACTIVITY OS</div>
            <h1 className="mt-2 text-3xl font-black">Aktivite Network</h1>
            <p className="mt-2 text-sm text-slate-400">Slot, sorti, pilot/personel ve Turobus ağı üzerinden gelen rezervasyonlar.</p>
          </div>
          <Link href="/dashboard/package-os/activities" className="rounded-xl bg-fuchsia-400 px-4 py-3 text-sm font-black text-slate-950">
            Aktivite & Slot Yönetimi
          </Link>
        </div>

        {error && <div className="mt-6 rounded-xl bg-red-500/10 p-4 text-red-300">{error}</div>}
        {message && <div className="mt-6 rounded-xl bg-emerald-500/10 p-4 text-emerald-300">{message}</div>}

        <div className="mt-8 grid gap-6 xl:grid-cols-[420px_1fr]">
          <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <h2 className="text-xl font-black">Pilot / Personel</h2>
            <form onSubmit={saveStaff} className="mt-5 space-y-3">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ad soyad" className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3" />
              <select value={type} onChange={(e) => setType(e.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3">
                <option value="pilot">Pilot</option>
                <option value="divemaster">Divemaster</option>
                <option value="instructor">Eğitmen</option>
                <option value="captain">Kaptan</option>
                <option value="guide">Rehber</option>
                <option value="driver">Şoför</option>
                <option value="crew">Ekip</option>
              </select>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Telefon" className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3" />
              <input value={license} onChange={(e) => setLicense(e.target.value)} placeholder="Lisans / belge no" className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3" />
              <button type="submit" className="w-full rounded-xl bg-fuchsia-400 px-4 py-3 font-black text-slate-950">Personel Ekle</button>
            </form>

            <div className="mt-6 space-y-2">
              {staff.map((item) => (
                <div key={item.id} className="rounded-xl border border-white/10 bg-slate-950 p-3">
                  <div className="font-black">{item.full_name}</div>
                  <div className="mt-1 text-xs uppercase text-fuchsia-300">{item.staff_type}</div>
                  {item.phone && <div className="mt-1 text-xs text-slate-500">{item.phone}</div>}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <h2 className="text-xl font-black">Network'ten Gelen Rezervasyonlar</h2>
            <div className="mt-5 space-y-3">
              {bookings.map((booking) => (
                <div key={booking.assignment_id} className="rounded-2xl border border-white/10 bg-slate-950 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-black">{booking.activity_name}</div>
                      <div className="mt-1 text-sm text-slate-400">{booking.customer_name} · {booking.quantity} kişi</div>
                      <div className="mt-1 text-xs text-slate-500">{booking.slot_date} · {booking.start_time?.slice(0,5) ?? "-"}</div>
                    </div>
                    <div className="text-right">
                      <div className="rounded-lg bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-300">{booking.confirmation_code}</div>
                      <div className="mt-2 text-xs text-slate-500">{booking.booking_code}</div>
                    </div>
                  </div>
                </div>
              ))}
              {bookings.length === 0 && <div className="rounded-xl border border-white/10 p-4 text-sm text-slate-500">Henüz Network rezervasyonu yok.</div>}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
