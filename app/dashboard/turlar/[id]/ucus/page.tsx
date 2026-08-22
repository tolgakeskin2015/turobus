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
  FaPlane,
  FaPlus,
  FaSave,
  FaSuitcase,
  FaTicketAlt,
  FaTrash,
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


type Direction =
  | "outbound"
  | "return";


type FlightStatus =
  | "scheduled"
  | "confirmed"
  | "ticketing"
  | "ticketed"
  | "departed"
  | "arrived"
  | "cancelled";


type Tour = {
  id: string;
  title: string;
  transport_mode:
    "air" | "bus" | "other";
  departure_city:
    string | null;
  arrival_city:
    string | null;
  departure_date:
    string | null;
  return_date:
    string | null;
  capacity:
    number | null;
};


type Departure = {
  id: string;
  departure_date: string;
  capacity: number;
  reserved_count: number;
  status: string;
};


type Flight = {
  id: string;
  company_id: string;
  tour_id: string;
  departure_id:
    string | null;
  direction:
    Direction;
  segment_no:
    number;
  airline_name:
    string | null;
  airline_code:
    string | null;
  flight_number:
    string | null;
  pnr:
    string | null;
  group_booking_code:
    string | null;
  departure_airport_code:
    string | null;
  departure_airport_name:
    string | null;
  arrival_airport_code:
    string | null;
  arrival_airport_name:
    string | null;
  departure_at:
    string | null;
  arrival_at:
    string | null;
  cabin_baggage:
    string | null;
  checked_baggage:
    string | null;
  ticketing_deadline:
    string | null;
  seat_capacity:
    number | null;
  seats_reserved:
    number;
  seats_ticketed:
    number;
  status:
    FlightStatus;
  notes:
    string | null;
};


type FlightForm = {
  direction:
    Direction;
  segmentNo:
    string;
  airlineName:
    string;
  airlineCode:
    string;
  flightNumber:
    string;
  pnr:
    string;
  groupBookingCode:
    string;
  departureAirportCode:
    string;
  departureAirportName:
    string;
  arrivalAirportCode:
    string;
  arrivalAirportName:
    string;
  departureAt:
    string;
  arrivalAt:
    string;
  cabinBaggage:
    string;
  checkedBaggage:
    string;
  ticketingDeadline:
    string;
  seatCapacity:
    string;
  seatsReserved:
    string;
  seatsTicketed:
    string;
  status:
    FlightStatus;
  notes:
    string;
};


const EMPTY_FORM:
  FlightForm = {
    direction:
      "outbound",

    segmentNo:
      "1",

    airlineName:
      "",

    airlineCode:
      "",

    flightNumber:
      "",

    pnr:
      "",

    groupBookingCode:
      "",

    departureAirportCode:
      "",

    departureAirportName:
      "",

    arrivalAirportCode:
      "",

    arrivalAirportName:
      "",

    departureAt:
      "",

    arrivalAt:
      "",

    cabinBaggage:
      "",

    checkedBaggage:
      "",

    ticketingDeadline:
      "",

    seatCapacity:
      "",

    seatsReserved:
      "0",

    seatsTicketed:
      "0",

    status:
      "scheduled",

    notes:
      "",
  };


function text(
  value:
    string
) {
  const normalized =
    value.trim();

  return normalized
    ? normalized
    : null;
}


function localInputValue(
  value:
    string | null
) {
  if (!value) {
    return "";
  }

  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  const local =
    new Date(
      date.getTime() -
        date.getTimezoneOffset() *
          60_000
    );

  return local
    .toISOString()
    .slice(
      0,
      16
    );
}


function dateTime(
  value:
    string | null
) {
  if (!value) {
    return "—";
  }

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


function directionLabel(
  value:
    Direction
) {
  return value ===
    "outbound"
    ? "Gidiş"
    : "Dönüş";
}


function statusLabel(
  value:
    FlightStatus
) {
  const labels:
    Record<
      FlightStatus,
      string
    > = {
      scheduled:
        "Planlandı",

      confirmed:
        "Onaylandı",

      ticketing:
        "Biletleme",

      ticketed:
        "Biletlendi",

      departed:
        "Kalktı",

      arrived:
        "Vardı",

      cancelled:
        "İptal",
    };

  return labels[value];
}


function statusClass(
  value:
    FlightStatus
) {
  if (
    value ===
      "ticketed" ||
    value ===
      "arrived"
  ) {
    return "border-emerald-500/20 bg-emerald-500/[.07] text-emerald-300";
  }

  if (
    value ===
      "confirmed" ||
    value ===
      "departed"
  ) {
    return "border-blue-500/20 bg-blue-500/[.07] text-blue-300";
  }

  if (
    value ===
    "ticketing"
  ) {
    return "border-amber-500/20 bg-amber-500/[.07] text-amber-300";
  }

  if (
    value ===
    "cancelled"
  ) {
    return "border-red-500/20 bg-red-500/[.07] text-red-300";
  }

  return "border-white/10 bg-white/[.03] text-slate-400";
}


function deadlineState(
  flight:
    Flight
) {
  if (
    !flight.ticketing_deadline ||
    flight.status ===
      "ticketed" ||
    flight.status ===
      "departed" ||
    flight.status ===
      "arrived" ||
    flight.status ===
      "cancelled"
  ) {
    return null;
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
    return null;
  }

  const diffHours =
    (
      deadline -
      Date.now()
    ) /
    3_600_000;

  if (
    diffHours < 0
  ) {
    return {
      level:
        "critical",
      label:
        "Ticketing deadline geçti",
    };
  }

  if (
    diffHours <= 24
  ) {
    return {
      level:
        "critical",
      label:
        "Ticketing 24 saat içinde",
    };
  }

  if (
    diffHours <= 72
  ) {
    return {
      level:
        "warning",
      label:
        "Ticketing 72 saat içinde",
    };
  }

  return null;
}


export default function TourFlightOperationsPage() {
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
    flights,
    setFlights,
  ] =
    useState<Flight[]>(
      []
    );

  const [
    form,
    setForm,
  ] =
    useState<FlightForm>(
      EMPTY_FORM
    );

  const [
    editingId,
    setEditingId,
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
          string,
        requestedDepartureId?:
          string
      ) => {

        const [
          tourResult,
          departureResult,
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
                  "departure_city",
                  "arrival_city",
                  "departure_date",
                  "return_date",
                  "capacity",
                ].join(
                  ","
                )
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
                  "departure_date",
                  "capacity",
                  "reserved_count",
                  "status",
                ].join(
                  ","
                )
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


        const loadedDepartures =
          (
            departureResult.data ??
            []
          ) as unknown as
            Departure[];


        const availableIds =
          new Set(
            loadedDepartures.map(
              item =>
                item.id
            )
          );


        let scope =
          requestedDepartureId ??
          "";


        if (
          !scope ||
          (
            scope !==
              "__legacy__" &&
            !availableIds.has(
              scope
            )
          )
        ) {
          scope =
            loadedDepartures[0]
              ?.id ??
            "__legacy__";
        }


        let flightQuery =
          supabase
            .from(
              "tour_flights"
            )
            .select(
              "*"
            )
            .eq(
              "company_id",
              currentCompanyId
            )
            .eq(
              "tour_id",
              tourId
            );


        if (
          scope ===
          "__legacy__"
        ) {

          flightQuery =
            flightQuery.is(
              "departure_id",
              null
            );

        } else {

          flightQuery =
            flightQuery.eq(
              "departure_id",
              scope
            );
        }


        const {
          data:
            flightData,
          error:
            flightError,
        } =
          await flightQuery
            .order(
              "direction",
              {
                ascending:
                  true,
              }
            )
            .order(
              "segment_no",
              {
                ascending:
                  true,
              }
            );


        if (
          flightError
        ) {
          throw flightError;
        }


        setTour(
          tourResult.data as unknown as
            Tour
        );


        setDepartures(
          loadedDepartures
        );


        setSelectedDepartureId(
          scope
        );


        setFlights(
          (
            flightData ??
            []
          ) as unknown as
            Flight[]
        );

      },
      [
        tourId,
      ]
    );


  // TOUR_OS_15_0B_FLIGHT_DEPARTURE_SCOPE


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


  const alerts =
    useMemo(
      () => {
        return flights
          .map(
            flight => ({
              flight,
              state:
                deadlineState(
                  flight
                ),
            })
          )
          .filter(
            item =>
              Boolean(
                item.state
              )
          );
      },
      [
        flights,
      ]
    );


  const totalCapacity =
    flights.reduce(
      (
        total,
        flight
      ) =>
        total +
        Number(
          flight.seat_capacity ??
          0
        ),
      0
    );


  const totalReserved =
    flights.reduce(
      (
        total,
        flight
      ) =>
        total +
        Number(
          flight.seats_reserved ??
          0
        ),
      0
    );


  const totalTicketed =
    flights.reduce(
      (
        total,
        flight
      ) =>
        total +
        Number(
          flight.seats_ticketed ??
          0
        ),
      0
    );


  function resetForm(
    direction:
      Direction =
        "outbound"
  ) {
    setEditingId(
      ""
    );

    setForm({
      ...EMPTY_FORM,
      direction,
      seatCapacity:
        tour?.capacity
          ? String(
              tour.capacity
            )
          : "",
    });
  }


  function editFlight(
    flight:
      Flight
  ) {
    setEditingId(
      flight.id
    );

    setForm({
      direction:
        flight.direction,

      segmentNo:
        String(
          flight.segment_no
        ),

      airlineName:
        flight.airline_name ??
        "",

      airlineCode:
        flight.airline_code ??
        "",

      flightNumber:
        flight.flight_number ??
        "",

      pnr:
        flight.pnr ??
        "",

      groupBookingCode:
        flight.group_booking_code ??
        "",

      departureAirportCode:
        flight.departure_airport_code ??
        "",

      departureAirportName:
        flight.departure_airport_name ??
        "",

      arrivalAirportCode:
        flight.arrival_airport_code ??
        "",

      arrivalAirportName:
        flight.arrival_airport_name ??
        "",

      departureAt:
        localInputValue(
          flight.departure_at
        ),

      arrivalAt:
        localInputValue(
          flight.arrival_at
        ),

      cabinBaggage:
        flight.cabin_baggage ??
        "",

      checkedBaggage:
        flight.checked_baggage ??
        "",

      ticketingDeadline:
        localInputValue(
          flight.ticketing_deadline
        ),

      seatCapacity:
        flight.seat_capacity ===
        null
          ? ""
          : String(
              flight.seat_capacity
            ),

      seatsReserved:
        String(
          flight.seats_reserved
        ),

      seatsTicketed:
        String(
          flight.seats_ticketed
        ),

      status:
        flight.status,

      notes:
        flight.notes ??
        "",
    });

    window.scrollTo({
      top:
        0,
      behavior:
        "smooth",
    });
  }


  async function save() {
    if (
      !companyId ||
      !selectedDepartureId
    ) {
      return;
    }

    if (
      selectedDepartureId ===
        "__legacy__" &&
      !editingId
    ) {
      setError(
        "Yeni uçuş eklemek için gerçek bir tur çıkışı seçin."
      );

      return;
    }

    const segmentNo =
      Math.max(
        1,
        Number(
          form.segmentNo
        ) || 1
      );

    const seatCapacity =
      form.seatCapacity
        ? Math.max(
            0,
            Number(
              form.seatCapacity
            ) || 0
          )
        : null;

    const seatsReserved =
      Math.max(
        0,
        Number(
          form.seatsReserved
        ) || 0
      );

    const seatsTicketed =
      Math.max(
        0,
        Number(
          form.seatsTicketed
        ) || 0
      );

    if (
      seatCapacity !==
        null &&
      seatsReserved >
        seatCapacity
    ) {
      setError(
        "Rezerve koltuk sayısı kapasiteden büyük olamaz."
      );

      return;
    }

    if (
      seatsTicketed >
      seatsReserved
    ) {
      setError(
        "Biletlenen koltuk sayısı rezerve koltuktan büyük olamaz."
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
      const payload = {
        company_id:
          companyId,

        tour_id:
          tourId,

        departure_id:
          selectedDepartureId ===
            "__legacy__"
            ? null
            : selectedDepartureId,

        direction:
          form.direction,

        segment_no:
          segmentNo,

        airline_name:
          text(
            form.airlineName
          ),

        airline_code:
          text(
            form.airlineCode
          ),

        flight_number:
          text(
            form.flightNumber
          ),

        pnr:
          text(
            form.pnr
          ),

        group_booking_code:
          text(
            form.groupBookingCode
          ),

        departure_airport_code:
          text(
            form.departureAirportCode
          ),

        departure_airport_name:
          text(
            form.departureAirportName
          ),

        arrival_airport_code:
          text(
            form.arrivalAirportCode
          ),

        arrival_airport_name:
          text(
            form.arrivalAirportName
          ),

        departure_at:
          form.departureAt
            ? new Date(
                form.departureAt
              ).toISOString()
            : null,

        arrival_at:
          form.arrivalAt
            ? new Date(
                form.arrivalAt
              ).toISOString()
            : null,

        cabin_baggage:
          text(
            form.cabinBaggage
          ),

        checked_baggage:
          text(
            form.checkedBaggage
          ),

        ticketing_deadline:
          form.ticketingDeadline
            ? new Date(
                form.ticketingDeadline
              ).toISOString()
            : null,

        seat_capacity:
          seatCapacity,

        seats_reserved:
          seatsReserved,

        seats_ticketed:
          seatsTicketed,

        status:
          form.status,

        notes:
          text(
            form.notes
          ),

        updated_at:
          new Date()
            .toISOString(),
      };

      if (
        editingId
      ) {
        const {
          error:
            updateError,
        } =
          await supabase
            .from(
              "tour_flights"
            )
            .update(
              payload
            )
            .eq(
              "id",
              editingId
            )
            .eq(
              "company_id",
              companyId
            )
            .eq(
              "tour_id",
              tourId
            );

        if (
          updateError
        ) {
          throw updateError;
        }

        setNotice(
          "Uçuş segmenti güncellendi."
        );

      } else {
        const {
          error:
            insertError,
        } =
          await supabase
            .from(
              "tour_flights"
            )
            .insert(
              payload
            );

        if (
          insertError
        ) {
          throw insertError;
        }

        setNotice(
          "Uçuş segmenti eklendi."
        );
      }

      await load(
        companyId
      );

      resetForm(
        form.direction
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


  async function removeFlight(
    flightId:
      string
  ) {
    if (
      !companyId
    ) {
      return;
    }

    const approved =
      window.confirm(
        "Bu uçuş segmentini silmek istediğinize emin misiniz?"
      );

    if (
      !approved
    ) {
      return;
    }

    setBusy(
      true
    );

    setError(
      ""
    );

    try {
      const {
        error:
          deleteError,
      } =
        await supabase
          .from(
            "tour_flights"
          )
          .delete()
          .eq(
            "id",
            flightId
          )
          .eq(
            "company_id",
            companyId
          )
          .eq(
            "tour_id",
            tourId
          );

      if (
        deleteError
      ) {
        throw deleteError;
      }

      await load(
        companyId
      );

      if (
        editingId ===
        flightId
      ) {
        resetForm();
      }

      setNotice(
        "Uçuş segmenti silindi."
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
        Uçuş operasyon merkezi yükleniyor...
      </main>
    );
  }


  return (
    <main data-tour-os-screen="flight-operations" className="min-h-screen bg-[#030a11] text-white">

      <div className="mx-auto max-w-[1650px] px-5 py-7 lg:px-8">

        <Link
          href="/dashboard/turlar"
          className="inline-flex items-center gap-2 text-[9px] font-black text-slate-500 hover:text-orange-300"
        >
          <FaArrowLeft />
          Tur Yönetimi
        </Link>


        <section className="mt-4 overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,.13),transparent_35%),linear-gradient(145deg,#07131f,#040b12)] p-6 lg:p-8">

          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">

            <div>

              <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/[.07] px-3 py-1.5 text-[8px] font-black uppercase tracking-[.15em] text-blue-300">
                <FaPlane />
                UÇAKLI TUR OPERASYONU
              </div>


              <h1 className="mt-4 text-3xl font-black tracking-[-.04em] lg:text-4xl">
                {tour?.title ||
                  "Tur"}
              </h1>


              <div className="mt-3 flex flex-wrap gap-2 text-[8px] font-bold text-slate-500">

                <span>
                  {tour?.departure_city ||
                    "Kalkış belirtilmedi"}
                  {" → "}
                  {tour?.arrival_city ||
                    "Varış belirtilmedi"}
                </span>

                <span>•</span>

                <span>
                  Kapasite:{" "}
                  {tour?.capacity ??
                    "—"}
                </span>

                {tour?.transport_mode !==
                  "air" && (
                  <>
                    <span>•</span>
                    <span className="text-amber-300">
                      Bu tur henüz “Uçaklı” olarak sınıflandırılmamış.
                    </span>
                  </>
                )}

              </div>

            </div>


            <div className="flex flex-wrap gap-2">

              <button
                type="button"
                onClick={() =>
                  resetForm(
                    "outbound"
                  )
                }
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-500 px-4 text-[8px] font-black"
              >
                <FaPlus />
                Gidiş Segmenti
              </button>


              <button
                type="button"
                onClick={() =>
                  resetForm(
                    "return"
                  )
                }
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[.03] px-4 text-[8px] font-black"
              >
                <FaPlus />
                Dönüş Segmenti
              </button>

            </div>

          </div>

        </section>


        <section className="mt-4 rounded-[22px] border border-blue-500/15 bg-blue-500/[.035] p-4 lg:p-5">

          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">

            <div className="min-w-0">

              <div className="text-[8px] font-black uppercase tracking-[.16em] text-blue-300">
                TUR ÇIKIŞI
              </div>

              <div className="mt-1 text-[11px] font-black text-white">
                Uçuş operasyonunun bağlı olduğu tarih
              </div>

              <div className="mt-1 text-[8px] font-bold text-slate-500">
                Her çıkışın PNR, uçuş segmenti, kapasite ve ticketing takibi birbirinden ayrıdır.
              </div>

            </div>


            <select
              value={
                selectedDepartureId
              }
              disabled={
                busy
              }
              onChange={
                event => {

                  const value =
                    event.target.value;

                  setEditingId(
                    ""
                  );

                  setForm(
                    EMPTY_FORM
                  );

                  void load(
                    companyId,
                    value
                  );
                }
              }
              className="min-h-11 min-w-[280px] rounded-xl border border-white/10 bg-[#07131f] px-3 text-[9px] font-black text-white outline-none"
            >

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
                    {new Intl.DateTimeFormat(
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
                      new Date(
                        `${departure.departure_date}T12:00:00`
                      )
                    )}
                    {" · "}
                    {departure.reserved_count}
                    /
                    {departure.capacity}
                  </option>
                )
              )}

              <option
                value="__legacy__"
              >
                Atanmamış Eski Kayıtlar
              </option>

            </select>

          </div>


          {selectedDepartureId ===
            "__legacy__" && (

            <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/[.06] px-3 py-2 text-[8px] font-bold text-amber-300">
              Bu bölüm yalnız eski ve henüz çıkışa bağlanmamış uçuş kayıtlarını gösterir. Yeni kayıt oluşturmak için gerçek bir çıkış seçin.
            </div>
          )}

        </section>


        {alerts.length >
          0 && (
          <section className="mt-4 space-y-2">

            {alerts.map(
              item => (
                <div
                  key={
                    item.flight.id
                  }
                  className={`flex items-center justify-between gap-4 rounded-xl border px-4 py-3 text-[8px] font-black ${
                    item.state?.level ===
                    "critical"
                      ? "border-red-500/20 bg-red-500/[.06] text-red-300"
                      : "border-amber-500/20 bg-amber-500/[.06] text-amber-300"
                  }`}
                >

                  <div className="flex items-center gap-2">

                    <FaExclamationTriangle />

                    {directionLabel(
                      item.flight.direction
                    )}
                    {" · "}
                    {item.flight.flight_number ||
                      "Uçuş No Yok"}
                    {" · "}
                    {item.state?.label}

                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      editFlight(
                        item.flight
                      )
                    }
                    className="rounded-lg border border-current/20 px-3 py-1.5"
                  >
                    Aç
                  </button>

                </div>
              )
            )}

          </section>
        )}


        {error && (
          <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/[.05] px-4 py-3 text-[8px] font-bold text-red-300">
            {error}
          </div>
        )}


        {notice && (
          <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/[.05] px-4 py-3 text-[8px] font-bold text-emerald-300">
            {notice}
          </div>
        )}


        <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">

          {[
            {
              title:
                "Uçuş Segmenti",
              value:
                flights.length,
              icon:
                <FaPlane />,
            },
            {
              title:
                "Toplam Kapasite",
              value:
                totalCapacity,
              icon:
                <FaUsers />,
            },
            {
              title:
                "Rezerve",
              value:
                totalReserved,
              icon:
                <FaUsers />,
            },
            {
              title:
                "Biletlenen",
              value:
                totalTicketed,
              icon:
                <FaTicketAlt />,
            },
            {
              title:
                "Aktif Alarm",
              value:
                alerts.length,
              icon:
                <FaExclamationTriangle />,
            },
          ].map(
            item => (
              <article
                key={
                  item.title
                }
                className="rounded-[22px] border border-white/10 bg-[#07131f] p-5"
              >

                <div className="flex items-start justify-between">

                  <div>

                    <div className="text-[7px] font-black uppercase tracking-[.12em] text-slate-600">
                      {item.title}
                    </div>

                    <div className="mt-3 text-3xl font-black">
                      {item.value}
                    </div>

                  </div>

                  <div className="grid h-10 w-10 place-items-center rounded-xl border border-blue-500/15 bg-blue-500/[.06] text-blue-300">
                    {item.icon}
                  </div>

                </div>

              </article>
            )
          )}

        </section>


        <section className="mt-5 grid gap-5 2xl:grid-cols-[480px_1fr]">

          <aside className="rounded-[26px] border border-white/10 bg-[#07131f] p-5">

            <div className="flex items-center justify-between">

              <div>

                <div className="text-[8px] font-black uppercase tracking-[.15em] text-blue-300">
                  {editingId
                    ? "UÇUŞ DÜZENLE"
                    : "YENİ UÇUŞ SEGMENTİ"}
                </div>

                <div className="mt-1 text-[8px] text-slate-600">
                  Gerçek operasyon kaydı
                </div>

              </div>

              {editingId && (
                <button
                  type="button"
                  onClick={() =>
                    resetForm()
                  }
                  className="text-[8px] font-black text-slate-500"
                >
                  Yeni kayıt
                </button>
              )}

            </div>


            <div className="mt-5 grid gap-3 sm:grid-cols-2">

              <label className="space-y-1">
                <span className="text-[7px] font-black text-slate-600">
                  YÖN
                </span>

                <select
                  value={
                    form.direction
                  }
                  onChange={(
                    event
                  ) =>
                    setForm(
                      current => ({
                        ...current,
                        direction:
                          event.target.value as
                            Direction,
                      })
                    )
                  }
                  className="h-10 w-full rounded-xl border border-white/10 bg-[#030a11] px-3 text-[8px]"
                >
                  <option value="outbound">
                    Gidiş
                  </option>

                  <option value="return">
                    Dönüş
                  </option>
                </select>
              </label>


              <label className="space-y-1">
                <span className="text-[7px] font-black text-slate-600">
                  SEGMENT
                </span>

                <input
                  type="number"
                  min={1}
                  value={
                    form.segmentNo
                  }
                  onChange={(
                    event
                  ) =>
                    setForm(
                      current => ({
                        ...current,
                        segmentNo:
                          event.target.value,
                      })
                    )
                  }
                  className="h-10 w-full rounded-xl border border-white/10 bg-[#030a11] px-3 text-[8px]"
                />
              </label>


              <label className="space-y-1">
                <span className="text-[7px] font-black text-slate-600">
                  HAVAYOLU
                </span>

                <input
                  value={
                    form.airlineName
                  }
                  onChange={(
                    event
                  ) =>
                    setForm(
                      current => ({
                        ...current,
                        airlineName:
                          event.target.value,
                      })
                    )
                  }
                  placeholder="Turkish Airlines"
                  className="h-10 w-full rounded-xl border border-white/10 bg-[#030a11] px-3 text-[8px]"
                />
              </label>


              <label className="space-y-1">
                <span className="text-[7px] font-black text-slate-600">
                  HAVAYOLU KODU
                </span>

                <input
                  value={
                    form.airlineCode
                  }
                  onChange={(
                    event
                  ) =>
                    setForm(
                      current => ({
                        ...current,
                        airlineCode:
                          event.target.value.toUpperCase(),
                      })
                    )
                  }
                  placeholder="TK"
                  className="h-10 w-full rounded-xl border border-white/10 bg-[#030a11] px-3 text-[8px] uppercase"
                />
              </label>


              <label className="space-y-1">
                <span className="text-[7px] font-black text-slate-600">
                  UÇUŞ NO
                </span>

                <input
                  value={
                    form.flightNumber
                  }
                  onChange={(
                    event
                  ) =>
                    setForm(
                      current => ({
                        ...current,
                        flightNumber:
                          event.target.value.toUpperCase(),
                      })
                    )
                  }
                  placeholder="TK2420"
                  className="h-10 w-full rounded-xl border border-white/10 bg-[#030a11] px-3 text-[8px] uppercase"
                />
              </label>


              <label className="space-y-1">
                <span className="text-[7px] font-black text-slate-600">
                  PNR
                </span>

                <input
                  value={
                    form.pnr
                  }
                  onChange={(
                    event
                  ) =>
                    setForm(
                      current => ({
                        ...current,
                        pnr:
                          event.target.value.toUpperCase(),
                      })
                    )
                  }
                  placeholder="ABC123"
                  className="h-10 w-full rounded-xl border border-white/10 bg-[#030a11] px-3 text-[8px] uppercase"
                />
              </label>


              <label className="space-y-1 sm:col-span-2">
                <span className="text-[7px] font-black text-slate-600">
                  GRUP REZERVASYON KODU
                </span>

                <input
                  value={
                    form.groupBookingCode
                  }
                  onChange={(
                    event
                  ) =>
                    setForm(
                      current => ({
                        ...current,
                        groupBookingCode:
                          event.target.value,
                      })
                    )
                  }
                  className="h-10 w-full rounded-xl border border-white/10 bg-[#030a11] px-3 text-[8px]"
                />
              </label>


              <label className="space-y-1">
                <span className="text-[7px] font-black text-slate-600">
                  KALKIŞ HAVALİMANI
                </span>

                <input
                  value={
                    form.departureAirportName
                  }
                  onChange={(
                    event
                  ) =>
                    setForm(
                      current => ({
                        ...current,
                        departureAirportName:
                          event.target.value,
                      })
                    )
                  }
                  placeholder="Dalaman Havalimanı"
                  className="h-10 w-full rounded-xl border border-white/10 bg-[#030a11] px-3 text-[8px]"
                />
              </label>


              <label className="space-y-1">
                <span className="text-[7px] font-black text-slate-600">
                  IATA
                </span>

                <input
                  maxLength={3}
                  value={
                    form.departureAirportCode
                  }
                  onChange={(
                    event
                  ) =>
                    setForm(
                      current => ({
                        ...current,
                        departureAirportCode:
                          event.target.value.toUpperCase(),
                      })
                    )
                  }
                  placeholder="DLM"
                  className="h-10 w-full rounded-xl border border-white/10 bg-[#030a11] px-3 text-[8px] uppercase"
                />
              </label>


              <label className="space-y-1">
                <span className="text-[7px] font-black text-slate-600">
                  VARIŞ HAVALİMANI
                </span>

                <input
                  value={
                    form.arrivalAirportName
                  }
                  onChange={(
                    event
                  ) =>
                    setForm(
                      current => ({
                        ...current,
                        arrivalAirportName:
                          event.target.value,
                      })
                    )
                  }
                  placeholder="İstanbul Havalimanı"
                  className="h-10 w-full rounded-xl border border-white/10 bg-[#030a11] px-3 text-[8px]"
                />
              </label>


              <label className="space-y-1">
                <span className="text-[7px] font-black text-slate-600">
                  IATA
                </span>

                <input
                  maxLength={3}
                  value={
                    form.arrivalAirportCode
                  }
                  onChange={(
                    event
                  ) =>
                    setForm(
                      current => ({
                        ...current,
                        arrivalAirportCode:
                          event.target.value.toUpperCase(),
                      })
                    )
                  }
                  placeholder="IST"
                  className="h-10 w-full rounded-xl border border-white/10 bg-[#030a11] px-3 text-[8px] uppercase"
                />
              </label>


              <label className="space-y-1">
                <span className="text-[7px] font-black text-slate-600">
                  KALKIŞ
                </span>

                <input
                  type="datetime-local"
                  value={
                    form.departureAt
                  }
                  onChange={(
                    event
                  ) =>
                    setForm(
                      current => ({
                        ...current,
                        departureAt:
                          event.target.value,
                      })
                    )
                  }
                  className="h-10 w-full rounded-xl border border-white/10 bg-[#030a11] px-3 text-[8px]"
                />
              </label>


              <label className="space-y-1">
                <span className="text-[7px] font-black text-slate-600">
                  VARIŞ
                </span>

                <input
                  type="datetime-local"
                  value={
                    form.arrivalAt
                  }
                  onChange={(
                    event
                  ) =>
                    setForm(
                      current => ({
                        ...current,
                        arrivalAt:
                          event.target.value,
                      })
                    )
                  }
                  className="h-10 w-full rounded-xl border border-white/10 bg-[#030a11] px-3 text-[8px]"
                />
              </label>


              <label className="space-y-1 sm:col-span-2">
                <span className="text-[7px] font-black text-slate-600">
                  TICKETING DEADLINE
                </span>

                <input
                  type="datetime-local"
                  value={
                    form.ticketingDeadline
                  }
                  onChange={(
                    event
                  ) =>
                    setForm(
                      current => ({
                        ...current,
                        ticketingDeadline:
                          event.target.value,
                      })
                    )
                  }
                  className="h-10 w-full rounded-xl border border-amber-500/20 bg-amber-500/[.04] px-3 text-[8px]"
                />
              </label>


              <label className="space-y-1">
                <span className="text-[7px] font-black text-slate-600">
                  KABİN BAGAJI
                </span>

                <input
                  value={
                    form.cabinBaggage
                  }
                  onChange={(
                    event
                  ) =>
                    setForm(
                      current => ({
                        ...current,
                        cabinBaggage:
                          event.target.value,
                      })
                    )
                  }
                  placeholder="8 kg"
                  className="h-10 w-full rounded-xl border border-white/10 bg-[#030a11] px-3 text-[8px]"
                />
              </label>


              <label className="space-y-1">
                <span className="text-[7px] font-black text-slate-600">
                  CHECKED BAGAJ
                </span>

                <input
                  value={
                    form.checkedBaggage
                  }
                  onChange={(
                    event
                  ) =>
                    setForm(
                      current => ({
                        ...current,
                        checkedBaggage:
                          event.target.value,
                      })
                    )
                  }
                  placeholder="20 kg"
                  className="h-10 w-full rounded-xl border border-white/10 bg-[#030a11] px-3 text-[8px]"
                />
              </label>


              <label className="space-y-1">
                <span className="text-[7px] font-black text-slate-600">
                  KAPASİTE
                </span>

                <input
                  type="number"
                  min={0}
                  value={
                    form.seatCapacity
                  }
                  onChange={(
                    event
                  ) =>
                    setForm(
                      current => ({
                        ...current,
                        seatCapacity:
                          event.target.value,
                      })
                    )
                  }
                  className="h-10 w-full rounded-xl border border-white/10 bg-[#030a11] px-3 text-[8px]"
                />
              </label>


              <label className="space-y-1">
                <span className="text-[7px] font-black text-slate-600">
                  REZERVE
                </span>

                <input
                  type="number"
                  min={0}
                  value={
                    form.seatsReserved
                  }
                  onChange={(
                    event
                  ) =>
                    setForm(
                      current => ({
                        ...current,
                        seatsReserved:
                          event.target.value,
                      })
                    )
                  }
                  className="h-10 w-full rounded-xl border border-white/10 bg-[#030a11] px-3 text-[8px]"
                />
              </label>


              <label className="space-y-1">
                <span className="text-[7px] font-black text-slate-600">
                  BİLETLENEN
                </span>

                <input
                  type="number"
                  min={0}
                  value={
                    form.seatsTicketed
                  }
                  onChange={(
                    event
                  ) =>
                    setForm(
                      current => ({
                        ...current,
                        seatsTicketed:
                          event.target.value,
                      })
                    )
                  }
                  className="h-10 w-full rounded-xl border border-white/10 bg-[#030a11] px-3 text-[8px]"
                />
              </label>


              <label className="space-y-1">
                <span className="text-[7px] font-black text-slate-600">
                  DURUM
                </span>

                <select
                  value={
                    form.status
                  }
                  onChange={(
                    event
                  ) =>
                    setForm(
                      current => ({
                        ...current,
                        status:
                          event.target.value as
                            FlightStatus,
                      })
                    )
                  }
                  className="h-10 w-full rounded-xl border border-white/10 bg-[#030a11] px-3 text-[8px]"
                >
                  <option value="scheduled">
                    Planlandı
                  </option>
                  <option value="confirmed">
                    Onaylandı
                  </option>
                  <option value="ticketing">
                    Biletleme
                  </option>
                  <option value="ticketed">
                    Biletlendi
                  </option>
                  <option value="departed">
                    Kalktı
                  </option>
                  <option value="arrived">
                    Vardı
                  </option>
                  <option value="cancelled">
                    İptal
                  </option>
                </select>
              </label>


              <label className="space-y-1 sm:col-span-2">
                <span className="text-[7px] font-black text-slate-600">
                  NOT
                </span>

                <textarea
                  rows={3}
                  value={
                    form.notes
                  }
                  onChange={(
                    event
                  ) =>
                    setForm(
                      current => ({
                        ...current,
                        notes:
                          event.target.value,
                      })
                    )
                  }
                  className="w-full rounded-xl border border-white/10 bg-[#030a11] p-3 text-[8px]"
                />
              </label>

            </div>


            <button
              type="button"
              disabled={
                busy
              }
              onClick={() =>
                void save()
              }
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-500 px-5 text-[8px] font-black disabled:opacity-40"
            >
              <FaSave />

              {busy
                ? "Kaydediliyor..."
                : editingId
                  ? "Uçuşu Güncelle"
                  : "Uçuşu Kaydet"}
            </button>

          </aside>


          <section className="overflow-hidden rounded-[26px] border border-white/10 bg-[#07131f]">

            <div className="border-b border-white/[.07] px-5 py-4">

              <div className="text-[9px] font-black">
                Uçuş Planı
              </div>

              <div className="mt-1 text-[7px] text-slate-600">
                Gidiş, dönüş ve aktarma segmentleri
              </div>

            </div>


            <div className="overflow-auto">

              <table className="min-w-[1450px] w-full">

                <thead className="bg-[#081522]">

                  <tr className="text-left text-[7px] font-black uppercase tracking-[.1em] text-slate-600">

                    <th className="px-4 py-4">
                      Yön
                    </th>

                    <th className="px-4 py-4">
                      Uçuş
                    </th>

                    <th className="px-4 py-4">
                      PNR
                    </th>

                    <th className="px-4 py-4">
                      Rota
                    </th>

                    <th className="px-4 py-4">
                      Kalkış
                    </th>

                    <th className="px-4 py-4">
                      Varış
                    </th>

                    <th className="px-4 py-4">
                      Bagaj
                    </th>

                    <th className="px-4 py-4">
                      Kontenjan
                    </th>

                    <th className="px-4 py-4">
                      Ticketing
                    </th>

                    <th className="px-4 py-4">
                      Durum
                    </th>

                    <th className="px-4 py-4 text-right">
                      İşlem
                    </th>

                  </tr>

                </thead>


                <tbody>

                  {flights.length ===
                  0 ? (
                    <tr>

                      <td
                        colSpan={11}
                        className="px-5 py-14 text-center"
                      >
                        <FaPlane className="mx-auto text-3xl text-slate-800" />

                        <div className="mt-4 text-[10px] font-black">
                          Henüz uçuş segmenti yok
                        </div>

                        <div className="mt-2 text-[8px] text-slate-600">
                          Gidiş veya dönüş uçuşu ekleyin.
                        </div>
                      </td>

                    </tr>
                  ) : (
                    flights.map(
                      flight => {
                        const alert =
                          deadlineState(
                            flight
                          );

                        const available =
                          flight.seat_capacity ===
                          null
                            ? null
                            : Math.max(
                                0,
                                flight.seat_capacity -
                                  flight.seats_reserved
                              );

                        return (
                          <tr
                            key={
                              flight.id
                            }
                            className="border-t border-white/[.045] hover:bg-white/[.02]"
                          >

                            <td className="px-4 py-4">

                              <div className="text-[8px] font-black">
                                {directionLabel(
                                  flight.direction
                                )}
                              </div>

                              <div className="mt-1 text-[7px] text-slate-600">
                                Segment{" "}
                                {flight.segment_no}
                              </div>

                            </td>


                            <td className="px-4 py-4">

                              <div className="text-[9px] font-black">
                                {flight.flight_number ||
                                  "—"}
                              </div>

                              <div className="mt-1 text-[7px] text-slate-600">
                                {flight.airline_name ||
                                  "Havayolu belirtilmedi"}
                              </div>

                            </td>


                            <td className="px-4 py-4">

                              <div className="font-mono text-[8px] font-black text-blue-300">
                                {flight.pnr ||
                                  "—"}
                              </div>

                              {flight.group_booking_code && (
                                <div className="mt-1 text-[7px] text-slate-600">
                                  Grup:{" "}
                                  {flight.group_booking_code}
                                </div>
                              )}

                            </td>


                            <td className="px-4 py-4">

                              <div className="flex items-center gap-2 text-[8px] font-black">

                                <FaPlane className="text-blue-300" />

                                {flight.departure_airport_code ||
                                  "—"}

                                <span className="text-slate-700">
                                  →
                                </span>

                                {flight.arrival_airport_code ||
                                  "—"}

                              </div>

                            </td>


                            <td className="px-4 py-4 text-[8px]">
                              {dateTime(
                                flight.departure_at
                              )}
                            </td>


                            <td className="px-4 py-4 text-[8px]">
                              {dateTime(
                                flight.arrival_at
                              )}
                            </td>


                            <td className="px-4 py-4">

                              <div className="flex items-center gap-2 text-[7px]">

                                <FaSuitcase className="text-slate-600" />

                                <span>
                                  {flight.cabin_baggage ||
                                    "—"}
                                  {" / "}
                                  {flight.checked_baggage ||
                                    "—"}
                                </span>

                              </div>

                            </td>


                            <td className="px-4 py-4">

                              <div className="text-[8px] font-black">
                                {flight.seats_reserved}
                                {" / "}
                                {flight.seat_capacity ??
                                  "—"}
                              </div>

                              <div className="mt-1 text-[7px] text-slate-600">
                                Bilet:{" "}
                                {flight.seats_ticketed}
                                {" · "}
                                Boş:{" "}
                                {available ??
                                  "—"}
                              </div>

                            </td>


                            <td className="px-4 py-4">

                              <div className="flex items-center gap-2 text-[7px]">

                                <FaClock
                                  className={
                                    alert
                                      ? "text-amber-300"
                                      : "text-slate-600"
                                  }
                                />

                                <span
                                  className={
                                    alert
                                      ? "font-black text-amber-300"
                                      : "text-slate-500"
                                  }
                                >
                                  {dateTime(
                                    flight.ticketing_deadline
                                  )}
                                </span>

                              </div>

                              {alert && (
                                <div className="mt-1 text-[7px] font-black text-red-300">
                                  {alert.label}
                                </div>
                              )}

                            </td>


                            <td className="px-4 py-4">

                              <span
                                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[7px] font-black ${statusClass(
                                  flight.status
                                )}`}
                              >
                                {flight.status ===
                                  "ticketed" ||
                                flight.status ===
                                  "arrived"
                                  ? <FaCheckCircle />
                                  : <FaClock />}

                                {statusLabel(
                                  flight.status
                                )}
                              </span>

                            </td>


                            <td className="px-4 py-4">

                              <div className="flex justify-end gap-2">

                                <button
                                  type="button"
                                  onClick={() =>
                                    editFlight(
                                      flight
                                    )
                                  }
                                  className="rounded-lg border border-blue-500/20 bg-blue-500/[.05] px-3 py-2 text-[7px] font-black text-blue-300"
                                >
                                  Düzenle
                                </button>


                                <button
                                  type="button"
                                  disabled={
                                    busy
                                  }
                                  onClick={() =>
                                    void removeFlight(
                                      flight.id
                                    )
                                  }
                                  className="grid h-8 w-8 place-items-center rounded-lg border border-red-500/20 bg-red-500/[.05] text-red-300 disabled:opacity-40"
                                >
                                  <FaTrash />
                                </button>

                              </div>

                            </td>

                          </tr>
                        );
                      }
                    )
                  )}

                </tbody>

              </table>

            </div>

          </section>

        </section>

      </div>

    </main>
  );
}
