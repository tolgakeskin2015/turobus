"use client";

import { FormEvent } from "react";
import { FaSave, FaTags } from "react-icons/fa";

export type RatePlanFormState = {
  hotel_id: string;
  room_type_id: string;
  name: string;
  rate_code: string;
  meal_plan: string;
  currency: string;
  is_refundable: boolean;
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

type Props = {
  hotels: HotelOption[];
  roomTypes: RoomTypeOption[];
  form: RatePlanFormState;
  saving: boolean;
  editing: boolean;
  onChange: <K extends keyof RatePlanFormState>(
    key: K,
    value: RatePlanFormState[K]
  ) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
};

const mealPlanLabels: Record<string, string> = {
  RO: "Sadece Oda",
  BB: "Kahvaltı Dahil",
  HB: "Yarım Pansiyon",
  FB: "Tam Pansiyon",
  AI: "Her Şey Dahil",
  UAI: "Ultra Her Şey Dahil",
};

export default function RatePlanForm({
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
        <FaTags className="text-orange-400" />

        <div>
          <h2 className="text-2xl font-black">
            {editing
              ? "Fiyat Planını Düzenle"
              : "Yeni Fiyat Planı"}
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            BAR, iadesiz, kahvaltı dahil veya diğer satış planlarını oluşturun.
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
            value={form.room_type_id}
            disabled={!form.hotel_id}
            onChange={(event) =>
              onChange("room_type_id", event.target.value)
            }
            className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 disabled:opacity-50"
          >
            <option value="">
              Tüm oda tipleri
            </option>

            {filteredRoomTypes.map((roomType) => (
              <option key={roomType.id} value={roomType.id}>
                {roomType.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="text-sm font-black">
            Plan adı
          </span>

          <input
            required
            value={form.name}
            onChange={(event) =>
              onChange("name", event.target.value)
            }
            placeholder="BAR"
            className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950"
          />
        </label>

        <label>
          <span className="text-sm font-black">
            Plan kodu
          </span>

          <input
            value={form.rate_code}
            onChange={(event) =>
              onChange("rate_code", event.target.value)
            }
            placeholder="BAR"
            className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950"
          />
        </label>

        <label>
          <span className="text-sm font-black">
            Pansiyon tipi
          </span>

          <select
            value={form.meal_plan}
            onChange={(event) =>
              onChange("meal_plan", event.target.value)
            }
            className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950"
          >
            {Object.entries(mealPlanLabels).map(
              ([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              )
            )}
          </select>
        </label>

        <label>
          <span className="text-sm font-black">
            Para birimi
          </span>

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

        <label className="flex items-center gap-3 rounded-2xl bg-slate-950 p-4">
          <input
            type="checkbox"
            checked={form.is_refundable}
            onChange={(event) =>
              onChange("is_refundable", event.target.checked)
            }
            className="h-5 w-5"
          />

          <span className="font-black">
            İade edilebilir
          </span>
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

          <span className="font-black">
            Plan aktif
          </span>
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
              ? "Planı Güncelle"
              : "Planı Kaydet"}
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
