"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  FaBus,
  FaCalendarAlt,
  FaEdit,
  FaMapMarkerAlt,
  FaPlus,
  FaSearch,
  FaTrash,
  FaUserTie,
} from "react-icons/fa";
import { supabase } from "@/lib/supabase";
import {
  CurrentMembership,
  getCurrentMembership,
} from "@/lib/current-user";

type AssignmentStatus =
  | "planned"
  | "ready"
  | "active"
  | "completed"
  | "cancelled";

type ReservationOption = {
  id: string;
  reservation_code: string | null;
  tour_title: string;
  tour_date: string;
  full_name: string;
  guests: number;
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
  phone: string | null;
};

type Assignment = {
  id: string;
  company_id: string;
  reservation_id: string;
  vehicle_id: string | null;
  guide_id: string | null;
  driver_id: string | null;
  assignment_status: AssignmentStatus;
  planned_start_at: string | null;
  actual_start_at: string | null;
  planned_end_at: string | null;
  actual_end_at: string | null;
  pickup_point: string | null;
  destination_name: string | null;
  notes: string | null;
  reservation:
    | {
        reservation_code: string | null;
        tour_title: string;
        tour_date: string;
        full_name: string;
        guests: number;
      }
    | null;
  vehicle:
    | {
        plate_number: string;
        display_name: string | null;
        capacity: number;
      }
    | null;
  guide:
    | {
        full_name: string;
        phone: string | null;
      }
    | null;
  driver:
    | {
        full_name: string;
        phone: string | null;
      }
    | null;
};

type AssignmentForm = {
  reservation_id: string;
  vehicle_id: string;
  guide_id: string;
  driver_id: string;
  assignment_status: AssignmentStatus;
  planned_start_at: string;
  planned_end_at: string;
  pickup_point: string;
  destination_name: string;
  notes: string;
};

const emptyForm: AssignmentForm = {
  reservation_id: "",
  vehicle_id: "",
  guide_id: "",
  driver_id: "",
  assignment_status: "planned",
  planned_start_at: "",
  planned_end_at: "",
  pickup_point: "",
  destination_name: "",
  notes: "",
};

const statusLabels: Record<AssignmentStatus, string> = {
  planned: "Planlandı",
  ready: "Hazır",
  active: "Aktif",
  completed: "Tamamlandı",
  cancelled: "İptal",
};

function statusClasses(status: AssignmentStatus) {
  if (status === "active") {
    return "bg-emerald-500/15 text-emerald-400";
  }

  if (status === "ready") {
    return "bg-blue-500/15 text-blue-400";
  }

  if (status === "completed") {
    return "bg-slate-500/15 text-slate-400";
  }

  if (status === "cancelled") {
    return "bg-red-500/15 text-red-400";
  }

  return "bg-orange-500/15 text-orange-400";
}

function toLocalDateTime(value: string | null) {
  if (!value) return "";

  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;

  return new Date(date.getTime() - offset)
    .toISOString()
    .slice(0, 16);
}

export default function AssignmentsPage() {
  const [membership, setMembership] =
    useState<CurrentMembership | null>(null);
  const [reservations, setReservations] =
    useState<ReservationOption[]>([]);
  const [vehicles, setVehicles] =
    useState<VehicleOption[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [assignments, setAssignments] =
    useState<Assignment[]>([]);
  const [form, setForm] =
    useState<AssignmentForm>(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadData = useCallback(async (companyId: string) => {
    setErrorMessage("");

    const [
      { data: reservationData, error: reservationError },
      { data: vehicleData, error: vehicleError },
      { data: staffData, error: staffError },
      { data: assignmentData, error: assignmentError },
    ] = await Promise.all([
      supabase
        .from("reservations")
        .select(
          "id, reservation_code, tour_title, tour_date, full_name, guests"
        )
        .eq("company_id", companyId)
        .neq("status", "cancelled")
        .order("tour_date", { ascending: true }),

      supabase
        .from("vehicles")
        .select(
          "id, plate_number, display_name, capacity, status"
        )
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("plate_number", { ascending: true }),

      supabase
        .from("staff_profiles")
        .select("id, full_name, staff_role, phone")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("full_name", { ascending: true }),

      supabase
        .from("operation_assignments")
        .select(`
          id,
          company_id,
          reservation_id,
          vehicle_id,
          guide_id,
          driver_id,
          assignment_status,
          planned_start_at,
          actual_start_at,
          planned_end_at,
          actual_end_at,
          pickup_point,
          destination_name,
          notes,
          reservation:reservations (
            reservation_code,
            tour_title,
            tour_date,
            full_name,
            guests
          ),
          vehicle:vehicles (
            plate_number,
            display_name,
            capacity
          ),
          guide:staff_profiles!operation_assignments_guide_id_fkey (
            full_name,
            phone
          ),
          driver:staff_profiles!operation_assignments_driver_id_fkey (
            full_name,
            phone
          )
        `)
        .eq("company_id", companyId)
        .order("planned_start_at", { ascending: false }),
    ]);

    const errors = [
      reservationError,
      vehicleError,
      staffError,
      assignmentError,
    ].filter(Boolean);

    if (errors.length > 0) {
      console.error(errors);
      setErrorMessage(
        errors[0]?.message || "Görev verileri yüklenemedi."
      );
    }

    setReservations(
      (reservationData ?? []) as ReservationOption[]
    );
    setVehicles((vehicleData ?? []) as VehicleOption[]);
    setStaff((staffData ?? []) as StaffOption[]);
    setAssignments(
      (assignmentData ?? []) as unknown as Assignment[]
    );
  }, []);

  useEffect(() => {
    async function initialize() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setErrorMessage("Kullanıcı oturumu bulunamadı.");
        setLoading(false);
        return;
      }

      try {
        const currentMembership =
          await getCurrentMembership(user.id);

        if (!currentMembership) {
          setErrorMessage("Aktif şirket üyeliği bulunamadı.");
          setLoading(false);
          return;
        }

        setMembership(currentMembership);
        await loadData(currentMembership.company_id);
      } catch (error) {
        console.error(error);
        setErrorMessage("Görev atama verileri hazırlanamadı.");
      } finally {
        setLoading(false);
      }
    }

    void initialize();
  }, [loadData]);

  const guides = useMemo(
    () =>
      staff.filter(
        (person) => person.staff_role === "guide"
      ),
    [staff]
  );

  const drivers = useMemo(
    () =>
      staff.filter(
        (person) => person.staff_role === "driver"
      ),
    [staff]
  );

  const filteredAssignments = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("tr-TR");

    if (!query) return assignments;

    return assignments.filter((assignment) =>
      [
        assignment.reservation?.reservation_code,
        assignment.reservation?.tour_title,
        assignment.reservation?.full_name,
        assignment.vehicle?.plate_number,
        assignment.guide?.full_name,
        assignment.driver?.full_name,
        assignment.pickup_point,
        assignment.destination_name,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value)
            .toLocaleLowerCase("tr-TR")
            .includes(query)
        )
    );
  }, [assignments, search]);

  function updateForm<K extends keyof AssignmentForm>(
    key: K,
    value: AssignmentForm[K]
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId("");
    setErrorMessage("");
    setSuccessMessage("");
  }

  function editAssignment(assignment: Assignment) {
    setEditingId(assignment.id);

    setForm({
      reservation_id: assignment.reservation_id,
      vehicle_id: assignment.vehicle_id ?? "",
      guide_id: assignment.guide_id ?? "",
      driver_id: assignment.driver_id ?? "",
      assignment_status: assignment.assignment_status,
      planned_start_at: toLocalDateTime(
        assignment.planned_start_at
      ),
      planned_end_at: toLocalDateTime(
        assignment.planned_end_at
      ),
      pickup_point: assignment.pickup_point ?? "",
      destination_name:
        assignment.destination_name ?? "",
      notes: assignment.notes ?? "",
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function saveAssignment(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!membership) return;

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    const payload = {
      company_id: membership.company_id,
      reservation_id: form.reservation_id,
      vehicle_id: form.vehicle_id || null,
      guide_id: form.guide_id || null,
      driver_id: form.driver_id || null,
      assignment_status: form.assignment_status,
      planned_start_at: form.planned_start_at
        ? new Date(form.planned_start_at).toISOString()
        : null,
      planned_end_at: form.planned_end_at
        ? new Date(form.planned_end_at).toISOString()
        : null,
      pickup_point: form.pickup_point.trim() || null,
      destination_name:
        form.destination_name.trim() || null,
      notes: form.notes.trim() || null,
      updated_at: new Date().toISOString(),
    };

    try {
      if (editingId) {
        const { error } = await supabase
          .from("operation_assignments")
          .update(payload)
          .eq("id", editingId)
          .eq("company_id", membership.company_id);

        if (error) throw error;

        setSuccessMessage(
          "Operasyon görevi başarıyla güncellendi."
        );
      } else {
        const { error } = await supabase
          .from("operation_assignments")
          .insert(payload);

        if (error) throw error;

        setSuccessMessage(
          "Yeni operasyon görevi oluşturuldu."
        );
      }

      await loadData(membership.company_id);
      setForm(emptyForm);
      setEditingId("");
    } catch (error) {
      console.error(error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Görev kaydedilemedi."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteAssignment(
    assignment: Assignment
  ) {
    if (!membership) return;

    const confirmed = window.confirm(
      "Bu görev atamasını silmek istediğinize emin misiniz?"
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("operation_assignments")
      .delete()
      .eq("id", assignment.id)
      .eq("company_id", membership.company_id);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setSuccessMessage("Görev ataması silindi.");
    await loadData(membership.company_id);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-10 text-white">
        Görev atamaları yükleniyor...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-10 text-white lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header>
          <p className="text-sm font-black uppercase tracking-[0.25em] text-orange-400">
            Operation Twin
          </p>

          <h1 className="mt-3 text-4xl font-black md:text-5xl">
            Görev Atama
          </h1>

          <p className="mt-4 max-w-3xl text-slate-400">
            Rezervasyonları araç, rehber ve şoför ile
            eşleştirerek operasyon görevlerini planlayın.
          </p>
        </header>

        <section className="mt-9 rounded-[32px] border border-white/10 bg-slate-900 p-6 lg:p-8">
          <div className="flex items-center gap-3">
            <FaPlus className="text-orange-400" />

            <h2 className="text-2xl font-black">
              {editingId
                ? "Görevi Düzenle"
                : "Yeni Görev Oluştur"}
            </h2>
          </div>

          <form
            onSubmit={saveAssignment}
            className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3"
          >
            <label className="md:col-span-2 xl:col-span-3">
              <span className="text-sm font-black">
                Rezervasyon
              </span>

              <select
                required
                value={form.reservation_id}
                onChange={(event) =>
                  updateForm(
                    "reservation_id",
                    event.target.value
                  )
                }
                className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
              >
                <option value="">
                  Rezervasyon seçin
                </option>

                {reservations.map((reservation) => (
                  <option
                    key={reservation.id}
                    value={reservation.id}
                  >
                    {reservation.reservation_code ??
                      reservation.id.slice(0, 10)}
                    {" — "}
                    {reservation.tour_title}
                    {" — "}
                    {reservation.full_name}
                    {" — "}
                    {reservation.tour_date}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="text-sm font-black">
                Araç
              </span>

              <select
                value={form.vehicle_id}
                onChange={(event) =>
                  updateForm(
                    "vehicle_id",
                    event.target.value
                  )
                }
                className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
              >
                <option value="">Araç seçin</option>

                {vehicles.map((vehicle) => (
                  <option
                    key={vehicle.id}
                    value={vehicle.id}
                  >
                    {vehicle.plate_number}
                    {" — "}
                    {vehicle.display_name || "TUROBUS Aracı"}
                    {" — "}
                    {vehicle.capacity} kişi
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="text-sm font-black">
                Rehber
              </span>

              <select
                value={form.guide_id}
                onChange={(event) =>
                  updateForm(
                    "guide_id",
                    event.target.value
                  )
                }
                className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
              >
                <option value="">Rehber seçin</option>

                {guides.map((guide) => (
                  <option
                    key={guide.id}
                    value={guide.id}
                  >
                    {guide.full_name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="text-sm font-black">
                Şoför
              </span>

              <select
                value={form.driver_id}
                onChange={(event) =>
                  updateForm(
                    "driver_id",
                    event.target.value
                  )
                }
                className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
              >
                <option value="">Şoför seçin</option>

                {drivers.map((driver) => (
                  <option
                    key={driver.id}
                    value={driver.id}
                  >
                    {driver.full_name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="text-sm font-black">
                Görev durumu
              </span>

              <select
                value={form.assignment_status}
                onChange={(event) =>
                  updateForm(
                    "assignment_status",
                    event.target.value as AssignmentStatus
                  )
                }
                className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
              >
                {Object.entries(statusLabels).map(
                  ([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  )
                )}
              </select>
            </label>

            <label>
              <span className="text-sm font-black">
                Planlanan başlangıç
              </span>

              <input
                type="datetime-local"
                value={form.planned_start_at}
                onChange={(event) =>
                  updateForm(
                    "planned_start_at",
                    event.target.value
                  )
                }
                className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
              />
            </label>

            <label>
              <span className="text-sm font-black">
                Planlanan bitiş
              </span>

              <input
                type="datetime-local"
                value={form.planned_end_at}
                onChange={(event) =>
                  updateForm(
                    "planned_end_at",
                    event.target.value
                  )
                }
                className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
              />
            </label>

            <label>
              <span className="text-sm font-black">
                Pickup noktası
              </span>

              <input
                value={form.pickup_point}
                onChange={(event) =>
                  updateForm(
                    "pickup_point",
                    event.target.value
                  )
                }
                placeholder="Örnek: Liberty Hotel"
                className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
              />
            </label>

            <label>
              <span className="text-sm font-black">
                Destinasyon
              </span>

              <input
                value={form.destination_name}
                onChange={(event) =>
                  updateForm(
                    "destination_name",
                    event.target.value
                  )
                }
                placeholder="Örnek: Saklıkent Kanyonu"
                className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
              />
            </label>

            <label className="md:col-span-2 xl:col-span-3">
              <span className="text-sm font-black">
                Operasyon notu
              </span>

              <textarea
                rows={4}
                value={form.notes}
                onChange={(event) =>
                  updateForm("notes", event.target.value)
                }
                placeholder="Görevle ilgili operasyon notları"
                className="mt-2 w-full rounded-2xl bg-white px-5 py-4 font-bold text-slate-950 outline-none"
              />
            </label>

            <div className="flex gap-3 md:col-span-2 xl:col-span-3">
              <button
                type="submit"
                disabled={saving}
                className="min-h-14 rounded-2xl bg-orange-500 px-7 font-black disabled:opacity-50"
              >
                {saving
                  ? "Kaydediliyor..."
                  : editingId
                    ? "Görevi Güncelle"
                    : "Görevi Kaydet"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="min-h-14 rounded-2xl border border-white/10 bg-white/[0.04] px-7 font-black"
                >
                  İptal
                </button>
              )}
            </div>
          </form>

          {successMessage && (
            <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 font-bold text-emerald-400">
              {successMessage}
            </div>
          )}

          {errorMessage && (
            <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 font-bold text-red-400">
              {errorMessage}
            </div>
          )}
        </section>

        <section className="mt-8">
          <label className="flex min-h-14 items-center gap-3 rounded-2xl bg-white px-5">
            <FaSearch className="text-orange-500" />

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Tur, misafir, araç, rehber veya şoför ara"
              className="w-full bg-transparent font-bold text-slate-950 outline-none"
            />
          </label>

          <div className="mt-6 grid gap-5 xl:grid-cols-2">
            {filteredAssignments.map((assignment) => (
              <article
                key={assignment.id}
                className="rounded-[30px] border border-white/10 bg-slate-900 p-6"
              >
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-400">
                      {assignment.reservation
                        ?.reservation_code ??
                        assignment.reservation_id.slice(
                          0,
                          10
                        )}
                    </p>

                    <h2 className="mt-2 text-2xl font-black">
                      {assignment.reservation?.tour_title ??
                        "Operasyon Görevi"}
                    </h2>

                    <p className="mt-2 text-slate-400">
                      {assignment.reservation?.full_name}
                      {" · "}
                      {assignment.reservation?.guests} kişi
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1.5 text-xs font-black ${statusClasses(
                      assignment.assignment_status
                    )}`}
                  >
                    {statusLabels[
                      assignment.assignment_status
                    ]}
                  </span>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-slate-950 p-4">
                    <p className="flex items-center gap-2 text-xs text-slate-500">
                      <FaBus className="text-orange-400" />
                      Araç
                    </p>

                    <p className="mt-2 font-black">
                      {assignment.vehicle
                        ? `${
                            assignment.vehicle
                              .plate_number
                          } · ${
                            assignment.vehicle
                              .display_name ||
                            "TUROBUS Aracı"
                          }`
                        : "Atanmadı"}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-950 p-4">
                    <p className="flex items-center gap-2 text-xs text-slate-500">
                      <FaUserTie className="text-orange-400" />
                      Rehber
                    </p>

                    <p className="mt-2 font-black">
                      {assignment.guide?.full_name ??
                        "Atanmadı"}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-950 p-4">
                    <p className="flex items-center gap-2 text-xs text-slate-500">
                      <FaUserTie className="text-orange-400" />
                      Şoför
                    </p>

                    <p className="mt-2 font-black">
                      {assignment.driver?.full_name ??
                        "Atanmadı"}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-950 p-4">
                    <p className="flex items-center gap-2 text-xs text-slate-500">
                      <FaCalendarAlt className="text-orange-400" />
                      Başlangıç
                    </p>

                    <p className="mt-2 font-black">
                      {assignment.planned_start_at
                        ? new Date(
                            assignment.planned_start_at
                          ).toLocaleString("tr-TR")
                        : "Belirlenmedi"}
                    </p>
                  </div>
                </div>

                {(assignment.pickup_point ||
                  assignment.destination_name) && (
                  <div className="mt-4 rounded-2xl bg-slate-950 p-4">
                    <p className="flex items-center gap-2 text-xs text-slate-500">
                      <FaMapMarkerAlt className="text-orange-400" />
                      Rota
                    </p>

                    <p className="mt-2 font-black">
                      {assignment.pickup_point ||
                        "Pickup belirtilmedi"}
                      {" → "}
                      {assignment.destination_name ||
                        "Destinasyon belirtilmedi"}
                    </p>
                  </div>
                )}

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      editAssignment(assignment)
                    }
                    className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-orange-500 font-black"
                  >
                    <FaEdit />
                    Düzenle
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      deleteAssignment(assignment)
                    }
                    className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 font-black text-red-400"
                  >
                    <FaTrash />
                    Sil
                  </button>
                </div>
              </article>
            ))}
          </div>

          {filteredAssignments.length === 0 && (
            <div className="mt-6 rounded-3xl border border-white/10 bg-slate-900 p-10 text-center text-slate-400">
              Henüz görev ataması bulunmuyor.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
