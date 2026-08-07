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
  FaAddressBook,
  FaArrowRight,
  FaBriefcase,
  FaCheck,
  FaCrown,
  FaDownload,
  FaEdit,
  FaEnvelope,
  FaFilter,
  FaInstagram,
  FaMoneyBillWave,
  FaPhone,
  FaPlus,
  FaSave,
  FaSearch,
  FaTasks,
  FaTimes,
  FaTrash,
  FaUndo,
  FaUser,
  FaUserCheck,
  FaUsers,
  FaWhatsapp,
} from "react-icons/fa";

import { supabase } from "@/lib/supabase";
import {
  CurrentMembership,
  getCurrentMembership,
} from "@/lib/current-user";

type CustomerType =
  | "individual"
  | "corporate"
  | "agency"
  | "partner";

type LifecycleStage =
  | "lead"
  | "prospect"
  | "offer_sent"
  | "payment_pending"
  | "customer"
  | "completed"
  | "lost"
  | "inactive";

type VipLevel =
  | "standard"
  | "silver"
  | "gold"
  | "platinum"
  | "vip";

type CrmCustomer = {
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

  customer_type: CustomerType;
  lifecycle_stage: LifecycleStage;

  source: string | null;
  source_detail: string | null;

  vip_level: VipLevel;

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

type CrmTask = {
  id: string;
  customer_id: string | null;
  status:
    | "pending"
    | "in_progress"
    | "completed"
    | "cancelled";
  priority:
    | "low"
    | "normal"
    | "high"
    | "urgent";
  due_at: string | null;
};

type CrmDeal = {
  id: string;
  customer_id: string | null;

  stage:
    | "new_lead"
    | "contacted"
    | "offer_preparing"
    | "offer_sent"
    | "negotiation"
    | "payment_pending"
    | "won"
    | "lost";

  expected_revenue: number;
  expected_cost: number;
  expected_profit: number;
  probability: number;
};

type CustomerForm = {
  full_name: string;
  first_name: string;
  last_name: string;

  phone: string;
  whatsapp_phone: string;
  email: string;

  country_code: string;
  city: string;
  preferred_language: string;

  birth_date: string;
  anniversary_date: string;

  instagram_username: string;

  customer_type: CustomerType;
  lifecycle_stage: LifecycleStage;

  source: string;
  source_detail: string;

  vip_level: VipLevel;

  marketing_consent: boolean;
  whatsapp_consent: boolean;
  email_consent: boolean;
};

const lifecycleLabels: Record<
  LifecycleStage,
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

const customerTypeLabels: Record<
  CustomerType,
  string
> = {
  individual: "Bireysel",
  corporate: "Kurumsal",
  agency: "Acenta",
  partner: "İş Ortağı",
};

const vipLabels: Record<
  VipLevel,
  string
> = {
  standard: "Standart",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
  vip: "VIP",
};

function emptyForm(): CustomerForm {
  return {
    full_name: "",
    first_name: "",
    last_name: "",

    phone: "",
    whatsapp_phone: "",
    email: "",

    country_code: "TR",
    city: "",
    preferred_language: "tr",

    birth_date: "",
    anniversary_date: "",

    instagram_username: "",

    customer_type: "individual",
    lifecycle_stage: "lead",

    source: "",
    source_detail: "",

    vip_level: "standard",

    marketing_consent: false,
    whatsapp_consent: false,
    email_consent: false,
  };
}

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
  ).format(Number(value || 0));
}

function dateText(
  value: string | null
): string {
  if (!value) {
    return "—";
  }

  return new Date(
    value
  ).toLocaleDateString(
    "tr-TR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  );
}

function lifecycleClass(
  stage: LifecycleStage
): string {
  switch (stage) {
    case "customer":
    case "completed":
      return "bg-emerald-500/15 text-emerald-400";

    case "offer_sent":
      return "bg-blue-500/15 text-blue-400";

    case "payment_pending":
      return "bg-amber-500/15 text-amber-400";

    case "prospect":
      return "bg-violet-500/15 text-violet-400";

    case "lost":
      return "bg-red-500/15 text-red-400";

    case "inactive":
      return "bg-slate-500/15 text-slate-400";

    default:
      return "bg-orange-500/15 text-orange-400";
  }
}

function vipClass(
  vip: VipLevel
): string {
  switch (vip) {
    case "vip":
      return "bg-orange-500/15 text-orange-400";

    case "platinum":
      return "bg-violet-500/15 text-violet-400";

    case "gold":
      return "bg-amber-500/15 text-amber-400";

    case "silver":
      return "bg-slate-400/15 text-slate-300";

    default:
      return "bg-slate-800 text-slate-500";
  }
}

function generateCustomerCode(): string {
  const now = new Date();

  const year =
    now.getFullYear();

  const random =
    Math.floor(
      100000 +
        Math.random() * 900000
    );

  return `CRM-${year}-${random}`;
}

export default function CrmProPage() {
  const [
    membership,
    setMembership,
  ] =
    useState<CurrentMembership | null>(
      null
    );

  const [customers, setCustomers] =
    useState<CrmCustomer[]>([]);

  const [tasks, setTasks] =
    useState<CrmTask[]>([]);

  const [deals, setDeals] =
    useState<CrmDeal[]>([]);

  const [search, setSearch] =
    useState("");

  const [
    lifecycleFilter,
    setLifecycleFilter,
  ] =
    useState<
      "all" | LifecycleStage
    >("all");

  const [
    customerTypeFilter,
    setCustomerTypeFilter,
  ] =
    useState<
      "all" | CustomerType
    >("all");

  const [
    vipFilter,
    setVipFilter,
  ] =
    useState<
      "all" | VipLevel
    >("all");

  const [
    activityFilter,
    setActivityFilter,
  ] =
    useState<
      "active" | "inactive" | "all"
    >("active");

  const [
    selectedIds,
    setSelectedIds,
  ] = useState<string[]>([]);

  const [showForm, setShowForm] =
    useState(false);

  const [editingId, setEditingId] =
    useState("");

  const [form, setForm] =
    useState<CustomerForm>(
      emptyForm()
    );

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [
    bulkProcessing,
    setBulkProcessing,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const loadData = useCallback(
    async (
      companyId: string
    ) => {
      const [
        customerResult,
        taskResult,
        dealResult,
      ] = await Promise.all([
        supabase
          .from("crm_customers")
          .select(`
            id,
            company_id,
            customer_code,
            full_name,
            first_name,
            last_name,
            phone,
            whatsapp_phone,
            email,
            country_code,
            city,
            preferred_language,
            birth_date,
            anniversary_date,
            instagram_username,
            customer_type,
            lifecycle_stage,
            source,
            source_detail,
            vip_level,
            total_reservations,
            total_spent,
            total_profit,
            last_reservation_at,
            last_contact_at,
            marketing_consent,
            whatsapp_consent,
            email_consent,
            is_active,
            created_at,
            updated_at
          `)
          .eq(
            "company_id",
            companyId
          )
          .order(
            "updated_at",
            {
              ascending: false,
            }
          ),

        supabase
          .from("crm_tasks")
          .select(`
            id,
            customer_id,
            status,
            priority,
            due_at
          `)
          .eq(
            "company_id",
            companyId
          ),

        supabase
          .from("crm_deals")
          .select(`
            id,
            customer_id,
            stage,
            expected_revenue,
            expected_cost,
            expected_profit,
            probability
          `)
          .eq(
            "company_id",
            companyId
          ),
      ]);

      const error =
        customerResult.error ??
        taskResult.error ??
        dealResult.error;

      if (error) {
        throw error;
      }

      setCustomers(
        (customerResult.data ??
          []) as CrmCustomer[]
      );

      setTasks(
        (taskResult.data ??
          []) as CrmTask[]
      );

      setDeals(
        (dealResult.data ??
          []) as CrmDeal[]
      );
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
            : "CRM yüklenemedi."
        );
      } finally {
        setLoading(false);
      }
    }

    void initialize();
  }, [loadData]);

  async function refresh() {
    if (!membership) {
      return;
    }

    await loadData(
      membership.company_id
    );
  }

  const taskCountMap =
    useMemo(() => {
      const map =
        new Map<
          string,
          {
            open: number;
            urgent: number;
          }
        >();

      for (
        const task of tasks
      ) {
        if (!task.customer_id) {
          continue;
        }

        const current =
          map.get(
            task.customer_id
          ) ?? {
            open: 0,
            urgent: 0,
          };

        if (
          task.status ===
            "pending" ||
          task.status ===
            "in_progress"
        ) {
          current.open += 1;

          if (
            task.priority ===
            "urgent"
          ) {
            current.urgent += 1;
          }
        }

        map.set(
          task.customer_id,
          current
        );
      }

      return map;
    }, [tasks]);

  const dealMap =
    useMemo(() => {
      const map =
        new Map<
          string,
          {
            count: number;
            openRevenue: number;
            wonRevenue: number;
          }
        >();

      for (
        const deal of deals
      ) {
        if (!deal.customer_id) {
          continue;
        }

        const current =
          map.get(
            deal.customer_id
          ) ?? {
            count: 0,
            openRevenue: 0,
            wonRevenue: 0,
          };

        current.count += 1;

        if (
          deal.stage ===
          "won"
        ) {
          current.wonRevenue +=
            Number(
              deal.expected_revenue
            );
        } else if (
          deal.stage !== "lost"
        ) {
          current.openRevenue +=
            Number(
              deal.expected_revenue
            );
        }

        map.set(
          deal.customer_id,
          current
        );
      }

      return map;
    }, [deals]);

  const visibleCustomers =
    useMemo(() => {
      const query = search
        .trim()
        .toLocaleLowerCase(
          "tr-TR"
        );

      return customers.filter(
        (customer) => {
          if (
            activityFilter ===
              "active" &&
            !customer.is_active
          ) {
            return false;
          }

          if (
            activityFilter ===
              "inactive" &&
            customer.is_active
          ) {
            return false;
          }

          if (
            lifecycleFilter !==
              "all" &&
            customer.lifecycle_stage !==
              lifecycleFilter
          ) {
            return false;
          }

          if (
            customerTypeFilter !==
              "all" &&
            customer.customer_type !==
              customerTypeFilter
          ) {
            return false;
          }

          if (
            vipFilter !== "all" &&
            customer.vip_level !==
              vipFilter
          ) {
            return false;
          }

          if (!query) {
            return true;
          }

          return [
            customer.customer_code,
            customer.full_name,
            customer.first_name,
            customer.last_name,
            customer.phone,
            customer.whatsapp_phone,
            customer.email,
            customer.city,
            customer.instagram_username,
            customer.source,
            customer.source_detail,
            lifecycleLabels[
              customer.lifecycle_stage
            ],
            customerTypeLabels[
              customer.customer_type
            ],
            vipLabels[
              customer.vip_level
            ],
          ]
            .filter(Boolean)
            .some((value) =>
              String(value)
                .toLocaleLowerCase(
                  "tr-TR"
                )
                .includes(query)
            );
        }
      );
    }, [
      customers,
      search,
      lifecycleFilter,
      customerTypeFilter,
      vipFilter,
      activityFilter,
    ]);

  const statistics =
    useMemo(() => {
      const activeCustomers =
        customers.filter(
          (customer) =>
            customer.is_active
        );

      const totalSpent =
        activeCustomers.reduce(
          (sum, customer) =>
            sum +
            Number(
              customer.total_spent
            ),
          0
        );

      const totalProfit =
        activeCustomers.reduce(
          (sum, customer) =>
            sum +
            Number(
              customer.total_profit
            ),
          0
        );

      const openTasks =
        tasks.filter(
          (task) =>
            task.status ===
              "pending" ||
            task.status ===
              "in_progress"
        ).length;

      const urgentTasks =
        tasks.filter(
          (task) =>
            (
              task.status ===
                "pending" ||
              task.status ===
                "in_progress"
            ) &&
            task.priority ===
              "urgent"
        ).length;

      const openDeals =
        deals.filter(
          (deal) =>
            ![
              "won",
              "lost",
            ].includes(
              deal.stage
            )
        );

      const pipelineRevenue =
        openDeals.reduce(
          (sum, deal) =>
            sum +
            Number(
              deal.expected_revenue
            ),
          0
        );

      const weightedPipeline =
        openDeals.reduce(
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

      return {
        active:
          activeCustomers.length,

        leads:
          activeCustomers.filter(
            (customer) =>
              customer.lifecycle_stage ===
              "lead"
          ).length,

        customers:
          activeCustomers.filter(
            (customer) =>
              [
                "customer",
                "completed",
              ].includes(
                customer.lifecycle_stage
              )
          ).length,

        vip:
          activeCustomers.filter(
            (customer) =>
              [
                "gold",
                "platinum",
                "vip",
              ].includes(
                customer.vip_level
              )
          ).length,

        totalSpent,
        totalProfit,
        openTasks,
        urgentTasks,
        openDeals:
          openDeals.length,
        pipelineRevenue,
        weightedPipeline,
      };
    }, [
      customers,
      tasks,
      deals,
    ]);

  function openNewCustomer() {
    setEditingId("");
    setForm(emptyForm());
    setShowForm(true);

    setErrorMessage("");
    setSuccessMessage("");
  }

  function openEditCustomer(
    customer: CrmCustomer
  ) {
    setEditingId(
      customer.id
    );

    setForm({
      full_name:
        customer.full_name,

      first_name:
        customer.first_name ??
        "",

      last_name:
        customer.last_name ??
        "",

      phone:
        customer.phone ?? "",

      whatsapp_phone:
        customer.whatsapp_phone ??
        "",

      email:
        customer.email ?? "",

      country_code:
        customer.country_code ??
        "TR",

      city:
        customer.city ?? "",

      preferred_language:
        customer.preferred_language ??
        "tr",

      birth_date:
        customer.birth_date ??
        "",

      anniversary_date:
        customer.anniversary_date ??
        "",

      instagram_username:
        customer.instagram_username ??
        "",

      customer_type:
        customer.customer_type,

      lifecycle_stage:
        customer.lifecycle_stage,

      source:
        customer.source ?? "",

      source_detail:
        customer.source_detail ??
        "",

      vip_level:
        customer.vip_level,

      marketing_consent:
        customer.marketing_consent,

      whatsapp_consent:
        customer.whatsapp_consent,

      email_consent:
        customer.email_consent,
    });

    setShowForm(true);
  }

  function updateField<
    K extends keyof CustomerForm
  >(
    key: K,
    value: CustomerForm[K]
  ) {
    setForm(
      (current) => ({
        ...current,
        [key]: value,
      })
    );
  }

  async function saveCustomer(
    event: FormEvent
  ) {
    event.preventDefault();

    if (
      !membership ||
      saving
    ) {
      return;
    }

    if (
      !form.full_name.trim()
    ) {
      setErrorMessage(
        "Ad soyad / müşteri adı zorunludur."
      );

      return;
    }

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      const payload = {
        company_id:
          membership.company_id,

        full_name:
          form.full_name.trim(),

        first_name:
          form.first_name.trim() ||
          null,

        last_name:
          form.last_name.trim() ||
          null,

        phone:
          form.phone.trim() ||
          null,

        whatsapp_phone:
          form.whatsapp_phone.trim() ||
          null,

        email:
          form.email.trim() ||
          null,

        country_code:
          form.country_code.trim() ||
          null,

        city:
          form.city.trim() ||
          null,

        preferred_language:
          form.preferred_language ||
          "tr",

        birth_date:
          form.birth_date ||
          null,

        anniversary_date:
          form.anniversary_date ||
          null,

        instagram_username:
          form.instagram_username.trim() ||
          null,

        customer_type:
          form.customer_type,

        lifecycle_stage:
          form.lifecycle_stage,

        source:
          form.source.trim() ||
          null,

        source_detail:
          form.source_detail.trim() ||
          null,

        vip_level:
          form.vip_level,

        marketing_consent:
          form.marketing_consent,

        whatsapp_consent:
          form.whatsapp_consent,

        email_consent:
          form.email_consent,

        updated_at:
          new Date().toISOString(),
      };

      if (editingId) {
        const { error } =
          await supabase
            .from(
              "crm_customers"
            )
            .update(payload)
            .eq(
              "company_id",
              membership.company_id
            )
            .eq(
              "id",
              editingId
            );

        if (error) {
          throw error;
        }

        await supabase
          .from("crm_timeline")
          .insert({
            company_id:
              membership.company_id,

            customer_id:
              editingId,

            event_type:
              "status_changed",

            title:
              "Müşteri profili güncellendi",

            description:
              `${form.full_name} müşteri profili düzenlendi.`,

            created_by:
              user?.id ?? null,
          });

        setSuccessMessage(
          "Müşteri profili güncellendi."
        );
      } else {
        const {
          data: created,
          error,
        } =
          await supabase
            .from(
              "crm_customers"
            )
            .insert({
              ...payload,

              customer_code:
                generateCustomerCode(),

              is_active: true,

              created_by:
                user?.id ?? null,
            })
            .select(
              "id, customer_code"
            )
            .single();

        if (error) {
          throw error;
        }

        if (created) {
          await supabase
            .from(
              "crm_timeline"
            )
            .insert({
              company_id:
                membership.company_id,

              customer_id:
                created.id,

              event_type:
                "customer_created",

              title:
                "Yeni CRM müşterisi oluşturuldu",

              description:
                `${form.full_name} CRM sistemine eklendi.`,

              created_by:
                user?.id ?? null,
            });
        }

        setSuccessMessage(
          "Yeni müşteri oluşturuldu."
        );
      }

      setShowForm(false);
      setEditingId("");
      setForm(emptyForm());

      await refresh();
    } catch (error: unknown) {

      console.error(
        "CRM SAVE ERROR:",
        error
      );

      const message =
        error instanceof Error
          ? error.message
          : JSON.stringify(error);

      setErrorMessage(message);

    } finally {
      setSaving(false);
    }
  }

  async function toggleCustomerActive(
    customer: CrmCustomer
  ) {
    if (
      !membership ||
      bulkProcessing
    ) {
      return;
    }

    const nextActive =
      !customer.is_active;

    const approved =
      window.confirm(
        nextActive
          ? `${customer.full_name} tekrar aktif hale getirilsin mi?`
          : `${customer.full_name} pasife alınsın mı? Kayıt silinmeyecek.`
      );

    if (!approved) {
      return;
    }

    setBulkProcessing(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const { error } =
        await supabase
          .from("crm_customers")
          .update({
            is_active:
              nextActive,

            lifecycle_stage:
              nextActive
                ? customer.lifecycle_stage ===
                  "inactive"
                  ? "lead"
                  : customer.lifecycle_stage
                : "inactive",

            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "company_id",
            membership.company_id
          )
          .eq(
            "id",
            customer.id
          );

      if (error) {
        throw error;
      }

      await refresh();

      setSuccessMessage(
        nextActive
          ? "Müşteri tekrar aktifleştirildi."
          : "Müşteri pasife alındı."
      );
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "İşlem tamamlanamadı."
      );
    } finally {
      setBulkProcessing(false);
    }
  }

  function toggleSelection(
    id: string
  ) {
    setSelectedIds(
      (current) =>
        current.includes(id)
          ? current.filter(
              (item) =>
                item !== id
            )
          : [
              ...current,
              id,
            ]
    );
  }

  function toggleAllVisible() {
    const ids =
      visibleCustomers.map(
        (customer) =>
          customer.id
      );

    const allSelected =
      ids.length > 0 &&
      ids.every((id) =>
        selectedIds.includes(id)
      );

    if (allSelected) {
      setSelectedIds(
        (current) =>
          current.filter(
            (id) =>
              !ids.includes(id)
          )
      );

      return;
    }

    setSelectedIds(
      (current) =>
        Array.from(
          new Set([
            ...current,
            ...ids,
          ])
        )
    );
  }

  async function bulkStageUpdate(
    stage: LifecycleStage
  ) {
    if (
      !membership ||
      bulkProcessing ||
      selectedIds.length === 0
    ) {
      return;
    }

    if (
      !window.confirm(
        `${selectedIds.length} müşterinin aşaması "${lifecycleLabels[stage]}" olarak güncellensin mi?`
      )
    ) {
      return;
    }

    setBulkProcessing(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const { error } =
        await supabase
          .from("crm_customers")
          .update({
            lifecycle_stage:
              stage,

            is_active:
              stage !== "inactive",

            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "company_id",
            membership.company_id
          )
          .in(
            "id",
            selectedIds
          );

      if (error) {
        throw error;
      }

      const count =
        selectedIds.length;

      setSelectedIds([]);

      await refresh();

      setSuccessMessage(
        `${count} müşteri güncellendi.`
      );
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Toplu işlem tamamlanamadı."
      );
    } finally {
      setBulkProcessing(false);
    }
  }

  function clearFilters() {
    setSearch("");
    setLifecycleFilter("all");
    setCustomerTypeFilter("all");
    setVipFilter("all");
    setActivityFilter("active");
  }

  function exportCsv() {
    if (
      visibleCustomers.length ===
      0
    ) {
      setErrorMessage(
        "Dışa aktarılacak müşteri bulunmuyor."
      );

      return;
    }

    const rows =
      visibleCustomers.map(
        (customer) => ({
          Kod:
            customer.customer_code ??
            "",

          Musteri:
            customer.full_name,

          Telefon:
            customer.phone ?? "",

          WhatsApp:
            customer.whatsapp_phone ??
            "",

          Eposta:
            customer.email ?? "",

          Sehir:
            customer.city ?? "",

          Tip:
            customerTypeLabels[
              customer.customer_type
            ],

          Asama:
            lifecycleLabels[
              customer.lifecycle_stage
            ],

          VIP:
            vipLabels[
              customer.vip_level
            ],

          Kaynak:
            customer.source ?? "",

          Rezervasyon:
            customer.total_reservations,

          Harcama:
            customer.total_spent,

          Kar:
            customer.total_profit,

          WhatsAppIzni:
            customer.whatsapp_consent
              ? "Evet"
              : "Hayır",

          EpostaIzni:
            customer.email_consent
              ? "Evet"
              : "Hayır",
        })
      );

    const headers =
      Object.keys(rows[0]);

    const escapeCell = (
      value: unknown
    ) =>
      `"${String(
        value ?? ""
      ).replaceAll(
        '"',
        '""'
      )}"`;

    const csv = [
      headers
        .map(escapeCell)
        .join(";"),

      ...rows.map((row) =>
        headers
          .map((header) =>
            escapeCell(
              (
                row as Record<
                  string,
                  unknown
                >
              )[header]
            )
          )
          .join(";")
      ),
    ].join("\n");

    const blob =
      new Blob(
        [
          "\uFEFF",
          csv,
        ],
        {
          type:
            "text/csv;charset=utf-8;",
        }
      );

    const url =
      URL.createObjectURL(
        blob
      );

    const link =
      document.createElement(
        "a"
      );

    link.href = url;
    link.download =
      "crm-musterileri.csv";

    link.click();

    URL.revokeObjectURL(
      url
    );
  }

  if (loading) {
    return (
      <main className="p-10">
        CRM Merkezi yükleniyor...
      </main>
    );
  }

  return (
    <main className="px-4 py-8 lg:px-8">
      <div className="mx-auto max-w-[1900px]">
        <header className="flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.25em] text-orange-400">
              TUROS CRM
            </p>

            <h1 className="mt-3 text-4xl font-black md:text-5xl">
              CRM & Müşteri Merkezi
            </h1>

            <p className="mt-4 max-w-4xl text-slate-400">
              Lead, müşteri, satış
              fırsatı, görev, iletişim
              izinleri ve müşteri
              değerini tek merkezden
              yönetin.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={exportCsv}
              className="flex min-h-12 items-center gap-2 rounded-xl border border-white/10 px-5 font-black"
            >
              <FaDownload />
              CSV Aktar
            </button>

            <button
              type="button"
              onClick={
                openNewCustomer
              }
              className="flex min-h-12 items-center gap-2 rounded-xl bg-orange-500 px-6 font-black"
            >
              <FaPlus />
              Yeni Müşteri
            </button>
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
                "Aktif Müşteri",
              value:
                statistics.active,
              icon: FaUsers,
              className:
                "text-blue-400",
            },
            {
              label:
                "Yeni Lead",
              value:
                statistics.leads,
              icon:
                FaAddressBook,
              className:
                "text-orange-400",
            },
            {
              label:
                "Gerçek Müşteri",
              value:
                statistics.customers,
              icon: FaUserCheck,
              className:
                "text-emerald-400",
            },
            {
              label:
                "VIP / Gold+",
              value:
                statistics.vip,
              icon: FaCrown,
              className:
                "text-amber-400",
            },
            {
              label:
                "Açık Görev",
              value:
                statistics.openTasks,
              icon: FaTasks,
              className:
                statistics.urgentTasks >
                0
                  ? "text-red-400"
                  : "text-violet-400",
            },
            {
              label:
                "Açık Fırsat",
              value:
                statistics.openDeals,
              icon: FaBriefcase,
              className:
                "text-cyan-400",
            },
          ].map((item) => {
            const Icon = item.icon;

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

                <p className="mt-2 text-3xl font-black">
                  {item.value}
                </p>
              </article>
            );
          })}
        </section>

        <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl bg-emerald-500/10 p-5">
            <p className="text-sm text-emerald-300">
              Toplam Müşteri Harcaması
            </p>

            <p className="mt-2 text-2xl font-black text-emerald-400">
              {money(
                statistics.totalSpent
              )}
            </p>
          </article>

          <article className="rounded-2xl bg-blue-500/10 p-5">
            <p className="text-sm text-blue-300">
              Toplam Kâr
            </p>

            <p className="mt-2 text-2xl font-black text-blue-400">
              {money(
                statistics.totalProfit
              )}
            </p>
          </article>

          <article className="rounded-2xl bg-violet-500/10 p-5">
            <p className="text-sm text-violet-300">
              Satış Pipeline
            </p>

            <p className="mt-2 text-2xl font-black text-violet-400">
              {money(
                statistics.pipelineRevenue
              )}
            </p>
          </article>

          <article className="rounded-2xl bg-orange-500/10 p-5">
            <p className="text-sm text-orange-300">
              Olasılık Ağırlıklı Pipeline
            </p>

            <p className="mt-2 text-2xl font-black text-orange-400">
              {money(
                statistics.weightedPipeline
              )}
            </p>
          </article>
        </section>

        <section className="mt-7 rounded-[30px] border border-white/10 bg-slate-900 p-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <label className="flex min-h-12 items-center gap-3 rounded-xl bg-white px-4 xl:col-span-2">
              <FaSearch className="text-orange-500" />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Müşteri, telefon, WhatsApp, e-posta, şehir veya kaynak ara..."
                className="w-full bg-transparent font-bold text-slate-950 outline-none"
              />
            </label>

            <select
              value={
                lifecycleFilter
              }
              onChange={(event) =>
                setLifecycleFilter(
                  event.target
                    .value as
                    | "all"
                    | LifecycleStage
                )
              }
              className="min-h-12 rounded-xl bg-white px-4 font-bold text-slate-950"
            >
              <option value="all">
                Tüm aşamalar
              </option>

              {Object.entries(
                lifecycleLabels
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
                customerTypeFilter
              }
              onChange={(event) =>
                setCustomerTypeFilter(
                  event.target
                    .value as
                    | "all"
                    | CustomerType
                )
              }
              className="min-h-12 rounded-xl bg-white px-4 font-bold text-slate-950"
            >
              <option value="all">
                Tüm müşteri tipleri
              </option>

              {Object.entries(
                customerTypeLabels
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
              value={vipFilter}
              onChange={(event) =>
                setVipFilter(
                  event.target
                    .value as
                    | "all"
                    | VipLevel
                )
              }
              className="min-h-12 rounded-xl bg-white px-4 font-bold text-slate-950"
            >
              <option value="all">
                Tüm VIP seviyeleri
              </option>

              {Object.entries(
                vipLabels
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
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              {[
                {
                  value:
                    "active",
                  label:
                    "Aktif Kayıtlar",
                },
                {
                  value:
                    "inactive",
                  label:
                    "Pasif Kayıtlar",
                },
                {
                  value: "all",
                  label: "Tümü",
                },
              ].map((item) => (
                <button
                  key={
                    item.value
                  }
                  type="button"
                  onClick={() =>
                    setActivityFilter(
                      item.value as
                        | "active"
                        | "inactive"
                        | "all"
                    )
                  }
                  className={`rounded-xl px-4 py-2 text-sm font-black ${
                    activityFilter ===
                    item.value
                      ? "bg-orange-500"
                      : "bg-slate-950 text-slate-400"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={
                clearFilters
              }
              className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm font-black"
            >
              <FaFilter />
              Filtreleri Temizle
            </button>
          </div>
        </section>

        <section className="mt-5 flex flex-col justify-between gap-4 rounded-3xl border border-white/10 bg-slate-900 p-5 xl:flex-row xl:items-center">
          <label className="flex items-center gap-3 font-black">
            <input
              type="checkbox"
              checked={
                visibleCustomers.length >
                  0 &&
                visibleCustomers.every(
                  (customer) =>
                    selectedIds.includes(
                      customer.id
                    )
                )
              }
              onChange={
                toggleAllVisible
              }
              className="h-5 w-5"
            />

            Görünen müşterileri seç
          </label>

          <div className="flex flex-wrap gap-2">
            <select
              disabled={
                selectedIds.length ===
                  0 ||
                bulkProcessing
              }
              defaultValue=""
              onChange={(event) => {
                const value =
                  event.target
                    .value as
                    | ""
                    | LifecycleStage;

                if (!value) {
                  return;
                }

                void bulkStageUpdate(
                  value
                );

                event.target.value =
                  "";
              }}
              className="min-h-11 rounded-xl bg-white px-4 font-bold text-slate-950 disabled:opacity-40"
            >
              <option value="">
                Toplu aşama değiştir
              </option>

              {Object.entries(
                lifecycleLabels
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

            <span className="flex min-h-11 items-center rounded-xl bg-slate-950 px-4 text-sm font-black text-orange-400">
              {selectedIds.length} seçili
            </span>
          </div>
        </section>

        <section className="mt-5 overflow-hidden rounded-[30px] border border-white/10 bg-slate-900">
          <div className="overflow-x-auto">
            <table className="min-w-[1650px] w-full">
              <thead className="bg-slate-950 text-left text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="p-4">
                    Seç
                  </th>

                  <th className="p-4">
                    Müşteri
                  </th>

                  <th className="p-4">
                    İletişim
                  </th>

                  <th className="p-4">
                    Tip
                  </th>

                  <th className="p-4">
                    Satış Aşaması
                  </th>

                  <th className="p-4">
                    VIP
                  </th>

                  <th className="p-4">
                    Görev
                  </th>

                  <th className="p-4">
                    Fırsat
                  </th>

                  <th className="p-4 text-right">
                    Harcama
                  </th>

                  <th className="p-4 text-right">
                    Kâr
                  </th>

                  <th className="p-4">
                    Son İşlem
                  </th>

                  <th className="p-4">
                    İşlemler
                  </th>
                </tr>
              </thead>

              <tbody>
                {visibleCustomers.map(
                  (customer) => {
                    const taskSummary =
                      taskCountMap.get(
                        customer.id
                      ) ?? {
                        open: 0,
                        urgent: 0,
                      };

                    const dealSummary =
                      dealMap.get(
                        customer.id
                      ) ?? {
                        count: 0,
                        openRevenue: 0,
                        wonRevenue: 0,
                      };

                    return (
                      <tr
                        key={
                          customer.id
                        }
                        className={`border-t border-white/10 transition hover:bg-white/[0.025] ${
                          !customer.is_active
                            ? "opacity-50"
                            : ""
                        }`}
                      >
                        <td className="p-4">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(
                              customer.id
                            )}
                            onChange={() =>
                              toggleSelection(
                                customer.id
                              )
                            }
                            className="h-5 w-5"
                          />
                        </td>

                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orange-500/15 text-orange-400">
                              <FaUser />
                            </div>

                            <div>
                              <Link
                                href={`/dashboard/crm/${customer.id}`}
                                className="font-black transition hover:text-orange-400"
                              >
                                {
                                  customer.full_name
                                }
                              </Link>

                              <p className="mt-1 text-xs text-slate-600">
                                {customer.customer_code ??
                                  "Kod yok"}
                              </p>

                              {customer.city && (
                                <p className="mt-1 text-xs text-slate-500">
                                  {
                                    customer.city
                                  }
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="p-4">
                          <div className="space-y-1 text-sm">
                            {customer.phone && (
                              <p className="flex items-center gap-2">
                                <FaPhone className="text-slate-600" />
                                {
                                  customer.phone
                                }
                              </p>
                            )}

                            {customer.whatsapp_phone && (
                              <p className="flex items-center gap-2">
                                <FaWhatsapp
                                  className={
                                    customer.whatsapp_consent
                                      ? "text-emerald-400"
                                      : "text-slate-600"
                                  }
                                />

                                {
                                  customer.whatsapp_phone
                                }
                              </p>
                            )}

                            {customer.email && (
                              <p className="flex items-center gap-2">
                                <FaEnvelope
                                  className={
                                    customer.email_consent
                                      ? "text-blue-400"
                                      : "text-slate-600"
                                  }
                                />

                                {
                                  customer.email
                                }
                              </p>
                            )}

                            {customer.instagram_username && (
                              <p className="flex items-center gap-2 text-slate-500">
                                <FaInstagram />
                                @
                                {
                                  customer.instagram_username
                                }
                              </p>
                            )}
                          </div>
                        </td>

                        <td className="p-4">
                          <span className="rounded-full bg-slate-950 px-3 py-1.5 text-xs font-black text-slate-300">
                            {
                              customerTypeLabels[
                                customer.customer_type
                              ]
                            }
                          </span>
                        </td>

                        <td className="p-4">
                          <span
                            className={`rounded-full px-3 py-1.5 text-xs font-black ${lifecycleClass(
                              customer.lifecycle_stage
                            )}`}
                          >
                            {
                              lifecycleLabels[
                                customer.lifecycle_stage
                              ]
                            }
                          </span>

                          {customer.source && (
                            <p className="mt-2 text-xs text-slate-600">
                              Kaynak:{" "}
                              {
                                customer.source
                              }
                            </p>
                          )}
                        </td>

                        <td className="p-4">
                          <span
                            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black ${vipClass(
                              customer.vip_level
                            )}`}
                          >
                            <FaCrown />

                            {
                              vipLabels[
                                customer.vip_level
                              ]
                            }
                          </span>
                        </td>

                        <td className="p-4">
                          <p
                            className={`font-black ${
                              taskSummary.urgent >
                              0
                                ? "text-red-400"
                                : taskSummary.open >
                                    0
                                  ? "text-orange-400"
                                  : "text-slate-500"
                            }`}
                          >
                            {
                              taskSummary.open
                            }{" "}
                            açık
                          </p>

                          {taskSummary.urgent >
                            0 && (
                            <p className="mt-1 text-xs font-black text-red-400">
                              {
                                taskSummary.urgent
                              }{" "}
                              acil
                            </p>
                          )}
                        </td>

                        <td className="p-4">
                          <p className="font-black">
                            {
                              dealSummary.count
                            }{" "}
                            fırsat
                          </p>

                          <p className="mt-1 text-xs font-black text-violet-400">
                            {money(
                              dealSummary.openRevenue
                            )}
                          </p>
                        </td>

                        <td className="p-4 text-right font-black text-emerald-400">
                          {money(
                            customer.total_spent
                          )}

                          <p className="mt-1 text-xs text-slate-600">
                            {
                              customer.total_reservations
                            }{" "}
                            rezervasyon
                          </p>
                        </td>

                        <td className="p-4 text-right font-black text-blue-400">
                          {money(
                            customer.total_profit
                          )}
                        </td>

                        <td className="p-4 text-sm">
                          <p>
                            {dateText(
                              customer.last_contact_at
                            )}
                          </p>

                          <p className="mt-1 text-xs text-slate-600">
                            Son rezervasyon:{" "}
                            {dateText(
                              customer.last_reservation_at
                            )}
                          </p>
                        </td>

                        <td className="p-4">
                          <div className="flex gap-2">
                            <Link
                              href={`/dashboard/crm/${customer.id}`}
                              title="Müşteri 360"
                              className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400"
                            >
                              <FaArrowRight />
                            </Link>

                            <button
                              type="button"
                              title="Düzenle"
                              onClick={() =>
                                openEditCustomer(
                                  customer
                                )
                              }
                              className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500"
                            >
                              <FaEdit />
                            </button>

                            <button
                              type="button"
                              disabled={
                                bulkProcessing
                              }
                              title={
                                customer.is_active
                                  ? "Pasife al"
                                  : "Geri yükle"
                              }
                              onClick={() =>
                                void toggleCustomerActive(
                                  customer
                                )
                              }
                              className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                                customer.is_active
                                  ? "bg-red-500/15 text-red-400"
                                  : "bg-emerald-500/15 text-emerald-400"
                              }`}
                            >
                              {customer.is_active ? (
                                <FaTrash />
                              ) : (
                                <FaUndo />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>

          {visibleCustomers.length ===
            0 && (
            <div className="p-14 text-center text-slate-500">
              Filtrelere uygun müşteri
              bulunamadı.
            </div>
          )}
        </section>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Formu kapat"
            onClick={() =>
              setShowForm(false)
            }
            className="absolute inset-0"
          />

          <aside className="relative z-10 h-full w-full max-w-4xl overflow-y-auto border-l border-white/10 bg-slate-950 p-6 lg:p-8">
            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-400">
                  CRM MÜŞTERİ KARTI
                </p>

                <h2 className="mt-2 text-3xl font-black">
                  {editingId
                    ? "Müşteri Profilini Düzenle"
                    : "Yeni Müşteri Oluştur"}
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowForm(false)
                }
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5"
              >
                <FaTimes />
              </button>
            </div>

            <form
              onSubmit={
                saveCustomer
              }
              className="mt-8 space-y-8"
            >
              <section>
                <h3 className="border-b border-white/10 pb-3 text-lg font-black">
                  Temel Bilgiler
                </h3>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="md:col-span-2">
                    <span className="mb-2 block text-sm font-black">
                      Müşteri / Firma Adı *
                    </span>

                    <input
                      required
                      value={
                        form.full_name
                      }
                      onChange={(
                        event
                      ) =>
                        updateField(
                          "full_name",
                          event.target
                            .value
                        )
                      }
                      placeholder="Örn: Ahmet Yılmaz veya ABC Turizm Ltd."
                      className="min-h-12 w-full rounded-xl bg-white px-4 font-bold text-slate-950"
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-black">
                      Ad
                    </span>

                    <input
                      value={
                        form.first_name
                      }
                      onChange={(
                        event
                      ) =>
                        updateField(
                          "first_name",
                          event.target
                            .value
                        )
                      }
                      className="min-h-12 w-full rounded-xl bg-white px-4 font-bold text-slate-950"
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-black">
                      Soyad
                    </span>

                    <input
                      value={
                        form.last_name
                      }
                      onChange={(
                        event
                      ) =>
                        updateField(
                          "last_name",
                          event.target
                            .value
                        )
                      }
                      className="min-h-12 w-full rounded-xl bg-white px-4 font-bold text-slate-950"
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-black">
                      Müşteri Tipi
                    </span>

                    <select
                      value={
                        form.customer_type
                      }
                      onChange={(
                        event
                      ) =>
                        updateField(
                          "customer_type",
                          event.target
                            .value as CustomerType
                        )
                      }
                      className="min-h-12 w-full rounded-xl bg-white px-4 font-bold text-slate-950"
                    >
                      {Object.entries(
                        customerTypeLabels
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
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-black">
                      CRM Aşaması
                    </span>

                    <select
                      value={
                        form.lifecycle_stage
                      }
                      onChange={(
                        event
                      ) =>
                        updateField(
                          "lifecycle_stage",
                          event.target
                            .value as LifecycleStage
                        )
                      }
                      className="min-h-12 w-full rounded-xl bg-white px-4 font-bold text-slate-950"
                    >
                      {Object.entries(
                        lifecycleLabels
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
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-black">
                      VIP Seviyesi
                    </span>

                    <select
                      value={
                        form.vip_level
                      }
                      onChange={(
                        event
                      ) =>
                        updateField(
                          "vip_level",
                          event.target
                            .value as VipLevel
                        )
                      }
                      className="min-h-12 w-full rounded-xl bg-white px-4 font-bold text-slate-950"
                    >
                      {Object.entries(
                        vipLabels
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
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-black">
                      Tercih Edilen Dil
                    </span>

                    <select
                      value={
                        form.preferred_language
                      }
                      onChange={(
                        event
                      ) =>
                        updateField(
                          "preferred_language",
                          event.target
                            .value
                        )
                      }
                      className="min-h-12 w-full rounded-xl bg-white px-4 font-bold text-slate-950"
                    >
                      <option value="tr">
                        Türkçe
                      </option>

                      <option value="en">
                        English
                      </option>

                      <option value="de">
                        Deutsch
                      </option>

                      <option value="ru">
                        Русский
                      </option>

                      <option value="ar">
                        العربية
                      </option>
                    </select>
                  </label>
                </div>
              </section>

              <section>
                <h3 className="border-b border-white/10 pb-3 text-lg font-black">
                  İletişim
                </h3>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label>
                    <span className="mb-2 block text-sm font-black">
                      Telefon
                    </span>

                    <input
                      value={
                        form.phone
                      }
                      onChange={(
                        event
                      ) =>
                        updateField(
                          "phone",
                          event.target
                            .value
                        )
                      }
                      placeholder="+90 555..."
                      className="min-h-12 w-full rounded-xl bg-white px-4 font-bold text-slate-950"
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-black">
                      WhatsApp
                    </span>

                    <input
                      value={
                        form.whatsapp_phone
                      }
                      onChange={(
                        event
                      ) =>
                        updateField(
                          "whatsapp_phone",
                          event.target
                            .value
                        )
                      }
                      placeholder="+90 555..."
                      className="min-h-12 w-full rounded-xl bg-white px-4 font-bold text-slate-950"
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-black">
                      E-posta
                    </span>

                    <input
                      type="email"
                      value={
                        form.email
                      }
                      onChange={(
                        event
                      ) =>
                        updateField(
                          "email",
                          event.target
                            .value
                        )
                      }
                      placeholder="musteri@email.com"
                      className="min-h-12 w-full rounded-xl bg-white px-4 font-bold text-slate-950"
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-black">
                      Instagram
                    </span>

                    <input
                      value={
                        form.instagram_username
                      }
                      onChange={(
                        event
                      ) =>
                        updateField(
                          "instagram_username",
                          event.target
                            .value.replace(
                              "@",
                              ""
                            )
                        )
                      }
                      placeholder="kullaniciadi"
                      className="min-h-12 w-full rounded-xl bg-white px-4 font-bold text-slate-950"
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-black">
                      Ülke Kodu
                    </span>

                    <input
                      value={
                        form.country_code
                      }
                      onChange={(
                        event
                      ) =>
                        updateField(
                          "country_code",
                          event.target.value.toUpperCase()
                        )
                      }
                      placeholder="TR"
                      className="min-h-12 w-full rounded-xl bg-white px-4 font-bold text-slate-950"
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-black">
                      Şehir
                    </span>

                    <input
                      value={
                        form.city
                      }
                      onChange={(
                        event
                      ) =>
                        updateField(
                          "city",
                          event.target
                            .value
                        )
                      }
                      placeholder="İstanbul"
                      className="min-h-12 w-full rounded-xl bg-white px-4 font-bold text-slate-950"
                    />
                  </label>
                </div>
              </section>

              <section>
                <h3 className="border-b border-white/10 pb-3 text-lg font-black">
                  Özel Tarihler
                </h3>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label>
                    <span className="mb-2 block text-sm font-black">
                      Doğum Tarihi
                    </span>

                    <input
                      type="date"
                      value={
                        form.birth_date
                      }
                      onChange={(
                        event
                      ) =>
                        updateField(
                          "birth_date",
                          event.target
                            .value
                        )
                      }
                      className="min-h-12 w-full rounded-xl bg-white px-4 font-bold text-slate-950"
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-black">
                      Yıl Dönümü
                    </span>

                    <input
                      type="date"
                      value={
                        form.anniversary_date
                      }
                      onChange={(
                        event
                      ) =>
                        updateField(
                          "anniversary_date",
                          event.target
                            .value
                        )
                      }
                      className="min-h-12 w-full rounded-xl bg-white px-4 font-bold text-slate-950"
                    />
                  </label>
                </div>
              </section>

              <section>
                <h3 className="border-b border-white/10 pb-3 text-lg font-black">
                  Kaynak & Satış Bilgisi
                </h3>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label>
                    <span className="mb-2 block text-sm font-black">
                      Müşteri Kaynağı
                    </span>

                    <input
                      value={
                        form.source
                      }
                      onChange={(
                        event
                      ) =>
                        updateField(
                          "source",
                          event.target
                            .value
                        )
                      }
                      placeholder="Instagram, Google, Referans, Booking..."
                      className="min-h-12 w-full rounded-xl bg-white px-4 font-bold text-slate-950"
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-black">
                      Kaynak Detayı
                    </span>

                    <input
                      value={
                        form.source_detail
                      }
                      onChange={(
                        event
                      ) =>
                        updateField(
                          "source_detail",
                          event.target
                            .value
                        )
                      }
                      placeholder="Reklam kampanyası, satış temsilcisi vb."
                      className="min-h-12 w-full rounded-xl bg-white px-4 font-bold text-slate-950"
                    />
                  </label>
                </div>
              </section>

              <section>
                <h3 className="border-b border-white/10 pb-3 text-lg font-black">
                  İletişim İzinleri
                </h3>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <label className="flex min-h-14 items-center gap-3 rounded-xl bg-white/5 px-4 font-black">
                    <input
                      type="checkbox"
                      checked={
                        form.whatsapp_consent
                      }
                      onChange={(
                        event
                      ) =>
                        updateField(
                          "whatsapp_consent",
                          event.target
                            .checked
                        )
                      }
                      className="h-5 w-5"
                    />

                    <FaWhatsapp className="text-emerald-400" />

                    WhatsApp İzni
                  </label>

                  <label className="flex min-h-14 items-center gap-3 rounded-xl bg-white/5 px-4 font-black">
                    <input
                      type="checkbox"
                      checked={
                        form.email_consent
                      }
                      onChange={(
                        event
                      ) =>
                        updateField(
                          "email_consent",
                          event.target
                            .checked
                        )
                      }
                      className="h-5 w-5"
                    />

                    <FaEnvelope className="text-blue-400" />

                    E-posta İzni
                  </label>

                  <label className="flex min-h-14 items-center gap-3 rounded-xl bg-white/5 px-4 font-black">
                    <input
                      type="checkbox"
                      checked={
                        form.marketing_consent
                      }
                      onChange={(
                        event
                      ) =>
                        updateField(
                          "marketing_consent",
                          event.target
                            .checked
                        )
                      }
                      className="h-5 w-5"
                    />

                    <FaCheck className="text-orange-400" />

                    Pazarlama İzni
                  </label>
                </div>
              </section>

              <div className="sticky bottom-0 flex justify-end gap-3 border-t border-white/10 bg-slate-950 py-5">
                <button
                  type="button"
                  onClick={() =>
                    setShowForm(false)
                  }
                  className="min-h-12 rounded-xl border border-white/10 px-6 font-black"
                >
                  İptal
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex min-h-12 items-center gap-3 rounded-xl bg-orange-500 px-7 font-black disabled:opacity-50"
                >
                  <FaSave />

                  {saving
                    ? "Kaydediliyor..."
                    : editingId
                      ? "Değişiklikleri Kaydet"
                      : "Müşteriyi Kaydet"}
                </button>
              </div>
            </form>
          </aside>
        </div>
      )}
    </main>
  );
}
