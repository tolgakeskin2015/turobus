"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  useParams,
} from "next/navigation";

import {
  FaAnchor,
  FaCalendarAlt,
  FaCheckCircle,
  FaClock,
  FaMapMarkerAlt,
  FaShip,
  FaTimesCircle,
  FaUsers,
} from "react-icons/fa";

import {
  supabase,
} from "@/lib/supabase";


type PublicQuote = {
  quote_code: string;
  customer_name: string;

  start_date: string;
  end_date: string;

  guest_count: number;

  currency: string;
  sale_price: number;

  status: string;

  valid_until:
    string | null;

  option_expires_at:
    string | null;

  customer_note:
    string | null;

  yacht: {
    id: string;
    name: string;
    type: string;
    city: string;
    marina:
      string | null;
    departure_point:
      string | null;
    max_guests: number;
    cabins: number;
    bathrooms: number;
    captain_name:
      string | null;
    captain_included: boolean;
    fuel_included: boolean;
    meals_included: boolean;
    cover_url:
      string | null;
  };

  items:
    Array<{
      id: string;
      item_type: string;
      title: string;
      description:
        string | null;
      quantity: number;
      unit_sale: number;
      total_sale: number;
    }>;
};


function money(
  value: number,
  currency = "TRY"
) {
  return new Intl.NumberFormat(
    "tr-TR",
    {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }
  ).format(
    Number(
      value || 0
    )
  );
}


function dateText(
  value: string
) {
  return new Intl.DateTimeFormat(
    "tr-TR",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }
  ).format(
    new Date(
      `${value}T12:00:00`
    )
  );
}


export default function PublicYachtQuotePage() {
  const params =
    useParams<{
      token: string;
    }>();

  const token =
    String(
      params?.token ??
      ""
    );

  const [
    quote,
    setQuote,
  ] =
    useState<
      PublicQuote | null
    >(null);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    message,
    setMessage,
  ] =
    useState("");


  async function load() {
    const {
      data,
    } =
      await supabase.rpc(
        "get_public_yacht_quote",
        {
          p_token:
            token,
        }
      );

    setQuote(
      (
        data ??
        null
      ) as
        PublicQuote | null
    );
  }


  useEffect(
    () => {
      async function boot() {
        await load();
        setLoading(false);
      }

      if (token) {
        void boot();
      }
    },
    [
      token,
    ]
  );


  async function respond(
    decision:
      "accepted" |
      "rejected"
  ) {
    setSaving(true);

    const {
      error,
    } =
      await supabase.rpc(
        "respond_public_yacht_quote",
        {
          p_token:
            token,

          p_decision:
            decision,
        }
      );

    if (error) {
      setMessage(
        error.message
      );
    } else {
      setMessage(
        decision ===
        "accepted"
          ? "Teklifiniz kabul edildi. Ekibimiz rezervasyon işlemleri için sizinle iletişime geçecektir."
          : "Teklif reddedildi. Talebiniz satış ekibimize iletildi."
      );

      await load();
    }

    setSaving(false);
  }


  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#030a11] text-white">
        <FaAnchor className="animate-pulse text-4xl text-orange-400" />
      </main>
    );
  }


  if (!quote) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#030a11] p-6 text-white">
        <div className="rounded-[28px] border border-red-500/20 bg-[#07131f] p-8 text-center">
          Teklif bulunamadı.
        </div>
      </main>
    );
  }


  const actionable =
    [
      "sent",
      "viewed",
    ].includes(
      quote.status
    );


  return (
    <main className="min-h-screen bg-[#030a11] px-4 py-8 text-white">

      <div className="mx-auto max-w-4xl">

        <section className="overflow-hidden rounded-[34px] border border-white/10 bg-[#07131f]">

          <div className="bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,.20),transparent_38%),linear-gradient(145deg,#07131f,#040b12)] p-7 sm:p-9">

            <div className="flex items-start justify-between gap-5">

              <div>
                <div className="text-[9px] font-black uppercase tracking-[.24em] text-orange-400">
                  TUROBUS ÖZEL YAT TEKLİFİ
                </div>

                <h1 className="mt-4 text-3xl font-black">
                  {
                    quote.yacht.name
                  }
                </h1>

                <div className="mt-2 text-xs text-slate-400">
                  Teklif No:{" "}
                  {
                    quote.quote_code
                  }
                </div>
              </div>

              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-orange-500 text-xl">
                <FaAnchor />
              </div>

            </div>


            <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

              <Info
                icon={<FaCalendarAlt />}
                label="Başlangıç"
                value={dateText(
                  quote.start_date
                )}
              />

              <Info
                icon={<FaCalendarAlt />}
                label="Bitiş"
                value={dateText(
                  quote.end_date
                )}
              />

              <Info
                icon={<FaUsers />}
                label="Misafir"
                value={`${quote.guest_count} kişi`}
              />

              <Info
                icon={<FaMapMarkerAlt />}
                label="Bölge"
                value={
                  quote.yacht.marina ??
                  quote.yacht.city
                }
              />

            </div>

          </div>


          <div className="border-t border-white/10 p-7 sm:p-9">

            <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">

              <div>

                <div className="text-sm font-black">
                  Teklif İçeriği
                </div>


                <div className="mt-4 rounded-2xl border border-white/[.07] bg-white/[.02] p-5">

                  <div className="flex items-center gap-3">
                    <FaShip className="text-orange-400" />

                    <div>
                      <div className="text-sm font-black">
                        {
                          quote.yacht.name
                        }
                      </div>

                      <div className="mt-1 text-[9px] text-slate-500">
                        {
                          quote.yacht.type
                        }
                        {" · "}
                        {
                          quote.yacht.max_guests
                        } kişi
                        {" · "}
                        {
                          quote.yacht.cabins
                        } kabin
                      </div>
                    </div>
                  </div>

                </div>


                {quote.items.length >
                  0 && (
                  <div className="mt-4 overflow-hidden rounded-2xl border border-white/[.07]">

                    {quote.items.map(
                      (
                        item
                      ) => (
                        <div
                          key={
                            item.id
                          }
                          className="flex items-center justify-between gap-4 border-b border-white/[.06] p-4 last:border-b-0"
                        >

                          <div>
                            <div className="text-[10px] font-black">
                              {
                                item.title
                              }
                            </div>

                            <div className="mt-1 text-[8px] text-slate-500">
                              {
                                item.quantity
                              } adet
                            </div>
                          </div>

                          <div className="text-[10px] font-black text-orange-300">
                            {money(
                              item.total_sale,
                              quote.currency
                            )}
                          </div>

                        </div>
                      )
                    )}

                  </div>
                )}


                {quote.customer_note && (
                  <div className="mt-5 rounded-2xl border border-blue-500/15 bg-blue-500/[.04] p-5">

                    <div className="text-[8px] font-black uppercase text-blue-300">
                      Teklif Notu
                    </div>

                    <div className="mt-2 text-xs leading-6 text-slate-300">
                      {
                        quote.customer_note
                      }
                    </div>

                  </div>
                )}

              </div>


              <div>

                <div className="rounded-[24px] border border-orange-500/20 bg-orange-500/[.05] p-6">

                  <div className="text-[8px] font-black uppercase tracking-wider text-slate-500">
                    Size Özel Toplam
                  </div>

                  <div className="mt-2 text-3xl font-black text-orange-300">
                    {money(
                      quote.sale_price,
                      quote.currency
                    )}
                  </div>


                  {quote.valid_until && (
                    <div className="mt-5 flex items-start gap-3 rounded-xl border border-white/[.07] bg-black/10 p-3">

                      <FaClock className="mt-0.5 text-amber-400" />

                      <div>
                        <div className="text-[8px] font-black">
                          Teklif Geçerlilik
                        </div>

                        <div className="mt-1 text-[8px] text-slate-500">
                          {new Intl.DateTimeFormat(
                            "tr-TR",
                            {
                              day: "2-digit",
                              month: "long",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          ).format(
                            new Date(
                              quote.valid_until
                            )
                          )}
                        </div>
                      </div>

                    </div>
                  )}


                  {actionable && (
                    <div className="mt-6 grid grid-cols-2 gap-3">

                      <button
                        type="button"
                        disabled={
                          saving
                        }
                        onClick={() =>
                          void respond(
                            "rejected"
                          )
                        }
                        className="flex h-12 items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/[.07] text-xs font-black text-red-300"
                      >
                        <FaTimesCircle />
                        Reddet
                      </button>

                      <button
                        type="button"
                        disabled={
                          saving
                        }
                        onClick={() =>
                          void respond(
                            "accepted"
                          )
                        }
                        className="flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-500 text-xs font-black"
                      >
                        <FaCheckCircle />
                        Teklifi Kabul Et
                      </button>

                    </div>
                  )}


                  {!actionable && (
                    <div className="mt-6 rounded-xl border border-white/[.07] bg-black/10 p-4 text-center">

                      <div className="text-[10px] font-black">
                        {quote.status ===
                        "accepted"
                          ? "Teklif Kabul Edildi"
                          : quote.status ===
                            "converted"
                            ? "Rezervasyon Oluşturuldu"
                            : quote.status ===
                              "rejected"
                              ? "Teklif Reddedildi"
                              : quote.status ===
                                "expired"
                                ? "Teklif Süresi Doldu"
                                : quote.status}
                      </div>

                    </div>
                  )}

                </div>

              </div>

            </div>


            {message && (
              <div className="mt-6 rounded-xl border border-emerald-500/20 bg-emerald-500/[.05] p-4 text-center text-xs text-emerald-300">
                {message}
              </div>
            )}


            <div className="mt-8 text-center text-[8px] leading-5 text-slate-600">
              Bu teklif Turobus Yat & Tekne Satış Sistemi üzerinden oluşturulmuştur.
            </div>

          </div>

        </section>

      </div>
    </main>
  );
}


function Info({
  icon,
  label,
  value,
}: {
  icon:
    React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[.07] bg-black/10 p-4">

      <div className="flex items-center gap-2 text-orange-400">
        {icon}

        <span className="text-[7px] font-black uppercase">
          {label}
        </span>
      </div>

      <div className="mt-2 text-[9px] font-black">
        {value}
      </div>

    </div>
  );
}
