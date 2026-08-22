"use client";

import Link from "next/link";

import {
  FaCalendarAlt,
  FaCheckCircle,
  FaMapMarkerAlt,
  FaShieldAlt,
  FaStar,
} from "react-icons/fa";


type Props = {
  tourId: string;
  slug: string;
  city: string;
  district:
    string | null;
  duration:
    string | null;
  rating:
    number | null;
  reviewCount:
    number | null;
  price:
    number;
  oldPrice:
    number;
};


export default function PublicTourExperienceBar({
  tourId,
  slug,
  city,
  district,
  duration,
  rating,
  reviewCount,
  price,
  oldPrice,
}: Props) {

  return (
    <section
      data-public-tour-experience-bar
      className="sticky top-0 z-40 border-y border-white/[.08] bg-[#071019]/95 backdrop-blur-xl"
    >

      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 overflow-x-auto px-5 py-3 lg:px-8">

        <div className="flex min-w-max items-center gap-5 text-[11px] text-slate-300">

          <span className="inline-flex items-center gap-2">
            <FaMapMarkerAlt className="text-orange-400" />
            {city}
            {district
              ? ` / ${district}`
              : ""}
          </span>


          <span className="inline-flex items-center gap-2">
            <FaCalendarAlt className="text-orange-400" />
            {duration ||
              "Süre bilgisi"}
          </span>


          <span className="inline-flex items-center gap-2">
            <FaStar className="text-amber-400" />
            {rating ??
              "—"}
            <span className="text-slate-600">
              ({reviewCount ?? 0})
            </span>
          </span>


          <span className="inline-flex items-center gap-2">
            <FaShieldAlt className="text-emerald-400" />
            Güvenli rezervasyon
          </span>


          <span className="hidden items-center gap-2 lg:inline-flex">
            <FaCheckCircle className="text-emerald-400" />
            Gerçek tur bilgileri
          </span>

        </div>


        <div className="flex min-w-max items-center gap-3">

          <div className="text-right">

            {oldPrice >
              price &&
              oldPrice >
                0 && (

              <div className="text-[9px] text-slate-600 line-through">
                {oldPrice.toLocaleString(
                  "tr-TR"
                )} TL
              </div>
            )}


            <div className="text-base font-black text-white">
              {price.toLocaleString(
                "tr-TR"
              )} TL
            </div>

          </div>


          <Link
            href={`/rezervasyon?tour=${tourId}&slug=${encodeURIComponent(
              slug
            )}`}
            className="rounded-xl bg-orange-500 px-5 py-3 text-[10px] font-black text-white transition hover:bg-orange-400"
          >
            Rezervasyon
          </Link>

        </div>

      </div>

    </section>
  );
}
