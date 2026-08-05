"use client";

import { FormEvent } from "react";
import { FaChild, FaSave } from "react-icons/fa";
import {
  ChildPricingMethod,
  ChildRuleFormState,
  childPricingMethodLabels,
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
  form: ChildRuleFormState;
  saving: boolean;
  editing: boolean;
  onChange: <K extends keyof ChildRuleFormState>(
    key: K,
    value: ChildRuleFormState[K]
  ) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
};

export default function ChildRuleForm({
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
      (!form.room_type_id ||
        !ratePlan.room_type_id ||
        ratePlan.room_type_id === form.room_type_id)
  );

  const pricingValueDisabled =
    form.pricing_method === "free" ||
    form.pricing_method === "adult_price";

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-[32px] border border-white/10 bg-slate-900 p-6 lg:p-8"
    >
      <div className="flex items-center gap-3">
        <FaChild className="text-orange-400" />

        <div>
          <h2 className="text-2xl font-black">
            {editing
              ? "Çocuk Kuralını Düzenle"
              : "Yeni Çocuk Yaş Kuralı"}
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Yaş aralığına göre ücretsiz, yüzde, sabit ücret veya yetişkin fiyatı uygulayın.
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
            disabled={!form.hotel_id}
            value={form.room_type_id}
            onChange={(event) => {
              onChange("room_type_id", event.target.value);
              onChange("rate_plan_id", "");
            }}
            className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 disabled:opacity-50"
          >
            <option value="">Tüm oda tipleri</option>

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
            disabled={!form.hotel_id}
            value={form.rate_plan_id}
            onChange={(event) =>
              onChange("rate_plan_id", event.target.value)
            }
            className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 disabled:opacity-50"
          >
            <option value="">Tüm fiyat planları</option>

            {filteredRatePlans.map((ratePlan) => (
              <option key={ratePlan.id} value={ratePlan.id}>
                {ratePlan.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="text-sm font-black">Kural adı</span>

          <input
            required
            value={form.name}
            onChange={(event) =>
              onChange("name", event.target.value)
            }
            placeholder="0–6 Yaş Ücretsiz"
            className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950"
          />
        </label>

        <label>
          <span className="text-sm font-black">Minimum yaş</span>

          <input
            required
            type="number"
            min="0"
            value={form.minimum_age}
            onChange={(event) =>
              onChange("minimum_age", event.target.value)
            }
            className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950"
          />
        </label>

        <label>
          <span className="text-sm font-black">Maksimum yaş</span>

          <input
            required
            type="number"
            min="0"
            value={form.maximum_age}
            onChange={(event) =>
              onChange("maximum_age", event.target.value)
            }
            className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950"
          />
        </label>

        <label>
          <span className="text-sm font-black">Fiyat yöntemi</span>

          <select
            value={form.pricing_method}
            onChange={(event) => {
              const method =
                event.target.value as ChildPricingMethod;

              onChange("pricing_method", method);

              if (
                method === "free" ||
                method === "adult_price"
              ) {
                onChange("pricing_value", "0");
              }
            }}
            className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950"
          >
            {Object.entries(childPricingMethodLabels).map(
              ([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              )
            )}
          </select>
        </label>

        <label>
          <span className="text-sm font-black">Fiyat değeri</span>

          <input
            required={!pricingValueDisabled}
            disabled={pricingValueDisabled}
            type="number"
            step="0.0001"
            value={form.pricing_value}
            onChange={(event) =>
              onChange("pricing_value", event.target.value)
            }
            placeholder={
              form.pricing_method === "percentage"
                ? "50"
                : "750"
            }
            className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 disabled:opacity-50"
          />
        </label>

        <label>
          <span className="text-sm font-black">
            Maksimum çocuk
          </span>

          <input
            type="number"
            min="0"
            value={form.maximum_children}
            onChange={(event) =>
              onChange(
                "maximum_children",
                event.target.value
              )
            }
            placeholder="Sınırsız"
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
