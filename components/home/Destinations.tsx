import { FaMapMarkerAlt } from "react-icons/fa";

export default function Destinations() {
  const cities = [
    {
      name: "Fethiye",
      image:
        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1200",
    },
    {
      name: "Kapadokya",
      image:
        "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?q=80&w=1200",
    },
    {
      name: "Antalya",
      image:
        "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?q=80&w=1200",
    },
    {
      name: "Pamukkale",
      image:
        "https://images.unsplash.com/photo-1519046904884-53103b34b206?q=80&w=1200",
    },
    {
      name: "Kaş",
      image:
        "https://images.unsplash.com/photo-1493558103817-58b2924bce98?q=80&w=1200",
    },
    {
      name: "Ölüdeniz",
      image:
        "https://images.unsplash.com/photo-1473116763249-2faaef81ccda?q=80&w=1200",
    },
  ];

  return (
    <section className="mx-auto max-w-7xl px-6 py-24">
      <h2 className="mb-10 text-4xl font-black text-white">
        Popüler Destinasyonlar
      </h2>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
        {cities.map((city) => (
          <div
            key={city.name}
            className="group relative h-80 overflow-hidden rounded-3xl cursor-pointer"
          >
            <img
              src={city.image}
              alt={city.name}
              className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-110"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>

            <div className="absolute left-6 top-6 rounded-full bg-orange-500 px-4 py-2 text-sm font-bold text-white shadow-lg">
              Popüler
            </div>

            <div className="absolute bottom-6 left-6">
              <FaMapMarkerAlt
                className="mb-3 text-orange-500"
                size={26}
              />

              <h3 className="text-3xl font-bold text-white">
                {city.name}
              </h3>

              <p className="mt-2 text-white/80">
                245 Tur • 18 Acente
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}