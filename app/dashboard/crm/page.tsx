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
  FaBirthdayCake,
  FaCrown,
  FaEdit,
  FaEnvelope,
  FaPhone,
  FaPlus,
  FaSearch,
  FaTrash,
  FaUserCheck,
  FaUsers,
  FaWhatsapp,
} from "react-icons/fa";
import { supabase } from "@/lib/supabase";
import {
  CurrentMembership,
  getCurrentMembership,
} from "@/lib/current-user";

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

type CustomerType =
  | "individual"
  | "corporate"
  | "agency"
  | "partner";

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
};

type CustomerForm = {
  full_name: string;
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
  is_active: boolean;
};

const emptyForm: CustomerForm = {
  full_name: "",
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
  is_active: true,
};

const lifecycleLabels: Record<LifecycleStage, string> = {
  lead: "Yeni Talep",
  prospect: "Potansiyel",
  offer_sent: "Teklif Gönderildi",
  payment_pending: "Ödeme Bekliyor",
  customer: "Müşteri",
  completed: "Tamamlandı",
  lost: "Kaybedildi",
  inactive: "Pasif",
};

const vipLabels: Record<VipLevel, string> = {
  standard: "Standart",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
  vip: "VIP",
};

const customerTypeLabels: Record<CustomerType, string> = {
  individual: "Bireysel",
  corporate: "Kurumsal",
  agency: "Acente",
  partner: "Partner",
};

function money(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
  }).format(Number(value || 0));
}

function lifecycleClasses(stage: LifecycleStage) {
  if (stage === "customer" || stage === "completed") {
    return "bg-emerald-500/15 text-emerald-400";
  }

  if (stage === "payment_pending") {
    return "bg-amber-500/15 text-amber-400";
  }

  if (stage === "offer_sent" || stage === "prospect") {
    return "bg-blue-500/15 text-blue-400";
  }

  if (stage === "lost" || stage === "inactive") {
    return "bg-red-500/15 text-red-400";
  }

  return "bg-orange-500/15 text-orange-400";
}

function vipClasses(level: VipLevel) {
  if (level === "vip" || level === "platinum") {
    return "bg-violet-500/15 text-violet-400";
  }

  if (level === "gold") {
    return "bg-amber-500/15 text-amber-400";
  }

  if (level === "silver") {
    return "bg-slate-500/20 text-slate-300";
  }

  return "bg-white/[0.06] text-slate-400";
}

function createCustomerCode() {
  const date = new Date()
    .toISOString()
    .slice(0, 10)
    .replaceAll("-", "");

  const random = crypto.randomUUID()
    .replaceAll("-", "")
    .slice(0, 6)
    .toUpperCase();

  return `CRM-${date}-${random}`;
}

export default function CrmPage() {
  const [membership, setMembership] =
    useState<CurrentMembership | null>(null);

  const [customers, setCustomers] =
    useState<Customer[]>([]);

  const [form, setForm] =
    useState<CustomerForm>(emptyForm);

  const [editingId, setEditingId] = useState("");
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] =
    useState("");

  const loadCustomers = useCallback(
    async (companyId: string) => {
      setErrorMessage("");

      const { data, error } = await supabase
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
          created_at
        `)
        .eq("company_id", companyId)
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        console.error(error);
        setErrorMessage(error.message);
        return;
      }

      setCustomers((data ?? []) as Customer[]);
    },
    []
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

        await loadCustomers(
          currentMembership.company_id
        );
      } catch (error) {
        console.error(error);

        setErrorMessage(
          "CRM verileri hazırlanamadı."
        );
      } finally {
        setLoading(false);
      }
    }

    void initialize();
  }, [loadCustomers]);

  const filteredCustomers = useMemo(() => {
    const query = search
      .trim()
      .toLocaleLowerCase("tr-TR");

    return customers.filter((customer) => {
      if (
        stageFilter &&
        customer.lifecycle_stage !== stageFilter
      ) {
        return false;
      }

      if (!query) return true;

      return [
        customer.customer_code,
        customer.full_name,
        customer.phone,
        customer.whatsapp_phone,
        customer.email,
        customer.city,
        customer.source,
        customer.instagram_username,
        lifecycleLabels[customer.lifecycle_stage],
        vipLabels[customer.vip_level],
      ]
        .filter(Boolean)
        .some((value) =>
          String(value)
            .toLocaleLowerCase("tr-TR")
            .includes(query)
        );
    });
  }, [customers, search, stageFilter]);

  const stats = useMemo(
    () => ({
      total: customers.length,

      active: customers.filter(
        (customer) => customer.is_active
      ).length,

      leads: customers.filter((customer) =>
        [
          "lead",
          "prospect",
          "offer_sent",
          "payment_pending",
        ].includes(customer.lifecycle_stage)
      ).length,

      vip: customers.filter((customer) =>
        ["vip", "platinum"].includes(
          customer.vip_level
        )
      ).length,

      revenue: customers.reduce(
        (total, customer) =>
          total + Number(customer.total_spent),
        0
      ),

      profit: customers.reduce(
        (total, customer) =>
          total + Number(customer.total_profit),
        0
      ),
    }),
    [customers]
  );

  function updateForm<K extends keyof CustomerForm>(
    key: K,
    value: CustomerForm[K]
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId("");
    setErrorMessage("");
    setSuccessMessage("");
  }

  function editCustomer(customer: Customer) {
    setEditingId(customer.id);

    setForm({
      full_name: customer.full_name,
      phone: customer.phone ?? "",
      whatsapp_phone:
        customer.whatsapp_phone ?? "",
      email: customer.email ?? "",
      country_code:
        customer.country_code ?? "TR",
      city: customer.city ?? "",
      preferred_language:
        customer.preferred_language ?? "tr",
      birth_date: customer.birth_date ?? "",
      anniversary_date:
        customer.anniversary_date ?? "",
      instagram_username:
        customer.instagram_username ?? "",
      customer_type: customer.customer_type,
      lifecycle_stage:
        customer.lifecycle_stage,
      source: customer.source ?? "",
      source_detail:
        customer.source_detail ?? "",
      vip_level: customer.vip_level,
      marketing_consent:
        customer.marketing_consent,
      whatsapp_consent:
        customer.whatsapp_consent,
      email_consent: customer.email_consent,
      is_active: customer.is_active,
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function saveCustomer(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!membership) return;

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const nameParts = form.full_name
      .trim()
      .split(/\s+/);

    const payload = {
      company_id: membership.company_id,
      full_name: form.full_name.trim(),
      first_name: nameParts[0] || null,
      last_name:
        nameParts.length > 1
          ? nameParts.slice(1).join(" ")
          : null,
      phone: form.phone.trim() || null,
      whatsapp_phone:
        form.whatsapp_phone.trim() || null,
      email:
        form.email.trim().toLowerCase() || null,
      country_code:
        form.country_code.trim().toUpperCase() ||
        null,
      city: form.city.trim() || null,
      preferred_language:
        form.preferred_language,
      birth_date: form.birth_date || null,
      anniversary_date:
        form.anniversary_date || null,
      instagram_username:
        form.instagram_username
          .trim()
          .replace(/^@/, "") || null,
      customer_type: form.customer_type,
      lifecycle_stage:
        form.lifecycle_stage,
      source: form.source.trim() || null,
      source_detail:
        form.source_detail.trim() || null,
      vip_level: form.vip_level,
      marketing_consent:
        form.marketing_consent,
      whatsapp_consent:
        form.whatsapp_consent,
      email_consent: form.email_consent,
      is_active: form.is_active,
      updated_at: new Date().toISOString(),
    };

    try {
      if (editingId) {
        const { error } = await supabase
          .from("crm_customers")
          .update(payload)
          .eq("id", editingId)
          .eq(
            "company_id",
            membership.company_id
          );

        if (error) throw error;

        setSuccessMessage(
          "Müşteri başarıyla güncellendi."
        );
      } else {
        const { error } = await supabase
          .from("crm_customers")
          .insert({
            ...payload,
            customer_code: createCustomerCode(),
            created_by: user?.id ?? null,
          });

        if (error) throw error;

        setSuccessMessage(
          "Yeni müşteri CRM'e eklendi."
        );
      }

      await loadCustomers(
        membership.company_id
      );

      setForm(emptyForm);
      setEditingId("");
    } catch (error) {
      console.error(error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Müşteri kaydedilemedi."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteCustomer(
    customer: Customer
  ) {
    if (!membership) return;

    const confirmed = window.confirm(
      `${customer.full_name} müşterisini silmek istediğinize emin misiniz?`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("crm_customers")
      .delete()
      .eq("id", customer.id)
      .eq(
        "company_id",
        membership.company_id
      );

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setSuccessMessage("Müşteri silindi.");

    await loadCustomers(
      membership.company_id
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-10 text-white">
        CRM yükleniyor...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-10 text-white lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header>
          <p className="text-sm font-black uppercase tracking-[0.25em] text-orange-400">
            TUROS CRM
          </p>

          <h1 className="mt-3 text-4xl font-black md:text-5xl">
            Müşteri Yönetimi
          </h1>

          <p className="mt-4 max-w-3xl text-slate-400">
            Potansiyel müşterileri, satış
            aşamalarını, iletişim izinlerini ve
            müşteri değerini tek merkezden yönetin.
          </p>
        </header>

        <section className="mt-9 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-3xl border border-white/10 bg-slate-900 p-6">
            <FaUsers className="text-orange-400" />
            <p className="mt-5 text-sm text-slate-500">
              Toplam Müşteri
            </p>
            <p className="mt-2 text-4xl font-black">
              {stats.total}
            </p>
          </article>

          <article className="rounded-3xl border border-white/10 bg-slate-900 p-6">
            <FaUserCheck className="text-emerald-400" />
            <p className="mt-5 text-sm text-slate-500">
              Aktif Kayıt
            </p>
            <p className="mt-2 text-4xl font-black">
              {stats.active}
            </p>
          </article>

          <article className="rounded-3xl border border-white/10 bg-slate-900 p-6">
            <FaCrown className="text-violet-400" />
            <p className="mt-5 text-sm text-slate-500">
              Potansiyel / Bekleyen
            </p>
            <p className="mt-2 text-4xl font-black">
              {stats.leads}
            </p>
          </article>

          <article className="rounded-3xl border border-white/10 bg-slate-900 p-6">
            <FaCrown className="text-amber-400" />
            <p className="mt-5 text-sm text-slate-500">
              VIP Müşteri
            </p>
            <p className="mt-2 text-4xl font-black">
              {stats.vip}
            </p>
          </article>
        </section>

        <section className="mt-4 grid gap-4 md:grid-cols-2">
          <article className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-6">
            <p className="text-sm text-emerald-300">
              CRM Toplam Harcama
            </p>
            <p className="mt-2 text-3xl font-black text-emerald-400">
              {money(stats.revenue)}
            </p>
          </article>

          <article className="rounded-3xl border border-blue-500/20 bg-blue-500/10 p-6">
            <p className="text-sm text-blue-300">
              CRM Toplam Kâr
            </p>
            <p className="mt-2 text-3xl font-black text-blue-400">
              {money(stats.profit)}
            </p>
          </article>
        </section>

        <section className="mt-8 rounded-[32px] border border-white/10 bg-slate-900 p-6 lg:p-8">
          <div className="flex items-center gap-3">
            <FaPlus className="text-orange-400" />

            <h2 className="text-2xl font-black">
              {editingId
                ? "Müşteriyi Düzenle"
                : "Yeni Müşteri Ekle"}
            </h2>
          </div>

          <form
            onSubmit={saveCustomer}
            className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-4"
          >
            <label className="md:col-span-2">
              <span className="text-sm font-black">
                Ad soyad
              </span>

              <input
                required
                value={form.full_name}
                onChange={(event) =>
                  updateForm(
                    "full_name",
                    event.target.value
                  )
                }
                placeholder="Ahmet Yılmaz"
                className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
              />
            </label>

            <label>
              <span className="text-sm font-black">
                Telefon
              </span>

              <input
                value={form.phone}
                onChange={(event) =>
                  updateForm(
                    "phone",
                    event.target.value
                  )
                }
                placeholder="05xx xxx xx xx"
                className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
              />
            </label>

            <label>
              <span className="text-sm font-black">
                WhatsApp
              </span>

              <input
                value={form.whatsapp_phone}
                onChange={(event) =>
                  updateForm(
                    "whatsapp_phone",
                    event.target.value
                  )
                }
                placeholder="905xxxxxxxxx"
                className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
              />
            </label>

            <label className="md:col-span-2">
              <span className="text-sm font-black">
                E-posta
              </span>

              <input
                type="email"
                value={form.email}
                onChange={(event) =>
                  updateForm(
                    "email",
                    event.target.value
                  )
                }
                className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
              />
            </label>

            <label>
              <span className="text-sm font-black">
                Şehir
              </span>

              <input
                value={form.city}
                onChange={(event) =>
                  updateForm(
                    "city",
                    event.target.value
                  )
                }
                className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
              />
            </label>

            <label>
              <span className="text-sm font-black">
                Ülke kodu
              </span>

              <input
                value={form.country_code}
                onChange={(event) =>
                  updateForm(
                    "country_code",
                    event.target.value
                  )
                }
                placeholder="TR"
                className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
              />
            </label>

            <label>
              <span className="text-sm font-black">
                Müşteri türü
              </span>

              <select
                value={form.customer_type}
                onChange={(event) =>
                  updateForm(
                    "customer_type",
                    event.target
                      .value as CustomerType
                  )
                }
                className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
              >
                {Object.entries(
                  customerTypeLabels
                ).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="text-sm font-black">
                Satış aşaması
              </span>

              <select
                value={form.lifecycle_stage}
                onChange={(event) =>
                  updateForm(
                    "lifecycle_stage",
                    event.target
                      .value as LifecycleStage
                  )
                }
                className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
              >
                {Object.entries(
                  lifecycleLabels
                ).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="text-sm font-black">
                VIP seviyesi
              </span>

              <select
                value={form.vip_level}
                onChange={(event) =>
                  updateForm(
                    "vip_level",
                    event.target.value as VipLevel
                  )
                }
                className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
              >
                {Object.entries(vipLabels).map(
                  ([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  )
                )}
              </select>
            </label>

            <label>
              <span className="text-sm font-black">
                Kaynak
              </span>

              <input
                value={form.source}
                onChange={(event) =>
                  updateForm(
                    "source",
                    event.target.value
                  )
                }
                placeholder="Instagram, Google, Referans"
                className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
              />
            </label>

            <label>
              <span className="text-sm font-black">
                Kaynak detayı
              </span>

              <input
                value={form.source_detail}
                onChange={(event) =>
                  updateForm(
                    "source_detail",
                    event.target.value
                  )
                }
                placeholder="Kampanya veya referans adı"
                className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
              />
            </label>

            <label>
              <span className="text-sm font-black">
                Doğum tarihi
              </span>

              <input
                type="date"
                value={form.birth_date}
                onChange={(event) =>
                  updateForm(
                    "birth_date",
                    event.target.value
                  )
                }
                className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
              />
            </label>

            <label>
              <span className="text-sm font-black">
                Yıldönümü
              </span>

              <input
                type="date"
                value={form.anniversary_date}
                onChange={(event) =>
                  updateForm(
                    "anniversary_date",
                    event.target.value
                  )
                }
                className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
              />
            </label>

            <label>
              <span className="text-sm font-black">
                Instagram
              </span>

              <input
                value={form.instagram_username}
                onChange={(event) =>
                  updateForm(
                    "instagram_username",
                    event.target.value
                  )
                }
                placeholder="@kullaniciadi"
                className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
              />
            </label>

            <label>
              <span className="text-sm font-black">
                Tercih edilen dil
              </span>

              <select
                value={form.preferred_language}
                onChange={(event) =>
                  updateForm(
                    "preferred_language",
                    event.target.value
                  )
                }
                className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
              >
                <option value="tr">Türkçe</option>
                <option value="en">İngilizce</option>
                <option value="de">Almanca</option>
                <option value="ru">Rusça</option>
                <option value="ar">Arapça</option>
              </select>
            </label>

            <div className="grid gap-3 md:col-span-2 xl:col-span-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  key: "marketing_consent",
                  label: "Pazarlama izni",
                },
                {
                  key: "whatsapp_consent",
                  label: "WhatsApp izni",
                },
                {
                  key: "email_consent",
                  label: "E-posta izni",
                },
                {
                  key: "is_active",
                  label: "Müşteri aktif",
                },
              ].map((item) => (
                <label
                  key={item.key}
                  className="flex items-center gap-3 rounded-2xl bg-slate-950 p-4"
                >
                  <input
                    type="checkbox"
                    checked={
                      form[
                        item.key as keyof CustomerForm
                      ] as boolean
                    }
                    onChange={(event) =>
                      updateForm(
                        item.key as keyof CustomerForm,
                        event.target.checked as never
                      )
                    }
                    className="h-5 w-5"
                  />

                  <span className="text-sm font-black">
                    {item.label}
                  </span>
                </label>
              ))}
            </div>

            <div className="flex gap-3 md:col-span-2 xl:col-span-4">
              <button
                type="submit"
                disabled={saving}
                className="min-h-14 rounded-2xl bg-orange-500 px-8 font-black disabled:opacity-50"
              >
                {saving
                  ? "Kaydediliyor..."
                  : editingId
                    ? "Müşteriyi Güncelle"
                    : "Müşteriyi Kaydet"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="min-h-14 rounded-2xl border border-white/10 px-8 font-black"
                >
                  İptal
                </button>
              )}
            </div>
          </form>

          {successMessage && (
            <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 font-bold text-emerald-400">
              {successMessage}
            </div>
          )}

          {errorMessage && (
            <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 font-bold text-red-400">
              {errorMessage}
            </div>
          )}
        </section>

        <section className="mt-8">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_260px]">
            <label className="flex min-h-14 items-center gap-3 rounded-2xl bg-white px-5">
              <FaSearch className="text-orange-500" />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Müşteri, telefon, e-posta, şehir veya kaynak ara"
                className="w-full bg-transparent font-bold text-slate-950 outline-none"
              />
            </label>

            <select
              value={stageFilter}
              onChange={(event) =>
                setStageFilter(event.target.value)
              }
              className="min-h-14 rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
            >
              <option value="">
                Tüm satış aşamaları
              </option>

              {Object.entries(
                lifecycleLabels
              ).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredCustomers.map((customer) => (
              <article
                key={customer.id}
                className="rounded-[30px] border border-white/10 bg-slate-900 p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-orange-400">
                      {customer.customer_code ??
                        "TUROS CRM"}
                    </p>

                    <h2 className="mt-2 text-2xl font-black">
                      {customer.full_name}
                    </h2>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1.5 text-xs font-black ${vipClasses(
                      customer.vip_level
                    )}`}
                  >
                    {vipLabels[customer.vip_level]}
                  </span>
                </div>

                <span
                  className={`mt-4 inline-flex rounded-full px-3 py-1.5 text-xs font-black ${lifecycleClasses(
                    customer.lifecycle_stage
                  )}`}
                >
                  {
                    lifecycleLabels[
                      customer.lifecycle_stage
                    ]
                  }
                </span>

                <div className="mt-5 space-y-3 text-sm text-slate-400">
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

                <div className="mt-6 grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-2xl bg-slate-950 p-3">
                    <p className="text-xs text-slate-500">
                      Rezervasyon
                    </p>
                    <p className="mt-1 font-black">
                      {customer.total_reservations}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-950 p-3">
                    <p className="text-xs text-slate-500">
                      Harcama
                    </p>
                    <p className="mt-1 text-xs font-black text-emerald-400">
                      {money(customer.total_spent)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-950 p-3">
                    <p className="text-xs text-slate-500">
                      Kâr
                    </p>
                    <p className="mt-1 text-xs font-black text-blue-400">
                      {money(customer.total_profit)}
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-3 gap-3">
                  <Link
                    href={`/dashboard/crm/${customer.id}`}
                    className="flex min-h-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-sm font-black"
                  >
                    Detay
                  </Link>

                  <button
                    type="button"
                    onClick={() =>
                      editCustomer(customer)
                    }
                    className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-orange-500 text-sm font-black"
                  >
                    <FaEdit />
                    Düzenle
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      deleteCustomer(customer)
                    }
                    className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 text-sm font-black text-red-400"
                  >
                    <FaTrash />
                    Sil
                  </button>
                </div>
              </article>
            ))}
          </div>

          {filteredCustomers.length === 0 && (
            <div className="mt-6 rounded-3xl border border-white/10 bg-slate-900 p-10 text-center text-slate-400">
              Henüz CRM müşteri kaydı bulunmuyor.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
