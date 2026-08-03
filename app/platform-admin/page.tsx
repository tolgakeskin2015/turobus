"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  FaBuilding,
  FaCheckCircle,
  FaCubes,
  FaPauseCircle,
  FaUsers,
} from "react-icons/fa";
import { supabase } from "@/lib/supabase";

type Company = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  subscription_plan: string;
  subscription_status: string;
  is_demo: boolean;
  is_verified: boolean;
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

function planLabel(value: string) {
  const labels: Record<string, string> = {
    starter: "Starter",
    professional: "Professional",
    enterprise: "Enterprise",
    custom: "Özel Paket",
  };

  return labels[value] ?? value;
}

function statusLabel(value: string) {
  const labels: Record<string, string> = {
    trial: "Deneme",
    active: "Aktif",
    past_due: "Ödeme Gecikmiş",
    suspended: "Askıya Alındı",
    cancelled: "İptal",
  };

  return labels[value] ?? value;
}

export default function PlatformAdminPage() {
  const [companies, setCompanies] =
    useState<Company[]>([]);

  const [members, setMembers] =
    useState<Member[]>([]);

  const [companyModules, setCompanyModules] =
    useState<CompanyModule[]>([]);

  const [moduleCount, setModuleCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadData = useCallback(async () => {
    setErrorMessage("");

    const [
      { data: companyData, error: companyError },
      { data: memberData, error: memberError },
      { data: moduleData, error: moduleError },
      {
        count: platformModuleCount,
        error: moduleCountError,
      },
    ] = await Promise.all([
      supabase
        .from("companies")
        .select(
          "id, name, slug, is_active, subscription_plan, subscription_status, is_demo, is_verified, created_at"
        )
        .order("created_at", {
          ascending: false,
        }),

      supabase
        .from("company_members")
        .select("company_id, is_active"),

      supabase
        .from("company_modules")
        .select("company_id, is_enabled")
        .eq("is_enabled", true),

      supabase
        .from("platform_modules")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("is_active", true),
    ]);

    const firstError =
      companyError ??
      memberError ??
      moduleError ??
      moduleCountError;

    if (firstError) {
      console.error(firstError);
      setErrorMessage(firstError.message);
    }

    setCompanies((companyData ?? []) as Company[]);
    setMembers((memberData ?? []) as Member[]);
    setCompanyModules(
      (moduleData ?? []) as CompanyModule[]
    );
    setModuleCount(platformModuleCount ?? 0);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const stats = useMemo(
    () => ({
      totalCompanies: companies.length,

      activeCompanies: companies.filter(
        (company) =>
          company.is_active &&
          company.subscription_status === "active"
      ).length,

      trialCompanies: companies.filter(
        (company) =>
          company.subscription_status === "trial"
      ).length,

      suspendedCompanies: companies.filter(
        (company) =>
          company.subscription_status === "suspended"
      ).length,

      activeUsers: members.filter(
        (member) => member.is_active
      ).length,

      enabledModules: companyModules.length,
    }),
    [companies, companyModules, members]
  );

  if (loading) {
    return (
      <main className="min-h-screen p-10">
        Platform bilgileri yükleniyor...
      </main>
    );
  }

  return (
    <main className="min-h-screen px-5 py-10 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header>
          <p className="text-sm font-black uppercase tracking-[0.25em] text-orange-400">
            PLATFORM CONTROL
          </p>

          <h1 className="mt-3 text-4xl font-black md:text-5xl">
            TUROBUS Cloud
          </h1>

          <p className="mt-4 max-w-3xl text-slate-400">
            Platformdaki şirketleri, kullanıcıları,
            abonelikleri ve modül kullanımını merkezi
            olarak yönetin.
          </p>
        </header>

        {errorMessage && (
          <div className="mt-7 rounded-2xl border border-red-500/20 bg-red-500/10 p-5 font-bold text-red-400">
            {errorMessage}
          </div>
        )}

        <section className="mt-9 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[
            {
              label: "Toplam Şirket",
              value: stats.totalCompanies,
              icon: FaBuilding,
            },
            {
              label: "Aktif Şirket",
              value: stats.activeCompanies,
              icon: FaCheckCircle,
            },
            {
              label: "Deneme Sürecinde",
              value: stats.trialCompanies,
              icon: FaBuilding,
            },
            {
              label: "Askıya Alınan",
              value: stats.suspendedCompanies,
              icon: FaPauseCircle,
            },
            {
              label: "Aktif Kullanıcı",
              value: stats.activeUsers,
              icon: FaUsers,
            },
            {
              label: "Platform Modülü",
              value: moduleCount,
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

                <p className="mt-5 text-sm font-bold text-slate-500">
                  {item.label}
                </p>

                <p className="mt-2 text-4xl font-black">
                  {item.value}
                </p>
              </article>
            );
          })}
        </section>

        <section className="mt-8 rounded-[30px] border border-white/10 bg-slate-900 p-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-400">
              SON ŞİRKETLER
            </p>

            <h2 className="mt-2 text-2xl font-black">
              Platform Müşterileri
            </h2>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[850px] text-left">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-500">
                  <th className="p-4">Şirket</th>
                  <th className="p-4">Paket</th>
                  <th className="p-4">Abonelik</th>
                  <th className="p-4">Kullanıcı</th>
                  <th className="p-4">Aktif Modül</th>
                  <th className="p-4">Doğrulama</th>
                </tr>
              </thead>

              <tbody>
                {companies.slice(0, 10).map((company) => {
                  const userCount = members.filter(
                    (member) =>
                      member.company_id === company.id &&
                      member.is_active
                  ).length;

                  const enabledModuleCount =
                    companyModules.filter(
                      (module) =>
                        module.company_id === company.id &&
                        module.is_enabled
                    ).length;

                  return (
                    <tr
                      key={company.id}
                      className="border-b border-white/[0.06]"
                    >
                      <td className="p-4">
                        <p className="font-black">
                          {company.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {company.slug}
                        </p>
                      </td>

                      <td className="p-4 font-bold">
                        {planLabel(
                          company.subscription_plan
                        )}
                      </td>

                      <td className="p-4">
                        <span className="rounded-full bg-orange-500/10 px-3 py-1.5 text-xs font-black text-orange-400">
                          {statusLabel(
                            company.subscription_status
                          )}
                        </span>
                      </td>

                      <td className="p-4 font-black">
                        {userCount}
                      </td>

                      <td className="p-4 font-black">
                        {enabledModuleCount}
                      </td>

                      <td className="p-4">
                        {company.is_verified
                          ? "Doğrulandı"
                          : "Bekliyor"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
