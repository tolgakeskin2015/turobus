"use client";

import { FormEvent } from "react";
import { FaCalendarAlt, FaSave } from "react-icons/fa";

export type InventoryFormState = {
  hotel_id: string;
  room_type_id: string;
  inventory_date: string;
  total_inventory: string;
  reserved_inventory: string;
  blocked_inventory: string;
  minimum_stay: string;
  stop_sale: boolean;
  closed_to_arrival: boolean;
  closed_to_departure: boolean;
  notes: string;
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
  form: InventoryFormState;
  saving: boolean;
  editing: boolean;
  onChange: <K extends keyof InventoryFormState>(
    key: K,
    value: InventoryFormState[K]
  ) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
};

export default function InventoryForm({
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
        <FaCalendarAlt className="text-orange-400" />
        <h2 className="text-2xl font-black">
          {editing ? "Kontenjanı Düzenle" : "Yeni Kontenjan"}
        </h2>
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
          <span className="text-sm font-black">Tarih</span>
          <input
            required
            type="date"
            value={form.inventory_date}
            onChange={(event) =>
              onChange("inventory_date", event.target.value)
            }
            className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950"
          />
        </label>

        <label>
          <span className="text-sm font-black">Minimum konaklama</span>
          <input
            type="number"
            min="1"
            value={form.minimum_stay}
            onChange={(event) =>
              onChange("minimum_stay", event.target.value)
            }
            className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950"
          />
        </label>

        <label>
          <span className="text-sm font-black">Toplam kontenjan</span>
          <input
            type="number"
            min="0"
            value={form.total_inventory}
            onChange={(event) =>
              onChange("total_inventory", event.target.value)
            }
            className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950"
          />
        </label>

        <label>
          <span className="text-sm font-black">Rezerve</span>
          <input
            type="number"
            min="0"
            value={form.reserved_inventory}
            onChange={(event) =>
              onChange("reserved_inventory", event.target.value)
            }
            className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950"
          />
        </label>

        <label>
          <span className="text-sm font-black">Bloke</span>
          <input
            type="number"
            min="0"
            value={form.blocked_inventory}
            onChange={(event) =>
              onChange("blocked_inventory", event.target.value)
            }
            className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950"
          />
        </label>

        <label className="md:col-span-2 xl:col-span-4">
          <span className="text-sm font-black">Notlar</span>
          <input
            value={form.notes}
            onChange={(event) =>
              onChange("notes", event.target.value)
            }
            className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950"
          />
        </label>

        <label className="flex items-center gap-3 rounded-2xl bg-slate-950 p-4">
          <input
            type="checkbox"
            checked={form.stop_sale}
            onChange={(event) =>
              onChange("stop_sale", event.target.checked)
            }
            className="h-5 w-5"
          />
          <span className="font-black">Satışı durdur</span>
        </label>

        <label className="flex items-center gap-3 rounded-2xl bg-slate-950 p-4">
          <input
            type="checkbox"
            checked={form.closed_to_arrival}
            onChange={(event) =>
              onChange("closed_to_arrival", event.target.checked)
            }
            className="h-5 w-5"
          />
          <span className="font-black">Girişe kapalı</span>
        </label>

        <label className="flex items-center gap-3 rounded-2xl bg-slate-950 p-4">
          <input
            type="checkbox"
            checked={form.closed_to_departure}
            onChange={(event) =>
              onChange("closed_to_departure", event.target.checked)
            }
            className="h-5 w-5"
          />
          <span className="font-black">Çıkışa kapalı</span>
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
              ? "Kontenjanı Güncelle"
              : "Kontenjanı Kaydet"}
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
