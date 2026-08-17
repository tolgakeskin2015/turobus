"use client";

import {
  FaBus,
  FaPlane,
  FaShip,
  FaTrain,
} from "react-icons/fa";

import type {
  TicketMode,
} from "@/lib/tickets/types";


const modes = [
  {
    key:
      "bus" as TicketMode,
    label:
      "Otobüs",
    icon:
      FaBus,
  },
  {
    key:
      "flight" as TicketMode,
    label:
      "Uçak",
    icon:
      FaPlane,
  },
  {
    key:
      "ferry" as TicketMode,
    label:
      "Feribot",
    icon:
      FaShip,
  },
  {
    key:
      "train" as TicketMode,
    label:
      "Tren",
    icon:
      FaTrain,
  },
];


export default function TicketModeTabs({
  value,
  onChange,
}: {
  value: TicketMode;
  onChange:
    (
      mode: TicketMode
    ) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto">
      {modes.map(
        (item) => {
          const Icon =
            item.icon;

          const active =
            item.key ===
            value;

          return (
            <button
              key={
                item.key
              }
              type="button"
              onClick={() =>
                onChange(
                  item.key
                )
              }
              className={`flex min-w-fit items-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-black transition ${
                active
                  ? "bg-white text-slate-950 shadow-xl"
                  : "border border-white/10 bg-white/[.04] text-slate-400 hover:bg-white/[.08] hover:text-white"
              }`}
            >
              <Icon
                className={
                  active
                    ? "text-orange-500"
                    : ""
                }
              />

              {item.label}
            </button>
          );
        }
      )}
    </div>
  );
}
