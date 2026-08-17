"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import {
  FaArrowRight,
  FaBus,
  FaCheck,
  FaClock,
  FaExchangeAlt,
  FaFilter,
  FaPlane,
  FaShip,
  FaSuitcase,
  FaTimes,
  FaTrain,
} from "react-icons/fa";

import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";

import {
  activeTicketProvider,
} from "@/lib/tickets/provider";

import {
  ticketSearchFromParams,
  ticketSearchToParams,
} from "@/lib/tickets/query";

import type {
  TicketOffer,
  TicketSearchInput,
  TicketSort,
} from "@/lib/tickets/types";


function money(
  value: number,
  currency: string
) {
  return new Intl.NumberFormat(
    "tr-TR",
    {
      style:
        "currency",
      currency,
      maximumFractionDigits:
        0,
    }
  ).format(value);
}


function duration(
  minutes: number
) {
  const hours =
    Math.floor(
      minutes / 60
    );

  const remaining =
    minutes % 60;

  return `${hours} sa ${remaining} dk`;
}


function ModeIcon({
  mode,
}: {
  mode:
    TicketOffer["mode"];
}) {
  if (
    mode === "flight"
  ) {
    return <FaPlane />;
  }

  if (
    mode === "ferry"
  ) {
    return <FaShip />;
  }

  if (
    mode === "train"
  ) {
    return <FaTrain />;
  }

  return <FaBus />;
}


export default function TicketResultsPage() {
  const [
    search,
    setSearch,
  ] =
    useState<TicketSearchInput | null>(
      null
    );

  const [
    offers,
    setOffers,
  ] =
    useState<TicketOffer[]>(
      []
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    sort,
    setSort,
  ] =
    useState<TicketSort>(
      "recommended"
    );

  const [
    refundableOnly,
    setRefundableOnly,
  ] =
    useState(false);

  const [
    directOnly,
    setDirectOnly,
  ] =
    useState(false);

  const [
    maxPrice,
    setMaxPrice,
  ] =
    useState("");

  const [
    mobileFilters,
    setMobileFilters,
  ] =
    useState(false);


  useEffect(
    () => {
      const params =
        new URLSearchParams(
          window.location.search
        );

      const next =
        ticketSearchFromParams(
          params
        );

      setSearch(
        next
      );

      async function load() {
        setLoading(
          true
        );

        const rows =
          await activeTicketProvider.search(
            next
          );

        setOffers(
          rows
        );

        setLoading(
          false
        );
      }

      void load();
    },
    []
  );


  const results =
    useMemo(
      () => {
        let rows =
          offers.filter(
            (offer) => {
              if (
                refundableOnly &&
                !offer.refundable
              ) {
                return false;
              }

              if (
                directOnly &&
                !offer.direct
              ) {
                return false;
              }

              if (
                maxPrice &&
                offer.price >
                  Number(
                    maxPrice
                  )
              ) {
                return false;
              }

              return true;
            }
          );

        rows =
          [...rows];

        if (
          sort === "price"
        ) {
          rows.sort(
            (a, b) =>
              a.price -
              b.price
          );
        }

        if (
          sort ===
          "fastest"
        ) {
          rows.sort(
            (a, b) =>
              a.durationMinutes -
              b.durationMinutes
          );
        }

        if (
          sort ===
          "earliest"
        ) {
          rows.sort(
            (a, b) =>
              a.departureTime.localeCompare(
                b.departureTime
              )
          );
        }

        return rows;
      },
      [
        offers,
        refundableOnly,
        directOnly,
        maxPrice,
        sort,
      ]
    );


  if (!search) {
    return null;
  }


  const baseParams =
    ticketSearchToParams(
      search
    );


  const filterPanel = (
    <div className="space-y-6">
      <div>
        <div className="text-sm font-black">
          Filtreler
        </div>

        <div className="mt-1 text-[10px] text-slate-500">
          Sonuçları ihtiyacına göre daralt.
        </div>
      </div>

      <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-white/10 p-3">
        <span className="text-xs font-bold">
          Direkt / aktarmasız
        </span>

        <input
          type="checkbox"
          checked={
            directOnly
          }
          onChange={(event) =>
            setDirectOnly(
              event.target.checked
            )
          }
        />
      </label>

      <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-white/10 p-3">
        <span className="text-xs font-bold">
          İade edilebilir
        </span>

        <input
          type="checkbox"
          checked={
            refundableOnly
          }
          onChange={(event) =>
            setRefundableOnly(
              event.target.checked
            )
          }
        />
      </label>

      <label>
        <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
          Maksimum fiyat
        </span>

        <input
          type="number"
          min="0"
          value={
            maxPrice
          }
          onChange={(event) =>
            setMaxPrice(
              event.target.value
            )
          }
          placeholder="Örn. 3000"
          className="w-full rounded-xl border border-white/10 bg-[#030a11] px-4 py-3 text-sm outline-none"
        />
      </label>
    </div>
  );


  return (
    <main className="min-h-screen bg-[#040b12] text-white">
      <Navbar />

      <section className="border-b border-white/10 bg-[#07131f] px-5 pb-8 pt-28 lg:px-8">
        <div className="mx-auto max-w-[1450px]">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.17em] text-orange-400">
                <ModeIcon
                  mode={
                    search.mode
                  }
                />

                BİLET SONUÇLARI
              </div>

              <h1 className="mt-2 text-3xl font-black">
                {search.origin}
                <FaArrowRight className="mx-3 inline text-sm text-orange-500" />
                {search.destination}
              </h1>

              <div className="mt-2 text-xs text-slate-500">
                {search.departureDate}
                {" · "}
                {search.adults +
                  search.children +
                  search.infants} yolcu
              </div>
            </div>

            <Link
              href={`/biletler?${baseParams.toString()}`}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-4 py-3 text-xs font-black hover:border-orange-500/30"
            >
              <FaExchangeAlt />
              Aramayı Değiştir
            </Link>
          </div>
        </div>
      </section>

      <section className="px-5 py-10 lg:px-8">
        <div className="mx-auto grid max-w-[1450px] gap-7 lg:grid-cols-[280px_1fr]">
          <aside className="hidden rounded-[24px] border border-white/10 bg-[#07131f] p-5 lg:block">
            {filterPanel}
          </aside>

          <div>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-2xl font-black">
                  {results.length}
                </span>

                <span className="ml-2 text-xs text-slate-500">
                  sefer bulundu
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setMobileFilters(
                      true
                    )
                  }
                  className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-xs font-black lg:hidden"
                >
                  <FaFilter />
                  Filtre
                </button>

                <label>
                  <span className="sr-only">
                    Sıralama
                  </span>

                  <select
                    value={
                      sort
                    }
                    onChange={(event) =>
                      setSort(
                        event.target.value as TicketSort
                      )
                    }
                    className="rounded-xl border border-white/10 bg-[#07131f] px-4 py-3 text-xs font-black outline-none"
                  >
                    <option value="recommended">
                      Önerilen
                    </option>

                    <option value="price">
                      En Ucuz
                    </option>

                    <option value="fastest">
                      En Hızlı
                    </option>

                    <option value="earliest">
                      En Erken
                    </option>
                  </select>
                </label>
              </div>
            </div>

            {loading ? (
              <div className="space-y-4">
                {[1,2,3,4].map(
                  (item) => (
                    <div
                      key={
                        item
                      }
                      className="h-48 animate-pulse rounded-[26px] bg-white/[.04]"
                    />
                  )
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {results.map(
                  (offer) => {
                    const params =
                      new URLSearchParams(
                        baseParams
                      );

                    params.set(
                      "offerId",
                      offer.id
                    );

                    return (
                      <div
                        key={
                          offer.id
                        }
                        className="overflow-hidden rounded-[26px] border border-white/10 bg-[#07131f] transition hover:border-orange-500/30"
                      >
                        <div className="grid gap-5 p-5 md:grid-cols-[170px_1fr_auto] md:items-center">
                          <div>
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-sm font-black text-slate-950">
                              {offer.carrierCode}
                            </div>

                            <div className="mt-3 text-sm font-black">
                              {offer.carrierName}
                            </div>

                            <div className="mt-1 text-[9px] text-slate-500">
                              {offer.vehicleLabel}
                            </div>
                          </div>

                          <div>
                            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4">
                              <div>
                                <div className="text-2xl font-black">
                                  {offer.departureTime}
                                </div>

                                <div className="mt-1 max-w-[150px] truncate text-[10px] text-slate-500">
                                  {offer.origin}
                                </div>
                              </div>

                              <div>
                                <div className="text-center text-[9px] text-slate-500">
                                  {duration(
                                    offer.durationMinutes
                                  )}
                                </div>

                                <div className="my-2 flex items-center">
                                  <span className="h-2 w-2 rounded-full border-2 border-orange-500" />

                                  <span className="h-px flex-1 bg-white/15" />

                                  <ModeIcon
                                    mode={
                                      offer.mode
                                    }
                                  />

                                  <span className="h-px flex-1 bg-white/15" />

                                  <span className="h-2 w-2 rounded-full bg-orange-500" />
                                </div>

                                <div className="text-center text-[9px] font-bold text-emerald-400">
                                  {offer.direct
                                    ? "Direkt"
                                    : `${offer.stops} aktarma`}
                                </div>
                              </div>

                              <div className="text-right">
                                <div className="text-2xl font-black">
                                  {offer.arrivalTime}
                                </div>

                                <div className="mt-1 max-w-[150px] truncate text-[10px] text-slate-500">
                                  {offer.destination}
                                </div>
                              </div>
                            </div>

                            <div className="mt-5 flex flex-wrap gap-2">
                              {offer.baggageLabel && (
                                <span className="flex items-center gap-1.5 rounded-full bg-white/[.05] px-3 py-1.5 text-[9px] font-bold text-slate-400">
                                  <FaSuitcase />
                                  {offer.baggageLabel}
                                </span>
                              )}

                              {offer.refundable && (
                                <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-[9px] font-bold text-emerald-300">
                                  <FaCheck />
                                  İade edilebilir
                                </span>
                              )}

                              {offer.changeable && (
                                <span className="rounded-full bg-white/[.05] px-3 py-1.5 text-[9px] font-bold text-slate-400">
                                  Değişiklik yapılabilir
                                </span>
                              )}

                              {offer.remainingSeats && (
                                <span className="rounded-full bg-orange-500/10 px-3 py-1.5 text-[9px] font-bold text-orange-300">
                                  {offer.remainingSeats} koltuk
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="min-w-[180px] border-t border-white/10 pt-5 text-right md:border-l md:border-t-0 md:pl-5 md:pt-0">
                            <div className="text-[9px] uppercase text-slate-600">
                              Kişi başı
                            </div>

                            <div className="mt-1 text-2xl font-black text-orange-400">
                              {money(
                                offer.price,
                                offer.currency
                              )}
                            </div>

                            <div className="mt-1 text-[9px] text-slate-500">
                              Vergiler dahil ön izleme
                            </div>

                            <Link
                              href={`/biletler/rezervasyon?${params.toString()}`}
                              className="mt-4 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 text-xs font-black transition hover:bg-orange-600"
                            >
                              Seç
                              <FaArrowRight />
                            </Link>
                          </div>
                        </div>

                        {offer.badges.length > 0 && (
                          <div className="flex gap-2 border-t border-white/10 px-5 py-3">
                            {offer.badges.map(
                              (badge) => (
                                <span
                                  key={
                                    badge
                                  }
                                  className="rounded-full bg-orange-500/10 px-3 py-1 text-[8px] font-black uppercase text-orange-300"
                                >
                                  {badge}
                                </span>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    );
                  }
                )}

                {results.length === 0 && (
                  <div className="rounded-[26px] border border-white/10 bg-[#07131f] p-10 text-center">
                    <div className="text-xl font-black">
                      Bu filtrelerle sonuç bulunamadı.
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setDirectOnly(
                          false
                        );

                        setRefundableOnly(
                          false
                        );

                        setMaxPrice(
                          ""
                        );
                      }}
                      className="mt-4 text-sm font-black text-orange-400"
                    >
                      Filtreleri temizle
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {mobileFilters && (
        <div className="fixed inset-0 z-[100] bg-[#040b12] p-5 lg:hidden">
          <div className="flex items-center justify-between">
            <div className="text-xl font-black">
              Filtreler
            </div>

            <button
              type="button"
              onClick={() =>
                setMobileFilters(
                  false
                )
              }
              className="grid h-11 w-11 place-items-center rounded-xl border border-white/10"
            >
              <FaTimes />
            </button>
          </div>

          <div className="mt-8">
            {filterPanel}
          </div>

          <button
            type="button"
            onClick={() =>
              setMobileFilters(
                false
              )
            }
            className="mt-8 w-full rounded-xl bg-orange-500 py-4 font-black"
          >
            Sonuçları Göster
          </button>
        </div>
      )}

      <Footer />
    </main>
  );
}
