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

  customer_name: string;
  customer_phone: string | null;

  destination: string | null;

  sale_price: number;
  paid_amount: number;
  balance_amount: number;

  currency: string;

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

  check_in: string;
  check_out: string;
};

type Payment = {
  id: string;
  booking_id: string;

  amount: number;
  currency: string;

  payment_method: string | null;

  provider: string | null;
  provider_reference: string | null;

  status: string;

  paid_at: string;

  package_bookings:
    | {
        booking_code: string;
        customer_name: string;
      }
    | {
        booking_code: string;
        customer_name: string;
      }[]
    | null;
};

type PaymentMethod =
  | "cash"
  | "bank_transfer"
  | "pos"
  | "other";

function money(
  value: number,
  currency = "TRY"
) {
  return new Intl.NumberFormat(
    "tr-TR",
    {
      style: "currency",
      currency:
        currency || "TRY",
      maximumFractionDigits: 2,
    }
  ).format(Number(value || 0));
}

function formatDateTime(
  value: string
) {
  return new Intl.DateTimeFormat(
    "tr-TR",
    {
      dateStyle: "short",
      timeStyle: "short",
    }
  ).format(new Date(value));
}

function paymentMethodLabel(
  value: string | null
) {
  if (value === "cash") {
    return "Nakit";
  }

  if (
    value === "bank_transfer"
  ) {
    return "Havale / EFT";
  }

  if (value === "pos") {
    return "POS";
  }

  return value || "Diğer";
}

function paymentStatusLabel(
  value: Booking["payment_status"]
) {
  if (value === "paid") {
    return "Tamamı Ödendi";
  }

  if (value === "partial") {
    return "Kısmi Ödeme";
  }

  if (value === "refunded") {
    return "İade";
  }

  return "Ödenmedi";
}

export default function PackagePaymentsPage() {
  const [
    membership,
    setMembership,
  ] =
    useState<CurrentMembership | null>(
      null
    );

  const [bookings, setBookings] =
    useState<Booking[]>([]);

  const [payments, setPayments] =
    useState<Payment[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [
    selectedBookingId,
    setSelectedBookingId,
  ] = useState("");

  const [amount, setAmount] =
    useState("");

  const [
    paymentMethod,
    setPaymentMethod,
  ] =
    useState<PaymentMethod>(
      "bank_transfer"
    );

  const [
    providerReference,
    setProviderReference,
  ] = useState("");

  const [saving, setSaving] =
    useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const loadData = useCallback(
    async (companyId: string) => {
      const [
        bookingResult,
        paymentResult,
      ] = await Promise.all([
        supabase
          .from(
            "package_bookings"
          )
          .select(`
            id,
            booking_code,
            customer_name,
            customer_phone,
            destination,
            sale_price,
            paid_amount,
            balance_amount,
            currency,
            payment_status,
            status,
            check_in,
            check_out
          `)
          .eq(
            "company_id",
            companyId
          )
          .neq(
            "status",
            "cancelled"
          )
          .order(
            "created_at",
            {
              ascending: false,
            }
          ),

        supabase
          .from(
            "package_customer_payments"
          )
          .select(`
            id,
            booking_id,
            amount,
            currency,
            payment_method,
            provider,
            provider_reference,
            status,
            paid_at,
            package_bookings (
              booking_code,
              customer_name
            )
          `)
          .eq(
            "company_id",
            companyId
          )
          .order(
            "paid_at",
            {
              ascending: false,
            }
          )
          .limit(100),
      ]);

      if (
        bookingResult.error
      ) {
        throw new Error(
          bookingResult.error.message
        );
      }

      if (
        paymentResult.error
      ) {
        throw new Error(
          paymentResult.error.message
        );
      }

      setBookings(
        (bookingResult.data ??
          []) as Booking[]
      );

      setPayments(
        (paymentResult.data ??
          []) as Payment[]
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

        if (
          !currentMembership
        ) {
          setErrorMessage(
            "Aktif şirket üyeliği bulunamadı."
          );
          return;
        }

        setMembership(
          currentMembership
        );

        await loadData(
          currentMembership.company_id
        );
      } catch (error) {
        console.error(error);

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Ödeme verileri yüklenemedi."
        );
      } finally {
        setLoading(false);
      }
    }

    void initialize();
  }, [loadData]);

  const openBookings =
    useMemo(
      () =>
        bookings.filter(
          (booking) =>
            Number(
              booking.balance_amount
            ) > 0
        ),
      [bookings]
    );

  const selectedBooking =
    useMemo(
      () =>
        bookings.find(
          (booking) =>
            booking.id ===
            selectedBookingId
        ) ?? null,
      [
        bookings,
        selectedBookingId,
      ]
    );

  const stats = useMemo(() => {
    const totalSales =
      bookings.reduce(
        (sum, booking) =>
          sum +
          Number(
            booking.sale_price
          ),
        0
      );

    const collected =
      bookings.reduce(
        (sum, booking) =>
          sum +
          Number(
            booking.paid_amount
          ),
        0
      );

    const balance =
      bookings.reduce(
        (sum, booking) =>
          sum +
          Number(
            booking.balance_amount
          ),
        0
      );

    const paidCount =
      bookings.filter(
        (booking) =>
          booking.payment_status ===
          "paid"
      ).length;

    return {
      totalSales,
      collected,
      balance,
      paidCount,
    };
  }, [bookings]);

  async function savePayment() {
    if (
      !membership ||
      !selectedBooking
    ) {
      setErrorMessage(
        "Rezervasyon seçin."
      );
      return;
    }

    const numericAmount =
      Number(
        amount.replace(",", ".")
      );

    if (
      !Number.isFinite(
        numericAmount
      ) ||
      numericAmount <= 0
    ) {
      setErrorMessage(
        "Geçerli bir tahsilat tutarı girin."
      );
      return;
    }

    if (
      numericAmount >
      Number(
        selectedBooking.balance_amount
      )
    ) {
      setErrorMessage(
        "Tahsilat kalan bakiyeden yüksek olamaz."
      );
      return;
    }

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const {
        data,
        error,
      } = await supabase.rpc(
        "add_package_customer_payment",
        {
          p_booking_id:
            selectedBooking.id,

          p_amount:
            numericAmount,

          p_payment_method:
            paymentMethod,

          p_provider:
            paymentMethod ===
              "pos"
              ? "manual_pos"
              : paymentMethod ===
                  "bank_transfer"
                ? "bank"
                : null,

          p_provider_reference:
            providerReference.trim() ||
            null,

          p_metadata: {
            source:
              "package_payment_center",
          },
        }
      );

      if (error) {
        throw new Error(
          error.message
        );
      }

      const result = data as {
        booking_code?: string;
        paid_amount?: number;
        balance_amount?: number;
        payment_status?: string;
      };

      setSuccessMessage(
        `${result.booking_code ?? selectedBooking.booking_code} tahsilatı kaydedildi. Kalan: ${money(
          Number(
            result.balance_amount ??
              0
          ),
          selectedBooking.currency
        )}`
      );

      setAmount("");
      setProviderReference("");

      await loadData(
        membership.company_id
      );
    } catch (error) {
      console.error(error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Tahsilat kaydedilemedi."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-10 text-white">
        Ödemeler yükleniyor...
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
              Ödeme & Tahsilat
            </h1>

            <p className="mt-3 text-slate-400">
              Paket rezervasyonlarının
              tahsilatlarını, kalan
              bakiyelerini ve ödeme
              durumlarını yönetin.
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/dashboard/package-os/bookings"
              className="rounded-xl border border-white/10 px-5 py-3 text-sm font-black"
            >
              Rezervasyonlar
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

        {successMessage && (
          <div className="mt-6 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-300">
            {successMessage}
          </div>
        )}

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          {[
            [
              "Toplam Satış",
              money(
                stats.totalSales
              ),
            ],
            [
              "Tahsil Edilen",
              money(
                stats.collected
              ),
            ],
            [
              "Kalan Bakiye",
              money(
                stats.balance
              ),
            ],
            [
              "Tam Ödenen",
              String(
                stats.paidCount
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

        <div className="mt-7 grid gap-6 xl:grid-cols-[420px_1fr]">
          <section className="rounded-[28px] border border-white/10 bg-slate-900 p-6">
            <p className="text-xs font-black uppercase tracking-wider text-orange-400">
              Yeni Tahsilat
            </p>

            <h2 className="mt-2 text-2xl font-black">
              Ödeme Kaydet
            </h2>

            <label className="mt-6 block text-sm font-bold">
              Rezervasyon
            </label>

            <select
              value={
                selectedBookingId
              }
              onChange={(event) => {
                setSelectedBookingId(
                  event.target.value
                );

                const booking =
                  bookings.find(
                    (item) =>
                      item.id ===
                      event.target.value
                  );

                if (booking) {
                  setAmount(
                    String(
                      booking.balance_amount
                    )
                  );
                }
              }}
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 p-4"
            >
              <option value="">
                Rezervasyon seçin
              </option>

              {openBookings.map(
                (booking) => (
                  <option
                    key={booking.id}
                    value={booking.id}
                  >
                    {
                      booking.booking_code
                    }
                    {" · "}
                    {
                      booking.customer_name
                    }
                    {" · "}
                    {money(
                      Number(
                        booking.balance_amount
                      ),
                      booking.currency
                    )}
                  </option>
                )
              )}
            </select>

            {selectedBooking && (
              <div className="mt-4 rounded-2xl bg-slate-950 p-4">
                <p className="font-black">
                  {
                    selectedBooking.customer_name
                  }
                </p>

                <p className="mt-1 text-sm text-slate-400">
                  {
                    selectedBooking.destination ??
                    "-"
                  }
                </p>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-slate-500">
                      Paket
                    </p>

                    <p className="font-black">
                      {money(
                        Number(
                          selectedBooking.sale_price
                        ),
                        selectedBooking.currency
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-500">
                      Kalan
                    </p>

                    <p className="font-black text-orange-400">
                      {money(
                        Number(
                          selectedBooking.balance_amount
                        ),
                        selectedBooking.currency
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <label className="mt-5 block text-sm font-bold">
              Tahsilat Tutarı
            </label>

            <input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(event) =>
                setAmount(
                  event.target.value
                )
              }
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 p-4"
              placeholder="0.00"
            />

            <label className="mt-5 block text-sm font-bold">
              Ödeme Yöntemi
            </label>

            <select
              value={paymentMethod}
              onChange={(event) =>
                setPaymentMethod(
                  event.target
                    .value as PaymentMethod
                )
              }
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 p-4"
            >
              <option value="cash">
                Nakit
              </option>

              <option value="bank_transfer">
                Havale / EFT
              </option>

              <option value="pos">
                POS
              </option>

              <option value="other">
                Diğer
              </option>
            </select>

            <label className="mt-5 block text-sm font-bold">
              İşlem / Referans No
            </label>

            <input
              value={
                providerReference
              }
              onChange={(event) =>
                setProviderReference(
                  event.target.value
                )
              }
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 p-4"
              placeholder="Opsiyonel"
            />

            <button
              type="button"
              disabled={
                saving ||
                !selectedBookingId
              }
              onClick={() =>
                void savePayment()
              }
              className="mt-6 w-full rounded-xl bg-orange-500 px-5 py-4 font-black text-black disabled:opacity-50"
            >
              {saving
                ? "Kaydediliyor..."
                : "Tahsilatı Kaydet"}
            </button>
          </section>

          <section className="overflow-hidden rounded-[28px] border border-white/10 bg-slate-900">
            <div className="border-b border-white/10 p-6">
              <p className="text-xs font-black uppercase tracking-wider text-orange-400">
                Son İşlemler
              </p>

              <h2 className="mt-2 text-2xl font-black">
                Tahsilat Geçmişi
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] text-sm">
                <thead className="text-left text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="p-4">
                      Tarih
                    </th>

                    <th className="p-4">
                      Rezervasyon
                    </th>

                    <th className="p-4">
                      Müşteri
                    </th>

                    <th className="p-4">
                      Yöntem
                    </th>

                    <th className="p-4">
                      Referans
                    </th>

                    <th className="p-4">
                      Tutar
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {payments.map(
                    (payment) => {
                      const relation =
                        Array.isArray(
                          payment.package_bookings
                        )
                          ? payment.package_bookings[0]
                          : payment.package_bookings;

                      return (
                        <tr
                          key={
                            payment.id
                          }
                          className="border-t border-white/5"
                        >
                          <td className="p-4">
                            {formatDateTime(
                              payment.paid_at
                            )}
                          </td>

                          <td className="p-4 font-black">
                            {
                              relation?.booking_code ??
                              "-"
                            }
                          </td>

                          <td className="p-4">
                            {
                              relation?.customer_name ??
                              "-"
                            }
                          </td>

                          <td className="p-4">
                            {paymentMethodLabel(
                              payment.payment_method
                            )}
                          </td>

                          <td className="p-4 text-slate-400">
                            {
                              payment.provider_reference ??
                              "-"
                            }
                          </td>

                          <td className="p-4 font-black text-emerald-400">
                            {money(
                              Number(
                                payment.amount
                              ),
                              payment.currency
                            )}
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>

              {payments.length ===
                0 && (
                <div className="p-10 text-center text-slate-400">
                  Henüz tahsilat
                  kaydı bulunmuyor.
                </div>
              )}
            </div>
          </section>
        </div>

        <section className="mt-7 overflow-x-auto rounded-[28px] border border-white/10 bg-slate-900">
          <div className="p-6">
            <p className="text-xs font-black uppercase tracking-wider text-orange-400">
              Bakiye Takibi
            </p>

            <h2 className="mt-2 text-2xl font-black">
              Paket Satışları
            </h2>
          </div>

          <table className="w-full min-w-[900px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="p-4">
                  Rezervasyon
                </th>

                <th className="p-4">
                  Müşteri
                </th>

                <th className="p-4">
                  Paket
                </th>

                <th className="p-4">
                  Tahsil
                </th>

                <th className="p-4">
                  Kalan
                </th>

                <th className="p-4">
                  Ödeme Durumu
                </th>
              </tr>
            </thead>

            <tbody>
              {bookings.map(
                (booking) => (
                  <tr
                    key={booking.id}
                    className="border-t border-white/5"
                  >
                    <td className="p-4 font-black">
                      {
                        booking.booking_code
                      }
                    </td>

                    <td className="p-4">
                      {
                        booking.customer_name
                      }
                    </td>

                    <td className="p-4">
                      {money(
                        Number(
                          booking.sale_price
                        ),
                        booking.currency
                      )}
                    </td>

                    <td className="p-4 font-bold text-emerald-400">
                      {money(
                        Number(
                          booking.paid_amount
                        ),
                        booking.currency
                      )}
                    </td>

                    <td className="p-4 font-bold text-orange-400">
                      {money(
                        Number(
                          booking.balance_amount
                        ),
                        booking.currency
                      )}
                    </td>

                    <td className="p-4">
                      <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black">
                        {paymentStatusLabel(
                          booking.payment_status
                        )}
                      </span>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}
