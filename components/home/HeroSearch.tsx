"use client";

import { useState } from "react";
import {
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaSearch,
  FaSlidersH,
  FaUsers,
} from "react-icons/fa";

export default function HeroSearch() {
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState("");
  const [guests, setGuests] = useState("2");
  const [category, setCategory] = useState("Tüm turlar");

  function handleSearch() {
    console.log({
      destination,
      date,
      guests,
      category,
    });
  }

  return (
    <section className="relative overflow-hidden bg-slate-950 px-6 pb-24 pt-40 text-white">
      <div className="absolute -left-32 top-20 h-96 w-96 rounded-full bg-orange-500/15 blur-[130px]" />
      <div className="absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-blue-500/10 blur-[130px]" />

      <div className="relative z-10 mx-auto max-w-7xl">
        <div className="mx-auto max-w-5xl text-center">
          <div className="inline-flex rounded-full border border-orange-500/25 bg-orange-500/10 px-5 py-2 text-sm font-black text-orange-400">
            Türkiye&apos;nin yeni nesil tur pazaryeri
          </div>

          <h1 className="mt-7 text-5xl font-black tracking-[-0.04em] md:text-7xl">
            Hayalindeki deneyimi
            <span className="block bg-gradient-to-r from-orange-400 via-orange-500 to-amber-300 bg-clip-text text-transparent">
              birkaç saniyede bul.
            </span>
          </h1>

          <p className="mx-auto mt-7 max-w-3xl text-lg leading-8 text-slate-300 md:text-xl">
            Doğrulanmış acentelerin turlarını karşılaştır, uygun tarihi seç ve
            rezervasyonunu güvenle tamamla.
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-6xl rounded-[32px] border border-white/10 bg-white/[0.07] p-3 shadow-2xl backdrop-blur-2xl">
          <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr_0.8fr_1fr_auto]">
            <label className="flex min-h-20 items-center gap-4 rounded-2xl bg-white px-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-500">
                <FaMapMarkerAlt />
              </div>

              <div className="min-w-0 flex-1 text-left">
                <span className="block text-xs font-black uppercase tracking-wider text-slate-400">
                  Nereye?
                </span>

                <input
                  value={destination}
                  onChange={(event) => setDestination(event.target.value)}
                  placeholder="Şehir, bölge veya tur"
                  className="mt-1 w-full bg-transparent text-sm font-bold text-slate-950 outline-none placeholder:text-slate-400"
                />
              </div>
            </label>

            <label className="flex min-h-20 items-center gap-4 rounded-2xl bg-white px-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-500">
                <FaCalendarAlt />
              </div>

              <div className="min-w-0 flex-1 text-left">
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
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-500">
                <FaUsers />
              </div>

              <div className="min-w-0 flex-1 text-left">
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

            <label className="flex min-h-20 items-center gap-4 rounded-2xl bg-white px-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-500">
                <FaSlidersH />
              </div>

              <div className="min-w-0 flex-1 text-left">
                <span className="block text-xs font-black uppercase tracking-wider text-slate-400">
                  Kategori
                </span>

                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="mt-1 w-full bg-transparent text-sm font-bold text-slate-950 outline-none"
                >
                  <option>Tüm turlar</option>
                  <option>Günübirlik turlar</option>
                  <option>Tekne turları</option>
                  <option>Balayı paketleri</option>
                  <option>Macera ve aktivite</option>
                  <option>Yurt dışı turları</option>
                </select>
              </div>
            </label>

            <button
              type="button"
              onClick={handleSearch}
              className="flex min-h-20 items-center justify-center gap-3 rounded-2xl bg-orange-500 px-8 font-black text-white shadow-lg shadow-orange-500/25 transition hover:-translate-y-0.5 hover:bg-orange-600"
            >
              <FaSearch />
              Tur Ara
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm">
          <span className="font-bold text-slate-500">Popüler aramalar:</span>

          {["Fethiye", "Kapadokya", "Antalya", "Ölüdeniz"].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setDestination(item)}
              className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 font-bold text-slate-300 transition hover:border-orange-500/40 hover:text-orange-400"
            >
              {item}
            </button>
          ))}
        </div>

        <div className="mx-auto mt-12 grid max-w-4xl grid-cols-2 gap-4 md:grid-cols-4">
          {[
            ["10.000+", "Tur ve deneyim"],
            ["500+", "Doğrulanmış acente"],
            ["81", "Şehir"],
            ["250.000+", "Mutlu misafir"],
          ].map(([value, label]) => (
            <div
              key={label}
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-center"
            >
              <div className="text-2xl font-black text-white">{value}</div>
              <div className="mt-1 text-xs font-semibold text-slate-500">
                {label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
