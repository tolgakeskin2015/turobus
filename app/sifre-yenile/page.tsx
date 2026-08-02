"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FaCheckCircle, FaLock } from "react-icons/fa";
import { supabase } from "@/lib/supabase";

export default function PasswordResetPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [passwordAgain, setPasswordAgain] = useState("");
  const [sessionReady, setSessionReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session && active) {
        setSessionReady(true);
        setErrorMessage("");
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!active) return;

        if (
          event === "PASSWORD_RECOVERY" ||
          (event === "SIGNED_IN" && session)
        ) {
          setSessionReady(true);
          setErrorMessage("");
        }
      }
    );

    void checkSession();

    const timeout = window.setTimeout(() => {
      if (active) {
        setErrorMessage(
          "Şifre yenileme oturumu bulunamadı. Giriş sayfasından yeni bağlantı isteyin."
        );
      }
    }, 5000);

    return () => {
      active = false;
      window.clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    if (password.length < 8) {
      setErrorMessage(
        "Şifre en az 8 karakter olmalıdır."
      );
      return;
    }

    if (password !== passwordAgain) {
      setErrorMessage("Şifreler aynı değil.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setErrorMessage(error.message);
      setSaving(false);
      return;
    }

    setSuccessMessage("Şifreniz başarıyla oluşturuldu.");

    window.setTimeout(() => {
      router.replace("/dashboard/hesabim");
      router.refresh();
    }, 1200);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 py-12 text-white">
      <div className="w-full max-w-md">
        <div className="text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[26px] bg-orange-500 text-3xl">
            <FaLock />
          </div>

          <p className="mt-6 text-xs font-black uppercase tracking-[0.3em] text-orange-400">
            TUROBUS OS
          </p>

          <h1 className="mt-3 text-4xl font-black">
            Yeni Şifre Belirle
          </h1>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-10 rounded-[32px] border border-white/10 bg-slate-900 p-7"
        >
          <label className="block">
            <span className="text-sm font-black">
              Yeni şifre
            </span>

            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 text-slate-950 outline-none"
            />
          </label>

          <label className="mt-5 block">
            <span className="text-sm font-black">
              Yeni şifre tekrar
            </span>

            <input
              type="password"
              required
              minLength={8}
              value={passwordAgain}
              onChange={(event) =>
                setPasswordAgain(event.target.value)
              }
              className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 text-slate-950 outline-none"
            />
          </label>

          {errorMessage && (
            <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-bold text-red-400">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="mt-5 flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-400">
              <FaCheckCircle />
              {successMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={!sessionReady || saving}
            className="mt-6 min-h-14 w-full rounded-2xl bg-orange-500 font-black disabled:opacity-50"
          >
            {saving
              ? "Şifre kaydediliyor..."
              : "Şifreyi Kaydet"}
          </button>
        </form>
      </div>
    </main>
  );
}
