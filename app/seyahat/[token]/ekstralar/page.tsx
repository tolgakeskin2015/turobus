"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import {
  useParams,
  useSearchParams,
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


type ExtraOrderItem = {
  id: string;
  name: string;
  quantity: number;
  unit_sale_price: number;
  total_sale_price: number;
  currency: string;
  requires_slot: boolean;
  voucher_code: string | null;
  voucher_token: string | null;
  voucher_status: string | null;
};


type ExtraOrder = {
  order_token: string;
  booking_token: string;
  booking_code: string;
  customer_name: string;
  destination: string | null;
  currency: string;
  sale_price: number;
  status: string;
  operation_status: string;
  service_date: string | null;
  service_time: string | null;
  payment_provider: string | null;
  items: ExtraOrderItem[];
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
  const searchParams =
    useSearchParams();

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
    activeOrder,
    setActiveOrder,
  ] =
    useState<ExtraOrder | null>(
      null
    );

  const [
    paying,
    setPaying,
  ] =
    useState(false);


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


  const loadOrder =
    useCallback(
      async (
        orderToken: string
      ) => {
        if (!orderToken) {
          setActiveOrder(
            null
          );

          return;
        }

        const {
          data,
          error,
        } =
          await supabase.rpc(
            "get_package_extra_order_public",
            {
              p_order_token:
                orderToken,
            }
          );

        if (
          error ||
          !data
        ) {
          setErrorMessage(
            error?.message ||
              "Ekstra sipariş bilgisi yüklenemedi."
          );

          setActiveOrder(
            null
          );

          return;
        }

        setActiveOrder(
          data as ExtraOrder
        );
      },
      []
    );


  useEffect(() => {
    const orderToken =
      searchParams.get(
        "order"
      ) || "";

    if (orderToken) {
      void loadOrder(
        orderToken
      );
    }
  }, [
    searchParams,
    loadOrder,
  ]);


  useEffect(() => {
    const payment =
      searchParams.get(
        "payment"
      );

    const message =
      searchParams.get(
        "message"
      );

    if (
      payment ===
      "success"
    ) {
      setSuccessMessage(
        "Ödeme başarılı. Ekstra hizmet voucherın hazır."
      );
    }

    if (
      payment ===
      "failed"
    ) {
      setErrorMessage(
        message ||
          "Ekstra ödeme tamamlanamadı."
      );
    }
  }, [
    searchParams,
  ]);


  async function startPayment() {
    if (!activeOrder) {
      return;
    }

    setPaying(true);
    setErrorMessage("");

    try {
      const response =
        await fetch(
          "/api/package-extra-payments/iyzico/initialize",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                orderToken:
                  activeOrder.order_token,
              }),
          }
        );

      const result =
        await response.json() as {
          paymentPageUrl?: string;
          error?: string;
        };

      if (
        !response.ok ||
        !result.paymentPageUrl
      ) {
        throw new Error(
          result.error ||
            "Ödeme başlatılamadı."
        );
      }

      window.location.href =
        result.paymentPageUrl;

    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Ödeme başlatılamadı."
      );

      setPaying(false);
    }
  }


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


          {activeOrder && (
            <div className="mt-8 rounded-[28px] border border-orange-500/20 bg-orange-500/5 p-6">

              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-400">
                    Ekstra Siparişim
                  </p>

                  <h2 className="mt-2 text-2xl font-black">
                    {activeOrder.items
                      .map(
                        item =>
                          item.name
                      )
                      .join(", ")}
                  </h2>

                  <p className="mt-2 text-sm text-slate-400">
                    Rezervasyon:
                    {" "}
                    {activeOrder.booking_code}
                  </p>
                </div>

                <div className="lg:text-right">
                  <p className="text-xs font-bold uppercase text-slate-500">
                    Toplam
                  </p>

                  <p className="mt-1 text-3xl font-black text-orange-400">
                    {money(
                      Number(
                        activeOrder.sale_price
                      ),
                      activeOrder.currency
                    )}
                  </p>
                </div>

              </div>


              {activeOrder.status ===
              "paid" ? (
                <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5">

                  <p className="font-black text-emerald-300">
                    ✓ Ödeme Tamamlandı
                  </p>

                  <p className="mt-2 text-sm text-slate-400">
                    Ekstra hizmetin onaylandı.
                    Voucher ve QR kodunu aşağıdan açabilirsin.
                  </p>

                  <div className="mt-4 flex flex-wrap gap-3">

                    {activeOrder.items
                      .filter(
                        item =>
                          item.voucher_token
                      )
                      .map(
                        item => (
                          <Link
                            key={
                              item.id
                            }
                            href={`/voucher/${item.voucher_token}`}
                            className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-black text-black"
                          >
                            {item.name}
                            {" "}
                            Voucher →
                          </Link>
                        )
                      )}

                  </div>

                </div>
              ) : (
                <div className="mt-6">

                  <button
                    type="button"
                    disabled={paying}
                    onClick={() =>
                      void startPayment()
                    }
                    className="w-full rounded-xl bg-orange-500 px-5 py-4 font-black text-black disabled:opacity-50 md:w-auto"
                  >
                    {paying
                      ? "Güvenli ödeme açılıyor..."
                      : "Güvenli Öde"}
                  </button>

                  <p className="mt-3 text-xs text-slate-500">
                    Ödeme tutarı sistemde kayıtlı sipariş fiyatından alınır.
                    Tarayıcıdan fiyat değiştirilemez.
                  </p>

                </div>
              )}

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
