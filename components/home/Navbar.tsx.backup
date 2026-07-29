"use client";

import Link from "next/link";
import { Menu, Globe2, UserRound, Heart } from "lucide-react";

export default function Navbar() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-slate-950/70 backdrop-blur-xl border-b border-white/10">

      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-8">

        <Link href="/" className="flex items-center gap-3">

          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500 text-xl">
            🚌
          </div>

          <div>
            <div className="text-2xl font-black tracking-tight text-white">
              TUROBUS
            </div>

            <div className="text-[11px] uppercase tracking-[4px] text-orange-400">
              Marketplace
            </div>
          </div>

        </Link>

        <nav className="hidden gap-10 font-medium text-slate-300 lg:flex">

          <Link href="/">Ana Sayfa</Link>
          <Link href="#">Turlar</Link>
          <Link href="#">Oteller</Link>
          <Link href="#">Aktiviteler</Link>
          <Link href="#">Acenteler</Link>
          <Link href="#">Kurumsal</Link>

        </nav>

        <div className="flex items-center gap-5">

          <button>
            <Globe2 className="h-5 w-5 text-white" />
          </button>

          <button>
            <Heart className="h-5 w-5 text-white" />
          </button>

          <Link
            href="/login"
            className="rounded-xl bg-orange-500 px-6 py-3 font-semibold text-white hover:bg-orange-600"
          >
            Giriş Yap
          </Link>

          <button className="lg:hidden">
            <Menu className="h-6 w-6 text-white" />
          </button>

        </div>

      </div>

    </header>
  );
}