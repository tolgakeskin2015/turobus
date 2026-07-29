import Link from "next/link";
import {
  FaArrowRight,
  FaChartLine,
  FaGlobeEurope,
  FaHandshake,
} from "react-icons/fa";

const benefits = [
  {
    icon: FaGlobeEurope,
    title: "Daha Fazla Misafire Ulaşın",
    text: "Turlarınızı farklı şehirlerden ve ülkelerden gezginlere sunun.",
  },
  {
    icon: FaChartLine,
    title: "Satışlarınızı Büyütün",
    text: "Rezervasyon, kontenjan ve performans verilerini tek panelden yönetin.",
  },
  {
    icon: FaHandshake,
    title: "Güvenilir İş Ortağı Olun",
    text: "Doğrulanmış acente rozetiyle markanıza duyulan güveni artırın.",
  },
];

export default function OperatorCTA() {
  return (
    <section className="bg-slate-950 px-6 py-24 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="relative overflow-hidden rounded-[40px] border border-orange-500/20 bg-gradient-to-br from-orange-500 via-orange-600 to-amber-500 p-8 shadow-2xl shadow-orange-500/20 md:p-14">
          <div className="absolute -right-28 -top-28 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-slate-950/20 blur-3xl" />

          <div className="relative z-10 grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-white/75">
                Acente ve tur operatörleri için
              </p>

              <h2 className="mt-5 max-w-3xl text-4xl font-black tracking-tight md:text-6xl">
                Turlarınızı milyonlarca gezginle buluşturun.
              </h2>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-white/80">
                TUROBUS acente paneliyle turlarınızı yayınlayın, kontenjanınızı
                yönetin ve rezervasyonlarınızı tek noktadan takip edin.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/acente-basvuru"
                  className="inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-slate-950 px-7 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-slate-900"
                >
                  Acente Başvurusu Yap
                  <FaArrowRight />
                </Link>

                <Link
                  href="/acenteler"
                  className="inline-flex min-h-14 items-center justify-center rounded-2xl border border-white/30 bg-white/10 px-7 text-sm font-black text-white backdrop-blur-md transition hover:bg-white/20"
                >
                  Nasıl Çalışır?
                </Link>
              </div>
            </div>

            <div className="grid gap-4">
              {benefits.map((benefit) => {
                const Icon = benefit.icon;

                return (
                  <article
                    key={benefit.title}
                    className="flex gap-4 rounded-3xl border border-white/20 bg-white/10 p-5 backdrop-blur-xl"
                  >
                    <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
                      <Icon size={21} />
                    </div>

                    <div>
                      <h3 className="text-lg font-black">
                        {benefit.title}
                      </h3>

                      <p className="mt-2 leading-7 text-white/75">
                        {benefit.text}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
