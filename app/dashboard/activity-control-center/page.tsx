"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import {
  FaCalendarAlt,
  FaCheck,
  FaClipboardCheck,
  FaExternalLinkAlt,
  FaMoneyBillWave,
  FaQrcode,
  FaTasks,
  FaUserPlus,
  FaUsers,
} from "react-icons/fa";

import {
  supabase,
} from "@/lib/supabase";

import {
  getCurrentMembership,
} from "@/lib/current-user";


type Center = {
  date: string;

  summary: {
    booking_count: number;
    guest_count: number;
    checked_in: number;
    completed: number;
    finance_allowed: boolean;
  };

  bookings: Array<{
    id: string;
    booking_code: string;
    activity_name: string;
    customer_name: string;
    customer_phone: string | null;
    customer_email: string | null;
    service_date: string;
    start_time: string | null;
    quantity: number;
    status: string;
    payment_status: string;
    sale_total: number;
    paid_total: number;
    pickup_location: string | null;
    hotel_name: string | null;
    guest_token: string;
    seller_id: string | null;
    seller_name: string | null;
  }>;

  tasks: Array<{
    id: string;
    booking_id: string;
    assigned_staff_id: string | null;
    staff_name: string | null;
    task_type: string;
    title: string;
    due_at: string | null;
    status: string;
    notes: string | null;
  }>;

  staff: Array<{
    id: string;
    full_name: string;
    staff_type: string;
    phone: string | null;
    license_no: string | null;
  }>;

  sellers: Array<{
    id: string;
    name: string;
    seller_type: string;
    earned: number | null;
    paid: number | null;
  }>;
};


function localDate() {
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


function money(
  value:
    | number
    | null
    | undefined
) {
  return new Intl.NumberFormat(
    "tr-TR",
    {
      style:
        "currency",
      currency:
        "TRY",
      maximumFractionDigits:
        0,
    }
  ).format(
    Number(
      value ?? 0
    )
  );
}


export default function ActivityControlCenterPage() {

  const [
    companyId,
    setCompanyId,
  ] =
    useState("");


  const [
    date,
    setDate,
  ] =
    useState(
      localDate()
    );


  const [
    data,
    setData,
  ] =
    useState<Center | null>(
      null
    );


  const [
    loading,
    setLoading,
  ] =
    useState(true);


  const [
    error,
    setError,
  ] =
    useState("");


  const [
    message,
    setMessage,
  ] =
    useState("");


  const [
    taskBooking,
    setTaskBooking,
  ] =
    useState("");


  const [
    taskStaff,
    setTaskStaff,
  ] =
    useState("");


  const [
    taskType,
    setTaskType,
  ] =
    useState(
      "operation"
    );


  const [
    taskTitle,
    setTaskTitle,
  ] =
    useState("");


  const [
    taskTime,
    setTaskTime,
  ] =
    useState("");


  const [
    payoutSeller,
    setPayoutSeller,
  ] =
    useState("");


  const [
    payoutAmount,
    setPayoutAmount,
  ] =
    useState("");


  const [
    payoutMethod,
    setPayoutMethod,
  ] =
    useState(
      "cash"
    );


  const [
    payoutReference,
    setPayoutReference,
  ] =
    useState("");


  async function load(
    cid:
      string,
    selectedDate:
      string
  ) {

    setLoading(
      true
    );

    setError("");


    const {
      data:
        result,
      error:
        rpcError,
    } =
      await supabase.rpc(
        "get_activity_os_control_center",
        {
          p_company_id:
            cid,

          p_date:
            selectedDate,
        }
      );


    if (
      rpcError
    ) {
      setError(
        rpcError.message
      );
      setLoading(
        false
      );
      return;
    }


    setData(
      result as Center
    );

    setLoading(
      false
    );

  }


  useEffect(
    () => {

      async function init() {

        const {
          data: {
            user,
          },
        } =
          await supabase.auth.getUser();


        if (!user) {
          window.location.href =
            "/giris?next=/dashboard/activity-control-center";
          return;
        }


        const membership =
          await getCurrentMembership(
            user.id
          );


        if (!membership) {
          setError(
            "Aktif şirket üyeliği bulunamadı."
          );
          setLoading(
            false
          );
          return;
        }


        setCompanyId(
          membership.company_id
        );


        await load(
          membership.company_id,
          date
        );

      }


      void init();

    },
    []
  );


  async function changeDate(
    next:
      string
  ) {

    setDate(
      next
    );


    if (
      companyId
    ) {
      await load(
        companyId,
        next
      );
    }

  }


  async function createTask(
    event:
      FormEvent
  ) {

    event.preventDefault();

    if (
      !companyId ||
      !taskBooking ||
      !taskTitle.trim()
    ) {
      return;
    }


    const dueAt =
      taskTime
        ? `${date}T${taskTime}:00`
        : null;


    const {
      error:
        taskError,
    } =
      await supabase.rpc(
        "activity_os_assign_operation",
        {
          p_company_id:
            companyId,

          p_booking_id:
            taskBooking,

          p_staff_id:
            taskStaff ||
            null,

          p_task_type:
            taskType,

          p_title:
            taskTitle.trim(),

          p_due_at:
            dueAt,

          p_notes:
            null,
        }
      );


    if (
      taskError
    ) {
      setError(
        taskError.message
      );
      return;
    }


    setTaskBooking("");
    setTaskStaff("");
    setTaskTitle("");
    setTaskTime("");

    setMessage(
      "Operasyon görevi oluşturuldu."
    );


    await load(
      companyId,
      date
    );

  }


  async function updateTask(
    taskId:
      string,
    status:
      string
  ) {

    const {
      error:
        taskError,
    } =
      await supabase.rpc(
        "activity_os_update_task_status",
        {
          p_company_id:
            companyId,

          p_task_id:
            taskId,

          p_status:
            status,
        }
      );


    if (
      taskError
    ) {
      setError(
        taskError.message
      );
      return;
    }


    await load(
      companyId,
      date
    );

  }


  async function updateBooking(
    bookingId:
      string,
    status:
      string
  ) {

    const {
      error:
        statusError,
    } =
      await supabase.rpc(
        "activity_os_update_booking_status",
        {
          p_company_id:
            companyId,

          p_booking_id:
            bookingId,

          p_status:
            status,
        }
      );


    if (
      statusError
    ) {
      setError(
        statusError.message
      );
      return;
    }


    await load(
      companyId,
      date
    );

  }


  async function paySeller(
    event:
      FormEvent
  ) {

    event.preventDefault();

    if (
      !companyId ||
      !payoutSeller ||
      !payoutAmount
    ) {
      return;
    }


    const {
      error:
        payoutError,
    } =
      await supabase.rpc(
        "activity_os_record_seller_payout",
        {
          p_company_id:
            companyId,

          p_seller_id:
            payoutSeller,

          p_amount:
            Number(
              payoutAmount
            ),

          p_payment_method:
            payoutMethod,

          p_reference_no:
            payoutReference ||
            null,

          p_note:
            null,
        }
      );


    if (
      payoutError
    ) {
      setError(
        payoutError.message
      );
      return;
    }


    setPayoutAmount("");
    setPayoutReference("");

    setMessage(
      "Partner hakediş ödemesi kaydedildi."
    );


    await load(
      companyId,
      date
    );

  }


  async function inviteGuest(
    bookingId:
      string
  ) {

    setError("");
    setMessage("");


    const {
      data:
        sessionData,
    } =
      await supabase.auth.getSession();


    const response =
      await fetch(
        "/api/activity-os/invite-guest",
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${
                sessionData.session
                  ?.access_token ??
                ""
              }`,
          },

          body:
            JSON.stringify({
              bookingId,
            }),
        }
      );


    const result =
      await response.json();


    if (
      !response.ok
    ) {
      setError(
        result.error ||
          "Misafir daveti gönderilemedi."
      );
      return;
    }


    setMessage(
      "Misafir Turobus hesabına davet edildi."
    );

  }


  if (
    loading
  ) {
    return (
      <div className="p-6 text-white">
        <div className="h-96 animate-pulse rounded-3xl bg-white/[.04]" />
      </div>
    );
  }


  return (
    <main className="min-h-screen bg-slate-950 p-4 text-white md:p-6">

      <div className="mx-auto max-w-[1500px]">

        <div className="flex flex-wrap items-end justify-between gap-5">

          <div>
            <div className="text-[10px] font-black uppercase tracking-[.2em] text-orange-400">
              TUROBUS ACTIVITY OS
            </div>

            <h1 className="mt-2 text-3xl font-black">
              Operasyon Kontrol Merkezi
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Günlük rezervasyon, personel, check-in, görev ve partner hakediş kontrolü.
            </p>
          </div>


          <label>
            <span className="mb-2 block text-[9px] font-black uppercase text-slate-500">
              Operasyon Tarihi
            </span>

            <input
              type="date"
              value={
                date
              }
              onChange={(event) =>
                void changeDate(
                  event.target.value
                )
              }
              className="rounded-xl border border-white/10 bg-slate-900 px-4 py-3"
            />
          </label>

        </div>


        <div className="mt-4 flex gap-2">

          <Link
            href="/dashboard/activity-os"
            className="rounded-xl border border-white/10 px-4 py-3 text-xs font-black"
          >
            Activity OS
          </Link>

          <Link
            href="/dashboard/activity-os/calendar"
            className="rounded-xl border border-white/10 px-4 py-3 text-xs font-black"
          >
            Takvim
          </Link>

          <Link
            href="/dashboard/activity-os/bookings"
            className="rounded-xl border border-white/10 px-4 py-3 text-xs font-black"
          >
            Rezervasyonlar
          </Link>

        </div>


        {error && (
          <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}


        {message && (
          <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300">
            {message}
          </div>
        )}


        <div className="mt-6 grid gap-4 md:grid-cols-4">

          {[
            [
              "Rezervasyon",
              data?.summary.booking_count ??
                0,
            ],
            [
              "Misafir",
              data?.summary.guest_count ??
                0,
            ],
            [
              "Check-in",
              data?.summary.checked_in ??
                0,
            ],
            [
              "Tamamlanan",
              data?.summary.completed ??
                0,
            ],
          ].map(
            ([
              label,
              value,
            ]) => (
              <div
                key={
                  String(
                    label
                  )
                }
                className="rounded-3xl border border-white/10 bg-white/[.03] p-5"
              >
                <div className="text-[9px] uppercase text-slate-500">
                  {String(
                    label
                  )}
                </div>

                <div className="mt-2 text-3xl font-black">
                  {String(
                    value
                  )}
                </div>
              </div>
            )
          )}

        </div>


        <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_390px]">

          <div>

            <h2 className="text-xl font-black">
              Günlük Rezervasyonlar
            </h2>


            <div className="mt-4 space-y-3">

              {data?.bookings.map(
                (
                  booking
                ) => (

                  <div
                    key={
                      booking.id
                    }
                    className="rounded-3xl border border-white/10 bg-white/[.03] p-5"
                  >

                    <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr_.8fr_auto] lg:items-center">

                      <div>

                        <div className="text-[9px] font-black uppercase text-orange-400">
                          {booking.booking_code}
                        </div>

                        <div className="mt-1 text-lg font-black">
                          {booking.activity_name}
                        </div>

                        <div className="mt-1 text-xs text-slate-500">
                          {booking.customer_name}
                          {" · "}
                          {booking.quantity} kişi
                        </div>

                        {booking.hotel_name && (
                          <div className="mt-1 text-[10px] text-slate-600">
                            {booking.hotel_name}
                          </div>
                        )}

                      </div>


                      <div>

                        <div className="font-black">
                          {booking.start_time?.slice(
                            0,
                            5
                          ) ??
                            "-"}
                        </div>

                        <div className="mt-1 text-[9px] text-slate-500">
                          {booking.pickup_location ??
                            "Pickup yok"}
                        </div>

                      </div>


                      <div>

                        <div className="font-black">
                          {money(
                            booking.sale_total
                          )}
                        </div>

                        <div className="mt-1 text-[9px] text-slate-500">
                          {booking.payment_status}
                          {booking.seller_name
                            ? ` · ${booking.seller_name}`
                            : ""}
                        </div>

                      </div>


                      <div className="flex flex-wrap gap-2">

                        <select
                          value={
                            booking.status
                          }
                          onChange={(event) =>
                            void updateBooking(
                              booking.id,
                              event.target.value
                            )
                          }
                          className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-[10px] font-black"
                        >
                          <option value="confirmed">
                            Onaylı
                          </option>
                          <option value="ready">
                            Hazır
                          </option>
                          <option value="picked_up">
                            Pickup
                          </option>
                          <option value="checked_in">
                            Check-in
                          </option>
                          <option value="in_progress">
                            Başladı
                          </option>
                          <option value="completed">
                            Tamamlandı
                          </option>
                          <option value="no_show">
                            No Show
                          </option>
                          <option value="cancelled">
                            İptal
                          </option>
                        </select>


                        <Link
                          href={`/activity-voucher/${booking.guest_token}`}
                          target="_blank"
                          title="Voucher"
                          className="grid h-9 w-9 place-items-center rounded-xl border border-white/10"
                        >
                          <FaQrcode />
                        </Link>


                        {booking.customer_email && (
                          <button
                            type="button"
                            title="Turobus hesabına davet et"
                            onClick={() =>
                              void inviteGuest(
                                booking.id
                              )
                            }
                            className="grid h-9 w-9 place-items-center rounded-xl border border-white/10"
                          >
                            <FaUserPlus />
                          </button>
                        )}


                        <Link
                          href={`/activity-misafir/${booking.guest_token}`}
                          target="_blank"
                          className="grid h-9 w-9 place-items-center rounded-xl border border-white/10"
                        >
                          <FaExternalLinkAlt />
                        </Link>

                      </div>

                    </div>

                  </div>
                )
              )}


              {data?.bookings.length ===
                0 && (
                <div className="rounded-3xl border border-dashed border-white/10 p-10 text-center text-slate-500">
                  Bu tarihte operasyon yok.
                </div>
              )}

            </div>

          </div>


          <aside className="space-y-5">

            <div className="rounded-3xl border border-white/10 bg-white/[.03] p-5">

              <div className="flex items-center gap-2">
                <FaTasks className="text-orange-400" />
                <h3 className="font-black">
                  Personel / Görev Ata
                </h3>
              </div>


              <form
                onSubmit={
                  createTask
                }
                className="mt-5 space-y-4"
              >

                <label>
                  <span className="mb-2 block text-[9px] font-black uppercase text-slate-500">
                    Rezervasyon
                  </span>

                  <select
                    required
                    value={
                      taskBooking
                    }
                    onChange={(event) =>
                      setTaskBooking(
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm"
                  >
                    <option value="">
                      Rezervasyon seç
                    </option>

                    {data?.bookings.map(
                      (
                        booking
                      ) => (
                        <option
                          key={
                            booking.id
                          }
                          value={
                            booking.id
                          }
                        >
                          {booking.start_time?.slice(
                            0,
                            5
                          )}
                          {" · "}
                          {booking.activity_name}
                          {" · "}
                          {booking.customer_name}
                        </option>
                      )
                    )}
                  </select>
                </label>


                <label>
                  <span className="mb-2 block text-[9px] font-black uppercase text-slate-500">
                    Personel
                  </span>

                  <select
                    value={
                      taskStaff
                    }
                    onChange={(event) =>
                      setTaskStaff(
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm"
                  >
                    <option value="">
                      Atanmamış
                    </option>

                    {data?.staff.map(
                      (
                        person
                      ) => (
                        <option
                          key={
                            person.id
                          }
                          value={
                            person.id
                          }
                        >
                          {person.full_name}
                          {" · "}
                          {person.staff_type}
                        </option>
                      )
                    )}
                  </select>
                </label>


                <label>
                  <span className="mb-2 block text-[9px] font-black uppercase text-slate-500">
                    Görev Tipi
                  </span>

                  <select
                    value={
                      taskType
                    }
                    onChange={(event) =>
                      setTaskType(
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm"
                  >
                    <option value="operation">
                      Operasyon
                    </option>
                    <option value="pickup">
                      Pickup
                    </option>
                    <option value="pilot">
                      Pilot / Eğitmen
                    </option>
                    <option value="guide">
                      Rehber
                    </option>
                    <option value="driver">
                      Şoför
                    </option>
                    <option value="equipment">
                      Ekipman
                    </option>
                  </select>
                </label>


                <label>
                  <span className="mb-2 block text-[9px] font-black uppercase text-slate-500">
                    Görev
                  </span>

                  <input
                    required
                    value={
                      taskTitle
                    }
                    onChange={(event) =>
                      setTaskTitle(
                        event.target.value
                      )
                    }
                    placeholder="Örn. Misafiri otelden al"
                    className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm"
                  />
                </label>


                <label>
                  <span className="mb-2 block text-[9px] font-black uppercase text-slate-500">
                    Saat
                  </span>

                  <input
                    type="time"
                    value={
                      taskTime
                    }
                    onChange={(event) =>
                      setTaskTime(
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm"
                  />
                </label>


                <button
                  type="submit"
                  className="w-full rounded-xl bg-orange-500 px-5 py-4 font-black"
                >
                  Görev Oluştur
                </button>

              </form>

            </div>

          </aside>

        </div>


        <section className="mt-8">

          <div className="flex items-center gap-2">
            <FaClipboardCheck className="text-orange-400" />
            <h2 className="text-xl font-black">
              Operasyon Görevleri
            </h2>
          </div>


          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">

            {data?.tasks.map(
              (
                task
              ) => (
                <div
                  key={
                    task.id
                  }
                  className="rounded-3xl border border-white/10 bg-white/[.03] p-5"
                >

                  <div className="text-[9px] font-black uppercase text-orange-400">
                    {task.task_type}
                  </div>

                  <div className="mt-1 font-black">
                    {task.title}
                  </div>

                  <div className="mt-2 text-xs text-slate-500">
                    {task.staff_name ??
                      "Personel atanmamış"}
                  </div>

                  {task.due_at && (
                    <div className="mt-1 text-[10px] text-slate-600">
                      {new Date(
                        task.due_at
                      ).toLocaleString(
                        "tr-TR"
                      )}
                    </div>
                  )}


                  <select
                    value={
                      task.status
                    }
                    onChange={(event) =>
                      void updateTask(
                        task.id,
                        event.target.value
                      )
                    }
                    className="mt-4 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-3 text-xs font-black"
                  >
                    <option value="pending">
                      Bekliyor
                    </option>
                    <option value="assigned">
                      Atandı
                    </option>
                    <option value="in_progress">
                      Devam Ediyor
                    </option>
                    <option value="completed">
                      Tamamlandı
                    </option>
                    <option value="cancelled">
                      İptal
                    </option>
                  </select>

                </div>
              )
            )}

          </div>

        </section>


        {data?.summary.finance_allowed && (
          <section className="mt-8 rounded-3xl border border-white/10 bg-white/[.03] p-5">

            <div className="flex items-center gap-2">
              <FaMoneyBillWave className="text-emerald-400" />
              <h2 className="text-xl font-black">
                Partner Hakediş Merkezi
              </h2>
            </div>


            <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_390px]">

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">

                {data.sellers.map(
                  (
                    seller
                  ) => {

                    const earned =
                      Number(
                        seller.earned ??
                        0
                      );

                    const paid =
                      Number(
                        seller.paid ??
                        0
                      );

                    return (
                      <div
                        key={
                          seller.id
                        }
                        className="rounded-2xl bg-slate-900 p-4"
                      >
                        <div className="font-black">
                          {seller.name}
                        </div>

                        <div className="mt-1 text-[9px] uppercase text-slate-500">
                          {seller.seller_type}
                        </div>

                        <div className="mt-4 grid grid-cols-3 gap-2 text-xs">

                          <div>
                            <div className="text-[8px] text-slate-600">
                              Hakediş
                            </div>
                            <div className="mt-1 font-black">
                              {money(
                                earned
                              )}
                            </div>
                          </div>

                          <div>
                            <div className="text-[8px] text-slate-600">
                              Ödenen
                            </div>
                            <div className="mt-1 font-black">
                              {money(
                                paid
                              )}
                            </div>
                          </div>

                          <div>
                            <div className="text-[8px] text-slate-600">
                              Kalan
                            </div>
                            <div className="mt-1 font-black text-orange-400">
                              {money(
                                Math.max(
                                  earned -
                                  paid,
                                  0
                                )
                              )}
                            </div>
                          </div>

                        </div>
                      </div>
                    );

                  }
                )}

              </div>


              <form
                onSubmit={
                  paySeller
                }
                className="space-y-4 rounded-2xl bg-slate-900 p-5"
              >

                <div className="font-black">
                  Hakediş Öde
                </div>


                <label>
                  <span className="mb-2 block text-[9px] font-black uppercase text-slate-500">
                    Partner
                  </span>

                  <select
                    required
                    value={
                      payoutSeller
                    }
                    onChange={(event) =>
                      setPayoutSeller(
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
                  >
                    <option value="">
                      Partner seç
                    </option>

                    {data.sellers.map(
                      (
                        seller
                      ) => (
                        <option
                          key={
                            seller.id
                          }
                          value={
                            seller.id
                          }
                        >
                          {seller.name}
                        </option>
                      )
                    )}
                  </select>
                </label>


                <label>
                  <span className="mb-2 block text-[9px] font-black uppercase text-slate-500">
                    Tutar
                  </span>

                  <input
                    required
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={
                      payoutAmount
                    }
                    onChange={(event) =>
                      setPayoutAmount(
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
                  />
                </label>


                <label>
                  <span className="mb-2 block text-[9px] font-black uppercase text-slate-500">
                    Ödeme Yöntemi
                  </span>

                  <select
                    value={
                      payoutMethod
                    }
                    onChange={(event) =>
                      setPayoutMethod(
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
                  >
                    <option value="cash">
                      Nakit
                    </option>
                    <option value="bank_transfer">
                      Havale
                    </option>
                    <option value="card">
                      Kart
                    </option>
                  </select>
                </label>


                <label>
                  <span className="mb-2 block text-[9px] font-black uppercase text-slate-500">
                    Referans No
                  </span>

                  <input
                    value={
                      payoutReference
                    }
                    onChange={(event) =>
                      setPayoutReference(
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
                  />
                </label>


                <button
                  type="submit"
                  className="w-full rounded-xl bg-emerald-500 px-5 py-4 font-black text-slate-950"
                >
                  Hakedişi Öde
                </button>

              </form>

            </div>

          </section>
        )}

      </div>

    </main>
  );
}
