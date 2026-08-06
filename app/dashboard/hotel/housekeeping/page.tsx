"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  FaBed,
  FaBroom,
  FaCheckCircle,
  FaClipboardCheck,
  FaExclamationTriangle,
  FaPlay,
  FaPlus,
  FaSearch,
  FaSync,
  FaTimes,
  FaTrash,
  FaUser,
} from "react-icons/fa";
import { supabase } from "@/lib/supabase";
import {
  CurrentMembership,
  getCurrentMembership,
} from "@/lib/current-user";
import {
  cancelTask,
  createHousekeepingTask,
  getHousekeepingData,
  HousekeepingPriority,
  HousekeepingRoom,
  HousekeepingTask,
  HousekeepingTaskStatus,
  HousekeepingTaskType,
  syncDirtyRooms,
  updateTaskDetails,
  updateTaskStatus,
} from "@/lib/hotel/housekeeping/housekeeping-service";

function firstRelation<T>(
  value: T | T[] | null | undefined
): T | null {
  if (!value) return null;

  return Array.isArray(value)
    ? value[0] ?? null
    : value;
}

const taskTypeLabels: Record<
  HousekeepingTaskType,
  string
> = {
  checkout_cleaning:
    "Çıkış Temizliği",
  stayover_cleaning:
    "Konaklayan Misafir Temizliği",
  deep_cleaning:
    "Detaylı Temizlik",
  inspection:
    "Supervisor Kontrolü",
  linen_change:
    "Nevresim Değişimi",
  minibar_check:
    "Minibar Kontrolü",
  other: "Diğer",
};

const statusLabels: Record<
  HousekeepingTaskStatus,
  string
> = {
  pending: "Bekliyor",
  assigned: "Atandı",
  in_progress: "Temizleniyor",
  completed: "Tamamlandı",
  inspected: "Kontrol Edildi",
  cancelled: "İptal",
};

const priorityLabels: Record<
  HousekeepingPriority,
  string
> = {
  low: "Düşük",
  normal: "Normal",
  high: "Yüksek",
  urgent: "Acil",
};

function statusClass(
  status: HousekeepingTaskStatus
): string {
  switch (status) {
    case "in_progress":
      return "bg-blue-500/15 text-blue-400";

    case "completed":
      return "bg-emerald-500/15 text-emerald-400";

    case "inspected":
      return "bg-violet-500/15 text-violet-400";

    case "assigned":
      return "bg-cyan-500/15 text-cyan-400";

    default:
      return "bg-amber-500/15 text-amber-400";
  }
}

function priorityClass(
  priority: HousekeepingPriority
): string {
  switch (priority) {
    case "urgent":
      return "bg-red-500/15 text-red-400";

    case "high":
      return "bg-orange-500/15 text-orange-400";

    case "low":
      return "bg-slate-500/15 text-slate-400";

    default:
      return "bg-blue-500/15 text-blue-400";
  }
}

export default function HousekeepingPage() {
  const [membership, setMembership] =
    useState<CurrentMembership | null>(
      null
    );

  const [tasks, setTasks] =
    useState<HousekeepingTask[]>([]);

  const [rooms, setRooms] =
    useState<HousekeepingRoom[]>([]);

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("");

  const [floorFilter, setFloorFilter] =
    useState("");

  const [
    selectedTask,
    setSelectedTask,
  ] =
    useState<HousekeepingTask | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [processing, setProcessing] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const [newTaskForm, setNewTaskForm] =
    useState({
      roomId: "",
      taskType:
        "checkout_cleaning" as
          HousekeepingTaskType,
      priority:
        "normal" as
          HousekeepingPriority,
      assignedStaffName: "",
      notes: "",
    });

  const [detailForm, setDetailForm] =
    useState({
      assignedStaffName: "",
      priority:
        "normal" as
          HousekeepingPriority,
      notes: "",
    });

  const loadData = useCallback(
    async (companyId: string) => {
      const data =
        await getHousekeepingData(
          companyId
        );

      setTasks(data.tasks);
      setRooms(data.rooms);
    },
    []
  );

  useEffect(() => {
    async function initialize() {
      try {
        const {
          data: { user },
        } =
          await supabase.auth.getUser();

        if (!user) {
          throw new Error(
            "Kullanıcı oturumu bulunamadı."
          );
        }

        const currentMembership =
          await getCurrentMembership(
            user.id
          );

        if (!currentMembership) {
          throw new Error(
            "Aktif şirket üyeliği bulunamadı."
          );
        }

        setMembership(
          currentMembership
        );

        await loadData(
          currentMembership.company_id
        );
      } catch (error: unknown) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Housekeeping yüklenemedi."
        );
      } finally {
        setLoading(false);
      }
    }

    void initialize();
  }, [loadData]);

  const floorOptions = useMemo(
    () =>
      Array.from(
        new Set(
          rooms
            .map(
              (room) =>
                room.floor_number
            )
            .filter(Boolean)
        )
      ).sort(),
    [rooms]
  );

  const visibleTasks = useMemo(() => {
    const query = search
      .trim()
      .toLocaleLowerCase("tr-TR");

    return tasks.filter((task) => {
      const room = firstRelation(
        task.room
      );

      const hotel = firstRelation(
        task.hotel
      );

      if (
        statusFilter &&
        task.status !== statusFilter
      ) {
        return false;
      }

      if (
        floorFilter &&
        room?.floor_number !==
          floorFilter
      ) {
        return false;
      }

      if (!query) return true;

      return [
        room?.room_number,
        room?.floor_number,
        hotel?.name,
        task.assigned_staff_name,
        taskTypeLabels[
          task.task_type
        ],
        statusLabels[task.status],
      ]
        .filter(Boolean)
        .some((value) =>
          String(value)
            .toLocaleLowerCase(
              "tr-TR"
            )
            .includes(query)
        );
    });
  }, [
    floorFilter,
    search,
    statusFilter,
    tasks,
  ]);

  const stats = useMemo(
    () => ({
      pending: tasks.filter(
        (task) =>
          task.status === "pending" ||
          task.status === "assigned"
      ).length,

      inProgress: tasks.filter(
        (task) =>
          task.status ===
          "in_progress"
      ).length,

      completed: tasks.filter(
        (task) =>
          task.status ===
          "completed"
      ).length,

      inspected: tasks.filter(
        (task) =>
          task.status ===
          "inspected"
      ).length,

      dirtyRooms: rooms.filter(
        (room) =>
          room.housekeeping_status ===
          "dirty"
      ).length,

      maintenanceRooms: rooms.filter(
        (room) =>
          room.room_status ===
            "maintenance" ||
          room.room_status ===
            "out_of_order"
      ).length,
    }),
    [rooms, tasks]
  );

  async function refresh() {
    if (!membership) return;

    await loadData(
      membership.company_id
    );
  }

  async function handleSync() {
    if (!membership || processing) {
      return;
    }

    setProcessing(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const count =
        await syncDirtyRooms(
          membership.company_id
        );

      await refresh();

      setSuccessMessage(
        count > 0
          ? `${count} kirli oda için temizlik görevi oluşturuldu.`
          : "Göreve dönüştürülecek yeni kirli oda bulunmuyor."
      );
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Kirli odalar senkronize edilemedi."
      );
    } finally {
      setProcessing(false);
    }
  }

  async function submitNewTask(
    event: FormEvent
  ) {
    event.preventDefault();

    if (!membership || processing) {
      return;
    }

    const room = rooms.find(
      (item) =>
        item.id ===
        newTaskForm.roomId
    );

    if (!room) {
      setErrorMessage(
        "Görev için oda seçilmelidir."
      );

      return;
    }

    setProcessing(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      await createHousekeepingTask({
        companyId:
          membership.company_id,
        hotelId: room.hotel_id,
        roomId: room.id,
        taskType:
          newTaskForm.taskType,
        priority:
          newTaskForm.priority,
        assignedStaffName:
          newTaskForm
            .assignedStaffName
            .trim() || null,
        notes:
          newTaskForm.notes.trim() ||
          null,
        userId: user?.id ?? null,
      });

      setNewTaskForm({
        roomId: "",
        taskType:
          "checkout_cleaning",
        priority: "normal",
        assignedStaffName: "",
        notes: "",
      });

      await refresh();

      setSuccessMessage(
        "Housekeeping görevi oluşturuldu."
      );
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Görev oluşturulamadı."
      );
    } finally {
      setProcessing(false);
    }
  }

  async function changeStatus(
    task: HousekeepingTask,
    status: HousekeepingTaskStatus
  ) {
    if (!membership || processing) {
      return;
    }

    setProcessing(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await updateTaskStatus(
        membership.company_id,
        task.id,
        status
      );

      await refresh();

      setSelectedTask(null);

      setSuccessMessage(
        `Görev durumu “${statusLabels[status]}” olarak güncellendi.`
      );
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Görev durumu güncellenemedi."
      );
    } finally {
      setProcessing(false);
    }
  }

  function openTask(
    task: HousekeepingTask
  ) {
    setSelectedTask(task);

    setDetailForm({
      assignedStaffName:
        task.assigned_staff_name ??
        "",
      priority: task.priority,
      notes: task.notes ?? "",
    });
  }

  async function saveTaskDetails(
    event: FormEvent
  ) {
    event.preventDefault();

    if (
      !membership ||
      !selectedTask ||
      processing
    ) {
      return;
    }

    setProcessing(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await updateTaskDetails({
        companyId:
          membership.company_id,
        taskId: selectedTask.id,
        assignedStaffName:
          detailForm
            .assignedStaffName
            .trim() || null,
        priority:
          detailForm.priority,
        notes:
          detailForm.notes.trim() ||
          null,
      });

      await refresh();

      setSelectedTask(null);

      setSuccessMessage(
        "Görev detayları güncellendi."
      );
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Görev detayları güncellenemedi."
      );
    } finally {
      setProcessing(false);
    }
  }

  async function handleCancelTask(
    task: HousekeepingTask
  ) {
    if (
      !membership ||
      processing ||
      !window.confirm(
        "Bu housekeeping görevi iptal edilsin mi?"
      )
    ) {
      return;
    }

    setProcessing(true);

    try {
      await cancelTask(
        membership.company_id,
        task.id
      );

      await refresh();

      setSelectedTask(null);

      setSuccessMessage(
        "Housekeeping görevi iptal edildi."
      );
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Görev iptal edilemedi."
      );
    } finally {
      setProcessing(false);
    }
  }

  if (loading) {
    return (
      <main className="p-10 text-white">
        Housekeeping yükleniyor...
      </main>
    );
  }

  return (
    <main className="px-5 py-10 lg:px-10">
      <div className="mx-auto max-w-[1700px]">
        <header className="flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.25em] text-orange-400">
              TUROS HOTEL PMS
            </p>

            <h1 className="mt-3 text-4xl font-black md:text-5xl">
              Housekeeping PRO
            </h1>

            <p className="mt-4 max-w-4xl text-slate-400">
              Temizlik görevlerini,
              kat görevlilerini ve oda
              hazırlık süreçlerini tek
              merkezden yönetin.
            </p>
          </div>

          <button
            type="button"
            disabled={processing}
            onClick={() =>
              void handleSync()
            }
            className="flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-orange-500 px-7 font-black disabled:opacity-50"
          >
            <FaSync
              className={
                processing
                  ? "animate-spin"
                  : ""
              }
            />

            Kirli Odaları Göreve Dönüştür
          </button>
        </header>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          {[
            {
              label: "Bekleyen",
              value: stats.pending,
              icon: FaExclamationTriangle,
            },
            {
              label: "Temizleniyor",
              value: stats.inProgress,
              icon: FaBroom,
            },
            {
              label: "Tamamlandı",
              value: stats.completed,
              icon: FaCheckCircle,
            },
            {
              label: "Kontrol Edildi",
              value: stats.inspected,
              icon: FaClipboardCheck,
            },
            {
              label: "Kirli Oda",
              value: stats.dirtyRooms,
              icon: FaBed,
            },
            {
              label: "Bakım / OOO",
              value:
                stats.maintenanceRooms,
              icon:
                FaExclamationTriangle,
            },
          ].map((item) => {
            const Icon = item.icon;

            return (
              <article
                key={item.label}
                className="rounded-3xl border border-white/10 bg-slate-900 p-5"
              >
                <Icon className="text-orange-400" />

                <p className="mt-4 text-xs text-slate-500">
                  {item.label}
                </p>

                <p className="mt-1 text-3xl font-black">
                  {item.value}
                </p>
              </article>
            );
          })}
        </section>

        {errorMessage && (
          <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 font-bold text-red-400">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 font-bold text-emerald-400">
            {successMessage}
          </div>
        )}

        <form
          onSubmit={submitNewTask}
          className="mt-8 rounded-[30px] border border-white/10 bg-slate-900 p-6"
        >
          <h2 className="flex items-center gap-3 text-2xl font-black">
            <FaPlus className="text-orange-400" />
            Yeni Housekeeping Görevi
          </h2>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <select
              required
              value={
                newTaskForm.roomId
              }
              onChange={(event) =>
                setNewTaskForm(
                  (current) => ({
                    ...current,
                    roomId:
                      event.target.value,
                  })
                )
              }
              className="min-h-12 rounded-xl bg-white px-4 font-bold text-slate-950"
            >
              <option value="">
                Oda seçin
              </option>

              {rooms.map((room) => (
                <option
                  key={room.id}
                  value={room.id}
                >
                  Oda {room.room_number}
                  {room.floor_number
                    ? ` · Kat ${room.floor_number}`
                    : ""}
                  {" · "}
                  {firstRelation(
                    room.hotel
                  )?.name ?? ""}
                </option>
              ))}
            </select>

            <select
              value={
                newTaskForm.taskType
              }
              onChange={(event) =>
                setNewTaskForm(
                  (current) => ({
                    ...current,
                    taskType:
                      event.target
                        .value as
                        HousekeepingTaskType,
                  })
                )
              }
              className="min-h-12 rounded-xl bg-white px-4 font-bold text-slate-950"
            >
              {Object.entries(
                taskTypeLabels
              ).map(
                ([value, label]) => (
                  <option
                    key={value}
                    value={value}
                  >
                    {label}
                  </option>
                )
              )}
            </select>

            <select
              value={
                newTaskForm.priority
              }
              onChange={(event) =>
                setNewTaskForm(
                  (current) => ({
                    ...current,
                    priority:
                      event.target
                        .value as
                        HousekeepingPriority,
                  })
                )
              }
              className="min-h-12 rounded-xl bg-white px-4 font-bold text-slate-950"
            >
              {Object.entries(
                priorityLabels
              ).map(
                ([value, label]) => (
                  <option
                    key={value}
                    value={value}
                  >
                    Öncelik: {label}
                  </option>
                )
              )}
            </select>

            <input
              value={
                newTaskForm.assignedStaffName
              }
              onChange={(event) =>
                setNewTaskForm(
                  (current) => ({
                    ...current,
                    assignedStaffName:
                      event.target.value,
                  })
                )
              }
              placeholder="Kat görevlisi"
              className="min-h-12 rounded-xl bg-white px-4 font-bold text-slate-950"
            />

            <button
              type="submit"
              disabled={processing}
              className="min-h-12 rounded-xl bg-orange-500 px-5 font-black disabled:opacity-50"
            >
              Görevi Oluştur
            </button>
          </div>
        </form>

        <section className="mt-7 rounded-[30px] border border-white/10 bg-slate-900 p-5">
          <div className="grid gap-4 md:grid-cols-3">
            <label className="flex min-h-12 items-center gap-3 rounded-xl bg-white px-4">
              <FaSearch className="text-orange-500" />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Oda, görevli veya görev ara"
                className="w-full bg-transparent font-bold text-slate-950 outline-none"
              />
            </label>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value
                )
              }
              className="min-h-12 rounded-xl bg-white px-4 font-bold text-slate-950"
            >
              <option value="">
                Tüm görev durumları
              </option>

              {Object.entries(
                statusLabels
              )
                .filter(
                  ([value]) =>
                    value !==
                    "cancelled"
                )
                .map(
                  ([value, label]) => (
                    <option
                      key={value}
                      value={value}
                    >
                      {label}
                    </option>
                  )
                )}
            </select>

            <select
              value={floorFilter}
              onChange={(event) =>
                setFloorFilter(
                  event.target.value
                )
              }
              className="min-h-12 rounded-xl bg-white px-4 font-bold text-slate-950"
            >
              <option value="">
                Tüm katlar
              </option>

              {floorOptions.map(
                (floor) => (
                  <option
                    key={floor}
                    value={floor ?? ""}
                  >
                    Kat {floor}
                  </option>
                )
              )}
            </select>
          </div>
        </section>

        <section className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {visibleTasks.map(
            (task) => {
              const room =
                firstRelation(task.room);

              const hotel =
                firstRelation(
                  task.hotel
                );

              return (
                <article
                  key={task.id}
                  className="rounded-[30px] border border-white/10 bg-slate-900 p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider text-orange-400">
                        {hotel?.name ??
                          "Otel"}
                      </p>

                      <h2 className="mt-2 text-3xl font-black">
                        Oda{" "}
                        {room?.room_number ??
                          "—"}
                      </h2>

                      <p className="mt-1 text-sm text-slate-500">
                        {room?.floor_number
                          ? `Kat ${room.floor_number} · `
                          : ""}
                        {
                          taskTypeLabels[
                            task.task_type
                          ]
                        }
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1.5 text-xs font-black ${priorityClass(
                        task.priority
                      )}`}
                    >
                      {
                        priorityLabels[
                          task.priority
                        ]
                      }
                    </span>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-3 py-1.5 text-xs font-black ${statusClass(
                        task.status
                      )}`}
                    >
                      {
                        statusLabels[
                          task.status
                        ]
                      }
                    </span>

                    {task.assigned_staff_name && (
                      <span className="flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 text-xs font-black text-slate-300">
                        <FaUser />
                        {
                          task.assigned_staff_name
                        }
                      </span>
                    )}
                  </div>

                  {task.notes && (
                    <p className="mt-4 rounded-2xl bg-slate-950 p-4 text-sm text-slate-400">
                      {task.notes}
                    </p>
                  )}

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    {[
                      "pending",
                      "assigned",
                    ].includes(
                      task.status
                    ) && (
                      <button
                        type="button"
                        disabled={processing}
                        onClick={() =>
                          void changeStatus(
                            task,
                            "in_progress"
                          )
                        }
                        className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-500 font-black"
                      >
                        <FaPlay />
                        Başlat
                      </button>
                    )}

                    {task.status ===
                      "in_progress" && (
                      <button
                        type="button"
                        disabled={processing}
                        onClick={() =>
                          void changeStatus(
                            task,
                            "completed"
                          )
                        }
                        className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-500 font-black"
                      >
                        <FaCheckCircle />
                        Tamamla
                      </button>
                    )}

                    {task.status ===
                      "completed" && (
                      <button
                        type="button"
                        disabled={processing}
                        onClick={() =>
                          void changeStatus(
                            task,
                            "inspected"
                          )
                        }
                        className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-violet-500 font-black"
                      >
                        <FaClipboardCheck />
                        Onayla
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        openTask(task)
                      }
                      className="min-h-11 rounded-xl border border-white/10 font-black"
                    >
                      Detay
                    </button>
                  </div>
                </article>
              );
            }
          )}
        </section>

        {visibleTasks.length === 0 && (
          <div className="mt-6 rounded-3xl border border-white/10 bg-slate-900 p-12 text-center text-slate-500">
            Filtrelere uygun housekeeping
            görevi bulunmuyor.
          </div>
        )}
      </div>

      {selectedTask && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Kapat"
            onClick={() =>
              setSelectedTask(null)
            }
            className="absolute inset-0"
          />

          <aside className="relative z-10 h-full w-full max-w-md overflow-y-auto border-l border-white/10 bg-slate-950 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-orange-400">
                  HOUSEKEEPING TASK
                </p>

                <h2 className="mt-2 text-3xl font-black">
                  Oda{" "}
                  {firstRelation(
                    selectedTask.room
                  )?.room_number ?? "—"}
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedTask(null)
                }
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5"
              >
                <FaTimes />
              </button>
            </div>

            <form
              onSubmit={saveTaskDetails}
              className="mt-7 space-y-4"
            >
              <label className="block">
                <span className="text-sm font-black">
                  Kat Görevlisi
                </span>

                <input
                  value={
                    detailForm.assignedStaffName
                  }
                  onChange={(event) =>
                    setDetailForm(
                      (current) => ({
                        ...current,
                        assignedStaffName:
                          event.target
                            .value,
                      })
                    )
                  }
                  placeholder="Görevli adı"
                  className="mt-2 min-h-12 w-full rounded-xl bg-white px-4 font-bold text-slate-950"
                />
              </label>

              <label className="block">
                <span className="text-sm font-black">
                  Öncelik
                </span>

                <select
                  value={
                    detailForm.priority
                  }
                  onChange={(event) =>
                    setDetailForm(
                      (current) => ({
                        ...current,
                        priority:
                          event.target
                            .value as
                            HousekeepingPriority,
                      })
                    )
                  }
                  className="mt-2 min-h-12 w-full rounded-xl bg-white px-4 font-bold text-slate-950"
                >
                  {Object.entries(
                    priorityLabels
                  ).map(
                    ([value, label]) => (
                      <option
                        key={value}
                        value={value}
                      >
                        {label}
                      </option>
                    )
                  )}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-black">
                  Notlar
                </span>

                <textarea
                  rows={5}
                  value={
                    detailForm.notes
                  }
                  onChange={(event) =>
                    setDetailForm(
                      (current) => ({
                        ...current,
                        notes:
                          event.target.value,
                      })
                    )
                  }
                  className="mt-2 w-full rounded-xl bg-white px-4 py-3 font-bold text-slate-950"
                />
              </label>

              <button
                type="submit"
                disabled={processing}
                className="min-h-12 w-full rounded-xl bg-orange-500 font-black disabled:opacity-50"
              >
                Detayları Güncelle
              </button>

              <button
                type="button"
                disabled={processing}
                onClick={() =>
                  void handleCancelTask(
                    selectedTask
                  )
                }
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-red-500/15 font-black text-red-400"
              >
                <FaTrash />
                Görevi İptal Et
              </button>
            </form>
          </aside>
        </div>
      )}
    </main>
  );
}
