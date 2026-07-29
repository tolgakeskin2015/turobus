import {
  FaBusAlt,
  FaHeart,
  FaHiking,
  FaHotel,
  FaPlaneDeparture,
  FaShip,
  FaUmbrellaBeach,
  FaWater,
} from "react-icons/fa";

const categories = [
  {
    title: "Günübirlik Turlar",
    description: "Şehrinden çık, yeni rotalar keşfet.",
    count: "1.240 tur",
    icon: FaBusAlt,
  },
  {
    title: "Tekne Turları",
    description: "Koylar, adalar ve eşsiz deniz rotaları.",
    count: "680 tur",
    icon: FaShip,
  },
  {
    title: "Macera ve Aktivite",
    description: "Adrenalin dolu unutulmaz deneyimler.",
    count: "920 aktivite",
    icon: FaHiking,
  },
  {
    title: "Balayı Paketleri",
    description: "Çiftlere özel seçkin tatil deneyimleri.",
    count: "410 paket",
    icon: FaHeart,
  },
  {
    title: "Deniz Tatili",
    description: "Türkiye'nin en güzel sahil bölgeleri.",
    count: "870 seçenek",
    icon: FaUmbrellaBeach,
  },
  {
    title: "Rafting ve Su Sporları",
    description: "Nehirlerde ve denizde heyecanı yaşa.",
    count: "340 aktivite",
    icon: FaWater,
  },
  {
    title: "Konaklamalı Turlar",
    description: "Ulaşım ve otel dahil avantajlı paketler.",
    count: "760 tur",
    icon: FaHotel,
  },
  {
    title: "Yurt Dışı Turları",
    description: "Dünyanın en özel şehirlerini keşfet.",
    count: "530 tur",
    icon: FaPlaneDeparture,
  },
];

export default function Categories() {
  return (
    <section className="bg-slate-950 px-6 py-24 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-orange-400">
              İlgi alanına göre keşfet
            </p>

            <h2 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">
              Sana uygun deneyimi seç
            </h2>

            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-400">
              Tatil planına, ilgi alanına ve seyahat tarzına uygun tur
              kategorilerini keşfet.
            </p>
          </div>

          <a
            href="/turlar"
            className="text-sm font-black text-orange-400 transition hover:text-orange-300"
          >
            Tüm kategorileri gör →
          </a>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((category) => {
            const Icon = category.icon;

            return (
              <a
                key={category.title}
                href="/turlar"
                className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-slate-900 p-7 transition duration-300 hover:-translate-y-2 hover:border-orange-500/40 hover:shadow-2xl hover:shadow-orange-500/10"
              >
                <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-orange-500/10 blur-2xl transition group-hover:bg-orange-500/20" />

                <div className="relative">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/15 text-orange-400 transition group-hover:bg-orange-500 group-hover:text-white">
                    <Icon size={24} />
                  </div>

                  <h3 className="mt-6 text-xl font-black">
                    {category.title}
                  </h3>

                  <p className="mt-3 min-h-14 text-sm leading-7 text-slate-400">
                    {category.description}
                  </p>

                  <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-5">
                    <span className="text-sm font-bold text-orange-400">
                      {category.count}
                    </span>

                    <span className="translate-x-2 text-xl text-white opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100">
                      →
                    </span>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
