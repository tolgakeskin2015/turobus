"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import {
  FaCalendarAlt,
  FaCheckCircle,
  FaClock,
  FaCoins,
  FaSearch,
  FaShoppingCart,
  FaTruckLoading,
} from "react-icons/fa";

import {
  supabase,
} from "@/lib/supabase";

import {
  CurrentMembership,
  getCurrentMembership,
} from "@/lib/current-user";


type PaymentStatus =
  | "pending"
  | "paid"
  | "cancelled"
  | "expired";


type OperationStatus =
  | "new"
  | "confirmed"
  | "in_service"
  | "completed"
  | "cancelled";


type BookingRelation = {
  booking_code: string;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
} | {
  booking_code: string;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
}[] | null;


type ExtraItem = {
  id: string;
  supplier_id: string | null;
  name: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  unit_sale_price: number;
  total_sale_price: number;
  currency: string;
  requires_slot: boolean;
};


type ExtraOrder = {
  id: string;
  company_id: string;
  booking_id: string;
  public_token: string;

  currency: string;

  total_cost: number;
  sale_price: number;
  gross_profit: number;

  status: PaymentStatus;

  operation_status:
    OperationStatus;

  service_date:
    string | null;

  service_time:
    string | null;

  operation_notes:
    string | null;

  payment_provider:
    string | null;

  payment_reference:
    string | null;

  created_at: string;
  updated_at: string;

  booking:
    BookingRelation;

  items:
    ExtraItem[] | null;
};


type Supplier = {
  id: string;
  name: string;
};


const paymentLabels:
Record<PaymentStatus, string> = {
  pending: "Ödeme Bekliyor",
  paid: "Ödendi",
  cancelled: "İptal",
  expired: "Süresi Doldu",
};


const operationLabels:
Record<OperationStatus, string> = {
  new: "Yeni",
  confirmed: "Onaylandı",
  in_service: "Operasyonda",
  completed: "Tamamlandı",
  cancelled: "İptal",
};


function firstRelation<T>(
  value:
    | T
    | T[]
    | null
    | undefined
) {
  if (!value) {
    return null;
  }

  return Array.isArray(value)
    ? value[0] ?? null
    : value;
}


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


function dateTime(
  value: string
) {
  return new Intl.DateTimeFormat(
    "tr-TR",
    {
      dateStyle: "short",
      timeStyle: "short",
    }
  ).format(
    new Date(value)
  );
}


function operationBadge(
  status: OperationStatus
) {
  if (status === "completed") {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
  }

  if (status === "confirmed") {
    return "border-blue-500/20 bg-blue-500/10 text-blue-300";
  }

  if (status === "in_service") {
    return "border-orange-500/20 bg-orange-500/10 text-orange-300";
  }

  if (status === "cancelled") {
    return "border-red-500/20 bg-red-500/10 text-red-300";
  }

  return "border-white/10 bg-white/5 text-slate-300";
}


function paymentBadge(
  status: PaymentStatus
) {
  if (status === "paid") {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
  }

  if (status === "cancelled") {
    return "border-red-500/20 bg-red-500/10 text-red-300";
  }

  if (status === "expired") {
    return "border-slate-500/20 bg-slate-500/10 text-slate-400";
  }

  return "border-amber-500/20 bg-amber-500/10 text-amber-300";
}


export default function PackageExtraOrdersPage() {
  const [
    membership,
    setMembership,
  ] =
    useState<CurrentMembership | null>(
      null
    );

  const [
    orders,
    setOrders,
  ] =
    useState<ExtraOrder[]>([]);

  const [
    suppliers,
    setSuppliers,
  ] =
    useState<Supplier[]>([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    savingId,
    setSavingId,
  ] =
    useState("");

  const [
    search,
    setSearch,
  ] =
    useState("");

  const [
    operationFilter,
    setOperationFilter,
  ] =
    useState<
      OperationStatus | "all"
    >("all");

  const [
    paymentFilter,
    setPaymentFilter,
  ] =
    useState<
      PaymentStatus | "all"
    >("all");

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


  const loadOrders =
    useCallback(
      async (
        companyId: string
      ) => {
        setLoading(true);

        setErrorMessage("");

        const [
          orderResult,
          supplierResult,
        ] =
          await Promise.all([
            supabase
              .from(
                "package_extra_orders"
              )
              .select(`
                id,
                company_id,
                booking_id,
                public_token,
                currency,
                total_cost,
                sale_price,
                gross_profit,
                status,
                operation_status,
                service_date,
                service_time,
                operation_notes,
                payment_provider,
                payment_reference,
                created_at,
                updated_at,

                booking:package_bookings (
                  booking_code,
                  customer_name,
                  customer_phone,
                  customer_email
                ),

                items:package_extra_order_items (
                  id,
                  supplier_id,
                  name,
                  quantity,
                  unit_cost,
                  total_cost,
                  unit_sale_price,
                  total_sale_price,
                  currency,
                  requires_slot
                )
              `)
              .eq(
                "company_id",
                companyId
              )
              .order(
                "created_at",
                {
                  ascending: false,
                }
              )
              .limit(300),

            supabase
              .from("suppliers")
              .select(
                "id, name"
              )
              .eq(
                "company_id",
                companyId
              ),
          ]);


        if (
          orderResult.error
        ) {
          setErrorMessage(
            orderResult.error.message
          );

          setOrders([]);

          setLoading(false);

          return;
        }


        if (
          supplierResult.error
        ) {
          console.warn(
            "Tedarikçiler alınamadı:",
            supplierResult.error
          );
        }


        setOrders(
          (
            orderResult.data ??
            []
          ) as unknown as ExtraOrder[]
        );

        setSuppliers(
          (
            supplierResult.data ??
            []
          ) as Supplier[]
        );

        setLoading(false);
      },
      []
    );


  useEffect(() => {
    async function boot() {
      try {
        const {
          data: authData,
          error: authError,
        } = await supabase.auth.getUser();

        if (
          authError ||
          !authData.user
        ) {
          throw new Error(
            "Oturum bulunamadı."
          );
        }

        const current =
          await getCurrentMembership(
            authData.user.id
          );

        if (!current) {
          throw new Error(
            "Aktif şirket üyeliği bulunamadı."
          );
        }

        setMembership(
          current
        );

        await loadOrders(
          current.company_id
        );

      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Ekstra sipariş merkezi hazırlanamadı."
        );

        setLoading(false);
      }
    }

    void boot();
  }, [
    loadOrders,
  ]);


  const supplierMap =
    useMemo(
      () =>
        new Map(
          suppliers.map(
            supplier => [
              supplier.id,
              supplier.name,
            ]
          )
        ),
      [
        suppliers,
      ]
    );


  const filteredOrders =
    useMemo(
      () => {
        const query =
          search
            .trim()
            .toLocaleLowerCase(
              "tr-TR"
            );

        return orders.filter(
          order => {
            if (
              operationFilter !==
                "all" &&
              order.operation_status !==
                operationFilter
            ) {
              return false;
            }

            if (
              paymentFilter !==
                "all" &&
              order.status !==
                paymentFilter
            ) {
              return false;
            }

            if (!query) {
              return true;
            }

            const booking =
              firstRelation(
                order.booking
              );

            const itemNames =
              (
                order.items ??
                []
              )
                .map(
                  item =>
                    item.name
                )
                .join(" ");

            return [
              booking?.booking_code,
              booking?.customer_name,
              booking?.customer_phone,
              booking?.customer_email,
              itemNames,
              order.payment_reference,
            ]
              .filter(Boolean)
              .join(" ")
              .toLocaleLowerCase(
                "tr-TR"
              )
              .includes(query);
          }
        );
      },
      [
        orders,
        operationFilter,
        paymentFilter,
        search,
      ]
    );


  const stats =
    useMemo(
      () => {
        const today =
          new Date()
            .toISOString()
            .slice(0, 10);

        const todayOrders =
          orders.filter(
            order =>
              order.created_at
                .slice(0, 10) ===
              today
          );

        const paid =
          orders.filter(
            order =>
              order.status ===
              "paid"
          );

        const pending =
          orders.filter(
            order =>
              order.status ===
              "pending"
          );

        const activeOps =
          orders.filter(
            order =>
              order.operation_status ===
                "new" ||
              order.operation_status ===
                "confirmed" ||
              order.operation_status ===
                "in_service"
          );


        return {
          todayCount:
            todayOrders.length,

          todaySales:
            todayOrders.reduce(
              (
                total,
                order
              ) =>
                total +
                Number(
                  order.sale_price ||
                  0
                ),
              0
            ),

          paidTotal:
            paid.reduce(
              (
                total,
                order
              ) =>
                total +
                Number(
                  order.sale_price ||
                  0
                ),
              0
            ),

          pendingTotal:
            pending.reduce(
              (
                total,
                order
              ) =>
                total +
                Number(
                  order.sale_price ||
                  0
                ),
              0
            ),

          grossProfit:
            paid.reduce(
              (
                total,
                order
              ) =>
                total +
                Number(
                  order.gross_profit ||
                  0
                ),
              0
            ),

          activeOperations:
            activeOps.length,
        };
      },
      [
        orders,
      ]
    );


  async function updateOperation(
    order: ExtraOrder,
    patch: {
      operation_status?:
        OperationStatus;
      service_date?:
        string | null;
      service_time?:
        string | null;
      operation_notes?:
        string | null;
    }
  ) {
    if (!membership) {
      return;
    }

    setSavingId(
      order.id
    );

    setErrorMessage("");
    setSuccessMessage("");

    const nextStatus =
      patch.operation_status ??
      order.operation_status;

    const nextDate =
      patch.service_date !==
        undefined
        ? patch.service_date
        : order.service_date;

    const nextTime =
      patch.service_time !==
        undefined
        ? patch.service_time
        : order.service_time;

    const nextNotes =
      patch.operation_notes !==
        undefined
        ? patch.operation_notes
        : order.operation_notes;


    const {
      error,
    } =
      await supabase.rpc(
        "update_package_extra_operation",
        {
          p_order_id:
            order.id,

          p_operation_status:
            nextStatus,

          p_service_date:
            nextDate ||
            null,

          p_service_time:
            nextTime ||
            null,

          p_operation_notes:
            nextNotes ||
            null,
        }
      );


    if (error) {
      setErrorMessage(
        error.message
      );

      setSavingId("");

      return;
    }


    setSuccessMessage(
      "Ekstra sipariş operasyon bilgisi güncellendi."
    );

    await loadOrders(
      membership.company_id
    );

    setSavingId("");
  }


  if (loading) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center text-slate-300">
        Ekstra siparişler hazırlanıyor...
      </main>
    );
  }


  return (
    <main className="min-h-screen bg-slate-950 p-5 text-white md:p-8">

      <div className="mx-auto max-w-7xl">

        <div className="rounded-[30px] border border-white/10 bg-slate-900 p-6 md:p-8">

          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">

            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-400">
                TUROBUS PACKAGE OS
              </p>

              <h1 className="mt-3 text-3xl font-black md:text-5xl">
                Ekstra Sipariş Operasyon Merkezi
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
                Misafirin seyahat ekranından satın aldığı ekstra aktivite ve hizmetleri,
                ödeme durumunu, operasyon akışını, tedarikçiyi ve kârlılığı tek merkezden yönetin.
              </p>
            </div>

            <Link
              href="/dashboard/package-os"
              className="rounded-xl border border-white/10 px-5 py-3 text-sm font-black transition hover:border-orange-500/40"
            >
              ← Package OS
            </Link>

          </div>


          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">

            <StatCard
              title="Bugünkü Sipariş"
              value={
                String(
                  stats.todayCount
                )
              }
              icon={
                <FaShoppingCart />
              }
            />

            <StatCard
              title="Bugünkü Satış"
              value={
                money(
                  stats.todaySales
                )
              }
              icon={
                <FaCoins />
              }
            />

            <StatCard
              title="Toplam Tahsil"
              value={
                money(
                  stats.paidTotal
                )
              }
              icon={
                <FaCheckCircle />
              }
            />

            <StatCard
              title="Bekleyen Tahsilat"
              value={
                money(
                  stats.pendingTotal
                )
              }
              icon={
                <FaClock />
              }
            />

            <StatCard
              title="Brüt Kâr"
              value={
                money(
                  stats.grossProfit
                )
              }
              icon={
                <FaCoins />
              }
            />

            <StatCard
              title="Aktif Operasyon"
              value={
                String(
                  stats.activeOperations
                )
              }
              icon={
                <FaTruckLoading />
              }
            />

          </div>
        </div>


        {errorMessage && (
          <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-bold text-red-300">
            {errorMessage}
          </div>
        )}


        {successMessage && (
          <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-300">
            {successMessage}
          </div>
        )}


        <div className="mt-6 grid gap-4 rounded-[26px] border border-white/10 bg-slate-900 p-5 md:grid-cols-3">

          <label className="relative">
            <FaSearch className="absolute left-4 top-4 text-slate-500" />

            <input
              value={search}
              onChange={
                event =>
                  setSearch(
                    event.target.value
                  )
              }
              placeholder="Müşteri, rezervasyon, aktivite ara..."
              className="w-full rounded-xl border border-white/10 bg-slate-950 py-3 pl-11 pr-4 text-sm outline-none focus:border-orange-500/50"
            />
          </label>


          <select
            value={
              operationFilter
            }
            onChange={
              event =>
                setOperationFilter(
                  event.target
                    .value as
                    | OperationStatus
                    | "all"
                )
            }
            className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none"
          >
            <option value="all">
              Tüm operasyon durumları
            </option>

            {(
              Object.keys(
                operationLabels
              ) as OperationStatus[]
            ).map(
              status => (
                <option
                  key={status}
                  value={status}
                >
                  {
                    operationLabels[
                      status
                    ]
                  }
                </option>
              )
            )}
          </select>


          <select
            value={
              paymentFilter
            }
            onChange={
              event =>
                setPaymentFilter(
                  event.target
                    .value as
                    | PaymentStatus
                    | "all"
                )
            }
            className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none"
          >
            <option value="all">
              Tüm ödeme durumları
            </option>

            {(
              Object.keys(
                paymentLabels
              ) as PaymentStatus[]
            ).map(
              status => (
                <option
                  key={status}
                  value={status}
                >
                  {
                    paymentLabels[
                      status
                    ]
                  }
                </option>
              )
            )}
          </select>

        </div>


        <div className="mt-6 space-y-5">

          {filteredOrders.length === 0 && (
            <div className="rounded-[26px] border border-white/10 bg-slate-900 p-10 text-center text-slate-400">
              Gösterilecek ekstra sipariş bulunamadı.
            </div>
          )}


          {filteredOrders.map(
            order => {
              const booking =
                firstRelation(
                  order.booking
                );

              const items =
                order.items ??
                [];

              return (
                <article
                  key={order.id}
                  className="overflow-hidden rounded-[28px] border border-white/10 bg-slate-900"
                >

                  <div className="grid gap-5 border-b border-white/10 p-6 lg:grid-cols-[1.5fr_1fr_auto]">

                    <div>
                      <div className="flex flex-wrap items-center gap-2">

                        <span className={`rounded-full border px-3 py-1 text-xs font-black ${operationBadge(
                          order.operation_status
                        )}`}>
                          {
                            operationLabels[
                              order.operation_status
                            ]
                          }
                        </span>

                        <span className={`rounded-full border px-3 py-1 text-xs font-black ${paymentBadge(
                          order.status
                        )}`}>
                          {
                            paymentLabels[
                              order.status
                            ]
                          }
                        </span>

                      </div>

                      <h2 className="mt-4 text-xl font-black">
                        {
                          booking?.customer_name ??
                          "Müşteri"
                        }
                      </h2>

                      <p className="mt-1 text-sm text-slate-400">
                        Rezervasyon:
                        {" "}
                        <span className="font-black text-white">
                          {
                            booking?.booking_code ??
                            "-"
                          }
                        </span>
                      </p>

                      {booking?.customer_phone && (
                        <p className="mt-1 text-sm text-slate-500">
                          {
                            booking.customer_phone
                          }
                        </p>
                      )}
                    </div>


                    <div>
                      <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                        Sipariş
                      </p>

                      <p className="mt-2 text-sm font-black">
                        {
                          dateTime(
                            order.created_at
                          )
                        }
                      </p>

                      {order.payment_provider && (
                        <p className="mt-2 text-xs text-slate-500">
                          {
                            order.payment_provider
                          }
                          {
                            order.payment_reference
                              ? ` · ${order.payment_reference}`
                              : ""
                          }
                        </p>
                      )}
                    </div>


                    <div className="lg:text-right">
                      <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                        Satış
                      </p>

                      <p className="mt-1 text-2xl font-black text-orange-400">
                        {
                          money(
                            order.sale_price,
                            order.currency
                          )
                        }
                      </p>

                      <p className="mt-2 text-xs text-slate-500">
                        Maliyet:
                        {" "}
                        {
                          money(
                            order.total_cost,
                            order.currency
                          )
                        }
                      </p>

                      <p className="mt-1 text-xs font-black text-emerald-400">
                        Kâr:
                        {" "}
                        {
                          money(
                            order.gross_profit,
                            order.currency
                          )
                        }
                      </p>
                    </div>

                  </div>


                  <div className="grid gap-5 p-6 xl:grid-cols-[1.2fr_1fr]">

                    <div className="space-y-3">

                      {items.map(
                        item => (
                          <div
                            key={item.id}
                            className="rounded-2xl border border-white/10 bg-slate-950 p-4"
                          >
                            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">

                              <div>
                                <p className="font-black">
                                  {item.name}
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                  Adet:
                                  {" "}
                                  {
                                    Number(
                                      item.quantity
                                    )
                                  }
                                </p>

                                {item.supplier_id && (
                                  <p className="mt-1 text-xs text-slate-500">
                                    Tedarikçi:
                                    {" "}
                                    <span className="font-bold text-slate-300">
                                      {
                                        supplierMap.get(
                                          item.supplier_id
                                        ) ??
                                        "Tedarikçi kaydı"
                                      }
                                    </span>
                                  </p>
                                )}

                                {item.requires_slot && (
                                  <p className="mt-2 inline-flex rounded-lg border border-blue-500/20 bg-blue-500/10 px-2 py-1 text-[11px] font-black text-blue-300">
                                    Saat / slot gerektirir
                                  </p>
                                )}
                              </div>

                              <div className="text-left md:text-right">
                                <p className="font-black">
                                  {
                                    money(
                                      item.total_sale_price,
                                      item.currency
                                    )
                                  }
                                </p>

                                <p className="mt-1 text-xs text-slate-600">
                                  maliyet
                                  {" "}
                                  {
                                    money(
                                      item.total_cost,
                                      item.currency
                                    )
                                  }
                                </p>
                              </div>

                            </div>
                          </div>
                        )
                      )}

                    </div>


                    <div className="rounded-2xl border border-white/10 bg-slate-950 p-5">

                      <p className="text-xs font-black uppercase tracking-wider text-orange-400">
                        Operasyon Yönetimi
                      </p>


                      <div className="mt-4 grid gap-3 md:grid-cols-2">

                        <label>
                          <span className="mb-2 block text-xs font-bold text-slate-400">
                            Operasyon Durumu
                          </span>

                          <select
                            value={
                              order.operation_status
                            }
                            disabled={
                              savingId ===
                              order.id
                            }
                            onChange={
                              event =>
                                void updateOperation(
                                  order,
                                  {
                                    operation_status:
                                      event.target
                                        .value as OperationStatus,
                                  }
                                )
                            }
                            className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-3 text-sm outline-none"
                          >
                            {(
                              Object.keys(
                                operationLabels
                              ) as OperationStatus[]
                            ).map(
                              status => (
                                <option
                                  key={status}
                                  value={status}
                                >
                                  {
                                    operationLabels[
                                      status
                                    ]
                                  }
                                </option>
                              )
                            )}
                          </select>
                        </label>


                        <label>
                          <span className="mb-2 block text-xs font-bold text-slate-400">
                            Hizmet Tarihi
                          </span>

                          <div className="relative">
                            <FaCalendarAlt className="absolute left-3 top-3.5 text-slate-600" />

                            <input
                              type="date"
                              value={
                                order.service_date ??
                                ""
                              }
                              disabled={
                                savingId ===
                                order.id
                              }
                              onChange={
                                event => {
                                  const value =
                                    event.target.value;

                                  setOrders(
                                    current =>
                                      current.map(
                                        row =>
                                          row.id ===
                                          order.id
                                            ? {
                                                ...row,
                                                service_date:
                                                  value ||
                                                  null,
                                              }
                                            : row
                                      )
                                  );
                                }
                              }
                              onBlur={
                                event =>
                                  void updateOperation(
                                    order,
                                    {
                                      service_date:
                                        event.target
                                          .value ||
                                        null,
                                    }
                                  )
                              }
                              className="w-full rounded-xl border border-white/10 bg-slate-900 py-3 pl-10 pr-3 text-sm outline-none"
                            />
                          </div>
                        </label>


                        <label>
                          <span className="mb-2 block text-xs font-bold text-slate-400">
                            Hizmet Saati
                          </span>

                          <div className="relative">
                            <FaClock className="absolute left-3 top-3.5 text-slate-600" />

                            <input
                              type="time"
                              value={
                                order.service_time
                                  ? order.service_time.slice(
                                      0,
                                      5
                                    )
                                  : ""
                              }
                              disabled={
                                savingId ===
                                order.id
                              }
                              onChange={
                                event => {
                                  const value =
                                    event.target.value;

                                  setOrders(
                                    current =>
                                      current.map(
                                        row =>
                                          row.id ===
                                          order.id
                                            ? {
                                                ...row,
                                                service_time:
                                                  value ||
                                                  null,
                                              }
                                            : row
                                      )
                                  );
                                }
                              }
                              onBlur={
                                event =>
                                  void updateOperation(
                                    order,
                                    {
                                      service_time:
                                        event.target
                                          .value ||
                                        null,
                                    }
                                  )
                              }
                              className="w-full rounded-xl border border-white/10 bg-slate-900 py-3 pl-10 pr-3 text-sm outline-none"
                            />
                          </div>
                        </label>


                        <div className="flex items-end">
                          <button
                            type="button"
                            disabled={
                              savingId ===
                              order.id
                            }
                            onClick={
                              () =>
                                void updateOperation(
                                  order,
                                  {}
                                )
                            }
                            className="w-full rounded-xl bg-orange-500 px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-50"
                          >
                            {
                              savingId ===
                              order.id
                                ? "Kaydediliyor..."
                                : "Operasyonu Kaydet"
                            }
                          </button>
                        </div>

                      </div>


                      <label className="mt-4 block">
                        <span className="mb-2 block text-xs font-bold text-slate-400">
                          Operasyon Notu
                        </span>

                        <textarea
                          value={
                            order.operation_notes ??
                            ""
                          }
                          disabled={
                            savingId ===
                            order.id
                          }
                          onChange={
                            event => {
                              const value =
                                event.target.value;

                              setOrders(
                                current =>
                                  current.map(
                                    row =>
                                      row.id ===
                                      order.id
                                        ? {
                                            ...row,
                                            operation_notes:
                                              value,
                                          }
                                        : row
                                  )
                              );
                            }
                          }
                          onBlur={
                            event =>
                              void updateOperation(
                                order,
                                {
                                  operation_notes:
                                    event.target
                                      .value ||
                                    null,
                                }
                              )
                          }
                          placeholder="Transfer, buluşma noktası, özel istek, tedarikçi notu..."
                          rows={3}
                          className="w-full resize-none rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-orange-500/40"
                        />
                      </label>

                    </div>

                  </div>

                </article>
              );
            }
          )}

        </div>

      </div>

    </main>
  );
}


function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950 p-5">

      <div className="flex items-center justify-between">
        <p className="text-xs font-black uppercase tracking-wider text-slate-500">
          {title}
        </p>

        <span className="text-orange-400">
          {icon}
        </span>
      </div>

      <p className="mt-3 text-xl font-black">
        {value}
      </p>

    </div>
  );
}
