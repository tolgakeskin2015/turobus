"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import {
  supabase,
} from "@/lib/supabase";

import {
  CurrentMembership,
  getCurrentMembership,
} from "@/lib/current-user";


type PayableStatus =
  | "open"
  | "partial"
  | "paid"
  | "cancelled";


type Payable = {
  id: string;

  company_id: string;

  booking_id: string;

  booking_item_id:
    string | null;

  extra_order_id:
    string | null;

  extra_order_item_id:
    string | null;

  supplier_id:
    string | null;

  amount: number;

  currency: string;

  due_date:
    string | null;

  paid_amount: number;

  status: PayableStatus;

  notes:
    string | null;

  created_at: string;

  updated_at: string;
};


type Supplier = {
  id: string;
  name: string;
};


type Booking = {
  id: string;
  booking_code: string;
  customer_name: string;
};


type BookingItem = {
  id: string;
  name: string;
  service_date: string | null;
  service_time: string | null;
};


type ExtraItem = {
  id: string;
  name: string;
};


const statusLabels:
Record<PayableStatus, string> = {
  open:
    "Açık",

  partial:
    "Kısmi Ödendi",

  paid:
    "Ödendi",

  cancelled:
    "İptal",
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

      currency,

      maximumFractionDigits:
        2,
    }
  ).format(
    Number(
      value ||
      0
    )
  );
}


function statusClass(
  status: PayableStatus
) {
  if (
    status ===
    "paid"
  ) {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
  }

  if (
    status ===
    "partial"
  ) {
    return "border-blue-500/20 bg-blue-500/10 text-blue-300";
  }

  if (
    status ===
    "cancelled"
  ) {
    return "border-red-500/20 bg-red-500/10 text-red-300";
  }

  return "border-amber-500/20 bg-amber-500/10 text-amber-300";
}


export default function PackagePayablesPage() {

  const [
    membership,
    setMembership,
  ] =
    useState<CurrentMembership | null>(
      null
    );


  const [
    payables,
    setPayables,
  ] =
    useState<Payable[]>([]);


  const [
    suppliers,
    setSuppliers,
  ] =
    useState<Supplier[]>([]);


  const [
    bookings,
    setBookings,
  ] =
    useState<Booking[]>([]);


  const [
    bookingItems,
    setBookingItems,
  ] =
    useState<BookingItem[]>([]);


  const [
    extraItems,
    setExtraItems,
  ] =
    useState<ExtraItem[]>([]);


  const [
    loading,
    setLoading,
  ] =
    useState(true);


  const [
    search,
    setSearch,
  ] =
    useState("");


  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState<
      PayableStatus |
      "all"
    >(
      "all"
    );


  const [
    paymentInputs,
    setPaymentInputs,
  ] =
    useState<
      Record<
        string,
        string
      >
    >({});


  const [
    savingId,
    setSavingId,
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


  const loadData =
    useCallback(
      async (
        companyId: string
      ) => {

        setLoading(
          true
        );

        setErrorMessage(
          ""
        );


        const [
          payableResult,
          supplierResult,
          bookingResult,
          bookingItemResult,
          extraItemResult,
        ] =
          await Promise.all([

            supabase
              .from(
                "package_supplier_payables"
              )
              .select(`
                id,
                company_id,
                booking_id,
                booking_item_id,
                extra_order_id,
                extra_order_item_id,
                supplier_id,
                amount,
                currency,
                due_date,
                paid_amount,
                status,
                notes,
                created_at,
                updated_at
              `)
              .eq(
                "company_id",
                companyId
              )
              .order(
                "created_at",
                {
                  ascending:
                    false,
                }
              )
              .limit(
                500
              ),


            supabase
              .from(
                "suppliers"
              )
              .select(
                "id, name"
              )
              .eq(
                "company_id",
                companyId
              ),


            supabase
              .from(
                "package_bookings"
              )
              .select(
                "id, booking_code, customer_name"
              )
              .eq(
                "company_id",
                companyId
              ),


            supabase
              .from(
                "package_booking_items"
              )
              .select(
                "id, name, service_date, service_time"
              )
              .eq(
                "company_id",
                companyId
              ),


            supabase
              .from(
                "package_extra_order_items"
              )
              .select(
                "id, name"
              )
              .eq(
                "company_id",
                companyId
              ),
          ]);


        if (
          payableResult.error
        ) {
          setErrorMessage(
            payableResult.error.message
          );

          setLoading(
            false
          );

          return;
        }


        setPayables(
          (
            payableResult.data ??
            []
          ) as Payable[]
        );


        setSuppliers(
          (
            supplierResult.data ??
            []
          ) as Supplier[]
        );


        setBookings(
          (
            bookingResult.data ??
            []
          ) as Booking[]
        );


        setBookingItems(
          (
            bookingItemResult.data ??
            []
          ) as BookingItem[]
        );


        setExtraItems(
          (
            extraItemResult.data ??
            []
          ) as ExtraItem[]
        );


        setLoading(
          false
        );

      },
      []
    );


  useEffect(() => {

    async function boot() {

      try {

        const {
          data: authData,
          error: authError,
        } =
          await supabase.auth.getUser();


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


        await loadData(
          current.company_id
        );


      } catch (error) {

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Hakediş merkezi hazırlanamadı."
        );

        setLoading(
          false
        );
      }
    }


    void boot();

  }, [
    loadData,
  ]);


  const supplierMap =
    useMemo(
      () =>
        new Map(
          suppliers.map(
            item => [
              item.id,
              item.name,
            ]
          )
        ),
      [
        suppliers,
      ]
    );


  const bookingMap =
    useMemo(
      () =>
        new Map(
          bookings.map(
            item => [
              item.id,
              item,
            ]
          )
        ),
      [
        bookings,
      ]
    );


  const bookingItemMap =
    useMemo(
      () =>
        new Map(
          bookingItems.map(
            item => [
              item.id,
              item,
            ]
          )
        ),
      [
        bookingItems,
      ]
    );


  const extraItemMap =
    useMemo(
      () =>
        new Map(
          extraItems.map(
            item => [
              item.id,
              item,
            ]
          )
        ),
      [
        extraItems,
      ]
    );


  const filtered =
    useMemo(
      () => {

        const query =
          search
            .trim()
            .toLocaleLowerCase(
              "tr-TR"
            );


        return payables.filter(
          payable => {

            if (
              statusFilter !==
                "all" &&
              payable.status !==
                statusFilter
            ) {
              return false;
            }


            if (!query) {
              return true;
            }


            const booking =
              bookingMap.get(
                payable.booking_id
              );


            const service =
              payable.extra_order_item_id
                ? extraItemMap.get(
                    payable.extra_order_item_id
                  )?.name
                : payable.booking_item_id
                  ? bookingItemMap.get(
                      payable.booking_item_id
                    )?.name
                  : "";


            const supplier =
              payable.supplier_id
                ? supplierMap.get(
                    payable.supplier_id
                  )
                : "";


            return [
              booking?.booking_code,
              booking?.customer_name,
              service,
              supplier,
            ]
              .filter(
                Boolean
              )
              .join(" ")
              .toLocaleLowerCase(
                "tr-TR"
              )
              .includes(
                query
              );
          }
        );

      },
      [
        payables,
        search,
        statusFilter,
        bookingMap,
        bookingItemMap,
        extraItemMap,
        supplierMap,
      ]
    );


  const stats =
    useMemo(
      () => {

        const total =
          payables.reduce(
            (
              sum,
              row
            ) =>
              sum +
              Number(
                row.amount ||
                0
              ),
            0
          );


        const paid =
          payables.reduce(
            (
              sum,
              row
            ) =>
              sum +
              Number(
                row.paid_amount ||
                0
              ),
            0
          );


        const remaining =
          payables.reduce(
            (
              sum,
              row
            ) =>
              sum +
              Math.max(
                Number(
                  row.amount ||
                  0
                ) -
                Number(
                  row.paid_amount ||
                  0
                ),
                0
              ),
            0
          );


        const openCount =
          payables.filter(
            row =>
              row.status ===
                "open" ||
              row.status ===
                "partial"
          ).length;


        return {
          total,
          paid,
          remaining,
          openCount,
        };

      },
      [
        payables,
      ]
    );


  async function recordPayment(
    payable: Payable
  ) {

    if (!membership) {
      return;
    }


    const amount =
      Number(
        paymentInputs[
          payable.id
        ] ||
        0
      );


    if (
      !Number.isFinite(
        amount
      ) ||
      amount <= 0
    ) {
      setErrorMessage(
        "Geçerli bir ödeme tutarı gir."
      );

      return;
    }


    setSavingId(
      payable.id
    );

    setErrorMessage(
      ""
    );

    setSuccessMessage(
      ""
    );


    const {
      error,
    } =
      await supabase.rpc(
        "record_package_supplier_payment",
        {
          p_payable_id:
            payable.id,

          p_amount:
            amount,

          p_notes:
            "Package OS Hakediş Merkezi üzerinden ödeme kaydı.",
        }
      );


    if (error) {

      setErrorMessage(
        error.message
      );

      setSavingId(
        ""
      );

      return;
    }


    setPaymentInputs(
      current => ({
        ...current,
        [payable.id]:
          "",
      })
    );


    setSuccessMessage(
      "Tedarikçi ödemesi kaydedildi."
    );


    await loadData(
      membership.company_id
    );


    setSavingId(
      ""
    );
  }


  if (loading) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center text-slate-300">
        Hakediş merkezi hazırlanıyor...
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
                Tedarikçi Hakediş Merkezi
              </h1>


              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
                Paket içi ve sonradan satın alınan ekstra hizmetlerin
                tedarikçi maliyetlerini, ödemelerini ve kalan bakiyelerini
                tek merkezden takip edin.
              </p>

            </div>


            <div className="flex flex-wrap gap-3">

              <Link
                href="/dashboard/package-os/operations"
                className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-black text-black"
              >
                Günlük Operasyon →
              </Link>


              <Link
                href="/dashboard/package-os"
                className="rounded-xl border border-white/10 px-5 py-3 text-sm font-black"
              >
                ← Package OS
              </Link>

            </div>

          </div>


          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

            <StatCard
              label="Toplam Hakediş"
              value={
                money(
                  stats.total
                )
              }
            />

            <StatCard
              label="Ödenen"
              value={
                money(
                  stats.paid
                )
              }
            />

            <StatCard
              label="Kalan"
              value={
                money(
                  stats.remaining
                )
              }
            />

            <StatCard
              label="Açık Hakediş"
              value={
                String(
                  stats.openCount
                )
              }
            />

          </div>

        </div>


        {errorMessage && (
          <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-300">
            {errorMessage}
          </div>
        )}


        {successMessage && (
          <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-300">
            {successMessage}
          </div>
        )}


        <div className="mt-6 grid gap-4 rounded-[26px] border border-white/10 bg-slate-900 p-5 md:grid-cols-2">

          <input
            value={search}
            onChange={
              event =>
                setSearch(
                  event.target.value
                )
            }
            placeholder="Tedarikçi, müşteri, rezervasyon veya hizmet ara..."
            className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none"
          />


          <select
            value={
              statusFilter
            }
            onChange={
              event =>
                setStatusFilter(
                  event.target
                    .value as
                    | PayableStatus
                    | "all"
                )
            }
            className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none"
          >
            <option value="all">
              Tüm Hakedişler
            </option>

            <option value="open">
              Açık
            </option>

            <option value="partial">
              Kısmi Ödendi
            </option>

            <option value="paid">
              Ödendi
            </option>

            <option value="cancelled">
              İptal
            </option>

          </select>

        </div>


        <div className="mt-6 space-y-4">

          {filtered.map(
            payable => {

              const booking =
                bookingMap.get(
                  payable.booking_id
                );


              const normalItem =
                payable.booking_item_id
                  ? bookingItemMap.get(
                      payable.booking_item_id
                    )
                  : null;


              const extraItem =
                payable.extra_order_item_id
                  ? extraItemMap.get(
                      payable.extra_order_item_id
                    )
                  : null;


              const serviceName =
                extraItem?.name ||
                normalItem?.name ||
                "Paket Hizmeti";


              const supplierName =
                payable.supplier_id
                  ? supplierMap.get(
                      payable.supplier_id
                    ) ||
                    "Tedarikçi"
                  : "Tedarikçi Atanmamış";


              const remaining =
                Math.max(
                  Number(
                    payable.amount ||
                    0
                  ) -
                  Number(
                    payable.paid_amount ||
                    0
                  ),
                  0
                );


              return (
                <article
                  key={
                    payable.id
                  }
                  className="rounded-[26px] border border-white/10 bg-slate-900 p-5 md:p-6"
                >

                  <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr_1fr]">

                    <div>

                      <div className="flex flex-wrap gap-2">

                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-black ${statusClass(
                            payable.status
                          )}`}
                        >
                          {
                            statusLabels[
                              payable.status
                            ]
                          }
                        </span>


                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-black text-slate-300">
                          {
                            payable.extra_order_item_id
                              ? "EKSTRA SATIŞ"
                              : "PAKET HİZMETİ"
                          }
                        </span>

                      </div>


                      <h2 className="mt-4 text-xl font-black">
                        {serviceName}
                      </h2>


                      <p className="mt-1 text-sm text-orange-300">
                        {supplierName}
                      </p>


                      <p className="mt-3 text-sm text-slate-400">
                        {
                          booking?.customer_name ||
                          "Müşteri"
                        }
                        {" · "}
                        {
                          booking?.booking_code ||
                          "-"
                        }
                      </p>


                      {normalItem?.service_date && (
                        <p className="mt-2 text-xs text-slate-500">
                          Hizmet:
                          {" "}
                          {
                            normalItem.service_date
                          }
                          {
                            normalItem.service_time
                              ? ` · ${normalItem.service_time.slice(
                                  0,
                                  5
                                )}`
                              : ""
                          }
                        </p>
                      )}

                    </div>


                    <div>

                      <p className="text-xs font-bold uppercase text-slate-500">
                        Hakediş
                      </p>


                      <p className="mt-2 text-2xl font-black">
                        {
                          money(
                            payable.amount,
                            payable.currency
                          )
                        }
                      </p>


                      <p className="mt-3 text-sm text-emerald-400">
                        Ödenen:
                        {" "}
                        {
                          money(
                            payable.paid_amount,
                            payable.currency
                          )
                        }
                      </p>


                      <p className="mt-1 text-sm text-amber-300">
                        Kalan:
                        {" "}
                        {
                          money(
                            remaining,
                            payable.currency
                          )
                        }
                      </p>

                    </div>


                    <div>

                      {(
                        payable.status ===
                          "open" ||
                        payable.status ===
                          "partial"
                      ) ? (
                        <>

                          <label className="text-xs font-bold text-slate-400">
                            Ödeme Gir
                          </label>


                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            max={
                              remaining
                            }
                            value={
                              paymentInputs[
                                payable.id
                              ] ||
                              ""
                            }
                            onChange={
                              event =>
                                setPaymentInputs(
                                  current => ({
                                    ...current,

                                    [payable.id]:
                                      event.target.value,
                                  })
                                )
                            }
                            placeholder={
                              String(
                                remaining
                              )
                            }
                            className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none"
                          />


                          <button
                            type="button"
                            disabled={
                              savingId ===
                              payable.id
                            }
                            onClick={() =>
                              void recordPayment(
                                payable
                              )
                            }
                            className="mt-3 w-full rounded-xl bg-orange-500 px-4 py-3 text-sm font-black text-black disabled:opacity-50"
                          >
                            {
                              savingId ===
                              payable.id
                                ? "Kaydediliyor..."
                                : "Ödemeyi Kaydet"
                            }
                          </button>

                        </>
                      ) : (
                        <div className="rounded-2xl border border-white/10 bg-slate-950 p-4 text-center text-sm text-slate-400">
                          {
                            payable.status ===
                            "paid"
                              ? "Hakediş tamamen ödendi."
                              : "Hakediş iptal edildi."
                          }
                        </div>
                      )}

                    </div>

                  </div>

                </article>
              );
            }
          )}


          {filtered.length ===
            0 && (
            <div className="rounded-[26px] border border-white/10 bg-slate-900 p-10 text-center text-slate-400">
              Hakediş kaydı bulunamadı.
            </div>
          )}

        </div>

      </div>

    </main>
  );
}


function StatCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950 p-5">

      <p className="text-xs font-black uppercase tracking-wider text-slate-500">
        {label}
      </p>


      <p className="mt-3 text-xl font-black">
        {value}
      </p>

    </div>
  );
}
