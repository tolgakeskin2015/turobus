"use client";

import { useMemo } from "react";
import { FaBed, FaTools } from "react-icons/fa";

export type PlannerRoom = {
  id: string;
  room_number: string;
  floor_number: string | null;
  room_status: string;
  housekeeping_status: string;
  room_type:
    | {
        name: string;
      }
    | {
        name: string;
      }[]
    | null;
};

type Props = {
  rooms: PlannerRoom[];
  days?: number;
};

const statusLabels: Record<string, string> = {
  available: "Müsait",
  occupied: "Dolu",
  dirty: "Kirli",
  cleaning: "Temizleniyor",
  inspection: "Kontrol",
  maintenance: "Bakım",
  out_of_order: "Kullanım Dışı",
  blocked: "Bloke",
};

const housekeepingLabels: Record<string, string> = {
  clean: "Temiz",
  dirty: "Kirli",
  cleaning: "Temizleniyor",
  inspected: "Kontrol Edildi",
};

function firstRelation<T>(value: T | T[] | null) {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default function RoomPlanner({
  rooms,
  days = 14,
}: Props) {
  const dates = useMemo(() => {
    const today = new Date();

    return Array.from({ length: days }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() + index);
      return date;
    });
  }, [days]);

  return (
    <section className="rounded-[32px] border border-white/10 bg-slate-900 p-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-400">
            ROOM PLANNER
          </p>

          <h2 className="mt-2 text-2xl font-black">
            Oda Planı
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Önümüzdeki {days} gün için oda durumlarını görüntüleyin.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs font-black">
          <span className="rounded-full bg-emerald-500/15 px-3 py-2 text-emerald-400">
            Müsait
          </span>
          <span className="rounded-full bg-blue-500/15 px-3 py-2 text-blue-400">
            Dolu
          </span>
          <span className="rounded-full bg-amber-500/15 px-3 py-2 text-amber-400">
            Temizlik
          </span>
          <span className="rounded-full bg-red-500/15 px-3 py-2 text-red-400">
            Bakım / Bloke
          </span>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        <div className="min-w-[1450px]">
          <div
            className="grid border-b border-white/10"
            style={{
              gridTemplateColumns: `260px repeat(${dates.length}, minmax(80px, 1fr))`,
            }}
          >
            <div className="sticky left-0 z-20 bg-slate-900 p-4 font-black">
              Oda
            </div>

            {dates.map((date) => (
              <div
                key={dayKey(date)}
                className="border-l border-white/10 p-3 text-center"
              >
                <p className="text-xs text-slate-500">
                  {date.toLocaleDateString("tr-TR", {
                    weekday: "short",
                  })}
                </p>

                <p className="mt-1 font-black">
                  {date.toLocaleDateString("tr-TR", {
                    day: "2-digit",
                    month: "2-digit",
                  })}
                </p>
              </div>
            ))}
          </div>

          {rooms.map((room) => {
            const roomType = firstRelation(room.room_type);

            const isUnavailable = [
              "maintenance",
              "out_of_order",
              "blocked",
            ].includes(room.room_status);

            const isOccupied = room.room_status === "occupied";

            const isCleaning =
              room.housekeeping_status === "dirty" ||
              room.housekeeping_status === "cleaning";

            return (
              <div
                key={room.id}
                className="grid border-b border-white/[0.06]"
                style={{
                  gridTemplateColumns: `260px repeat(${dates.length}, minmax(80px, 1fr))`,
                }}
              >
                <div className="sticky left-0 z-10 flex items-center gap-3 bg-slate-900 p-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500/10 text-orange-400">
                    {isUnavailable ? <FaTools /> : <FaBed />}
                  </div>

                  <div>
                    <p className="font-black">
                      Oda {room.room_number}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {roomType?.name ?? "Oda tipi belirtilmedi"}
                      {room.floor_number
                        ? ` · ${room.floor_number}. kat`
                        : ""}
                    </p>
                  </div>
                </div>

                {dates.map((date) => {
                  let cellClass =
                    "bg-emerald-500/10 text-emerald-400";
                  let label = "Müsait";

                  if (isUnavailable) {
                    cellClass =
                      "bg-red-500/10 text-red-400";
                    label =
                      statusLabels[room.room_status] ??
                      "Kapalı";
                  } else if (isOccupied) {
                    cellClass =
                      "bg-blue-500/10 text-blue-400";
                    label = "Dolu";
                  } else if (isCleaning) {
                    cellClass =
                      "bg-amber-500/10 text-amber-400";
                    label =
                      housekeepingLabels[
                        room.housekeeping_status
                      ] ?? "Temizlik";
                  }

                  return (
                    <div
                      key={`${room.id}-${dayKey(date)}`}
                      className="border-l border-white/[0.06] p-2"
                    >
                      <div
                        className={`flex min-h-12 items-center justify-center rounded-xl px-2 text-center text-xs font-black ${cellClass}`}
                      >
                        {label}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}

          {rooms.length === 0 && (
            <div className="p-10 text-center text-slate-500">
              Henüz oda kaydı bulunmuyor.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
