"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

export type ActivityNetworkRequest = {
  productKey: string;
  activityName: string;
  city: string;
  district: string;
  serviceDate: string;
  quantity: number;
};

type Product = {
  product_key: string;
  name: string;
  city: string | null;
  district: string | null;
  provider_count: number;
  slot_count: number;
  total_available: number;
  minimum_sale_price: number | null;
  currency: string;
};

type Props = {
  companyId: string;
  checkIn: string;
  checkOut: string;
  people: number;
  value: ActivityNetworkRequest[];
  onChange: (value: ActivityNetworkRequest[]) => void;
};

function money(value: number | null) {
  if (value == null) return "-";
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function ActivityNetworkPicker({
  companyId,
  checkIn,
  checkOut,
  people,
  value,
  onChange,
}: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!companyId || !checkIn || !checkOut) {
      setProducts([]);
      return;
    }

    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      const { data, error: rpcError } = await supabase.rpc(
        "get_turobus_activity_network_catalog",
        {
          p_company_id: companyId,
          p_start_date: checkIn,
          p_end_date: checkOut,
        }
      );

      if (!active) return;

      if (rpcError) {
        setError(rpcError.message);
        setProducts([]);
      } else {
        const result = data as { products?: Product[] };
        setProducts(result.products ?? []);
      }

      setLoading(false);
    }

    void load();
    return () => {
      active = false;
    };
  }, [companyId, checkIn, checkOut]);

  const visible = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("tr-TR");
    if (!q) return products;
    return products.filter((product) =>
      [product.name, product.city, product.district]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("tr-TR")
        .includes(q)
    );
  }, [products, search]);

  function selected(productKey: string) {
    return value.find((item) => item.productKey === productKey);
  }

  function toggle(product: Product) {
    const existing = selected(product.product_key);
    if (existing) {
      onChange(value.filter((item) => item.productKey !== product.product_key));
      return;
    }

    onChange([
      ...value,
      {
        productKey: product.product_key,
        activityName: product.name,
        city: product.city ?? "",
        district: product.district ?? "",
        serviceDate: checkIn,
        quantity: Math.max(people, 1),
      },
    ]);
  }

  function updateDate(productKey: string, serviceDate: string) {
    onChange(
      value.map((item) =>
        item.productKey === productKey ? { ...item, serviceDate } : item
      )
    );
  }

  return (
    <div className="rounded-3xl border border-fuchsia-500/20 bg-fuchsia-500/[0.04] p-5">
      <div className="text-xs font-black uppercase tracking-[0.2em] text-fuchsia-400">
        TUROBUS ACTIVITY NETWORK
      </div>
      <h3 className="mt-2 text-xl font-black">Aktivite Ağı</h3>
      <p className="mt-2 text-sm leading-6 text-slate-400">
        Satışçı aktivite firmasını seçmez. Ürünü ve tarihi satar; firma, saat ve sorti operasyon tarafından atanır.
      </p>

      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Dalış, yamaç paraşütü, rafting..."
        className="mt-5 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm"
      />

      {loading && <div className="mt-4 text-sm text-slate-400">Aktivite ağı yükleniyor...</div>}
      {error && <div className="mt-4 rounded-xl bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {visible.map((product) => {
          const current = selected(product.product_key);
          return (
            <div
              key={product.product_key}
              className={`rounded-2xl border p-4 ${
                current
                  ? "border-fuchsia-400/60 bg-fuchsia-500/10"
                  : "border-white/10 bg-slate-950"
              }`}
            >
              <button type="button" onClick={() => toggle(product)} className="w-full text-left">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-black">{product.name}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {[product.city, product.district].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <span className="rounded-lg bg-fuchsia-500/15 px-2.5 py-1 text-[10px] font-black text-fuchsia-300">
                    {current ? "SEÇİLDİ" : "SEÇ"}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="rounded-xl bg-white/[0.03] p-3">
                    <div className="text-[10px] text-slate-500">Firma</div>
                    <div className="mt-1 font-black">{product.provider_count}</div>
                  </div>
                  <div className="rounded-xl bg-white/[0.03] p-3">
                    <div className="text-[10px] text-slate-500">Toplam Boş</div>
                    <div className="mt-1 font-black text-emerald-300">{product.total_available}</div>
                  </div>
                  <div className="rounded-xl bg-white/[0.03] p-3">
                    <div className="text-[10px] text-slate-500">Başlayan</div>
                    <div className="mt-1 text-xs font-black">{money(product.minimum_sale_price)}</div>
                  </div>
                </div>
              </button>

              {current && (
                <div className="mt-4 border-t border-white/10 pt-4">
                  <label className="text-xs font-black text-slate-400">Aktivite Tarihi</label>
                  <input
                    type="date"
                    min={checkIn}
                    max={checkOut}
                    value={current.serviceDate}
                    onChange={(event) => updateDate(product.product_key, event.target.value)}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm"
                  />
                  <div className="mt-3 text-xs text-slate-500">
                    Paket kişi sayısı: <span className="font-black text-white">{current.quantity}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!loading && !error && visible.length === 0 && (
        <div className="mt-5 rounded-xl border border-white/10 p-4 text-sm text-slate-500">
          Bu tarih aralığında Network aktivitesi bulunamadı.
        </div>
      )}
    </div>
  );
}
