"use client";

import { FormEvent } from "react";
import { FaDoorOpen, FaSave } from "react-icons/fa";

export type RoomFormState = {
  hotel_id: string;
  room_type_id: string;
  room_number: string;
  floor_number: string;
  room_status:
    | "available"
    | "occupied"
    | "dirty"
    | "cleaning"
    | "inspection"
    | "maintenance"
    | "out_of_order"
    | "blocked";
  housekeeping_status:
    | "clean"
    | "dirty"
    | "cleaning"
    | "inspected";
  notes: string;
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
  form: RoomFormState;
  saving: boolean;
  editing: boolean;
  onChange: <K extends keyof RoomFormState>(
    key: K,
    value: RoomFormState[K]
  ) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
};

const roomStatusLabels: Record<
  RoomFormState["room_status"],
  string
> = {
  available: "Müsait",
  occupied: "Dolu",
  dirty: "Kirli",
  cleaning: "Temizleniyor",
  inspection: "Kontrol Bekliyor",
  maintenance: "Bakımda",
  out_of_order: "Kullanım Dışı",
  blocked: "Bloke",
};

const housekeepingLabels: Record<
  RoomFormState["housekeeping_status"],
  string
> = {
  clean: "Temiz",
  dirty: "Kirli",
  cleaning: "Temizleniyor",
  inspected: "Kontrol Edildi",
};

export default function RoomForm({
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
        <FaDoorOpen className="text-orange-400" />

        <div>
          <h2 className="text-2xl font-black">
            {editing ? "Odayı Düzenle" : "Yeni Oda Ekle"}
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Oda numarası, kat, oda tipi ve operasyon durumunu yönetin.
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
            className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
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
            className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none disabled:opacity-50"
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
          <span className="text-sm font-black">Oda numarası</span>

          <input
            required
            value={form.room_number}
            onChange={(event) =>
              onChange("room_number", event.target.value)
            }
            placeholder="101"
            className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
          />
        </label>

        <label>
          <span className="text-sm font-black">Kat</span>

          <input
            value={form.floor_number}
            onChange={(event) =>
              onChange("floor_number", event.target.value)
            }
            placeholder="1"
            className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
          />
        </label>

        <label>
          <span className="text-sm font-black">Oda durumu</span>

          <select
            value={form.room_status}
            onChange={(event) =>
              onChange(
                "room_status",
                event.target.value as RoomFormState["room_status"]
              )
            }
            className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
          >
            {Object.entries(roomStatusLabels).map(
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
            Housekeeping durumu
          </span>

          <select
            value={form.housekeeping_status}
            onChange={(event) =>
              onChange(
                "housekeeping_status",
                event.target
                  .value as RoomFormState["housekeeping_status"]
              )
            }
            className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
          >
            {Object.entries(housekeepingLabels).map(
              ([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              )
            )}
          </select>
        </label>

        <label className="md:col-span-2">
          <span className="text-sm font-black">Notlar</span>

          <input
            value={form.notes}
            onChange={(event) =>
              onChange("notes", event.target.value)
            }
            placeholder="Balkon kapısı kontrol edilecek..."
            className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
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

          <span className="font-black">Oda aktif</span>
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
              ? "Odayı Güncelle"
              : "Odayı Kaydet"}
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
