"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  useParams,
  useSearchParams,
} from "next/navigation";

import Link from "next/link";

import {
  FaArrowLeft,
  FaCheckCircle,
  FaCreditCard,
  FaLock,
  FaMoneyBillWave,
  FaShieldAlt,
  FaTimesCircle,
} from "react-icons/fa";

import {
  supabase,
} from "@/lib/supabase";

import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";


type Context = {
  booking_code: string;

  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;

  activity_name: string;

  service_date: string;
  start_time: string | null;

  quantity: number;

  status: string;

  payment_status: string;

  sale_total: number;
  paid_total: number;
  remaining_total: number;

  currency: string;

  company_name: string;

  company_logo_url:
    string | null;
};


function money(
  value: number,
  currency: string
) {

  return new Intl.NumberFormat(
    "tr-TR",
    {
      style:
        "currency",

      currency,

      maximumFractionDigits:
        2,
    }
  ).format(
    Number(
      value || 0
    )
  );

}


export default function ActivityPaymentPage() {

  const params =
    useParams<{
      token: string;
    }>();


  const query =
    useSearchParams();


  const [
    data,
    setData,
  ] =
    useState<Context | null>(
      null
    );


  const [
    loading,
    setLoading,
  ] =
    useState(true);


  const [
    paying,
    setPaying,
  ] =
    useState(false);


  const [
    error,
    setError,
  ] =
    useState("");


  const [
    identityNumber,
    setIdentityNumber,
  ] =
    useState("");


  const [
    email,
    setEmail,
  ] =
    useState("");


  const [
    phone,
    setPhone,
  ] =
    useState("");


  const [
    billingCity,
    setBillingCity,
  ] =
    useState("Muğla");


  const [
    billingAddress,
    setBillingAddress,
  ] =
    useState("");


  async function load() {

    setLoading(
      true
    );


    const {
      data:
        result,
      error:
        rpcError,
    } =
      await supabase.rpc(
        "get_public_activity_payment_context",
        {
          p_token:
            params.token,
        }
      );


    if (
      rpcError
    ) {

      setError(
        rpcError.message
      );

      setLoading(
        false
      );

      return;

    }


    const context =
      result as Context;


    setData(
      context
    );


    setEmail(
      context.customer_email ||
      ""
    );


    setPhone(
      context.customer_phone ||
      ""
    );


    setLoading(
      false
    );

  }


  useEffect(
    () => {
      void load();
    },
    [
      params.token,
    ]
  );


  async function pay() {

    setError("");


    if (
      !identityNumber.trim() ||
      !email.trim() ||
      !phone.trim() ||
      !billingCity.trim() ||
      !billingAddress.trim()
    ) {

      setError(
        "Ödeme için tüm zorunlu bilgileri doldurun."
      );

      return;

    }


    setPaying(
      true
    );


    const response =
      await fetch(
        "/api/activity-payments/iyzico/initialize",
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify({
              guestToken:
                params.token,

              identityNumber:
                identityNumber.trim(),

              email:
                email.trim(),

              phone:
                phone.trim(),

              billingCity:
                billingCity.trim(),

              billingAddress:
                billingAddress.trim(),
            }),
        }
      );


    const result =
      await response.json();


    if (
      !response.ok
    ) {

      setPaying(
        false
      );

      setError(
        result.error ||
        "Ödeme başlatılamadı."
      );

      return;

    }


    if (
      !result.paymentPageUrl
    ) {

      setPaying(
        false
      );

      setError(
        "Ödeme sayfası oluşturulamadı."
      );

      return;

    }


    window.location.href =
      result.paymentPageUrl;

  }


  if (
    loading
  ) {

    return (
      <main className="min-h-screen bg-[#040b12] text-white">
        <Navbar />

        <div className="mx-auto max-w-5xl px-5 pt-36">
          <div className="h-[420px] animate-pulse rounded-[32px] bg-white/[.04]" />
        </div>
      </main>
    );

  }


  if (
    !data
  ) {

    return (
      <main className="min-h-screen bg-[#040b12] text-white">
        <Navbar />

        <div className="mx-auto max-w-3xl px-5 pt-40 text-center">

          <FaTimesCircle className="mx-auto text-5xl text-red-400" />

          <h1 className="mt-5 text-3xl font-black">
            Ödeme bağlantısı bulunamadı.
          </h1>

        </div>
      </main>
    );

  }


  const paymentResult =
    query.get(
      "payment"
    );


  if (
    paymentResult ===
    "success"
  ) {

    return (
      <main className="min-h-screen bg-[#040b12] text-white">

        <Navbar />

        <section className="px-5 pb-20 pt-36">

          <div className="mx-auto max-w-2xl rounded-[34px] border border-emerald-500/20 bg-gradient-to-br from-emerald-500/15 to-[#07131f] p-8 text-center">

            <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-500 text-3xl text-slate-950">
              <FaCheckCircle />
            </div>

            <div className="mt-6 text-[10px] font-black uppercase tracking-[.2em] text-emerald-300">
              ÖDEME BAŞARILI
            </div>

            <h1 className="mt-3 text-4xl font-black">
              Ödemeniz alındı.
            </h1>

            <p className="mt-4 text-sm leading-7 text-slate-400">
              Rezervasyonunuzun ödeme kaydı Turobus Activity OS&apos;ye işlendi.
            </p>

            <Link
              href={`/activity-misafir/${params.token}`}
              className="mt-7 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-4 font-black"
            >
              Rezervasyonuma Dön
            </Link>

          </div>

        </section>

        <Footer />

      </main>
    );

  }


  return (
    <main className="min-h-screen bg-[#040b12] text-white">

      <Navbar />


      <section className="px-5 pb-20 pt-32">

        <div className="mx-auto max-w-6xl">

          <Link
            href={`/activity-misafir/${params.token}`}
            className="inline-flex items-center gap-2 text-xs font-black text-slate-500 hover:text-white"
          >
            <FaArrowLeft />
            Rezervasyona dön
          </Link>


          <div className="mt-7 grid gap-7 lg:grid-cols-[1fr_390px]">

            <div>

              <div className="text-[10px] font-black uppercase tracking-[.2em] text-orange-400">
                TUROBUS GÜVENLİ ÖDEME
              </div>

              <h1 className="mt-3 text-4xl font-black md:text-5xl">
                Aktivite ödemenizi tamamlayın.
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400">
                Kart bilgileriniz Turobus tarafından saklanmaz. Ödeme güvenli ödeme sağlayıcısı üzerinden tamamlanır.
              </p>


              {paymentResult ===
                "failed" && (

                <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4">

                  <div className="flex items-center gap-3 text-sm font-black text-red-300">
                    <FaTimesCircle />
                    Ödeme tamamlanamadı.
                  </div>

                  <div className="mt-2 text-xs text-red-300/70">
                    {query.get(
                      "message"
                    ) ||
                      "Tekrar deneyebilirsiniz."}
                  </div>

                </div>

              )}


              <div className="mt-7 rounded-[30px] border border-white/10 bg-[#07131f] p-6">

                <h2 className="text-xl font-black">
                  Fatura & İletişim Bilgileri
                </h2>


                <div className="mt-6 grid gap-4 md:grid-cols-2">

                  <Field label="T.C. Kimlik / Pasaport No">
                    <input
                      value={
                        identityNumber
                      }
                      onChange={(event) =>
                        setIdentityNumber(
                          event.target.value
                        )
                      }
                      className={inputClass}
                    />
                  </Field>


                  <Field label="E-posta">
                    <input
                      type="email"
                      value={
                        email
                      }
                      onChange={(event) =>
                        setEmail(
                          event.target.value
                        )
                      }
                      className={inputClass}
                    />
                  </Field>


                  <Field label="Telefon">
                    <input
                      type="tel"
                      value={
                        phone
                      }
                      onChange={(event) =>
                        setPhone(
                          event.target.value
                        )
                      }
                      className={inputClass}
                    />
                  </Field>


                  <Field label="Şehir">
                    <input
                      value={
                        billingCity
                      }
                      onChange={(event) =>
                        setBillingCity(
                          event.target.value
                        )
                      }
                      className={inputClass}
                    />
                  </Field>


                  <div className="md:col-span-2">

                    <Field label="Fatura Adresi">
                      <textarea
                        value={
                          billingAddress
                        }
                        onChange={(event) =>
                          setBillingAddress(
                            event.target.value
                          )
                        }
                        className={`${inputClass} min-h-[100px]`}
                      />
                    </Field>

                  </div>

                </div>

              </div>

            </div>


            <aside>

              <div className="sticky top-28 rounded-[30px] border border-white/10 bg-[#07131f] p-6">

                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.17em] text-orange-400">
                  <FaMoneyBillWave />
                  ÖDEME ÖZETİ
                </div>


                <div className="mt-5">

                  <div className="text-xl font-black">
                    {data.activity_name}
                  </div>

                  <div className="mt-2 text-xs text-slate-500">
                    {data.service_date}
                    {" · "}
                    {data.start_time?.slice(
                      0,
                      5
                    )}
                    {" · "}
                    {data.quantity} kişi
                  </div>

                </div>


                <div className="mt-6 space-y-3 border-t border-white/10 pt-5">

                  <Row
                    label="Toplam"
                    value={money(
                      data.sale_total,
                      data.currency
                    )}
                  />

                  <Row
                    label="Ödenen"
                    value={money(
                      data.paid_total,
                      data.currency
                    )}
                  />

                </div>


                <div className="mt-5 rounded-2xl bg-orange-500/10 p-5">

                  <div className="text-[9px] font-black uppercase text-orange-300">
                    ŞİMDİ ÖDENECEK
                  </div>

                  <div className="mt-2 text-4xl font-black text-orange-400">
                    {money(
                      data.remaining_total,
                      data.currency
                    )}
                  </div>

                </div>


                {error && (

                  <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs font-bold text-red-300">
                    {error}
                  </div>

                )}


                {data.remaining_total >
                  0 ? (

                  <button
                    type="button"
                    disabled={
                      paying
                    }
                    onClick={() =>
                      void pay()
                    }
                    className="mt-5 flex min-h-14 w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-orange-500 to-fuchsia-500 text-sm font-black shadow-xl disabled:opacity-50"
                  >

                    <FaCreditCard />

                    {paying
                      ? "Ödeme sayfası hazırlanıyor..."
                      : "Güvenli Ödemeye Geç"}

                  </button>

                ) : (

                  <div className="mt-5 rounded-xl bg-emerald-500/10 p-4 text-center font-black text-emerald-300">
                    Ödeme tamamlandı.
                  </div>

                )}


                <div className="mt-5 space-y-3 border-t border-white/10 pt-5 text-[9px] leading-5 text-slate-600">

                  <div className="flex gap-2">
                    <FaLock className="mt-1 text-emerald-500" />
                    Güvenli ödeme altyapısı
                  </div>

                  <div className="flex gap-2">
                    <FaShieldAlt className="mt-1 text-emerald-500" />
                    Ödeme sonucu sistem tarafından doğrulanır
                  </div>

                </div>

              </div>

            </aside>

          </div>

        </div>

      </section>


      <Footer />

    </main>
  );

}


function Field({
  label,
  children,
}: {
  label: string;
  children:
    React.ReactNode;
}) {

  return (
    <label>

      <span className="mb-2 block text-[10px] font-black uppercase text-slate-500">
        {label}
      </span>

      {children}

    </label>
  );

}


function Row({
  label,
  value,
}: {
  label: string;
  value: string;
}) {

  return (
    <div className="flex items-center justify-between text-sm">

      <span className="text-slate-500">
        {label}
      </span>

      <span className="font-black">
        {value}
      </span>

    </div>
  );

}


const inputClass =
  "w-full rounded-xl border border-white/10 bg-[#030a11] px-4 py-3.5 text-sm text-white outline-none transition focus:border-orange-500/60";
