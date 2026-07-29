"use client";

import Link from "next/link";
import {
  FaHeart,
  FaHome,
  FaSearch,
  FaUser,
} from "react-icons/fa";

const items = [
  {
    label: "Ana Sayfa",
    href: "/",
    icon: FaHome,
  },
  {
    label: "Turlar",
    href: "/turlar",
    icon: FaSearch,
  },
  {
    label: "Favoriler",
    href: "/favoriler",
    icon: FaHeart,
  },
  {
    label: "Hesabım",
    href: "/login",
    icon: FaUser,
  },
];

export default function MobileBottomNav() {
  return (
    <nav className="fixed inset-x-3 bottom-3 z-[90] rounded-[24px] border border-white/10 bg-slate-950/90 px-3 py-2 shadow-2xl backdrop-blur-xl md:hidden">
      <div className="grid grid-cols-4 gap-1">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.label}
              href={item.href}
              className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-bold text-slate-400 transition hover:bg-white/[0.05] hover:text-orange-400"
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
