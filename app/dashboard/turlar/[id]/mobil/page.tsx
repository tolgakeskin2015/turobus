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
  FaCheck,
  FaClipboardCheck,
  FaExclamationTriangle,
  FaMapMarkerAlt,
  FaPhone,
  FaPlane,
  FaSave,
  FaSearch,
  FaTimes,
  FaUserCheck,
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


type OperationStatus =
  | "waiting"
  | "transfer_waiting"
  | "in_vehicle"
  | "arrived"
  | "activity_started"
  | "activity_completed"
  | "returning"
  | "completed"
  | "no_show";


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
  tour_id: string;
  departure_date: string;
  capacity: number;
  reserved_count: number;
  status: string;
};


type Reservation = {
  id: string;
  reservation_code:
    string | null;
  departure_id:
    string | null;
  full_name: string;
  phone: string;
  guests: number;
  status: string;
};


type Passenger = {
  id: string;
  departure_id: string;
  reservation_id:
    string | null;
  full_name: string;
  phone:
    string | null;
  passenger_no: number;
};


type BusOperation = {
  id: string;
  bus_no: number;
  guide_name:
    string | null;
  guide_phone:
    string | null;
  driver_1_name:
    string | null;
  driver_1_phone:
    string | null;
  vehicle_id:
    string | null;
};


type BoardingStop = {
  id: string;
  bus_operation_id: string;
  stop_name: string;
  planned_at:
    string | null;
};


type BusSeat = {
  id: string;
  bus_operation_id: string;
  passenger_id:
    string | null;
  boarding_stop_id:
    string | null;
  seat_number: number;
  checkin_status:
    "waiting" |
    "boarded" |
    "no_show";
  boarded_at:
    string | null;
};


type Checkin = {
  reservation_id: string;
  checked_in: boolean;
  checked_in_at:
    string | null;
  current_status:
    OperationStatus;
  status_note:
    string | null;
};


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
        "long",
      year:
        "numeric",
    }
  ).format(date);
}


function formatTime(
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
    return "—";
  }

  return new Intl.DateTimeFormat(
    "tr-TR",
    {
      hour:
        "2-digit",
      minute:
        "2-digit",
    }
  ).format(date);
}


export default function MobileTourOperationsPage() {
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
    currentUserId,
    setCurrentUserId,
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
    checkins,
    setCheckins,
  ] =
    useState<Checkin[]>(
      []
    );


  const [
    search,
    setSearch,
  ] =
    useState("");


  const [
    filter,
    setFilter,
  ] =
    useState<
      "all" |
      "waiting" |
      "boarded" |
      "no_show"
    >(
      "all"
    );


  const [
    note,
    setNote,
  ] =
    useState("");


  const [
    loading,
    setLoading,
  ] =
    useState(true);


  const [
    busyId,
    setBusyId,
  ] =
    useState("");


  const [
    savingNote,
    setSavingNote,
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


  const loadDepartureData =
    useCallback(
      async (
        currentCompanyId:
          string,

        departureId:
          string
      ) => {

        if (
          !departureId
        ) {
          return;
        }


        const [
          reservationResult,
          passengerResult,
          busOperationResult,
          busSeatResult,
          boardingResult,
        ] =
          await Promise.all([

            supabase
              .from(
                "reservations"
              )
              .select(
                [
                  "id",
                  "reservation_code",
                  "departure_id",
                  "full_name",
                  "phone",
                  "guests",
                  "status",
                ].join(",")
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
              )
              .order(
                "full_name",
                {
                  ascending:
                    true,
                }
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
                  "full_name",
                  "phone",
                  "passenger_no",
                ].join(",")
              )
              .eq(
                "company_id",
                currentCompanyId
              )
              .eq(
                "departure_id",
                departureId
              )
              .order(
                "full_name",
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
                  "guide_name",
                  "guide_phone",
                  "driver_1_name",
                  "driver_1_phone",
                  "vehicle_id",
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
                  "passenger_id",
                  "boarding_stop_id",
                  "seat_number",
                  "checkin_status",
                  "boarded_at",
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


        const errors = [
          reservationResult.error,
          passengerResult.error,
          busOperationResult.error,
          busSeatResult.error,
          boardingResult.error,
        ].filter(Boolean);


        if (
          errors.length >
          0
        ) {
          throw errors[0];
        }


        const loadedReservations =
          (
            reservationResult.data ??
            []
          ) as unknown as
            Reservation[];


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
            boardingResult.data ??
            []
          ) as unknown as
            BoardingStop[]
        );


        const reservationIds =
          loadedReservations.map(
            item =>
              item.id
          );


        if (
          reservationIds.length ===
          0
        ) {
          setCheckins([]);
          return;
        }


        const checkinResult =
          await supabase
            .from(
              "tour_checkins"
            )
            .select(
              [
                "reservation_id",
                "checked_in",
                "checked_in_at",
                "current_status",
                "status_note",
              ].join(",")
            )
            .in(
              "reservation_id",
              reservationIds
            );


        if (
          checkinResult.error
        ) {
          throw checkinResult.error;
        }


        setCheckins(
          (
            checkinResult.data ??
            []
          ) as unknown as
            Checkin[]
        );

      },
      [
        tourId,
      ]
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


          setCurrentUserId(
            authData.user.id
          );


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


          if (
            loadedDepartures.length >
            0
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
              currentCompanyId,
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
      !companyId
    ) {
      return;
    }


    setLoading(true);


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

      setLoading(false);

    }

  }


  async function updateReservationCheckin(
    reservationId:
      string,

    status:
      OperationStatus,

    checkedIn:
      boolean,

    statusNote:
      string
  ) {

    const now =
      new Date()
        .toISOString();


    const current =
      checkins.find(
        item =>
          item.reservation_id ===
          reservationId
      );


    const {
      error:
        checkinError,
    } =
      await supabase
        .from(
          "tour_checkins"
        )
        .upsert(
          {
            reservation_id:
              reservationId,

            current_status:
              status,

            checked_in:
              checkedIn,

            checked_in_at:
              checkedIn
                ? current?.checked_in_at ??
                  now
                : null,

            checked_in_by:
              currentUserId ||
              "Mobil Operasyon",

            status_note:
              statusNote,

            last_updated_at:
              now,

            updated_at:
              now,
          },
          {
            onConflict:
              "reservation_id",
          }
        );


    if (
      checkinError
    ) {
      throw checkinError;
    }


    const {
      error:
        historyError,
    } =
      await supabase
        .from(
          "tour_status_history"
        )
        .insert({
          reservation_id:
            reservationId,

          status,

          note:
            statusNote,

          updated_by:
            currentUserId ||
            "Mobil Operasyon",
        });


    if (
      historyError
    ) {
      throw historyError;
    }

  }


  async function refreshReservationOperationalState(
    reservationId:
      string
  ) {

    const reservationPassengers =
      passengers.filter(
        passenger =>
          passenger.reservation_id ===
          reservationId
      );


    if (
      reservationPassengers.length ===
      0
    ) {
      return;
    }


    const passengerIds =
      new Set(
        reservationPassengers.map(
          passenger =>
            passenger.id
        )
      );


    const relatedSeats =
      busSeats.filter(
        seat =>
          seat.passenger_id &&
          passengerIds.has(
            seat.passenger_id
          )
      );


    if (
      relatedSeats.length !==
      reservationPassengers.length
    ) {
      return;
    }


    const allBoarded =
      relatedSeats.every(
        seat =>
          seat.checkin_status ===
          "boarded"
      );


    const allNoShow =
      relatedSeats.every(
        seat =>
          seat.checkin_status ===
          "no_show"
      );


    if (
      allBoarded
    ) {

      await updateReservationCheckin(
        reservationId,
        "in_vehicle",
        true,
        "Tüm yolcular mobil operasyon ekranından araca bindi."
      );

    } else if (
      allNoShow
    ) {

      await updateReservationCheckin(
        reservationId,
        "no_show",
        false,
        "Rezervasyondaki tüm yolcular mobil operasyonda no-show olarak işaretlendi."
      );

    }

  }


  async function setPassengerBusStatus(
    passenger:
      Passenger,

    status:
      "boarded" |
      "no_show"
  ) {

    const seat =
      busSeats.find(
        item =>
          item.passenger_id ===
          passenger.id
      );


    if (!seat) {

      setError(
        "Bu yolcuya otobüs koltuğu atanmamış."
      );

      return;

    }


    setBusyId(
      passenger.id
    );

    setError("");
    setNotice("");


    try {

      const now =
        new Date()
          .toISOString();


      const {
        error:
          updateError,
      } =
        await supabase
          .from(
            "tour_bus_seats"
          )
          .update({
            checkin_status:
              status,

            boarded_at:
              status ===
              "boarded"
                ? now
                : null,

            updated_at:
              now,
          })
          .eq(
            "company_id",
            companyId
          )
          .eq(
            "id",
            seat.id
          );


      if (
        updateError
      ) {
        throw updateError;
      }


      const updatedSeats =
        busSeats.map(
          item =>
            item.id ===
            seat.id
              ? {
                  ...item,
                  checkin_status:
                    status,
                  boarded_at:
                    status ===
                    "boarded"
                      ? now
                      : null,
                }
              : item
        );


      setBusSeats(
        updatedSeats
      );


      if (
        passenger.reservation_id
      ) {

        const reservationPassengers =
          passengers.filter(
            item =>
              item.reservation_id ===
              passenger.reservation_id
          );


        const passengerIds =
          new Set(
            reservationPassengers.map(
              item =>
                item.id
            )
          );


        const relevantSeats =
          updatedSeats.filter(
            item =>
              item.passenger_id &&
              passengerIds.has(
                item.passenger_id
              )
          );


        if (
          relevantSeats.length ===
          reservationPassengers.length
        ) {

          const allBoarded =
            relevantSeats.every(
              item =>
                item.checkin_status ===
                "boarded"
            );


          const allNoShow =
            relevantSeats.every(
              item =>
                item.checkin_status ===
                "no_show"
            );


          if (
            allBoarded
          ) {

            await updateReservationCheckin(
              passenger.reservation_id,
              "in_vehicle",
              true,
              "Tüm yolcular mobil operasyon ekranından araca bindi."
            );

          } else if (
            allNoShow
          ) {

            await updateReservationCheckin(
              passenger.reservation_id,
              "no_show",
              false,
              "Rezervasyondaki tüm yolcular no-show."
            );

          }

        }

      }


      await loadDepartureData(
        companyId,
        selectedDepartureId
      );


      setNotice(
        status ===
        "boarded"
          ? `${passenger.full_name} araca bindi.`
          : `${passenger.full_name} no-show olarak işaretlendi.`
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

      setBusyId("");

    }

  }


  async function setReservationParticipation(
    reservation:
      Reservation,

    status:
      "in_vehicle" |
      "no_show"
  ) {

    setBusyId(
      reservation.id
    );

    setError("");
    setNotice("");


    try {

      await updateReservationCheckin(
        reservation.id,

        status,

        status ===
          "in_vehicle",

        status ===
          "in_vehicle"
          ? "Mobil operasyon ekranından katıldı olarak işaretlendi."
          : "Mobil operasyon ekranından no-show olarak işaretlendi."
      );


      await loadDepartureData(
        companyId,
        selectedDepartureId
      );


      setNotice(
        status ===
        "in_vehicle"
          ? `${reservation.full_name} katıldı olarak işaretlendi.`
          : `${reservation.full_name} no-show olarak işaretlendi.`
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

      setBusyId("");

    }

  }


  async function saveUrgentNote() {

    if (
      !note.trim() ||
      !selectedDepartureId
    ) {
      return;
    }


    setSavingNote(true);
    setError("");
    setNotice("");


    try {

      const departureReservations =
        reservations;


      if (
        departureReservations.length ===
        0
      ) {
        throw new Error(
          "Bu çıkışta rezervasyon bulunmuyor."
        );
      }


      const {
        error:
          noteError,
      } =
        await supabase
          .from(
            "tour_status_history"
          )
          .insert(
            departureReservations.map(
              reservation => ({
                reservation_id:
                  reservation.id,

                status:
                  (
                    checkins.find(
                      item =>
                        item.reservation_id ===
                        reservation.id
                    )
                      ?.current_status ??
                    "waiting"
                  ),

                note:
                  `[SAHA NOTU] ${note.trim()}`,

                updated_by:
                  currentUserId ||
                  "Mobil Operasyon",
              })
            )
          );


      if (
        noteError
      ) {
        throw noteError;
      }


      setNote("");


      setNotice(
        "Saha notu bu çıkışın operasyon geçmişine kaydedildi."
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

      setSavingNote(false);

    }

  }


  const selectedDeparture =
    departures.find(
      departure =>
        departure.id ===
        selectedDepartureId
    ) ??
    null;


  const passengerRows =
    useMemo(
      () => {

        const query =
          search
            .trim()
            .toLocaleLowerCase(
              "tr-TR"
            );


        return passengers.filter(
          passenger => {

            const seat =
              busSeats.find(
                item =>
                  item.passenger_id ===
                  passenger.id
              );


            if (
              filter ===
                "waiting" &&
              seat?.checkin_status !==
                "waiting"
            ) {
              return false;
            }


            if (
              filter ===
                "boarded" &&
              seat?.checkin_status !==
                "boarded"
            ) {
              return false;
            }


            if (
              filter ===
                "no_show" &&
              seat?.checkin_status !==
                "no_show"
            ) {
              return false;
            }


            if (
              query &&
              ![
                passenger.full_name,
                passenger.phone,
              ]
                .filter(Boolean)
                .some(
                  value =>
                    String(value)
                      .toLocaleLowerCase(
                        "tr-TR"
                      )
                      .includes(
                        query
                      )
                )
            ) {
              return false;
            }


            return true;

          }
        );

      },
      [
        busSeats,
        filter,
        passengers,
        search,
      ]
    );


  const boardedCount =
    busSeats.filter(
      seat =>
        seat.passenger_id &&
        seat.checkin_status ===
        "boarded"
    ).length;


  const noShowCount =
    busSeats.filter(
      seat =>
        seat.passenger_id &&
        seat.checkin_status ===
        "no_show"
    ).length;


  const waitingCount =
    Math.max(
      0,
      passengers.length -
      boardedCount -
      noShowCount
    );


  const completedReservations =
    checkins.filter(
      item =>
        item.current_status ===
        "completed"
    ).length;


  if (
    loading
  ) {

    return (
      <main className="grid min-h-screen place-items-center bg-[#030a11] px-5 text-white">
        <div className="text-center">
          <FaBus className="mx-auto text-3xl text-orange-400" />
          <div className="mt-4 text-sm font-black">
            Saha operasyonu yükleniyor...
          </div>
        </div>
      </main>
    );

  }


  return (
    <main className="min-h-screen bg-[#030a11] pb-24 text-white">

      <div className="mx-auto max-w-3xl px-4 py-5">

        <div className="flex items-center justify-between gap-3">

          <Link
            href="/dashboard/turlar/control-tower"
            className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-[#07131f] text-slate-400"
          >
            <FaArrowLeft />
          </Link>


          <div className="text-right">

            <div className="text-[7px] font-black uppercase tracking-[.14em] text-orange-300">
              TUROBUS FIELD OPS
            </div>

            <div className="mt-1 text-[8px] text-slate-600">
              Mobil Rehber / Operasyon
            </div>

          </div>

        </div>


        <section className="mt-5 rounded-[26px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,.15),transparent_38%),#07131f] p-5">

          <div className="flex items-start justify-between gap-4">

            <div>

              <div className="flex items-center gap-2 text-[8px] font-black text-orange-300">

                {tour?.transport_mode ===
                "air"
                  ? <FaPlane />
                  : <FaBus />}

                {tour?.transport_mode ===
                "air"
                  ? "UÇAKLI TUR"
                  : tour?.transport_mode ===
                      "bus"
                    ? "OTOBÜSLÜ TUR"
                    : "TUR OPERASYONU"}

              </div>


              <h1 className="mt-3 text-2xl font-black tracking-[-.04em]">
                {tour?.title ||
                  "Tur"}
              </h1>


              <div className="mt-2 text-[8px] text-slate-500">
                {selectedDeparture
                  ? formatDate(
                      selectedDeparture.departure_date
                    )
                  : "Çıkış seçilmedi"}
              </div>

            </div>


            <select
              value={
                selectedDepartureId
              }
              onChange={event =>
                void changeDeparture(
                  event.target.value
                )
              }
              className="max-w-[155px] rounded-xl border border-white/10 bg-[#030a11] px-3 py-2 text-[7px] font-black"
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
                    {formatDate(
                      departure.departure_date
                    )}
                  </option>
                )
              )}

            </select>

          </div>

        </section>


        {error && (
          <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/[.07] px-4 py-3 text-[8px] font-black text-red-300">
            {error}
          </div>
        )}


        {notice && (
          <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/[.07] px-4 py-3 text-[8px] font-black text-emerald-300">
            {notice}
          </div>
        )}


        <section className="mt-4 grid grid-cols-2 gap-3">

          <article className="rounded-[20px] border border-white/10 bg-[#07131f] p-4">
            <div className="text-[7px] font-black text-slate-600">
              YOLCU
            </div>

            <div className="mt-2 text-2xl font-black">
              {passengers.length}
            </div>
          </article>


          <article className="rounded-[20px] border border-emerald-500/15 bg-emerald-500/[.04] p-4">
            <div className="text-[7px] font-black text-emerald-300">
              BİNDİ / KATILDI
            </div>

            <div className="mt-2 text-2xl font-black">
              {tour?.transport_mode ===
              "bus"
                ? boardedCount
                : checkins.filter(
                    item =>
                      item.checked_in
                  ).length}
            </div>
          </article>


          <article className="rounded-[20px] border border-amber-500/15 bg-amber-500/[.04] p-4">
            <div className="text-[7px] font-black text-amber-300">
              BEKLİYOR
            </div>

            <div className="mt-2 text-2xl font-black">
              {tour?.transport_mode ===
              "bus"
                ? waitingCount
                : Math.max(
                    0,
                    reservations.length -
                    checkins.filter(
                      item =>
                        item.checked_in ||
                        item.current_status ===
                        "no_show"
                    ).length
                  )}
            </div>
          </article>


          <article className="rounded-[20px] border border-red-500/15 bg-red-500/[.04] p-4">
            <div className="text-[7px] font-black text-red-300">
              NO-SHOW
            </div>

            <div className="mt-2 text-2xl font-black">
              {tour?.transport_mode ===
              "bus"
                ? noShowCount
                : checkins.filter(
                    item =>
                      item.current_status ===
                      "no_show"
                  ).length}
            </div>
          </article>

        </section>


        {tour?.transport_mode ===
          "bus" &&
          busOperations.length >
          0 && (
          <section className="mt-4 space-y-2">

            {busOperations.map(
              operation => (
                <article
                  key={
                    operation.id
                  }
                  className="rounded-[18px] border border-white/10 bg-[#07131f] p-4"
                >

                  <div className="flex items-center justify-between">

                    <div className="flex items-center gap-2 text-[8px] font-black">
                      <FaBus className="text-orange-300" />
                      Otobüs{" "}
                      {operation.bus_no}
                    </div>

                    <div className="text-[7px] text-slate-600">
                      {busSeats.filter(
                        seat =>
                          seat.bus_operation_id ===
                          operation.id &&
                          seat.checkin_status ===
                          "boarded"
                      ).length}
                      {" bindi"}
                    </div>

                  </div>


                  <div className="mt-3 grid grid-cols-2 gap-2">

                    <div className="rounded-xl bg-[#030a11] p-3">
                      <div className="text-[6px] font-black text-slate-600">
                        REHBER
                      </div>

                      <div className="mt-1 text-[8px] font-black">
                        {operation.guide_name ||
                          "Atanmadı"}
                      </div>

                      {operation.guide_phone && (
                        <a
                          href={`tel:${operation.guide_phone}`}
                          className="mt-1 inline-flex items-center gap-1 text-[7px] text-emerald-300"
                        >
                          <FaPhone />
                          {operation.guide_phone}
                        </a>
                      )}
                    </div>


                    <div className="rounded-xl bg-[#030a11] p-3">
                      <div className="text-[6px] font-black text-slate-600">
                        ŞOFÖR
                      </div>

                      <div className="mt-1 text-[8px] font-black">
                        {operation.driver_1_name ||
                          "Atanmadı"}
                      </div>

                      {operation.driver_1_phone && (
                        <a
                          href={`tel:${operation.driver_1_phone}`}
                          className="mt-1 inline-flex items-center gap-1 text-[7px] text-emerald-300"
                        >
                          <FaPhone />
                          {operation.driver_1_phone}
                        </a>
                      )}
                    </div>

                  </div>

                </article>
              )
            )}

          </section>
        )}


        <section className="mt-4 rounded-[22px] border border-white/10 bg-[#07131f] p-4">

          <div className="relative">

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
              placeholder="Yolcu ara..."
              className="h-11 w-full rounded-xl border border-white/10 bg-[#030a11] pl-9 pr-3 text-[9px]"
            />

          </div>


          {tour?.transport_mode ===
            "bus" && (
            <div className="mt-3 grid grid-cols-4 gap-2">

              {[
                [
                  "all",
                  "Tümü",
                ],
                [
                  "waiting",
                  "Bekleyen",
                ],
                [
                  "boarded",
                  "Binen",
                ],
                [
                  "no_show",
                  "No-show",
                ],
              ].map(
                item => (
                  <button
                    key={
                      item[0]
                    }
                    type="button"
                    onClick={() =>
                      setFilter(
                        item[0] as
                          typeof filter
                      )
                    }
                    className={`rounded-xl border px-2 py-2 text-[7px] font-black ${
                      filter ===
                      item[0]
                        ? "border-orange-500/30 bg-orange-500/[.08] text-orange-300"
                        : "border-white/10 bg-[#030a11] text-slate-500"
                    }`}
                  >
                    {item[1]}
                  </button>
                )
              )}

            </div>
          )}

        </section>


        <section className="mt-4 space-y-3">

          {tour?.transport_mode ===
          "bus" ? (

            passengerRows.length ===
            0 ? (

              <div className="rounded-[22px] border border-dashed border-white/10 p-8 text-center text-[8px] text-slate-600">
                Yolcu bulunamadı.
              </div>

            ) : (

              passengerRows.map(
                passenger => {

                  const seat =
                    busSeats.find(
                      item =>
                        item.passenger_id ===
                        passenger.id
                    );


                  const bus =
                    seat
                      ? busOperations.find(
                          item =>
                            item.id ===
                            seat.bus_operation_id
                        )
                      : null;


                  const stop =
                    seat
                      ? boardingStops.find(
                          item =>
                            item.id ===
                            seat.boarding_stop_id
                        )
                      : null;


                  return (
                    <article
                      key={
                        passenger.id
                      }
                      className={`rounded-[22px] border p-4 ${
                        seat?.checkin_status ===
                        "boarded"
                          ? "border-emerald-500/20 bg-emerald-500/[.04]"
                          : seat?.checkin_status ===
                              "no_show"
                            ? "border-red-500/20 bg-red-500/[.04]"
                            : "border-white/10 bg-[#07131f]"
                      }`}
                    >

                      <div className="flex items-start justify-between gap-3">

                        <div>

                          <div className="text-[10px] font-black">
                            {passenger.full_name}
                          </div>


                          <div className="mt-1 flex flex-wrap gap-2 text-[7px] text-slate-600">

                            <span>
                              Yolcu{" "}
                              {passenger.passenger_no}
                            </span>


                            {bus && (
                              <>
                                <span>•</span>
                                <span>
                                  Otobüs{" "}
                                  {bus.bus_no}
                                </span>
                              </>
                            )}


                            {seat && (
                              <>
                                <span>•</span>
                                <span>
                                  Koltuk{" "}
                                  {seat.seat_number}
                                </span>
                              </>
                            )}

                          </div>

                        </div>


                        <div
                          className={`rounded-full border px-2.5 py-1 text-[7px] font-black ${
                            seat?.checkin_status ===
                            "boarded"
                              ? "border-emerald-500/20 text-emerald-300"
                              : seat?.checkin_status ===
                                  "no_show"
                                ? "border-red-500/20 text-red-300"
                                : "border-amber-500/20 text-amber-300"
                          }`}
                        >
                          {seat?.checkin_status ===
                          "boarded"
                            ? "Bindi"
                            : seat?.checkin_status ===
                                "no_show"
                              ? "No-show"
                              : "Bekliyor"}
                        </div>

                      </div>


                      <div className="mt-3 grid grid-cols-2 gap-2">

                        <div className="rounded-xl bg-[#030a11] p-3">

                          <div className="flex items-center gap-1 text-[6px] font-black text-slate-600">
                            <FaMapMarkerAlt />
                            BİNİŞ NOKTASI
                          </div>

                          <div className="mt-1 text-[8px] font-black">
                            {stop?.stop_name ||
                              "Atanmadı"}
                          </div>

                          {stop && (
                            <div className="mt-1 text-[7px] text-slate-600">
                              {formatTime(
                                stop.planned_at
                              )}
                            </div>
                          )}

                        </div>


                        <div className="rounded-xl bg-[#030a11] p-3">

                          <div className="text-[6px] font-black text-slate-600">
                            TELEFON
                          </div>

                          {passenger.phone ? (
                            <a
                              href={`tel:${passenger.phone}`}
                              className="mt-1 inline-flex items-center gap-1 text-[8px] font-black text-emerald-300"
                            >
                              <FaPhone />
                              Ara
                            </a>
                          ) : (
                            <div className="mt-1 text-[8px] text-slate-600">
                              —
                            </div>
                          )}

                        </div>

                      </div>


                      <div className="mt-3 grid grid-cols-2 gap-2">

                        <button
                          type="button"
                          disabled={
                            busyId ===
                            passenger.id
                          }
                          onClick={() =>
                            void setPassengerBusStatus(
                              passenger,
                              "boarded"
                            )
                          }
                          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-500 text-[9px] font-black text-white disabled:opacity-40"
                        >
                          <FaCheck />
                          Bindi ✓
                        </button>


                        <button
                          type="button"
                          disabled={
                            busyId ===
                            passenger.id
                          }
                          onClick={() =>
                            void setPassengerBusStatus(
                              passenger,
                              "no_show"
                            )
                          }
                          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/[.07] text-[9px] font-black text-red-300 disabled:opacity-40"
                        >
                          <FaTimes />
                          Gelmedi
                        </button>

                      </div>

                    </article>
                  );

                }
              )

            )

          ) : (

            reservations
              .filter(
                reservation =>
                  !search.trim() ||
                  [
                    reservation.full_name,
                    reservation.phone,
                    reservation.reservation_code,
                  ]
                    .filter(Boolean)
                    .some(
                      value =>
                        String(value)
                          .toLocaleLowerCase(
                            "tr-TR"
                          )
                          .includes(
                            search
                              .toLocaleLowerCase(
                                "tr-TR"
                              )
                          )
                    )
              )
              .map(
                reservation => {

                  const checkin =
                    checkins.find(
                      item =>
                        item.reservation_id ===
                        reservation.id
                    );


                  return (
                    <article
                      key={
                        reservation.id
                      }
                      className="rounded-[22px] border border-white/10 bg-[#07131f] p-4"
                    >

                      <div className="flex items-start justify-between gap-3">

                        <div>

                          <div className="text-[10px] font-black">
                            {reservation.full_name}
                          </div>

                          <div className="mt-1 text-[7px] text-slate-600">
                            {reservation.reservation_code ||
                              reservation.id.slice(
                                0,
                                8
                              )}
                            {" · "}
                            {reservation.guests}
                            {" kişi"}
                          </div>

                        </div>


                        <div
                          className={`rounded-full border px-2.5 py-1 text-[7px] font-black ${
                            checkin?.current_status ===
                            "no_show"
                              ? "border-red-500/20 text-red-300"
                              : checkin?.checked_in
                                ? "border-emerald-500/20 text-emerald-300"
                                : "border-amber-500/20 text-amber-300"
                          }`}
                        >
                          {checkin?.current_status ===
                          "no_show"
                            ? "No-show"
                            : checkin?.checked_in
                              ? "Katıldı"
                              : "Bekliyor"}
                        </div>

                      </div>


                      <div className="mt-3 grid grid-cols-2 gap-2">

                        <button
                          type="button"
                          disabled={
                            busyId ===
                            reservation.id
                          }
                          onClick={() =>
                            void setReservationParticipation(
                              reservation,
                              "in_vehicle"
                            )
                          }
                          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-500 text-[9px] font-black"
                        >
                          <FaUserCheck />
                          Katıldı ✓
                        </button>


                        <button
                          type="button"
                          disabled={
                            busyId ===
                            reservation.id
                          }
                          onClick={() =>
                            void setReservationParticipation(
                              reservation,
                              "no_show"
                            )
                          }
                          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/[.07] text-[9px] font-black text-red-300"
                        >
                          <FaTimes />
                          Gelmedi
                        </button>

                      </div>

                    </article>
                  );

                }
              )

          )}

        </section>


        <section className="mt-5 rounded-[22px] border border-orange-500/15 bg-orange-500/[.04] p-4">

          <div className="flex items-center gap-2 text-[9px] font-black text-orange-300">
            <FaExclamationTriangle />
            Acil / Saha Notu
          </div>


          <textarea
            value={
              note
            }
            onChange={event =>
              setNote(
                event.target.value
              )
            }
            rows={3}
            placeholder="Örn. Otobüs 15 dk gecikiyor, yolcu sağlık problemi yaşadı..."
            className="mt-3 w-full rounded-xl border border-white/10 bg-[#030a11] p-3 text-[9px]"
          />


          <button
            type="button"
            disabled={
              savingNote ||
              !note.trim()
            }
            onClick={() =>
              void saveUrgentNote()
            }
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 text-[9px] font-black disabled:opacity-40"
          >
            <FaSave />
            Saha Notunu Kaydet
          </button>

        </section>


        <section className="mt-5 grid grid-cols-2 gap-3">

          <Link
            href={`/dashboard/turlar/${tourId}/hazirlik`}
            className="rounded-[20px] border border-white/10 bg-[#07131f] p-4"
          >
            <FaClipboardCheck className="text-amber-300" />

            <div className="mt-3 text-[8px] font-black">
              Hazırlık
            </div>
          </Link>


          <Link
            href={`/dashboard/turlar/${tourId}/yolcular`}
            className="rounded-[20px] border border-white/10 bg-[#07131f] p-4"
          >
            <FaUsers className="text-emerald-300" />

            <div className="mt-3 text-[8px] font-black">
              Yolcu Merkezi
            </div>
          </Link>

        </section>


        <div className="mt-5 rounded-xl border border-white/[.06] bg-[#07131f] px-4 py-3 text-[7px] leading-5 text-slate-600">
          Tamamlanan rezervasyon:{" "}
          {completedReservations}.
          Saha ekranındaki değişiklikler mevcut
          tour_checkins, tour_status_history ve otobüs koltuk
          operasyon verilerine yazılır.
        </div>

      </div>

    </main>
  );
}
