"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  supabase,
} from "@/lib/supabase";


type Item = {
  selection_id: string;

  resource_type:
    | "hotel"
    | "tour";

  quantity: number;

  resource_name: string;
  unit_name: string;

  operation_status: string;
  allocation_status: string | null;

  allocation_id: string | null;

  confirmed_at: string | null;
  released_at: string | null;
};


type Props = {
  companyId: string;
  bookingId: string;
  bookingStatus: string;
  onChanged?: () => void;
};


export default function NetworkOperationCenter({
  companyId,
  bookingId,
  bookingStatus,
  onChanged,
}: Props) {

  const [
    items,
    setItems,
  ] =
    useState<Item[]>([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    busy,
    setBusy,
  ] =
    useState<string | null>(
      null
    );

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


  const load =
    useCallback(
      async () => {

        setLoading(true);
        setError("");

        const {
          data,
          error: rpcError,
        } =
          await supabase.rpc(
            "get_package_booking_network_operations",
            {
              p_company_id:
                companyId,

              p_booking_id:
                bookingId,
            }
          );

        if (rpcError) {

          setError(
            rpcError.message
          );

          setItems([]);

        } else {

          const result =
            data as {
              items?: Item[];
            };

          setItems(
            result.items ?? []
          );
        }

        setLoading(false);

      },
      [
        companyId,
        bookingId,
      ]
    );


  useEffect(
    () => {
      void load();
    },
    [
      load,
    ]
  );


  async function confirm(
    item: Item
  ) {

    if (
      bookingStatus ===
      "cancelled"
    ) {
      return;
    }

    const ok =
      window.confirm(
        item.resource_type ===
          "hotel"
          ? `${item.resource_name}: ${item.quantity} oda gerçek stoktan ayrılsın mı?`
          : `${item.resource_name}: ${item.quantity} koltuk gerçek kontenjandan ayrılsın mı?`
      );

    if (!ok) return;


    setBusy(
      item.selection_id
    );

    setError("");
    setMessage("");


    const {
      data,
      error: rpcError,
    } =
      await supabase.rpc(
        "confirm_package_network_selection",
        {
          p_company_id:
            companyId,

          p_booking_id:
            bookingId,

          p_selection_id:
            item.selection_id,
        }
      );


    if (rpcError) {

      setError(
        rpcError.message
      );

    } else {

      const result =
        data as {
          remaining?: number;
        };

      setMessage(
        `Network rezervasyonu onaylandı.${
          result.remaining != null
            ? ` Kalan: ${result.remaining}`
            : ""
        }`
      );

      await load();

      onChanged?.();
    }


    setBusy(null);
  }


  async function release(
    item: Item
  ) {

    const ok =
      window.confirm(
        `${item.resource_name} için ayrılan stok geri açılsın mı?`
      );

    if (!ok) return;


    setBusy(
      item.selection_id
    );

    setError("");
    setMessage("");


    const {
      error: rpcError,
    } =
      await supabase.rpc(
        "release_package_network_selection",
        {
          p_company_id:
            companyId,

          p_booking_id:
            bookingId,

          p_selection_id:
            item.selection_id,

          p_reason:
            "Operasyon tarafından stok geri açıldı",
        }
      );


    if (rpcError) {

      setError(
        rpcError.message
      );

    } else {

      setMessage(
        "Stok başarıyla geri açıldı."
      );

      await load();

      onChanged?.();
    }


    setBusy(null);
  }


  if (
    loading ||
    items.length === 0
  ) {
    return null;
  }


  return (

    <section className="mt-8 rounded-3xl border border-cyan-500/20 bg-cyan-500/[0.04] p-6">

      <div className="flex flex-wrap items-start justify-between gap-4">

        <div>

          <div className="text-xs font-black uppercase tracking-[0.2em] text-cyan-400">
            TUROBUS NETWORK OPERASYONU
          </div>

          <h2 className="mt-2 text-2xl font-black">
            Gerçek Stok & Kontenjan
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            Paket içindeki Network otel ve tur rezervasyonlarını
            gerçek Hotel OS / Tour OS stoğuna buradan bağlayın.
          </p>

        </div>

      </div>


      {error && (

        <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-bold text-red-300">
          {error}
        </div>

      )}


      {message && (

        <div className="mt-5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-300">
          {message}
        </div>

      )}


      <div className="mt-6 grid gap-4 xl:grid-cols-2">

        {items.map(
          item => {

            const active =
              item.operation_status ===
                "confirmed" &&
              item.allocation_status !==
                "released";

            const isBusy =
              busy ===
              item.selection_id;


            return (

              <div
                key={
                  item.selection_id
                }
                className="rounded-2xl border border-white/10 bg-slate-950 p-5"
              >

                <div className="flex items-start justify-between gap-4">

                  <div>

                    <div className="text-xs font-black uppercase tracking-wider text-cyan-400">
                      {
                        item.resource_type ===
                        "hotel"
                          ? "HOTEL OS"
                          : "TOUR OS"
                      }
                    </div>

                    <h3 className="mt-2 text-lg font-black">
                      {item.resource_name}
                    </h3>

                    <div className="mt-1 text-sm text-slate-500">
                      {item.unit_name}
                    </div>

                  </div>


                  <div className="text-right">

                    <div className="text-xs text-slate-500">
                      {
                        item.resource_type ===
                        "hotel"
                          ? "Oda"
                          : "Kişi"
                      }
                    </div>

                    <div className="text-2xl font-black text-cyan-300">
                      {item.quantity}
                    </div>

                  </div>

                </div>


                <div className="mt-4">

                  <span
                    className={`rounded-lg px-3 py-1.5 text-xs font-black ${
                      active
                        ? "bg-emerald-500/15 text-emerald-300"
                        : item.operation_status ===
                          "released"
                          ? "bg-slate-500/15 text-slate-300"
                          : "bg-amber-500/15 text-amber-300"
                    }`}
                  >
                    {
                      active
                        ? "STOK AYRILDI"
                        : item.operation_status ===
                          "released"
                          ? "STOK GERİ AÇILDI"
                          : "BEKLİYOR"
                    }
                  </span>

                </div>


                <div className="mt-5">

                  {
                    active
                      ? (

                        <button
                          type="button"
                          disabled={
                            isBusy
                          }
                          onClick={
                            () =>
                              release(item)
                          }
                          className="w-full rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-black text-red-300 disabled:opacity-50"
                        >
                          {
                            isBusy
                              ? "İşleniyor..."
                              : "Rezervasyonu Bırak · Stoğu Geri Aç"
                          }
                        </button>

                      )
                      : (

                        <button
                          type="button"
                          disabled={
                            isBusy ||
                            bookingStatus ===
                              "cancelled"
                          }
                          onClick={
                            () =>
                              confirm(item)
                          }
                          className="w-full rounded-xl bg-cyan-400 px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-50"
                        >
                          {
                            isBusy
                              ? "Stok Ayrılıyor..."
                              : item.resource_type ===
                                "hotel"
                                ? "Oda Stoğunu Ayır & Onayla"
                                : "Koltukları Ayır & Onayla"
                          }
                        </button>

                      )
                  }

                </div>

              </div>

            );

          }
        )}

      </div>

    </section>

  );
}
