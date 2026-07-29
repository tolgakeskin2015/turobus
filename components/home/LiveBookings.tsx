"use client";

import { useEffect, useState } from "react";
import {
  FaCheckCircle,
  FaMapMarkerAlt,
  FaRegClock,
} from "react-icons/fa";

const bookings = [
  {
    customer: "Ayşe",
    city: "İstanbul",
    tour: "Fethiye Jeep Safari",
    time: "2 dakika önce",
  },
  {
    customer: "Mehmet",
    city: "Ankara",
    tour: "Ölüdeniz Tekne Turu",
    time: "5 dakika önce",
  },
  {
    customer: "Lisa",
    city: "Berlin",
    tour: "Kapadokya Balon Turu",
    time: "8 dakika önce",
  },
  {
    customer: "Can",
    city: "İzmir",
    tour: "Antalya Rafting Turu",
    time: "11 dakika önce",
  },
];

export default function LiveBookings() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % bookings.length);
    }, 3500);

    return () => window.clearInterval(interval);
  }, []);

  const booking = bookings[activeIndex];

  return (
    <section className="bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col items-start justify-between gap-6 rounded-[30px] border border-white/10 bg-slate-900/80 p-6 shadow-xl backdrop-blur-xl md:flex-row md:items-center md:p-8">
          <div className="flex items-center gap-4">
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
              <FaCheckCircle size={24} />

              <span className="absolute -right-1 -top-1 h-3 w-3 animate-pulse rounded-full bg-emerald-400" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-[0.18em] text-emerald-400">
                  Canlı rezervasyon
                </span>
              </div>

              <p className="mt-2 text-lg font-bold text-white">
                {booking.customer}, {booking.city} konumundan
                <span className="text-orange-400">
                  {" "}
                  {booking.tour}
                </span>{" "}
                rezervasyonu yaptı.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
            <div className="flex items-center gap-2">
              <FaMapMarkerAlt className="text-orange-400" />
              {booking.city}
            </div>

            <div className="flex items-center gap-2">
              <FaRegClock />
              {booking.time}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
