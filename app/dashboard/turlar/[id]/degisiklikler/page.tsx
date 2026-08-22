"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FaArrowLeft,
  FaCheckCircle,
  FaClock,
  FaExclamationTriangle,
  FaExchangeAlt,
  FaFileInvoiceDollar,
  FaPlus,
  FaSearch,
  FaTimesCircle,
  FaUserEdit,
} from "react-icons/fa";

import {
  useParams,
} from "next/navigation";

import {
  supabase,
} from "@/lib/supabase";

import {
  getCurrentMembership,
} from "@/lib/current-user";


type CaseType =
  | "full_cancellation"
  | "partial_cancellation"
  | "full_refund"
  | "partial_refund"
  | "passenger_change"
  | "departure_change"
  | "flight_change"
  | "bus_change"
  | "transport_change"
  | "other";


type Priority =
  | "low"
  | "normal"
  | "high"
  | "critical";


type Tour = {
  id: string;
  title: string;
  transport_mode:
    | "air"
    | "bus"
    | "other";
};


type Departure = {
  id: string;
  departure_date: string;
  capacity: number;
  reserved_count: number;
  status: string;
};


type Reservation = {
  id: string;
  departure_id:
    string | null;
  guests: number;
  status: string;
};


type ChangeCase = {
  id: string;
  case_number: string;
  case_type: CaseType;
  status: string;
  priority: Priority;
  departure_id:
    string | null;
  reservation_id:
    string | null;
  requested_refund_amount: number;
  approved_refund_amount: number;
  supplier_cancellation_cost: number;
  customer_penalty_amount: number;
  company_loss_amount: number;
  reason:
    string | null;
  created_at: string;
};


type CaseEvent = {
  id: string;
  case_id: string;
  event_type: string;
  note:
    string | null;
  created_at: string;
};


const CASE_TYPES:
  {
    value: CaseType;
    label: string;
  }[] = [
    {
      value:
        "full_cancellation",
      label:
        "Tam İptal",
    },
    {
      value:
        "partial_cancellation",
      label:
        "Kısmi İptal",
    },
    {
      value:
        "full_refund",
      label:
        "Tam İade",
    },
    {
      value:
        "partial_refund",
      label:
        "Kısmi İade",
    },
    {
      value:
        "passenger_change",
      label:
        "Yolcu Değişikliği",
    },
    {
      value:
        "departure_change",
      label:
        "Tur Çıkışı / Tarih Değişikliği",
    },
    {
      value:
        "flight_change",
      label:
        "Uçuş Değişikliği",
    },
    {
      value:
        "bus_change",
      label:
        "Otobüs Değişikliği",
    },
    {
      value:
        "transport_change",
      label:
        "Ulaşım Değişikliği",
    },
    {
      value:
        "other",
      label:
        "Diğer",
    },
  ];


function caseTypeLabel(
  value:
    CaseType
) {
  return (
    CASE_TYPES.find(
      item =>
        item.value === value
    )?.label ??
    value
  );
}


function priorityLabel(
  value:
    Priority
) {
  const labels:
    Record<
      Priority,
      string
    > = {
      low:
        "Düşük",
      normal:
        "Normal",
      high:
        "Yüksek",
      critical:
        "Kritik",
    };

  return labels[value];
}


function statusLabel(
  value:
    string
) {
  const labels:
    Record<
      string,
      string
    > = {
      draft:
        "Taslak",
      pending_review:
        "Onay Bekliyor",
      approved:
        "Onaylandı",
      rejected:
        "Reddedildi",
      processing:
        "İşleniyor",
      completed:
        "Tamamlandı",
      cancelled:
        "Vaka İptal",
    };

  return labels[value] ??
    value;
}


function statusClass(
  value:
    string
) {
  if (
    value ===
      "completed" ||
    value ===
      "approved"
  ) {
    return "border-emerald-500/20 bg-emerald-500/[.07] text-emerald-300";
  }

  if (
    value ===
      "rejected" ||
    value ===
      "cancelled"
  ) {
    return "border-red-500/20 bg-red-500/[.07] text-red-300";
  }

  if (
    value ===
      "pending_review" ||
    value ===
      "processing"
  ) {
    return "border-amber-500/20 bg-amber-500/[.07] text-amber-300";
  }

  return "border-white/10 bg-white/[.03] text-slate-400";
}


function dateLabel(
  value:
    string
) {
  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "tr-TR",
    {
      day:
        "2-digit",
      month:
        "short",
      year:
        "numeric",
      hour:
        "2-digit",
      minute:
        "2-digit",
    }
  ).format(
    date
  );
}


function departureDateLabel(
  value:
    string
) {
  const date =
    new Date(
      `${value.slice(0, 10)}T12:00:00`
    );

  return new Intl.DateTimeFormat(
    "tr-TR",
    {
      day:
        "2-digit",
      month:
        "long",
      year:
        "numeric",
    }
  ).format(
    date
  );
}


function money(
  value:
    number
) {
  return new Intl.NumberFormat(
    "tr-TR",
    {
      style:
        "currency",
      currency:
        "TRY",
      maximumFractionDigits:
        0,
    }
  ).format(
    Number(
      value || 0
    )
  );
}


export default function TourChangeCenterPage() {

  const params =
    useParams<{
      id:
        string;
    }>();

  const tourId =
    String(
      params.id
    );


  const [
    companyId,
    setCompanyId,
  ] =
    useState("");


  const [
    tour,
    setTour,
  ] =
    useState<Tour | null>(
      null
    );


  const [
    departures,
    setDepartures,
  ] =
    useState<Departure[]>(
      []
    );


  const [
    reservations,
    setReservations,
  ] =
    useState<Reservation[]>(
      []
    );


  const [
    cases,
    setCases,
  ] =
    useState<ChangeCase[]>(
      []
    );


  const [
    events,
    setEvents,
  ] =
    useState<CaseEvent[]>(
      []
    );


  const [
    selectedDepartureId,
    setSelectedDepartureId,
  ] =
    useState("");


  const [
    selectedReservationId,
    setSelectedReservationId,
  ] =
    useState("");


  const [
    caseType,
    setCaseType,
  ] =
    useState<CaseType>(
      "full_cancellation"
    );


  const [
    priority,
    setPriority,
  ] =
    useState<Priority>(
      "normal"
    );


  const [
    requestedRefund,
    setRequestedRefund,
  ] =
    useState("0");


  const [
    supplierCost,
    setSupplierCost,
  ] =
    useState("0");


  const [
    customerPenalty,
    setCustomerPenalty,
  ] =
    useState("0");


  const [
    reason,
    setReason,
  ] =
    useState("");


  const [
    customerNote,
    setCustomerNote,
  ] =
    useState("");


  const [
    internalNote,
    setInternalNote,
  ] =
    useState("");


  const [
    search,
    setSearch,
  ] =
    useState("");


  const [
    loading,
    setLoading,
  ] =
    useState(true);


  const [
    busy,
    setBusy,
  ] =
    useState(false);


  const [
    error,
    setError,
  ] =
    useState("");


  const [
    notice,
    setNotice,
  ] =
    useState("");


  const load =
    useCallback(
      async (
        currentCompanyId:
          string
      ) => {

        const [
          tourResult,
          departureResult,
          reservationResult,
          caseResult,
        ] =
          await Promise.all([

            supabase
              .from(
                "tours"
              )
              .select(
                "id,title,transport_mode"
              )
              .eq(
                "company_id",
                currentCompanyId
              )
              .eq(
                "id",
                tourId
              )
              .maybeSingle(),

            supabase
              .from(
                "tour_departures"
              )
              .select(
                "id,departure_date,capacity,reserved_count,status"
              )
              .eq(
                "company_id",
                currentCompanyId
              )
              .eq(
                "tour_id",
                tourId
              )
              .order(
                "departure_date",
                {
                  ascending:
                    true,
                }
              ),

            supabase
              .from(
                "reservations"
              )
              .select(
                "id,departure_id,guests,status"
              )
              .eq(
                "company_id",
                currentCompanyId
              )
              .eq(
                "tour_id",
                tourId
              )
              .order(
                "created_at",
                {
                  ascending:
                    false,
                }
              ),

            supabase
              .from(
                "tour_change_cases"
              )
              .select(
                [
                  "id",
                  "case_number",
                  "case_type",
                  "status",
                  "priority",
                  "departure_id",
                  "reservation_id",
                  "requested_refund_amount",
                  "approved_refund_amount",
                  "supplier_cancellation_cost",
                  "customer_penalty_amount",
                  "company_loss_amount",
                  "reason",
                  "created_at",
                ].join(",")
              )
              .eq(
                "company_id",
                currentCompanyId
              )
              .eq(
                "tour_id",
                tourId
              )
              .order(
                "created_at",
                {
                  ascending:
                    false,
                }
              ),
          ]);


        const errors = [
          tourResult.error,
          departureResult.error,
          reservationResult.error,
          caseResult.error,
        ].filter(
          Boolean
        );


        if (
          errors.length
        ) {
          throw errors[0];
        }


        if (
          !tourResult.data
        ) {
          throw new Error(
            "Tur bulunamadı."
          );
        }


        const loadedCases =
          (
            caseResult.data ??
            []
          ) as unknown as
            ChangeCase[];


        let loadedEvents:
          CaseEvent[] =
            [];


        const caseIds =
          loadedCases.map(
            item =>
              item.id
          );


        if (
          caseIds.length
        ) {

          const eventResult =
            await supabase
              .from(
                "tour_change_case_events"
              )
              .select(
                "id,case_id,event_type,note,created_at"
              )
              .eq(
                "company_id",
                currentCompanyId
              )
              .in(
                "case_id",
                caseIds
              )
              .order(
                "created_at",
                {
                  ascending:
                    false,
                }
              );


          if (
            eventResult.error
          ) {
            throw eventResult.error;
          }


          loadedEvents =
            (
              eventResult.data ??
              []
            ) as unknown as
              CaseEvent[];
        }


        setTour(
          tourResult.data as unknown as
            Tour
        );


        setDepartures(
          (
            departureResult.data ??
            []
          ) as unknown as
            Departure[]
        );


        setReservations(
          (
            reservationResult.data ??
            []
          ) as unknown as
            Reservation[]
        );


        setCases(
          loadedCases
        );


        setEvents(
          loadedEvents
        );

      },
      [
        tourId,
      ]
    );


  useEffect(() => {

    void (
      async () => {

        setLoading(
          true
        );

        try {

          const {
            data:
              authData,
            error:
              authError,
          } =
            await supabase
              .auth
              .getUser();


          if (
            authError ||
            !authData.user
          ) {
            throw new Error(
              "Oturum bulunamadı."
            );
          }


          const membership =
            await getCurrentMembership(
              authData.user.id
            );


          if (
            !membership
          ) {
            throw new Error(
              "Firma üyeliği bulunamadı."
            );
          }


          setCompanyId(
            membership.company_id
          );


          await load(
            membership.company_id
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

          setLoading(
            false
          );
        }
      }
    )();

  }, [
    load,
  ]);


  const filteredReservations =
    useMemo(
      () => {

        if (
          !selectedDepartureId
        ) {
          return reservations;
        }

        return reservations.filter(
          reservation =>
            reservation.departure_id ===
            selectedDepartureId
        );

      },
      [
        reservations,
        selectedDepartureId,
      ]
    );


  const visibleCases =
    useMemo(
      () => {

        const query =
          search
            .trim()
            .toLocaleLowerCase(
              "tr-TR"
            );

        if (!query) {
          return cases;
        }

        return cases.filter(
          item =>
            [
              item.case_number,
              caseTypeLabel(
                item.case_type
              ),
              statusLabel(
                item.status
              ),
              item.reason ?? "",
            ]
              .join(" ")
              .toLocaleLowerCase(
                "tr-TR"
              )
              .includes(
                query
              )
        );

      },
      [
        cases,
        search,
      ]
    );


  const openCount =
    cases.filter(
      item =>
        ![
          "completed",
          "cancelled",
          "rejected",
        ].includes(
          item.status
        )
    ).length;


  const pendingReviewCount =
    cases.filter(
      item =>
        item.status ===
        "pending_review"
    ).length;


  const requestedRefundTotal =
    cases.reduce(
      (
        total,
        item
      ) =>
        total +
        Number(
          item.requested_refund_amount ??
          0
        ),
      0
    );


  const supplierCostTotal =
    cases.reduce(
      (
        total,
        item
      ) =>
        total +
        Number(
          item.supplier_cancellation_cost ??
          0
        ),
      0
    );


  function resetForm() {

    setCaseType(
      "full_cancellation"
    );

    setPriority(
      "normal"
    );

    setSelectedReservationId(
      ""
    );

    setRequestedRefund(
      "0"
    );

    setSupplierCost(
      "0"
    );

    setCustomerPenalty(
      "0"
    );

    setReason(
      ""
    );

    setCustomerNote(
      ""
    );

    setInternalNote(
      ""
    );
  }


  async function createCase() {

    if (
      !companyId
    ) {
      return;
    }


    if (
      !reason.trim()
    ) {

      setError(
        "Vaka nedeni zorunlu."
      );

      return;
    }


    const requestedRefundAmount =
      Math.max(
        0,
        Number(
          requestedRefund
        ) || 0
      );


    const supplierCancellationCost =
      Math.max(
        0,
        Number(
          supplierCost
        ) || 0
      );


    const customerPenaltyAmount =
      Math.max(
        0,
        Number(
          customerPenalty
        ) || 0
      );


    setBusy(
      true
    );

    setError(
      ""
    );

    setNotice(
      ""
    );


    try {

      const {
        data,
        error:
          rpcError,
      } =
        await supabase
          .rpc(
            "create_tour_change_case",
            {
              p_company_id:
                companyId,

              p_tour_id:
                tourId,

              p_departure_id:
                selectedDepartureId ||
                null,

              p_reservation_id:
                selectedReservationId ||
                null,

              p_case_type:
                caseType,

              p_priority:
                priority,

              p_requested_refund_amount:
                requestedRefundAmount,

              p_supplier_cancellation_cost:
                supplierCancellationCost,

              p_customer_penalty_amount:
                customerPenaltyAmount,

              p_reason:
                reason.trim(),

              p_customer_note:
                customerNote.trim() ||
                null,

              p_internal_note:
                internalNote.trim() ||
                null,

              p_requested_changes: {
                source:
                  "tour_change_center",
              },
            }
          );


      if (
        rpcError
      ) {
        throw rpcError;
      }


      await load(
        companyId
      );


      resetForm();


      setNotice(
        `Vaka başarıyla oluşturuldu. Kayıt: ${String(data)}`
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

      setBusy(
        false
      );
    }
  }


  if (
    loading
  ) {
    return (
      <main className="grid min-h-[70vh] place-items-center bg-[#030a11] text-white">
        İptal & Değişiklik Merkezi yükleniyor...
      </main>
    );
  }


  return (
    <main
      data-tour-os-screen="change-center"
      className="min-h-screen bg-[#030a11] text-white"
    >

      <div className="mx-auto max-w-[1750px] px-5 py-7 lg:px-8">

        <div className="flex flex-wrap items-center justify-between gap-3">

          <Link
            href={`/dashboard/turlar/${tourId}`}
            className="inline-flex items-center gap-2 text-[9px] font-black text-slate-500 hover:text-orange-300"
          >
            <FaArrowLeft />
            Tur Operasyon Merkezi
          </Link>


          <div className="rounded-full border border-red-500/20 bg-red-500/[.05] px-3 py-1.5 text-[8px] font-black text-red-300">
            KONTROLLÜ İŞLEM MERKEZİ
          </div>

        </div>


        <section className="mt-4 overflow-hidden rounded-[30px] border border-red-500/15 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,.12),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(249,115,22,.08),transparent_30%),linear-gradient(145deg,#07131f,#03080e)] p-6 lg:p-8">

          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">

            <div className="max-w-4xl">

              <div className="inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/[.07] px-3 py-1.5 text-[8px] font-black uppercase tracking-[.16em] text-red-300">
                <FaExchangeAlt />
                İPTAL · İADE · DEĞİŞİKLİK
              </div>


              <h1 className="mt-4 text-3xl font-black tracking-[-.04em] lg:text-4xl">
                {tour?.title ||
                  "Tur"}
              </h1>


              <p className="mt-3 max-w-3xl text-[9px] font-medium leading-5 text-slate-400">
                Rezervasyon, yolcu, tur çıkışı ve ulaşım değişikliklerini doğrudan veri silmeden kontrollü vaka dosyası üzerinden yönet.
              </p>

            </div>


            <div className="grid grid-cols-2 gap-2 text-right">

              <div className="rounded-xl border border-white/10 bg-white/[.025] px-4 py-3">
                <div className="text-[7px] font-black uppercase tracking-[.12em] text-slate-500">
                  Açık Vaka
                </div>
                <div className="mt-1 text-2xl font-black">
                  {openCount}
                </div>
              </div>

              <div className="rounded-xl border border-amber-500/15 bg-amber-500/[.04] px-4 py-3">
                <div className="text-[7px] font-black uppercase tracking-[.12em] text-amber-400">
                  Onay Bekleyen
                </div>
                <div className="mt-1 text-2xl font-black text-amber-300">
                  {pendingReviewCount}
                </div>
              </div>

            </div>

          </div>

        </section>


        {error && (
          <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/[.05] px-4 py-3 text-[9px] font-bold text-red-300">
            <FaTimesCircle className="mr-2 inline" />
            {error}
          </div>
        )}


        {notice && (
          <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/[.05] px-4 py-3 text-[9px] font-bold text-emerald-300">
            <FaCheckCircle className="mr-2 inline" />
            {notice}
          </div>
        )}


        <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">

          {[
            {
              label:
                "Toplam Vaka",
              value:
                String(
                  cases.length
                ),
              icon:
                <FaExchangeAlt />,
            },
            {
              label:
                "Açık Vaka",
              value:
                String(
                  openCount
                ),
              icon:
                <FaClock />,
            },
            {
              label:
                "Talep Edilen İade",
              value:
                money(
                  requestedRefundTotal
                ),
              icon:
                <FaFileInvoiceDollar />,
            },
            {
              label:
                "Tedarikçi İptal Maliyeti",
              value:
                money(
                  supplierCostTotal
                ),
              icon:
                <FaExclamationTriangle />,
            },
          ].map(
            item => (

              <div
                key={
                  item.label
                }
                className="rounded-[20px] border border-white/10 bg-white/[.025] p-4"
              >

                <div className="flex items-center justify-between gap-3">

                  <div className="text-[7px] font-black uppercase tracking-[.12em] text-slate-500">
                    {item.label}
                  </div>

                  <div className="text-orange-300">
                    {item.icon}
                  </div>

                </div>

                <div className="mt-3 text-xl font-black tracking-[-.03em]">
                  {item.value}
                </div>

              </div>
            )
          )}

        </section>


        <section className="mt-5 grid gap-5 2xl:grid-cols-[520px_minmax(0,1fr)]">

          <div className="rounded-[24px] border border-white/10 bg-[#07131f]/80 p-5">

            <div className="flex items-center gap-2">

              <div className="grid h-9 w-9 place-items-center rounded-xl bg-orange-500 text-white">
                <FaPlus />
              </div>

              <div>
                <div className="text-sm font-black">
                  Yeni Vaka Aç
                </div>
                <div className="text-[8px] text-slate-500">
                  Henüz operasyon kaydı değiştirilmez.
                </div>
              </div>

            </div>


            <div className="mt-5 grid gap-4">

              <label className="grid gap-1.5">

                <span className="text-[8px] font-black text-slate-400">
                  İşlem Türü
                </span>

                <select
                  value={
                    caseType
                  }
                  onChange={
                    event =>
                      setCaseType(
                        event.target
                          .value as
                          CaseType
                      )
                  }
                  className="min-h-11 rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px] font-bold outline-none"
                >
                  {CASE_TYPES.map(
                    item => (
                      <option
                        key={
                          item.value
                        }
                        value={
                          item.value
                        }
                      >
                        {item.label}
                      </option>
                    )
                  )}
                </select>

              </label>


              <div className="grid gap-4 sm:grid-cols-2">

                <label className="grid gap-1.5">

                  <span className="text-[8px] font-black text-slate-400">
                    Tur Çıkışı
                  </span>

                  <select
                    value={
                      selectedDepartureId
                    }
                    onChange={
                      event => {

                        setSelectedDepartureId(
                          event.target.value
                        );

                        setSelectedReservationId(
                          ""
                        );
                      }
                    }
                    className="min-h-11 rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px] font-bold outline-none"
                  >

                    <option value="">
                      Tüm tur / seçilmedi
                    </option>

                    {departures.map(
                      departure => (
                        <option
                          key={
                            departure.id
                          }
                          value={
                            departure.id
                          }
                        >
                          {departureDateLabel(
                            departure.departure_date
                          )}
                          {" · "}
                          {departure.reserved_count}
                          /
                          {departure.capacity}
                        </option>
                      )
                    )}

                  </select>

                </label>


                <label className="grid gap-1.5">

                  <span className="text-[8px] font-black text-slate-400">
                    Rezervasyon
                  </span>

                  <select
                    value={
                      selectedReservationId
                    }
                    onChange={
                      event =>
                        setSelectedReservationId(
                          event.target.value
                        )
                    }
                    className="min-h-11 rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px] font-bold outline-none"
                  >

                    <option value="">
                      Rezervasyon seçilmedi
                    </option>

                    {filteredReservations.map(
                      reservation => (
                        <option
                          key={
                            reservation.id
                          }
                          value={
                            reservation.id
                          }
                        >
                          {reservation.id.slice(
                            0,
                            8
                          )}
                          {" · "}
                          {reservation.guests}
                          {" kişi · "}
                          {reservation.status}
                        </option>
                      )
                    )}

                  </select>

                </label>

              </div>


              <label className="grid gap-1.5">

                <span className="text-[8px] font-black text-slate-400">
                  Öncelik
                </span>

                <select
                  value={
                    priority
                  }
                  onChange={
                    event =>
                      setPriority(
                        event.target
                          .value as
                          Priority
                      )
                  }
                  className="min-h-11 rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px] font-bold outline-none"
                >

                  {(
                    [
                      "low",
                      "normal",
                      "high",
                      "critical",
                    ] as
                      Priority[]
                  ).map(
                    item => (
                      <option
                        key={
                          item
                        }
                        value={
                          item
                        }
                      >
                        {priorityLabel(
                          item
                        )}
                      </option>
                    )
                  )}

                </select>

              </label>


              <div className="grid gap-4 sm:grid-cols-3">

                <label className="grid gap-1.5">

                  <span className="text-[8px] font-black text-slate-400">
                    Talep İade
                  </span>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      requestedRefund
                    }
                    onChange={
                      event =>
                        setRequestedRefund(
                          event.target.value
                        )
                    }
                    className="min-h-11 rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px] font-bold outline-none"
                  />

                </label>


                <label className="grid gap-1.5">

                  <span className="text-[8px] font-black text-slate-400">
                    Tedarikçi Maliyeti
                  </span>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      supplierCost
                    }
                    onChange={
                      event =>
                        setSupplierCost(
                          event.target.value
                        )
                    }
                    className="min-h-11 rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px] font-bold outline-none"
                  />

                </label>


                <label className="grid gap-1.5">

                  <span className="text-[8px] font-black text-slate-400">
                    Müşteri Kesintisi
                  </span>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      customerPenalty
                    }
                    onChange={
                      event =>
                        setCustomerPenalty(
                          event.target.value
                        )
                    }
                    className="min-h-11 rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px] font-bold outline-none"
                  />

                </label>

              </div>


              <label className="grid gap-1.5">

                <span className="text-[8px] font-black text-slate-400">
                  Vaka Nedeni *
                </span>

                <textarea
                  value={
                    reason
                  }
                  onChange={
                    event =>
                      setReason(
                        event.target.value
                      )
                  }
                  rows={3}
                  placeholder="Müşterinin talebi veya operasyonel neden..."
                  className="rounded-xl border border-white/10 bg-[#030a11] px-3 py-3 text-[9px] font-medium outline-none"
                />

              </label>


              <label className="grid gap-1.5">

                <span className="text-[8px] font-black text-slate-400">
                  Müşteri Notu
                </span>

                <textarea
                  value={
                    customerNote
                  }
                  onChange={
                    event =>
                      setCustomerNote(
                        event.target.value
                      )
                  }
                  rows={2}
                  className="rounded-xl border border-white/10 bg-[#030a11] px-3 py-3 text-[9px] font-medium outline-none"
                />

              </label>


              <label className="grid gap-1.5">

                <span className="text-[8px] font-black text-slate-400">
                  İç Operasyon Notu
                </span>

                <textarea
                  value={
                    internalNote
                  }
                  onChange={
                    event =>
                      setInternalNote(
                        event.target.value
                      )
                  }
                  rows={2}
                  className="rounded-xl border border-white/10 bg-[#030a11] px-3 py-3 text-[9px] font-medium outline-none"
                />

              </label>


              <button
                type="button"
                disabled={
                  busy
                }
                onClick={
                  () =>
                    void createCase()
                }
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 text-[9px] font-black text-white disabled:opacity-50"
              >
                <FaPlus />
                {busy
                  ? "Vaka oluşturuluyor..."
                  : "Vaka Dosyasını Aç"}
              </button>

            </div>

          </div>


          <div className="min-w-0">

            <div className="flex flex-col gap-3 rounded-[20px] border border-white/10 bg-white/[.025] p-4 sm:flex-row sm:items-center sm:justify-between">

              <div>

                <div className="text-sm font-black">
                  Vaka Kayıtları
                </div>

                <div className="mt-1 text-[8px] text-slate-500">
                  İptal, iade ve değişiklik taleplerinin merkezi listesi
                </div>

              </div>


              <div className="relative">

                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-600" />

                <input
                  value={
                    search
                  }
                  onChange={
                    event =>
                      setSearch(
                        event.target.value
                      )
                  }
                  placeholder="Vaka ara..."
                  className="min-h-10 w-full rounded-xl border border-white/10 bg-[#030a11] pl-9 pr-3 text-[9px] font-bold outline-none sm:w-[260px]"
                />

              </div>

            </div>


            <div className="mt-3 overflow-x-auto rounded-[22px] border border-white/10">

              <table className="min-w-[1180px] text-left">

                <thead className="bg-[#07131f]">

                  <tr className="text-[7px] font-black uppercase tracking-[.10em] text-slate-500">

                    <th className="px-4 py-3">
                      Vaka
                    </th>

                    <th className="px-4 py-3">
                      Tür
                    </th>

                    <th className="px-4 py-3">
                      Durum
                    </th>

                    <th className="px-4 py-3">
                      Öncelik
                    </th>

                    <th className="px-4 py-3">
                      Rezervasyon
                    </th>

                    <th className="px-4 py-3 text-right">
                      Talep İade
                    </th>

                    <th className="px-4 py-3 text-right">
                      Tedarikçi Maliyeti
                    </th>

                    <th className="px-4 py-3">
                      Oluşturma
                    </th>

                  </tr>

                </thead>


                <tbody>

                  {visibleCases.map(
                    item => (

                      <tr
                        key={
                          item.id
                        }
                        className="border-t border-white/[.055] text-[8px] font-bold hover:bg-orange-500/[.025]"
                      >

                        <td className="px-4 py-4">

                          <div className="font-black text-white">
                            {item.case_number}
                          </div>

                          <div className="mt-1 max-w-[220px] truncate text-slate-500">
                            {item.reason ||
                              "Neden girilmedi"}
                          </div>

                        </td>


                        <td className="px-4 py-4 text-slate-300">
                          {caseTypeLabel(
                            item.case_type
                          )}
                        </td>


                        <td className="px-4 py-4">

                          <span
                            className={`rounded-full border px-2.5 py-1 text-[7px] font-black ${statusClass(
                              item.status
                            )}`}
                          >
                            {statusLabel(
                              item.status
                            )}
                          </span>

                        </td>


                        <td className="px-4 py-4">
                          {priorityLabel(
                            item.priority
                          )}
                        </td>


                        <td className="px-4 py-4 text-slate-400">
                          {item.reservation_id
                            ? item.reservation_id.slice(
                                0,
                                8
                              )
                            : "—"}
                        </td>


                        <td className="px-4 py-4 text-right font-black">
                          {money(
                            item.requested_refund_amount
                          )}
                        </td>


                        <td className="px-4 py-4 text-right font-black text-amber-300">
                          {money(
                            item.supplier_cancellation_cost
                          )}
                        </td>


                        <td className="px-4 py-4 text-slate-500">
                          {dateLabel(
                            item.created_at
                          )}
                        </td>

                      </tr>
                    )
                  )}


                  {visibleCases.length ===
                    0 && (

                    <tr>

                      <td
                        colSpan={8}
                        className="px-6 py-14 text-center"
                      >

                        <FaExchangeAlt className="mx-auto text-2xl text-slate-700" />

                        <div className="mt-3 text-[10px] font-black text-slate-400">
                          Henüz vaka bulunmuyor
                        </div>

                        <div className="mt-1 text-[8px] text-slate-600">
                          Yeni bir iptal, iade veya değişiklik talebi oluşturabilirsiniz.
                        </div>

                      </td>

                    </tr>
                  )}

                </tbody>

              </table>

            </div>


            <section className="mt-5 rounded-[22px] border border-white/10 bg-white/[.02] p-5">

              <div className="flex items-center gap-2">

                <FaClock className="text-orange-300" />

                <div>

                  <div className="text-sm font-black">
                    Son Audit Hareketleri
                  </div>

                  <div className="text-[8px] text-slate-500">
                    Vaka event kayıtları değiştirilemez.
                  </div>

                </div>

              </div>


              <div className="mt-4 space-y-2">

                {events
                  .slice(
                    0,
                    12
                  )
                  .map(
                    event => {

                      const parent =
                        cases.find(
                          item =>
                            item.id ===
                            event.case_id
                        );

                      return (

                        <div
                          key={
                            event.id
                          }
                          className="flex flex-col gap-2 rounded-xl border border-white/[.07] bg-[#030a11]/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                        >

                          <div>

                            <div className="text-[8px] font-black text-slate-300">
                              {parent?.case_number ||
                                event.case_id.slice(
                                  0,
                                  8
                                )}
                              {" · "}
                              {event.event_type}
                            </div>

                            <div className="mt-1 text-[8px] text-slate-500">
                              {event.note ||
                                "Audit hareketi"}
                            </div>

                          </div>


                          <div className="text-[7px] font-bold text-slate-600">
                            {dateLabel(
                              event.created_at
                            )}
                          </div>

                        </div>
                      );
                    }
                  )}


                {events.length ===
                  0 && (

                  <div className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-[8px] text-slate-600">
                    Henüz audit hareketi bulunmuyor.
                  </div>
                )}

              </div>

            </section>

          </div>

        </section>


        <section className="mt-5 rounded-[20px] border border-amber-500/15 bg-amber-500/[.035] p-4 text-[8px] font-bold leading-5 text-amber-200/80">

          <FaExclamationTriangle className="mr-2 inline text-amber-300" />

          Bu aşamada vaka açılması rezervasyonu iptal etmez, ödeme iadesi yapmaz ve yolcu/ulaşım kayıtlarını değiştirmez. Gerçek uygulama yalnız onaylı vaka üzerinden sonraki motor aşamasında yapılacaktır.

        </section>

      </div>

    </main>
  );
}
