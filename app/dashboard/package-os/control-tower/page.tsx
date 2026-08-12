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

  phone:
    string | null;

  whatsapp_phone:
    string | null;
};


type Booking = {
  id: string;

  booking_code: string;

  customer_name: string;

  customer_phone:
    string | null;
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


type AlertRow = {
  id: string;

  source:
    | "package"
    | "extra"
    | "system";

  source_id:
    string | null;

  priority:
    | "normal"
    | "high"
    | "critical";

  status:
    | "unread"
    | "read"
    | "dismissed";

  title: string;
};


type OperationRow = {

  id: string;

  raw_id: string;

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

  supplier_phone:
    string | null;

  service_name: string;

  service_date:
    string | null;

  service_time:
    string | null;

  quantity: number;

  status: string;

  customer_status:
    string | null;

  priority:
    | "normal"
    | "high"
    | "critical";

  alert_title:
    string | null;
};


type FilterType =
  | "all"
  | "critical"
  | "overdue"
  | "unconfirmed"
  | "approaching"
  | "completed";


function todayLocal() {

  const now =
    new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() + 1
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


function normalizePhone(
  value: string
) {

  const digits =
    value.replace(
      /\D/g,
      ""
    );


  if (
    digits.startsWith(
      "90"
    )
  ) {
    return digits;
  }


  if (
    digits.startsWith(
      "0"
    )
  ) {
    return `90${digits.slice(1)}`;
  }


  return `90${digits}`;
}


function operationDate(
  row: OperationRow
) {

  if (
    !row.service_date ||
    !row.service_time
  ) {
    return null;
  }


  return new Date(
    `${row.service_date}T${row.service_time}`
  );
}


function minutesUntil(
  row: OperationRow
) {

  const serviceDate =
    operationDate(
      row
    );


  if (!serviceDate) {
    return null;
  }


  return Math.floor(
    (
      serviceDate.getTime() -
      Date.now()
    ) /
    60000
  );
}


function isCompleted(
  row: OperationRow
) {

  return [
    "completed",
    "used",
  ].includes(
    row.status
  );
}


function isUnconfirmed(
  row: OperationRow
) {

  if (
    row.source ===
    "package"
  ) {

    return ![
      "confirmed",
      "completed",
      "cancelled",
    ].includes(
      row.status
    );
  }


  return [
    "new",
    "pending",
  ].includes(
    row.status
  );
}


function isOverdue(
  row: OperationRow
) {

  const minutes =
    minutesUntil(
      row
    );

  return (
    minutes !== null &&
    minutes < 0 &&
    !isCompleted(row) &&
    row.status !== "cancelled"
  );
}


function isApproaching(
  row: OperationRow
) {

  const minutes =
    minutesUntil(
      row
    );


  return (
    minutes !== null &&
    minutes > 0 &&
    minutes <= 180 &&
    !isCompleted(
      row
    )
  );
}


function statusLabel(
  row: OperationRow
) {

  const labels:
    Record<
      string,
      string
    > = {

      pending:
        "Bekliyor",

      requested:
        "Talep Gönderildi",

      confirmed:
        "Onaylandı",

      completed:
        "Tamamlandı",

      cancelled:
        "İptal",

      new:
        "Yeni",

      in_service:
        "Hizmet Başladı",
    };


  return (
    labels[row.status] ||
    row.status ||
    "-"
  );
}


export default function OperationsControlTowerPage() {

  const [
    rows,
    setRows,
  ] =
    useState<OperationRow[]>([]);


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
    filter,
    setFilter,
  ] =
    useState<FilterType>(
      "all"
    );


  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState("");


  const [
    actionMessage,
    setActionMessage,
  ] =
    useState("");


  const [
    savingId,
    setSavingId,
  ] =
    useState("");


  const [
    lastRefresh,
    setLastRefresh,
  ] =
    useState(new Date());


  const [
    secondsToRefresh,
    setSecondsToRefresh,
  ] =
    useState(30);


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
            await supabase.auth
              .getUser();


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


          const today =
            todayLocal();


          const [
            bookingResult,
            itemResult,
            extraOrderResult,
            extraItemResult,
            supplierResult,
            alertResult,
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
                  today
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
                  today
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
                .select(`
                  id,
                  name,
                  phone,
                  whatsapp_phone
                `)
                .eq(
                  "company_id",
                  companyId
                ),


              supabase
                .from(
                  "package_supplier_notifications"
                )
                .select(`
                  id,
                  source,
                  source_id,
                  priority,
                  status,
                  title
                `)
                .eq(
                  "company_id",
                  companyId
                )
                .eq(
                  "status",
                  "unread"
                ),
            ]);


          const results = [
            bookingResult,
            itemResult,
            extraOrderResult,
            extraItemResult,
            supplierResult,
            alertResult,
          ];


          const failed =
            results.find(
              result =>
                result.error
            );


          if (
            failed?.error
          ) {
            throw failed.error;
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


          const alerts =
            (
              alertResult.data ??
              []
            ) as AlertRow[];


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
                  supplier,
                ]
              )
            );


          const alertMap =
            new Map<
              string,
              AlertRow
            >();


          for (
            const alert of
            alerts
          ) {

            if (
              !alert.source_id
            ) {
              continue;
            }


            const key =
              `${alert.source}:${alert.source_id}`;


            const current =
              alertMap.get(
                key
              );


            if (
              !current ||
              (
                alert.priority ===
                "critical"
              ) ||
              (
                alert.priority ===
                "high" &&
                current.priority ===
                "normal"
              )
            ) {

              alertMap.set(
                key,
                alert
              );
            }
          }


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


                    const supplier =
                      item.supplier_id
                        ? supplierMap.get(
                            item.supplier_id
                          )
                        : undefined;


                    const alert =
                      alertMap.get(
                        `package:${item.id}`
                      );


                    return {

                      id:
                        `package-${item.id}`,

                      raw_id:
                        item.id,

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
                        supplier?.name ||
                        (
                          item.supplier_id
                            ? "Tedarikçi"
                            : "Atanmamış"
                        ),

                      supplier_phone:
                        supplier?.whatsapp_phone ||
                        supplier?.phone ||
                        null,

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

                      priority:
                        alert?.priority ||
                        "normal",

                      alert_title:
                        alert?.title ||
                        null,
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

            const current =
              extraItemsByOrder.get(
                item.order_id
              ) || [];


            current.push(
              item
            );


            extraItemsByOrder.set(
              item.order_id,
              current
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
              ) || [];


            for (
              const item of
              items
            ) {

              const supplier =
                item.supplier_id
                  ? supplierMap.get(
                      item.supplier_id
                    )
                  : undefined;


              const alert =
                alertMap.get(
                  `extra:${item.id}`
                );


              extraRows.push({

                id:
                  `extra-${item.id}`,

                raw_id:
                  item.id,

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
                  supplier?.name ||
                  (
                    item.supplier_id
                      ? "Tedarikçi"
                      : "Atanmamış"
                  ),

                supplier_phone:
                  supplier?.whatsapp_phone ||
                  supplier?.phone ||
                  null,

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

                priority:
                  alert?.priority ||
                  "normal",

                alert_title:
                  alert?.title ||
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
                ) => {

                  const priorityScore =
                    (
                      value:
                        OperationRow[
                          "priority"
                        ]
                    ) =>
                      value ===
                        "critical"
                        ? 0
                        : value ===
                          "high"
                          ? 1
                          : 2;


                  const priorityDiff =
                    priorityScore(
                      a.priority
                    ) -
                    priorityScore(
                      b.priority
                    );


                  if (
                    priorityDiff !==
                    0
                  ) {
                    return priorityDiff;
                  }


                  return (
                    a.service_time ||
                    "99:99"
                  ).localeCompare(
                    b.service_time ||
                    "99:99"
                  );
                }
              );


          setRows(
            combined
          );


        } catch (error) {

          setRows(
            []
          );


          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Kontrol kulesi hazırlanamadı."
          );
        }


        setLastRefresh(
          new Date()
        );

        setSecondsToRefresh(
          30
        );

        setLoading(
          false
        );

      },
      []
    );


  useEffect(() => {

    void loadData();

  }, [
    loadData,
  ]);


  useEffect(() => {

    const AUTO_LIVE_REFRESH_11IK =
      window.setInterval(
        () => {
          setSecondsToRefresh(
            current => {
              if (current <= 1) {
                void loadData();
                return 30;
              }

              return current - 1;
            }
          );
        },
        1000
      );

    return () => {
      window.clearInterval(
        AUTO_LIVE_REFRESH_11IK
      );
    };

  }, [
    loadData,
  ]);


  const stats =
    useMemo(
      () => {

        return {

          total:
            rows.length,

          critical:
            rows.filter(
              row =>
                row.priority ===
                "critical"
            ).length,

          overdue:
            rows.filter(
              isOverdue
            ).length,

          unconfirmed:
            rows.filter(
              isUnconfirmed
            ).length,

          approaching:
            rows.filter(
              isApproaching
            ).length,

          completed:
            rows.filter(
              isCompleted
            ).length,
        };

      },
      [
        rows,
      ]
    );


  const filteredRows =
    useMemo(
      () => {

        const query =
          search
            .trim()
            .toLocaleLowerCase(
              "tr-TR"
            );


        return rows.filter(
          row => {

            if (
              filter ===
                "critical" &&
              row.priority !==
                "critical"
            ) {
              return false;
            }


            if (
              filter ===
                "overdue" &&
              !isOverdue(
                row
              )
            ) {
              return false;
            }


            if (
              filter ===
                "unconfirmed" &&
              !isUnconfirmed(
                row
              )
            ) {
              return false;
            }


            if (
              filter ===
                "approaching" &&
              !isApproaching(
                row
              )
            ) {
              return false;
            }


            if (
              filter ===
                "completed" &&
              !isCompleted(
                row
              )
            ) {
              return false;
            }


            if (!query) {
              return true;
            }


            return [
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
              );
          }
        );

      },
      [
        rows,
        search,
        filter,
      ]
    );


  async function updateOperationStatus(
    row: OperationRow,
    status: string
  ) {

    setSavingId(
      row.id
    );

    setActionMessage(
      ""
    );

    setErrorMessage(
      ""
    );


    const {
      error,
    } =
      await supabase.rpc(
        "update_package_operation_admin",
        {

          p_source:
            row.source,

          p_item_id:
            row.raw_id,

          p_status:
            status,
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


    setActionMessage(
      `${row.service_name} operasyon durumu güncellendi.`
    );


    await loadData();


    setSavingId(
      ""
    );
  }


  async function sendSupplierWhatsApp(
    row: OperationRow
  ) {

    if (
      !row.supplier_id
    ) {

      setActionMessage(
        "Bu operasyona henüz tedarikçi atanmadı."
      );

      return;
    }


    if (
      !row.supplier_phone
    ) {

      setActionMessage(
        `${row.supplier_name} için WhatsApp/telefon bilgisi bulunmuyor.`
      );

      return;
    }


    setSavingId(
      row.id
    );


    const {
      data,
      error,
    } =
      await supabase.rpc(
        "ensure_package_supplier_portal",
        {
          p_supplier_id:
            row.supplier_id,
        }
      );


    if (
      error ||
      !data
    ) {

      setActionMessage(
        error?.message ||
        "Tedarikçi portal bağlantısı oluşturulamadı."
      );

      setSavingId(
        ""
      );

      return;
    }


    const portal =
      data as {
        portal_token:
          string;
      };


    const portalUrl =
      `${window.location.origin}` +
      `/tedarikci/${portal.portal_token}`;


    const text =
      [
        `Merhaba ${row.supplier_name},`,
        "",
        "TUROBUS operasyon hatırlatması:",
        "",
        `Hizmet: ${row.service_name}`,
        row.service_date
          ? `Tarih: ${row.service_date}`
          : "",
        row.service_time
          ? `Saat: ${row.service_time.slice(0, 5)}`
          : "",
        `Rezervasyon: ${row.booking_code}`,
        "",
        "Operasyonu görüntülemek ve durumunu güncellemek için:",
        portalUrl,
      ]
        .filter(
          Boolean
        )
        .join(
          "\n"
        );


    window.open(
      `https://wa.me/${normalizePhone(
        row.supplier_phone
      )}?text=${encodeURIComponent(
        text
      )}`,
      "_blank",
      "noopener,noreferrer"
    );


    setActionMessage(
      `${row.supplier_name} için WhatsApp mesajı hazırlandı.`
    );


    setSavingId(
      ""
    );
  }


  if (loading) {

    return (
      <main className="flex min-h-[70vh] items-center justify-center text-slate-300">
        Operasyon Kontrol Kulesi hazırlanıyor...
      </main>
    );
  }


  return (
    <main className="min-h-screen bg-slate-950 p-5 text-white md:p-8">

      <div className="mx-auto max-w-[1500px]">

        <section className="rounded-[32px] border border-white/10 bg-slate-900 p-6 md:p-8">

          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">

            <div>

              <p className="text-xs font-black uppercase tracking-[0.28em] text-orange-400">
                TUROBUS PACKAGE OS
              </p>


              <h1 className="mt-3 text-3xl font-black md:text-5xl">
                Operasyon Kontrol Kulesi
              </h1>


              <p className="mt-3 max-w-3xl text-slate-400">
                Bugünkü paket ve ekstra operasyonları,
                kritik uyarıları, tedarikçi onaylarını
                ve yaklaşan hizmetleri tek ekrandan yönetin.
              </p>

            </div>


            <div className="flex flex-wrap gap-2">

              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-black text-emerald-300">

                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400" />

                CANLI

                <span className="text-xs text-emerald-400/70">
                  {secondsToRefresh}s
                </span>

              </div>


              <button
                type="button"
                onClick={() =>
                  void loadData()
                }
                className="rounded-xl bg-white px-5 py-3 text-sm font-black text-slate-950"
              >
                Yenile
              </button>


              <Link
                href="/dashboard/package-os/supplier-alerts"
                className="rounded-xl border border-orange-500/30 bg-orange-500/10 px-5 py-3 text-sm font-black text-orange-300"
              >
                Tedarikçi Uyarıları
              </Link>


              <Link
                href="/dashboard/package-os/operations"
                className="rounded-xl border border-white/10 px-5 py-3 text-sm font-black"
              >
                Tüm Operasyonlar
              </Link>

            </div>

          </div>

        </section>


        {
          errorMessage &&
          (
            <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-300">
              {errorMessage}
            </div>
          )
        }


        {
          actionMessage &&
          (
            <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-300">
              {actionMessage}
            </div>
          )
        }


        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">

          <StatCard
            title="Bugünkü Toplam"
            value={stats.total}
            active={
              filter ===
              "all"
            }
            onClick={() =>
              setFilter(
                "all"
              )
            }
          />


          <StatCard
            title="Kritik"
            value={stats.critical}
            tone="critical"
            active={
              filter ===
              "critical"
            }
            onClick={() =>
              setFilter(
                "critical"
              )
            }
          />


          <StatCard
            title="Geciken"
            value={stats.overdue}
            tone="critical"
            active={
              filter ===
              "overdue"
            }
            onClick={() =>
              setFilter(
                "overdue"
              )
            }
          />


          <StatCard
            title="Onay Bekleyen"
            value={stats.unconfirmed}
            tone="warning"
            active={
              filter ===
              "unconfirmed"
            }
            onClick={() =>
              setFilter(
                "unconfirmed"
              )
            }
          />


          <StatCard
            title="3 Saat İçinde"
            value={stats.approaching}
            tone="warning"
            active={
              filter ===
              "approaching"
            }
            onClick={() =>
              setFilter(
                "approaching"
              )
            }
          />


          <StatCard
            title="Tamamlanan"
            value={stats.completed}
            tone="success"
            active={
              filter ===
              "completed"
            }
            onClick={() =>
              setFilter(
                "completed"
              )
            }
          />

        </section>


        <section className="mt-6 rounded-[26px] border border-white/10 bg-slate-900 p-5">

          <div className="grid gap-3 md:grid-cols-[1fr_auto]">

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
              placeholder="Müşteri, rezervasyon, tedarikçi veya hizmet ara..."
              className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3 outline-none"
            />


            <div className="flex items-center rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm font-bold text-slate-400">
              Bugün · {todayLocal()} · Son güncelleme{" "}
              {lastRefresh.toLocaleTimeString(
                "tr-TR",
                {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                }
              )}
            </div>

          </div>

        </section>


        <section className="mt-6 space-y-4">

          {
            filteredRows.map(
              row => {

                const overdue =
                  isOverdue(
                    row
                  );


                const approaching =
                  isApproaching(
                    row
                  );


                const unconfirmed =
                  isUnconfirmed(
                    row
                  );


                const completed =
                  isCompleted(
                    row
                  );


                const minutes =
                  minutesUntil(
                    row
                  );


                return (
                  <article
                    key={
                      row.id
                    }
                    className={`rounded-[26px] border p-5 md:p-6 ${
                      overdue ||
                      row.priority ===
                        "critical"
                        ? "border-red-500/40 bg-red-500/[0.09]"
                        : approaching
                          ? "border-amber-500/30 bg-amber-500/[0.05]"
                          : "border-white/10 bg-slate-900"
                    }`}
                  >

                    <div className="grid gap-5 xl:grid-cols-[110px_1fr_230px_240px] xl:items-center">


                      <div>

                        <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                          Saat
                        </p>


                        <p className="mt-1 text-3xl font-black">
                          {
                            row.service_time
                              ? row.service_time.slice(
                                  0,
                                  5
                                )
                              : "--:--"
                          }
                        </p>


                        {
                          overdue &&
                          minutes !== null
                            ? (
                              <p className="mt-2 text-xs font-black text-red-300">
                                {Math.abs(minutes)} dk gecikti
                              </p>
                            )
                            : minutes !== null &&
                              minutes > 0 &&
                              minutes <= 180
                              ? (
                                <p className="mt-2 text-xs font-black text-amber-300">
                                  {minutes} dk kaldı
                                </p>
                              )
                              : null
                        }

                      </div>


                      <div>

                        <div className="flex flex-wrap gap-2">

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-black ${
                              row.source ===
                                "extra"
                                ? "bg-cyan-500/10 text-cyan-300"
                                : "bg-violet-500/10 text-violet-300"
                            }`}
                          >
                            {
                              row.source ===
                                "extra"
                                ? "EKSTRA"
                                : "PAKET"
                            }
                          </span>


                          {
                            row.priority ===
                              "critical" &&
                            (
                              <span className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-black text-red-300">
                                KRİTİK
                              </span>
                            )
                          }


                          {
                            approaching &&
                            (
                              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-black text-amber-300">
                                YAKLAŞIYOR
                              </span>
                            )
                          }


                          {
                            unconfirmed &&
                            (
                              <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-black text-orange-300">
                                ONAY BEKLİYOR
                              </span>
                            )
                          }


                          {
                            completed &&
                            (
                              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-300">
                                TAMAMLANDI
                              </span>
                            )
                          }

                        </div>


                        <h2 className="mt-3 text-xl font-black md:text-2xl">
                          {row.service_name}
                        </h2>


                        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">

                          <span>
                            <strong className="text-slate-500">
                              Rez:
                            </strong>{" "}
                            {row.booking_code}
                          </span>


                          <span>
                            <strong className="text-slate-500">
                              Müşteri:
                            </strong>{" "}
                            {row.customer_name}
                          </span>


                          <span>
                            <strong className="text-slate-500">
                              Kişi:
                            </strong>{" "}
                            {row.quantity}
                          </span>

                        </div>


                        {
                          row.alert_title &&
                          (
                            <p className="mt-3 text-sm font-bold text-red-300">
                              ⚠ {row.alert_title}
                            </p>
                          )
                        }

                      </div>


                      <div>

                        <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                          Tedarikçi
                        </p>


                        <p className="mt-2 font-black">
                          {row.supplier_name}
                        </p>


                        <p className="mt-2 text-sm text-slate-400">
                          {statusLabel(row)}
                        </p>

                      </div>


                      <div className="flex flex-wrap gap-2 xl:justify-end">

                        {
                          row.customer_phone &&
                          (
                            <a
                              href={`tel:${row.customer_phone}`}
                              className="rounded-xl border border-white/10 px-4 py-3 text-sm font-black"
                            >
                              Müşteriyi Ara
                            </a>
                          )
                        }


                        <Link
                          href={`/dashboard/package-os/control-tower/${row.source}/${row.raw_id}`}
                          className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm font-black text-blue-300"
                        >
                          Notlar / Geçmiş
                        </Link>


                        {
                          row.source ===
                            "package" &&
                          ![
                            "confirmed",
                            "completed",
                            "cancelled",
                          ].includes(
                            row.status
                          ) &&
                          (
                            <button
                              type="button"
                              disabled={
                                savingId ===
                                row.id
                              }
                              onClick={() =>
                                void updateOperationStatus(
                                  row,
                                  "confirmed"
                                )
                              }
                              className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-black text-emerald-300 disabled:opacity-40"
                            >
                              Operasyonu Onayla
                            </button>
                          )
                        }


                        {
                          row.source ===
                            "extra" &&
                          ![
                            "confirmed",
                            "in_service",
                            "completed",
                            "cancelled",
                          ].includes(
                            row.status
                          ) &&
                          (
                            <button
                              type="button"
                              disabled={
                                savingId ===
                                row.id
                              }
                              onClick={() =>
                                void updateOperationStatus(
                                  row,
                                  "confirmed"
                                )
                              }
                              className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-black text-emerald-300 disabled:opacity-40"
                            >
                              Operasyonu Onayla
                            </button>
                          )
                        }


                        {
                          row.source ===
                            "extra" &&
                          row.status ===
                            "confirmed" &&
                          (
                            <button
                              type="button"
                              disabled={
                                savingId ===
                                row.id
                              }
                              onClick={() =>
                                void updateOperationStatus(
                                  row,
                                  "in_service"
                                )
                              }
                              className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm font-black text-cyan-300 disabled:opacity-40"
                            >
                              Başladı
                            </button>
                          )
                        }


                        {
                          ![
                            "completed",
                            "cancelled",
                          ].includes(
                            row.status
                          ) &&
                          (
                            <button
                              type="button"
                              disabled={
                                savingId ===
                                row.id
                              }
                              onClick={() =>
                                void updateOperationStatus(
                                  row,
                                  "completed"
                                )
                              }
                              className="rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-3 text-sm font-black text-violet-300 disabled:opacity-40"
                            >
                              Tamamlandı
                            </button>
                          )
                        }


                        {
                          ![
                            "completed",
                            "cancelled",
                          ].includes(
                            row.status
                          ) &&
                          (
                            <button
                              type="button"
                              disabled={
                                savingId ===
                                row.id
                              }
                              onClick={() => {

                                const confirmed =
                                  window.confirm(
                                    `${row.service_name} operasyonunu iptal etmek istiyor musunuz?`
                                  );

                                if (
                                  confirmed
                                ) {
                                  void updateOperationStatus(
                                    row,
                                    "cancelled"
                                  );
                                }

                              }}
                              className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-black text-red-300 disabled:opacity-40"
                            >
                              İptal
                            </button>
                          )
                        }


                        <button
                          type="button"
                          disabled={
                            savingId ===
                            row.id
                          }
                          onClick={() =>
                            void sendSupplierWhatsApp(
                              row
                            )
                          }
                          className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-black text-black disabled:opacity-40"
                        >
                          WhatsApp
                        </button>


                        <Link
                          href="/dashboard/package-os/supplier-alerts"
                          className="rounded-xl border border-orange-500/20 px-4 py-3 text-sm font-black text-orange-300"
                        >
                          Uyarılar
                        </Link>

                      </div>

                    </div>

                  </article>
                );
              }
            )
          }


          {
            filteredRows.length ===
              0 &&
            (
              <div className="rounded-[26px] border border-white/10 bg-slate-900 p-12 text-center">

                <p className="text-lg font-black">
                  Bu filtrede operasyon bulunmuyor.
                </p>


                <p className="mt-2 text-sm text-slate-500">
                  Filtreyi değiştirebilir veya aramayı temizleyebilirsiniz.
                </p>

              </div>
            )
          }

        </section>

      </div>

    </main>
  );
}


function StatCard({
  title,
  value,
  tone = "default",
  active,
  onClick,
}: {
  title: string;

  value: number;

  tone?:
    | "default"
    | "critical"
    | "warning"
    | "success";

  active: boolean;

  onClick:
    () => void;
}) {

  const classes = {

    default:
      "border-white/10 bg-slate-900",

    critical:
      "border-red-500/25 bg-red-500/[0.08]",

    warning:
      "border-amber-500/25 bg-amber-500/[0.07]",

    success:
      "border-emerald-500/25 bg-emerald-500/[0.07]",
  };


  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={`rounded-[24px] border p-5 text-left transition ${
        classes[tone]
      } ${
        active
          ? "ring-2 ring-orange-500/60"
          : ""
      }`}
    >

      <p className="text-xs font-black uppercase tracking-wider text-slate-400">
        {title}
      </p>


      <p className="mt-2 text-3xl font-black">
        {value}
      </p>

    </button>
  );
}
