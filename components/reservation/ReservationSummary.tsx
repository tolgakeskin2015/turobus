import {
  FaCheckCircle,
  FaMapMarkerAlt,
  FaShieldAlt,
} from "react-icons/fa";

import type {
  Departure,
  ReservationResult,
  Tour,
} from "./types";

type ReservationSummaryProps = {
  tour: Tour;
  departure: Departure | null;
  guests: number;
  loading: boolean;
  message: {
    type: "success" | "error";
    text: string;
  } | null;
  result: ReservationResult | null;
};

export default function ReservationSummary({
  tour,
  departure,
  guests,
  loading,
  message,
  result,
}: ReservationSummaryProps) {
  const unitPrice = departure
    ? departure.adult_price ?? tour.adult_price
    : tour.adult_price;

  const totalPrice = unitPrice * guests;

  return (
    <aside className="lg:sticky lg:top-6 lg:self-start">
      <div className="overflow-hidden rounded-[30px] border border-orange-500/20 bg-slate-900 shadow-2xl shadow-orange-500/10">
        {tour.cover_image ? (
          <img
            src={tour.cover_image}
            alt={tour.title}
            className="h-52 w-full object-cover"
          />
        ) : (
          <div className="flex h-52 items-center justify-center bg-slate-800 text-sm font-bold text-slate-500">
            Kapak görseli eklenmedi
          </div>
        )}

        <div className="p-7">
          <h2 className="text-2xl font-black">{tour.title}</h2>

          <div className="mt-3 flex items-center gap-2 text-sm text-slate-400">
            <FaMapMarkerAlt className="text-orange-400" />
            {tour.city}
            {tour.district ? `, ${tour.district}` : ""}
          </div>

          <div className="mt-7 space-y-4 border-t border-white/10 pt-6 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-slate-400">Tur tarihi</span>

              <span className="text-right font-black">
                {departure
                  ? new Date(
                      `${departure.departure_date}T00:00:00`
                    ).toLocaleDateString("tr-TR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })
                  : "Seçilmedi"}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-400">Kişi başı</span>

              <span className="font-black">
                {unitPrice.toLocaleString("tr-TR")} TL
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-400">Kişi sayısı</span>

              <span className="font-black">{guests}</span>
            </div>
          </div>

          <div className="mt-6 flex items-end justify-between border-t border-white/10 pt-6">
            <span className="font-black">Toplam</span>

            <span className="text-3xl font-black text-orange-500">
              {totalPrice.toLocaleString("tr-TR")} TL
            </span>
          </div>

          <button
            type="submit"
            disabled={loading || !departure}
            className="mt-6 min-h-14 w-full rounded-2xl bg-orange-500 px-6 font-black transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Rezervasyon oluşturuluyor..."
              : "Rezervasyonu Onayla"}
          </button>

          {!departure && (
            <p className="mt-3 text-center text-xs font-bold text-slate-500">
              Devam etmek için tur tarihi seçmelisiniz.
            </p>
          )}

          {message && (
            <div
              className={`mt-5 rounded-2xl border p-4 text-sm font-bold leading-6 ${
                message.type === "success"
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                  : "border-red-500/20 bg-red-500/10 text-red-400"
              }`}
            >
              <p>{message.text}</p>

              {message.type === "success" && result && (
                <div className="mt-4 rounded-xl bg-slate-950/50 p-4">
                  <p className="text-xs uppercase tracking-wider text-emerald-300">
                    Rezervasyon numarası
                  </p>

                  <p className="mt-2 text-xl font-black text-white">
                    {result.reservation_code}
                  </p>

                  <p className="mt-3 text-xs text-slate-400">
                    Toplam:{" "}
                    {result.total_price.toLocaleString("tr-TR")} TL
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="mt-5 flex items-center gap-3 rounded-2xl bg-emerald-500/10 p-4 text-sm text-emerald-400">
            <FaShieldAlt className="shrink-0" />
            Kontenjan güvenli şekilde kontrol edilir.
          </div>

          <div className="mt-4 flex items-center gap-3 text-xs text-slate-500">
            <FaCheckCircle className="shrink-0 text-emerald-400" />
            Başarılı rezervasyonda kontenjan otomatik azalır.
          </div>
        </div>
      </div>
    </aside>
  );
}
