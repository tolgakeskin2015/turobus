"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  CurrentMembership,
  getCurrentMembership,
} from "@/lib/current-user";

type SupplierOption = {
  id: string;
  name: string;
  supplier_type: string;
};

type Activity = {
  id: string;
  company_id: string;
  supplier_id: string | null;
  name: string;
  category: string;
  city: string | null;
  district: string | null;
  description: string | null;
  cover_image_url: string | null;
  video_url: string | null;
  pricing_unit:
    | "per_person"
    | "per_couple"
    | "per_vehicle"
    | "per_group"
    | "fixed";
  default_cost: number;
  default_sale_price: number | null;
  currency: string;
  duration_minutes: number | null;
  requires_slot: boolean;
  is_active: boolean;
};

type ActivitySlot = {
  id: string;
  activity_id: string;
  supplier_id: string | null;
  slot_date: string;
  start_time: string | null;
  capacity: number;
  reserved_count: number;
  cost: number | null;
  sale_price: number | null;
  currency: string;
  status:
    | "open"
    | "closed"
    | "full"
    | "cancelled";
};

type ActivityForm = {
  supplier_id: string;
  name: string;
  category: string;
  city: string;
  district: string;
  description: string;
  cover_image_url: string;
  video_url: string;
  pricing_unit:
    Activity["pricing_unit"];
  default_cost: string;
  default_sale_price: string;
  duration_minutes: string;
  requires_slot: boolean;
};

type SlotForm = {
  slot_date: string;
  start_time: string;
  capacity: string;
  cost: string;
  sale_price: string;
};

const emptyActivityForm: ActivityForm =
  {
    supplier_id: "",
    name: "",
    category: "activity",
    city: "",
    district: "",
    description: "",
    cover_image_url: "",
    video_url: "",
    pricing_unit: "per_person",
    default_cost: "0",
    default_sale_price: "",
    duration_minutes: "",
    requires_slot: true,
  };

const emptySlotForm: SlotForm = {
  slot_date: "",
  start_time: "",
  capacity: "0",
  cost: "",
  sale_price: "",
};

const pricingLabels: Record<
  Activity["pricing_unit"],
  string
> = {
  per_person: "Kişi Başı",
  per_couple: "Çift Başı",
  per_vehicle: "Araç Başı",
  per_group: "Grup Başı",
  fixed: "Sabit",
};

function numberValue(value: string) {
  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

function nullableNumber(
  value: string
) {
  if (!value.trim()) return null;

  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function money(value: number | null) {
  if (value === null) return "-";

  return new Intl.NumberFormat(
    "tr-TR",
    {
      style: "currency",
      currency: "TRY",
      maximumFractionDigits: 2,
    }
  ).format(Number(value));
}

export default function PackageActivitiesPage() {
  const [membership, setMembership] =
    useState<CurrentMembership | null>(
      null
    );

  const [activities, setActivities] =
    useState<Activity[]>([]);

  const [slots, setSlots] =
    useState<ActivitySlot[]>([]);

  const [suppliers, setSuppliers] =
    useState<SupplierOption[]>([]);

  const [
    selectedActivityId,
    setSelectedActivityId,
  ] = useState("");

  const [
    editingActivityId,
    setEditingActivityId,
  ] = useState("");

  const [
    editingSlotId,
    setEditingSlotId,
  ] = useState("");

  const [form, setForm] =
    useState<ActivityForm>(
      emptyActivityForm
    );

  const [slotForm, setSlotForm] =
    useState<SlotForm>(
      emptySlotForm
    );

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [savingSlot, setSavingSlot] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const loadSuppliers = useCallback(
    async (companyId: string) => {
      const { data, error } =
        await supabase
          .from("suppliers")
          .select(
            "id,name,supplier_type"
          )
          .eq("company_id", companyId)
          .eq("is_active", true)
          .order("name");

      if (error) {
        console.error(error);
        return;
      }

      setSuppliers(
        (data ?? []) as SupplierOption[]
      );
    },
    []
  );

  const loadActivities = useCallback(
    async (companyId: string) => {
      const { data, error } =
        await supabase
          .from("package_activities")
          .select(`
            id,
            company_id,
            supplier_id,
            name,
            category,
            city,
            district,
            description,
            cover_image_url,
            video_url,
            pricing_unit,
            default_cost,
            default_sale_price,
            currency,
            duration_minutes,
            requires_slot,
            is_active
          `)
          .eq("company_id", companyId)
          .order("name");

      if (error) {
        throw new Error(error.message);
      }

      setActivities(
        (data ?? []) as Activity[]
      );
    },
    []
  );

  const loadSlots = useCallback(
    async (
      companyId: string,
      activityId: string
    ) => {
      if (!activityId) {
        setSlots([]);
        return;
      }

      const { data, error } =
        await supabase
          .from(
            "package_activity_slots"
          )
          .select(`
            id,
            activity_id,
            supplier_id,
            slot_date,
            start_time,
            capacity,
            reserved_count,
            cost,
            sale_price,
            currency,
            status
          `)
          .eq("company_id", companyId)
          .eq(
            "activity_id",
            activityId
          )
          .order("slot_date")
          .order("start_time");

      if (error) {
        throw new Error(error.message);
      }

      setSlots(
        (data ?? []) as ActivitySlot[]
      );
    },
    []
  );

  useEffect(() => {
    async function initialize() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setErrorMessage(
            "Kullanıcı oturumu bulunamadı."
          );
          return;
        }

        const currentMembership =
          await getCurrentMembership(
            user.id
          );

        if (!currentMembership) {
          setErrorMessage(
            "Aktif şirket üyeliği bulunamadı."
          );
          return;
        }

        setMembership(
          currentMembership
        );

        await Promise.all([
          loadSuppliers(
            currentMembership.company_id
          ),
          loadActivities(
            currentMembership.company_id
          ),
        ]);
      } catch (error) {
        console.error(error);

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Aktiviteler yüklenemedi."
        );
      } finally {
        setLoading(false);
      }
    }

    void initialize();
  }, [
    loadActivities,
    loadSuppliers,
  ]);

  useEffect(() => {
    if (
      !membership ||
      !selectedActivityId
    ) {
      setSlots([]);
      return;
    }

    void loadSlots(
      membership.company_id,
      selectedActivityId
    );
  }, [
    membership,
    selectedActivityId,
    loadSlots,
  ]);

  const selectedActivity =
    activities.find(
      (activity) =>
        activity.id ===
        selectedActivityId
    ) ?? null;

  const filteredActivities =
    useMemo(() => {
      const query = search
        .trim()
        .toLocaleLowerCase("tr-TR");

      if (!query) {
        return activities;
      }

      return activities.filter(
        (activity) =>
          [
            activity.name,
            activity.category,
            activity.city,
            activity.district,
          ]
            .filter(Boolean)
            .some((value) =>
              String(value)
                .toLocaleLowerCase(
                  "tr-TR"
                )
                .includes(query)
            )
      );
    }, [activities, search]);

  async function saveActivity(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!membership) return;

    if (!form.name.trim()) {
      setErrorMessage(
        "Aktivite adı zorunludur."
      );
      return;
    }

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    const payload = {
      company_id:
        membership.company_id,
      supplier_id:
        form.supplier_id || null,
      name: form.name.trim(),
      category:
        form.category.trim() ||
        "activity",
      city:
        form.city.trim() || null,
      district:
        form.district.trim() || null,
      description:
        form.description.trim() ||
        null,
      cover_image_url:
        form.cover_image_url.trim() ||
        null,
      video_url:
        form.video_url.trim() ||
        null,
      pricing_unit:
        form.pricing_unit,
      default_cost:
        Math.max(
          0,
          numberValue(
            form.default_cost
          )
        ),
      default_sale_price:
        nullableNumber(
          form.default_sale_price
        ),
      duration_minutes:
        nullableNumber(
          form.duration_minutes
        ),
      requires_slot:
        form.requires_slot,
      currency: "TRY",
      is_active: true,
      updated_at:
        new Date().toISOString(),
    };

    const query =
      editingActivityId
        ? supabase
            .from(
              "package_activities"
            )
            .update(payload)
            .eq(
              "id",
              editingActivityId
            )
            .eq(
              "company_id",
              membership.company_id
            )
        : supabase
            .from(
              "package_activities"
            )
            .insert(payload);

    const { error } = await query;

    if (error) {
      setErrorMessage(
        error.message
      );
      setSaving(false);
      return;
    }

    await loadActivities(
      membership.company_id
    );

    setForm(
      emptyActivityForm
    );
    setEditingActivityId("");

    setSuccessMessage(
      editingActivityId
        ? "Aktivite güncellendi."
        : "Aktivite eklendi."
    );

    setSaving(false);
  }

  function editActivity(
    activity: Activity
  ) {
    setEditingActivityId(
      activity.id
    );

    setForm({
      supplier_id:
        activity.supplier_id ?? "",
      name: activity.name,
      category:
        activity.category,
      city: activity.city ?? "",
      district:
        activity.district ?? "",
      description:
        activity.description ?? "",
      cover_image_url:
        activity.cover_image_url ??
        "",
      video_url:
        activity.video_url ?? "",
      pricing_unit:
        activity.pricing_unit,
      default_cost:
        String(
          activity.default_cost
        ),
      default_sale_price:
        activity.default_sale_price ===
        null
          ? ""
          : String(
              activity.default_sale_price
            ),
      duration_minutes:
        activity.duration_minutes ===
        null
          ? ""
          : String(
              activity.duration_minutes
            ),
      requires_slot:
        activity.requires_slot,
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function saveSlot(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      !membership ||
      !selectedActivity
    ) {
      setErrorMessage(
        "Önce aktivite seçin."
      );
      return;
    }

    if (!slotForm.slot_date) {
      setErrorMessage(
        "Slot tarihi zorunludur."
      );
      return;
    }

    setSavingSlot(true);
    setErrorMessage("");
    setSuccessMessage("");

    const capacity =
      Math.max(
        0,
        numberValue(
          slotForm.capacity
        )
      );

    const payload = {
      company_id:
        membership.company_id,
      activity_id:
        selectedActivity.id,
      supplier_id:
        selectedActivity.supplier_id,
      slot_date:
        slotForm.slot_date,
      start_time:
        slotForm.start_time ||
        null,
      capacity,
      cost:
        nullableNumber(
          slotForm.cost
        ) ??
        selectedActivity.default_cost,
      sale_price:
        nullableNumber(
          slotForm.sale_price
        ) ??
        selectedActivity.default_sale_price,
      currency: "TRY",
      status:
        capacity === 0
          ? "closed"
          : "open",
      updated_at:
        new Date().toISOString(),
    };

    const query =
      editingSlotId
        ? supabase
            .from(
              "package_activity_slots"
            )
            .update(payload)
            .eq("id", editingSlotId)
            .eq(
              "company_id",
              membership.company_id
            )
        : supabase
            .from(
              "package_activity_slots"
            )
            .insert({
              ...payload,
              reserved_count: 0,
            });

    const { error } = await query;

    if (error) {
      setErrorMessage(
        error.message
      );
      setSavingSlot(false);
      return;
    }

    await loadSlots(
      membership.company_id,
      selectedActivity.id
    );

    setSlotForm(
      emptySlotForm
    );
    setEditingSlotId("");

    setSuccessMessage(
      editingSlotId
        ? "Slot güncellendi."
        : "Slot eklendi."
    );

    setSavingSlot(false);
  }

  function editSlot(
    slot: ActivitySlot
  ) {
    setEditingSlotId(slot.id);

    setSlotForm({
      slot_date:
        slot.slot_date,
      start_time:
        slot.start_time ?? "",
      capacity:
        String(slot.capacity),
      cost:
        slot.cost === null
          ? ""
          : String(slot.cost),
      sale_price:
        slot.sale_price === null
          ? ""
          : String(
              slot.sale_price
            ),
    });
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-10 text-white">
        Aktivite kataloğu yükleniyor...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 p-5 text-white md:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-400">
              TUROBUS PACKAGE OS
            </p>

            <h1 className="mt-3 text-4xl font-black">
              Aktivite Ürün Havuzu
            </h1>

            <p className="mt-3 text-slate-400">
              Tedarikçi, alış fiyatı,
              satış fiyatı, gün/saat
              ve müsaitlik kontenjanı.
            </p>
          </div>

          <Link
            href="/dashboard/package-os"
            className="rounded-xl border border-white/10 px-4 py-3 text-sm font-black"
          >
            ← Paket Merkezi
          </Link>
        </div>

        {errorMessage && (
          <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-300">
            {successMessage}
          </div>
        )}

        <div className="mt-8 grid gap-6 xl:grid-cols-[420px_1fr]">
          <form
            onSubmit={saveActivity}
            className="rounded-[28px] border border-white/10 bg-slate-900 p-6"
          >
            <p className="text-xs font-black uppercase tracking-wider text-orange-400">
              {editingActivityId
                ? "Aktivite Düzenle"
                : "Yeni Aktivite"}
            </p>

            <div className="mt-5 space-y-4">
              <input
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name:
                      event.target.value,
                  }))
                }
                placeholder="Aktivite adı"
                className="w-full rounded-xl border border-white/10 bg-slate-950 p-3"
              />

              <select
                value={
                  form.supplier_id
                }
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    supplier_id:
                      event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-white/10 bg-slate-950 p-3"
              >
                <option value="">
                  Tedarikçi seçilmedi
                </option>

                {suppliers.map(
                  (supplier) => (
                    <option
                      key={supplier.id}
                      value={supplier.id}
                    >
                      {supplier.name}
                    </option>
                  )
                )}
              </select>

              <input
                value={form.category}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    category:
                      event.target.value,
                  }))
                }
                placeholder="Kategori: activity, spa, transfer..."
                className="w-full rounded-xl border border-white/10 bg-slate-950 p-3"
              />

              <div className="grid grid-cols-2 gap-3">
                <input
                  value={form.city}
                  onChange={(event) =>
                    setForm(
                      (current) => ({
                        ...current,
                        city:
                          event.target
                            .value,
                      })
                    )
                  }
                  placeholder="Şehir"
                  className="rounded-xl border border-white/10 bg-slate-950 p-3"
                />

                <input
                  value={form.district}
                  onChange={(event) =>
                    setForm(
                      (current) => ({
                        ...current,
                        district:
                          event.target
                            .value,
                      })
                    )
                  }
                  placeholder="Bölge"
                  className="rounded-xl border border-white/10 bg-slate-950 p-3"
                />
              </div>

              <select
                value={
                  form.pricing_unit
                }
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    pricing_unit:
                      event.target
                        .value as Activity["pricing_unit"],
                  }))
                }
                className="w-full rounded-xl border border-white/10 bg-slate-950 p-3"
              >
                {Object.entries(
                  pricingLabels
                ).map(
                  ([value, label]) => (
                    <option
                      key={value}
                      value={value}
                    >
                      {label}
                    </option>
                  )
                )}
              </select>

              <div className="grid grid-cols-2 gap-3">
                <input
                  value={
                    form.default_cost
                  }
                  onChange={(event) =>
                    setForm(
                      (current) => ({
                        ...current,
                        default_cost:
                          event.target
                            .value,
                      })
                    )
                  }
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Alış fiyatı"
                  className="rounded-xl border border-white/10 bg-slate-950 p-3"
                />

                <input
                  value={
                    form.default_sale_price
                  }
                  onChange={(event) =>
                    setForm(
                      (current) => ({
                        ...current,
                        default_sale_price:
                          event.target
                            .value,
                      })
                    )
                  }
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Satış fiyatı"
                  className="rounded-xl border border-white/10 bg-slate-950 p-3"
                />
              </div>

              <input
                value={
                  form.duration_minutes
                }
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    duration_minutes:
                      event.target.value,
                  }))
                }
                type="number"
                min="0"
                placeholder="Süre (dakika)"
                className="w-full rounded-xl border border-white/10 bg-slate-950 p-3"
              />

              <textarea
                value={
                  form.description
                }
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description:
                      event.target.value,
                  }))
                }
                placeholder="Açıklama"
                className="min-h-24 w-full rounded-xl border border-white/10 bg-slate-950 p-3"
              />

              <input
                value={
                  form.cover_image_url
                }
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    cover_image_url:
                      event.target.value,
                  }))
                }
                placeholder="Görsel URL"
                className="w-full rounded-xl border border-white/10 bg-slate-950 p-3"
              />

              <input
                value={form.video_url}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    video_url:
                      event.target.value,
                  }))
                }
                placeholder="Video URL"
                className="w-full rounded-xl border border-white/10 bg-slate-950 p-3"
              />

              <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-950 p-3 text-sm">
                <input
                  type="checkbox"
                  checked={
                    form.requires_slot
                  }
                  onChange={(event) =>
                    setForm(
                      (current) => ({
                        ...current,
                        requires_slot:
                          event.target
                            .checked,
                      })
                    )
                  }
                />

                Saat / kontenjan seçimi
                gerekli
              </label>

              <button
                disabled={saving}
                className="w-full rounded-xl bg-orange-500 px-4 py-3 font-black text-black disabled:opacity-50"
              >
                {saving
                  ? "Kaydediliyor..."
                  : editingActivityId
                    ? "Aktiviteyi Güncelle"
                    : "Aktiviteyi Kaydet"}
              </button>

              {editingActivityId && (
                <button
                  type="button"
                  onClick={() => {
                    setForm(
                      emptyActivityForm
                    );
                    setEditingActivityId(
                      ""
                    );
                  }}
                  className="w-full rounded-xl border border-white/10 p-3"
                >
                  Vazgeç
                </button>
              )}
            </div>
          </form>

          <section>
            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Aktivite ara..."
              className="mb-4 w-full rounded-xl border border-white/10 bg-slate-900 p-4"
            />

            <div className="grid gap-4 md:grid-cols-2">
              {filteredActivities.map(
                (activity) => (
                  <div
                    key={activity.id}
                    className={`rounded-[24px] border p-5 ${
                      selectedActivityId ===
                      activity.id
                        ? "border-orange-500 bg-orange-500/5"
                        : "border-white/10 bg-slate-900"
                    }`}
                  >
                    <p className="text-xs font-black uppercase tracking-wider text-orange-400">
                      {
                        activity.category
                      }
                    </p>

                    <h2 className="mt-2 text-xl font-black">
                      {activity.name}
                    </h2>

                    <p className="mt-2 text-sm text-slate-400">
                      {
                        pricingLabels[
                          activity
                            .pricing_unit
                        ]
                      }
                    </p>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-slate-950 p-3">
                        <p className="text-[10px] uppercase text-slate-500">
                          Alış
                        </p>
                        <p className="font-black">
                          {money(
                            activity.default_cost
                          )}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-950 p-3">
                        <p className="text-[10px] uppercase text-slate-500">
                          Satış
                        </p>
                        <p className="font-black">
                          {money(
                            activity.default_sale_price
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedActivityId(
                            activity.id
                          )
                        }
                        className="rounded-xl bg-white px-3 py-2 text-xs font-black text-black"
                      >
                        Kontenjan
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          editActivity(
                            activity
                          )
                        }
                        className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black"
                      >
                        Düzenle
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          </section>
        </div>

        {selectedActivity && (
          <div className="mt-10 rounded-[30px] border border-white/10 bg-slate-900 p-6">
            <p className="text-xs font-black uppercase tracking-wider text-emerald-400">
              Canlı Müsaitlik
            </p>

            <h2 className="mt-2 text-2xl font-black">
              {selectedActivity.name}
            </h2>

            <form
              onSubmit={saveSlot}
              className="mt-6 grid gap-3 md:grid-cols-3 xl:grid-cols-6"
            >
              <input
                type="date"
                value={
                  slotForm.slot_date
                }
                onChange={(event) =>
                  setSlotForm(
                    (current) => ({
                      ...current,
                      slot_date:
                        event.target
                          .value,
                    })
                  )
                }
                className="rounded-xl border border-white/10 bg-slate-950 p-3"
              />

              <input
                type="time"
                value={
                  slotForm.start_time
                }
                onChange={(event) =>
                  setSlotForm(
                    (current) => ({
                      ...current,
                      start_time:
                        event.target
                          .value,
                    })
                  )
                }
                className="rounded-xl border border-white/10 bg-slate-950 p-3"
              />

              <input
                type="number"
                min="0"
                value={
                  slotForm.capacity
                }
                onChange={(event) =>
                  setSlotForm(
                    (current) => ({
                      ...current,
                      capacity:
                        event.target
                          .value,
                    })
                  )
                }
                placeholder="Kontenjan"
                className="rounded-xl border border-white/10 bg-slate-950 p-3"
              />

              <input
                type="number"
                min="0"
                step="0.01"
                value={slotForm.cost}
                onChange={(event) =>
                  setSlotForm(
                    (current) => ({
                      ...current,
                      cost:
                        event.target
                          .value,
                    })
                  )
                }
                placeholder="Slot alış"
                className="rounded-xl border border-white/10 bg-slate-950 p-3"
              />

              <input
                type="number"
                min="0"
                step="0.01"
                value={
                  slotForm.sale_price
                }
                onChange={(event) =>
                  setSlotForm(
                    (current) => ({
                      ...current,
                      sale_price:
                        event.target
                          .value,
                    })
                  )
                }
                placeholder="Slot satış"
                className="rounded-xl border border-white/10 bg-slate-950 p-3"
              />

              <button
                disabled={savingSlot}
                className="rounded-xl bg-emerald-500 p-3 font-black text-black disabled:opacity-50"
              >
                {savingSlot
                  ? "Kaydediliyor..."
                  : editingSlotId
                    ? "Güncelle"
                    : "Slot Ekle"}
              </button>
            </form>

            <div className="mt-7 overflow-x-auto">
              <table className="w-full min-w-[800px] text-sm">
                <thead className="text-left text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="p-3">
                      Tarih
                    </th>
                    <th className="p-3">
                      Saat
                    </th>
                    <th className="p-3">
                      Kontenjan
                    </th>
                    <th className="p-3">
                      Rezerve
                    </th>
                    <th className="p-3">
                      Kalan
                    </th>
                    <th className="p-3">
                      Alış
                    </th>
                    <th className="p-3">
                      Durum
                    </th>
                    <th className="p-3">
                      İşlem
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {slots.map((slot) => (
                    <tr
                      key={slot.id}
                      className="border-t border-white/5"
                    >
                      <td className="p-3 font-black">
                        {slot.slot_date}
                      </td>

                      <td className="p-3">
                        {slot.start_time
                          ?.slice(0, 5) ??
                          "-"}
                      </td>

                      <td className="p-3">
                        {slot.capacity}
                      </td>

                      <td className="p-3">
                        {
                          slot.reserved_count
                        }
                      </td>

                      <td className="p-3 font-black text-emerald-400">
                        {Math.max(
                          0,
                          slot.capacity -
                            slot.reserved_count
                        )}
                      </td>

                      <td className="p-3">
                        {money(slot.cost)}
                      </td>

                      <td className="p-3">
                        {slot.status}
                      </td>

                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() =>
                            editSlot(slot)
                          }
                          className="rounded-lg border border-white/10 px-3 py-2 text-xs font-black"
                        >
                          Düzenle
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
