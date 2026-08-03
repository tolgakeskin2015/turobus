"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  FaBuilding,
  FaCheckCircle,
  FaEye,
  FaPauseCircle,
  FaSearch,
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
  created_at: string;
};

type Member = {
  company_id: string;
  is_active: boolean;
};

type CompanyModule = {
  company_id: string;
  is_enabled: boolean;
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

function statusClasses(status: SubscriptionStatus) {
  if (status === "active") {
    return "bg-emerald-500/15 text-emerald-400";
  }

  if (status === "trial") {
    return "bg-blue-500/15 text-blue-400";
  }

  if (status === "past_due") {
    return "bg-amber-500/15 text-amber-400";
  }

  if (status === "suspended") {
    return "bg-red-500/15 text-red-400";
  }

  return "bg-slate-500/15 text-slate-400";
}

export default function PlatformCompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [modules, setModules] = useState<CompanyModule[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadData = useCallback(async () => {
    setErrorMessage("");

    const [
      { data: companyData, error: companyError },
      { data: memberData, error: memberError },
      { data: moduleData, error: moduleError },
    ] = await Promise.all([
      supabase
        .from("companies")
        .select(
          "id, name, slug, is_active, subscription_plan, subscription_status, trial_ends_at, license_user_limit, license_vehicle_limit, license_branch_limit, license_reservation_limit, is_verified, is_demo, created_at"
        )
        .order("created_at", { ascending: false }),

      supabase
        .from("company_members")
        .select("company_id, is_active"),

      supabase
        .from("company_modules")
        .select("company_id, is_enabled")
        .eq("is_enabled", true),
    ]);

    const error =
      companyError ??
      memberError ??
      moduleError;

    if (error) {
      console.error(error);
      setErrorMessage(error.message);
    }

    setCompanies((companyData ?? []) as Company[]);
    setMembers((memberData ?? []) as Member[]);
    setModules((moduleData ?? []) as CompanyModule[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredCompanies = useMemo(() => {
    const query = search
      .trim()
      .toLocaleLowerCase("tr-TR");

    return companies.filter((company) => {
      if (
        statusFilter &&
        company.subscription_status !== statusFilter
      ) {
        return false;
      }

      if (!query) return true;

      return [
        company.name,
        company.slug,
        planLabels[company.subscription_plan],
        statusLabels[company.subscription_status],
      ].some((value) =>
        value
          .toLocaleLowerCase("tr-TR")
          .includes(query)
      );
    });
  }, [companies, search, statusFilter]);

  const stats = useMemo(
    () => ({
      total: companies.length,
      active: companies.filter(
        (company) =>
          company.subscription_status === "active"
      ).length,
      trial: companies.filter(
        (company) =>
          company.subscription_status === "trial"
      ).length,
      suspended: companies.filter(
        (company) =>
          company.subscription_status === "suspended"
      ).length,
    }),
    [companies]
  );

  if (loading) {
    return (
      <main className="min-h-screen p-10 text-white">
        Şirketler yükleniyor...
      </main>
    );
  }

  return (
    <main className="min-h-screen px-5 py-10 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header>
          <p className="text-sm font-black uppercase tracking-[0.25em] text-orange-400">
            PLATFORM CUSTOMERS
          </p>

          <h1 className="mt-3 text-4xl font-black md:text-5xl">
            Şirketler
          </h1>

          <p className="mt-4 max-w-3xl text-slate-400">
            Platforma bağlı şirketlerin aboneliklerini,
            lisans limitlerini ve aktif modüllerini yönetin.
          </p>
        </header>

        {errorMessage && (
          <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-5 font-bold text-red-400">
            {errorMessage}
          </div>
        )}

        <section className="mt-9 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Toplam Şirket",
              value: stats.total,
              icon: FaBuilding,
            },
            {
              label: "Aktif",
              value: stats.active,
              icon: FaCheckCircle,
            },
            {
              label: "Deneme",
              value: stats.trial,
              icon: FaUsers,
            },
            {
              label: "Askıya Alınan",
              value: stats.suspended,
              icon: FaPauseCircle,
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

                <p className="mt-2 text-4xl font-black">
                  {item.value}
                </p>
              </article>
            );
          })}
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-[minmax(0,1fr)_260px]">
          <label className="flex min-h-14 items-center gap-3 rounded-2xl bg-white px-5">
            <FaSearch className="text-orange-500" />

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Şirket, paket veya durum ara"
              className="w-full bg-transparent font-bold text-slate-950 outline-none"
            />
          </label>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value)
            }
            className="min-h-14 rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
          >
            <option value="">Tüm abonelik durumları</option>

            {Object.entries(statusLabels).map(
              ([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              )
            )}
          </select>
        </section>

        <section className="mt-6 grid gap-5 xl:grid-cols-2">
          {filteredCompanies.map((company) => {
            const userCount = members.filter(
              (member) =>
                member.company_id === company.id &&
                member.is_active
            ).length;

            const moduleCount = modules.filter(
              (module) =>
                module.company_id === company.id &&
                module.is_enabled
            ).length;

            return (
              <article
                key={company.id}
                className="rounded-[30px] border border-white/10 bg-slate-900 p-6"
              >
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1.5 text-xs font-black ${statusClasses(
                          company.subscription_status
                        )}`}
                      >
                        {
                          statusLabels[
                            company.subscription_status
                          ]
                        }
                      </span>

                      {company.is_demo && (
                        <span className="rounded-full bg-violet-500/15 px-3 py-1.5 text-xs font-black text-violet-400">
                          Demo
                        </span>
                      )}

                      {company.is_verified && (
                        <span className="rounded-full bg-emerald-500/15 px-3 py-1.5 text-xs font-black text-emerald-400">
                          Doğrulandı
                        </span>
                      )}
                    </div>

                    <h2 className="mt-4 text-2xl font-black">
                      {company.name}
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      {company.slug}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-orange-500/10 px-4 py-3 text-center">
                    <p className="text-xs text-orange-300">
                      Paket
                    </p>

                    <p className="mt-1 font-black text-orange-400">
                      {
                        planLabels[
                          company.subscription_plan
                        ]
                      }
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-2xl bg-slate-950 p-4">
                    <p className="text-xs text-slate-500">
                      Kullanıcı
                    </p>
                    <p className="mt-2 font-black">
                      {userCount} /{" "}
                      {company.license_user_limit}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-950 p-4">
                    <p className="text-xs text-slate-500">
                      Araç limiti
                    </p>
                    <p className="mt-2 font-black">
                      {company.license_vehicle_limit}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-950 p-4">
                    <p className="text-xs text-slate-500">
                      Şube limiti
                    </p>
                    <p className="mt-2 font-black">
                      {company.license_branch_limit}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-950 p-4">
                    <p className="text-xs text-slate-500">
                      Aktif modül
                    </p>
                    <p className="mt-2 font-black">
                      {moduleCount}
                    </p>
                  </div>
                </div>

                <Link
                  href={`/platform-admin/sirketler/${company.id}`}
                  className="mt-6 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-orange-500 font-black"
                >
                  <FaEye />
                  Şirketi Yönet
                </Link>
              </article>
            );
          })}
        </section>

        {filteredCompanies.length === 0 && (
          <div className="mt-6 rounded-3xl border border-white/10 bg-slate-900 p-10 text-center text-slate-400">
            Arama kriterlerine uygun şirket bulunamadı.
          </div>
        )}
      </div>
    </main>
  );
}
