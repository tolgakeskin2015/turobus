"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  FaCheckCircle,
  FaMapMarkerAlt,
  FaPause,
  FaPlay,
  FaSatelliteDish,
} from "react-icons/fa";

type LiveLocationShareProps = {
  reservationId: string;
};

type LocationState = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
};

export default function LiveLocationShare({
  reservationId,
}: LiveLocationShareProps) {
  const watchIdRef = useRef<number | null>(null);
  const lastSavedAtRef = useRef(0);

  const [sharing, setSharing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [location, setLocation] =
    useState<LocationState | null>(null);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function saveLocation(
    nextLocation: LocationState
  ) {
    const now = Date.now();

    // Supabase'e çok sık istek gitmesini önler.
    if (now - lastSavedAtRef.current < 10000) {
      return;
    }

    lastSavedAtRef.current = now;
    setSaving(true);

    const capturedAt = new Date().toISOString();

    const livePayload = {
      reservation_id: reservationId,
      latitude: nextLocation.latitude,
      longitude: nextLocation.longitude,
      accuracy_meters: nextLocation.accuracy,
      speed_kmh:
        nextLocation.speed !== null
          ? nextLocation.speed * 3.6
          : null,
      heading_degrees: nextLocation.heading,
      shared_by: "Rehber",
      sharing_active: true,
      captured_at: capturedAt,
      updated_at: capturedAt,
    };

    const { error: liveError } = await supabase
      .from("tour_live_locations")
      .upsert(livePayload, {
        onConflict: "reservation_id",
      });

    if (liveError) {
      setErrorMessage(liveError.message);
      setSaving(false);
      return;
    }

    const { error: historyError } = await supabase
      .from("tour_location_history")
      .insert({
        reservation_id: reservationId,
        latitude: nextLocation.latitude,
        longitude: nextLocation.longitude,
        accuracy_meters: nextLocation.accuracy,
        speed_kmh:
          nextLocation.speed !== null
            ? nextLocation.speed * 3.6
            : null,
        heading_degrees: nextLocation.heading,
        shared_by: "Rehber",
        captured_at: capturedAt,
      });

    if (historyError) {
      console.error(
        "Konum geçmişi kaydedilemedi:",
        historyError
      );
    }

    setMessage("Canlı konum güncellendi.");
    setErrorMessage("");
    setSaving(false);
  }

  function startSharing() {
    setMessage("");
    setErrorMessage("");

    if (!navigator.geolocation) {
      setErrorMessage(
        "Bu cihaz konum paylaşımını desteklemiyor."
      );
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const nextLocation: LocationState = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy:
            Number.isFinite(position.coords.accuracy)
              ? position.coords.accuracy
              : null,
          speed:
            position.coords.speed !== null &&
            Number.isFinite(position.coords.speed)
              ? position.coords.speed
              : null,
          heading:
            position.coords.heading !== null &&
            Number.isFinite(position.coords.heading)
              ? position.coords.heading
              : null,
        };

        setLocation(nextLocation);
        await saveLocation(nextLocation);
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setErrorMessage(
            "Konum izni verilmedi. Tarayıcı ayarlarından konum iznini aç."
          );
        } else if (
          error.code === error.POSITION_UNAVAILABLE
        ) {
          setErrorMessage(
            "Cihaz konumu şu anda belirlenemiyor."
          );
        } else {
          setErrorMessage(
            "Konum alınırken zaman aşımı oluştu."
          );
        }

        setSharing(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 15000,
      }
    );

    watchIdRef.current = watchId;
    setSharing(true);
  }

  async function stopSharing() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(
        watchIdRef.current
      );

      watchIdRef.current = null;
    }

    setSharing(false);

    await supabase
      .from("tour_live_locations")
      .update({
        sharing_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("reservation_id", reservationId);

    setMessage("Canlı konum paylaşımı durduruldu.");
  }

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(
          watchIdRef.current
        );
      }
    };
  }, []);

  return (
    <section className="rounded-[30px] border border-white/10 bg-slate-900 p-7 text-white">
      <div className="flex items-center gap-3">
        <FaSatelliteDish className="text-orange-400" />

        <div>
          <h2 className="text-2xl font-black">
            Canlı Araç Konumu
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            Rehber telefonunun konumunu tur aracı
            konumu olarak paylaşır.
          </p>
        </div>
      </div>

      <div className="mt-7 rounded-2xl bg-slate-950 p-6">
        <div className="flex items-center gap-3">
          <span
            className={`h-3 w-3 rounded-full ${
              sharing
                ? "animate-pulse bg-emerald-400"
                : "bg-slate-600"
            }`}
          />

          <p className="font-black">
            {sharing
              ? "Canlı konum paylaşımı aktif"
              : "Konum paylaşımı kapalı"}
          </p>
        </div>

        {location && (
          <div className="mt-5 grid gap-3 text-sm text-slate-400 sm:grid-cols-2">
            <p>
              Enlem:{" "}
              <strong className="text-white">
                {location.latitude.toFixed(6)}
              </strong>
            </p>

            <p>
              Boylam:{" "}
              <strong className="text-white">
                {location.longitude.toFixed(6)}
              </strong>
            </p>

            <p>
              Hassasiyet:{" "}
              <strong className="text-white">
                {location.accuracy
                  ? `${Math.round(location.accuracy)} metre`
                  : "Bilinmiyor"}
              </strong>
            </p>

            <p>
              Kayıt:{" "}
              <strong className="text-white">
                {saving
                  ? "Kaydediliyor..."
                  : "Güncel"}
              </strong>
            </p>
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        {!sharing ? (
          <button
            type="button"
            onClick={startSharing}
            className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-6 font-black transition hover:bg-emerald-600"
          >
            <FaPlay />
            Konum Paylaşımını Başlat
          </button>
        ) : (
          <button
            type="button"
            onClick={stopSharing}
            className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-red-500 px-6 font-black transition hover:bg-red-600"
          >
            <FaPause />
            Konum Paylaşımını Durdur
          </button>
        )}

        {location && (
          <a
            href={`https://www.google.com/maps?q=${location.latitude},${location.longitude}`}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-6 font-black"
          >
            <FaMapMarkerAlt />
            Haritada Aç
          </a>
        )}
      </div>

      {message && (
        <div className="mt-5 flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-400">
          <FaCheckCircle />
          {message}
        </div>
      )}

      {errorMessage && (
        <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-bold text-red-400">
          {errorMessage}
        </div>
      )}
    </section>
  );
}
