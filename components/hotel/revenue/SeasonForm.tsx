"use client";

import { FormEvent } from "react";
import { FaCalendarAlt, FaSave } from "react-icons/fa";
import {
  AdjustmentType,
  SeasonFormState,
  adjustmentTypeLabels,
} from "./types";

type HotelOption = {
  id: string;
  name: string;
};

type Props = {
  hotels: HotelOption[];
  form: SeasonFormState;
  saving: boolean;
  editing: boolean;
  onChange: <K extends keyof SeasonFormState>(
    key: K,
    value: SeasonFormState[K]
  ) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
};

export default function SeasonForm({
  hotels,
  form,
  saving,
  editing,
  onChange,
  onSubmit,
  onCancel,
}: Props) {
  return (
    <form
      onSubmit={onSubmit}
      className="rounded-[32px] border border-white/10 bg-slate-900 p-6 lg:p-8"
    >
      <div className="flex items-center gap-3">
        <FaCalendarAlt className="text-orange-400" />

        <div>
          <h2 className="text-2xl font-black">
            {editing ? "Sezonu Düzenle" : "Yeni Sezon Kuralı"}
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Sezon tarihlerini, fiyat artış veya indirim yöntemini ve önceliği belirleyin.
          </p>
        </div>
      </div>

      <div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <label>
          <span className="text-sm font-black">Otel</span>

          <select
            required
            value={form.hotel_id}
            onChange={(event) =>
              onChange("hotel_id", event.target.value)
            }
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
          <span className="text-sm font-black">Sezon adı</span>

          <input
            required
            value={form.name}
            onChange={(event) =>
              onChange("name", event.target.value)
            }
            placeholder="Yüksek Sezon"
            className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950"
          />
        </label>

        <label>
          <span className="text-sm font-black">Başlangıç</span>

          <input
            required
            type="date"
            value={form.start_date}
            onChange={(event) =>
              onChange("start_date", event.target.value)
            }
            className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950"
          />
        </label>

        <label>
          <span className="text-sm font-black">Bitiş</span>

          <input
            required
            type="date"
            value={form.end_date}
            onChange={(event) =>
              onChange("end_date", event.target.value)
            }
            className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950"
          />
        </label>

        <label>
          <span className="text-sm font-black">Ayarlama türü</span>

          <select
            value={form.adjustment_type}
            onChange={(event) =>
              onChange(
                "adjustment_type",
                event.target.value as AdjustmentType
              )
            }
            className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950"
          >
            {Object.entries(adjustmentTypeLabels).map(
              ([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              )
            )}
          </select>
        </label>

        <label>
          <span className="text-sm font-black">Değer</span>

          <input
            required
            type="number"
            step="0.0001"
            value={form.adjustment_value}
            onChange={(event) =>
              onChange("adjustment_value", event.target.value)
            }
            placeholder={
              form.adjustment_type === "multiplier"
                ? "1.25"
                : "25"
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

          <span className="font-black">Sezon aktif</span>
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
              ? "Sezonu Güncelle"
              : "Sezonu Kaydet"}
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
