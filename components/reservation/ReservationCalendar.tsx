import {
  FaCalendarAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaUsers,
} from "react-icons/fa";

import type { Departure, Tour } from "./types";

type ReservationCalendarProps = {
  tour: Tour;
  departures: Departure[];
  selectedDepartureId: string;
  guests: number;
  onDepartureChange: (departureId: string) => void;
  onGuestsChange: (guests: number) => void;
};

export default function ReservationCalendar({
  tour,
  departures,
  selectedDepartureId,
  guests,
  onDepartureChange,
  onGuestsChange,
}: ReservationCalendarProps) {
  const selectedDeparture = departures.find(
    (departure) => departure.id === selectedDepartureId
  );

  const remainingCapacity = selectedDeparture
    ? selectedDeparture.capacity - selectedDeparture.reserved_count
    : 0;

  const selectableGuests = Math.min(
    Math.max(remainingCapacity, 1),
    20
  );

  return (
    <section className="rounded-[30px] border border-white/10 bg-slate-900 p-7">
      <h2 className="text-2xl font-black">
        Tur tarihi ve kişi sayısı
      </h2>

      <p className="mt-3 text-slate-400">
        Açık kalkışlardan bir tarih seç ve kalan kontenjanı kontrol et.
      </p>

      <div className="mt-7 grid gap-4">
        {departures.map((departure) => {
          const remaining =
            departure.capacity - departure.reserved_count;

          const unavailable =
            departure.status !== "active" || remaining <= 0;

          const selected =
            departure.id === selectedDepartureId;

          const price =
            departure.adult_price ?? tour.adult_price;

          return (
            <button
              key={departure.id}
              type="button"
              disabled={unavailable}
              onClick={() => onDepartureChange(departure.id)}
              className={`rounded-2xl border p-5 text-left transition ${
                selected
                  ? "border-orange-500 bg-orange-500/10"
                  : "border-white/10 bg-white/[0.04] hover:border-orange-500/30"
              } ${
                unavailable
                  ? "cursor-not-allowed opacity-50"
                  : ""
              }`}
            >
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                      selected
                        ? "bg-orange-500 text-white"
                        : "bg-slate-950 text-orange-400"
                    }`}
                  >
                    <FaCalendarAlt />
                  </div>

                  <div>
                    <h3 className="font-black">
                      {new Date(
                        `${departure.departure_date}T00:00:00`
                      ).toLocaleDateString("tr-TR", {
                        weekday: "long",
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })}
                    </h3>

                    <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-400">
                      <span className="flex items-center gap-2">
                        <FaUsers />
                        {remaining} kişilik yer
                      </span>

                      <span className="font-black text-orange-400">
                        {price.toLocaleString("tr-TR")} TL
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  {unavailable ? (
                    <span className="flex items-center gap-2 rounded-full bg-red-500/10 px-3 py-2 text-xs font-black text-red-400">
                      <FaTimesCircle />
                      Dolu / Kapalı
                    </span>
                  ) : selected ? (
                    <span className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-2 text-xs font-black text-emerald-400">
                      <FaCheckCircle />
                      Seçildi
                    </span>
                  ) : (
                    <span className="text-xs font-black text-slate-500">
                      Tarihi seç
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}

        {departures.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-center">
            <FaCalendarAlt
              className="mx-auto text-orange-400"
              size={28}
            />

            <h3 className="mt-4 text-xl font-black">
              Açık tur tarihi bulunmuyor
            </h3>

            <p className="mt-2 text-slate-400">
              Bu tur için henüz rezervasyona açık bir kalkış eklenmemiş.
            </p>
          </div>
        )}
      </div>

      {selectedDeparture && remainingCapacity > 0 && (
        <label className="mt-7 block">
          <span className="text-sm font-black">Kişi sayısı</span>

          <div className="mt-2 flex min-h-14 items-center gap-3 rounded-2xl bg-white px-4">
            <FaUsers className="text-orange-500" />

            <select
              value={guests}
              onChange={(event) =>
                onGuestsChange(Number(event.target.value))
              }
              className="w-full bg-transparent text-sm font-bold text-slate-950 outline-none"
            >
              {Array.from(
                { length: selectableGuests },
                (_, index) => index + 1
              ).map((count) => (
                <option key={count} value={count}>
                  {count} kişi
                </option>
              ))}
            </select>
          </div>

          <p className="mt-2 text-xs text-slate-500">
            Bu tarihte {remainingCapacity} kişilik yer kaldı.
          </p>
        </label>
      )}
    </section>
  );
}
