import Link from "next/link";
import {
  FaBed,
  FaBroom,
  FaCalendarAlt,
  FaDoorOpen,
  FaHotel,
  FaTags,
} from "react-icons/fa";
import HotelStats from "@/components/hotel/dashboard/HotelStats";
import TodayOverview from "@/components/hotel/dashboard/TodayOverview";

const quickActions = [
  {
    href: "/dashboard/hotel/oteller",
    label: "Otel Yönetimi",
    description: "Otel bilgileri ve işletme ayarları",
    icon: FaHotel,
  },
  {
    href: "/dashboard/hotel/oda-tipleri",
    label: "Oda Tipleri",
    description: "Standart, deluxe, suite ve diğer tipler",
    icon: FaBed,
  },
  {
    href: "/dashboard/hotel/odalar",
    label: "Odalar",
    description: "Oda numaraları, kat ve durum yönetimi",
    icon: FaDoorOpen,
  },
  {
    href: "/dashboard/hotel/kontenjan",
    label: "Kontenjan",
    description: "Günlük müsaitlik ve satış durdurma",
    icon: FaCalendarAlt,
  },
  {
    href: "/dashboard/hotel/fiyatlar",
    label: "Fiyat Yönetimi",
    description: "Günlük fiyatlar ve fiyat planları",
    icon: FaTags,
  },
  {
    href: "/dashboard/hotel/housekeeping",
    label: "Housekeeping",
    description: "Temiz, kirli, kontrol ve bakım durumları",
    icon: FaBroom,
  },
];

export default function HotelDashboardPage() {
  return (
    <main className="px-5 py-10 lg:px-10">
      <div className="mx-auto max-w-[1600px]">
        <header>
          <p className="text-sm font-black uppercase tracking-[0.25em] text-orange-400">
            HOTEL COMMAND CENTER
          </p>

          <h2 className="mt-3 text-4xl font-black md:text-5xl">
            Hotel Dashboard
          </h2>

          <p className="mt-4 max-w-3xl text-slate-400">
            Otelleri, odaları, kontenjanı, fiyatları ve
            housekeeping operasyonunu tek merkezden yönetin.
          </p>
        </header>

        <div className="mt-9">
          <HotelStats />
        </div>

        <div className="mt-6">
          <TodayOverview />
        </div>

        <section className="mt-8">
          <h3 className="text-2xl font-black">
            Hızlı İşlemler
          </h3>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {quickActions.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-3xl border border-white/10 bg-slate-900 p-6 transition hover:-translate-y-1 hover:border-orange-500/30"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 text-xl text-orange-400">
                    <Icon />
                  </div>

                  <h4 className="mt-5 text-xl font-black">
                    {item.label}
                  </h4>

                  <p className="mt-2 text-sm text-slate-500">
                    {item.description}
                  </p>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
