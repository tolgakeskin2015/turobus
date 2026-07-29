import Link from "next/link";
import {
  FaFacebookF,
  FaInstagram,
  FaLinkedinIn,
  FaYoutube,
} from "react-icons/fa";

const footerGroups = [
  {
    title: "TUROBUS",
    links: [
      ["Hakkımızda", "/hakkimizda"],
      ["Nasıl Çalışır?", "/nasil-calisir"],
      ["Kariyer", "/kariyer"],
      ["Blog", "/blog"],
      ["İletişim", "/iletisim"],
    ],
  },
  {
    title: "Gezginler",
    links: [
      ["Turları Keşfet", "/turlar"],
      ["Destinasyonlar", "/destinasyonlar"],
      ["Kampanyalar", "/kampanyalar"],
      ["Favorilerim", "/favoriler"],
      ["Rezervasyonlarım", "/rezervasyonlar"],
    ],
  },
  {
    title: "İş Ortakları",
    links: [
      ["Acente Başvurusu", "/acente-basvuru"],
      ["Acente Girişi", "/login"],
      ["Turunu Yayınla", "/acente-basvuru"],
      ["İş Ortağı Merkezi", "/acenteler"],
      ["API Çözümleri", "/api"],
    ],
  },
  {
    title: "Destek",
    links: [
      ["Yardım Merkezi", "/yardim"],
      ["İptal ve İade", "/iptal-iade"],
      ["Gizlilik Politikası", "/gizlilik"],
      ["Kullanım Koşulları", "/kullanim-kosullari"],
      ["Çerez Politikası", "/cerez-politikasi"],
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-slate-950 px-6 pt-20 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 border-b border-white/10 pb-16 lg:grid-cols-[1.2fr_2fr]">
          <div>
            <Link href="/" className="inline-flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 text-xl font-black">
                T
              </div>

              <div>
                <div className="text-2xl font-black">TUROBUS</div>
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Discover with confidence
                </div>
              </div>
            </Link>

            <p className="mt-6 max-w-md leading-8 text-slate-400">
              Doğrulanmış acentelerden tur ve deneyimleri keşfedin,
              karşılaştırın ve güvenle rezervasyon yapın.
            </p>

            <div className="mt-7 flex gap-3">
              {[
                { icon: FaInstagram, label: "Instagram" },
                { icon: FaFacebookF, label: "Facebook" },
                { icon: FaYoutube, label: "YouTube" },
                { icon: FaLinkedinIn, label: "LinkedIn" },
              ].map((social) => {
                const Icon = social.icon;

                return (
                  <button
                    key={social.label}
                    type="button"
                    aria-label={social.label}
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-300 transition hover:border-orange-500/40 hover:bg-orange-500 hover:text-white"
                  >
                    <Icon size={17} />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {footerGroups.map((group) => (
              <div key={group.title}>
                <h3 className="font-black">{group.title}</h3>

                <div className="mt-5 space-y-3">
                  {group.links.map(([label, href]) => (
                    <Link
                      key={label}
                      href={href}
                      className="block text-sm text-slate-400 transition hover:text-orange-400"
                    >
                      {label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col justify-between gap-4 py-7 text-sm text-slate-500 md:flex-row md:items-center">
          <p>© 2026 TUROBUS. Tüm hakları saklıdır.</p>

          <div className="flex flex-wrap gap-5">
            <button type="button" className="transition hover:text-white">
              Türkçe
            </button>

            <button type="button" className="transition hover:text-white">
              TRY
            </button>

            <span>Güvenli ödeme altyapısı</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
