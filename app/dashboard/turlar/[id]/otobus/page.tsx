"use client";

import Link from "next/link";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  FaArrowLeft,
  FaBus,
  FaCheck,
  FaClock,
  FaMapMarkerAlt,
  FaPhone,
  FaPlus,
  FaSave,
  FaTrash,
  FaUserCheck,
  FaUsers,
} from "react-icons/fa";

import { useParams } from "next/navigation";

import { supabase } from "@/lib/supabase";

import { getCurrentMembership } from "@/lib/current-user";

import TourModuleChrome from "../../../components/TourModuleChrome";

type BusStatus =
  | "planning"
  | "assigned"
  | "boarding"
  | "departed"
  | "on_route"
  | "returning"
  | "completed"
  | "cancelled";

type SeatStatus = "empty" | "reserved" | "confirmed" | "blocked";

type CheckinStatus = "waiting" | "boarded" | "no_show";

type Tour = {
  id: string;
  title: string;
  transport_mode: "air" | "bus" | "other";
  departure_city: string | null;
  arrival_city: string | null;
  capacity: number | null;
};

type Departure = {
  id: string;
  departure_date: string;
  return_date: string | null;
  capacity: number;
  reserved_count: number;
  status: string;
};

type Vehicle = {
  id: string;
  plate_number: string;
  display_name: string | null;
  brand: string | null;
  model: string | null;
  capacity: number;
  vehicle_type: string;
  status: string;
};

type BusOperation = {
  id: string;
  company_id: string;
  tour_id: string;
  departure_id: string | null;
  vehicle_id: string | null;
  bus_no: number;
  driver_1_name: string | null;
  driver_1_phone: string | null;
  driver_2_name: string | null;
  driver_2_phone: string | null;
  guide_name: string | null;
  guide_phone: string | null;
  operations_phone: string | null;
  seat_capacity: number | null;
  departure_at: string | null;
  return_at: string | null;
  status: BusStatus;
  notes: string | null;
};

type BoardingStop = {
  id: string;
  company_id: string;
  tour_id: string;
  bus_operation_id: string;
  sequence_no: number;
  stop_name: string;
  address: string | null;
  planned_at: string | null;
  notes: string | null;
};

type Seat = {
  id: string;
  company_id: string;
  tour_id: string;
  bus_operation_id: string;
  seat_number: number;
  seat_type: "passenger" | "guide" | "staff" | "blocked";
  seat_status: SeatStatus;
  passenger_name: string | null;
  passenger_phone: string | null;
  boarding_stop_id: string | null;
  checkin_status: CheckinStatus;
  boarded_at: string | null;
  notes: string | null;
};

function nullText(value: string) {
  const result = value.trim();

  return result ? result : null;
}

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function localDateTime(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);

  return local.toISOString().slice(0, 16);
}

function displayDateTime(value: string | null) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function busStatusLabel(status: BusStatus) {
  const labels: Record<BusStatus, string> = {
    planning: "Planlama",
    assigned: "Araç Atandı",
    boarding: "Biniş",
    departed: "Çıkış Yaptı",
    on_route: "Yolda",
    returning: "Dönüş",
    completed: "Tamamlandı",
    cancelled: "İptal",
  };

  return labels[status];
}

function checkinLabel(status: CheckinStatus) {
  if (status === "boarded") {
    return "Bindi";
  }

  if (status === "no_show") {
    return "Gelmedi";
  }

  return "Bekleniyor";
}

export default function TourBusOperationsPage() {
  const params = useParams<{
    id: string;
  }>();

  const tourId = String(params.id);

  const [companyId, setCompanyId] = useState("");

  const [tour, setTour] = useState<Tour | null>(null);

  const [departures, setDepartures] = useState<Departure[]>([]);

  const [selectedDepartureId, setSelectedDepartureId] = useState("");

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  const [operations, setOperations] = useState<BusOperation[]>([]);

  const [stops, setStops] = useState<BoardingStop[]>([]);

  const [seats, setSeats] = useState<Seat[]>([]);

  const [selectedOperationId, setSelectedOperationId] = useState("");

  const [loading, setLoading] = useState(true);

  const [busy, setBusy] = useState(false);

  const [error, setError] = useState("");

  const [notice, setNotice] = useState("");

  const [busForm, setBusForm] = useState({
    vehicleId: "",
    busNo: "1",
    driver1Name: "",
    driver1Phone: "",
    driver2Name: "",
    driver2Phone: "",
    guideName: "",
    guidePhone: "",
    operationsPhone: "",
    seatCapacity: "",
    departureAt: "",
    returnAt: "",
    status: "planning" as BusStatus,
    notes: "",
  });

  const [stopForm, setStopForm] = useState({
    sequenceNo: "1",
    stopName: "",
    address: "",
    plannedAt: "",
    notes: "",
  });

  const [seatForm, setSeatForm] = useState({
    passengerName: "",
    passengerPhone: "",
    boardingStopId: "",
    notes: "",
  });

  const [selectedSeatNumber, setSelectedSeatNumber] = useState<number | null>(
    null,
  );

  const selectedOperation = useMemo(
    () => operations.find((item) => item.id === selectedOperationId) ?? null,
    [operations, selectedOperationId],
  );

  const selectedDeparture = useMemo(
    () =>
      selectedDepartureId === "__legacy__"
        ? null
        : departures.find((item) => item.id === selectedDepartureId) ?? null,
    [departures, selectedDepartureId],
  );

  const currentDepartureDate = localDateKey();

  const operationalDepartures = useMemo(
    () =>
      departures.filter(
        (item) =>
          item.departure_date >= currentDepartureDate &&
          item.status !== "cancelled",
      ),
    [currentDepartureDate, departures],
  );

  const historicalDepartures = useMemo(
    () =>
      departures.filter(
        (item) =>
          item.departure_date < currentDepartureDate ||
          item.status === "cancelled",
      ),
    [currentDepartureDate, departures],
  );

  const selectedDepartureIsReadOnly =
    selectedDeparture !== null &&
    (selectedDeparture.departure_date < currentDepartureDate ||
      selectedDeparture.status === "cancelled");

  const operationStops = useMemo(
    () =>
      stops
        .filter((item) => item.bus_operation_id === selectedOperationId)
        .sort((a, b) => a.sequence_no - b.sequence_no),
    [stops, selectedOperationId],
  );

  const operationSeats = useMemo(
    () =>
      seats
        .filter((item) => item.bus_operation_id === selectedOperationId)
        .sort((a, b) => a.seat_number - b.seat_number),
    [seats, selectedOperationId],
  );

  const loadAll = useCallback(
    async (currentCompanyId: string, requestedDepartureId?: string) => {
      const [tourResult, vehicleResult, departureResult] = await Promise.all([
        supabase
          .from("tours")
          .select(
            [
              "id",
              "title",
              "transport_mode",
              "departure_city",
              "arrival_city",
              "capacity",
            ].join(","),
          )
          .eq("id", tourId)
          .eq("company_id", currentCompanyId)
          .maybeSingle(),

        supabase
          .from("vehicles")
          .select(
            [
              "id",
              "plate_number",
              "display_name",
              "brand",
              "model",
              "capacity",
              "vehicle_type",
              "status",
            ].join(","),
          )
          .eq("company_id", currentCompanyId)
          .eq("is_active", true)
          .in("vehicle_type", ["bus", "minibus", "van"])
          .order("plate_number", {
            ascending: true,
          }),

        supabase
          .from("tour_departures")
          .select(
            [
              "id",
              "departure_date, return_date",
              "capacity",
              "reserved_count",
              "status",
            ].join(","),
          )
          .eq("company_id", currentCompanyId)
          .eq("tour_id", tourId)
          .order("departure_date", {
            ascending: true,
          }),
      ]);

      if (tourResult.error) {
        throw tourResult.error;
      }

      if (!tourResult.data) {
        throw new Error("Tur bulunamadı.");
      }

      if (vehicleResult.error) {
        throw vehicleResult.error;
      }

      if (departureResult.error) {
        throw departureResult.error;
      }

      const loadedDepartures = (departureResult.data ??
        []) as unknown as Departure[];

      const availableIds = new Set(loadedDepartures.map((item) => item.id));
      const today = localDateKey();

      const defaultOperationalDeparture =
        loadedDepartures.find(
          (item) =>
            item.departure_date >= today &&
            item.status !== "cancelled",
        ) ?? null;

      let scope = requestedDepartureId ?? "";

      if (!scope || (scope !== "__legacy__" && !availableIds.has(scope))) {
        scope = defaultOperationalDeparture?.id ?? "__legacy__";
      }

      let operationQuery = supabase
        .from("tour_bus_operations")
        .select("*")
        .eq("company_id", currentCompanyId)
        .eq("tour_id", tourId);

      if (scope === "__legacy__") {
        operationQuery = operationQuery.is("departure_id", null);
      } else {
        operationQuery = operationQuery.eq("departure_id", scope);
      }

      const { data: operationData, error: operationError } =
        await operationQuery.order("bus_no", {
          ascending: true,
        });

      if (operationError) {
        throw operationError;
      }

      const loadedOperations = (operationData ??
        []) as unknown as BusOperation[];

      const operationIds = loadedOperations.map((item) => item.id);

      let loadedStops: BoardingStop[] = [];

      let loadedSeats: Seat[] = [];

      if (operationIds.length > 0) {
        const [stopResult, seatResult] = await Promise.all([
          supabase
            .from("tour_bus_boarding_stops")
            .select("*")
            .eq("company_id", currentCompanyId)
            .eq("tour_id", tourId)
            .in("bus_operation_id", operationIds),

          supabase
            .from("tour_bus_seats")
            .select("*")
            .eq("company_id", currentCompanyId)
            .eq("tour_id", tourId)
            .in("bus_operation_id", operationIds),
        ]);

        if (stopResult.error) {
          throw stopResult.error;
        }

        if (seatResult.error) {
          throw seatResult.error;
        }

        loadedStops = (stopResult.data ?? []) as unknown as BoardingStop[];

        loadedSeats = (seatResult.data ?? []) as unknown as Seat[];
      }

      setTour(tourResult.data as unknown as Tour);

      setVehicles((vehicleResult.data ?? []) as unknown as Vehicle[]);

      setDepartures(loadedDepartures);

      setSelectedDepartureId(scope);

      setOperations(loadedOperations);

      setStops(loadedStops);

      setSeats(loadedSeats);

      setSelectedOperationId((current) => {
        if (current && loadedOperations.some((item) => item.id === current)) {
          return current;
        }

        return loadedOperations[0]?.id ?? "";
      });
    },
    [tourId],
  );

  // TOUR_OS_15_0B_BUS_DEPARTURE_SCOPE

  useEffect(() => {
    void (async () => {
      setLoading(true);

      try {
        const { data: authData, error: authError } =
          await supabase.auth.getUser();

        if (authError || !authData.user) {
          throw new Error("Oturum bulunamadı.");
        }

        const membership = await getCurrentMembership(authData.user.id);

        if (!membership) {
          throw new Error("Firma üyeliği bulunamadı.");
        }

        setCompanyId(membership.company_id);

        await loadAll(membership.company_id);
      } catch (currentError) {
        setError(
          currentError instanceof Error
            ? currentError.message
            : String(currentError),
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [loadAll]);

  useEffect(() => {
    if (!selectedOperation) {
      return;
    }

    const storedDepartureAt = localDateTime(selectedOperation.departure_at);
    const storedReturnAt = localDateTime(selectedOperation.return_at);

    const canonicalReturnAt =
      selectedDeparture?.return_date && storedReturnAt
        ? `${selectedDeparture.return_date}T${storedReturnAt.split("T")[1]}`
        : storedReturnAt;

    // CANONICAL_RETURN_OPERATION_LOAD

    const departureAt =
      selectedDeparture?.departure_date && storedDepartureAt.includes("T")
        ? `${selectedDeparture.departure_date}T${storedDepartureAt.split("T")[1]}`
        : selectedDeparture?.departure_date
          ? ""
          : storedDepartureAt;

    setBusForm({
      vehicleId: selectedOperation.vehicle_id ?? "",
      busNo: String(selectedOperation.bus_no),
      driver1Name: selectedOperation.driver_1_name ?? "",
      driver1Phone: selectedOperation.driver_1_phone ?? "",
      driver2Name: selectedOperation.driver_2_name ?? "",
      driver2Phone: selectedOperation.driver_2_phone ?? "",
      guideName: selectedOperation.guide_name ?? "",
      guidePhone: selectedOperation.guide_phone ?? "",
      operationsPhone: selectedOperation.operations_phone ?? "",
      seatCapacity:
        selectedOperation.seat_capacity === null
          ? ""
          : String(selectedOperation.seat_capacity),
      departureAt,
      returnAt: canonicalReturnAt,
      status: selectedOperation.status,
      notes: selectedOperation.notes ?? "",
    });
  }, [selectedDeparture, selectedOperation]);

  const reservedCount = operationSeats.filter(
    (seat) =>
      seat.seat_status === "reserved" || seat.seat_status === "confirmed",
  ).length;

  const boardedCount = operationSeats.filter(
    (seat) => seat.checkin_status === "boarded",
  ).length;

  const waitingCount = operationSeats.filter(
    (seat) => seat.passenger_name && seat.checkin_status === "waiting",
  ).length;

  async function createBus() {
    if (!companyId || !selectedDepartureId) {
      return;
    }

    if (selectedDepartureId === "__legacy__") {
      setError(
        "Yeni otobüs operasyonu oluşturmak için gerçek bir tur çıkışı seçin.",
      );

      return;
    }

    if (selectedDepartureIsReadOnly) {
      setError(
        "Geçmiş veya iptal edilmiş tur çıkışına yeni otobüs operasyonu oluşturulamaz.",
      );
      return;
    }

    const nextBusNo =
      operations.reduce((max, item) => Math.max(max, item.bus_no), 0) + 1;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const { data, error: insertError } = await supabase
        .from("tour_bus_operations")
        .insert({
          company_id: companyId,
          tour_id: tourId,
          departure_id: selectedDepartureId,
          bus_no: nextBusNo,
          seat_capacity: tour?.capacity ?? null,
        })
        .select("id")
        .single();

      if (insertError) {
        throw insertError;
      }

      await loadAll(companyId);

      setSelectedOperationId(String(data.id));

      setNotice(`Otobüs ${nextBusNo} operasyonu oluşturuldu.`);
    } catch (currentError) {
      setError(
        currentError instanceof Error
          ? currentError.message
          : String(currentError),
      );
    } finally {
      setBusy(false);
    }
  }

  async function saveBus() {
    if (!companyId || !selectedOperation) {
      return;
    }

    const capacity = busForm.seatCapacity
      ? Math.max(1, Number(busForm.seatCapacity) || 1)
      : null;

    if (selectedDepartureIsReadOnly) {
      setError(
        "Geçmiş veya iptal edilmiş tur çıkışı salt görüntüleme modundadır.",
      );
      return;
    }

    if (selectedDeparture && busForm.departureAt) {
      const operationDate = busForm.departureAt.split("T")[0];

      if (operationDate !== selectedDeparture.departure_date) {
        setError(
          `Otobüs çıkış günü tur çıkışıyla aynı olmalı: ${selectedDeparture.departure_date}`,
        );
        return;
      }
    }


    // BUS_CANONICAL_RETURN_SAVE_GUARD
    if (
      selectedDeparture?.return_date &&
      busForm.returnAt
    ) {
      const returnDay = busForm.returnAt.split("T")[0];

      if (returnDay !== selectedDeparture.return_date) {
        setError(
          `Dönüş günü Tur Takvimi ile aynı olmalı: ${selectedDeparture.return_date}`,
        );
        return;
      }
    }

    if (
      busForm.departureAt &&
      busForm.returnAt &&
      new Date(busForm.returnAt).getTime() <=
        new Date(busForm.departureAt).getTime()
    ) {
      setError("Dönüş zamanı çıkış zamanından sonra olmalı.");
      return;
    }

setBusy(true);
    setError("");
    setNotice("");

    try {
      const { error: updateError } = await supabase
        .from("tour_bus_operations")
        .update({
          departure_id:
            selectedDepartureId === "__legacy__" ? null : selectedDepartureId,
          vehicle_id: busForm.vehicleId || null,
          bus_no: Math.max(1, Number(busForm.busNo) || 1),
          driver_1_name: nullText(busForm.driver1Name),
          driver_1_phone: nullText(busForm.driver1Phone),
          driver_2_name: nullText(busForm.driver2Name),
          driver_2_phone: nullText(busForm.driver2Phone),
          guide_name: nullText(busForm.guideName),
          guide_phone: nullText(busForm.guidePhone),
          operations_phone: nullText(busForm.operationsPhone),
          seat_capacity: capacity,
          departure_at: busForm.departureAt
            ? new Date(busForm.departureAt).toISOString()
            : null,
          return_at: busForm.returnAt
            ? new Date(busForm.returnAt).toISOString()
            : null,
          status: busForm.status,
          notes: nullText(busForm.notes),
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedOperation.id)
        .eq("company_id", companyId);

      if (updateError) {
        throw updateError;
      }

      await loadAll(companyId);

      setNotice("Otobüs operasyonu güncellendi.");
    } catch (currentError) {
      setError(
        currentError instanceof Error
          ? currentError.message
          : String(currentError),
      );
    } finally {
      setBusy(false);
    }
  }

  async function generateSeats() {
    if (!companyId || !selectedOperation) {
      return;
    }

    const capacity = Number(busForm.seatCapacity);

    if (!Number.isFinite(capacity) || capacity < 1 || capacity > 100) {
      setError("Koltuk kapasitesi 1 ile 100 arasında olmalı.");
      return;
    }

    const currentSeatNumbers = new Set(
      operationSeats.map((item) => item.seat_number),
    );

    const rows = Array.from(
      {
        length: capacity,
      },
      (_, index) => index + 1,
    )
      .filter((seatNumber) => !currentSeatNumbers.has(seatNumber))
      .map((seatNumber) => ({
        company_id: companyId,
        tour_id: tourId,
        bus_operation_id: selectedOperation.id,
        seat_number: seatNumber,
        seat_status: "empty",
        checkin_status: "waiting",
      }));

    if (rows.length === 0) {
      setNotice("Koltuk planı zaten oluşturulmuş.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      const { error: insertError } = await supabase
        .from("tour_bus_seats")
        .insert(rows);

      if (insertError) {
        throw insertError;
      }

      await loadAll(companyId);

      setNotice(`${rows.length} koltuk oluşturuldu.`);
    } catch (currentError) {
      setError(
        currentError instanceof Error
          ? currentError.message
          : String(currentError),
      );
    } finally {
      setBusy(false);
    }
  }

  async function addStop() {
    if (!companyId || !selectedOperation) {
      return;
    }

    if (!stopForm.stopName.trim()) {
      setError("Biniş noktası adı zorunlu.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      const { error: insertError } = await supabase
        .from("tour_bus_boarding_stops")
        .insert({
          company_id: companyId,
          tour_id: tourId,
          bus_operation_id: selectedOperation.id,
          sequence_no: Math.max(1, Number(stopForm.sequenceNo) || 1),
          stop_name: stopForm.stopName.trim(),
          address: nullText(stopForm.address),
          planned_at: stopForm.plannedAt
            ? new Date(stopForm.plannedAt).toISOString()
            : null,
          notes: nullText(stopForm.notes),
        });

      if (insertError) {
        throw insertError;
      }

      setStopForm({
        sequenceNo: String(operationStops.length + 2),
        stopName: "",
        address: "",
        plannedAt: "",
        notes: "",
      });

      await loadAll(companyId);

      setNotice("Biniş noktası eklendi.");
    } catch (currentError) {
      setError(
        currentError instanceof Error
          ? currentError.message
          : String(currentError),
      );
    } finally {
      setBusy(false);
    }
  }

  async function removeStop(stopId: string) {
    if (!companyId) {
      return;
    }

    if (!window.confirm("Bu biniş noktasını silmek istiyor musunuz?")) {
      return;
    }

    setBusy(true);

    try {
      const { error: deleteError } = await supabase
        .from("tour_bus_boarding_stops")
        .delete()
        .eq("id", stopId)
        .eq("company_id", companyId);

      if (deleteError) {
        throw deleteError;
      }

      await loadAll(companyId);

      setNotice("Biniş noktası silindi.");
    } catch (currentError) {
      setError(
        currentError instanceof Error
          ? currentError.message
          : String(currentError),
      );
    } finally {
      setBusy(false);
    }
  }

  function openSeat(seat: Seat) {
    setSelectedSeatNumber(seat.seat_number);

    setSeatForm({
      passengerName: seat.passenger_name ?? "",
      passengerPhone: seat.passenger_phone ?? "",
      boardingStopId: seat.boarding_stop_id ?? "",
      notes: seat.notes ?? "",
    });
  }

  async function saveSeatPassenger() {
    if (!companyId || !selectedOperation || selectedSeatNumber === null) {
      return;
    }

    const seat = operationSeats.find(
      (item) => item.seat_number === selectedSeatNumber,
    );

    if (!seat) {
      return;
    }

    const hasPassenger = Boolean(seatForm.passengerName.trim());

    setBusy(true);
    setError("");

    try {
      const { error: updateError } = await supabase
        .from("tour_bus_seats")
        .update({
          passenger_name: nullText(seatForm.passengerName),
          passenger_phone: nullText(seatForm.passengerPhone),
          boarding_stop_id: seatForm.boardingStopId || null,
          notes: nullText(seatForm.notes),
          seat_status: hasPassenger ? "confirmed" : "empty",
          checkin_status: hasPassenger ? seat.checkin_status : "waiting",
          boarded_at: hasPassenger ? seat.boarded_at : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", seat.id)
        .eq("company_id", companyId);

      if (updateError) {
        throw updateError;
      }

      await loadAll(companyId);

      setSelectedSeatNumber(null);

      setNotice(hasPassenger ? "Yolcu koltuğa atandı." : "Koltuk boşaltıldı.");
    } catch (currentError) {
      setError(
        currentError instanceof Error
          ? currentError.message
          : String(currentError),
      );
    } finally {
      setBusy(false);
    }
  }

  async function setCheckin(seat: Seat, status: CheckinStatus) {
    if (!companyId) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      const { error: updateError } = await supabase
        .from("tour_bus_seats")
        .update({
          checkin_status: status,
          boarded_at: status === "boarded" ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", seat.id)
        .eq("company_id", companyId);

      if (updateError) {
        throw updateError;
      }

      await loadAll(companyId);
    } catch (currentError) {
      setError(
        currentError instanceof Error
          ? currentError.message
          : String(currentError),
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <main
        data-tour-module-screen
        className="grid min-h-[70vh] place-items-center bg-[#030a11] text-white"
      >
        <TourModuleChrome tourId={tourId} moduleKey="bus" />
        Otobüs operasyon merkezi yükleniyor...
      </main>
    );
  }

  return (
    <main
      data-tour-os-screen="bus-operations"
      className="min-h-screen bg-[#030a11] text-white"
    >
      <div className="mx-auto max-w-[1700px] px-5 py-7 lg:px-8">
        <Link
          href="/dashboard/turlar"
          className="inline-flex items-center gap-2 text-[12px] font-black text-slate-500 hover:text-orange-300"
        >
          <FaArrowLeft />
          Tur Yönetimi
        </Link>

        <section className="mt-4 rounded-[26px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,.14),transparent_35%),linear-gradient(145deg,#07131f,#040b12)] p-6 lg:p-8">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/[.07] px-3 py-1.5 text-[8px] font-black uppercase tracking-[.15em] text-orange-300">
                <FaBus />
                OTOBÜSLÜ TUR OPERASYONU
              </div>

              <h1 className="mt-4 text-3xl font-black tracking-[-.04em] lg:text-4xl">
                {tour?.title || "Tur"}
              </h1>

              <div className="mt-3 flex flex-wrap gap-2 text-[8px] font-bold text-slate-500">
                <span>
                  {tour?.departure_city || "Kalkış belirtilmedi"}
                  {" → "}
                  {tour?.arrival_city || "Varış belirtilmedi"}
                </span>

                <span>•</span>

                <span>Tur kapasitesi: {tour?.capacity ?? "—"}</span>

                {tour?.transport_mode !== "bus" && (
                  <>
                    <span>•</span>
                    <span className="text-amber-300">
                      Bu tur henüz Otobüslü olarak sınıflandırılmamış.
                    </span>
                  </>
                )}
              </div>
            </div>

            <button
              type="button"
              disabled={busy}
              onClick={() => void createBus()}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 text-[8px] font-black disabled:opacity-40"
            >
              <FaPlus />
              Otobüs Ekle
            </button>
          </div>
        </section>

        <section className="mt-4 rounded-[22px] border border-orange-500/15 bg-orange-500/[.035] p-4 lg:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-[8px] font-black uppercase tracking-[.16em] text-orange-300">
                TUR ÇIKIŞI
              </div>

              <div className="mt-1 text-[13px] font-black text-white">
                Otobüs operasyon tarihini seç
              </div>

              <div className="mt-1 text-[8px] font-bold text-slate-500">
                Otobüs, araç, sürücü, rehber, biniş noktası ve koltuk planı
                seçilen çıkışa göre ayrılır.
              </div>
            </div>

            <select
              value={selectedDepartureId}
              disabled={busy}
              onChange={(event) => {
                const value = event.target.value;

                setSelectedSeatNumber(null);

                setSelectedOperationId("");

                void loadAll(companyId, value);
              }}
              className="min-h-11 min-w-[280px] rounded-xl border border-white/[.08] bg-[linear-gradient(145deg,#081520,#050c13)] shadow-[0_14px_40px_rgba(0,0,0,.12)] px-3 text-[12px] font-black text-white outline-none"
            >
              {operationalDepartures.length > 0 && (
                <optgroup label="Aktif / Gelecek Çıkışlar">
                  {operationalDepartures.map((departure) => (
                    <option key={departure.id} value={departure.id}>
                      {new Intl.DateTimeFormat("tr-TR", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      }).format(
                        new Date(`${departure.departure_date}T12:00:00`),
                      )}
                      {" · "}
                      {departure.reserved_count}/{departure.capacity}
                    </option>
                  ))}
                </optgroup>
              )}

              {historicalDepartures.length > 0 && (
                <optgroup label="Geçmiş / İptal — Salt Görüntüleme">
                  {historicalDepartures.map((departure) => (
                    <option key={departure.id} value={departure.id}>
                      {new Intl.DateTimeFormat("tr-TR", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      }).format(
                        new Date(`${departure.departure_date}T12:00:00`),
                      )}
                      {" · "}
                      {departure.status === "cancelled"
                        ? "İptal · "
                        : "Geçmiş · "}
                      {departure.reserved_count}/{departure.capacity}
                    </option>
                  ))}
                </optgroup>
              )}

              <option value="__legacy__">Atanmamış Eski Kayıtlar</option>
            </select>
          </div>

          {selectedDepartureId === "__legacy__" && (
            <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/[.06] px-3 py-2 text-[8px] font-bold text-amber-300">
              Bu bölüm yalnız eski ve henüz bir tur çıkışına bağlanmamış otobüs
              operasyonlarını gösterir.
            </div>
          )}

          {selectedDepartureIsReadOnly && (
            <div className="mt-3 rounded-xl border border-slate-500/20 bg-slate-500/[.06] px-3 py-2 text-[11px] font-bold text-slate-300">
              Bu tur çıkışı geçmişte kalmış veya iptal edilmiştir. Operasyon
              kayıtları yalnız görüntülenebilir; yeni otobüs oluşturulamaz ve
              operasyon değişikliği kaydedilemez.
            </div>
          )}
        </section>

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
            ["Otobüs", operations.length],
            ["Koltuk", operationSeats.length],
            ["Dolu", reservedCount],
            ["Binen", boardedCount],
            ["Bekleyen", waitingCount],
          ].map(([label, value]) => (
            <article
              key={String(label)}
              className="rounded-[22px] border border-white/[.08] bg-[linear-gradient(145deg,#081520,#050c13)] shadow-[0_14px_40px_rgba(0,0,0,.12)] p-5"
            >
              <div className="text-[13px] font-black uppercase tracking-[.12em] text-slate-600">
                {label}
              </div>

              <div className="mt-3 text-3xl font-black">{value}</div>
            </article>
          ))}
        </section>

        {operations.length > 0 && (
          <section className="mt-5 flex flex-wrap gap-2">
            {operations.map((operation) => (
              <button
                key={operation.id}
                type="button"
                onClick={() => setSelectedOperationId(operation.id)}
                className={`rounded-xl border px-4 py-3 text-[8px] font-black ${
                  selectedOperationId === operation.id
                    ? "border-orange-500/30 bg-orange-500/[.08] text-orange-300"
                    : "border-white/10 bg-[#07131f] text-slate-500"
                }`}
              >
                Otobüs {operation.bus_no}
                {" · "}
                {busStatusLabel(operation.status)}
              </button>
            ))}
          </section>
        )}

        {!selectedOperation ? (
          <section className="mt-5 rounded-[26px] border border-dashed border-white/10 bg-[#07131f] p-12 text-center">
            <FaBus className="mx-auto text-4xl text-slate-800" />

            <h2 className="mt-4 text-lg font-black">
              Henüz otobüs operasyonu yok
            </h2>

            <p className="mt-2 text-[12px] text-slate-600">
              Önce “Otobüs Ekle” ile operasyon aracı oluşturun.
            </p>
          </section>
        ) : (
          <>
            <section className="mt-5 grid gap-5 2xl:grid-cols-[430px_1fr]">
              <aside className="rounded-[26px] border border-white/[.08] bg-[linear-gradient(145deg,#081520,#050c13)] shadow-[0_14px_40px_rgba(0,0,0,.12)] p-5">
                <div className="text-[12px] font-black">Araç & Ekip</div>

                <div className="mt-1 text-[13px] text-slate-600">
                  Otobüs, sürücüler ve rehber
                </div>

                <div className="mt-5 grid gap-3">
                  <label className="space-y-1">
                    <span className="text-[13px] font-black text-slate-600">
                      ARAÇ
                    </span>

                    <select
                      value={busForm.vehicleId}
                      onChange={(event) => {
                        const vehicleId = event.target.value;

                        const vehicle = vehicles.find(
                          (item) => item.id === vehicleId,
                        );

                        setBusForm((current) => ({
                          ...current,
                          vehicleId,
                          seatCapacity: vehicle
                            ? String(vehicle.capacity)
                            : current.seatCapacity,
                        }));
                      }}
                      className="h-11 w-full rounded-xl border border-white/[.08] bg-[#03080e] px-3 text-[8px]"
                    >
                      <option value="">Araç seçilmedi</option>

                      {vehicles.map((vehicle) => (
                        <option key={vehicle.id} value={vehicle.id}>
                          {vehicle.plate_number}
                          {" · "}
                          {vehicle.display_name ||
                            [vehicle.brand, vehicle.model]
                              .filter(Boolean)
                              .join(" ") ||
                            "Araç"}
                          {" · "}
                          {vehicle.capacity}
                          {" koltuk"}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="space-y-1">
                      <span className="text-[13px] font-black text-slate-600">
                        OTOBÜS NO
                      </span>

                      <input
                        type="number"
                        min={1}
                        value={busForm.busNo}
                        onChange={(event) =>
                          setBusForm((current) => ({
                            ...current,
                            busNo: event.target.value,
                          }))
                        }
                        className="h-10 w-full rounded-xl border border-white/[.08] bg-[#03080e] px-3 text-[8px]"
                      />
                    </label>

                    <label className="space-y-1">
                      <span className="text-[13px] font-black text-slate-600">
                        KOLTUK
                      </span>

                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={busForm.seatCapacity}
                        onChange={(event) =>
                          setBusForm((current) => ({
                            ...current,
                            seatCapacity: event.target.value,
                          }))
                        }
                        className="h-10 w-full rounded-xl border border-white/[.08] bg-[#03080e] px-3 text-[8px]"
                      />
                    </label>
                  </div>

                  {[
                    ["ŞOFÖR 1", "driver1Name", busForm.driver1Name],
                    ["ŞOFÖR 1 TEL", "driver1Phone", busForm.driver1Phone],
                    ["ŞOFÖR 2", "driver2Name", busForm.driver2Name],
                    ["ŞOFÖR 2 TEL", "driver2Phone", busForm.driver2Phone],
                    ["REHBER", "guideName", busForm.guideName],
                    ["REHBER TEL", "guidePhone", busForm.guidePhone],
                    [
                      "OPERASYON TEL",
                      "operationsPhone",
                      busForm.operationsPhone,
                    ],
                  ].map(([label, field, value]) => (
                    <label key={field} className="space-y-1">
                      <span className="text-[13px] font-black text-slate-600">
                        {label}
                      </span>

                      <input
                        value={value}
                        onChange={(event) =>
                          setBusForm((current) => ({
                            ...current,
                            [field]: event.target.value,
                          }))
                        }
                        className="h-10 w-full rounded-xl border border-white/[.08] bg-[#03080e] px-3 text-[8px]"
                      />
                    </label>
                  ))}

                  <div className="grid grid-cols-2 gap-3">
                    <label className="space-y-1">
                      <span className="text-[13px] font-black text-slate-600">
                        ÇIKIŞ
                      </span>

                      <input
                        type="datetime-local"
                        value={busForm.departureAt}
                        min={
                          selectedDeparture
                            ? `${selectedDeparture.departure_date}T00:00`
                            : undefined
                        }
                        max={
                          selectedDeparture
                            ? `${selectedDeparture.departure_date}T23:59`
                            : undefined
                        }
                        onClick={(event) => event.currentTarget.showPicker?.()}
                        onChange={(event) =>
                          setBusForm((current) => ({
                            ...current,
                            departureAt: event.target.value,
                          }))
                        }
                        className="h-10 w-full rounded-xl border border-white/[.08] bg-[#03080e] px-2 text-[13px]"
                      />
                    </label>

                    <label className="space-y-1">
                      <span className="text-[13px] font-black text-slate-600">
                        DÖNÜŞ
                      </span>

                      <input
                        type="datetime-local"
                        min={
                          selectedDeparture?.return_date
                            ? `${selectedDeparture.return_date}T00:00`
                            : undefined
                        }
                        max={
                          selectedDeparture?.return_date
                            ? `${selectedDeparture.return_date}T23:59`
                            : undefined
                        }
                        value={busForm.returnAt}
                        onClick={(event) => event.currentTarget.showPicker?.()}
                        onChange={(event) => {
                          const nextValue = event.target.value;

                          if (
                            selectedDeparture?.return_date &&
                            nextValue &&
                            nextValue.split("T")[0] !==
                              selectedDeparture.return_date
                          ) {
                            return;
                          }

                          setBusForm((current) => ({
                            ...current,
                            returnAt: nextValue,
                          }));
                        }}
                        className="h-10 w-full rounded-xl border border-white/[.08] bg-[#03080e] px-2 text-[13px]"
                      />

                      {/* RETURN_DAY_LOCKED_TO_TOUR_CALENDAR */}
                      {selectedDeparture?.return_date && (
                        <p className="mt-2 text-xs font-bold text-slate-500">
                          Dönüş günü Tur Takvimi tarafından belirlenir.
                          Dönüş saatini tur firması operasyon personeli belirler.
                        </p>
                      )}
                    </label>
                  </div>

                  <label className="space-y-1">
                    <span className="text-[13px] font-black text-slate-600">
                      OPERASYON DURUMU
                    </span>

                    <select
                      value={busForm.status}
                      onChange={(event) =>
                        setBusForm((current) => ({
                          ...current,
                          status: event.target.value as BusStatus,
                        }))
                      }
                      className="h-10 w-full rounded-xl border border-white/[.08] bg-[#03080e] px-3 text-[8px]"
                    >
                      <option value="planning">Planlama</option>
                      <option value="assigned">Araç Atandı</option>
                      <option value="boarding">Biniş</option>
                      <option value="departed">Çıkış Yaptı</option>
                      <option value="on_route">Yolda</option>
                      <option value="returning">Dönüş</option>
                      <option value="completed">Tamamlandı</option>
                      <option value="cancelled">İptal</option>
                    </select>
                  </label>

                  <label className="space-y-1">
                    <span className="text-[13px] font-black text-slate-600">
                      NOT
                    </span>

                    <textarea
                      rows={3}
                      value={busForm.notes}
                      onChange={(event) =>
                        setBusForm((current) => ({
                          ...current,
                          notes: event.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-white/[.08] bg-[#03080e] p-3 text-[8px]"
                    />
                  </label>

                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void saveBus()}
                    className="inline-flex h-11 self-end items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 text-[12px] font-black disabled:opacity-40"
                  >
                    <FaSave />
                    Operasyonu Kaydet
                  </button>
                </div>
              </aside>

              <section className="space-y-5">
                <div className="rounded-[26px] border border-white/[.08] bg-[linear-gradient(145deg,#081520,#050c13)] shadow-[0_14px_40px_rgba(0,0,0,.12)] p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="text-[12px] font-black">Koltuk Planı</div>

                      <div className="mt-1 text-[13px] text-slate-600">
                        Koltuk seç, yolcu ata ve biniş kontrolü yap.
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                      <label className="space-y-1">
                        <span className="block text-[11px] font-black text-slate-500">
                          KOLTUK KAPASİTESİ
                        </span>
                        <input
                          type="number"
                          min="1"
                          inputMode="numeric"
                          value={busForm.seatCapacity}
                          onChange={(event) =>
                            setBusForm((current) => ({
                              ...current,
                              seatCapacity: event.target.value,
                            }))
                          }
                          className="h-10 w-full min-w-[150px] rounded-xl border border-white/[.08] bg-[#03080e] px-3 text-[13px] sm:w-[160px]"
                          placeholder="Örn. 46"
                        />
                      </label>

                      <button
                        type="button"
                        disabled={busy || !busForm.seatCapacity}
                        onClick={() => void generateSeats()}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-orange-500/20 bg-orange-500/[.06] px-4 text-[12px] font-black text-orange-300 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <FaPlus />
                        Koltuk Planını Oluştur
                      </button>
                    </div>
                  </div>

                  {operationSeats.length === 0 ? (
                    <div className="mt-5 rounded-2xl border border-dashed border-white/10 p-10 text-center text-[8px] text-slate-600">
                      Koltuk kapasitesini girip “Koltuk Planını Oluştur”
                      butonuna basın.
                    </div>
                  ) : (
                    <div className="mt-6 mx-auto max-w-[560px] rounded-[28px] border border-white/[.08] bg-[#03080e] p-5">
                      <div className="mb-6 flex items-center justify-between border-b border-white/[.06] pb-4">
                        <div className="rounded-xl border border-white/10 bg-white/[.03] px-4 py-2 text-[13px] font-black text-slate-500">
                          ÖN
                        </div>

                        <div className="flex items-center gap-2 text-[13px] text-slate-600">
                          <FaBus />
                          Otobüs {selectedOperation.bus_no}
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-3">
                        {operationSeats.map((seat) => {
                          const occupied = Boolean(seat.passenger_name);

                          const boarded = seat.checkin_status === "boarded";

                          return (
                            <button
                              type="button"
                              key={seat.id}
                              onClick={() => openSeat(seat)}
                              className={`relative min-h-16 rounded-xl border p-2 text-center transition ${
                                boarded
                                  ? "border-emerald-500/40 bg-emerald-500/[.12] text-emerald-300"
                                  : occupied
                                    ? "border-orange-500/30 bg-orange-500/[.09] text-orange-300"
                                    : "border-white/10 bg-white/[.025] text-slate-500 hover:border-orange-500/30"
                              }`}
                            >
                              <div className="text-[13px] font-black">
                                {String(seat.seat_number).padStart(2, "0")}
                              </div>

                              <div className="mt-1 truncate text-[6px] font-bold">
                                {seat.passenger_name || "Boş"}
                              </div>

                              {boarded && (
                                <FaCheck className="absolute right-1.5 top-1.5 text-[8px]" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-[26px] border border-white/[.08] bg-[linear-gradient(145deg,#081520,#050c13)] shadow-[0_14px_40px_rgba(0,0,0,.12)]">
                  <div className="border-b border-white/[.06] p-5">
                    <div className="text-[12px] font-black">
                      Yolcu & Check-in
                    </div>

                    <div className="mt-1 text-[13px] text-slate-600">
                      Hangi yolcu hangi koltukta, nereden binecek ve araca bindi
                      mi?
                    </div>
                  </div>

                  <div className="overflow-auto">
                    <table className="min-w-[900px] w-full">
                      <thead className="bg-[#081522]">
                        <tr className="text-left text-[13px] font-black uppercase text-slate-600">
                          <th className="px-4 py-3">Koltuk</th>
                          <th className="px-4 py-3">Yolcu</th>
                          <th className="px-4 py-3">Telefon</th>
                          <th className="px-4 py-3">Biniş</th>
                          <th className="px-4 py-3">Durum</th>
                          <th className="px-4 py-3 text-right">İşlem</th>
                        </tr>
                      </thead>

                      <tbody>
                        {operationSeats
                          .filter((seat) => Boolean(seat.passenger_name))
                          .map((seat) => {
                            const stop = operationStops.find(
                              (item) => item.id === seat.boarding_stop_id,
                            );

                            return (
                              <tr
                                key={seat.id}
                                className="border-t border-white/[.045]"
                              >
                                <td className="px-4 py-3 text-[12px] font-black">
                                  {seat.seat_number}
                                </td>

                                <td className="px-4 py-3 text-[8px] font-black">
                                  {seat.passenger_name}
                                </td>

                                <td className="px-4 py-3 text-[8px] text-slate-500">
                                  {seat.passenger_phone || "—"}
                                </td>

                                <td className="px-4 py-3 text-[8px] text-slate-500">
                                  {stop?.stop_name || "—"}
                                </td>

                                <td className="px-4 py-3">
                                  <span
                                    className={`rounded-full border px-2.5 py-1 text-[13px] font-black ${
                                      seat.checkin_status === "boarded"
                                        ? "border-emerald-500/20 bg-emerald-500/[.07] text-emerald-300"
                                        : seat.checkin_status === "no_show"
                                          ? "border-red-500/20 bg-red-500/[.07] text-red-300"
                                          : "border-amber-500/20 bg-amber-500/[.07] text-amber-300"
                                    }`}
                                  >
                                    {checkinLabel(seat.checkin_status)}
                                  </span>
                                </td>

                                <td className="px-4 py-3">
                                  <div className="flex justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => openSeat(seat)}
                                      className="rounded-lg border border-white/10 px-3 py-2 text-[13px] font-black"
                                    >
                                      Aç
                                    </button>

                                    <button
                                      type="button"
                                      disabled={
                                        busy ||
                                        seat.checkin_status === "boarded"
                                      }
                                      onClick={() =>
                                        void setCheckin(seat, "boarded")
                                      }
                                      className="rounded-lg border border-emerald-500/20 bg-emerald-500/[.06] px-3 py-2 text-[13px] font-black text-emerald-300 disabled:opacity-40"
                                    >
                                      Bindi ✓
                                    </button>

                                    <button
                                      type="button"
                                      disabled={busy}
                                      onClick={() =>
                                        void setCheckin(seat, "no_show")
                                      }
                                      className="rounded-lg border border-red-500/20 bg-red-500/[.05] px-3 py-2 text-[13px] font-black text-red-300"
                                    >
                                      Gelmedi
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            </section>

            <section className="mt-5 grid gap-5 xl:grid-cols-[430px_1fr]">
              <aside className="rounded-[26px] border border-white/[.08] bg-[linear-gradient(145deg,#081520,#050c13)] shadow-[0_14px_40px_rgba(0,0,0,.12)] p-5">
                <div className="flex items-center gap-2 text-[12px] font-black">
                  <FaMapMarkerAlt className="text-orange-300" />
                  Biniş Noktası Ekle
                </div>

                <div className="mt-5 grid gap-3">
                  <div className="grid grid-cols-[90px_1fr] gap-3">
                    <input
                      type="number"
                      min={1}
                      value={stopForm.sequenceNo}
                      onChange={(event) =>
                        setStopForm((current) => ({
                          ...current,
                          sequenceNo: event.target.value,
                        }))
                      }
                      placeholder="Sıra"
                      className="h-10 rounded-xl border border-white/[.08] bg-[#03080e] px-3 text-[8px]"
                    />

                    <input
                      value={stopForm.stopName}
                      onChange={(event) =>
                        setStopForm((current) => ({
                          ...current,
                          stopName: event.target.value,
                        }))
                      }
                      placeholder="Fethiye Otogar"
                      className="h-10 rounded-xl border border-white/[.08] bg-[#03080e] px-3 text-[8px]"
                    />
                  </div>

                  <input
                    value={stopForm.address}
                    onChange={(event) =>
                      setStopForm((current) => ({
                        ...current,
                        address: event.target.value,
                      }))
                    }
                    placeholder="Adres / buluşma noktası"
                    className="h-10 rounded-xl border border-white/[.08] bg-[#03080e] px-3 text-[8px]"
                  />

                  <input
                    type="datetime-local"
                    value={stopForm.plannedAt}
                    onClick={(event) => event.currentTarget.showPicker?.()}
                    onChange={(event) =>
                      setStopForm((current) => ({
                        ...current,
                        plannedAt: event.target.value,
                      }))
                    }
                    className="h-10 rounded-xl border border-white/[.08] bg-[#03080e] px-3 text-[8px]"
                  />

                  <textarea
                    rows={2}
                    value={stopForm.notes}
                    onChange={(event) =>
                      setStopForm((current) => ({
                        ...current,
                        notes: event.target.value,
                      }))
                    }
                    placeholder="Not"
                    className="rounded-xl border border-white/[.08] bg-[#03080e] p-3 text-[8px]"
                  />

                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void addStop()}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-orange-500 text-[8px] font-black"
                  >
                    <FaPlus />
                    Biniş Noktası Ekle
                  </button>
                </div>
              </aside>

              <section className="overflow-hidden rounded-[26px] border border-white/[.08] bg-[linear-gradient(145deg,#081520,#050c13)] shadow-[0_14px_40px_rgba(0,0,0,.12)]">
                <div className="border-b border-white/[.06] p-5">
                  <div className="text-[12px] font-black">Biniş Rotası</div>

                  <div className="mt-1 text-[13px] text-slate-600">
                    Yolcuların araca alınacağı noktalar.
                  </div>
                </div>

                <div className="overflow-auto">
                  <table className="min-w-[760px] w-full">
                    <thead className="bg-[#081522]">
                      <tr className="text-left text-[13px] font-black uppercase text-slate-600">
                        <th className="px-4 py-3">Sıra</th>
                        <th className="px-4 py-3">Nokta</th>
                        <th className="px-4 py-3">Saat</th>
                        <th className="px-4 py-3">Beklenen</th>
                        <th className="px-4 py-3">Binen</th>
                        <th className="px-4 py-3 text-right">İşlem</th>
                      </tr>
                    </thead>

                    <tbody>
                      {operationStops.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-5 py-10 text-center text-[8px] text-slate-600"
                          >
                            Biniş noktası eklenmedi.
                          </td>
                        </tr>
                      ) : (
                        operationStops.map((stop) => {
                          const stopPassengers = operationSeats.filter(
                            (seat) =>
                              seat.boarding_stop_id === stop.id &&
                              Boolean(seat.passenger_name),
                          );

                          const boarded = stopPassengers.filter(
                            (seat) => seat.checkin_status === "boarded",
                          ).length;

                          return (
                            <tr
                              key={stop.id}
                              className="border-t border-white/[.045]"
                            >
                              <td className="px-4 py-3 text-[12px] font-black">
                                {stop.sequence_no}
                              </td>

                              <td className="px-4 py-3">
                                <div className="text-[8px] font-black">
                                  {stop.stop_name}
                                </div>

                                <div className="mt-1 text-[13px] text-slate-600">
                                  {stop.address || "Adres yok"}
                                </div>
                              </td>

                              <td className="px-4 py-3 text-[8px]">
                                <FaClock className="mr-2 inline text-slate-600" />
                                {displayDateTime(stop.planned_at)}
                              </td>

                              <td className="px-4 py-3 text-[12px] font-black">
                                {stopPassengers.length}
                              </td>

                              <td className="px-4 py-3 text-[12px] font-black text-emerald-300">
                                {boarded}
                              </td>

                              <td className="px-4 py-3 text-right">
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => void removeStop(stop.id)}
                                  className="grid h-8 w-8 place-items-center rounded-lg border border-red-500/20 bg-red-500/[.05] text-red-300"
                                >
                                  <FaTrash />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </section>
          </>
        )}

        {selectedSeatNumber !== null && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/75 p-3 sm:p-6">
            <div className="my-auto w-full max-w-[560px] max-h-[calc(100dvh-24px)] overflow-y-auto rounded-[24px] border border-white/[.08] bg-[linear-gradient(145deg,#081520,#050c13)] p-4 shadow-2xl sm:max-h-[calc(100dvh-48px)] sm:p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[8px] font-black text-orange-300">
                    KOLTUK
                  </div>

                  <div className="mt-1 text-2xl font-black">
                    {selectedSeatNumber}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedSeatNumber(null)}
                  className="rounded-lg border border-white/10 px-3 py-2 text-[8px]"
                >
                  Kapat
                </button>
              </div>

              <div className="mt-5 grid gap-3">
                <input
                  value={seatForm.passengerName}
                  onChange={(event) =>
                    setSeatForm((current) => ({
                      ...current,
                      passengerName: event.target.value,
                    }))
                  }
                  placeholder="Yolcu adı soyadı"
                  className="h-11 rounded-xl border border-white/[.08] bg-[#03080e] px-3 text-[8px]"
                />

                <div className="relative">
                  <FaPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-[8px] text-slate-600" />

                  <input
                    value={seatForm.passengerPhone}
                    onChange={(event) =>
                      setSeatForm((current) => ({
                        ...current,
                        passengerPhone: event.target.value,
                      }))
                    }
                    placeholder="Telefon"
                    className="h-11 w-full rounded-xl border border-white/[.08] bg-[#03080e] pl-9 pr-3 text-[8px]"
                  />
                </div>

                <select
                  value={seatForm.boardingStopId}
                  onChange={(event) =>
                    setSeatForm((current) => ({
                      ...current,
                      boardingStopId: event.target.value,
                    }))
                  }
                  className="h-11 rounded-xl border border-white/[.08] bg-[#03080e] px-3 text-[8px]"
                >
                  <option value="">Biniş noktası seçilmedi</option>

                  {operationStops.map((stop) => (
                    <option key={stop.id} value={stop.id}>
                      {stop.sequence_no}
                      {" · "}
                      {stop.stop_name}
                    </option>
                  ))}
                </select>

                <textarea
                  rows={3}
                  value={seatForm.notes}
                  onChange={(event) =>
                    setSeatForm((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                  placeholder="Yolcu / koltuk notu"
                  className="rounded-xl border border-white/[.08] bg-[#03080e] p-3 text-[8px]"
                />

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void saveSeatPassenger()}
                  className="inline-flex h-11 justify-self-end items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 text-[12px] font-black disabled:opacity-40"
                >
                  <FaUserCheck />
                  Yolcu / Koltuk Kaydet
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

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
      background-color 0.16s ease,
      border-color 0.16s ease;
  }

  [data-tour-module-screen] tbody tr:hover {
    background: rgba(255, 255, 255, 0.024);
  }

  [data-tour-module-screen] input,
  [data-tour-module-screen] select,
  [data-tour-module-screen] textarea {
    outline: none;
  }

  [data-tour-module-screen] input:focus,
  [data-tour-module-screen] select:focus,
  [data-tour-module-screen] textarea:focus {
    border-color: rgba(249, 115, 22, 0.42);
    box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.06);
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
`}</style>;

// TOUR_MODULE_PRO_V3_BUS
