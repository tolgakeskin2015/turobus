"use client";

import {
  useEffect,
  useState,
} from "react";

import Link from "next/link";
import {
  useRouter,
} from "next/navigation";

import {
  FaArrowRight,
  FaCalendarAlt,
  FaCheckCircle,
  FaExchangeAlt,
  FaMapMarkerAlt,
  FaRoute,
  FaSearch,
  FaShieldAlt,
  FaSuitcase,
  FaTicketAlt,
  FaUsers,
} from "react-icons/fa";

import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";
import TicketModeTabs from "@/components/tickets/TicketModeTabs";

import type {
  TicketMode,
  TicketTripType,
} from "@/lib/tickets/types";

import {
  ticketSearchToParams,
} from "@/lib/tickets/query";


function today() {
  const date =
    new Date();

  return [
    date.getFullYear(),
    String(
      date.getMonth() +
      1
    ).padStart(
      2,
      "0"
    ),
    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    ),
  ].join("-");
}


const popular = [
  [
    "İstanbul",
    "Ankara",
  ],
  [
    "İstanbul",
    "İzmir",
  ],
  [
    "Antalya",
    "Fethiye",
  ],
  [
    "Dalaman",
    "Fethiye",
  ],
  [
    "İstanbul",
    "Antalya",
  ],
  [
    "Bodrum",
    "İstanbul",
  ],
];


export default function TicketsPage() {
  const router =
    useRouter();

  const [
    mode,
    setMode,
  ] =
    useState<TicketMode>(
      "bus"
    );

  const [
    tripType,
    setTripType,
  ] =
    useState<TicketTripType>(
      "one_way"
    );

  const [
    origin,
    setOrigin,
  ] =
    useState("");

  const [
    destination,
    setDestination,
  ] =
    useState("");

  const [
    departureDate,
    setDepartureDate,
  ] =
    useState("");

  const [
    returnDate,
    setReturnDate,
  ] =
    useState("");

  const [
    adults,
    setAdults,
  ] =
    useState(1);

  const [
    children,
    setChildren,
  ] =
    useState(0);

  const [
    error,
    setError,
  ] =
    useState("");


  useEffect(
    () => {
      const params =
        new URLSearchParams(
          window.location.search
        );

      const qOrigin =
        params.get(
          "origin"
        );

      const qDestination =
        params.get(
          "destination"
        );

      const qDate =
        params.get(
          "date"
        );

      if (qOrigin) {
        setOrigin(
          qOrigin
        );
      }

      if (
        qDestination
      ) {
        setDestination(
          qDestination
        );
      }

      if (qDate) {
        setDepartureDate(
          qDate
        );
      }
    },
    []
  );


  function swap() {
    setOrigin(
      destination
    );

    setDestination(
      origin
    );
  }


  function submit() {
    setError("");

    if (
      !origin.trim() ||
      !destination.trim()
    ) {
      setError(
        "Nereden ve nereye alanlarını doldurun."
      );

      return;
    }

    if (
      origin.trim()
        .toLocaleLowerCase(
          "tr-TR"
        ) ===
      destination.trim()
        .toLocaleLowerCase(
          "tr-TR"
        )
    ) {
      setError(
        "Kalkış ve varış noktası aynı olamaz."
      );

      return;
    }

    if (
      !departureDate
    ) {
      setError(
        "Gidiş tarihi seçin."
      );

      return;
    }

    if (
      tripType ===
        "round_trip" &&
      !returnDate
    ) {
      setError(
        "Dönüş tarihi seçin."
      );

      return;
    }

    const params =
      ticketSearchToParams({
        mode,
        tripType,
        origin:
          origin.trim(),
        destination:
          destination.trim(),
        departureDate,
        returnDate:
          tripType ===
          "round_trip"
            ? returnDate
            : "",
        adults,
        children,
        infants:
          0,
      });

    router.push(
      `/biletler/sonuclar?${params.toString()}`
    );
  }


  return (
    <main className="min-h-screen bg-[#040b12] text-white">
      <Navbar />

      <section className="relative overflow-hidden px-5 pb-24 pt-32 lg:px-8">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=2400&q=92"
            alt="Turobus Bilet Marketplace"
            className="h-full w-full object-cover"
          />

          <div className="absolute inset-0 bg-gradient-to-r from-[#040b12] via-[#040b12]/94 to-[#040b12]/55" />

          <div className="absolute inset-0 bg-gradient-to-t from-[#040b12] via-transparent to-[#040b12]/45" />
        </div>

        <div className="relative mx-auto max-w-[1450px]">
          <div className="max-w-5xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-[.2em] text-orange-300 backdrop-blur-xl">
              <FaTicketAlt />
              TUROBUS TICKET MARKETPLACE
            </div>

            <h1 className="mt-7 text-5xl font-black leading-[.95] tracking-[-.05em] sm:text-7xl lg:text-[86px]">
              Yolculuğunu
              <span className="block text-orange-500">
                Tek Yerden Başlat.
              </span>
            </h1>

            <p className="mt-6 max-w-3xl text-base leading-8 text-slate-300">
              Otobüs, uçak, feribot ve tren biletleri için sağlayıcıdan bağımsız tek arama deneyimi.
              Biletini bulduktan sonra transfer, otel, villa ve diğer Turobus ürünleri aynı seyahate bağlanabilir.
            </p>
          </div>

          <div className="mt-12 rounded-[34px] border border-white/15 bg-[#07131f]/95 p-4 shadow-[0_35px_100px_rgba(0,0,0,.55)] backdrop-blur-2xl md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <TicketModeTabs
                value={mode}
                onChange={
                  setMode
                }
              />

              <div className="flex rounded-2xl border border-white/10 bg-[#030a11] p-1">
                <button
                  type="button"
                  onClick={() =>
                    setTripType(
                      "one_way"
                    )
                  }
                  className={`rounded-xl px-4 py-2.5 text-xs font-black transition ${
                    tripType ===
                    "one_way"
                      ? "bg-orange-500 text-white"
                      : "text-slate-500"
                  }`}
                >
                  Tek Yön
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setTripType(
                      "round_trip"
                    )
                  }
                  className={`rounded-xl px-4 py-2.5 text-xs font-black transition ${
                    tripType ===
                    "round_trip"
                      ? "bg-orange-500 text-white"
                      : "text-slate-500"
                  }`}
                >
                  Gidiş - Dönüş
                </button>
              </div>
            </div>

            <div className="mt-5 grid overflow-hidden rounded-[24px] border border-white/10 bg-[#030a11] lg:grid-cols-[1fr_auto_1fr_.8fr_.8fr_.7fr_auto]">
              <label className="border-b border-white/10 p-5 lg:border-b-0 lg:border-r">
                <span className="mb-2 flex items-center gap-2 text-[9px] font-black uppercase tracking-[.14em] text-slate-600">
                  <FaMapMarkerAlt />
                  Nereden?
                </span>

                <input
                  value={
                    origin
                  }
                  onChange={(event) =>
                    setOrigin(
                      event.target.value
                    )
                  }
                  placeholder="İstanbul"
                  className="w-full bg-transparent text-sm font-black outline-none placeholder:text-slate-700"
                />
              </label>

              <div className="hidden items-center justify-center px-2 lg:flex">
                <button
                  type="button"
                  onClick={swap}
                  aria-label="Kalkış ve varışı değiştir"
                  className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/[.04] text-orange-400 transition hover:bg-orange-500 hover:text-white"
                >
                  <FaExchangeAlt />
                </button>
              </div>

              <label className="border-b border-white/10 p-5 lg:border-b-0 lg:border-r">
                <span className="mb-2 flex items-center gap-2 text-[9px] font-black uppercase tracking-[.14em] text-slate-600">
                  <FaMapMarkerAlt />
                  Nereye?
                </span>

                <input
                  value={
                    destination
                  }
                  onChange={(event) =>
                    setDestination(
                      event.target.value
                    )
                  }
                  placeholder="Ankara"
                  className="w-full bg-transparent text-sm font-black outline-none placeholder:text-slate-700"
                />
              </label>

              <label className="border-b border-white/10 p-5 lg:border-b-0 lg:border-r">
                <span className="mb-2 flex items-center gap-2 text-[9px] font-black uppercase tracking-[.14em] text-slate-600">
                  <FaCalendarAlt />
                  Gidiş
                </span>

                <input
                  type="date"
                  min={
                    today()
                  }
                  value={
                    departureDate
                  }
                  onChange={(event) =>
                    setDepartureDate(
                      event.target.value
                    )
                  }
                  className="w-full bg-transparent text-sm font-black outline-none"
                />
              </label>

              <label className={`border-b border-white/10 p-5 lg:border-b-0 lg:border-r ${
                tripType ===
                "one_way"
                  ? "opacity-35"
                  : ""
              }`}>
                <span className="mb-2 flex items-center gap-2 text-[9px] font-black uppercase tracking-[.14em] text-slate-600">
                  <FaCalendarAlt />
                  Dönüş
                </span>

                <input
                  type="date"
                  disabled={
                    tripType ===
                    "one_way"
                  }
                  min={
                    departureDate ||
                    today()
                  }
                  value={
                    returnDate
                  }
                  onChange={(event) =>
                    setReturnDate(
                      event.target.value
                    )
                  }
                  className="w-full bg-transparent text-sm font-black outline-none disabled:cursor-not-allowed"
                />
              </label>

              <div className="border-b border-white/10 p-5 lg:border-b-0 lg:border-r">
                <span className="mb-2 flex items-center gap-2 text-[9px] font-black uppercase tracking-[.14em] text-slate-600">
                  <FaUsers />
                  Yolcu
                </span>

                <div className="grid grid-cols-2 gap-2">
                  <label>
                    <span className="mb-1 block text-[8px] text-slate-600">
                      Yetişkin
                    </span>

                    <select
                      value={
                        adults
                      }
                      onChange={(event) =>
                        setAdults(
                          Number(
                            event.target.value
                          )
                        )
                      }
                      className="w-full bg-transparent text-xs font-black outline-none"
                    >
                      {[1,2,3,4,5,6].map(
                        (value) => (
                          <option
                            key={
                              value
                            }
                            value={
                              value
                            }
                            className="bg-slate-950"
                          >
                            {value}
                          </option>
                        )
                      )}
                    </select>
                  </label>

                  <label>
                    <span className="mb-1 block text-[8px] text-slate-600">
                      Çocuk
                    </span>

                    <select
                      value={
                        children
                      }
                      onChange={(event) =>
                        setChildren(
                          Number(
                            event.target.value
                          )
                        )
                      }
                      className="w-full bg-transparent text-xs font-black outline-none"
                    >
                      {[0,1,2,3,4].map(
                        (value) => (
                          <option
                            key={
                              value
                            }
                            value={
                              value
                            }
                            className="bg-slate-950"
                          >
                            {value}
                          </option>
                        )
                      )}
                    </select>
                  </label>
                </div>
              </div>

              <div className="flex items-center p-3">
                <button
                  type="button"
                  onClick={
                    submit
                  }
                  className="flex min-h-[68px] w-full items-center justify-center gap-3 rounded-2xl bg-orange-500 px-8 text-sm font-black shadow-xl shadow-orange-500/20 transition hover:bg-orange-600"
                >
                  <FaSearch />
                  Bilet Ara
                </button>
              </div>
            </div>

            {error && (
              <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs font-bold text-red-300">
                {error}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="px-5 py-20 lg:px-8">
        <div className="mx-auto max-w-[1450px]">
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {[
              {
                icon:
                  FaRoute,
                title:
                  "Tek Arama Motoru",
                text:
                  "Farklı taşıma türleri aynı Turobus arama deneyiminde.",
              },
              {
                icon:
                  FaShieldAlt,
                title:
                  "Sağlayıcı Bağımsız",
                text:
                  "Arkada sağlayıcı değişse bile müşteri deneyimi değişmez.",
              },
              {
                icon:
                  FaSuitcase,
                title:
                  "Seyahate Bağlı",
                text:
                  "Bilet sonrası transfer, otel, villa ve deneyimler bağlanabilir.",
              },
              {
                icon:
                  FaCheckCircle,
                title:
                  "Tek Yolculuk Akışı",
                text:
                  "Arama, seçim, yolcu ve rezervasyon aynı sistemde.",
              },
            ].map(
              (item) => {
                const Icon =
                  item.icon;

                return (
                  <div
                    key={
                      item.title
                    }
                    className="rounded-[26px] border border-white/10 bg-[#07131f] p-6"
                  >
                    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-orange-500/10 text-orange-400">
                      <Icon />
                    </div>

                    <div className="mt-5 text-lg font-black">
                      {item.title}
                    </div>

                    <p className="mt-2 text-xs leading-6 text-slate-500">
                      {item.text}
                    </p>
                  </div>
                );
              }
            )}
          </div>

          <div className="mt-20">
            <div className="text-[10px] font-black uppercase tracking-[.2em] text-orange-400">
              POPÜLER ROTALAR
            </div>

            <h2 className="mt-3 text-4xl font-black">
              Hızlı Başla.
            </h2>

            <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {popular.map(
                ([
                  from,
                  to,
                ]) => (
                  <button
                    key={
                      `${from}-${to}`
                    }
                    type="button"
                    onClick={() => {
                      setOrigin(
                        from
                      );

                      setDestination(
                        to
                      );

                      window.scrollTo({
                        top:
                          0,
                        behavior:
                          "smooth",
                      });
                    }}
                    className="group flex items-center justify-between rounded-2xl border border-white/10 bg-[#07131f] p-5 text-left transition hover:border-orange-500/30"
                  >
                    <div>
                      <div className="text-sm font-black">
                        {from} → {to}
                      </div>

                      <div className="mt-1 text-[9px] text-slate-500">
                        Bilet seçeneklerini ara
                      </div>
                    </div>

                    <FaArrowRight className="text-slate-700 transition group-hover:text-orange-400" />
                  </button>
                )
              )}
            </div>
          </div>

          <div className="mt-20 overflow-hidden rounded-[34px] border border-orange-500/20 bg-gradient-to-r from-orange-500/10 to-transparent p-8 md:p-10">
            <div className="max-w-3xl">
              <div className="text-[10px] font-black uppercase tracking-[.2em] text-orange-300">
                PROVIDER READY
              </div>

              <h2 className="mt-4 text-3xl font-black md:text-4xl">
                Bugün ön yüz.
                Yarın canlı bilet ağı.
              </h2>

              <p className="mt-4 text-sm leading-7 text-slate-400">
                Arayüz doğrudan herhangi bir bilet şirketine bağlı değildir.
                Anlaşacağımız sağlayıcı, mevcut Turobus Ticket Engine&apos;in arkasına bağlanacaktır.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
