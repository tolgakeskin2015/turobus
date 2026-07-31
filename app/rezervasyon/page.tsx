"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import ReservationCalendar from "@/components/reservation/ReservationCalendar";
import ReservationContact from "@/components/reservation/ReservationContact";
import ReservationSummary from "@/components/reservation/ReservationSummary";
import type {
  Departure,
  ReservationResult,
  Tour,
} from "@/components/reservation/types";
import {
  FaArrowLeft,
  FaCreditCard,
} from "react-icons/fa";

export default function ReservationPage() {
  const [tour, setTour] = useState<Tour | null>(null);
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [selectedDepartureId, setSelectedDepartureId] = useState("");
  const [guests, setGuests] = useState(1);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [pageLoading, setPageLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pageError, setPageError] = useState("");

  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [result, setResult] =
    useState<ReservationResult | null>(null);

  const selectedDeparture = useMemo(
    () =>
      departures.find(
        (departure) => departure.id === selectedDepartureId
      ) ?? null,
    [departures, selectedDepartureId]
  );

  async function loadDepartures(tourId: string) {
    const today = new Date().toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from("tour_departures")
      .select(
        "id, tour_id, departure_date, capacity, reserved_count, adult_price, child_price, status"
      )
      .eq("tour_id", tourId)
      .gte("departure_date", today)
      .order("departure_date", { ascending: true });

    if (error) {
      throw error;
    }

    const loadedDepartures = (data ?? []) as Departure[];

    setDepartures(loadedDepartures);

    const firstAvailable = loadedDepartures.find(
      (departure) =>
        departure.status === "active" &&
        departure.reserved_count < departure.capacity
    );

    setSelectedDepartureId((current) => {
      const currentStillExists = loadedDepartures.some(
        (departure) =>
          departure.id === current &&
          departure.status === "active" &&
          departure.reserved_count < departure.capacity
      );

      if (currentStillExists) {
        return current;
      }

      return firstAvailable?.id ?? "";
    });

    return loadedDepartures;
  }

  useEffect(() => {
    async function loadReservationPage() {
      setPageLoading(true);
      setPageError("");

      try {
        const searchParams = new URLSearchParams(
          window.location.search
        );

        const slug = searchParams.get("tour");

        if (!slug) {
          throw new Error(
            "Rezervasyon yapılacak tur belirtilmedi."
          );
        }

        const { data: tourData, error: tourError } =
          await supabase
            .from("tours")
            .select(
              "id, slug, title, city, district, adult_price, child_price, cover_image"
            )
            .eq("slug", slug)
            .eq("status", "active")
            .maybeSingle();

        if (tourError) {
          throw tourError;
        }

        if (!tourData) {
          throw new Error(
            "Tur bulunamadı veya rezervasyona kapalı."
          );
        }

        const loadedTour = tourData as Tour;

        setTour(loadedTour);
        await loadDepartures(loadedTour.id);
      } catch (error) {
        console.error(error);

        setPageError(
          error instanceof Error
            ? error.message
            : "Rezervasyon bilgileri yüklenemedi."
        );
      } finally {
        setPageLoading(false);
      }
    }

    loadReservationPage();
  }, []);

  function handleDepartureChange(departureId: string) {
    setSelectedDepartureId(departureId);
    setGuests(1);
    setMessage(null);
    setResult(null);
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!tour || !selectedDeparture) {
      setMessage({
        type: "error",
        text: "Lütfen rezervasyon tarihi seçin.",
      });
      return;
    }

    const remaining =
      selectedDeparture.capacity -
      selectedDeparture.reserved_count;

    if (guests > remaining) {
      setMessage({
        type: "error",
        text: `Bu tarih için yalnızca ${remaining} kişilik yer kaldı.`,
      });
      return;
    }

    setSubmitting(true);
    setMessage(null);
    setResult(null);

    const { data, error } = await supabase.rpc(
      "create_tour_reservation",
      {
        p_departure_id: selectedDeparture.id,
        p_full_name: fullName.trim(),
        p_email: email.trim(),
        p_phone: phone.trim(),
        p_guests: guests,
      }
    );

    if (error) {
      console.error(error);

      let errorText = error.message;

      if (error.message.includes("Yeterli kontenjan")) {
        errorText =
          "Seçtiğiniz kişi sayısı için yeterli kontenjan kalmadı.";
      } else if (
        error.message.includes("rezervasyona kapalı")
      ) {
        errorText =
          "Bu tur tarihi artık rezervasyona kapalı.";
      }

      setMessage({
        type: "error",
        text: errorText,
      });

      setSubmitting(false);
      return;
    }

    const reservationResult =
      data as ReservationResult;

    setResult(reservationResult);

    setMessage({
      type: "success",
      text: "Rezervasyonunuz başarıyla oluşturuldu.",
    });

    setFullName("");
    setEmail("");
    setPhone("");
    setGuests(1);

    try {
      await loadDepartures(tour.id);
    } catch (refreshError) {
      console.error(refreshError);
    }

    setSubmitting(false);
  }

  if (pageLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <div className="rounded-3xl border border-white/10 bg-slate-900 p-10 text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-orange-500/20 border-t-orange-500" />

          <p className="mt-5 font-bold text-slate-400">
            Tur ve kontenjan bilgileri yükleniyor...
          </p>
        </div>
      </main>
    );
  }

  if (pageError || !tour) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <div className="max-w-lg rounded-3xl border border-red-500/20 bg-slate-900 p-10 text-center">
          <h1 className="text-3xl font-black">
            Rezervasyon açılamadı
          </h1>

          <p className="mt-4 leading-7 text-slate-400">
            {pageError ||
              "Tur bilgileri bulunamadı."}
          </p>

          <Link
            href="/turlar"
            className="mt-7 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-3 font-black transition hover:bg-orange-600"
          >
            <FaArrowLeft />
            Turlara Dön
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10 bg-slate-950/95">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500 text-xl font-black">
              T
            </div>

            <div>
              <div className="text-xl font-black">
                TUROBUS
              </div>

              <div className="text-[9px] font-bold uppercase tracking-[0.22em] text-orange-400">
                Marketplace
              </div>
            </div>
          </Link>

          <Link
            href={`/turlar/${tour.slug}`}
            className="flex items-center gap-2 text-sm font-black text-slate-300 transition hover:text-orange-400"
          >
            <FaArrowLeft />
            Tur Detayına Dön
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
        <div className="mb-10">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-orange-400">
            Güvenli rezervasyon
          </p>

          <h1 className="mt-4 text-4xl font-black tracking-tight md:text-6xl">
            Rezervasyonunu tamamla
          </h1>

          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-400">
            Açık tur tarihini seç, kalan kontenjanı kontrol et
            ve rezervasyonunu güvenle oluştur.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="grid gap-10 lg:grid-cols-[1fr_390px]"
        >
          <div className="space-y-8">
            <ReservationCalendar
              tour={tour}
              departures={departures}
              selectedDepartureId={selectedDepartureId}
              guests={guests}
              onDepartureChange={handleDepartureChange}
              onGuestsChange={setGuests}
            />

            <ReservationContact
              fullName={fullName}
              email={email}
              phone={phone}
              onFullNameChange={setFullName}
              onEmailChange={setEmail}
              onPhoneChange={setPhone}
            />

            <section className="rounded-[30px] border border-white/10 bg-slate-900 p-7">
              <h2 className="text-2xl font-black">
                Ödeme adımı
              </h2>

              <div className="mt-6 rounded-2xl border border-orange-500/20 bg-orange-500/10 p-5">
                <div className="flex items-start gap-4">
                  <FaCreditCard
                    className="mt-1 shrink-0 text-orange-400"
                    size={22}
                  />

                  <div>
                    <h3 className="font-black">
                      Online ödeme yakında açılacak
                    </h3>

                    <p className="mt-2 leading-7 text-slate-400">
                      Bu aşamada rezervasyon ve kontenjan sistemi
                      gerçek verilerle çalışmaktadır.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <ReservationSummary
            tour={tour}
            departure={selectedDeparture}
            guests={guests}
            loading={submitting}
            message={message}
            result={result}
          />
        </form>
      </section>
    </main>
  );
}
