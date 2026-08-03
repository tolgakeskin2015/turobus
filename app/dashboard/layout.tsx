"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  FaBars,
  FaBuilding,
  FaBus,
  FaChartLine,
  FaClipboardList,
  FaMapMarkedAlt,
  FaPlusCircle,
  FaSignOutAlt,
  FaStar,
  FaTimes,
  FaUserCircle,
} from "react-icons/fa";
import { supabase } from "@/lib/supabase";
import {
  AppRole,
  CurrentMembership,
  getCurrentMembership,
} from "@/lib/current-user";

type DashboardLayoutProps = {
  children: React.ReactNode;
};

type MenuItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: AppRole[];
};

const allRoles: AppRole[] = [
  "super_admin",
  "company_owner",
  "operation_manager",
  "sales",
  "accounting",
  "guide",
  "driver",
];

const menuItems: MenuItem[] = [
  {
    href: "/dashboard",
    label: "Genel Bakış",
    icon: FaChartLine,
    roles: [
      "super_admin",
      "company_owner",
      "operation_manager",
      "sales",
      "accounting",
    ],
  },
  {
    href: "/dashboard/command-center",
    label: "Command Center",
    icon: FaMapMarkedAlt,
    roles: [
      "super_admin",
      "company_owner",
      "operation_manager",
    ],
  },
  {
    href: "/dashboard/operasyon",
    label: "Operasyon",
    icon: FaBus,
    roles: [
      "super_admin",
      "company_owner",
      "operation_manager",
      "guide",
      "driver",
    ],
  },
  {
    href: "/dashboard/rezervasyonlar",
    label: "Rezervasyonlar",
    icon: FaClipboardList,
    roles: [
      "super_admin",
      "company_owner",
      "operation_manager",
      "sales",
      "accounting",
    ],
  },
  {
    href: "/dashboard/araclar",
    label: "Araçlar",
    icon: FaBus,
    roles: [
      "super_admin",
      "company_owner",
      "operation_manager",
    ],
  },
  {
    href: "/dashboard/personel",
    label: "Personel",
    icon: FaUserCircle,
    roles: [
      "super_admin",
      "company_owner",
      "operation_manager",
    ],
  },
  {
    href: "/dashboard/gorev-atama",
    label: "Görev Atama",
    icon: FaClipboardList,
    roles: [
      "super_admin",
      "company_owner",
      "operation_manager",
    ],
  },
  {
    href: "/dashboard/tedarikciler",
    label: "Tedarikçiler",
    icon: FaBuilding,
    roles: [
      "super_admin",
      "company_owner",
      "operation_manager",
      "accounting",
    ],
  },
  {
    href: "/dashboard/urunler",
    label: "Ürün Kataloğu",
    icon: FaPlusCircle,
    roles: [
      "super_admin",
      "company_owner",
      "operation_manager",
      "sales",
      "accounting",
    ],
  },
  {
    href: "/dashboard/ek-satis",
    label: "Ek Satış",
    icon: FaClipboardList,
    roles: [
      "super_admin",
      "company_owner",
      "operation_manager",
      "sales",
      "accounting",
      "guide",
    ],
  },
  {
    href: "/dashboard/giderler",
    label: "Gider Yönetimi",
    icon: FaChartLine,
    roles: [
      "super_admin",
      "company_owner",
      "operation_manager",
      "accounting",
    ],
  },
  {
    href: "/dashboard/turlar",
    label: "Turlar",
    icon: FaBus,
    roles: [
      "super_admin",
      "company_owner",
      "operation_manager",
      "sales",
    ],
  },
  {
    href: "/dashboard/tur-ekle",
    label: "Tur Ekle",
    icon: FaPlusCircle,
    roles: [
      "super_admin",
      "company_owner",
      "operation_manager",
      "sales",
    ],
  },
  {
    href: "/dashboard/yorumlar",
    label: "Yorumlar",
    icon: FaStar,
    roles: [
      "super_admin",
      "company_owner",
      "operation_manager",
      "sales",
    ],
  },
  {
    href: "/dashboard/hesabim",
    label: "Hesabım",
    icon: FaUserCircle,
    roles: allRoles,
  },
];

const roleLabels: Record<AppRole, string> = {
  super_admin: "Süper Yönetici",
  company_owner: "Firma Sahibi",
  operation_manager: "Operasyon Müdürü",
  sales: "Satış",
  accounting: "Muhasebe",
  guide: "Rehber",
  driver: "Şoför",
};

function isAllowedPath(
  pathname: string,
  role: AppRole
) {
  const matchedItem = menuItems
    .filter((item) => pathname.startsWith(item.href))
    .sort((first, second) => second.href.length - first.href.length)[0];

  if (!matchedItem) return true;

  return matchedItem.roles.includes(role);
}

export default function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [membership, setMembership] =
    useState<CurrentMembership | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadSession = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      router.replace("/giris");
      return;
    }

    try {
      const currentMembership =
        await getCurrentMembership(user.id);

      if (!currentMembership) {
        await supabase.auth.signOut();
        router.replace("/giris");
        return;
      }

      if (
        !isAllowedPath(
          pathname,
          currentMembership.role
        )
      ) {
        router.replace("/dashboard/hesabim");
        return;
      }

      setMembership(currentMembership);
      setLoading(false);
    } catch (membershipError) {
      console.error(membershipError);
      setErrorMessage(
        "Kullanıcı yetkileri yüklenemedi."
      );
      setLoading(false);
    }
  }, [pathname, router]);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const visibleMenuItems = useMemo(() => {
    if (!membership) return [];

    return menuItems.filter((item) =>
      item.roles.includes(membership.role)
    );
  }, [membership]);

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/giris");
    router.refresh();
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 text-white">
        Yetkiler kontrol ediliyor...
      </main>
    );
  }

  if (!membership) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 text-white">
        <div className="max-w-xl rounded-3xl border border-red-500/20 bg-red-500/10 p-8 text-red-400">
          {errorMessage || "Aktif kullanıcı bulunamadı."}
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/95 backdrop-blur-xl lg:hidden">
        <div className="flex min-h-16 items-center justify-between px-4">
          <div>
            <p className="text-sm font-black">
              {membership.company.name}
            </p>

            <p className="text-xs text-orange-400">
              {roleLabels[membership.role]}
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setMobileOpen((value) => !value)
            }
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.05]"
          >
            {mobileOpen ? <FaTimes /> : <FaBars />}
          </button>
        </div>
      </header>

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[290px] border-r border-white/10 bg-slate-900 transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="border-b border-white/10 p-6">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-400">
              TUROBUS OS
            </p>

            <h2 className="mt-3 text-2xl font-black">
              {membership.company.name}
            </h2>

            <div className="mt-4 flex items-center gap-3 rounded-2xl bg-slate-950 p-4">
              <FaBuilding className="text-orange-400" />

              <div className="min-w-0">
                <p className="truncate text-sm font-black">
                  {membership.full_name ??
                    "TUROBUS Kullanıcısı"}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {roleLabels[membership.role]}
                </p>
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-2 overflow-y-auto p-4">
            {visibleMenuItems.map((item) => {
              const Icon = item.icon;

              const isActive =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex min-h-12 items-center gap-3 rounded-xl px-4 text-sm font-black transition ${
                    isActive
                      ? "bg-orange-500 text-white"
                      : "text-slate-400 hover:bg-white/[0.05] hover:text-white"
                  }`}
                >
                  <Icon />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-white/10 p-4">
            <button
              type="button"
              onClick={signOut}
              className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 text-sm font-black text-red-400"
            >
              <FaSignOutAlt />
              Güvenli Çıkış
            </button>
          </div>
        </div>
      </aside>

      {mobileOpen && (
        <button
          type="button"
          aria-label="Menüyü kapat"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
        />
      )}

      <div className="lg:pl-[290px]">
        {children}
      </div>
    </div>
  );
}
