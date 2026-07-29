import {
  FaApple,
  FaBell,
  FaCheckCircle,
  FaGooglePlay,
  FaHeart,
  FaMobileAlt,
  FaTicketAlt,
} from "react-icons/fa";

const features = [
  {
    icon: FaTicketAlt,
    title: "Rezervasyonların cebinde",
  },
  {
    icon: FaBell,
    title: "Anlık fırsat bildirimleri",
  },
  {
    icon: FaHeart,
    title: "Favorilerine hızlı erişim",
  },
];

export default function MobileAppCTA() {
  return (
    <section className="bg-slate-950 px-6 py-24 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="relative overflow-hidden rounded-[40px] border border-white/10 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 px-8 py-14 md:px-14">
          <div className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-orange-500/15 blur-[120px]" />
          <div className="absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-blue-500/10 blur-[120px]" />

          <div className="relative z-10 grid gap-14 lg:grid-cols-2 lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-4 py-2 text-sm font-black text-orange-400">
                <FaMobileAlt />
                TUROBUS mobil
              </div>

              <h2 className="mt-6 max-w-2xl text-4xl font-black tracking-tight md:text-6xl">
                Tatil planın her zaman yanında.
              </h2>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-400">
                Turları keşfet, rezervasyonlarını yönet ve özel fırsatlardan
                mobil uygulamayla anında haberdar ol.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {features.map((feature) => {
                  const Icon = feature.icon;

                  return (
                    <div
                      key={feature.title}
                      className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                    >
                      <Icon className="text-orange-400" size={20} />

                      <p className="mt-3 text-sm font-bold leading-6 text-slate-300">
                        {feature.title}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  className="inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-white px-6 text-left text-slate-950 transition hover:-translate-y-0.5"
                >
                  <FaApple size={28} />

                  <span>
                    <span className="block text-[10px] font-bold uppercase">
                      App Store’dan
                    </span>

                    <span className="block text-base font-black">
                      Çok yakında
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  className="inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl border border-white/15 bg-white/[0.05] px-6 text-left text-white transition hover:-translate-y-0.5 hover:bg-white/10"
                >
                  <FaGooglePlay size={25} />

                  <span>
                    <span className="block text-[10px] font-bold uppercase text-slate-400">
                      Google Play’de
                    </span>

                    <span className="block text-base font-black">
                      Çok yakında
                    </span>
                  </span>
                </button>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-md">
              <div className="absolute inset-0 rounded-full bg-orange-500/20 blur-[80px]" />

              <div className="relative mx-auto w-[280px] rounded-[46px] border-[10px] border-slate-800 bg-slate-950 p-4 shadow-2xl">
                <div className="mx-auto mb-5 h-5 w-24 rounded-full bg-slate-800" />

                <div className="rounded-[30px] bg-gradient-to-b from-orange-500 to-orange-700 p-5">
                  <p className="text-xs font-bold text-white/70">
                    Merhaba gezgin
                  </p>

                  <h3 className="mt-2 text-2xl font-black">
                    Yeni bir maceraya hazır mısın?
                  </h3>

                  <div className="mt-6 rounded-2xl bg-white p-4 text-slate-950">
                    <p className="text-xs font-bold text-slate-400">
                      Yaklaşan rezervasyon
                    </p>

                    <p className="mt-2 font-black">
                      Ölüdeniz Tekne Turu
                    </p>

                    <div className="mt-4 flex items-center gap-2 text-xs font-bold text-emerald-600">
                      <FaCheckCircle />
                      Rezervasyon onaylandı
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-slate-900 p-4">
                    <p className="text-xs text-slate-500">Favoriler</p>
                    <p className="mt-2 text-xl font-black">12</p>
                  </div>

                  <div className="rounded-2xl bg-slate-900 p-4">
                    <p className="text-xs text-slate-500">Kuponlar</p>
                    <p className="mt-2 text-xl font-black">3</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
