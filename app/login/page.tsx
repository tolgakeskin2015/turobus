"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  FaArrowLeft,
  FaCheckCircle,
  FaEnvelope,
  FaEye,
  FaEyeSlash,
  FaLock,
  FaShieldAlt,
  FaUser,
} from "react-icons/fa";

type Mode = "login" | "register" | "forgot";

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  function changeMode(nextMode: Mode) {
    setMode(nextMode);
    setMessage(null);
    setPassword("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          throw error;
        }

        router.push("/dashboard");
        router.refresh();
        return;
      }

      if (mode === "register") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        });

        if (error) {
          throw error;
        }

        if (data.session) {
          router.push("/dashboard");
          router.refresh();
          return;
        }

        setMessage({
          type: "success",
          text:
            "Kayıt oluşturuldu. E-posta adresine gönderilen doğrulama bağlantısını onayla.",
        });

        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });

      if (error) {
        throw error;
      }

      setMessage({
        type: "success",
        text: "Şifre yenileme bağlantısı e-posta adresine gönderildi.",
      });
    } catch (error) {
      const text =
        error instanceof Error
          ? error.message
          : "İşlem sırasında beklenmeyen bir hata oluştu.";

      setMessage({
        type: "error",
        text,
      });
    } finally {
      setLoading(false);
    }
  }

  const title =
    mode === "login"
      ? "Hesabına giriş yap"
      : mode === "register"
        ? "TUROBUS hesabını oluştur"
        : "Şifreni yenile";

  const description =
    mode === "login"
      ? "Rezervasyonlarını, favorilerini ve hesabını tek noktadan yönet."
      : mode === "register"
        ? "Turları keşfetmek ve rezervasyonlarını yönetmek için ücretsiz hesap oluştur."
        : "E-posta adresini gir; sana şifre yenileme bağlantısı gönderelim.";

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 px-5 py-10 text-white">
      <div className="absolute -left-40 top-10 h-[440px] w-[440px] rounded-full bg-orange-500/15 blur-[140px]" />
      <div className="absolute -right-40 bottom-0 h-[440px] w-[440px] rounded-full bg-blue-500/10 blur-[140px]" />

      <div className="relative z-10 mx-auto max-w-7xl">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 text-xl font-black shadow-lg shadow-orange-500/25">
              T
            </div>

            <div>
              <div className="text-2xl font-black tracking-tight">
                TUROBUS
              </div>

              <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-orange-400">
                Marketplace
              </div>
            </div>
          </Link>

          <Link
            href="/"
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black text-slate-300 transition hover:border-orange-500/30 hover:text-white"
          >
            <FaArrowLeft />
            Ana Sayfa
          </Link>
        </div>

        <div className="grid min-h-[calc(100vh-130px)] items-center gap-12 py-12 lg:grid-cols-[1fr_520px]">
          <section className="hidden lg:block">
            <p className="text-sm font-black uppercase tracking-[0.24em] text-orange-400">
              Güvenle keşfet
            </p>

            <h1 className="mt-5 max-w-3xl text-6xl font-black leading-[1.02] tracking-[-0.045em]">
              Tüm seyahat deneyimlerin
              <span className="block text-orange-500">
                tek hesabınla yanında.
              </span>
            </h1>

            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-400">
              Doğrulanmış acentelerin turlarını keşfet, favorilerini kaydet,
              rezervasyonlarını görüntüle ve seyahatlerini kolayca yönet.
            </p>

            <div className="mt-10 grid max-w-2xl gap-4 sm:grid-cols-3">
              {([
                ["Güvenli giriş", FaShieldAlt],
                ["Kolay rezervasyon", FaCheckCircle],
                ["Tek panel", FaUser],
              ] as const).map(([label, Icon]) => (
                <div
                  key={String(label)}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"
                >
                  <Icon className="text-orange-400" size={22} />

                  <p className="mt-4 text-sm font-black">{label}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[34px] border border-white/10 bg-slate-900/85 p-6 shadow-2xl backdrop-blur-2xl sm:p-9">
            {mode !== "forgot" && (
              <div className="mb-8 grid grid-cols-2 rounded-2xl bg-slate-950 p-1.5">
                <button
                  type="button"
                  onClick={() => changeMode("login")}
                  className={`min-h-12 rounded-xl text-sm font-black transition ${
                    mode === "login"
                      ? "bg-orange-500 text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Giriş Yap
                </button>

                <button
                  type="button"
                  onClick={() => changeMode("register")}
                  className={`min-h-12 rounded-xl text-sm font-black transition ${
                    mode === "register"
                      ? "bg-orange-500 text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Kayıt Ol
                </button>
              </div>
            )}

            <div>
              <h2 className="text-3xl font-black tracking-tight">{title}</h2>

              <p className="mt-3 leading-7 text-slate-400">{description}</p>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              {mode === "register" && (
                <label className="block">
                  <span className="text-sm font-black">Ad soyad</span>

                  <div className="mt-2 flex min-h-14 items-center gap-3 rounded-2xl bg-white px-4">
                    <FaUser className="text-orange-500" />

                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      placeholder="Adınız ve soyadınız"
                      className="w-full bg-transparent text-sm font-bold text-slate-950 outline-none placeholder:text-slate-400"
                    />
                  </div>
                </label>
              )}

              <label className="block">
                <span className="text-sm font-black">E-posta</span>

                <div className="mt-2 flex min-h-14 items-center gap-3 rounded-2xl bg-white px-4">
                  <FaEnvelope className="text-orange-500" />

                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="ornek@email.com"
                    autoComplete="email"
                    className="w-full bg-transparent text-sm font-bold text-slate-950 outline-none placeholder:text-slate-400"
                  />
                </div>
              </label>

              {mode !== "forgot" && (
                <label className="block">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm font-black">Şifre</span>

                    {mode === "login" && (
                      <button
                        type="button"
                        onClick={() => changeMode("forgot")}
                        className="text-xs font-black text-orange-400 hover:text-orange-300"
                      >
                        Şifremi unuttum
                      </button>
                    )}
                  </div>

                  <div className="mt-2 flex min-h-14 items-center gap-3 rounded-2xl bg-white px-4">
                    <FaLock className="text-orange-500" />

                    <input
                      type={passwordVisible ? "text" : "password"}
                      required
                      minLength={6}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="En az 6 karakter"
                      autoComplete={
                        mode === "login"
                          ? "current-password"
                          : "new-password"
                      }
                      className="w-full bg-transparent text-sm font-bold text-slate-950 outline-none placeholder:text-slate-400"
                    />

                    <button
                      type="button"
                      aria-label={
                        passwordVisible ? "Şifreyi gizle" : "Şifreyi göster"
                      }
                      onClick={() =>
                        setPasswordVisible((current) => !current)
                      }
                      className="text-slate-500 transition hover:text-orange-500"
                    >
                      {passwordVisible ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </label>
              )}

              <button
                type="submit"
                disabled={loading}
                className="min-h-14 w-full rounded-2xl bg-orange-500 px-6 font-black text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading
                  ? "İşlem yapılıyor..."
                  : mode === "login"
                    ? "Giriş Yap"
                    : mode === "register"
                      ? "Ücretsiz Kayıt Ol"
                      : "Yenileme Bağlantısı Gönder"}
              </button>

              {message && (
                <div
                  className={`rounded-2xl border p-4 text-sm font-bold leading-6 ${
                    message.type === "success"
                      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                      : "border-red-500/20 bg-red-500/10 text-red-400"
                  }`}
                >
                  {message.text}
                </div>
              )}

              {mode === "forgot" && (
                <button
                  type="button"
                  onClick={() => changeMode("login")}
                  className="w-full text-sm font-black text-slate-400 transition hover:text-orange-400"
                >
                  Giriş ekranına dön
                </button>
              )}
            </form>

            <div className="mt-7 border-t border-white/10 pt-6 text-center text-xs leading-6 text-slate-500">
              Devam ederek TUROBUS kullanım koşullarını ve gizlilik
              politikasını kabul etmiş olursun.
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
