import { FaQuoteLeft, FaStar } from "react-icons/fa";

const testimonials = [
  {
    name: "Ayşe K.",
    city: "İstanbul",
    text: "Rezervasyon süreci çok kolaydı. Acente bilgileri ve tur detayları açık olduğu için güvenle karar verdik.",
    tour: "Fethiye Jeep Safari",
    rating: 5,
    initials: "AK",
  },
  {
    name: "Mehmet D.",
    city: "Ankara",
    text: "Fiyatları karşılaştırmak çok işime yaradı. Tur günü de her şey anlatıldığı gibi ilerledi.",
    tour: "Ölüdeniz Tekne Turu",
    rating: 5,
    initials: "MD",
  },
  {
    name: "Lisa M.",
    city: "Berlin",
    text: "The booking experience was simple and clear. We found a reliable local operator and had a wonderful day.",
    tour: "Kapadokya Balon Turu",
    rating: 5,
    initials: "LM",
  },
];

export default function Testimonials() {
  return (
    <section className="bg-slate-950 px-6 py-24 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-orange-400">
              Gerçek misafir deneyimleri
            </p>

            <h2 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">
              Gezginler TUROBUS hakkında ne diyor?
            </h2>

            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-400">
              Doğrulanmış rezervasyonlardan gelen yorumlarla deneyimleri
              karşılaştırın.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4">
            <div className="flex gap-1 text-yellow-400">
              <FaStar />
              <FaStar />
              <FaStar />
              <FaStar />
              <FaStar />
            </div>

            <div>
              <div className="font-black">4.9 / 5</div>
              <div className="text-xs text-slate-500">
                12.480 doğrulanmış yorum
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {testimonials.map((item) => (
            <article
              key={item.name}
              className="rounded-[30px] border border-white/10 bg-gradient-to-br from-slate-900 to-slate-950 p-7 transition duration-300 hover:-translate-y-1 hover:border-orange-500/30"
            >
              <div className="flex items-start justify-between">
                <FaQuoteLeft className="text-3xl text-orange-500/70" />

                <div className="flex gap-1 text-yellow-400">
                  {Array.from({ length: item.rating }).map((_, index) => (
                    <FaStar key={index} size={14} />
                  ))}
                </div>
              </div>

              <p className="mt-7 min-h-32 text-lg leading-8 text-slate-300">
                “{item.text}”
              </p>

              <div className="mt-8 border-t border-white/10 pt-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500 font-black text-white">
                    {item.initials}
                  </div>

                  <div>
                    <h3 className="font-black">{item.name}</h3>
                    <p className="text-sm text-slate-500">{item.city}</p>
                  </div>
                </div>

                <p className="mt-4 text-sm font-semibold text-orange-400">
                  {item.tour}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
