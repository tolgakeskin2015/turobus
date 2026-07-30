import Link from "next/link";
import {
  FaArrowLeft,
  FaCalendarAlt,
  FaCheckCircle,
  FaClock,
  FaHeart,
  FaMapMarkerAlt,
  FaShieldAlt,
  FaStar,
  FaTimesCircle,
  FaUserFriends,
} from "react-icons/fa";

const tours = [
  {
    id: "1",
    title: "Fethiye Jeep Safari",
    location: "Fethiye, Muğla",
    duration: "Tam Gün",
    rating: "4.9",
    reviews: "1.284",
    price: "2.490 TL",
    oldPrice: "3.250 TL",
    image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1800&q=90",
    description:
      "Fethiye'nin doğal güzelliklerini, kanyonlarını ve köy yollarını eğlence dolu bir Jeep Safari deneyimiyle keşfedin.",
  },
  {
    id: "2",
    title: "Ölüdeniz Tekne Turu",
    location: "Ölüdeniz, Fethiye",
    duration: "8 Saat",
    rating: "4.8",
    reviews: "936",
    price: "1.990 TL",
    oldPrice: "2.450 TL",
    image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1800&q=90",
    description:
      "Ölüdeniz'in berrak koylarını keşfedin, gün boyunca yüzme molalarının ve tekne eğlencesinin keyfini çıkarın.",
  },
  {
    id: "3",
    title: "Kapadokya Balon Turu",
    location: "Göreme, Nevşehir",
    duration: "3 Saat",
    rating: "4.9",
    reviews: "2.147",
    price: "4.990 TL",
    oldPrice: "5.750 TL",
    image:
      "https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=1800&q=90",
    description:
      "Kapadokya'nın eşsiz vadilerini gün doğumunda gökyüzünden izleyin ve unutulmaz bir balon deneyimi yaşayın.",
  },
];

export default async function TourDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tour = tours.find((item) => item.id === id);

  if (!tour) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <div className="text-center">
          <h1 className="text-4xl font-black">Tur bulunamadı</h1>

          <Link
            href="/turlar"
            className="mt-6 inline-flex rounded-xl bg-orange-500 px-6 py-3 font-black"
          >
            Turlara Dön
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10 bg-slate-950/95">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500 text-xl font-black">
              T
            </div>

            <div>
              <div className="text-xl font-black">TUROBUS</div>
              <div className="text-[9px] font-bold uppercase tracking-[0.22em] text-orange-400">
                Marketplace
              </div>
            </div>
          </Link>

          <Link
            href="/turlar"
            className="flex items-center gap-2 text-sm font-black text-slate-300 hover:text-orange-400"
          >
            <FaArrowLeft />
            Turlara Dön
          </Link>
        </div>
      </header>

      <section className="relative h-[520px] overflow-hidden">
        <img
          src={tour.image}
          alt={tour.title}
          className="h-full w-full object-cover"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/35 to-transparent" />

        <div className="absolute inset-x-0 bottom-0">
          <div className="mx-auto max-w-7xl px-5 pb-12 lg:px-8">
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-200">
              <span className="rounded-full bg-orange-500 px-4 py-2 font-black">
                Çok Satan
              </span>

              <span className="flex items-center gap-2">
                <FaMapMarkerAlt className="text-orange-400" />
                {tour.location}
              </span>
            </div>

            <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-tight md:text-6xl">
              {tour.title}
            </h1>

            <div className="mt-5 flex flex-wrap items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <FaStar className="text-yellow-400" />
                <span className="font-black">{tour.rating}</span>
                <span className="text-slate-400">
                  ({tour.reviews} değerlendirme)
                </span>
              </div>

              <div className="flex items-center gap-2 text-slate-300">
                <FaClock />
                {tour.duration}
              </div>

              <div className="flex items-center gap-2 text-slate-300">
                <FaUserFriends />
                Küçük grup seçeneği
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-5 py-14 lg:grid-cols-[1fr_390px] lg:px-8">
        <div>
          <div className="rounded-[30px] border border-white/10 bg-slate-900 p-7">
            <h2 className="text-3xl font-black">Tur hakkında</h2>

            <p className="mt-5 text-lg leading-8 text-slate-400">
              {tour.description}
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
                ["Süre", tour.duration, FaClock],
                ["Buluşma", "Merkez ofis", FaMapMarkerAlt],
                ["Grup", "Maksimum 20 kişi", FaUserFriends],
              ].map(([label, value, Icon]) => (
                <div
                  key={String(label)}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"
                >
                  <Icon className="text-orange-400" />

                  <p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                    {label}
                  </p>

                  <p className="mt-2 font-black">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 rounded-[30px] border border-white/10 bg-slate-900 p-7">
            <h2 className="text-3xl font-black">Tur programı</h2>

            <div className="mt-8 space-y-6">
              {[
                ["08:30", "Otelden veya buluşma noktasından hareket"],
                ["10:00", "İlk aktivite ve fotoğraf molası"],
                ["12:30", "Öğle yemeği ve serbest zaman"],
                ["15:00", "Tur programının devamı"],
                ["17:30", "Dönüş transferi"],
              ].map(([time, text]) => (
                <div key={time} className="flex gap-5">
                  <div className="flex h-12 w-20 shrink-0 items-center justify-center rounded-xl bg-orange-500 font-black">
                    {time}
                  </div>

                  <div className="border-l border-white/10 pl-5">
                    <p className="pt-3 font-bold text-slate-300">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="rounded-[30px] border border-white/10 bg-slate-900 p-7">
              <h2 className="text-2xl font-black">Fiyata dahil</h2>

              <div className="mt-6 space-y-4">
                {[
                  "Aktivite transferleri",
                  "Profesyonel rehber",
                  "Gerekli ekipmanlar",
                  "Sigorta",
                  "Tam gün programlarda öğle yemeği",
                ].map((item) => (
                  <div key={item} className="flex gap-3 text-slate-300">
                    <FaCheckCircle className="mt-1 shrink-0 text-emerald-400" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[30px] border border-white/10 bg-slate-900 p-7">
              <h2 className="text-2xl font-black">Fiyata dahil değil</h2>

              <div className="mt-6 space-y-4">
                {[
                  "Kişisel harcamalar",
                  "Fotoğraf ve video hizmetleri",
                  "İçecekler",
                  "Opsiyonel etkinlikler",
                ].map((item) => (
                  <div key={item} className="flex gap-3 text-slate-300">
                    <FaTimesCircle className="mt-1 shrink-0 text-red-400" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-[30px] border border-orange-500/20 bg-slate-900 p-7 shadow-2xl shadow-orange-500/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 line-through">
                  {tour.oldPrice}
                </p>

                <p className="mt-1 text-4xl font-black text-orange-500">
                  {tour.price}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  kişi başı başlangıç fiyatı
                </p>
              </div>

              <button
                type="button"
                aria-label="Favorilere ekle"
                className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]"
              >
                <FaHeart />
              </button>
            </div>

            <div className="mt-7 space-y-4">
              <label className="block">
                <span className="text-sm font-black">Tur tarihi</span>

                <div className="mt-2 flex min-h-14 items-center gap-3 rounded-2xl bg-white px-4">
                  <FaCalendarAlt className="text-orange-500" />

                  <input
                    type="date"
                    className="w-full bg-transparent text-sm font-bold text-slate-950 outline-none"
                  />
                </div>
              </label>

              <label className="block">
                <span className="text-sm font-black">Kişi sayısı</span>

                <select className="mt-2 min-h-14 w-full rounded-2xl bg-white px-4 text-sm font-bold text-slate-950 outline-none">
                  <option>1 kişi</option>
                  <option>2 kişi</option>
                  <option>3 kişi</option>
                  <option>4 kişi</option>
                  <option>5+ kişi</option>
                </select>
              </label>
            </div>

            <button
              type="button"
              className="mt-6 min-h-14 w-full rounded-2xl bg-orange-500 px-6 font-black transition hover:bg-orange-600"
            >
              Rezervasyon Yap
            </button>

            <div className="mt-5 flex items-center gap-3 rounded-2xl bg-emerald-500/10 p-4 text-sm text-emerald-400">
              <FaShieldAlt />
              Güvenli rezervasyon ve ücretsiz iptal seçeneği
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
