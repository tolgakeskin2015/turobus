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
  FaExclamationTriangle,
  FaIdCard,
  FaPlane,
  FaPlus,
  FaSave,
  FaSearch,
  FaSyncAlt,
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

import TourModuleChrome from "../../../components/TourModuleChrome";


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
  company_id: string;
  departure_id:
    string | null;
  reservation_code:
    string | null;
  full_name: string;
  phone: string;
  email: string;
  guests: number;
  status: string;
  payment_status:
    string | null;
};


type Passenger = {
  id: string;
  company_id: string;
  tour_id: string;
  departure_id: string;
  reservation_id:
    string | null;
  passenger_no: number;
  is_primary: boolean;
  full_name: string;
  phone:
    string | null;
  email:
    string | null;
  birth_date:
    string | null;
  nationality:
    string | null;
  identity_type:
    "tc" |
    "passport" |
    "other" |
    null;
  identity_number:
    string | null;
  gender:
    string | null;
  room_group:
    string | null;
  room_no:
    string | null;
  room_type:
    string | null;
  hotel_name:
    string | null;
  special_request:
    string | null;
  notes:
    string | null;
};


type BusOperation = {
  id: string;
  bus_no: number;
  vehicle_id:
    string | null;
};


type BusSeat = {
  id: string;
  bus_operation_id: string;
  seat_number: number;
  passenger_id:
    string | null;
  passenger_name:
    string | null;
  passenger_phone:
    string | null;
  seat_status: string;
  checkin_status: string;
};


type ManifestRow = {
  manifest_id: string;
  reservation_id: string;
  manifest_status: string;
  pickup_point:
    string | null;
  pickup_time:
    string | null;
};


type PassengerForm = {
  reservationId: string;
  passengerNo: string;
  fullName: string;
  phone: string;
  email: string;
  birthDate: string;
  nationality: string;
  identityType:
    "" |
    "tc" |
    "passport" |
    "other";
  identityNumber: string;
  gender: string;
  hotelName: string;
  roomGroup: string;
  roomNo: string;
  roomType: string;
  specialRequest: string;
  notes: string;
};


const EMPTY_FORM:
  PassengerForm = {
    reservationId:
      "",
    passengerNo:
      "2",
    fullName:
      "",
    phone:
      "",
    email:
      "",
    birthDate:
      "",
    nationality:
      "",
    identityType:
      "",
    identityNumber:
      "",
    gender:
      "",
    hotelName:
      "",
    roomGroup:
      "",
    roomNo:
      "",
    roomType:
      "",
    specialRequest:
      "",
    notes:
      "",
  };


function nullable(
  value:
    string
) {
  const result =
    value.trim();

  return result
    ? result
    : null;
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


export default function TourPassengerCenterPage() {
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
      "missing" |
      "rooming" |
      "ready"
    >(
      "all"
    );

  const [
    form,
    setForm,
  ] =
    useState<PassengerForm>(
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


  const selectedDeparture =
    useMemo(
      () =>
        departures.find(
          item =>
            item.id ===
            selectedDepartureId
        ) ??
        null,
      [
        departures,
        selectedDepartureId,
      ]
    );


  const loadDepartureData =
    useCallback(
      async (
        currentCompanyId:
          string,
        departureId:
          string
      ) => {
        if (!departureId) {
          return;
        }

        const [
          reservationsResult,
          passengersResult,
          busOperationResult,
          busSeatsResult,
        ] =
          await Promise.all([
            supabase
              .from(
                "reservations"
              )
              .select(
                [
                  "id",
                  "company_id",
                  "departure_id",
                  "reservation_code",
                  "full_name",
                  "phone",
                  "email",
                  "guests",
                  "status",
                  "payment_status",
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
              .eq(
                "cancellation_status",
                "active"
              )
              .neq(
                "status",
                "cancelled"
              )
              .order(
                "created_at",
                {
                  ascending:
                    true,
                }
              ),

            supabase
              .from(
                "tour_passengers"
              )
              .select("*")
              .eq(
                "company_id",
                currentCompanyId
              )
              .eq(
                "departure_id",
                departureId
              )
              .order(
                "reservation_id",
                {
                  ascending:
                    true,
                }
              )
              .order(
                "passenger_no",
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
                "id,bus_no,vehicle_id"
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
                  "passenger_name",
                  "passenger_phone",
                  "seat_status",
                  "checkin_status",
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
          reservationsResult.error
        ) {
          throw reservationsResult.error;
        }

        if (
          passengersResult.error
        ) {
          throw passengersResult.error;
        }

        if (
          busOperationResult.error
        ) {
          throw busOperationResult.error;
        }

        if (
          busSeatsResult.error
        ) {
          throw busSeatsResult.error;
        }


        const manifestSync =
          await supabase.rpc(
            "sync_tour_departure_manifest",
            {
              p_company_id:
                currentCompanyId,
              p_departure_id:
                departureId,
            }
          );

        if (
          manifestSync.error
        ) {
          throw manifestSync.error;
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
                "pickup_time",
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
            reservationsResult.data ??
            []
          ) as unknown as
            Reservation[]
        );

        setPassengers(
          (
            passengersResult.data ??
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
            busSeatsResult.data ??
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
                .from("tours")
                .select(
                  "id,title,transport_mode"
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
            tourResult.data as unknown as Tour;

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
            loadedDepartures.length
          ) {
            const firstDepartureId =
              loadedDepartures[0].id;

            setSelectedDepartureId(
              firstDepartureId
            );

            await loadDepartureData(
              currentCompanyId,
              firstDepartureId
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
      companyId
    ) {
      setBusy(true);

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
  }


  async function syncPassengers() {
    if (
      !companyId ||
      !selectedDepartureId
    ) {
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const {
        error:
          syncError,
      } =
        await supabase.rpc(
          "sync_tour_passengers_from_reservations",
          {
            p_company_id:
              companyId,
            p_departure_id:
              selectedDepartureId,
          }
        );

      if (
        syncError
      ) {
        throw syncError;
      }

      await loadDepartureData(
        companyId,
        selectedDepartureId
      );

      setNotice(
        "Rezervasyon sahipleri yolcu listesine senkronlandı."
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


  function newPassenger(
    reservation:
      Reservation
  ) {
    const linked =
      passengers.filter(
        passenger =>
          passenger.reservation_id ===
          reservation.id
      );

    setEditingId("");

    setForm({
      ...EMPTY_FORM,
      reservationId:
        reservation.id,
      passengerNo:
        String(
          linked.length +
          1
        ),
    });
  }


  function editPassenger(
    passenger:
      Passenger
  ) {
    setEditingId(
      passenger.id
    );

    setForm({
      reservationId:
        passenger.reservation_id ??
        "",
      passengerNo:
        String(
          passenger.passenger_no
        ),
      fullName:
        passenger.full_name,
      phone:
        passenger.phone ??
        "",
      email:
        passenger.email ??
        "",
      birthDate:
        passenger.birth_date ??
        "",
      nationality:
        passenger.nationality ??
        "",
      identityType:
        passenger.identity_type ??
        "",
      identityNumber:
        passenger.identity_number ??
        "",
      gender:
        passenger.gender ??
        "",
      hotelName:
        passenger.hotel_name ??
        "",
      roomGroup:
        passenger.room_group ??
        "",
      roomNo:
        passenger.room_no ??
        "",
      roomType:
        passenger.room_type ??
        "",
      specialRequest:
        passenger.special_request ??
        "",
      notes:
        passenger.notes ??
        "",
    });
  }


  async function savePassenger() {
    if (
      !companyId ||
      !selectedDepartureId ||
      !tour
    ) {
      return;
    }

    if (
      !form.fullName.trim()
    ) {
      setError(
        "Yolcu adı soyadı zorunlu."
      );
      return;
    }

    if (
      !form.reservationId
    ) {
      setError(
        "Yolcu bir rezervasyona bağlanmalı."
      );
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const payload = {
        company_id:
          companyId,

        tour_id:
          tour.id,

        departure_id:
          selectedDepartureId,

        reservation_id:
          form.reservationId,

        passenger_no:
          Math.max(
            1,
            Number(
              form.passengerNo
            ) || 1
          ),

        is_primary:
          Number(
            form.passengerNo
          ) === 1,

        full_name:
          form.fullName.trim(),

        phone:
          nullable(
            form.phone
          ),

        email:
          nullable(
            form.email
          ),

        birth_date:
          form.birthDate ||
          null,

        nationality:
          nullable(
            form.nationality
          ),

        identity_type:
          form.identityType ||
          null,

        identity_number:
          nullable(
            form.identityNumber
          ),

        gender:
          nullable(
            form.gender
          ),

        hotel_name:
          nullable(
            form.hotelName
          ),

        room_group:
          nullable(
            form.roomGroup
          ),

        room_no:
          nullable(
            form.roomNo
          ),

        room_type:
          nullable(
            form.roomType
          ),

        special_request:
          nullable(
            form.specialRequest
          ),

        notes:
          nullable(
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
              "tour_passengers"
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
            );

        if (
          updateError
        ) {
          throw updateError;
        }

      } else {
        const {
          error:
            insertError,
        } =
          await supabase
            .from(
              "tour_passengers"
            )
            .insert(
              payload
            );

        if (
          insertError
        ) {
          throw insertError;
        }
      }


      await loadDepartureData(
        companyId,
        selectedDepartureId
      );

      setEditingId("");
      setForm(
        EMPTY_FORM
      );

      setNotice(
        editingId
          ? "Yolcu güncellendi."
          : "Yolcu eklendi."
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


  const reservationStats =
    useMemo(
      () => {
        return reservations.map(
          reservation => {
            const linked =
              passengers.filter(
                passenger =>
                  passenger.reservation_id ===
                  reservation.id
              );

            return {
              reservation,
              passengerCount:
                linked.length,
              missingCount:
                Math.max(
                  0,
                  Number(
                    reservation.guests
                  ) -
                  linked.length
                ),
            };
          }
        );
      },
      [
        passengers,
        reservations,
      ]
    );


  const totalExpected =
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


  const missingPassengerCount =
    reservationStats.reduce(
      (
        total,
        item
      ) =>
        total +
        item.missingCount,
      0
    );


  const documentReadyCount =
    passengers.filter(
      documentReady
    ).length;


  const roomedCount =
    passengers.filter(
      passenger =>
        Boolean(
          passenger.room_no ||
          passenger.room_group
        )
    ).length;


  const visiblePassengers =
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
            const reservation =
              reservations.find(
                item =>
                  item.id ===
                  passenger.reservation_id
              );

            const matchesSearch =
              !query ||
              [
                passenger.full_name,
                passenger.phone,
                passenger.email,
                passenger.identity_number,
                passenger.room_no,
                passenger.hotel_name,
                reservation?.reservation_code,
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
                );

            if (
              !matchesSearch
            ) {
              return false;
            }

            if (
              filter ===
              "missing"
            ) {
              return !documentReady(
                passenger
              );
            }

            if (
              filter ===
              "rooming"
            ) {
              return Boolean(
                passenger.room_no ||
                passenger.room_group
              );
            }

            if (
              filter ===
              "ready"
            ) {
              return documentReady(
                passenger
              );
            }

            return true;
          }
        );
      },
      [
        filter,
        passengers,
        reservations,
        search,
      ]
    );


  if (
    loading
  ) {
    return (
      <main data-tour-module-screen className="grid min-h-[70vh] place-items-center bg-[#030a11] text-white">

      <TourModuleChrome
        tourId={tourId}
        moduleKey="passengers"
      />

        Yolcu operasyon merkezi yükleniyor...
      </main>
    );
  }


  return (
    <main data-tour-os-screen="passenger-rooming" className="min-h-screen bg-[#030a11] text-white">

      <div className="mx-auto max-w-[1700px] px-5 py-7 lg:px-8">

        <Link
          href="/dashboard/turlar"
          className="inline-flex items-center gap-2 text-[9px] font-black text-slate-500 hover:text-orange-300"
        >
          <FaArrowLeft />
          Tur Yönetimi
        </Link>


        <section className="mt-4 rounded-[26px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,.12),transparent_35%),linear-gradient(145deg,#07131f,#040b12)] p-6 lg:p-8">

          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">

            <div>

              <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/[.07] px-3 py-1.5 text-[8px] font-black uppercase tracking-[.15em] text-orange-300">
                <FaUsers />
                YOLCU OPERASYON MERKEZİ
              </div>

              <h1 className="mt-4 text-3xl font-black tracking-[-.04em] lg:text-4xl">
                {tour?.title ||
                  "Tur"}
              </h1>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-[8px] text-slate-500">

                <span>
                  Yolcu
                </span>

                <span>•</span>

                <span>
                  Rooming
                </span>

                <span>•</span>

                <span>
                  Manifest
                </span>

                <span>•</span>

                {tour?.transport_mode ===
                  "air" ? (
                  <span className="inline-flex items-center gap-1 text-blue-300">
                    <FaPlane />
                    Uçaklı
                  </span>
                ) : tour?.transport_mode ===
                  "bus" ? (
                  <span className="inline-flex items-center gap-1 text-orange-300">
                    <FaBus />
                    Otobüslü
                  </span>
                ) : (
                  <span>
                    Ulaşım belirlenmedi
                  </span>
                )}

              </div>

            </div>


            <div className="flex flex-wrap gap-2">

              <select
                value={
                  selectedDepartureId
                }
                onChange={event =>
                  void changeDeparture(
                    event.target.value
                  )
                }
                className="min-h-11 rounded-xl border border-white/[.08] bg-[#03080e] px-4 text-[8px] font-black"
              >
                {departures.length ===
                0 ? (
                  <option value="">
                    Çıkış yok
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


              <button
                type="button"
                disabled={
                  busy ||
                  !selectedDepartureId
                }
                onClick={() =>
                  void syncPassengers()
                }
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-orange-500 px-5 text-[8px] font-black disabled:opacity-40"
              >
                <FaSyncAlt />
                Rezervasyonları Senkronla
              </button>

            </div>

          </div>

        </section>


        {error && (
          <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/[.06] px-4 py-3 text-[8px] font-black text-red-300">
            {error}
          </div>
        )}


        {notice && (
          <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/[.06] px-4 py-3 text-[8px] font-black text-emerald-300">
            {notice}
          </div>
        )}


        {missingPassengerCount >
          0 && (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/[.06] px-4 py-3 text-[8px] font-black text-amber-300">

            <FaExclamationTriangle />

            {missingPassengerCount}
            {" "}
            yolcunun gerçek adı/bilgisi henüz sisteme girilmemiş.
            Sistem eksik yolcuları otomatik uydurmaz.

          </div>
        )}


        <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">

          {[
            [
              "Rezervasyon",
              reservations.length,
            ],
            [
              "Beklenen Yolcu",
              totalExpected,
            ],
            [
              "Tanımlı Yolcu",
              passengers.length,
            ],
            [
              "Eksik Yolcu",
              missingPassengerCount,
            ],
            [
              "Belge Hazır",
              documentReadyCount,
            ],
            [
              "Rooming Atandı",
              roomedCount,
            ],
          ].map(
            ([label, value]) => (
              <article
                key={
                  String(label)
                }
                className="rounded-[22px] border border-white/[.08] bg-[linear-gradient(145deg,#081520,#050c13)] shadow-[0_14px_40px_rgba(0,0,0,.12)] p-5"
              >
                <div className="text-[7px] font-black uppercase tracking-[.1em] text-slate-600">
                  {label}
                </div>

                <div className="mt-3 text-3xl font-black">
                  {value}
                </div>
              </article>
            )
          )}

        </section>


        <section className="mt-5 rounded-[26px] border border-white/[.08] bg-[linear-gradient(145deg,#081520,#050c13)] shadow-[0_14px_40px_rgba(0,0,0,.12)] p-5">

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">

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
                placeholder="Yolcu, rezervasyon, telefon, TC/pasaport, oda ara..."
                className="h-11 w-full rounded-xl border border-white/[.08] bg-[#03080e] pl-9 pr-3 text-[8px]"
              />

            </div>


            <div className="flex flex-wrap gap-2">

              {[
                [
                  "all",
                  "Tümü",
                ],
                [
                  "missing",
                  "Belgesi Eksik",
                ],
                [
                  "rooming",
                  "Rooming",
                ],
                [
                  "ready",
                  "Hazır",
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
                    className={`rounded-xl border px-4 py-2.5 text-[7px] font-black ${
                      filter ===
                      item[0]
                        ? "border-orange-500/30 bg-orange-500/[.08] text-orange-300"
                        : "border-white/10 bg-white/[.02] text-slate-500"
                    }`}
                  >
                    {item[1]}
                  </button>
                )
              )}

            </div>

          </div>

        </section>


        <section className="mt-5 grid gap-5 2xl:grid-cols-[1fr_430px]">

          <div className="overflow-hidden rounded-[26px] border border-white/[.08] bg-[linear-gradient(145deg,#081520,#050c13)] shadow-[0_14px_40px_rgba(0,0,0,.12)]">

            <div className="border-b border-white/[.06] p-5">

              <div className="text-[9px] font-black">
                Yolcu Listesi
              </div>

              <div className="mt-1 text-[7px] text-slate-600">
                Gerçek yolcu, kimlik, oda ve operasyon bilgileri
              </div>

            </div>


            <div className="overflow-auto">

              <table className="min-w-[1500px] w-full">

                <thead className="bg-[#081522]">

                  <tr className="text-left text-[7px] font-black uppercase tracking-[.08em] text-slate-600">

                    <th className="px-4 py-4">
                      Rezervasyon
                    </th>

                    <th className="px-4 py-4">
                      Yolcu
                    </th>

                    <th className="px-4 py-4">
                      İletişim
                    </th>

                    <th className="px-4 py-4">
                      Doğum
                    </th>

                    <th className="px-4 py-4">
                      Kimlik
                    </th>

                    <th className="px-4 py-4">
                      Rooming
                    </th>

                    <th className="px-4 py-4">
                      Otobüs
                    </th>

                    <th className="px-4 py-4">
                      Manifest
                    </th>

                    <th className="px-4 py-4">
                      Hazırlık
                    </th>

                    <th className="px-4 py-4 text-right">
                      İşlem
                    </th>

                  </tr>

                </thead>


                <tbody>

                  {visiblePassengers.length ===
                  0 ? (
                    <tr>

                      <td
                        colSpan={10}
                        className="px-5 py-14 text-center"
                      >
                        <FaUsers className="mx-auto text-3xl text-slate-800" />

                        <div className="mt-4 text-[10px] font-black">
                          Yolcu kaydı yok
                        </div>

                        <div className="mt-2 text-[8px] text-slate-600">
                          Rezervasyonları senkronlayın.
                        </div>
                      </td>

                    </tr>
                  ) : (
                    visiblePassengers.map(
                      passenger => {

                        const reservation =
                          reservations.find(
                            item =>
                              item.id ===
                              passenger.reservation_id
                          );

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

                        const manifestRow =
                          reservation
                            ? manifest.find(
                                item =>
                                  item.reservation_id ===
                                  reservation.id
                              )
                            : null;

                        const ready =
                          documentReady(
                            passenger
                          );

                        return (
                          <tr
                            key={
                              passenger.id
                            }
                            className="border-t border-white/[.045] hover:bg-white/[.02]"
                          >

                            <td className="px-4 py-4">

                              <div className="font-mono text-[8px] font-black text-orange-300">
                                {reservation?.reservation_code ||
                                  "—"}
                              </div>

                              <div className="mt-1 text-[7px] text-slate-600">
                                Yolcu{" "}
                                {passenger.passenger_no}
                              </div>

                            </td>


                            <td className="px-4 py-4">

                              <div className="text-[9px] font-black">
                                {passenger.full_name}
                              </div>

                              <div className="mt-1 text-[7px] text-slate-600">
                                {passenger.is_primary
                                  ? "Ana yolcu"
                                  : "Ek yolcu"}
                              </div>

                            </td>


                            <td className="px-4 py-4">

                              <div className="text-[8px]">
                                {passenger.phone ||
                                  "—"}
                              </div>

                              <div className="mt-1 text-[7px] text-slate-600">
                                {passenger.email ||
                                  "—"}
                              </div>

                            </td>


                            <td className="px-4 py-4 text-[8px]">
                              {passenger.birth_date
                                ? formatDate(
                                    passenger.birth_date
                                  )
                                : "—"}
                            </td>


                            <td className="px-4 py-4">

                              <div className="flex items-center gap-2">

                                <FaIdCard
                                  className={
                                    ready
                                      ? "text-emerald-300"
                                      : "text-amber-300"
                                  }
                                />

                                <div>

                                  <div className="text-[7px] font-black uppercase">
                                    {passenger.identity_type ||
                                      "Eksik"}
                                  </div>

                                  <div className="mt-1 max-w-[130px] truncate font-mono text-[7px] text-slate-600">
                                    {passenger.identity_number ||
                                      "Kimlik girilmedi"}
                                  </div>

                                </div>

                              </div>

                            </td>


                            <td className="px-4 py-4">

                              <div className="flex items-center gap-2 text-[8px]">

                                <FaBed className="text-violet-300" />

                                {passenger.room_no ||
                                  passenger.room_group ||
                                  "—"}

                              </div>

                              {passenger.hotel_name && (
                                <div className="mt-1 text-[7px] text-slate-600">
                                  {passenger.hotel_name}
                                </div>
                              )}

                            </td>


                            <td className="px-4 py-4">

                              {seat ? (
                                <div className="text-[8px] font-black">
                                  Otobüs{" "}
                                  {bus?.bus_no ??
                                    "—"}
                                  {" · "}
                                  Koltuk{" "}
                                  {seat.seat_number}
                                </div>
                              ) : (
                                <span className="text-[7px] text-slate-600">
                                  Atanmadı
                                </span>
                              )}

                            </td>


                            <td className="px-4 py-4">

                              <div className="text-[8px] font-black">
                                {manifestRow?.manifest_status ||
                                  "—"}
                              </div>

                              {manifestRow?.pickup_point && (
                                <div className="mt-1 text-[7px] text-slate-600">
                                  {manifestRow.pickup_point}
                                </div>
                              )}

                            </td>


                            <td className="px-4 py-4">

                              <span
                                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[7px] font-black ${
                                  ready
                                    ? "border-emerald-500/20 bg-emerald-500/[.07] text-emerald-300"
                                    : "border-amber-500/20 bg-amber-500/[.07] text-amber-300"
                                }`}
                              >

                                {ready
                                  ? <FaCheckCircle />
                                  : <FaExclamationTriangle />}

                                {ready
                                  ? "Belge Hazır"
                                  : "Eksik Bilgi"}

                              </span>

                            </td>


                            <td className="px-4 py-4 text-right">

                              <button
                                type="button"
                                onClick={() =>
                                  editPassenger(
                                    passenger
                                  )
                                }
                                className="rounded-lg border border-white/10 px-3 py-2 text-[7px] font-black hover:border-orange-500/30 hover:text-orange-300"
                              >
                                Düzenle
                              </button>

                            </td>

                          </tr>
                        );
                      }
                    )
                  )}

                </tbody>

              </table>

            </div>

          </div>


          <aside className="space-y-5">

            <section className="rounded-[26px] border border-white/[.08] bg-[linear-gradient(145deg,#081520,#050c13)] shadow-[0_14px_40px_rgba(0,0,0,.12)] p-5">

              <div className="flex items-center justify-between">

                <div>

                  <div className="text-[9px] font-black">
                    {editingId
                      ? "Yolcu Düzenle"
                      : "Gerçek Yolcu Ekle"}
                  </div>

                  <div className="mt-1 text-[7px] text-slate-600">
                    Eksik misafir bilgilerini burada tamamla
                  </div>

                </div>

                {editingId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId("");
                      setForm(
                        EMPTY_FORM
                      );
                    }}
                    className="text-[7px] font-black text-slate-500"
                  >
                    Yeni
                  </button>
                )}

              </div>


              <div className="mt-5 grid gap-3">

                <select
                  value={
                    form.reservationId
                  }
                  onChange={event => {
                    const reservationId =
                      event.target.value;

                    const linked =
                      passengers.filter(
                        item =>
                          item.reservation_id ===
                          reservationId
                      );

                    setForm(
                      current => ({
                        ...current,
                        reservationId,
                        passengerNo:
                          String(
                            linked.length +
                            1
                          ),
                      })
                    );
                  }}
                  className="h-11 rounded-xl border border-white/[.08] bg-[#03080e] px-3 text-[8px]"
                >
                  <option value="">
                    Rezervasyon seç
                  </option>

                  {reservations.map(
                    reservation => (
                      <option
                        key={
                          reservation.id
                        }
                        value={
                          reservation.id
                        }
                      >
                        {reservation.reservation_code ||
                          reservation.id.slice(
                            0,
                            8
                          )}
                        {" · "}
                        {reservation.full_name}
                        {" · "}
                        {reservation.guests}
                        {" kişi"}
                      </option>
                    )
                  )}
                </select>


                <div className="grid grid-cols-[90px_1fr] gap-3">

                  <input
                    type="number"
                    min={1}
                    value={
                      form.passengerNo
                    }
                    onChange={event =>
                      setForm(
                        current => ({
                          ...current,
                          passengerNo:
                            event.target.value,
                        })
                      )
                    }
                    placeholder="No"
                    className="h-10 rounded-xl border border-white/[.08] bg-[#03080e] px-3 text-[8px]"
                  />

                  <input
                    value={
                      form.fullName
                    }
                    onChange={event =>
                      setForm(
                        current => ({
                          ...current,
                          fullName:
                            event.target.value,
                        })
                      )
                    }
                    placeholder="Ad Soyad"
                    className="h-10 rounded-xl border border-white/[.08] bg-[#03080e] px-3 text-[8px]"
                  />

                </div>


                <input
                  value={
                    form.phone
                  }
                  onChange={event =>
                    setForm(
                      current => ({
                        ...current,
                        phone:
                          event.target.value,
                      })
                    )
                  }
                  placeholder="Telefon"
                  className="h-10 rounded-xl border border-white/[.08] bg-[#03080e] px-3 text-[8px]"
                />


                <input
                  value={
                    form.email
                  }
                  onChange={event =>
                    setForm(
                      current => ({
                        ...current,
                        email:
                          event.target.value,
                      })
                    )
                  }
                  placeholder="E-posta"
                  className="h-10 rounded-xl border border-white/[.08] bg-[#03080e] px-3 text-[8px]"
                />


                <div className="grid grid-cols-2 gap-3">

                  <input
                    type="date"
                    value={
                      form.birthDate
                    }
                    onChange={event =>
                      setForm(
                        current => ({
                          ...current,
                          birthDate:
                            event.target.value,
                        })
                      )
                    }
                    className="h-10 rounded-xl border border-white/[.08] bg-[#03080e] px-3 text-[8px]"
                  />

                  <input
                    value={
                      form.nationality
                    }
                    onChange={event =>
                      setForm(
                        current => ({
                          ...current,
                          nationality:
                            event.target.value,
                        })
                      )
                    }
                    placeholder="Uyruk"
                    className="h-10 rounded-xl border border-white/[.08] bg-[#03080e] px-3 text-[8px]"
                  />

                </div>


                <div className="grid grid-cols-[130px_1fr] gap-3">

                  <select
                    value={
                      form.identityType
                    }
                    onChange={event =>
                      setForm(
                        current => ({
                          ...current,
                          identityType:
                            event.target.value as
                              PassengerForm["identityType"],
                        })
                      )
                    }
                    className="h-10 rounded-xl border border-white/[.08] bg-[#03080e] px-3 text-[8px]"
                  >
                    <option value="">
                      Kimlik Türü
                    </option>

                    <option value="tc">
                      T.C.
                    </option>

                    <option value="passport">
                      Pasaport
                    </option>

                    <option value="other">
                      Diğer
                    </option>
                  </select>


                  <input
                    value={
                      form.identityNumber
                    }
                    onChange={event =>
                      setForm(
                        current => ({
                          ...current,
                          identityNumber:
                            event.target.value,
                        })
                      )
                    }
                    placeholder="Kimlik / Pasaport No"
                    className="h-10 rounded-xl border border-white/[.08] bg-[#03080e] px-3 text-[8px]"
                  />

                </div>


                <div className="border-t border-white/[.06] pt-3 text-[7px] font-black uppercase tracking-[.12em] text-violet-300">
                  Rooming
                </div>


                <input
                  value={
                    form.hotelName
                  }
                  onChange={event =>
                    setForm(
                      current => ({
                        ...current,
                        hotelName:
                          event.target.value,
                      })
                    )
                  }
                  placeholder="Otel"
                  className="h-10 rounded-xl border border-white/[.08] bg-[#03080e] px-3 text-[8px]"
                />


                <div className="grid grid-cols-3 gap-3">

                  <input
                    value={
                      form.roomGroup
                    }
                    onChange={event =>
                      setForm(
                        current => ({
                          ...current,
                          roomGroup:
                            event.target.value,
                        })
                      )
                    }
                    placeholder="Oda Grup"
                    className="h-10 rounded-xl border border-white/[.08] bg-[#03080e] px-2 text-[7px]"
                  />

                  <input
                    value={
                      form.roomNo
                    }
                    onChange={event =>
                      setForm(
                        current => ({
                          ...current,
                          roomNo:
                            event.target.value,
                        })
                      )
                    }
                    placeholder="Oda No"
                    className="h-10 rounded-xl border border-white/[.08] bg-[#03080e] px-2 text-[7px]"
                  />

                  <input
                    value={
                      form.roomType
                    }
                    onChange={event =>
                      setForm(
                        current => ({
                          ...current,
                          roomType:
                            event.target.value,
                        })
                      )
                    }
                    placeholder="Tip"
                    className="h-10 rounded-xl border border-white/[.08] bg-[#03080e] px-2 text-[7px]"
                  />

                </div>


                <textarea
                  rows={2}
                  value={
                    form.specialRequest
                  }
                  onChange={event =>
                    setForm(
                      current => ({
                        ...current,
                        specialRequest:
                          event.target.value,
                      })
                    )
                  }
                  placeholder="Özel talep / alerji / operasyon notu"
                  className="rounded-xl border border-white/[.08] bg-[#03080e] p-3 text-[8px]"
                />


                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void savePassenger()
                  }
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-orange-500 text-[8px] font-black disabled:opacity-40"
                >
                  <FaSave />

                  {editingId
                    ? "Yolcuyu Güncelle"
                    : "Yolcuyu Kaydet"}
                </button>

              </div>

            </section>


            <section className="rounded-[26px] border border-white/[.08] bg-[linear-gradient(145deg,#081520,#050c13)] shadow-[0_14px_40px_rgba(0,0,0,.12)] p-5">

              <div className="text-[9px] font-black">
                Rezervasyon Eksik Kontrolü
              </div>


              <div className="mt-4 max-h-[360px] space-y-2 overflow-auto">

                {reservationStats.map(
                  item => (
                    <div
                      key={
                        item.reservation.id
                      }
                      className="rounded-xl border border-white/[.07] bg-[#030a11] p-3"
                    >

                      <div className="flex items-center justify-between gap-3">

                        <div>

                          <div className="text-[8px] font-black">
                            {item.reservation.reservation_code ||
                              "Rezervasyon"}
                          </div>

                          <div className="mt-1 text-[7px] text-slate-600">
                            {item.passengerCount}
                            {" / "}
                            {item.reservation.guests}
                            {" yolcu tanımlı"}
                          </div>

                        </div>


                        {item.missingCount >
                        0 ? (
                          <button
                            type="button"
                            onClick={() =>
                              newPassenger(
                                item.reservation
                              )
                            }
                            className="inline-flex items-center gap-1 rounded-lg border border-amber-500/20 bg-amber-500/[.06] px-2.5 py-1.5 text-[7px] font-black text-amber-300"
                          >
                            <FaPlus />
                            {item.missingCount}
                            {" eksik"}
                          </button>
                        ) : (
                          <span className="text-[7px] font-black text-emerald-300">
                            Tam
                          </span>
                        )}

                      </div>

                    </div>
                  )
                )}

              </div>

            </section>

          </aside>

        </section>


        <section className="mt-5 grid gap-5 lg:grid-cols-3">

          <article className="rounded-[22px] border border-white/[.08] bg-[linear-gradient(145deg,#081520,#050c13)] shadow-[0_14px_40px_rgba(0,0,0,.12)] p-5">

            <div className="flex items-center gap-2 text-[9px] font-black">
              <FaUsers className="text-orange-300" />
              Manifest
            </div>

            <div className="mt-4 text-3xl font-black">
              {manifest.length}
            </div>

            <div className="mt-1 text-[7px] text-slate-600">
              Mevcut tour_departure_manifest_view ile bağlı
            </div>

          </article>


          <article className="rounded-[22px] border border-white/[.08] bg-[linear-gradient(145deg,#081520,#050c13)] shadow-[0_14px_40px_rgba(0,0,0,.12)] p-5">

            <div className="flex items-center gap-2 text-[9px] font-black">
              <FaBed className="text-violet-300" />
              Rooming
            </div>

            <div className="mt-4 text-3xl font-black">
              {roomedCount}
            </div>

            <div className="mt-1 text-[7px] text-slate-600">
              Oda/grup ataması bulunan gerçek yolcular
            </div>

          </article>


          <article className="rounded-[22px] border border-white/[.08] bg-[linear-gradient(145deg,#081520,#050c13)] shadow-[0_14px_40px_rgba(0,0,0,.12)] p-5">

            <div className="flex items-center gap-2 text-[9px] font-black">
              <FaIdCard className="text-emerald-300" />
              Belge Hazırlığı
            </div>

            <div className="mt-4 text-3xl font-black">
              {passengers.length
                ? Math.round(
                    (
                      documentReadyCount /
                      passengers.length
                    ) *
                      100
                  )
                : 0}
              %
            </div>

            <div className="mt-1 text-[7px] text-slate-600">
              Ad + doğum tarihi + kimlik türü + kimlik numarası
            </div>

          </article>

        </section>

      </div>

    </main>
  );
}

// TOUR_OS_15_1C_ACTIVE_PASSENGERS


<style jsx global>{`
  [data-tour-module-screen] {
    min-height: 100vh;
  }

  [data-tour-module-screen] table {
    border-collapse: separate;
    border-spacing: 0;
  }

  [data-tour-module-screen] thead {
    position: sticky;
    top: 0;
    z-index: 10;
  }

  [data-tour-module-screen] tbody tr {
    transition:
      background-color .16s ease,
      border-color .16s ease;
  }

  [data-tour-module-screen] tbody tr:hover {
    background: rgba(255,255,255,.024);
  }

  [data-tour-module-screen] input,
  [data-tour-module-screen] select,
  [data-tour-module-screen] textarea {
    outline: none;
  }

  [data-tour-module-screen] input:focus,
  [data-tour-module-screen] select:focus,
  [data-tour-module-screen] textarea:focus {
    border-color: rgba(249,115,22,.42);
    box-shadow:
      0 0 0 3px rgba(249,115,22,.06);
  }

  [data-tour-module-screen] button,
  [data-tour-module-screen] a {
    -webkit-tap-highlight-color: transparent;
  }

  @media (max-width: 768px) {
    [data-tour-module-screen] {
      padding-bottom: 84px;
    }

    [data-tour-module-chrome] {
      border-radius: 22px;
    }
  }
`}</style>

// TOUR_MODULE_PRO_V3_PASSENGERS
