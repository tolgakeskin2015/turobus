"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { useParams } from "next/navigation";

import { supabase } from "@/lib/supabase";

type PublicQuoteItem = {
  id: string;
  item_type: string;
  name: string;
  service_date: string | null;
  quantity: number;
  unit_sale_price: number;
  total_sale_price: number;
  currency: string;
  description: string | null;
  sort_order: number;
};

type PublicQuote = {
  id: string;
  quote_code: string;

  customer_name: string;

  package_type: string;
  destination: string | null;

  check_in: string;
  check_out: string;

  adults: number;
  children: number;
  nights: number;

  currency: string;
  sale_price: number;

  status: string;
  valid_until: string | null;

  items: PublicQuoteItem[];
};

function money(value: number) {
  return new Intl.NumberFormat(
    "tr-TR",
    {
      style: "currency",
      currency: "TRY",
      maximumFractionDigits: 2,
    }
  ).format(Number(value || 0));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(
    "tr-TR",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }
  ).format(
    new Date(`${value}T12:00:00`)
  );
}

function itemLabel(
  type: string
) {
  if (type === "hotel")
    return "Konaklama";

  if (type === "activity")
    return "Aktivite";

  if (type === "transfer")
    return "Transfer";

  if (type === "spa")
    return "SPA";

  return "Hizmet";
}

export default function PublicQuotePage() {
  const params = useParams<{
    token: string;
  }>();

  const token =
    String(params?.token ?? "");

  const [quote, setQuote] =
    useState<PublicQuote | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [accepting, setAccepting] =
    useState(false);

  const [
    accepted,
    setAccepted,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const loadQuote =
    useCallback(async () => {
      if (!token) return;

      setErrorMessage("");

      const {
        data,
        error,
      } = await supabase.rpc(
        "get_package_quote_public",
        {
          p_token: token,
        }
      );

      if (error) {
        setErrorMessage(
          error.message
        );

        setLoading(false);
        return;
      }

      const loaded =
        data as PublicQuote;

      setQuote(loaded);

      setAccepted(
        loaded.status ===
          "accepted"
      );

      setLoading(false);
    }, [token]);

  useEffect(() => {
    void loadQuote();
  }, [loadQuote]);

  async function acceptQuote() {
    if (!token) return;

    setAccepting(true);
    setErrorMessage("");

    const {
      data,
      error,
    } = await supabase.rpc(
      "accept_package_quote_public",
      {
        p_token: token,
      }
    );

    if (error) {
      setErrorMessage(
        error.message
      );

      setAccepting(false);
      return;
    }

    if (data) {
      setAccepted(true);

      setQuote((current) =>
        current
          ? {
              ...current,
              status: "accepted",
            }
          : current
      );
    }

    setAccepting(false);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-8 text-white">
        Teklifiniz hazırlanıyor...
      </main>
    );
  }

  if (!quote) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-8 text-white">
        <div className="max-w-xl rounded-[28px] border border-red-500/20 bg-slate-900 p-8 text-center">
          <h1 className="text-2xl font-black">
            Teklif görüntülenemedi
          </h1>

          <p className="mt-4 text-red-300">
            {errorMessage ||
              "Teklif bulunamadı."}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="border-b border-white/10 bg-gradient-to-b from-orange-500/15 to-slate-950 px-5 py-14">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-400">
            TUROBUS
          </p>

          <h1 className="mt-5 max-w-3xl text-4xl font-black tracking-tight md:text-6xl">
            Size Özel Tatil Teklifi
          </h1>

          <p className="mt-5 text-lg text-slate-300">
            Sayın{" "}
            <strong>
              {quote.customer_name}
            </strong>
            , sizin için hazırlanan
            seyahat programını aşağıda
            inceleyebilirsiniz.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <span className="rounded-full border border-white/10 bg-slate-950/70 px-4 py-2 text-sm font-bold">
              {
                quote.quote_code
              }
            </span>

            {quote.destination && (
              <span className="rounded-full border border-white/10 bg-slate-950/70 px-4 py-2 text-sm font-bold">
                {
                  quote.destination
                }
              </span>
            )}

            <span className="rounded-full border border-white/10 bg-slate-950/70 px-4 py-2 text-sm font-bold">
              {quote.nights} gece
              {" · "}
              {quote.nights + 1} gün
            </span>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-5xl gap-6 px-5 py-10 lg:grid-cols-[1fr_330px]">
        <div className="space-y-6">
          <section className="rounded-[28px] border border-white/10 bg-slate-900 p-6">
            <p className="text-xs font-black uppercase tracking-wider text-orange-400">
              Seyahat Bilgileri
            </p>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div>
                <p className="text-xs text-slate-500">
                  Giriş
                </p>

                <p className="mt-1 font-black">
                  {formatDate(
                    quote.check_in
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">
                  Çıkış
                </p>

                <p className="mt-1 font-black">
                  {formatDate(
                    quote.check_out
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">
                  Misafir
                </p>

                <p className="mt-1 font-black">
                  {quote.adults} yetişkin
                  {quote.children > 0
                    ? ` · ${quote.children} çocuk`
                    : ""}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">
                  Konaklama
                </p>

                <p className="mt-1 font-black">
                  {quote.nights} gece
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-white/10 bg-slate-900 p-6">
            <p className="text-xs font-black uppercase tracking-wider text-orange-400">
              Paket İçeriğiniz
            </p>

            <div className="mt-5 space-y-3">
              {quote.items.map(
                (item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-white/10 bg-slate-950 p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                          {itemLabel(
                            item.item_type
                          )}
                        </p>

                        <h2 className="mt-2 text-lg font-black">
                          {item.name}
                        </h2>

                        {item.description && (
                          <p className="mt-2 text-sm text-slate-400">
                            {
                              item.description
                            }
                          </p>
                        )}

                        <p className="mt-3 text-sm text-slate-500">
                          Adet:{" "}
                          {Number(
                            item.quantity
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          </section>
        </div>

        <aside className="h-fit rounded-[28px] border border-orange-500/20 bg-slate-900 p-6 lg:sticky lg:top-6">
          <p className="text-xs font-black uppercase tracking-wider text-orange-400">
            Paket Toplamı
          </p>

          <p className="mt-4 text-4xl font-black">
            {money(
              Number(
                quote.sale_price
              )
            )}
          </p>

          <p className="mt-3 text-sm leading-6 text-slate-400">
            Yukarıdaki fiyat bu
            teklifte yer alan hizmetlerin
            toplam paket fiyatıdır.
          </p>

          {errorMessage && (
            <div className="mt-5 rounded-xl bg-red-500/10 p-4 text-sm text-red-300">
              {errorMessage}
            </div>
          )}

          {accepted ? (
            <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
              <p className="font-black text-emerald-400">
                ✓ Teklifi Kabul Ettiniz
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-300">
                Rezervasyon ve ödeme
                aşaması için satış
                danışmanınız sizinle
                iletişime geçecektir.
              </p>
            </div>
          ) : (
            <button
              type="button"
              disabled={accepting}
              onClick={() =>
                void acceptQuote()
              }
              className="mt-6 w-full rounded-2xl bg-orange-500 px-5 py-4 text-lg font-black text-black disabled:opacity-50"
            >
              {accepting
                ? "İşleniyor..."
                : "Teklifi Kabul Et"}
            </button>
          )}

          <div className="mt-6 border-t border-white/10 pt-5">
            <p className="text-xs leading-5 text-slate-500">
              Kabul işlemi rezervasyonu
              tek başına kesinleştirmez.
              Rezervasyon ödeme ve
              müsaitlik onayı sonrasında
              kesinleşir.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
