"use client";

import Link from "next/link";
import {
  FaArrowRight,
  FaBed,
  FaBroom,
  FaCalendarAlt,
  FaCashRegister,
  FaChartLine,
  FaClipboardList,
  FaCloud,
  FaCog,
  FaDoorOpen,
  FaFileInvoiceDollar,
  FaHotel,
  FaLink,
  FaMoneyBillWave,
  FaMoon,
  FaSignInAlt,
  FaTags,
} from "react-icons/fa";

type ModuleCard = {
  title: string;
  description: string;
  href: string;
  status: "active" | "setup";
  icon: React.ComponentType<{
    className?: string;
  }>;
  category:
    | "operation"
    | "finance"
    | "distribution"
    | "setup";
};

const modules: ModuleCard[] = [
  {
    title: "Rezervasyonlar",
    description:
      "Otel rezervasyonlarını oluşturun, düzenleyin ve yönetin.",
    href: "/dashboard/hotel/rezervasyonlar",
    status: "active",
    icon: FaClipboardList,
    category: "operation",
  },
  {
    title: "Room Planner",
    description:
      "Oda planını görüntüleyin, oda atayın ve operasyonu yönetin.",
    href: "/dashboard/hotel/room-planner",
    status: "active",
    icon: FaBed,
    category: "operation",
  },
  {
    title: "Check-in / Check-out",
    description:
      "Giriş, konaklayan misafir ve çıkış işlemlerini yönetin.",
    href: "/dashboard/hotel/front-office",
    status: "active",
    icon: FaSignInAlt,
    category: "operation",
  },
  {
    title: "Housekeeping PRO",
    description:
      "Temizlik görevlerini, kat görevlilerini ve oda durumlarını takip edin.",
    href: "/dashboard/hotel/housekeeping",
    status: "active",
    icon: FaBroom,
    category: "operation",
  },
  {
    title: "Folio & Ödemeler",
    description:
      "Misafir harcamalarını, tahsilatları, iadeleri ve bakiyeleri yönetin.",
    href: "/dashboard/hotel/folio",
    status: "active",
    icon: FaFileInvoiceDollar,
    category: "finance",
  },
  {
    title: "Night Audit",
    description:
      "Gün sonu kontrollerini yapın ve işletme gününü kapatın.",
    href: "/dashboard/hotel/night-audit",
    status: "active",
    icon: FaMoon,
    category: "finance",
  },
  {
    title: "Revenue Dashboard",
    description:
      "Doluluk, ADR, RevPAR, gelir ve kanal performansını inceleyin.",
    href: "/dashboard/hotel/revenue-dashboard",
    status: "active",
    icon: FaChartLine,
    category: "finance",
  },
  {
    title: "Channel Manager",
    description:
      "Kanal bağlantılarını ve senkronizasyon kuyruğunu yönetin.",
    href: "/dashboard/hotel/channel-manager",
    status: "active",
    icon: FaCloud,
    category: "distribution",
  },
  {
    title: "Kanal Eşleştirmeleri",
    description:
      "Oda tiplerini ve fiyat planlarını satış kanallarıyla eşleştirin.",
    href: "/dashboard/hotel/channel-mapping",
    status: "active",
    icon: FaLink,
    category: "distribution",
  },
  {
    title: "Kontenjan",
    description:
      "Oda tipi bazında günlük müsaitlik ve satış kapasitesini yönetin.",
    href: "/dashboard/hotel/kontenjan",
    status: "active",
    icon: FaCalendarAlt,
    category: "setup",
  },
  {
    title: "Fiyatlar",
    description:
      "Fiyat planlarını, dönemsel fiyatları ve konaklama kurallarını yönetin.",
    href: "/dashboard/hotel/fiyatlar",
    status: "active",
    icon: FaTags,
    category: "setup",
  },
  {
    title: "Oteller ve Odalar",
    description:
      "Otel, oda tipi ve fiziksel oda kayıtlarını yönetin.",
    href: "/dashboard/oteller",
    status: "active",
    icon: FaHotel,
    category: "setup",
  },
];

const categoryLabels = {
  operation: {
    title: "Günlük Operasyon",
    description:
      "Rezervasyon, oda, giriş-çıkış ve temizlik süreçleri.",
  },
  finance: {
    title: "Finans ve Gelir",
    description:
      "Folio, tahsilat, gün sonu ve revenue yönetimi.",
  },
  distribution: {
    title: "Dağıtım ve Kanallar",
    description:
      "OTA bağlantıları, eşleştirmeler ve senkronizasyon.",
  },
  setup: {
    title: "Otel Yapılandırması",
    description:
      "Oteller, odalar, kontenjanlar ve fiyat planları.",
  },
};

function ModuleSection({
  category,
}: {
  category: ModuleCard["category"];
}) {
  const cards = modules.filter(
    (module) => module.category === category
  );

  const heading =
    categoryLabels[category];

  return (
    <section className="mt-10">
      <div>
        <h2 className="text-2xl font-black">
          {heading.title}
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          {heading.description}
        </p>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((module) => {
          const Icon = module.icon;

          return (
            <Link
              key={module.href}
              href={module.href}
              className="group rounded-[30px] border border-white/10 bg-slate-900 p-6 transition hover:-translate-y-1 hover:border-orange-400/50 hover:bg-slate-800"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/15 text-xl text-orange-400">
                  <Icon />
                </div>

                <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-black text-emerald-400">
                  Aktif
                </span>
              </div>

              <h3 className="mt-6 text-2xl font-black">
                {module.title}
              </h3>

              <p className="mt-3 min-h-[48px] text-sm leading-6 text-slate-500">
                {module.description}
              </p>

              <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-5">
                <span className="font-black text-orange-400">
                  Modülü Aç
                </span>

                <FaArrowRight className="text-orange-400 transition group-hover:translate-x-1" />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export default function HotelPmsCenterPage() {
  return (
    <main className="px-5 py-10 lg:px-10">
      <div className="mx-auto max-w-[1750px]">
        <header className="rounded-[36px] border border-white/10 bg-slate-900 p-7 md:p-10">
          <div className="flex flex-col justify-between gap-7 xl:flex-row xl:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.25em] text-orange-400">
                TUROS HOTEL PMS
              </p>

              <h1 className="mt-4 text-4xl font-black md:text-6xl">
                Otel Kontrol Merkezi
              </h1>

              <p className="mt-5 max-w-4xl text-lg leading-8 text-slate-400">
                Otel operasyonlarını, gelirleri,
                odaları ve satış kanallarını tek
                merkezden yönetin.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                {
                  label: "Aktif Modül",
                  value: modules.length,
                  icon: FaCog,
                },
                {
                  label: "Operasyon",
                  value: modules.filter(
                    (item) =>
                      item.category ===
                      "operation"
                  ).length,
                  icon: FaDoorOpen,
                },
                {
                  label: "Finans",
                  value: modules.filter(
                    (item) =>
                      item.category ===
                      "finance"
                  ).length,
                  icon: FaMoneyBillWave,
                },
                {
                  label: "Kanal",
                  value: modules.filter(
                    (item) =>
                      item.category ===
                      "distribution"
                  ).length,
                  icon: FaCashRegister,
                },
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <article
                    key={item.label}
                    className="min-w-[125px] rounded-2xl bg-slate-950 p-4 text-center"
                  >
                    <Icon className="mx-auto text-orange-400" />

                    <p className="mt-3 text-2xl font-black">
                      {item.value}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {item.label}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        </header>

        <ModuleSection category="operation" />
        <ModuleSection category="finance" />
        <ModuleSection category="distribution" />
        <ModuleSection category="setup" />
      </div>
    </main>
  );
}
