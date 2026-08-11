"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import { supabase } from "@/lib/supabase";

import {
  CurrentMembership,
  getCurrentMembership,
} from "@/lib/current-user";

type QuoteStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "accepted"
  | "rejected"
  | "expired"
  | "converted"
  | "cancelled";

type Quote = {
  id: string;
  quote_code: string;

  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;

  package_type: string;
  destination: string | null;

  check_in: string;
  check_out: string;

  adults: number;
  children: number;
  nights: number;

  total_cost: number;
  gross_profit: number;
  sale_price: number;
  margin_percent: number;

  status: QuoteStatus;

  public_token: string;

  valid_until: string | null;

  created_at: string;
};

const statusLabels: Record<
  QuoteStatus,
  string
> = {
  draft: "Taslak",
  sent: "Gönderildi",
  viewed: "Görüntülendi",
  accepted: "Kabul Edildi",
  rejected: "Reddedildi",
  expired: "Süresi Doldu",
  converted: "Rezervasyona Döndü",
  cancelled: "İptal",
};

function money(value: number) {
  return new Intl.NumberFormat(
    "tr-TR",
    {
      style: "currency",
      currency: "TRY",
      maximumFractionDigits: 2,
    }
  ).format(Number(value || 0));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(
    "tr-TR"
  ).format(
    new Date(`${value}T12:00:00`)
  );
}

function statusClass(
  status: QuoteStatus
) {
  if (status === "accepted") {
    return "bg-emerald-500/15 text-emerald-400";
  }

  if (status === "viewed") {
    return "bg-blue-500/15 text-blue-400";
  }

  if (status === "sent") {
    return "bg-violet-500/15 text-violet-400";
  }

  if (
    status === "rejected" ||
    status === "cancelled"
  ) {
    return "bg-red-500/15 text-red-400";
  }

  if (status === "converted") {
    return "bg-cyan-500/15 text-cyan-400";
  }

  return "bg-slate-500/15 text-slate-300";
}

export default function PackageQuotesPage() {
  const [
    membership,
    setMembership,
  ] =
    useState<CurrentMembership | null>(
      null
    );

  const [quotes, setQuotes] =
    useState<Quote[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [search, setSearch] =
    useState("");

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const loadQuotes = useCallback(
    async (companyId: string) => {
      const { data, error } =
        await supabase
          .from("package_quotes")
          .select(`
            id,
            quote_code,
            customer_name,
            customer_phone,
            customer_email,
            package_type,
            destination,
            check_in,
            check_out,
            adults,
            children,
            nights,
            total_cost,
            gross_profit,
            sale_price,
            margin_percent,
            status,
            public_token,
            valid_until,
            created_at
          `)
          .eq(
            "company_id",
            companyId
          )
          .order("created_at", {
            ascending: false,
          });

      if (error) {
        throw new Error(
          error.message
        );
      }

      setQuotes(
        (data ?? []) as Quote[]
      );
    },
    []
  );

  useEffect(() => {
    async function initialize() {
      try {
        const {
          data: { user },
        } =
          await supabase.auth.getUser();

        if (!user) {
          setErrorMessage(
            "Kullanıcı oturumu bulunamadı."
          );
          return;
        }

        const currentMembership =
          await getCurrentMembership(
            user.id
          );

        if (!currentMembership) {
          setErrorMessage(
            "Aktif şirket üyeliği bulunamadı."
          );
          return;
        }

        setMembership(
          currentMembership
        );

        await loadQuotes(
          currentMembership.company_id
        );
      } catch (error) {
        console.error(error);

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Teklifler yüklenemedi."
        );
      } finally {
        setLoading(false);
      }
    }

    void initialize();
  }, [loadQuotes]);

  const filteredQuotes =
    useMemo(() => {
      const query = search
        .trim()
        .toLocaleLowerCase(
          "tr-TR"
        );

      if (!query) {
        return quotes;
      }

      return quotes.filter(
        (quote) =>
          [
            quote.quote_code,
            quote.customer_name,
            quote.customer_phone,
            quote.destination,
            statusLabels[
              quote.status
            ],
          ]
            .filter(Boolean)
            .some((value) =>
              String(value)
                .toLocaleLowerCase(
                  "tr-TR"
                )
                .includes(query)
            )
      );
    }, [quotes, search]);

  const stats = useMemo(() => {
    const accepted =
      quotes.filter(
        (quote) =>
          quote.status ===
          "accepted"
      );

    const totalSales =
      accepted.reduce(
        (total, quote) =>
          total +
          Number(
            quote.sale_price
          ),
        0
      );

    const totalProfit =
      accepted.reduce(
        (total, quote) =>
          total +
          Number(
            quote.gross_profit
          ),
        0
      );

    return {
      total: quotes.length,

      sent: quotes.filter(
        (quote) =>
          quote.status ===
            "sent" ||
          quote.status ===
            "viewed"
      ).length,

      accepted:
        accepted.length,

      totalSales,
      totalProfit,
    };
  }, [quotes]);

  async function markAsSent(
    quote: Quote
  ) {
    if (!membership) {
      return;
    }

    if (
      quote.status === "draft"
    ) {
      const { error } =
        await supabase
          .from("package_quotes")
          .update({
            status: "sent",
            updated_at:
              new Date().toISOString(),
          })
          .eq("id", quote.id)
          .eq(
            "company_id",
            membership.company_id
          );

      if (error) {
        throw new Error(
          error.message
        );
      }
    }
  }

  function publicUrl(
    quote: Quote
  ) {
    if (
      typeof window ===
      "undefined"
    ) {
      return "";
    }

    return (
      `${window.location.origin}` +
      `/teklif/${quote.public_token}`
    );
  }

  async function copyLink(
    quote: Quote
  ) {
    try {
      await markAsSent(quote);

      const url =
        publicUrl(quote);

      await navigator.clipboard.writeText(
        url
      );

      setSuccessMessage(
        "Teklif linki kopyalandı."
      );

      if (membership) {
        await loadQuotes(
          membership.company_id
        );
      }
    } catch (error) {
      console.error(error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Link kopyalanamadı."
      );
    }
  }

  async function sendWhatsApp(
    quote: Quote
  ) {
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await markAsSent(quote);

      const url =
        publicUrl(quote);

      const message =
        `Merhaba ${quote.customer_name},\n\n` +
        `size özel hazırladığımız tatil teklifini aşağıdaki bağlantıdan inceleyebilirsiniz:\n\n` +
        `${url}\n\n` +
        `Teklif No: ${quote.quote_code}\n` +
        `Toplam: ${money(Number(quote.sale_price))}`;

      const phone =
        (quote.customer_phone ?? "")
          .replace(/\D/g, "")
          .replace(/^0/, "90");

      const whatsappUrl =
        phone
          ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
          : `https://wa.me/?text=${encodeURIComponent(message)}`;

      window.open(
        whatsappUrl,
        "_blank",
        "noopener,noreferrer"
      );

      if (membership) {
        await loadQuotes(
          membership.company_id
        );
      }
    } catch (error) {
      console.error(error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "WhatsApp bağlantısı hazırlanamadı."
      );
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-10 text-white">
        Teklifler yükleniyor...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 p-5 text-white md:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-400">
              TUROBUS PACKAGE OS
            </p>

            <h1 className="mt-3 text-4xl font-black">
              Teklif Merkezi
            </h1>

            <p className="mt-3 text-slate-400">
              Satış personelinin
              oluşturduğu paket
              tekliflerini yönetin,
              WhatsApp ile gönderin ve
              müşteri kabul durumunu
              takip edin.
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/dashboard/package-os/builder"
              className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-black text-black"
            >
              + Yeni Teklif
            </Link>

            <Link
              href="/dashboard/package-os"
              className="rounded-xl border border-white/10 px-5 py-3 text-sm font-black"
            >
              Paket Merkezi
            </Link>
          </div>
        </div>

        {errorMessage && (
          <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-300">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="mt-6 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-300">
            {successMessage}
          </div>
        )}

        <div className="mt-8 grid gap-4 md:grid-cols-5">
          {[
            [
              "Toplam Teklif",
              String(stats.total),
            ],
            [
              "Gönderilen",
              String(stats.sent),
            ],
            [
              "Kabul Edilen",
              String(stats.accepted),
            ],
            [
              "Kabul Edilen Satış",
              money(
                stats.totalSales
              ),
            ],
            [
              "Brüt Kâr",
              money(
                stats.totalProfit
              ),
            ],
          ].map(
            ([label, value]) => (
              <div
                key={label}
                className="rounded-2xl border border-white/10 bg-slate-900 p-5"
              >
                <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                  {label}
                </p>

                <p className="mt-2 text-xl font-black">
                  {value}
                </p>
              </div>
            )
          )}
        </div>

        <input
          value={search}
          onChange={(event) =>
            setSearch(
              event.target.value
            )
          }
          placeholder="Müşteri, teklif kodu, telefon veya destinasyon ara..."
          className="mt-7 w-full rounded-xl border border-white/10 bg-slate-900 p-4"
        />

        <div className="mt-5 space-y-4">
          {filteredQuotes.map(
            (quote) => (
              <article
                key={quote.id}
                className="rounded-[26px] border border-white/10 bg-slate-900 p-6"
              >
                <div className="grid gap-5 xl:grid-cols-[1fr_auto]">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-xl font-black">
                        {
                          quote.customer_name
                        }
                      </h2>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${statusClass(quote.status)}`}
                      >
                        {
                          statusLabels[
                            quote.status
                          ]
                        }
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-slate-400">
                      {
                        quote.quote_code
                      }
                      {" · "}
                      {quote.destination ??
                        "Destinasyon yok"}
                    </p>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <p className="text-xs text-slate-500">
                          Tarih
                        </p>

                        <p className="mt-1 font-bold">
                          {formatDate(
                            quote.check_in
                          )}
                          {" → "}
                          {formatDate(
                            quote.check_out
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500">
                          Konaklama
                        </p>

                        <p className="mt-1 font-bold">
                          {quote.nights} gece
                          {" · "}
                          {quote.adults} yetişkin
                          {quote.children >
                          0
                            ? ` · ${quote.children} çocuk`
                            : ""}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500">
                          Satış
                        </p>

                        <p className="mt-1 font-black text-orange-400">
                          {money(
                            Number(
                              quote.sale_price
                            )
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500">
                          Brüt Kâr
                        </p>

                        <p className="mt-1 font-black text-emerald-400">
                          {money(
                            Number(
                              quote.gross_profit
                            )
                          )}
                          {" · %"}
                          {Number(
                            quote.margin_percent
                          ).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap content-start gap-2 xl:max-w-[330px] xl:justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        void sendWhatsApp(
                          quote
                        )
                      }
                      className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-black text-black"
                    >
                      WhatsApp Gönder
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        void copyLink(
                          quote
                        )
                      }
                      className="rounded-xl border border-white/10 px-4 py-3 text-sm font-black"
                    >
                      Link Kopyala
                    </button>

                    <a
                      href={`/teklif/${quote.public_token}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl border border-white/10 px-4 py-3 text-sm font-black"
                    >
                      Önizle
                    </a>

                    {quote.status ===
                      "accepted" && (
                      <button
                        type="button"
                        onClick={async () => {
                          setErrorMessage("");
                          setSuccessMessage("");

                          try {
                            const { data, error } =
                              await supabase.rpc(
                                "convert_package_quote_to_booking",
                                {
                                  p_quote_id: quote.id,
                                }
                              );

                            if (error) {
                              throw new Error(
                                error.message
                              );
                            }

                            const result = data as {
                              booking_code?: string;
                            };

                            setSuccessMessage(
                              result?.booking_code
                                ? `Rezervasyon oluşturuldu: ${result.booking_code}`
                                : "Rezervasyon oluşturuldu."
                            );

                            if (membership) {
                              await loadQuotes(
                                membership.company_id
                              );
                            }
                          } catch (error) {
                            console.error(error);

                            setErrorMessage(
                              error instanceof Error
                                ? error.message
                                : "Rezervasyon oluşturulamadı."
                            );
                          }
                        }}
                        className="rounded-xl bg-orange-500 px-4 py-3 text-sm font-black text-black"
                      >
                        Rezervasyona Çevir
                      </button>
                    )}

                    {quote.status ===
                      "converted" && (
                      <Link
                        href="/dashboard/package-os/bookings"
                        className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm font-black text-cyan-300"
                      >
                        Rezervasyonları Aç
                      </Link>
                    )}
                  </div>
                </div>
              </article>
            )
          )}

          {filteredQuotes.length ===
            0 && (
            <div className="rounded-[24px] border border-white/10 bg-slate-900 p-10 text-center text-slate-400">
              Teklif bulunamadı.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
