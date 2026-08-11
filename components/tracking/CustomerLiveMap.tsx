"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import type {
  Map as MapLibreMap,
  Marker as MapLibreMarker,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  FaBus,
  FaClock,
  FaMapMarkerAlt,
  FaSatelliteDish,
} from "react-icons/fa";
import { supabase } from "@/lib/supabase";

type CustomerLiveMapProps = {
  reservationId: string;
  reservationCode?: string | null;
};

type LiveLocation = {
  reservation_id: string;
  latitude: number;
  longitude: number;
  accuracy_meters: number | null;
  speed_kmh: number | null;
  heading_degrees: number | null;
  location_name: string | null;
  sharing_active: boolean;
  captured_at: string;
  updated_at: string;
};

function minutesSince(date: string) {
  return Math.max(
    0,
    Math.floor(
      (Date.now() - new Date(date).getTime()) / 60000
    )
  );
}

export default function CustomerLiveMap({
  reservationId,
  reservationCode,
}: CustomerLiveMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<MapLibreMarker | null>(null);

  const [location, setLocation] =
    useState<LiveLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadLocation = useCallback(async () => {
    if (!reservationCode) {
      setLocation(null);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.rpc(
      "get_public_tour_tracking",
      {
        p_code: reservationCode,
      }
    );

    if (error) {
      console.error(
        "Müşteri canlı konum hatası:",
        error
      );
      setErrorMessage(
        "Araç konumu yüklenemedi."
      );
      setLoading(false);
      return;
    }

    const payload = data as {
      live_location: LiveLocation | null;
    } | null;

    setLocation(
      payload?.live_location ?? null
    );
    setErrorMessage("");
    setLoading(false);
  }, [reservationCode]);

  useEffect(() => {
    void loadLocation();

    const timer = window.setInterval(() => {
      void loadLocation();
    }, 10000);

    return () => {
      window.clearInterval(timer);
    };
  }, [loadLocation]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://demotiles.maplibre.org/style.json",
      center: [29.1263, 36.6217],
      zoom: 10,
    });

    map.addControl(
      new maplibregl.NavigationControl({
        showCompass: true,
        showZoom: true,
      }),
      "top-right"
    );

    mapRef.current = map;

    return () => {
      markerRef.current?.remove();
      markerRef.current = null;

      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !location) return;

    const longitude = Number(location.longitude);
    const latitude = Number(location.latitude);

    if (
      !Number.isFinite(longitude) ||
      !Number.isFinite(latitude)
    ) {
      return;
    }

    const position: [number, number] = [
      longitude,
      latitude,
    ];

    if (!markerRef.current) {
      const markerElement =
        document.createElement("div");

      markerElement.className =
        "flex h-14 w-14 items-center justify-center rounded-full border-4 border-white bg-orange-500 text-2xl shadow-2xl";

      markerElement.textContent = "🚌";

      markerRef.current = new maplibregl.Marker({
        element: markerElement,
        rotation:
          location.heading_degrees !== null
            ? Number(location.heading_degrees)
            : 0,
      })
        .setLngLat(position)
        .addTo(map);
    } else {
      markerRef.current.setLngLat(position);

      if (location.heading_degrees !== null) {
        markerRef.current.setRotation(
          Number(location.heading_degrees)
        );
      }
    }

    map.easeTo({
      center: position,
      zoom: 14,
      duration: 1200,
    });
  }, [location]);

  const signalAge = location
    ? minutesSince(location.updated_at)
    : null;

  const isFresh =
    location?.sharing_active &&
    signalAge !== null &&
    signalAge <= 5;

  return (
    <section className="overflow-hidden rounded-[32px] border border-white/10 bg-slate-900">
      <div className="flex flex-col justify-between gap-4 border-b border-white/10 p-6 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/15 text-orange-400">
            <FaBus size={22} />
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-400">
              Canlı araç takibi
            </p>

            <h2 className="mt-1 text-2xl font-black">
              Tur Aracınız
            </h2>
          </div>
        </div>

        <div
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-black ${
            isFresh
              ? "bg-emerald-500/10 text-emerald-400"
              : "bg-amber-500/10 text-amber-400"
          }`}
        >
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              isFresh
                ? "animate-pulse bg-emerald-400"
                : "bg-amber-400"
            }`}
          />

          {isFresh
            ? "Araç canlı"
            : "Canlı sinyal bekleniyor"}
        </div>
      </div>

      {errorMessage && (
        <div className="border-b border-red-500/20 bg-red-500/10 p-4 text-sm font-bold text-red-400">
          {errorMessage}
        </div>
      )}

      <div className="relative">
        <div
          ref={containerRef}
          className="h-[420px] w-full"
        />

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/75 font-black">
            Araç konumu yükleniyor...
          </div>
        )}

        {!loading && !location && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/85 px-6 text-center">
            <FaSatelliteDish
              size={32}
              className="text-orange-400"
            />

            <h3 className="mt-5 text-xl font-black">
              Konum paylaşımı henüz başlamadı
            </h3>

            <p className="mt-3 max-w-md text-sm leading-6 text-slate-400">
              Rehber konum paylaşımını başlattığında araç
              burada otomatik olarak görünecek.
            </p>
          </div>
        )}
      </div>

      {location && (
        <div className="grid gap-4 border-t border-white/10 p-6 sm:grid-cols-3">
          <div className="rounded-2xl bg-slate-950 p-4">
            <p className="flex items-center gap-2 text-xs text-slate-500">
              <FaClock className="text-orange-400" />
              Son sinyal
            </p>

            <p className="mt-2 font-black">
              {signalAge === 0
                ? "Az önce"
                : `${signalAge} dakika önce`}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-950 p-4">
            <p className="flex items-center gap-2 text-xs text-slate-500">
              <FaBus className="text-orange-400" />
              Araç hızı
            </p>

            <p className="mt-2 font-black">
              {location.speed_kmh !== null
                ? `${Math.round(location.speed_kmh)} km/s`
                : "Bilinmiyor"}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-950 p-4">
            <p className="flex items-center gap-2 text-xs text-slate-500">
              <FaMapMarkerAlt className="text-orange-400" />
              Konum
            </p>

            <p className="mt-2 truncate font-black">
              {location.location_name || "Canlı koordinat"}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
