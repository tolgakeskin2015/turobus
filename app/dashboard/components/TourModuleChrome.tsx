"use client";

import Link from "next/link";

import {
  usePathname,
} from "next/navigation";

import {
  FaArrowLeft,
  FaBed,
  FaBus,
  FaClipboardCheck,
  FaExclamationTriangle,
  FaFileAlt,
  FaMoneyBillWave,
  FaPlane,
  FaRoute,
  FaTasks,
  FaUsers,
} from "react-icons/fa";


type ModuleKey =
  | "passengers"
  | "flight"
  | "bus"
  | "finance"
  | "suppliers"
  | "tasks"
  | "documents"
  | "incidents";


type Props = {
  tourId: string;
  moduleKey: ModuleKey;
};


const moduleMeta = {
  passengers: {
    eyebrow:
      "YOLCU OPERASYONU",
    title:
      "Yolcu & Rooming",
    description:
      "Rezervasyon yolcuları, kimlik hazırlığı, oda dağılımı ve manifest uyumunu tek ekrandan yönetin.",
    icon:
      FaUsers,
    accent:
      "text-cyan-300",
  },

  flight: {
    eyebrow:
      "ULAŞIM OPERASYONU",
    title:
      "Uçuş Yönetimi",
    description:
      "PNR, uçuş segmenti, ticketing deadline ve yolcu-uçuş eşleşmesini operasyon seviyesinde yönetin.",
    icon:
      FaPlane,
    accent:
      "text-blue-300",
  },

  bus: {
    eyebrow:
      "ULAŞIM OPERASYONU",
    title:
      "Otobüs Yönetimi",
    description:
      "Araç, koltuk planı, yolcu yerleşimi, check-in ve otobüs operasyonunu tek merkezden yönetin.",
    icon:
      FaBus,
    accent:
      "text-sky-300",
  },

  finance: {
    eyebrow:
      "FİNANS KONTROLÜ",
    title:
      "Tur Finans Yönetimi",
    description:
      "Ciro, gider, kâr, iade, operasyon zararı ve tahsilat görünürlüğünü tek finans ekranında izleyin.",
    icon:
      FaMoneyBillWave,
    accent:
      "text-emerald-300",
  },

  suppliers: {
    eyebrow:
      "TEDARİK OPERASYONU",
    title:
      "Tedarikçiler",
    description:
      "Tur için bağlı tedarikçi, taahhüt, cari ve operasyon sorumluluklarını tek yerde yönetin.",
    icon:
      FaBed,
    accent:
      "text-violet-300",
  },

  tasks: {
    eyebrow:
      "OPERASYON YÜRÜTME",
    title:
      "Görev Merkezi",
    description:
      "Hazırlık, saha ve kapanış görevlerini sorumlu, öncelik ve termin durumuyla takip edin.",
    icon:
      FaTasks,
    accent:
      "text-orange-300",
  },

  documents: {
    eyebrow:
      "BELGE MERKEZİ",
    title:
      "Tur Belgeleri",
    description:
      "Operasyon belgelerini, eksik evrakları ve doküman hazırlık durumunu merkezi olarak takip edin.",
    icon:
      FaFileAlt,
    accent:
      "text-amber-300",
  },

  incidents: {
    eyebrow:
      "HATA & RİSK MERKEZİ",
    title:
      "Operasyon Hataları",
    description:
      "Eksik hizmet, tedarikçi sorunu, müşteri etkisi, zarar ve çözüm sürecini kontrollü yönetin.",
    icon:
      FaExclamationTriangle,
    accent:
      "text-red-300",
  },
} satisfies Record<
  ModuleKey,
  {
    eyebrow: string;
    title: string;
    description: string;
    icon: typeof FaUsers;
    accent: string;
  }
>;


const modules = [
  {
    key:
      "passengers",
    label:
      "Yolcular",
    path:
      "yolcular",
    icon:
      FaUsers,
  },
  {
    key:
      "flight",
    label:
      "Uçuş",
    path:
      "ucus",
    icon:
      FaPlane,
  },
  {
    key:
      "bus",
    label:
      "Otobüs",
    path:
      "otobus",
    icon:
      FaBus,
  },
  {
    key:
      "suppliers",
    label:
      "Tedarikçi",
    path:
      "tedarikciler",
    icon:
      FaBed,
  },
  {
    key:
      "tasks",
    label:
      "Görevler",
    path:
      "gorevler",
    icon:
      FaTasks,
  },
  {
    key:
      "documents",
    label:
      "Belgeler",
    path:
      "belgeler",
    icon:
      FaFileAlt,
  },
  {
    key:
      "finance",
    label:
      "Finans",
    path:
      "finans-yonetim",
    icon:
      FaMoneyBillWave,
  },
  {
    key:
      "incidents",
    label:
      "Hatalar",
    path:
      "hatalar",
    icon:
      FaExclamationTriangle,
  },
] as const;


export default function TourModuleChrome({
  tourId,
  moduleKey,
}: Props) {

  const pathname =
    usePathname();


  const meta =
    moduleMeta[
      moduleKey
    ];


  const HeroIcon =
    meta.icon;


  return (
    <section
      data-tour-module-chrome
      className="mb-5 overflow-hidden rounded-[28px] border border-white/[.08] bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,.08),transparent_30%),linear-gradient(145deg,#07131f,#03080e)] shadow-[0_22px_70px_rgba(0,0,0,.18)]"
    >

      <div className="p-5 lg:p-6">

        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

          <div className="min-w-0">

            <Link
              href={`/dashboard/turlar/${tourId}`}
              className="inline-flex items-center gap-2 text-[8px] font-black text-slate-600 transition hover:text-white"
            >
              <FaArrowLeft />
              Tur Operasyon Merkezi
            </Link>


            <div className="mt-4 flex items-start gap-4">

              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-white/[.08] bg-black/20">

                <HeroIcon
                  className={`text-lg ${meta.accent}`}
                />

              </div>


              <div>

                <div className={`text-[7px] font-black uppercase tracking-[.16em] ${meta.accent}`}>
                  {meta.eyebrow}
                </div>

                <h1 className="mt-1.5 text-2xl font-black tracking-[-.035em] text-white lg:text-3xl">
                  {meta.title}
                </h1>

                <p className="mt-2 max-w-3xl text-[8px] leading-5 text-slate-500">
                  {meta.description}
                </p>

              </div>

            </div>

          </div>


          <div className="flex shrink-0 items-center gap-2">

            <Link
              href={`/dashboard/turlar/${tourId}/hazirlik`}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/[.07] bg-black/20 px-4 text-[8px] font-black text-slate-300 transition hover:border-orange-500/20 hover:text-orange-300"
            >
              <FaClipboardCheck />
              Hazırlık
            </Link>


            <Link
              href={`/dashboard/turlar/${tourId}`}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-orange-500 px-4 text-[8px] font-black text-white transition hover:bg-orange-400"
            >
              <FaRoute />
              Cockpit
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

    </section>
  );
}
