"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FaBus,
  FaCheckCircle,
  FaClock,
  FaMapMarkerAlt,
  FaPhone,
  FaRoute,
  FaSyncAlt,
  FaUserTie,
  FaUsers,
} from "react-icons/fa";

import { supabase } from "@/lib/supabase";
import { getCurrentMembership } from "@/lib/current-user";

type ManifestStatus =
  | "waiting"
  | "pickup_waiting"
  | "checked_in"
  | "in_vehicle"
  | "no_show"
  | "completed"
  | "cancelled";

type Departure = {
  id: string;
  tour_id: string;
  departure_date: string;
  capacity: number;
  reserved_count: number;
  status: string;
  tours:
    | {
        id: string;
        title: string;
      }
    | {
        id: string;
        title: string;
      }[]
    | null;
};

type Operation = {
  id: string;
  company_id: string;
  departure_id: string;
  vehicle_id: string | null;
  guide_id: string | null;
  driver_id: string | null;
  operation_status: string;
  meeting_point: string | null;
  destination_name: string | null;
  notes: string | null;
};

type ManifestRow = {
  manifest_id: string;
  company_id: string;
  departure_id: string;
  reservation_id: string;

  pickup_order: number;
  pickup_point: string | null;
  pickup_time: string | null;

  manifest_status: ManifestStatus;

  reservation_code: string | null;
  tour_title: string;
  tour_date: string;
  full_name: string;
  phone: string;
  email: string;
  guests: number;
  payment_status: string | null;
  reservation_status: string | null;

  checked_in: boolean | null;
  live_operation_status: string | null;

  vehicle_id: string | null;
  guide_id: string | null;
  driver_id: string | null;

  plate_number: string | null;
  vehicle_name: string | null;
  vehicle_capacity: number | null;

  guide_name: string | null;
  driver_name: string | null;
};

type VehicleOption = {
  id: string;
  plate_number: string;
  display_name: string | null;
  capacity: number;
  status: string;
};

type StaffOption = {
  id: string;
  full_name: string;
  staff_role: string;
};

type PickupDraft = {
  pickup_order: string;
  pickup_point: string;
  pickup_time: string;
};

function getTour(
  departure: Departure
) {
  if (!departure.tours) {
    return null;
  }

  if (Array.isArray(departure.tours)) {
    return departure.tours[0] ?? null;
  }

  return departure.tours;
}

const manifestStatusLabels: Record<
  ManifestStatus,
  string
> = {
  waiting: "Bekliyor",
  pickup_waiting: "Pickup Bekliyor",
  checked_in: "Check-in",
  in_vehicle: "Araçta",
  no_show: "No Show",
  completed: "Tamamlandı",
  cancelled: "İptal",
};

const operationStatusLabels: Record<
  string,
  string
> = {
  planned: "Planlandı",
  ready: "Hazır",
  pickup_started: "Pickup Başladı",
  departed: "Tur Çıktı",
  activity_started: "Aktivite Başladı",
  returning: "Dönüşte",
  completed: "Tamamlandı",
  cancelled: "İptal",
};

export default function ManifestPage() {
  const [
    departures,
    setDepartures,
  ] = useState<Departure[]>([]);

  const [
    selectedDepartureId,
    setSelectedDepartureId,
  ] = useState("");

  const [
    manifest,
    setManifest,
  ] = useState<ManifestRow[]>([]);

  const [
    operation,
    setOperation,
  ] = useState<Operation | null>(
    null
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    actionLoading,
    setActionLoading,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");


  const [
    vehicles,
    setVehicles,
  ] = useState<VehicleOption[]>([]);

  const [
    staff,
    setStaff,
  ] = useState<StaffOption[]>([]);

  const [
    selectedVehicleId,
    setSelectedVehicleId,
  ] = useState("");

  const [
    selectedGuideId,
    setSelectedGuideId,
  ] = useState("");

  const [
    selectedDriverId,
    setSelectedDriverId,
  ] = useState("");

  const [
    pickupDrafts,
    setPickupDrafts,
  ] = useState<Record<string, PickupDraft>>({});

  const selectedDeparture =
    useMemo(
      () =>
        departures.find(
          (item) =>
            item.id ===
            selectedDepartureId
        ) ?? null,
      [
        departures,
        selectedDepartureId,
      ]
    );

  const loadDepartureData =
    useCallback(
      async (
        departureId: string
      ) => {
        if (!departureId) {
          return;
        }

        try {
          setActionLoading(true);
          setErrorMessage("");

          const {
            data: userData,
            error: userError,
          } =
            await supabase.auth.getUser();

          if (userError) {
            throw userError;
          }

          if (!userData.user) {
            throw new Error(
              "Oturum bulunamadı."
            );
          }

          const membership =
            await getCurrentMembership(
              userData.user.id
            );

          if (!membership) {
            throw new Error(
              "Firma üyeliği bulunamadı."
            );
          }

          const companyId =
            membership.company_id;

          const {
            data: operationId,
            error: operationCreateError,
          } = await supabase.rpc(
            "get_or_create_tour_departure_operation",
            {
              p_company_id:
                companyId,
              p_departure_id:
                departureId,
            }
          );

          if (operationCreateError) {
            throw operationCreateError;
          }

          const {
            error: syncError,
          } = await supabase.rpc(
            "sync_tour_departure_manifest",
            {
              p_company_id:
                companyId,
              p_departure_id:
                departureId,
            }
          );

          if (syncError) {
            throw syncError;
          }

          const [
            operationResult,
            manifestResult,
          ] = await Promise.all([
            supabase
              .from(
                "tour_departure_operations"
              )
              .select("*")
              .eq(
                "id",
                operationId
              )
              .maybeSingle(),

            supabase
              .from(
                "tour_departure_manifest_view"
              )
              .select("*")
              .eq(
                "company_id",
                companyId
              )
              .eq(
                "departure_id",
                departureId
              )
              .order(
                "pickup_order",
                {
                  ascending: true,
                }
              ),
          ]);

          if (
            operationResult.error
          ) {
            throw operationResult.error;
          }

          if (manifestResult.error) {
            throw manifestResult.error;
          }

          const nextOperation =
            operationResult.data as Operation;

          const manifestRows =
            (manifestResult.data ??
              []) as ManifestRow[];

          const [
            vehiclesResult,
            staffResult,
          ] = await Promise.all([
            supabase
              .from("vehicles")
              .select(
                "id, plate_number, display_name, capacity, status"
              )
              .eq(
                "company_id",
                companyId
              )
              .eq(
                "is_active",
                true
              )
              .order("plate_number"),

            supabase
              .from("staff_profiles")
              .select(
                "id, full_name, staff_role"
              )
              .eq(
                "company_id",
                companyId
              )
              .eq(
                "is_active",
                true
              )
              .order("full_name"),
          ]);

          if (vehiclesResult.error) {
            throw vehiclesResult.error;
          }

          if (staffResult.error) {
            throw staffResult.error;
          }

          setOperation(nextOperation);

          setVehicles(
            (vehiclesResult.data ??
              []) as VehicleOption[]
          );

          setStaff(
            (staffResult.data ??
              []) as StaffOption[]
          );

          setSelectedVehicleId(
            nextOperation.vehicle_id ??
              ""
          );

          setSelectedGuideId(
            nextOperation.guide_id ??
              ""
          );

          setSelectedDriverId(
            nextOperation.driver_id ??
              ""
          );

          setManifest(manifestRows);

          setPickupDrafts(
            Object.fromEntries(
              manifestRows.map(
                (row) => [
                  row.manifest_id,
                  {
                    pickup_order:
                      String(
                        row.pickup_order ??
                          0
                      ),
                    pickup_point:
                      row.pickup_point ??
                      "",
                    pickup_time:
                      row.pickup_time
                        ? row.pickup_time.slice(
                            0,
                            5
                          )
                        : "",
                  },
                ]
              )
            )
          );
        } catch (error) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Manifest yüklenemedi."
          );
        } finally {
          setActionLoading(false);
        }
      },
      []
    );

  const loadInitial =
    useCallback(async () => {
      try {
        setLoading(true);
        setErrorMessage("");

        const today =
          new Date()
            .toISOString()
            .slice(0, 10);

        const {
          data,
          error,
        } = await supabase
          .from("tour_departures")
          .select(
            `
            id,
            tour_id,
            departure_date,
            capacity,
            reserved_count,
            status,
            tours (
              id,
              title
            )
          `
          )
          .gte(
            "departure_date",
            today
          )
          .order(
            "departure_date",
            {
              ascending: true,
            }
          );

        if (error) {
          throw error;
        }

        const list =
          (data ??
            []) as unknown as Departure[];

        setDepartures(list);

        if (list.length) {
          setSelectedDepartureId(
            list[0].id
          );

          await loadDepartureData(
            list[0].id
          );
        }
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Tur çıkışları yüklenemedi."
        );
      } finally {
        setLoading(false);
      }
    }, [loadDepartureData]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  async function changeDeparture(
    departureId: string
  ) {
    setSelectedDepartureId(
      departureId
    );

    await loadDepartureData(
      departureId
    );
  }

  async function updateManifestStatus(
    row: ManifestRow,
    status: ManifestStatus
  ) {
    try {
      setActionLoading(true);
      setErrorMessage("");

      const {
        error,
      } = await supabase.rpc(
        "update_tour_manifest_status",
        {
          p_company_id:
            row.company_id,
          p_manifest_id:
            row.manifest_id,
          p_status: status,
        }
      );

      if (error) {
        throw error;
      }

      await loadDepartureData(
        row.departure_id
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Manifest durumu güncellenemedi."
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function saveDepartureResources() {
    if (!operation) {
      return;
    }

    try {
      setActionLoading(true);
      setErrorMessage("");

      const { error } =
        await supabase.rpc(
          "assign_tour_departure_resources",
          {
            p_company_id:
              operation.company_id,
            p_operation_id:
              operation.id,
            p_vehicle_id:
              selectedVehicleId ||
              null,
            p_guide_id:
              selectedGuideId ||
              null,
            p_driver_id:
              selectedDriverId ||
              null,
          }
        );

      if (error) {
        throw error;
      }

      await loadDepartureData(
        operation.departure_id
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Araç/personel ataması kaydedilemedi."
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function savePickup(
    row: ManifestRow
  ) {
    const draft =
      pickupDrafts[
        row.manifest_id
      ];

    if (!draft) {
      return;
    }

    try {
      setActionLoading(true);
      setErrorMessage("");

      const pickupOrder =
        Number(
          draft.pickup_order ||
            0
        );

      if (
        !Number.isInteger(
          pickupOrder
        ) ||
        pickupOrder < 0
      ) {
        throw new Error(
          "Pickup sırası 0 veya daha büyük tam sayı olmalı."
        );
      }

      const { error } =
        await supabase.rpc(
          "update_tour_manifest_pickup",
          {
            p_company_id:
              row.company_id,
            p_manifest_id:
              row.manifest_id,
            p_pickup_order:
              pickupOrder,
            p_pickup_point:
              draft.pickup_point ||
              null,
            p_pickup_time:
              draft.pickup_time ||
              null,
          }
        );

      if (error) {
        throw error;
      }

      await loadDepartureData(
        row.departure_id
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Pickup bilgisi kaydedilemedi."
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function updateOperationStatus(
    status: string
  ) {
    if (!operation) {
      return;
    }

    try {
      setActionLoading(true);
      setErrorMessage("");

      const {
        error,
      } = await supabase.rpc(
        "update_tour_departure_operation_status",
        {
          p_company_id:
            operation.company_id,
          p_operation_id:
            operation.id,
          p_status: status,
        }
      );

      if (error) {
        throw error;
      }

      await loadDepartureData(
        operation.departure_id
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Operasyon durumu güncellenemedi."
      );
    } finally {
      setActionLoading(false);
    }
  }

  const stats = useMemo(() => {
    const totalGuests =
      manifest.reduce(
        (total, item) =>
          total +
          Number(item.guests || 0),
        0
      );

    const checkedIn =
      manifest
        .filter(
          (item) =>
            [
              "checked_in",
              "in_vehicle",
              "completed",
            ].includes(
              item.manifest_status
            )
        )
        .reduce(
          (total, item) =>
            total +
            Number(
              item.guests || 0
            ),
          0
        );

    const inVehicle =
      manifest
        .filter(
          (item) =>
            item.manifest_status ===
            "in_vehicle"
        )
        .reduce(
          (total, item) =>
            total +
            Number(
              item.guests || 0
            ),
          0
        );

    const noShow =
      manifest
        .filter(
          (item) =>
            item.manifest_status ===
            "no_show"
        )
        .reduce(
          (total, item) =>
            total +
            Number(
              item.guests || 0
            ),
          0
        );

    return {
      totalGuests,
      checkedIn,
      inVehicle,
      noShow,
    };
  }, [manifest]);

  const capacity =
    selectedDeparture?.capacity ?? 0;

  const remaining =
    Math.max(
      capacity -
        stats.totalGuests,
      0
    );

  const selectedVehicle =
    useMemo(
      () =>
        vehicles.find(
          (vehicle) =>
            vehicle.id ===
            selectedVehicleId
        ) ?? null,
      [
        vehicles,
        selectedVehicleId,
      ]
    );

  const vehicleCapacity =
    selectedVehicle?.capacity ??
    null;

  const vehicleOverflow =
    vehicleCapacity !== null &&
    stats.totalGuests >
      vehicleCapacity;

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        Manifest hazırlanıyor...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 p-5 text-white lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-400">
              TUROBUS OPERASYON
            </p>

            <h1 className="mt-2 text-3xl font-black">
              Tur Çıkış & Manifest Merkezi
            </h1>

            <p className="mt-2 max-w-3xl text-sm text-slate-400">
              Günlük tur çıkışlarını,
              misafirleri, pickup
              sürecini ve operasyon
              durumunu tek ekrandan
              yönet.
            </p>
          </div>

          <div className="flex gap-3">
            <select
              value={
                selectedDepartureId
              }
              onChange={(event) =>
                void changeDeparture(
                  event.target.value
                )
              }
              className="min-w-[280px] rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 font-bold"
            >
              {departures.map(
                (departure) => {
                  const tour =
                    getTour(
                      departure
                    );

                  return (
                    <option
                      key={
                        departure.id
                      }
                      value={
                        departure.id
                      }
                    >
                      {
                        departure.departure_date
                      }{" "}
                      -{" "}
                      {tour?.title ??
                        "Tur"}
                    </option>
                  );
                }
              )}
            </select>

            <button
              type="button"
              onClick={() =>
                void loadDepartureData(
                  selectedDepartureId
                )
              }
              className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3"
            >
              <FaSyncAlt />
            </button>
          </div>
        </header>

        {errorMessage && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-300">
            {errorMessage}
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <Stat
            icon={FaUsers}
            label="Toplam Misafir"
            value={stats.totalGuests}
          />

          <Stat
            icon={FaBus}
            label="Kapasite"
            value={capacity}
          />

          <Stat
            icon={FaClock}
            label="Kalan"
            value={remaining}
          />

          <Stat
            icon={FaCheckCircle}
            label="Check-in"
            value={stats.checkedIn}
          />

          <Stat
            icon={FaBus}
            label="Araçta"
            value={stats.inVehicle}
          />

          <Stat
            icon={FaUsers}
            label="No Show"
            value={stats.noShow}
          />
        </section>

        {vehicleOverflow && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 font-black text-red-300">
            ⚠ Araç kapasitesi yetersiz.
            Misafir:{" "}
            {stats.totalGuests} /
            Araç kapasitesi:{" "}
            {vehicleCapacity}
          </div>
        )}

        {operation && (
          <section className="rounded-[28px] border border-slate-800 bg-slate-900 p-6">
            <div className="mb-5">
              <p className="text-xs font-black uppercase tracking-wider text-orange-400">
                Çıkış Kaynak Ataması
              </p>

              <h2 className="mt-2 text-xl font-black">
                Araç, Rehber & Şoför
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Bu çıkışa atanan ekip ve araç tüm rezervasyonlara uygulanır.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-4">
              <label className="space-y-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Araç
                </span>

                <select
                  value={selectedVehicleId}
                  onChange={(event) =>
                    setSelectedVehicleId(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 font-bold"
                >
                  <option value="">
                    Araç seçilmedi
                  </option>

                  {vehicles.map((vehicle) => (
                    <option
                      key={vehicle.id}
                      value={vehicle.id}
                    >
                      {vehicle.plate_number}
                      {" - "}
                      {vehicle.display_name ?? "Araç"}
                      {" - "}
                      {vehicle.capacity} kişi
                    </option>
                  ))}
                </select>

                {selectedVehicle && (
                  <p
                    className={
                      vehicleOverflow
                        ? "text-xs font-bold text-red-400"
                        : "text-xs font-bold text-emerald-400"
                    }
                  >
                    {stats.totalGuests} misafir /{" "}
                    {selectedVehicle.capacity} koltuk
                  </p>
                )}
              </label>

              <label className="space-y-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Rehber
                </span>

                <select
                  value={selectedGuideId}
                  onChange={(event) =>
                    setSelectedGuideId(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 font-bold"
                >
                  <option value="">
                    Rehber seçilmedi
                  </option>

                  {staff
                    .filter((person) =>
                      [
                        "guide",
                        "operation_manager",
                        "assistant",
                      ].includes(
                        person.staff_role
                      )
                    )
                    .map((person) => (
                      <option
                        key={person.id}
                        value={person.id}
                      >
                        {person.full_name}
                      </option>
                    ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Şoför
                </span>

                <select
                  value={selectedDriverId}
                  onChange={(event) =>
                    setSelectedDriverId(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 font-bold"
                >
                  <option value="">
                    Şoför seçilmedi
                  </option>

                  {staff
                    .filter((person) =>
                      [
                        "driver",
                        "operation_manager",
                      ].includes(
                        person.staff_role
                      )
                    )
                    .map((person) => (
                      <option
                        key={person.id}
                        value={person.id}
                      >
                        {person.full_name}
                      </option>
                    ))}
                </select>
              </label>

              <div className="flex items-end">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() =>
                    void saveDepartureResources()
                  }
                  className="w-full rounded-xl bg-orange-500 px-5 py-3 font-black text-slate-950 transition hover:bg-orange-400 disabled:opacity-40"
                >
                  Atamayı Kaydet
                </button>
              </div>
            </div>
          </section>
        )}

        {operation && (
          <section className="rounded-[28px] border border-slate-800 bg-slate-900 p-6">
            <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Çıkış Operasyonu
                </p>

                <h2 className="mt-2 text-xl font-black">
                  {operationStatusLabels[
                    operation
                      .operation_status
                  ] ??
                    operation
                      .operation_status}
                </h2>
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  [
                    "ready",
                    "Hazır",
                  ],
                  [
                    "pickup_started",
                    "Pickup Başlat",
                  ],
                  [
                    "departed",
                    "Tur Çıktı",
                  ],
                  [
                    "activity_started",
                    "Aktivite Başladı",
                  ],
                  [
                    "returning",
                    "Dönüş",
                  ],
                  [
                    "completed",
                    "Operasyonu Kapat",
                  ],
                ].map(
                  ([
                    status,
                    label,
                  ]) => (
                    <button
                      key={status}
                      disabled={
                        actionLoading
                      }
                      onClick={() =>
                        void updateOperationStatus(
                          status
                        )
                      }
                      className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-black transition hover:border-orange-500 hover:text-orange-400 disabled:opacity-40"
                    >
                      {label}
                    </button>
                  )
                )}
              </div>
            </div>
          </section>
        )}

        <section className="overflow-hidden rounded-[28px] border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 p-6">
            <h2 className="text-xl font-black">
              Misafir Manifesti
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {manifest.length} rezervasyon
              kaydı
            </p>
          </div>

          <div className="divide-y divide-slate-800">
            {manifest.length ===
              0 && (
              <div className="p-10 text-center text-slate-500">
                Bu çıkış için rezervasyon
                bulunamadı.
              </div>
            )}

            {manifest.map(
              (row) => (
                <article
                  key={
                    row.manifest_id
                  }
                  className="p-5"
                >
                  <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr_1fr_auto] xl:items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-lg bg-orange-500/10 px-2 py-1 text-xs font-black text-orange-400">
                          {row.reservation_code ??
                            row.reservation_id.slice(
                              0,
                              8
                            )}
                        </span>

                        <span className="rounded-lg bg-slate-800 px-2 py-1 text-xs font-black">
                          {
                            manifestStatusLabels[
                              row
                                .manifest_status
                            ]
                          }
                        </span>
                      </div>

                      <h3 className="mt-3 text-lg font-black">
                        {
                          row.full_name
                        }
                      </h3>

                      <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-400">
                        <span className="flex items-center gap-2">
                          <FaPhone />
                          {row.phone}
                        </span>

                        <span className="flex items-center gap-2">
                          <FaUsers />
                          {row.guests} kişi
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 font-bold">
                        <FaMapMarkerAlt className="text-orange-400" />
                        Pickup Planı
                      </div>

                      <div className="grid grid-cols-[64px_minmax(130px,1fr)_105px] gap-2">
                        <input
                          type="number"
                          min={0}
                          title="Pickup sırası"
                          value={
                            pickupDrafts[
                              row.manifest_id
                            ]?.pickup_order ??
                            String(
                              row.pickup_order ??
                                0
                            )
                          }
                          onChange={(event) =>
                            setPickupDrafts(
                              (current) => ({
                                ...current,
                                [row.manifest_id]: {
                                  pickup_order:
                                    event.target.value,
                                  pickup_point:
                                    current[
                                      row.manifest_id
                                    ]?.pickup_point ??
                                    row.pickup_point ??
                                    "",
                                  pickup_time:
                                    current[
                                      row.manifest_id
                                    ]?.pickup_time ??
                                    (row.pickup_time
                                      ? row.pickup_time.slice(
                                          0,
                                          5
                                        )
                                      : ""),
                                },
                              })
                            )
                          }
                          className="min-w-0 rounded-lg border border-slate-700 bg-slate-950 px-2 py-2"
                        />

                        <input
                          type="text"
                          placeholder="Pickup noktası"
                          value={
                            pickupDrafts[
                              row.manifest_id
                            ]?.pickup_point ??
                            row.pickup_point ??
                            ""
                          }
                          onChange={(event) =>
                            setPickupDrafts(
                              (current) => ({
                                ...current,
                                [row.manifest_id]: {
                                  pickup_order:
                                    current[
                                      row.manifest_id
                                    ]?.pickup_order ??
                                    String(
                                      row.pickup_order ??
                                        0
                                    ),
                                  pickup_point:
                                    event.target.value,
                                  pickup_time:
                                    current[
                                      row.manifest_id
                                    ]?.pickup_time ??
                                    (row.pickup_time
                                      ? row.pickup_time.slice(
                                          0,
                                          5
                                        )
                                      : ""),
                                },
                              })
                            )
                          }
                          className="min-w-0 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
                        />

                        <input
                          type="time"
                          value={
                            pickupDrafts[
                              row.manifest_id
                            ]?.pickup_time ??
                            (row.pickup_time
                              ? row.pickup_time.slice(
                                  0,
                                  5
                                )
                              : "")
                          }
                          onChange={(event) =>
                            setPickupDrafts(
                              (current) => ({
                                ...current,
                                [row.manifest_id]: {
                                  pickup_order:
                                    current[
                                      row.manifest_id
                                    ]?.pickup_order ??
                                    String(
                                      row.pickup_order ??
                                        0
                                    ),
                                  pickup_point:
                                    current[
                                      row.manifest_id
                                    ]?.pickup_point ??
                                    row.pickup_point ??
                                    "",
                                  pickup_time:
                                    event.target.value,
                                },
                              })
                            )
                          }
                          className="min-w-0 rounded-lg border border-slate-700 bg-slate-950 px-2 py-2"
                        />
                      </div>

                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() =>
                          void savePickup(row)
                        }
                        className="rounded-lg border border-orange-500/40 px-3 py-2 text-xs font-black text-orange-400 transition hover:bg-orange-500/10 disabled:opacity-40"
                      >
                        Pickup Kaydet
                      </button>
                    </div>

                    <div className="space-y-2 text-sm">
                      <p className="flex items-center gap-2">
                        <FaBus className="text-orange-400" />

                        {row.plate_number ??
                          "Araç atanmadı"}
                      </p>

                      <p className="flex items-center gap-2">
                        <FaUserTie className="text-orange-400" />

                        {row.guide_name ??
                          "Rehber atanmadı"}
                      </p>

                      <p className="flex items-center gap-2">
                        <FaRoute className="text-orange-400" />

                        {row.driver_name ??
                          "Şoför atanmadı"}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 xl:max-w-[290px] xl:justify-end">
                      {(
                        [
                          [
                            "pickup_waiting",
                            "Pickup",
                          ],
                          [
                            "checked_in",
                            "Check-in",
                          ],
                          [
                            "in_vehicle",
                            "Araçta",
                          ],
                          [
                            "no_show",
                            "No Show",
                          ],
                          [
                            "completed",
                            "Tamam",
                          ],
                        ] as [
                          ManifestStatus,
                          string
                        ][]
                      ).map(
                        ([
                          status,
                          label,
                        ]) => (
                          <button
                            key={
                              status
                            }
                            disabled={
                              actionLoading
                            }
                            onClick={() =>
                              void updateManifestStatus(
                                row,
                                status
                              )
                            }
                            className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-black transition hover:border-orange-500 hover:text-orange-400 disabled:opacity-40"
                          >
                            {label}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </article>
              )
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{
    size?: number;
    className?: string;
  }>;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-[24px] border border-slate-800 bg-slate-900 p-5">
      <Icon
        size={18}
        className="text-orange-400"
      />

      <p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-3xl font-black">
        {value}
      </p>
    </div>
  );
}
