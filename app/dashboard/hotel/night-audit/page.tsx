"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  FaBed,
  FaCalendarCheck,
  FaCashRegister,
  FaExclamationTriangle,
  FaFileInvoiceDollar,
  FaHotel,
  FaLock,
  FaMoneyBillWave,
  FaRedo,
  FaSignInAlt,
  FaSignOutAlt,
  FaUsers,
} from "react-icons/fa";
import { supabase } from "@/lib/supabase";
import {
  CurrentMembership,
  getCurrentMembership,
} from "@/lib/current-user";
import {
  AuditHotel,
  getAuditData,
  NightAudit,
  reopenNightAudit,
  runNightAudit,
} from "@/lib/hotel/night-audit/night-audit-service";

function localDateText(): string {
  const date = new Date();

  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function firstRelation<T>(
  value: T | T[] | null | undefined
): T | null {
  if (!value) return null;

  return Array.isArray(value)
    ? value[0] ?? null
    : value;
}

function money(
  value: number,
  currency = "TRY"
): string {
  return new Intl.NumberFormat(
    "tr-TR",
    {
      style: "currency",
      currency,
    }
  ).format(Number(value || 0));
}

function formatDate(
  value: string
): string {
  return new Date(
    `${value}T00:00:00`
  ).toLocaleDateString(
    "tr-TR",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }
  );
}

export default function NightAuditPage() {
  const [membership, setMembership] =
    useState<CurrentMembership | null>(
      null
    );

  const [hotels, setHotels] =
    useState<AuditHotel[]>([]);

  const [audits, setAudits] =
    useState<NightAudit[]>([]);

  const [hotelId, setHotelId] =
    useState("");

  const [
    businessDate,
    setBusinessDate,
  ] = useState(localDateText());

  const [
    selectedAudit,
    setSelectedAudit,
  ] = useState<NightAudit | null>(
    null
  );

  const [loading, setLoading] =
    useState(true);

  const [processing, setProcessing] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const loadData = useCallback(
    async (companyId: string) => {
      const data =
        await getAuditData(companyId);

      setHotels(data.hotels);
      setAudits(data.audits);

      if (
        !hotelId &&
        data.hotels.length > 0
      ) {
        setHotelId(
          data.hotels[0].id
        );
      }
    },
    [hotelId]
  );

  useEffect(() => {
    async function initialize() {
      try {
        const {
          data: { user },
        } =
          await supabase.auth.getUser();

        if (!user) {
          throw new Error(
            "Kullanıcı oturumu bulunamadı."
          );
        }

        const currentMembership =
          await getCurrentMembership(
            user.id
          );

        if (!currentMembership) {
          throw new Error(
            "Aktif şirket üyeliği bulunamadı."
          );
        }

        setMembership(
          currentMembership
        );

        await loadData(
          currentMembership.company_id
        );
      } catch (error: unknown) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Night Audit yüklenemedi."
        );
      } finally {
        setLoading(false);
      }
    }

    void initialize();
  }, []);

  const latestAudit = useMemo(
    () =>
      audits.find(
        (audit) =>
          audit.hotel_id ===
            hotelId &&
          audit.business_date ===
            businessDate
      ) ?? null,
    [
      audits,
      businessDate,
      hotelId,
    ]
  );

  async function refresh() {
    if (!membership) return;

    await loadData(
      membership.company_id
    );
  }

  async function handleRunAudit() {
    if (
      !membership ||
      !hotelId ||
      processing
    ) {
      return;
    }

    const hotel = hotels.find(
      (item) => item.id === hotelId
    );

    const approved =
      window.confirm(
        `${hotel?.name ?? "Otel"} için ${formatDate(
          businessDate
        )} tarihli gün sonu kapatılsın mı?`
      );

    if (!approved) return;

    setProcessing(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const audit =
        await runNightAudit(
          membership.company_id,
          hotelId,
          businessDate
        );

      await refresh();

      setSelectedAudit(audit);

      setSuccessMessage(
        `${formatDate(
          businessDate
        )} tarihli gün sonu başarıyla tamamlandı.`
      );
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Gün sonu tamamlanamadı."
      );
    } finally {
      setProcessing(false);
    }
  }

  async function handleReopen(
    audit: NightAudit
  ) {
    if (
      !membership ||
      processing ||
      !window.confirm(
        `${formatDate(
          audit.business_date
        )} tarihli gün sonu yeniden açılsın mı?`
      )
    ) {
      return;
    }

    setProcessing(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await reopenNightAudit(
        membership.company_id,
        audit.id
      );

      await refresh();

      setSelectedAudit(null);

      setSuccessMessage(
        "Gün sonu yeniden açıldı."
      );
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Gün sonu açılamadı."
      );
    } finally {
      setProcessing(false);
    }
  }

  if (loading) {
    return (
      <main className="p-10 text-white">
        Night Audit yükleniyor...
      </main>
    );
  }

  return (
    <main className="px-5 py-10 lg:px-10">
      <div className="mx-auto max-w-[1700px]">
        <header>
          <p className="text-sm font-black uppercase tracking-[0.25em] text-orange-400">
            TUROS HOTEL PMS
          </p>

          <h1 className="mt-3 text-4xl font-black md:text-5xl">
            Night Audit
          </h1>

          <p className="mt-4 max-w-4xl text-slate-400">
            Günlük operasyonu, gelirleri,
            tahsilatları ve açık riskleri
            kontrol ederek işletme gününü
            güvenli şekilde kapatın.
          </p>
        </header>

        {errorMessage && (
          <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 font-bold text-red-400">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 font-bold text-emerald-400">
            {successMessage}
          </div>
        )}

        <section className="mt-8 rounded-[30px] border border-white/10 bg-slate-900 p-6">
          <div className="grid gap-4 md:grid-cols-3">
            <select
              value={hotelId}
              onChange={(event) =>
                setHotelId(
                  event.target.value
                )
              }
              className="min-h-14 rounded-2xl bg-white px-5 font-bold text-slate-950"
            >
              <option value="">
                Otel seçin
              </option>

              {hotels.map((hotel) => (
                <option
                  key={hotel.id}
                  value={hotel.id}
                >
                  {hotel.name}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={businessDate}
              onChange={(event) =>
                setBusinessDate(
                  event.target.value
                )
              }
              className="min-h-14 rounded-2xl bg-white px-5 font-bold text-slate-950"
            />

            <button
              type="button"
              disabled={
                processing ||
                !hotelId ||
                latestAudit?.status ===
                  "completed"
              }
              onClick={() =>
                void handleRunAudit()
              }
              className="flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-orange-500 px-6 font-black disabled:opacity-50"
            >
              <FaLock />

              {processing
                ? "Gün Sonu İşleniyor..."
                : latestAudit?.status ===
                    "completed"
                  ? "Gün Sonu Kapalı"
                  : "Gün Sonunu Kapat"}
            </button>
          </div>
        </section>

        {latestAudit && (
          <section className="mt-7">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-orange-400">
                  SONUÇ
                </p>

                <h2 className="mt-2 text-3xl font-black">
                  {formatDate(
                    latestAudit.business_date
                  )}
                </h2>
              </div>

              {latestAudit.status ===
                "completed" && (
                <button
                  type="button"
                  disabled={processing}
                  onClick={() =>
                    void handleReopen(
                      latestAudit
                    )
                  }
                  className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-red-500/15 px-5 font-black text-red-400"
                >
                  <FaRedo />
                  Gün Sonunu Yeniden Aç
                </button>
              )}
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {[
                {
                  label: "Aktif Rezervasyon",
                  value:
                    latestAudit.reservation_count,
                  icon:
                    FaCalendarCheck,
                },
                {
                  label: "Giriş",
                  value:
                    latestAudit.arrival_count,
                  icon: FaSignInAlt,
                },
                {
                  label: "Çıkış",
                  value:
                    latestAudit.departure_count,
                  icon: FaSignOutAlt,
                },
                {
                  label: "Konaklayan",
                  value:
                    latestAudit.in_house_count,
                  icon: FaUsers,
                },
                {
                  label: "Kirli Oda",
                  value:
                    latestAudit.dirty_room_count,
                  icon: FaBed,
                },
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <article
                    key={item.label}
                    className="rounded-3xl border border-white/10 bg-slate-900 p-5"
                  >
                    <Icon className="text-orange-400" />

                    <p className="mt-4 text-xs text-slate-500">
                      {item.label}
                    </p>

                    <p className="mt-1 text-3xl font-black">
                      {item.value}
                    </p>
                  </article>
                );
              })}
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {[
                {
                  label: "Oda Geliri",
                  value:
                    latestAudit.room_revenue,
                  icon: FaHotel,
                },
                {
                  label: "Ek Gelir",
                  value:
                    latestAudit.extra_revenue,
                  icon:
                    FaCashRegister,
                },
                {
                  label: "Tahsilat",
                  value:
                    latestAudit.payment_total,
                  icon:
                    FaMoneyBillWave,
                },
                {
                  label: "İade",
                  value:
                    latestAudit.refund_total,
                  icon:
                    FaFileInvoiceDollar,
                },
                {
                  label: "Açık Bakiye",
                  value:
                    latestAudit.outstanding_balance,
                  icon:
                    FaExclamationTriangle,
                },
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <article
                    key={item.label}
                    className="rounded-3xl border border-white/10 bg-slate-900 p-5"
                  >
                    <Icon className="text-orange-400" />

                    <p className="mt-4 text-xs text-slate-500">
                      {item.label}
                    </p>

                    <p className="mt-1 text-2xl font-black">
                      {money(item.value)}
                    </p>
                  </article>
                );
              })}
            </div>

            <section className="mt-6 rounded-[30px] border border-white/10 bg-slate-900 p-6">
              <h3 className="text-2xl font-black">
                Denetim Uyarıları
              </h3>

              <div className="mt-5 space-y-3">
                {latestAudit.warnings.map(
                  (warning, index) => (
                    <article
                      key={`${warning.type}-${index}`}
                      className={`rounded-2xl border p-4 ${
                        warning.severity ===
                        "urgent"
                          ? "border-red-500/20 bg-red-500/10 text-red-400"
                          : warning.severity ===
                              "high"
                            ? "border-orange-500/20 bg-orange-500/10 text-orange-300"
                            : "border-amber-500/20 bg-amber-500/10 text-amber-300"
                      }`}
                    >
                      <p className="font-black">
                        {warning.message}
                      </p>
                    </article>
                  )
                )}

                {latestAudit.warnings.length ===
                  0 && (
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5 font-black text-emerald-400">
                    Gün sonu kontrolünde
                    kritik uyarı bulunmadı.
                  </div>
                )}
              </div>
            </section>
          </section>
        )}

        <section className="mt-8 rounded-[30px] border border-white/10 bg-slate-900 p-6">
          <h2 className="text-2xl font-black">
            Gün Sonu Geçmişi
          </h2>

          <div className="mt-5 space-y-3">
            {audits.map((audit) => (
              <button
                key={audit.id}
                type="button"
                onClick={() =>
                  setSelectedAudit(audit)
                }
                className="flex w-full flex-col justify-between gap-4 rounded-2xl bg-slate-950 p-5 text-left md:flex-row md:items-center"
              >
                <div>
                  <p className="font-black">
                    {formatDate(
                      audit.business_date
                    )}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {firstRelation(
                      audit.hotel
                    )?.name ?? "Tüm Oteller"}
                    {" · "}
                    {audit.status}
                  </p>
                </div>

                <div className="text-right">
                  <p className="font-black text-emerald-400">
                    {money(
                      audit.room_revenue +
                        audit.extra_revenue
                    )}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {audit.warnings.length} uyarı
                  </p>
                </div>
              </button>
            ))}

            {audits.length === 0 && (
              <p className="text-slate-500">
                Henüz tamamlanmış gün sonu
                kaydı bulunmuyor.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
