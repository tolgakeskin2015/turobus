"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  FaArrowLeft,
  FaBirthdayCake,
  FaCalendarCheck,
  FaEnvelope,
  FaMoneyBillWave,
  FaPhone,
  FaPlus,
  FaStickyNote,
  FaTasks,
  FaWhatsapp,
} from "react-icons/fa";
import { supabase } from "@/lib/supabase";
import {
  CurrentMembership,
  getCurrentMembership,
} from "@/lib/current-user";

type Customer = {
  id: string;
  company_id: string;
  customer_code: string | null;
  full_name: string;
  phone: string | null;
  whatsapp_phone: string | null;
  email: string | null;
  city: string | null;
  country_code: string | null;
  preferred_language: string;
  birth_date: string | null;
  anniversary_date: string | null;
  instagram_username: string | null;
  lifecycle_stage: string;
  vip_level: string;
  source: string | null;
  source_detail: string | null;
  total_reservations: number;
  total_spent: number;
  total_profit: number;
  last_contact_at: string | null;
  created_at: string;
};

type CrmNote = {
  id: string;
  note_type: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
};

type CrmTask = {
  id: string;
  title: string;
  description: string | null;
  task_type: string;
  priority: string;
  status: string;
  due_at: string | null;
  completed_at: string | null;
  created_at: string;
};

type TimelineEvent = {
  id: string;
  event_type: string;
  title: string;
  description: string | null;
  created_at: string;
};

type Reservation = {
  id: string;
  reservation_code: string | null;
  tour_title: string;
  tour_date: string;
  guests: number;
  total_price: number;
  status: string;
  payment_status: string | null;
};

const noteTypeLabels: Record<string, string> = {
  general: "Genel Not",
  call: "Telefon Görüşmesi",
  whatsapp: "WhatsApp",
  email: "E-posta",
  complaint: "Şikâyet",
  preference: "Müşteri Tercihi",
  important: "Önemli Not",
};

const taskStatusLabels: Record<string, string> = {
  pending: "Bekliyor",
  in_progress: "Devam Ediyor",
  completed: "Tamamlandı",
  cancelled: "İptal",
};

function money(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
  }).format(Number(value || 0));
}

export default function CrmCustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const customerId = params.id;

  const [membership, setMembership] =
    useState<CurrentMembership | null>(null);

  const [customer, setCustomer] =
    useState<Customer | null>(null);

  const [notes, setNotes] =
    useState<CrmNote[]>([]);

  const [tasks, setTasks] =
    useState<CrmTask[]>([]);

  const [timeline, setTimeline] =
    useState<TimelineEvent[]>([]);

  const [reservations, setReservations] =
    useState<Reservation[]>([]);

  const [noteType, setNoteType] =
    useState("general");

  const [noteContent, setNoteContent] =
    useState("");

  const [taskTitle, setTaskTitle] =
    useState("");

  const [taskDescription, setTaskDescription] =
    useState("");

  const [taskDueAt, setTaskDueAt] =
    useState("");

  const [loading, setLoading] = useState(true);
  const [savingNote, setSavingNote] = useState(false);
  const [savingTask, setSavingTask] = useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const loadData = useCallback(
    async (companyId: string) => {
      const [
        { data: customerData, error: customerError },
        { data: noteData, error: noteError },
        { data: taskData, error: taskError },
        { data: timelineData, error: timelineError },
        { data: reservationData, error: reservationError },
      ] = await Promise.all([
        supabase
          .from("crm_customers")
          .select(`
            id,
            company_id,
            customer_code,
            full_name,
            phone,
            whatsapp_phone,
            email,
            city,
            country_code,
            preferred_language,
            birth_date,
            anniversary_date,
            instagram_username,
            lifecycle_stage,
            vip_level,
            source,
            source_detail,
            total_reservations,
            total_spent,
            total_profit,
            last_contact_at,
            created_at
          `)
          .eq("id", customerId)
          .eq("company_id", companyId)
          .single(),

        supabase
          .from("crm_notes")
          .select(
            "id, note_type, content, is_pinned, created_at"
          )
          .eq("customer_id", customerId)
          .eq("company_id", companyId)
          .order("is_pinned", {
            ascending: false,
          })
          .order("created_at", {
            ascending: false,
          }),

        supabase
          .from("crm_tasks")
          .select(
            "id, title, description, task_type, priority, status, due_at, completed_at, created_at"
          )
          .eq("customer_id", customerId)
          .eq("company_id", companyId)
          .order("created_at", {
            ascending: false,
          }),

        supabase
          .from("crm_timeline")
          .select(
            "id, event_type, title, description, created_at"
          )
          .eq("customer_id", customerId)
          .eq("company_id", companyId)
          .order("created_at", {
            ascending: false,
          })
          .limit(100),

        supabase
          .from("reservations")
          .select(
            "id, reservation_code, tour_title, tour_date, guests, total_price, status, payment_status"
          )
          .eq("customer_id", customerId)
          .eq("company_id", companyId)
          .order("tour_date", {
            ascending: false,
          }),
      ]);

      const error =
        customerError ??
        noteError ??
        taskError ??
        timelineError ??
        reservationError;

      if (error) {
        console.error(error);
        setErrorMessage(error.message);
      }

      setCustomer(customerData as Customer | null);
      setNotes((noteData ?? []) as CrmNote[]);
      setTasks((taskData ?? []) as CrmTask[]);
      setTimeline(
        (timelineData ?? []) as TimelineEvent[]
      );
      setReservations(
        (reservationData ?? []) as Reservation[]
      );
    },
    [customerId]
  );

  useEffect(() => {
    async function initialize() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setErrorMessage(
          "Kullanıcı oturumu bulunamadı."
        );
        setLoading(false);
        return;
      }

      try {
        const currentMembership =
          await getCurrentMembership(user.id);

        if (!currentMembership) {
          setErrorMessage(
            "Aktif şirket üyeliği bulunamadı."
          );
          setLoading(false);
          return;
        }

        setMembership(currentMembership);

        await loadData(
          currentMembership.company_id
        );
      } finally {
        setLoading(false);
      }
    }

    void initialize();
  }, [loadData]);

  const stats = useMemo(() => {
    const reservationRevenue = reservations.reduce(
      (total, reservation) =>
        total + Number(reservation.total_price),
      0
    );

    return {
      reservationCount: reservations.length,
      reservationRevenue,
      pendingTasks: tasks.filter(
        (task) =>
          task.status === "pending" ||
          task.status === "in_progress"
      ).length,
      noteCount: notes.length,
    };
  }, [notes, reservations, tasks]);

  async function addNote(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      !membership ||
      !customer ||
      !noteContent.trim()
    ) {
      return;
    }

    setSavingNote(true);
    setErrorMessage("");
    setSuccessMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("crm_notes")
      .insert({
        company_id: membership.company_id,
        customer_id: customer.id,
        note_type: noteType,
        content: noteContent.trim(),
        is_pinned: noteType === "important",
        created_by: user?.id ?? null,
      });

    if (error) {
      setErrorMessage(error.message);
      setSavingNote(false);
      return;
    }

    await supabase.from("crm_timeline").insert({
      company_id: membership.company_id,
      customer_id: customer.id,
      event_type: "note",
      title:
        noteTypeLabels[noteType] ??
        "Yeni müşteri notu",
      description: noteContent.trim(),
      created_by: user?.id ?? null,
    });

    setNoteContent("");
    setNoteType("general");
    setSuccessMessage("Müşteri notu eklendi.");
    setSavingNote(false);

    await loadData(membership.company_id);
  }

  async function addTask(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      !membership ||
      !customer ||
      !taskTitle.trim()
    ) {
      return;
    }

    setSavingTask(true);
    setErrorMessage("");
    setSuccessMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("crm_tasks")
      .insert({
        company_id: membership.company_id,
        customer_id: customer.id,
        title: taskTitle.trim(),
        description:
          taskDescription.trim() || null,
        task_type: "follow_up",
        priority: "normal",
        status: "pending",
        due_at: taskDueAt
          ? new Date(taskDueAt).toISOString()
          : null,
        created_by: user?.id ?? null,
      });

    if (error) {
      setErrorMessage(error.message);
      setSavingTask(false);
      return;
    }

    await supabase.from("crm_timeline").insert({
      company_id: membership.company_id,
      customer_id: customer.id,
      event_type: "task",
      title: taskTitle.trim(),
      description:
        taskDescription.trim() || null,
      created_by: user?.id ?? null,
    });

    setTaskTitle("");
    setTaskDescription("");
    setTaskDueAt("");
    setSuccessMessage("Müşteri görevi oluşturuldu.");
    setSavingTask(false);

    await loadData(membership.company_id);
  }

  async function completeTask(task: CrmTask) {
    if (!membership) return;

    const { error } = await supabase
      .from("crm_tasks")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", task.id)
      .eq(
        "company_id",
        membership.company_id
      );

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setSuccessMessage("Görev tamamlandı.");

    await loadData(membership.company_id);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-10 text-white">
        Müşteri bilgileri yükleniyor...
      </main>
    );
  }

  if (!customer) {
    return (
      <main className="min-h-screen bg-slate-950 p-10 text-white">
        <p>Müşteri kaydı bulunamadı.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-10 text-white lg:px-10">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/dashboard/crm"
          className="inline-flex items-center gap-2 text-sm font-black text-slate-400 hover:text-white"
        >
          <FaArrowLeft />
          CRM’e Dön
        </Link>

        <header className="mt-6">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-orange-400">
            {customer.customer_code ??
              "TUROS CRM"}
          </p>

          <h1 className="mt-3 text-4xl font-black md:text-5xl">
            {customer.full_name}
          </h1>

          <p className="mt-3 text-slate-400">
            {customer.city || "Şehir belirtilmedi"}
            {customer.country_code
              ? ` / ${customer.country_code}`
              : ""}
          </p>
        </header>

        {errorMessage && (
          <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 font-bold text-red-400">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 font-bold text-emerald-400">
            {successMessage}
          </div>
        )}

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-3xl border border-white/10 bg-slate-900 p-6">
            <FaCalendarCheck className="text-orange-400" />
            <p className="mt-5 text-sm text-slate-500">
              Rezervasyon
            </p>
            <p className="mt-2 text-3xl font-black">
              {stats.reservationCount}
            </p>
          </article>

          <article className="rounded-3xl border border-white/10 bg-slate-900 p-6">
            <FaMoneyBillWave className="text-emerald-400" />
            <p className="mt-5 text-sm text-slate-500">
              Toplam Harcama
            </p>
            <p className="mt-2 text-3xl font-black">
              {money(
                stats.reservationRevenue ||
                  customer.total_spent
              )}
            </p>
          </article>

          <article className="rounded-3xl border border-white/10 bg-slate-900 p-6">
            <FaTasks className="text-blue-400" />
            <p className="mt-5 text-sm text-slate-500">
              Açık Görev
            </p>
            <p className="mt-2 text-3xl font-black">
              {stats.pendingTasks}
            </p>
          </article>

          <article className="rounded-3xl border border-white/10 bg-slate-900 p-6">
            <FaStickyNote className="text-violet-400" />
            <p className="mt-5 text-sm text-slate-500">
              Müşteri Notu
            </p>
            <p className="mt-2 text-3xl font-black">
              {stats.noteCount}
            </p>
          </article>
        </section>

        <section className="mt-8 grid gap-7 xl:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="space-y-6">
            <article className="rounded-[30px] border border-white/10 bg-slate-900 p-6">
              <h2 className="text-xl font-black">
                İletişim Bilgileri
              </h2>

              <div className="mt-5 space-y-4 text-sm text-slate-400">
                {customer.phone && (
                  <p className="flex items-center gap-3">
                    <FaPhone className="text-orange-400" />
                    {customer.phone}
                  </p>
                )}

                {customer.whatsapp_phone && (
                  <p className="flex items-center gap-3">
                    <FaWhatsapp className="text-emerald-400" />
                    {customer.whatsapp_phone}
                  </p>
                )}

                {customer.email && (
                  <p className="flex items-center gap-3">
                    <FaEnvelope className="text-blue-400" />
                    {customer.email}
                  </p>
                )}

                {customer.birth_date && (
                  <p className="flex items-center gap-3">
                    <FaBirthdayCake className="text-pink-400" />
                    {new Date(
                      `${customer.birth_date}T00:00:00`
                    ).toLocaleDateString("tr-TR")}
                  </p>
                )}
              </div>
            </article>

            <form
              onSubmit={addNote}
              className="rounded-[30px] border border-white/10 bg-slate-900 p-6"
            >
              <div className="flex items-center gap-3">
                <FaPlus className="text-orange-400" />
                <h2 className="text-xl font-black">
                  Not Ekle
                </h2>
              </div>

              <select
                value={noteType}
                onChange={(event) =>
                  setNoteType(event.target.value)
                }
                className="mt-5 min-h-12 w-full rounded-xl bg-white px-4 font-bold text-slate-950"
              >
                {Object.entries(
                  noteTypeLabels
                ).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>

              <textarea
                required
                rows={5}
                value={noteContent}
                onChange={(event) =>
                  setNoteContent(event.target.value)
                }
                className="mt-3 w-full rounded-xl bg-white px-4 py-3 font-bold text-slate-950"
                placeholder="Müşteri notunu yazın"
              />

              <button
                disabled={savingNote}
                className="mt-3 min-h-12 w-full rounded-xl bg-orange-500 font-black"
              >
                {savingNote
                  ? "Kaydediliyor..."
                  : "Notu Kaydet"}
              </button>
            </form>

            <form
              onSubmit={addTask}
              className="rounded-[30px] border border-white/10 bg-slate-900 p-6"
            >
              <div className="flex items-center gap-3">
                <FaTasks className="text-orange-400" />
                <h2 className="text-xl font-black">
                  Görev Oluştur
                </h2>
              </div>

              <input
                required
                value={taskTitle}
                onChange={(event) =>
                  setTaskTitle(event.target.value)
                }
                placeholder="Müşteriyi ara"
                className="mt-5 min-h-12 w-full rounded-xl bg-white px-4 font-bold text-slate-950"
              />

              <textarea
                rows={3}
                value={taskDescription}
                onChange={(event) =>
                  setTaskDescription(
                    event.target.value
                  )
                }
                placeholder="Görev açıklaması"
                className="mt-3 w-full rounded-xl bg-white px-4 py-3 font-bold text-slate-950"
              />

              <input
                type="datetime-local"
                value={taskDueAt}
                onChange={(event) =>
                  setTaskDueAt(event.target.value)
                }
                className="mt-3 min-h-12 w-full rounded-xl bg-white px-4 font-bold text-slate-950"
              />

              <button
                disabled={savingTask}
                className="mt-3 min-h-12 w-full rounded-xl bg-orange-500 font-black"
              >
                {savingTask
                  ? "Kaydediliyor..."
                  : "Görev Oluştur"}
              </button>
            </form>
          </aside>

          <div className="space-y-7">
            <section className="rounded-[30px] border border-white/10 bg-slate-900 p-6">
              <h2 className="text-2xl font-black">
                Açık Görevler
              </h2>

              <div className="mt-5 space-y-3">
                {tasks.map((task) => (
                  <article
                    key={task.id}
                    className="rounded-2xl bg-slate-950 p-4"
                  >
                    <div className="flex flex-col justify-between gap-3 sm:flex-row">
                      <div>
                        <p className="font-black">
                          {task.title}
                        </p>

                        {task.description && (
                          <p className="mt-1 text-sm text-slate-500">
                            {task.description}
                          </p>
                        )}

                        <p className="mt-2 text-xs text-slate-500">
                          {task.due_at
                            ? new Date(
                                task.due_at
                              ).toLocaleString(
                                "tr-TR"
                              )
                            : "Tarih belirtilmedi"}
                        </p>
                      </div>

                      {task.status !==
                        "completed" && (
                        <button
                          type="button"
                          onClick={() =>
                            completeTask(task)
                          }
                          className="min-h-10 rounded-xl bg-emerald-500 px-4 text-sm font-black"
                        >
                          Tamamla
                        </button>
                      )}
                    </div>

                    <span className="mt-3 inline-flex rounded-full bg-white/[0.06] px-3 py-1 text-xs font-black text-slate-400">
                      {taskStatusLabels[
                        task.status
                      ] ?? task.status}
                    </span>
                  </article>
                ))}

                {tasks.length === 0 && (
                  <p className="text-slate-500">
                    Henüz görev bulunmuyor.
                  </p>
                )}
              </div>
            </section>

            <section className="rounded-[30px] border border-white/10 bg-slate-900 p-6">
              <h2 className="text-2xl font-black">
                Rezervasyon Geçmişi
              </h2>

              <div className="mt-5 space-y-3">
                {reservations.map(
                  (reservation) => (
                    <article
                      key={reservation.id}
                      className="rounded-2xl bg-slate-950 p-4"
                    >
                      <div className="flex flex-col justify-between gap-3 sm:flex-row">
                        <div>
                          <p className="text-xs font-black text-orange-400">
                            {reservation.reservation_code ??
                              reservation.id.slice(
                                0,
                                10
                              )}
                          </p>

                          <p className="mt-1 font-black">
                            {reservation.tour_title}
                          </p>

                          <p className="mt-2 text-sm text-slate-500">
                            {new Date(
                              `${reservation.tour_date}T00:00:00`
                            ).toLocaleDateString(
                              "tr-TR"
                            )}{" "}
                            · {reservation.guests} kişi
                          </p>
                        </div>

                        <p className="font-black text-emerald-400">
                          {money(
                            reservation.total_price
                          )}
                        </p>
                      </div>
                    </article>
                  )
                )}

                {reservations.length === 0 && (
                  <p className="text-slate-500">
                    Bu müşteriye bağlı rezervasyon
                    bulunmuyor.
                  </p>
                )}
              </div>
            </section>

            <section className="rounded-[30px] border border-white/10 bg-slate-900 p-6">
              <h2 className="text-2xl font-black">
                Müşteri Zaman Akışı
              </h2>

              <div className="mt-5 space-y-3">
                {timeline.map((event) => (
                  <article
                    key={event.id}
                    className="border-l-2 border-orange-500 pl-5"
                  >
                    <p className="font-black">
                      {event.title}
                    </p>

                    {event.description && (
                      <p className="mt-1 text-sm text-slate-500">
                        {event.description}
                      </p>
                    )}

                    <p className="mt-2 text-xs text-slate-600">
                      {new Date(
                        event.created_at
                      ).toLocaleString("tr-TR")}
                    </p>
                  </article>
                ))}

                {timeline.length === 0 && (
                  <p className="text-slate-500">
                    Henüz zaman akışı kaydı yok.
                  </p>
                )}
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
