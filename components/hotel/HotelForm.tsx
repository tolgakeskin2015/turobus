"use client";

import { FormEvent } from "react";
import { FaSave } from "react-icons/fa";
import {
  HotelForm as HotelFormType,
  HotelType,
  hotelTypeLabels,
} from "./types";

type Props = {
  form: HotelFormType;
  editing: boolean;
  saving: boolean;
  onChange: <K extends keyof HotelFormType>(
    key: K,
    value: HotelFormType[K]
  ) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
};

export default function HotelForm({
  form,
  editing,
  saving,
  onChange,
  onSubmit,
  onCancel,
}: Props) {
  return (
    <form
      onSubmit={onSubmit}
      className="rounded-3xl border border-white/10 bg-slate-900 p-6"
    >
      <h2 className="text-2xl font-bold">
        {editing ? "Oteli Düzenle" : "Yeni Otel"}
      </h2>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <input
          required
          placeholder="Otel Adı"
          value={form.name}
          onChange={(e) => onChange("name", e.target.value)}
          className="rounded-xl bg-white p-3 text-black"
        />

        <input
          placeholder="Otel Kodu"
          value={form.hotel_code}
          onChange={(e) => onChange("hotel_code", e.target.value)}
          className="rounded-xl bg-white p-3 text-black"
        />

        <select
          value={form.hotel_type}
          onChange={(e) =>
            onChange("hotel_type", e.target.value as HotelType)
          }
          className="rounded-xl bg-white p-3 text-black"
        >
          {Object.entries(hotelTypeLabels).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>

        <input
          placeholder="Şehir"
          value={form.city}
          onChange={(e) => onChange("city", e.target.value)}
          className="rounded-xl bg-white p-3 text-black"
        />
      </div>

      <button
        type="submit"
        disabled={saving}
        className="mt-6 flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-3 font-bold text-white"
      >
        <FaSave />
        {saving
          ? "Kaydediliyor..."
          : editing
          ? "Güncelle"
          : "Kaydet"}
      </button>
    </form>
  );
}
