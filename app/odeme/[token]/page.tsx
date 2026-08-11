"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  useParams,
  useSearchParams,
} from "next/navigation";

import { supabase } from "@/lib/supabase";

type Booking = {
  id: string;

  booking_code: string;

  customer_name: string;

  destination: string | null;

  check_in: string;
  check_out: string;

  nights: number;

  adults: number;
  children: number;

  currency: string;

  sale_price: number;
  paid_amount: number;
  balance_amount: number;

  payment_status: string;
  status: string;
};

function money(
  value: number,
  currency = "TRY"
) {
  return new Intl.NumberFormat(
    "tr-TR",
    {
      style:
        "currency",

      currency:
        currency ||
        "TRY",

      maximumFractionDigits:
        2,
    }
  ).format(
    Number(value || 0)
  );
}

export default function PackagePaymentPage() {
  const params =
    useParams<{
      token: string;
    }>();

  const searchParams =
    useSearchParams();

  const token =
    String(
      params?.token || ""
    );

  const [booking, setBooking] =
    useState<Booking | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [
    startingPayment,
    setStartingPayment,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const result =
    searchParams.get(
      "result"
    );

  const returnMessage =
    searchParams.get(
      "message"
    );

  const loadBooking =
    useCallback(
      async () => {
        setLoading(true);

        const {
          data,
          error,
        } =
          await supabase.rpc(
            "get_package_booking_payment_public",
            {
              p_token:
                token,
            }
          );

        if (
          error ||
          !data
        ) {
          setErrorMessage(
            "Ödeme bağlantısı bulunamadı."
          );

          setBooking(null);
          setLoading(false);
          return;
        }

        setBooking(
          data as Booking
        );

        setLoading(false);
      },
      [token]
    );

  useEffect(() => {
    if (token) {
      void loadBooking();
    }
  }, [
    token,
    loadBooking,
  ]);

  async function startPayment() {
    setStartingPayment(
      true
    );

    setErrorMessage("");

    try {
      const response =
        await fetch(
          "/api/package-payments/iyzico/initialize",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                token,
              }),
          }
        );

      const data =
        (await response.json()) as {
          error?: string;
          paymentPageUrl?: string;
        };

      if (
        !response.ok ||
        !data.paymentPageUrl
      ) {
        throw new Error(
          data.error ||
            "Ödeme başlatılamadı."
        );
      }

      window.location.href =
        data.paymentPageUrl;
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Ödeme başlatılamadı."
      );

      setStartingPayment(
        false
      );
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
        Ödeme bilgileri hazırlanıyor...
      </main>
    );
  }

  if (!booking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
        <div className="max-w-lg rounded-[28px] border border-red-500/20 bg-slate-900 p-8 text-center">
          <h1 className="text-2xl font-black">
            Ödeme bağlantısı geçersiz
          </h1>

          <p className="mt-4 text-red-300">
            {errorMessage}
          </p>
        </div>
      </main>
    );
  }

  const fullyPaid =
    Number(
      booking.balance_amount
    ) <= 0 ||
    booking.payment_status ===
      "paid";

  return (
    <main className="min-h-screen bg-slate-950 p-5 text-white md:p-10">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-[30px] border border-white/10 bg-slate-900 p-7 md:p-10">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-orange-400">
            TUROBUS
          </p>

          <h1 className="mt-4 text-4xl font-black">
            Güvenli Ödeme
          </h1>

          <p className="mt-3 text-slate-400">
            Paket rezervasyonunuzun
            kalan bakiyesini güvenli
            ödeme ekranından
            tamamlayabilirsiniz.
          </p>

          {result ===
            "success" && (
            <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-emerald-300">
              Ödemeniz başarıyla
              alındı.
            </div>
          )}

          {result ===
            "failed" && (
            <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-red-300">
              {returnMessage ||
                "Ödeme tamamlanamadı."}
            </div>
          )}

          {errorMessage && (
            <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-red-300">
              {errorMessage}
            </div>
          )}

          <div className="mt-8 rounded-2xl bg-slate-950 p-6">
            <p className="text-sm text-slate-500">
              Rezervasyon
            </p>

            <p className="mt-1 text-xl font-black">
              {
                booking.booking_code
              }
            </p>

            <p className="mt-5 text-sm text-slate-500">
              Misafir
            </p>

            <p className="mt-1 font-black">
              {
                booking.customer_name
              }
            </p>

            <p className="mt-5 text-sm text-slate-500">
              Paket
            </p>

            <p className="mt-1 font-black">
              {booking.destination ||
                "Tatil Paketi"}
            </p>

            <div className="mt-6 grid grid-cols-2 gap-4 border-t border-white/10 pt-6">
              <div>
                <p className="text-xs text-slate-500">
                  Paket Toplamı
                </p>

                <p className="mt-1 font-black">
                  {money(
                    Number(
                      booking.sale_price
                    ),
                    booking.currency
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">
                  Ödenen
                </p>

                <p className="mt-1 font-black text-emerald-400">
                  {money(
                    Number(
                      booking.paid_amount
                    ),
                    booking.currency
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-orange-500/20 bg-orange-500/10 p-6">
            <p className="text-sm font-bold text-orange-300">
              Kalan Bakiye
            </p>

            <p className="mt-2 text-4xl font-black">
              {money(
                Number(
                  booking.balance_amount
                ),
                booking.currency
              )}
            </p>
          </div>

          {fullyPaid ? (
            <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center">
              <p className="text-lg font-black text-emerald-400">
                ✓ Ödeme Tamamlandı
              </p>
            </div>
          ) : (
            <button
              type="button"
              disabled={
                startingPayment
              }
              onClick={() =>
                void startPayment()
              }
              className="mt-6 w-full rounded-2xl bg-orange-500 px-6 py-5 text-lg font-black text-black disabled:opacity-50"
            >
              {startingPayment
                ? "Ödeme ekranı hazırlanıyor..."
                : `${money(
                    Number(
                      booking.balance_amount
                    ),
                    booking.currency
                  )} Öde`}
            </button>
          )}

          <p className="mt-5 text-center text-xs leading-5 text-slate-500">
            Kart bilgileriniz TUROBUS
            tarafından saklanmaz. Ödeme
            işlemi iyzico güvenli ödeme
            altyapısı üzerinden
            tamamlanır.
          </p>
        </div>
      </div>
    </main>
  );
}
