import {
  FaArrowRight,
  FaBuilding,
  FaCheckCircle,
  FaMapMarkerAlt,
  FaStar,
} from "react-icons/fa";

const operators = [
  {
    name: "Ege Travel",
    location: "Fethiye, Muğla",
    rating: "4.9",
    reviews: "2.184 yorum",
    tours: "86 aktif tur",
    initials: "ET",
  },
  {
    name: "Cappadocia Routes",
    location: "Göreme, Nevşehir",
    rating: "4.8",
    reviews: "1.746 yorum",
    tours: "64 aktif tur",
    initials: "CR",
  },
  {
    name: "Mediterranean Trips",
    location: "Antalya",
    rating: "4.9",
    reviews: "3.210 yorum",
    tours: "112 aktif tur",
    initials: "MT",
  },
  {
    name: "Anatolia Experience",
    location: "İstanbul",
    rating: "4.8",
    reviews: "1.982 yorum",
    tours: "94 aktif tur",
    initials: "AE",
  },
];

export default function VerifiedOperators() {
  return (
    <section className="bg-slate-950 px-6 py-24 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-orange-400">
              Güvenilir iş ortakları
            </p>

            <h2 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">
              Doğrulanmış acenteler
            </h2>

            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-400">
              Belgeleri kontrol edilmiş ve misafirler tarafından yüksek puan
              alan tur sağlayıcılarını keşfet.
            </p>
          </div>

          <a
            href="/acenteler"
            className="inline-flex items-center gap-2 text-sm font-black text-orange-400 transition hover:text-orange-300"
          >
            Tüm acenteleri gör
            <FaArrowRight />
          </a>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {operators.map((operator) => (
            <article
              key={operator.name}
              className="group rounded-[30px] border border-white/10 bg-gradient-to-br from-slate-900 to-slate-950 p-7 transition duration-300 hover:-translate-y-2 hover:border-orange-500/40 hover:shadow-2xl hover:shadow-orange-500/10"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500 text-xl font-black text-white">
                  {operator.initials}
                </div>

                <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-black text-emerald-400">
                  <FaCheckCircle />
                  Doğrulandı
                </div>
              </div>

              <h3 className="mt-6 text-2xl font-black">
                {operator.name}
              </h3>

              <div className="mt-3 flex items-center gap-2 text-sm text-slate-400">
                <FaMapMarkerAlt className="text-orange-500" />
                {operator.location}
              </div>

              <div className="mt-5 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div>
                  <div className="flex items-center gap-2 font-black">
                    <FaStar className="text-yellow-400" />
                    {operator.rating}
                  </div>

                  <p className="mt-1 text-xs text-slate-500">
                    {operator.reviews}
                  </p>
                </div>

                <div className="text-right">
                  <FaBuilding className="ml-auto text-orange-400" />
                  <p className="mt-1 text-xs font-bold text-slate-400">
                    {operator.tours}
                  </p>
                </div>
              </div>

              <a
                href="/acenteler"
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-black transition hover:border-orange-500/40 hover:bg-orange-500 hover:text-white"
              >
                Acente Profilini İncele
                <FaArrowRight />
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
