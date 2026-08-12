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


type NotificationStatus =
  | "unread"
  | "read"
  | "dismissed";


type Notification = {

  id: string;

  company_id: string;

  supplier_id: string;

  source:
    | "package"
    | "extra"
    | "system";

  source_id:
    string | null;

  title: string;

  message:
    string | null;

  notification_type: string;

  priority:
    | "normal"
    | "high"
    | "critical";

  status:
    NotificationStatus;

  metadata:
    Record<string, unknown>;

  created_at: string;
};


type Supplier = {
  id: string;
  name: string;

  phone:
    string | null;

  whatsapp_phone:
    string | null;
};


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
    return `90${digits.slice(
      1
    )}`;
  }


  return `90${digits}`;
}


export default function SupplierAlertsPage() {

  const [
    notifications,
    setNotifications,
  ] =
    useState<Notification[]>([]);


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
    filter,
    setFilter,
  ] =
    useState<
      NotificationStatus |
      "all"
    >(
      "unread"
    );


  const [
    search,
    setSearch,
  ] =
    useState("");


  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState("");


  const [
    savingId,
    setSavingId,
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


          const [
            notificationResult,
            supplierResult,
          ] =
            await Promise.all([

              supabase
                .from(
                  "package_supplier_notifications"
                )
                .select(`
                  id,
                  company_id,
                  supplier_id,
                  source,
                  source_id,
                  title,
                  message,
                  notification_type,
                  priority,
                  status,
                  metadata,
                  created_at
                `)
                .eq(
                  "company_id",
                  membership.company_id
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
                .select(`
                  id,
                  name,
                  phone,
                  whatsapp_phone
                `)
                .eq(
                  "company_id",
                  membership.company_id
                ),
            ]);


          if (
            notificationResult.error
          ) {
            throw notificationResult.error;
          }


          if (
            supplierResult.error
          ) {
            throw supplierResult.error;
          }


          setNotifications(
            (
              notificationResult.data ??
              []
            ) as Notification[]
          );


          setSuppliers(
            (
              supplierResult.data ??
              []
            ) as Supplier[]
          );


        } catch (error) {

          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Bildirim merkezi hazırlanamadı."
          );
        }


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


  const supplierMap =
    useMemo(
      () =>
        new Map(
          suppliers.map(
            supplier => [
              supplier.id,
              supplier,
            ]
          )
        ),
      [
        suppliers,
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


        return notifications.filter(
          notification => {

            if (
              filter !==
                "all" &&
              notification.status !==
                filter
            ) {
              return false;
            }


            if (!query) {
              return true;
            }


            const supplier =
              supplierMap.get(
                notification.supplier_id
              );


            return [
              notification.title,
              notification.message,
              supplier?.name,
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
        notifications,
        filter,
        search,
        supplierMap,
      ]
    );


  const unreadCount =
    notifications.filter(
      notification =>
        notification.status ===
        "unread"
    ).length;


  const criticalCount =
    notifications.filter(
      notification =>
        notification.status ===
          "unread"
        &&
        notification.priority ===
          "critical"
    ).length;


  const highCount =
    notifications.filter(
      notification =>
        notification.status ===
          "unread"
        &&
        notification.priority ===
          "high"
    ).length;


  async function mark(
    notification: Notification,
    status:
      | "read"
      | "dismissed"
  ) {

    setSavingId(
      notification.id
    );


    const {
      error,
    } =
      await supabase.rpc(
        "mark_package_supplier_notification",
        {
          p_notification_id:
            notification.id,

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


    setNotifications(
      current =>
        current.map(
          row =>
            row.id ===
              notification.id
              ? {
                  ...row,
                  status,
                }
              : row
        )
    );


    setSavingId(
      ""
    );
  }


  async function sendWhatsApp(
    notification:
      Notification
  ) {

    const supplier =
      supplierMap.get(
        notification.supplier_id
      );


    if (!supplier) {
      return;
    }


    const phone =
      supplier.whatsapp_phone ||
      supplier.phone;


    if (!phone) {

      setErrorMessage(
        `${supplier.name} için WhatsApp/telefon bilgisi yok.`
      );

      return;
    }


    setSavingId(
      notification.id
    );


    const {
      data,
      error,
    } =
      await supabase.rpc(
        "ensure_package_supplier_portal",
        {
          p_supplier_id:
            supplier.id,
        }
      );


    if (
      error ||
      !data
    ) {

      setErrorMessage(
        error?.message ||
          "Portal bağlantısı hazırlanamadı."
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


    const serviceName =
      String(
        notification.metadata
          ?.service_name ||
        notification.title
      );


    const serviceDate =
      String(
        notification.metadata
          ?.service_date ||
        ""
      );


    const serviceTime =
      String(
        notification.metadata
          ?.service_time ||
        ""
      ).slice(
        0,
        5
      );


    const text =
      [
        `Merhaba ${supplier.name},`,
        "",
        "TUROBUS üzerinden size yeni bir operasyon atanmıştır.",
        "",
        `Hizmet: ${serviceName}`,
        serviceDate
          ? `Tarih: ${serviceDate}`
          : "",
        serviceTime
          ? `Saat: ${serviceTime}`
          : "",
        "",
        "Operasyonu görüntülemek ve onaylamak için:",
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
        phone
      )}?text=${encodeURIComponent(
        text
      )}`,
      "_blank",
      "noopener,noreferrer"
    );


    await mark(
      notification,
      "read"
    );


    setSavingId(
      ""
    );
  }


  if (loading) {

    return (
      <main className="flex min-h-[70vh] items-center justify-center text-slate-300">
        Tedarikçi uyarıları hazırlanıyor...
      </main>
    );
  }


  return (
    <main className="min-h-screen bg-slate-950 p-5 text-white md:p-8">

      <div className="mx-auto max-w-7xl">

        <div className="rounded-[30px] border border-white/10 bg-slate-900 p-7 md:p-8">

          <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-400">
            TUROBUS PACKAGE OS
          </p>


          <h1 className="mt-3 text-3xl font-black md:text-5xl">
            Tedarikçi Uyarı Merkezi
          </h1>


          <p className="mt-3 max-w-3xl text-slate-400">
            Yeni atanmış operasyonları ve tedarikçi bildirimlerini tek merkezden takip edin.
          </p>


          <div className="mt-7 flex flex-wrap gap-3">

            <div className="rounded-2xl border border-orange-500/20 bg-orange-500/10 px-5 py-4">

              <p className="text-xs font-black uppercase text-orange-300">
                Okunmamış
              </p>

              <p className="mt-1 text-2xl font-black">
                {unreadCount}
              </p>

            </div>


            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4">

              <p className="text-xs font-black uppercase text-red-300">
                Kritik Uyarı
              </p>

              <p className="mt-1 text-2xl font-black text-red-200">
                {criticalCount}
              </p>

            </div>


            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-5 py-4">

              <p className="text-xs font-black uppercase text-amber-300">
                Yüksek Öncelik
              </p>

              <p className="mt-1 text-2xl font-black text-amber-200">
                {highCount}
              </p>

            </div>


            <Link
              href="/dashboard/package-os/supplier-portals"
              className="flex items-center rounded-xl border border-white/10 px-5 py-3 text-sm font-black"
            >
              Portal Linkleri →
            </Link>

          </div>

        </div>


        {errorMessage && (
          <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-300">
            {errorMessage}
          </div>
        )}


        <div className="mt-6 grid gap-4 rounded-[26px] border border-white/10 bg-slate-900 p-5 md:grid-cols-2">

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
            placeholder="Tedarikçi veya hizmet ara..."
            className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3 outline-none"
          />


          <select
            value={
              filter
            }
            onChange={
              event =>
                setFilter(
                  event.target.value as
                    | NotificationStatus
                    | "all"
                )
            }
            className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3 outline-none"
          >

            <option value="unread">
              İşlem Bekleyenler
            </option>

            <option value="read">
              Görülenler
            </option>

            <option value="dismissed">
              Kapatılanlar
            </option>

            <option value="all">
              Tümü
            </option>

          </select>

        </div>


        <div className="mt-6 space-y-4">

          {filtered.map(
            notification => {

              const supplier =
                supplierMap.get(
                  notification.supplier_id
                );


              return (
                <article
                  key={
                    notification.id
                  }
                  className="rounded-[26px] border border-white/10 bg-slate-900 p-5 md:p-6"
                >

                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

                    <div>

                      <h2 className="text-xl font-black">
                        {
                          notification.title
                        }
                      </h2>


                      <p className="mt-2 font-bold text-orange-300">
                        {
                          supplier?.name ||
                          "Tedarikçi"
                        }
                      </p>


                      {
                        notification.message &&
                        (
                          <p className="mt-2 text-sm text-slate-400">
                            {
                              notification.message
                            }
                          </p>
                        )
                      }

                    </div>


                    <div className="flex flex-wrap gap-2">

                      <button
                        type="button"
                        disabled={
                          savingId ===
                          notification.id
                        }
                        onClick={() =>
                          void sendWhatsApp(
                            notification
                          )
                        }
                        className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-black text-black disabled:opacity-40"
                      >
                        WhatsApp Gönder
                      </button>


                      {
                        notification.status ===
                        "unread" &&
                        (
                          <button
                            type="button"
                            onClick={() =>
                              void mark(
                                notification,
                                "read"
                              )
                            }
                            className="rounded-xl border border-white/10 px-5 py-3 text-sm font-black"
                          >
                            Görüldü
                          </button>
                        )
                      }


                      {
                        notification.status !==
                        "dismissed" &&
                        (
                          <button
                            type="button"
                            onClick={() =>
                              void mark(
                                notification,
                                "dismissed"
                              )
                            }
                            className="rounded-xl border border-red-500/20 px-5 py-3 text-sm font-black text-red-300"
                          >
                            Kapat
                          </button>
                        )
                      }

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
