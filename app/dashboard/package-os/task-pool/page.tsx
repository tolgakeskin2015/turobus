"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  supabase,
} from "@/lib/supabase";

import {
  getCurrentMembership,
} from "@/lib/current-user";


type Booking = {
  id: string;
  booking_code: string;
  customer_name: string;
  customer_phone: string | null;
  check_in: string;
  check_out: string;
  destination: string | null;
  status: string;
};


type Member = {
  user_id: string;
  full_name: string | null;
  role: string;
};


type Task = {
  id: string;
  booking_id: string;
  name: string;

  supplier_status: string;

  supplier_room_issue_status:
    | "none"
    | "open"
    | "waiting_supplier"
    | "assigned"
    | "resolved";

  supplier_room_issue_priority:
    | "low"
    | "normal"
    | "high"
    | "critical";

  supplier_room_issue_assigned_to:
    string | null;

  supplier_room_issue_sla_due_at:
    string | null;

  supplier_room_issue_opened_at:
    string | null;

  supplier_room_issue_resolved_at:
    string | null;

  supplier_room_issue_note:
    string | null;
};


type TaskRow =
  Task & {
    booking:
      Booking | null;

    assignee:
      Member | null;

    overdue:
      boolean;
  };


function dateTimeText(
  value:
    string | null
) {

  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat(
    "tr-TR",
    {
      dateStyle:
        "medium",

      timeStyle:
        "short",
    }
  ).format(
    new Date(
      value
    )
  );
}


function dateText(
  value:
    string | null
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


function statusLabel(
  status:
    Task[
      "supplier_room_issue_status"
    ]
) {

  if (
    status ===
    "waiting_supplier"
  ) {
    return "TEDARİKÇİ BEKLENİYOR";
  }

  if (
    status ===
    "assigned"
  ) {
    return "SORUMLUYA ATANDI";
  }

  if (
    status ===
    "resolved"
  ) {
    return "ÇÖZÜLDÜ";
  }

  if (
    status ===
    "open"
  ) {
    return "AÇIK";
  }

  return "AKSİYON YOK";
}


function priorityLabel(
  priority:
    Task[
      "supplier_room_issue_priority"
    ]
) {

  if (
    priority ===
    "critical"
  ) {
    return "KRİTİK";
  }

  if (
    priority ===
    "high"
  ) {
    return "YÜKSEK";
  }

  if (
    priority ===
    "normal"
  ) {
    return "NORMAL";
  }

  return "DÜŞÜK";
}


function priorityWeight(
  priority:
    Task[
      "supplier_room_issue_priority"
    ]
) {

  if (
    priority ===
    "critical"
  ) {
    return 4;
  }

  if (
    priority ===
    "high"
  ) {
    return 3;
  }

  if (
    priority ===
    "normal"
  ) {
    return 2;
  }

  return 1;
}


export default function
PackageTaskPoolPage() {

  const [
    rows,
    setRows,
  ] =
    useState<
      TaskRow[]
    >(
      []
    );


  const [
    members,
    setMembers,
  ] =
    useState<
      Member[]
    >(
      []
    );


  const [
    currentUserId,
    setCurrentUserId,
  ] =
    useState(
      ""
    );


  const [
    search,
    setSearch,
  ] =
    useState(
      ""
    );


  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState(
      "active"
    );


  const [
    priorityFilter,
    setPriorityFilter,
  ] =
    useState(
      "all"
    );


  const [
    assigneeFilter,
    setAssigneeFilter,
  ] =
    useState(
      "all"
    );


  const [
    onlyOverdue,
    setOnlyOverdue,
  ] =
    useState(
      false
    );


  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    );


  const [
    savingId,
    setSavingId,
  ] =
    useState(
      ""
    );


  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState(
      ""
    );


  const load =
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


          setCurrentUserId(
            authData.user.id
          );


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
            taskResult,
            bookingResult,
            memberResult,
          ] =
            await Promise.all([

              supabase
                .from(
                  "package_booking_items"
                )
                .select(`
                  id,
                  booking_id,
                  name,
                  supplier_status,
                  supplier_room_issue_status,
                  supplier_room_issue_priority,
                  supplier_room_issue_assigned_to,
                  supplier_room_issue_sla_due_at,
                  supplier_room_issue_opened_at,
                  supplier_room_issue_resolved_at,
                  supplier_room_issue_note
                `)
                .eq(
                  "company_id",
                  companyId
                )
                .neq(
                  "supplier_room_issue_status",
                  "none"
                ),

              supabase
                .from(
                  "package_bookings"
                )
                .select(`
                  id,
                  booking_code,
                  customer_name,
                  customer_phone,
                  check_in,
                  check_out,
                  destination,
                  status
                `)
                .eq(
                  "company_id",
                  companyId
                ),

              supabase
                .from(
                  "company_members"
                )
                .select(`
                  user_id,
                  full_name,
                  role
                `)
                .eq(
                  "company_id",
                  companyId
                )
                .eq(
                  "is_active",
                  true
                )
                .order(
                  "full_name",
                  {
                    ascending:
                      true,
                  }
                ),
            ]);


          if (
            taskResult.error
          ) {
            throw taskResult.error;
          }


          if (
            bookingResult.error
          ) {
            throw bookingResult.error;
          }


          if (
            memberResult.error
          ) {
            throw memberResult.error;
          }


          const bookingMap =
            new Map(
              (
                bookingResult.data ||
                []
              ).map(
                booking => [
                  booking.id,
                  booking as Booking,
                ]
              )
            );


          const memberList =
            (
              memberResult.data ||
              []
            ) as Member[];


          const memberMap =
            new Map(
              memberList.map(
                member => [
                  member.user_id,
                  member,
                ]
              )
            );


          const now =
            Date.now();


          const prepared =
            (
              taskResult.data ||
              []
            )
              .map(
                raw => {

                  const task =
                    raw as Task;


                  const overdue =
                    task
                      .supplier_room_issue_status !==
                      "resolved"
                    &&
                    Boolean(
                      task
                        .supplier_room_issue_sla_due_at
                    )
                    &&
                    new Date(
                      task
                        .supplier_room_issue_sla_due_at as string
                    ).getTime() <
                      now;


                  return {
                    ...task,

                    booking:
                      bookingMap.get(
                        task.booking_id
                      ) ||
                      null,

                    assignee:
                      task
                        .supplier_room_issue_assigned_to
                        ? memberMap.get(
                            task
                              .supplier_room_issue_assigned_to
                          ) ||
                          null
                        : null,

                    overdue,
                  };

                }
              )
              .sort(
                (
                  a,
                  b
                ) => {

                  if (
                    a.overdue !==
                    b.overdue
                  ) {

                    return a.overdue
                      ? -1
                      : 1;

                  }


                  const priorityDiff =
                    priorityWeight(
                      b
                        .supplier_room_issue_priority
                    )
                    -
                    priorityWeight(
                      a
                        .supplier_room_issue_priority
                    );


                  if (
                    priorityDiff !==
                    0
                  ) {
                    return priorityDiff;
                  }


                  const aTime =
                    a
                      .supplier_room_issue_sla_due_at
                      ? new Date(
                          a
                            .supplier_room_issue_sla_due_at
                        ).getTime()
                      : Number.MAX_SAFE_INTEGER;


                  const bTime =
                    b
                      .supplier_room_issue_sla_due_at
                      ? new Date(
                          b
                            .supplier_room_issue_sla_due_at
                        ).getTime()
                      : Number.MAX_SAFE_INTEGER;


                  return (
                    aTime -
                    bTime
                  );

                }
              );


          setMembers(
            memberList
          );


          setRows(
            prepared
          );


        } catch (error) {

          setRows(
            []
          );


          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Görev havuzu hazırlanamadı."
          );

        }


        setLoading(
          false
        );

      },
      []
    );


  useEffect(
    () => {

      void load();

    },
    [
      load,
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


        return rows.filter(
          row => {

            if (
              statusFilter ===
                "active"
              &&
              row
                .supplier_room_issue_status ===
                "resolved"
            ) {
              return false;
            }


            if (
              statusFilter !==
                "all"
              &&
              statusFilter !==
                "active"
              &&
              row
                .supplier_room_issue_status !==
                statusFilter
            ) {
              return false;
            }


            if (
              priorityFilter !==
                "all"
              &&
              row
                .supplier_room_issue_priority !==
                priorityFilter
            ) {
              return false;
            }


            if (
              assigneeFilter ===
                "unassigned"
              &&
              row
                .supplier_room_issue_assigned_to
            ) {
              return false;
            }


            if (
              assigneeFilter !==
                "all"
              &&
              assigneeFilter !==
                "unassigned"
              &&
              row
                .supplier_room_issue_assigned_to !==
                assigneeFilter
            ) {
              return false;
            }


            if (
              onlyOverdue &&
              !row.overdue
            ) {
              return false;
            }


            if (!query) {
              return true;
            }


            return [
              row.name,
              row.booking
                ?.booking_code,
              row.booking
                ?.customer_name,
              row.booking
                ?.customer_phone,
              row.booking
                ?.destination,
              row.assignee
                ?.full_name,
              row
                .supplier_room_issue_note,
            ]
              .filter(
                Boolean
              )
              .join(
                " "
              )
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
        statusFilter,
        priorityFilter,
        assigneeFilter,
        onlyOverdue,
      ]
    );


  const stats =
    useMemo(
      () => ({

        active:
          rows.filter(
            row =>
              row
                .supplier_room_issue_status !==
                "resolved"
          ).length,

        overdue:
          rows.filter(
            row =>
              row.overdue
          ).length,

        critical:
          rows.filter(
            row =>
              row
                .supplier_room_issue_status !==
                "resolved"
              &&
              row
                .supplier_room_issue_priority ===
                "critical"
          ).length,

        unassigned:
          rows.filter(
            row =>
              row
                .supplier_room_issue_status !==
                "resolved"
              &&
              !row
                .supplier_room_issue_assigned_to
          ).length,

        waitingSupplier:
          rows.filter(
            row =>
              row
                .supplier_room_issue_status ===
                "waiting_supplier"
          ).length,

      }),
      [
        rows,
      ]
    );


  async function
  assignToMe(
    row:
      TaskRow
  ) {

    if (
      !currentUserId
    ) {
      return;
    }


    setSavingId(
      row.id
    );

    setErrorMessage(
      ""
    );


    const {
      error,
    } =
      await supabase.rpc(
        "package_booking_room_issue_manage_v2",
        {
          p_booking_item_id:
            row.id,

          p_assigned_to:
            currentUserId,

          p_priority:
            row
              .supplier_room_issue_priority,

          p_sla_hours:
            null,

          p_note:
            null,
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


    await load();

    setSavingId(
      ""
    );
  }


  if (loading) {

    return (
      <main className="flex min-h-[70vh] items-center justify-center text-slate-400">
        Operasyon görev havuzu hazırlanıyor...
      </main>
    );

  }


  return (
    <main className="min-h-screen bg-slate-950 p-5 text-white md:p-8">

      <div className="mx-auto max-w-[1500px]">

        <section className="rounded-[30px] border border-white/10 bg-slate-900 p-6 md:p-8">

          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">

            <div>

              <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-400">
                TUROBUS PACKAGE OS
              </p>

              <h1 className="mt-3 text-3xl font-black md:text-5xl">
                Operasyon Görev Havuzu
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
                Tüm rezervasyonlardaki açık sorunları, SLA gecikmelerini ve personel sorumluluklarını tek ekrandan yönetin.
              </p>

            </div>


            <div className="flex flex-wrap gap-3">

              <Link
                href="/dashboard/package-os/operations"
                className="rounded-xl border border-white/10 px-5 py-3 text-sm font-black"
              >
                Günlük Operasyon →
              </Link>

              <Link
                href="/dashboard/package-os"
                className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950"
              >
                Package OS →
              </Link>

            </div>

          </div>


          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">

            <StatCard
              label="Açık Görev"
              value={
                stats.active
              }
            />

            <StatCard
              label="SLA Geciken"
              value={
                stats.overdue
              }
              danger={
                stats.overdue >
                0
              }
            />

            <StatCard
              label="Kritik"
              value={
                stats.critical
              }
              danger={
                stats.critical >
                0
              }
            />

            <StatCard
              label="Sorumlusuz"
              value={
                stats.unassigned
              }
              warning={
                stats.unassigned >
                0
              }
            />

            <StatCard
              label="Tedarikçi Bekleyen"
              value={
                stats.waitingSupplier
              }
            />

          </div>

        </section>


        {
          errorMessage &&
          (
            <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
              {
                errorMessage
              }
            </div>
          )
        }


        <section className="mt-6 rounded-[26px] border border-white/10 bg-slate-900 p-5">

          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-6">

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
              placeholder="Rezervasyon, müşteri, hizmet, personel ara..."
              className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none xl:col-span-2"
            />


            <select
              value={
                statusFilter
              }
              onChange={
                event =>
                  setStatusFilter(
                    event.target.value
                  )
              }
              className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm"
            >
              <option value="active">
                Açık İşler
              </option>

              <option value="all">
                Tüm Durumlar
              </option>

              <option value="open">
                Açık
              </option>

              <option value="waiting_supplier">
                Tedarikçi Bekleniyor
              </option>

              <option value="assigned">
                Sorumluya Atandı
              </option>

              <option value="resolved">
                Çözüldü
              </option>
            </select>


            <select
              value={
                priorityFilter
              }
              onChange={
                event =>
                  setPriorityFilter(
                    event.target.value
                  )
              }
              className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm"
            >
              <option value="all">
                Tüm Öncelikler
              </option>

              <option value="critical">
                Kritik
              </option>

              <option value="high">
                Yüksek
              </option>

              <option value="normal">
                Normal
              </option>

              <option value="low">
                Düşük
              </option>
            </select>


            <select
              value={
                assigneeFilter
              }
              onChange={
                event =>
                  setAssigneeFilter(
                    event.target.value
                  )
              }
              className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm"
            >
              <option value="all">
                Tüm Personel
              </option>

              <option value="unassigned">
                Sorumlusuz
              </option>

              {
                members.map(
                  member => (
                    <option
                      key={
                        member.user_id
                      }
                      value={
                        member.user_id
                      }
                    >
                      {
                        member.full_name ||
                        member.role
                      }
                    </option>
                  )
                )
              }
            </select>


            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-slate-950 px-4 py-3">

              <input
                type="checkbox"
                checked={
                  onlyOverdue
                }
                onChange={
                  event =>
                    setOnlyOverdue(
                      event.target.checked
                    )
                }
              />

              <span className="text-sm font-black">
                Yalnız Geciken
              </span>

            </label>

          </div>


          <div className="mt-4 text-xs font-bold text-slate-500">
            {
              filtered.length
            }
            {" görev gösteriliyor"}
          </div>

        </section>


        <section className="mt-6 space-y-4">

          {
            filtered.length ===
              0
              ? (
                  <div className="rounded-[26px] border border-white/10 bg-slate-900 p-10 text-center text-slate-500">
                    Bu filtrelere uygun operasyon görevi bulunmuyor.
                  </div>
                )
              : filtered.map(
                  row => (
                    <article
                      key={
                        row.id
                      }
                      className={`rounded-[26px] border p-5 md:p-6 ${
                        row.overdue
                          ? "border-red-500/30 bg-red-500/5"
                          : row.supplier_room_issue_priority ===
                              "critical"
                            ? "border-orange-500/30 bg-orange-500/5"
                            : "border-white/10 bg-slate-900"
                      }`}
                    >

                      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr_1fr_auto] xl:items-center">

                        <div>

                          <div className="flex flex-wrap gap-2">

                            {
                              row.overdue &&
                              (
                                <span className="rounded-full bg-red-500/20 px-3 py-1 text-[10px] font-black text-red-300">
                                  SLA GECİKTİ
                                </span>
                              )
                            }

                            <span className="rounded-full bg-orange-500/10 px-3 py-1 text-[10px] font-black text-orange-300">
                              {
                                priorityLabel(
                                  row
                                    .supplier_room_issue_priority
                                )
                              }
                            </span>

                            <span className="rounded-full bg-white/5 px-3 py-1 text-[10px] font-black text-slate-400">
                              {
                                statusLabel(
                                  row
                                    .supplier_room_issue_status
                                )
                              }
                            </span>

                          </div>


                          <h2 className="mt-3 text-xl font-black">
                            {
                              row.name
                            }
                          </h2>


                          <div className="mt-2 text-sm text-slate-400">

                            <span className="font-black text-white">
                              {
                                row.booking
                                  ?.booking_code ||
                                "-"
                              }
                            </span>

                            {" · "}

                            {
                              row.booking
                                ?.customer_name ||
                              "Müşteri"
                            }

                          </div>


                          {
                            row
                              .supplier_room_issue_note &&
                            (
                              <div className="mt-3 text-sm leading-6 text-slate-500">
                                {
                                  row
                                    .supplier_room_issue_note
                                }
                              </div>
                            )
                          }

                        </div>


                        <div>

                          <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                            Sorumlu
                          </div>

                          <div className="mt-2 font-black">
                            {
                              row.assignee
                                ?.full_name ||
                              "Atanmadı"
                            }
                          </div>

                          <div className="mt-1 text-xs text-slate-500">
                            {
                              row.assignee
                                ?.role ||
                              "Operasyon görevi"
                            }
                          </div>

                        </div>


                        <div>

                          <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                            SLA Sonu
                          </div>

                          <div
                            className={`mt-2 font-black ${
                              row.overdue
                                ? "text-red-300"
                                : ""
                            }`}
                          >
                            {
                              dateTimeText(
                                row
                                  .supplier_room_issue_sla_due_at
                              )
                            }
                          </div>


                          <div className="mt-2 text-xs text-slate-500">

                            {
                              row.booking
                                ? `${dateText(row.booking.check_in)} → ${dateText(row.booking.check_out)}`
                                : "-"
                            }

                          </div>

                        </div>


                        <div className="flex flex-wrap gap-2 xl:flex-col">

                          {
                            !row
                              .supplier_room_issue_assigned_to
                            &&
                            row
                              .supplier_room_issue_status !==
                              "resolved"
                            &&
                            (
                              <button
                                type="button"
                                disabled={
                                  savingId ===
                                  row.id
                                }
                                onClick={
                                  () =>
                                    void assignToMe(
                                      row
                                    )
                                }
                                className="rounded-xl bg-cyan-400 px-4 py-3 text-xs font-black text-slate-950 disabled:opacity-50"
                              >
                                {
                                  savingId ===
                                    row.id
                                    ? "Atanıyor..."
                                    : "Bana Ata"
                                }
                              </button>
                            )
                          }


                          <Link
                            href={
                              `/dashboard/package-os/bookings/${row.booking_id}`
                            }
                            className="rounded-xl border border-white/10 px-4 py-3 text-center text-xs font-black"
                          >
                            Rezervasyona Git →
                          </Link>

                        </div>

                      </div>

                    </article>
                  )
                )
          }

        </section>

      </div>

    </main>
  );
}


function StatCard({
  label,
  value,
  danger = false,
  warning = false,
}: {
  label:
    string;

  value:
    number;

  danger?:
    boolean;

  warning?:
    boolean;
}) {

  return (
    <div
      className={`rounded-2xl border p-5 ${
        danger
          ? "border-red-500/30 bg-red-500/10"
          : warning
            ? "border-amber-500/30 bg-amber-500/10"
            : "border-white/10 bg-slate-950"
      }`}
    >

      <div className="text-xs font-black uppercase tracking-wider text-slate-500">
        {
          label
        }
      </div>

      <div
        className={`mt-2 text-3xl font-black ${
          danger
            ? "text-red-300"
            : warning
              ? "text-amber-300"
              : ""
        }`}
      >
        {
          value
        }
      </div>

    </div>
  );
}
