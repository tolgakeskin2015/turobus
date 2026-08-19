"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState } from "react";
import { usePathname,
  useRouter } from "next/navigation";
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
  FaShip,
  FaStar,
  FaTimes,
  FaTicketAlt,
  FaUserCircle,
  FaUsers,
  FaHotel,
  FaCoins,
} from "react-icons/fa";
import { supabase } from "@/lib/supabase";
import ManagerNotificationBell from "./components/ManagerNotificationBell";
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
  children?: Array<{
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    roles: AppRole[];
  }>;
};

type MenuGroup = {
  title: string;
  items: MenuItem[];
};

type SidebarAlertSummary = {
  unread: number;
  critical: number;
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
        label: "Kontrol Merkezi",
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
    title: "İŞLETME SİSTEMLERİ",
    items: [
      {
        href: "/dashboard/operasyon",
        label: "Tur Operasyon",
        icon: FaBus,
        roles: [
          "super_admin",
          "company_owner",
          "operation_manager",
          "sales",
          "accounting",
          "guide",
          "driver",
        ],
        children: [
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
            label: "Çıkış & Manifest",
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
            href: "/dashboard/turlar",
            label: "Tur Yönetimi",
            icon: FaBus,
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
        ],
      },

      {
        href: "/dashboard/activity-os",
        label: "Activity OS",
        icon: FaStar,
        roles: [
          "super_admin",
          "company_owner",
          "operation_manager",
          "sales",
          "accounting",
        ],
        children: [
          {
            href: "/dashboard/activity-os",
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
            href: "/dashboard/activity-os/calendar",
            label: "Takvim & Canlı Kontenjan",
            icon: FaClipboardList,
            roles: [
              "super_admin",
              "company_owner",
              "operation_manager",
              "sales",
            ],
          },
          {
            href: "/dashboard/activity-os/bookings",
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
            href: "/dashboard/activity-os/products",
            label: "Aktiviteler",
            icon: FaStar,
            roles: [
              "super_admin",
              "company_owner",
              "operation_manager",
              "sales",
            ],
          },
          {
            href: "/dashboard/activity-control-center",
            label: "Operasyon Kontrolü",
            icon: FaMapMarkedAlt,
            roles: [
              "super_admin",
              "company_owner",
              "operation_manager",
            ],
          },
          {
            href: "/dashboard/activity-network",
            label: "Activity Network",
            icon: FaUsers,
            roles: [
              "super_admin",
              "company_owner",
              "operation_manager",
              "sales",
            ],
          },
          {
            href: "/dashboard/activity-payment-center",
            label: "Ödeme Merkezi",
            icon: FaChartLine,
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
        href: "/dashboard/hotel/yonetim-merkezi",
        label: "Hotel OS",
        icon: FaHotel,
        roles: [
          "super_admin",
          "company_owner",
          "operation_manager",
          "sales",
          "accounting",
        ],
        children: [
          {
            href: "/dashboard/hotel/yonetim-merkezi",
            label: "Yönetim Merkezi",
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
            href: "/dashboard/hotel/rezervasyonlar",
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
            icon: FaChartLine,
            roles: [
              "super_admin",
              "company_owner",
              "operation_manager",
              "accounting",
            ],
          },
          {
            href: "/dashboard/hotel/revenue-dashboard",
            label: "Revenue",
            icon: FaChartLine,
            roles: [
              "super_admin",
              "company_owner",
              "operation_manager",
              "accounting",
            ],
          },
          {
            href: "/dashboard/hotel/distribution-center",
            label: "Kanal & Dağıtım",
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
        href: "/dashboard/villa-os",
        label: "Villa OS",
        icon: FaBuilding,
        roles: [
          "super_admin",
          "company_owner",
          "operation_manager",
          "sales",
          "accounting",
        ],
        children: [
          {
            href: "/dashboard/villa-os",
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
            href: "/dashboard/villa-os/control-center",
            label: "Operasyon Stüdyosu",
            icon: FaHotel,
            roles: [
              "super_admin",
              "company_owner",
              "operation_manager",
              "sales",
            ],
          },
          {
            href: "/dashboard/villa-os/erp",
            label: "ERP Yönetimi",
            icon: FaBuilding,
            roles: [
              "super_admin",
              "company_owner",
              "operation_manager",
              "accounting",
            ],
          },
          {
            href: "/dashboard/villa-os/b2b-network",
            label: "B2B Partner Ağı",
            icon: FaUsers,
            roles: [
              "super_admin",
              "company_owner",
              "operation_manager",
              "sales",
            ],
          },
          {
            href: "/dashboard/villa-os/finance-center",
            label: "Finans Merkezi",
            icon: FaChartLine,
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
        href: "/dashboard/package-os",
        label: "Package OS",
        icon: FaPlusCircle,
        roles: [
          "super_admin",
          "company_owner",
          "operation_manager",
          "sales",
          "accounting",
        ],
        children: [
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
            href: "/dashboard/package-os/bookings",
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
            href: "/dashboard/package-os/control-tower",
            label: "Kontrol Kulesi",
            icon: FaMapMarkedAlt,
            roles: [
              "super_admin",
              "company_owner",
              "operation_manager",
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
              "accounting",
            ],
          },
          {
            href: "/dashboard/package-os/finance",
            label: "Finans",
            icon: FaChartLine,
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
        href: "/biletler",
        label: "Biletler",
        icon: FaTicketAlt,
        roles: [
          "super_admin",
          "company_owner",
          "operation_manager",
          "sales",
          "accounting",
        ],
      },

      {
        href: "/dashboard/yat-os",
        label: "Yat & Tekne OS",
        icon: FaShip,
        roles: [
          "super_admin",
          "company_owner",
          "operation_manager",
          "sales",
          "accounting",
        ],
        children: [
          {
            href: "/dashboard/yat-os",
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
            href: "/dashboard/yat-os/executive-center",
            label: "Yönetici & Karar Merkezi",
            icon: FaChartLine,
            roles: [
              "super_admin",
              "company_owner",
              "operation_manager",
            ],
          },
          {
            href: "/dashboard/yat-os/control-tower",
            label: "Control Tower",
            icon: FaMapMarkedAlt,
            roles: [
              "super_admin",
              "company_owner",
              "operation_manager",
            ],
          },

          {
            href: "/dashboard/yat-os/crm-center",
            label: "CRM & Lead Center",
            icon: FaUsers,
            roles: [
              "super_admin",
              "company_owner",
              "operation_manager",
              "sales",
            ],
          },
          {
            href: "/dashboard/yat-os/crm-automation",
            label: "CRM Otomasyon & Alarm",
            icon: FaStar,
            roles: [
              "super_admin",
              "company_owner",
              "operation_manager",
              "sales",
            ],
          },

          {
            href: "/dashboard/yat-os/sales-center",
            label: "Satış & Teklif",
            icon: FaCoins,
            roles: [
              "super_admin",
              "company_owner",
              "operation_manager",
              "sales",
            ],
          },
          {
            href: "/dashboard/yat-os/sales-team",
            label: "Satış Ekibi & Hedefler",
            icon: FaUsers,
            roles: [
              "super_admin",
              "company_owner",
              "operation_manager",
            ],
          },
          {
            href: "/dashboard/yat-os/sales-performance",
            label: "Satış Performansı",
            icon: FaChartLine,
            roles: [
              "super_admin",
              "company_owner",
              "operation_manager",
              "sales",
            ],
          },
          {
            href: "/dashboard/yat-os/sales-commission",
            label: "Prim & Komisyon",
            icon: FaCoins,
            roles: [
              "super_admin",
              "company_owner",
              "operation_manager",
              "sales",
              "accounting",
            ],
          },

          {
            href: "/dashboard/yat-os/operation-center",
            label: "Operasyon Merkezi",
            icon: FaClipboardList,
            roles: [
              "super_admin",
              "company_owner",
              "operation_manager",
            ],
          },
          {
            href: "/dashboard/yat-os/dispatch-center",
            label: "Sefer Çıkış Kontrol",
            icon: FaMapMarkedAlt,
            roles: [
              "super_admin",
              "company_owner",
              "operation_manager",
            ],
          },

          {
            href: "/dashboard/yat-os/fleet-maintenance",
            label: "Filo Bakım & Evrak",
            icon: FaShip,
            roles: [
              "super_admin",
              "company_owner",
              "operation_manager",
            ],
          },

          {
            href: "/dashboard/yat-os/revenue-center",
            label: "Revenue & Fiyat Merkezi",
            icon: FaChartLine,
            roles: [
              "super_admin",
              "company_owner",
              "operation_manager",
              "accounting",
            ],
          },
          {
            href: "/dashboard/yat-os/revenue-intelligence",
            label: "Revenue Intelligence",
            icon: FaChartLine,
            roles: [
              "super_admin",
              "company_owner",
              "operation_manager",
              "accounting",
            ],
          },

          {
            href: "/dashboard/yat-os/finance-center",
            label: "Finans & Tahsilat",
            icon: FaChartLine,
            roles: [
              "super_admin",
              "company_owner",
              "operation_manager",
              "accounting",
            ],
          },
          {
            href: "/dashboard/yat-os/finance-control-tower",
            label: "Finance Control Tower",
            icon: FaChartLine,
            roles: [
              "super_admin",
              "company_owner",
              "operation_manager",
              "accounting",
            ],
          },

          {
            href: "/dashboard/yat-os/partner-center",
            label: "Partner Control",
            icon: FaBuilding,
            roles: [
              "super_admin",
              "company_owner",
              "operation_manager",
              "sales",
            ],
          },
        ],
      },

    ],
  },

  {
    title: "SATIŞ & MÜŞTERİ",
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
    title: "YÖNETİM & FİNANS",
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
        href: "/dashboard/personel",
        label: "Personel & Kullanıcılar",
        icon: FaUsers,
        roles: [
          "super_admin",
          "company_owner",
          "operation_manager",
        ],
      },
      {
        href: "/dashboard/hesabim",
        label: "Firma & Hesabım",
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

  const [openSubMenus, setOpenSubMenus] =
    useState<Set<string>>(() => new Set());

  function toggleSubMenu(key: string) {
    setOpenSubMenus((current) => {
      const next = new Set(current);

      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }

      return next;
    });
  }

  const [
    sidebarAlertSummary,
    setSidebarAlertSummary,
  ] = useState<SidebarAlertSummary>({
    unread: 0,
    critical: 0,
  });

  const [openMenuGroups, setOpenMenuGroups] = useState<
    Set<string>
  >(
    () =>
      new Set([
        "ANA MERKEZ",
        "İŞLETME SİSTEMLERİ",
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


  const loadSidebarAlertSummary =
    useCallback(
      async (
        companyId: string
      ) => {

        const result =
          await supabase.rpc(
            "get_package_operation_alert_summary",
            {
              p_company_id:
                companyId,
            }
          );


        if (result.error) {

          console.error(
            "Alarm özeti yüklenemedi:",
            result.error.message
          );

          return;
        }


        setSidebarAlertSummary({
          unread:
            Number(
              result.data?.unread ??
              0
            ),

          critical:
            Number(
              result.data?.critical ??
              0
            ),
        });

      },
      []
    );


  useEffect(() => {

    if (!membership) {
      return;
    }


    void loadSidebarAlertSummary(
      membership.company_id
    );


    const timer =
      window.setInterval(
        () => {

          void loadSidebarAlertSummary(
            membership.company_id
          );

        },
        30000
      );


    return () => {
      window.clearInterval(
        timer
      );
    };

  }, [
    membership,
    pathname,
    loadSidebarAlertSummary,
  ]);


  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const visibleMenuGroups = useMemo(() => {
    if (!membership) return [];

    return menuGroups
      .map((group) => ({
        ...group,
        items: group.items
          .filter((item) =>
            item.roles.includes(membership.role)
          )
          .map((item) => ({
            ...item,
            children: item.children?.filter((child) =>
              child.roles.includes(membership.role)
            ),
          })),
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

          <div className="flex items-center gap-2">

            <ManagerNotificationBell
              companyId={
                membership.company_id
              }
            />

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
        </div>
      </header>

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[296px] border-r border-white/[.06] bg-[#070c12] transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="border-b border-white/[.06] px-4 py-4">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-orange-400">
              TUROBUS OS
            </p>

            <h2 className="mt-2 truncate text-lg font-black tracking-tight">
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

            <div className="mt-3 flex items-center gap-3 rounded-xl border border-white/[.05] bg-black/20 p-3">
              <FaBuilding className="text-orange-400" />

              <div className="min-w-0">
                <p className="truncate text-sm font-black">
                  {membership.full_name ??
                    "TUROBUS Kullanıcısı"}
                </p>

                <p className="mt-0.5 text-[10px] text-slate-500">
                  {roleLabels[membership.role]}
                </p>
              </div>
            </div>
          </div>

          <nav className="turobus-sidebar-scroll flex-1 overflow-y-auto px-2.5 py-3">
            <div className="space-y-1.5">
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
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left transition ${
                        hasActiveItem
                          ? "bg-white/[0.04]"
                          : "hover:bg-white/[0.03]"
                      }`}
                    >
                      <span
                        className={`text-[9px] font-black uppercase tracking-[0.18em] ${
                          hasActiveItem
                            ? "text-orange-400"
                            : "text-slate-600"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          {group.title}

                          {group.title ===
                            "PAKET SATIŞ MERKEZİ" &&
                            sidebarAlertSummary.unread > 0 && (
                              <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-black text-white">
                                {sidebarAlertSummary.unread > 99
                                  ? "99+"
                                  : sidebarAlertSummary.unread}
                              </span>
                            )}
                        </span>
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
                        <div className="mt-1 space-y-0.5 pb-1">
                          {group.items.map((item) => {
                            const Icon = item.icon;

                            const isActive =
                              item.href === "/dashboard"
                                ? pathname === "/dashboard"
                                : pathname.startsWith(
                                    item.href
                                  );

                            const hasChildren =
                              Boolean(item.children?.length);

                            const subMenuOpen =
                              openSubMenus.has(item.href) ||
                              item.children?.some((child) =>
                                pathname.startsWith(child.href)
                              );

                            if (hasChildren) {
                              return (
                                <div key={item.href}>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      toggleSubMenu(item.href)
                                    }
                                    className={`group flex min-h-10 w-full items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-bold transition ${
                                      isActive
                                        ? "border border-orange-500/20 bg-orange-500/10 text-orange-300"
                                        : "text-slate-400 hover:bg-white/[0.05] hover:text-white"
                                    }`}
                                  >
                                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-950">
                                      <Icon className="text-sm" />
                                    </span>

                                    <span className="min-w-0 flex-1 truncate text-left">
                                      {item.label}
                                    </span>

                                    <FaChevronDown
                                      className={`text-xs transition-transform ${
                                        subMenuOpen
                                          ? "rotate-180 text-orange-400"
                                          : "text-slate-600"
                                      }`}
                                    />
                                  </button>

                                  {subMenuOpen && (
                                    <div className="ml-4 mt-1 space-y-0.5 border-l border-white/[.08] pl-2.5">
                                      {item.children?.map((child) => {
                                        const ChildIcon = child.icon;

                                        const childActive =
                                          pathname === child.href ||
                                          pathname.startsWith(
                                            child.href + "/"
                                          );

                                        return (
                                          <Link
                                            key={child.href}
                                            href={child.href}
                                            className={`flex min-h-9 items-center gap-2.5 rounded-lg px-2.5 text-[11px] font-bold transition ${
                                              childActive
                                                ? "bg-orange-500 text-white"
                                                : "text-slate-500 hover:bg-white/[0.05] hover:text-white"
                                            }`}
                                          >
                                            <ChildIcon className="text-xs" />
                                            <span>{child.label}</span>
                                          </Link>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            }

                            return (
                              <Link
                                key={item.href}
                                href={item.href}
                                className={`group flex min-h-10 items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-bold transition ${
                                  isActive
                                    ? "border border-orange-500/30 bg-orange-500/15 text-orange-300 shadow-lg shadow-orange-500/5"
                                    : "text-slate-400 hover:bg-white/[0.05] hover:text-white"
                                }`}
                              >
                                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                                  isActive
                                    ? "bg-white/15"
                                    : "bg-slate-950 group-hover:bg-white/[0.06]"
                                }`}>
                                  <Icon className="text-sm" />
                                </span>

                                <span className="min-w-0 flex-1 truncate">
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

          <div className="border-t border-white/[.06] p-3">
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

      <div className="lg:pl-[296px]">
        {children}
      </div>

      <style jsx global>{`
        .turobus-sidebar-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(249, 115, 22, 0.28) transparent;
        }

        .turobus-sidebar-scroll::-webkit-scrollbar {
          width: 5px;
        }

        .turobus-sidebar-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .turobus-sidebar-scroll::-webkit-scrollbar-thumb {
          background: rgba(249, 115, 22, 0.25);
          border-radius: 999px;
        }

        .turobus-sidebar-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(249, 115, 22, 0.42);
        }
      `}</style>
    </div>
  );
}
