"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import {
  useParams,
} from "next/navigation";

import {
  supabase,
} from "@/lib/supabase";

import {
  CurrentMembership,
  getCurrentMembership,
} from "@/lib/current-user";

import BookingActionCenter from "./components/BookingActionCenter";


type Booking = {
  id: string;
  booking_code: string;
  quote_id: string | null;
  public_token: string;

  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  primary_guest_address: string | null;

  package_type: string;
  destination: string | null;

  check_in: string;
  check_out: string;

  adults: number;
  children: number;
  nights: number;

  currency: string;

  total_cost: number;
  sale_price: number;

  gross_profit: number;
  payment_fee: number;
  salesperson_commission: number;
  other_expenses: number;
  net_profit: number;
  margin_percent: number;

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

  notes: string | null;

  quote_snapshot: Record<
    string,
    unknown
  >;

  quote_snapshot_created_at:
    string | null;

  booked_at: string;
};


type Guest = {
  id: string;
  guest_order: number;
  guest_type:
    | "adult"
    | "child";

  full_name: string;

  phone: string | null;
  email: string | null;
  address: string | null;

  is_primary: boolean;

  snapshot_locked_at: string;
};


type BookingItem = {
  id: string;

  item_type: string;

  name: string;

  service_date: string | null;
  service_time: string | null;

  quantity: number;

  unit_cost: number;
  total_cost: number;

  unit_sale_price: number;
  total_sale_price: number;

  supplier_status: string;
  customer_status: string;

  supplier_id: string | null;

  supplier_requested_at:
    string |
    null;

  supplier_confirmed_at:
    string |
    null;

  supplier_completed_at:
    string |
    null;

  supplier_confirmation_code:
    string |
    null;

  supplier_note:
    string |
    null;

  supplier_due_date:
    string |
    null;

  voucher_created_at:
    string |
    null;

  cost_snapshot:
    Record<
      string,
      unknown
    >;
};


type Payment = {
  id: string;

  amount: number;

  payment_method: string | null;

  provider: string | null;

  status: string;

  paid_at: string;
};


type Payable = {
  id: string;

  booking_item_id:
    string | null;

  supplier_id:
    string | null;

  amount: number;

  paid_amount: number;

  due_date:
    string | null;

  status: string;
};


type Voucher = {
  id: string;

  booking_item_id:
    string | null;

  voucher_code: string;

  status: string;

  created_at: string;
};


function money(
  value: number
) {
  return new Intl.NumberFormat(
    "tr-TR",
    {
      style: "currency",
      currency: "TRY",
      maximumFractionDigits: 2,
    }
  ).format(
    Number(
      value || 0
    )
  );
}


function dateText(
  value:
    | string
    | null
) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat(
    "tr-TR"
  ).format(
    new Date(
      `${value.slice(0, 10)}T12:00:00`
    )
  );
}


function dateTimeText(
  value:
    | string
    | null
) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat(
    "tr-TR",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  ).format(
    new Date(value)
  );
}


function itemTypeLabel(
  value: string
) {
  const labels:
    Record<
      string,
      string
    > = {
      hotel:
        "Konaklama",

      activity:
        "Aktivite",

      transfer:
        "Transfer",

      spa:
        "SPA",

      meal:
        "Yemek",

      guide:
        "Rehber",

      insurance:
        "Sigorta",

      gift:
        "Hediye",

      other:
        "Diğer",
    };

  return (
    labels[value] ||
    value
  );
}


function supplierLabel(
  value: string
) {
  if (
    value ===
    "confirmed"
  ) {
    return "Onaylı";
  }

  if (
    value ===
    "requested"
  ) {
    return "Onay Bekleniyor";
  }

  if (
    value ===
    "completed"
  ) {
    return "Tamamlandı";
  }

  if (
    value ===
    "cancelled"
  ) {
    return "İptal";
  }

  return "Bekliyor";
}


function bookingLabel(
  value: Booking["status"]
) {
  if (
    value ===
    "confirmed"
  ) {
    return "Onaylı";
  }

  if (
    value ===
    "in_service"
  ) {
    return "Tatilde";
  }

  if (
    value ===
    "completed"
  ) {
    return "Tamamlandı";
  }

  if (
    value ===
    "cancelled"
  ) {
    return "İptal";
  }

  return "Ödeme Bekliyor";
}


function paymentLabel(
  value:
    Booking["payment_status"]
) {
  if (
    value ===
    "paid"
  ) {
    return "Ödendi";
  }

  if (
    value ===
    "partial"
  ) {
    return "Kısmi Ödeme";
  }

  if (
    value ===
    "refunded"
  ) {
    return "İade";
  }

  return "Ödenmedi";
}


export default function
PackageBookingDetailPage() {
  const params =
    useParams<{
      id: string;
    }>();

  const bookingId =
    String(
      params?.id ??
      ""
    );

  const [
    membership,
    setMembership,
  ] =
    useState<
      CurrentMembership |
      null
    >(
      null
    );

  const [
    booking,
    setBooking,
  ] =
    useState<
      Booking |
      null
    >(
      null
    );

  const [
    guests,
    setGuests,
  ] =
    useState<
      Guest[]
    >(
      []
    );

  const [
    items,
    setItems,
  ] =
    useState<
      BookingItem[]
    >(
      []
    );

  const [
    payments,
    setPayments,
  ] =
    useState<
      Payment[]
    >(
      []
    );

  const [
    payables,
    setPayables,
  ] =
    useState<
      Payable[]
    >(
      []
    );

  const [
    vouchers,
    setVouchers,
  ] =
    useState<
      Voucher[]
    >(
      []
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState("");


  const loadAll =
    useCallback(
      async (
        companyId:
          string
      ) => {
        const [
          bookingResult,
          guestResult,
          itemResult,
          paymentResult,
          payableResult,
          voucherResult,
        ] =
          await Promise.all([
            supabase
              .from(
                "package_bookings"
              )
              .select(`
                id,
                booking_code,
                quote_id,
                public_token,
                customer_name,
                customer_phone,
                customer_email,
                primary_guest_address,
                package_type,
                destination,
                check_in,
                check_out,
                adults,
                children,
                nights,
                currency,
                total_cost,
                sale_price,
                gross_profit,
                payment_fee,
                salesperson_commission,
                other_expenses,
                net_profit,
                margin_percent,
                paid_amount,
                balance_amount,
                payment_status,
                status,
                notes,
                quote_snapshot,
                quote_snapshot_created_at,
                booked_at
              `)
              .eq(
                "id",
                bookingId
              )
              .eq(
                "company_id",
                companyId
              )
              .maybeSingle(),

            supabase
              .from(
                "package_booking_guests"
              )
              .select(`
                id,
                guest_order,
                guest_type,
                full_name,
                phone,
                email,
                address,
                is_primary,
                snapshot_locked_at
              `)
              .eq(
                "booking_id",
                bookingId
              )
              .eq(
                "company_id",
                companyId
              )
              .order(
                "guest_order",
                {
                  ascending:
                    true,
                }
              ),

            supabase
              .from(
                "package_booking_items"
              )
              .select(`
                id,
                item_type,
                name,
                service_date,
                service_time,
                quantity,
                unit_cost,
                total_cost,
                unit_sale_price,
                total_sale_price,
                supplier_status,
                customer_status,
                supplier_id,
                supplier_requested_at,
                supplier_confirmed_at,
                supplier_completed_at,
                supplier_confirmation_code,
                supplier_note,
                supplier_due_date,
                voucher_created_at,
                cost_snapshot
              `)
              .eq(
                "booking_id",
                bookingId
              )
              .eq(
                "company_id",
                companyId
              )
              .order(
                "service_date",
                {
                  ascending:
                    true,
                }
              ),

            supabase
              .from(
                "package_customer_payments"
              )
              .select(`
                id,
                amount,
                payment_method,
                provider,
                status,
                paid_at
              `)
              .eq(
                "booking_id",
                bookingId
              )
              .eq(
                "company_id",
                companyId
              )
              .order(
                "paid_at",
                {
                  ascending:
                    false,
                }
              ),

            supabase
              .from(
                "package_supplier_payables"
              )
              .select(`
                id,
                booking_item_id,
                supplier_id,
                amount,
                paid_amount,
                due_date,
                status
              `)
              .eq(
                "booking_id",
                bookingId
              )
              .eq(
                "company_id",
                companyId
              )
              .order(
                "due_date",
                {
                  ascending:
                    true,
                }
              ),

            supabase
              .from(
                "package_vouchers"
              )
              .select(`
                id,
                booking_item_id,
                voucher_code,
                status,
                created_at
              `)
              .eq(
                "booking_id",
                bookingId
              )
              .eq(
                "company_id",
                companyId
              )
              .order(
                "created_at",
                {
                  ascending:
                    true,
                }
              ),
          ]);

        const results = [
          bookingResult,
          guestResult,
          itemResult,
          paymentResult,
          payableResult,
          voucherResult,
        ];

        const failed =
          results.find(
            result =>
              result.error
          );

        if (
          failed?.error
        ) {
          throw new Error(
            failed.error.message
          );
        }

        if (
          !bookingResult.data
        ) {
          throw new Error(
            "Rezervasyon bulunamadı."
          );
        }

        setBooking(
          bookingResult.data as Booking
        );

        setGuests(
          (
            guestResult.data ??
            []
          ) as Guest[]
        );

        setItems(
          (
            itemResult.data ??
            []
          ) as BookingItem[]
        );

        setPayments(
          (
            paymentResult.data ??
            []
          ) as Payment[]
        );

        setPayables(
          (
            payableResult.data ??
            []
          ) as Payable[]
        );

        setVouchers(
          (
            voucherResult.data ??
            []
          ) as Voucher[]
        );
      },
      [
        bookingId,
      ]
    );


  useEffect(
    () => {
      async function
      initialize() {
        try {
          const {
            data: {
              user,
            },
          } =
            await supabase
              .auth
              .getUser();

          if (!user) {
            throw new Error(
              "Kullanıcı oturumu bulunamadı."
            );
          }

          const current =
            await getCurrentMembership(
              user.id
            );

          if (!current) {
            throw new Error(
              "Aktif şirket üyeliği bulunamadı."
            );
          }

          setMembership(
            current
          );

          await loadAll(
            current.company_id
          );
        } catch (
          error
        ) {
          console.error(
            error
          );

          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Rezervasyon yüklenemedi."
          );
        } finally {
          setLoading(
            false
          );
        }
      }

      void initialize();
    },
    [
      loadAll,
    ]
  );


  const financial =
    useMemo(
      () => {
        const supplierTotal =
          payables.reduce(
            (
              total,
              row
            ) =>
              total +
              Number(
                row.amount ||
                0
              ),
            0
          );

        const supplierPaid =
          payables.reduce(
            (
              total,
              row
            ) =>
              total +
              Number(
                row.paid_amount ||
                0
              ),
            0
          );

        return {
          supplierTotal,
          supplierPaid,

          supplierBalance:
            supplierTotal -
            supplierPaid,
        };
      },
      [
        payables,
      ]
    );


  if (
    loading
  ) {
    return (
      <main className="min-h-screen bg-slate-950 p-10 text-white">
        Rezervasyon yükleniyor...
      </main>
    );
  }


  if (
    errorMessage ||
    !booking
  ) {
    return (
      <main className="min-h-screen bg-slate-950 p-10 text-white">
        <div className="mx-auto max-w-3xl rounded-[28px] border border-red-500/20 bg-slate-900 p-8">
          <h1 className="text-2xl font-black">
            Rezervasyon açılamadı
          </h1>

          <p className="mt-4 text-red-300">
            {
              errorMessage ||
              "Kayıt bulunamadı."
            }
          </p>

          <Link
            href="/dashboard/package-os/bookings"
            className="mt-6 inline-flex rounded-xl bg-orange-500 px-5 py-3 font-black text-black"
          >
            Rezervasyonlara Dön
          </Link>
        </div>
      </main>
    );
  }


  return (
    <main className="min-h-screen bg-slate-950 p-5 text-white md:p-10">

      <div className="mx-auto max-w-[1500px]">

        <div className="flex flex-wrap items-start justify-between gap-5">

          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-400">
              TUROBUS PACKAGE OS
            </p>

            <h1 className="mt-3 text-4xl font-black">
              {
                booking.booking_code
              }
            </h1>

            <p className="mt-3 text-slate-400">
              {
                booking.customer_name
              }
              {" · "}
              {
                booking.destination ||
                "Destinasyon belirtilmedi"
              }
            </p>

            <div className="mt-4 flex flex-wrap gap-2">

              <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-black text-cyan-300">
                {
                  bookingLabel(
                    booking.status
                  )
                }
              </span>

              <span className="rounded-full bg-violet-500/10 px-3 py-1 text-xs font-black text-violet-300">
                {
                  paymentLabel(
                    booking.payment_status
                  )
                }
              </span>

              {
                booking
                  .quote_snapshot_created_at &&
                (
                  <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-300">
                    🔒 Teklif Snapshot Kilitli
                  </span>
                )
              }

            </div>
          </div>


          <div className="flex flex-wrap gap-2">

            <Link
              href="/dashboard/package-os/bookings"
              className="rounded-xl border border-white/10 px-4 py-3 text-sm font-black"
            >
              ← Rezervasyonlar
            </Link>

            <Link
              href="/dashboard/package-os/payments"
              className="rounded-xl border border-white/10 px-4 py-3 text-sm font-black"
            >
              Ödeme Merkezi
            </Link>

            <Link
              href="/dashboard/package-os/operations"
              className="rounded-xl border border-white/10 px-4 py-3 text-sm font-black"
            >
              Operasyon
            </Link>

            <a
              href={`/seyahat/${booking.public_token}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl bg-orange-500 px-4 py-3 text-sm font-black text-black"
            >
              Misafir Seyahat Sayfası
            </a>

          </div>

        </div>


        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">

          <StatCard
            label="Paket Satış"
            value={
              money(
                booking.sale_price
              )
            }
          />

          <StatCard
            label="Toplam Maliyet"
            value={
              money(
                booking.total_cost
              )
            }
          />

          <StatCard
            label="Net Kâr"
            value={
              money(
                booking.net_profit
              )
            }
            accent
          />

          <StatCard
            label="Tahsil Edildi"
            value={
              money(
                booking.paid_amount
              )
            }
          />

          <StatCard
            label="Misafirden Kalan"
            value={
              money(
                booking.balance_amount
              )
            }
          />

          <StatCard
            label="Tedarikçi Kalan"
            value={
              money(
                financial
                  .supplierBalance
              )
            }
          />

        </div>


        {
          membership &&
          (
            <div className="mt-8">
              <BookingActionCenter
                bookingId={
                  booking.id
                }
                bookingStatus={
                  booking.status
                }
                balanceAmount={
                  Number(
                    booking.balance_amount ||
                    0
                  )
                }
                items={
                  items.map(
                    item => ({
                      id:
                        item.id,

                      name:
                        item.name,

                      supplier_id:
                        item.supplier_id,

                      supplier_status:
                        item.supplier_status,

                      supplier_requested_at:
                        item.supplier_requested_at,

                      supplier_confirmed_at:
                        item.supplier_confirmed_at,

                      supplier_completed_at:
                        item.supplier_completed_at,

                      supplier_confirmation_code:
                        item.supplier_confirmation_code,

                      supplier_note:
                        item.supplier_note,

                      supplier_due_date:
                        item.supplier_due_date,

                      voucher_created_at:
                        item.voucher_created_at,
                    })
                  )
                }
                onChanged={
                  async () => {
                    await loadAll(
                      membership.company_id
                    );
                  }
                }
              />
            </div>
          )
        }

        <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_430px]">

          <div className="space-y-6">

            <Panel
              title="Seyahat & Rezervasyon"
            >
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

                <Info
                  label="Giriş"
                  value={
                    dateText(
                      booking.check_in
                    )
                  }
                />

                <Info
                  label="Çıkış"
                  value={
                    dateText(
                      booking.check_out
                    )
                  }
                />

                <Info
                  label="Konaklama"
                  value={`${booking.nights} gece`}
                />

                <Info
                  label="Misafir"
                  value={`${booking.adults} yetişkin${booking.children > 0 ? ` · ${booking.children} çocuk` : ""}`}
                />

              </div>
            </Panel>


            <Panel
              title={`Misafirler · ${guests.length}`}
            >

              <div className="space-y-3">

                {
                  guests.map(
                    guest => (
                      <div
                        key={
                          guest.id
                        }
                        className="rounded-2xl border border-white/10 bg-slate-950 p-5"
                      >

                        <div className="flex flex-wrap items-start justify-between gap-4">

                          <div>

                            <div className="flex flex-wrap items-center gap-2">

                              <p className="font-black">
                                {
                                  guest.full_name
                                }
                              </p>

                              {
                                guest.is_primary &&
                                (
                                  <span className="rounded-full bg-orange-500/10 px-2 py-1 text-[10px] font-black text-orange-300">
                                    ANA MİSAFİR
                                  </span>
                                )
                              }

                              <span className="rounded-full bg-slate-800 px-2 py-1 text-[10px] font-black text-slate-400">
                                {
                                  guest.guest_type ===
                                  "child"
                                    ? "ÇOCUK"
                                    : "YETİŞKİN"
                                }
                              </span>

                            </div>

                            <p className="mt-2 text-sm text-slate-400">
                              {
                                guest.phone ||
                                "Telefon yok"
                              }
                              {" · "}
                              {
                                guest.email ||
                                "E-posta yok"
                              }
                            </p>

                            {
                              guest.address &&
                              (
                                <p className="mt-2 text-sm text-slate-500">
                                  {
                                    guest.address
                                  }
                                </p>
                              )
                            }

                          </div>

                          <span className="text-xs text-emerald-400">
                            🔒 Snapshot
                          </span>

                        </div>

                      </div>
                    )
                  )
                }

                {
                  guests.length ===
                  0 &&
                  (
                    <div className="rounded-2xl border border-white/10 bg-slate-950 p-6 text-slate-500">
                      Misafir snapshot kaydı bulunamadı.
                    </div>
                  )
                }

              </div>

            </Panel>


            <Panel
              title={`Paket Hizmetleri · ${items.length}`}
            >

              <div className="space-y-3">

                {
                  items.map(
                    item => (
                      <div
                        key={
                          item.id
                        }
                        className="rounded-2xl border border-white/10 bg-slate-950 p-5"
                      >

                        <div className="flex flex-wrap items-start justify-between gap-5">

                          <div className="min-w-0">

                            <p className="text-xs font-black uppercase tracking-wider text-orange-400">
                              {
                                itemTypeLabel(
                                  item.item_type
                                )
                              }
                            </p>

                            <h3 className="mt-2 text-lg font-black">
                              {
                                item.name
                              }
                            </h3>

                            <p className="mt-2 text-sm text-slate-500">
                              Tarih:{" "}
                              {
                                dateText(
                                  item.service_date
                                )
                              }
                              {" · "}
                              Adet:{" "}
                              {
                                Number(
                                  item.quantity
                                )
                              }
                            </p>

                            <div className="mt-3 flex flex-wrap gap-2">

                              <span className="rounded-full bg-violet-500/10 px-3 py-1 text-xs font-black text-violet-300">
                                Tedarikçi:{" "}
                                {
                                  supplierLabel(
                                    item.supplier_status
                                  )
                                }
                              </span>

                              {
                                item
                                  .supplier_id
                                  ? (
                                    <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-black text-slate-400">
                                      Tedarikçili Hizmet
                                    </span>
                                  )
                                  : (
                                    <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-300">
                                      İç Hizmet
                                    </span>
                                  )
                              }

                            </div>

                          </div>


                          <div className="grid min-w-[210px] gap-2 text-right">

                            <div>
                              <p className="text-xs text-slate-500">
                                Maliyet
                              </p>

                              <p className="font-black">
                                {
                                  money(
                                    item.total_cost
                                  )
                                }
                              </p>
                            </div>

                            <div>
                              <p className="text-xs text-slate-500">
                                Satış
                              </p>

                              <p className="font-black text-orange-400">
                                {
                                  money(
                                    item.total_sale_price
                                  )
                                }
                              </p>
                            </div>

                          </div>

                        </div>

                      </div>
                    )
                  )
                }

              </div>

            </Panel>


            <Panel
              title={`Tahsilatlar · ${payments.length}`}
            >

              <div className="overflow-x-auto">

                <table className="w-full min-w-[700px] text-sm">

                  <thead className="text-left text-xs uppercase tracking-wider text-slate-500">

                    <tr>
                      <th className="pb-4">
                        Tarih
                      </th>

                      <th className="pb-4">
                        Tutar
                      </th>

                      <th className="pb-4">
                        Yöntem
                      </th>

                      <th className="pb-4">
                        Sağlayıcı
                      </th>

                      <th className="pb-4">
                        Durum
                      </th>
                    </tr>

                  </thead>

                  <tbody>

                    {
                      payments.map(
                        payment => (
                          <tr
                            key={
                              payment.id
                            }
                            className="border-t border-white/5"
                          >

                            <td className="py-4">
                              {
                                dateTimeText(
                                  payment.paid_at
                                )
                              }
                            </td>

                            <td className="py-4 font-black text-emerald-400">
                              {
                                money(
                                  payment.amount
                                )
                              }
                            </td>

                            <td className="py-4">
                              {
                                payment.payment_method ||
                                "-"
                              }
                            </td>

                            <td className="py-4">
                              {
                                payment.provider ||
                                "-"
                              }
                            </td>

                            <td className="py-4">
                              {
                                payment.status
                              }
                            </td>

                          </tr>
                        )
                      )
                    }

                  </tbody>

                </table>

                {
                  payments.length ===
                  0 &&
                  (
                    <div className="py-8 text-center text-slate-500">
                      Henüz tahsilat kaydı yok.
                    </div>
                  )
                }

              </div>

            </Panel>

          </div>


          <aside className="space-y-6">

            <Panel
              title="Finans Özeti"
            >

              <div className="space-y-3">

                <MoneyRow
                  label="Satış"
                  value={
                    booking.sale_price
                  }
                />

                <MoneyRow
                  label="Toplam Maliyet"
                  value={
                    booking.total_cost
                  }
                />

                <MoneyRow
                  label="Brüt Kâr"
                  value={
                    booking.gross_profit
                  }
                />

                <MoneyRow
                  label="Ödeme Komisyonu"
                  value={
                    booking.payment_fee
                  }
                />

                <MoneyRow
                  label="Satış Komisyonu"
                  value={
                    booking.salesperson_commission
                  }
                />

                <MoneyRow
                  label="Diğer Gider"
                  value={
                    booking.other_expenses
                  }
                />

                <div className="border-t border-white/10 pt-3">

                  <MoneyRow
                    label="Net Kâr"
                    value={
                      booking.net_profit
                    }
                    strong
                  />

                </div>

              </div>

            </Panel>


            <Panel
              title={`Tedarikçi Borçları · ${payables.length}`}
            >

              <div className="space-y-3">

                {
                  payables.map(
                    payable => (
                      <div
                        key={
                          payable.id
                        }
                        className="rounded-xl border border-white/10 bg-slate-950 p-4"
                      >

                        <div className="flex items-center justify-between gap-3">

                          <span className="text-xs font-black uppercase text-slate-500">
                            {
                              payable.status
                            }
                          </span>

                          <span className="font-black">
                            {
                              money(
                                payable.amount
                              )
                            }
                          </span>

                        </div>

                        <div className="mt-3 flex justify-between text-xs text-slate-500">

                          <span>
                            Ödenen:{" "}
                            {
                              money(
                                payable.paid_amount
                              )
                            }
                          </span>

                          <span>
                            Vade:{" "}
                            {
                              dateText(
                                payable.due_date
                              )
                            }
                          </span>

                        </div>

                      </div>
                    )
                  )
                }

                {
                  payables.length ===
                  0 &&
                  (
                    <p className="text-sm text-slate-500">
                      Tedarikçi borcu bulunmuyor.
                    </p>
                  )
                }

              </div>

            </Panel>


            <Panel
              title={`Voucherlar · ${vouchers.length}`}
            >

              <div className="space-y-3">

                {
                  vouchers.map(
                    voucher => (
                      <div
                        key={
                          voucher.id
                        }
                        className="rounded-xl border border-white/10 bg-slate-950 p-4"
                      >

                        <p className="font-black">
                          {
                            voucher.voucher_code
                          }
                        </p>

                        <p className="mt-2 text-xs text-slate-500">
                          Durum:{" "}
                          {
                            voucher.status
                          }
                        </p>

                      </div>
                    )
                  )
                }

              </div>

            </Panel>


            <Panel
              title="Snapshot Güvenliği"
            >

              {
                booking
                  .quote_snapshot_created_at
                  ? (
                    <>
                      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">

                        <p className="font-black text-emerald-300">
                          🔒 Ticari kayıt kilitli
                        </p>

                        <p className="mt-2 text-xs leading-5 text-emerald-200/70">
                          Teklif, hizmet fiyatları ve misafir listesi rezervasyon oluştuğu anda snapshot olarak saklanmıştır.
                        </p>

                      </div>

                      <p className="mt-3 text-xs text-slate-500">
                        Kilit zamanı:{" "}
                        {
                          dateTimeText(
                            booking.quote_snapshot_created_at
                          )
                        }
                      </p>
                    </>
                  )
                  : (
                    <p className="text-sm text-amber-300">
                      Bu kayıt eski snapshot sistemi öncesinde oluşturulmuş olabilir.
                    </p>
                  )
              }

            </Panel>

          </aside>

        </div>

      </div>

    </main>
  );
}


function Panel({
  title,
  children,
}: {
  title: string;
  children:
    React.ReactNode;
}) {
  return (
    <section className="rounded-[26px] border border-white/10 bg-slate-900 p-6">

      <h2 className="text-lg font-black">
        {title}
      </h2>

      <div className="mt-5">
        {children}
      </div>

    </section>
  );
}


function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-wider text-slate-500">
        {label}
      </p>

      <p className="mt-2 font-black">
        {value}
      </p>
    </div>
  );
}


function StatCard({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">

      <p className="text-xs font-black uppercase tracking-wider text-slate-500">
        {label}
      </p>

      <p
        className={`mt-2 text-xl font-black ${
          accent
            ? "text-emerald-400"
            : ""
        }`}
      >
        {value}
      </p>

    </div>
  );
}


function MoneyRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: number;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">

      <span
        className={
          strong
            ? "font-black text-white"
            : "text-sm text-slate-400"
        }
      >
        {label}
      </span>

      <span
        className={
          strong
            ? "text-lg font-black text-emerald-400"
            : "font-black"
        }
      >
        {
          money(
            Number(
              value || 0
            )
          )
        }
      </span>

    </div>
  );
}
