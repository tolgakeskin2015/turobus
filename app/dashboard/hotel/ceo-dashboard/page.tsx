"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  FaBed,
  FaChartLine,
  FaClock,
  FaCreditCard,
  FaHotel,
  FaMoneyBillWave,
  FaPercent,
  FaSignInAlt,
  FaSignOutAlt,
  FaSync,
  FaUsers,
} from "react-icons/fa";

import { supabase } from "@/lib/supabase";

import {
  CurrentMembership,
  getCurrentMembership,
} from "@/lib/current-user";

import {
  approveRevenueRecommendation,
  CeoDashboardData,
  getCeoDashboardData,
  rejectRevenueRecommendation,
} from "@/lib/hotel/ceo-dashboard/ceo-dashboard-service";

function money(
  value: number
): string {
  return new Intl.NumberFormat(
    "tr-TR",
    {
      style: "currency",
      currency: "TRY",
      maximumFractionDigits: 0,
    }
  ).format(value || 0);
}

function percent(
  value: number
): string {
  return `%${new Intl.NumberFormat(
    "tr-TR",
    {
      maximumFractionDigits: 1,
    }
  ).format(value || 0)}`;
}

export default function CeoDashboardPage() {
  const [membership, setMembership] =
    useState<CurrentMembership | null>(
      null
    );

  const [data, setData] =
    useState<CeoDashboardData | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [pricingActionId, setPricingActionId] =
    useState("");

  const [errorMessage, setErrorMessage] =
    useState("");

  const loadData = useCallback(
    async (companyId: string) => {
      const result =
        await getCeoDashboardData(
          companyId
        );

      setData(result);
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
            : "CEO Dashboard yüklenemedi."
        );
      } finally {
        setLoading(false);
      }
    }

    void initialize();
  }, [loadData]);

  async function approvePricing(
    recommendationId: string,
    hotelId: string,
    roomTypeId: string,
    businessDate: string,
    roomType: string,
    currentRate: number,
    recommendedRate: number
  ) {
    if (
      !membership ||
      pricingActionId
    ) {
      return;
    }

    const approved =
      window.confirm(
        `${roomType}\n\nMevcut fiyat: ${money(currentRate)}\nÖnerilen fiyat: ${money(recommendedRate)}\n\nÖnerilen fiyat günlük satış fiyatına uygulansın mı?`
      );

    if (!approved) {
      return;
    }

    setPricingActionId(
      recommendationId
    );

    setErrorMessage("");

    try {
      await approveRevenueRecommendation(
        membership.company_id,
        hotelId,
        roomTypeId,
        businessDate,
        "CEO Intelligence üzerinden onaylandı."
      );

      await loadData(
        membership.company_id
      );
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Fiyat önerisi uygulanamadı."
      );
    } finally {
      setPricingActionId("");
    }
  }

  async function rejectPricing(
    recommendationId: string,
    hotelId: string,
    roomTypeId: string,
    businessDate: string,
    roomType: string
  ) {
    if (
      !membership ||
      pricingActionId
    ) {
      return;
    }

    const note =
      window.prompt(
        `${roomType} fiyat önerisi reddedilecek.\n\nİsterseniz kısa bir yönetici notu girin:`,
        "Yönetici tarafından uygun görülmedi."
      );

    if (note === null) {
      return;
    }

    setPricingActionId(
      recommendationId
    );

    setErrorMessage("");

    try {
      await rejectRevenueRecommendation(
        membership.company_id,
        hotelId,
        roomTypeId,
        businessDate,
        note
      );

      await loadData(
        membership.company_id
      );
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Fiyat önerisi reddedilemedi."
      );
    } finally {
      setPricingActionId("");
    }
  }

  async function refresh() {
    if (
      !membership ||
      refreshing
    ) {
      return;
    }

    setRefreshing(true);
    setErrorMessage("");

    try {
      await loadData(
        membership.company_id
      );
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Dashboard yenilenemedi."
      );
    } finally {
      setRefreshing(false);
    }
  }

  if (loading) {
    return (
      <main className="p-10 text-white">
        CEO Dashboard yükleniyor...
      </main>
    );
  }

  if (!data) {
    return (
      <main className="p-10 text-white">
        {errorMessage ||
          "Dashboard verisi bulunamadı."}
      </main>
    );
  }

  const cards = [
    {
      title: "Bugünkü Doluluk",
      value: percent(
        data.occupancyRate
      ),
      icon: <FaPercent />,
    },
    {
      title: "Bugünkü Oda Geliri",
      value: money(
        data.roomRevenueToday
      ),
      icon: <FaMoneyBillWave />,
    },
    {
      title: "ADR",
      value: money(data.adr),
      icon: <FaChartLine />,
    },
    {
      title: "RevPAR",
      value: money(data.revpar),
      icon: <FaChartLine />,
    },
    {
      title: "Bugünkü Check-in",
      value: String(
        data.arrivalsToday
      ),
      icon: <FaSignInAlt />,
    },
    {
      title: "Bugünkü Check-out",
      value: String(
        data.departuresToday
      ),
      icon: <FaSignOutAlt />,
    },
    {
      title: "Konaklayan",
      value: String(data.inHouse),
      icon: <FaUsers />,
    },
    {
      title: "No Show",
      value: String(data.noShow),
      icon: <FaClock />,
    },
    {
      title: "Toplam Oda",
      value: String(
        data.totalRooms
      ),
      icon: <FaBed />,
    },
    {
      title: "Dolu Oda",
      value: String(
        data.occupiedRooms
      ),
      icon: <FaHotel />,
    },
    {
      title: "Kirli Oda",
      value: String(data.dirtyRooms),
      icon: <FaBed />,
    },
    {
      title: "Bakım / OOO",
      value: String(
        data.maintenanceRooms
      ),
      icon: <FaHotel />,
    },
    {
      title: "Açık Folio",
      value: String(data.openFolios),
      icon: <FaCreditCard />,
    },
    {
      title: "Açık Bakiye",
      value: money(
        data.outstandingBalance
      ),
      icon: <FaMoneyBillWave />,
    },
    {
      title: "Bugünkü Tahsilat",
      value: money(
        data.paymentTotalToday
      ),
      icon: <FaCreditCard />,
    },
    {
      title: "30 Gün Tahmini Ciro",
      value: money(
        data.projectedRevenue30
      ),
      icon: <FaChartLine />,
    },
    {
      title: "30 Gün Tahmini Doluluk",
      value: percent(
        data.projectedOccupancy30
      ),
      icon: <FaPercent />,
    },
    {
      title: "30 Gün Tahmini Oda/Gece",
      value: String(
        data.projectedRoomNights30
      ),
      icon: <FaBed />,
    },
  ];

  return (
    <main className="px-5 py-10 lg:px-10">
      <div className="mx-auto max-w-[1800px]">
        <header className="flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.25em] text-orange-400">
              TUROBUS EXECUTIVE
            </p>

            <h1 className="mt-3 text-4xl font-black md:text-5xl">
              CEO Intelligence
            </h1>

            <p className="mt-4 max-w-4xl text-slate-400">
              Operasyon, gelir, oda,
              tahsilat ve revenue
              sinyallerini tek ekrandan
              takip edin.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              void refresh()
            }
            disabled={refreshing}
            className="flex min-h-12 items-center justify-center gap-3 rounded-2xl bg-orange-500 px-6 font-black disabled:opacity-50"
          >
            <FaSync
              className={
                refreshing
                  ? "animate-spin"
                  : ""
              }
            />
            Yenile
          </button>
        </header>

        {errorMessage && (
          <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 font-bold text-red-400">
            {errorMessage}
          </div>
        )}

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {cards.map((card) => (
            <article
              key={card.title}
              className="rounded-[26px] border border-white/10 bg-slate-900 p-5"
            >
              <div className="flex items-center gap-3 text-orange-400">
                {card.icon}
                <span className="text-xs font-black uppercase tracking-wider">
                  {card.title}
                </span>
              </div>

              <div className="mt-5 text-3xl font-black">
                {card.value}
              </div>
            </article>
          ))}
        </section>

        <section className="mt-8 rounded-[30px] border border-white/10 bg-slate-900 p-6">
          <div className="flex items-center gap-3">
            <FaChartLine className="text-orange-400" />

            <div>
              <h2 className="text-2xl font-black">
                Revenue Intelligence
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Bugünkü oda tipi bazlı
                fiyat ve doluluk önerileri.
              </p>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-500">
                  <th className="p-4">
                    Tarih
                  </th>
                  <th className="p-4">
                    Oda Tipi
                  </th>
                  <th className="p-4">
                    Doluluk
                  </th>
                  <th className="p-4">
                    Mevcut Fiyat
                  </th>
                  <th className="p-4">
                    Önerilen Fiyat
                  </th>
                  <th className="p-4">
                    Değişim
                  </th>
                  <th className="p-4">
                    Yönetim Önerisi
                  </th>
                  <th className="p-4">
                    Durum / Aksiyon
                  </th>
                </tr>
              </thead>

              <tbody>
                {data
                  .revenueRecommendations
                  .map(
                    (
                      recommendation
                    ) => (
                      <tr
                        key={
                          recommendation.id ||
                          `${recommendation.room_type_id}-${recommendation.business_date}`
                        }
                        className="border-b border-white/5"
                      >
                        <td className="p-4 whitespace-nowrap font-bold text-slate-300">
                          {new Intl.DateTimeFormat(
                            "tr-TR"
                          ).format(
                            new Date(
                              `${recommendation.business_date}T00:00:00`
                            )
                          )}
                        </td>

                        <td className="p-4 font-black">
                          {
                            recommendation.room_type_name
                          }
                        </td>

                        <td className="p-4">
                          {percent(
                            recommendation.occupancy_rate
                          )}
                        </td>

                        <td className="p-4 font-black">
                          {money(
                            recommendation.current_rate
                          )}
                        </td>

                        <td className="p-4 font-black text-emerald-400">
                          {money(
                            recommendation.recommended_rate
                          )}
                        </td>

                        <td className="p-4">
                          {recommendation.adjustment_percent >
                          0
                            ? "+"
                            : ""}
                          {
                            recommendation.adjustment_percent
                          }
                          %
                        </td>

                        <td className="p-4 text-slate-400">
                          {
                            recommendation.reason
                          }
                        </td>

                        <td className="p-4">
                          {recommendation.status ===
                          "suggested" ? (
                            <div className="flex min-w-[210px] gap-2">
                              <button
                                type="button"
                                disabled={
                                  Boolean(
                                    pricingActionId
                                  ) ||
                                  recommendation.recommended_rate <=
                                    0
                                }
                                onClick={() =>
                                  void approvePricing(
                                    recommendation.id,
                                    recommendation.hotel_id,
                                    recommendation.room_type_id,
                                    recommendation.business_date,
                                    recommendation.room_type_name,
                                    recommendation.current_rate,
                                    recommendation.recommended_rate
                                  )
                                }
                                className="min-h-10 flex-1 rounded-xl bg-emerald-500 px-3 text-xs font-black text-white disabled:opacity-40"
                              >
                                ONAYLA
                              </button>

                              <button
                                type="button"
                                disabled={
                                  Boolean(
                                    pricingActionId
                                  )
                                }
                                onClick={() =>
                                  void rejectPricing(
                                    recommendation.id,
                                    recommendation.hotel_id,
                                    recommendation.room_type_id,
                                    recommendation.business_date,
                                    recommendation.room_type_name
                                  )
                                }
                                className="min-h-10 flex-1 rounded-xl bg-red-500/15 px-3 text-xs font-black text-red-400 disabled:opacity-40"
                              >
                                REDDET
                              </button>
                            </div>
                          ) : (
                            <span
                              className={
                                recommendation.status ===
                                "approved"
                                  ? "font-black text-emerald-400"
                                  : "font-black text-red-400"
                              }
                            >
                              {recommendation.status ===
                              "approved"
                                ? "ONAYLANDI"
                                : "REDDEDİLDİ"}
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  )}
              </tbody>
            </table>

            {data
              .revenueRecommendations
              .length === 0 && (
              <div className="py-12 text-center text-slate-500">
                Yaklaşan tarihler için Revenue
                Intelligence sonucu henüz
                oluşturulmamış.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
