import {
  BadgeCheck,
  Building2,
  ShieldCheck,
  Star,
  UsersRound,
} from "lucide-react";

import SearchPanel from "./SearchPanel";

const statistics = [
  {
    value: "10.000+",
    label: "Seçili deneyim",
    icon: Star,
  },
  {
    value: "500+",
    label: "Doğrulanmış acente",
    icon: Building2,
  },
  {
    value: "250.000+",
    label: "Mutlu misafir",
    icon: UsersRound,
  },
];

export default function Hero() {
  return (
    <section className="relative min-h-[900px] overflow-hidden bg-slate-950">
      {/* Arka plan */}
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1530789253388-582c481c54b0?auto=format&fit=crop&w=2400&q=90"
          alt="Turobus tur deneyimi"
          className="h-full w-full object-cover object-center"
        />

        <div className="absolute inset-0 bg-slate-950/60" />

        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/75 to-slate-950/20" />

        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/40" />
      </div>

      {/* Işık efektleri */}
      <div className="absolute -left-40 top-40 h-96 w-96 rounded-full bg-orange-500/20 blur-[120px]" />

      <div className="absolute -right-40 bottom-0 h-96 w-96 rounded-full bg-blue-500/10 blur-[120px]" />

      {/* İçerik */}
      <div className="relative z-10 mx-auto flex min-h-[900px] max-w-7xl items-center px-5 pb-20 pt-32 lg:px-8">
        <div className="w-full max-w-6xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-400/25 bg-orange-500/10 px-4 py-2 text-sm font-bold text-orange-200 backdrop-blur-xl">
            <BadgeCheck size={17} />
            Türkiye’nin yeni nesil tur pazaryeri
          </div>

          <h1 className="mt-8 max-w-5xl text-5xl font-black leading-[0.98] tracking-[-0.045em] text-white sm:text-6xl lg:text-[86px]">
            Dünyayı sadece

            <span className="block bg-gradient-to-r from-orange-400 via-orange-500 to-amber-300 bg-clip-text text-transparent">
              görme, yaşa.
            </span>
          </h1>

          <p className="mt-7 max-w-2xl text-lg font-medium leading-8 text-slate-300 sm:text-xl">
            Doğrulanmış acentelerden unutulmaz turları keşfet, seçenekleri
            karşılaştır ve deneyimini güvenle rezerve et.
          </p>

          <div className="mt-10 max-w-6xl">
            <SearchPanel />
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4 text-sm font-semibold text-white/75">
            <div className="flex items-center gap-2">
              <ShieldCheck size={19} className="text-emerald-400" />
              Güvenli ödeme
            </div>

            <div className="flex items-center gap-2">
              <BadgeCheck size={19} className="text-blue-400" />
              Doğrulanmış acenteler
            </div>

            <div className="flex items-center gap-2">
              <Star
                size={19}
                className="fill-amber-400 text-amber-400"
              />
              Gerçek misafir yorumları
            </div>
          </div>

          <div className="mt-14 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
            {statistics.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.label}
                  className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur-xl"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-orange-400">
                    <Icon size={22} />
                  </div>

                  <div>
                    <div className="text-xl font-black text-white">
                      {item.value}
                    </div>

                    <div className="text-xs font-semibold text-slate-400">
                      {item.label}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-950 to-transparent" />
    </section>
  );
}