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
  getCurrentMembership,
} from "@/lib/current-user";


type Supplier = {
  id: string;
  name: string;
};


type Booking = {
  id: string;
  booking_code: string;
  customer_name: string;
  customer_phone: string | null;
};


type BookingItem = {
  id: string;

  booking_id: string;

  supplier_id:
    string | null;

  name: string;

  service_date:
    string | null;

  service_time:
    string | null;

  quantity: number;

  supplier_status: string;

  customer_status: string;
};


type ExtraOrder = {
  id: string;

  booking_id: string;

  service_date:
    string | null;

  service_time:
    string | null;

  operation_status: string;

  status: string;
};


type ExtraItem = {
  id: string;

  order_id: string;

  supplier_id:
    string | null;

  name: string;

  quantity: number;
};


type OperationRow = {
  id: string;

  source:
    | "package"
    | "extra";

  booking_id: string;

  booking_code: string;

  customer_name: string;

  customer_phone:
    string | null;

  supplier_id:
    string | null;

  supplier_name: string;

  service_name: string;

  service_date:
    string | null;

  service_time:
    string | null;

  quantity: number;

  status: string;

  customer_status:
    string | null;
};


function todayLocal() {
  const now =
    new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() +
      1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      now.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${year}-${month}-${day}`;
}


export default function PackageOperationsPage() {

  const [
    rows,
    setRows,
  ] =
    useState<OperationRow[]>([]);


  const [
    date,
    setDate,
  ] =
    useState(
      todayLocal()
    );


  const [
    search,
    setSearch,
  ] =
    useState("");


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


  const loadData =
    useCallback(
      async () => {

        setLoading(
          true
        );

        setErrorMessage(
          ""
        );


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


          const membership =
            await getCurrentMembership(
              authData.user.id
            );


          if (!membership) {
            throw new Error(
              "Aktif şirket üyeliği bulunamadı."
            );
          }


          const companyId =
            membership.company_id;


          const [
            bookingResult,
            itemResult,
            extraOrderResult,
            extraItemResult,
            supplierResult,
          ] =
            await Promise.all([

              supabase
                .from(
                  "package_bookings"
                )
                .select(`
                  id,
                  booking_code,
                  customer_name,
                  customer_phone
                `)
                .eq(
                  "company_id",
                  companyId
                ),


              supabase
                .from(
                  "package_booking_items"
                )
                .select(`
                  id,
                  booking_id,
                  supplier_id,
                  name,
                  service_date,
                  service_time,
                  quantity,
                  supplier_status,
                  customer_status
                `)
                .eq(
                  "company_id",
                  companyId
                )
                .eq(
                  "service_date",
                  date
                ),


              supabase
                .from(
                  "package_extra_orders"
                )
                .select(`
                  id,
                  booking_id,
                  service_date,
                  service_time,
                  operation_status,
                  status
                `)
                .eq(
                  "company_id",
                  companyId
                )
                .eq(
                  "status",
                  "paid"
                )
                .eq(
                  "service_date",
                  date
                ),


              supabase
                .from(
                  "package_extra_order_items"
                )
                .select(`
                  id,
                  order_id,
                  supplier_id,
                  name,
                  quantity
                `)
                .eq(
                  "company_id",
                  companyId
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
            ]);


          if (
            bookingResult.error
          ) {
            throw bookingResult.error;
          }


          if (
            itemResult.error
          ) {
            throw itemResult.error;
          }


          if (
            extraOrderResult.error
          ) {
            throw extraOrderResult.error;
          }


          if (
            extraItemResult.error
          ) {
            throw extraItemResult.error;
          }


          const bookings =
            (
              bookingResult.data ??
              []
            ) as Booking[];


          const suppliers =
            (
              supplierResult.data ??
              []
            ) as Supplier[];


          const bookingMap =
            new Map(
              bookings.map(
                booking => [
                  booking.id,
                  booking,
                ]
              )
            );


          const supplierMap =
            new Map(
              suppliers.map(
                supplier => [
                  supplier.id,
                  supplier.name,
                ]
              )
            );


          const packageRows:
            OperationRow[] =
              (
                itemResult.data ??
                []
              )
                .map(
                  raw => {

                    const item =
                      raw as BookingItem;


                    const booking =
                      bookingMap.get(
                        item.booking_id
                      );


                    return {
                      id:
                        `package-${item.id}`,

                      source:
                        "package" as const,

                      booking_id:
                        item.booking_id,

                      booking_code:
                        booking?.booking_code ||
                        "-",

                      customer_name:
                        booking?.customer_name ||
                        "Müşteri",

                      customer_phone:
                        booking?.customer_phone ||
                        null,

                      supplier_id:
                        item.supplier_id,

                      supplier_name:
                        item.supplier_id
                          ? supplierMap.get(
                              item.supplier_id
                            ) ||
                            "Tedarikçi"
                          : "Atanmamış",

                      service_name:
                        item.name,

                      service_date:
                        item.service_date,

                      service_time:
                        item.service_time,

                      quantity:
                        Number(
                          item.quantity ||
                          1
                        ),

                      status:
                        item.supplier_status,

                      customer_status:
                        item.customer_status,
                    };
                  }
                );


          const extraOrders =
            (
              extraOrderResult.data ??
              []
            ) as ExtraOrder[];


          const extraItems =
            (
              extraItemResult.data ??
              []
            ) as ExtraItem[];


          const extraItemsByOrder =
            new Map<
              string,
              ExtraItem[]
            >();


          for (
            const item of
            extraItems
          ) {

            const existing =
              extraItemsByOrder.get(
                item.order_id
              ) ||
              [];


            existing.push(
              item
            );


            extraItemsByOrder.set(
              item.order_id,
              existing
            );
          }


          const extraRows:
            OperationRow[] =
              [];


          for (
            const order of
            extraOrders
          ) {

            const booking =
              bookingMap.get(
                order.booking_id
              );


            const items =
              extraItemsByOrder.get(
                order.id
              ) ||
              [];


            for (
              const item of
              items
            ) {

              extraRows.push({
                id:
                  `extra-${item.id}`,

                source:
                  "extra",

                booking_id:
                  order.booking_id,

                booking_code:
                  booking?.booking_code ||
                  "-",

                customer_name:
                  booking?.customer_name ||
                  "Müşteri",

                customer_phone:
                  booking?.customer_phone ||
                  null,

                supplier_id:
                  item.supplier_id,

                supplier_name:
                  item.supplier_id
                    ? supplierMap.get(
                        item.supplier_id
                      ) ||
                      "Tedarikçi"
                    : "Atanmamış",

                service_name:
                  item.name,

                service_date:
                  order.service_date,

                service_time:
                  order.service_time,

                quantity:
                  Number(
                    item.quantity ||
                    1
                  ),

                status:
                  order.operation_status,

                customer_status:
                  null,
              });
            }
          }


          const combined =
            [
              ...packageRows,
              ...extraRows,
            ]
              .sort(
                (
                  a,
                  b
                ) =>
                  (
                    a.service_time ||
                    "99:99"
                  )
                    .localeCompare(
                      b.service_time ||
                      "99:99"
                    )
              );


          setRows(
            combined
          );


        } catch (error) {

          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Operasyon listesi hazırlanamadı."
          );

          setRows(
            []
          );
        }


        setLoading(
          false
        );

      },
      [
        date,
      ]
    );


  useEffect(() => {

    void loadData();

  }, [
    loadData,
  ]);


  const filtered =
    useMemo(
      () => {

        const query =
          search
            .trim()
            .toLocaleLowerCase(
              "tr-TR"
            );


        if (!query) {
          return rows;
        }


        return rows.filter(
          row =>
            [
              row.booking_code,
              row.customer_name,
              row.customer_phone,
              row.supplier_name,
              row.service_name,
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
              )
        );

      },
      [
        rows,
        search,
      ]
    );


  const stats =
    useMemo(
      () => ({
        total:
          rows.length,

        extras:
          rows.filter(
            row =>
              row.source ===
              "extra"
          ).length,

        unassigned:
          rows.filter(
            row =>
              !row.supplier_id
          ).length,

        completed:
          rows.filter(
            row =>
              [
                "completed",
                "used",
              ].includes(
                row.status
              ) ||
              row.customer_status ===
                "used"
          ).length,
      }),
      [
        rows,
      ]
    );


  if (loading) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center text-slate-300">
        Günlük operasyon hazırlanıyor...
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
                Günlük Operasyon Merkezi
              </h1>


              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
                Paket içindeki hizmetler ve sonradan satın alınan
                ekstra aktiviteler aynı günlük operasyon listesinde.
              </p>

            </div>


            <div className="flex flex-wrap gap-3">

              <Link
                href="/dashboard/package-os/task-pool"
                className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950"
              >
                Görev Havuzu →
              </Link>


              <Link
                href="/dashboard/package-os/payables"
                className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-black text-black"
              >
                Hakediş Merkezi →
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
              label="Toplam Hizmet"
              value={
                String(
                  stats.total
                )
              }
            />

            <StatCard
              label="Ekstra Hizmet"
              value={
                String(
                  stats.extras
                )
              }
            />

            <StatCard
              label="Tedarikçi Atanmamış"
              value={
                String(
                  stats.unassigned
                )
              }
            />

            <StatCard
              label="Tamamlanan"
              value={
                String(
                  stats.completed
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


        <div className="mt-6 grid gap-4 rounded-[26px] border border-white/10 bg-slate-900 p-5 md:grid-cols-2">

          <input
            type="date"
            value={
              date
            }
            onChange={
              event =>
                setDate(
                  event.target.value
                )
            }
            className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none"
          />


          <input
            value={
              search
            }
            onChange={
              event =>
                setSearch(
                  event.target.value
                )
            }
            placeholder="Müşteri, rezervasyon, hizmet veya tedarikçi ara..."
            className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none"
          />

        </div>


        <div className="mt-6 overflow-hidden rounded-[26px] border border-white/10 bg-slate-900">

          <div className="overflow-x-auto">

            <table className="min-w-full text-left text-sm">

              <thead className="border-b border-white/10 bg-slate-950">

                <tr>

                  <th className="px-5 py-4">
                    Saat
                  </th>

                  <th className="px-5 py-4">
                    Hizmet
                  </th>

                  <th className="px-5 py-4">
                    Misafir
                  </th>

                  <th className="px-5 py-4">
                    Tedarikçi
                  </th>

                  <th className="px-5 py-4">
                    Adet
                  </th>

                  <th className="px-5 py-4">
                    Kaynak
                  </th>

                  <th className="px-5 py-4">
                    Durum
                  </th>

                </tr>

              </thead>


              <tbody>

                {filtered.map(
                  row => (
                    <tr
                      key={
                        row.id
                      }
                      className="border-b border-white/5"
                    >

                      <td className="whitespace-nowrap px-5 py-4 font-black text-orange-300">
                        {
                          row.service_time
                            ? row.service_time.slice(
                                0,
                                5
                              )
                            : "--:--"
                        }
                      </td>


                      <td className="px-5 py-4">

                        <p className="font-black">
                          {
                            row.service_name
                          }
                        </p>


                        <p className="mt-1 text-xs text-slate-500">
                          {
                            row.booking_code
                          }
                        </p>

                      </td>


                      <td className="px-5 py-4">

                        <p className="font-bold">
                          {
                            row.customer_name
                          }
                        </p>


                        {row.customer_phone && (
                          <p className="mt-1 text-xs text-slate-500">
                            {
                              row.customer_phone
                            }
                          </p>
                        )}

                      </td>


                      <td className="px-5 py-4">
                        {
                          row.supplier_name
                        }
                      </td>


                      <td className="px-5 py-4">
                        {
                          row.quantity
                        }
                      </td>


                      <td className="px-5 py-4">

                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-black ${
                            row.source ===
                            "extra"
                              ? "border-cyan-500/20 bg-cyan-500/10 text-cyan-300"
                              : "border-white/10 bg-white/5 text-slate-300"
                          }`}
                        >
                          {
                            row.source ===
                            "extra"
                              ? "EKSTRA"
                              : "PAKET"
                          }
                        </span>

                      </td>


                      <td className="px-5 py-4">

                        <span className="rounded-full border border-white/10 bg-slate-950 px-3 py-1 text-xs font-black">
                          {
                            row.status
                          }
                        </span>

                      </td>

                    </tr>
                  )
                )}

              </tbody>

            </table>

          </div>


          {filtered.length ===
            0 && (
            <div className="p-10 text-center text-slate-400">
              Bu tarihte operasyon kaydı bulunamadı.
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
