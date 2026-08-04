"use client";

import { FormEvent } from "react";
import { FaBed, FaSave } from "react-icons/fa";

export type RoomTypeFormState = {
  hotel_id: string;
  name: string;
  room_type_code: string;
  max_adults: string;
  max_children: string;
  max_occupancy: string;
  total_rooms: string;
  bed_type: string;
  room_size_m2: string;
  description: string;
  is_active: boolean;
};

type HotelOption = {
  id: string;
  name: string;
};

type Props = {
  hotels: HotelOption[];
  form: RoomTypeFormState;
  saving: boolean;
  editing: boolean;
  onChange: <K extends keyof RoomTypeFormState>(
    key: K,
    value: RoomTypeFormState[K]
  ) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
};

export default function RoomTypeForm({
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
      className="rounded-[32px] border border-white/10 bg-slate-900 p-6"
    >
      <div className="flex items-center gap-3">
        <FaBed className="text-orange-400" />
        <h2 className="text-2xl font-black">
          {editing ? "Oda Tipini Düzenle" : "Yeni Oda Tipi"}
        </h2>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
          <span className="text-sm font-black">Oda tipi adı</span>
          <input
            required
            value={form.name}
            onChange={(event) =>
              onChange("name", event.target.value)
            }
            placeholder="Standart Oda"
            className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950"
          />
        </label>

        <label>
          <span className="text-sm font-black">Oda tipi kodu</span>
          <input
            value={form.room_type_code}
            onChange={(event) =>
              onChange("room_type_code", event.target.value)
            }
            placeholder="STD"
            className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950"
          />
        </label>

        <label>
          <span className="text-sm font-black">Yatak tipi</span>
          <input
            value={form.bed_type}
            onChange={(event) =>
              onChange("bed_type", event.target.value)
            }
            placeholder="1 çift kişilik yatak"
            className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950"
          />
        </label>

        <label>
          <span className="text-sm font-black">Yetişkin</span>
          <input
            type="number"
            min="0"
            value={form.max_adults}
            onChange={(event) =>
              onChange("max_adults", event.target.value)
            }
            className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950"
          />
        </label>

        <label>
          <span className="text-sm font-black">Çocuk</span>
          <input
            type="number"
            min="0"
            value={form.max_children}
            onChange={(event) =>
              onChange("max_children", event.target.value)
            }
            className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950"
          />
        </label>

        <label>
          <span className="text-sm font-black">Toplam kapasite</span>
          <input
            type="number"
            min="1"
            value={form.max_occupancy}
            onChange={(event) =>
              onChange("max_occupancy", event.target.value)
            }
            className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950"
          />
        </label>

        <label>
          <span className="text-sm font-black">Toplam oda</span>
          <input
            type="number"
            min="0"
            value={form.total_rooms}
            onChange={(event) =>
              onChange("total_rooms", event.target.value)
            }
            className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950"
          />
        </label>

        <label>
          <span className="text-sm font-black">Oda büyüklüğü (m²)</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.room_size_m2}
            onChange={(event) =>
              onChange("room_size_m2", event.target.value)
            }
            className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950"
          />
        </label>

        <label className="md:col-span-2 xl:col-span-3">
          <span className="text-sm font-black">Açıklama</span>
          <input
            value={form.description}
            onChange={(event) =>
              onChange("description", event.target.value)
            }
            placeholder="Balkonlu, deniz manzaralı..."
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
          <span className="font-black">Aktif</span>
        </label>
      </div>

      <div className="mt-6 flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="flex min-h-14 items-center gap-2 rounded-2xl bg-orange-500 px-7 font-black disabled:opacity-50"
        >
          <FaSave />
          {saving
            ? "Kaydediliyor..."
            : editing
              ? "Oda Tipini Güncelle"
              : "Oda Tipini Kaydet"}
        </button>

        {editing && (
          <button
            type="button"
            onClick={onCancel}
            className="min-h-14 rounded-2xl border border-white/10 px-7 font-black"
          >
            İptal
          </button>
        )}
      </div>
    </form>
  );
}
