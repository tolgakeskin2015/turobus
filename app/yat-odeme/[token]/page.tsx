"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  useParams,
  useSearchParams,
} from "next/navigation";

import {
  FaAnchor,
  FaCheckCircle,
  FaClock,
  FaCreditCard,
  FaLock,
  FaShip,
} from "react-icons/fa";

import {
  supabase,
} from "@/lib/supabase";


type Data = {
  payment_link_id: string;
  status: string;
  amount: number;
  currency: string;
  valid_until:
    string | null;
  note:
    string | null;

  booking_code: string;
  guest_name: string;

  start_date: string;
  end_date: string;

  total_amount: number;
  paid_amount: number;
  remaining_amount: number;

  yacht: {
    name: string;
    type: string;
    city: string;
    marina:
      string | null;
    departure_point:
      string | null;
  };
};


function money(
  value: number,
  currency = "TRY"
) {
  return new Intl.NumberFormat(
    "tr-TR",
    {
      style:
        "currency",

      currency,

      maximumFractionDigits:
        0,
    }
  ).format(
    Number(
      value || 0
    )
  );
}


export default function YachtPaymentPage() {
  const params =
    useParams<{
      token: string;
    }>();

  const search =
    useSearchParams();

  const token =
    String(
      params?.token ||
      ""
    );

  const [
    data,
    setData,
  ] =
    useState<
      Data | null
    >(null);

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


  useEffect(
    () => {
      async function load() {

        const {
          data:
            result,
          error:
            requestError,
        } =
          await supabase.rpc(
            "get_public_yacht_payment_link",
            {
              p_token:
                token,
            }
          );


        if (
          requestError
        ) {
          setError(
            requestError.message
          );
        }


        setData(
          (
            result ||
            null
          ) as
            Data | null
        );

        setLoading(
          false
        );
      }


      if (token) {
        void load();
      }
    },
    [
      token,
    ]
  );


  async function pay() {

    setPaying(true);
    setError("");


    try {

      const response =
        await fetch(
          "/api/yacht-payments/iyzico/initialize",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                token,
              }),
          }
        );


      const result =
        await response.json();


      if (
        !response.ok
      ) {
        throw new Error(
          result.error ||
          "Ödeme başlatılamadı."
        );
      }


      if (
        !result
          .paymentPageUrl
      ) {
        throw new Error(
          "Ödeme sayfası oluşturulamadı."
        );
      }


      window.location.href =
        result.paymentPageUrl;

    } catch (
      currentError
    ) {

      setError(
        currentError instanceof
          Error
          ? currentError.message
          : String(
              currentError
            )
      );

      setPaying(false);
    }
  }


  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#030a11] text-white">
        <FaAnchor className="animate-pulse text-4xl text-orange-400" />
      </main>
    );
  }


  if (!data) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#030a11] p-6 text-white">
        Ödeme bağlantısı bulunamadı.
      </main>
    );
  }


  const result =
    search.get(
      "result"
    );


  return (
    <main className="min-h-screen bg-[#030a11] px-4 py-8 text-white">

      <div className="mx-auto max-w-3xl">


        {result ===
          "success" && (
          <div className="mb-5 flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/[.06] p-5 text-emerald-300">
            <FaCheckCircle />

            <div>
              <div className="text-sm font-black">
                Ödeme başarılı
              </div>

              <div className="mt-1 text-[9px]">
                Tahsilat rezervasyonunuza işlendi.
              </div>
            </div>
          </div>
        )}


        <section className="overflow-hidden rounded-[34px] border border-white/10 bg-[#07131f]">

          <header className="bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,.18),transparent_38%),#07131f] p-7 sm:p-9">

            <div className="flex items-start justify-between gap-5">

              <div>
                <div className="text-[9px] font-black uppercase tracking-[.22em] text-orange-400">
                  TUROBUS GÜVENLİ ÖDEME
                </div>

                <h1 className="mt-4 text-3xl font-black">
                  {
                    data.yacht.name
                  }
                </h1>

                <div className="mt-2 text-xs text-slate-500">
                  Rezervasyon:{" "}
                  {
                    data.booking_code
                  }
                </div>
              </div>


              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-orange-500 text-xl">
                <FaShip />
              </div>

            </div>

          </header>


          <div className="p-7 sm:p-9">

            <div className="grid gap-3 sm:grid-cols-3">

              <Mini
                label="Toplam"
                value={money(
                  data.total_amount,
                  data.currency
                )}
              />

              <Mini
                label="Tahsil Edildi"
                value={money(
                  data.paid_amount,
                  data.currency
                )}
              />

              <Mini
                label="Kalan"
                value={money(
                  data.remaining_amount,
                  data.currency
                )}
              />

            </div>


            <div className="mt-6 rounded-[24px] border border-orange-500/20 bg-orange-500/[.05] p-6">

              <div className="text-[8px] font-black uppercase tracking-[.16em] text-slate-500">
                Bu Linkten Ödenecek
              </div>

              <div className="mt-2 text-4xl font-black text-orange-300">
                {money(
                  data.amount,
                  data.currency
                )}
              </div>


              {data.valid_until && (
                <div className="mt-4 flex items-center gap-2 text-[9px] text-slate-500">
                  <FaClock />

                  Link geçerlilik:
                  {" "}
                  {new Intl.DateTimeFormat(
                    "tr-TR",
                    {
                      day:
                        "2-digit",

                      month:
                        "short",

                      hour:
                        "2-digit",

                      minute:
                        "2-digit",
                    }
                  ).format(
                    new Date(
                      data.valid_until
                    )
                  )}
                </div>
              )}


              {data.status ===
              "active" ? (
                <button
                  type="button"
                  disabled={
                    paying
                  }
                  onClick={() =>
                    void pay()
                  }
                  className="mt-6 flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-orange-500 text-sm font-black"
                >
                  <FaCreditCard />

                  {paying
                    ? "Ödeme sayfası hazırlanıyor..."
                    : "Güvenli Ödemeye Geç"}
                </button>
              ) : (
                <div className="mt-6 rounded-xl border border-white/10 bg-black/10 p-4 text-center text-xs font-black text-slate-400">
                  {data.status ===
                  "paid"
                    ? "Bu ödeme bağlantısı kullanıldı."
                    : data.status ===
                      "expired"
                      ? "Ödeme bağlantısının süresi doldu."
                      : "Ödeme bağlantısı aktif değil."}
                </div>
              )}


              <div className="mt-5 flex items-center justify-center gap-2 text-[8px] text-slate-600">
                <FaLock />
                Güvenli ödeme altyapısı
              </div>

            </div>


            {error && (
              <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/[.05] p-4 text-xs text-red-300">
                {error}
              </div>
            )}

          </div>

        </section>

      </div>

    </main>
  );
}


function Mini({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[.07] bg-white/[.02] p-4">

      <div className="text-[8px] font-black uppercase text-slate-600">
        {label}
      </div>

      <div className="mt-2 text-sm font-black">
        {value}
      </div>

    </div>
  );
}
