"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  FaCalendarAlt,
  FaEdit,
  FaUsers,
} from "react-icons/fa";
import { supabase } from "@/lib/supabase";
import {
  CurrentMembership,
  getCurrentMembership,
} from "@/lib/current-user";
import SeasonForm from "@/components/hotel/revenue/SeasonForm";
import OccupancyRuleForm from "@/components/hotel/revenue/OccupancyRuleForm";
import ChildRuleForm from "@/components/hotel/revenue/ChildRuleForm";
import {
  SeasonFormState,
  OccupancyRuleFormState,
  ChildRuleFormState,
  emptySeasonForm,
  emptyOccupancyRuleForm,
  emptyChildRuleForm,
  adjustmentTypeLabels,
  occupancyPricingMethodLabels,
  childPricingMethodLabels,
} from "@/components/hotel/revenue/types";

type HotelOption = {
  id: string;
  name: string;
};

type RoomTypeOption = {
  id: string;
  hotel_id: string;
  name: string;
};

type Season = {
  id: string;
  company_id: string;
  hotel_id: string;
  name: string;
  start_date: string;
  end_date: string;
  adjustment_type: SeasonFormState["adjustment_type"];
  adjustment_value: number;
  priority: number;
  is_active: boolean;
  hotel:
    | {
        id: string;
        name: string;
      }
    | {
        id: string;
        name: string;
      }[]
    | null;
};

type RatePlanOption = {
  id: string;
  hotel_id: string;
  room_type_id: string | null;
  name: string;
};

type ChildRule = {
  id: string;
  company_id: string;
  hotel_id: string;
  room_type_id: string | null;
  rate_plan_id: string | null;
  name: string;
  minimum_age: number;
  maximum_age: number;
  pricing_method: ChildRuleFormState["pricing_method"];
  pricing_value: number;
  maximum_children: number | null;
  priority: number;
  is_active: boolean;
  hotel:
    | {
        id: string;
        name: string;
      }
    | {
        id: string;
        name: string;
      }[]
    | null;
  room_type:
    | {
        id: string;
        name: string;
      }
    | {
        id: string;
        name: string;
      }[]
    | null;
  rate_plan:
    | {
        id: string;
        name: string;
      }
    | {
        id: string;
        name: string;
      }[]
    | null;
};

type OccupancyRule = {
  id: string;
  company_id: string;
  hotel_id: string;
  room_type_id: string;
  adults: number;
  children: number;
  pricing_method:
    OccupancyRuleFormState["pricing_method"];
  pricing_value: number;
  extra_adult_price: number | null;
  extra_child_price: number | null;
  minimum_occupancy: number;
  maximum_occupancy: number;
  priority: number;
  is_active: boolean;
  hotel:
    | {
        id: string;
        name: string;
      }
    | {
        id: string;
        name: string;
      }[]
    | null;
  room_type:
    | {
        id: string;
        name: string;
      }
    | {
        id: string;
        name: string;
      }[]
    | null;
};

function firstRelation<T>(
  value: T | T[] | null | undefined
) {
  if (!value) return null;
  return Array.isArray(value)
    ? value[0] ?? null
    : value;
}

export default function RevenueManagementPage() {
  const [membership, setMembership] =
    useState<CurrentMembership | null>(null);

  const [hotels, setHotels] =
    useState<HotelOption[]>([]);

  const [roomTypes, setRoomTypes] =
    useState<RoomTypeOption[]>([]);

  const [seasons, setSeasons] =
    useState<Season[]>([]);

  const [occupancyRules, setOccupancyRules] =
    useState<OccupancyRule[]>([]);

  const [ratePlans, setRatePlans] =
    useState<RatePlanOption[]>([]);

  const [childRules, setChildRules] =
    useState<ChildRule[]>([]);

  const [seasonForm, setSeasonForm] =
    useState<SeasonFormState>(emptySeasonForm);

  const [occupancyForm, setOccupancyForm] =
    useState<OccupancyRuleFormState>(
      emptyOccupancyRuleForm
    );

  const [childForm, setChildForm] =
    useState<ChildRuleFormState>(
      emptyChildRuleForm
    );

  const [editingSeasonId, setEditingSeasonId] =
    useState("");

  const [
    editingOccupancyRuleId,
    setEditingOccupancyRuleId,
  ] = useState("");

  const [
    editingChildRuleId,
    setEditingChildRuleId,
  ] = useState("");

  const [savingSeason, setSavingSeason] =
    useState(false);

  const [savingOccupancyRule, setSavingOccupancyRule] =
    useState(false);

  const [savingChildRule, setSavingChildRule] =
    useState(false);

  const [loading, setLoading] = useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const loadData = useCallback(
    async (companyId: string) => {
      const [
        { data: hotelData, error: hotelError },
        { data: roomTypeData, error: roomTypeError },
        { data: seasonData, error: seasonError },
        {
          data: occupancyRuleData,
          error: occupancyRuleError,
        },
        {
          data: ratePlanData,
          error: ratePlanError,
        },
        {
          data: childRuleData,
          error: childRuleError,
        },
      ] = await Promise.all([
        supabase
          .from("hotels")
          .select("id, name")
          .eq("company_id", companyId)
          .eq("is_active", true)
          .order("name"),

        supabase
          .from("hotel_room_types")
          .select("id, hotel_id, name")
          .eq("company_id", companyId)
          .eq("is_active", true)
          .order("name"),

        supabase
          .from("hotel_seasons")
          .select(`
            id,
            company_id,
            hotel_id,
            name,
            start_date,
            end_date,
            adjustment_type,
            adjustment_value,
            priority,
            is_active,
            hotel:hotels (
              id,
              name
            )
          `)
          .eq("company_id", companyId)
          .order("priority")
          .order("start_date"),

        supabase
          .from("hotel_occupancy_rules")
          .select(`
            id,
            company_id,
            hotel_id,
            room_type_id,
            adults,
            children,
            pricing_method,
            pricing_value,
            extra_adult_price,
            extra_child_price,
            minimum_occupancy,
            maximum_occupancy,
            priority,
            is_active,
            hotel:hotels (
              id,
              name
            ),
            room_type:hotel_room_types (
              id,
              name
            )
          `)
          .eq("company_id", companyId)
          .order("priority")
          .order("adults"),

        supabase
          .from("hotel_rate_plans")
          .select("id, hotel_id, room_type_id, name")
          .eq("company_id", companyId)
          .eq("is_active", true)
          .order("name"),

        supabase
          .from("hotel_child_rules")
          .select(`
            id,
            company_id,
            hotel_id,
            room_type_id,
            rate_plan_id,
            name,
            minimum_age,
            maximum_age,
            pricing_method,
            pricing_value,
            maximum_children,
            priority,
            is_active,
            hotel:hotels (
              id,
              name
            ),
            room_type:hotel_room_types (
              id,
              name
            ),
            rate_plan:hotel_rate_plans (
              id,
              name
            )
          `)
          .eq("company_id", companyId)
          .order("priority")
          .order("minimum_age"),
      ]);

      const error =
        hotelError ??
        roomTypeError ??
        seasonError ??
        occupancyRuleError ??
        ratePlanError ??
        childRuleError;

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setHotels(
        (hotelData ?? []) as HotelOption[]
      );

      setRoomTypes(
        (roomTypeData ?? []) as RoomTypeOption[]
      );

      setSeasons(
        (seasonData ?? []) as unknown as Season[]
      );

      setOccupancyRules(
        (occupancyRuleData ??
          []) as unknown as OccupancyRule[]
      );

      setRatePlans(
        (ratePlanData ?? []) as RatePlanOption[]
      );

      setChildRules(
        (childRuleData ?? []) as unknown as ChildRule[]
      );
    },
    []
  );

  useEffect(() => {
    async function initialize() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setErrorMessage(
          "Kullanıcı oturumu bulunamadı."
        );
        setLoading(false);
        return;
      }

      const currentMembership =
        await getCurrentMembership(user.id);

      if (!currentMembership) {
        setErrorMessage(
          "Aktif şirket üyeliği bulunamadı."
        );
        setLoading(false);
        return;
      }

      setMembership(currentMembership);

      await loadData(
        currentMembership.company_id
      );

      setLoading(false);
    }

    void initialize();
  }, [loadData]);

  function updateSeasonForm<
    K extends keyof SeasonFormState
  >(
    key: K,
    value: SeasonFormState[K]
  ) {
    setSeasonForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateOccupancyForm<
    K extends keyof OccupancyRuleFormState
  >(
    key: K,
    value: OccupancyRuleFormState[K]
  ) {
    setOccupancyForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function resetSeasonForm() {
    setSeasonForm(emptySeasonForm);
    setEditingSeasonId("");
  }

  function resetOccupancyForm() {
    setOccupancyForm(
      emptyOccupancyRuleForm
    );
    setEditingOccupancyRuleId("");
  }
  function updateChildForm<
    K extends keyof ChildRuleFormState
  >(
    key: K,
    value: ChildRuleFormState[K]
  ) {
    setChildForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function resetChildForm() {
    setChildForm(emptyChildRuleForm);
    setEditingChildRuleId("");
  }


  function editSeason(season: Season) {
    setEditingSeasonId(season.id);

    setSeasonForm({
      hotel_id: season.hotel_id,
      name: season.name,
      start_date: season.start_date,
      end_date: season.end_date,
      adjustment_type:
        season.adjustment_type,
      adjustment_value: String(
        season.adjustment_value
      ),
      priority: String(season.priority),
      is_active: season.is_active,
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function editOccupancyRule(
    rule: OccupancyRule
  ) {
    setEditingOccupancyRuleId(rule.id);

    setOccupancyForm({
      hotel_id: rule.hotel_id,
      room_type_id: rule.room_type_id,
      adults: String(rule.adults),
      children: String(rule.children),
      pricing_method:
        rule.pricing_method,
      pricing_value: String(
        rule.pricing_value
      ),
      extra_adult_price:
        rule.extra_adult_price?.toString() ??
        "",
      extra_child_price:
        rule.extra_child_price?.toString() ??
        "",
      minimum_occupancy: String(
        rule.minimum_occupancy
      ),
      maximum_occupancy: String(
        rule.maximum_occupancy
      ),
      priority: String(rule.priority),
      is_active: rule.is_active,
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function editChildRule(rule: ChildRule) {
    setEditingChildRuleId(rule.id);

    setChildForm({
      hotel_id: rule.hotel_id,
      room_type_id: rule.room_type_id ?? "",
      rate_plan_id: rule.rate_plan_id ?? "",
      name: rule.name,
      minimum_age: String(rule.minimum_age),
      maximum_age: String(rule.maximum_age),
      pricing_method: rule.pricing_method,
      pricing_value: String(rule.pricing_value),
      maximum_children:
        rule.maximum_children?.toString() ?? "",
      priority: String(rule.priority),
      is_active: rule.is_active,
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function saveChildRule(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!membership) return;

    setSavingChildRule(true);
    setErrorMessage("");
    setSuccessMessage("");

    const payload = {
      company_id: membership.company_id,
      hotel_id: childForm.hotel_id,
      room_type_id:
        childForm.room_type_id || null,
      rate_plan_id:
        childForm.rate_plan_id || null,
      name: childForm.name.trim(),
      minimum_age: Math.max(
        0,
        Number(childForm.minimum_age) || 0
      ),
      maximum_age: Math.max(
        0,
        Number(childForm.maximum_age) || 0
      ),
      pricing_method:
        childForm.pricing_method,
      pricing_value:
        childForm.pricing_method === "free" ||
        childForm.pricing_method === "adult_price"
          ? 0
          : Number(childForm.pricing_value) || 0,
      maximum_children:
        childForm.maximum_children === ""
          ? null
          : Math.max(
              0,
              Number(childForm.maximum_children) || 0
            ),
      priority: Math.max(
        1,
        Number(childForm.priority) || 100
      ),
      is_active: childForm.is_active,
      updated_at: new Date().toISOString(),
    };

    if (payload.maximum_age < payload.minimum_age) {
      setErrorMessage(
        "Maksimum yaş, minimum yaştan küçük olamaz."
      );
      setSavingChildRule(false);
      return;
    }

    const query = editingChildRuleId
      ? supabase
          .from("hotel_child_rules")
          .update(payload)
          .eq("id", editingChildRuleId)
          .eq(
            "company_id",
            membership.company_id
          )
      : supabase
          .from("hotel_child_rules")
          .insert(payload);

    const { error } = await query;

    if (error) {
      setErrorMessage(error.message);
      setSavingChildRule(false);
      return;
    }

    setSuccessMessage(
      editingChildRuleId
        ? "Çocuk yaş kuralı güncellendi."
        : "Yeni çocuk yaş kuralı kaydedildi."
    );

    resetChildForm();

    await loadData(
      membership.company_id
    );

    setSavingChildRule(false);
  }

  async function saveSeason(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!membership) return;

    setSavingSeason(true);
    setErrorMessage("");
    setSuccessMessage("");

    const payload = {
      company_id: membership.company_id,
      hotel_id: seasonForm.hotel_id,
      name: seasonForm.name.trim(),
      start_date: seasonForm.start_date,
      end_date: seasonForm.end_date,
      adjustment_type:
        seasonForm.adjustment_type,
      adjustment_value:
        Number(
          seasonForm.adjustment_value
        ) || 0,
      priority: Math.max(
        1,
        Number(seasonForm.priority) || 100
      ),
      is_active: seasonForm.is_active,
      updated_at:
        new Date().toISOString(),
    };

    const query = editingSeasonId
      ? supabase
          .from("hotel_seasons")
          .update(payload)
          .eq("id", editingSeasonId)
          .eq(
            "company_id",
            membership.company_id
          )
      : supabase
          .from("hotel_seasons")
          .insert(payload);

    const { error } = await query;

    if (error) {
      setErrorMessage(error.message);
      setSavingSeason(false);
      return;
    }

    setSuccessMessage(
      editingSeasonId
        ? "Sezon güncellendi."
        : "Yeni sezon oluşturuldu."
    );

    resetSeasonForm();

    await loadData(
      membership.company_id
    );

    setSavingSeason(false);
  }

  async function saveOccupancyRule(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!membership) return;

    setSavingOccupancyRule(true);
    setErrorMessage("");
    setSuccessMessage("");

    const payload = {
      company_id: membership.company_id,
      hotel_id: occupancyForm.hotel_id,
      room_type_id:
        occupancyForm.room_type_id,
      adults: Math.max(
        1,
        Number(occupancyForm.adults) || 1
      ),
      children: Math.max(
        0,
        Number(occupancyForm.children) || 0
      ),
      pricing_method:
        occupancyForm.pricing_method,
      pricing_value:
        Number(
          occupancyForm.pricing_value
        ) || 0,
      extra_adult_price:
        occupancyForm.extra_adult_price === ""
          ? null
          : Math.max(
              0,
              Number(
                occupancyForm.extra_adult_price
              ) || 0
            ),
      extra_child_price:
        occupancyForm.extra_child_price === ""
          ? null
          : Math.max(
              0,
              Number(
                occupancyForm.extra_child_price
              ) || 0
            ),
      minimum_occupancy: Math.max(
        1,
        Number(
          occupancyForm.minimum_occupancy
        ) || 1
      ),
      maximum_occupancy: Math.max(
        1,
        Number(
          occupancyForm.maximum_occupancy
        ) || 1
      ),
      priority: Math.max(
        1,
        Number(occupancyForm.priority) ||
          100
      ),
      is_active:
        occupancyForm.is_active,
      updated_at:
        new Date().toISOString(),
    };

    const query =
      editingOccupancyRuleId
        ? supabase
            .from(
              "hotel_occupancy_rules"
            )
            .update(payload)
            .eq(
              "id",
              editingOccupancyRuleId
            )
            .eq(
              "company_id",
              membership.company_id
            )
        : supabase
            .from(
              "hotel_occupancy_rules"
            )
            .upsert(payload, {
              onConflict:
                "hotel_id,room_type_id,adults,children",
            });

    const { error } = await query;

    if (error) {
      setErrorMessage(error.message);
      setSavingOccupancyRule(false);
      return;
    }

    setSuccessMessage(
      editingOccupancyRuleId
        ? "Kişi fiyat kuralı güncellendi."
        : "Kişi fiyat kuralı kaydedildi."
    );

    resetOccupancyForm();

    await loadData(
      membership.company_id
    );

    setSavingOccupancyRule(false);
  }

  if (loading) {
    return (
      <main className="p-10 text-white">
        Revenue kuralları yükleniyor...
      </main>
    );
  }

  return (
    <main className="px-5 py-10 lg:px-10">
      <div className="mx-auto max-w-[1600px]">
        <header>
          <p className="text-sm font-black uppercase tracking-[0.25em] text-orange-400">
            TUROS REVENUE ENGINE
          </p>

          <h1 className="mt-3 text-4xl font-black md:text-5xl">
            Revenue Management
          </h1>

          <p className="mt-4 max-w-4xl text-slate-400">
            Sezon, kişi sayısı, oda tipi ve
            öncelik kurallarıyla gelişmiş fiyat
            motorunu yönetin.
          </p>
        </header>

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          <article className="rounded-3xl border border-white/10 bg-slate-900 p-6">
            <FaCalendarAlt className="text-orange-400" />

            <p className="mt-5 text-sm text-slate-500">
              Sezon Kuralı
            </p>

            <p className="mt-2 text-4xl font-black">
              {seasons.length}
            </p>
          </article>

          <article className="rounded-3xl border border-white/10 bg-slate-900 p-6">
            <FaUsers className="text-blue-400" />

            <p className="mt-5 text-sm text-slate-500">
              Kişi Fiyat Kuralı
            </p>

            <p className="mt-2 text-4xl font-black">
              {occupancyRules.length}
            </p>
          </article>
        </section>

        <div className="mt-8">
          <SeasonForm
            hotels={hotels}
            form={seasonForm}
            saving={savingSeason}
            editing={Boolean(
              editingSeasonId
            )}
            onChange={updateSeasonForm}
            onSubmit={saveSeason}
            onCancel={resetSeasonForm}
          />
        </div>

        <section className="mt-8 rounded-[32px] border border-white/10 bg-slate-900 p-6">
          <h2 className="text-2xl font-black">
            Sezon Kuralları
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {seasons.map((season) => {
              const hotel = firstRelation(
                season.hotel
              );

              return (
                <article
                  key={season.id}
                  className="rounded-3xl bg-slate-950 p-5"
                >
                  <p className="text-xs font-black uppercase tracking-wider text-orange-400">
                    {hotel?.name ??
                      "Otel belirtilmedi"}
                  </p>

                  <h3 className="mt-2 text-xl font-black">
                    {season.name}
                  </h3>

                  <p className="mt-2 text-sm text-slate-500">
                    {new Date(
                      `${season.start_date}T00:00:00`
                    ).toLocaleDateString(
                      "tr-TR"
                    )}{" "}
                    –{" "}
                    {new Date(
                      `${season.end_date}T00:00:00`
                    ).toLocaleDateString(
                      "tr-TR"
                    )}
                  </p>

                  <p className="mt-3 font-black text-emerald-400">
                    {
                      adjustmentTypeLabels[
                        season.adjustment_type
                      ]
                    }{" "}
                    · {season.adjustment_value}
                  </p>

                  <p className="mt-2 text-xs text-slate-600">
                    Öncelik: {season.priority}
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      editSeason(season)
                    }
                    className="mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 font-black"
                  >
                    <FaEdit />
                    Sezonu Düzenle
                  </button>
                </article>
              );
            })}
          </div>
        </section>

        <div className="mt-8">
          <OccupancyRuleForm
            hotels={hotels}
            roomTypes={roomTypes}
            form={occupancyForm}
            saving={savingOccupancyRule}
            editing={Boolean(
              editingOccupancyRuleId
            )}
            onChange={updateOccupancyForm}
            onSubmit={saveOccupancyRule}
            onCancel={resetOccupancyForm}
          />
        </div>

        <section className="mt-8 rounded-[32px] border border-white/10 bg-slate-900 p-6">
          <h2 className="text-2xl font-black">
            Kişi Bazlı Fiyat Kuralları
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {occupancyRules.map((rule) => {
              const hotel = firstRelation(
                rule.hotel
              );

              const roomType = firstRelation(
                rule.room_type
              );

              return (
                <article
                  key={rule.id}
                  className="rounded-3xl bg-slate-950 p-5"
                >
                  <p className="text-xs font-black uppercase tracking-wider text-orange-400">
                    {hotel?.name ??
                      "Otel belirtilmedi"}
                  </p>

                  <h3 className="mt-2 text-xl font-black">
                    {roomType?.name ??
                      "Oda tipi"}
                  </h3>

                  <p className="mt-3 text-sm text-slate-400">
                    {rule.adults} yetişkin ·{" "}
                    {rule.children} çocuk
                  </p>

                  <p className="mt-3 font-black text-emerald-400">
                    {
                      occupancyPricingMethodLabels[
                        rule.pricing_method
                      ]
                    }{" "}
                    · {rule.pricing_value}
                  </p>

                  <p className="mt-2 text-xs text-slate-600">
                    Kapasite:{" "}
                    {rule.minimum_occupancy}–
                    {rule.maximum_occupancy} ·
                    Öncelik: {rule.priority}
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      editOccupancyRule(rule)
                    }
                    className="mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 font-black"
                  >
                    <FaEdit />
                    Kuralı Düzenle
                  </button>
                </article>
              );
            })}
          </div>
        </section>

        <div className="mt-8">
          <ChildRuleForm
            hotels={hotels}
            roomTypes={roomTypes}
            ratePlans={ratePlans}
            form={childForm}
            saving={savingChildRule}
            editing={Boolean(editingChildRuleId)}
            onChange={updateChildForm}
            onSubmit={saveChildRule}
            onCancel={resetChildForm}
          />
        </div>

        <section className="mt-8 rounded-[32px] border border-white/10 bg-slate-900 p-6">
          <h2 className="text-2xl font-black">
            Çocuk Yaş Kuralları
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {childRules.map((rule) => {
              const hotel = firstRelation(
                rule.hotel
              );

              const roomType = firstRelation(
                rule.room_type
              );

              const ratePlan = firstRelation(
                rule.rate_plan
              );

              return (
                <article
                  key={rule.id}
                  className="rounded-3xl bg-slate-950 p-5"
                >
                  <p className="text-xs font-black uppercase tracking-wider text-orange-400">
                    {hotel?.name ??
                      "Otel belirtilmedi"}
                  </p>

                  <h3 className="mt-2 text-xl font-black">
                    {rule.name}
                  </h3>

                  <p className="mt-2 text-sm text-slate-500">
                    {roomType?.name ??
                      "Tüm oda tipleri"}{" "}
                    ·{" "}
                    {ratePlan?.name ??
                      "Tüm fiyat planları"}
                  </p>

                  <p className="mt-3 text-sm text-slate-400">
                    {rule.minimum_age}–
                    {rule.maximum_age} yaş
                  </p>

                  <p className="mt-3 font-black text-emerald-400">
                    {
                      childPricingMethodLabels[
                        rule.pricing_method
                      ]
                    }{" "}
                    · {rule.pricing_value}
                  </p>

                  <p className="mt-2 text-xs text-slate-600">
                    Maksimum çocuk:{" "}
                    {rule.maximum_children ??
                      "Sınırsız"}{" "}
                    · Öncelik: {rule.priority}
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      editChildRule(rule)
                    }
                    className="mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 font-black"
                  >
                    <FaEdit />
                    Kuralı Düzenle
                  </button>
                </article>
              );
            })}
          </div>

          {childRules.length === 0 && (
            <p className="mt-5 text-slate-500">
              Henüz çocuk yaş kuralı bulunmuyor.
            </p>
          )}
        </section>

        {errorMessage && (
          <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 font-bold text-red-400">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 font-bold text-emerald-400">
            {successMessage}
          </div>
        )}
      </div>
    </main>
  );
}
