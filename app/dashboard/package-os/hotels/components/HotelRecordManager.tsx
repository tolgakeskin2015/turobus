"use client";

import {
  useState,
} from "react";

import {
  supabase,
} from "@/lib/supabase";

type Item = {
  id: string;
  name?: string;
  room_type_name?: string;
  valid_from?: string;
  valid_to?: string;
  stop_sale?: boolean;
  child_order?: number;
  age_from?: number;
  age_to?: number;
};

type Props = {
  companyId: string;
  rooms: Item[];
  rates: Item[];
  promotions: Item[];
  children: Item[];
  onChanged: () => Promise<void>;
};

export default function HotelRecordManager({
  companyId,
  rooms,
  rates,
  promotions,
  children,
  onChanged,
}: Props) {
  const [
    busyId,
    setBusyId,
  ] =
    useState("");

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

  async function deactivate(
    table: string,
    id: string,
    label: string
  ) {
    if (
      !window.confirm(
        `${label} pasife alınsın mı? Kayıt kalıcı olarak silinmez.`
      )
    ) {
      return;
    }

    setBusyId(id);
    setMessage("");
    setError("");

    try {
      const {
        error:
          updateError,
      } =
        await supabase
          .from(table)
          .update({
            is_active:
              false,
            updated_at:
              new Date()
                .toISOString(),
          })
          .eq(
            "id",
            id
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
        `${label} pasife alındı.`
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
          : "İşlem tamamlanamadı."
      );
    } finally {
      setBusyId("");
    }
  }

  async function toggleStopSale(
    item: Item
  ) {
    setBusyId(
      item.id
    );

    setMessage("");
    setError("");

    try {
      const next =
        !item.stop_sale;

      const {
        error:
          updateError,
      } =
        await supabase
          .from(
            "package_hotel_rates"
          )
          .update({
            stop_sale:
              next,
            updated_at:
              new Date()
                .toISOString(),
          })
          .eq(
            "id",
            item.id
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
        next
          ? "Fiyat dönemi Stop Sale'e alındı."
          : "Fiyat dönemi tekrar satışa açıldı."
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
          : "Stop Sale durumu değiştirilemedi."
      );
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="mt-5 rounded-[26px] border border-white/10 bg-slate-900 p-6">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-400">
          KAYIT YÖNETİMİ
        </p>

        <h3 className="mt-2 text-xl font-black">
          Otel Kontrat Kayıtları
        </h3>

        <p className="mt-2 text-sm leading-6 text-slate-400">
          Hatalı veya artık kullanılmayan oda, fiyat, kampanya ve
          çocuk kurallarını buradan pasife alabilirsiniz.
        </p>
      </div>

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

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <Section
          title="Oda Tipleri"
          empty="Aktif oda tipi yok."
        >
          {rooms.map(
            item => (
              <Row
                key={item.id}
                title={
                  item.name ??
                  "Oda"
                }
                busy={
                  busyId ===
                  item.id
                }
                onRemove={() =>
                  deactivate(
                    "package_hotel_room_types",
                    item.id,
                    item.name ??
                      "Oda tipi"
                  )
                }
              />
            )
          )}
        </Section>

        <Section
          title="Fiyat Dönemleri"
          empty="Aktif fiyat dönemi yok."
        >
          {rates.map(
            item => (
              <div
                key={item.id}
                className="rounded-xl border border-white/10 bg-slate-950 p-4"
              >
                <div className="font-black">
                  {item.room_type_name ??
                    "Fiyat dönemi"}
                </div>

                <div className="mt-1 text-xs text-slate-500">
                  {item.valid_from ??
                    "-"}{" "}
                  →{" "}
                  {item.valid_to ??
                    "-"}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={
                      busyId ===
                      item.id
                    }
                    onClick={() =>
                      toggleStopSale(
                        item
                      )
                    }
                    className={`rounded-lg px-3 py-2 text-xs font-black ${
                      item.stop_sale
                        ? "bg-emerald-500/10 text-emerald-300"
                        : "bg-amber-500/10 text-amber-300"
                    }`}
                  >
                    {item.stop_sale
                      ? "Satışa Aç"
                      : "Stop Sale"}
                  </button>

                  <button
                    type="button"
                    disabled={
                      busyId ===
                      item.id
                    }
                    onClick={() =>
                      deactivate(
                        "package_hotel_rates",
                        item.id,
                        "Fiyat dönemi"
                      )
                    }
                    className="rounded-lg bg-red-500/10 px-3 py-2 text-xs font-black text-red-300"
                  >
                    Pasife Al
                  </button>
                </div>
              </div>
            )
          )}
        </Section>

        <Section
          title="Kampanyalar"
          empty="Aktif kampanya yok."
        >
          {promotions.map(
            item => (
              <Row
                key={item.id}
                title={
                  item.name ??
                  "Kampanya"
                }
                busy={
                  busyId ===
                  item.id
                }
                onRemove={() =>
                  deactivate(
                    "package_hotel_promotions",
                    item.id,
                    item.name ??
                      "Kampanya"
                  )
                }
              />
            )
          )}
        </Section>

        <Section
          title="Çocuk Politikaları"
          empty="Aktif çocuk politikası yok."
        >
          {children.map(
            item => (
              <Row
                key={item.id}
                title={`${
                  item.child_order ??
                  1
                }. çocuk · ${
                  item.age_from ??
                  0
                }-${
                  item.age_to ??
                  0
                } yaş`}
                busy={
                  busyId ===
                  item.id
                }
                onRemove={() =>
                  deactivate(
                    "package_hotel_child_policies",
                    item.id,
                    "Çocuk politikası"
                  )
                }
              />
            )
          )}
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children:
    React.ReactNode;
}) {
  const array =
    Array.isArray(
      children
    )
      ? children
      : [
          children,
        ];

  const hasItems =
    array.some(
      Boolean
    );

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
      <div className="mb-3 text-sm font-black">
        {title}
      </div>

      <div className="space-y-2">
        {hasItems
          ? children
          : (
            <div className="text-sm text-slate-500">
              {empty}
            </div>
          )}
      </div>
    </div>
  );
}

function Row({
  title,
  busy,
  onRemove,
}: {
  title: string;
  busy: boolean;
  onRemove:
    () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-950 p-4">
      <div className="min-w-0 truncate text-sm font-bold">
        {title}
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={onRemove}
        className="shrink-0 rounded-lg bg-red-500/10 px-3 py-2 text-xs font-black text-red-300 disabled:opacity-50"
      >
        Pasife Al
      </button>
    </div>
  );
}
