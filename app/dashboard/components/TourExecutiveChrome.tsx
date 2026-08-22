"use client";

import Link from "next/link";

import {
  usePathname,
} from "next/navigation";

import {
  FaBrain,
  FaChartLine,
  FaCheckCircle,
  FaClipboardCheck,
  FaCog,
  FaComments,
  FaMobileAlt,
  FaRoute,
  FaShieldAlt,
} from "react-icons/fa";


type ModuleKey =
  | "status"
  | "readiness"
  | "messages"
  | "ai"
  | "platform"
  | "mobile";


type Props = {
  tourId: string;
  moduleKey: ModuleKey;
};


const meta = {
  status: {
    eyebrow:
      "OPERASYON LIFECYCLE",
    title:
      "Durum & Akış Motoru",
    description:
      "Turun satıştan tamamlanmaya kadar hangi aşamada olduğunu, geçiş koşullarını ve readiness engellerini yönetin.",
    icon:
      FaRoute,
    tone:
      "text-orange-300",
  },

  readiness: {
    eyebrow:
      "ÇIKIŞ HAZIRLIĞI",
    title:
      "Operasyon Hazırlık Merkezi",
    description:
      "Yolcu, belge, manifest, ulaşım ve kritik hazırlık sinyallerini çıkıştan önce tek merkezde kontrol edin.",
    icon:
      FaClipboardCheck,
    tone:
      "text-amber-300",
  },

  messages: {
    eyebrow:
      "OPERASYON İLETİŞİMİ",
    title:
      "Mesaj & İletişim Merkezi",
    description:
      "Müşteri, tedarikçi, rehber ve operasyon ekibi iletişimini kanal ve teslimat durumu ile takip edin.",
    icon:
      FaComments,
    tone:
      "text-cyan-300",
  },

  ai: {
    eyebrow:
      "KARAR DESTEK",
    title:
      "AI Operasyon Asistanı",
    description:
      "Gerçek operasyon verilerinden oluşturulan risk skorlarını, bulguları ve önerilen aksiyonları yönetin.",
    icon:
      FaBrain,
    tone:
      "text-violet-300",
  },

  platform: {
    eyebrow:
      "PLATFORM CONTROL",
    title:
      "Platform Kontrol Merkezi",
    description:
      "Audit, provider, bildirim, finans dağıtım, feature flag ve yönetim sinyallerini tek kontrol ekranında izleyin.",
    icon:
      FaCog,
    tone:
      "text-emerald-300",
  },

  mobile: {
    eyebrow:
      "SAHA OPERASYONU",
    title:
      "Mobil Saha Merkezi",
    description:
      "Rehber ve saha ekibinin yolculuk sırasında ihtiyaç duyduğu kritik işlemlere hızlı erişim sağlayın.",
    icon:
      FaMobileAlt,
    tone:
      "text-blue-300",
  },
} satisfies Record<
  ModuleKey,
  {
    eyebrow: string;
    title: string;
    description: string;
    icon: typeof FaRoute;
    tone: string;
  }
>;


const modules = [
  {
    key:
      "status",
    label:
      "Durum",
    path:
      "durum",
    icon:
      FaRoute,
  },
  {
    key:
      "readiness",
    label:
      "Hazırlık",
    path:
      "hazirlik",
    icon:
      FaClipboardCheck,
  },
  {
    key:
      "messages",
    label:
      "Mesajlar",
    path:
      "mesajlar",
    icon:
      FaComments,
  },
  {
    key:
      "ai",
    label:
      "AI Operasyon",
    path:
      "ai-operasyon",
    icon:
      FaBrain,
  },
  {
    key:
      "platform",
    label:
      "Platform",
    path:
      "platform-kontrol",
    icon:
      FaCog,
  },
  {
    key:
      "mobile",
    label:
      "Mobil",
    path:
      "mobil",
    icon:
      FaMobileAlt,
  },
] as const;


export default function TourExecutiveChrome({
  tourId,
  moduleKey,
}: Props) {

  const pathname =
    usePathname();

  const current =
    meta[moduleKey];

  const HeroIcon =
    current.icon;


  return (
    <section
      data-tour-executive-chrome
      className="mb-5 overflow-hidden rounded-[28px] border border-white/[.08] bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,.09),transparent_31%),linear-gradient(145deg,#07131f,#03080e)] shadow-[0_24px_80px_rgba(0,0,0,.20)]"
    >

      <div className="p-5 lg:p-6">

        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

          <div className="flex min-w-0 items-start gap-4">

            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-white/[.08] bg-black/25">

              <HeroIcon
                className={`text-lg ${current.tone}`}
              />

            </div>


            <div className="min-w-0">

              <div className={`text-[7px] font-black uppercase tracking-[.17em] ${current.tone}`}>
                {current.eyebrow}
              </div>

              <h1 className="mt-1.5 text-2xl font-black tracking-[-.04em] text-white lg:text-3xl">
                {current.title}
              </h1>

              <p className="mt-2 max-w-3xl text-[8px] leading-5 text-slate-500">
                {current.description}
              </p>

            </div>

          </div>


          <div className="flex shrink-0 flex-wrap gap-2">

            <Link
              href="/dashboard/turlar/control-tower"
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/[.07] bg-black/20 px-4 text-[8px] font-black text-slate-300 transition hover:border-orange-500/20 hover:text-orange-300"
            >
              <FaChartLine />
              Control Tower
            </Link>


            <Link
              href={`/dashboard/turlar/${tourId}`}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-orange-500 px-4 text-[8px] font-black text-white shadow-lg shadow-orange-500/10 transition hover:bg-orange-400"
            >
              <FaShieldAlt />
              Operasyon Cockpit
            </Link>

          </div>

        </div>

      </div>


      <div className="overflow-x-auto border-t border-white/[.06] bg-black/15">

        <div className="flex min-w-max gap-1 px-3 py-2">

          {modules.map(
            item => {

              const Icon =
                item.icon;

              const href =
                `/dashboard/turlar/${tourId}/${item.path}`;

              const active =
                pathname ===
                  href ||
                pathname.startsWith(
                  `${href}/`
                );


              return (

                <Link
                  key={
                    item.key
                  }
                  href={
                    href
                  }
                  className={`inline-flex min-h-9 items-center gap-2 rounded-lg px-3 text-[8px] font-black transition ${
                    active
                      ? "bg-orange-500 text-white shadow-lg shadow-orange-500/10"
                      : "text-slate-500 hover:bg-white/[.05] hover:text-white"
                  }`}
                >

                  <Icon className="text-[10px]" />

                  {item.label}

                </Link>
              );
            }
          )}

        </div>

      </div>


      <div className="flex items-center gap-2 border-t border-white/[.05] px-4 py-2 text-[7px] text-slate-600">

        <FaCheckCircle className="text-emerald-400" />

        Tour OS ortak profesyonel çalışma alanı

      </div>

    </section>
  );
}
