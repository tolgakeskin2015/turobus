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
  FaBed,
  FaBus,
  FaCheckCircle,
  FaClipboardCheck,
  FaExclamationTriangle,
  FaIdCard,
  FaPlane,
  FaRoute,
  FaTicketAlt,
  FaTimesCircle,
  FaUsers,
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


type TransportMode =
  | "air"
  | "bus"
  | "other";


type Tour = {
  id: string;
  title: string;
  transport_mode:
    TransportMode;
  departure_date:
    string | null;
  return_date:
    string | null;
  operation_status:
    string;
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
  guests: number;
  status: string;
};


type Passenger = {
  id: string;
  reservation_id:
    string | null;
  full_name: string;
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
  room_type:
    string | null;
  hotel_name:
    string | null;
};


type ManifestRow = {
  manifest_id: string;
  reservation_id: string;
  manifest_status: string;
  pickup_point:
    string | null;
};


type Flight = {
  id: string;
  direction:
    "outbound" |
    "return";
  segment_no: number;
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
  seat_capacity:
    number | null;
  seats_reserved: number;
  seats_ticketed: number;
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
  bus_operation_id: string;
  seat_number: number;
  passenger_id:
    string | null;
  boarding_stop_id:
    string | null;
  seat_type: string;
  seat_status: string;
};


type BoardingStop = {
  id: string;
  bus_operation_id: string;
  stop_name: string;
  planned_at:
    string | null;
};


type CheckLevel =
  | "ok"
  | "warning"
  | "critical"
  | "na";


type CheckItem = {
  id: string;
  title: string;
  detail: string;
  level: CheckLevel;
  required: boolean;
  href?: string;
};


function formatDate(
  value:
    string | null
) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

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
  ).format(date);
}


function documentReady(
  passenger:
    Passenger
) {
  return Boolean(
    passenger.full_name &&
    passenger.birth_date &&
    passenger.identity_type &&
    passenger.identity_number
  );
}


function checkClass(
  level:
    CheckLevel
) {
  if (
    level ===
    "ok"
  ) {
    return "border-emerald-500/20 bg-emerald-500/[.06] text-emerald-300";
  }

  if (
    level ===
    "critical"
  ) {
    return "border-red-500/20 bg-red-500/[.06] text-red-300";
  }

  if (
    level ===
    "warning"
  ) {
    return "border-amber-500/20 bg-amber-500/[.06] text-amber-300";
  }

  return "border-white/10 bg-white/[.025] text-slate-500";
}


function levelLabel(
  level:
    CheckLevel
) {
  if (
    level ===
    "ok"
  ) {
    return "Hazır";
  }

  if (
    level ===
    "critical"
  ) {
    return "Kritik";
  }

  if (
    level ===
    "warning"
  ) {
    return "Eksik";
  }

  return "Gerekli Değil";
}


export default function TourReadinessPage() {
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
    manifest,
    setManifest,
  ] =
    useState<ManifestRow[]>(
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
    boardingStops,
    setBoardingStops,
  ] =
    useState<BoardingStop[]>(
      []
    );

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


  const loadDepartureData =
    useCallback(
      async (
        currentCompanyId:
          string,
        departureId:
          string
      ) => {
        if (!departureId) {
          setReservations([]);
          setPassengers([]);
          setManifest([]);
          return;
        }

        const [
          reservationResult,
          passengerResult,
        ] =
          await Promise.all([
            supabase
              .from(
                "reservations"
              )
              .select(
                "id,guests,status"
              )
              .eq(
                "company_id",
                currentCompanyId
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
                  "reservation_id",
                  "full_name",
                  "birth_date",
                  "identity_type",
                  "identity_number",
                  "room_group",
                  "room_no",
                  "room_type",
                  "hotel_name",
                ].join(",")
              )
              .eq(
                "company_id",
                currentCompanyId
              )
              .eq(
                "departure_id",
                departureId
              ),
          ]);


        if (
          reservationResult.error
        ) {
          throw reservationResult.error;
        }

        if (
          passengerResult.error
        ) {
          throw passengerResult.error;
        }


        const manifestResult =
          await supabase
            .from(
              "tour_departure_manifest_view"
            )
            .select(
              [
                "manifest_id",
                "reservation_id",
                "manifest_status",
                "pickup_point",
              ].join(",")
            )
            .eq(
              "company_id",
              currentCompanyId
            )
            .eq(
              "departure_id",
              departureId
            );


        if (
          manifestResult.error
        ) {
          throw manifestResult.error;
        }


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

        setManifest(
          (
            manifestResult.data ??
            []
          ) as unknown as
            ManifestRow[]
        );
      },
      []
    );


  const initialize =
    useCallback(
      async () => {
        setLoading(true);
        setError("");

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


          const currentCompanyId =
            membership.company_id;

          setCompanyId(
            currentCompanyId
          );


          const [
            tourResult,
            departureResult,
            flightResult,
            busOperationResult,
            busSeatResult,
            boardingStopResult,
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
                    "departure_date",
                    "return_date",
                    "operation_status",
                  ].join(",")
                )
                .eq(
                  "id",
                  tourId
                )
                .eq(
                  "company_id",
                  currentCompanyId
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
                    "departure_date",
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
                    "segment_no",
                    "airline_name",
                    "flight_number",
                    "pnr",
                    "group_booking_code",
                    "departure_airport_code",
                    "arrival_airport_code",
                    "departure_at",
                    "arrival_at",
                    "ticketing_deadline",
                    "seat_capacity",
                    "seats_reserved",
                    "seats_ticketed",
                    "status",
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
                  "segment_no",
                  {
                    ascending:
                      true,
                  }
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
                  currentCompanyId
                )
                .eq(
                  "tour_id",
                  tourId
                )
                .order(
                  "bus_no",
                  {
                    ascending:
                      true,
                  }
                ),

              supabase
                .from(
                  "tour_bus_seats"
                )
                .select(
                  [
                    "id",
                    "bus_operation_id",
                    "seat_number",
                    "passenger_id",
                    "boarding_stop_id",
                    "seat_type",
                    "seat_status",
                  ].join(",")
                )
                .eq(
                  "company_id",
                  currentCompanyId
                )
                .eq(
                  "tour_id",
                  tourId
                ),

              supabase
                .from(
                  "tour_bus_boarding_stops"
                )
                .select(
                  [
                    "id",
                    "bus_operation_id",
                    "stop_name",
                    "planned_at",
                  ].join(",")
                )
                .eq(
                  "company_id",
                  currentCompanyId
                )
                .eq(
                  "tour_id",
                  tourId
                ),
            ]);


          if (
            tourResult.error
          ) {
            throw tourResult.error;
          }

          if (
            !tourResult.data
          ) {
            throw new Error(
              "Tur bulunamadı."
            );
          }

          if (
            departureResult.error
          ) {
            throw departureResult.error;
          }

          if (
            flightResult.error
          ) {
            throw flightResult.error;
          }

          if (
            busOperationResult.error
          ) {
            throw busOperationResult.error;
          }

          if (
            busSeatResult.error
          ) {
            throw busSeatResult.error;
          }

          if (
            boardingStopResult.error
          ) {
            throw boardingStopResult.error;
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

          setBoardingStops(
            (
              boardingStopResult.data ??
              []
            ) as unknown as
              BoardingStop[]
          );


          if (
            loadedDepartures.length
          ) {
            const first =
              loadedDepartures[0].id;

            setSelectedDepartureId(
              first
            );

            await loadDepartureData(
              currentCompanyId,
              first
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
          setLoading(false);
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
    setSelectedDepartureId(
      departureId
    );

    if (
      !companyId ||
      !departureId
    ) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      await loadDepartureData(
        companyId,
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

    } finally {
      setBusy(false);
    }
  }


  const expectedPassengerCount =
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


  const documentReadyCount =
    passengers.filter(
      documentReady
    ).length;


  const roomingRelevant =
    passengers.some(
      passenger =>
        Boolean(
          passenger.hotel_name ||
          passenger.room_no ||
          passenger.room_group ||
          passenger.room_type
        )
    );


  const roomingReadyCount =
    passengers.filter(
      passenger =>
        Boolean(
          passenger.room_no ||
          passenger.room_group
        )
    ).length;


  const activeFlights =
    flights.filter(
      flight =>
        flight.status !==
        "cancelled"
    );


  const outboundFlights =
    activeFlights.filter(
      flight =>
        flight.direction ===
        "outbound"
    );


  const returnFlights =
    activeFlights.filter(
      flight =>
        flight.direction ===
        "return"
    );


  const flightCoreReady =
    activeFlights.length >
      0 &&
    activeFlights.every(
      flight =>
        Boolean(
          flight.airline_name &&
          flight.flight_number &&
          flight.departure_airport_code &&
          flight.arrival_airport_code &&
          flight.departure_at &&
          flight.arrival_at
        )
    );


  const flightPnrReady =
    activeFlights.length >
      0 &&
    activeFlights.every(
      flight =>
        Boolean(
          flight.pnr ||
          flight.group_booking_code
        )
    );


  const ticketedReady =
    activeFlights.length >
      0 &&
    activeFlights.every(
      flight =>
        [
          "ticketed",
          "departed",
          "arrived",
        ].includes(
          flight.status
        )
    );


  const deadlineRisks =
    activeFlights.filter(
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


  const expiredDeadlineCount =
    deadlineRisks.filter(
      flight => {
        if (
          !flight.ticketing_deadline
        ) {
          return false;
        }

        return (
          new Date(
            flight.ticketing_deadline
          ).getTime() <
          Date.now()
        );
      }
    ).length;


  const busCount =
    busOperations.length;


  const vehicleReady =
    busCount >
      0 &&
    busOperations.every(
      operation =>
        Boolean(
          operation.vehicle_id
        )
    );


  const driverReady =
    busCount >
      0 &&
    busOperations.every(
      operation =>
        Boolean(
          operation.driver_1_name &&
          operation.driver_1_phone
        )
    );


  const guideReady =
    busCount >
      0 &&
    busOperations.every(
      operation =>
        Boolean(
          operation.guide_name &&
          operation.guide_phone
        )
    );


  const seatPlanReady =
    busCount >
      0 &&
    busOperations.every(
      operation => {
        if (
          !operation.seat_capacity
        ) {
          return false;
        }

        const seats =
          busSeats.filter(
            seat =>
              seat.bus_operation_id ===
              operation.id
          );

        return (
          seats.length >=
          operation.seat_capacity
        );
      }
    );


  const linkedPassengerSeatCount =
    new Set(
      busSeats
        .filter(
          seat =>
            Boolean(
              seat.passenger_id
            )
        )
        .map(
          seat =>
            seat.passenger_id
        )
    ).size;


  const passengerSeatReady =
    passengers.length >
      0 &&
    linkedPassengerSeatCount >=
      passengers.length;


  const stopReady =
    busCount >
      0 &&
    busOperations.every(
      operation =>
        boardingStops.some(
          stop =>
            stop.bus_operation_id ===
            operation.id
        )
    );


  const boardingAssignmentReady =
    passengers.length >
      0 &&
    busSeats
      .filter(
        seat =>
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
    linkedPassengerSeatCount >=
      passengers.length;


  const manifestReady =
    reservations.length >
      0 &&
    manifest.length >=
      reservations.length;


  const checks =
    useMemo<CheckItem[]>(
      () => {
        const common:
          CheckItem[] = [
            {
              id:
                "departure",
              title:
                "Tur çıkışı",
              detail:
                selectedDepartureId
                  ? "Çıkış kaydı seçildi."
                  : "Bu tur için çıkış kaydı bulunamadı.",
              level:
                selectedDepartureId
                  ? "ok"
                  : "critical",
              required:
                true,
              href:
                `/dashboard/turlar/${tourId}/takvim`,
            },

            {
              id:
                "passenger-count",
              title:
                "Yolcu listesi",
              detail:
                expectedPassengerCount ===
                  passengers.length &&
                expectedPassengerCount >
                  0
                  ? `${passengers.length} yolcunun tamamı gerçek kayıt olarak tanımlı.`
                  : `${expectedPassengerCount} beklenen yolcu / ${passengers.length} tanımlı yolcu.`,
              level:
                expectedPassengerCount >
                  0 &&
                passengers.length ===
                  expectedPassengerCount
                  ? "ok"
                  : "critical",
              required:
                true,
              href:
                `/dashboard/turlar/${tourId}/yolcular`,
            },

            {
              id:
                "documents",
              title:
                "Kimlik / pasaport hazırlığı",
              detail:
                passengers.length >
                  0
                  ? `${documentReadyCount}/${passengers.length} yolcunun belge bilgisi hazır.`
                  : "Henüz yolcu bulunmuyor.",
              level:
                passengers.length >
                  0 &&
                documentReadyCount ===
                  passengers.length
                  ? "ok"
                  : "critical",
              required:
                true,
              href:
                `/dashboard/turlar/${tourId}/yolcular`,
            },

            {
              id:
                "rooming",
              title:
                "Rooming list",
              detail:
                roomingRelevant
                  ? `${roomingReadyCount}/${passengers.length} yolcunun oda/grup ataması var.`
                  : "Bu turda henüz konaklama/rooming verisi kullanılmıyor.",
              level:
                !roomingRelevant
                  ? "na"
                  : roomingReadyCount ===
                      passengers.length
                    ? "ok"
                    : "warning",
              required:
                roomingRelevant,
              href:
                `/dashboard/turlar/${tourId}/yolcular`,
            },

            {
              id:
                "manifest",
              title:
                "Manifest senkronizasyonu",
              detail:
                `${manifest.length}/${reservations.length} aktif rezervasyon manifestte.`,
              level:
                manifestReady
                  ? "ok"
                  : "critical",
              required:
                true,
              href:
                "/dashboard/manifest",
            },
          ];


        if (
          tour?.transport_mode ===
          "air"
        ) {
          return [
            ...common,

            {
              id:
                "outbound",
              title:
                "Gidiş uçuşu",
              detail:
                `${outboundFlights.length} gidiş segmenti tanımlı.`,
              level:
                outboundFlights.length >
                  0
                  ? "ok"
                  : "critical",
              required:
                true,
              href:
                `/dashboard/turlar/${tourId}/ucus`,
            },

            {
              id:
                "return",
              title:
                "Dönüş uçuşu",
              detail:
                tour.return_date
                  ? `${returnFlights.length} dönüş segmenti tanımlı.`
                  : "Tur dönüş tarihi tanımlı değil; dönüş segmenti zorunlu sayılmadı.",
              level:
                !tour.return_date
                  ? "na"
                  : returnFlights.length >
                      0
                    ? "ok"
                    : "critical",
              required:
                Boolean(
                  tour.return_date
                ),
              href:
                `/dashboard/turlar/${tourId}/ucus`,
            },

            {
              id:
                "flight-core",
              title:
                "Uçuş operasyon bilgileri",
              detail:
                flightCoreReady
                  ? "Havayolu, uçuş no, havalimanı ve saat bilgileri tamam."
                  : "Uçuş segmentlerinde eksik havayolu, uçuş no, havalimanı veya saat var.",
              level:
                flightCoreReady
                  ? "ok"
                  : "critical",
              required:
                true,
              href:
                `/dashboard/turlar/${tourId}/ucus`,
            },

            {
              id:
                "pnr",
              title:
                "PNR / grup rezervasyonu",
              detail:
                flightPnrReady
                  ? "Aktif uçuş segmentlerinin rezervasyon kodları tanımlı."
                  : "Bir veya daha fazla uçuşta PNR / grup rezervasyon kodu eksik.",
              level:
                flightPnrReady
                  ? "ok"
                  : "critical",
              required:
                true,
              href:
                `/dashboard/turlar/${tourId}/ucus`,
            },

            {
              id:
                "ticketing",
              title:
                "Biletleme",
              detail:
                ticketedReady
                  ? "Aktif uçuş segmentlerinin tamamı biletlenmiş."
                  : "Biletlenmemiş uçuş segmenti bulunuyor.",
              level:
                ticketedReady
                  ? "ok"
                  : "warning",
              required:
                true,
              href:
                `/dashboard/turlar/${tourId}/ucus`,
            },

            {
              id:
                "deadline",
              title:
                "Ticketing deadline",
              detail:
                expiredDeadlineCount >
                  0
                  ? `${expiredDeadlineCount} uçuşta deadline geçmiş.`
                  : deadlineRisks.length >
                      0
                    ? `${deadlineRisks.length} uçuşun ticketing deadline süresi 72 saat içinde.`
                    : "Kritik ticketing deadline riski yok.",
              level:
                expiredDeadlineCount >
                  0
                  ? "critical"
                  : deadlineRisks.length >
                      0
                    ? "warning"
                    : "ok",
              required:
                true,
              href:
                `/dashboard/turlar/${tourId}/ucus`,
            },
          ];
        }


        if (
          tour?.transport_mode ===
          "bus"
        ) {
          return [
            ...common,

            {
              id:
                "bus",
              title:
                "Otobüs operasyonu",
              detail:
                busCount >
                  0
                  ? `${busCount} otobüs operasyon kaydı var.`
                  : "Otobüs operasyonu oluşturulmamış.",
              level:
                busCount >
                  0
                  ? "ok"
                  : "critical",
              required:
                true,
              href:
                `/dashboard/turlar/${tourId}/otobus`,
            },

            {
              id:
                "vehicle",
              title:
                "Araç ataması",
              detail:
                vehicleReady
                  ? "Tüm otobüslere araç atanmış."
                  : "Araç atanmamış otobüs bulunuyor.",
              level:
                vehicleReady
                  ? "ok"
                  : "critical",
              required:
                true,
              href:
                `/dashboard/turlar/${tourId}/otobus`,
            },

            {
              id:
                "driver",
              title:
                "Şoför",
              detail:
                driverReady
                  ? "Tüm araçların ana şoförü ve telefonu tanımlı."
                  : "Şoför veya şoför telefonu eksik.",
              level:
                driverReady
                  ? "ok"
                  : "critical",
              required:
                true,
              href:
                `/dashboard/turlar/${tourId}/otobus`,
            },

            {
              id:
                "guide",
              title:
                "Rehber",
              detail:
                guideReady
                  ? "Rehber ve iletişim bilgileri tamam."
                  : "Rehber veya rehber telefonu eksik.",
              level:
                guideReady
                  ? "ok"
                  : "critical",
              required:
                true,
              href:
                `/dashboard/turlar/${tourId}/otobus`,
            },

            {
              id:
                "seat-plan",
              title:
                "Koltuk planı",
              detail:
                seatPlanReady
                  ? "Araç kapasitelerine göre koltuk planları oluşturulmuş."
                  : "Eksik koltuk planı veya kapasite bulunuyor.",
              level:
                seatPlanReady
                  ? "ok"
                  : "critical",
              required:
                true,
              href:
                `/dashboard/turlar/${tourId}/otobus`,
            },

            {
              id:
                "seat-passenger",
              title:
                "Yolcu / koltuk ataması",
              detail:
                `${linkedPassengerSeatCount}/${passengers.length} yolcu koltuğa bağlı.`,
              level:
                passengerSeatReady
                  ? "ok"
                  : "critical",
              required:
                true,
              href:
                `/dashboard/turlar/${tourId}/otobus`,
            },

            {
              id:
                "boarding-stops",
              title:
                "Biniş noktaları",
              detail:
                stopReady
                  ? "Her otobüs için en az bir biniş noktası tanımlı."
                  : "Biniş noktası eksik olan otobüs bulunuyor.",
              level:
                stopReady
                  ? "ok"
                  : "critical",
              required:
                true,
              href:
                `/dashboard/turlar/${tourId}/otobus`,
            },

            {
              id:
                "boarding-assignment",
              title:
                "Yolcu biniş ataması",
              detail:
                boardingAssignmentReady
                  ? "Koltuklu yolcuların biniş noktaları atanmış."
                  : "Biniş noktası atanmamış yolcu bulunuyor.",
              level:
                boardingAssignmentReady
                  ? "ok"
                  : "warning",
              required:
                true,
              href:
                `/dashboard/turlar/${tourId}/otobus`,
            },
          ];
        }


        return [
          ...common,

          {
            id:
              "transport",
            title:
              "Ulaşım tipi",
            detail:
              "Tur henüz Uçaklı veya Otobüslü olarak sınıflandırılmamış.",
            level:
              "critical",
            required:
              true,
            href:
              "/dashboard/turlar",
          },
        ];
      },
      [
        boardingAssignmentReady,
        busCount,
        documentReadyCount,
        driverReady,
        expectedPassengerCount,
        expiredDeadlineCount,
        flightCoreReady,
        flightPnrReady,
        guideReady,
        linkedPassengerSeatCount,
        manifest.length,
        manifestReady,
        outboundFlights.length,
        passengers.length,
        reservations.length,
        returnFlights.length,
        roomingReadyCount,
        roomingRelevant,
        seatPlanReady,
        selectedDepartureId,
        stopReady,
        ticketedReady,
        deadlineRisks.length,
        tour,
        tourId,
        vehicleReady,
      ]
    );


  const requiredChecks =
    checks.filter(
      item =>
        item.required
    );


  const passedChecks =
    requiredChecks.filter(
      item =>
        item.level ===
        "ok"
    ).length;


  const readiness =
    requiredChecks.length >
      0
      ? Math.round(
          (
            passedChecks /
            requiredChecks.length
          ) *
            100
        )
      : 0;


  const criticalChecks =
    checks.filter(
      item =>
        item.level ===
        "critical"
    );


  const warningChecks =
    checks.filter(
      item =>
        item.level ===
        "warning"
    );


  const selectedDeparture =
    departures.find(
      item =>
        item.id ===
        selectedDepartureId
    ) ??
    null;


  if (
    loading
  ) {
    return (
      <main className="grid min-h-[70vh] place-items-center bg-[#030a11] text-white">
        Operasyon hazırlığı hesaplanıyor...
      </main>
    );
  }


  return (
    <main className="min-h-screen bg-[#030a11] text-white">

      <div className="mx-auto max-w-[1650px] px-5 py-7 lg:px-8">

        <Link
          href="/dashboard/turlar"
          className="inline-flex items-center gap-2 text-[9px] font-black text-slate-500 hover:text-orange-300"
        >
          <FaArrowLeft />
          Tur Yönetimi
        </Link>


        <section className="mt-4 overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,.14),transparent_34%),linear-gradient(145deg,#07131f,#040b12)] p-6 lg:p-8">

          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">

            <div>

              <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/[.07] px-3 py-1.5 text-[8px] font-black uppercase tracking-[.15em] text-orange-300">
                <FaClipboardCheck />
                OPERASYON HAZIRLIK MERKEZİ
              </div>


              <h1 className="mt-4 text-3xl font-black tracking-[-.04em] lg:text-4xl">
                {tour?.title ||
                  "Tur"}
              </h1>


              <div className="mt-3 flex flex-wrap items-center gap-2 text-[8px] text-slate-500">

                <span>
                  {tour?.transport_mode ===
                    "air"
                    ? "Uçaklı Tur"
                    : tour?.transport_mode ===
                        "bus"
                      ? "Otobüslü Tur"
                      : "Ulaşım Belirlenmedi"}
                </span>

                <span>•</span>

                <span>
                  Çıkış:{" "}
                  {formatDate(
                    selectedDeparture?.departure_date ??
                    tour?.departure_date ??
                    null
                  )}
                </span>

                <span>•</span>

                <span>
                  Gerçek operasyon verisinden hesaplanır
                </span>

              </div>

            </div>


            <select
              value={
                selectedDepartureId
              }
              disabled={
                busy
              }
              onChange={event =>
                void changeDeparture(
                  event.target.value
                )
              }
              className="min-h-11 rounded-xl border border-white/10 bg-[#030a11] px-4 text-[8px] font-black"
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

          </div>

        </section>


        {error && (
          <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/[.06] px-4 py-3 text-[8px] font-black text-red-300">
            {error}
          </div>
        )}


        <section className="mt-5 grid gap-4 lg:grid-cols-[320px_1fr]">

          <article className="rounded-[28px] border border-white/10 bg-[#07131f] p-6">

            <div className="text-[8px] font-black uppercase tracking-[.13em] text-slate-600">
              ÇIKIŞA HAZIRLIK
            </div>


            <div
              className={`mt-5 text-6xl font-black tracking-[-.07em] ${
                readiness ===
                100
                  ? "text-emerald-300"
                  : readiness >=
                      70
                    ? "text-amber-300"
                    : "text-red-300"
              }`}
            >
              %{readiness}
            </div>


            <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/[.05]">

              <div
                className="h-full rounded-full bg-orange-500 transition-all"
                style={{
                  width:
                    `${readiness}%`,
                }}
              />

            </div>


            <div className="mt-5 grid grid-cols-2 gap-3">

              <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/[.05] p-3">
                <div className="text-[7px] font-black text-emerald-300">
                  HAZIR
                </div>

                <div className="mt-2 text-2xl font-black">
                  {passedChecks}
                </div>
              </div>


              <div className="rounded-xl border border-white/10 bg-white/[.02] p-3">
                <div className="text-[7px] font-black text-slate-500">
                  ZORUNLU
                </div>

                <div className="mt-2 text-2xl font-black">
                  {requiredChecks.length}
                </div>
              </div>

            </div>


            <p className="mt-5 text-[7px] leading-5 text-slate-600">
              Oran yalnızca zorunlu kontrollerden hesaplanır.
              Gerekli olmayan kontroller yüzdeyi etkilemez.
            </p>

          </article>


          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">

            <article className="rounded-[24px] border border-red-500/15 bg-red-500/[.04] p-5">

              <div className="flex items-center gap-2 text-[8px] font-black text-red-300">
                <FaTimesCircle />
                Kritik Alarm
              </div>

              <div className="mt-3 text-3xl font-black">
                {criticalChecks.length}
              </div>

            </article>


            <article className="rounded-[24px] border border-amber-500/15 bg-amber-500/[.04] p-5">

              <div className="flex items-center gap-2 text-[8px] font-black text-amber-300">
                <FaExclamationTriangle />
                Eksik / Uyarı
              </div>

              <div className="mt-3 text-3xl font-black">
                {warningChecks.length}
              </div>

            </article>


            <article className="rounded-[24px] border border-white/10 bg-[#07131f] p-5">

              <div className="flex items-center gap-2 text-[8px] font-black text-slate-400">
                <FaUsers />
                Yolcu
              </div>

              <div className="mt-3 text-3xl font-black">
                {passengers.length}
                <span className="ml-1 text-sm text-slate-600">
                  /
                  {expectedPassengerCount}
                </span>
              </div>

            </article>


            <article className="rounded-[24px] border border-white/10 bg-[#07131f] p-5">

              <div className="flex items-center gap-2 text-[8px] font-black text-slate-400">
                {tour?.transport_mode ===
                  "air"
                  ? <FaPlane />
                  : <FaBus />}
                Operasyon
              </div>

              <div className="mt-3 text-3xl font-black">
                {tour?.transport_mode ===
                  "air"
                  ? activeFlights.length
                  : busOperations.length}
              </div>

            </article>

          </section>

        </section>


        {criticalChecks.length >
          0 && (
          <section className="mt-5 rounded-[26px] border border-red-500/20 bg-red-500/[.04] p-5">

            <div className="flex items-center gap-2 text-[9px] font-black text-red-300">
              <FaExclamationTriangle />
              Kritik Operasyon Alarmları
            </div>


            <div className="mt-4 grid gap-2 lg:grid-cols-2">

              {criticalChecks.map(
                check => (
                  <Link
                    key={
                      check.id
                    }
                    href={
                      check.href ??
                      "#"
                    }
                    className="rounded-xl border border-red-500/15 bg-[#07131f] p-4 transition hover:border-red-400/30"
                  >
                    <div className="text-[8px] font-black text-red-300">
                      {check.title}
                    </div>

                    <div className="mt-2 text-[7px] leading-5 text-slate-500">
                      {check.detail}
                    </div>
                  </Link>
                )
              )}

            </div>

          </section>
        )}


        <section className="mt-5 overflow-hidden rounded-[28px] border border-white/10 bg-[#07131f]">

          <div className="border-b border-white/[.06] p-5">

            <div className="text-[10px] font-black">
              Operasyon Checklist
            </div>

            <div className="mt-1 text-[7px] text-slate-600">
              Her satır canlı veriden değerlendirilir. Manuel olarak “hazır” işaretlenmez.
            </div>

          </div>


          <div className="overflow-auto">

            <table className="min-w-[1000px] w-full">

              <thead className="bg-[#081522]">

                <tr className="text-left text-[7px] font-black uppercase tracking-[.09em] text-slate-600">

                  <th className="px-5 py-4">
                    Kontrol
                  </th>

                  <th className="px-5 py-4">
                    Açıklama
                  </th>

                  <th className="px-5 py-4">
                    Zorunlu
                  </th>

                  <th className="px-5 py-4">
                    Durum
                  </th>

                  <th className="px-5 py-4 text-right">
                    İşlem
                  </th>

                </tr>

              </thead>


              <tbody>

                {checks.map(
                  check => (
                    <tr
                      key={
                        check.id
                      }
                      className="border-t border-white/[.045] hover:bg-white/[.02]"
                    >

                      <td className="px-5 py-4">

                        <div className="flex items-center gap-3">

                          <div
                            className={`grid h-9 w-9 place-items-center rounded-xl border ${checkClass(
                              check.level
                            )}`}
                          >
                            {check.level ===
                              "ok"
                              ? <FaCheckCircle />
                              : check.level ===
                                  "critical"
                                ? <FaTimesCircle />
                                : check.level ===
                                    "warning"
                                  ? <FaExclamationTriangle />
                                  : <FaClipboardCheck />}
                          </div>

                          <div className="text-[9px] font-black">
                            {check.title}
                          </div>

                        </div>

                      </td>


                      <td className="px-5 py-4 text-[8px] text-slate-500">
                        {check.detail}
                      </td>


                      <td className="px-5 py-4">

                        <span className="text-[7px] font-black text-slate-500">
                          {check.required
                            ? "Evet"
                            : "Hayır"}
                        </span>

                      </td>


                      <td className="px-5 py-4">

                        <span
                          className={`inline-flex rounded-full border px-3 py-1.5 text-[7px] font-black ${checkClass(
                            check.level
                          )}`}
                        >
                          {levelLabel(
                            check.level
                          )}
                        </span>

                      </td>


                      <td className="px-5 py-4 text-right">

                        {check.href && (
                          <Link
                            href={
                              check.href
                            }
                            className="inline-flex rounded-lg border border-white/10 px-3 py-2 text-[7px] font-black text-slate-400 hover:border-orange-500/30 hover:text-orange-300"
                          >
                            Aç
                          </Link>
                        )}

                      </td>

                    </tr>
                  )
                )}

              </tbody>

            </table>

          </div>

        </section>


        <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">

          <Link
            href={`/dashboard/turlar/${tourId}/yolcular`}
            className="rounded-[22px] border border-white/10 bg-[#07131f] p-5 transition hover:border-emerald-500/20"
          >
            <FaIdCard className="text-emerald-300" />
            <div className="mt-4 text-[9px] font-black">
              Yolcu & Belgeler
            </div>
          </Link>


          <Link
            href={`/dashboard/turlar/${tourId}/yolcular`}
            className="rounded-[22px] border border-white/10 bg-[#07131f] p-5 transition hover:border-violet-500/20"
          >
            <FaBed className="text-violet-300" />
            <div className="mt-4 text-[9px] font-black">
              Rooming
            </div>
          </Link>


          {tour?.transport_mode ===
            "air" ? (
            <Link
              href={`/dashboard/turlar/${tourId}/ucus`}
              className="rounded-[22px] border border-white/10 bg-[#07131f] p-5 transition hover:border-blue-500/20"
            >
              <FaTicketAlt className="text-blue-300" />
              <div className="mt-4 text-[9px] font-black">
                Uçuş & Ticketing
              </div>
            </Link>
          ) : (
            <Link
              href={`/dashboard/turlar/${tourId}/otobus`}
              className="rounded-[22px] border border-white/10 bg-[#07131f] p-5 transition hover:border-orange-500/20"
            >
              <FaBus className="text-orange-300" />
              <div className="mt-4 text-[9px] font-black">
                Otobüs & Koltuk
              </div>
            </Link>
          )}


          <Link
            href="/dashboard/manifest"
            className="rounded-[22px] border border-white/10 bg-[#07131f] p-5 transition hover:border-orange-500/20"
          >
            <FaRoute className="text-orange-300" />
            <div className="mt-4 text-[9px] font-black">
              Manifest
            </div>
          </Link>

        </section>

      </div>

    </main>
  );
}
