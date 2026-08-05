"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  FaCalculator,
  FaCheckCircle,
  FaPlus,
  FaTrash,
} from "react-icons/fa";
import {
  calculateHotelPrice,
  formatPricingRuleValue,
  PriceAdjustmentType,
  PricingRule,
  PricingRuleSource,
} from "@/lib/hotel/pricing-engine";

type SimulatorRule = PricingRule & {
  adjustmentValueText: string;
  priorityText: string;
};

const sourceLabels: Record<PricingRuleSource, string> = {
  season: "Sezon",
  weekday: "Haftanın Günü",
  occupancy: "Kişi Sayısı",
  child: "Çocuk",
  event: "Etkinlik",
  early_booking: "Erken Rezervasyon",
  last_minute: "Son Dakika",
  length_of_stay: "Konaklama Süresi",
  channel: "Satış Kanalı",
  promotion: "Promosyon",
  coupon: "Kupon",
  manual: "Manuel",
};

const adjustmentLabels: Record<
  PriceAdjustmentType,
  string
> = {
  percentage: "Yüzde",
  fixed_amount: "Sabit Tutar",
  multiplier: "Çarpan",
  override_price: "Fiyatı Değiştir",
};

function createRule(index: number): SimulatorRule {
  return {
    id: crypto.randomUUID(),
    name: `Kural ${index}`,
    source: "season",
    adjustmentType: "percentage",
    adjustmentValue: 0,
    adjustmentValueText: "0",
    priority: index * 10,
    priorityText: String(index * 10),
    isActive: true,
    stopAfterApply: false,
  };
}

function money(value: number, currency: string) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
  }).format(value);
}

type PricingSimulatorProps = {
  importedRules?: PricingRule[];
};

export default function PricingSimulator({
  importedRules = [],
}: PricingSimulatorProps) {
  const [basePrice, setBasePrice] = useState("4000");
  const [currency, setCurrency] = useState("TRY");
  const [taxPercentage, setTaxPercentage] = useState("10");
  const [minimumPrice, setMinimumPrice] = useState("");
  const [maximumPrice, setMaximumPrice] = useState("");

  const [rules, setRules] = useState<SimulatorRule[]>([
    {
      ...createRule(1),
      name: "Yüksek Sezon",
      source: "season",
      adjustmentType: "percentage",
      adjustmentValue: 20,
      adjustmentValueText: "20",
      priority: 10,
      priorityText: "10",
    },
    {
      ...createRule(2),
      name: "Cumartesi",
      source: "weekday",
      adjustmentType: "percentage",
      adjustmentValue: 10,
      adjustmentValueText: "10",
      priority: 20,
      priorityText: "20",
    },
    {
      ...createRule(3),
      name: "3 Kişi",
      source: "occupancy",
      adjustmentType: "multiplier",
      adjustmentValue: 1.3,
      adjustmentValueText: "1.3",
      priority: 30,
      priorityText: "30",
    },
  ]);

  useEffect(() => {
    if (importedRules.length === 0) return;

    setRules(
      importedRules.map((rule) => ({
        ...rule,
        adjustmentValueText: String(
          rule.adjustmentValue
        ),
        priorityText: String(rule.priority),
      }))
    );
  }, [importedRules]);

  const result = useMemo(() => {
    return calculateHotelPrice({
      basePrice: Number(basePrice) || 0,
      currency,
      taxPercentage: Number(taxPercentage) || 0,
      minimumPrice:
        minimumPrice === ""
          ? null
          : Number(minimumPrice) || 0,
      maximumPrice:
        maximumPrice === ""
          ? null
          : Number(maximumPrice) || 0,
      rules: rules.map((rule) => ({
        id: rule.id,
        name: rule.name,
        source: rule.source,
        adjustmentType: rule.adjustmentType,
        adjustmentValue:
          Number(rule.adjustmentValueText) || 0,
        priority:
          Number(rule.priorityText) || 100,
        isActive: rule.isActive,
        stopAfterApply: rule.stopAfterApply,
      })),
    });
  }, [
    basePrice,
    currency,
    maximumPrice,
    minimumPrice,
    rules,
    taxPercentage,
  ]);

  function updateRule(
    id: string,
    changes: Partial<SimulatorRule>
  ) {
    setRules((current) =>
      current.map((rule) =>
        rule.id === id
          ? {
              ...rule,
              ...changes,
            }
          : rule
      )
    );
  }

  function addRule() {
    setRules((current) => [
      ...current,
      createRule(current.length + 1),
    ]);
  }

  function removeRule(id: string) {
    setRules((current) =>
      current.filter((rule) => rule.id !== id)
    );
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_420px]">
      <section className="space-y-6">
        <article className="rounded-[32px] border border-white/10 bg-slate-900 p-6 lg:p-8">
          <div className="flex items-center gap-3">
            <FaCalculator className="text-orange-400" />

            <div>
              <h2 className="text-2xl font-black">
                Simülasyon Ayarları
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Baz fiyatı, vergiyi ve fiyat sınırlarını
                belirleyin.
              </p>
            </div>
          </div>

          <div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            <label>
              <span className="text-sm font-black">
                Baz fiyat
              </span>

              <input
                type="number"
                min="0"
                step="0.01"
                value={basePrice}
                onChange={(event) =>
                  setBasePrice(event.target.value)
                }
                className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950"
              />
            </label>

            <label>
              <span className="text-sm font-black">
                Para birimi
              </span>

              <select
                value={currency}
                onChange={(event) =>
                  setCurrency(event.target.value)
                }
                className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950"
              >
                <option value="TRY">TRY</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
              </select>
            </label>

            <label>
              <span className="text-sm font-black">
                Vergi oranı (%)
              </span>

              <input
                type="number"
                min="0"
                step="0.01"
                value={taxPercentage}
                onChange={(event) =>
                  setTaxPercentage(event.target.value)
                }
                className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950"
              />
            </label>

            <label>
              <span className="text-sm font-black">
                Minimum fiyat
              </span>

              <input
                type="number"
                min="0"
                step="0.01"
                value={minimumPrice}
                onChange={(event) =>
                  setMinimumPrice(event.target.value)
                }
                placeholder="Sınır yok"
                className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950"
              />
            </label>

            <label>
              <span className="text-sm font-black">
                Maksimum fiyat
              </span>

              <input
                type="number"
                min="0"
                step="0.01"
                value={maximumPrice}
                onChange={(event) =>
                  setMaximumPrice(event.target.value)
                }
                placeholder="Sınır yok"
                className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950"
              />
            </label>
          </div>
        </article>

        <section className="rounded-[32px] border border-white/10 bg-slate-900 p-6 lg:p-8">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h2 className="text-2xl font-black">
                Fiyat Kuralları
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Kurallar öncelik numarasına göre uygulanır.
              </p>
            </div>

            <button
              type="button"
              onClick={addRule}
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 font-black"
            >
              <FaPlus />
              Yeni Kural
            </button>
          </div>

          <div className="mt-6 space-y-4">
            {rules.map((rule) => (
              <article
                key={rule.id}
                className="rounded-3xl border border-white/10 bg-slate-950 p-5"
              >
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                  <label className="xl:col-span-2">
                    <span className="text-xs font-black text-slate-500">
                      Kural adı
                    </span>

                    <input
                      value={rule.name}
                      onChange={(event) =>
                        updateRule(rule.id, {
                          name: event.target.value,
                        })
                      }
                      className="mt-2 min-h-12 w-full rounded-xl bg-white px-4 font-bold text-slate-950"
                    />
                  </label>

                  <label>
                    <span className="text-xs font-black text-slate-500">
                      Kaynak
                    </span>

                    <select
                      value={rule.source}
                      onChange={(event) =>
                        updateRule(rule.id, {
                          source:
                            event.target
                              .value as PricingRuleSource,
                        })
                      }
                      className="mt-2 min-h-12 w-full rounded-xl bg-white px-4 font-bold text-slate-950"
                    >
                      {Object.entries(sourceLabels).map(
                        ([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        )
                      )}
                    </select>
                  </label>

                  <label>
                    <span className="text-xs font-black text-slate-500">
                      İşlem
                    </span>

                    <select
                      value={rule.adjustmentType}
                      onChange={(event) =>
                        updateRule(rule.id, {
                          adjustmentType:
                            event.target
                              .value as PriceAdjustmentType,
                        })
                      }
                      className="mt-2 min-h-12 w-full rounded-xl bg-white px-4 font-bold text-slate-950"
                    >
                      {Object.entries(adjustmentLabels).map(
                        ([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        )
                      )}
                    </select>
                  </label>

                  <label>
                    <span className="text-xs font-black text-slate-500">
                      Değer
                    </span>

                    <input
                      type="number"
                      step="0.0001"
                      value={rule.adjustmentValueText}
                      onChange={(event) =>
                        updateRule(rule.id, {
                          adjustmentValueText:
                            event.target.value,
                        })
                      }
                      className="mt-2 min-h-12 w-full rounded-xl bg-white px-4 font-bold text-slate-950"
                    />
                  </label>

                  <label>
                    <span className="text-xs font-black text-slate-500">
                      Öncelik
                    </span>

                    <input
                      type="number"
                      min="1"
                      value={rule.priorityText}
                      onChange={(event) =>
                        updateRule(rule.id, {
                          priorityText:
                            event.target.value,
                        })
                      }
                      className="mt-2 min-h-12 w-full rounded-xl bg-white px-4 font-bold text-slate-950"
                    />
                  </label>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap gap-5">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={rule.isActive}
                        onChange={(event) =>
                          updateRule(rule.id, {
                            isActive:
                              event.target.checked,
                          })
                        }
                        className="h-5 w-5"
                      />

                      <span className="text-sm font-black">
                        Aktif
                      </span>
                    </label>

                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={Boolean(
                          rule.stopAfterApply
                        )}
                        onChange={(event) =>
                          updateRule(rule.id, {
                            stopAfterApply:
                              event.target.checked,
                          })
                        }
                        className="h-5 w-5"
                      />

                      <span className="text-sm font-black">
                        Bu kuraldan sonra dur
                      </span>
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeRule(rule.id)}
                    className="flex min-h-10 items-center gap-2 rounded-xl bg-red-500/10 px-4 text-sm font-black text-red-400"
                  >
                    <FaTrash />
                    Sil
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>

      <aside className="xl:sticky xl:top-6 xl:self-start">
        <section className="rounded-[32px] border border-orange-500/20 bg-slate-900 p-6 lg:p-8">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-400">
            CANLI HESAPLAMA
          </p>

          <h2 className="mt-3 text-3xl font-black">
            Fiyat Sonucu
          </h2>

          <div className="mt-6 rounded-3xl bg-slate-950 p-5">
            <p className="text-sm text-slate-500">
              Baz fiyat
            </p>

            <p className="mt-2 text-3xl font-black">
              {money(result.basePrice, currency)}
            </p>
          </div>

          <div className="mt-5 space-y-3">
            {result.appliedRules.map((step) => (
              <article
                key={step.ruleId}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black">
                      {step.ruleName}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {sourceLabels[step.source]} ·{" "}
                      {formatPricingRuleValue({
                        adjustmentType:
                          step.adjustmentType,
                        adjustmentValue:
                          step.adjustmentValue,
                      })}
                    </p>
                  </div>

                  <FaCheckCircle className="text-emerald-400" />
                </div>

                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-slate-500">
                    {money(step.priceBefore, currency)}
                  </span>

                  <span className="font-black text-emerald-400">
                    {money(step.priceAfter, currency)}
                  </span>
                </div>
              </article>
            ))}
          </div>

          {(result.minimumPriceApplied ||
            result.maximumPriceApplied) && (
            <div className="mt-5 rounded-2xl bg-amber-500/10 p-4 text-sm font-bold text-amber-400">
              {result.minimumPriceApplied &&
                "Minimum fiyat sınırı uygulandı."}

              {result.minimumPriceApplied &&
                result.maximumPriceApplied &&
                " "}

              {result.maximumPriceApplied &&
                "Maksimum fiyat sınırı uygulandı."}
            </div>
          )}

          <div className="mt-6 border-t border-white/10 pt-6">
            <div className="flex justify-between text-sm text-slate-400">
              <span>Ara toplam</span>
              <span>
                {money(result.subtotal, currency)}
              </span>
            </div>

            <div className="mt-3 flex justify-between text-sm text-slate-400">
              <span>Vergi</span>
              <span>
                {money(result.taxAmount, currency)}
              </span>
            </div>

            <div className="mt-5 flex items-end justify-between gap-4">
              <span className="font-black">
                Nihai fiyat
              </span>

              <span className="text-4xl font-black text-emerald-400">
                {money(result.finalPrice, currency)}
              </span>
            </div>
          </div>
        </section>
      </aside>
    </div>
  );
}
