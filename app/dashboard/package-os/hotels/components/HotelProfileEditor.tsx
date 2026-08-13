"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  supabase,
} from "@/lib/supabase";

type HotelData = {
  id: string;
  name: string;
  city: string | null;
  district: string | null;
  star_rating: number | null;
  description: string | null;
  address: string | null;
  cover_image_url: string | null;
  check_in_time?: string | null;
  check_out_time?: string | null;
  is_active?: boolean;
};

type Props = {
  companyId: string;
  hotel: HotelData;
  mediaCount: number;
  roomCount: number;
  rateCount: number;
  promotionCount: number;
  onChanged: () => Promise<void>;
};

export default function HotelProfileEditor({
  companyId,
  hotel,
  mediaCount,
  roomCount,
  rateCount,
  promotionCount,
  onChanged,
}: Props) {
  const [
    name,
    setName,
  ] =
    useState("");

  const [
    stars,
    setStars,
  ] =
    useState("");

  const [
    address,
    setAddress,
  ] =
    useState("");

  const [
    description,
    setDescription,
  ] =
    useState("");

  const [
    checkIn,
    setCheckIn,
  ] =
    useState("");

  const [
    checkOut,
    setCheckOut,
  ] =
    useState("");

  const [
    active,
    setActive,
  ] =
    useState(true);

  const [
    busy,
    setBusy,
  ] =
    useState(false);

  const [
    message,
    setMessage,
  ] =
    useState("");

  const [
    error,
    setError,
  ] =
    useState("");

  useEffect(
    () => {
      setName(
        hotel.name ?? ""
      );

      setStars(
        hotel.star_rating ===
          null ||
        hotel.star_rating ===
          undefined
          ? ""
          : String(
              hotel.star_rating
            )
      );

      setAddress(
        hotel.address ?? ""
      );

      setDescription(
        hotel.description ??
          ""
      );

      setCheckIn(
        hotel.check_in_time
          ? String(
              hotel
                .check_in_time
            ).slice(
              0,
              5
            )
          : ""
      );

      setCheckOut(
        hotel.check_out_time
          ? String(
              hotel
                .check_out_time
            ).slice(
              0,
              5
            )
          : ""
      );

      setActive(
        hotel.is_active !==
          false
      );

      setMessage("");
      setError("");
    },
    [
      hotel,
    ]
  );

  const completion =
    useMemo(
      () => {
        const checks = [
          Boolean(
            hotel.name
          ),
          Boolean(
            hotel.city &&
            hotel.district
          ),
          Boolean(
            hotel.address
          ),
          Boolean(
            hotel.description
          ),
          mediaCount >= 4,
          roomCount > 0,
          rateCount > 0,
          promotionCount > 0,
        ];

        return Math.round(
          checks.filter(
            Boolean
          ).length /
            checks.length *
            100
        );
      },
      [
        hotel,
        mediaCount,
        roomCount,
        rateCount,
        promotionCount,
      ]
    );

  async function save() {
    if (
      !name.trim()
    ) {
      setError(
        "Otel adı zorunludur."
      );
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const starNumber =
        stars.trim()
          ? Number(
              stars
            )
          : null;

      if (
        starNumber !==
          null &&
        (
          !Number.isFinite(
            starNumber
          ) ||
          starNumber < 0 ||
          starNumber > 7
        )
      ) {
        throw new Error(
          "Otel yıldızı 0 ile 7 arasında olmalıdır."
        );
      }

      const {
        error:
          updateError,
      } =
        await supabase
          .from(
            "package_catalog_hotels"
          )
          .update({
            name:
              name.trim(),

            star_rating:
              starNumber,

            address:
              address.trim() ||
              null,

            description:
              description
                .trim() ||
              null,

            check_in_time:
              checkIn ||
              null,

            check_out_time:
              checkOut ||
              null,

            updated_at:
              new Date()
                .toISOString(),
          })
          .eq(
            "id",
            hotel.id
          )
          .eq(
            "company_id",
            companyId
          );

      if (
        updateError
      ) {
        throw updateError;
      }

      setMessage(
        "Otel bilgileri güncellendi."
      );

      await onChanged();
    } catch (
      caught
    ) {
      console.error(
        caught
      );

      setError(
        caught instanceof
        Error
          ? caught.message
          : "Otel güncellenemedi."
      );
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive() {
    const next =
      !active;

    const approved =
      window.confirm(
        next
          ? "Otel tekrar aktif edilsin mi?"
          : "Otel pasife alınsın mı? Mevcut kayıtlar silinmez."
      );

    if (!approved) {
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const {
        error:
          updateError,
      } =
        await supabase
          .from(
            "package_catalog_hotels"
          )
          .update({
            is_active:
              next,
            updated_at:
              new Date()
                .toISOString(),
          })
          .eq(
            "id",
            hotel.id
          )
          .eq(
            "company_id",
            companyId
          );

      if (
        updateError
      ) {
        throw updateError;
      }

      setActive(
        next
      );

      setMessage(
        next
          ? "Otel aktif edildi."
          : "Otel pasife alındı."
      );

      await onChanged();
    } catch (
      caught
    ) {
      console.error(
        caught
      );

      setError(
        caught instanceof
        Error
          ? caught.message
          : "Otel durumu değiştirilemedi."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_320px]">
      <div className="rounded-[26px] border border-white/10 bg-slate-900 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-400">
              OTEL PROFİLİ
            </p>

            <h3 className="mt-2 text-xl font-black">
              Otel Bilgilerini Düzenle
            </h3>
          </div>

          <span
            className={`rounded-xl px-3 py-2 text-xs font-black ${
              active
                ? "bg-emerald-500/10 text-emerald-300"
                : "bg-red-500/10 text-red-300"
            }`}
          >
            {active
              ? "AKTİF"
              : "PASİF"}
          </span>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label>
            <span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">
              Otel Adı
            </span>

            <input
              value={name}
              onChange={event =>
                setName(
                  event.target.value
                )
              }
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-orange-500/60"
            />
          </label>

          <label>
            <span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">
              Yıldız
            </span>

            <input
              type="number"
              min="0"
              max="7"
              value={stars}
              onChange={event =>
                setStars(
                  event.target.value
                )
              }
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-orange-500/60"
            />
          </label>

          <label>
            <span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">
              Check-in
            </span>

            <input
              type="time"
              value={checkIn}
              onChange={event =>
                setCheckIn(
                  event.target.value
                )
              }
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-orange-500/60"
            />
          </label>

          <label>
            <span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">
              Check-out
            </span>

            <input
              type="time"
              value={checkOut}
              onChange={event =>
                setCheckOut(
                  event.target.value
                )
              }
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-orange-500/60"
            />
          </label>
        </div>

        <label className="mt-4 block">
          <span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">
            Adres
          </span>

          <input
            value={address}
            onChange={event =>
              setAddress(
                event.target.value
              )
            }
            className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-orange-500/60"
          />
        </label>

        <label className="mt-4 block">
          <span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-400">
            Satış Açıklaması
          </span>

          <textarea
            rows={5}
            value={description}
            onChange={event =>
              setDescription(
                event.target.value
              )
            }
            className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-orange-500/60"
          />
        </label>

        {message && (
          <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm font-bold text-emerald-300">
            {message}
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm font-bold text-red-300">
            {error}
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={save}
            className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-black hover:bg-orange-400 disabled:opacity-50"
          >
            Bilgileri Kaydet
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={toggleActive}
            className={`rounded-xl border px-5 py-3 text-sm font-black disabled:opacity-50 ${
              active
                ? "border-red-500/20 bg-red-500/10 text-red-300"
                : "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
            }`}
          >
            {active
              ? "Oteli Pasife Al"
              : "Oteli Aktif Et"}
          </button>
        </div>
      </div>

      <div className="rounded-[26px] border border-white/10 bg-slate-900 p-6">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-400">
          KURULUM DURUMU
        </p>

        <div className="mt-4 text-4xl font-black">
          %{completion}
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-950">
          <div
            className="h-full bg-orange-500 transition-all"
            style={{
              width:
                `${completion}%`,
            }}
          />
        </div>

        <div className="mt-5 space-y-3 text-sm">
          <SetupRow
            label="Konum"
            ok={Boolean(
              hotel.city &&
              hotel.district
            )}
          />

          <SetupRow
            label="Adres"
            ok={Boolean(
              hotel.address
            )}
          />

          <SetupRow
            label="Açıklama"
            ok={Boolean(
              hotel.description
            )}
          />

          <SetupRow
            label={`Galeri (${mediaCount})`}
            ok={
              mediaCount >= 4
            }
          />

          <SetupRow
            label={`Oda Tipi (${roomCount})`}
            ok={
              roomCount > 0
            }
          />

          <SetupRow
            label={`Fiyat Dönemi (${rateCount})`}
            ok={
              rateCount > 0
            }
          />

          <SetupRow
            label={`Kampanya (${promotionCount})`}
            ok={
              promotionCount >
              0
            }
          />
        </div>
      </div>
    </div>
  );
}

function SetupRow({
  label,
  ok,
}: {
  label: string;
  ok: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-950 px-4 py-3">
      <span className="text-slate-400">
        {label}
      </span>

      <span
        className={`text-xs font-black ${
          ok
            ? "text-emerald-400"
            : "text-amber-400"
        }`}
      >
        {ok
          ? "TAMAM"
          : "EKSİK"}
      </span>
    </div>
  );
}
