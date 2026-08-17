"use client";

import {
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import {
  FaArrowRight,
  FaCheckCircle,
  FaHotel,
  FaMapMarkerAlt,
  FaRoute,
  FaTicketAlt,
} from "react-icons/fa";

import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";

import type {
  TicketBookingDraft,
} from "@/lib/tickets/types";


export default function TicketConfirmationPage() {
  const [
    booking,
    setBooking,
  ] =
    useState<TicketBookingDraft | null>(
      null
    );

  useEffect(
    () => {
      const params =
        new URLSearchParams(
          window.location.search
        );

      const code =
        params.get(
          "code"
        );

      if (!code) {
        return;
      }

      const raw =
        window.localStorage.getItem(
          `turobus_ticket_${code}`
        );

      if (!raw) {
        return;
      }

      try {
        setBooking(
          JSON.parse(
            raw
          )
        );
      } catch {
        setBooking(
          null
        );
      }
    },
    []
  );


  return (
    <main className="min-h-screen bg-[#040b12] text-white">
      <Navbar />

      <section className="px-5 pb-20 pt-36 lg:px-8">
        <div className="mx-auto max-w-[1000px]">
          {!booking ? (
            <div className="rounded-[30px] border border-white/10 bg-[#07131f] p-10 text-center">
              <div className="text-2xl font-black">
                Rezervasyon kaydı bulunamadı.
              </div>

              <Link
                href="/biletler"
                className="mt-6 inline-flex rounded-xl bg-orange-500 px-6 py-4 font-black"
              >
                Bilet Aramaya Dön
              </Link>
            </div>
          ) : (
            <>
              <div className="rounded-[34px] border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-[#07131f] to-[#07131f] p-8 md:p-10">
                <div className="grid h-16 w-16 place-items-center rounded-full bg-emerald-500 text-2xl">
                  <FaCheckCircle />
                </div>

                <div className="mt-6 text-[10px] font-black uppercase tracking-[.18em] text-emerald-300">
                  ÖN REZERVASYON AKIŞI TAMAMLANDI
                </div>

                <h1 className="mt-3 text-4xl font-black md:text-5xl">
                  Yolculuk hazır.
                </h1>

                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400">
                  Turobus bilet ön yüzü uçtan uca çalışıyor. Gerçek sağlayıcı bağlandığında bu kayıt canlı PNR ve ödeme işlemiyle tamamlanacak.
                </p>

                <div className="mt-7 inline-flex rounded-2xl border border-white/10 bg-[#030a11] px-5 py-4">
                  <div>
                    <div className="text-[9px] uppercase text-slate-600">
                      Turobus Referansı
                    </div>

                    <div className="mt-1 text-xl font-black text-orange-400">
                      {booking.code}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <div className="rounded-[26px] border border-white/10 bg-[#07131f] p-6">
                  <div className="flex items-center gap-3">
                    <FaTicketAlt className="text-orange-400" />

                    <div className="font-black">
                      Bilet Özeti
                    </div>
                  </div>

                  <div className="mt-5 text-2xl font-black">
                    {booking.offer.origin}
                    <FaArrowRight className="mx-3 inline text-sm text-orange-500" />
                    {booking.offer.destination}
                  </div>

                  <div className="mt-3 text-sm text-slate-500">
                    {booking.offer.departureDate}
                    {" · "}
                    {booking.offer.departureTime}
                    {" · "}
                    {booking.offer.carrierName}
                  </div>

                  <div className="mt-5 rounded-xl bg-white/[.04] p-4">
                    <div className="text-[9px] uppercase text-slate-600">
                      Sağlayıcı Hold
                    </div>

                    <div className="mt-1 text-xs font-black">
                      {booking.hold.providerReference}
                    </div>
                  </div>
                </div>

                <div className="rounded-[26px] border border-white/10 bg-[#07131f] p-6">
                  <div className="flex items-center gap-3">
                    <FaRoute className="text-orange-400" />

                    <div className="font-black">
                      Seyahatini Tamamla
                    </div>
                  </div>

                  <p className="mt-3 text-xs leading-6 text-slate-500">
                    Turobus Marketplace&apos;te aynı yolculuğa konaklama, transfer ve deneyim ekleyebilirsin.
                  </p>

                  <div className="mt-5 grid gap-2">
                    <Link
                      href={`/transfer?destination=${encodeURIComponent(
                        booking.offer.destination
                      )}`}
                      className="flex items-center justify-between rounded-xl border border-white/10 p-4 text-xs font-black hover:border-orange-500/30"
                    >
                      Transfer Ekle
                      <FaArrowRight />
                    </Link>

                    <Link
                      href={`/oteller?destination=${encodeURIComponent(
                        booking.offer.destination
                      )}`}
                      className="flex items-center justify-between rounded-xl border border-white/10 p-4 text-xs font-black hover:border-orange-500/30"
                    >
                      <span className="flex items-center gap-2">
                        <FaHotel />
                        Otel Bul
                      </span>

                      <FaArrowRight />
                    </Link>

                    <Link
                      href={`/villalar?destination=${encodeURIComponent(
                        booking.offer.destination
                      )}`}
                      className="flex items-center justify-between rounded-xl border border-white/10 p-4 text-xs font-black hover:border-orange-500/30"
                    >
                      <span className="flex items-center gap-2">
                        <FaMapMarkerAlt />
                        Villa Bul
                      </span>

                      <FaArrowRight />
                    </Link>

                    <Link
                      href={`/aktiviteler?destination=${encodeURIComponent(
                        booking.offer.destination
                      )}`}
                      className="flex items-center justify-between rounded-xl border border-white/10 p-4 text-xs font-black hover:border-orange-500/30"
                    >
                      Aktivite Ekle
                      <FaArrowRight />
                    </Link>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}
