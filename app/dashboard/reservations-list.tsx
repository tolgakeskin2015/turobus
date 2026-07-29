"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  FaCalendarAlt,
  FaEnvelope,
  FaPhone,
  FaUser,
} from "react-icons/fa";

type Reservation = {
  id: string;
  tour_title: string;
  tour_date: string;
  guests: number;
  full_name: string;
  email: string;
  phone: string;
  total_price: number;
  status: string;
  created_at: string;
};

export default function ReservationsList() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReservations() {
      const { data, error } = await supabase
        .from("reservations")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }

      setReservations(data ?? []);
      setLoading(false);
    }

    loadReservations();
  }, []);

  if (loading) {
    return (
      <div className="rounded-3xl bg-slate-900 p-8 text-slate-400">
        Rezervasyonlar yükleniyor...
      </div>
    );
  }

  return (
    <section>
      <div className="mb-8">
        <p className="text-sm font-bold uppercase tracking-widest text-orange-400">
          Gerçek veriler
        </p>

        <h2 className="mt-3 text-3xl font-black">
          Son Rezervasyonlar
        </h2>
      </div>

      <div className="space-y-5">
        {reservations.map((reservation) => (
          <article
            key={reservation.id}
            className="rounded-3xl border border-white/10 bg-slate-900 p-6"
          >
            <div className="flex flex-col justify-between gap-5 lg:flex-row">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-xl font-black">
                    {reservation.tour_title}
                  </h3>

                  <span className="rounded-full bg-orange-500/15 px-3 py-1 text-xs font-bold text-orange-400">
                    {reservation.status}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 text-sm text-slate-400 md:grid-cols-2">
                  <div className="flex items-center gap-2">
                    <FaUser className="text-orange-400" />
                    {reservation.full_name}
                  </div>

                  <div className="flex items-center gap-2">
                    <FaCalendarAlt className="text-orange-400" />
                    {reservation.tour_date}
                  </div>

                  <div className="flex items-center gap-2">
                    <FaEnvelope className="text-orange-400" />
                    {reservation.email}
                  </div>

                  <div className="flex items-center gap-2">
                    <FaPhone className="text-orange-400" />
                    {reservation.phone}
                  </div>
                </div>
              </div>

              <div className="min-w-44 rounded-2xl bg-slate-950 p-5 text-right">
                <p className="text-xs uppercase tracking-wider text-slate-500">
                  Toplam
                </p>

                <p className="mt-2 text-2xl font-black text-orange-500">
                  {reservation.total_price.toLocaleString("tr-TR")} TL
                </p>

                <p className="mt-2 text-xs text-slate-500">
                  {reservation.guests} kişi
                </p>
              </div>
            </div>
          </article>
        ))}

        {reservations.length === 0 && (
          <div className="rounded-3xl border border-white/10 bg-slate-900 p-10 text-center text-slate-400">
            Henüz rezervasyon bulunmuyor.
          </div>
        )}
      </div>
    </section>
  );
}
