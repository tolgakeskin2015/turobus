"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FaArrowRight,
  FaBolt,
  FaBoxOpen,
  FaBuilding,
  FaBus,
  FaCalendarAlt,
  FaChartLine,
  FaCheckCircle,
  FaClock,
  FaCreditCard,
  FaExclamationTriangle,
  FaHotel,
  FaMoneyBillWave,
  FaPlane,
  FaPlus,
  FaRoute,
  FaShip,
  FaStar,
  FaStore,
  FaSuitcaseRolling,
  FaUsers,
} from "react-icons/fa";

import {
  supabase,
} from "@/lib/supabase";

import {
  CurrentMembership,
  getCurrentMembership,
} from "@/lib/current-user";


type Tour = {
  id: string;
  status: string;
  created_at: string;
};


type Reservation = {
  id: string;
  reservation_code: string | null;
  status: string;
  total_price: number;
  created_at: string;
};


type ActivityBooking = {
  id: string;
  booking_code: string;
  customer_name: string;
  service_date: string;
  start_time: string | null;
  quantity: number;
  sale_total: number;
  paid_total: number;
  status: string;
  payment_status: string;
};


type ActivitySlot = {
  id: string;
  slot_date: string;
  capacity: number;
  reserved_count: number;
};


function money(
  value:
    number |
    null |
    undefined
) {

  return new Intl.NumberFormat(
    "tr-TR",
    {
      style: "currency",
      currency: "TRY",
      maximumFractionDigits: 0,
    }
  ).format(
    Number(
      value ?? 0
    )
  );

}


function todayKey() {

  const d =
    new Date();

  return [
    d.getFullYear(),
    String(
      d.getMonth() + 1
    ).padStart(
      2,
      "0"
    ),
    String(
      d.getDate()
    ).padStart(
      2,
      "0"
    ),
  ].join("-");

}


function dateText() {

  return new Intl.DateTimeFormat(
    "tr-TR",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  ).format(
    new Date()
  );

}


function roleLabel(
  role?: string
) {

  const labels:
    Record<
      string,
      string
    > = {
      super_admin:
        "Sistem Yöneticisi",

      company_owner:
        "Firma Sahibi",

      operation_manager:
        "Operasyon Yöneticisi",

      sales:
        "Satış",

      accounting:
        "Muhasebe",

      guide:
        "Rehber",

      driver:
        "Sürücü",
    };


  return labels[
    role ?? ""
  ] ??
    "Kullanıcı";

}


export default function Dashboard() {

  const [
    membership,
    setMembership,
  ] =
    useState<CurrentMembership | null>(
      null
    );


  const [
    tours,
    setTours,
  ] =
    useState<Tour[]>(
      []
    );


  const [
    reservations,
    setReservations,
  ] =
    useState<Reservation[]>(
      []
    );


  const [
    activityBookings,
    setActivityBookings,
  ] =
    useState<ActivityBooking[]>(
      []
    );


  const [
    activitySlots,
    setActivitySlots,
  ] =
    useState<ActivitySlot[]>(
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


  const load =
    useCallback(
      async () => {

        setLoading(
          true
        );

        setErrorMessage(
          ""
        );


        const {
          data:
            userData,
          error:
            userError,
        } =
          await supabase.auth.getUser();


        if (
          userError ||
          !userData.user
        ) {

          setErrorMessage(
            "Oturum bulunamadı."
          );

          setLoading(
            false
          );

          return;

        }


        const currentMembership =
          await getCurrentMembership(
            userData.user.id
          );


        if (
          !currentMembership
        ) {

          setErrorMessage(
            "Aktif firma üyeliği bulunamadı."
          );

          setLoading(
            false
          );

          return;

        }


        setMembership(
          currentMembership
        );


        const companyId =
          currentMembership.company_id;


        const today =
          todayKey();


        const [
          tourResult,
          reservationResult,
          activityBookingResult,
          activitySlotResult,
        ] =
          await Promise.all([

            supabase
              .from(
                "tours"
              )
              .select(
                "id,status,created_at"
              )
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
              ),

            supabase
              .from(
                "reservations"
              )
              .select(
                "id,reservation_code,status,total_price,created_at"
              )
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
                "activity_os_bookings"
              )
              .select(
                "id,booking_code,customer_name,service_date,start_time,quantity,sale_total,paid_total,status,payment_status"
              )
              .eq(
                "company_id",
                companyId
              )
              .order(
                "service_date",
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
                "package_activity_slots"
              )
              .select(
                "id,slot_date,capacity,reserved_count"
              )
              .eq(
                "company_id",
                companyId
              )
              .gte(
                "slot_date",
                today
              )
              .limit(
                500
              ),
          ]);


        if (
          tourResult.error
        ) {
          console.error(
            tourResult.error
          );
        }


        if (
          reservationResult.error
        ) {
          console.error(
            reservationResult.error
          );
        }


        if (
          activityBookingResult.error
        ) {
          console.error(
            activityBookingResult.error
          );
        }


        if (
          activitySlotResult.error
        ) {
          console.error(
            activitySlotResult.error
          );
        }


        setTours(
          (
            tourResult.data ??
            []
          ) as Tour[]
        );


        setReservations(
          (
            reservationResult.data ??
            []
          ) as Reservation[]
        );


        setActivityBookings(
          (
            activityBookingResult.data ??
            []
          ) as ActivityBooking[]
        );


        setActivitySlots(
          (
            activitySlotResult.data ??
            []
          ) as ActivitySlot[]
        );


        setLoading(
          false
        );

      },
      []
    );


  useEffect(
    () => {

      void load();


      const channel =
        supabase
          .channel(
            "turobus-main-dashboard"
          )
          .on(
            "postgres_changes",
            {
              event:
                "*",
              schema:
                "public",
              table:
                "reservations",
            },
            () => {
              void load();
            }
          )
          .on(
            "postgres_changes",
            {
              event:
                "*",
              schema:
                "public",
              table:
                "activity_os_bookings",
            },
            () => {
              void load();
            }
          )
          .on(
            "postgres_changes",
            {
              event:
                "*",
              schema:
                "public",
              table:
                "package_activity_slots",
            },
            () => {
              void load();
            }
          )
          .subscribe();


      return () => {
        void supabase.removeChannel(
          channel
        );
      };

    },
    [
      load,
    ]
  );


  const activeTours =
    useMemo(
      () =>
        tours.filter(
          (
            tour
          ) =>
            tour.status ===
            "active"
        ).length,
      [
        tours,
      ]
    );


  const pendingReservations =
    useMemo(
      () =>
        reservations.filter(
          (
            reservation
          ) =>
            reservation.status ===
            "pending"
        ).length,
      [
        reservations,
      ]
    );


  const tourRevenue =
    useMemo(
      () =>
        reservations.reduce(
          (
            total,
            reservation
          ) =>
            total +
            Number(
              reservation.total_price ??
              0
            ),
          0
        ),
      [
        reservations,
      ]
    );


  const activityRevenue =
    useMemo(
      () =>
        activityBookings.reduce(
          (
            total,
            booking
          ) =>
            total +
            Number(
              booking.sale_total ??
              0
            ),
          0
        ),
      [
        activityBookings,
      ]
    );


  const activityOutstanding =
    useMemo(
      () =>
        activityBookings.reduce(
          (
            total,
            booking
          ) =>
            total +
            Math.max(
              Number(
                booking.sale_total ??
                0
              ) -
              Number(
                booking.paid_total ??
                0
              ),
              0
            ),
          0
        ),
      [
        activityBookings,
      ]
    );


  const todayActivityBookings =
    useMemo(
      () =>
        activityBookings
          .filter(
            (
              booking
            ) =>
              booking.service_date ===
              todayKey() &&
              ![
                "cancelled",
                "no_show",
              ].includes(
                booking.status
              )
          )
          .sort(
            (
              a,
              b
            ) =>
              (
                a.start_time ??
                ""
              ).localeCompare(
                b.start_time ??
                ""
              )
          ),
      [
        activityBookings,
      ]
    );


  const todayActivityGuests =
    useMemo(
      () =>
        todayActivityBookings.reduce(
          (
            total,
            booking
          ) =>
            total +
            Number(
              booking.quantity ??
              0
            ),
          0
        ),
      [
        todayActivityBookings,
      ]
    );


  const totalFutureCapacity =
    useMemo(
      () =>
        activitySlots.reduce(
          (
            total,
            slot
          ) =>
            total +
            Math.max(
              Number(
                slot.capacity
              ) -
              Number(
                slot.reserved_count
              ),
              0
            ),
          0
        ),
      [
        activitySlots,
      ]
    );


  const totalRevenue =
    tourRevenue +
    activityRevenue;


  const systemCards = [
    {
      title:
        "Tur Operasyon",
      description:
        "Tur, rezervasyon, manifest ve operasyon akışı.",
      href:
        "/dashboard/command-center",
      icon:
        FaBus,
      badge:
        `${activeTours} aktif`,
    },
    {
      title:
        "Activity OS",
      description:
        "Canlı kontenjan, rezervasyon, ekip ve satış yönetimi.",
      href:
        "/dashboard/activity-os",
      icon:
        FaStar,
      badge:
        `${totalFutureCapacity} müsait`,
    },
    {
      title:
        "Hotel OS",
      description:
        "PMS, front office, oda, folio, kasa ve revenue.",
      href:
        "/dashboard/hotel/yonetim-merkezi",
      icon:
        FaHotel,
      badge:
        "PMS",
    },
    {
      title:
        "Villa OS",
      description:
        "Villa portföyü, rezervasyon ve B2B dağıtım merkezi.",
      href:
        "/dashboard/villa-os",
      icon:
        FaBuilding,
      badge:
        "B2B",
    },
    {
      title:
        "Package OS",
      description:
        "Paket oluşturma, teklif, operasyon ve tahsilat.",
      href:
        "/dashboard/package-os",
      icon:
        FaSuitcaseRolling,
      badge:
        "Paket",
    },
    {
      title:
        "Ödeme Merkezi",
      description:
        "Tahsilat, online ödeme, bakiye ve iade hareketleri.",
      href:
        "/dashboard/activity-payment-center",
      icon:
        FaCreditCard,
      badge:
        money(
          activityOutstanding
        ),
    },
  ];


  const quickActions = [
    {
      label:
        "Yeni Tur",
      href:
        "/dashboard/tur-ekle",
      icon:
        FaPlane,
    },
    {
      label:
        "Yeni Aktivite",
      href:
        "/dashboard/activity-os/products",
      icon:
        FaStar,
    },
    {
      label:
        "Yeni Paket",
      href:
        "/dashboard/package-os/builder",
      icon:
        FaBoxOpen,
    },
    {
      label:
        "Villa OS",
      href:
        "/dashboard/villa-os",
      icon:
        FaBuilding,
    },
    {
      label:
        "Operasyon",
      href:
        "/dashboard/command-center",
      icon:
        FaRoute,
    },
    {
      label:
        "Marketplace",
      href:
        "/",
      icon:
        FaStore,
    },
  ];


  if (
    loading
  ) {

    return (
      <main className="min-h-screen bg-[#05090f] p-5 text-white lg:p-8">

        <div className="mx-auto max-w-[1600px] space-y-5">

          <div className="h-40 animate-pulse rounded-[30px] bg-white/[.04]" />

          <div className="grid gap-4 md:grid-cols-4">
            {[1,2,3,4].map(
              (
                item
              ) => (
                <div
                  key={
                    item
                  }
                  className="h-32 animate-pulse rounded-3xl bg-white/[.04]"
                />
              )
            )}
          </div>

          <div className="h-[420px] animate-pulse rounded-[30px] bg-white/[.04]" />

        </div>

      </main>
    );

  }


  return (
    <main className="min-h-screen bg-[#05090f] text-white">

      <div className="mx-auto max-w-[1700px] px-4 py-5 md:px-6 lg:px-8 lg:py-7">


        {/* TOP BAR */}

        <section className="relative overflow-hidden rounded-[32px] border border-white/[.08] bg-gradient-to-br from-[#111820] via-[#0b1118] to-[#070b10] p-6 shadow-[0_30px_100px_rgba(0,0,0,.28)] lg:p-8">

          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-orange-500/[.08] blur-3xl" />

          <div className="relative flex flex-col justify-between gap-7 xl:flex-row xl:items-center">

            <div>

              <div className="flex flex-wrap items-center gap-3">

                <span className="rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[.18em] text-orange-300">
                  TUROBUS OS
                </span>

                <span className="flex items-center gap-2 rounded-full border border-emerald-500/15 bg-emerald-500/[.07] px-3 py-1.5 text-[9px] font-black uppercase text-emerald-300">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                  Sistem Aktif
                </span>

              </div>


              <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
                Hoş geldiniz
                {membership?.company?.name
                  ? `, ${membership.company.name}`
                  : ""}
              </h1>


              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
                Turizm işletmenizin satış, rezervasyon, kapasite, operasyon,
                tahsilat ve Marketplace hareketlerini tek merkezden yönetin.
              </p>

            </div>


            <div className="flex flex-wrap items-center gap-3">

              <div className="rounded-2xl border border-white/[.08] bg-black/20 px-5 py-3.5">

                <div className="text-[9px] font-black uppercase tracking-[.13em] text-slate-600">
                  Bugün
                </div>

                <div className="mt-1 text-xs font-black capitalize text-slate-300">
                  {dateText()}
                </div>

              </div>


              <div className="rounded-2xl border border-white/[.08] bg-black/20 px-5 py-3.5">

                <div className="text-[9px] font-black uppercase tracking-[.13em] text-slate-600">
                  Yetki
                </div>

                <div className="mt-1 text-xs font-black text-white">
                  {roleLabel(
                    membership?.role
                  )}
                </div>

              </div>


              <Link
                href="/dashboard/command-center"
                className="flex min-h-14 items-center gap-3 rounded-2xl bg-orange-500 px-5 text-xs font-black shadow-lg shadow-orange-500/20 transition hover:bg-orange-600"
              >
                <FaBolt />
                Kontrol Merkezi
              </Link>

            </div>

          </div>

        </section>


        {errorMessage && (

          <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            {errorMessage}
          </div>

        )}


        {/* KPI */}

        <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <Metric
            icon={
              FaCalendarAlt
            }
            label="Toplam Rezervasyon"
            value={(
              reservations.length +
              activityBookings.length
            ).toLocaleString(
              "tr-TR"
            )}
            sub={`${todayActivityBookings.length} aktivite bugün`}
          />

          <Metric
            icon={
              FaUsers
            }
            label="Bugünkü Aktivite Misafiri"
            value={todayActivityGuests.toLocaleString(
              "tr-TR"
            )}
            sub={`${todayActivityBookings.length} rezervasyon`}
          />

          <Metric
            icon={
              FaMoneyBillWave
            }
            label="Toplam Satış"
            value={money(
              totalRevenue
            )}
            sub={`Aktivite: ${money(activityRevenue)}`}
          />

          <Metric
            icon={
              pendingReservations >
              0
                ? FaExclamationTriangle
                : FaCheckCircle
            }
            label="Bekleyen İşlem"
            value={pendingReservations.toLocaleString(
              "tr-TR"
            )}
            sub={
              pendingReservations >
              0
                ? "Onay bekleyen rezervasyon"
                : "Kritik bekleyen işlem yok"
            }
          />

        </section>


        {/* MAIN GRID */}

        <section className="mt-5 grid gap-5 2xl:grid-cols-[1.15fr_.85fr]">


          {/* SYSTEM CENTERS */}

          <div className="rounded-[30px] border border-white/[.08] bg-[#0a1017] p-5 lg:p-6">

            <div className="flex flex-wrap items-center justify-between gap-4">

              <div>

                <div className="text-[9px] font-black uppercase tracking-[.18em] text-orange-400">
                  İŞLETME MERKEZLERİ
                </div>

                <h2 className="mt-2 text-2xl font-black">
                  Tüm operasyon sistemleri
                </h2>

              </div>

              <span className="rounded-full border border-white/[.08] px-3 py-1.5 text-[9px] font-black text-slate-500">
                Tek Oturum · Tek Firma
              </span>

            </div>


            <div className="mt-5 grid gap-3 md:grid-cols-2">

              {systemCards.map(
                (
                  item
                ) => {

                  const Icon =
                    item.icon;

                  return (

                    <Link
                      key={
                        item.title
                      }
                      href={
                        item.href
                      }
                      className="group rounded-[24px] border border-white/[.07] bg-white/[.025] p-5 transition hover:border-orange-500/25 hover:bg-white/[.045]"
                    >

                      <div className="flex items-start justify-between gap-4">

                        <div className="grid h-11 w-11 place-items-center rounded-2xl border border-orange-500/15 bg-orange-500/10 text-orange-400">
                          <Icon />
                        </div>

                        <span className="rounded-full bg-white/[.04] px-3 py-1.5 text-[9px] font-black text-slate-500">
                          {item.badge}
                        </span>

                      </div>


                      <h3 className="mt-5 text-lg font-black">
                        {item.title}
                      </h3>


                      <p className="mt-2 min-h-[40px] text-xs leading-5 text-slate-500">
                        {item.description}
                      </p>


                      <div className="mt-4 flex items-center gap-2 text-[10px] font-black text-orange-400">

                        Merkezi Aç

                        <FaArrowRight className="transition group-hover:translate-x-1" />

                      </div>

                    </Link>

                  );

                }
              )}

            </div>

          </div>


          {/* TODAY OPERATIONS */}

          <div className="rounded-[30px] border border-white/[.08] bg-[#0a1017] p-5 lg:p-6">

            <div className="flex items-center justify-between gap-4">

              <div>

                <div className="text-[9px] font-black uppercase tracking-[.18em] text-emerald-400">
                  BUGÜN
                </div>

                <h2 className="mt-2 text-2xl font-black">
                  Canlı Operasyon
                </h2>

              </div>


              <Link
                href="/dashboard/activity-control-center"
                className="rounded-xl border border-white/[.08] px-3 py-2 text-[9px] font-black text-slate-400 hover:text-white"
              >
                Tümünü Gör
              </Link>

            </div>


            <div className="mt-5 space-y-2">

              {todayActivityBookings
                .slice(
                  0,
                  7
                )
                .map(
                  (
                    booking
                  ) => (

                    <Link
                      key={
                        booking.id
                      }
                      href="/dashboard/activity-os/bookings"
                      className="flex items-center justify-between gap-4 rounded-2xl border border-white/[.06] bg-white/[.025] p-4 transition hover:bg-white/[.045]"
                    >

                      <div className="flex min-w-0 items-center gap-4">

                        <div className="w-12 shrink-0 text-sm font-black text-orange-400">
                          {booking.start_time?.slice(
                            0,
                            5
                          ) ??
                            "--:--"}
                        </div>


                        <div className="min-w-0">

                          <div className="truncate text-sm font-black">
                            {booking.customer_name}
                          </div>

                          <div className="mt-1 flex flex-wrap gap-3 text-[9px] text-slate-600">

                            <span>
                              {booking.booking_code}
                            </span>

                            <span>
                              {booking.quantity} kişi
                            </span>

                            <span>
                              {booking.payment_status}
                            </span>

                          </div>

                        </div>

                      </div>


                      <div className="text-right">

                        <div className="text-xs font-black">
                          {money(
                            booking.sale_total
                          )}
                        </div>

                        <div className="mt-1 text-[9px] text-slate-600">
                          {booking.status}
                        </div>

                      </div>

                    </Link>

                  )
                )}


              {todayActivityBookings.length ===
                0 && (

                <div className="rounded-2xl border border-dashed border-white/[.08] p-8 text-center">

                  <FaClock className="mx-auto text-3xl text-slate-700" />

                  <div className="mt-4 text-sm font-black">
                    Bugün kayıtlı aktivite operasyonu yok.
                  </div>

                  <div className="mt-2 text-[10px] text-slate-600">
                    Yeni rezervasyon geldiğinde burada görünecek.
                  </div>

                </div>

              )}

            </div>


            <div className="mt-5 grid grid-cols-2 gap-3">

              <div className="rounded-2xl border border-white/[.06] bg-black/20 p-4">

                <div className="text-[9px] font-black uppercase text-slate-600">
                  Gelecek Müsait Kontenjan
                </div>

                <div className="mt-2 text-2xl font-black text-emerald-400">
                  {totalFutureCapacity}
                </div>

              </div>


              <div className="rounded-2xl border border-white/[.06] bg-black/20 p-4">

                <div className="text-[9px] font-black uppercase text-slate-600">
                  Aktivite Kalan Alacak
                </div>

                <div className="mt-2 text-xl font-black text-orange-400">
                  {money(
                    activityOutstanding
                  )}
                </div>

              </div>

            </div>

          </div>

        </section>


        {/* QUICK ACTIONS + STATUS */}

        <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_390px]">

          <div className="rounded-[30px] border border-white/[.08] bg-[#0a1017] p-5 lg:p-6">

            <div>

              <div className="text-[9px] font-black uppercase tracking-[.18em] text-fuchsia-400">
                HIZLI İŞLEMLER
              </div>

              <h2 className="mt-2 text-xl font-black">
                Tek tıkla işlem başlat
              </h2>

            </div>


            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">

              {quickActions.map(
                (
                  item
                ) => {

                  const Icon =
                    item.icon;

                  return (

                    <Link
                      key={
                        item.label
                      }
                      href={
                        item.href
                      }
                      className="group flex min-h-[118px] flex-col items-center justify-center rounded-[22px] border border-white/[.07] bg-white/[.025] p-4 text-center transition hover:border-orange-500/25 hover:bg-orange-500/[.05]"
                    >

                      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-orange-500/10 text-orange-400 transition group-hover:bg-orange-500 group-hover:text-white">
                        <Icon />
                      </div>

                      <div className="mt-3 text-[10px] font-black">
                        {item.label}
                      </div>

                    </Link>

                  );

                }
              )}

            </div>

          </div>


          <div className="rounded-[30px] border border-emerald-500/10 bg-gradient-to-br from-emerald-500/[.07] to-[#0a1017] p-5 lg:p-6">

            <div className="flex items-center gap-3">

              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-400">
                <FaCheckCircle />
              </div>

              <div>

                <div className="text-[9px] font-black uppercase text-emerald-400">
                  SİSTEM DURUMU
                </div>

                <div className="mt-1 text-lg font-black">
                  Operasyon hazır
                </div>

              </div>

            </div>


            <div className="mt-5 space-y-3">

              <StatusRow
                label="Activity canlı kontenjan"
              />

              <StatusRow
                label="Ödeme & tahsilat"
              />

              <StatusRow
                label="Misafir portalı"
              />

              <StatusRow
                label="Partner & satışçı sistemi"
              />

            </div>

          </div>

        </section>


        {/* FOOTER STRIP */}

        <div className="mt-5 flex flex-col justify-between gap-3 rounded-2xl border border-white/[.06] bg-white/[.02] px-5 py-4 text-[9px] text-slate-600 sm:flex-row sm:items-center">

          <span>
            TUROBUS OS · Turizm İşletme ve Marketplace Altyapısı
          </span>

          <span>
            {membership?.company?.name ??
              "Aktif Firma"}
            {" · "}
            {roleLabel(
              membership?.role
            )}
          </span>

        </div>

      </div>

    </main>
  );

}


function Metric({
  icon:
    Icon,
  label,
  value,
  sub,
}: {
  icon:
    React.ComponentType<{
      className?: string;
    }>;
  label:
    string;
  value:
    string;
  sub:
    string;
}) {

  return (
    <article className="rounded-[26px] border border-white/[.08] bg-[#0a1017] p-5 transition hover:border-orange-500/20">

      <div className="flex items-start justify-between gap-4">

        <div>

          <div className="text-[9px] font-black uppercase tracking-[.12em] text-slate-600">
            {label}
          </div>

          <div className="mt-3 text-2xl font-black lg:text-3xl">
            {value}
          </div>

        </div>


        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-orange-500/15 bg-orange-500/10 text-orange-400">
          <Icon />
        </div>

      </div>


      <div className="mt-4 text-[10px] font-bold text-slate-500">
        {sub}
      </div>

    </article>
  );

}


function StatusRow({
  label,
}: {
  label:
    string;
}) {

  return (
    <div className="flex items-center justify-between rounded-xl border border-white/[.06] bg-black/15 px-4 py-3">

      <span className="text-[10px] font-bold text-slate-400">
        {label}
      </span>

      <span className="flex items-center gap-2 text-[9px] font-black text-emerald-400">

        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />

        AKTİF

      </span>

    </div>
  );

}
