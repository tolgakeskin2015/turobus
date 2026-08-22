"use client";

import Link from "next/link";

import {
  usePathname,
} from "next/navigation";

import {
  FaBus,
  FaCalendarAlt,
  FaChartLine,
  FaClipboardCheck,
  FaClipboardList,
  FaExclamationTriangle,
  FaFileAlt,
  FaMoneyBillWave,
  FaPlane,
  FaRoute,
  FaTasks,
  FaUsers,
} from "react-icons/fa";


const primary = [
  {
    href:
      "/dashboard/turlar/control-tower",
    label:
      "Kontrol Kulesi",
    icon:
      FaChartLine,
  },
  {
    href:
      "/dashboard/turlar",
    label:
      "Turlar",
    icon:
      FaBus,
  },
  {
    href:
      "/dashboard/rezervasyonlar",
    label:
      "Rezervasyon",
    icon:
      FaClipboardList,
  },
  {
    href:
      "/dashboard/manifest",
    label:
      "Manifest",
    icon:
      FaClipboardCheck,
  },
];


const secondary = [
  {
    href:
      "/dashboard/tur-os/yolcular",
    label:
      "Yolcu & Rooming",
    icon:
      FaUsers,
  },
  {
    href:
      "/dashboard/tur-os/ucus",
    label:
      "Uçuş",
    icon:
      FaPlane,
  },
  {
    href:
      "/dashboard/tur-os/otobus",
    label:
      "Otobüs",
    icon:
      FaBus,
  },
  {
    href:
      "/dashboard/tur-os/gorevler",
    label:
      "Görevler",
    icon:
      FaTasks,
  },
  {
    href:
      "/dashboard/tur-os/hazirlik",
    label:
      "Hazırlık",
    icon:
      FaExclamationTriangle,
  },
  {
    href:
      "/dashboard/tur-os/finans",
    label:
      "Finans",
    icon:
      FaMoneyBillWave,
  },
];


export default function TourWorkspaceNav() {

  const pathname =
    usePathname();


  return (
    <section
      data-tour-workspace-nav
      className="mx-2.5 mb-3 overflow-hidden rounded-[18px] border border-orange-500/15 bg-[linear-gradient(145deg,rgba(249,115,22,.08),rgba(7,12,18,.3))]"
    >

      <div className="border-b border-white/[.05] px-3.5 py-3">

        <div className="flex items-center justify-between">

          <div>

            <p className="text-[8px] font-black uppercase tracking-[.18em] text-orange-400">
              Tour OS
            </p>

            <p className="mt-1 text-[11px] font-black text-white">
              Operasyon Çalışma Alanı
            </p>

          </div>


          <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-orange-500/20 bg-orange-500/10 text-orange-300">
            <FaRoute className="text-xs" />
          </span>

        </div>

      </div>


      <div className="grid grid-cols-2 gap-1.5 p-2.5">

        {primary.map(
          item => {

            const Icon =
              item.icon;

            const active =
              item.href ===
                "/dashboard/turlar"
                ? pathname ===
                    item.href
                : pathname.startsWith(
                    item.href
                  );


            return (

              <Link
                key={
                  item.href
                }
                href={
                  item.href
                }
                className={`flex min-h-10 items-center gap-2 rounded-xl px-2.5 text-[10px] font-black transition ${
                  active
                    ? "bg-orange-500 text-white shadow-lg shadow-orange-500/10"
                    : "border border-white/[.05] bg-black/20 text-slate-400 hover:border-white/10 hover:bg-white/[.05] hover:text-white"
                }`}
              >

                <Icon className="shrink-0 text-[11px]" />

                <span className="truncate">
                  {item.label}
                </span>

              </Link>
            );
          }
        )}

      </div>


      <div className="border-t border-white/[.05] px-2.5 py-2.5">

        <div className="mb-2 px-1 text-[7px] font-black uppercase tracking-[.16em] text-slate-600">
          Hızlı Operasyon
        </div>


        <div className="space-y-0.5">

          {secondary.map(
            item => {

              const Icon =
                item.icon;

              const active =
                pathname.startsWith(
                  item.href
                );


              return (

                <Link
                  key={
                    item.href
                  }
                  href={
                    item.href
                  }
                  className={`flex min-h-9 items-center gap-2.5 rounded-lg px-2.5 text-[10px] font-bold transition ${
                    active
                      ? "bg-white/[.07] text-orange-300"
                      : "text-slate-500 hover:bg-white/[.04] hover:text-white"
                  }`}
                >

                  <Icon className="w-3 shrink-0" />

                  <span>
                    {item.label}
                  </span>

                </Link>
              );
            }
          )}

        </div>

      </div>


      <div className="flex items-center gap-2 border-t border-white/[.05] px-3 py-2.5 text-[7px] text-slate-600">

        <FaCalendarAlt />

        Satış → Hazırlık → Çıkış → Operasyon → Kapanış

      </div>

    </section>
  );
}
