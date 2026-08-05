"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  FaEdit,
  FaMoneyBillWave,
  FaSearch,
  FaTags,
} from "react-icons/fa";
import { supabase } from "@/lib/supabase";
import {
  CurrentMembership,
  getCurrentMembership,
} from "@/lib/current-user";
import RatePlanForm, {
  RatePlanFormState,
} from "@/components/hotel/rate-plans/RatePlanForm";
import DailyRateForm, {
  DailyRateFormState,
} from "@/components/hotel/pricing/DailyRateForm";

type HotelOption = {
  id: string;
  name: string;
};

type RoomTypeOption = {
  id: string;
  hotel_id: string;
  name: string;
};

type RatePlan = {
  id: string;
  company_id: string;
  hotel_id: string;
  room_type_id: string | null;
  name: string;
  rate_code: string | null;
  meal_plan: string;
  currency: string;
  is_refundable: boolean;
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

type DailyRate = {
  id: string;
  company_id: string;
  hotel_id: string;
  room_type_id: string;
  rate_plan_id: string;
  rate_date: string;
  base_price: number;
  single_price: number | null;
  triple_price: number | null;
  extra_adult_price: number;
  child_price: number;
  currency: string;
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

const emptyRatePlanForm: RatePlanFormState = {
  hotel_id: "",
  room_type_id: "",
  name: "",
  rate_code: "",
  meal_plan: "RO",
  currency: "TRY",
  is_refundable: true,
  is_active: true,
};

const emptyDailyRateForm: DailyRateFormState = {
  hotel_id: "",
  room_type_id: "",
  rate_plan_id: "",
  rate_date: new Date().toISOString().slice(0, 10),
  base_price: "0",
  single_price: "",
  triple_price: "",
  extra_adult_price: "0",
  child_price: "0",
  currency: "TRY",
  is_active: true,
};

const mealPlanLabels: Record<string, string> = {
  RO: "Sadece Oda",
  BB: "Kahvaltı Dahil",
  HB: "Yarım Pansiyon",
  FB: "Tam Pansiyon",
  AI: "Her Şey Dahil",
  UAI: "Ultra Her Şey Dahil",
};

function firstRelation<T>(
  value: T | T[] | null | undefined
) {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function money(value: number, currency: string) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
  }).format(Number(value || 0));
}

export default function HotelPricingPage() {
  const [membership, setMembership] =
    useState<CurrentMembership | null>(null);

  const [hotels, setHotels] =
    useState<HotelOption[]>([]);

  const [roomTypes, setRoomTypes] =
    useState<RoomTypeOption[]>([]);

  const [ratePlans, setRatePlans] =
    useState<RatePlan[]>([]);

  const [dailyRates, setDailyRates] =
    useState<DailyRate[]>([]);

  const [ratePlanForm, setRatePlanForm] =
    useState<RatePlanFormState>(emptyRatePlanForm);

  const [dailyRateForm, setDailyRateForm] =
    useState<DailyRateFormState>(emptyDailyRateForm);

  const [editingRatePlanId, setEditingRatePlanId] =
    useState("");

  const [editingDailyRateId, setEditingDailyRateId] =
    useState("");

  const [savingRatePlan, setSavingRatePlan] =
    useState(false);

  const [savingDailyRate, setSavingDailyRate] =
    useState(false);

  const [search, setSearch] = useState("");

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
        { data: ratePlanData, error: ratePlanError },
        { data: dailyRateData, error: dailyRateError },
      ] = await Promise.all([
        supabase
          .from("hotels")
          .select("id, name")
          .eq("company_id", companyId)
          .eq("is_active", true)
          .order("name"),

        supabase
          .from("hotel_room_types")
          .select("id, hotel_id, name, is_active")
          .eq("company_id", companyId)
          .order("name"),

        supabase
          .from("hotel_rate_plans")
          .select(`
            id,
            company_id,
            hotel_id,
            room_type_id,
            name,
            rate_code,
            meal_plan,
            currency,
            is_refundable,
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
          .order("created_at", {
            ascending: false,
          }),

        supabase
          .from("hotel_daily_rates")
          .select(`
            id,
            company_id,
            hotel_id,
            room_type_id,
            rate_plan_id,
            rate_date,
            base_price,
            single_price,
            triple_price,
            extra_adult_price,
            child_price,
            currency,
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
          .order("rate_date", {
            ascending: true,
          }),
      ]);

      const error =
        hotelError ??
        roomTypeError ??
        ratePlanError ??
        dailyRateError;

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setHotels((hotelData ?? []) as HotelOption[]);
      setRoomTypes(
        (roomTypeData ?? []) as RoomTypeOption[]
      );
      setRatePlans(
        (ratePlanData ?? []) as unknown as RatePlan[]
      );
      setDailyRates(
        (dailyRateData ?? []) as unknown as DailyRate[]
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

  const filteredDailyRates = useMemo(() => {
    const query = search
      .trim()
      .toLocaleLowerCase("tr-TR");

    if (!query) return dailyRates;

    return dailyRates.filter((rate) => {
      const hotel = firstRelation(rate.hotel);
      const roomType = firstRelation(rate.room_type);
      const ratePlan = firstRelation(rate.rate_plan);

      return [
        hotel?.name,
        roomType?.name,
        ratePlan?.name,
        rate.rate_date,
        rate.currency,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value)
            .toLocaleLowerCase("tr-TR")
            .includes(query)
        );
    });
  }, [dailyRates, search]);

  function updateRatePlanForm<
    K extends keyof RatePlanFormState
  >(
    key: K,
    value: RatePlanFormState[K]
  ) {
    setRatePlanForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateDailyRateForm<
    K extends keyof DailyRateFormState
  >(
    key: K,
    value: DailyRateFormState[K]
  ) {
    setDailyRateForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function resetRatePlanForm() {
    setRatePlanForm(emptyRatePlanForm);
    setEditingRatePlanId("");
  }

  function resetDailyRateForm() {
    setDailyRateForm(emptyDailyRateForm);
    setEditingDailyRateId("");
  }

  function editRatePlan(ratePlan: RatePlan) {
    setEditingRatePlanId(ratePlan.id);

    setRatePlanForm({
      hotel_id: ratePlan.hotel_id,
      room_type_id:
        ratePlan.room_type_id ?? "",
      name: ratePlan.name,
      rate_code: ratePlan.rate_code ?? "",
      meal_plan: ratePlan.meal_plan,
      currency: ratePlan.currency,
      is_refundable:
        ratePlan.is_refundable,
      is_active: ratePlan.is_active,
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function editDailyRate(rate: DailyRate) {
    setEditingDailyRateId(rate.id);

    setDailyRateForm({
      hotel_id: rate.hotel_id,
      room_type_id: rate.room_type_id,
      rate_plan_id: rate.rate_plan_id,
      rate_date: rate.rate_date,
      base_price: String(rate.base_price),
      single_price:
        rate.single_price?.toString() ?? "",
      triple_price:
        rate.triple_price?.toString() ?? "",
      extra_adult_price: String(
        rate.extra_adult_price
      ),
      child_price: String(rate.child_price),
      currency: rate.currency,
      is_active: rate.is_active,
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function saveRatePlan(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!membership) return;

    setSavingRatePlan(true);
    setErrorMessage("");
    setSuccessMessage("");

    const payload = {
      company_id: membership.company_id,
      hotel_id: ratePlanForm.hotel_id,
      room_type_id:
        ratePlanForm.room_type_id || null,
      name: ratePlanForm.name.trim(),
      rate_code:
        ratePlanForm.rate_code.trim() || null,
      meal_plan: ratePlanForm.meal_plan,
      currency: ratePlanForm.currency,
      is_refundable:
        ratePlanForm.is_refundable,
      is_active: ratePlanForm.is_active,
      updated_at: new Date().toISOString(),
    };

    const query = editingRatePlanId
      ? supabase
          .from("hotel_rate_plans")
          .update(payload)
          .eq("id", editingRatePlanId)
          .eq(
            "company_id",
            membership.company_id
          )
      : supabase
          .from("hotel_rate_plans")
          .insert(payload);

    const { error } = await query;

    if (error) {
      setErrorMessage(error.message);
      setSavingRatePlan(false);
      return;
    }

    setSuccessMessage(
      editingRatePlanId
        ? "Fiyat planı güncellendi."
        : "Yeni fiyat planı oluşturuldu."
    );

    resetRatePlanForm();

    await loadData(
      membership.company_id
    );

    setSavingRatePlan(false);
  }

  async function saveDailyRate(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!membership) return;

    setSavingDailyRate(true);
    setErrorMessage("");
    setSuccessMessage("");

    const payload = {
      company_id: membership.company_id,
      hotel_id: dailyRateForm.hotel_id,
      room_type_id:
        dailyRateForm.room_type_id,
      rate_plan_id:
        dailyRateForm.rate_plan_id,
      rate_date: dailyRateForm.rate_date,
      base_price: Math.max(
        0,
        Number(dailyRateForm.base_price) || 0
      ),
      single_price:
        dailyRateForm.single_price === ""
          ? null
          : Math.max(
              0,
              Number(
                dailyRateForm.single_price
              ) || 0
            ),
      triple_price:
        dailyRateForm.triple_price === ""
          ? null
          : Math.max(
              0,
              Number(
                dailyRateForm.triple_price
              ) || 0
            ),
      extra_adult_price: Math.max(
        0,
        Number(
          dailyRateForm.extra_adult_price
        ) || 0
      ),
      child_price: Math.max(
        0,
        Number(dailyRateForm.child_price) || 0
      ),
      currency: dailyRateForm.currency,
      is_active: dailyRateForm.is_active,
      updated_at: new Date().toISOString(),
    };

    const query = editingDailyRateId
      ? supabase
          .from("hotel_daily_rates")
          .update(payload)
          .eq("id", editingDailyRateId)
          .eq(
            "company_id",
            membership.company_id
          )
      : supabase
          .from("hotel_daily_rates")
          .upsert(payload, {
            onConflict:
              "hotel_id,room_type_id,rate_plan_id,rate_date",
          });

    const { error } = await query;

    if (error) {
      setErrorMessage(error.message);
      setSavingDailyRate(false);
      return;
    }

    setSuccessMessage(
      editingDailyRateId
        ? "Günlük fiyat güncellendi."
        : "Günlük fiyat kaydedildi."
    );

    resetDailyRateForm();

    await loadData(
      membership.company_id
    );

    setSavingDailyRate(false);
  }

  if (loading) {
    return (
      <main className="p-10 text-white">
        Fiyatlar yükleniyor...
      </main>
    );
  }

  return (
    <main className="px-5 py-10 lg:px-10">
      <div className="mx-auto max-w-[1600px]">
        <header>
          <p className="text-sm font-black uppercase tracking-[0.25em] text-orange-400">
            TUROS HOTEL PMS
          </p>

          <h1 className="mt-3 text-4xl font-black md:text-5xl">
            Fiyat Yönetimi
          </h1>

          <p className="mt-4 text-slate-400">
            Fiyat planlarını ve günlük oda
            fiyatlarını tek merkezden yönetin.
          </p>
        </header>

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          <article className="rounded-3xl border border-white/10 bg-slate-900 p-6">
            <FaTags className="text-orange-400" />

            <p className="mt-5 text-sm text-slate-500">
              Fiyat Planı
            </p>

            <p className="mt-2 text-4xl font-black">
              {ratePlans.length}
            </p>
          </article>

          <article className="rounded-3xl border border-white/10 bg-slate-900 p-6">
            <FaMoneyBillWave className="text-emerald-400" />

            <p className="mt-5 text-sm text-slate-500">
              Günlük Fiyat Kaydı
            </p>

            <p className="mt-2 text-4xl font-black">
              {dailyRates.length}
            </p>
          </article>
        </section>

        <div className="mt-8">
          <RatePlanForm
            hotels={hotels}
            roomTypes={roomTypes}
            form={ratePlanForm}
            saving={savingRatePlan}
            editing={Boolean(
              editingRatePlanId
            )}
            onChange={updateRatePlanForm}
            onSubmit={saveRatePlan}
            onCancel={resetRatePlanForm}
          />
        </div>

        <section className="mt-8 rounded-[32px] border border-white/10 bg-slate-900 p-6">
          <h2 className="text-2xl font-black">
            Fiyat Planları
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {ratePlans.map((ratePlan) => {
              const hotel = firstRelation(
                ratePlan.hotel
              );

              const roomType = firstRelation(
                ratePlan.room_type
              );

              return (
                <article
                  key={ratePlan.id}
                  className="rounded-3xl bg-slate-950 p-5"
                >
                  <p className="text-xs font-black uppercase tracking-wider text-orange-400">
                    {hotel?.name ??
                      "Otel belirtilmedi"}
                  </p>

                  <h3 className="mt-2 text-xl font-black">
                    {ratePlan.name}
                  </h3>

                  <p className="mt-2 text-sm text-slate-500">
                    {roomType?.name ??
                      "Tüm oda tipleri"}
                  </p>

                  <p className="mt-2 text-sm text-slate-500">
                    {mealPlanLabels[
                      ratePlan.meal_plan
                    ] ??
                      ratePlan.meal_plan}{" "}
                    · {ratePlan.currency}
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      editRatePlan(ratePlan)
                    }
                    className="mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 font-black"
                  >
                    <FaEdit />
                    Planı Düzenle
                  </button>
                </article>
              );
            })}
          </div>

          {ratePlans.length === 0 && (
            <p className="mt-5 text-slate-500">
              Henüz fiyat planı bulunmuyor.
            </p>
          )}
        </section>

        <div className="mt-8">
          <DailyRateForm
            hotels={hotels}
            roomTypes={roomTypes}
            ratePlans={ratePlans.map(
              (ratePlan) => ({
                id: ratePlan.id,
                hotel_id:
                  ratePlan.hotel_id,
                room_type_id:
                  ratePlan.room_type_id,
                name: ratePlan.name,
              })
            )}
            form={dailyRateForm}
            saving={savingDailyRate}
            editing={Boolean(
              editingDailyRateId
            )}
            onChange={updateDailyRateForm}
            onSubmit={saveDailyRate}
            onCancel={resetDailyRateForm}
          />
        </div>

        {errorMessage && (
          <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 font-bold text-red-400">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 font-bold text-emerald-400">
            {successMessage}
          </div>
        )}

        <label className="mt-8 flex min-h-14 items-center gap-3 rounded-2xl bg-white px-5">
          <FaSearch className="text-orange-500" />

          <input
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Otel, oda tipi, plan veya tarih ara"
            className="w-full bg-transparent font-bold text-slate-950 outline-none"
          />
        </label>

        <section className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredDailyRates.map((rate) => {
            const hotel = firstRelation(
              rate.hotel
            );

            const roomType = firstRelation(
              rate.room_type
            );

            const ratePlan = firstRelation(
              rate.rate_plan
            );

            return (
              <article
                key={rate.id}
                className="rounded-[30px] border border-white/10 bg-slate-900 p-6"
              >
                <p className="text-xs font-black uppercase tracking-wider text-orange-400">
                  {new Date(
                    `${rate.rate_date}T00:00:00`
                  ).toLocaleDateString(
                    "tr-TR"
                  )}
                </p>

                <h2 className="mt-2 text-2xl font-black">
                  {roomType?.name ??
                    "Oda tipi"}
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  {hotel?.name ??
                    "Otel belirtilmedi"}
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  {ratePlan?.name ??
                    "Fiyat planı"}
                </p>

                <p className="mt-5 text-3xl font-black text-emerald-400">
                  {money(
                    rate.base_price,
                    rate.currency
                  )}
                </p>

                <button
                  type="button"
                  onClick={() =>
                    editDailyRate(rate)
                  }
                  className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 font-black"
                >
                  <FaEdit />
                  Fiyatı Düzenle
                </button>
              </article>
            );
          })}
        </section>

        {filteredDailyRates.length === 0 && (
          <div className="mt-6 rounded-3xl border border-white/10 bg-slate-900 p-10 text-center text-slate-400">
            Henüz günlük fiyat kaydı bulunmuyor.
          </div>
        )}
      </div>
    </main>
  );
}
