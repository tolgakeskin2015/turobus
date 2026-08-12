import Link from "next/link";

const modules = [
  {
    title: "Paket Oluştur",
    description:
      "Otel, aktivite, transfer ve ek hizmetleri birleştirerek canlı maliyet ve kâr hesabı yap.",
    href: "/dashboard/package-os/builder",
    status: "Sıradaki",
  },
  {
    title: "Oteller",
    description:
      "Anlaşmalı otelleri, oda tiplerini, pansiyonları ve sezon alış fiyatlarını yönet.",
    href: "/dashboard/package-os/hotels",
    status: "Hazırlanıyor",
  },
  {
    title: "Aktiviteler",
    description:
      "Aktiviteci, alış fiyatı, gün/saat kontenjanı ve müsaitlik bilgilerini yönet.",
    href: "/dashboard/package-os/activities",
    status: "Hazırlanıyor",
  },
  {
    title: "Teklifler",
    description:
      "Satış personelinin oluşturduğu teklifleri ve müşteriye gönderim durumlarını takip et.",
    href: "/dashboard/package-os/quotes",
    status: "Hazırlanıyor",
  },
  {
    title: "Paket Rezervasyonları",
    description:
      "Satılan tatil ve balayı paketlerini, giriş tarihlerini, müşteri ve hizmet detaylarını gör.",
    href: "/dashboard/package-os/bookings",
    status: "Hazırlanıyor",
  },
  {
    title: "Ekstra Siparişler",
    description:
      "Misafir uygulamasından satılan ekstra aktiviteleri, tahsilatı, operasyon durumunu ve kârlılığı yönet.",
    href: "/dashboard/package-os/extra-orders",
    status: "Aktif",
  },
  {
    title: "Tedarikçi Hakedişleri",
    description:
      "Otel, aktivite ve transfer firmalarına yapılacak ödemeleri tek ekrandan izle.",
    href: "/dashboard/package-os/payables",
    status: "Hazırlanıyor",
  },
  {
    title: "Kâr & Finans",
    description:
      "Satış, gerçek maliyet, brüt kâr, komisyon ve net kârı paket bazında analiz et.",
    href: "/dashboard/package-os/finance",
    status: "Hazırlanıyor",
  },
  {
    title: "Voucher & QR",
    description:
      "Misafir hizmet voucherlarını ve QR kullanım kayıtlarını takip et.",
    href: "/dashboard/package-os/vouchers",
    status: "Hazırlanıyor",
  },
];

export default function PackageOsPage() {
  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white md:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-[32px] border border-white/10 bg-slate-900 p-8">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-400">
            TUROBUS PACKAGE OS
          </p>

          <h1 className="mt-4 text-4xl font-black tracking-tight md:text-6xl">
            Paket Satış Merkezi
          </h1>

          <p className="mt-4 max-w-3xl text-slate-400">
            Tatil ve balayı paketlerini otel + aktivite + transfer +
            ek hizmetlerden oluşturun. Maliyet, satış fiyatı, kâr ve
            tedarikçi borçlarını aynı sistemde yönetin.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-4">
            {[
              ["Bugünkü Teklif", "0"],
              ["Satılan Paket", "0"],
              ["Bekleyen Tahsilat", "₺0"],
              ["Net Kâr", "₺0"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl border border-white/10 bg-slate-950 p-5"
              >
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {label}
                </p>
                <p className="mt-2 text-2xl font-black">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {modules.map((module) => (
            <Link
              href={module.href}
              key={module.title}
              className="group rounded-[28px] border border-white/10 bg-slate-900 p-6 transition hover:border-orange-500/40 hover:bg-slate-900/80"
            >
              <span className="text-xs font-black uppercase tracking-wider text-orange-400">
                {module.status}
              </span>

              <h2 className="mt-3 text-xl font-black">
                {module.title}
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-400">
                {module.description}
              </p>

              <p className="mt-6 text-sm font-black text-white">
                Aç →
              </p>
            </Link>
          ))}
        </div>

        <div className="mt-8 rounded-[28px] border border-emerald-500/20 bg-emerald-500/5 p-6">
          <p className="text-xs font-black uppercase tracking-wider text-emerald-400">
            Paket Motoru
          </p>

          <p className="mt-3 text-sm leading-7 text-slate-300">
            Teklif verildiği anda otel ve aktivite alış fiyatları
            snapshot olarak saklanacak. Sonradan tedarikçi fiyatı
            değişse bile geçmiş rezervasyonun gerçek maliyeti ve kârı
            değişmeyecek.
          </p>
        </div>
      </div>
    </main>
  );
}
