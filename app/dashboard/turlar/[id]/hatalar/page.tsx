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
  FaMoneyBillWave,
  FaPlus,
  FaSearch,
  FaTimesCircle,
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


type IncidentType =
  | "missing_service"
  | "supplier_failure"
  | "transport_problem"
  | "accommodation_problem"
  | "guide_staff_problem"
  | "document_problem"
  | "customer_complaint"
  | "overbooking"
  | "delay"
  | "safety"
  | "payment_problem"
  | "service_quality"
  | "other";


type Severity =
  | "low"
  | "medium"
  | "high"
  | "critical";


type Departure = {
  id: string;
  departure_date: string;
  capacity: number;
  reserved_count: number;
};


type Reservation = {
  id: string;
  departure_id:
    string | null;
  guests: number;
  status: string;
};


type Incident = {
  id: string;
  incident_number: string;
  incident_type: IncidentType;
  severity: Severity;
  status: string;
  source: string;
  title: string;
  description:
    string | null;
  customer_impact:
    string | null;
  operational_impact:
    string | null;
  estimated_loss_amount: number;
  actual_loss_amount: number;
  customer_compensation_amount: number;
  supplier_recoverable_amount: number;
  sla_due_at:
    string | null;
  created_at: string;
  departure_id:
    string | null;
  reservation_id:
    string | null;
};


const INCIDENT_TYPES:
  {
    value: IncidentType;
    label: string;
  }[] = [
    {
      value:
        "missing_service",
      label:
        "Eksik Hizmet",
    },
    {
      value:
        "supplier_failure",
      label:
        "Tedarikçi Hatası",
    },
    {
      value:
        "transport_problem",
      label:
        "Ulaşım Problemi",
    },
    {
      value:
        "accommodation_problem",
      label:
        "Konaklama Problemi",
    },
    {
      value:
        "guide_staff_problem",
      label:
        "Rehber / Personel",
    },
    {
      value:
        "document_problem",
      label:
        "Belge Problemi",
    },
    {
      value:
        "customer_complaint",
      label:
        "Müşteri Şikayeti",
    },
    {
      value:
        "overbooking",
      label:
        "Overbooking",
    },
    {
      value:
        "delay",
      label:
        "Gecikme",
    },
    {
      value:
        "safety",
      label:
        "Güvenlik",
    },
    {
      value:
        "payment_problem",
      label:
        "Ödeme Problemi",
    },
    {
      value:
        "service_quality",
      label:
        "Hizmet Kalitesi",
    },
    {
      value:
        "other",
      label:
        "Diğer",
    },
  ];


function typeLabel(
  value:
    IncidentType
) {

  return (
    INCIDENT_TYPES.find(
      item =>
        item.value ===
        value
    )?.label ??
    value
  );
}


function severityLabel(
  value:
    Severity
) {

  return {
    low:
      "Düşük",
    medium:
      "Orta",
    high:
      "Yüksek",
    critical:
      "Kritik",
  }[value];
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
      value ||
      0
    )
  );
}


export default function TourIncidentCenterPage() {

  const params =
    useParams<{
      id: string;
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
    incidents,
    setIncidents,
  ] =
    useState<Incident[]>(
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
    incidentType,
    setIncidentType,
  ] =
    useState<IncidentType>(
      "missing_service"
    );


  const [
    severity,
    setSeverity,
  ] =
    useState<Severity>(
      "medium"
    );


  const [
    title,
    setTitle,
  ] =
    useState("");


  const [
    description,
    setDescription,
  ] =
    useState("");


  const [
    customerImpact,
    setCustomerImpact,
  ] =
    useState("");


  const [
    operationalImpact,
    setOperationalImpact,
  ] =
    useState("");


  const [
    estimatedLoss,
    setEstimatedLoss,
  ] =
    useState("0");


  const [
    slaDueAt,
    setSlaDueAt,
  ] =
    useState("");


  const [
    requiresCustomer,
    setRequiresCustomer,
  ] =
    useState(false);


  const [
    requiresSupplier,
    setRequiresSupplier,
  ] =
    useState(false);


  const [
    requiresFinance,
    setRequiresFinance,
  ] =
    useState(false);


  const [
    requiresManagement,
    setRequiresManagement,
  ] =
    useState(false);


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
          departureResult,
          reservationResult,
          incidentResult,
        ] =
          await Promise.all([

            supabase
              .from(
                "tour_departures"
              )
              .select(
                "id,departure_date,capacity,reserved_count"
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
                "tour_operation_incidents"
              )
              .select(
                [
                  "id",
                  "incident_number",
                  "incident_type",
                  "severity",
                  "status",
                  "source",
                  "title",
                  "description",
                  "customer_impact",
                  "operational_impact",
                  "estimated_loss_amount",
                  "actual_loss_amount",
                  "customer_compensation_amount",
                  "supplier_recoverable_amount",
                  "sla_due_at",
                  "created_at",
                  "departure_id",
                  "reservation_id",
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


        const firstError =
          [
            departureResult.error,
            reservationResult.error,
            incidentResult.error,
          ].find(
            Boolean
          );


        if (
          firstError
        ) {
          throw firstError;
        }


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


        setIncidents(
          (
            incidentResult.data ??
            []
          ) as unknown as
            Incident[]
        );

      },
      [
        tourId,
      ]
    );


  useEffect(() => {

    void (
      async () => {

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


  const visibleIncidents =
    useMemo(
      () => {

        const query =
          search
            .trim()
            .toLocaleLowerCase(
              "tr-TR"
            );


        if (
          !query
        ) {
          return incidents;
        }


        return incidents.filter(
          incident =>
            [
              incident.incident_number,
              incident.title,
              typeLabel(
                incident.incident_type
              ),
              incident.status,
              incident.description ??
                "",
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
        incidents,
        search,
      ]
    );


  const openCount =
    incidents.filter(
      incident =>
        ![
          "resolved",
          "closed",
          "cancelled",
        ].includes(
          incident.status
        )
    ).length;


  const criticalCount =
    incidents.filter(
      incident =>
        incident.severity ===
          "critical" &&
        ![
          "resolved",
          "closed",
          "cancelled",
        ].includes(
          incident.status
        )
    ).length;


  const overdueCount =
    incidents.filter(
      incident =>
        Boolean(
          incident.sla_due_at
        ) &&
        new Date(
          String(
            incident.sla_due_at
          )
        ).getTime() <
          Date.now() &&
        ![
          "resolved",
          "closed",
          "cancelled",
        ].includes(
          incident.status
        )
    ).length;


  const estimatedLossTotal =
    incidents.reduce(
      (
        total,
        incident
      ) =>
        total +
        Number(
          incident.estimated_loss_amount ||
          0
        ),
      0
    );


  async function createIncident() {

    if (
      !companyId
    ) {
      return;
    }


    if (
      !title.trim()
    ) {

      setError(
        "Hata başlığı zorunlu."
      );

      return;
    }


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
        error:
          rpcError,
      } =
        await supabase.rpc(
          "create_tour_operation_incident",
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

            p_incident_type:
              incidentType,

            p_severity:
              severity,

            p_source:
              "operation",

            p_title:
              title.trim(),

            p_description:
              description.trim() ||
              null,

            p_customer_impact:
              customerImpact.trim() ||
              null,

            p_operational_impact:
              operationalImpact.trim() ||
              null,

            p_sla_due_at:
              slaDueAt
                ? new Date(
                    slaDueAt
                  ).toISOString()
                : null,

            p_estimated_loss_amount:
              Math.max(
                Number(
                  estimatedLoss
                ) ||
                0,
                0
              ),

            p_requires_customer_action:
              requiresCustomer,

            p_requires_supplier_action:
              requiresSupplier,

            p_requires_finance_action:
              requiresFinance,

            p_requires_management_approval:
              requiresManagement,
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


      setTitle(
        ""
      );

      setDescription(
        ""
      );

      setCustomerImpact(
        ""
      );

      setOperationalImpact(
        ""
      );

      setEstimatedLoss(
        "0"
      );

      setSlaDueAt(
        ""
      );

      setNotice(
        "Operasyon hata vakası oluşturuldu."
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
        Operasyon Hata Merkezi yükleniyor...
      </main>
    );
  }


  return (
    <main
      data-tour-os-screen="incident-center"
      className="min-h-screen bg-[#030a11] text-white"
    >

      <div className="mx-auto max-w-[1750px] px-5 py-7 lg:px-8">

        <Link
          href={`/dashboard/turlar/${tourId}`}
          className="inline-flex items-center gap-2 text-[9px] font-black text-slate-500 hover:text-orange-300"
        >
          <FaArrowLeft />
          Tur Operasyon Merkezi
        </Link>


        <section className="mt-4 rounded-[30px] border border-red-500/15 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,.13),transparent_34%),linear-gradient(145deg,#07131f,#03080e)] p-6 lg:p-8">

          <div className="text-[8px] font-black uppercase tracking-[.16em] text-red-300">
            OPERASYON HATA & EKSİK HİZMET
          </div>

          <h1 className="mt-2 text-3xl font-black tracking-[-.04em] lg:text-4xl">
            Sorunları kaybolmadan yakala
          </h1>

          <p className="mt-3 max-w-3xl text-[9px] leading-5 text-slate-400">
            Eksik hizmet, tedarikçi hatası, gecikme, müşteri şikayeti ve operasyon kayıplarını SLA, finansal etki ve çözüm geçmişiyle merkezi olarak yönet.
          </p>

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
                "Açık Vaka",
              value:
                String(
                  openCount
                ),
              icon:
                <FaExclamationTriangle />,
            },
            {
              label:
                "Kritik",
              value:
                String(
                  criticalCount
                ),
              icon:
                <FaTimesCircle />,
            },
            {
              label:
                "SLA Geciken",
              value:
                String(
                  overdueCount
                ),
              icon:
                <FaClock />,
            },
            {
              label:
                "Tahmini Zarar",
              value:
                money(
                  estimatedLossTotal
                ),
              icon:
                <FaMoneyBillWave />,
            },
          ].map(
            item => (

              <article
                key={
                  item.label
                }
                className="rounded-[22px] border border-white/10 bg-[#07131f] p-5"
              >

                <div className="flex items-center justify-between">

                  <div className="text-[7px] font-black uppercase tracking-[.1em] text-slate-500">
                    {item.label}
                  </div>

                  <div className="text-orange-300">
                    {item.icon}
                  </div>

                </div>

                <div className="mt-3 text-2xl font-black">
                  {item.value}
                </div>

              </article>
            )
          )}

        </section>


        <section className="mt-5 grid gap-5 2xl:grid-cols-[520px_minmax(0,1fr)]">

          <div className="rounded-[24px] border border-white/10 bg-[#07131f]/80 p-5">

            <div className="flex items-center gap-2 text-sm font-black">
              <FaPlus className="text-orange-300" />
              Yeni Hata Vakası
            </div>


            <div className="mt-5 grid gap-4">

              <div className="grid gap-4 sm:grid-cols-2">

                <label className="grid gap-1.5">

                  <span className="text-[8px] font-black text-slate-400">
                    Hata Türü
                  </span>

                  <select
                    value={
                      incidentType
                    }
                    onChange={
                      event =>
                        setIncidentType(
                          event.target.value as
                            IncidentType
                        )
                    }
                    className="min-h-11 rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px] font-bold outline-none"
                  >

                    {INCIDENT_TYPES.map(
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


                <label className="grid gap-1.5">

                  <span className="text-[8px] font-black text-slate-400">
                    Önem
                  </span>

                  <select
                    value={
                      severity
                    }
                    onChange={
                      event =>
                        setSeverity(
                          event.target.value as
                            Severity
                        )
                    }
                    className="min-h-11 rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px] font-bold outline-none"
                  >

                    {(
                      [
                        "low",
                        "medium",
                        "high",
                        "critical",
                      ] as
                        Severity[]
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
                          {severityLabel(
                            item
                          )}
                        </option>
                      )
                    )}

                  </select>

                </label>

              </div>


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
                      Çıkış seçilmedi
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
                          {departure.departure_date}
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
                          {" kişi"}
                        </option>
                      )
                    )}

                  </select>

                </label>

              </div>


              <label className="grid gap-1.5">

                <span className="text-[8px] font-black text-slate-400">
                  Başlık *
                </span>

                <input
                  value={
                    title
                  }
                  onChange={
                    event =>
                      setTitle(
                        event.target.value
                      )
                  }
                  placeholder="Örn. Otelde oda hazır değildi"
                  className="min-h-11 rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px] outline-none"
                />

              </label>


              <label className="grid gap-1.5">

                <span className="text-[8px] font-black text-slate-400">
                  Açıklama
                </span>

                <textarea
                  value={
                    description
                  }
                  onChange={
                    event =>
                      setDescription(
                        event.target.value
                      )
                  }
                  rows={3}
                  className="rounded-xl border border-white/10 bg-[#030a11] px-3 py-3 text-[9px] outline-none"
                />

              </label>


              <label className="grid gap-1.5">

                <span className="text-[8px] font-black text-slate-400">
                  Müşteri Etkisi
                </span>

                <textarea
                  value={
                    customerImpact
                  }
                  onChange={
                    event =>
                      setCustomerImpact(
                        event.target.value
                      )
                  }
                  rows={2}
                  className="rounded-xl border border-white/10 bg-[#030a11] px-3 py-3 text-[9px] outline-none"
                />

              </label>


              <label className="grid gap-1.5">

                <span className="text-[8px] font-black text-slate-400">
                  Operasyon Etkisi
                </span>

                <textarea
                  value={
                    operationalImpact
                  }
                  onChange={
                    event =>
                      setOperationalImpact(
                        event.target.value
                      )
                  }
                  rows={2}
                  className="rounded-xl border border-white/10 bg-[#030a11] px-3 py-3 text-[9px] outline-none"
                />

              </label>


              <div className="grid gap-4 sm:grid-cols-2">

                <label className="grid gap-1.5">

                  <span className="text-[8px] font-black text-slate-400">
                    Tahmini Zarar
                  </span>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      estimatedLoss
                    }
                    onChange={
                      event =>
                        setEstimatedLoss(
                          event.target.value
                        )
                    }
                    className="min-h-11 rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px] outline-none"
                  />

                </label>


                <label className="grid gap-1.5">

                  <span className="text-[8px] font-black text-slate-400">
                    SLA Son Süre
                  </span>

                  <input
                    type="datetime-local"
                    value={
                      slaDueAt
                    }
                    onChange={
                      event =>
                        setSlaDueAt(
                          event.target.value
                        )
                    }
                    className="min-h-11 rounded-xl border border-white/10 bg-[#030a11] px-3 text-[9px] outline-none"
                  />

                </label>

              </div>


              <div className="grid gap-2 sm:grid-cols-2">

                {[
                  {
                    label:
                      "Müşteri aksiyonu",
                    checked:
                      requiresCustomer,
                    setter:
                      setRequiresCustomer,
                  },
                  {
                    label:
                      "Tedarikçi aksiyonu",
                    checked:
                      requiresSupplier,
                    setter:
                      setRequiresSupplier,
                  },
                  {
                    label:
                      "Finans aksiyonu",
                    checked:
                      requiresFinance,
                    setter:
                      setRequiresFinance,
                  },
                  {
                    label:
                      "Yönetici onayı",
                    checked:
                      requiresManagement,
                    setter:
                      setRequiresManagement,
                  },
                ].map(
                  item => (

                    <label
                      key={
                        item.label
                      }
                      className="flex items-center gap-2 rounded-xl border border-white/[.08] bg-[#030a11]/60 px-3 py-3 text-[8px] font-bold"
                    >

                      <input
                        type="checkbox"
                        checked={
                          item.checked
                        }
                        onChange={
                          event =>
                            item.setter(
                              event.target.checked
                            )
                        }
                      />

                      {item.label}

                    </label>
                  )
                )}

              </div>


              <button
                type="button"
                disabled={
                  busy
                }
                onClick={
                  () =>
                    void createIncident()
                }
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-red-500 px-4 text-[9px] font-black text-white disabled:opacity-50"
              >
                <FaPlus />
                Hata Vakasını Aç
              </button>

            </div>

          </div>


          <div className="min-w-0">

            <div className="flex flex-col gap-3 rounded-[20px] border border-white/10 bg-white/[.025] p-4 sm:flex-row sm:items-center sm:justify-between">

              <div>

                <div className="text-sm font-black">
                  Operasyon Hata Kayıtları
                </div>

                <div className="mt-1 text-[8px] text-slate-500">
                  Açık, kritik ve SLA riski taşıyan vakalar
                </div>

              </div>


              <div className="relative">

                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] text-slate-600" />

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
                  placeholder="Hata ara..."
                  className="min-h-10 rounded-xl border border-white/10 bg-[#030a11] pl-9 pr-3 text-[8px] outline-none"
                />

              </div>

            </div>


            <div className="mt-3 overflow-x-auto rounded-[22px] border border-white/10">

              <table className="min-w-[1250px] text-left">

                <thead className="bg-[#07131f]">

                  <tr className="text-[7px] font-black uppercase tracking-[.1em] text-slate-500">

                    <th className="px-4 py-3">
                      Vaka
                    </th>

                    <th className="px-4 py-3">
                      Tür
                    </th>

                    <th className="px-4 py-3">
                      Önem
                    </th>

                    <th className="px-4 py-3">
                      Durum
                    </th>

                    <th className="px-4 py-3">
                      SLA
                    </th>

                    <th className="px-4 py-3 text-right">
                      Tahmini Zarar
                    </th>

                    <th className="px-4 py-3 text-right">
                      Gerçek Zarar
                    </th>

                  </tr>

                </thead>


                <tbody>

                  {visibleIncidents.map(
                    incident => {

                      const overdue =
                        Boolean(
                          incident.sla_due_at
                        ) &&
                        new Date(
                          String(
                            incident.sla_due_at
                          )
                        ).getTime() <
                          Date.now() &&
                        ![
                          "resolved",
                          "closed",
                          "cancelled",
                        ].includes(
                          incident.status
                        );


                      return (

                        <tr
                          key={
                            incident.id
                          }
                          className="border-t border-white/[.055] text-[8px] font-bold hover:bg-red-500/[.025]"
                        >

                          <td className="px-4 py-4">

                            <Link
                              href={`/dashboard/turlar/${tourId}/hatalar/${incident.id}`}
                              className="font-black text-white hover:text-orange-300"
                            >
                              {incident.incident_number}
                            </Link>

                            <div className="mt-1 max-w-[280px] truncate text-slate-500">
                              {incident.title}
                            </div>

                          </td>


                          <td className="px-4 py-4">
                            {typeLabel(
                              incident.incident_type
                            )}
                          </td>


                          <td className="px-4 py-4">

                            <span
                              className={`rounded-full border px-2 py-1 text-[7px] font-black ${
                                incident.severity ===
                                  "critical"
                                  ? "border-red-500/25 bg-red-500/[.08] text-red-300"
                                  : incident.severity ===
                                      "high"
                                    ? "border-orange-500/25 bg-orange-500/[.08] text-orange-300"
                                    : "border-white/10 bg-white/[.03] text-slate-400"
                              }`}
                            >
                              {severityLabel(
                                incident.severity
                              )}
                            </span>

                          </td>


                          <td className="px-4 py-4">
                            {incident.status}
                          </td>


                          <td className="px-4 py-4">

                            {incident.sla_due_at
                              ? (
                                <span
                                  className={
                                    overdue
                                      ? "font-black text-red-300"
                                      : "text-slate-500"
                                  }
                                >
                                  {new Date(
                                    incident.sla_due_at
                                  ).toLocaleString(
                                    "tr-TR"
                                  )}
                                </span>
                              )
                              : "—"}

                          </td>


                          <td className="px-4 py-4 text-right font-black text-amber-300">
                            {money(
                              incident.estimated_loss_amount
                            )}
                          </td>


                          <td className="px-4 py-4 text-right font-black">
                            {money(
                              incident.actual_loss_amount
                            )}
                          </td>

                        </tr>
                      );
                    }
                  )}


                  {visibleIncidents.length ===
                    0 && (

                    <tr>

                      <td
                        colSpan={7}
                        className="px-6 py-14 text-center text-[8px] text-slate-600"
                      >
                        Operasyon hata vakası bulunmuyor.
                      </td>

                    </tr>
                  )}

                </tbody>

              </table>

            </div>

          </div>

        </section>

      </div>

    </main>
  );
}

// TOUR_OS_PHASE16_INCIDENT_DETAIL_LINK
