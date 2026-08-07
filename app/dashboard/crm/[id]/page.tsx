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
  useParams,
} from "next/navigation";
import {
  FaArrowLeft,
  FaBriefcase,
  FaCalendarAlt,
  FaCheck,
  FaClock,
  FaCrown,
  FaEdit,
  FaEnvelope,
  FaExclamationTriangle,
  FaHistory,
  FaMoneyBillWave,
  FaPhone,
  FaPlus,
  FaSave,
  FaStickyNote,
  FaTasks,
  FaTimes,
  FaTrash,
  FaUser,
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
  first_name: string | null;
  last_name: string | null;

  phone: string | null;
  whatsapp_phone: string | null;
  email: string | null;

  country_code: string | null;
  city: string | null;
  preferred_language: string;

  birth_date: string | null;
  anniversary_date: string | null;
  instagram_username: string | null;

  customer_type: string;
  lifecycle_stage: string;
  source: string | null;
  source_detail: string | null;
  vip_level: string;

  total_reservations: number;
  total_spent: number;
  total_profit: number;

  last_reservation_at: string | null;
  last_contact_at: string | null;

  marketing_consent: boolean;
  whatsapp_consent: boolean;
  email_consent: boolean;

  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type Note = {
  id: string;
  note_type: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
};

type Task = {
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

type Deal = {
  id: string;
  title: string;
  stage: string;
  expected_revenue: number;
  expected_cost: number;
  expected_profit: number;
  probability: number;
  expected_close_date: string | null;
  lost_reason: string | null;
  created_at: string;
};

type Timeline = {
  id: string;
  event_type: string;
  title: string;
  description: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

type ActiveTab =
  | "overview"
  | "notes"
  | "tasks"
  | "deals"
  | "timeline";

const lifecycleLabels: Record<
  string,
  string
> = {
  lead: "Yeni Lead",
  prospect: "Potansiyel",
  offer_sent: "Teklif Gönderildi",
  payment_pending: "Ödeme Bekliyor",
  customer: "Müşteri",
  completed: "Tamamlandı",
  lost: "Kaybedildi",
  inactive: "Pasif",
};

const vipLabels: Record<
  string,
  string
> = {
  standard: "Standart",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
  vip: "VIP",
};

const noteTypeLabels: Record<
  string,
  string
> = {
  general: "Genel",
  call: "Telefon Görüşmesi",
  whatsapp: "WhatsApp",
  email: "E-posta",
  complaint: "Şikâyet",
  preference: "Tercih",
  important: "Önemli",
};

const taskTypeLabels: Record<
  string,
  string
> = {
  follow_up: "Takip",
  call: "Telefon",
  whatsapp: "WhatsApp",
  email: "E-posta",
  meeting: "Görüşme",
  payment: "Ödeme",
  offer: "Teklif",
  other: "Diğer",
};

const priorityLabels: Record<
  string,
  string
> = {
  low: "Düşük",
  normal: "Normal",
  high: "Yüksek",
  urgent: "Acil",
};

const taskStatusLabels: Record<
  string,
  string
> = {
  pending: "Bekliyor",
  in_progress: "Devam Ediyor",
  completed: "Tamamlandı",
  cancelled: "İptal",
};

const dealStageLabels: Record<
  string,
  string
> = {
  new_lead: "Yeni Lead",
  contacted: "İletişim Kuruldu",
  offer_preparing: "Teklif Hazırlanıyor",
  offer_sent: "Teklif Gönderildi",
  negotiation: "Pazarlık",
  payment_pending: "Ödeme Bekliyor",
  won: "Kazanıldı",
  lost: "Kaybedildi",
};

function money(
  value: number
): string {
  return new Intl.NumberFormat(
    "tr-TR",
    {
      style: "currency",
      currency: "TRY",
      maximumFractionDigits: 0,
    }
  ).format(
    Number(value || 0)
  );
}

function dateTime(
  value: string | null
): string {
  if (!value) return "—";

  return new Date(
    value
  ).toLocaleString(
    "tr-TR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

function dateOnly(
  value: string | null
): string {
  if (!value) return "—";

  return new Date(
    `${value}T00:00:00`
  ).toLocaleDateString(
    "tr-TR"
  );
}

function normalizePhone(
  value: string
): string {
  return value.replace(
    /\D/g,
    ""
  );
}

function priorityClass(
  value: string
): string {
  if (value === "urgent") {
    return "bg-red-500/15 text-red-400";
  }

  if (value === "high") {
    return "bg-orange-500/15 text-orange-400";
  }

  if (value === "low") {
    return "bg-slate-500/15 text-slate-400";
  }

  return "bg-blue-500/15 text-blue-400";
}

function dealClass(
  stage: string
): string {
  if (stage === "won") {
    return "bg-emerald-500/15 text-emerald-400";
  }

  if (stage === "lost") {
    return "bg-red-500/15 text-red-400";
  }

  if (
    stage ===
    "payment_pending"
  ) {
    return "bg-amber-500/15 text-amber-400";
  }

  return "bg-violet-500/15 text-violet-400";
}

function errorText(
  error: unknown
): string {
  if (
    error &&
    typeof error === "object" &&
    "message" in error
  ) {
    return String(
      (
        error as {
          message?: unknown;
        }
      ).message ??
        "İşlem tamamlanamadı."
    );
  }

  return "İşlem tamamlanamadı.";
}

export default function CrmCustomer360Page() {
  const params =
    useParams<{
      id: string;
    }>();

  const customerId =
    params.id;

  const [
    membership,
    setMembership,
  ] =
    useState<CurrentMembership | null>(
      null
    );

  const [
    customer,
    setCustomer,
  ] =
    useState<Customer | null>(
      null
    );

  const [notes, setNotes] =
    useState<Note[]>([]);

  const [tasks, setTasks] =
    useState<Task[]>([]);

  const [deals, setDeals] =
    useState<Deal[]>([]);

  const [
    timeline,
    setTimeline,
  ] =
    useState<Timeline[]>([]);

  const [
    activeTab,
    setActiveTab,
  ] =
    useState<ActiveTab>(
      "overview"
    );

  const [
    showNoteForm,
    setShowNoteForm,
  ] = useState(false);

  const [
    showTaskForm,
    setShowTaskForm,
  ] = useState(false);

  const [
    showDealForm,
    setShowDealForm,
  ] = useState(false);

  const [noteForm, setNoteForm] =
    useState({
      note_type: "general",
      content: "",
      is_pinned: false,
    });

  const [taskForm, setTaskForm] =
    useState({
      title: "",
      description: "",
      task_type: "follow_up",
      priority: "normal",
      due_at: "",
    });

  const [dealForm, setDealForm] =
    useState({
      title: "",
      stage: "new_lead",
      expected_revenue: "",
      expected_cost: "",
      probability: "10",
      expected_close_date: "",
    });

  const [loading, setLoading] =
    useState(true);

  const [
    processing,
    setProcessing,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const loadCustomer = useCallback(
    async (
      companyId: string
    ) => {
      const [
        customerResult,
        notesResult,
        tasksResult,
        dealsResult,
        timelineResult,
      ] = await Promise.all([
        supabase
          .from("crm_customers")
          .select("*")
          .eq(
            "company_id",
            companyId
          )
          .eq(
            "id",
            customerId
          )
          .single(),

        supabase
          .from("crm_notes")
          .select(`
            id,
            note_type,
            content,
            is_pinned,
            created_at
          `)
          .eq(
            "company_id",
            companyId
          )
          .eq(
            "customer_id",
            customerId
          )
          .order(
            "is_pinned",
            {
              ascending: false,
            }
          )
          .order(
            "created_at",
            {
              ascending: false,
            }
          ),

        supabase
          .from("crm_tasks")
          .select(`
            id,
            title,
            description,
            task_type,
            priority,
            status,
            due_at,
            completed_at,
            created_at
          `)
          .eq(
            "company_id",
            companyId
          )
          .eq(
            "customer_id",
            customerId
          )
          .order(
            "created_at",
            {
              ascending: false,
            }
          ),

        supabase
          .from("crm_deals")
          .select(`
            id,
            title,
            stage,
            expected_revenue,
            expected_cost,
            expected_profit,
            probability,
            expected_close_date,
            lost_reason,
            created_at
          `)
          .eq(
            "company_id",
            companyId
          )
          .eq(
            "customer_id",
            customerId
          )
          .order(
            "created_at",
            {
              ascending: false,
            }
          ),

        supabase
          .from("crm_timeline")
          .select(`
            id,
            event_type,
            title,
            description,
            metadata,
            created_at
          `)
          .eq(
            "company_id",
            companyId
          )
          .eq(
            "customer_id",
            customerId
          )
          .order(
            "created_at",
            {
              ascending: false,
            }
          )
          .limit(100),
      ]);

      const error =
        customerResult.error ??
        notesResult.error ??
        tasksResult.error ??
        dealsResult.error ??
        timelineResult.error;

      if (error) {
        throw error;
      }

      setCustomer(
        customerResult.data as Customer
      );

      setNotes(
        (notesResult.data ??
          []) as Note[]
      );

      setTasks(
        (tasksResult.data ??
          []) as Task[]
      );

      setDeals(
        (dealsResult.data ??
          []) as Deal[]
      );

      setTimeline(
        (timelineResult.data ??
          []) as Timeline[]
      );
    },
    [customerId]
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

        await loadCustomer(
          currentMembership.company_id
        );
      } catch (error: unknown) {
        setErrorMessage(
          errorText(error)
        );
      } finally {
        setLoading(false);
      }
    }

    void initialize();
  }, [loadCustomer]);

  async function refresh() {
    if (!membership) return;

    await loadCustomer(
      membership.company_id
    );
  }

  async function addTimeline(
    eventType: string,
    title: string,
    description?: string
  ) {
    if (!membership) return;

    const {
      data: { user },
    } =
      await supabase.auth.getUser();

    const { error } =
      await supabase
        .from("crm_timeline")
        .insert({
          company_id:
            membership.company_id,

          customer_id:
            customerId,

          event_type:
            eventType,

          title,

          description:
            description ?? null,

          created_by:
            user?.id ?? null,
        });

    if (error) {
      throw error;
    }
  }

  const stats = useMemo(() => {
    const openTasks =
      tasks.filter(
        (task) =>
          task.status ===
            "pending" ||
          task.status ===
            "in_progress"
      );

    const urgentTasks =
      openTasks.filter(
        (task) =>
          task.priority ===
          "urgent"
      );

    const activeDeals =
      deals.filter(
        (deal) =>
          ![
            "won",
            "lost",
          ].includes(
            deal.stage
          )
      );

    const pipeline =
      activeDeals.reduce(
        (sum, deal) =>
          sum +
          Number(
            deal.expected_revenue
          ),
        0
      );

    const weightedPipeline =
      activeDeals.reduce(
        (sum, deal) =>
          sum +
          Number(
            deal.expected_revenue
          ) *
            (
              Number(
                deal.probability
              ) / 100
            ),
        0
      );

    const won =
      deals
        .filter(
          (deal) =>
            deal.stage ===
            "won"
        )
        .reduce(
          (sum, deal) =>
            sum +
            Number(
              deal.expected_revenue
            ),
          0
        );

    return {
      openTasks:
        openTasks.length,

      urgentTasks:
        urgentTasks.length,

      activeDeals:
        activeDeals.length,

      pipeline,
      weightedPipeline,
      won,
    };
  }, [tasks, deals]);

  async function saveNote(
    event: FormEvent
  ) {
    event.preventDefault();

    if (
      !membership ||
      processing ||
      !noteForm.content.trim()
    ) {
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

      const { error } =
        await supabase
          .from("crm_notes")
          .insert({
            company_id:
              membership.company_id,

            customer_id:
              customerId,

            note_type:
              noteForm.note_type,

            content:
              noteForm.content.trim(),

            is_pinned:
              noteForm.is_pinned,

            created_by:
              user?.id ?? null,
          });

      if (error) {
        throw error;
      }

      await addTimeline(
        "note",
        "Yeni müşteri notu",
        noteForm.content.trim()
      );

      setNoteForm({
        note_type: "general",
        content: "",
        is_pinned: false,
      });

      setShowNoteForm(false);

      await refresh();

      setSuccessMessage(
        "Not kaydedildi."
      );
    } catch (error: unknown) {
      setErrorMessage(
        errorText(error)
      );
    } finally {
      setProcessing(false);
    }
  }

  async function deleteNote(
    note: Note
  ) {
    if (
      !membership ||
      processing ||
      !window.confirm(
        "Bu not silinsin mi?"
      )
    ) {
      return;
    }

    setProcessing(true);

    try {
      const { error } =
        await supabase
          .from("crm_notes")
          .delete()
          .eq(
            "company_id",
            membership.company_id
          )
          .eq(
            "id",
            note.id
          );

      if (error) {
        throw error;
      }

      await refresh();

      setSuccessMessage(
        "Not silindi."
      );
    } catch (error: unknown) {
      setErrorMessage(
        errorText(error)
      );
    } finally {
      setProcessing(false);
    }
  }

  async function saveTask(
    event: FormEvent
  ) {
    event.preventDefault();

    if (
      !membership ||
      processing ||
      !taskForm.title.trim()
    ) {
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

      const { error } =
        await supabase
          .from("crm_tasks")
          .insert({
            company_id:
              membership.company_id,

            customer_id:
              customerId,

            title:
              taskForm.title.trim(),

            description:
              taskForm.description.trim() ||
              null,

            task_type:
              taskForm.task_type,

            priority:
              taskForm.priority,

            status: "pending",

            due_at:
              taskForm.due_at
                ? new Date(
                    taskForm.due_at
                  ).toISOString()
                : null,

            created_by:
              user?.id ?? null,
          });

      if (error) {
        throw error;
      }

      await addTimeline(
        "task",
        "Yeni görev oluşturuldu",
        taskForm.title.trim()
      );

      setTaskForm({
        title: "",
        description: "",
        task_type:
          "follow_up",
        priority: "normal",
        due_at: "",
      });

      setShowTaskForm(false);

      await refresh();

      setSuccessMessage(
        "Görev oluşturuldu."
      );
    } catch (error: unknown) {
      setErrorMessage(
        errorText(error)
      );
    } finally {
      setProcessing(false);
    }
  }

  async function updateTaskStatus(
    task: Task,
    status: string
  ) {
    if (
      !membership ||
      processing
    ) {
      return;
    }

    setProcessing(true);
    setErrorMessage("");

    try {
      const { error } =
        await supabase
          .from("crm_tasks")
          .update({
            status,

            completed_at:
              status ===
              "completed"
                ? new Date().toISOString()
                : null,

            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "company_id",
            membership.company_id
          )
          .eq(
            "id",
            task.id
          );

      if (error) {
        throw error;
      }

      await refresh();

      setSuccessMessage(
        "Görev güncellendi."
      );
    } catch (error: unknown) {
      setErrorMessage(
        errorText(error)
      );
    } finally {
      setProcessing(false);
    }
  }

  async function deleteTask(
    task: Task
  ) {
    if (
      !membership ||
      processing ||
      !window.confirm(
        `"${task.title}" görevi silinsin mi?`
      )
    ) {
      return;
    }

    setProcessing(true);

    try {
      const { error } =
        await supabase
          .from("crm_tasks")
          .delete()
          .eq(
            "company_id",
            membership.company_id
          )
          .eq(
            "id",
            task.id
          );

      if (error) {
        throw error;
      }

      await refresh();

      setSuccessMessage(
        "Görev silindi."
      );
    } catch (error: unknown) {
      setErrorMessage(
        errorText(error)
      );
    } finally {
      setProcessing(false);
    }
  }

  async function saveDeal(
    event: FormEvent
  ) {
    event.preventDefault();

    if (
      !membership ||
      processing ||
      !dealForm.title.trim()
    ) {
      return;
    }

    setProcessing(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const revenue =
        Math.max(
          0,
          Number(
            dealForm.expected_revenue
          ) || 0
        );

      const cost =
        Math.max(
          0,
          Number(
            dealForm.expected_cost
          ) || 0
        );

      const profit =
        revenue - cost;

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      const { error } =
        await supabase
          .from("crm_deals")
          .insert({
            company_id:
              membership.company_id,

            customer_id:
              customerId,

            title:
              dealForm.title.trim(),

            stage:
              dealForm.stage,

            expected_revenue:
              revenue,

            expected_cost:
              cost,

            expected_profit:
              profit,

            probability:
              Math.min(
                100,
                Math.max(
                  0,
                  Number(
                    dealForm.probability
                  ) || 0
                )
              ),

            expected_close_date:
              dealForm.expected_close_date ||
              null,

            created_by:
              user?.id ?? null,
          });

      if (error) {
        throw error;
      }

      await addTimeline(
        "offer",
        "Yeni satış fırsatı",
        dealForm.title.trim()
      );

      setDealForm({
        title: "",
        stage: "new_lead",
        expected_revenue: "",
        expected_cost: "",
        probability: "10",
        expected_close_date: "",
      });

      setShowDealForm(false);

      await refresh();

      setSuccessMessage(
        "Satış fırsatı oluşturuldu."
      );
    } catch (error: unknown) {
      setErrorMessage(
        errorText(error)
      );
    } finally {
      setProcessing(false);
    }
  }

  async function updateDealStage(
    deal: Deal,
    stage: string
  ) {
    if (
      !membership ||
      processing
    ) {
      return;
    }

    setProcessing(true);

    try {
      const { error } =
        await supabase
          .from("crm_deals")
          .update({
            stage,
            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "company_id",
            membership.company_id
          )
          .eq(
            "id",
            deal.id
          );

      if (error) {
        throw error;
      }

      await addTimeline(
        "status_changed",
        "Satış fırsatı güncellendi",
        `${deal.title}: ${
          dealStageLabels[
            stage
          ] ?? stage
        }`
      );

      await refresh();

      setSuccessMessage(
        "Satış fırsatı güncellendi."
      );
    } catch (error: unknown) {
      setErrorMessage(
        errorText(error)
      );
    } finally {
      setProcessing(false);
    }
  }

  async function deleteDeal(
    deal: Deal
  ) {
    if (
      !membership ||
      processing ||
      !window.confirm(
        `"${deal.title}" satış fırsatı silinsin mi?`
      )
    ) {
      return;
    }

    setProcessing(true);

    try {
      const { error } =
        await supabase
          .from("crm_deals")
          .delete()
          .eq(
            "company_id",
            membership.company_id
          )
          .eq(
            "id",
            deal.id
          );

      if (error) {
        throw error;
      }

      await refresh();

      setSuccessMessage(
        "Satış fırsatı silindi."
      );
    } catch (error: unknown) {
      setErrorMessage(
        errorText(error)
      );
    } finally {
      setProcessing(false);
    }
  }

  async function openWhatsApp() {
    if (
      !customer ||
      !customer.whatsapp_phone
    ) {
      setErrorMessage(
        "WhatsApp numarası bulunmuyor."
      );
      return;
    }

    const phone =
      normalizePhone(
        customer.whatsapp_phone
      );

    if (!phone) {
      setErrorMessage(
        "Geçerli WhatsApp numarası bulunamadı."
      );
      return;
    }

    try {
      await addTimeline(
        "whatsapp",
        "WhatsApp görüşmesi başlatıldı",
        customer.whatsapp_phone
      );

      await refresh();
    } catch {
      // Mesaj penceresini engellememek için
      // timeline hatasında devam ediyoruz.
    }

    window.open(
      `https://wa.me/${phone}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  async function openEmail() {
    if (
      !customer ||
      !customer.email
    ) {
      setErrorMessage(
        "E-posta adresi bulunmuyor."
      );
      return;
    }

    try {
      await addTimeline(
        "email",
        "E-posta görüşmesi başlatıldı",
        customer.email
      );

      await refresh();
    } catch {
      // E-posta istemcisini engelleme.
    }

    window.location.href =
      `mailto:${customer.email}`;
  }

  async function callCustomer() {
    if (
      !customer ||
      !customer.phone
    ) {
      setErrorMessage(
        "Telefon numarası bulunmuyor."
      );
      return;
    }

    try {
      await addTimeline(
        "call",
        "Telefon görüşmesi başlatıldı",
        customer.phone
      );

      await refresh();
    } catch {
      // Telefon bağlantısını engelleme.
    }

    window.location.href =
      `tel:${customer.phone}`;
  }

  if (loading) {
    return (
      <main className="p-10">
        Müşteri 360 yükleniyor...
      </main>
    );
  }

  if (!customer) {
    return (
      <main className="p-10">
        <p className="font-black text-red-400">
          Müşteri bulunamadı.
        </p>

        <Link
          href="/dashboard/crm"
          className="mt-5 inline-flex text-orange-400"
        >
          CRM'e dön
        </Link>
      </main>
    );
  }

  return (
    <main className="px-4 py-8 lg:px-8">
      <div className="mx-auto max-w-[1900px]">
        <header>
          <Link
            href="/dashboard/crm"
            className="inline-flex items-center gap-2 font-black text-orange-400"
          >
            <FaArrowLeft />
            CRM'e Dön
          </Link>

          <div className="mt-7 flex flex-col justify-between gap-6 xl:flex-row xl:items-start">
            <div className="flex items-start gap-5">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[24px] bg-orange-500/15 text-3xl text-orange-400">
                <FaUser />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-400">
                    MÜŞTERİ 360
                  </p>

                  <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-black text-slate-400">
                    {customer.customer_code ??
                      "Kod yok"}
                  </span>

                  {customer.vip_level !==
                    "standard" && (
                    <span className="flex items-center gap-2 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-black text-amber-400">
                      <FaCrown />
                      {vipLabels[
                        customer.vip_level
                      ] ??
                        customer.vip_level}
                    </span>
                  )}
                </div>

                <h1 className="mt-3 text-4xl font-black md:text-5xl">
                  {customer.full_name}
                </h1>

                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-400">
                  <span>
                    {lifecycleLabels[
                      customer.lifecycle_stage
                    ] ??
                      customer.lifecycle_stage}
                  </span>

                  {customer.city && (
                    <span>
                      {customer.city}
                    </span>
                  )}

                  {customer.source && (
                    <span>
                      Kaynak:{" "}
                      {customer.source}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() =>
                  void callCustomer()
                }
                className="flex min-h-12 items-center gap-2 rounded-xl border border-white/10 px-5 font-black"
              >
                <FaPhone />
                Ara
              </button>

              <button
                type="button"
                onClick={() =>
                  void openWhatsApp()
                }
                className="flex min-h-12 items-center gap-2 rounded-xl bg-emerald-500 px-5 font-black"
              >
                <FaWhatsapp />
                WhatsApp
              </button>

              <button
                type="button"
                onClick={() =>
                  void openEmail()
                }
                className="flex min-h-12 items-center gap-2 rounded-xl bg-blue-500 px-5 font-black"
              >
                <FaEnvelope />
                E-posta
              </button>

              <Link
                href="/dashboard/crm"
                className="flex min-h-12 items-center gap-2 rounded-xl bg-orange-500 px-5 font-black"
              >
                <FaEdit />
                Profili Düzenle
              </Link>
            </div>
          </div>
        </header>

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

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          {[
            {
              label:
                "Rezervasyon",
              value:
                customer.total_reservations,
              icon:
                FaCalendarAlt,
              className:
                "text-blue-400",
            },
            {
              label:
                "Toplam Harcama",
              value: money(
                customer.total_spent
              ),
              icon:
                FaMoneyBillWave,
              className:
                "text-emerald-400",
            },
            {
              label:
                "Toplam Kâr",
              value: money(
                customer.total_profit
              ),
              icon:
                FaMoneyBillWave,
              className:
                "text-cyan-400",
            },
            {
              label:
                "Açık Görev",
              value:
                stats.openTasks,
              icon: FaTasks,
              className:
                stats.urgentTasks >
                0
                  ? "text-red-400"
                  : "text-orange-400",
            },
            {
              label:
                "Aktif Fırsat",
              value:
                stats.activeDeals,
              icon:
                FaBriefcase,
              className:
                "text-violet-400",
            },
            {
              label:
                "Pipeline",
              value: money(
                stats.pipeline
              ),
              icon:
                FaMoneyBillWave,
              className:
                "text-amber-400",
            },
          ].map((item) => {
            const Icon =
              item.icon;

            return (
              <article
                key={item.label}
                className="rounded-3xl border border-white/10 bg-slate-900 p-5"
              >
                <Icon
                  className={
                    item.className
                  }
                />

                <p className="mt-4 text-xs text-slate-500">
                  {item.label}
                </p>

                <p className="mt-2 text-2xl font-black">
                  {item.value}
                </p>
              </article>
            );
          })}
        </section>

        <section className="mt-5 grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl bg-violet-500/10 p-5">
            <p className="text-sm text-violet-300">
              Olasılık Ağırlıklı Pipeline
            </p>

            <p className="mt-2 text-2xl font-black text-violet-400">
              {money(
                stats.weightedPipeline
              )}
            </p>
          </article>

          <article className="rounded-2xl bg-emerald-500/10 p-5">
            <p className="text-sm text-emerald-300">
              Kazanılan Fırsatlar
            </p>

            <p className="mt-2 text-2xl font-black text-emerald-400">
              {money(
                stats.won
              )}
            </p>
          </article>

          <article className="rounded-2xl bg-red-500/10 p-5">
            <p className="text-sm text-red-300">
              Acil Görev
            </p>

            <p className="mt-2 text-2xl font-black text-red-400">
              {stats.urgentTasks}
            </p>
          </article>
        </section>

        <section className="mt-7 grid gap-5 xl:grid-cols-[0.7fr_1.3fr]">
          <aside className="rounded-[30px] border border-white/10 bg-slate-900 p-6">
            <h2 className="text-xl font-black">
              Müşteri Bilgileri
            </h2>

            <div className="mt-5 space-y-4 text-sm">
              <div>
                <p className="text-slate-600">
                  Telefon
                </p>

                <p className="mt-1 font-black">
                  {customer.phone ??
                    "Belirtilmedi"}
                </p>
              </div>

              <div>
                <p className="text-slate-600">
                  WhatsApp
                </p>

                <p className="mt-1 font-black">
                  {customer.whatsapp_phone ??
                    "Belirtilmedi"}
                </p>
              </div>

              <div>
                <p className="text-slate-600">
                  E-posta
                </p>

                <p className="mt-1 font-black">
                  {customer.email ??
                    "Belirtilmedi"}
                </p>
              </div>

              <div>
                <p className="text-slate-600">
                  Doğum Tarihi
                </p>

                <p className="mt-1 font-black">
                  {dateOnly(
                    customer.birth_date
                  )}
                </p>
              </div>

              <div>
                <p className="text-slate-600">
                  Yıl Dönümü
                </p>

                <p className="mt-1 font-black">
                  {dateOnly(
                    customer.anniversary_date
                  )}
                </p>
              </div>

              <div>
                <p className="text-slate-600">
                  Son İletişim
                </p>

                <p className="mt-1 font-black">
                  {dateTime(
                    customer.last_contact_at
                  )}
                </p>
              </div>

              <div>
                <p className="text-slate-600">
                  Son Rezervasyon
                </p>

                <p className="mt-1 font-black">
                  {dateTime(
                    customer.last_reservation_at
                  )}
                </p>
              </div>
            </div>

            <div className="mt-6 border-t border-white/10 pt-5">
              <h3 className="font-black">
                İletişim İzinleri
              </h3>

              <div className="mt-4 space-y-3">
                <p className="flex items-center justify-between">
                  WhatsApp
                  <span
                    className={
                      customer.whatsapp_consent
                        ? "text-emerald-400"
                        : "text-red-400"
                    }
                  >
                    {customer.whatsapp_consent
                      ? "İzin Var"
                      : "İzin Yok"}
                  </span>
                </p>

                <p className="flex items-center justify-between">
                  E-posta
                  <span
                    className={
                      customer.email_consent
                        ? "text-emerald-400"
                        : "text-red-400"
                    }
                  >
                    {customer.email_consent
                      ? "İzin Var"
                      : "İzin Yok"}
                  </span>
                </p>

                <p className="flex items-center justify-between">
                  Pazarlama
                  <span
                    className={
                      customer.marketing_consent
                        ? "text-emerald-400"
                        : "text-red-400"
                    }
                  >
                    {customer.marketing_consent
                      ? "İzin Var"
                      : "İzin Yok"}
                  </span>
                </p>
              </div>
            </div>
          </aside>

          <section>
            <div className="flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-slate-900 p-2">
              {[
                {
                  value:
                    "overview",
                  label:
                    "Genel Bakış",
                },
                {
                  value: "notes",
                  label: `Notlar (${notes.length})`,
                },
                {
                  value: "tasks",
                  label: `Görevler (${tasks.length})`,
                },
                {
                  value: "deals",
                  label: `Fırsatlar (${deals.length})`,
                },
                {
                  value:
                    "timeline",
                  label: `Timeline (${timeline.length})`,
                },
              ].map((item) => (
                <button
                  key={
                    item.value
                  }
                  type="button"
                  onClick={() =>
                    setActiveTab(
                      item.value as ActiveTab
                    )
                  }
                  className={`rounded-xl px-4 py-3 text-sm font-black ${
                    activeTab ===
                    item.value
                      ? "bg-orange-500"
                      : "text-slate-400"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {activeTab ===
              "overview" && (
              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <article className="rounded-[30px] border border-white/10 bg-slate-900 p-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-black">
                      Son Notlar
                    </h2>

                    <button
                      type="button"
                      onClick={() =>
                        setShowNoteForm(
                          true
                        )
                      }
                      className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500"
                    >
                      <FaPlus />
                    </button>
                  </div>

                  <div className="mt-5 space-y-3">
                    {notes
                      .slice(0, 4)
                      .map(
                        (note) => (
                          <div
                            key={
                              note.id
                            }
                            className="rounded-2xl bg-slate-950 p-4"
                          >
                            <span className="rounded-full bg-orange-500/10 px-3 py-1 text-xs font-black text-orange-400">
                              {noteTypeLabels[
                                note.note_type
                              ] ??
                                note.note_type}
                            </span>

                            <p className="mt-3 text-sm leading-6">
                              {
                                note.content
                              }
                            </p>
                          </div>
                        )
                      )}

                    {notes.length ===
                      0 && (
                      <p className="text-slate-500">
                        Henüz not yok.
                      </p>
                    )}
                  </div>
                </article>

                <article className="rounded-[30px] border border-white/10 bg-slate-900 p-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-black">
                      Açık Görevler
                    </h2>

                    <button
                      type="button"
                      onClick={() =>
                        setShowTaskForm(
                          true
                        )
                      }
                      className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500"
                    >
                      <FaPlus />
                    </button>
                  </div>

                  <div className="mt-5 space-y-3">
                    {tasks
                      .filter(
                        (task) =>
                          task.status ===
                            "pending" ||
                          task.status ===
                            "in_progress"
                      )
                      .slice(0, 5)
                      .map(
                        (task) => (
                          <div
                            key={
                              task.id
                            }
                            className="rounded-2xl bg-slate-950 p-4"
                          >
                            <div className="flex justify-between gap-4">
                              <p className="font-black">
                                {
                                  task.title
                                }
                              </p>

                              <span
                                className={`rounded-full px-3 py-1 text-xs font-black ${priorityClass(
                                  task.priority
                                )}`}
                              >
                                {priorityLabels[
                                  task.priority
                                ] ??
                                  task.priority}
                              </span>
                            </div>

                            <p className="mt-2 text-xs text-slate-500">
                              Son tarih:{" "}
                              {dateTime(
                                task.due_at
                              )}
                            </p>
                          </div>
                        )
                      )}

                    {stats.openTasks ===
                      0 && (
                      <p className="text-slate-500">
                        Açık görev yok.
                      </p>
                    )}
                  </div>
                </article>
              </div>
            )}

            {activeTab ===
              "notes" && (
              <article className="mt-5 rounded-[30px] border border-white/10 bg-slate-900 p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-black">
                    Müşteri Notları
                  </h2>

                  <button
                    type="button"
                    onClick={() =>
                      setShowNoteForm(
                        true
                      )
                    }
                    className="flex min-h-11 items-center gap-2 rounded-xl bg-orange-500 px-4 font-black"
                  >
                    <FaPlus />
                    Not Ekle
                  </button>
                </div>

                <div className="mt-6 space-y-4">
                  {notes.map(
                    (note) => (
                      <div
                        key={note.id}
                        className={`rounded-2xl border p-5 ${
                          note.is_pinned
                            ? "border-orange-400/40 bg-orange-500/[0.05]"
                            : "border-white/10 bg-slate-950"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <span className="rounded-full bg-orange-500/10 px-3 py-1 text-xs font-black text-orange-400">
                              {noteTypeLabels[
                                note.note_type
                              ] ??
                                note.note_type}
                            </span>

                            {note.is_pinned && (
                              <span className="ml-2 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-black text-amber-400">
                                Sabit
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              void deleteNote(
                                note
                              )
                            }
                            className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/15 text-red-400"
                          >
                            <FaTrash />
                          </button>
                        </div>

                        <p className="mt-4 leading-7">
                          {note.content}
                        </p>

                        <p className="mt-4 text-xs text-slate-600">
                          {dateTime(
                            note.created_at
                          )}
                        </p>
                      </div>
                    )
                  )}

                  {notes.length ===
                    0 && (
                    <p className="p-10 text-center text-slate-500">
                      Henüz müşteri notu yok.
                    </p>
                  )}
                </div>
              </article>
            )}

            {activeTab ===
              "tasks" && (
              <article className="mt-5 rounded-[30px] border border-white/10 bg-slate-900 p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-black">
                    Görevler
                  </h2>

                  <button
                    type="button"
                    onClick={() =>
                      setShowTaskForm(
                        true
                      )
                    }
                    className="flex min-h-11 items-center gap-2 rounded-xl bg-orange-500 px-4 font-black"
                  >
                    <FaPlus />
                    Görev Ekle
                  </button>
                </div>

                <div className="mt-6 space-y-4">
                  {tasks.map(
                    (task) => (
                      <div
                        key={task.id}
                        className="rounded-2xl border border-white/10 bg-slate-950 p-5"
                      >
                        <div className="flex flex-col justify-between gap-4 lg:flex-row">
                          <div>
                            <div className="flex flex-wrap gap-2">
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-black ${priorityClass(
                                  task.priority
                                )}`}
                              >
                                {priorityLabels[
                                  task.priority
                                ] ??
                                  task.priority}
                              </span>

                              <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-black text-slate-400">
                                {taskTypeLabels[
                                  task.task_type
                                ] ??
                                  task.task_type}
                              </span>
                            </div>

                            <h3 className="mt-3 text-lg font-black">
                              {
                                task.title
                              }
                            </h3>

                            {task.description && (
                              <p className="mt-2 text-sm leading-6 text-slate-400">
                                {
                                  task.description
                                }
                              </p>
                            )}

                            <p className="mt-3 text-xs text-slate-600">
                              Son tarih:{" "}
                              {dateTime(
                                task.due_at
                              )}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-start gap-2">
                            <select
                              value={
                                task.status
                              }
                              onChange={(
                                event
                              ) =>
                                void updateTaskStatus(
                                  task,
                                  event
                                    .target
                                    .value
                                )
                              }
                              className="min-h-10 rounded-xl bg-white px-3 text-sm font-bold text-slate-950"
                            >
                              {Object.entries(
                                taskStatusLabels
                              ).map(
                                ([
                                  value,
                                  label,
                                ]) => (
                                  <option
                                    key={
                                      value
                                    }
                                    value={
                                      value
                                    }
                                  >
                                    {
                                      label
                                    }
                                  </option>
                                )
                              )}
                            </select>

                            <button
                              type="button"
                              onClick={() =>
                                void deleteTask(
                                  task
                                )
                              }
                              className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/15 text-red-400"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  )}

                  {tasks.length ===
                    0 && (
                    <p className="p-10 text-center text-slate-500">
                      Henüz görev yok.
                    </p>
                  )}
                </div>
              </article>
            )}

            {activeTab ===
              "deals" && (
              <article className="mt-5 rounded-[30px] border border-white/10 bg-slate-900 p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-black">
                    Satış Fırsatları
                  </h2>

                  <button
                    type="button"
                    onClick={() =>
                      setShowDealForm(
                        true
                      )
                    }
                    className="flex min-h-11 items-center gap-2 rounded-xl bg-orange-500 px-4 font-black"
                  >
                    <FaPlus />
                    Fırsat Ekle
                  </button>
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                  {deals.map(
                    (deal) => (
                      <div
                        key={deal.id}
                        className="rounded-2xl border border-white/10 bg-slate-950 p-5"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-black ${dealClass(
                                deal.stage
                              )}`}
                            >
                              {dealStageLabels[
                                deal.stage
                              ] ??
                                deal.stage}
                            </span>

                            <h3 className="mt-3 text-xl font-black">
                              {
                                deal.title
                              }
                            </h3>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              void deleteDeal(
                                deal
                              )
                            }
                            className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/15 text-red-400"
                          >
                            <FaTrash />
                          </button>
                        </div>

                        <div className="mt-5 grid grid-cols-2 gap-3">
                          <div className="rounded-xl bg-white/[0.03] p-3">
                            <p className="text-xs text-slate-600">
                              Gelir
                            </p>

                            <p className="mt-1 font-black text-emerald-400">
                              {money(
                                deal.expected_revenue
                              )}
                            </p>
                          </div>

                          <div className="rounded-xl bg-white/[0.03] p-3">
                            <p className="text-xs text-slate-600">
                              Kâr
                            </p>

                            <p className="mt-1 font-black text-blue-400">
                              {money(
                                deal.expected_profit
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500">
                              Kazanma olasılığı
                            </span>

                            <span className="font-black">
                              %
                              {
                                deal.probability
                              }
                            </span>
                          </div>

                          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/5">
                            <div
                              className="h-full bg-orange-500"
                              style={{
                                width: `${
                                  deal.probability
                                }%`,
                              }}
                            />
                          </div>
                        </div>

                        <p className="mt-4 text-xs text-slate-600">
                          Hedef kapanış:{" "}
                          {dateOnly(
                            deal.expected_close_date
                          )}
                        </p>

                        <select
                          value={
                            deal.stage
                          }
                          onChange={(
                            event
                          ) =>
                            void updateDealStage(
                              deal,
                              event
                                .target
                                .value
                            )
                          }
                          className="mt-4 min-h-11 w-full rounded-xl bg-white px-4 font-bold text-slate-950"
                        >
                          {Object.entries(
                            dealStageLabels
                          ).map(
                            ([
                              value,
                              label,
                            ]) => (
                              <option
                                key={
                                  value
                                }
                                value={
                                  value
                                }
                              >
                                {label}
                              </option>
                            )
                          )}
                        </select>
                      </div>
                    )
                  )}

                  {deals.length ===
                    0 && (
                    <p className="p-10 text-center text-slate-500 lg:col-span-2">
                      Henüz satış fırsatı yok.
                    </p>
                  )}
                </div>
              </article>
            )}

            {activeTab ===
              "timeline" && (
              <article className="mt-5 rounded-[30px] border border-white/10 bg-slate-900 p-6">
                <h2 className="text-2xl font-black">
                  Müşteri Timeline
                </h2>

                <div className="relative mt-7 space-y-5">
                  {timeline.map(
                    (item) => (
                      <div
                        key={item.id}
                        className="flex gap-4"
                      >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-500/15 text-orange-400">
                          <FaHistory />
                        </div>

                        <div className="flex-1 rounded-2xl bg-slate-950 p-4">
                          <div className="flex flex-col justify-between gap-2 sm:flex-row">
                            <p className="font-black">
                              {
                                item.title
                              }
                            </p>

                            <p className="text-xs text-slate-600">
                              {dateTime(
                                item.created_at
                              )}
                            </p>
                          </div>

                          {item.description && (
                            <p className="mt-2 text-sm leading-6 text-slate-400">
                              {
                                item.description
                              }
                            </p>
                          )}

                          <span className="mt-3 inline-flex rounded-full bg-white/5 px-3 py-1 text-xs font-black text-slate-500">
                            {
                              item.event_type
                            }
                          </span>
                        </div>
                      </div>
                    )
                  )}

                  {timeline.length ===
                    0 && (
                    <p className="p-10 text-center text-slate-500">
                      Timeline kaydı yok.
                    </p>
                  )}
                </div>
              </article>
            )}
          </section>
        </section>
      </div>

      {showNoteForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-5">
          <form
            onSubmit={saveNote}
            className="w-full max-w-2xl rounded-[30px] border border-white/10 bg-slate-950 p-7"
          >
            <div className="flex justify-between gap-4">
              <div>
                <p className="text-xs font-black text-orange-400">
                  CRM NOTU
                </p>

                <h2 className="mt-2 text-2xl font-black">
                  Yeni Not
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowNoteForm(
                    false
                  )
                }
              >
                <FaTimes />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <select
                value={
                  noteForm.note_type
                }
                onChange={(event) =>
                  setNoteForm(
                    (current) => ({
                      ...current,
                      note_type:
                        event.target
                          .value,
                    })
                  )
                }
                className="min-h-12 w-full rounded-xl bg-white px-4 font-bold text-slate-950"
              >
                {Object.entries(
                  noteTypeLabels
                ).map(
                  ([
                    value,
                    label,
                  ]) => (
                    <option
                      key={value}
                      value={value}
                    >
                      {label}
                    </option>
                  )
                )}
              </select>

              <textarea
                required
                rows={6}
                value={
                  noteForm.content
                }
                onChange={(event) =>
                  setNoteForm(
                    (current) => ({
                      ...current,
                      content:
                        event.target
                          .value,
                    })
                  )
                }
                placeholder="Müşteri hakkında not..."
                className="w-full rounded-xl bg-white p-4 font-bold text-slate-950"
              />

              <label className="flex items-center gap-3 font-black">
                <input
                  type="checkbox"
                  checked={
                    noteForm.is_pinned
                  }
                  onChange={(
                    event
                  ) =>
                    setNoteForm(
                      (current) => ({
                        ...current,
                        is_pinned:
                          event.target
                            .checked,
                      })
                    )
                  }
                  className="h-5 w-5"
                />

                Önemli not olarak sabitle
              </label>
            </div>

            <button
              type="submit"
              disabled={processing}
              className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 font-black disabled:opacity-50"
            >
              <FaSave />
              Notu Kaydet
            </button>
          </form>
        </div>
      )}

      {showTaskForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-5">
          <form
            onSubmit={saveTask}
            className="w-full max-w-2xl rounded-[30px] border border-white/10 bg-slate-950 p-7"
          >
            <div className="flex justify-between gap-4">
              <div>
                <p className="text-xs font-black text-orange-400">
                  CRM GÖREVİ
                </p>

                <h2 className="mt-2 text-2xl font-black">
                  Yeni Görev
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowTaskForm(
                    false
                  )
                }
              >
                <FaTimes />
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <input
                required
                value={
                  taskForm.title
                }
                onChange={(event) =>
                  setTaskForm(
                    (current) => ({
                      ...current,
                      title:
                        event.target
                          .value,
                    })
                  )
                }
                placeholder="Görev başlığı"
                className="min-h-12 rounded-xl bg-white px-4 font-bold text-slate-950 md:col-span-2"
              />

              <select
                value={
                  taskForm.task_type
                }
                onChange={(event) =>
                  setTaskForm(
                    (current) => ({
                      ...current,
                      task_type:
                        event.target
                          .value,
                    })
                  )
                }
                className="min-h-12 rounded-xl bg-white px-4 font-bold text-slate-950"
              >
                {Object.entries(
                  taskTypeLabels
                ).map(
                  ([
                    value,
                    label,
                  ]) => (
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
                  taskForm.priority
                }
                onChange={(event) =>
                  setTaskForm(
                    (current) => ({
                      ...current,
                      priority:
                        event.target
                          .value,
                    })
                  )
                }
                className="min-h-12 rounded-xl bg-white px-4 font-bold text-slate-950"
              >
                {Object.entries(
                  priorityLabels
                ).map(
                  ([
                    value,
                    label,
                  ]) => (
                    <option
                      key={value}
                      value={value}
                    >
                      {label}
                    </option>
                  )
                )}
              </select>

              <input
                type="datetime-local"
                value={
                  taskForm.due_at
                }
                onChange={(event) =>
                  setTaskForm(
                    (current) => ({
                      ...current,
                      due_at:
                        event.target
                          .value,
                    })
                  )
                }
                className="min-h-12 rounded-xl bg-white px-4 font-bold text-slate-950 md:col-span-2"
              />

              <textarea
                rows={4}
                value={
                  taskForm.description
                }
                onChange={(event) =>
                  setTaskForm(
                    (current) => ({
                      ...current,
                      description:
                        event.target
                          .value,
                    })
                  )
                }
                placeholder="Görev açıklaması"
                className="rounded-xl bg-white p-4 font-bold text-slate-950 md:col-span-2"
              />
            </div>

            <button
              type="submit"
              disabled={processing}
              className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 font-black disabled:opacity-50"
            >
              <FaSave />
              Görevi Kaydet
            </button>
          </form>
        </div>
      )}

      {showDealForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-5">
          <form
            onSubmit={saveDeal}
            className="w-full max-w-2xl rounded-[30px] border border-white/10 bg-slate-950 p-7"
          >
            <div className="flex justify-between gap-4">
              <div>
                <p className="text-xs font-black text-orange-400">
                  SATIŞ PIPELINE
                </p>

                <h2 className="mt-2 text-2xl font-black">
                  Yeni Satış Fırsatı
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowDealForm(
                    false
                  )
                }
              >
                <FaTimes />
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <input
                required
                value={
                  dealForm.title
                }
                onChange={(event) =>
                  setDealForm(
                    (current) => ({
                      ...current,
                      title:
                        event.target
                          .value,
                    })
                  )
                }
                placeholder="Örn: 5 gece Fethiye Balayı Paketi"
                className="min-h-12 rounded-xl bg-white px-4 font-bold text-slate-950 md:col-span-2"
              />

              <select
                value={
                  dealForm.stage
                }
                onChange={(event) =>
                  setDealForm(
                    (current) => ({
                      ...current,
                      stage:
                        event.target
                          .value,
                    })
                  )
                }
                className="min-h-12 rounded-xl bg-white px-4 font-bold text-slate-950"
              >
                {Object.entries(
                  dealStageLabels
                ).map(
                  ([
                    value,
                    label,
                  ]) => (
                    <option
                      key={value}
                      value={value}
                    >
                      {label}
                    </option>
                  )
                )}
              </select>

              <input
                type="number"
                min="0"
                max="100"
                value={
                  dealForm.probability
                }
                onChange={(event) =>
                  setDealForm(
                    (current) => ({
                      ...current,
                      probability:
                        event.target
                          .value,
                    })
                  )
                }
                placeholder="Olasılık %"
                className="min-h-12 rounded-xl bg-white px-4 font-bold text-slate-950"
              />

              <input
                type="number"
                min="0"
                value={
                  dealForm.expected_revenue
                }
                onChange={(event) =>
                  setDealForm(
                    (current) => ({
                      ...current,
                      expected_revenue:
                        event.target
                          .value,
                    })
                  )
                }
                placeholder="Beklenen gelir"
                className="min-h-12 rounded-xl bg-white px-4 font-bold text-slate-950"
              />

              <input
                type="number"
                min="0"
                value={
                  dealForm.expected_cost
                }
                onChange={(event) =>
                  setDealForm(
                    (current) => ({
                      ...current,
                      expected_cost:
                        event.target
                          .value,
                    })
                  )
                }
                placeholder="Beklenen maliyet"
                className="min-h-12 rounded-xl bg-white px-4 font-bold text-slate-950"
              />

              <input
                type="date"
                value={
                  dealForm.expected_close_date
                }
                onChange={(event) =>
                  setDealForm(
                    (current) => ({
                      ...current,
                      expected_close_date:
                        event.target
                          .value,
                    })
                  )
                }
                className="min-h-12 rounded-xl bg-white px-4 font-bold text-slate-950 md:col-span-2"
              />
            </div>

            <button
              type="submit"
              disabled={processing}
              className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 font-black disabled:opacity-50"
            >
              <FaSave />
              Fırsatı Kaydet
            </button>
          </form>
        </div>
      )}
    </main>
  );
}
