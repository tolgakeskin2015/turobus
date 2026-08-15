"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

export type NetworkSelection = {
  resourceId: string;
  unitId: string;
  resourceType: "hotel" | "tour";
  resourceName: string;
  unitName: string;
  quantity: number;
};

type Availability = {
  configured?: boolean;
  available?: number | null;
  capacity?: number | null;
  reserved?: number | null;
  departure_date?: string | null;
  status?: string | null;
  stop_sale?: boolean;
  adult_price?: number | null;
};

type NetworkUnit = {
  unit_id: string;
  unit_type: string;
  name: string;
  is_active: boolean;
  availability?: Availability;
};

type NetworkResource = {
  resource_id: string;
  resource_type: "hotel" | "tour";
  source_system: string;
  name: string;
  city?: string | null;
  district?: string | null;
  units?: NetworkUnit[];
};

type Props = {
  companyId: string;
  checkIn: string;
  checkOut: string;
  people: number;
  roomCount: number;
  value: NetworkSelection[];
  onChange: (value: NetworkSelection[]) => void;
};

export default function NetworkInventoryPicker({
  companyId,
  checkIn,
  checkOut,
  people,
  roomCount,
  value,
  onChange,
}: Props) {
  const [resources, setResources] = useState<NetworkResource[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!companyId) return;

    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      const { data, error: rpcError } = await supabase.rpc(
        "get_turobus_network_live_catalog",
        {
          p_company_id: companyId,
          p_start_date: checkIn || null,
          p_end_date: checkOut || null,
          p_resource_type: null,
        }
      );

      if (!active) return;

      if (rpcError) {
        setError(rpcError.message);
        setResources([]);
      } else {
        const result = data as { resources?: NetworkResource[] };

        setResources(
          (result.resources ?? []).filter(
            (item) =>
              item.resource_type === "hotel" ||
              item.resource_type === "tour"
          )
        );
      }

      setLoading(false);
    }

    void load();

    return () => {
      active = false;
    };
  }, [companyId, checkIn, checkOut]);

  const visible = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("tr-TR");

    if (!q) return resources;

    return resources.filter((resource) => {
      const text = [
        resource.name,
        resource.city,
        resource.district,
        ...(resource.units ?? []).map((unit) => unit.name),
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("tr-TR");

      return text.includes(q);
    });
  }, [resources, search]);

  function selected(unitId: string) {
    return value.some((item) => item.unitId === unitId);
  }

  function toggle(resource: NetworkResource, unit: NetworkUnit) {
    if (selected(unit.unit_id)) {
      onChange(value.filter((item) => item.unitId !== unit.unit_id));
      return;
    }

    onChange([
      ...value,
      {
        resourceId: resource.resource_id,
        unitId: unit.unit_id,
        resourceType: resource.resource_type,
        resourceName: resource.name,
        unitName: unit.name,
        quantity:
          resource.resource_type === "hotel"
            ? Math.max(roomCount, 1)
            : Math.max(people, 1),
      },
    ]);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.04] p-4">
        <div className="text-xs font-black uppercase tracking-[0.18em] text-cyan-400">
          TUROBUS NETWORK
        </div>

        <div className="mt-2 text-lg font-black">
          Canlı Otel ve Tur Envanteri
        </div>

        <p className="mt-1 text-sm text-slate-400">
          Hotel OS ve Tour OS içindeki gerçek ürünleri ve kalan kapasiteyi
          burada görürsün.
        </p>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Otel, tur veya şehir ara..."
          className="mt-4 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm"
        />
      </div>

      {loading && (
        <div className="rounded-xl border border-white/10 p-4 text-sm text-slate-400">
          Network yükleniyor...
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {!loading &&
        !error &&
        visible.map((resource) => (
          <div
            key={resource.resource_id}
            className="rounded-2xl border border-white/10 bg-slate-950 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-black">{resource.name}</div>

                <div className="mt-1 text-xs text-slate-500">
                  {resource.resource_type === "hotel"
                    ? "HOTEL OS"
                    : "TOUR OS"}
                  {resource.city ? ` · ${resource.city}` : ""}
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {(resource.units ?? []).map((unit) => {
                const available = unit.availability?.available;

                const blocked =
                  unit.availability?.stop_sale === true ||
                  (typeof available === "number" && available <= 0);

                const isSelected = selected(unit.unit_id);

                return (
                  <button
                    key={unit.unit_id}
                    type="button"
                    disabled={blocked}
                    onClick={() => toggle(resource, unit)}
                    className={`rounded-xl border p-4 text-left ${
                      isSelected
                        ? "border-cyan-400 bg-cyan-500/10"
                        : blocked
                        ? "cursor-not-allowed border-red-500/20 opacity-50"
                        : "border-white/10 hover:border-cyan-500/30"
                    }`}
                  >
                    <div className="font-black">{unit.name}</div>

                    <div className="mt-2 text-xs text-slate-400">
                      Kalan:{" "}
                      <span className="font-black text-emerald-300">
                        {typeof available === "number" ? available : "—"}
                      </span>
                    </div>

                    {resource.resource_type === "tour" &&
                      unit.availability?.departure_date && (
                        <div className="mt-1 text-xs text-slate-500">
                          Tarih: {unit.availability.departure_date}
                        </div>
                      )}

                    <div className="mt-3 text-xs font-black text-cyan-300">
                      {isSelected ? "SEÇİLDİ" : blocked ? "DOLU" : "SEÇ"}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

      {!loading && !error && visible.length === 0 && (
        <div className="rounded-xl border border-white/10 p-4 text-sm text-slate-500">
          Henüz bağlı Network ürünü yok.
        </div>
      )}
    </div>
  );
}
