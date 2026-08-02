"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  FaBus,
  FaCar,
  FaEdit,
  FaPlus,
  FaSearch,
  FaTrash,
  FaWrench,
} from "react-icons/fa";
import { supabase } from "@/lib/supabase";
import {
  CurrentMembership,
  getCurrentMembership,
} from "@/lib/current-user";

type VehicleType =
  | "car"
  | "van"
  | "minibus"
  | "bus"
  | "jeep"
  | "boat"
  | "other";

type VehicleStatus =
  | "available"
  | "assigned"
  | "in_service"
  | "maintenance"
  | "inactive";

type Vehicle = {
  id: string;
  company_id: string;
  plate_number: string;
  display_name: string | null;
  brand: string | null;
  model: string | null;
  model_year: number | null;
  capacity: number;
  vehicle_type: VehicleType;
  status: VehicleStatus;
  current_odometer_km: number | null;
  next_maintenance_km: number | null;
  insurance_expiry_date: string | null;
  inspection_expiry_date: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
};

type VehicleForm = {
  plate_number: string;
  display_name: string;
  brand: string;
  model: string;
  model_year: string;
  capacity: string;
  vehicle_type: VehicleType;
  status: VehicleStatus;
  current_odometer_km: string;
  next_maintenance_km: string;
  insurance_expiry_date: string;
  inspection_expiry_date: string;
  notes: string;
  is_active: boolean;
};

const emptyForm: VehicleForm = {
  plate_number: "",
  display_name: "",
  brand: "",
  model: "",
  model_year: "",
  capacity: "19",
  vehicle_type: "minibus",
  status: "available",
  current_odometer_km: "",
  next_maintenance_km: "",
  insurance_expiry_date: "",
  inspection_expiry_date: "",
  notes: "",
  is_active: true,
};

const vehicleTypeLabels: Record<VehicleType, string> = {
  car: "Otomobil",
  van: "Van",
  minibus: "Minibüs",
  bus: "Otobüs",
  jeep: "Jeep",
  boat: "Tekne",
  other: "Diğer",
};

const vehicleStatusLabels: Record<VehicleStatus, string> = {
  available: "Müsait",
  assigned: "Görev Atandı",
  in_service: "Operasyonda",
  maintenance: "Bakımda",
  inactive: "Pasif",
};

function statusClasses(status: VehicleStatus) {
  if (status === "available") {
    return "bg-emerald-500/15 text-emerald-400";
  }

  if (status === "in_service") {
    return "bg-blue-500/15 text-blue-400";
  }

  if (status === "assigned") {
    return "bg-violet-500/15 text-violet-400";
  }

  if (status === "maintenance") {
    return "bg-amber-500/15 text-amber-400";
  }

  return "bg-slate-500/15 text-slate-400";
}

function numberOrNull(value: string) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

export default function VehiclesPage() {
  const [membership, setMembership] =
    useState<CurrentMembership | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [form, setForm] = useState<VehicleForm>(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadVehicles = useCallback(async (companyId: string) => {
    setErrorMessage("");

    const { data, error } = await supabase
      .from("vehicles")
      .select(
        "id, company_id, plate_number, display_name, brand, model, model_year, capacity, vehicle_type, status, current_odometer_km, next_maintenance_km, insurance_expiry_date, inspection_expiry_date, notes, is_active, created_at"
      )
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setErrorMessage(error.message);
      return;
    }

    setVehicles((data ?? []) as Vehicle[]);
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
        await loadVehicles(currentMembership.company_id);
      } catch (error) {
        console.error(error);
        setErrorMessage("Araç verileri hazırlanamadı.");
      } finally {
        setLoading(false);
      }
    }

    void initialize();
  }, [loadVehicles]);

  const filteredVehicles = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("tr-TR");

    if (!query) return vehicles;

    return vehicles.filter((vehicle) =>
      [
        vehicle.plate_number,
        vehicle.display_name,
        vehicle.brand,
        vehicle.model,
        vehicleTypeLabels[vehicle.vehicle_type],
        vehicleStatusLabels[vehicle.status],
      ]
        .filter(Boolean)
        .some((value) =>
          String(value)
            .toLocaleLowerCase("tr-TR")
            .includes(query)
        )
    );
  }, [search, vehicles]);

  function updateForm<K extends keyof VehicleForm>(
    key: K,
    value: VehicleForm[K]
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

  function editVehicle(vehicle: Vehicle) {
    setEditingId(vehicle.id);

    setForm({
      plate_number: vehicle.plate_number,
      display_name: vehicle.display_name ?? "",
      brand: vehicle.brand ?? "",
      model: vehicle.model ?? "",
      model_year: vehicle.model_year?.toString() ?? "",
      capacity: vehicle.capacity.toString(),
      vehicle_type: vehicle.vehicle_type,
      status: vehicle.status,
      current_odometer_km:
        vehicle.current_odometer_km?.toString() ?? "",
      next_maintenance_km:
        vehicle.next_maintenance_km?.toString() ?? "",
      insurance_expiry_date:
        vehicle.insurance_expiry_date ?? "",
      inspection_expiry_date:
        vehicle.inspection_expiry_date ?? "",
      notes: vehicle.notes ?? "",
      is_active: vehicle.is_active,
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function saveVehicle(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!membership) return;

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    const payload = {
      company_id: membership.company_id,
      plate_number: form.plate_number.trim().toUpperCase(),
      display_name: form.display_name.trim() || null,
      brand: form.brand.trim() || null,
      model: form.model.trim() || null,
      model_year: numberOrNull(form.model_year),
      capacity: Math.max(1, Number(form.capacity) || 1),
      vehicle_type: form.vehicle_type,
      status: form.status,
      current_odometer_km:
        numberOrNull(form.current_odometer_km),
      next_maintenance_km:
        numberOrNull(form.next_maintenance_km),
      insurance_expiry_date:
        form.insurance_expiry_date || null,
      inspection_expiry_date:
        form.inspection_expiry_date || null,
      notes: form.notes.trim() || null,
      is_active: form.is_active,
      updated_at: new Date().toISOString(),
    };

    try {
      if (editingId) {
        const { error } = await supabase
          .from("vehicles")
          .update(payload)
          .eq("id", editingId)
          .eq("company_id", membership.company_id);

        if (error) throw error;

        setSuccessMessage("Araç başarıyla güncellendi.");
      } else {
        const { error } = await supabase
          .from("vehicles")
          .insert(payload);

        if (error) throw error;

        setSuccessMessage("Yeni araç başarıyla eklendi.");
      }

      await loadVehicles(membership.company_id);
      setForm(emptyForm);
      setEditingId("");
    } catch (error) {
      console.error(error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Araç kaydedilemedi."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteVehicle(vehicle: Vehicle) {
    if (!membership) return;

    const confirmed = window.confirm(
      `${vehicle.plate_number} plakalı aracı silmek istediğinize emin misiniz?`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("vehicles")
      .delete()
      .eq("id", vehicle.id)
      .eq("company_id", membership.company_id);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setSuccessMessage("Araç silindi.");
    await loadVehicles(membership.company_id);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-10 text-white">
        Araçlar yükleniyor...
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
            Araç Yönetimi
          </h1>

          <p className="mt-4 max-w-3xl text-slate-400">
            Filo araçlarını, kapasitelerini, bakım durumlarını ve operasyon
            uygunluklarını tek ekrandan yönetin.
          </p>
        </header>

        <section className="mt-9 rounded-[32px] border border-white/10 bg-slate-900 p-6 lg:p-8">
          <div className="flex items-center gap-3">
            <FaPlus className="text-orange-400" />

            <h2 className="text-2xl font-black">
              {editingId ? "Aracı Düzenle" : "Yeni Araç Ekle"}
            </h2>
          </div>

          <form
            onSubmit={saveVehicle}
            className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-4"
          >
            <label>
              <span className="text-sm font-black">Plaka</span>
              <input
                required
                value={form.plate_number}
                onChange={(event) =>
                  updateForm("plate_number", event.target.value)
                }
                placeholder="48 ABC 123"
                className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
              />
            </label>

            <label>
              <span className="text-sm font-black">
                Araç adı
              </span>
              <input
                value={form.display_name}
                onChange={(event) =>
                  updateForm("display_name", event.target.value)
                }
                placeholder="Araç 01"
                className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
              />
            </label>

            <label>
              <span className="text-sm font-black">Marka</span>
              <input
                value={form.brand}
                onChange={(event) =>
                  updateForm("brand", event.target.value)
                }
                placeholder="Mercedes"
                className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
              />
            </label>

            <label>
              <span className="text-sm font-black">Model</span>
              <input
                value={form.model}
                onChange={(event) =>
                  updateForm("model", event.target.value)
                }
                placeholder="Sprinter"
                className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
              />
            </label>

            <label>
              <span className="text-sm font-black">
                Model yılı
              </span>
              <input
                type="number"
                min="1950"
                max="2100"
                value={form.model_year}
                onChange={(event) =>
                  updateForm("model_year", event.target.value)
                }
                className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
              />
            </label>

            <label>
              <span className="text-sm font-black">Kapasite</span>
              <input
                type="number"
                min="1"
                required
                value={form.capacity}
                onChange={(event) =>
                  updateForm("capacity", event.target.value)
                }
                className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
              />
            </label>

            <label>
              <span className="text-sm font-black">
                Araç türü
              </span>
              <select
                value={form.vehicle_type}
                onChange={(event) =>
                  updateForm(
                    "vehicle_type",
                    event.target.value as VehicleType
                  )
                }
                className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
              >
                {Object.entries(vehicleTypeLabels).map(
                  ([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  )
                )}
              </select>
            </label>

            <label>
              <span className="text-sm font-black">Durum</span>
              <select
                value={form.status}
                onChange={(event) =>
                  updateForm(
                    "status",
                    event.target.value as VehicleStatus
                  )
                }
                className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
              >
                {Object.entries(vehicleStatusLabels).map(
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
                Güncel kilometre
              </span>
              <input
                type="number"
                min="0"
                value={form.current_odometer_km}
                onChange={(event) =>
                  updateForm(
                    "current_odometer_km",
                    event.target.value
                  )
                }
                className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
              />
            </label>

            <label>
              <span className="text-sm font-black">
                Sonraki bakım km
              </span>
              <input
                type="number"
                min="0"
                value={form.next_maintenance_km}
                onChange={(event) =>
                  updateForm(
                    "next_maintenance_km",
                    event.target.value
                  )
                }
                className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
              />
            </label>

            <label>
              <span className="text-sm font-black">
                Sigorta bitiş
              </span>
              <input
                type="date"
                value={form.insurance_expiry_date}
                onChange={(event) =>
                  updateForm(
                    "insurance_expiry_date",
                    event.target.value
                  )
                }
                className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
              />
            </label>

            <label>
              <span className="text-sm font-black">
                Muayene bitiş
              </span>
              <input
                type="date"
                value={form.inspection_expiry_date}
                onChange={(event) =>
                  updateForm(
                    "inspection_expiry_date",
                    event.target.value
                  )
                }
                className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
              />
            </label>

            <label className="md:col-span-2 xl:col-span-4">
              <span className="text-sm font-black">Notlar</span>
              <textarea
                rows={4}
                value={form.notes}
                onChange={(event) =>
                  updateForm("notes", event.target.value)
                }
                placeholder="Araçla ilgili operasyon veya bakım notları"
                className="mt-2 w-full rounded-2xl bg-white px-5 py-4 font-bold text-slate-950 outline-none"
              />
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) =>
                  updateForm("is_active", event.target.checked)
                }
                className="h-5 w-5"
              />
              <span className="text-sm font-black">
                Araç aktif
              </span>
            </label>

            <div className="flex gap-3 md:col-span-2 xl:col-span-4">
              <button
                type="submit"
                disabled={saving}
                className="min-h-14 rounded-2xl bg-orange-500 px-7 font-black disabled:opacity-50"
              >
                {saving
                  ? "Kaydediliyor..."
                  : editingId
                    ? "Aracı Güncelle"
                    : "Aracı Kaydet"}
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
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Plaka, araç adı, marka veya model ara"
              className="w-full bg-transparent font-bold text-slate-950 outline-none"
            />
          </label>

          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredVehicles.map((vehicle) => {
              const maintenanceRemaining =
                vehicle.current_odometer_km !== null &&
                vehicle.next_maintenance_km !== null
                  ? vehicle.next_maintenance_km -
                    vehicle.current_odometer_km
                  : null;

              return (
                <article
                  key={vehicle.id}
                  className="rounded-[30px] border border-white/10 bg-slate-900 p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/15 text-orange-400">
                      {vehicle.vehicle_type === "car" ? (
                        <FaCar size={24} />
                      ) : (
                        <FaBus size={24} />
                      )}
                    </div>

                    <span
                      className={`rounded-full px-3 py-1.5 text-xs font-black ${statusClasses(
                        vehicle.status
                      )}`}
                    >
                      {vehicleStatusLabels[vehicle.status]}
                    </span>
                  </div>

                  <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-orange-400">
                    {vehicle.display_name || "TUROBUS Aracı"}
                  </p>

                  <h2 className="mt-2 text-2xl font-black">
                    {vehicle.plate_number}
                  </h2>

                  <p className="mt-2 text-slate-400">
                    {[vehicle.brand, vehicle.model]
                      .filter(Boolean)
                      .join(" ") || vehicleTypeLabels[vehicle.vehicle_type]}
                  </p>

                  <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl bg-slate-950 p-4">
                      <p className="text-slate-500">Kapasite</p>
                      <p className="mt-1 font-black">
                        {vehicle.capacity} kişi
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-950 p-4">
                      <p className="text-slate-500">Kilometre</p>
                      <p className="mt-1 font-black">
                        {vehicle.current_odometer_km !== null
                          ? vehicle.current_odometer_km.toLocaleString(
                              "tr-TR"
                            )
                          : "Bilinmiyor"}
                      </p>
                    </div>
                  </div>

                  {maintenanceRemaining !== null && (
                    <div
                      className={`mt-4 flex items-center gap-3 rounded-2xl p-4 ${
                        maintenanceRemaining <= 500
                          ? "bg-red-500/10 text-red-400"
                          : maintenanceRemaining <= 1500
                            ? "bg-amber-500/10 text-amber-400"
                            : "bg-emerald-500/10 text-emerald-400"
                      }`}
                    >
                      <FaWrench />
                      <span className="text-sm font-black">
                        {maintenanceRemaining > 0
                          ? `Bakıma ${maintenanceRemaining.toLocaleString(
                              "tr-TR"
                            )} km`
                          : "Bakım zamanı geçti"}
                      </span>
                    </div>
                  )}

                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => editVehicle(vehicle)}
                      className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-orange-500 font-black"
                    >
                      <FaEdit />
                      Düzenle
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteVehicle(vehicle)}
                      className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 font-black text-red-400"
                    >
                      <FaTrash />
                      Sil
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          {filteredVehicles.length === 0 && (
            <div className="mt-6 rounded-3xl border border-white/10 bg-slate-900 p-10 text-center text-slate-400">
              Henüz araç kaydı bulunmuyor.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
