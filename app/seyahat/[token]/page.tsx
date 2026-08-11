"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import Link from "next/link";
import { useParams } from "next/navigation";

import { supabase } from "@/lib/supabase";

type TripItem = {
  id: string;
  item_type: string;
  name: string;

  service_date: string | null;
  service_time: string | null;

  quantity: number;

  supplier_status: string;
  customer_status: string;

  activity_slot_id: string | null;
  activity_requires_slot: boolean;

  voucher_code: string | null;
  voucher_token: string | null;
  voucher_status: string | null;
};

type Trip = {
  booking_code: string;
  customer_name: string;

  package_type: string;
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

  payment_token: string;

  items: TripItem[];
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
  ).format(Number(value || 0));
}

function formatDate(
  value: string | null
) {
  if (!value) return "Tarih planlanacak";

  return new Intl.DateTimeFormat(
    "tr-TR",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }
  ).format(
    new Date(
      `${value}T12:00:00`
    )
  );
}

function serviceLabel(
  value: string
) {
  const labels: Record<
    string,
    string
  > = {
    hotel: "Konaklama",
    activity: "Aktivite",
    transfer: "Transfer",
    spa: "SPA",
    meal: "Yemek",
    photo: "Fotoğraf",
    guide: "Rehber",
    insurance: "Sigorta",
    gift: "Hediye",
    other: "Hizmet",
  };

  return (
    labels[value] ||
    "Hizmet"
  );
}

export default function TripWalletPage() {
  const params =
    useParams<{
      token: string;
    }>();

  const token =
    String(
      params?.token || ""
    );

  const [trip, setTrip] =
    useState<Trip | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const loadTrip =
    useCallback(
      async () => {
        const {
          data,
          error,
        } =
          await supabase.rpc(
            "get_package_trip_public",
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
            error?.message ||
              "Seyahat bilgileri bulunamadı."
          );

          setTrip(null);
          setLoading(false);
          return;
        }

        setTrip(
          data as Trip
        );

        setLoading(false);
      },
      [token]
    );

  useEffect(() => {
    if (token) {
      void loadTrip();
    }
  }, [
    token,
    loadTrip,
  ]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
        Seyahat programınız hazırlanıyor...
      </main>
    );
  }

  if (!trip) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
        <div className="rounded-[28px] border border-red-500/20 bg-slate-900 p-8 text-center">
          <h1 className="text-2xl font-black">
            Seyahat bulunamadı
          </h1>

          <p className="mt-4 text-red-300">
            {errorMessage}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="border-b border-white/10 bg-gradient-to-b from-orange-500/15 to-slate-950 px-5 py-12">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-400">
            TUROBUS TRAVEL WALLET
          </p>

          <h1 className="mt-4 text-4xl font-black md:text-6xl">
            Tatiliniz Hazır
          </h1>

          <p className="mt-4 text-lg text-slate-300">
            Merhaba{" "}
            <strong>
              {trip.customer_name}
            </strong>
            , seyahat programınız ve
            voucherlarınız burada.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <span className="rounded-full border border-white/10 bg-slate-950 px-4 py-2 text-sm font-bold">
              {trip.booking_code}
            </span>

            <span className="rounded-full border border-white/10 bg-slate-950 px-4 py-2 text-sm font-bold">
              {trip.destination ||
                "Tatil Paketi"}
            </span>

            <span className="rounded-full border border-white/10 bg-slate-950 px-4 py-2 text-sm font-bold">
              {trip.nights} gece
              {" · "}
              {trip.nights + 1} gün
            </span>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-5 py-10">
        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
            <p className="text-xs text-slate-500">
              Giriş
            </p>

            <p className="mt-2 font-black">
              {formatDate(
                trip.check_in
              )}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
            <p className="text-xs text-slate-500">
              Çıkış
            </p>

            <p className="mt-2 font-black">
              {formatDate(
                trip.check_out
              )}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
            <p className="text-xs text-slate-500">
              Misafir
            </p>

            <p className="mt-2 font-black">
              {trip.adults} yetişkin
              {trip.children > 0
                ? ` · ${trip.children} çocuk`
                : ""}
            </p>
          </div>
        </section>

        <section className="mt-7 rounded-[28px] border border-white/10 bg-slate-900 p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-orange-400">
                SEYAHAT PROGRAMI
              </p>

              <h2 className="mt-2 text-3xl font-black">
                Hizmetleriniz
              </h2>
            </div>

            <p className="text-sm text-slate-400">
              {trip.items.length} hizmet
            </p>
          </div>

          <div className="mt-6 space-y-4">
            {trip.items.map(
              (
                item,
                index
              ) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-white/10 bg-slate-950 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-500 font-black text-black">
                        {index + 1}
                      </div>

                      <div>
                        <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                          {serviceLabel(
                            item.item_type
                          )}
                        </p>

                        <h3 className="mt-1 text-xl font-black">
                          {item.name}
                        </h3>

                        <p className="mt-2 text-sm text-slate-400">
                          {formatDate(
                            item.service_date
                          )}

                          {item.service_time
                            ? ` · ${item.service_time.slice(
                                0,
                                5
                              )}`
                            : ""}
                        </p>

                        <p className="mt-2 text-xs text-slate-500">
                          Adet:{" "}
                          {Number(
                            item.quantity
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {item.customer_status ===
                        "used" && (
                        <span className="rounded-xl bg-emerald-500/10 px-3 py-2 text-xs font-black text-emerald-400">
                          ✓ Kullanıldı
                        </span>
                      )}

                      {item.item_type ===
                        "activity" &&
                        item.activity_requires_slot &&
                        item.customer_status !==
                          "used" &&
                        item.customer_status !==
                          "cancelled" && (
                          <Link
                            href={`/seyahat/${token}/aktivite/${item.id}`}
                            className={
                              item.activity_slot_id
                                ? "rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-black text-emerald-300"
                                : "rounded-xl bg-cyan-500 px-4 py-2 text-sm font-black text-black"
                            }
                          >
                            {item.activity_slot_id
                              ? "Saati Değiştir"
                              : "Saat Seç"}
                          </Link>
                        )}

                      {item.voucher_token &&
                        item.voucher_status !==
                          "cancelled" && (
                          <Link
                            href={`/voucher/${item.voucher_token}`}
                            className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-black text-black"
                          >
                            Voucher & QR
                          </Link>
                        )}
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        </section>

        <section className="mt-7 rounded-[28px] border border-white/10 bg-slate-900 p-6">
          <p className="text-xs font-black uppercase tracking-wider text-orange-400">
            ÖDEME DURUMU
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-slate-500">
                Paket
              </p>

              <p className="mt-1 font-black">
                {money(
                  trip.sale_price,
                  trip.currency
                )}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">
                Ödenen
              </p>

              <p className="mt-1 font-black text-emerald-400">
                {money(
                  trip.paid_amount,
                  trip.currency
                )}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">
                Kalan
              </p>

              <p className="mt-1 font-black text-orange-400">
                {money(
                  trip.balance_amount,
                  trip.currency
                )}
              </p>
            </div>
          </div>

          {Number(
            trip.balance_amount
          ) > 0 && (
            <Link
              href={`/odeme/${trip.payment_token}`}
              className="mt-6 block rounded-xl bg-orange-500 px-5 py-4 text-center font-black text-black"
            >
              Kalan Bakiyeyi Öde
            </Link>
          )}
        </section>
      </div>
    </main>
  );
}
