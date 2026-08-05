"use client";

import { FormEvent } from "react";
import { FaSave, FaUsers } from "react-icons/fa";
import {
  OccupancyPricingMethod,
  OccupancyRuleFormState,
  occupancyPricingMethodLabels,
} from "./types";

type HotelOption = {
  id: string;
  name: string;
};

type RoomTypeOption = {
  id: string;
  hotel_id: string;
  name: string;
};

type Props = {
  hotels: HotelOption[];
  roomTypes: RoomTypeOption[];
  form: OccupancyRuleFormState;
  saving: boolean;
  editing: boolean;
  onChange: <K extends keyof OccupancyRuleFormState>(
    key: K,
    value: OccupancyRuleFormState[K]
  ) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
};

export default function OccupancyRuleForm({
  hotels,
  roomTypes,
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

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-[32px] border border-white/10 bg-slate-900 p-6 lg:p-8"
    >
      <div className="flex items-center gap-3">
        <FaUsers className="text-orange-400" />

        <div>
          <h2 className="text-2xl font-black">
            {editing
              ? "Kişi Kuralını Düzenle"
              : "Yeni Kişi Bazlı Fiyat Kuralı"}
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Yetişkin ve çocuk sayısına göre çarpan, yüzde veya sabit fiyat kuralı tanımlayın.
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
            onChange={(event) =>
              onChange("room_type_id", event.target.value)
            }
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
          <span className="text-sm font-black">Yetişkin</span>

          <input
            required
            type="number"
            min="1"
            value={form.adults}
            onChange={(event) =>
              onChange("adults", event.target.value)
            }
            className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950"
          />
        </label>

        <label>
          <span className="text-sm font-black">Çocuk</span>

          <input
            type="number"
            min="0"
            value={form.children}
            onChange={(event) =>
              onChange("children", event.target.value)
            }
            className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950"
          />
        </label>

        <label>
          <span className="text-sm font-black">Fiyat yöntemi</span>

          <select
            value={form.pricing_method}
            onChange={(event) =>
              onChange(
                "pricing_method",
                event.target.value as OccupancyPricingMethod
              )
            }
            className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950"
          >
            {Object.entries(
              occupancyPricingMethodLabels
            ).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="text-sm font-black">Fiyat değeri</span>

          <input
            required
            type="number"
            step="0.0001"
            value={form.pricing_value}
            onChange={(event) =>
              onChange("pricing_value", event.target.value)
            }
            placeholder={
              form.pricing_method === "multiplier"
                ? "1.50"
                : "25"
            }
            className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950"
          />
        </label>

        <label>
          <span className="text-sm font-black">
            Ek yetişkin fiyatı
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
            Ek çocuk fiyatı
          </span>

          <input
            type="number"
            min="0"
            step="0.01"
            value={form.extra_child_price}
            onChange={(event) =>
              onChange(
                "extra_child_price",
                event.target.value
              )
            }
            className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950"
          />
        </label>

        <label>
          <span className="text-sm font-black">
            Minimum doluluk
          </span>

          <input
            type="number"
            min="1"
            value={form.minimum_occupancy}
            onChange={(event) =>
              onChange(
                "minimum_occupancy",
                event.target.value
              )
            }
            className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950"
          />
        </label>

        <label>
          <span className="text-sm font-black">
            Maksimum doluluk
          </span>

          <input
            type="number"
            min="1"
            value={form.maximum_occupancy}
            onChange={(event) =>
              onChange(
                "maximum_occupancy",
                event.target.value
              )
            }
            className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950"
          />
        </label>

        <label>
          <span className="text-sm font-black">Öncelik</span>

          <input
            type="number"
            min="1"
            value={form.priority}
            onChange={(event) =>
              onChange("priority", event.target.value)
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

          <span className="font-black">Kural aktif</span>
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
              ? "Kuralı Güncelle"
              : "Kuralı Kaydet"}
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
