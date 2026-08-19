"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useParams,
} from "next/navigation";

import {
  FaAnchor,
  FaCalendarAlt,
  FaChartLine,
  FaCheck,
  FaCheckCircle,
  FaClock,
  FaCoins,
  FaExclamationTriangle,
  FaFilter,
  FaHandshake,
  FaHistory,
  FaMoneyBillWave,
  FaSave,
  FaSearch,
  FaShip,
  FaTimes,
  FaUserTie,
  FaUsers,
  FaWallet,
} from "react-icons/fa";

import {
  supabase,
} from "@/lib/supabase";


type Yacht = {
  id: string;
  name: string;
  type: string;
  city: string;
  marina:
    string | null;
  status: string;
  max_guests: number;
  cabins: number;
  captain_name:
    string | null;
  base_daily_price: number;
  currency: string;
};


type Booking = {
  id: string;
  booking_code: string;
  guest_name: string;
  guest_phone:
    string | null;
  guest_count: number;
  start_date: string;
  end_date: string;
  status: string;
  payment_status: string;
  operation_status: string;
  total_amount: number;
  paid_amount: number;
  supplier_cost: number;
  commission_amount: number;
  currency: string;
  yacht_id: string;
  yacht_name: string;
};


type Availability = {
  id: string;
  yacht_id: string;
  day: string;
  status: string;
  price:
    number | null;
  note:
    string | null;
  booking_id:
    string | null;
};


type Settlement = {
  id: string;
  settlement_code: string;
  period_start: string;
  period_end: string;
  gross_sales: number;
  supplier_payable: number;
  platform_commission: number;
  adjustments: number;
  paid_amount: number;
  status: string;
  due_date:
    string | null;
  paid_at:
    string | null;
  currency: string;
};


type Payment = {
  id: string;
  amount: number;
  currency: string;
  payment_method: string;
  reference_no:
    string | null;
  note:
    string | null;
  paid_at: string;
  settlement_id:
    string | null;
};


type PortalEvent = {
  id: string;
  event_type: string;
  yacht_id:
    string | null;
  booking_id:
    string | null;
  created_at: string;
};


type Portal = {
  supplier: {
    id: string;
    name: string;
    contact_name:
      string | null;
    phone:
      string | null;
    email:
      string | null;
    commission_rate: number;
    current_balance: number;
    rating:
      number | null;
    status: string;
  };

  summary: {
    gross_sales: number;
    supplier_payable: number;
    paid_amount: number;
    booking_count: number;
    pending_bookings: number;
  };

  yachts:
    Yacht[];

  bookings:
    Booking[];

  availability:
    Availability[];

  settlements:
    Settlement[];

  payments:
    Payment[];

  events:
    PortalEvent[];
};


type Section =
  | "overview"
  | "reservations"
  | "calendar"
  | "fleet"
  | "settlements"
  | "payments"
  | "activity";


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
  value:
    string | null
) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "tr-TR",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  ).format(
    new Date(
      `${value}T12:00:00`
    )
  );
}


function dateTime(
  value:
    string | null
) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "tr-TR",
    {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(
    new Date(value)
  );
}


function operationLabel(
  value: string
) {
  const map:
    Record<
      string,
      string
    > = {
      preparing:
        "Hazırlanıyor",

      ready:
        "Tekne Hazır",

      guest_arrived:
        "Misafir Geldi",

      departed:
        "Çıkış Yapıldı",

      cruising:
        "Seyirde",

      returning:
        "Dönüşte",

      completed:
        "Tamamlandı",

      cancelled:
        "İptal",
    };

  return (
    map[value] ??
    value
  );
}


function bookingLabel(
  value: string
) {
  const map:
    Record<
      string,
      string
    > = {
      pending:
        "Onay Bekliyor",

      confirmed:
        "Onaylandı",

      completed:
        "Tamamlandı",

      cancelled:
        "Reddedildi / İptal",
    };

  return (
    map[value] ??
    value
  );
}


function statusTone(
  value: string
) {
  if (
    value === "confirmed" ||
    value === "completed" ||
    value === "paid" ||
    value === "available"
  ) {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
  }

  if (
    value === "pending" ||
    value === "option" ||
    value === "waiting_approval"
  ) {
    return "border-amber-500/20 bg-amber-500/10 text-amber-300";
  }

  if (
    value === "cancelled" ||
    value === "maintenance" ||
    value === "blocked"
  ) {
    return "border-red-500/20 bg-red-500/10 text-red-300";
  }

  return "border-blue-500/20 bg-blue-500/10 text-blue-300";
}


function daysFromToday(
  count: number
) {
  const output:
    string[] = [];

  for (
    let i = 0;
    i < count;
    i += 1
  ) {
    const date =
      new Date();

    date.setHours(
      12,
      0,
      0,
      0
    );

    date.setDate(
      date.getDate() +
        i
    );

    output.push(
      date
        .toISOString()
        .slice(
          0,
          10
        )
    );
  }

  return output;
}


export default function YachtSupplierPage() {
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
    portal,
    setPortal,
  ] =
    useState<
      Portal | null
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
    section,
    setSection,
  ] =
    useState<Section>(
      "overview"
    );

  const [
    query,
    setQuery,
  ] =
    useState("");

  const [
    bookingFilter,
    setBookingFilter,
  ] =
    useState("all");

  const [
    selectedYacht,
    setSelectedYacht,
  ] =
    useState("");

  const [
    priceDrafts,
    setPriceDrafts,
  ] =
    useState<
      Record<
        string,
        string
      >
    >({});

  const [
    calendarModal,
    setCalendarModal,
  ] =
    useState<{
      yachtId: string;
      day: string;
    } | null>(
      null
    );

  const [
    calendarStatus,
    setCalendarStatus,
  ] =
    useState(
      "available"
    );

  const [
    calendarPrice,
    setCalendarPrice,
  ] =
    useState("");

  const [
    calendarNote,
    setCalendarNote,
  ] =
    useState("");

  const [
    notice,
    setNotice,
  ] =
    useState("");

  const [
    error,
    setError,
  ] =
    useState("");


  const days =
    useMemo(
      () =>
        daysFromToday(
          14
        ),
      []
    );


  const load =
    useCallback(
      async () => {
        if (!token) {
          return;
        }

        const {
          data,
          error:
            requestError,
        } =
          await supabase.rpc(
            "get_public_yacht_supplier_portal",
            {
              p_token:
                token,
            }
          );

        if (
          requestError ||
          !data
        ) {
          setPortal(
            null
          );

          setError(
            requestError?.message ??
            "Partner portalı bulunamadı."
          );

          return;
        }

        const next =
          data as
            Portal;

        setPortal(
          next
        );

        setPriceDrafts(
          Object.fromEntries(
            next.yachts.map(
              (
                yacht
              ) => [
                yacht.id,
                String(
                  yacht.base_daily_price
                ),
              ]
            )
          )
        );

        if (
          !selectedYacht &&
          next.yachts[0]
        ) {
          setSelectedYacht(
            next.yachts[0].id
          );
        }
      },
      [
        token,
        selectedYacht,
      ]
    );


  useEffect(
    () => {
      async function boot() {
        setLoading(true);

        await load();

        setLoading(false);
      }

      void boot();
    },
    [
      load,
    ]
  );


  function toast(
    message: string
  ) {
    setNotice(
      message
    );

    window.setTimeout(
      () =>
        setNotice(""),
      2300
    );
  }


  async function run(
    callback:
      () =>
        Promise<void>,
    success:
      string
  ) {
    setSaving(true);
    setError("");

    try {
      await callback();

      await load();

      toast(
        success
      );
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
    } finally {
      setSaving(false);
    }
  }


  async function saveBasePrice(
    yacht:
      Yacht
  ) {
    const price =
      Number(
        priceDrafts[
          yacht.id
        ]
      );

    if (
      !Number.isFinite(
        price
      ) ||
      price < 0
    ) {
      setError(
        "Geçerli fiyat gir."
      );

      return;
    }

    await run(
      async () => {
        const {
          error:
            requestError,
        } =
          await supabase.rpc(
            "yacht_supplier_update_base_price",
            {
              p_token:
                token,

              p_yacht_id:
                yacht.id,

              p_price:
                price,
            }
          );

        if (
          requestError
        ) {
          throw requestError;
        }
      },
      `${yacht.name} fiyatı güncellendi.`
    );
  }


  async function bookingDecision(
    booking:
      Booking,
    decision:
      "confirmed" |
      "cancelled"
  ) {
    await run(
      async () => {
        const {
          error:
            requestError,
        } =
          await supabase.rpc(
            "yacht_supplier_booking_decision",
            {
              p_token:
                token,

              p_booking_id:
                booking.id,

              p_decision:
                decision,
            }
          );

        if (
          requestError
        ) {
          throw requestError;
        }
      },
      decision ===
      "confirmed"
        ? "Rezervasyon onaylandı."
        : "Rezervasyon reddedildi."
    );
  }


  async function updateOperation(
    booking:
      Booking,
    status: string
  ) {
    await run(
      async () => {
        const {
          error:
            requestError,
        } =
          await supabase.rpc(
            "yacht_supplier_update_operation",
            {
              p_token:
                token,

              p_booking_id:
                booking.id,

              p_status:
                status,
            }
          );

        if (
          requestError
        ) {
          throw requestError;
        }
      },
      `Operasyon: ${operationLabel(
        status
      )}`
    );
  }


  function openCalendar(
    yachtId: string,
    day: string
  ) {
    if (!portal) {
      return;
    }

    const row =
      portal.availability.find(
        (
          item
        ) =>
          item.yacht_id ===
            yachtId &&
          item.day === day
      );

    if (
      row?.booking_id
    ) {
      toast(
        "Bu tarih rezervasyon nedeniyle kilitli."
      );

      return;
    }

    setCalendarModal({
      yachtId,
      day,
    });

    setCalendarStatus(
      row?.status ??
      "available"
    );

    setCalendarPrice(
      row?.price != null
        ? String(
            row.price
          )
        : ""
    );

    setCalendarNote(
      row?.note ??
      ""
    );
  }


  async function saveCalendar() {
    if (
      !calendarModal
    ) {
      return;
    }

    await run(
      async () => {
        const price =
          calendarPrice.trim()
            ? Number(
                calendarPrice
              )
            : null;

        if (
          price !== null &&
          (
            !Number.isFinite(
              price
            ) ||
            price < 0
          )
        ) {
          throw new Error(
            "Geçerli günlük fiyat gir."
          );
        }

        const {
          error:
            requestError,
        } =
          await supabase.rpc(
            "yacht_supplier_update_availability",
            {
              p_token:
                token,

              p_yacht_id:
                calendarModal
                  .yachtId,

              p_day:
                calendarModal
                  .day,

              p_status:
                calendarStatus,

              p_price:
                price,

              p_note:
                calendarNote,
            }
          );

        if (
          requestError
        ) {
          throw requestError;
        }

        setCalendarModal(
          null
        );
      },
      "Müsaitlik ve fiyat güncellendi."
    );
  }


  const filteredBookings =
    useMemo(
      () => {
        if (!portal) {
          return [];
        }

        const needle =
          query
            .trim()
            .toLocaleLowerCase(
              "tr"
            );

        return portal.bookings
          .filter(
            (
              booking
            ) => {
              const text =
                `${booking.booking_code} ${booking.guest_name} ${booking.yacht_name}`
                  .toLocaleLowerCase(
                    "tr"
                  );

              const searchOk =
                !needle ||
                text.includes(
                  needle
                );

              const statusOk =
                bookingFilter ===
                  "all" ||
                booking.status ===
                  bookingFilter;

              return (
                searchOk &&
                statusOk
              );
            }
          );
      },
      [
        portal,
        query,
        bookingFilter,
      ]
    );


  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#030a11] text-white">
        <div className="text-center">
          <FaAnchor className="mx-auto animate-pulse text-4xl text-orange-400" />

          <div className="mt-4 text-sm font-black">
            Partner Portalı yükleniyor...
          </div>
        </div>
      </main>
    );
  }


  if (!portal) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#030a11] p-6 text-white">
        <div className="w-full max-w-lg rounded-[30px] border border-red-500/20 bg-[#07131f] p-8 text-center">
          <FaExclamationTriangle className="mx-auto text-4xl text-red-400" />

          <h1 className="mt-5 text-xl font-black">
            Partner portalı kullanılamıyor
          </h1>

          <p className="mt-2 text-xs text-slate-500">
            {error}
          </p>
        </div>
      </main>
    );
  }


  const openBalance =
    Math.max(
      0,
      Number(
        portal.summary
          .supplier_payable
      ) -
      Number(
        portal.summary
          .paid_amount
      )
    );


  const activeYacht =
    portal.yachts.find(
      (
        yacht
      ) =>
        yacht.id ===
        selectedYacht
    );


  return (
    <main className="min-h-screen bg-[#030a11] text-white">

      {notice && (
        <div className="fixed right-5 top-5 z-[100] flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-[#07131f] px-5 py-4 shadow-2xl">
          <FaCheckCircle className="text-emerald-400" />

          <span className="text-xs font-black">
            {notice}
          </span>
        </div>
      )}


      <div className="mx-auto max-w-[1700px] px-4 py-6 lg:px-8">

        <section className="rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,.18),transparent_38%),linear-gradient(145deg,#07131f,#040b12)] p-6 lg:p-8">

          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">

            <div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1.5 text-[8px] font-black uppercase tracking-[.22em] text-orange-300">
                  TUROBUS YACHT PARTNER OS
                </span>

                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[8px] font-black text-emerald-300">
                  ● Partner Erişimi Aktif
                </span>
              </div>

              <div className="mt-5 flex items-center gap-4">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-orange-500/10 text-xl text-orange-400">
                  <FaUserTie />
                </div>

                <div>
                  <h1 className="text-2xl font-black lg:text-4xl">
                    {portal.supplier.name}
                  </h1>

                  <div className="mt-1 text-[10px] text-slate-500">
                    {portal.supplier.contact_name ||
                    "Yetkili belirtilmemiş"}
                    {" · "}
                    Komisyon %
                    {portal.supplier.commission_rate}
                  </div>
                </div>
              </div>
            </div>


            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <HeaderMetric
                label="Filo"
                value={String(
                  portal.yachts
                    .length
                )}
              />

              <HeaderMetric
                label="Rezervasyon"
                value={String(
                  portal.summary
                    .booking_count
                )}
              />

              <HeaderMetric
                label="Onay Bekleyen"
                value={String(
                  portal.summary
                    .pending_bookings
                )}
              />

              <HeaderMetric
                label="Açık Bakiye"
                value={money(
                  openBalance
                )}
              />
            </div>

          </div>
        </section>


        {error && (
          <div className="mt-4 flex items-center justify-between rounded-2xl border border-red-500/20 bg-red-500/[.06] p-4 text-xs font-bold text-red-200">
            <span>
              {error}
            </span>

            <button
              type="button"
              onClick={() =>
                setError("")
              }
            >
              <FaTimes />
            </button>
          </div>
        )}


        <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">

          <Kpi
            icon={<FaChartLine />}
            label="Toplam Satış"
            value={money(
              portal.summary
                .gross_sales
            )}
            detail="Partner filosundan oluşan satış"
          />

          <Kpi
            icon={<FaHandshake />}
            label="Hakediş"
            value={money(
              portal.summary
                .supplier_payable
            )}
            detail="Toplam tedarikçi alacağı"
          />

          <Kpi
            icon={<FaMoneyBillWave />}
            label="Ödenen"
            value={money(
              portal.summary
                .paid_amount
            )}
            detail="Kaydedilmiş ödemeler"
          />

          <Kpi
            icon={<FaWallet />}
            label="Açık Bakiye"
            value={money(
              openBalance
            )}
            detail="Henüz ödenmemiş"
          />

          <Kpi
            icon={<FaCalendarAlt />}
            label="Bekleyen Talep"
            value={String(
              portal.summary
                .pending_bookings
            )}
            detail="Onay / ret bekleyen rezervasyon"
          />

        </section>


        <section className="mt-5 overflow-x-auto rounded-[22px] border border-white/10 bg-[#07131f] p-2">
          <div className="flex min-w-max gap-2">

            {[
              [
                "overview",
                "Kontrol Merkezi",
              ],
              [
                "reservations",
                "Rezervasyonlar",
              ],
              [
                "calendar",
                "Fiyat & Müsaitlik",
              ],
              [
                "fleet",
                "Filo",
              ],
              [
                "settlements",
                "Hakediş & Mutabakat",
              ],
              [
                "payments",
                "Ödemeler",
              ],
              [
                "activity",
                "İşlem Geçmişi",
              ],
            ].map(
              (
                item
              ) => (
                <button
                  type="button"
                  key={
                    item[0]
                  }
                  onClick={() =>
                    setSection(
                      item[0] as
                        Section
                    )
                  }
                  className={`rounded-xl px-4 py-2.5 text-[9px] font-black transition ${
                    section ===
                    item[0]
                      ? "bg-orange-500 text-white"
                      : "border border-white/10 bg-white/[.025] text-slate-400 hover:text-white"
                  }`}
                >
                  {item[1]}
                </button>
              )
            )}

          </div>
        </section>


        {section ===
          "overview" && (
          <div className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_.65fr]">

            <section className="overflow-hidden rounded-[28px] border border-white/10 bg-[#07131f]">

              <div className="border-b border-white/10 p-5">
                <div className="text-lg font-black">
                  Bekleyen Rezervasyon Talepleri
                </div>

                <div className="mt-1 text-[9px] text-slate-500">
                  Partner onayı gerektiren yeni rezervasyonlar
                </div>
              </div>


              <div className="overflow-x-auto">
                <table className="w-full min-w-[1050px] text-left">

                  <thead className="sticky top-0 bg-[#0a1723]">
                    <tr className="text-[8px] font-black uppercase text-slate-600">

                      <th className="px-5 py-4">
                        Kod
                      </th>

                      <th className="px-5 py-4">
                        Tekne
                      </th>

                      <th className="px-5 py-4">
                        Misafir
                      </th>

                      <th className="px-5 py-4">
                        Tarih
                      </th>

                      <th className="px-5 py-4">
                        Kişi
                      </th>

                      <th className="px-5 py-4">
                        Satış
                      </th>

                      <th className="px-5 py-4">
                        Hakediş
                      </th>

                      <th className="px-5 py-4">
                        Aksiyon
                      </th>

                    </tr>
                  </thead>

                  <tbody>
                    {portal.bookings
                      .filter(
                        (
                          booking
                        ) =>
                          booking.status ===
                          "pending"
                      )
                      .map(
                        (
                          booking
                        ) => (
                          <tr
                            key={
                              booking.id
                            }
                            className="border-t border-white/[.06]"
                          >
                            <td className="px-5 py-4 text-[9px] font-black">
                              {
                                booking.booking_code
                              }
                            </td>

                            <td className="px-5 py-4 text-[9px] font-bold">
                              {
                                booking.yacht_name
                              }
                            </td>

                            <td className="px-5 py-4">
                              <div className="text-[9px] font-black">
                                {
                                  booking.guest_name
                                }
                              </div>

                              <div className="mt-1 text-[8px] text-slate-600">
                                {
                                  booking.guest_phone ??
                                  "Telefon yok"
                                }
                              </div>
                            </td>

                            <td className="px-5 py-4 text-[8px] text-slate-400">
                              {dateText(
                                booking.start_date
                              )}
                              {" → "}
                              {dateText(
                                booking.end_date
                              )}
                            </td>

                            <td className="px-5 py-4 text-[9px] font-black">
                              {
                                booking.guest_count
                              }
                            </td>

                            <td className="px-5 py-4 text-[9px] font-black">
                              {money(
                                booking.total_amount,
                                booking.currency
                              )}
                            </td>

                            <td className="px-5 py-4 text-[9px] font-black text-emerald-300">
                              {money(
                                booking.supplier_cost,
                                booking.currency
                              )}
                            </td>

                            <td className="px-5 py-4">
                              <div className="flex gap-2">

                                <button
                                  type="button"
                                  disabled={
                                    saving
                                  }
                                  onClick={() =>
                                    void bookingDecision(
                                      booking,
                                      "confirmed"
                                    )
                                  }
                                  className="flex h-9 items-center gap-2 rounded-lg bg-emerald-500 px-3 text-[8px] font-black"
                                >
                                  <FaCheck />
                                  Onayla
                                </button>

                                <button
                                  type="button"
                                  disabled={
                                    saving
                                  }
                                  onClick={() =>
                                    void bookingDecision(
                                      booking,
                                      "cancelled"
                                    )
                                  }
                                  className="flex h-9 items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/[.08] px-3 text-[8px] font-black text-red-300"
                                >
                                  <FaTimes />
                                  Reddet
                                </button>

                              </div>
                            </td>

                          </tr>
                        )
                      )}
                  </tbody>
                </table>
              </div>
            </section>


            <section className="rounded-[28px] border border-white/10 bg-[#07131f] p-5">

              <div className="text-sm font-black">
                Operasyon Sağlığı
              </div>

              <div className="mt-5 space-y-3">

                <HealthRow
                  label="Onay Bekleyen"
                  value={
                    portal.summary
                      .pending_bookings
                  }
                  danger={
                    portal.summary
                      .pending_bookings >
                    0
                  }
                />

                <HealthRow
                  label="Aktif Tekne"
                  value={
                    portal.yachts.filter(
                      (
                        yacht
                      ) =>
                        yacht.status !==
                        "passive"
                    ).length
                  }
                />

                <HealthRow
                  label="Yaklaşan Rezervasyon"
                  value={
                    portal.bookings.filter(
                      (
                        booking
                      ) =>
                        booking.status ===
                        "confirmed"
                    ).length
                  }
                />

                <HealthRow
                  label="Açık Mutabakat"
                  value={
                    portal.settlements.filter(
                      (
                        item
                      ) =>
                        item.status !==
                          "paid" &&
                        item.status !==
                          "cancelled"
                    ).length
                  }
                />

              </div>
            </section>
          </div>
        )}


        {section ===
          "reservations" && (
          <section className="mt-5 overflow-hidden rounded-[28px] border border-white/10 bg-[#07131f]">

            <div className="flex flex-col gap-3 border-b border-white/10 p-5 lg:flex-row lg:items-center">

              <div className="relative flex-1">
                <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-xs text-slate-600" />

                <input
                  value={
                    query
                  }
                  onChange={(
                    event
                  ) =>
                    setQuery(
                      event.target.value
                    )
                  }
                  placeholder="Kod, misafir veya tekne ara..."
                  className="h-12 w-full rounded-xl border border-white/10 bg-white/[.025] pl-10 pr-4 text-xs outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <FaFilter className="text-slate-600" />

                <select
                  value={
                    bookingFilter
                  }
                  onChange={(
                    event
                  ) =>
                    setBookingFilter(
                      event.target.value
                    )
                  }
                  className="h-12 rounded-xl border border-white/10 bg-[#0b1723] px-4 text-[9px] font-black outline-none"
                >
                  <option value="all">
                    Tüm Rezervasyonlar
                  </option>

                  <option value="pending">
                    Onay Bekleyen
                  </option>

                  <option value="confirmed">
                    Onaylanan
                  </option>

                  <option value="completed">
                    Tamamlanan
                  </option>

                  <option value="cancelled">
                    İptal / Ret
                  </option>
                </select>
              </div>

            </div>


            <div className="overflow-x-auto">
              <table className="w-full min-w-[1500px] text-left">

                <thead className="sticky top-0 bg-[#0a1723]">
                  <tr className="text-[8px] font-black uppercase tracking-[.1em] text-slate-600">

                    <th className="px-5 py-4">
                      Rezervasyon
                    </th>

                    <th className="px-5 py-4">
                      Tekne
                    </th>

                    <th className="px-5 py-4">
                      Misafir
                    </th>

                    <th className="px-5 py-4">
                      Tarih
                    </th>

                    <th className="px-5 py-4">
                      Kişi
                    </th>

                    <th className="px-5 py-4">
                      Satış
                    </th>

                    <th className="px-5 py-4">
                      Tahsil
                    </th>

                    <th className="px-5 py-4">
                      Hakediş
                    </th>

                    <th className="px-5 py-4">
                      Rez. Durumu
                    </th>

                    <th className="px-5 py-4">
                      Operasyon
                    </th>

                    <th className="px-5 py-4">
                      Aksiyon
                    </th>

                  </tr>
                </thead>

                <tbody>
                  {filteredBookings.map(
                    (
                      booking
                    ) => (
                      <tr
                        key={
                          booking.id
                        }
                        className="border-t border-white/[.06] transition hover:bg-white/[.02]"
                      >

                        <td className="px-5 py-4">
                          <div className="text-[9px] font-black">
                            {
                              booking.booking_code
                            }
                          </div>
                        </td>

                        <td className="px-5 py-4 text-[9px] font-bold">
                          {
                            booking.yacht_name
                          }
                        </td>

                        <td className="px-5 py-4">
                          <div className="text-[9px] font-black">
                            {
                              booking.guest_name
                            }
                          </div>

                          <div className="mt-1 text-[8px] text-slate-600">
                            {
                              booking.guest_phone ??
                              "—"
                            }
                          </div>
                        </td>

                        <td className="px-5 py-4 text-[8px] text-slate-400">
                          {dateText(
                            booking.start_date
                          )}
                          {" → "}
                          {dateText(
                            booking.end_date
                          )}
                        </td>

                        <td className="px-5 py-4 text-[9px] font-black">
                          {
                            booking.guest_count
                          }
                        </td>

                        <td className="px-5 py-4 text-[9px] font-black">
                          {money(
                            booking.total_amount,
                            booking.currency
                          )}
                        </td>

                        <td className="px-5 py-4 text-[9px] font-black text-blue-300">
                          {money(
                            booking.paid_amount,
                            booking.currency
                          )}
                        </td>

                        <td className="px-5 py-4 text-[9px] font-black text-emerald-300">
                          {money(
                            booking.supplier_cost,
                            booking.currency
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <span className={`rounded-full border px-2.5 py-1 text-[8px] font-black ${statusTone(
                            booking.status
                          )}`}>
                            {bookingLabel(
                              booking.status
                            )}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          {booking.status ===
                          "confirmed" ? (
                            <select
                              value={
                                booking.operation_status
                              }
                              disabled={
                                saving
                              }
                              onChange={(
                                event
                              ) =>
                                void updateOperation(
                                  booking,
                                  event.target.value
                                )
                              }
                              className="h-9 min-w-[135px] rounded-lg border border-white/10 bg-[#0b1723] px-2 text-[8px] font-black outline-none"
                            >
                              <option value="preparing">
                                Hazırlanıyor
                              </option>

                              <option value="ready">
                                Tekne Hazır
                              </option>

                              <option value="guest_arrived">
                                Misafir Geldi
                              </option>

                              <option value="departed">
                                Çıkış Yapıldı
                              </option>

                              <option value="cruising">
                                Seyirde
                              </option>

                              <option value="returning">
                                Dönüşte
                              </option>

                              <option value="completed">
                                Tamamlandı
                              </option>
                            </select>
                          ) : (
                            <span className="text-[8px] text-slate-600">
                              {operationLabel(
                                booking.operation_status
                              )}
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          {booking.status ===
                          "pending" ? (
                            <div className="flex gap-1.5">

                              <button
                                type="button"
                                onClick={() =>
                                  void bookingDecision(
                                    booking,
                                    "confirmed"
                                  )
                                }
                                className="rounded-lg bg-emerald-500 px-3 py-2 text-[8px] font-black"
                              >
                                Onayla
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  void bookingDecision(
                                    booking,
                                    "cancelled"
                                  )
                                }
                                className="rounded-lg border border-red-500/20 bg-red-500/[.07] px-3 py-2 text-[8px] font-black text-red-300"
                              >
                                Reddet
                              </button>

                            </div>
                          ) : (
                            <span className="flex items-center gap-2 text-[8px] font-black text-slate-500">
                              <FaCheck />
                              İşlendi
                            </span>
                          )}
                        </td>

                      </tr>
                    )
                  )}
                </tbody>

              </table>
            </div>
          </section>
        )}


        {section ===
          "calendar" && (
          <section className="mt-5 rounded-[28px] border border-white/10 bg-[#07131f] p-5 lg:p-6">

            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">

              <div>
                <div className="text-lg font-black">
                  Fiyat & Müsaitlik Yönetimi
                </div>

                <div className="mt-1 text-[9px] text-slate-500">
                  14 günlük takvim · rezervasyonlu günler kilitlidir
                </div>
              </div>

              <select
                value={
                  selectedYacht
                }
                onChange={(
                  event
                ) =>
                  setSelectedYacht(
                    event.target.value
                  )
                }
                className="h-11 min-w-[260px] rounded-xl border border-white/10 bg-[#0b1723] px-4 text-[9px] font-black outline-none"
              >
                {portal.yachts.map(
                  (
                    yacht
                  ) => (
                    <option
                      key={
                        yacht.id
                      }
                      value={
                        yacht.id
                      }
                    >
                      {
                        yacht.name
                      }
                      {" · "}
                      {
                        yacht.city
                      }
                    </option>
                  )
                )}
              </select>

            </div>


            {activeYacht && (
              <>
                <div className="mt-5 flex flex-wrap items-center gap-4 rounded-2xl border border-white/[.07] bg-white/[.02] p-4">

                  <div className="min-w-[200px] flex-1">
                    <div className="text-[8px] font-black uppercase text-slate-600">
                      Standart Günlük Fiyat
                    </div>

                    <div className="mt-1 text-sm font-black">
                      {money(
                        activeYacht.base_daily_price,
                        activeYacht.currency
                      )}
                    </div>
                  </div>

                  <input
                    type="number"
                    min="0"
                    value={
                      priceDrafts[
                        activeYacht.id
                      ] ??
                      ""
                    }
                    onChange={(
                      event
                    ) =>
                      setPriceDrafts(
                        (
                          current
                        ) => ({
                          ...current,

                          [activeYacht.id]:
                            event.target.value,
                        })
                      )
                    }
                    className="h-11 w-44 rounded-xl border border-white/10 bg-[#0b1723] px-3 text-[9px] font-black outline-none"
                  />

                  <button
                    type="button"
                    disabled={
                      saving
                    }
                    onClick={() =>
                      void saveBasePrice(
                        activeYacht
                      )
                    }
                    className="flex h-11 items-center gap-2 rounded-xl bg-orange-500 px-4 text-[9px] font-black"
                  >
                    <FaSave />
                    Standart Fiyatı Kaydet
                  </button>

                </div>


                <div className="mt-5 overflow-x-auto">

                  <div className="min-w-[1250px]">

                    <div className="grid grid-cols-7 gap-3">

                      {days.map(
                        (
                          day
                        ) => {
                          const row =
                            portal.availability.find(
                              (
                                item
                              ) =>
                                item.yacht_id ===
                                  activeYacht.id &&
                                item.day ===
                                  day
                            );

                          const booked =
                            Boolean(
                              row?.booking_id
                            );

                          const status =
                            booked
                              ? "booked"
                              : row?.status ??
                                "available";

                          const displayPrice =
                            row?.price ??
                            activeYacht.base_daily_price;

                          return (
                            <button
                              type="button"
                              key={
                                day
                              }
                              onClick={() =>
                                openCalendar(
                                  activeYacht.id,
                                  day
                                )
                              }
                              className={`min-h-[150px] rounded-[20px] border p-4 text-left transition ${
                                booked
                                  ? "cursor-not-allowed border-blue-500/20 bg-blue-500/[.06]"
                                  : statusTone(
                                      status
                                    )
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">

                                <div>
                                  <div className="text-[8px] font-black uppercase text-slate-500">
                                    {new Intl.DateTimeFormat(
                                      "tr-TR",
                                      {
                                        weekday:
                                          "short",
                                      }
                                    ).format(
                                      new Date(
                                        `${day}T12:00:00`
                                      )
                                    )}
                                  </div>

                                  <div className="mt-1 text-sm font-black">
                                    {dateText(
                                      day
                                    )}
                                  </div>
                                </div>

                                <span className={`rounded-full border px-2 py-1 text-[7px] font-black ${statusTone(
                                  status
                                )}`}>
                                  {booked
                                    ? "REZERVASYON"
                                    : status ===
                                      "available"
                                      ? "MÜSAİT"
                                      : status ===
                                        "option"
                                        ? "OPSİYON"
                                        : status ===
                                          "maintenance"
                                          ? "BAKIM"
                                          : "KAPALI"}
                                </span>

                              </div>

                              <div className="mt-6 text-[8px] uppercase text-slate-600">
                                Günlük Fiyat
                              </div>

                              <div className="mt-1 text-sm font-black text-orange-300">
                                {money(
                                  displayPrice,
                                  activeYacht.currency
                                )}
                              </div>

                              {row?.note && (
                                <div className="mt-2 line-clamp-2 text-[8px] text-slate-500">
                                  {row.note}
                                </div>
                              )}

                            </button>
                          );
                        }
                      )}

                    </div>
                  </div>
                </div>
              </>
            )}
          </section>
        )}


        {section ===
          "fleet" && (
          <section className="mt-5 overflow-hidden rounded-[28px] border border-white/10 bg-[#07131f]">

            <div className="border-b border-white/10 p-5">
              <div className="text-lg font-black">
                Partner Filosu
              </div>

              <div className="mt-1 text-[9px] text-slate-500">
                Fiyat, kapasite, kaptan ve operasyon durumu
              </div>
            </div>


            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left">

                <thead className="sticky top-0 bg-[#0a1723]">
                  <tr className="text-[8px] font-black uppercase text-slate-600">

                    <th className="px-5 py-4">
                      Tekne
                    </th>

                    <th className="px-5 py-4">
                      Tip
                    </th>

                    <th className="px-5 py-4">
                      Bölge
                    </th>

                    <th className="px-5 py-4">
                      Kapasite
                    </th>

                    <th className="px-5 py-4">
                      Kabin
                    </th>

                    <th className="px-5 py-4">
                      Kaptan
                    </th>

                    <th className="px-5 py-4">
                      Günlük Fiyat
                    </th>

                    <th className="px-5 py-4">
                      Durum
                    </th>

                    <th className="px-5 py-4">
                      Yeni Fiyat
                    </th>

                  </tr>
                </thead>

                <tbody>
                  {portal.yachts.map(
                    (
                      yacht
                    ) => (
                      <tr
                        key={
                          yacht.id
                        }
                        className="border-t border-white/[.06]"
                      >

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">

                            <div className="grid h-10 w-10 place-items-center rounded-xl bg-orange-500/10 text-orange-400">
                              <FaShip />
                            </div>

                            <div className="text-[10px] font-black">
                              {
                                yacht.name
                              }
                            </div>

                          </div>
                        </td>

                        <td className="px-5 py-4 text-[9px] text-slate-400">
                          {
                            yacht.type
                          }
                        </td>

                        <td className="px-5 py-4">
                          <div className="text-[9px] font-bold">
                            {
                              yacht.city
                            }
                          </div>

                          <div className="mt-1 text-[8px] text-slate-600">
                            {
                              yacht.marina ??
                              "—"
                            }
                          </div>
                        </td>

                        <td className="px-5 py-4 text-[9px] font-black">
                          {
                            yacht.max_guests
                          } kişi
                        </td>

                        <td className="px-5 py-4 text-[9px] font-black">
                          {
                            yacht.cabins
                          }
                        </td>

                        <td className="px-5 py-4 text-[9px]">
                          {
                            yacht.captain_name ??
                            "—"
                          }
                        </td>

                        <td className="px-5 py-4 text-[10px] font-black text-orange-300">
                          {money(
                            yacht.base_daily_price,
                            yacht.currency
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <span className={`rounded-full border px-2.5 py-1 text-[8px] font-black ${statusTone(
                            yacht.status
                          )}`}>
                            {
                              yacht.status
                            }
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex gap-2">

                            <input
                              type="number"
                              min="0"
                              value={
                                priceDrafts[
                                  yacht.id
                                ] ??
                                ""
                              }
                              onChange={(
                                event
                              ) =>
                                setPriceDrafts(
                                  (
                                    current
                                  ) => ({
                                    ...current,

                                    [yacht.id]:
                                      event.target.value,
                                  })
                                )
                              }
                              className="h-9 w-28 rounded-lg border border-white/10 bg-[#0b1723] px-2 text-[8px] font-black outline-none"
                            />

                            <button
                              type="button"
                              onClick={() =>
                                void saveBasePrice(
                                  yacht
                                )
                              }
                              className="grid h-9 w-9 place-items-center rounded-lg bg-orange-500"
                            >
                              <FaSave />
                            </button>

                          </div>
                        </td>

                      </tr>
                    )
                  )}
                </tbody>

              </table>
            </div>
          </section>
        )}


        {section ===
          "settlements" && (
          <section className="mt-5 overflow-hidden rounded-[28px] border border-white/10 bg-[#07131f]">

            <div className="border-b border-white/10 p-5">
              <div className="text-lg font-black">
                Hakediş & Mutabakat
              </div>

              <div className="mt-1 text-[9px] text-slate-500">
                Dönemsel satış, hakediş, komisyon ve ödeme durumu
              </div>
            </div>


            <div className="overflow-x-auto">
              <table className="w-full min-w-[1250px] text-left">

                <thead className="sticky top-0 bg-[#0a1723]">
                  <tr className="text-[8px] font-black uppercase text-slate-600">

                    <th className="px-5 py-4">
                      Mutabakat
                    </th>

                    <th className="px-5 py-4">
                      Dönem
                    </th>

                    <th className="px-5 py-4">
                      Brüt Satış
                    </th>

                    <th className="px-5 py-4">
                      Hakediş
                    </th>

                    <th className="px-5 py-4">
                      Turobus Komisyon
                    </th>

                    <th className="px-5 py-4">
                      Düzeltme
                    </th>

                    <th className="px-5 py-4">
                      Ödenen
                    </th>

                    <th className="px-5 py-4">
                      Kalan
                    </th>

                    <th className="px-5 py-4">
                      Vade
                    </th>

                    <th className="px-5 py-4">
                      Durum
                    </th>

                  </tr>
                </thead>

                <tbody>
                  {portal.settlements.map(
                    (
                      settlement
                    ) => {
                      const remaining =
                        Math.max(
                          0,
                          settlement.supplier_payable +
                            settlement.adjustments -
                            settlement.paid_amount
                        );

                      return (
                        <tr
                          key={
                            settlement.id
                          }
                          className="border-t border-white/[.06]"
                        >

                          <td className="px-5 py-4 text-[9px] font-black">
                            {
                              settlement.settlement_code
                            }
                          </td>

                          <td className="px-5 py-4 text-[8px] text-slate-400">
                            {dateText(
                              settlement.period_start
                            )}
                            {" → "}
                            {dateText(
                              settlement.period_end
                            )}
                          </td>

                          <td className="px-5 py-4 text-[9px] font-black">
                            {money(
                              settlement.gross_sales,
                              settlement.currency
                            )}
                          </td>

                          <td className="px-5 py-4 text-[9px] font-black text-blue-300">
                            {money(
                              settlement.supplier_payable,
                              settlement.currency
                            )}
                          </td>

                          <td className="px-5 py-4 text-[9px] font-black text-orange-300">
                            {money(
                              settlement.platform_commission,
                              settlement.currency
                            )}
                          </td>

                          <td className="px-5 py-4 text-[9px]">
                            {money(
                              settlement.adjustments,
                              settlement.currency
                            )}
                          </td>

                          <td className="px-5 py-4 text-[9px] font-black text-emerald-300">
                            {money(
                              settlement.paid_amount,
                              settlement.currency
                            )}
                          </td>

                          <td className="px-5 py-4 text-[9px] font-black text-red-300">
                            {money(
                              remaining,
                              settlement.currency
                            )}
                          </td>

                          <td className="px-5 py-4 text-[8px] text-slate-400">
                            {dateText(
                              settlement.due_date
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <span className={`rounded-full border px-2.5 py-1 text-[8px] font-black ${statusTone(
                              settlement.status
                            )}`}>
                              {
                                settlement.status
                              }
                            </span>
                          </td>

                        </tr>
                      );
                    }
                  )}
                </tbody>

              </table>
            </div>
          </section>
        )}


        {section ===
          "payments" && (
          <section className="mt-5 overflow-hidden rounded-[28px] border border-white/10 bg-[#07131f]">

            <div className="border-b border-white/10 p-5">
              <div className="text-lg font-black">
                Ödeme Geçmişi
              </div>

              <div className="mt-1 text-[9px] text-slate-500">
                Turobus tarafından kaydedilen partner ödemeleri
              </div>
            </div>


            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] text-left">

                <thead className="sticky top-0 bg-[#0a1723]">
                  <tr className="text-[8px] font-black uppercase text-slate-600">

                    <th className="px-5 py-4">
                      Tarih
                    </th>

                    <th className="px-5 py-4">
                      Tutar
                    </th>

                    <th className="px-5 py-4">
                      Yöntem
                    </th>

                    <th className="px-5 py-4">
                      Referans
                    </th>

                    <th className="px-5 py-4">
                      Mutabakat
                    </th>

                    <th className="px-5 py-4">
                      Açıklama
                    </th>

                  </tr>
                </thead>

                <tbody>
                  {portal.payments.map(
                    (
                      payment
                    ) => {
                      const settlement =
                        portal.settlements.find(
                          (
                            item
                          ) =>
                            item.id ===
                            payment.settlement_id
                        );

                      return (
                        <tr
                          key={
                            payment.id
                          }
                          className="border-t border-white/[.06]"
                        >
                          <td className="px-5 py-4 text-[8px] text-slate-400">
                            {dateTime(
                              payment.paid_at
                            )}
                          </td>

                          <td className="px-5 py-4 text-[10px] font-black text-emerald-300">
                            {money(
                              payment.amount,
                              payment.currency
                            )}
                          </td>

                          <td className="px-5 py-4 text-[9px]">
                            {
                              payment.payment_method
                            }
                          </td>

                          <td className="px-5 py-4 text-[9px] font-black">
                            {
                              payment.reference_no ??
                              "—"
                            }
                          </td>

                          <td className="px-5 py-4 text-[9px]">
                            {
                              settlement?.settlement_code ??
                              "—"
                            }
                          </td>

                          <td className="px-5 py-4 text-[8px] text-slate-500">
                            {
                              payment.note ??
                              "—"
                            }
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>

              </table>
            </div>
          </section>
        )}


        {section ===
          "activity" && (
          <section className="mt-5 overflow-hidden rounded-[28px] border border-white/10 bg-[#07131f]">

            <div className="border-b border-white/10 p-5">
              <div className="flex items-center gap-3">
                <FaHistory className="text-orange-400" />

                <div>
                  <div className="text-lg font-black">
                    Partner İşlem Geçmişi
                  </div>

                  <div className="mt-1 text-[9px] text-slate-500">
                    Fiyat, müsaitlik, rezervasyon ve operasyon değişiklikleri
                  </div>
                </div>
              </div>
            </div>


            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] text-left">

                <thead className="sticky top-0 bg-[#0a1723]">
                  <tr className="text-[8px] font-black uppercase text-slate-600">

                    <th className="px-5 py-4">
                      Tarih
                    </th>

                    <th className="px-5 py-4">
                      İşlem
                    </th>

                    <th className="px-5 py-4">
                      Tekne
                    </th>

                    <th className="px-5 py-4">
                      Rezervasyon
                    </th>

                  </tr>
                </thead>

                <tbody>
                  {portal.events.map(
                    (
                      event
                    ) => {
                      const yacht =
                        portal.yachts.find(
                          (
                            item
                          ) =>
                            item.id ===
                            event.yacht_id
                        );

                      const booking =
                        portal.bookings.find(
                          (
                            item
                          ) =>
                            item.id ===
                            event.booking_id
                        );

                      return (
                        <tr
                          key={
                            event.id
                          }
                          className="border-t border-white/[.06]"
                        >

                          <td className="px-5 py-4 text-[8px] text-slate-400">
                            {dateTime(
                              event.created_at
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <span className="rounded-lg border border-orange-500/20 bg-orange-500/[.07] px-2.5 py-1 text-[8px] font-black text-orange-300">
                              {
                                event.event_type
                              }
                            </span>
                          </td>

                          <td className="px-5 py-4 text-[9px] font-bold">
                            {
                              yacht?.name ??
                              "—"
                            }
                          </td>

                          <td className="px-5 py-4 text-[9px]">
                            {
                              booking?.booking_code ??
                              "—"
                            }
                          </td>

                        </tr>
                      );
                    }
                  )}
                </tbody>

              </table>
            </div>
          </section>
        )}

      </div>


      {calendarModal && (
        <div className="fixed inset-0 z-[110] grid place-items-center bg-black/75 p-4 backdrop-blur-sm">

          <div className="w-full max-w-lg rounded-[28px] border border-white/10 bg-[#07131f] p-6 shadow-2xl">

            <div className="flex items-start justify-between gap-4">

              <div>
                <div className="text-[8px] font-black uppercase tracking-[.2em] text-orange-400">
                  FİYAT & MÜSAİTLİK
                </div>

                <div className="mt-2 text-xl font-black">
                  {dateText(
                    calendarModal.day
                  )}
                </div>

                <div className="mt-1 text-[9px] text-slate-500">
                  {
                    portal.yachts.find(
                      (
                        yacht
                      ) =>
                        yacht.id ===
                        calendarModal.yachtId
                    )?.name
                  }
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setCalendarModal(
                    null
                  )
                }
                className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-slate-400"
              >
                <FaTimes />
              </button>

            </div>


            <div className="mt-6 space-y-4">

              <label>
                <span className="mb-1.5 block text-[8px] font-black uppercase text-slate-500">
                  Durum
                </span>

                <select
                  value={
                    calendarStatus
                  }
                  onChange={(
                    event
                  ) =>
                    setCalendarStatus(
                      event.target.value
                    )
                  }
                  className="h-12 w-full rounded-xl border border-white/10 bg-[#0b1723] px-4 text-xs font-black outline-none"
                >
                  <option value="available">
                    Müsait
                  </option>

                  <option value="option">
                    Opsiyon
                  </option>

                  <option value="maintenance">
                    Bakım
                  </option>

                  <option value="blocked">
                    Satışa Kapalı
                  </option>
                </select>
              </label>


              <label>
                <span className="mb-1.5 block text-[8px] font-black uppercase text-slate-500">
                  O Güne Özel Fiyat
                </span>

                <input
                  type="number"
                  min="0"
                  value={
                    calendarPrice
                  }
                  onChange={(
                    event
                  ) =>
                    setCalendarPrice(
                      event.target.value
                    )
                  }
                  placeholder="Boş bırakılırsa standart fiyat"
                  className="h-12 w-full rounded-xl border border-white/10 bg-white/[.025] px-4 text-xs font-black outline-none"
                />
              </label>


              <label>
                <span className="mb-1.5 block text-[8px] font-black uppercase text-slate-500">
                  Not
                </span>

                <textarea
                  value={
                    calendarNote
                  }
                  onChange={(
                    event
                  ) =>
                    setCalendarNote(
                      event.target.value
                    )
                  }
                  placeholder="Bakım, özel fiyat veya operasyon notu..."
                  className="min-h-24 w-full resize-none rounded-xl border border-white/10 bg-white/[.025] p-4 text-xs outline-none"
                />
              </label>

            </div>


            <div className="mt-6 flex gap-3">

              <button
                type="button"
                onClick={() =>
                  setCalendarModal(
                    null
                  )
                }
                className="h-12 flex-1 rounded-xl border border-white/10 text-xs font-black text-slate-400"
              >
                Vazgeç
              </button>

              <button
                type="button"
                disabled={
                  saving
                }
                onClick={() =>
                  void saveCalendar()
                }
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-orange-500 text-xs font-black"
              >
                <FaSave />
                Kaydet
              </button>

            </div>

          </div>
        </div>
      )}

    </main>
  );
}


function HeaderMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-[115px] rounded-xl border border-white/10 bg-black/10 px-4 py-3">
      <div className="text-[7px] font-black uppercase text-slate-600">
        {label}
      </div>

      <div className="mt-1 text-sm font-black">
        {value}
      </div>
    </div>
  );
}


function Kpi({
  icon,
  label,
  value,
  detail,
}: {
  icon:
    React.ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-[#07131f] p-5">

      <div className="flex items-start justify-between gap-4">

        <div>
          <div className="text-[8px] font-black uppercase tracking-[.14em] text-slate-600">
            {label}
          </div>

          <div className="mt-3 text-2xl font-black">
            {value}
          </div>

          <div className="mt-2 text-[8px] text-slate-500">
            {detail}
          </div>
        </div>

        <div className="grid h-10 w-10 place-items-center rounded-xl bg-orange-500/10 text-orange-400">
          {icon}
        </div>

      </div>
    </div>
  );
}


function HealthRow({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: number;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/[.07] bg-white/[.02] p-4">

      <div className="text-[9px] font-bold text-slate-400">
        {label}
      </div>

      <div className={`text-sm font-black ${
        danger
          ? "text-red-300"
          : "text-emerald-300"
      }`}>
        {value}
      </div>

    </div>
  );
}
