"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import type {
  Map as MapLibreMap,
  Marker as MapLibreMarker,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { supabase } from "@/lib/supabase";

type LiveVehicle = {
  reservation_id: string;
  latitude: number;
  longitude: number;
  speed_kmh: number | null;
  heading_degrees: number | null;
  location_name: string | null;
  sharing_active: boolean;
  captured_at: string;
  updated_at: string;
  reservation?: {
    reservation_code: string | null;
    tour_title: string;
    full_name: string;
    guests: number;
    tour_date: string;
  } | null;
};

function vehicleStatus(vehicle: LiveVehicle) {
  const lastUpdate = new Date(vehicle.updated_at).getTime();
  const minutesAgo = (Date.now() - lastUpdate) / 60000;

  if (!vehicle.sharing_active) return "Konum kapalı";
  if (minutesAgo > 5) return "Bağlantı gecikmeli";
  return "Canlı";
}

export default function LiveFleetMap() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<
    globalThis.Map<string, MapLibreMarker>
  >(new globalThis.Map());

  const [vehicles, setVehicles] = useState<LiveVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] =
    useState<LiveVehicle | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const loadVehicles = useCallback(async () => {
    const { data, error } = await supabase
      .from("tour_live_locations")
      .select(`
        reservation_id,
        latitude,
        longitude,
        speed_kmh,
        heading_degrees,
        location_name,
        sharing_active,
        captured_at,
        updated_at,
        reservation:reservations (
          reservation_code,
          tour_title,
          full_name,
          guests,
          tour_date
        )
      `)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Canlı araçlar yüklenemedi:", error);
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    setVehicles((data ?? []) as unknown as LiveVehicle[]);
    setErrorMessage("");
    setLoading(false);
  }, []);

  useEffect(() => {
    loadVehicles();

    const channel = supabase
      .channel("command-center-live-fleet")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tour_live_locations",
        },
        () => {
          loadVehicles();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadVehicles]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://demotiles.maplibre.org/style.json",
      center: [29.1263, 36.6217],
      zoom: 9,
    });

    map.addControl(
      new maplibregl.NavigationControl(),
      "top-right"
    );

    mapRef.current = map;
  }, []);

  useEffect(() => {
    const map = mapRef.current;

    if (!map) return;

    const activeIds = new Set(
      vehicles.map((vehicle) => vehicle.reservation_id)
    );

    markersRef.current.forEach((marker, reservationId) => {
      if (!activeIds.has(reservationId)) {
        marker.remove();
        markersRef.current.delete(reservationId);
      }
    });

    vehicles.forEach((vehicle) => {
      const position: [number, number] = [
        Number(vehicle.longitude),
        Number(vehicle.latitude),
      ];

      const existingMarker = markersRef.current.get(
        vehicle.reservation_id
      );

      if (existingMarker) {
        existingMarker.setLngLat(position);
        return;
      }

      const element = document.createElement("button");

      element.type = "button";
      element.title =
        vehicle.reservation?.tour_title || "TUROBUS aracı";

      element.className =
        "flex h-11 w-11 items-center justify-center rounded-full border-4 border-white bg-orange-500 text-xl shadow-2xl transition hover:scale-110";

      element.textContent = "🚌";

      element.addEventListener("click", () => {
        setSelectedVehicle(vehicle);

        map.flyTo({
          center: position,
          zoom: 14,
          speed: 1.2,
        });
      });

      const marker = new maplibregl.Marker({
        element,
        rotation:
          vehicle.heading_degrees !== null
            ? Number(vehicle.heading_degrees)
            : 0,
      })
        .setLngLat(position)
        .addTo(map);

      markersRef.current.set(
        vehicle.reservation_id,
        marker
      );
    });

    if (
      vehicles.length > 0 &&
      !selectedVehicle &&
      map.loaded()
    ) {
      const bounds = new maplibregl.LngLatBounds();

      vehicles.forEach((vehicle) => {
        bounds.extend([
          Number(vehicle.longitude),
          Number(vehicle.latitude),
        ]);
      });

      map.fitBounds(bounds, {
        padding: 80,
        maxZoom: 13,
      });
    }
  }, [vehicles, selectedVehicle]);

  useEffect(() => {
    return () => {
      markersRef.current.forEach((marker) =>
        marker.remove()
      );

      markersRef.current.clear();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <section className="overflow-hidden rounded-[32px] border border-white/10 bg-slate-900">
      <div className="flex flex-col justify-between gap-4 border-b border-white/10 p-6 md:flex-row md:items-center">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-400">
            Realtime filo
          </p>

          <h2 className="mt-2 text-2xl font-black text-white">
            Canlı Araç Haritası
          </h2>
        </div>

        <div className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-2 text-sm font-black text-emerald-400">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400" />
          {vehicles.filter((vehicle) => vehicle.sharing_active).length} araç canlı
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
          className="h-[560px] w-full"
        />

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 text-sm font-black text-white">
            Araç konumları yükleniyor...
          </div>
        )}

        {selectedVehicle && (
          <aside className="absolute bottom-5 left-5 right-5 rounded-3xl border border-white/10 bg-slate-950/95 p-5 text-white shadow-2xl backdrop-blur-xl md:right-auto md:w-[380px]">
            <button
              type="button"
              onClick={() => setSelectedVehicle(null)}
              className="absolute right-4 top-4 text-slate-500 hover:text-white"
            >
              ✕
            </button>

            <p className="text-xs font-black uppercase tracking-wider text-orange-400">
              {selectedVehicle.reservation?.reservation_code ??
                "TUROBUS"}
            </p>

            <h3 className="mt-2 pr-8 text-xl font-black">
              {selectedVehicle.reservation?.tour_title ??
                "Canlı Tur Aracı"}
            </h3>

            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl bg-white/[0.05] p-4">
                <p className="text-slate-500">Durum</p>
                <p className="mt-1 font-black">
                  {vehicleStatus(selectedVehicle)}
                </p>
              </div>

              <div className="rounded-2xl bg-white/[0.05] p-4">
                <p className="text-slate-500">Hız</p>
                <p className="mt-1 font-black">
                  {selectedVehicle.speed_kmh !== null
                    ? `${Math.round(selectedVehicle.speed_kmh)} km/s`
                    : "Bilinmiyor"}
                </p>
              </div>

              <div className="rounded-2xl bg-white/[0.05] p-4">
                <p className="text-slate-500">Misafir</p>
                <p className="mt-1 font-black">
                  {selectedVehicle.reservation?.guests ?? 0} kişi
                </p>
              </div>

              <div className="rounded-2xl bg-white/[0.05] p-4">
                <p className="text-slate-500">Son sinyal</p>
                <p className="mt-1 font-black">
                  {new Date(
                    selectedVehicle.updated_at
                  ).toLocaleTimeString("tr-TR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>

            {selectedVehicle.location_name && (
              <p className="mt-4 text-sm text-slate-400">
                📍 {selectedVehicle.location_name}
              </p>
            )}

            <a
              href={`https://www.google.com/maps?q=${selectedVehicle.latitude},${selectedVehicle.longitude}`}
              target="_blank"
              rel="noreferrer"
              className="mt-5 flex min-h-12 items-center justify-center rounded-xl bg-orange-500 px-5 text-sm font-black"
            >
              Haritada Aç
            </a>
          </aside>
        )}
      </div>
    </section>
  );
}
