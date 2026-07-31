"use client";

import ReservationsList from "../reservations-list";

export default function ReservationsPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white p-10">

      <div className="mb-10">
        <p className="text-orange-500 font-bold uppercase tracking-widest">
          Dashboard
        </p>

        <h1 className="text-5xl font-black mt-2">
          Rezervasyon Yönetimi
        </h1>

        <p className="text-slate-400 mt-4">
          Sisteme gelen tüm rezervasyonları buradan yönetebilirsiniz.
        </p>
      </div>

      <ReservationsList />

    </main>
  );
}
