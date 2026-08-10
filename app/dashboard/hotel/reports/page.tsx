"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  getHotelReportData,
  type HotelInvoiceReportRow,
  type HotelMaintenanceReportRow,
  type HotelReportSummary,
  type HotelReservationReportRow,
} from "@/lib/hotel/reports/hotel-report-service";

import {
  getCurrentMembership,
  getCurrentUser,
} from "@/lib/current-user";

import { supabase } from "@/lib/supabase";

type HotelOption = {
  id: string;
  name: string;
};

function money(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
  }).format(Number(value || 0));
}

function date(value: string) {
  return new Intl.DateTimeFormat(
    "tr-TR",
    {
      dateStyle: "short",
      timeStyle: "short",
    }
  ).format(new Date(value));
}

const emptySummary: HotelReportSummary = {
  totalReservations: 0,
  activeReservations: 0,
  checkedIn: 0,
  checkedOut: 0,
  totalRevenue: 0,
  totalPayments: 0,
  openMaintenance: 0,
  urgentMaintenance: 0,
  issuedInvoices: 0,
  invoiceRevenue: 0,
};

export default function HotelReportsPage() {
  const [companyId, setCompanyId] =
    useState("");

  const [hotelId, setHotelId] =
    useState("");

  const [hotels, setHotels] = useState<
    HotelOption[]
  >([]);

  const [summary, setSummary] =
    useState<HotelReportSummary>(
      emptySummary
    );

  const [reservations, setReservations] =
    useState<
      HotelReservationReportRow[]
    >([]);

  const [maintenance, setMaintenance] =
    useState<
      HotelMaintenanceReportRow[]
    >([]);

  const [invoices, setInvoices] =
    useState<
      HotelInvoiceReportRow[]
    >([]);

  const [loading, setLoading] =
    useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const load = useCallback(
    async (
      nextCompanyId?: string,
      nextHotelId?: string
    ) => {
      try {
        setLoading(true);
        setErrorMessage("");

        let cId =
          nextCompanyId || companyId;

        let hId =
          nextHotelId || hotelId;

        if (!cId) {
          const user =
            await getCurrentUser();

          if (!user) {
            throw new Error(
              "Oturum bulunamadı."
            );
          }

          const membership =
            await getCurrentMembership(
              user.id
            );

          if (!membership) {
            throw new Error(
              "Firma üyeliği bulunamadı."
            );
          }

          cId =
            membership.company_id;

          const { data, error } =
            await supabase
              .from("hotels")
              .select("id, name")
              .eq(
                "company_id",
                cId
              )
              .order(
                "created_at",
                {
                  ascending: true,
                }
              );

          if (error) throw error;

          const hotelList =
            (data ??
              []) as HotelOption[];

          if (!hotelList.length) {
            throw new Error(
              "Otel bulunamadı."
            );
          }

          setHotels(hotelList);

          hId =
            hotelList[0].id;

          setCompanyId(cId);
          setHotelId(hId);
        }

        if (!cId || !hId) {
          return;
        }

        const report =
          await getHotelReportData(
            cId,
            hId
          );

        setSummary(
          report.summary
        );

        setReservations(
          report.reservations
        );

        setMaintenance(
          report.maintenance
        );

        setInvoices(
          report.invoices
        );
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Rapor yüklenemedi."
        );
      } finally {
        setLoading(false);
      }
    },
    [companyId, hotelId]
  );

  useEffect(() => {
    void load();
  }, []);

  async function changeHotel(
    nextHotelId: string
  ) {
    setHotelId(nextHotelId);

    await load(
      companyId,
      nextHotelId
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 p-5 text-white lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-400">
              TUROBUS HOTEL PMS
            </p>

            <h1 className="mt-2 text-3xl font-black">
              Otel Rapor Merkezi
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Rezervasyon, tahsilat,
              fatura ve operasyon
              performansını tek ekrandan
              izle.
            </p>
          </div>

          <select
            value={hotelId}
            onChange={(event) =>
              void changeHotel(
                event.target.value
              )
            }
            className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 font-bold"
          >
            {hotels.map((hotel) => (
              <option
                key={hotel.id}
                value={hotel.id}
              >
                {hotel.name}
              </option>
            ))}
          </select>
        </header>

        {errorMessage && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-300">
            {errorMessage}
          </div>
        )}

        {loading ? (
          <div className="rounded-[28px] border border-slate-800 bg-slate-900 p-12 text-center text-slate-500">
            Raporlar hazırlanıyor...
          </div>
        ) : (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <Stat
                label="Rezervasyon"
                value={String(
                  summary.totalReservations
                )}
              />

              <Stat
                label="Aktif"
                value={String(
                  summary.activeReservations
                )}
              />

              <Stat
                label="Check-in"
                value={String(
                  summary.checkedIn
                )}
              />

              <Stat
                label="Check-out"
                value={String(
                  summary.checkedOut
                )}
              />

              <Stat
                label="Rezervasyon Cirosu"
                value={money(
                  summary.totalRevenue
                )}
              />

              <Stat
                label="Tahsilat"
                value={money(
                  summary.totalPayments
                )}
              />

              <Stat
                label="Açık Bakım"
                value={String(
                  summary.openMaintenance
                )}
              />

              <Stat
                label="Acil Bakım"
                value={String(
                  summary.urgentMaintenance
                )}
              />

              <Stat
                label="Kesilmiş Fatura"
                value={String(
                  summary.issuedInvoices
                )}
              />

              <Stat
                label="Fatura Cirosu"
                value={money(
                  summary.invoiceRevenue
                )}
              />
            </section>

            <ReportSection
              title="Son Rezervasyonlar"
            >
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="pb-3">
                      Tarih
                    </th>
                    <th className="pb-3">
                      Durum
                    </th>
                    <th className="pb-3 text-right">
                      Tutar
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {reservations
                    .slice(0, 10)
                    .map((item) => (
                      <tr
                        key={item.id}
                        className="border-t border-slate-800"
                      >
                        <td className="py-3">
                          {date(
                            item.created_at
                          )}
                        </td>

                        <td className="py-3 font-bold">
                          {item.status}
                        </td>

                        <td className="py-3 text-right font-black">
                          {money(
                            item.total_price
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </ReportSection>

            <div className="grid gap-6 xl:grid-cols-2">
              <ReportSection
                title="Bakım & Arıza"
              >
                <div className="space-y-3">
                  {maintenance
                    .slice(0, 8)
                    .map((item) => (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-slate-800 bg-slate-950 p-4"
                      >
                        <div className="flex justify-between gap-4">
                          <div>
                            <p className="text-xs font-black text-orange-400">
                              {
                                item.request_no
                              }
                            </p>

                            <p className="mt-1 font-black">
                              {item.title}
                            </p>
                          </div>

                          <div className="text-right text-xs">
                            <p>
                              {
                                item.priority
                              }
                            </p>

                            <p className="mt-1 text-slate-500">
                              {
                                item.status
                              }
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </ReportSection>

              <ReportSection
                title="Son Faturalar"
              >
                <div className="space-y-3">
                  {invoices
                    .slice(0, 8)
                    .map((item) => (
                      <div
                        key={item.id}
                        className="flex justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950 p-4"
                      >
                        <div>
                          <p className="font-black">
                            {
                              item.invoice_no
                            }
                          </p>

                          <p className="mt-1 text-sm text-slate-500">
                            {
                              item.customer_name
                            }
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="font-black">
                            {money(
                              item.grand_total
                            )}
                          </p>

                          <p className="mt-1 text-xs uppercase text-slate-500">
                            {item.status}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </ReportSection>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[24px] border border-slate-800 bg-slate-900 p-5">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
        {label}
      </p>

      <p className="mt-3 text-2xl font-black">
        {value}
      </p>
    </div>
  );
}

function ReportSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-x-auto rounded-[28px] border border-slate-800 bg-slate-900 p-6">
      <h2 className="mb-5 text-xl font-black">
        {title}
      </h2>

      {children}
    </section>
  );
}
