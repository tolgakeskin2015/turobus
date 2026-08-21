"use client";

import Link from "next/link";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FaArrowLeft,
  FaCalendarAlt,
  FaCheckCircle,
  FaClock,
  FaExclamationTriangle,
  FaPlay,
  FaPlus,
  FaSearch,
  FaTasks,
  FaTrash,
  FaUserTie,
} from "react-icons/fa";

import {
  useParams,
} from "next/navigation";

import {
  supabase,
} from "@/lib/supabase";

import {
  getCurrentMembership,
} from "@/lib/current-user";


type TaskStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "cancelled";


type Priority =
  | "low"
  | "normal"
  | "high"
  | "critical";


type TaskType =
  | "operation"
  | "flight"
  | "bus"
  | "passenger"
  | "rooming"
  | "manifest"
  | "finance"
  | "supplier"
  | "guide"
  | "driver"
  | "document"
  | "other";


type Tour = {
  id: string;
  title: string;
  transport_mode:
    "air" |
    "bus" |
    "other";
};


type Departure = {
  id: string;
  departure_date: string;
  capacity: number;
  reserved_count: number;
};


type Staff = {
  id: string;
  full_name: string;
  staff_role: string;
  phone:
    string | null;
};


type Task = {
  id: string;
  company_id: string;
  tour_id: string;
  departure_id:
    string | null;
  assignee_staff_id:
    string | null;
  title: string;
  description:
    string | null;
  task_type:
    TaskType;
  priority:
    Priority;
  status:
    TaskStatus;
  due_at:
    string | null;
  started_at:
    string | null;
  completed_at:
    string | null;
  completion_note:
    string | null;
  created_at: string;
};


type FormState = {
  title: string;
  description: string;
  taskType:
    TaskType;
  priority:
    Priority;
  assigneeStaffId:
    string;
  dueAt:
    string;
};


const EMPTY_FORM:
  FormState = {
    title:
      "",
    description:
      "",
    taskType:
      "operation",
    priority:
      "normal",
    assigneeStaffId:
      "",
    dueAt:
      "",
  };


const taskTypeLabels:
  Record<
    TaskType,
    string
  > = {
    operation:
      "Operasyon",

    flight:
      "Uçuş",

    bus:
      "Otobüs",

    passenger:
      "Yolcu",

    rooming:
      "Rooming",

    manifest:
      "Manifest",

    finance:
      "Finans",

    supplier:
      "Tedarikçi",

    guide:
      "Rehber",

    driver:
      "Şoför",

    document:
      "Belge",

    other:
      "Diğer",
  };


const priorityLabels:
  Record<
    Priority,
    string
  > = {
    low:
      "Düşük",

    normal:
      "Normal",

    high:
      "Yüksek",

    critical:
      "Kritik",
  };


const statusLabels:
  Record<
    TaskStatus,
    string
  > = {
    pending:
      "Bekliyor",

    in_progress:
      "Devam Ediyor",

    completed:
      "Tamamlandı",

    cancelled:
      "İptal",
  };


function formatDate(
  value:
    string | null
) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "tr-TR",
    {
      day:
        "2-digit",
      month:
        "short",
      year:
        "numeric",
      hour:
        "2-digit",
      minute:
        "2-digit",
    }
  ).format(date);
}


function isOverdue(
  task:
    Task
) {
  if (
    !task.due_at ||
    [
      "completed",
      "cancelled",
    ].includes(
      task.status
    )
  ) {
    return false;
  }

  return (
    new Date(
      task.due_at
    ).getTime() <
    Date.now()
  );
}


function priorityClass(
  priority:
    Priority
) {
  if (
    priority ===
    "critical"
  ) {
    return "border-red-500/20 bg-red-500/[.06] text-red-300";
  }

  if (
    priority ===
    "high"
  ) {
    return "border-orange-500/20 bg-orange-500/[.06] text-orange-300";
  }

  if (
    priority ===
    "low"
  ) {
    return "border-white/10 bg-white/[.025] text-slate-500";
  }

  return "border-blue-500/20 bg-blue-500/[.05] text-blue-300";
}


function statusClass(
  status:
    TaskStatus
) {
  if (
    status ===
    "completed"
  ) {
    return "border-emerald-500/20 bg-emerald-500/[.06] text-emerald-300";
  }

  if (
    status ===
    "in_progress"
  ) {
    return "border-blue-500/20 bg-blue-500/[.06] text-blue-300";
  }

  if (
    status ===
    "cancelled"
  ) {
    return "border-white/10 bg-white/[.025] text-slate-500";
  }

  return "border-amber-500/20 bg-amber-500/[.06] text-amber-300";
}


export default function TourTaskCenterPage() {
  const params =
    useParams<{
      id:
        string;
    }>();


  const tourId =
    String(
      params.id
    );


  const [
    companyId,
    setCompanyId,
  ] =
    useState("");


  const [
    currentUserId,
    setCurrentUserId,
  ] =
    useState("");


  const [
    tour,
    setTour,
  ] =
    useState<Tour | null>(
      null
    );


  const [
    departures,
    setDepartures,
  ] =
    useState<Departure[]>(
      []
    );


  const [
    selectedDepartureId,
    setSelectedDepartureId,
  ] =
    useState("");


  const [
    staff,
    setStaff,
  ] =
    useState<Staff[]>(
      []
    );


  const [
    tasks,
    setTasks,
  ] =
    useState<Task[]>(
      []
    );


  const [
    form,
    setForm,
  ] =
    useState<FormState>(
      EMPTY_FORM
    );


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
      "all" |
      TaskStatus |
      "overdue"
    >(
      "all"
    );


  const [
    loading,
    setLoading,
  ] =
    useState(true);


  const [
    busy,
    setBusy,
  ] =
    useState(false);


  const [
    error,
    setError,
  ] =
    useState("");


  const [
    notice,
    setNotice,
  ] =
    useState("");


  const loadTasks =
    useCallback(
      async (
        currentCompanyId:
          string,

        departureId:
          string
      ) => {

        let query =
          supabase
            .from(
              "tour_operation_tasks"
            )
            .select(
              [
                "id",
                "company_id",
                "tour_id",
                "departure_id",
                "assignee_staff_id",
                "title",
                "description",
                "task_type",
                "priority",
                "status",
                "due_at",
                "started_at",
                "completed_at",
                "completion_note",
                "created_at",
              ].join(",")
            )
            .eq(
              "company_id",
              currentCompanyId
            )
            .eq(
              "tour_id",
              tourId
            )
            .order(
              "due_at",
              {
                ascending:
                  true,
                nullsFirst:
                  false,
              }
            )
            .order(
              "created_at",
              {
                ascending:
                  false,
              }
            );


        if (
          departureId
        ) {
          query =
            query.eq(
              "departure_id",
              departureId
            );
        }


        const {
          data,
          error:
            taskError,
        } =
          await query;


        if (
          taskError
        ) {
          throw taskError;
        }


        setTasks(
          (
            data ??
            []
          ) as unknown as
            Task[]
        );

      },
      [
        tourId,
      ]
    );


  const initialize =
    useCallback(
      async () => {

        setLoading(
          true
        );

        setError(
          ""
        );


        try {

          const {
            data:
              authData,

            error:
              authError,
          } =
            await supabase
              .auth
              .getUser();


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


          if (
            !membership
          ) {
            throw new Error(
              "Firma üyeliği bulunamadı."
            );
          }


          const currentCompanyId =
            membership.company_id;


          setCompanyId(
            currentCompanyId
          );


          const [
            tourResult,
            departureResult,
            staffResult,
          ] =
            await Promise.all([

              supabase
                .from(
                  "tours"
                )
                .select(
                  "id,title,transport_mode"
                )
                .eq(
                  "company_id",
                  currentCompanyId
                )
                .eq(
                  "id",
                  tourId
                )
                .maybeSingle(),


              supabase
                .from(
                  "tour_departures"
                )
                .select(
                  [
                    "id",
                    "departure_date",
                    "capacity",
                    "reserved_count",
                  ].join(",")
                )
                .eq(
                  "tour_id",
                  tourId
                )
                .order(
                  "departure_date",
                  {
                    ascending:
                      true,
                  }
                ),


              supabase
                .from(
                  "staff_profiles"
                )
                .select(
                  [
                    "id",
                    "full_name",
                    "staff_role",
                    "phone",
                  ].join(",")
                )
                .eq(
                  "company_id",
                  currentCompanyId
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
            tourResult.error
          ) {
            throw tourResult.error;
          }


          if (
            departureResult.error
          ) {
            throw departureResult.error;
          }


          if (
            staffResult.error
          ) {
            throw staffResult.error;
          }


          if (
            !tourResult.data
          ) {
            throw new Error(
              "Tur bulunamadı."
            );
          }


          const loadedDepartures =
            (
              departureResult.data ??
              []
            ) as unknown as
              Departure[];


          setTour(
            tourResult.data as unknown as
              Tour
          );


          setDepartures(
            loadedDepartures
          );


          setStaff(
            (
              staffResult.data ??
              []
            ) as unknown as
              Staff[]
          );


          if (
            loadedDepartures.length >
            0
          ) {

            const today =
              new Date()
                .toISOString()
                .slice(
                  0,
                  10
                );


            const target =
              loadedDepartures.find(
                item =>
                  item.departure_date >=
                  today
              ) ??
              loadedDepartures[
                loadedDepartures.length -
                1
              ];


            setSelectedDepartureId(
              target.id
            );


            await loadTasks(
              currentCompanyId,
              target.id
            );

          } else {

            await loadTasks(
              currentCompanyId,
              ""
            );

          }


        } catch (
          currentError
        ) {

          setError(
            currentError instanceof
              Error
              ? currentError.message
              : String(
                  currentError
                )
          );


        } finally {

          setLoading(
            false
          );

        }

      },
      [
        loadTasks,
        tourId,
      ]
    );


  useEffect(() => {
    void initialize();
  }, [
    initialize,
  ]);


  async function changeDeparture(
    departureId:
      string
  ) {

    setSelectedDepartureId(
      departureId
    );


    if (
      !companyId
    ) {
      return;
    }


    setBusy(
      true
    );


    try {

      await loadTasks(
        companyId,
        departureId
      );


    } catch (
      currentError
    ) {

      setError(
        currentError instanceof
          Error
          ? currentError.message
          : String(
              currentError
            )
      );


    } finally {

      setBusy(
        false
      );

    }

  }


  async function saveTask(
    event:
      FormEvent
  ) {

    event.preventDefault();


    if (
      !companyId ||
      !tour
    ) {
      return;
    }


    if (
      !form.title.trim()
    ) {
      setError(
        "Görev başlığı zorunlu."
      );
      return;
    }


    setBusy(
      true
    );

    setError(
      ""
    );

    setNotice(
      ""
    );


    try {

      const {
        error:
          insertError,
      } =
        await supabase
          .from(
            "tour_operation_tasks"
          )
          .insert({
            company_id:
              companyId,

            tour_id:
              tour.id,

            departure_id:
              selectedDepartureId ||
              null,

            assignee_staff_id:
              form.assigneeStaffId ||
              null,

            title:
              form.title.trim(),

            description:
              form.description.trim() ||
              null,

            task_type:
              form.taskType,

            priority:
              form.priority,

            status:
              "pending",

            due_at:
              form.dueAt
                ? new Date(
                    form.dueAt
                  ).toISOString()
                : null,

            created_by:
              currentUserId ||
              null,

            updated_by:
              currentUserId ||
              null,
          });


      if (
        insertError
      ) {
        throw insertError;
      }


      setForm(
        EMPTY_FORM
      );


      await loadTasks(
        companyId,
        selectedDepartureId
      );


      setNotice(
        "Görev oluşturuldu."
      );


    } catch (
      currentError
    ) {

      setError(
        currentError instanceof
          Error
          ? currentError.message
          : String(
              currentError
            )
      );


    } finally {

      setBusy(
        false
      );

    }

  }


  async function changeStatus(
    task:
      Task,

    status:
      TaskStatus
  ) {

    setBusy(
      true
    );

    setError(
      ""
    );


    try {

      const {
        error:
          updateError,
      } =
        await supabase
          .from(
            "tour_operation_tasks"
          )
          .update({
            status,

            updated_by:
              currentUserId ||
              null,

            completed_at:
              status ===
              "completed"
                ? new Date()
                    .toISOString()
                : null,
          })
          .eq(
            "company_id",
            companyId
          )
          .eq(
            "id",
            task.id
          );


      if (
        updateError
      ) {
        throw updateError;
      }


      await loadTasks(
        companyId,
        selectedDepartureId
      );


      setNotice(
        status ===
        "completed"
          ? "Görev tamamlandı."
          : "Görev durumu güncellendi."
      );


    } catch (
      currentError
    ) {

      setError(
        currentError instanceof
          Error
          ? currentError.message
          : String(
              currentError
            )
      );


    } finally {

      setBusy(
        false
      );

    }

  }


  async function deleteTask(
    task:
      Task
  ) {

    if (
      !window.confirm(
        "Bu görevi silmek istediğinize emin misiniz?"
      )
    ) {
      return;
    }


    setBusy(
      true
    );


    try {

      const {
        error:
          deleteError,
      } =
        await supabase
          .from(
            "tour_operation_tasks"
          )
          .delete()
          .eq(
            "company_id",
            companyId
          )
          .eq(
            "id",
            task.id
          );


      if (
        deleteError
      ) {
        throw deleteError;
      }


      await loadTasks(
        companyId,
        selectedDepartureId
      );


      setNotice(
        "Görev silindi."
      );


    } catch (
      currentError
    ) {

      setError(
        currentError instanceof
          Error
          ? currentError.message
          : String(
              currentError
            )
      );


    } finally {

      setBusy(
        false
      );

    }

  }


  const overdueCount =
    tasks.filter(
      isOverdue
    ).length;


  const pendingCount =
    tasks.filter(
      task =>
        task.status ===
        "pending"
    ).length;


  const progressCount =
    tasks.filter(
      task =>
        task.status ===
        "in_progress"
    ).length;


  const completedCount =
    tasks.filter(
      task =>
        task.status ===
        "completed"
    ).length;


  const criticalOpenCount =
    tasks.filter(
      task =>
        task.priority ===
          "critical" &&
        ![
          "completed",
          "cancelled",
        ].includes(
          task.status
        )
    ).length;


  const visibleTasks =
    useMemo(
      () => {

        const query =
          search
            .trim()
            .toLocaleLowerCase(
              "tr-TR"
            );


        return tasks.filter(
          task => {

            if (
              statusFilter ===
                "overdue" &&
              !isOverdue(
                task
              )
            ) {
              return false;
            }


            if (
              statusFilter !==
                "all" &&
              statusFilter !==
                "overdue" &&
              task.status !==
                statusFilter
            ) {
              return false;
            }


            const assignee =
              staff.find(
                person =>
                  person.id ===
                  task.assignee_staff_id
              );


            if (
              query &&
              ![
                task.title,
                task.description,
                taskTypeLabels[
                  task.task_type
                ],
                assignee?.full_name,
                assignee?.staff_role,
              ]
                .filter(Boolean)
                .some(
                  value =>
                    String(value)
                      .toLocaleLowerCase(
                        "tr-TR"
                      )
                      .includes(
                        query
                      )
                )
            ) {
              return false;
            }


            return true;

          }
        );

      },
      [
        search,
        staff,
        statusFilter,
        tasks,
      ]
    );


  if (
    loading
  ) {

    return (
      <main className="grid min-h-[70vh] place-items-center bg-[#030a11] text-white">
        Görev merkezi yükleniyor...
      </main>
    );

  }


  return (
    <main className="min-h-screen bg-[#030a11] text-white">

      <div className="mx-auto max-w-[1650px] px-5 py-7 lg:px-8">

        <div className="flex items-center justify-between gap-3">

          <Link
            href={`/dashboard/turlar/${tourId}`}
            className="inline-flex items-center gap-2 text-[8px] font-black text-slate-500 hover:text-orange-300"
          >
            <FaArrowLeft />
            Tur Operasyon Merkezi
          </Link>


          <Link
            href="/dashboard/gorev-atama"
            className="rounded-xl border border-white/10 bg-white/[.025] px-4 py-2.5 text-[8px] font-black text-slate-400"
          >
            Mevcut Araç / Rehber Atama
          </Link>

        </div>


        <section className="mt-4 rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,.14),transparent_36%),linear-gradient(145deg,#07131f,#03080e)] p-6 lg:p-8">

          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">

            <div>

              <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/[.07] px-3 py-1.5 text-[8px] font-black uppercase tracking-[.15em] text-orange-300">
                <FaTasks />
                GÖREV & PERSONEL OPERASYON MERKEZİ
              </div>


              <h1 className="mt-4 text-3xl font-black tracking-[-.04em] lg:text-4xl">
                {tour?.title ||
                  "Tur"}
              </h1>


              <p className="mt-3 text-[8px] text-slate-500">
                Gerçek görev, sorumlu personel, deadline ve gecikme takibi
              </p>

            </div>


            <select
              value={
                selectedDepartureId
              }
              disabled={
                busy
              }
              onChange={event =>
                void changeDeparture(
                  event.target.value
                )
              }
              className="min-h-11 rounded-xl border border-white/10 bg-[#030a11] px-4 text-[8px] font-black"
            >

              {departures.length ===
              0 ? (
                <option value="">
                  Çıkış kaydı yok
                </option>
              ) : (
                departures.map(
                  departure => (
                    <option
                      key={
                        departure.id
                      }
                      value={
                        departure.id
                      }
                    >
                      {new Date(
                        `${departure.departure_date}T00:00:00`
                      ).toLocaleDateString(
                        "tr-TR"
                      )}
                      {" · "}
                      {departure.reserved_count}
                      {"/"}
                      {departure.capacity}
                    </option>
                  )
                )
              )}

            </select>

          </div>

        </section>


        {error && (
          <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/[.06] px-4 py-3 text-[8px] font-black text-red-300">
            {error}
          </div>
        )}


        {notice && (
          <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/[.06] px-4 py-3 text-[8px] font-black text-emerald-300">
            {notice}
          </div>
        )}


        <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">

          <article className="rounded-[22px] border border-white/10 bg-[#07131f] p-5">
            <div className="text-[7px] font-black text-slate-600">
              BEKLİYOR
            </div>

            <div className="mt-3 text-3xl font-black">
              {pendingCount}
            </div>
          </article>


          <article className="rounded-[22px] border border-blue-500/15 bg-blue-500/[.04] p-5">
            <div className="text-[7px] font-black text-blue-300">
              DEVAM EDİYOR
            </div>

            <div className="mt-3 text-3xl font-black">
              {progressCount}
            </div>
          </article>


          <article className="rounded-[22px] border border-emerald-500/15 bg-emerald-500/[.04] p-5">
            <div className="text-[7px] font-black text-emerald-300">
              TAMAMLANDI
            </div>

            <div className="mt-3 text-3xl font-black">
              {completedCount}
            </div>
          </article>


          <article className="rounded-[22px] border border-red-500/15 bg-red-500/[.04] p-5">
            <div className="text-[7px] font-black text-red-300">
              GECİKMİŞ
            </div>

            <div className="mt-3 text-3xl font-black">
              {overdueCount}
            </div>
          </article>


          <article className="rounded-[22px] border border-orange-500/15 bg-orange-500/[.04] p-5">
            <div className="text-[7px] font-black text-orange-300">
              KRİTİK AÇIK
            </div>

            <div className="mt-3 text-3xl font-black">
              {criticalOpenCount}
            </div>
          </article>

        </section>


        <section className="mt-5 grid gap-5 xl:grid-cols-[410px_1fr]">

          <form
            onSubmit={
              saveTask
            }
            className="rounded-[26px] border border-white/10 bg-[#07131f] p-5"
          >

            <div className="flex items-center gap-2 text-[9px] font-black">
              <FaPlus className="text-orange-300" />
              Yeni Operasyon Görevi
            </div>


            <div className="mt-5 grid gap-3">

              <input
                value={
                  form.title
                }
                onChange={event =>
                  setForm(
                    current => ({
                      ...current,
                      title:
                        event.target.value,
                    })
                  )
                }
                placeholder="Görev başlığı"
                className="h-11 rounded-xl border border-white/10 bg-[#030a11] px-3 text-[8px]"
              />


              <textarea
                rows={3}
                value={
                  form.description
                }
                onChange={event =>
                  setForm(
                    current => ({
                      ...current,
                      description:
                        event.target.value,
                    })
                  )
                }
                placeholder="Görev açıklaması"
                className="rounded-xl border border-white/10 bg-[#030a11] p-3 text-[8px]"
              />


              <div className="grid grid-cols-2 gap-3">

                <select
                  value={
                    form.taskType
                  }
                  onChange={event =>
                    setForm(
                      current => ({
                        ...current,
                        taskType:
                          event.target.value as
                            TaskType,
                      })
                    )
                  }
                  className="h-10 rounded-xl border border-white/10 bg-[#030a11] px-2 text-[7px]"
                >

                  {(
                    Object.keys(
                      taskTypeLabels
                    ) as
                      TaskType[]
                  ).map(
                    type => (
                      <option
                        key={
                          type
                        }
                        value={
                          type
                        }
                      >
                        {taskTypeLabels[type]}
                      </option>
                    )
                  )}

                </select>


                <select
                  value={
                    form.priority
                  }
                  onChange={event =>
                    setForm(
                      current => ({
                        ...current,
                        priority:
                          event.target.value as
                            Priority,
                      })
                    )
                  }
                  className="h-10 rounded-xl border border-white/10 bg-[#030a11] px-2 text-[7px]"
                >

                  {(
                    Object.keys(
                      priorityLabels
                    ) as
                      Priority[]
                  ).map(
                    priority => (
                      <option
                        key={
                          priority
                        }
                        value={
                          priority
                        }
                      >
                        {priorityLabels[
                          priority
                        ]}
                      </option>
                    )
                  )}

                </select>

              </div>


              <select
                value={
                  form.assigneeStaffId
                }
                onChange={event =>
                  setForm(
                    current => ({
                      ...current,
                      assigneeStaffId:
                        event.target.value,
                    })
                  )
                }
                className="h-11 rounded-xl border border-white/10 bg-[#030a11] px-3 text-[8px]"
              >

                <option value="">
                  Sorumlu personel seç
                </option>

                {staff.map(
                  person => (
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
                      {person.staff_role}
                    </option>
                  )
                )}

              </select>


              <label className="space-y-1">

                <span className="text-[7px] font-black text-slate-600">
                  SON TARİH
                </span>

                <input
                  type="datetime-local"
                  value={
                    form.dueAt
                  }
                  onChange={event =>
                    setForm(
                      current => ({
                        ...current,
                        dueAt:
                          event.target.value,
                      })
                    )
                  }
                  className="h-11 w-full rounded-xl border border-white/10 bg-[#030a11] px-3 text-[8px]"
                />

              </label>


              <button
                type="submit"
                disabled={
                  busy
                }
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-orange-500 text-[8px] font-black disabled:opacity-40"
              >
                <FaPlus />
                Görevi Oluştur
              </button>

            </div>

          </form>


          <section>

            <div className="rounded-[22px] border border-white/10 bg-[#07131f] p-4">

              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">

                <div className="relative w-full max-w-xl">

                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[8px] text-slate-600" />

                  <input
                    value={
                      search
                    }
                    onChange={event =>
                      setSearch(
                        event.target.value
                      )
                    }
                    placeholder="Görev veya personel ara..."
                    className="h-11 w-full rounded-xl border border-white/10 bg-[#030a11] pl-9 pr-3 text-[8px]"
                  />

                </div>


                <select
                  value={
                    statusFilter
                  }
                  onChange={event =>
                    setStatusFilter(
                      event.target.value as
                        typeof statusFilter
                    )
                  }
                  className="h-10 rounded-xl border border-white/10 bg-[#030a11] px-3 text-[8px]"
                >

                  <option value="all">
                    Tüm Görevler
                  </option>

                  <option value="overdue">
                    Gecikmiş
                  </option>

                  <option value="pending">
                    Bekliyor
                  </option>

                  <option value="in_progress">
                    Devam Ediyor
                  </option>

                  <option value="completed">
                    Tamamlandı
                  </option>

                </select>

              </div>

            </div>


            <div className="mt-3 space-y-3">

              {visibleTasks.length ===
              0 ? (

                <div className="rounded-[24px] border border-dashed border-white/10 bg-[#07131f] p-10 text-center">

                  <FaTasks className="mx-auto text-3xl text-slate-800" />

                  <div className="mt-4 text-[9px] font-black">
                    Görev bulunamadı
                  </div>

                  <div className="mt-2 text-[7px] text-slate-600">
                    Gerçek operasyon görevi oluşturulduğunda burada görünür.
                  </div>

                </div>

              ) : (

                visibleTasks.map(
                  task => {

                    const assignee =
                      staff.find(
                        person =>
                          person.id ===
                          task.assignee_staff_id
                      );


                    const overdue =
                      isOverdue(
                        task
                      );


                    return (
                      <article
                        key={
                          task.id
                        }
                        className={`rounded-[22px] border p-4 ${
                          overdue
                            ? "border-red-500/20 bg-red-500/[.035]"
                            : "border-white/10 bg-[#07131f]"
                        }`}
                      >

                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">

                          <div className="min-w-0">

                            <div className="flex flex-wrap items-center gap-2">

                              <span
                                className={`rounded-full border px-2.5 py-1 text-[7px] font-black ${priorityClass(
                                  task.priority
                                )}`}
                              >
                                {priorityLabels[
                                  task.priority
                                ]}
                              </span>


                              <span className="rounded-full border border-white/10 bg-white/[.025] px-2.5 py-1 text-[7px] font-black text-slate-400">
                                {taskTypeLabels[
                                  task.task_type
                                ]}
                              </span>


                              <span
                                className={`rounded-full border px-2.5 py-1 text-[7px] font-black ${statusClass(
                                  task.status
                                )}`}
                              >
                                {statusLabels[
                                  task.status
                                ]}
                              </span>


                              {overdue && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-red-500/20 bg-red-500/[.07] px-2.5 py-1 text-[7px] font-black text-red-300">
                                  <FaExclamationTriangle />
                                  Gecikti
                                </span>
                              )}

                            </div>


                            <div className="mt-3 text-[10px] font-black">
                              {task.title}
                            </div>


                            {task.description && (
                              <div className="mt-2 max-w-3xl text-[8px] leading-5 text-slate-500">
                                {task.description}
                              </div>
                            )}


                            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[7px] text-slate-600">

                              <span className="inline-flex items-center gap-1">
                                <FaUserTie />

                                {assignee
                                  ? `${assignee.full_name} · ${assignee.staff_role}`
                                  : "Sorumlu atanmadı"}
                              </span>


                              <span className="inline-flex items-center gap-1">
                                <FaCalendarAlt />

                                {task.due_at
                                  ? formatDate(
                                      task.due_at
                                    )
                                  : "Son tarih yok"}
                              </span>

                            </div>

                          </div>


                          <div className="flex shrink-0 flex-wrap gap-2">

                            {task.status !==
                              "in_progress" &&
                              task.status !==
                              "completed" && (
                              <button
                                type="button"
                                disabled={
                                  busy
                                }
                                onClick={() =>
                                  void changeStatus(
                                    task,
                                    "in_progress"
                                  )
                                }
                                className="inline-flex h-9 items-center gap-1 rounded-lg border border-blue-500/20 bg-blue-500/[.06] px-3 text-[7px] font-black text-blue-300"
                              >
                                <FaPlay />
                                Başlat
                              </button>
                            )}


                            {task.status !==
                              "completed" && (
                              <button
                                type="button"
                                disabled={
                                  busy
                                }
                                onClick={() =>
                                  void changeStatus(
                                    task,
                                    "completed"
                                  )
                                }
                                className="inline-flex h-9 items-center gap-1 rounded-lg bg-emerald-500 px-3 text-[7px] font-black"
                              >
                                <FaCheckCircle />
                                Tamamla
                              </button>
                            )}


                            {task.status ===
                              "completed" && (
                              <button
                                type="button"
                                disabled={
                                  busy
                                }
                                onClick={() =>
                                  void changeStatus(
                                    task,
                                    "pending"
                                  )
                                }
                                className="inline-flex h-9 items-center gap-1 rounded-lg border border-white/10 px-3 text-[7px] font-black text-slate-400"
                              >
                                <FaClock />
                                Yeniden Aç
                              </button>
                            )}


                            <button
                              type="button"
                              disabled={
                                busy
                              }
                              onClick={() =>
                                void deleteTask(
                                  task
                                )
                              }
                              className="grid h-9 w-9 place-items-center rounded-lg border border-red-500/20 bg-red-500/[.05] text-red-300"
                            >
                              <FaTrash />
                            </button>

                          </div>

                        </div>

                      </article>
                    );

                  }
                )

              )}

            </div>

          </section>

        </section>

      </div>

    </main>
  );
}
