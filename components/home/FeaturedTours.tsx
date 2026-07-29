import {
  FaClock,
  FaHeart,
  FaMapMarkerAlt,
  FaShieldAlt,
  FaStar,
} from "react-icons/fa";

const tours = [
  {
    title: "Fethiye Jeep Safari",
    location: "Fethiye, Muğla",
    duration: "Tam Gün",
    rating: "4.9",
    reviews: "1.284",
    oldPrice: "3.250 TL",
    price: "2.490 TL",
    badge: "Çok Satan",
    note: "Son 8 kontenjan",
    image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=85",
  },
  {
    title: "Ölüdeniz Tekne Turu",
    location: "Ölüdeniz, Fethiye",
    duration: "8 Saat",
    rating: "4.8",
    reviews: "936",
    oldPrice: "2.450 TL",
    price: "1.990 TL",
    badge: "Erken Rezervasyon",
    note: "Bugün 14 kişi inceledi",
    image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=85",
  },
  {
    title: "Kapadokya Balon Turu",
    location: "Göreme, Nevşehir",
    duration: "3 Saat",
    rating: "4.9",
    reviews: "2.147",
    oldPrice: "5.750 TL",
    price: "4.990 TL",
    badge: "Premium",
    note: "Son 5 yer",
    image:
      "https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=1200&q=85",
  },
];

export default function FeaturedTours() {
  return (
    <section className="bg-slate-950 px-6 py-24 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10">
          <p className="mb-3 text-sm font-bold uppercase tracking-widest text-orange-400">
            Misafirlerin favorileri
          </p>

          <h2 className="text-4xl font-black">
            En Çok Satan Turlar
          </h2>

          <p className="mt-4 text-slate-400">
            En çok tercih edilen tur ve deneyimleri keşfet.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {tours.map((tour) => (
            <article
              key={tour.title}
              className="group overflow-hidden rounded-3xl border border-white/10 bg-slate-900 transition duration-300 hover:-translate-y-2 hover:border-orange-500/40"
            >
              <div className="relative h-64 overflow-hidden">
                <img
                  src={tour.image}
                  alt={tour.title}
                  className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />

                <div className="absolute left-5 top-5 rounded-full bg-orange-500 px-4 py-2 text-xs font-bold text-white">
                  {tour.badge}
                </div>

                <button
                  type="button"
                  aria-label="Favorilere ekle"
                  className="absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md"
                >
                  <FaHeart />
                </button>

                <div className="absolute bottom-5 left-5 rounded-full bg-black/40 px-4 py-2 text-xs font-bold text-white backdrop-blur-md">
                  {tour.note}
                </div>
              </div>

              <div className="p-6">
                <div className="mb-3 flex items-center gap-2 text-sm text-slate-400">
                  <FaMapMarkerAlt className="text-orange-500" />
                  {tour.location}
                </div>

                <h3 className="text-2xl font-black">
                  {tour.title}
                </h3>

                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <FaClock />
                    {tour.duration}
                  </div>

                  <div className="flex items-center gap-2">
                    <FaStar className="text-yellow-400" />
                    <span className="font-bold">{tour.rating}</span>
                    <span className="text-sm text-slate-500">
                      ({tour.reviews})
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2 text-sm text-slate-400">
                  <FaShieldAlt className="text-emerald-400" />
                  Ücretsiz iptal seçeneği
                </div>

                <div className="mt-6 border-t border-white/10 pt-5">
                  <p className="text-sm text-slate-500 line-through">
                    {tour.oldPrice}
                  </p>

                  <div className="mt-1 flex items-end justify-between gap-4">
                    <div>
                      <p className="text-3xl font-black text-orange-500">
                        {tour.price}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        kişi başı
                      </p>
                    </div>

                    <button
                      type="button"
                      className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-orange-600"
                    >
                      İncele
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}