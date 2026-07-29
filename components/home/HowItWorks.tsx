import {
  FaCalendarCheck,
  FaCheckCircle,
  FaCreditCard,
  FaSearchLocation,
} from "react-icons/fa";

const steps = [
  {
    number: "01",
    title: "Deneyimini keşfet",
    description:
      "Destinasyon, tarih ve kategori seçerek sana uygun tur ve aktiviteleri bul.",
    icon: FaSearchLocation,
  },
  {
    number: "02",
    title: "Seçenekleri karşılaştır",
    description:
      "Fiyatları, programları, acente puanlarını ve gerçek misafir yorumlarını incele.",
    icon: FaCheckCircle,
  },
  {
    number: "03",
    title: "Güvenle rezervasyon yap",
    description:
      "Tarih ve kişi sayısını belirle, güvenli ödeme altyapısıyla rezervasyonunu tamamla.",
    icon: FaCreditCard,
  },
  {
    number: "04",
    title: "Deneyimini yaşa",
    description:
      "Rezervasyon bilgilerini görüntüle, tur gününde deneyiminin keyfini çıkar.",
    icon: FaCalendarCheck,
  },
];

export default function HowItWorks() {
  return (
    <section className="bg-slate-950 px-6 py-24 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-orange-400">
            Dört kolay adım
          </p>

          <h2 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">
            TUROBUS nasıl çalışır?
          </h2>

          <p className="mt-5 text-lg leading-8 text-slate-400">
            Aramadan rezervasyona kadar tüm süreci hızlı, şeffaf ve güvenli
            şekilde tamamla.
          </p>
        </div>

        <div className="relative grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          <div className="absolute left-[12%] right-[12%] top-16 hidden h-px bg-gradient-to-r from-transparent via-orange-500/40 to-transparent xl:block" />

          {steps.map((step) => {
            const Icon = step.icon;

            return (
              <article
                key={step.number}
                className="group relative rounded-[30px] border border-white/10 bg-gradient-to-br from-slate-900 to-slate-950 p-7 transition duration-300 hover:-translate-y-2 hover:border-orange-500/40"
              >
                <div className="flex items-center justify-between">
                  <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-500/20">
                    <Icon size={25} />
                  </div>

                  <span className="text-5xl font-black text-white/[0.06]">
                    {step.number}
                  </span>
                </div>

                <h3 className="mt-7 text-2xl font-black">
                  {step.title}
                </h3>

                <p className="mt-4 leading-7 text-slate-400">
                  {step.description}
                </p>

                <div className="mt-7 h-1 w-12 rounded-full bg-orange-500 transition-all duration-300 group-hover:w-24" />
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
