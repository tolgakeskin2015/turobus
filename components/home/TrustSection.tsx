import {
  FaCheckCircle,
  FaCreditCard,
  FaHeadset,
  FaShieldAlt,
} from "react-icons/fa";

const benefits = [
  {
    title: "Doğrulanmış Acenteler",
    description:
      "Platformdaki tur sağlayıcıları belge ve işletme kontrollerinden geçirilir.",
    icon: FaCheckCircle,
  },
  {
    title: "Güvenli Ödeme",
    description:
      "Ödeme işlemleri korumalı ve güvenli altyapı üzerinden gerçekleştirilir.",
    icon: FaCreditCard,
  },
  {
    title: "Rezervasyon Güvencesi",
    description:
      "Tur bilgileri, fiyatlar ve rezervasyon koşulları açık şekilde sunulur.",
    icon: FaShieldAlt,
  },
  {
    title: "7/24 Destek",
    description:
      "Rezervasyon öncesinde ve sonrasında destek ekibimize ulaşabilirsiniz.",
    icon: FaHeadset,
  },
];

export default function TrustSection() {
  return (
    <section className="bg-slate-950 px-6 py-24 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="overflow-hidden rounded-[36px] border border-white/10 bg-gradient-to-br from-slate-900 to-slate-950 p-8 md:p-14">
          <div className="mx-auto mb-14 max-w-3xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-orange-400">
              Neden TUROBUS?
            </p>

            <h2 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">
              Tatilinizi güvenle planlayın
            </h2>

            <p className="mt-5 text-lg leading-8 text-slate-400">
              Turları karşılaştırın, doğrulanmış acenteleri inceleyin ve
              rezervasyonunuzu güvenli şekilde tamamlayın.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            {benefits.map((benefit) => {
              const Icon = benefit.icon;

              return (
                <article
                  key={benefit.title}
                  className="rounded-3xl border border-white/10 bg-white/[0.04] p-7 transition duration-300 hover:-translate-y-1 hover:border-orange-500/30 hover:bg-white/[0.07]"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/15 text-orange-400">
                    <Icon size={24} />
                  </div>

                  <h3 className="mt-6 text-xl font-black">
                    {benefit.title}
                  </h3>

                  <p className="mt-3 leading-7 text-slate-400">
                    {benefit.description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
