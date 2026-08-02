"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FaBuilding,
  FaSignOutAlt,
  FaUserShield,
} from "react-icons/fa";
import { supabase } from "@/lib/supabase";
import {
  CurrentMembership,
  getCurrentMembership,
} from "@/lib/current-user";

const roleLabels: Record<string, string> = {
  super_admin: "Süper Yönetici",
  company_owner: "Firma Sahibi",
  operation_manager: "Operasyon Müdürü",
  sales: "Satış",
  accounting: "Muhasebe",
  guide: "Rehber",
  driver: "Şoför",
};

export default function AccountPage() {
  const router = useRouter();

  const [membership, setMembership] =
    useState<CurrentMembership | null>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadAccount = useCallback(async () => {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      router.replace("/giris");
      return;
    }

    try {
      const currentMembership =
        await getCurrentMembership(user.id);

      if (!currentMembership) {
        setErrorMessage(
          "Aktif şirket üyeliğiniz bulunamadı."
        );
        setLoading(false);
        return;
      }

      setEmail(user.email ?? "");
      setMembership(currentMembership);
      setLoading(false);
    } catch (membershipError) {
      console.error(membershipError);
      setErrorMessage("Firma ve rol bilgisi alınamadı.");
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadAccount();
  }, [loadAccount]);

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/giris");
    router.refresh();
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-10 text-white">
        Hesap bilgileri yükleniyor...
      </main>
    );
  }

  if (!membership) {
    return (
      <main className="min-h-screen bg-slate-950 p-10 text-white">
        <div className="mx-auto max-w-xl rounded-3xl border border-red-500/20 bg-red-500/10 p-7 text-red-400">
          {errorMessage}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-10 text-white">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-black uppercase tracking-[0.25em] text-orange-400">
          TUROBUS OS
        </p>

        <h1 className="mt-3 text-4xl font-black">
          Hesabım
        </h1>

        <section className="mt-8 rounded-[32px] border border-white/10 bg-slate-900 p-7">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500 text-2xl font-black">
              {(membership.full_name ?? email)
                .slice(0, 1)
                .toUpperCase()}
            </div>

            <div>
              <h2 className="text-2xl font-black">
                {membership.full_name ?? "TUROBUS Kullanıcısı"}
              </h2>

              <p className="mt-1 text-slate-400">{email}</p>
            </div>
          </div>

          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-950 p-5">
              <FaBuilding className="text-orange-400" />

              <p className="mt-4 text-xs font-black uppercase tracking-wider text-slate-500">
                Aktif firma
              </p>

              <p className="mt-2 text-xl font-black">
                {membership.company.name}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                {membership.company.slug}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-950 p-5">
              <FaUserShield className="text-orange-400" />

              <p className="mt-4 text-xs font-black uppercase tracking-wider text-slate-500">
                Kullanıcı rolü
              </p>

              <p className="mt-2 text-xl font-black">
                {roleLabels[membership.role] ??
                  membership.role}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={signOut}
            className="mt-7 flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 font-black text-red-400"
          >
            <FaSignOutAlt />
            Güvenli Çıkış Yap
          </button>
        </section>
      </div>
    </main>
  );
}
