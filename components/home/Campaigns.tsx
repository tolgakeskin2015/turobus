import Link from "next/link";
import {
  FaArrowRight,
  FaBolt,
  FaCalendarCheck,
  FaFire,
  FaGift,
} from "react-icons/fa";

const campaigns = [
  {
    title: "Erken Rezervasyon Fırsatları",
    description:
      "Yaz tatilini erkenden planla, seçili turlarda avantajlı fiyatları yakala.",
    label: "%30'a varan indirim",
    icon: FaCalendarCheck,
    href: "/kampanyalar",
    className:
      "from-orange-500 via-orange-600 to-amber-500",
  },
  {
    title: "Son Dakika Turları",
    description:
      "Yaklaşan kalkışlarda kalan son kontenjanları özel fiyatlarla keşfet.",
    label: "Sınırlı kontenjan",
    icon: FaBolt,
    href: "/kampanyalar",
    className:
      "from-rose-500 via-red-600 to-orange-600",
  },
  {
    title: "Çifte Özel Tatil Paketleri",
    description:
      "Balayı ve romantik kaçamaklar için çiftlere özel seçili deneyimler.",
    label: "Özel paketler",
    icon: FaGift,
    href: "/kampanyalar",
    className:
      "from-fuchsia-600 via-purple-600 to-indigo-700",
  },
];

export default function Campaigns() {
  return (
    <section className="bg-slate-950 px-6 py-24 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.22em] text-orange-400">
              <FaFire />
              Kaçırılmayacak fırsatlar
            </div>

            <h2 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">
              Özel kampanyalar
            </h2>

            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-400">
              Seçili turlarda erken rezervasyon, son dakika ve özel paket
              avantajlarını keşfet.
            </p>
          </div>

          <Link
            href="/kampanyalar"
            className="inline-flex items-center gap-2 text-sm font-black text-orange-400 transition hover:text-orange-300"
          >
            Tüm kampanyaları gör
            <FaArrowRight />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {campaigns.map((campaign) => {
            const Icon = campaign.icon;

            return (
              <Link
                key={campaign.title}
                href={campaign.href}
                className={`group relative min-h-[360px] overflow-hidden rounded-[34px] bg-gradient-to-br ${campaign.className} p-8 shadow-2xl transition duration-300 hover:-translate-y-2`}
              >
                <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/15 blur-3xl" />
                <div className="absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-slate-950/20 blur-3xl" />

                <div className="relative z-10 flex h-full flex-col">
                  <div className="flex items-start justify-between">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-white backdrop-blur-lg">
                      <Icon size={24} />
                    </div>

                    <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-black text-white backdrop-blur-lg">
                      {campaign.label}
                    </span>
                  </div>

                  <div className="mt-auto pt-20">
                    <h3 className="text-3xl font-black leading-tight">
                      {campaign.title}
                    </h3>

                    <p className="mt-4 max-w-md leading-7 text-white/80">
                      {campaign.description}
                    </p>

                    <div className="mt-7 inline-flex items-center gap-3 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition group-hover:gap-5">
                      Fırsatları İncele
                      <FaArrowRight />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
