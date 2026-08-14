"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  FaBars,
  FaBuilding,
  FaBus,
  FaChartLine,
  FaChevronDown,
  FaClipboardList,
  FaMapMarkedAlt,
  FaPlusCircle,
  FaSignOutAlt,
  FaStar,
  FaTimes,
  FaUserCircle,
  FaUsers,
  FaHotel,} from "react-icons/fa";
import { supabase } from "@/lib/supabase";
import {
  AppRole,
  CurrentMembership,
  getUserMemberships,
  resolveActiveMembership,
  setActiveCompanyId,
  clearActiveCompanyId,
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

type MenuGroup = {
  title: string;
  items: MenuItem[];
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

const menuGroups: MenuGroup[] = [
  {
    title: "ANA MERKEZ",
    items: [
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
    ],
  },

  {
    title: "TUR & OPERASYON",
    items: [
      {
        href: "/dashboard/operasyon",
        label: "Operasyon Merkezi",
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
        href: "/dashboard/manifest",
        label: "Tur Çıkış & Manifest",
        icon: FaClipboardList,
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
        label: "Tur Rezervasyonları",
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
        label: "Yeni Tur",
        icon: FaPlusCircle,
        roles: [
          "super_admin",
          "company_owner",
          "operation_manager",
          "sales",
        ],
      },
      {
        href: "/dashboard/araclar",
        label: "Araç & Transfer",
        icon: FaBus,
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
    ],
  },

  {
    title: "OTEL PMS",
    items: [
      {
        href: "/dashboard/hotel/yonetim-merkezi",
        label: "Yönetim Merkezi",
        icon: FaHotel,
        roles: [
          "super_admin",
          "company_owner",
          "operation_manager",
          "sales",
          "accounting",
        ],
      },
      {
        href: "/dashboard/hotel/ceo-dashboard",
        label: "CEO Dashboard",
        icon: FaChartLine,
        roles: [
          "super_admin",
          "company_owner",
          "operation_manager",
        ],
      },
      {
        href: "/dashboard/hotel/front-office",
        label: "Front Office",
        icon: FaHotel,
        roles: [
          "super_admin",
          "company_owner",
          "operation_manager",
          "sales",
        ],
      },
      {
        href: "/dashboard/hotel/rezervasyonlar",
        label: "Otel Rezervasyonları",
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
        href: "/dashboard/hotel/housekeeping",
        label: "Housekeeping",
        icon: FaHotel,
        roles: [
          "super_admin",
          "company_owner",
          "operation_manager",
        ],
      },
      {
        href: "/dashboard/hotel/folio",
        label: "Folio & Tahsilat",
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
        href: "/dashboard/hotel/invoices",
        label: "Fatura Merkezi",
        icon: FaClipboardList,
        roles: [
          "super_admin",
          "company_owner",
          "operation_manager",
          "accounting",
        ],
      },
      {
        href: "/dashboard/hotel/reports",
        label: "Otel Rapor Merkezi",
        icon: FaChartLine,
        roles: [
          "super_admin",
          "company_owner",
          "operation_manager",
          "accounting",
        ],
      },
      {
        href: "/dashboard/hotel/cashier",
        label: "Kasa & Vardiya",
        icon: FaBuilding,
        roles: [
          "super_admin",
          "company_owner",
          "operation_manager",
          "accounting",
        ],
      },
      {
        href: "/dashboard/hotel/room-planner",
        label: "Oda Planı",
        icon: FaHotel,
        roles: [
          "super_admin",
          "company_owner",
          "operation_manager",
          "sales",
        ],
      },
      {
        href: "/dashboard/hotel/odalar",
        label: "Odalar",
        icon: FaHotel,
        roles: [
          "super_admin",
          "company_owner",
          "operation_manager",
        ],
      },
      {
        href: "/dashboard/hotel/oda-tipleri",
        label: "Oda Tipleri",
        icon: FaHotel,
        roles: [
          "super_admin",
          "company_owner",
          "operation_manager",
        ],
      },
      {
        href: "/dashboard/hotel/misafirler",
        label: "Misafirler / Guest 360",
        icon: FaUsers,
        roles: [
          "super_admin",
          "company_owner",
          "operation_manager",
          "sales",
        ],
      },
      {
        href: "/dashboard/hotel/night-audit",
        label: "Night Audit / Gün Sonu",
        icon: FaClipboardList,
        roles: [
          "super_admin",
          "company_owner",
          "operation_manager",
          "accounting",
        ],
      },
      {
        href: "/dashboard/hotel/maintenance",
        label: "Bakım & Arıza",
        icon: FaBuilding,
        roles: [
          "super_admin",
          "company_owner",
          "operation_manager",
        ],
      },
      {
        href: "/dashboard/hotel/revenue-dashboard",
        label: "Revenue Dashboard",
        icon: FaChartLine,
        roles: [
          "super_admin",
          "company_owner",
          "operation_manager",
          "accounting",
        ],
      },
      {
        href: "/dashboard/hotel/revenue",
        label: "Revenue Management",
        icon: FaChartLine,
        roles: [
          "super_admin",
          "company_owner",
          "operation_manager",
        ],
      },
      {
        href: "/dashboard/hotel/revenue/simulator",
        label: "Fiyat Simülatörü",
        icon: FaChartLine,
        roles: [
          "super_admin",
          "company_owner",
          "operation_manager",
        ],
      },
    ],
  },

  {
    title: "KANAL & DAĞITIM",
    items: [
      {
        href: "/dashboard/hotel/distribution-center",
        label: "Distribution Center",
        icon: FaMapMarkedAlt,
        roles: [
          "super_admin",
          "company_owner",
          "operation_manager",
        ],
      },
      {
        href: "/dashboard/hotel/channel-manager",
        label: "Channel Manager",
        icon: FaMapMarkedAlt,
        roles: [
          "super_admin",
          "company_owner",
          "operation_manager",
        ],
      },
      {
        href: "/dashboard/hotel/channel-mapping",
        label: "Kanal Eşleştirme",
        icon: FaMapMarkedAlt,
        roles: [
          "super_admin",
          "company_owner",
          "operation_manager",
        ],
      },
      {
        href: "/dashboard/hotel/channel-operations",
        label: "Kanal Operasyonları",
        icon: FaMapMarkedAlt,
        roles: [
          "super_admin",
          "company_owner",
          "operation_manager",
        ],
      },
      {
        href: "/dashboard/hotel/fiyatlar",
        label: "Fiyatlar",
        icon: FaChartLine,
        roles: [
          "super_admin",
          "company_owner",
          "operation_manager",
          "sales",
        ],
      },
      {
        href: "/dashboard/hotel/kontenjan",
        label: "Kontenjan",
        icon: FaClipboardList,
        roles: [
          "super_admin",
          "company_owner",
          "operation_manager",
          "sales",
        ],
      },
    ],
  },

  {
    title: "PAKET SATIŞ MERKEZİ",
    items: [
      {
        href: "/dashboard/package-os",
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
        href: "/dashboard/package-os/builder",
        label: "Paket Oluştur",
        icon: FaPlusCircle,
        roles: [
          "super_admin",
          "company_owner",
          "operation_manager",
          "sales",
        ],
      },
      {
        href: "/dashboard/package-os/hotels",
        label: "Paket Otelleri",
        icon: FaHotel,
        roles: [
          "super_admin",
          "company_owner",
          "operation_manager",
          "sales",
        ],
      },
      {
        href: "/dashboard/package-os/activities",
        label: "Paket Aktiviteleri",
        icon: FaBus,
        roles: [
          "super_admin",
          "company_owner",
          "operation_manager",
          "sales",
        ],
      },
      {
        href: "/dashboard/package-os/quotes",
        label: "Teklifler",
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
        href: "/dashboard/package-os/bookings",
        label: "Paket Rezervasyonları",
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
        href: "/dashboard/package-os/extra-orders",
        label: "Ekstra Siparişler",
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
        href: "/dashboard/package-os/payments",
        label: "Ödeme & Tahsilat",
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
        href: "/dashboard/package-os/control-tower",
        label: "Operasyon Kontrol Kulesi",
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
        href: "/dashboard/package-os/supplier-alerts",
        label: "Tedarikçi Uyarıları",
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
        href: "/dashboard/package-os/supplier-portals",
        label: "Tedarikçi Portalları",
        icon: FaClipboardList,
        roles: [
          "super_admin",
          "company_owner",
          "operation_manager",
          "accounting",
        ],
      },
      {
        href: "/dashboard/package-os/payables",
        label: "Tedarikçi Hakedişleri",
        icon: FaChartLine,
        roles: [
          "super_admin",
          "company_owner",
          "operation_manager",
          "accounting",
        ],
      },
      {
        href: "/dashboard/package-os/operations",
        label: "Günlük Operasyon",
        icon: FaClipboardList,
        roles: [
          "super_admin",
          "company_owner",
          "operation_manager",
          "sales",
        ],
      },
      {
        href: "/dashboard/package-os/vouchers",
        label: "Voucher & QR",
        icon: FaClipboardList,
        roles: [
          "super_admin",
          "company_owner",
          "operation_manager",
          "sales",
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
    ],
  },

  {
    title: "CRM & SATIŞ",
    items: [
      {
        href: "/dashboard/crm",
        label: "CRM",
        icon: FaUsers,
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
    ],
  },

  {
    title: "FİNANS & YÖNETİM",
    items: [
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
        href: "/dashboard/personel",
        label: "Personel",
        icon: FaUserCircle,
        roles: [
          "super_admin",
          "company_owner",
          "operation_manager",
        ],
      },
    ],
  },

  {
    title: "HESAP",
    items: [
      {
        href: "/dashboard/hesabim",
        label: "Hesabım",
        icon: FaUserCircle,
        roles: allRoles,
      },
    ],
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
  const matchedItem = menuGroups
    .flatMap((group) => group.items)
    .filter((item) => pathname.startsWith(item.href))
    .sort(
      (first, second) =>
        second.href.length - first.href.length
    )[0];

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

  const [memberships, setMemberships] =
    useState<CurrentMembership[]>([]);

  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  const [openMenuGroups, setOpenMenuGroups] = useState<
    Set<string>
  >(
    () =>
      new Set([
        "ANA MERKEZ",
        "TUR & OPERASYON",
        "PAKET SATIŞ MERKEZİ",
        "OTEL PMS",
      ])
  );
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
      const availableMemberships =
        await getUserMemberships(
          user.id
        );

      const currentMembership =
        resolveActiveMembership(
          availableMemberships
        );

      if (!currentMembership) {
        clearActiveCompanyId();
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

      setMemberships(
        availableMemberships
      );
      setMembership(
        currentMembership
      );
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

  const visibleMenuGroups = useMemo(() => {
    if (!membership) return [];

    return menuGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) =>
          item.roles.includes(membership.role)
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [membership]);

  function toggleMenuGroup(title: string) {
    setOpenMenuGroups((current) => {
      const next = new Set(current);

      if (next.has(title)) {
        next.delete(title);
      } else {
        next.add(title);
      }

      return next;
    });
  }

  useEffect(() => {
    const activeGroup = menuGroups.find((group) =>
      group.items.some((item) =>
        item.href === "/dashboard"
          ? pathname === "/dashboard"
          : pathname.startsWith(item.href)
      )
    );

    if (!activeGroup) return;

    setOpenMenuGroups((current) => {
      if (current.has(activeGroup.title)) {
        return current;
      }

      const next = new Set(current);
      next.add(activeGroup.title);
      return next;
    });
  }, [pathname]);

  function changeActiveCompany(
    companyId: string
  ) {
    if (
      companyId ===
      membership?.company_id
    ) {
      return;
    }

    const nextMembership =
      memberships.find(
        (item) =>
          item.company_id ===
          companyId
      );

    if (!nextMembership) {
      return;
    }

    setActiveCompanyId(
      companyId
    );

    window.location.reload();
  }

  async function signOut() {
    clearActiveCompanyId();
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

            {memberships.length > 1 && (
              <div className="mt-4">
                <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                  Aktif Şirket
                </label>

                <select
                  value={
                    membership.company_id
                  }
                  onChange={(event) =>
                    changeActiveCompany(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm font-bold text-white outline-none transition focus:border-orange-500/50"
                >
                  {memberships.map(
                    (item) => (
                      <option
                        key={item.id}
                        value={
                          item.company_id
                        }
                      >
                        {
                          item.company.name
                        }
                      </option>
                    )
                  )}
                </select>
              </div>
            )}

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

          <nav className="flex-1 overflow-y-auto px-3 py-4">
            <div className="space-y-3">
              {visibleMenuGroups.map((group) => {
                const isOpen =
                  openMenuGroups.has(group.title);

                const hasActiveItem =
                  group.items.some((item) =>
                    item.href === "/dashboard"
                      ? pathname === "/dashboard"
                      : pathname.startsWith(
                          item.href
                        )
                  );

                return (
                  <section
                    key={group.title}
                    className="rounded-2xl"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        toggleMenuGroup(group.title)
                      }
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition ${
                        hasActiveItem
                          ? "bg-white/[0.04]"
                          : "hover:bg-white/[0.03]"
                      }`}
                    >
                      <span
                        className={`text-[10px] font-black uppercase tracking-[0.22em] ${
                          hasActiveItem
                            ? "text-orange-400"
                            : "text-slate-600"
                        }`}
                      >
                        {group.title}
                      </span>

                      <FaChevronDown
                        className={`text-xs transition-transform duration-200 ${
                          isOpen
                            ? "rotate-180 text-orange-400"
                            : "text-slate-600"
                        }`}
                      />
                    </button>

                    <div
                      className={`grid transition-all duration-200 ${
                        isOpen
                          ? "grid-rows-[1fr] opacity-100"
                          : "grid-rows-[0fr] opacity-0"
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div className="mt-1 space-y-1 pb-1">
                          {group.items.map((item) => {
                            const Icon = item.icon;

                            const isActive =
                              item.href === "/dashboard"
                                ? pathname === "/dashboard"
                                : pathname.startsWith(
                                    item.href
                                  );

                            return (
                              <Link
                                key={item.href}
                                href={item.href}
                                className={`group flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold transition ${
                                  isActive
                                    ? "bg-orange-500 text-white shadow-lg shadow-orange-500/10"
                                    : "text-slate-400 hover:bg-white/[0.05] hover:text-white"
                                }`}
                              >
                                <span
                                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                                    isActive
                                      ? "bg-white/15"
                                      : "bg-slate-950 group-hover:bg-white/[0.06]"
                                  }`}
                                >
                                  <Icon className="text-sm" />
                                </span>

                                <span className="truncate">
                                  {item.label}
                                </span>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </section>
                );
              })}
            </div>
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
