"use client";

import { FormEvent } from "react";
import {
  FaCalendarCheck,
  FaSave,
} from "react-icons/fa";

export type ReservationStatus =
  | "pending"
  | "confirmed"
  | "checked_in"
  | "checked_out"
  | "cancelled"
  | "no_show";

export type ReservationSource =
  | "direct"
  | "website"
  | "booking"
  | "expedia"
  | "hotelbeds"
  | "ets"
  | "jolly"
  | "tatilliyoruz"
  | "manual";

export type ReservationFormState = {
  customer_id?: string;
  hotel_id: string;
  room_type_id: string;
  room_id: string;
  reservation_no: string;
  source: ReservationSource;
  status: ReservationStatus;
  check_in: string;
  check_out: string;
  adults: string;
  children: string;
  currency: string;
  base_price: string;
  total_price: string;
  balance: string;
  notes: string;
};

export type ReservationCustomerOption = {
  id: string;
  customer_code: string | null;
  full_name: string;
  phone: string | null;
  whatsapp_phone: string | null;
  email: string | null;
  vip_level: string;
  lifecycle_stage: string;
  whatsapp_consent: boolean;
  marketing_consent: boolean;
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

type RoomOption = {
  id: string;
  hotel_id: string;
  room_type_id: string;
  room_number: string;
  room_status: string;
  housekeeping_status: string;
};

type Props = {
  customers?: ReservationCustomerOption[];
  hotels: HotelOption[];
  roomTypes: RoomTypeOption[];
  rooms: RoomOption[];
  form: ReservationFormState;
  saving: boolean;
  editing: boolean;
  onChange: <K extends keyof ReservationFormState>(
    key: K,
    value: ReservationFormState[K]
  ) => void;
  onSubmit: (
    event: FormEvent<HTMLFormElement>
  ) => void;
  onCancel: () => void;
};

const sourceLabels: Record<
  ReservationSource,
  string
> = {
  direct: "Doğrudan",
  website: "Web Sitesi",
  booking: "Booking.com",
  expedia: "Expedia",
  hotelbeds: "Hotelbeds",
  ets: "ETS",
  jolly: "Jolly",
  tatilliyoruz: "Tatilliyoruz",
  manual: "Manuel",
};

const statusLabels: Record<
  ReservationStatus,
  string
> = {
  pending: "Bekliyor",
  confirmed: "Onaylandı",
  checked_in: "Check-in Yapıldı",
  checked_out: "Check-out Yapıldı",
  cancelled: "İptal",
  no_show: "No Show",
};

export default function ReservationForm({
  customers = [],
  hotels,
  roomTypes,
  rooms,
  form,
  saving,
  editing,
  onChange,
  onSubmit,
  onCancel,
}: Props) {
  const filteredRoomTypes = roomTypes.filter(
    (roomType) =>
      roomType.hotel_id === form.hotel_id
  );

  const filteredRooms = rooms.filter(
    (room) =>
      room.hotel_id === form.hotel_id &&
      room.room_type_id === form.room_type_id
  );

  const selectedCustomer =
    customers.find(
      (customer) =>
        customer.id === form.customer_id
    ) ?? null;

  const selectedPhone =
    selectedCustomer?.whatsapp_phone ||
    selectedCustomer?.phone ||
    "";

  const whatsappHref =
    selectedPhone
      ? `https://wa.me/${selectedPhone.replace(/\D/g, "")}`
      : "";

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-[32px] border border-white/10 bg-slate-900 p-6 lg:p-8"
    >
      <div className="flex items-center gap-3">
        <FaCalendarCheck className="text-orange-400" />

        <div>
          <h2 className="text-2xl font-black">
            {editing
              ? "Rezervasyonu Düzenle"
              : "Yeni Rezervasyon"}
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Otel, oda tipi, tarihler, kişi sayısı
            ve fiyat bilgilerini girin.
          </p>
        </div>
      </div>

      <section className="mt-7 rounded-[28px] border border-orange-500/25 bg-gradient-to-br from-orange-500/[0.08] via-slate-950 to-slate-950 p-5 lg:p-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-400">
              CRM & MİSAFİR BAĞLANTISI
            </p>

            <h3 className="mt-2 text-xl font-black">
              Rezervasyonu müşteriye bağla
            </h3>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Müşteri geçmişi, Guest 360, WhatsApp ve otomasyon işlemleri bu bağlantı üzerinden çalışır.
            </p>
          </div>

          <a
            href="/dashboard/crm"
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-orange-500 px-4 text-sm font-black text-white transition hover:bg-orange-400"
          >
            + Yeni CRM Müşterisi
          </a>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <label>
            <span className="text-sm font-black">
              CRM Müşterisi
            </span>

            <select
              value={form.customer_id ?? ""}
              onChange={(event) =>
                onChange(
                  "customer_id",
                  event.target.value
                )
              }
              className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950"
            >
              <option value="">
                CRM müşterisi seçin
              </option>

              {customers.map((customer) => (
                <option
                  key={customer.id}
                  value={customer.id}
                >
                  {customer.full_name}
                  {customer.customer_code
                    ? ` • ${customer.customer_code}`
                    : ""}
                  {customer.whatsapp_phone
                    ? ` • ${customer.whatsapp_phone}`
                    : customer.phone
                      ? ` • ${customer.phone}`
                      : ""}
                </option>
              ))}
            </select>

            <p className="mt-2 text-xs text-slate-500">
              {customers.length > 0
                ? `${customers.length} aktif CRM müşterisi hazır.`
                : "Aktif CRM müşterisi bulunamadı."}
            </p>
          </label>

          <div
            className={`rounded-2xl border p-4 ${
              selectedCustomer
                ? "border-emerald-500/20 bg-emerald-500/[0.06]"
                : "border-white/10 bg-slate-950"
            }`}
          >
            {selectedCustomer ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-emerald-400">
                      MÜŞTERİ BAĞLANDI
                    </p>

                    <p className="mt-1 text-lg font-black">
                      {selectedCustomer.full_name}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    {selectedCustomer.vip_level !== "standard" && (
                      <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-black uppercase text-amber-400">
                        {selectedCustomer.vip_level}
                      </span>
                    )}

                    <span className="rounded-full bg-blue-500/15 px-3 py-1 text-xs font-black text-blue-400">
                      {selectedCustomer.lifecycle_stage}
                    </span>
                  </div>
                </div>

                <div className="mt-4 grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
                  <p>
                    <span className="text-slate-500">
                      Telefon:
                    </span>{" "}
                    {selectedCustomer.phone || "—"}
                  </p>

                  <p>
                    <span className="text-slate-500">
                      WhatsApp:
                    </span>{" "}
                    {selectedCustomer.whatsapp_phone || "—"}
                  </p>

                  <p className="sm:col-span-2">
                    <span className="text-slate-500">
                      E-posta:
                    </span>{" "}
                    {selectedCustomer.email || "—"}
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black ${
                      selectedCustomer.whatsapp_consent
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-red-500/15 text-red-400"
                    }`}
                  >
                    WhatsApp izni{" "}
                    {selectedCustomer.whatsapp_consent
                      ? "var"
                      : "yok"}
                  </span>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black ${
                      selectedCustomer.marketing_consent
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-slate-500/15 text-slate-400"
                    }`}
                  >
                    Pazarlama izni{" "}
                    {selectedCustomer.marketing_consent
                      ? "var"
                      : "yok"}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <a
                    href="/dashboard/crm"
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl border border-white/10 px-4 py-2 text-sm font-black text-slate-200"
                  >
                    CRM Profilini Aç
                  </a>

                  {whatsappHref && (
                    <a
                      href={whatsappHref}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-black text-white"
                    >
                      WhatsApp Aç
                    </a>
                  )}
                </div>
              </>
            ) : (
              <>
                <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                  CRM DURUMU
                </p>

                <p className="mt-2 font-black">
                  Müşteri seçilmedi
                </p>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Rezervasyon oluşturulabilir. CRM müşterisi seçildiğinde müşteri geçmişi ve otomasyon bağlantısı hazırlanır.
                </p>
              </>
            )}
          </div>
        </div>
      </section>

      <div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <label>
          <span className="text-sm font-black">
            Otel
          </span>

          <select
            required
            value={form.hotel_id}
            onChange={(event) => {
              onChange(
                "hotel_id",
                event.target.value
              );
              onChange("room_type_id", "");
              onChange("room_id", "");
            }}
            className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950"
          >
            <option value="">
              Otel seçin
            </option>

            {hotels.map((hotel) => (
              <option
                key={hotel.id}
                value={hotel.id}
              >
                {hotel.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="text-sm font-black">
            Oda tipi
          </span>

          <select
            required
            disabled={!form.hotel_id}
            value={form.room_type_id}
            onChange={(event) => {
              onChange(
                "room_type_id",
                event.target.value
              );
              onChange("room_id", "");
            }}
            className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 disabled:opacity-50"
          >
            <option value="">
              Oda tipi seçin
            </option>

            {filteredRoomTypes.map(
              (roomType) => (
                <option
                  key={roomType.id}
                  value={roomType.id}
                >
                  {roomType.name}
                </option>
              )
            )}
          </select>
        </label>

        <label>
          <span className="text-sm font-black">
            Oda
          </span>

          <select
            disabled={!form.room_type_id}
            value={form.room_id}
            onChange={(event) =>
              onChange(
                "room_id",
                event.target.value
              )
            }
            className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 disabled:opacity-50"
          >
            <option value="">
              Sonra ata
            </option>

            {filteredRooms.map((room) => (
              <option
                key={room.id}
                value={room.id}
              >
                Oda {room.room_number}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="text-sm font-black">
            Rezervasyon no
          </span>

          <input
            required
            value={form.reservation_no}
            onChange={(event) =>
              onChange(
                "reservation_no",
                event.target.value
              )
            }
            placeholder="RSV-2026-000001"
            className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950"
          />
        </label>

        <label>
          <span className="text-sm font-black">
            Giriş tarihi
          </span>

          <input
            required
            type="date"
            value={form.check_in}
            onChange={(event) =>
              onChange(
                "check_in",
                event.target.value
              )
            }
            className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950"
          />
        </label>

        <label>
          <span className="text-sm font-black">
            Çıkış tarihi
          </span>

          <input
            required
            type="date"
            value={form.check_out}
            onChange={(event) =>
              onChange(
                "check_out",
                event.target.value
              )
            }
            className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950"
          />
        </label>

        <label>
          <span className="text-sm font-black">
            Yetişkin
          </span>

          <input
            required
            type="number"
            min="1"
            value={form.adults}
            onChange={(event) =>
              onChange(
                "adults",
                event.target.value
              )
            }
            className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950"
          />
        </label>

        <label>
          <span className="text-sm font-black">
            Çocuk
          </span>

          <input
            type="number"
            min="0"
            value={form.children}
            onChange={(event) =>
              onChange(
                "children",
                event.target.value
              )
            }
            className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950"
          />
        </label>

        <label>
          <span className="text-sm font-black">
            Kaynak
          </span>

          <select
            value={form.source}
            onChange={(event) =>
              onChange(
                "source",
                event.target
                  .value as ReservationSource
              )
            }
            className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950"
          >
            {Object.entries(
              sourceLabels
            ).map(([value, label]) => (
              <option
                key={value}
                value={value}
              >
                {label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="text-sm font-black">
            Durum
          </span>

          <select
            value={form.status}
            onChange={(event) =>
              onChange(
                "status",
                event.target
                  .value as ReservationStatus
              )
            }
            className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950"
          >
            {Object.entries(
              statusLabels
            ).map(([value, label]) => (
              <option
                key={value}
                value={value}
              >
                {label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="text-sm font-black">
            Baz fiyat
          </span>

          <input
            type="number"
            min="0"
            step="0.01"
            value={form.base_price}
            onChange={(event) =>
              onChange(
                "base_price",
                event.target.value
              )
            }
            className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950"
          />
        </label>

        <label>
          <span className="text-sm font-black">
            Toplam fiyat
          </span>

          <input
            type="number"
            min="0"
            step="0.01"
            value={form.total_price}
            onChange={(event) =>
              onChange(
                "total_price",
                event.target.value
              )
            }
            className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950"
          />
        </label>

        <label>
          <span className="text-sm font-black">
            Bakiye
          </span>

          <input
            type="number"
            min="0"
            step="0.01"
            value={form.balance}
            onChange={(event) =>
              onChange(
                "balance",
                event.target.value
              )
            }
            className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950"
          />
        </label>

        <label>
          <span className="text-sm font-black">
            Para birimi
          </span>

          <select
            value={form.currency}
            onChange={(event) =>
              onChange(
                "currency",
                event.target.value
              )
            }
            className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950"
          >
            <option value="TRY">TRY</option>
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
            <option value="GBP">GBP</option>
          </select>
        </label>

        <label className="md:col-span-2 xl:col-span-4">
          <span className="text-sm font-black">
            Notlar
          </span>

          <textarea
            rows={3}
            value={form.notes}
            onChange={(event) =>
              onChange(
                "notes",
                event.target.value
              )
            }
            className="mt-2 w-full rounded-2xl bg-white px-5 py-4 font-bold text-slate-950"
          />
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
              ? "Rezervasyonu Güncelle"
              : "Rezervasyonu Kaydet"}
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
