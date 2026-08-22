"use client";

import Link from "next/link";

import {
  usePathname,
} from "next/navigation";

import {
  FaBuilding,
  FaChartLine,
  FaClipboardCheck,
  FaExclamationTriangle,
  FaFileAlt,
  FaMoneyBillWave,
  FaPlane,
  FaRoute,
  FaTasks,
  FaUsers,
} from "react-icons/fa";


type Props = {
  tourId:
    string;

  transportMode?:
    string | null;
};


export default function TourDetailTabs({
  tourId,
  transportMode,
}: Props) {

  const pathname =
    usePathname();


  const transportHref =
    transportMode ===
      "air"
      ? `/dashboard/turlar/${tourId}/ucus`
      : `/dashboard/turlar/${tourId}/otobus`;


  const items = [
    {
      label:
        "Genel Bakış",
      href:
        `/dashboard/turlar/${tourId}`,
      icon:
        FaChartLine,
    },
    {
      label:
        "Operasyon",
      href:
        `/dashboard/turlar/${tourId}/hazirlik`,
      icon:
        FaClipboardCheck,
    },
    {
      label:
        "Yolcular",
      href:
        `/dashboard/turlar/${tourId}/yolcular`,
      icon:
        FaUsers,
    },
    {
      label:
        "Ulaşım",
      href:
        transportHref,
      icon:
        transportMode ===
          "air"
          ? FaPlane
          : FaRoute,
    },
    {
      label:
        "Tedarikçi",
      href:
        `/dashboard/turlar/${tourId}/tedarikciler`,
      icon:
        FaBuilding,
    },
    {
      label:
        "Belgeler",
      href:
        `/dashboard/turlar/${tourId}/belgeler`,
      icon:
        FaFileAlt,
    },
    {
      label:
        "Finans",
      href:
        `/dashboard/turlar/${tourId}/finans-yonetim`,
      icon:
        FaMoneyBillWave,
    },
    {
      label:
        "Görevler",
      href:
        `/dashboard/turlar/${tourId}/gorevler`,
      icon:
        FaTasks,
    },
    {
      label:
        "Hatalar",
      href:
        `/dashboard/turlar/${tourId}/hatalar`,
      icon:
        FaExclamationTriangle,
    },
  ];


  return (
    <div
      data-tour-detail-tabs
      className="sticky top-0 z-30 mb-5 overflow-x-auto border-y border-white/[.07] bg-[#030a11]/95 backdrop-blur-xl"
    >

      <div className="flex min-w-max gap-1 px-1 py-2">

        {items.map(
          item => {

            const Icon =
              item.icon;

            const active =
              item.href ===
                `/dashboard/turlar/${tourId}`
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
                className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-3.5 text-[9px] font-black transition ${
                  active
                    ? "bg-orange-500 text-white shadow-lg shadow-orange-500/10"
                    : "text-slate-500 hover:bg-white/[.05] hover:text-white"
                }`}
              >

                <Icon className="text-[11px]" />

                {item.label}

              </Link>
            );
          }
        )}

      </div>

    </div>
  );
}
