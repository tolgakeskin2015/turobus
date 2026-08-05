"use client";

import { FormEvent } from "react";
import { FaSave, FaTags } from "react-icons/fa";

export type DailyRateFormState = {
  hotel_id: string;
  room_type_id: string;
  rate_plan_id: string;
  rate_date: string;
  base_price: string;
  single_price: string;
  triple_price: string;
  extra_adult_price: string;
  child_price: string;
  currency: string;
  is_active: boolean;
};

type HotelOption = {
  id: string;
  name: string;
};

type RoomTypeOption = {
  id: string;
  hotel_id: string;
  name: string;
};

type RatePlanOption = {
  id: string;
  hotel_id: string;
  room_type_id: string | null;
  name: string;
};

type Props = {
  hotels: HotelOption[];
  roomTypes: RoomTypeOption[];
  ratePlans: RatePlanOption[];
  form: DailyRateFormState;
  saving: boolean;
  editing: boolean;
  onChange: <K extends keyof DailyRateFormState>(
    key: K,
    value: DailyRateFormState[K]
  ) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
};

export default function DailyRateForm({
  hotels,
  roomTypes,
  ratePlans,
  form,
  saving,
  editing,
  onChange,
  onSubmit,
  onCancel,
}: Props) {
  const filteredRoomTypes = roomTypes.filter(
    (roomType) => roomType.hotel_id === form.hotel_id
  );

  const filteredRatePlans = ratePlans.filter(
    (ratePlan) =>
      ratePlan.hotel_id === form.hotel_id &&
      (!ratePlan.room_type_id ||
        ratePlan.room_type_id === form.room_type_id)
  );

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-[32px] border border-white/10 bg-slate-900 p-6 lg:p-8"
    >
      <div className="flex items-center gap-3">
        <FaTags className="text-orange-400" />

        <div>
          <h2 className="text-2xl font-black">
            {editing
              ? "Günlük Fiyatı Düzenle"
              : "Yeni Günlük Fiyat"}
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Oda tipi ve fiyat planı için günlük satış fiyatlarını belirleyin.
          </p>
        </div>
      </div>

      <div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <label>
          <span className="text-sm font-black">Otel</span>

          <select
            required
            value={form.hotel_id}
            onChange={(event) => {
              onChange("hotel_id", event.target.value);
              onChange("room_type_id", "");
              onChange("rate_plan_id", "");
            }}
            className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950"
          >
            <option value="">Otel seçin</option>

            {hotels.map((hotel) => (
              <option key={hotel.id} value={hotel.id}>
                {hotel.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="text-sm font-black">Oda tipi</span>

          <select
            required
            disabled={!form.hotel_id}
            value={form.room_type_id}
            onChange={(event) => {
              onChange("room_type_id", event.target.value);
              onChange("rate_plan_id", "");
            }}
            className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 disabled:opacity-50"
          >
            <option value="">Oda tipi seçin</option>

            {filteredRoomTypes.map((roomType) => (
              <option key={roomType.id} value={roomType.id}>
                {roomType.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="text-sm font-black">Fiyat planı</span>

          <select
            required
            disabled={!form.room_type_id}
            value={form.rate_plan_id}
            onChange={(event) =>
              onChange("rate_plan_id", event.target.value)
            }
            className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 disabled:opacity-50"
          >
            <option value="">Fiyat planı seçin</option>

            {filteredRatePlans.map((ratePlan) => (
              <option key={ratePlan.id} value={ratePlan.id}>
                {ratePlan.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="text-sm font-black">Tarih</span>

          <input
            required
            type="date"
            value={form.rate_date}
            onChange={(event) =>
              onChange("rate_date", event.target.value)
            }
            className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950"
          />
        </label>

        <label>
          <span className="text-sm font-black">Ana fiyat</span>

          <input
            required
            type="number"
            min="0"
            step="0.01"
            value={form.base_price}
            onChange={(event) =>
              onChange("base_price", event.target.value)
            }
            className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950"
          />
        </label>

        <label>
          <span className="text-sm font-black">Tek kişi fiyatı</span>

          <input
            type="number"
            min="0"
            step="0.01"
            value={form.single_price}
            onChange={(event) =>
              onChange("single_price", event.target.value)
            }
            className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950"
          />
        </label>

        <label>
          <span className="text-sm font-black">Üç kişi fiyatı</span>

          <input
            type="number"
            min="0"
            step="0.01"
            value={form.triple_price}
            onChange={(event) =>
              onChange("triple_price", event.target.value)
            }
            className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950"
          />
        </label>

        <label>
          <span className="text-sm font-black">Para birimi</span>

          <select
            value={form.currency}
            onChange={(event) =>
              onChange("currency", event.target.value)
            }
            className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950"
          >
            <option value="TRY">TRY</option>
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
            <option value="GBP">GBP</option>
          </select>
        </label>

        <label>
          <span className="text-sm font-black">
            Ekstra yetişkin
          </span>

          <input
            type="number"
            min="0"
            step="0.01"
            value={form.extra_adult_price}
            onChange={(event) =>
              onChange(
                "extra_adult_price",
                event.target.value
              )
            }
            className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950"
          />
        </label>

        <label>
          <span className="text-sm font-black">
            Çocuk fiyatı
          </span>

          <input
            type="number"
            min="0"
            step="0.01"
            value={form.child_price}
            onChange={(event) =>
              onChange("child_price", event.target.value)
            }
            className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950"
          />
        </label>

        <label className="flex items-center gap-3 rounded-2xl bg-slate-950 p-4">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(event) =>
              onChange("is_active", event.target.checked)
            }
            className="h-5 w-5"
          />

          <span className="font-black">Fiyat aktif</span>
        </label>
      </div>

      <div className="mt-6 flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="flex min-h-14 items-center gap-2 rounded-2xl bg-orange-500 px-8 font-black disabled:opacity-50"
        >
          <FaSave />

          {saving
            ? "Kaydediliyor..."
            : editing
              ? "Fiyatı Güncelle"
              : "Fiyatı Kaydet"}
        </button>

        {editing && (
          <button
            type="button"
            onClick={onCancel}
            className="min-h-14 rounded-2xl border border-white/10 px-8 font-black"
          >
            İptal
          </button>
        )}
      </div>
    </form>
  );
}
