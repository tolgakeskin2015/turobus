"use client";

import Link from "next/link";
import {
  FaArrowRight,
  FaArrowsRotate,
  FaCloudArrowDown,
  FaCloudArrowUp,
  FaHotel,
  FaLink,
  FaServer,
  FaTriangleExclamation,
} from "react-icons/fa6";

const modules = [
  {
    title: "Kanal Bağlantıları",
    description:
      "Booking, Expedia ve diğer OTA bağlantılarını yönetin.",
    href: "/dashboard/hotel/channel-manager",
    icon: FaHotel,
  },
  {
    title: "Kanal Eşleştirmeleri",
    description:
      "OTA oda tiplerini ve fiyat planlarını PMS ile eşleştirin.",
    href: "/dashboard/hotel/channel-mapping",
    icon: FaLink,
  },
  {
    title: "Inbound Operasyonları",
    description:
      "OTA → PMS rezervasyon akışını ve gelen işlemleri takip edin.",
    href: "/dashboard/hotel/channel-operations",
    icon: FaCloudArrowDown,
  },
  {
    title: "Outbound Senkronizasyon",
    description:
      "PMS → OTA stok, fiyat ve kısıtlama işlemlerini takip edin.",
    href: "/dashboard/hotel/channel-operations",
    icon: FaCloudArrowUp,
  },
];

export default function DistributionCenterPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white md:px-10">
      <div className="mx-auto max-w-[1600px]">
        <section className="overflow-hidden rounded-[32px] border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-8 shadow-2xl md:p-10">
          <div className="flex flex-col gap-8 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.25em] text-orange-400">
                <FaServer />
                TUROBUS DISTRIBUTION ENGINE
              </div>

              <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-tight md:text-5xl">
                Hotel Distribution
                <span className="block text-slate-400">
                  Control Center
                </span>
              </h1>

              <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-400 md:text-base">
                OTA rezervasyonları, kanal bağlantıları, oda
                eşleştirmeleri, stok, fiyat ve senkronizasyon
                operasyonlarının merkezi.
              </p>
            </div>

            <div className="rounded-[28px] border border-emerald-500/20 bg-emerald-500/10 p-6 xl:min-w-[270px]">
              <div className="flex items-center gap-3 text-emerald-300">
                <FaArrowsRotate />
                <span className="font-black">
                  Distribution Engine
                </span>
              </div>

              <div className="mt-4 text-3xl font-black">
                Hazır
              </div>

              <div className="mt-2 text-xs text-emerald-200/60">
                Inbound + Outbound altyapısı aktif
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Metric
            title="OTA → PMS"
            value="Inbound"
            text="Rezervasyon alma motoru"
            icon={<FaCloudArrowDown />}
          />

          <Metric
            title="PMS → OTA"
            value="Outbound"
            text="Stok ve fiyat dağıtımı"
            icon={<FaCloudArrowUp />}
          />

          <Metric
            title="Mapping"
            value="Aktif"
            text="Oda ve kanal eşleştirmeleri"
            icon={<FaLink />}
          />

          <Metric
            title="Worker"
            value="Unified"
            text="Çift yönlü işlem motoru"
            icon={<FaServer />}
          />
        </section>

        <section className="mt-6">
          <div className="mb-5">
            <div className="text-xs font-black uppercase tracking-[0.2em] text-orange-400">
              OPERASYON MERKEZİ
            </div>

            <h2 className="mt-2 text-2xl font-black">
              Distribution Modülleri
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {modules.map((module) => {
              const Icon = module.icon;

              return (
                <Link
                  key={module.title}
                  href={module.href}
                  className="group rounded-[28px] border border-slate-800 bg-slate-900 p-6 transition hover:-translate-y-1 hover:border-orange-500/40 hover:bg-slate-900/80"
                >
                  <div className="flex items-start justify-between gap-6">
                    <div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-400">
                        <Icon />
                      </div>

                      <h3 className="mt-5 text-xl font-black">
                        {module.title}
                      </h3>

                      <p className="mt-2 max-w-lg text-sm leading-6 text-slate-400">
                        {module.description}
                      </p>
                    </div>

                    <FaArrowRight className="mt-3 text-slate-600 transition group-hover:translate-x-1 group-hover:text-orange-400" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="mt-6 rounded-[28px] border border-orange-500/20 bg-orange-500/5 p-6">
          <div className="flex items-start gap-4">
            <FaTriangleExclamation className="mt-1 text-orange-400" />

            <div>
              <div className="font-black">
                Gerçek OTA bağlantıları
              </div>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Provider adapter altyapısı hazır. Gerçek Booking,
                Expedia ve diğer OTA kimlik bilgileri bağlanana kadar
                provider işlemleri güvenli simülasyon katmanında
                çalışabilir.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({
  title,
  value,
  text,
  icon,
}: {
  title: string;
  value: string;
  text: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-[26px] border border-slate-800 bg-slate-900 p-6">
      <div className="text-xl text-orange-400">
        {icon}
      </div>

      <div className="mt-5 text-xs font-black uppercase tracking-wider text-slate-500">
        {title}
      </div>

      <div className="mt-2 text-2xl font-black">
        {value}
      </div>

      <div className="mt-2 text-xs text-slate-500">
        {text}
      </div>
    </div>
  );
}
