"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import {
  FaBuilding,
  FaCubes,
  FaHome,
  FaSignOutAlt,
} from "react-icons/fa";
import { supabase } from "@/lib/supabase";

const navigation = [
  {
    href: "/platform-admin",
    label: "Genel Bakış",
    icon: FaHome,
  },
  {
    href: "/platform-admin/sirketler",
    label: "Şirketler",
    icon: FaBuilding,
  },
  {
    href: "/platform-admin/moduller",
    label: "Modüller",
    icon: FaCubes,
  },
];

export default function PlatformAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function verifyAccess() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/giris");
        return;
      }

      const { data, error } = await supabase.rpc(
        "is_platform_admin"
      );

      if (error || data !== true) {
        router.replace("/dashboard");
        return;
      }

      setAuthorized(true);
      setChecking(false);
    }

    void verifyAccess();
  }, [router]);

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/giris");
    router.refresh();
  }

  if (checking || !authorized) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        Platform yetkisi kontrol ediliyor...
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white lg:grid lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="border-b border-white/10 bg-slate-900 p-5 lg:min-h-screen lg:border-b-0 lg:border-r">
        <Link href="/platform-admin">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-400">
            TUROBUS CLOUD
          </p>

          <h1 className="mt-2 text-2xl font-black">
            Platform Admin
          </h1>
        </Link>

        <nav className="mt-8 grid gap-2">
          {navigation.map((item) => {
            const Icon = item.icon;

            const active =
              item.href === "/platform-admin"
                ? pathname === item.href
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-h-12 items-center gap-3 rounded-xl px-4 font-black transition ${
                  active
                    ? "bg-orange-500 text-white"
                    : "text-slate-400 hover:bg-white/[0.06] hover:text-white"
                }`}
              >
                <Icon />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <Link
          href="/dashboard"
          className="mt-8 flex min-h-12 items-center justify-center rounded-xl border border-white/10 font-black"
        >
          Şirket Paneline Dön
        </Link>

        <button
          type="button"
          onClick={signOut}
          className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-red-500/10 font-black text-red-400"
        >
          <FaSignOutAlt />
          Çıkış Yap
        </button>
      </aside>

      <div className="min-w-0">{children}</div>
    </div>
  );
}
