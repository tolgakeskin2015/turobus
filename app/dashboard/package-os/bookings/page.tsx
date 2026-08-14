"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import { supabase } from "@/lib/supabase";

import {
  CurrentMembership,
  getCurrentMembership,
} from "@/lib/current-user";

type Booking = {
  id: string;
  booking_code: string;
  public_token: string;

  customer_name: string;
  customer_phone: string | null;

  package_type: string;
  destination: string | null;

  check_in: string;
  check_out: string;

  adults: number;
  children: number;
  nights: number;

  total_cost: number;
  sale_price: number;

  gross_profit: number;
  net_profit: number;

  paid_amount: number;
  balance_amount: number;

  payment_status:
    | "unpaid"
    | "partial"
    | "paid"
    | "refunded";

  status:
    | "pending"
    | "confirmed"
    | "in_service"
    | "completed"
    | "cancelled";

  booked_at: string;

  quote_id:
    string |
    null;

  quote_snapshot_created_at:
    string |
    null;
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
    "tr-TR"
  ).format(
    new Date(`${value}T12:00:00`)
  );
}

function paymentLabel(
  status: Booking["payment_status"]
) {
  if (status === "paid") {
    return "Ödendi";
  }

  if (status === "partial") {
    return "Kısmi Ödeme";
  }

  if (status === "refunded") {
    return "İade";
  }

  return "Ödenmedi";
}

function bookingLabel(
  status: Booking["status"]
) {
  if (status === "confirmed") {
    return "Onaylı";
  }

  if (status === "in_service") {
    return "Tatilde";
  }

  if (status === "completed") {
    return "Tamamlandı";
  }

  if (status === "cancelled") {
    return "İptal";
  }

  return "Ödeme Bekliyor";
}

export default function PackageBookingsPage() {
  const [
    membership,
    setMembership,
  ] =
    useState<CurrentMembership | null>(
      null
    );

  const [bookings, setBookings] =
    useState<Booking[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [search, setSearch] =
    useState("");

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const loadBookings = useCallback(
    async (companyId: string) => {
      const { data, error } =
        await supabase
          .from("package_bookings")
          .select(`
            id,
            booking_code,
            public_token,
            customer_name,
            customer_phone,
            package_type,
            destination,
            check_in,
            check_out,
            adults,
            children,
            nights,
            total_cost,
            sale_price,
            gross_profit,
            net_profit,
            paid_amount,
            balance_amount,
            payment_status,
            status,
            booked_at,
            quote_id,
            quote_snapshot_created_at
          `)
          .eq(
            "company_id",
            companyId
          )
          .order("booked_at", {
            ascending: false,
          });

      if (error) {
        throw new Error(
          error.message
        );
      }

      setBookings(
        (data ?? []) as Booking[]
      );
    },
    []
  );

  useEffect(() => {
    async function initialize() {
      try {
        const {
          data: { user },
        } =
          await supabase.auth.getUser();

        if (!user) {
          setErrorMessage(
            "Kullanıcı oturumu bulunamadı."
          );
          return;
        }

        const currentMembership =
          await getCurrentMembership(
            user.id
          );

        if (!currentMembership) {
          setErrorMessage(
            "Aktif şirket üyeliği bulunamadı."
          );
          return;
        }

        setMembership(
          currentMembership
        );

        await loadBookings(
          currentMembership.company_id
        );
      } catch (error) {
        console.error(error);

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Paket rezervasyonları yüklenemedi."
        );
      } finally {
        setLoading(false);
      }
    }

    void initialize();
  }, [loadBookings]);

  const filteredBookings =
    useMemo(() => {
      const query = search
        .trim()
        .toLocaleLowerCase(
          "tr-TR"
        );

      if (!query) {
        return bookings;
      }

      return bookings.filter(
        (booking) =>
          [
            booking.booking_code,
            booking.customer_name,
            booking.customer_phone,
            booking.destination,
            paymentLabel(
              booking.payment_status
            ),
            bookingLabel(
              booking.status
            ),
          ]
            .filter(Boolean)
            .some((value) =>
              String(value)
                .toLocaleLowerCase(
                  "tr-TR"
                )
                .includes(query)
            )
      );
    }, [bookings, search]);

  const stats = useMemo(() => {
    const totalSales =
      bookings.reduce(
        (total, booking) =>
          total +
          Number(
            booking.sale_price
          ),
        0
      );

    const totalPaid =
      bookings.reduce(
        (total, booking) =>
          total +
          Number(
            booking.paid_amount
          ),
        0
      );

    const totalBalance =
      bookings.reduce(
        (total, booking) =>
          total +
          Number(
            booking.balance_amount
          ),
        0
      );

    const netProfit =
      bookings.reduce(
        (total, booking) =>
          total +
          Number(
            booking.net_profit
          ),
        0
      );

    return {
      count: bookings.length,
      totalSales,
      totalPaid,
      totalBalance,
      netProfit,
    };
  }, [bookings]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-10 text-white">
        Paket rezervasyonları yükleniyor...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 p-5 text-white md:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-400">
              TUROBUS PACKAGE OS
            </p>

            <h1 className="mt-3 text-4xl font-black">
              Paket Rezervasyonları
            </h1>

            <p className="mt-3 text-slate-400">
              Kabul edilen tekliflerden
              oluşan paket satışlarını,
              tahsilatları ve kârlılığı
              takip edin.
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/dashboard/package-os/quotes"
              className="rounded-xl border border-white/10 px-5 py-3 text-sm font-black"
            >
              Teklifler
            </Link>

            <Link
              href="/dashboard/package-os/payments"
              className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-black text-black"
            >
              Ödeme & Tahsilat
            </Link>

            <Link
              href="/dashboard/package-os"
              className="rounded-xl border border-white/10 px-5 py-3 text-sm font-black"
            >
              Paket Merkezi
            </Link>
          </div>
        </div>

        {errorMessage && (
          <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-300">
            {errorMessage}
          </div>
        )}

        <div className="mt-8 grid gap-4 md:grid-cols-5">
          {[
            [
              "Rezervasyon",
              String(
                stats.count
              ),
            ],
            [
              "Toplam Satış",
              money(
                stats.totalSales
              ),
            ],
            [
              "Tahsil Edilen",
              money(
                stats.totalPaid
              ),
            ],
            [
              "Bekleyen Tahsilat",
              money(
                stats.totalBalance
              ),
            ],
            [
              "Net Kâr",
              money(
                stats.netProfit
              ),
            ],
          ].map(
            ([label, value]) => (
              <div
                key={label}
                className="rounded-2xl border border-white/10 bg-slate-900 p-5"
              >
                <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                  {label}
                </p>

                <p className="mt-2 text-xl font-black">
                  {value}
                </p>
              </div>
            )
          )}
        </div>

        <input
          value={search}
          onChange={(event) =>
            setSearch(
              event.target.value
            )
          }
          placeholder="Rezervasyon kodu, müşteri, telefon veya destinasyon ara..."
          className="mt-7 w-full rounded-xl border border-white/10 bg-slate-900 p-4"
        />

        <div className="mt-5 overflow-x-auto rounded-[28px] border border-white/10 bg-slate-900">
          <table className="w-full min-w-[1280px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="p-4">
                  Rezervasyon
                </th>

                <th className="p-4">
                  Müşteri
                </th>

                <th className="p-4">
                  Tarih
                </th>

                <th className="p-4">
                  Kişi
                </th>

                <th className="p-4">
                  Satış
                </th>

                <th className="p-4">
                  Maliyet
                </th>

                <th className="p-4">
                  Net Kâr
                </th>

                <th className="p-4">
                  Tahsilat
                </th>

                <th className="p-4">
                  Kayıt Güvenliği
                </th>

                <th className="p-4">
                  Durum
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredBookings.map(
                (booking) => (
                  <tr
                    key={booking.id}
                    className="border-t border-white/5"
                  >
                    <td className="p-4">
                      <p className="font-black">
                        {
                          booking.booking_code
                        }
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {
                          booking.destination ??
                          "-"
                        }
                      </p>
                    </td>

                    <td className="p-4">
                      <p className="font-bold">
                        {
                          booking.customer_name
                        }
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {
                          booking.customer_phone ??
                          "-"
                        }
                      </p>
                    </td>

                    <td className="p-4">
                      {formatDate(
                        booking.check_in
                      )}
                      {" → "}
                      {formatDate(
                        booking.check_out
                      )}

                      <p className="mt-1 text-xs text-slate-500">
                        {
                          booking.nights
                        }{" "}
                        gece
                      </p>
                    </td>

                    <td className="p-4">
                      {
                        booking.adults
                      }{" "}
                      yetişkin

                      {booking.children >
                      0
                        ? ` · ${booking.children} çocuk`
                        : ""}
                    </td>

                    <td className="p-4 font-black text-orange-400">
                      {money(
                        Number(
                          booking.sale_price
                        )
                      )}
                    </td>

                    <td className="p-4">
                      {money(
                        Number(
                          booking.total_cost
                        )
                      )}
                    </td>

                    <td className="p-4 font-black text-emerald-400">
                      {money(
                        Number(
                          booking.net_profit
                        )
                      )}
                    </td>

                    <td className="p-4">
                      <p className="font-bold">
                        {money(
                          Number(
                            booking.paid_amount
                          )
                        )}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Kalan:{" "}
                        {money(
                          Number(
                            booking.balance_amount
                          )
                        )}
                      </p>
                    </td>

                    <td className="p-4">
                      {booking.quote_snapshot_created_at ? (
                        <div>
                          <span className="inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-300">
                            🔒 Fiyat Kilitli
                          </span>

                          <p className="mt-2 max-w-[180px] text-xs leading-5 text-slate-500">
                            Teklif fiyatı, misafirler ve hizmetler rezervasyon anında snapshot olarak korundu.
                          </p>
                        </div>
                      ) : (
                        <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-black text-amber-300">
                          Eski Kayıt
                        </span>
                      )}
                    </td>

                    <td className="p-4">
                      <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black">
                        {bookingLabel(
                          booking.status
                        )}
                      </span>

                      <p className="mt-2 text-xs text-slate-500">
                        {paymentLabel(
                          booking.payment_status
                        )}
                      </p>

                      <a
                        href={`/seyahat/${booking.public_token}`}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-block rounded-lg border border-orange-500/30 px-3 py-2 text-xs font-black text-orange-400"
                      >
                        Müşteri Seyahat Sayfası
                      </a>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>

          {filteredBookings.length ===
            0 && (
            <div className="p-10 text-center text-slate-400">
              Paket rezervasyonu
              bulunamadı.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
