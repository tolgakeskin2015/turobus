"use client";

import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="w-full max-w-md bg-slate-900 p-8 rounded-2xl shadow-xl">
        <h1 className="text-3xl font-bold text-center text-white mb-6">
          TUROBUS Giriş
        </h1>

        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          providers={["google"]}
          localization={{
            variables: {
              sign_in: {
                email_label: "E-posta",
                password_label: "Şifre",
                button_label: "Giriş Yap",
              },
              sign_up: {
                email_label: "E-posta",
                password_label: "Şifre",
                button_label: "Kayıt Ol",
              },
            },
          }}
        />
      </div>
    </main>
  );
}