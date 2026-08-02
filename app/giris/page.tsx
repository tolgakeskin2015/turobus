"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FaArrowRight,
  FaBus,
  FaEnvelope,
  FaLock,
} from "react-icons/fa";
import { supabase } from "@/lib/supabase";
import { getCurrentMembership } from "@/lib/current-user";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [checkingSession, setCheckingSession] =
    useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    async function checkExistingSession() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        router.replace("/dashboard/hesabim");
        return;
      }

      setCheckingSession(false);
    }

    void checkExistingSession();
  }, [router]);

  async function sendPasswordReset() {
    setErrorMessage("");
    setSuccessMessage("");

    if (!email.trim()) {
      setErrorMessage(
        "Önce e-posta adresinizi yazın."
      );
      return;
    }

    setResetting(true);

    const { error } =
      await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo:
            `${window.location.origin}/sifre-yenile`,
        }
      );

    if (error) {
      setErrorMessage(error.message);
    } else {
      setSuccessMessage(
        "Şifre yenileme bağlantısı e-posta adresinize gönderildi."
      );
    }

    setResetting(false);
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setLoading(true);
    setErrorMessage("");

    try {
      const { data, error } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (error) throw error;

      if (!data.user) {
        throw new Error("Kullanıcı oturumu oluşturulamadı.");
      }

      const membership = await getCurrentMembership(
        data.user.id
      );

      if (!membership) {
        await supabase.auth.signOut();

        throw new Error(
          "Bu kullanıcı aktif bir TUROBUS şirketine bağlı değil."
        );
      }

      if (!membership.company.is_active) {
        await supabase.auth.signOut();

        throw new Error("Bağlı şirket hesabı aktif değil.");
      }

      router.replace("/dashboard/hesabim");
      router.refresh();
    } catch (error) {
      console.error("Giriş hatası:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Giriş yapılamadı."
      );
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 text-white">
        Oturum kontrol ediliyor...
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 py-12 text-white">
      <div className="w-full max-w-md">
        <div className="text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[26px] bg-orange-500 text-3xl shadow-2xl shadow-orange-500/20">
            <FaBus />
          </div>

          <p className="mt-6 text-xs font-black uppercase tracking-[0.3em] text-orange-400">
            TUROBUS OS
          </p>

          <h1 className="mt-3 text-4xl font-black">
            Yönetim Girişi
          </h1>

          <p className="mt-3 text-slate-400">
            Firmanıza ve yetkili olduğunuz modüllere erişin.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-10 rounded-[32px] border border-white/10 bg-slate-900 p-7"
        >
          <label className="block">
            <span className="text-sm font-black">
              E-posta adresi
            </span>

            <div className="mt-2 flex min-h-14 items-center gap-3 rounded-2xl bg-white px-5">
              <FaEnvelope className="text-orange-500" />

              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                placeholder="ornek@turobus.com"
                className="w-full bg-transparent text-sm font-bold text-slate-950 outline-none"
              />
            </div>
          </label>

          <label className="mt-5 block">
            <span className="text-sm font-black">
              Şifre
            </span>

            <div className="mt-2 flex min-h-14 items-center gap-3 rounded-2xl bg-white px-5">
              <FaLock className="text-orange-500" />

              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                placeholder="Şifreniz"
                className="w-full bg-transparent text-sm font-bold text-slate-950 outline-none"
              />
            </div>
          </label>

          {errorMessage && (
            <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-bold text-red-400">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-400">
              {successMessage}
            </div>
          )}

          <button
            type="button"
            disabled={resetting}
            onClick={sendPasswordReset}
            className="mt-5 w-full text-center text-sm font-black text-orange-400 disabled:opacity-50"
          >
            {resetting
              ? "Bağlantı gönderiliyor..."
              : "Şifremi Unuttum"}
          </button>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-orange-500 font-black transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
            {!loading && <FaArrowRight />}
          </button>
        </form>
      </div>
    </main>
  );
}
