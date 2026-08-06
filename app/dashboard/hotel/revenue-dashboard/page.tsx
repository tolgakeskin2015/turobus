"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  FaBed,
  FaCalendarAlt,
  FaCashRegister,
  FaChartLine,
  FaCreditCard,
  FaHotel,
  FaMoneyBillWave,
  FaPercent,
  FaSync,
} from "react-icons/fa";
import { supabase } from "@/lib/supabase";
import {
  CurrentMembership,
  getCurrentMembership,
} from "@/lib/current-user";
import {
  getRevenueData,
  RevenueCharge,
  RevenueData,
  RevenuePayment,
  RevenueReservation,
} from "@/lib/hotel/revenue-dashboard/revenue-dashboard-service";

type DailyMetric = {
  date: string;
  soldRoomNights: number;
  availableRoomNights: number;
  roomRevenue: number;
  extraRevenue: number;
  payments: number;
  refunds: number;
};

function localDateText(
  date: Date = new Date()
): string {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function addDays(
  value: string,
  amount: number
): string {
  const date = new Date(
    `${value}T00:00:00`
  );

  date.setDate(
    date.getDate() + amount
  );

  return localDateText(date);
}

function dateDifference(
  start: string,
  end: string
): number {
  return Math.max(
    0,
    Math.round(
      (
        new Date(
          `${end}T00:00:00`
        ).getTime() -
        new Date(
          `${start}T00:00:00`
        ).getTime()
      ) / 86400000
    )
  );
}

function createDateRange(
  startDate: string,
  endDate: string
): string[] {
  const dates: string[] = [];

  let cursor = startDate;

  while (cursor <= endDate) {
    dates.push(cursor);
    cursor = addDays(cursor, 1);
  }

  return dates;
}

function reservationCoversDate(
  reservation: RevenueReservation,
  date: string
): boolean {
  return (
    reservation.check_in <= date &&
    reservation.check_out > date
  );
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
      maximumFractionDigits: 2,
    }
  ).format(Number(value || 0));
}

function numberText(
  value: number,
  digits = 0
): string {
  return new Intl.NumberFormat(
    "tr-TR",
    {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }
  ).format(Number(value || 0));
}

function percentage(
  value: number
): string {
  return `%${numberText(value, 1)}`;
}

function categoryLabel(
  category: string
): string {
  const labels: Record<string, string> = {
    accommodation: "Konaklama",
    restaurant: "Restoran",
    bar: "Bar",
    minibar: "Minibar",
    spa: "SPA",
    transfer: "Transfer",
    tour: "Tur",
    laundry: "Çamaşır",
    room_service: "Oda Servisi",
    late_checkout: "Geç Çıkış",
    early_checkin: "Erken Giriş",
    tax: "Vergi",
    discount: "İndirim",
    other: "Diğer",
  };

  return labels[category] ?? category;
}

function sourceLabel(
  source: string
): string {
  const labels: Record<string, string> = {
    direct: "Doğrudan",
    website: "Web Sitesi",
    booking: "Booking.com",
    expedia: "Expedia",
    hotelbeds: "Hotelbeds",
    ets: "ETS",
    jolly: "Jolly",
    tatilliyoruz: "Tatilliyoruz",
    manual: "Manuel",
  };

  return labels[source] ?? source;
}

export default function RevenueDashboardPage() {
  const [membership, setMembership] =
    useState<CurrentMembership | null>(
      null
    );

  const [data, setData] =
    useState<RevenueData>({
      hotels: [],
      roomTypes: [],
      reservations: [],
      charges: [],
      payments: [],
    });

  const [startDate, setStartDate] =
    useState(
      addDays(localDateText(), -29)
    );

  const [endDate, setEndDate] =
    useState(localDateText());

  const [hotelId, setHotelId] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const loadData = useCallback(
    async (
      companyId: string,
      fromDate: string,
      toDate: string
    ) => {
      const result =
        await getRevenueData(
          companyId,
          fromDate,
          toDate
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
          currentMembership.company_id,
          startDate,
          endDate
        );
      } catch (error: unknown) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Revenue Dashboard yüklenemedi."
        );
      } finally {
        setLoading(false);
      }
    }

    void initialize();
  }, []);

  async function refresh() {
    if (!membership || refreshing) {
      return;
    }

    if (endDate < startDate) {
      setErrorMessage(
        "Bitiş tarihi başlangıç tarihinden önce olamaz."
      );

      return;
    }

    setRefreshing(true);
    setErrorMessage("");

    try {
      await loadData(
        membership.company_id,
        startDate,
        endDate
      );
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Revenue verileri yenilenemedi."
      );
    } finally {
      setRefreshing(false);
    }
  }

  const filteredReservations =
    useMemo(
      () =>
        data.reservations.filter(
          (reservation) =>
            !hotelId ||
            reservation.hotel_id ===
              hotelId
        ),
      [data.reservations, hotelId]
    );

  const filteredRoomTypes =
    useMemo(
      () =>
        data.roomTypes.filter(
          (roomType) =>
            !hotelId ||
            roomType.hotel_id ===
              hotelId
        ),
      [data.roomTypes, hotelId]
    );

  const filteredCharges =
    useMemo(
      () =>
        data.charges.filter(
          (charge) =>
            !hotelId ||
            charge.hotel_id ===
              hotelId
        ),
      [data.charges, hotelId]
    );

  const filteredPayments =
    useMemo(
      () =>
        data.payments.filter(
          (payment) =>
            !hotelId ||
            payment.hotel_id ===
              hotelId
        ),
      [data.payments, hotelId]
    );

  const dates = useMemo(
    () =>
      createDateRange(
        startDate,
        endDate
      ),
    [endDate, startDate]
  );

  const totalRooms = useMemo(
    () =>
      filteredRoomTypes.reduce(
        (total, roomType) =>
          total +
          Math.max(
            0,
            Number(
              roomType.total_rooms ?? 0
            )
          ),
        0
      ),
    [filteredRoomTypes]
  );

  const activeReservations =
    useMemo(
      () =>
        filteredReservations.filter(
          (reservation) =>
            ![
              "cancelled",
              "no_show",
            ].includes(
              reservation.status
            )
        ),
      [filteredReservations]
    );

  const dailyMetrics = useMemo(() => {
    return dates.map(
      (date): DailyMetric => {
        const dailyReservations =
          activeReservations.filter(
            (reservation) =>
              reservationCoversDate(
                reservation,
                date
              )
          );

        const soldRoomNights =
          dailyReservations.length;

        const roomRevenue =
          dailyReservations.reduce(
            (total, reservation) => {
              const reservationNights =
                Math.max(
                  1,
                  Number(
                    reservation.nights
                  ) ||
                    dateDifference(
                      reservation.check_in,
                      reservation.check_out
                    ) ||
                    1
                );

              return (
                total +
                Number(
                  reservation.total_price ??
                    0
                ) /
                  reservationNights
              );
            },
            0
          );

        const extraRevenue =
          filteredCharges
            .filter(
              (charge) =>
                charge.charge_date ===
                date
            )
            .reduce(
              (total, charge) =>
                total +
                Number(
                  charge.total_amount ??
                    0
                ),
              0
            );

        const dayPayments =
          filteredPayments.filter(
            (payment) =>
              payment.payment_date.slice(
                0,
                10
              ) === date
          );

        const payments =
          dayPayments
            .filter(
              (payment) =>
                payment.transaction_type ===
                "payment"
            )
            .reduce(
              (total, payment) =>
                total +
                Number(
                  payment.base_amount ??
                    0
                ),
              0
            );

        const refunds =
          dayPayments
            .filter(
              (payment) =>
                payment.transaction_type ===
                "refund"
            )
            .reduce(
              (total, payment) =>
                total +
                Number(
                  payment.base_amount ??
                    0
                ),
              0
            );

        return {
          date,
          soldRoomNights,
          availableRoomNights:
            totalRooms,
          roomRevenue,
          extraRevenue,
          payments,
          refunds,
        };
      }
    );
  }, [
    activeReservations,
    dates,
    filteredCharges,
    filteredPayments,
    totalRooms,
  ]);

  const totals = useMemo(() => {
    const soldRoomNights =
      dailyMetrics.reduce(
        (total, item) =>
          total +
          item.soldRoomNights,
        0
      );

    const availableRoomNights =
      dailyMetrics.reduce(
        (total, item) =>
          total +
          item.availableRoomNights,
        0
      );

    const roomRevenue =
      dailyMetrics.reduce(
        (total, item) =>
          total +
          item.roomRevenue,
        0
      );

    const extraRevenue =
      dailyMetrics.reduce(
        (total, item) =>
          total +
          item.extraRevenue,
        0
      );

    const payments =
      dailyMetrics.reduce(
        (total, item) =>
          total + item.payments,
        0
      );

    const refunds =
      dailyMetrics.reduce(
        (total, item) =>
          total + item.refunds,
        0
      );

    const occupancy =
      availableRoomNights > 0
        ? (
            soldRoomNights /
            availableRoomNights
          ) * 100
        : 0;

    const adr =
      soldRoomNights > 0
        ? roomRevenue /
          soldRoomNights
        : 0;

    const revPar =
      availableRoomNights > 0
        ? roomRevenue /
          availableRoomNights
        : 0;

    const outstandingBalance =
      activeReservations.reduce(
        (total, reservation) =>
          total +
          Math.max(
            0,
            Number(
              reservation.balance ?? 0
            )
          ),
        0
      );

    return {
      soldRoomNights,
      availableRoomNights,
      roomRevenue,
      extraRevenue,
      grossRevenue:
        roomRevenue + extraRevenue,
      payments,
      refunds,
      netCollection:
        payments - refunds,
      occupancy,
      adr,
      revPar,
      outstandingBalance,
      reservationCount:
        activeReservations.length,
      cancellationCount:
        filteredReservations.filter(
          (reservation) =>
            reservation.status ===
              "cancelled" ||
            reservation.status ===
              "no_show"
        ).length,
    };
  }, [
    activeReservations,
    dailyMetrics,
    filteredReservations,
  ]);

  const sourceBreakdown = useMemo(() => {
    const result = new Map<
      string,
      {
        count: number;
        revenue: number;
      }
    >();

    for (const reservation of activeReservations) {
      const current =
        result.get(
          reservation.source
        ) ?? {
          count: 0,
          revenue: 0,
        };

      current.count += 1;

      current.revenue += Number(
        reservation.total_price ?? 0
      );

      result.set(
        reservation.source,
        current
      );
    }

    return Array.from(
      result.entries()
    )
      .map(([source, values]) => ({
        source,
        ...values,
      }))
      .sort(
        (first, second) =>
          second.revenue -
          first.revenue
      );
  }, [activeReservations]);

  const categoryBreakdown =
    useMemo(() => {
      const result = new Map<
        string,
        number
      >();

      for (const charge of filteredCharges) {
        result.set(
          charge.category,
          (
            result.get(
              charge.category
            ) ?? 0
          ) +
            Number(
              charge.total_amount ?? 0
            )
        );
      }

      return Array.from(
        result.entries()
      )
        .map(
          ([category, revenue]) => ({
            category,
            revenue,
          })
        )
        .sort(
          (first, second) =>
            second.revenue -
            first.revenue
        );
    }, [filteredCharges]);

  const maxDailyRevenue = useMemo(
    () =>
      Math.max(
        1,
        ...dailyMetrics.map(
          (item) =>
            item.roomRevenue +
            item.extraRevenue
        )
      ),
    [dailyMetrics]
  );

  if (loading) {
    return (
      <main className="p-10 text-white">
        Revenue Dashboard yükleniyor...
      </main>
    );
  }

  return (
    <main className="px-5 py-10 lg:px-10">
      <div className="mx-auto max-w-[1800px]">
        <header className="flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.25em] text-orange-400">
              TUROS HOTEL PMS
            </p>

            <h1 className="mt-3 text-4xl font-black md:text-5xl">
              Revenue Dashboard
            </h1>

            <p className="mt-4 max-w-4xl text-slate-400">
              Doluluk, ADR, RevPAR,
              gelir, tahsilat ve kanal
              performansını tek ekrandan
              takip edin.
            </p>
          </div>

          <button
            type="button"
            disabled={refreshing}
            onClick={() =>
              void refresh()
            }
            className="flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-orange-500 px-7 font-black disabled:opacity-50"
          >
            <FaSync
              className={
                refreshing
                  ? "animate-spin"
                  : ""
              }
            />

            Verileri Yenile
          </button>
        </header>

        {errorMessage && (
          <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 font-bold text-red-400">
            {errorMessage}
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
                Tüm oteller
              </option>

              {data.hotels.map(
                (hotel) => (
                  <option
                    key={hotel.id}
                    value={hotel.id}
                  >
                    {hotel.name}
                  </option>
                )
              )}
            </select>

            <input
              type="date"
              value={startDate}
              onChange={(event) =>
                setStartDate(
                  event.target.value
                )
              }
              className="min-h-14 rounded-2xl bg-white px-5 font-bold text-slate-950"
            />

            <input
              type="date"
              value={endDate}
              onChange={(event) =>
                setEndDate(
                  event.target.value
                )
              }
              className="min-h-14 rounded-2xl bg-white px-5 font-bold text-slate-950"
            />
          </div>
        </section>

        <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
          {[
            {
              label: "Doluluk",
              value: percentage(
                totals.occupancy
              ),
              icon: FaPercent,
            },
            {
              label: "ADR",
              value: money(
                totals.adr
              ),
              icon: FaBed,
            },
            {
              label: "RevPAR",
              value: money(
                totals.revPar
              ),
              icon: FaChartLine,
            },
            {
              label: "Oda Geliri",
              value: money(
                totals.roomRevenue
              ),
              icon: FaHotel,
            },
            {
              label: "Ek Gelir",
              value: money(
                totals.extraRevenue
              ),
              icon:
                FaCashRegister,
            },
            {
              label: "Toplam Gelir",
              value: money(
                totals.grossRevenue
              ),
              icon:
                FaMoneyBillWave,
            },
            {
              label: "Net Tahsilat",
              value: money(
                totals.netCollection
              ),
              icon: FaCreditCard,
            },
            {
              label: "Açık Bakiye",
              value: money(
                totals.outstandingBalance
              ),
              icon:
                FaCalendarAlt,
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

                <p className="mt-2 text-xl font-black">
                  {item.value}
                </p>
              </article>
            );
          })}
        </section>

        <section className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(360px,1fr)]">
          <article className="rounded-[30px] border border-white/10 bg-slate-900 p-6">
            <div>
              <h2 className="text-2xl font-black">
                Günlük Gelir Performansı
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Oda ve ek gelirlerin gün
                bazında dağılımı.
              </p>
            </div>

            <div className="mt-7 max-h-[520px] space-y-4 overflow-y-auto pr-2">
              {dailyMetrics.map(
                (item) => {
                  const gross =
                    item.roomRevenue +
                    item.extraRevenue;

                  const width = Math.max(
                    2,
                    (
                      gross /
                      maxDailyRevenue
                    ) * 100
                  );

                  const dailyOccupancy =
                    item.availableRoomNights >
                    0
                      ? (
                          item.soldRoomNights /
                          item.availableRoomNights
                        ) * 100
                      : 0;

                  return (
                    <div
                      key={item.date}
                      className="rounded-2xl bg-slate-950 p-4"
                    >
                      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                        <div>
                          <p className="font-black">
                            {new Date(
                              `${item.date}T00:00:00`
                            ).toLocaleDateString(
                              "tr-TR",
                              {
                                day: "2-digit",
                                month: "short",
                                weekday:
                                  "short",
                              }
                            )}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {
                              item.soldRoomNights
                            }{" "}
                            oda gecesi ·{" "}
                            {percentage(
                              dailyOccupancy
                            )}{" "}
                            doluluk
                          </p>
                        </div>

                        <p className="text-lg font-black text-emerald-400">
                          {money(gross)}
                        </p>
                      </div>

                      <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/5">
                        <div
                          className="h-full rounded-full bg-orange-500"
                          style={{
                            width: `${width}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </article>

          <article className="rounded-[30px] border border-white/10 bg-slate-900 p-6">
            <h2 className="text-2xl font-black">
              Operasyon Özeti
            </h2>

            <div className="mt-6 space-y-4">
              {[
                {
                  label:
                    "Aktif rezervasyon",
                  value:
                    totals.reservationCount,
                },
                {
                  label:
                    "Satılan oda gecesi",
                  value:
                    totals.soldRoomNights,
                },
                {
                  label:
                    "Satılabilir oda gecesi",
                  value:
                    totals.availableRoomNights,
                },
                {
                  label:
                    "İptal / No Show",
                  value:
                    totals.cancellationCount,
                },
                {
                  label: "Tahsilat",
                  value: money(
                    totals.payments
                  ),
                },
                {
                  label: "İadeler",
                  value: money(
                    totals.refunds
                  ),
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-2xl bg-slate-950 p-4"
                >
                  <span className="text-sm text-slate-500">
                    {item.label}
                  </span>

                  <span className="font-black">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="mt-7 grid gap-6 xl:grid-cols-2">
          <article className="rounded-[30px] border border-white/10 bg-slate-900 p-6">
            <h2 className="text-2xl font-black">
              Kanal Performansı
            </h2>

            <div className="mt-6 space-y-3">
              {sourceBreakdown.map(
                (item) => {
                  const share =
                    totals.grossRevenue >
                    0
                      ? (
                          item.revenue /
                          totals.grossRevenue
                        ) * 100
                      : 0;

                  return (
                    <div
                      key={item.source}
                      className="rounded-2xl bg-slate-950 p-4"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-black">
                            {sourceLabel(
                              item.source
                            )}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {item.count} rezervasyon
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="font-black text-emerald-400">
                            {money(
                              item.revenue
                            )}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {percentage(
                              share
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                }
              )}

              {sourceBreakdown.length ===
                0 && (
                <p className="text-slate-500">
                  Kanal verisi bulunmuyor.
                </p>
              )}
            </div>
          </article>

          <article className="rounded-[30px] border border-white/10 bg-slate-900 p-6">
            <h2 className="text-2xl font-black">
              Ek Gelir Dağılımı
            </h2>

            <div className="mt-6 space-y-3">
              {categoryBreakdown.map(
                (item) => {
                  const share =
                    totals.extraRevenue >
                    0
                      ? (
                          item.revenue /
                          totals.extraRevenue
                        ) * 100
                      : 0;

                  return (
                    <div
                      key={item.category}
                      className="rounded-2xl bg-slate-950 p-4"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-black">
                            {categoryLabel(
                              item.category
                            )}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {percentage(
                              share
                            )} pay
                          </p>
                        </div>

                        <p className="font-black text-orange-400">
                          {money(
                            item.revenue
                          )}
                        </p>
                      </div>
                    </div>
                  );
                }
              )}

              {categoryBreakdown.length ===
                0 && (
                <p className="text-slate-500">
                  Ek gelir hareketi
                  bulunmuyor.
                </p>
              )}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
