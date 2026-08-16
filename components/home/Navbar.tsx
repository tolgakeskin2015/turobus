"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  FaBars,
  FaGlobe,
  FaHeart,
  FaTimes,
  FaUser,
} from "react-icons/fa";

const navigation = [
  { label: "Ana Sayfa", href: "/" },
  { label: "Turlar", href: "/turlar" },
  { label: "Oteller", href: "/oteller" },
  { label: "Villalar", href: "/villalar" },
  { label: "Aktiviteler", href: "/aktiviteler" },
  { label: "Yat & Tekne", href: "/yatlar" },
  { label: "Kurumsal", href: "/hakkimizda" },
];

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [favoriteCount, setFavoriteCount] = useState(0);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    async function loadFavoriteCount() {
      const userKey =
        window.localStorage.getItem("turobus_favorite_user_key");

      if (!userKey) {
        setFavoriteCount(0);
        return;
      }

      const { count, error } = await supabase
        .from("favorites")
        .select("id", { count: "exact", head: true })
        .eq("user_key", userKey);

      if (error) {
        console.error("Favori sayacı yüklenemedi:", error);
        return;
      }

      setFavoriteCount(count ?? 0);
    }

    loadFavoriteCount();

    window.addEventListener(
      "favorites-updated",
      loadFavoriteCount
    );

    return () => {
      window.removeEventListener(
        "favorites-updated",
        loadFavoriteCount
      );
    };
  }, []);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-2xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 lg:px-8">
          <Link
            href="/"
            className="flex items-center gap-3"
            onClick={() => setMobileMenuOpen(false)}
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500 text-xl font-black text-white shadow-lg shadow-orange-500/25">
              T
            </div>

            <div>
              <div className="text-xl font-black tracking-tight text-white">
                TUROBUS
              </div>

              <div className="text-[9px] font-bold uppercase tracking-[0.22em] text-orange-400">
                Marketplace
              </div>
            </div>
          </Link>

          <nav className="hidden items-center gap-8 lg:flex">
            {navigation.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="text-sm font-bold text-slate-300 transition hover:text-orange-400"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <button
              type="button"
              aria-label="Dil seçimi"
              className="flex h-11 items-center gap-2 rounded-xl px-3 text-sm font-bold text-slate-300 transition hover:bg-white/5 hover:text-white"
            >
              <FaGlobe />
              TR
            </button>

            <Link
              href="/favoriler"
              aria-label="Favoriler"
              className="relative flex h-11 w-11 items-center justify-center rounded-xl text-slate-300 transition hover:bg-white/5 hover:text-orange-400"
            >
              <FaHeart />

              {favoriteCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-black text-white">
                  {favoriteCount > 99 ? "99+" : favoriteCount}
                </span>
              )}
            </Link>

            <Link
              href="/login"
              className="flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-black text-white transition hover:border-orange-500/30 hover:bg-white/10"
            >
              <FaUser />
              Giriş Yap
            </Link>

            <Link
              href="/acente-basvuru"
              className="flex h-11 items-center rounded-xl bg-orange-500 px-5 text-sm font-black text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600"
            >
              Turunu Yayınla
            </Link>
          </div>

          <button
            type="button"
            aria-label={mobileMenuOpen ? "Menüyü kapat" : "Menüyü aç"}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((current) => !current)}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10 md:hidden"
          >
            {mobileMenuOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
          </button>
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-slate-950/95 px-5 pb-28 pt-24 backdrop-blur-2xl md:hidden">
          <nav className="mx-auto flex max-w-md flex-col gap-2">
            {navigation.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-lg font-black text-white transition hover:border-orange-500/30 hover:bg-orange-500/10 hover:text-orange-400"
              >
                {item.label}
              </Link>
            ))}

            <div className="mt-4 grid grid-cols-2 gap-3">
              <Link
                href="/favoriler"
                onClick={() => setMobileMenuOpen(false)}
                className="flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] font-black text-white"
              >
                <FaHeart className="text-orange-400" />
                Favoriler
                {favoriteCount > 0 && (
                  <span className="rounded-full bg-orange-500 px-2 py-0.5 text-xs text-white">
                    {favoriteCount}
                  </span>
                )}
              </Link>

              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] font-black text-white"
              >
                <FaUser className="text-orange-400" />
                Giriş Yap
              </Link>
            </div>

            <Link
              href="/acente-basvuru"
              onClick={() => setMobileMenuOpen(false)}
              className="mt-3 flex min-h-14 items-center justify-center rounded-2xl bg-orange-500 px-6 font-black text-white transition hover:bg-orange-600"
            >
              Turunu Yayınla
            </Link>
          </nav>
        </div>
      )}
    </>
  );
}
