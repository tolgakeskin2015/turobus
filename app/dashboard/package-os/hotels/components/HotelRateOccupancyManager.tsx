"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  supabase,
} from "@/lib/supabase";

type Rate = {
  id: string;
  room_type_name: string;
  board_type: string;
  valid_from: string;
  valid_to: string;
  pricing_basis?: string;
  occupancy_1_factor?: number;
  occupancy_2_factor?: number;
  occupancy_3_factor?: number;
  extra_person_factor?: number;
};

type Draft = {
  pricingBasis: string;
  one: string;
  two: string;
  three: string;
  extra: string;
};

type Props = {
  companyId: string;
  rates: Rate[];
  onChanged: () => Promise<void>;
};

const basisLabels:
  Record<string, string> = {
    per_room:
      "Oda Başı / Gece",

    per_person:
      "Kişi Başı / Gece",

    occupancy_factor:
      "Doluluk Katsayılı",
  };

export default function HotelRateOccupancyManager({
  companyId,
  rates,
  onChanged,
}: Props) {
  const [
    drafts,
    setDrafts,
  ] =
    useState<
      Record<string, Draft>
    >({});

  const [
    busy,
    setBusy,
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

  useEffect(
    () => {
      const next:
        Record<string, Draft> =
        {};

      for (
        const rate
        of rates
      ) {
        next[rate.id] = {
          pricingBasis:
            rate.pricing_basis ||
            "per_room",

          one:
            String(
              rate.occupancy_1_factor ??
              1.5
            ),

          two:
            String(
              rate.occupancy_2_factor ??
              2
            ),

          three:
            String(
              rate.occupancy_3_factor ??
              2.7
            ),

          extra:
            String(
              rate.extra_person_factor ??
              0.9
            ),
        };
      }

      setDrafts(
        next
      );
    },
    [
      rates,
    ]
  );

  function updateDraft(
    id: string,
    key: keyof Draft,
    value: string
  ) {
    setDrafts(
      current => ({
        ...current,
        [id]: {
          ...current[id],
          [key]:
            value,
        },
      })
    );
  }

  async function save(
    rate: Rate
  ) {
    const draft =
      drafts[rate.id];

    if (!draft) {
      return;
    }

    setBusy(
      rate.id
    );

    setMessage("");
    setError("");

    try {
      const one =
        Number(
          draft.one
        );

      const two =
        Number(
          draft.two
        );

      const three =
        Number(
          draft.three
        );

      const extra =
        Number(
          draft.extra
        );

      if (
        [
          one,
          two,
          three,
          extra,
        ].some(
          value =>
            !Number.isFinite(
              value
            ) ||
            value < 0
        )
      ) {
        throw new Error(
          "Doluluk katsayıları geçersiz."
        );
      }

      const {
        error:
          updateError,
      } =
        await supabase
          .from(
            "package_hotel_rates"
          )
          .update({
            pricing_basis:
              draft.pricingBasis,

            occupancy_1_factor:
              one,

            occupancy_2_factor:
              two,

            occupancy_3_factor:
              three,

            extra_person_factor:
              extra,

            updated_at:
              new Date()
                .toISOString(),
          })
          .eq(
            "id",
            rate.id
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
        `${rate.room_type_name} fiyatlandırma modeli güncellendi.`
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
          : "Fiyatlandırma modeli kaydedilemedi."
      );
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="mt-5 rounded-[26px] border border-white/10 bg-slate-900 p-6">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-400">
          ODA FİYATLANDIRMA MODELİ
        </p>

        <h3 className="mt-2 text-xl font-black">
          Single · Double · Triple Hesap Kuralları
        </h3>

        <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-400">
          Her kontrat fiyat dönemi için oda başı, kişi başı veya
          doluluk katsayılı hesap seçebilirsiniz. Doluluk katsayılı
          modelde örneğin 1 kişi 1.50, 2 kişi 2.00, 3 kişi 2.70
          katsayısıyla hesaplanır.
        </p>
      </div>

      {message && (
        <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-300">
          {message}
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="mt-6 space-y-4">
        {rates.length ===
        0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/60 p-6 text-sm text-slate-500">
            Önce bir fiyat dönemi oluşturun.
          </div>
        ) : (
          rates.map(
            rate => {
              const draft =
                drafts[
                  rate.id
                ];

              if (!draft) {
                return null;
              }

              return (
                <div
                  key={
                    rate.id
                  }
                  className="rounded-2xl border border-white/10 bg-slate-950/60 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-black">
                        {
                          rate.room_type_name
                        }
                      </div>

                      <div className="mt-1 text-xs text-slate-500">
                        {
                          rate.valid_from
                        }{" "}
                        →{" "}
                        {
                          rate.valid_to
                        }
                      </div>
                    </div>

                    <span className="rounded-lg bg-orange-500/10 px-3 py-2 text-xs font-black text-orange-300">
                      {
                        basisLabels[
                          draft
                            .pricingBasis
                        ] ||
                        draft
                          .pricingBasis
                      }
                    </span>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                    <label>
                      <span className="mb-2 block text-xs font-black text-slate-400">
                        Fiyat Modeli
                      </span>

                      <select
                        value={
                          draft
                            .pricingBasis
                        }
                        onChange={
                          event =>
                            updateDraft(
                              rate.id,
                              "pricingBasis",
                              event
                                .target
                                .value
                            )
                        }
                        className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm"
                      >
                        <option value="per_room">
                          Oda Başı
                        </option>

                        <option value="per_person">
                          Kişi Başı
                        </option>

                        <option value="occupancy_factor">
                          Doluluk Katsayılı
                        </option>
                      </select>
                    </label>

                    <Factor
                      label="Single / 1 Kişi"
                      value={
                        draft.one
                      }
                      disabled={
                        draft.pricingBasis !==
                        "occupancy_factor"
                      }
                      onChange={
                        value =>
                          updateDraft(
                            rate.id,
                            "one",
                            value
                          )
                      }
                    />

                    <Factor
                      label="Double / 2 Kişi"
                      value={
                        draft.two
                      }
                      disabled={
                        draft.pricingBasis !==
                        "occupancy_factor"
                      }
                      onChange={
                        value =>
                          updateDraft(
                            rate.id,
                            "two",
                            value
                          )
                      }
                    />

                    <Factor
                      label="Triple / 3 Kişi"
                      value={
                        draft.three
                      }
                      disabled={
                        draft.pricingBasis !==
                        "occupancy_factor"
                      }
                      onChange={
                        value =>
                          updateDraft(
                            rate.id,
                            "three",
                            value
                          )
                      }
                    />

                    <Factor
                      label="4+ Her Ekstra Kişi"
                      value={
                        draft.extra
                      }
                      disabled={
                        draft.pricingBasis !==
                        "occupancy_factor"
                      }
                      onChange={
                        value =>
                          updateDraft(
                            rate.id,
                            "extra",
                            value
                          )
                      }
                    />
                  </div>

                  <button
                    type="button"
                    disabled={
                      busy ===
                      rate.id
                    }
                    onClick={() =>
                      save(
                        rate
                      )
                    }
                    className="mt-4 rounded-xl bg-orange-500 px-5 py-3 text-sm font-black hover:bg-orange-400 disabled:opacity-50"
                  >
                    {busy ===
                    rate.id
                      ? "Kaydediliyor..."
                      : "Fiyat Modelini Kaydet"}
                  </button>
                </div>
              );
            }
          )
        )}
      </div>
    </div>
  );
}

function Factor({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled: boolean;
  onChange:
    (value: string) => void;
}) {
  return (
    <label>
      <span className="mb-2 block text-xs font-black text-slate-400">
        {label}
      </span>

      <input
        type="number"
        min="0"
        step="0.01"
        disabled={disabled}
        value={value}
        onChange={
          event =>
            onChange(
              event.target.value
            )
        }
        className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm disabled:opacity-30"
      />
    </label>
  );
}
