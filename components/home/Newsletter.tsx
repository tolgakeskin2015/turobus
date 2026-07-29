"use client";

import { useState } from "react";
import {
  FaArrowRight,
  FaBell,
  FaCheckCircle,
  FaEnvelope,
} from "react-icons/fa";

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim()) {
      return;
    }

    setSubmitted(true);
  }

  return (
    <section className="bg-slate-950 px-6 py-24 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="relative overflow-hidden rounded-[40px] border border-white/10 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-8 md:p-14">
          <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-orange-500/15 blur-3xl" />
          <div className="absolute -bottom-24 -right-20 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />

          <div className="relative z-10 grid gap-12 lg:grid-cols-[1fr_0.9fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-4 py-2 text-sm font-black text-orange-400">
                <FaBell />
                Fırsatları kaçırma
              </div>

              <h2 className="mt-6 max-w-3xl text-4xl font-black tracking-tight md:text-5xl">
                En iyi tur fırsatları e-postana gelsin.
              </h2>

              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-400">
                Erken rezervasyon, son dakika ve özel kampanyalardan ilk sen
                haberdar ol.
              </p>

              <div className="mt-7 flex flex-wrap gap-5 text-sm font-semibold text-slate-400">
                <div className="flex items-center gap-2">
                  <FaCheckCircle className="text-emerald-400" />
                  Sadece önemli fırsatlar
                </div>

                <div className="flex items-center gap-2">
                  <FaCheckCircle className="text-emerald-400" />
                  İstediğin zaman çıkış
                </div>

                <div className="flex items-center gap-2">
                  <FaCheckCircle className="text-emerald-400" />
                  Ücretsiz abonelik
                </div>
              </div>
            </div>

            <div className="rounded-[30px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl md:p-8">
              {submitted ? (
                <div className="flex min-h-44 flex-col items-center justify-center text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
                    <FaCheckCircle size={28} />
                  </div>

                  <h3 className="mt-5 text-2xl font-black">
                    Aboneliğin oluşturuldu
                  </h3>

                  <p className="mt-3 text-slate-400">
                    Fırsatları yakında e-posta adresine göndermeye başlayacağız.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <label className="block text-sm font-black text-white">
                    E-posta adresin
                  </label>

                  <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                    <div className="flex min-h-14 flex-1 items-center gap-3 rounded-2xl bg-white px-5">
                      <FaEnvelope className="text-orange-500" />

                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="ornek@email.com"
                        className="w-full bg-transparent text-sm font-bold text-slate-950 outline-none placeholder:text-slate-400"
                      />
                    </div>

                    <button
                      type="submit"
                      className="inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-orange-500 px-6 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-orange-600"
                    >
                      Abone Ol
                      <FaArrowRight />
                    </button>
                  </div>

                  <p className="mt-4 text-xs leading-6 text-slate-500">
                    Abone olarak kampanya ve fırsat bildirimlerini almayı kabul
                    etmiş olursun.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
