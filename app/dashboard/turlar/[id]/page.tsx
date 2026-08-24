"use client";

import Link from "next/link";

import {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FaArrowLeft,
  FaBed,
  FaBuilding,
  FaBus,
  FaCalendarAlt,
  FaChartLine,
  FaCheckCircle,
  FaClipboardCheck,
  FaEdit,
  FaExclamationTriangle,
  FaFileAlt,
  FaIdCard,
  FaMapMarkerAlt,
  FaMobileAlt,
  FaMoneyBillWave,
  FaPaperPlane,
  FaPlane,
  FaRoute,
  FaTasks,
  FaTicketAlt,
  FaUsers,
  FaUserTie,
  FaWallet,
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

import TourDetailTabs from "../../components/TourDetailTabs";
import TourOperationsCockpit from "../../components/TourOperationsCockpit";


type TransportMode =
  | "air"
  | "bus"
  | "other";


type Tour = {
  id: string;
  slug: string;
  title: string;
  city: string;
  district:
    string | null;
  category:
    string | null;
  duration:
    string | null;
  adult_price: number;
  agency_name:
    string | null;
  status: string;
  transport_mode:
    TransportMode;
  departure_city:
    string | null;
  arrival_city:
    string | null;
  capacity:
    number | null;
  operation_status: string;
  departure_date:
    string | null;
  return_date:
    string | null;
};


type Departure = {
  id: string;
  tour_id: string;
  departure_date: string;
  return_date: string | null;
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
  direction:
    "outbound" |
    "return";
  airline_name:
    string | null;
  flight_number:
    string | null;
  pnr:
    string | null;
  group_booking_code:
    string | null;
  departure_airport_code:
    string | null;
  arrival_airport_code:
    string | null;
  departure_at:
    string | null;
  arrival_at:
    string | null;
  ticketing_deadline:
    string | null;
  status: string;
};


type BusOperation = {
  id: string;
  bus_no: number;
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
  passenger_id:
    string | null;
  boarding_stop_id:
    string | null;
  checkin_status:
    string;
};


type ManifestRow = {
  departure_id: string;
  reservation_id: string;
};


type Expense = {
  departure_id:
    string | null;
  total_amount: number;
  payment_status: string;
};


type Sale = {
  reservation_id:
    string | null;
  grand_total: number;
  company_gross_profit: number;
  payment_status: string;
};


type HubNavItem = {
  label: string;
  description: string;
  href: string;
  icon: ReactNode;
  tone:
    | "orange"
    | "blue"
    | "emerald"
    | "amber"
    | "violet"
    | "slate";
};


function formatDate(
  value:
    string | null
) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(
      `${value.slice(
        0,
        10
      )}T00:00:00`
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


function toneClass(
  tone:
    HubNavItem["tone"]
) {
  const values = {
    orange:
      "border-orange-500/20 bg-orange-500/[.05] text-orange-300",

    blue:
      "border-blue-500/20 bg-blue-500/[.05] text-blue-300",

    emerald:
      "border-emerald-500/20 bg-emerald-500/[.05] text-emerald-300",

    amber:
      "border-amber-500/20 bg-amber-500/[.05] text-amber-300",

    violet:
      "border-violet-500/20 bg-violet-500/[.05] text-violet-300",

    slate:
      "border-white/10 bg-white/[.025] text-slate-400",
  };


  return values[
    tone
  ];
}


function operationLabel(
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

      sales:
        "Satışta",

      confirmed:
        "Kesinleşti",

      preparing:
        "Operasyon Hazırlığı",

      ready:
        "Çıkış Hazır",

      active:
        "Tur Devam Ediyor",

      returning:
        "Dönüş",

      completed:
        "Tamamlandı",

      cancelled:
        "İptal",
    };


  return labels[value] ||
    value;
}


export default function TourOperationHubPage() {
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
    selectedDepartureId,
    setSelectedDepartureId,
  ] =
    useState("");


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
    loading,
    setLoading,
  ] =
    useState(true);


  const [
    error,
    setError,
  ] =
    useState("");


  const loadDepartureData =
    useCallback(
      async (
        companyId:
          string,

        departureId:
          string
      ) => {

        if (
          !departureId
        ) {

          setReservations([]);
          setPassengers([]);
          setManifest([]);
          setExpenses([]);
          setSales([]);

          return;
        }


        const [
          reservationResult,
          passengerResult,
          manifestResult,
          expenseResult,
        ] =
          await Promise.all([

            supabase
              .from(
                "reservations"
              )
              .select(
                "id,departure_id,guests,status"
              )
              .eq(
                "company_id",
                companyId
              )
              .eq(
                "departure_id",
                departureId
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
              )
              .eq(
                "departure_id",
                departureId
              )
,


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
              )
              .eq(
                "departure_id",
                departureId
              ),


            supabase
              .from(
                "operation_expenses"
              )
              .select(
                [
                  "departure_id",
                  "total_amount",
                  "payment_status",
                ].join(",")
              )
              .eq(
                "company_id",
                companyId
              )
              .eq(
                "departure_id",
                departureId
              )
              .neq(
                "payment_status",
                "cancelled"
              ),
          ]);


        const basicErrors = [
          reservationResult.error,
          passengerResult.error,
          manifestResult.error,
          expenseResult.error,
        ].filter(Boolean);


        if (
          basicErrors.length
        ) {
          throw basicErrors[0];
        }


        const loadedReservations =
          (
            reservationResult.data ??
            []
          ) as unknown as
            Reservation[];


        const reservationIds =
          loadedReservations.map(
            reservation =>
              reservation.id
          );


        let loadedSales:
          Sale[] = [];


        if (
          reservationIds.length
        ) {

          const saleResult =
            await supabase
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
              .in(
                "reservation_id",
                reservationIds
              )
              .neq(
                "payment_status",
                "cancelled"
              );


          if (
            saleResult.error
          ) {
            throw saleResult.error;
          }


          loadedSales =
            (
              saleResult.data ??
              []
            ) as unknown as
              Sale[];

        }


        setReservations(
          loadedReservations
        );


        setPassengers(
          (
            passengerResult.data ??
            []
          ) as unknown as
            Passenger[]
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
          loadedSales
        );

      },
      []
    );


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
            flightResult,
            busOperationResult,
            busSeatResult,
          ] =
            await Promise.all([

              supabase
                .from(
                  "tours"
                )
                .select(
                  [
                    "id",
                    "slug",
                    "title",
                    "city",
                    "district",
                    "category",
                    "duration",
                    "adult_price",
                    "agency_name",
                    "status",
                    "transport_mode",
                    "departure_city",
                    "arrival_city",
                    "capacity",
                    "operation_status",
                    "departure_date",
                    "return_date",
                  ].join(",")
                )
                .eq(
                  "company_id",
                  companyId
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
                  [
                    "id",
                    "tour_id",
                    "departure_date", "return_date",
                    "capacity",
                    "reserved_count",
                    "status",
                  ].join(",")
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
                  "tour_flights"
                )
                .select(
                  [
                    "id",
                    "direction",
                    "airline_name",
                    "flight_number",
                    "pnr",
                    "group_booking_code",
                    "departure_airport_code",
                    "arrival_airport_code",
                    "departure_at",
                    "arrival_at",
                    "ticketing_deadline",
                    "status",
                  ].join(",")
                )
                .eq(
                  "company_id",
                  companyId
                )
                .eq(
                  "tour_id",
                  tourId
                ),


              supabase
                .from(
                  "tour_bus_operations"
                )
                .select(
                  [
                    "id",
                    "bus_no",
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
                )
                .eq(
                  "tour_id",
                  tourId
                ),


              supabase
                .from(
                  "tour_bus_seats"
                )
                .select(
                  [
                    "id",
                    "passenger_id",
                    "boarding_stop_id",
                    "checkin_status",
                  ].join(",")
                )
                .eq(
                  "company_id",
                  companyId
                )
                .eq(
                  "tour_id",
                  tourId
                ),
          ]);


          const errors = [
            tourResult.error,
            departureResult.error,
            flightResult.error,
            busOperationResult.error,
            busSeatResult.error,
          ].filter(Boolean);


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


          const loadedTour =
            tourResult.data as unknown as
              Tour;


          const loadedDepartures =
            (
              departureResult.data ??
              []
            ) as unknown as
              Departure[];


          setTour(
            loadedTour
          );


          setDepartures(
            loadedDepartures
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


          if (
            loadedDepartures.length
          ) {

            const today =
              new Date()
                .toISOString()
                .slice(
                  0,
                  10
                );


            const target =
              loadedDepartures.find(
                departure =>
                  departure.departure_date >=
                  today
              ) ??
              loadedDepartures[
                loadedDepartures.length -
                1
              ];


            setSelectedDepartureId(
              target.id
            );


            await loadDepartureData(
              companyId,
              target.id
            );

          }


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
      [
        loadDepartureData,
        tourId,
      ]
    );


  useEffect(() => {
    void initialize();
  }, [
    initialize,
  ]);


  async function changeDeparture(
    departureId:
      string
  ) {

    const {
      data:
        authData,
    } =
      await supabase
        .auth
        .getUser();


    if (
      !authData.user
    ) {
      return;
    }


    const membership =
      await getCurrentMembership(
        authData.user.id
      );


    if (
      !membership
    ) {
      return;
    }


    setSelectedDepartureId(
      departureId
    );


    try {

      await loadDepartureData(
        membership.company_id,
        departureId
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

    }

  }


  const selectedDeparture =
    departures.find(
      departure =>
        departure.id ===
        selectedDepartureId
    ) ??
    null;


  const expectedPassenger =
    reservations.reduce(
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


  const passengerCount =
    passengers.length;


  const occupancy =
    selectedDeparture &&
    Number(
      selectedDeparture.capacity
    ) >
      0
      ? Math.round(
          (
            expectedPassenger /
            Number(
              selectedDeparture.capacity
            )
          ) *
            100
        )
      : 0;


  const documentReadyCount =
    passengers.filter(
      documentReady
    ).length;


  const roomingCount =
    passengers.filter(
      passenger =>
        Boolean(
          passenger.room_no ||
          passenger.room_group
        )
    ).length;


  const manifestReady =
    reservations.length >
      0 &&
    manifest.length >=
      reservations.length;


  const revenue =
    sales.reduce(
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
    sales.reduce(
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


  const expenseTotal =
    expenses.reduce(
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


  const operationalContribution =
    grossProfit -
    expenseTotal;


  const activeFlights =
    flights.filter(
      flight =>
        flight.status !==
        "cancelled"
    );


  const deadlineRisk =
    activeFlights.some(
      flight => {

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
          return false;
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
          return false;
        }


        return (
          deadline -
          Date.now()
        ) <=
          72 *
          60 *
          60 *
          1000;

      }
    );


  const linkedSeatCount =
    new Set(
      busSeats
        .filter(
          seat =>
            seat.passenger_id
        )
        .map(
          seat =>
            seat.passenger_id
        )
    ).size;


  const boardedCount =
    busSeats.filter(
      seat =>
        seat.passenger_id &&
        seat.checkin_status ===
        "boarded"
    ).length;


  const commonChecks =
    [
      selectedDepartureId !==
        "",

      expectedPassenger >
        0 &&
      passengerCount ===
        expectedPassenger,

      passengerCount >
        0 &&
      documentReadyCount ===
        passengerCount,

      manifestReady,
    ];


  const transportChecks =
    tour?.transport_mode ===
      "air"
      ? [
          activeFlights.length >
            0,

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
          ),

          activeFlights.length >
            0 &&
          activeFlights.every(
            flight =>
              Boolean(
                flight.pnr ||
                flight.group_booking_code
              )
          ),

          !deadlineRisk,
        ]

      : tour?.transport_mode ===
          "bus"
        ? [
            busOperations.length >
              0,

            busOperations.length >
              0 &&
            busOperations.every(
              operation =>
                Boolean(
                  operation.vehicle_id
                )
            ),

            busOperations.length >
              0 &&
            busOperations.every(
              operation =>
                Boolean(
                  operation.driver_1_name &&
                  operation.guide_name
                )
            ),

            passengerCount >
              0 &&
            linkedSeatCount >=
              passengerCount,
          ]

        : [
            false,
          ];


  const overviewChecks =
    [
      ...commonChecks,
      ...transportChecks,
    ];


  const overviewReadiness =
    overviewChecks.length
      ? Math.round(
          (
            overviewChecks.filter(
              Boolean
            ).length /
            overviewChecks.length
          ) *
            100
        )
      : 0;


  const navItems =
    useMemo<
      HubNavItem[]
    >(
      () => {

        if (!tour) {
          return [];
        }


        const items:
          HubNavItem[] = [

            {
              label:
                "Genel",

              description:
                "Tur özeti, çıkış ve gerçek operasyon KPI'ları",

              href:
                `/dashboard/turlar/${tour.id}`,

              icon:
                <FaChartLine />,

              tone:
                "orange",
            },


            {
              label:
                "Program",

              description:
                "Çıkış takvimi ve tur tarihleri",

              href:
                `/dashboard/turlar/${tour.id}/takvim`,

              icon:
                <FaCalendarAlt />,

              tone:
                "slate",
            },
          ];


        if (
          tour.transport_mode ===
          "air"
        ) {

          items.push({
            label:
              "Ulaşım",

            description:
              "Uçuş, PNR, bagaj ve ticketing",

            href:
              `/dashboard/turlar/${tour.id}/ucus`,

            icon:
              <FaPlane />,

            tone:
              "blue",
          });

        } else if (
          tour.transport_mode ===
          "bus"
        ) {

          items.push({
            label:
              "Ulaşım",

            description:
              "Otobüs, araç, şoför, rehber ve koltuk",

            href:
              `/dashboard/turlar/${tour.id}/otobus`,

            icon:
              <FaBus />,

            tone:
              "orange",
          });

        }


        items.push(
          {
            label:
              "Yolcular",

            description:
              "Gerçek yolcular ve kimlik bilgileri",

            href:
              `/dashboard/turlar/${tour.id}/yolcular`,

            icon:
              <FaUsers />,

            tone:
              "emerald",
          },


          {
            label:
              "Rooming",

            description:
              "Otel, oda ve rooming list",

            href:
              `/dashboard/turlar/${tour.id}/yolcular`,

            icon:
              <FaBed />,

            tone:
              "violet",
          },


          {
            label:
              "Manifest",

            description:
              "Mevcut manifest operasyon merkezi",

            href:
              "/dashboard/manifest",

            icon:
              <FaRoute />,

            tone:
              "slate",
          },


          {
            label:
              "Durum & Akış",

            description:
              "Kontrollü operasyon lifecycle ve readiness motoru",

            href:
              `/dashboard/turlar/${tour.id}/durum`,

            icon:
              <FaRoute />,

            tone:
              "orange",
          },


          {
            label:
              "Mesajlar",

            description:
              "Müşteri, personel ve tedarikçi operasyon iletişimi",

            href:
              `/dashboard/turlar/${tour.id}/mesajlar`,

            icon:
              <FaPaperPlane />,

            tone:
              "emerald",
          },


          {
            label:
              "Belgeler",

            description:
              "Voucher, PNR, manifest ve operasyon evrakları",

            href:
              `/dashboard/turlar/${tour.id}/belgeler`,

            icon:
              <FaFileAlt />,

            tone:
              "blue",
          },


          {
            label:
              "Tedarikçiler",

            description:
              "Teyit, sözleşme, voucher ve gerçek cari bağlantısı",

            href:
              `/dashboard/turlar/${tour.id}/tedarikciler`,

            icon:
              <FaBuilding />,

            tone:
              "violet",
          },


          {
            label:
              "Görevler",

            description:
              "Personel, deadline, öncelik ve operasyon görevleri",

            href:
              `/dashboard/turlar/${tour.id}/gorevler`,

            icon:
              <FaTasks />,

            tone:
              "orange",
          },


          {
            label:
              "Hazırlık",

            description:
              "Checklist, alarm ve çıkış hazırlığı",

            href:
              `/dashboard/turlar/${tour.id}/hazirlik`,

            icon:
              <FaClipboardCheck />,

            tone:
              "amber",
          },


          {
            label:
              "Finans",

            description:
              "Ciro, gider, maliyet ve operasyon katkısı",

            href:
              `/dashboard/turlar/${tour.id}/finans`,

            icon:
              <FaMoneyBillWave />,

            tone:
              "emerald",
          },


          {
            label:
              "İptal & Değişiklik",

            description:
              "İptal, iade, yolcu ve operasyon değişiklik vaka merkezi",

            href:
              `/dashboard/turlar/${tour.id}/degisiklikler`,

            icon:
              <FaExclamationTriangle />,

            tone:
              "amber",
          },

          {
            label:
              "Operasyon Hataları",

            description:
              "Eksik hizmet, hata, SLA, müşteri ve finansal etki merkezi",

            href:
              `/dashboard/turlar/${tour.id}/hatalar`,

            icon:
              <FaExclamationTriangle />,

            tone:
              "amber",
          },

          {
            label:
              "Güvence & Koruma",

            description:
              "Rezervasyon güvence paketleri ve müşteri koruma talepleri",

            href:
              `/dashboard/turlar/${tour.id}/guvence`,

            icon:
              <FaCheckCircle />,

            tone:
              "emerald",
          },

          {
            label:
              "Mesaj & Otomasyon",

            description:
              "Kural, kuyruk, provider durumu ve otomatik iletişim",

            href:
              `/dashboard/turlar/${tour.id}/otomasyon`,

            icon:
              <FaPaperPlane />,

            tone:
              "orange",
          },

          {
            label:
              "AI Operasyon",

            description:
              "Gerçek operasyon verisinden risk ve aksiyon analizi",

            href:
              `/dashboard/turlar/${tour.id}/ai-operasyon`,

            icon:
              <FaChartLine />,

            tone:
              "violet",
          },

          {
            label:
              "Satış & Prim",

            description:
              "Personel satışları, primleri ve performans sonuçları",

            href:
              `/dashboard/turlar/${tour.id}/performans`,

            icon:
              <FaUserTie />,

            tone:
              "blue",
          },

          {
            label:
              "Finans Yönetimi",

            description:
              "Ciro, gider, iade, zarar, tahsilat ve net kârlılık",

            href:
              `/dashboard/turlar/${tour.id}/finans-yonetim`,

            icon:
              <FaWallet />,

            tone:
              "emerald",
          },

          {
            label:
              "Ticari Ürün & Fiyat",

            description:
              "Filtre, alarm, takvim, karşılaştırma ve ortak ürün satış katmanı",

            href:
              `/dashboard/turlar/${tour.id}/ticari-urunler`,

            icon:
              <FaChartLine />,

            tone:
              "orange",
          },

          {
            label:
              "Büyüme & Dağıtım",

            description:
              "Nereye Gidebilirim, son dakika, grup, TuroPuan, B2B, SaaS ve white-label",

            href:
              `/dashboard/turlar/${tour.id}/buyume-kanallari`,

            icon:
              <FaChartLine />,

            tone:
              "violet",
          },

          {
            label:
              "Platform Control Tower",

            description:
              "AI yönetim, ödeme dağıtım, audit, rol, bildirim, provider health ve raporlama",

            href:
              `/dashboard/turlar/${tour.id}/platform-kontrol`,

            icon:
              <FaChartLine />,

            tone:
              "orange",
          },


          {
            label:
              "Mobil",

            description:
              "Rehber ve saha operasyon ekranı",

            href:
              `/dashboard/turlar/${tour.id}/mobil`,

            icon:
              <FaMobileAlt />,

            tone:
              "orange",
          },


          {
            label:
              "Düzenle",

            description:
              "Tur temel bilgilerini düzenle",

            href:
              `/dashboard/turlar/${tour.id}/duzenle`,

            icon:
              <FaEdit />,

            tone:
              "slate",
          }
        );


        return items;

      },
      [
        tour,
      ]
    );


  if (
    loading
  ) {

    return (
      <main className="grid min-h-[75vh] place-items-center bg-[#030a11] text-white">

        <div className="text-center">

          <FaChartLine className="mx-auto text-3xl text-orange-400" />

          <div className="mt-4 text-[10px] font-black">
            Tur Operasyon Merkezi yükleniyor...
          </div>

        </div>

      </main>
    );

  }


  if (
    !tour
  ) {

    return (
      <main className="grid min-h-[75vh] place-items-center bg-[#030a11] px-5 text-white">

        <div className="max-w-lg rounded-[26px] border border-red-500/20 bg-red-500/[.05] p-8 text-center">

          <FaExclamationTriangle className="mx-auto text-3xl text-red-300" />

          <div className="mt-4 text-lg font-black">
            Tur bulunamadı
          </div>

          <div className="mt-2 text-[8px] text-slate-500">
            {error}
          </div>

        </div>

      </main>
    );

  }


  return (
    <main data-tour-os-screen="tour-hub" className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,.05),transparent_28%),linear-gradient(180deg,#03080e,#040a10)] text-white">

      <div className="mx-auto max-w-[1750px] px-5 py-7 lg:px-8">

        <div className="flex flex-wrap items-center justify-between gap-3">

          <Link
            href="/dashboard/turlar"
            className="inline-flex items-center gap-2 text-[8px] font-black text-slate-500 hover:text-orange-300"
          >
            <FaArrowLeft />
            Tur Yönetimi
          </Link>

        <TourDetailTabs
          tourId={tour.id}
          transportMode={tour.transport_mode}
        />



          <Link
            href="/dashboard/turlar/control-tower"
            className="inline-flex items-center gap-2 rounded-xl border border-orange-500/20 bg-orange-500/[.05] px-4 py-2.5 text-[8px] font-black text-orange-300"
          >
            <FaChartLine />
            Control Tower
          </Link>

        </div>


        <TourOperationsCockpit
          tourId={tour.id}
          transportMode={tour.transport_mode}
          operationStatus={operationLabel(
            tour.operation_status
          )}
          departureDate={
            selectedDeparture?.departure_date ?? null
          }
          returnDate={
            selectedDeparture?.return_date ?? null
          }
          occupancy={occupancy}
          expectedPassenger={expectedPassenger}
          passengerCount={passengerCount}
          documentReadyCount={documentReadyCount}
          roomingCount={roomingCount}
          manifestReady={manifestReady}
          revenue={revenue}
          grossProfit={grossProfit}
          expenseTotal={expenseTotal}
          operationalContribution={operationalContribution}
          overviewReadiness={overviewReadiness}
          deadlineRisk={deadlineRisk}
          linkedSeatCount={linkedSeatCount}
          boardedCount={boardedCount}
        />



        <section data-tour-detail-secondary-hero className="mt-4 overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,.16),transparent_34%),linear-gradient(145deg,#07131f,#03080e)] p-6 lg:p-8">

          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">

            <div className="max-w-4xl">

              <div className="flex flex-wrap items-center gap-2">

                <span className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/[.07] px-3 py-1.5 text-[7px] font-black uppercase tracking-[.14em] text-orange-300">
                  TUR OPERASYON MERKEZİ
                </span>


                <span className="rounded-full border border-white/10 bg-white/[.025] px-3 py-1.5 text-[7px] font-black text-slate-400">
                  {operationLabel(
                    tour.operation_status
                  )}
                </span>


                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[7px] font-black ${
                    tour.transport_mode ===
                    "air"
                      ? "border-blue-500/20 bg-blue-500/[.06] text-blue-300"
                      : tour.transport_mode ===
                          "bus"
                        ? "border-orange-500/20 bg-orange-500/[.06] text-orange-300"
                        : "border-white/10 bg-white/[.025] text-slate-500"
                  }`}
                >

                  {tour.transport_mode ===
                  "air"
                    ? <FaPlane />
                    : <FaBus />}

                  {tour.transport_mode ===
                  "air"
                    ? "Uçaklı Tur"
                    : tour.transport_mode ===
                        "bus"
                      ? "Otobüslü Tur"
                      : "Ulaşım Belirlenmedi"}

                </span>

              </div>


              <h1 className="mt-5 text-3xl font-black tracking-[-.04em] lg:text-4xl">
                {tour.title}
              </h1>


              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[8px] text-slate-500">

                <span className="inline-flex items-center gap-1">
                  <FaMapMarkerAlt />
                  {tour.city}
                  {tour.district
                    ? ` / ${tour.district}`
                    : ""}
                </span>


                <span>
                  {tour.duration ||
                    "Süre belirtilmedi"}
                </span>


                <span>
                  {tour.category ||
                    "Kategori belirtilmedi"}
                </span>


                <span>
                  {tour.agency_name ||
                    "Acente belirtilmedi"}
                </span>

              </div>

            </div>


            <div className="flex flex-col gap-3 sm:flex-row xl:flex-col">

              <select
                value={
                  selectedDepartureId
                }
                onChange={event =>
                  void changeDeparture(
                    event.target.value
                  )
                }
                className="min-h-11 min-w-[230px] rounded-xl border border-white/10 bg-[#030a11] px-4 text-[8px] font-black"
              >

                {departures.length ===
                0 ? (
                  <option value="">
                    Çıkış kaydı yok
                  </option>
                ) : (
                  departures.map(
                    departure => (
                      <option
                        key={
                          departure.id
                        }
                        value={
                          departure.id
                        }
                      >
                        {formatDate(
                          departure.departure_date
                        )}
                        {" · "}
                        {departure.reserved_count}
                        {"/"}
                        {departure.capacity}
                      </option>
                    )
                  )
                )}

              </select>


              <Link
                href={`/dashboard/turlar/${tour.id}/duzenle`}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 text-[8px] font-black"
              >
                <FaEdit />
                Turu Düzenle
              </Link>

            </div>

          </div>

        </section>


        {error && (
          <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/[.06] px-4 py-3 text-[8px] font-black text-red-300">
            {error}
          </div>
        )}


        <section className="mt-5 overflow-x-auto rounded-[22px] border border-white/10 bg-[#07131f] p-2">

          <div className="flex min-w-max gap-2">

            {navItems.map(
              item => (
                <Link
                  key={
                    item.label
                  }
                  href={
                    item.href
                  }
                  className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-[8px] font-black transition hover:brightness-125 ${toneClass(
                    item.tone
                  )}`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              )
            )}

          </div>

        </section>


        <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-7">

          <article className="rounded-[22px] border border-white/10 bg-[#07131f] p-5">

            <div className="text-[7px] font-black uppercase text-slate-600">
              Yolcu
            </div>

            <div className="mt-3 text-3xl font-black">
              {passengerCount}
              <span className="ml-1 text-sm text-slate-600">
                /
                {expectedPassenger}
              </span>
            </div>

          </article>


          <article className="rounded-[22px] border border-white/10 bg-[#07131f] p-5">

            <div className="text-[7px] font-black uppercase text-slate-600">
              Doluluk
            </div>

            <div className="mt-3 text-3xl font-black">
              %{occupancy}
            </div>

          </article>


          <article className="rounded-[22px] border border-white/10 bg-[#07131f] p-5">

            <div className="text-[7px] font-black uppercase text-slate-600">
              Belge Hazır
            </div>

            <div className="mt-3 text-3xl font-black text-emerald-300">
              {documentReadyCount}
            </div>

          </article>


          <article className="rounded-[22px] border border-white/10 bg-[#07131f] p-5">

            <div className="text-[7px] font-black uppercase text-slate-600">
              Rooming
            </div>

            <div className="mt-3 text-3xl font-black text-violet-300">
              {roomingCount}
            </div>

          </article>


          <article className="rounded-[22px] border border-white/10 bg-[#07131f] p-5">

            <div className="text-[7px] font-black uppercase text-slate-600">
              Ciro
            </div>

            <div className="mt-3 text-xl font-black">
              {money(
                revenue
              )}
            </div>

          </article>


          <article className="rounded-[22px] border border-white/10 bg-[#07131f] p-5">

            <div className="text-[7px] font-black uppercase text-slate-600">
              Operasyon Gideri
            </div>

            <div className="mt-3 text-xl font-black text-red-300">
              {money(
                expenseTotal
              )}
            </div>

          </article>


          <article
            className={`rounded-[22px] border p-5 ${
              operationalContribution >=
              0
                ? "border-emerald-500/20 bg-emerald-500/[.04]"
                : "border-red-500/20 bg-red-500/[.04]"
            }`}
          >

            <div className="text-[7px] font-black uppercase text-slate-600">
              Operasyon Katkısı
            </div>

            <div
              className={`mt-3 text-xl font-black ${
                operationalContribution >=
                0
                  ? "text-emerald-300"
                  : "text-red-300"
              }`}
            >
              {money(
                operationalContribution
              )}
            </div>

          </article>

        </section>


        <section className="mt-5 grid gap-5 xl:grid-cols-[360px_1fr]">

          <article className="rounded-[28px] border border-white/10 bg-[#07131f] p-6">

            <div className="text-[7px] font-black uppercase tracking-[.12em] text-slate-600">
              OPERASYON ÖZET HAZIRLIĞI
            </div>


            <div
              className={`mt-5 text-6xl font-black tracking-[-.07em] ${
                overviewReadiness ===
                100
                  ? "text-emerald-300"
                  : overviewReadiness >=
                      70
                    ? "text-amber-300"
                    : "text-red-300"
              }`}
            >
              %{overviewReadiness}
            </div>


            <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/[.05]">

              <div
                className="h-full rounded-full bg-orange-500"
                style={{
                  width:
                    `${overviewReadiness}%`,
                }}
              />

            </div>


            <div className="mt-5 text-[7px] leading-5 text-slate-600">
              Bu kart ana merkez için özet kontroldür.
              Ayrıntılı ve tam operasyon checklisti
              Hazırlık Merkezi’nde hesaplanır.
            </div>


            <Link
              href={`/dashboard/turlar/${tour.id}/hazirlik`}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/[.06] px-4 py-3 text-[8px] font-black text-amber-300"
            >
              <FaClipboardCheck />
              Hazırlık Merkezini Aç
            </Link>

          </article>


          <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">

            <Link
              href={`/dashboard/turlar/${tour.id}/yolcular`}
              className="rounded-[24px] border border-white/10 bg-[#07131f] p-5 transition hover:border-emerald-500/30"
            >

              <div className="flex items-center justify-between">

                <div className="grid h-11 w-11 place-items-center rounded-xl border border-emerald-500/20 bg-emerald-500/[.06] text-emerald-300">
                  <FaUsers />
                </div>


                <span className="text-[7px] font-black text-slate-600">
                  {passengerCount}
                  {" yolcu"}
                </span>

              </div>


              <div className="mt-5 text-[10px] font-black">
                Yolcu & Rooming
              </div>


              <div className="mt-2 text-[7px] leading-5 text-slate-600">
                Gerçek yolcular, kimlik, pasaport, oda ve rooming list
              </div>

            </Link>


            {tour.transport_mode ===
            "air" ? (

              <Link
                href={`/dashboard/turlar/${tour.id}/ucus`}
                className="rounded-[24px] border border-white/10 bg-[#07131f] p-5 transition hover:border-blue-500/30"
              >

                <div className="flex items-center justify-between">

                  <div className="grid h-11 w-11 place-items-center rounded-xl border border-blue-500/20 bg-blue-500/[.06] text-blue-300">
                    <FaPlane />
                  </div>


                  <span
                    className={`text-[7px] font-black ${
                      deadlineRisk
                        ? "text-amber-300"
                        : "text-slate-600"
                    }`}
                  >
                    {deadlineRisk
                      ? "Deadline Riski"
                      : `${activeFlights.length} segment`}
                  </span>

                </div>


                <div className="mt-5 text-[10px] font-black">
                  Uçuş Operasyonu
                </div>


                <div className="mt-2 text-[7px] leading-5 text-slate-600">
                  Havayolu, PNR, uçuş segmenti, bagaj ve ticketing
                </div>

              </Link>

            ) : (

              <Link
                href={`/dashboard/turlar/${tour.id}/otobus`}
                className="rounded-[24px] border border-white/10 bg-[#07131f] p-5 transition hover:border-orange-500/30"
              >

                <div className="flex items-center justify-between">

                  <div className="grid h-11 w-11 place-items-center rounded-xl border border-orange-500/20 bg-orange-500/[.06] text-orange-300">
                    <FaBus />
                  </div>


                  <span className="text-[7px] font-black text-slate-600">
                    {busOperations.length}
                    {" araç"}
                  </span>

                </div>


                <div className="mt-5 text-[10px] font-black">
                  Otobüs Operasyonu
                </div>


                <div className="mt-2 text-[7px] leading-5 text-slate-600">
                  Araç, şoför, rehber, koltuk ve biniş planı
                </div>

              </Link>

            )}


            <Link
              href="/dashboard/manifest"
              className="rounded-[24px] border border-white/10 bg-[#07131f] p-5 transition hover:border-white/20"
            >

              <div className="flex items-center justify-between">

                <div className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/[.03] text-slate-300">
                  <FaRoute />
                </div>


                <span
                  className={`text-[7px] font-black ${
                    manifestReady
                      ? "text-emerald-300"
                      : "text-amber-300"
                  }`}
                >
                  {manifest.length}
                  {"/"}
                  {reservations.length}
                </span>

              </div>


              <div className="mt-5 text-[10px] font-black">
                Manifest
              </div>


              <div className="mt-2 text-[7px] leading-5 text-slate-600">
                Mevcut tur manifest operasyon merkezi
              </div>

            </Link>


            <Link
              href={`/dashboard/turlar/${tour.id}/finans`}
              className="rounded-[24px] border border-white/10 bg-[#07131f] p-5 transition hover:border-emerald-500/30"
            >

              <div className="grid h-11 w-11 place-items-center rounded-xl border border-emerald-500/20 bg-emerald-500/[.06] text-emerald-300">
                <FaMoneyBillWave />
              </div>


              <div className="mt-5 text-[10px] font-black">
                Finans
              </div>


              <div className="mt-2 text-[7px] leading-5 text-slate-600">
                Ciro, gider, tedarikçi borcu ve operasyon katkısı
              </div>

            </Link>


            <Link
              href={`/dashboard/turlar/${tour.id}/mobil`}
              className="rounded-[24px] border border-white/10 bg-[#07131f] p-5 transition hover:border-orange-500/30"
            >

              <div className="flex items-center justify-between">

                <div className="grid h-11 w-11 place-items-center rounded-xl border border-orange-500/20 bg-orange-500/[.06] text-orange-300">
                  <FaMobileAlt />
                </div>


                {tour.transport_mode ===
                "bus" && (
                  <span className="text-[7px] font-black text-emerald-300">
                    {boardedCount}
                    {" bindi"}
                  </span>
                )}

              </div>


              <div className="mt-5 text-[10px] font-black">
                Mobil Saha Operasyonu
              </div>


              <div className="mt-2 text-[7px] leading-5 text-slate-600">
                Rehber, check-in, no-show ve saha yönetimi
              </div>

            </Link>


            <Link
              href={`/dashboard/turlar/${tour.id}/takvim`}
              className="rounded-[24px] border border-white/10 bg-[#07131f] p-5 transition hover:border-white/20"
            >

              <div className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/[.03] text-slate-300">
                <FaCalendarAlt />
              </div>


              <div className="mt-5 text-[10px] font-black">
                Çıkış Takvimi
              </div>


              <div className="mt-2 text-[7px] leading-5 text-slate-600">
                {departures.length}
                {" gerçek çıkış kaydı"}
              </div>

            </Link>

          </section>

        </section>


        <section className="mt-5 grid gap-4 xl:grid-cols-3">

          <article className="rounded-[24px] border border-white/10 bg-[#07131f] p-5">

            <div className="flex items-center gap-2 text-[9px] font-black">
              <FaIdCard className="text-emerald-300" />
              Yolcu Belgeleri
            </div>


            <div className="mt-4 text-3xl font-black">
              {documentReadyCount}
              <span className="ml-1 text-sm text-slate-600">
                /
                {passengerCount}
              </span>
            </div>


            <div className="mt-2 text-[7px] text-slate-600">
              Doğum tarihi + kimlik türü + kimlik/pasaport numarası
            </div>

          </article>


          <article className="rounded-[24px] border border-white/10 bg-[#07131f] p-5">

            <div className="flex items-center gap-2 text-[9px] font-black">

              {tour.transport_mode ===
              "air"
                ? (
                  <FaTicketAlt className="text-blue-300" />
                )
                : (
                  <FaBus className="text-orange-300" />
                )}

              Ulaşım Durumu
            </div>


            <div className="mt-4 text-3xl font-black">
              {tour.transport_mode ===
              "air"
                ? activeFlights.length
                : busOperations.length}
            </div>


            <div className="mt-2 text-[7px] text-slate-600">
              {tour.transport_mode ===
              "air"
                ? "Aktif uçuş segmenti"
                : "Otobüs operasyon kaydı"}
            </div>

          </article>


          <article className="rounded-[24px] border border-white/10 bg-[#07131f] p-5">

            <div className="flex items-center gap-2 text-[9px] font-black">
              <FaCheckCircle className="text-emerald-300" />
              Seçili Çıkış
            </div>


            <div className="mt-4 text-xl font-black">
              {selectedDeparture
                ? formatDate(
                    selectedDeparture.departure_date
                  )
                : "Çıkış yok"}
            </div>


            <div className="mt-2 text-[7px] text-slate-600">
              {selectedDeparture
                ? `${selectedDeparture.reserved_count}/${selectedDeparture.capacity} rezervasyon kapasitesi`
                : "Tur için çıkış kaydı bulunamadı"}
            </div>

          </article>

        </section>


        <section className="mt-5 rounded-[26px] border border-white/10 bg-[#07131f] p-5">

          <div className="text-[9px] font-black">
            Tur Temel Bilgileri
          </div>


          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">

            {[
              [
                "Başlangıç",
                tour.departure_city ||
                "—",
              ],

              [
                "Varış",
                tour.arrival_city ||
                "—",
              ],

              [
                "Seçili Çıkış",
                formatDate(
                  selectedDeparture?.departure_date ?? null
                ),
              ],

              [
                "Dönüş",
                formatDate(
                  selectedDeparture?.return_date ?? null
                ),
              ],

              [
                "Ana Kapasite",
                tour.capacity ??
                "—",
              ],
            ].map(
              (
                [
                  label,
                  value,
                ]
              ) => (
                <div
                  key={
                    String(label)
                  }
                  className="rounded-xl border border-white/[.07] bg-[#030a11] p-4"
                >

                  <div className="text-[6px] font-black uppercase text-slate-600">
                    {label}
                  </div>


                  <div className="mt-2 text-[9px] font-black">
                    {value}
                  </div>

                </div>
              )
            )}

          </div>

        </section>


        <div className="mt-5 text-[7px] leading-5 text-slate-700">
          Bu ekran mevcut Uçuş, Otobüs, Yolcu, Manifest,
          Hazırlık, Finans ve Mobil Operasyon modüllerini silmez
          veya yeniden oluşturmaz. Tek tur yönetim merkezi olarak
          mevcut gerçek verileri bir araya getirir.
        </div>

      </div>

    </main>
  );
}

// TOUR_OS_15_1C_HUB_ACTIVE_PASSENGERS

// TOUR_OS_PACKAGE_A_NAV

// TOUR_OS_PACKAGE_B_NAV

// TOUR_OS_PACKAGE_C_NAV

// TOUR_OS_PACKAGE_D_NAV

// TOUR_OS_PACKAGE_E_NAV

// TOUR_DETAIL_PROFESSIONAL_V1


<style jsx global>{`
  [data-tour-os-screen="tour-hub"] [data-tour-detail-secondary-hero] {
    margin-top: 14px;
  }

  [data-tour-os-screen="tour-hub"] section,
  [data-tour-os-screen="tour-hub"] article {
    scroll-margin-top: 90px;
  }

  [data-tour-os-screen="tour-hub"] a,
  [data-tour-os-screen="tour-hub"] button {
    -webkit-tap-highlight-color: transparent;
  }

  @media (max-width: 768px) {
    [data-tour-operations-cockpit] {
      border-radius: 22px;
    }

    [data-tour-os-screen="tour-hub"] {
      padding-bottom: 82px;
    }
  }
`}</style>

// TOUR_UI_PROFESSIONAL_V2
