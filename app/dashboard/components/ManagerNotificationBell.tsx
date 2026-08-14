"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  FaBell,
  FaCheckDouble,
} from "react-icons/fa";

import {
  supabase,
} from "@/lib/supabase";


type NotificationRow = {
  id: string;

  notification_type:
    string;

  severity:
    "info" |
    "warning" |
    "critical";

  title:
    string;

  body:
    string | null;

  href:
    string | null;

  source_alert_id:
    string | null;

  escalation_level:
    number | null;

  read_at:
    string | null;

  created_at:
    string;
};


function dateTime(
  value:
    string
) {

  return new Intl.DateTimeFormat(
    "tr-TR",
    {
      dateStyle:
        "short",

      timeStyle:
        "short",
    }
  ).format(
    new Date(
      value
    )
  );
}


export default function
ManagerNotificationBell({
  companyId,
}: {
  companyId:
    string;
}) {

  const [
    open,
    setOpen,
  ] =
    useState(
      false
    );


  const [
    notifications,
    setNotifications,
  ] =
    useState<
      NotificationRow[]
    >(
      []
    );


  const [
    unread,
    setUnread,
  ] =
    useState(
      0
    );


  const [
    critical,
    setCritical,
  ] =
    useState(
      0
    );


  const [
    loading,
    setLoading,
  ] =
    useState(
      false
    );


  const wrapperRef =
    useRef<
      HTMLDivElement |
      null
    >(
      null
    );


  const loadSummary =
    useCallback(
      async () => {

        const result =
          await supabase.rpc(
            "get_my_package_notification_summary",
            {
              p_company_id:
                companyId,
            }
          );


        if (result.error) {

          console.error(
            "Bildirim sayacı yüklenemedi:",
            result.error.message
          );

          return;
        }


        setUnread(
          Number(
            result.data?.unread ??
            0
          )
        );


        setCritical(
          Number(
            result.data?.critical ??
            0
          )
        );

      },
      [
        companyId,
      ]
    );


  const loadNotifications =
    useCallback(
      async () => {

        setLoading(
          true
        );


        const result =
          await supabase.rpc(
            "get_my_package_manager_notifications",
            {
              p_company_id:
                companyId,

              p_limit:
                30,
            }
          );


        if (result.error) {

          console.error(
            "Bildirimler yüklenemedi:",
            result.error.message
          );

          setLoading(
            false
          );

          return;
        }


        setNotifications(
          (
            result.data ??
            []
          ) as NotificationRow[]
        );


        setLoading(
          false
        );

      },
      [
        companyId,
      ]
    );


  const refresh =
    useCallback(
      async () => {

        await Promise.all([
          loadSummary(),
          open
            ? loadNotifications()
            : Promise.resolve(),
        ]);

      },
      [
        loadSummary,
        loadNotifications,
        open,
      ]
    );


  useEffect(
    () => {

      void loadSummary();


      const timer =
        window.setInterval(
          () => {
            void loadSummary();
          },
          30000
        );


      return () => {
        window.clearInterval(
          timer
        );
      };

    },
    [
      loadSummary,
    ]
  );


  useEffect(
    () => {

      if (open) {
        void loadNotifications();
      }

    },
    [
      open,
      loadNotifications,
    ]
  );


  useEffect(
    () => {

      function outside(
        event:
          MouseEvent
      ) {

        if (
          wrapperRef.current &&
          !wrapperRef.current.contains(
            event.target as Node
          )
        ) {
          setOpen(
            false
          );
        }

      }


      document.addEventListener(
        "mousedown",
        outside
      );


      return () => {

        document.removeEventListener(
          "mousedown",
          outside
        );

      };

    },
    []
  );


  async function action(
    actionName:
      "read" |
      "unread" |
      "read_all",
    notificationId?:
      string
  ) {

    const result =
      await supabase.rpc(
        "package_manager_notification_action",
        {
          p_company_id:
            companyId,

          p_notification_id:
            notificationId ??
            null,

          p_action:
            actionName,
        }
      );


    if (result.error) {

      console.error(
        "Bildirim işlemi başarısız:",
        result.error.message
      );

      return;
    }


    await Promise.all([
      loadSummary(),
      loadNotifications(),
    ]);
  }


  async function openNotification(
    notification:
      NotificationRow
  ) {

    if (
      !notification.read_at
    ) {

      await action(
        "read",
        notification.id
      );

    }


    setOpen(
      false
    );
  }


  return (
    <div
      ref={
        wrapperRef
      }
      className="relative"
    >

      <button
        type="button"
        aria-label="Bildirimler"
        onClick={
          () =>
            setOpen(
              value =>
                !value
            )
        }
        className={`relative flex h-11 w-11 items-center justify-center rounded-xl border transition ${
          critical >
            0
            ? "border-red-500/40 bg-red-500/15 text-red-300"
            : unread >
                0
              ? "border-orange-500/30 bg-orange-500/10 text-orange-300"
              : "border-white/10 bg-white/[0.04] text-slate-400"
        }`}
      >

        <FaBell />


        {
          unread >
            0 &&
          (
            <span className="absolute -right-2 -top-2 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[9px] font-black text-white ring-2 ring-slate-950">
              {
                unread >
                  99
                  ? "99+"
                  : unread
              }
            </span>
          )
        }

      </button>


      {
        open &&
        (
          <div className="absolute right-0 top-14 z-[80] w-[min(92vw,430px)] overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl shadow-black/50">

            <div className="flex items-center justify-between border-b border-white/10 p-4">

              <div>

                <p className="text-sm font-black text-white">
                  Yönetici Bildirimleri
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {
                    unread
                  }
                  {" okunmamış"}
                </p>

              </div>


              {
                unread >
                  0 &&
                (
                  <button
                    type="button"
                    onClick={
                      () =>
                        void action(
                          "read_all"
                        )
                    }
                    className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-[11px] font-black text-slate-300"
                  >
                    <FaCheckDouble />

                    Tümünü Oku
                  </button>
                )
              }

            </div>


            <div className="max-h-[520px] overflow-y-auto">

              {
                loading
                  ? (
                      <div className="p-8 text-center text-sm text-slate-500">
                        Bildirimler hazırlanıyor...
                      </div>
                    )
                  : notifications.length ===
                      0
                    ? (
                        <div className="p-8 text-center text-sm text-slate-500">
                          Henüz yönetici bildirimi yok.
                        </div>
                      )
                    : notifications.map(
                        notification => {

                          const content =
                            (
                              <div
                                className={`border-b border-white/5 p-4 transition hover:bg-white/[0.04] ${
                                  !notification.read_at
                                    ? notification.severity ===
                                        "critical"
                                      ? "bg-red-500/[0.07]"
                                      : "bg-orange-500/[0.05]"
                                    : ""
                                }`}
                              >

                                <div className="flex items-start gap-3">

                                  <div
                                    className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                                      notification.severity ===
                                        "critical"
                                        ? "bg-red-500"
                                        : notification.severity ===
                                            "warning"
                                          ? "bg-orange-400"
                                          : "bg-cyan-400"
                                    }`}
                                  />


                                  <div className="min-w-0 flex-1">

                                    <div className="flex flex-wrap items-center gap-2">

                                      {
                                        notification.escalation_level &&
                                        (
                                          <span
                                            className={`rounded-full px-2 py-1 text-[9px] font-black ${
                                              notification.escalation_level ===
                                                3
                                                ? "bg-red-500 text-white"
                                                : "bg-amber-500/15 text-amber-300"
                                            }`}
                                          >
                                            {
                                              `L${notification.escalation_level}`
                                            }
                                          </span>
                                        )
                                      }


                                      {
                                        !notification.read_at &&
                                        (
                                          <span className="rounded-full bg-cyan-500/15 px-2 py-1 text-[9px] font-black text-cyan-300">
                                            YENİ
                                          </span>
                                        )
                                      }

                                    </div>


                                    <p className="mt-2 text-sm font-black text-white">
                                      {
                                        notification.title
                                      }
                                    </p>


                                    {
                                      notification.body &&
                                      (
                                        <p className="mt-1 line-clamp-3 text-xs leading-5 text-slate-400">
                                          {
                                            notification.body
                                          }
                                        </p>
                                      )
                                    }


                                    <div className="mt-2 flex items-center justify-between gap-3">

                                      <span className="text-[10px] text-slate-600">
                                        {
                                          dateTime(
                                            notification.created_at
                                          )
                                        }
                                      </span>


                                      {
                                        notification.read_at
                                          ? (
                                              <button
                                                type="button"
                                                onClick={
                                                  event => {
                                                    event.preventDefault();
                                                    event.stopPropagation();

                                                    void action(
                                                      "unread",
                                                      notification.id
                                                    );
                                                  }
                                                }
                                                className="text-[10px] font-black text-slate-500 hover:text-white"
                                              >
                                                Okunmadı yap
                                              </button>
                                            )
                                          : (
                                              <button
                                                type="button"
                                                onClick={
                                                  event => {
                                                    event.preventDefault();
                                                    event.stopPropagation();

                                                    void action(
                                                      "read",
                                                      notification.id
                                                    );
                                                  }
                                                }
                                                className="text-[10px] font-black text-cyan-400"
                                              >
                                                Okundu
                                              </button>
                                            )
                                      }

                                    </div>

                                  </div>

                                </div>

                              </div>
                            );


                          if (
                            notification.href
                          ) {

                            return (
                              <Link
                                key={
                                  notification.id
                                }
                                href={
                                  notification.href
                                }
                                onClick={
                                  () =>
                                    void openNotification(
                                      notification
                                    )
                                }
                              >
                                {
                                  content
                                }
                              </Link>
                            );

                          }


                          return (
                            <div
                              key={
                                notification.id
                              }
                            >
                              {
                                content
                              }
                            </div>
                          );

                        }
                      )
              }

            </div>


            <div className="border-t border-white/10 p-3">

              <Link
                href="/dashboard/package-os/alarm-center"
                onClick={
                  () =>
                    setOpen(
                      false
                    )
                }
                className="block rounded-xl bg-red-500 px-4 py-3 text-center text-xs font-black text-white"
              >
                Operasyon Alarm Merkezini Aç →
              </Link>

            </div>

          </div>
        )
      }

    </div>
  );
}
