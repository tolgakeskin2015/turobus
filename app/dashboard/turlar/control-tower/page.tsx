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
  FaBus,
  FaChartLine,
  FaCheckCircle,
  FaExclamationTriangle,
  FaMoneyBillWave,
  FaPlane,
  FaSearch,
  FaTasks,
  FaTicketAlt,
  FaTimesCircle,
  FaUsers,
} from "react-icons/fa";

import {
  supabase,
} from "@/lib/supabase";

import {
  getCurrentMembership,
} from "@/lib/current-user";


import RefundClosureAlarm from "./RefundClosureAlarm";
import IncidentCriticalAlarm from "./IncidentCriticalAlarm";
import ProtectionAutomationAlarm from "./ProtectionAutomationAlarm";
import FinanceProfitAlarm from "./FinanceProfitAlarm";
import ProductPriceAlarm from "./ProductPriceAlarm";


type TransportMode =
  | "air"
  | "bus"
  | "other";


type Tour = {
  id: string;
  title: string;
  transport_mode:
    TransportMode;
  operation_status: string;
};


type Departure = {
  id: string;
  tour_id: string;
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


type Passenger = {
  id: string;
  tour_id: string;
  departure_id: string;
  reservation_id:
    string | null;
  birth_date:
    string | null;
  identity_type:
    string | null;
  identity_number:
    string | null;
  room_group:
    string | null;
  room_no:
    string | null;
};


type Flight = {
  id: string;
  tour_id: string;
  direction:
    "outbound" |
    "return";
  ticketing_deadline:
    string | null;
  pnr:
    string | null;
  group_booking_code:
    string | null;
  airline_name:
    string | null;
  flight_number:
    string | null;
  departure_at:
    string | null;
  arrival_at:
    string | null;
  status: string;
};


type BusOperation = {
  id: string;
  tour_id: string;
  vehicle_id:
    string | null;
  driver_1_name:
    string | null;
  driver_1_phone:
    string | null;
  guide_name:
    string | null;
  guide_phone:
    string | null;
  seat_capacity:
    number | null;
  status: string;
};


type BusSeat = {
  id: string;
  tour_id: string;
  passenger_id:
    string | null;
  boarding_stop_id:
    string | null;
};


type ManifestRow = {
  departure_id: string;
  reservation_id: string;
};


type Expense = {
  departure_id:
    string | null;
  total_amount: number;
  paid_amount: number;
  payment_status: string;
};


type Sale = {
  reservation_id:
    string | null;
  grand_total: number;
  company_gross_profit: number;
  payment_status: string;
};


type CommunicationSummary = {
  id: string;
  tour_id: string;
  departure_id:
    string | null;
  channel: string;
  delivery_status: string;
  scheduled_at:
    string | null;
};


type DocumentSummary = {
  id: string;
  tour_id: string;
  departure_id:
    string | null;
  document_status: string;
  is_required: boolean;
  expires_at:
    string | null;
};


type SupplierCommitmentSummary = {
  id: string;
  tour_id: string;
  departure_id:
    string | null;
  confirmation_status: string;
  operational_status: string;
  payment_due_at:
    string | null;
  operation_expense_id:
    string | null;
};


type TaskSummary = {
  id: string;
  tour_id: string;
  departure_id:
    string | null;
  priority: string;
  status: string;
  due_at:
    string | null;
};


type TowerRow = {
  tour:
    Tour;
  departure:
    Departure;
  expectedPassenger:
    number;
  passengerCount:
    number;
  occupancy:
    number;
  readiness:
    number;
  criticalCount:
    number;
  warningCount:
    number;
  revenue:
    number;
  expenses:
    number;
  contribution:
    number;
  deadlineRisk:
    boolean;
  expiredDeadline:
    boolean;
  openTaskCount:
    number;
  overdueTaskCount:
    number;
  criticalTaskCount:
    number;
  pendingSupplierConfirmationCount:
    number;
  supplierIssueCount:
    number;
  requiredDocumentAlertCount:
    number;
  expiredDocumentCount:
    number;
  communicationAlertCount:
    number;
};


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


function formatDate(
  value:
    string
) {
  const date =
    new Date(
      `${value}T00:00:00`
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
    }
  ).format(
    date
  );
}


function documentReady(
  passenger:
    Passenger
) {
  return Boolean(
    passenger.birth_date &&
    passenger.identity_type &&
    passenger.identity_number
  );
}


function readinessClass(
  value:
    number
) {
  if (
    value ===
    100
  ) {
    return "text-emerald-300";
  }

  if (
    value >=
    70
  ) {
    return "text-amber-300";
  }

  return "text-red-300";
}


export default function TourControlTowerPage() {
  const [
    tours,
    setTours,
  ] =
    useState<Tour[]>(
      []
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
    passengers,
    setPassengers,
  ] =
    useState<Passenger[]>(
      []
    );

  const [
    flights,
    setFlights,
  ] =
    useState<Flight[]>(
      []
    );

  const [
    busOperations,
    setBusOperations,
  ] =
    useState<BusOperation[]>(
      []
    );

  const [
    busSeats,
    setBusSeats,
  ] =
    useState<BusSeat[]>(
      []
    );

  const [
    manifest,
    setManifest,
  ] =
    useState<ManifestRow[]>(
      []
    );

  const [
    expenses,
    setExpenses,
  ] =
    useState<Expense[]>(
      []
    );

  const [
    sales,
    setSales,
  ] =
    useState<Sale[]>(
      []
    );


  const [
    tasks,
    setTasks,
  ] =
    useState<TaskSummary[]>(
      []
    );


  const [
    supplierCommitments,
    setSupplierCommitments,
  ] =
    useState<SupplierCommitmentSummary[]>(
      []
    );


  const [
    documents,
    setDocuments,
  ] =
    useState<DocumentSummary[]>(
      []
    );


  const [
    communications,
    setCommunications,
  ] =
    useState<CommunicationSummary[]>(
      []
    );

  const [
    search,
    setSearch,
  ] =
    useState("");

  const [
    transport,
    setTransport,
  ] =
    useState<
      "all" |
      TransportMode
    >(
      "all"
    );

  const [
    risk,
    setRisk,
  ] =
    useState<
      "all" |
      "critical" |
      "warning" |
      "ready"
    >(
      "all"
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState("");


  const initialize =
    useCallback(
      async () => {

        setLoading(
          true
        );

        setError(
          ""
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


          const companyId =
            membership.company_id;


          const [
            tourResult,
            departureResult,
            reservationResult,
            passengerResult,
            flightResult,
            busOperationResult,
            busSeatResult,
            manifestResult,
            expenseResult,
            salesResult,
            taskResult,
            supplierCommitmentResult,
            documentResult,
            communicationResult,
          ] =
            await Promise.all([

              supabase
                .from(
                  "tours"
                )
                .select(
                  [
                    "id",
                    "title",
                    "transport_mode",
                    "operation_status",
                  ].join(",")
                )
                .eq(
                  "company_id",
                  companyId
                )
                .neq(
                  "operation_status",
                  "cancelled"
                ),


              supabase
                .from(
                  "tour_departures"
                )
                .select(
                  [
                    "id",
                    "tour_id",
                    "departure_date",
                    "capacity",
                    "reserved_count",
                    "status",
                  ].join(",")
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
                  [
                    "id",
                    "departure_id",
                    "guests",
                    "status",
                  ].join(",")
                )
                .eq(
                  "company_id",
                  companyId
                )
                .neq(
                  "status",
                  "cancelled"
                ),


              supabase
                .from(
                  "tour_passengers"
                )
                .select(
                  [
                    "id",
                    "tour_id",
                    "departure_id",
                    "reservation_id",
                    "birth_date",
                    "identity_type",
                    "identity_number",
                    "room_group",
                    "room_no",
                  ].join(",")
                )
                .eq(
                  "company_id",
                  companyId
                ),


              supabase
                .from(
                  "tour_flights"
                )
                .select(
                  [
                    "id",
                    "tour_id",
                    "direction",
                    "ticketing_deadline",
                    "pnr",
                    "group_booking_code",
                    "airline_name",
                    "flight_number",
                    "departure_at",
                    "arrival_at",
                    "status",
                  ].join(",")
                )
                .eq(
                  "company_id",
                  companyId
                ),


              supabase
                .from(
                  "tour_bus_operations"
                )
                .select(
                  [
                    "id",
                    "tour_id",
                    "vehicle_id",
                    "driver_1_name",
                    "driver_1_phone",
                    "guide_name",
                    "guide_phone",
                    "seat_capacity",
                    "status",
                  ].join(",")
                )
                .eq(
                  "company_id",
                  companyId
                ),


              supabase
                .from(
                  "tour_bus_seats"
                )
                .select(
                  [
                    "id",
                    "tour_id",
                    "passenger_id",
                    "boarding_stop_id",
                  ].join(",")
                )
                .eq(
                  "company_id",
                  companyId
                ),


              supabase
                .from(
                  "tour_departure_manifest_view"
                )
                .select(
                  "departure_id,reservation_id"
                )
                .eq(
                  "company_id",
                  companyId
                ),


              supabase
                .from(
                  "operation_expenses"
                )
                .select(
                  [
                    "departure_id",
                    "total_amount",
                    "paid_amount",
                    "payment_status",
                  ].join(",")
                )
                .eq(
                  "company_id",
                  companyId
                )
                .neq(
                  "payment_status",
                  "cancelled"
                ),


              supabase
                .from(
                  "sales"
                )
                .select(
                  [
                    "reservation_id",
                    "grand_total",
                    "company_gross_profit",
                    "payment_status",
                  ].join(",")
                )
                .eq(
                  "company_id",
                  companyId
                )
                .neq(
                  "payment_status",
                  "cancelled"
                ),


              supabase
                .from(
                  "tour_operation_tasks"
                )
                .select(
                  [
                    "id",
                    "tour_id",
                    "departure_id",
                    "priority",
                    "status",
                    "due_at",
                  ].join(",")
                )
                .eq(
                  "company_id",
                  companyId
                )
                .neq(
                  "status",
                  "cancelled"
                ),


              supabase
                .from(
                  "tour_supplier_commitments"
                )
                .select(
                  [
                    "id",
                    "tour_id",
                    "departure_id",
                    "confirmation_status",
                    "operational_status",
                    "payment_due_at",
                    "operation_expense_id",
                  ].join(",")
                )
                .eq(
                  "company_id",
                  companyId
                )
                .neq(
                  "confirmation_status",
                  "cancelled"
                ),


              supabase
                .from(
                  "tour_documents"
                )
                .select(
                  [
                    "id",
                    "tour_id",
                    "departure_id",
                    "document_status",
                    "is_required",
                    "expires_at",
                  ].join(",")
                )
                .eq(
                  "company_id",
                  companyId
                )
                .neq(
                  "document_status",
                  "cancelled"
                ),


              supabase
                .from(
                  "tour_operation_communications"
                )
                .select(
                  [
                    "id",
                    "tour_id",
                    "departure_id",
                    "channel",
                    "delivery_status",
                    "scheduled_at",
                  ].join(",")
                )
                .eq(
                  "company_id",
                  companyId
                )
                .neq(
                  "delivery_status",
                  "cancelled"
                ),

            ]);


          const errors = [
            tourResult.error,
            departureResult.error,
            reservationResult.error,
            passengerResult.error,
            flightResult.error,
            busOperationResult.error,
            busSeatResult.error,
            manifestResult.error,
            expenseResult.error,
            salesResult.error,
            taskResult.error,
            supplierCommitmentResult.error,
            documentResult.error,
            communicationResult.error,
          ].filter(Boolean);


          if (
            errors.length >
            0
          ) {
            throw errors[0];
          }


          setTours(
            (
              tourResult.data ??
              []
            ) as unknown as
              Tour[]
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


          setPassengers(
            (
              passengerResult.data ??
              []
            ) as unknown as
              Passenger[]
          );


          setFlights(
            (
              flightResult.data ??
              []
            ) as unknown as
              Flight[]
          );


          setBusOperations(
            (
              busOperationResult.data ??
              []
            ) as unknown as
              BusOperation[]
          );


          setBusSeats(
            (
              busSeatResult.data ??
              []
            ) as unknown as
              BusSeat[]
          );


          setManifest(
            (
              manifestResult.data ??
              []
            ) as unknown as
              ManifestRow[]
          );


          setExpenses(
            (
              expenseResult.data ??
              []
            ) as unknown as
              Expense[]
          );


          setSales(
            (
              salesResult.data ??
              []
            ) as unknown as
              Sale[]
          );


          setTasks(
            (
              taskResult.data ??
              []
            ) as unknown as
              TaskSummary[]
          );


          setSupplierCommitments(
            (
              supplierCommitmentResult.data ??
              []
            ) as unknown as
              SupplierCommitmentSummary[]
          );


          setDocuments(
            (
              documentResult.data ??
              []
            ) as unknown as
              DocumentSummary[]
          );


          setCommunications(
            (
              communicationResult.data ??
              []
            ) as unknown as
              CommunicationSummary[]
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

      },
      []
    );


  useEffect(() => {
    void initialize();
  }, [
    initialize,
  ]);


  const rows =
    useMemo<
      TowerRow[]
    >(
      () => {

        return departures
          .map(
            departure => {

              const tour =
                tours.find(
                  item =>
                    item.id ===
                    departure.tour_id
                );


              if (!tour) {
                return null;
              }


              const departureReservations =
                reservations.filter(
                  item =>
                    item.departure_id ===
                    departure.id
                );


              const reservationIds =
                new Set(
                  departureReservations.map(
                    item =>
                      item.id
                  )
                );


              const departurePassengers =
                passengers.filter(
                  item =>
                    item.departure_id ===
                    departure.id
                );


              const expectedPassenger =
                departureReservations.reduce(
                  (
                    total,
                    reservation
                  ) =>
                    total +
                    Number(
                      reservation.guests ??
                      0
                    ),
                  0
                );


              const occupancy =
                departure.capacity >
                  0
                  ? Math.round(
                      (
                        expectedPassenger /
                        departure.capacity
                      ) *
                        100
                    )
                  : 0;


              const departureManifest =
                manifest.filter(
                  item =>
                    item.departure_id ===
                    departure.id
                );


              const departureSales =
                sales.filter(
                  sale =>
                    sale.reservation_id &&
                    reservationIds.has(
                      sale.reservation_id
                    )
                );


              const revenue =
                departureSales.reduce(
                  (
                    total,
                    sale
                  ) =>
                    total +
                    Number(
                      sale.grand_total ??
                      0
                    ),
                  0
                );


              const grossProfit =
                departureSales.reduce(
                  (
                    total,
                    sale
                  ) =>
                    total +
                    Number(
                      sale.company_gross_profit ??
                      0
                    ),
                  0
                );


              const departureExpenses =
                expenses.filter(
                  expense =>
                    expense.departure_id ===
                    departure.id
                );


              const expenseTotal =
                departureExpenses.reduce(
                  (
                    total,
                    expense
                  ) =>
                    total +
                    Number(
                      expense.total_amount ??
                      0
                    ),
                  0
                );


              const contribution =
                grossProfit -
                expenseTotal;


              const departureTasks =
                tasks.filter(
                  task =>
                    task.tour_id ===
                      tour.id &&
                    (
                      task.departure_id ===
                        departure.id ||
                      task.departure_id ===
                        null
                    )
                );


              const openTasks =
                departureTasks.filter(
                  task =>
                    ![
                      "completed",
                      "cancelled",
                    ].includes(
                      task.status
                    )
                );


              const overdueTaskCount =
                openTasks.filter(
                  task =>
                    Boolean(
                      task.due_at
                    ) &&
                    new Date(
                      String(
                        task.due_at
                      )
                    ).getTime() <
                      Date.now()
                ).length;


              const criticalTaskCount =
                openTasks.filter(
                  task =>
                    task.priority ===
                    "critical"
                ).length;


              const departureSupplierCommitments =
                supplierCommitments.filter(
                  item =>
                    item.tour_id ===
                      tour.id &&
                    (
                      item.departure_id ===
                        departure.id ||
                      item.departure_id ===
                        null
                    )
                );


              const pendingSupplierConfirmationCount =
                departureSupplierCommitments.filter(
                  item =>
                    [
                      "pending",
                      "requested",
                    ].includes(
                      item.confirmation_status
                    )
                ).length;


              const supplierIssueCount =
                departureSupplierCommitments.filter(
                  item =>
                    item.operational_status ===
                    "issue"
                ).length;


              const departureDocuments =
                documents.filter(
                  document =>
                    document.tour_id ===
                      tour.id &&
                    (
                      document.departure_id ===
                        departure.id ||
                      document.departure_id ===
                        null
                    )
                );


              const requiredDocumentAlertCount =
                departureDocuments.filter(
                  document =>
                    document.is_required &&
                    ![
                      "ready",
                      "sent",
                      "cancelled",
                    ].includes(
                      document.document_status
                    )
                ).length;


              const expiredDocumentCount =
                departureDocuments.filter(
                  document => {

                    if (
                      !document.expires_at ||
                      document.document_status ===
                        "cancelled"
                    ) {
                      return false;
                    }


                    const time =
                      new Date(
                        document.expires_at
                      ).getTime();


                    return (
                      Number.isFinite(
                        time
                      ) &&
                      time <
                        Date.now()
                    );

                  }
                ).length;


              const departureCommunications =
                communications.filter(
                  communication =>
                    communication.tour_id ===
                      tour.id &&
                    (
                      communication.departure_id ===
                        departure.id ||
                      communication.departure_id ===
                        null
                    )
                );


              const communicationFailedCount =
                departureCommunications.filter(
                  communication =>
                    communication.delivery_status ===
                    "failed"
                ).length;


              const communicationOverdueCount =
                departureCommunications.filter(
                  communication => {

                    if (
                      !communication.scheduled_at ||
                      ![
                        "draft",
                        "ready",
                        "queued",
                      ].includes(
                        communication.delivery_status
                      )
                    ) {
                      return false;
                    }


                    const time =
                      new Date(
                        communication.scheduled_at
                      ).getTime();


                    return (
                      Number.isFinite(
                        time
                      ) &&
                      time <
                        Date.now()
                    );

                  }
                ).length;


              const communicationAlertCount =
                communicationFailedCount +
                communicationOverdueCount;


              const checks:
                {
                  ok:
                    boolean;
                  critical:
                    boolean;
                  warning:
                    boolean;
                }[] = [];


              checks.push({
                ok:
                  expectedPassenger >
                    0 &&
                  departurePassengers.length ===
                    expectedPassenger,

                critical:
                  departurePassengers.length !==
                  expectedPassenger,

                warning:
                  false,
              });


              checks.push({
                ok:
                  departurePassengers.length >
                    0 &&
                  departurePassengers.every(
                    documentReady
                  ),

                critical:
                  !(
                    departurePassengers.length >
                      0 &&
                    departurePassengers.every(
                      documentReady
                    )
                  ),

                warning:
                  false,
              });


              checks.push({
                ok:
                  departureReservations.length >
                    0 &&
                  departureManifest.length >=
                    departureReservations.length,

                critical:
                  !(
                    departureReservations.length >
                      0 &&
                    departureManifest.length >=
                      departureReservations.length
                  ),

                warning:
                  false,
              });


              let deadlineRisk =
                false;

              let expiredDeadline =
                false;


              if (
                tour.transport_mode ===
                "air"
              ) {

                const activeFlights =
                  flights.filter(
                    flight =>
                      flight.tour_id ===
                        tour.id &&
                      flight.status !==
                        "cancelled"
                  );


                const flightCoreReady =
                  activeFlights.length >
                    0 &&
                  activeFlights.every(
                    flight =>
                      Boolean(
                        flight.airline_name &&
                        flight.flight_number &&
                        flight.departure_at &&
                        flight.arrival_at
                      )
                  );


                checks.push({
                  ok:
                    flightCoreReady,

                  critical:
                    !flightCoreReady,

                  warning:
                    false,
                });


                const pnrReady =
                  activeFlights.length >
                    0 &&
                  activeFlights.every(
                    flight =>
                      Boolean(
                        flight.pnr ||
                        flight.group_booking_code
                      )
                  );


                checks.push({
                  ok:
                    pnrReady,

                  critical:
                    !pnrReady,

                  warning:
                    false,
                });


                for (
                  const flight
                  of activeFlights
                ) {

                  if (
                    !flight.ticketing_deadline ||
                    [
                      "ticketed",
                      "departed",
                      "arrived",
                    ].includes(
                      flight.status
                    )
                  ) {
                    continue;
                  }


                  const deadline =
                    new Date(
                      flight.ticketing_deadline
                    ).getTime();


                  if (
                    Number.isNaN(
                      deadline
                    )
                  ) {
                    continue;
                  }


                  const diff =
                    deadline -
                    Date.now();


                  if (
                    diff <
                    0
                  ) {
                    expiredDeadline =
                      true;
                    deadlineRisk =
                      true;
                  } else if (
                    diff <=
                    72 *
                    60 *
                    60 *
                    1000
                  ) {
                    deadlineRisk =
                      true;
                  }

                }


                checks.push({
                  ok:
                    !deadlineRisk,

                  critical:
                    expiredDeadline,

                  warning:
                    deadlineRisk &&
                    !expiredDeadline,
                });

              }


              if (
                tour.transport_mode ===
                "bus"
              ) {

                const operations =
                  busOperations.filter(
                    operation =>
                      operation.tour_id ===
                      tour.id
                  );


                const vehicleReady =
                  operations.length >
                    0 &&
                  operations.every(
                    operation =>
                      Boolean(
                        operation.vehicle_id
                      )
                  );


                checks.push({
                  ok:
                    vehicleReady,

                  critical:
                    !vehicleReady,

                  warning:
                    false,
                });


                const teamReady =
                  operations.length >
                    0 &&
                  operations.every(
                    operation =>
                      Boolean(
                        operation.driver_1_name &&
                        operation.driver_1_phone &&
                        operation.guide_name &&
                        operation.guide_phone
                      )
                  );


                checks.push({
                  ok:
                    teamReady,

                  critical:
                    !teamReady,

                  warning:
                    false,
                });


                const linkedPassengerIds =
                  new Set(
                    busSeats
                      .filter(
                        seat =>
                          seat.tour_id ===
                            tour.id &&
                          Boolean(
                            seat.passenger_id
                          )
                      )
                      .map(
                        seat =>
                          seat.passenger_id
                      )
                  );


                const seatsReady =
                  departurePassengers.length >
                    0 &&
                  departurePassengers.every(
                    passenger =>
                      linkedPassengerIds.has(
                        passenger.id
                      )
                  );


                checks.push({
                  ok:
                    seatsReady,

                  critical:
                    !seatsReady,

                  warning:
                    false,
                });


                const boardingReady =
                  busSeats
                    .filter(
                      seat =>
                        seat.tour_id ===
                          tour.id &&
                        Boolean(
                          seat.passenger_id
                        )
                    )
                    .every(
                      seat =>
                        Boolean(
                          seat.boarding_stop_id
                        )
                    ) &&
                  linkedPassengerIds.size >=
                    departurePassengers.length &&
                  departurePassengers.length >
                    0;


                checks.push({
                  ok:
                    boardingReady,

                  critical:
                    false,

                  warning:
                    !boardingReady,
                });

              }


              const required =
                checks.length;


              const passed =
                checks.filter(
                  check =>
                    check.ok
                ).length;


              const readiness =
                required >
                  0
                  ? Math.round(
                      (
                        passed /
                        required
                      ) *
                        100
                    )
                  : 0;


              const criticalCount =
                checks.filter(
                  check =>
                    check.critical
                ).length;


              const warningCount =
                checks.filter(
                  check =>
                    check.warning
                ).length;


              return {
                tour,
                departure,
                expectedPassenger,
                passengerCount:
                  departurePassengers.length,
                occupancy,
                readiness,
                criticalCount,
                warningCount,
                revenue,
                expenses:
                  expenseTotal,
                contribution,
                deadlineRisk,
                expiredDeadline,
                openTaskCount:
                  openTasks.length,
                overdueTaskCount,
                criticalTaskCount,
                pendingSupplierConfirmationCount,
                supplierIssueCount,
                requiredDocumentAlertCount,
                expiredDocumentCount,
                communicationAlertCount,
              };

            }
          )
          .filter(
            (
              row
            ):
              row is TowerRow =>
                row !==
                null
          );

      },
      [
        busOperations,
        busSeats,
        departures,
        expenses,
        flights,
        manifest,
        passengers,
        reservations,
        communications,
        documents,
        sales,
        supplierCommitments,
        tasks,
        tours,
      ]
    );


  const filteredRows =
    useMemo(
      () => {

        const query =
          search
            .trim()
            .toLocaleLowerCase(
              "tr-TR"
            );


        return rows.filter(
          row => {

            if (
              transport !==
                "all" &&
              row.tour.transport_mode !==
                transport
            ) {
              return false;
            }


            if (
              risk ===
                "critical" &&
              row.criticalCount ===
                0
            ) {
              return false;
            }


            if (
              risk ===
                "warning" &&
              row.warningCount ===
                0
            ) {
              return false;
            }


            if (
              risk ===
                "ready" &&
              row.readiness !==
                100
            ) {
              return false;
            }


            if (
              query &&
              !row.tour.title
                .toLocaleLowerCase(
                  "tr-TR"
                )
                .includes(
                  query
                )
            ) {
              return false;
            }


            return true;

          }
        );

      },
      [
        risk,
        rows,
        search,
        transport,
      ]
    );


  const today =
    new Date()
      .toISOString()
      .slice(
        0,
        10
      );


  const todayRows =
    rows.filter(
      row =>
        row.departure.departure_date ===
        today
    );


  const activeRows =
    rows.filter(
      row =>
        [
          "confirmed",
          "preparing",
          "ready",
          "active",
          "returning",
        ].includes(
          row.tour.operation_status
        )
    );


  const totalPassenger =
    rows.reduce(
      (
        total,
        row
      ) =>
        total +
        row.expectedPassenger,
      0
    );


  const totalCapacity =
    rows.reduce(
      (
        total,
        row
      ) =>
        total +
        Number(
          row.departure.capacity ??
          0
        ),
      0
    );


  const averageOccupancy =
    totalCapacity >
      0
      ? Math.round(
          (
            totalPassenger /
            totalCapacity
          ) *
            100
        )
      : 0;


  const totalRevenue =
    rows.reduce(
      (
        total,
        row
      ) =>
        total +
        row.revenue,
      0
    );


  const totalContribution =
    rows.reduce(
      (
        total,
        row
      ) =>
        total +
        row.contribution,
      0
    );


  const totalCritical =
    rows.reduce(
      (
        total,
        row
      ) =>
        total +
        row.criticalCount,
      0
    );


  const deadlineRiskCount =
    rows.filter(
      row =>
        row.deadlineRisk
    ).length;


  const totalOverdueTasks =
    rows.reduce(
      (
        total,
        row
      ) =>
        total +
        row.overdueTaskCount,
      0
    );


  const totalSupplierAlerts =
    rows.reduce(
      (
        total,
        row
      ) =>
        total +
        row.pendingSupplierConfirmationCount +
        row.supplierIssueCount,
      0
    );


  const totalDocumentAlerts =
    rows.reduce(
      (
        total,
        row
      ) =>
        total +
        row.requiredDocumentAlertCount +
        row.expiredDocumentCount,
      0
    );


  const totalCommunicationAlerts =
    rows.reduce(
      (
        total,
        row
      ) =>
        total +
        row.communicationAlertCount,
      0
    );


  if (
    loading
  ) {
    return (
      <main className="grid min-h-[70vh] place-items-center bg-[#030a11] text-white">
        Control Tower hazırlanıyor...
      </main>
    );
  }


  return (
    <main data-tour-os-screen="control-tower" className="min-h-screen bg-[#030a11] text-white">

      <div className="mx-auto max-w-[1800px] px-5 py-7 lg:px-8">

        <Link
          href="/dashboard/turlar"
          className="inline-flex items-center gap-2 text-[9px] font-black text-slate-500 hover:text-orange-300"
        >
          <FaArrowLeft />
          Tur Yönetimi
        </Link>


        <section className="mt-4 rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,.16),transparent_33%),linear-gradient(145deg,#07131f,#03080e)] p-6 lg:p-8">

          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">

            <div>

              <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/[.08] px-3 py-1.5 text-[8px] font-black uppercase tracking-[.16em] text-orange-300">
                <FaChartLine />
                TOUR OPERATIONS CONTROL TOWER
              </div>


              <h1 className="mt-4 text-3xl font-black tracking-[-.05em] lg:text-5xl">
                Tur Operasyon
                <span className="text-orange-400">
                  {" "}
                  Control Tower
                </span>
              </h1>


              <p className="mt-3 max-w-3xl text-[10px] leading-6 text-slate-400">
                Uçaklı ve otobüslü tüm tur çıkışlarını yolcu, doluluk,
                hazırlık, alarm ve finans verileriyle tek ekrandan yönetin.
              </p>

            </div>


            <div className="rounded-2xl border border-white/10 bg-black/20 px-5 py-4">

              <div className="text-[7px] font-black uppercase tracking-[.12em] text-slate-600">
                KRİTİK OPERASYON ALARMI
              </div>

              <div className="mt-2 text-3xl font-black text-red-300">
                {totalCritical}
              </div>

            </div>

          </div>

        </section>


        {error && (
          <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/[.06] px-4 py-3 text-[8px] font-black text-red-300">
            {error}
          </div>
        )}


        <RefundClosureAlarm />

        <IncidentCriticalAlarm />

        <ProtectionAutomationAlarm />

        <FinanceProfitAlarm />

        <ProductPriceAlarm />

        <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-7">

          {[
            {
              label:
                "Bugünkü Çıkış",
              value:
                todayRows.length,
            },

            {
              label:
                "Aktif Tur",
              value:
                activeRows.length,
            },

            {
              label:
                "Toplam Yolcu",
              value:
                totalPassenger,
            },

            {
              label:
                "Doluluk",
              value:
                `%${averageOccupancy}`,
            },

            {
              label:
                "Ciro",
              value:
                money(
                  totalRevenue
                ),
            },

            {
              label:
                "Operasyon Katkısı",
              value:
                money(
                  totalContribution
                ),
            },

            {
              label:
                "Deadline Riski",
              value:
                deadlineRiskCount,
            },

            {
              label:
                "Geciken Görev",
              value:
                totalOverdueTasks,
            },

            {
              label:
                "Tedarikçi Alarmı",
              value:
                totalSupplierAlerts,
            },

            {
              label:
                "Belge Alarmı",
              value:
                totalDocumentAlerts,
            },

            {
              label:
                "İletişim Alarmı",
              value:
                totalCommunicationAlerts,
            },
          ].map(
            item => (
              <article
                key={
                  item.label
                }
                className="rounded-[22px] border border-white/10 bg-[#07131f] p-5"
              >
                <div className="text-[7px] font-black uppercase tracking-[.1em] text-slate-600">
                  {item.label}
                </div>

                <div className="mt-3 text-2xl font-black">
                  {item.value}
                </div>
              </article>
            )
          )}

        </section>


        <section className="mt-5 rounded-[26px] border border-white/10 bg-[#07131f] p-5">

          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">

            <div className="relative w-full max-w-xl">

              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[8px] text-slate-600" />

              <input
                value={
                  search
                }
                onChange={event =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Tur ara..."
                className="h-11 w-full rounded-xl border border-white/10 bg-[#030a11] pl-9 pr-3 text-[8px]"
              />

            </div>


            <div className="flex flex-wrap gap-2">

              <select
                value={
                  transport
                }
                onChange={event =>
                  setTransport(
                    event.target.value as
                      typeof transport
                  )
                }
                className="h-10 rounded-xl border border-white/10 bg-[#030a11] px-3 text-[8px]"
              >
                <option value="all">
                  Tüm Ulaşım
                </option>

                <option value="air">
                  Uçaklı
                </option>

                <option value="bus">
                  Otobüslü
                </option>

                <option value="other">
                  Belirlenmedi
                </option>
              </select>


              <select
                value={
                  risk
                }
                onChange={event =>
                  setRisk(
                    event.target.value as
                      typeof risk
                  )
                }
                className="h-10 rounded-xl border border-white/10 bg-[#030a11] px-3 text-[8px]"
              >
                <option value="all">
                  Tüm Durumlar
                </option>

                <option value="critical">
                  Kritik
                </option>

                <option value="warning">
                  Uyarı
                </option>

                <option value="ready">
                  %100 Hazır
                </option>
              </select>

            </div>

          </div>

        </section>


        <section className="mt-5 overflow-hidden rounded-[28px] border border-white/10 bg-[#07131f]">

          <div className="overflow-auto">

            <table className="min-w-[1750px] w-full">

              <thead className="sticky top-0 z-10 bg-[#081522]">

                <tr className="text-left text-[7px] font-black uppercase tracking-[.08em] text-slate-600">

                  <th className="px-4 py-4">
                    Tur
                  </th>

                  <th className="px-4 py-4">
                    Tip
                  </th>

                  <th className="px-4 py-4">
                    Çıkış
                  </th>

                  <th className="px-4 py-4">
                    Yolcu
                  </th>

                  <th className="px-4 py-4">
                    Doluluk
                  </th>

                  <th className="px-4 py-4">
                    Hazırlık
                  </th>

                  <th className="px-4 py-4">
                    Kritik
                  </th>

                  <th className="px-4 py-4">
                    Uyarı
                  </th>

                  <th className="px-4 py-4">
                    Ticketing
                  </th>

                  <th className="px-4 py-4">
                    Görev
                  </th>


                  <th className="px-4 py-4">
                    Tedarikçi
                  </th>


                  <th className="px-4 py-4">
                    Belge
                  </th>


                  <th className="px-4 py-4">
                    Ciro
                  </th>

                  <th className="px-4 py-4">
                    Gider
                  </th>

                  <th className="px-4 py-4">
                    Katkı
                  </th>

                  <th className="px-4 py-4 text-right">
                    İşlem
                  </th>

                </tr>

              </thead>


              <tbody>

                {filteredRows.length ===
                0 ? (
                  <tr>

                    <td
                      colSpan={16}
                      className="px-5 py-16 text-center text-[8px] text-slate-600"
                    >
                      Filtreye uygun tur çıkışı bulunamadı.
                    </td>

                  </tr>
                ) : (
                  filteredRows.map(
                    row => (
                      <tr
                        key={
                          row.departure.id
                        }
                        className="border-t border-white/[.045] hover:bg-white/[.02]"
                      >

                        <td className="px-4 py-4">

                          <div className="max-w-[260px] text-[9px] font-black">
                            {row.tour.title}
                          </div>

                          <div className="mt-1 text-[7px] text-slate-600">
                            {row.tour.operation_status}
                          </div>

                        </td>


                        <td className="px-4 py-4">

                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[7px] font-black ${
                              row.tour.transport_mode ===
                              "air"
                                ? "border-blue-500/20 bg-blue-500/[.06] text-blue-300"
                                : row.tour.transport_mode ===
                                    "bus"
                                  ? "border-orange-500/20 bg-orange-500/[.06] text-orange-300"
                                  : "border-white/10 bg-white/[.03] text-slate-500"
                            }`}
                          >
                            {row.tour.transport_mode ===
                            "air"
                              ? <FaPlane />
                              : <FaBus />}

                            {row.tour.transport_mode ===
                            "air"
                              ? "Uçaklı"
                              : row.tour.transport_mode ===
                                  "bus"
                                ? "Otobüslü"
                                : "Belirsiz"}
                          </span>

                        </td>


                        <td className="px-4 py-4 text-[8px] font-black">
                          {formatDate(
                            row.departure.departure_date
                          )}
                        </td>


                        <td className="px-4 py-4">

                          <div className="text-[9px] font-black">
                            {row.passengerCount}
                            <span className="text-slate-600">
                              {" / "}
                              {row.expectedPassenger}
                            </span>
                          </div>

                        </td>


                        <td className="px-4 py-4">

                          <div className="text-[9px] font-black">
                            %{row.occupancy}
                          </div>

                          <div className="mt-2 h-1.5 w-24 overflow-hidden rounded-full bg-white/[.05]">

                            <div
                              className="h-full bg-orange-500"
                              style={{
                                width:
                                  `${Math.min(
                                    100,
                                    row.occupancy
                                  )}%`,
                              }}
                            />

                          </div>

                        </td>


                        <td className="px-4 py-4">

                          <div
                            className={`text-[12px] font-black ${readinessClass(
                              row.readiness
                            )}`}
                          >
                            %{row.readiness}
                          </div>

                        </td>


                        <td className="px-4 py-4">

                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[7px] font-black ${
                              row.criticalCount >
                              0
                                ? "border-red-500/20 bg-red-500/[.07] text-red-300"
                                : "border-emerald-500/20 bg-emerald-500/[.06] text-emerald-300"
                            }`}
                          >

                            {row.criticalCount >
                            0
                              ? <FaTimesCircle />
                              : <FaCheckCircle />}

                            {row.criticalCount}

                          </span>

                        </td>


                        <td className="px-4 py-4">

                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[7px] font-black ${
                              row.warningCount >
                              0
                                ? "border-amber-500/20 bg-amber-500/[.07] text-amber-300"
                                : "border-white/10 bg-white/[.02] text-slate-500"
                            }`}
                          >
                            <FaExclamationTriangle />
                            {row.warningCount}
                          </span>

                        </td>


                        <td className="px-4 py-4">

                          {row.tour.transport_mode !==
                          "air" ? (
                            <span className="text-[7px] text-slate-700">
                              —
                            </span>
                          ) : row.expiredDeadline ? (
                            <span className="inline-flex items-center gap-1 text-[7px] font-black text-red-300">
                              <FaTicketAlt />
                              Geçti
                            </span>
                          ) : row.deadlineRisk ? (
                            <span className="inline-flex items-center gap-1 text-[7px] font-black text-amber-300">
                              <FaTicketAlt />
                              Risk
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[7px] font-black text-emerald-300">
                              <FaCheckCircle />
                              Normal
                            </span>
                          )}

                        </td>


                        <td className="px-4 py-4">

                          <Link
                            href={`/dashboard/turlar/${row.tour.id}/gorevler`}
                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[7px] font-black ${
                              row.overdueTaskCount >
                              0
                                ? "border-red-500/20 bg-red-500/[.07] text-red-300"
                                : row.criticalTaskCount >
                                    0
                                  ? "border-orange-500/20 bg-orange-500/[.07] text-orange-300"
                                  : "border-white/10 bg-white/[.025] text-slate-400"
                            }`}
                          >
                            <FaTasks />

                            {row.openTaskCount}
                            {" açık"}

                            {row.overdueTaskCount >
                              0 &&
                              ` · ${row.overdueTaskCount} gecikmiş`}
                          </Link>

                        </td>


                        <td className="px-4 py-4">

                          <Link
                            href={`/dashboard/turlar/${row.tour.id}/tedarikciler`}
                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[7px] font-black ${
                              row.supplierIssueCount >
                              0
                                ? "border-red-500/20 bg-red-500/[.07] text-red-300"
                                : row.pendingSupplierConfirmationCount >
                                    0
                                  ? "border-amber-500/20 bg-amber-500/[.07] text-amber-300"
                                  : "border-emerald-500/20 bg-emerald-500/[.05] text-emerald-300"
                            }`}
                          >
                            {row.supplierIssueCount >
                            0
                              ? `${row.supplierIssueCount} sorun`
                              : row.pendingSupplierConfirmationCount >
                                  0
                                ? `${row.pendingSupplierConfirmationCount} teyit`
                                : "Hazır"}
                          </Link>

                        </td>


                        <td className="px-4 py-4">

                          <Link
                            href={`/dashboard/turlar/${row.tour.id}/belgeler`}
                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[7px] font-black ${
                              row.expiredDocumentCount >
                              0
                                ? "border-red-500/20 bg-red-500/[.07] text-red-300"
                                : row.requiredDocumentAlertCount >
                                    0
                                  ? "border-amber-500/20 bg-amber-500/[.07] text-amber-300"
                                  : "border-emerald-500/20 bg-emerald-500/[.05] text-emerald-300"
                            }`}
                          >
                            {row.expiredDocumentCount >
                            0
                              ? `${row.expiredDocumentCount} süresi geçmiş`
                              : row.requiredDocumentAlertCount >
                                  0
                                ? `${row.requiredDocumentAlertCount} eksik`
                                : "Hazır"}
                          </Link>

                        </td>


                        <td className="px-4 py-4 text-[9px] font-black">
                          {money(
                            row.revenue
                          )}
                        </td>


                        <td className="px-4 py-4 text-[9px] font-black text-red-300">
                          {money(
                            row.expenses
                          )}
                        </td>


                        <td
                          className={`px-4 py-4 text-[9px] font-black ${
                            row.contribution >=
                            0
                              ? "text-emerald-300"
                              : "text-red-300"
                          }`}
                        >
                          {money(
                            row.contribution
                          )}
                        </td>


                        <td className="px-4 py-4">

                          <div className="flex justify-end gap-2">

                            <Link
                              href={`/dashboard/turlar/${row.tour.id}/hazirlik`}
                              className="rounded-lg border border-amber-500/20 bg-amber-500/[.05] px-3 py-2 text-[7px] font-black text-amber-300"
                            >
                              Hazırlık
                            </Link>


                            <Link
                              href={`/dashboard/turlar/${row.tour.id}/yolcular`}
                              className="rounded-lg border border-emerald-500/20 bg-emerald-500/[.05] px-3 py-2 text-[7px] font-black text-emerald-300"
                            >
                              Yolcu
                            </Link>


                            <Link
                              href={`/dashboard/turlar/${row.tour.id}/mobil`}
                              className="rounded-lg border border-orange-500/20 bg-orange-500/[.05] px-3 py-2 text-[7px] font-black text-orange-300"
                            >
                              Mobil
                            </Link>


                            <Link
                              href={`/dashboard/turlar/${row.tour.id}/gorevler`}
                              className="rounded-lg border border-orange-500/20 bg-orange-500/[.05] px-3 py-2 text-[7px] font-black text-orange-300"
                            >
                              Görev
                            </Link>


                            <Link
                              href={`/dashboard/turlar/${row.tour.id}/finans`}
                              className="rounded-lg border border-white/10 px-3 py-2 text-[7px] font-black text-slate-300"
                            >
                              Finans
                            </Link>

                          </div>

                        </td>

                      </tr>
                    )
                  )
                )}

              </tbody>

            </table>

          </div>

        </section>


        <section className="mt-5 grid gap-4 lg:grid-cols-3">

          <article className="rounded-[24px] border border-red-500/15 bg-red-500/[.04] p-5">

            <div className="flex items-center gap-2 text-[8px] font-black text-red-300">
              <FaExclamationTriangle />
              Kritik Müdahale
            </div>

            <div className="mt-4 text-3xl font-black">
              {rows.filter(
                row =>
                  row.criticalCount >
                  0
              ).length}
            </div>

            <div className="mt-1 text-[7px] text-slate-600">
              Kritik eksiği bulunan çıkış
            </div>

          </article>


          <article className="rounded-[24px] border border-amber-500/15 bg-amber-500/[.04] p-5">

            <div className="flex items-center gap-2 text-[8px] font-black text-amber-300">
              <FaTicketAlt />
              Ticketing Riski
            </div>

            <div className="mt-4 text-3xl font-black">
              {deadlineRiskCount}
            </div>

            <div className="mt-1 text-[7px] text-slate-600">
              Deadline riski bulunan uçaklı çıkış
            </div>

          </article>


          <article className="rounded-[24px] border border-emerald-500/15 bg-emerald-500/[.04] p-5">

            <div className="flex items-center gap-2 text-[8px] font-black text-emerald-300">
              <FaMoneyBillWave />
              Operasyon Katkısı
            </div>

            <div className="mt-4 text-3xl font-black">
              {money(
                totalContribution
              )}
            </div>

            <div className="mt-1 text-[7px] text-slate-600">
              Muhasebe net kârı değil; mevcut satış brüt kârı eksi operasyon gideri
            </div>

          </article>

        </section>

      </div>

    </main>
  );
}

// TOUR_OS_15_1E_REFUND_CLOSURE_ALARM

// TOUR_OS_PHASE16_CRITICAL_INCIDENT_ALARM

// TOUR_OS_PACKAGE_A_PROTECTION_AUTOMATION_ALARM

// TOUR_OS_PACKAGE_B_FINANCE_ALARM

// TOUR_OS_PACKAGE_C_PRODUCT_PRICE_ALARM
