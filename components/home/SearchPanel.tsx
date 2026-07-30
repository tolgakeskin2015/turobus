"use client";

import { useState } from "react";
import {
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaSearch,
  FaUsers,
} from "react-icons/fa";

export default function SearchPanel() {
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState("");
  const [guests, setGuests] = useState("2");

  function handleSearch() {
    console.log({
      destination,
      date,
      guests,
    });
  }

  return (
    <div className="rounded-[28px] border border-white/10 bg-white/10 p-3 shadow-2xl backdrop-blur-xl">
      <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr_0.8fr_auto]">
        <label className="flex min-h-20 items-center gap-4 rounded-2xl bg-white px-5">
          <FaMapMarkerAlt className="text-orange-500" />

          <div className="min-w-0 flex-1">
            <span className="block text-xs font-black uppercase tracking-wider text-slate-400">
              Nereye?
            </span>

            <input
              value={destination}
              onChange={(event) => setDestination(event.target.value)}
              placeholder="Şehir, bölge veya tur"
              className="mt-1 w-full bg-transparent text-sm font-bold text-slate-950 outline-none"
            />
          </div>
        </label>

        <label className="flex min-h-20 items-center gap-4 rounded-2xl bg-white px-5">
          <FaCalendarAlt className="text-orange-500" />

          <div className="min-w-0 flex-1">
            <span className="block text-xs font-black uppercase tracking-wider text-slate-400">
              Tarih
            </span>

            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="mt-1 w-full bg-transparent text-sm font-bold text-slate-950 outline-none"
            />
          </div>
        </label>

        <label className="flex min-h-20 items-center gap-4 rounded-2xl bg-white px-5">
          <FaUsers className="text-orange-500" />

          <div className="min-w-0 flex-1">
            <span className="block text-xs font-black uppercase tracking-wider text-slate-400">
              Misafir
            </span>

            <select
              value={guests}
              onChange={(event) => setGuests(event.target.value)}
              className="mt-1 w-full bg-transparent text-sm font-bold text-slate-950 outline-none"
            >
              <option value="1">1 kişi</option>
              <option value="2">2 kişi</option>
              <option value="3">3 kişi</option>
              <option value="4">4 kişi</option>
              <option value="5">5+ kişi</option>
            </select>
          </div>
        </label>

        <button
          type="button"
          onClick={handleSearch}
          className="flex min-h-20 items-center justify-center gap-3 rounded-2xl bg-orange-500 px-8 font-black text-white transition hover:bg-orange-600"
        >
          <FaSearch />
          Tur Ara
        </button>
      </div>
    </div>
  );
}
