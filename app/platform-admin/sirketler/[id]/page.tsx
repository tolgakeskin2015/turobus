"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  FaArrowLeft,
  FaBuilding,
  FaCar,
  FaCheckCircle,
  FaCubes,
  FaSave,
  FaUsers,
} from "react-icons/fa";
import { supabase } from "@/lib/supabase";

type SubscriptionPlan =
  | "starter"
  | "professional"
  | "enterprise"
  | "custom";

type SubscriptionStatus =
  | "trial"
  | "active"
  | "past_due"
  | "suspended"
  | "cancelled";

type Company = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  subscription_plan: SubscriptionPlan;
  subscription_status: SubscriptionStatus;
  trial_ends_at: string | null;
  license_user_limit: number;
  license_vehicle_limit: number;
  license_branch_limit: number;
  license_reservation_limit: number;
  is_verified: boolean;
  is_demo: boolean;
  platform_notes: string | null;
  created_at: string;
};

type PlatformModule = {
  id: string;
  module_key: string;
  module_name: string;
  description: string | null;
  category: string;
  is_core: boolean;
  is_active: boolean;
};

type CompanyModule = {
  id: string;
  company_id: string;
  module_id: string;
  is_enabled: boolean;
  settings: Record<string, unknown>;
};

type CompanyForm = {
  name: string;
  slug: string;
  subscription_plan: SubscriptionPlan;
  subscription_status: SubscriptionStatus;
  trial_ends_at: string;
  license_user_limit: string;
  license_vehicle_limit: string;
  license_branch_limit: string;
  license_reservation_limit: string;
  is_active: boolean;
  is_verified: boolean;
  is_demo: boolean;
  platform_notes: string;
};

const planLabels: Record<SubscriptionPlan, string> = {
  starter: "Starter",
  professional: "Professional",
  enterprise: "Enterprise",
  custom: "Özel Paket",
};

const statusLabels: Record<SubscriptionStatus, string> = {
  trial: "Deneme",
  active: "Aktif",
  past_due: "Ödeme Gecikmiş",
  suspended: "Askıya Alındı",
  cancelled: "İptal",
};

const categoryLabels: Record<string, string> = {
  core: "Çekirdek",
  operation: "Operasyon",
  finance: "Finans",
  crm: "CRM",
  guest: "Misafir",
  partner: "Partner",
  network: "Network",
  ai: "Yapay Zekâ",
  integration: "Entegrasyon",
  other: "Diğer",
};

function toDateInput(value: string | null) {
  if (!value) return "";

  return new Date(value).toISOString().slice(0, 10);
}

export default function PlatformCompanyDetailPage() {
  const params = useParams<{ id: string }>();
  const companyId = params.id;

  const [company, setCompany] = useState<Company | null>(null);
  const [form, setForm] = useState<CompanyForm | null>(null);

  const [platformModules, setPlatformModules] = useState<PlatformModule[]>([]);
  const [companyModules, setCompanyModules] = useState<CompanyModule[]>([]);

  const [memberCount, setMemberCount] = useState(0);
  const [vehicleCount, setVehicleCount] = useState(0);
  const [reservationCount, setReservationCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [applyingPlan, setApplyingPlan] = useState(false);
  const [togglingModuleId, setTogglingModuleId] = useState("");

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadData = useCallback(async () => {
    if (!companyId) return;

    setErrorMessage("");

    const [
      { data: companyData, error: companyError },
      { data: platformModuleData, error: platformModuleError },
      { data: companyModuleData, error: companyModuleError },
      { count: activeMemberCount, error: memberError },
      { count: activeVehicleCount, error: vehicleError },
      { count: totalReservationCount, error: reservationError },
    ] = await Promise.all([
      supabase
        .from("companies")
        .select(
          "id, name, slug, is_active, subscription_plan, subscription_status, trial_ends_at, license_user_limit, license_vehicle_limit, license_branch_limit, license_reservation_limit, is_verified, is_demo, platform_notes, created_at"
        )
        .eq("id", companyId)
        .single(),

      supabase
        .from("platform_modules")
        .select(
          "id, module_key, module_name, description, category, is_core, is_active"
        )
        .eq("is_active", true)
        .order("category")
        .order("module_name"),

      supabase
        .from("company_modules")
        .select("id, company_id, module_id, is_enabled, settings")
        .eq("company_id", companyId),

      supabase
        .from("company_members")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("company_id", companyId)
        .eq("is_active", true),

      supabase
        .from("vehicles")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("company_id", companyId)
        .eq("is_active", true),

      supabase
        .from("reservations")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("company_id", companyId),
    ]);

    const firstError =
      companyError ??
      platformModuleError ??
      companyModuleError ??
      memberError ??
      vehicleError ??
      reservationError;

    if (firstError) {
      console.error(firstError);
      setErrorMessage(firstError.message);
      setLoading(false);
      return;
    }

    const currentCompany = companyData as Company;

    setCompany(currentCompany);

    setForm({
      name: currentCompany.name,
      slug: currentCompany.slug,
      subscription_plan: currentCompany.subscription_plan,
      subscription_status: currentCompany.subscription_status,
      trial_ends_at: toDateInput(currentCompany.trial_ends_at),
      license_user_limit: currentCompany.license_user_limit.toString(),
      license_vehicle_limit: currentCompany.license_vehicle_limit.toString(),
      license_branch_limit: currentCompany.license_branch_limit.toString(),
      license_reservation_limit:
        currentCompany.license_reservation_limit.toString(),
      is_active: currentCompany.is_active,
      is_verified: currentCompany.is_verified,
      is_demo: currentCompany.is_demo,
      platform_notes: currentCompany.platform_notes ?? "",
    });

    setPlatformModules((platformModuleData ?? []) as PlatformModule[]);
    setCompanyModules((companyModuleData ?? []) as CompanyModule[]);

    setMemberCount(activeMemberCount ?? 0);
    setVehicleCount(activeVehicleCount ?? 0);
    setReservationCount(totalReservationCount ?? 0);

    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const moduleGroups = useMemo(() => {
    return platformModules.reduce<Record<string, PlatformModule[]>>(
      (groups, module) => {
        if (!groups[module.category]) {
          groups[module.category] = [];
        }

        groups[module.category].push(module);

        return groups;
      },
      {}
    );
  }, [platformModules]);

  function updateForm<K extends keyof CompanyForm>(
    key: K,
    value: CompanyForm[K]
  ) {
    setForm((current) =>
      current
        ? {
            ...current,
            [key]: value,
          }
        : current
    );
  }

  function moduleEnabled(module: PlatformModule) {
    if (module.is_core) return true;

    return (
      companyModules.find(
        (companyModule) => companyModule.module_id === module.id
      )?.is_enabled ?? false
    );
  }

  async function applyPlan() {
    if (!form || !companyId) return;

    setApplyingPlan(true);
    setErrorMessage("");
    setSuccessMessage("");

    const { error } = await supabase.rpc(
      "apply_subscription_plan",
      {
        target_company_id: companyId,
        target_plan_key: form.subscription_plan,
      }
    );

    if (error) {
      console.error(error);
      setErrorMessage(error.message);
      setApplyingPlan(false);
      return;
    }

    setSuccessMessage(
      `${planLabels[form.subscription_plan]} paketi başarıyla uygulandı.`
    );

    setApplyingPlan(false);
    await loadData();
  }

  async function saveCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form || !companyId) return;

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim().toLowerCase(),
      subscription_plan: form.subscription_plan,
      subscription_status: form.subscription_status,
      trial_ends_at: form.trial_ends_at
        ? new Date(`${form.trial_ends_at}T23:59:59`).toISOString()
        : null,
      license_user_limit: Math.max(
        0,
        Number(form.license_user_limit) || 0
      ),
      license_vehicle_limit: Math.max(
        0,
        Number(form.license_vehicle_limit) || 0
      ),
      license_branch_limit: Math.max(
        0,
        Number(form.license_branch_limit) || 0
      ),
      license_reservation_limit: Math.max(
        0,
        Number(form.license_reservation_limit) || 0
      ),
      is_active: form.is_active,
      is_verified: form.is_verified,
      is_demo: form.is_demo,
      platform_notes: form.platform_notes.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("companies")
      .update(payload)
      .eq("id", companyId);

    if (error) {
      console.error(error);
      setErrorMessage(error.message);
      setSaving(false);
      return;
    }

    setSuccessMessage("Şirket bilgileri başarıyla güncellendi.");
    setSaving(false);

    await loadData();
  }

  async function toggleModule(module: PlatformModule) {
    if (!companyId || module.is_core) return;

    setTogglingModuleId(module.id);
    setErrorMessage("");
    setSuccessMessage("");

    const currentRecord = companyModules.find(
      (companyModule) => companyModule.module_id === module.id
    );

    const nextEnabled = !currentRecord?.is_enabled;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("company_modules").upsert(
      {
        company_id: companyId,
        module_id: module.id,
        is_enabled: nextEnabled,
        enabled_at: nextEnabled ? new Date().toISOString() : null,
        disabled_at: nextEnabled ? null : new Date().toISOString(),
        enabled_by: user?.id ?? null,
        settings: currentRecord?.settings ?? {},
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "company_id,module_id",
      }
    );

    if (error) {
      console.error(error);
      setErrorMessage(error.message);
      setTogglingModuleId("");
      return;
    }

    setSuccessMessage(
      `${module.module_name} modülü ${
        nextEnabled ? "açıldı" : "kapatıldı"
      }.`
    );

    setTogglingModuleId("");

    await loadData();
  }

  if (loading) {
    return (
      <main className="min-h-screen p-10 text-white">
        Şirket bilgileri yükleniyor...
      </main>
    );
  }

  if (!company || !form) {
    return (
      <main className="min-h-screen p-10 text-white">
        <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-8 text-red-400">
          Şirket kaydı bulunamadı.
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-5 py-10 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/platform-admin/sirketler"
          className="inline-flex items-center gap-2 text-sm font-black text-slate-400 hover:text-white"
        >
          <FaArrowLeft />
          Şirketlere Dön
        </Link>

        <header className="mt-6">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-orange-400">
            PLATFORM COMPANY CONTROL
          </p>

          <h1 className="mt-3 text-4xl font-black md:text-5xl">
            {company.name}
          </h1>

          <p className="mt-3 text-slate-400">
            {company.slug} ·{" "}
            {new Date(company.created_at).toLocaleDateString("tr-TR")}
          </p>
        </header>

        {errorMessage && (
          <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-5 font-bold text-red-400">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5 font-bold text-emerald-400">
            {successMessage}
          </div>
        )}

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Aktif Kullanıcı",
              value: `${memberCount} / ${company.license_user_limit}`,
              icon: FaUsers,
            },
            {
              label: "Aktif Araç",
              value: `${vehicleCount} / ${company.license_vehicle_limit}`,
              icon: FaCar,
            },
            {
              label: "Toplam Rezervasyon",
              value: `${reservationCount} / ${company.license_reservation_limit}`,
              icon: FaBuilding,
            },
            {
              label: "Aktif Modül",
              value: platformModules.filter(moduleEnabled).length,
              icon: FaCubes,
            },
          ].map((item) => {
            const Icon = item.icon;

            return (
              <article
                key={item.label}
                className="rounded-3xl border border-white/10 bg-slate-900 p-6"
              >
                <Icon className="text-orange-400" />

                <p className="mt-5 text-sm text-slate-500">
                  {item.label}
                </p>

                <p className="mt-2 text-3xl font-black">
                  {item.value}
                </p>
              </article>
            );
          })}
        </section>

        <form
          onSubmit={saveCompany}
          className="mt-8 rounded-[32px] border border-white/10 bg-slate-900 p-6 lg:p-8"
        >
          <div className="flex items-center gap-3">
            <FaBuilding className="text-orange-400" />

            <h2 className="text-2xl font-black">
              Şirket ve Lisans Ayarları
            </h2>
          </div>

          <div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <label>
              <span className="text-sm font-black">Şirket adı</span>

              <input
                required
                value={form.name}
                onChange={(event) =>
                  updateForm("name", event.target.value)
                }
                className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
              />
            </label>

            <label>
              <span className="text-sm font-black">Şirket kodu</span>

              <input
                required
                value={form.slug}
                onChange={(event) =>
                  updateForm("slug", event.target.value)
                }
                className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
              />
            </label>

            <label>
              <span className="text-sm font-black">Paket</span>

              <select
                value={form.subscription_plan}
                onChange={(event) =>
                  updateForm(
                    "subscription_plan",
                    event.target.value as SubscriptionPlan
                  )
                }
                className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
              >
                {Object.entries(planLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="text-sm font-black">
                Abonelik durumu
              </span>

              <select
                value={form.subscription_status}
                onChange={(event) =>
                  updateForm(
                    "subscription_status",
                    event.target.value as SubscriptionStatus
                  )
                }
                className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
              >
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="text-sm font-black">
                Deneme bitiş tarihi
              </span>

              <input
                type="date"
                value={form.trial_ends_at}
                onChange={(event) =>
                  updateForm("trial_ends_at", event.target.value)
                }
                className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
              />
            </label>

            <label>
              <span className="text-sm font-black">
                Kullanıcı limiti
              </span>

              <input
                type="number"
                min="0"
                value={form.license_user_limit}
                onChange={(event) =>
                  updateForm(
                    "license_user_limit",
                    event.target.value
                  )
                }
                className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
              />
            </label>

            <label>
              <span className="text-sm font-black">
                Araç limiti
              </span>

              <input
                type="number"
                min="0"
                value={form.license_vehicle_limit}
                onChange={(event) =>
                  updateForm(
                    "license_vehicle_limit",
                    event.target.value
                  )
                }
                className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
              />
            </label>

            <label>
              <span className="text-sm font-black">
                Şube limiti
              </span>

              <input
                type="number"
                min="0"
                value={form.license_branch_limit}
                onChange={(event) =>
                  updateForm(
                    "license_branch_limit",
                    event.target.value
                  )
                }
                className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
              />
            </label>

            <label>
              <span className="text-sm font-black">
                Rezervasyon limiti
              </span>

              <input
                type="number"
                min="0"
                value={form.license_reservation_limit}
                onChange={(event) =>
                  updateForm(
                    "license_reservation_limit",
                    event.target.value
                  )
                }
                className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
              />
            </label>

            <label className="flex items-center gap-3 rounded-2xl bg-slate-950 p-4">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) =>
                  updateForm("is_active", event.target.checked)
                }
                className="h-5 w-5"
              />

              <span className="font-black">Şirket aktif</span>
            </label>

            <label className="flex items-center gap-3 rounded-2xl bg-slate-950 p-4">
              <input
                type="checkbox"
                checked={form.is_verified}
                onChange={(event) =>
                  updateForm("is_verified", event.target.checked)
                }
                className="h-5 w-5"
              />

              <span className="font-black">Şirket doğrulandı</span>
            </label>

            <label className="flex items-center gap-3 rounded-2xl bg-slate-950 p-4">
              <input
                type="checkbox"
                checked={form.is_demo}
                onChange={(event) =>
                  updateForm("is_demo", event.target.checked)
                }
                className="h-5 w-5"
              />

              <span className="font-black">Demo şirket</span>
            </label>

            <label className="md:col-span-2 xl:col-span-4">
              <span className="text-sm font-black">
                Platform notları
              </span>

              <textarea
                rows={4}
                value={form.platform_notes}
                onChange={(event) =>
                  updateForm("platform_notes", event.target.value)
                }
                className="mt-2 w-full rounded-2xl bg-white px-5 py-4 font-bold text-slate-950 outline-none"
              />
            </label>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={saving || applyingPlan}
              className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-orange-500 px-8 font-black disabled:opacity-50"
            >
              <FaSave />
              {saving
                ? "Kaydediliyor..."
                : "Şirket Ayarlarını Kaydet"}
            </button>

            <button
              type="button"
              onClick={applyPlan}
              disabled={saving || applyingPlan}
              className="flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-8 font-black text-emerald-400 disabled:opacity-50"
            >
              <FaCheckCircle />
              {applyingPlan
                ? "Paket uygulanıyor..."
                : "Paketi ve Modülleri Uygula"}
            </button>
          </div>
        </form>

        <section className="mt-8 rounded-[32px] border border-white/10 bg-slate-900 p-6 lg:p-8">
          <div className="flex items-center gap-3">
            <FaCubes className="text-orange-400" />

            <div>
              <h2 className="text-2xl font-black">
                TurOS Modülleri
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Çekirdek modüller kapatılamaz. Diğer modüller
                şirket bazında açılıp kapatılabilir.
              </p>
            </div>
          </div>

          <div className="mt-7 space-y-8">
            {Object.entries(moduleGroups).map(
              ([category, modules]) => (
                <div key={category}>
                  <h3 className="text-sm font-black uppercase tracking-[0.2em] text-orange-400">
                    {categoryLabels[category] ?? category}
                  </h3>

                  <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {modules.map((module) => {
                      const enabled = moduleEnabled(module);
                      const changing =
                        togglingModuleId === module.id;

                      return (
                        <article
                          key={module.id}
                          className={`rounded-3xl border p-5 ${
                            enabled
                              ? "border-emerald-500/20 bg-emerald-500/10"
                              : "border-white/10 bg-slate-950"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h4 className="font-black">
                                {module.module_name}
                              </h4>

                              <p className="mt-2 text-sm text-slate-500">
                                {module.description ??
                                  module.module_key}
                              </p>
                            </div>

                            {module.is_core && (
                              <FaCheckCircle className="shrink-0 text-emerald-400" />
                            )}
                          </div>

                          <button
                            type="button"
                            disabled={module.is_core || changing}
                            onClick={() => toggleModule(module)}
                            className={`mt-5 min-h-11 w-full rounded-xl text-sm font-black transition ${
                              enabled
                                ? "bg-emerald-500 text-white"
                                : "bg-white/[0.06] text-slate-300"
                            } disabled:cursor-not-allowed disabled:opacity-60`}
                          >
                            {changing
                              ? "Güncelleniyor..."
                              : module.is_core
                                ? "Çekirdek Modül"
                                : enabled
                                  ? "Modül Açık"
                                  : "Modülü Aç"}
                          </button>
                        </article>
                      );
                    })}
                  </div>
                </div>
              )
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
