"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import {
  useParams,
} from "next/navigation";

import {
  supabase,
} from "@/lib/supabase";


type Extra = {
  id: string;

  name: string;
  category: string;

  city: string | null;
  district: string | null;

  description: string | null;

  cover_image_url:
    | string
    | null;

  video_url:
    | string
    | null;

  pricing_unit: string;

  sale_price: number;

  currency: string;

  duration_minutes:
    | number
    | null;

  requires_slot: boolean;
};


type ExtraPayload = {
  booking_code: string;

  destination:
    | string
    | null;

  currency: string;

  extras: Extra[];
};


function money(
  value: number,
  currency = "TRY"
) {
  return new Intl.NumberFormat(
    "tr-TR",
    {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }
  ).format(
    Number(value || 0)
  );
}


export default function PackageExtrasPage() {
  const params =
    useParams<{
      token: string;
    }>();

  const token =
    String(
      params?.token || ""
    );

  const [
    payload,
    setPayload,
  ] =
    useState<ExtraPayload | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [
    buyingId,
    setBuyingId,
  ] =
    useState("");

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] =
    useState("");


  const loadExtras =
    useCallback(
      async () => {
        setLoading(true);

        const {
          data,
          error,
        } =
          await supabase.rpc(
            "get_package_extras_public",
            {
              p_booking_token:
                token,
            }
          );


        if (
          error ||
          !data
        ) {
          setErrorMessage(
            error?.message ||
              "Ekstra hizmetler yüklenemedi."
          );

          setPayload(null);

          setLoading(false);

          return;
        }


        setPayload(
          data as ExtraPayload
        );

        setLoading(false);
      },
      [token]
    );


  useEffect(() => {
    if (token) {
      void loadExtras();
    }
  }, [
    token,
    loadExtras,
  ]);


  async function createOrder(
    extra: Extra
  ) {
    setBuyingId(
      extra.id
    );

    setErrorMessage("");
    setSuccessMessage("");


    try {
      const {
        data,
        error,
      } =
        await supabase.rpc(
          "create_package_extra_order_public",
          {
            p_booking_token:
              token,

            p_activity_id:
              extra.id,

            p_quantity:
              1,
          }
        );


      if (error) {
        throw new Error(
          error.message
        );
      }


      const result =
        data as {
          order_token?: string;
          activity_name?: string;
          sale_price?: number;
          currency?: string;
        };


      if (
        !result.order_token
      ) {
        throw new Error(
          "Ekstra sipariş oluşturulamadı."
        );
      }


      setSuccessMessage(
        `${result.activity_name ?? extra.name} seçildi. Ödeme adımına hazır.`
      );


      window.location.href =
        `/seyahat/${token}/ekstralar?order=${encodeURIComponent(
          result.order_token
        )}`;

    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Ekstra hizmet eklenemedi."
      );

    } finally {
      setBuyingId("");
    }
  }


  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
        Ekstra fırsatlar hazırlanıyor...
      </main>
    );
  }


  if (!payload) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
        <div className="rounded-[28px] border border-red-500/20 bg-slate-900 p-8 text-center">
          <h1 className="text-2xl font-black">
            Ekstra hizmetler açılamadı
          </h1>

          <p className="mt-4 text-red-300">
            {errorMessage}
          </p>

          <Link
            href={`/seyahat/${token}`}
            className="mt-6 inline-block rounded-xl border border-white/10 px-5 py-3 font-black"
          >
            Seyahatime Dön
          </Link>
        </div>
      </main>
    );
  }


  return (
    <main className="min-h-screen bg-slate-950 p-5 text-white md:p-10">
      <div className="mx-auto max-w-6xl">

        <Link
          href={`/seyahat/${token}`}
          className="text-sm font-black text-orange-400"
        >
          ← Seyahatime Dön
        </Link>


        <div className="mt-5">

          <p className="text-xs font-black uppercase tracking-[0.28em] text-orange-400">
            TUROBUS TRAVEL WALLET
          </p>

          <h1 className="mt-3 text-4xl font-black md:text-5xl">
            Tatilini Zenginleştir
          </h1>

          <p className="mt-3 max-w-2xl text-slate-400">
            Paketine dahil olmayan
            seçili aktiviteleri
            seyahatine ekleyebilirsin.
          </p>


          {errorMessage && (
            <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
              {errorMessage}
            </div>
          )}


          {successMessage && (
            <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-300">
              {successMessage}
            </div>
          )}


          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">

            {payload.extras.map(
              (extra) => (
                <article
                  key={extra.id}
                  className="overflow-hidden rounded-[26px] border border-white/10 bg-slate-900"
                >

                  {extra.cover_image_url ? (
                    <img
                      src={
                        extra.cover_image_url
                      }
                      alt={
                        extra.name
                      }
                      className="h-48 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-48 items-center justify-center bg-slate-800 text-slate-500">
                      Aktivite
                    </div>
                  )}


                  <div className="p-6">

                    <p className="text-xs font-black uppercase tracking-wider text-orange-400">
                      {extra.category}
                    </p>

                    <h2 className="mt-2 text-2xl font-black">
                      {extra.name}
                    </h2>


                    {(extra.city ||
                      extra.district) && (
                      <p className="mt-2 text-sm text-slate-400">
                        {[
                          extra.district,
                          extra.city,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}


                    {extra.description && (
                      <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-400">
                        {
                          extra.description
                        }
                      </p>
                    )}


                    <div className="mt-5 flex items-end justify-between gap-4 border-t border-white/10 pt-5">

                      <div>
                        <p className="text-xs text-slate-500">
                          Özel Fiyat
                        </p>

                        <p className="mt-1 text-2xl font-black text-orange-400">
                          {money(
                            Number(
                              extra.sale_price
                            ),
                            extra.currency
                          )}
                        </p>
                      </div>


                      {extra.requires_slot && (
                        <span className="rounded-lg bg-cyan-500/10 px-3 py-2 text-xs font-black text-cyan-300">
                          Saat seçilebilir
                        </span>
                      )}

                    </div>


                    <button
                      type="button"
                      disabled={
                        buyingId ===
                        extra.id
                      }
                      onClick={() =>
                        void createOrder(
                          extra
                        )
                      }
                      className="mt-5 w-full rounded-xl bg-orange-500 px-5 py-4 font-black text-black disabled:opacity-50"
                    >
                      {buyingId ===
                      extra.id
                        ? "Hazırlanıyor..."
                        : "Tatilime Ekle"}
                    </button>

                  </div>
                </article>
              )
            )}

          </div>


          {payload.extras.length ===
            0 && (
            <div className="mt-8 rounded-[28px] border border-white/10 bg-slate-900 p-10 text-center text-slate-400">
              Şu anda paketine
              eklenebilecek ekstra
              aktivite bulunmuyor.
            </div>
          )}

        </div>
      </div>
    </main>
  );
}
