import { FaSearch, FaMapMarkerAlt, FaStar } from "react-icons/fa";

export default function Home() {
  const tours = [
    { title: "Fethiye Jeep Safari", price: "2.490 TL" },
    { title: "Ölüdeniz Tekne Turu", price: "1.990 TL" },
    { title: "Kapadokya Balon", price: "4.990 TL" },
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Navbar */}
      <header className="flex justify-between items-center px-12 py-6 border-b border-slate-800">
        <h1 className="text-2xl font-bold text-orange-500">🚌 TUROBUS</h1>

        <nav className="flex gap-8">
          <a href="#">Ana Sayfa</a>
          <a href="#">Turlar</a>
          <a href="#">Oteller</a>
          <a href="#">Acenteler</a>
          <a href="#">İletişim</a>
        </nav>

        <button className="bg-orange-500 px-5 py-2 rounded-xl hover:bg-orange-600">
          Giriş Yap
        </button>
      </header>

      {/* Hero */}
      <section className="text-center py-24 px-6">
        <h2 className="text-6xl font-bold mb-6">
          Türkiye'nin Tur Pazaryeri
        </h2>

        <p className="text-slate-300 text-xl mb-12">
          Binlerce Tur • Yüzlerce Acente • En İyi Fiyat Garantisi
        </p>

        <div className="bg-white rounded-2xl max-w-4xl mx-auto p-4 flex gap-3">
          <input
            className="flex-1 p-4 text-black outline-none"
            placeholder="📍 Nereye gitmek istiyorsunuz?"
          />

          <button className="bg-orange-500 px-8 rounded-xl flex items-center gap-2">
            <FaSearch />
            Tur Ara
          </button>
        </div>
      </section>

      {/* Destinasyonlar */}
      <section className="max-w-6xl mx-auto px-6">
        <h3 className="text-3xl font-bold mb-8">
          Popüler Destinasyonlar
        </h3>

        <div className="grid grid-cols-3 gap-6">
          {[
            "Fethiye",
            "Kapadokya",
            "Antalya",
            "Pamukkale",
            "Kaş",
            "Ölüdeniz",
          ].map((city) => (
            <div
              key={city}
              className="bg-slate-900 rounded-2xl p-8 hover:bg-slate-800 transition"
            >
              <FaMapMarkerAlt
                className="text-orange-500 mb-4"
                size={28}
              />
              <h4 className="text-xl font-bold">{city}</h4>
            </div>
          ))}
        </div>
      </section>

      {/* Turlar */}
      <section className="max-w-6xl mx-auto py-20 px-6">
        <h3 className="text-3xl font-bold mb-8">
          En Çok Satan Turlar
        </h3>

        <div className="grid grid-cols-3 gap-8">
          {tours.map((tour) => (
            <div
              key={tour.title}
              className="bg-slate-900 rounded-2xl overflow-hidden"
            >
              <div className="h-52 bg-slate-700"></div>

              <div className="p-6">
                <h4 className="text-xl font-bold">
                  {tour.title}
                </h4>

                <div className="flex mt-3 mb-4 text-yellow-400">
                  <FaStar />
                  <FaStar />
                  <FaStar />
                  <FaStar />
                  <FaStar />
                </div>

                <div className="text-2xl font-bold text-orange-500">
                  {tour.price}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}