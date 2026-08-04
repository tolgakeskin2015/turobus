"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  FaChartLine,
  FaEdit,
  FaPlus,
  FaSearch,
  FaTrash,
  FaTrophy,
  FaUser,
} from "react-icons/fa";
import { supabase } from "@/lib/supabase";
import {
  CurrentMembership,
  getCurrentMembership,
} from "@/lib/current-user";

type DealStage =
  | "new_lead"
  | "contacted"
  | "offer_preparing"
  | "offer_sent"
  | "negotiation"
  | "payment_pending"
  | "won"
  | "lost";

type CustomerOption = {
  id: string;
  full_name: string;
  customer_code: string | null;
  phone: string | null;
};

type Deal = {
  id: string;
  company_id: string;
  customer_id: string | null;
  reservation_id: string | null;
  title: string;
  stage: DealStage;
  expected_revenue: number;
  expected_cost: number;
  expected_profit: number;
  probability: number;
  expected_close_date: string | null;
  lost_reason: string | null;
  created_at: string;
  customer:
    | {
        id: string;
        full_name: string;
        phone: string | null;
      }
    | {
        id: string;
        full_name: string;
        phone: string | null;
      }[]
    | null;
};

type DealForm = {
  customer_id: string;
  title: string;
  stage: DealStage;
  expected_revenue: string;
  expected_cost: string;
  probability: string;
  expected_close_date: string;
  lost_reason: string;
};

const emptyForm: DealForm = {
  customer_id: "",
  title: "",
  stage: "new_lead",
  expected_revenue: "0",
  expected_cost: "0",
  probability: "10",
  expected_close_date: "",
  lost_reason: "",
};

const stageLabels: Record<DealStage, string> = {
  new_lead: "Yeni Talep",
  contacted: "İletişime Geçildi",
  offer_preparing: "Teklif Hazırlanıyor",
  offer_sent: "Teklif Gönderildi",
  negotiation: "Görüşme",
  payment_pending: "Ödeme Bekliyor",
  won: "Kazanıldı",
  lost: "Kaybedildi",
};

const stageProbability: Record<DealStage, number> = {
  new_lead: 10,
  contacted: 20,
  offer_preparing: 35,
  offer_sent: 50,
  negotiation: 70,
  payment_pending: 90,
  won: 100,
  lost: 0,
};

const pipelineStages: DealStage[] = [
  "new_lead",
  "contacted",
  "offer_preparing",
  "offer_sent",
  "negotiation",
  "payment_pending",
  "won",
  "lost",
];

function firstRelation<T>(
  value: T | T[] | null | undefined
) {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function parseDecimal(value: string) {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
  }).format(Number(value || 0));
}

function stageClasses(stage: DealStage) {
  if (stage === "won") {
    return "border-emerald-500/20 bg-emerald-500/10";
  }

  if (stage === "lost") {
    return "border-red-500/20 bg-red-500/10";
  }

  if (stage === "payment_pending") {
    return "border-amber-500/20 bg-amber-500/10";
  }

  return "border-white/10 bg-slate-900";
}

export default function CrmDealsPage() {
  const [membership, setMembership] =
    useState<CurrentMembership | null>(null);

  const [customers, setCustomers] =
    useState<CustomerOption[]>([]);

  const [deals, setDeals] = useState<Deal[]>([]);
  const [form, setForm] = useState<DealForm>(emptyForm);

  const [editingId, setEditingId] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [movingId, setMovingId] = useState("");

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] =
    useState("");

  const loadData = useCallback(
    async (companyId: string) => {
      setErrorMessage("");

      const [
        { data: customerData, error: customerError },
        { data: dealData, error: dealError },
      ] = await Promise.all([
        supabase
          .from("crm_customers")
          .select("id, full_name, customer_code, phone")
          .eq("company_id", companyId)
          .eq("is_active", true)
          .order("full_name"),

        supabase
          .from("crm_deals")
          .select(`
            id,
            company_id,
            customer_id,
            reservation_id,
            title,
            stage,
            expected_revenue,
            expected_cost,
            expected_profit,
            probability,
            expected_close_date,
            lost_reason,
            created_at,
            customer:crm_customers (
              id,
              full_name,
              phone
            )
          `)
          .eq("company_id", companyId)
          .order("created_at", {
            ascending: false,
          }),
      ]);

      const error = customerError ?? dealError;

      if (error) {
        console.error(error);
        setErrorMessage(error.message);
      }

      setCustomers(
        (customerData ?? []) as CustomerOption[]
      );

      setDeals((dealData ?? []) as unknown as Deal[]);
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

      try {
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
        await loadData(currentMembership.company_id);
      } catch (error) {
        console.error(error);
        setErrorMessage(
          "Satış fırsatları hazırlanamadı."
        );
      } finally {
        setLoading(false);
      }
    }

    void initialize();
  }, [loadData]);

  const calculation = useMemo(() => {
    const revenue = Math.max(
      0,
      parseDecimal(form.expected_revenue)
    );

    const cost = Math.max(
      0,
      parseDecimal(form.expected_cost)
    );

    return {
      revenue,
      cost,
      profit: revenue - cost,
    };
  }, [form.expected_cost, form.expected_revenue]);

  const filteredDeals = useMemo(() => {
    const query = search
      .trim()
      .toLocaleLowerCase("tr-TR");

    if (!query) return deals;

    return deals.filter((deal) => {
      const customer = firstRelation(deal.customer);

      return [
        deal.title,
        customer?.full_name,
        customer?.phone,
        stageLabels[deal.stage],
      ]
        .filter(Boolean)
        .some((value) =>
          String(value)
            .toLocaleLowerCase("tr-TR")
            .includes(query)
        );
    });
  }, [deals, search]);

  const stats = useMemo(() => {
    const openDeals = deals.filter(
      (deal) =>
        deal.stage !== "won" &&
        deal.stage !== "lost"
    );

    return {
      total: deals.length,

      open: openDeals.length,

      pipelineRevenue: openDeals.reduce(
        (total, deal) =>
          total + Number(deal.expected_revenue),
        0
      ),

      weightedRevenue: openDeals.reduce(
        (total, deal) =>
          total +
          (Number(deal.expected_revenue) *
            Number(deal.probability)) /
            100,
        0
      ),

      wonRevenue: deals
        .filter((deal) => deal.stage === "won")
        .reduce(
          (total, deal) =>
            total + Number(deal.expected_revenue),
          0
        ),

      wonProfit: deals
        .filter((deal) => deal.stage === "won")
        .reduce(
          (total, deal) =>
            total + Number(deal.expected_profit),
          0
        ),
    };
  }, [deals]);

  function updateForm<K extends keyof DealForm>(
    key: K,
    value: DealForm[K]
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function changeFormStage(stage: DealStage) {
    setForm((current) => ({
      ...current,
      stage,
      probability:
        stageProbability[stage].toString(),
      lost_reason:
        stage === "lost"
          ? current.lost_reason
          : "",
    }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId("");
    setErrorMessage("");
    setSuccessMessage("");
  }

  function editDeal(deal: Deal) {
    setEditingId(deal.id);

    setForm({
      customer_id: deal.customer_id ?? "",
      title: deal.title,
      stage: deal.stage,
      expected_revenue:
        deal.expected_revenue.toString(),
      expected_cost: deal.expected_cost.toString(),
      probability: deal.probability.toString(),
      expected_close_date:
        deal.expected_close_date ?? "",
      lost_reason: deal.lost_reason ?? "",
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function saveDeal(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!membership) return;

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const payload = {
      company_id: membership.company_id,
      customer_id: form.customer_id || null,
      title: form.title.trim(),
      stage: form.stage,
      expected_revenue: calculation.revenue,
      expected_cost: calculation.cost,
      expected_profit: calculation.profit,
      probability: Math.max(
        0,
        Math.min(
          100,
          Number(form.probability) || 0
        )
      ),
      expected_close_date:
        form.expected_close_date || null,
      lost_reason:
        form.stage === "lost"
          ? form.lost_reason.trim() || null
          : null,
      updated_at: new Date().toISOString(),
    };

    try {
      if (editingId) {
        const { error } = await supabase
          .from("crm_deals")
          .update(payload)
          .eq("id", editingId)
          .eq(
            "company_id",
            membership.company_id
          );

        if (error) throw error;

        setSuccessMessage(
          "Satış fırsatı güncellendi."
        );
      } else {
        const { error } = await supabase
          .from("crm_deals")
          .insert({
            ...payload,
            created_by: user?.id ?? null,
          });

        if (error) throw error;

        setSuccessMessage(
          "Yeni satış fırsatı oluşturuldu."
        );
      }

      if (form.customer_id) {
        const { error: timelineError } = await supabase
          .from("crm_timeline")
          .insert({
            company_id: membership.company_id,
            customer_id: form.customer_id,
            event_type: "offer",
            title: form.title.trim(),
            description: `${stageLabels[form.stage]} · ${money(
              calculation.revenue
            )}`,
            created_by: user?.id ?? null,
          });

        if (timelineError) {
          console.error("CRM timeline hatası:", timelineError);
        }
      }

      setForm(emptyForm);
      setEditingId("");

      await loadData(membership.company_id);
    } catch (error: unknown) {
      const supabaseError =
        error && typeof error === "object"
          ? (error as {
              message?: string;
              details?: string;
              hint?: string;
              code?: string;
            })
          : null;

      const parts = [
        supabaseError?.message,
        supabaseError?.details,
        supabaseError?.hint,
        supabaseError?.code
          ? `Kod: ${supabaseError.code}`
          : null,
      ].filter(Boolean);

      setErrorMessage(
        parts.length > 0
          ? parts.join(" · ")
          : "Satış fırsatı kaydedilemedi. Bilinmeyen veritabanı hatası."
      );
    } finally {
      setSaving(false);
    }
  }

  async function moveDeal(
    deal: Deal,
    stage: DealStage
  ) {
    if (!membership || deal.stage === stage) return;

    setMovingId(deal.id);
    setErrorMessage("");
    setSuccessMessage("");

    const { error } = await supabase
      .from("crm_deals")
      .update({
        stage,
        probability: stageProbability[stage],
        lost_reason:
          stage === "lost"
            ? deal.lost_reason ??
              "Pipeline üzerinden kaybedildi"
            : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", deal.id)
      .eq(
        "company_id",
        membership.company_id
      );

    if (error) {
      setErrorMessage(error.message);
      setMovingId("");
      return;
    }

    setSuccessMessage(
      `${deal.title} → ${stageLabels[stage]}`
    );

    setMovingId("");
    await loadData(membership.company_id);
  }

  async function deleteDeal(deal: Deal) {
    if (!membership) return;

    const confirmed = window.confirm(
      `${deal.title} fırsatını silmek istediğinize emin misiniz?`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("crm_deals")
      .delete()
      .eq("id", deal.id)
      .eq(
        "company_id",
        membership.company_id
      );

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setSuccessMessage("Satış fırsatı silindi.");
    await loadData(membership.company_id);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-10 text-white">
        Satış fırsatları yükleniyor...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-10 text-white lg:px-10">
      <div className="mx-auto max-w-[1600px]">
        <header>
          <p className="text-sm font-black uppercase tracking-[0.25em] text-orange-400">
            TUROS CRM PIPELINE
          </p>

          <h1 className="mt-3 text-4xl font-black md:text-5xl">
            Satış Fırsatları
          </h1>

          <p className="mt-4 max-w-3xl text-slate-400">
            Talepleri tekliften ödemeye kadar
            takip edin; beklenen gelir, maliyet ve
            kârı yönetin.
          </p>
        </header>

        <section className="mt-9 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-3xl border border-white/10 bg-slate-900 p-6">
            <FaChartLine className="text-orange-400" />
            <p className="mt-5 text-sm text-slate-500">
              Açık Fırsat
            </p>
            <p className="mt-2 text-4xl font-black">
              {stats.open}
            </p>
          </article>

          <article className="rounded-3xl border border-white/10 bg-slate-900 p-6">
            <FaChartLine className="text-blue-400" />
            <p className="mt-5 text-sm text-slate-500">
              Pipeline Geliri
            </p>
            <p className="mt-2 text-3xl font-black">
              {money(stats.pipelineRevenue)}
            </p>
          </article>

          <article className="rounded-3xl border border-white/10 bg-slate-900 p-6">
            <FaChartLine className="text-violet-400" />
            <p className="mt-5 text-sm text-slate-500">
              Ağırlıklı Tahmin
            </p>
            <p className="mt-2 text-3xl font-black">
              {money(stats.weightedRevenue)}
            </p>
          </article>

          <article className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-6">
            <FaTrophy className="text-emerald-400" />
            <p className="mt-5 text-sm text-emerald-300">
              Kazanılan Kâr
            </p>
            <p className="mt-2 text-3xl font-black text-emerald-400">
              {money(stats.wonProfit)}
            </p>
          </article>
        </section>

        <section className="mt-8 grid gap-7 xl:grid-cols-[440px_minmax(0,1fr)]">
          <form
            onSubmit={saveDeal}
            className="h-fit rounded-[32px] border border-white/10 bg-slate-900 p-6"
          >
            <div className="flex items-center gap-3">
              <FaPlus className="text-orange-400" />

              <h2 className="text-2xl font-black">
                {editingId
                  ? "Fırsatı Düzenle"
                  : "Yeni Fırsat"}
              </h2>
            </div>

            <label className="mt-6 block">
              <span className="text-sm font-black">
                Müşteri
              </span>

              <select
                value={form.customer_id}
                onChange={(event) =>
                  updateForm(
                    "customer_id",
                    event.target.value
                  )
                }
                className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
              >
                <option value="">
                  Müşteri seçilmedi
                </option>

                {customers.map((customer) => (
                  <option
                    key={customer.id}
                    value={customer.id}
                  >
                    {customer.full_name}
                    {customer.phone
                      ? ` — ${customer.phone}`
                      : ""}
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-4 block">
              <span className="text-sm font-black">
                Fırsat başlığı
              </span>

              <input
                required
                value={form.title}
                onChange={(event) =>
                  updateForm(
                    "title",
                    event.target.value
                  )
                }
                placeholder="4 gece 5 gün balayı paketi"
                className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
              />
            </label>

            <label className="mt-4 block">
              <span className="text-sm font-black">
                Satış aşaması
              </span>

              <select
                value={form.stage}
                onChange={(event) =>
                  changeFormStage(
                    event.target.value as DealStage
                  )
                }
                className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
              >
                {pipelineStages.map((stage) => (
                  <option key={stage} value={stage}>
                    {stageLabels[stage]}
                  </option>
                ))}
              </select>
            </label>

            <div className="mt-4 grid grid-cols-2 gap-4">
              <label>
                <span className="text-sm font-black">
                  Beklenen satış
                </span>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.expected_revenue}
                  onChange={(event) =>
                    updateForm(
                      "expected_revenue",
                      event.target.value
                    )
                  }
                  className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
                />
              </label>

              <label>
                <span className="text-sm font-black">
                  Beklenen maliyet
                </span>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.expected_cost}
                  onChange={(event) =>
                    updateForm(
                      "expected_cost",
                      event.target.value
                    )
                  }
                  className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
                />
              </label>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4">
              <label>
                <span className="text-sm font-black">
                  Olasılık %
                </span>

                <input
                  type="number"
                  min="0"
                  max="100"
                  value={form.probability}
                  onChange={(event) =>
                    updateForm(
                      "probability",
                      event.target.value
                    )
                  }
                  className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
                />
              </label>

              <label>
                <span className="text-sm font-black">
                  Kapanış tarihi
                </span>

                <input
                  type="date"
                  value={form.expected_close_date}
                  onChange={(event) =>
                    updateForm(
                      "expected_close_date",
                      event.target.value
                    )
                  }
                  className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
                />
              </label>
            </div>

            {form.stage === "lost" && (
              <label className="mt-4 block">
                <span className="text-sm font-black">
                  Kaybedilme nedeni
                </span>

                <textarea
                  rows={3}
                  value={form.lost_reason}
                  onChange={(event) =>
                    updateForm(
                      "lost_reason",
                      event.target.value
                    )
                  }
                  className="mt-2 w-full rounded-2xl bg-white px-5 py-4 font-bold text-slate-950 outline-none"
                />
              </label>
            )}

            <div className="mt-5 rounded-2xl bg-slate-950 p-5">
              <p className="text-sm text-slate-500">
                Beklenen kâr
              </p>

              <p
                className={`mt-2 text-3xl font-black ${
                  calculation.profit >= 0
                    ? "text-emerald-400"
                    : "text-red-400"
                }`}
              >
                {money(calculation.profit)}
              </p>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="min-h-14 flex-1 rounded-2xl bg-orange-500 font-black disabled:opacity-50"
              >
                {saving
                  ? "Kaydediliyor..."
                  : editingId
                    ? "Fırsatı Güncelle"
                    : "Fırsatı Kaydet"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="min-h-14 rounded-2xl border border-white/10 px-5 font-black"
                >
                  İptal
                </button>
              )}
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
          </form>

          <section className="min-w-0">
            <label className="flex min-h-14 items-center gap-3 rounded-2xl bg-white px-5">
              <FaSearch className="text-orange-500" />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Fırsat, müşteri veya telefon ara"
                className="w-full bg-transparent font-bold text-slate-950 outline-none"
              />
            </label>

            <div className="mt-6 overflow-x-auto pb-4">
              <div className="grid min-w-[2400px] grid-cols-8 gap-4">
                {pipelineStages.map((stage) => {
                  const stageDeals =
                    filteredDeals.filter(
                      (deal) => deal.stage === stage
                    );

                  const stageRevenue =
                    stageDeals.reduce(
                      (total, deal) =>
                        total +
                        Number(deal.expected_revenue),
                      0
                    );

                  return (
                    <div key={stage}>
                      <div className="rounded-2xl border border-white/10 bg-slate-900 p-4">
                        <p className="font-black">
                          {stageLabels[stage]}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {stageDeals.length} fırsat ·{" "}
                          {money(stageRevenue)}
                        </p>
                      </div>

                      <div className="mt-3 space-y-3">
                        {stageDeals.map((deal) => {
                          const customer =
                            firstRelation(
                              deal.customer
                            );

                          return (
                            <article
                              key={deal.id}
                              className={`rounded-2xl border p-4 ${stageClasses(
                                deal.stage
                              )}`}
                            >
                              <p className="text-xs font-black uppercase tracking-wider text-orange-400">
                                %{deal.probability}
                              </p>

                              <h3 className="mt-2 font-black">
                                {deal.title}
                              </h3>

                              {customer && (
                                <p className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                                  <FaUser />
                                  {customer.full_name}
                                </p>
                              )}

                              <div className="mt-4 space-y-1 text-sm">
                                <div className="flex justify-between gap-3">
                                  <span className="text-slate-500">
                                    Satış
                                  </span>
                                  <strong>
                                    {money(
                                      deal.expected_revenue
                                    )}
                                  </strong>
                                </div>

                                <div className="flex justify-between gap-3">
                                  <span className="text-slate-500">
                                    Kâr
                                  </span>
                                  <strong
                                    className={
                                      Number(
                                        deal.expected_profit
                                      ) >= 0
                                        ? "text-emerald-400"
                                        : "text-red-400"
                                    }
                                  >
                                    {money(
                                      deal.expected_profit
                                    )}
                                  </strong>
                                </div>
                              </div>

                              <select
                                disabled={movingId === deal.id}
                                value={deal.stage}
                                onChange={(event) =>
                                  void moveDeal(
                                    deal,
                                    event.target
                                      .value as DealStage
                                  )
                                }
                                className="mt-4 min-h-10 w-full rounded-xl bg-white px-3 text-xs font-black text-slate-950"
                              >
                                {pipelineStages.map(
                                  (nextStage) => (
                                    <option
                                      key={nextStage}
                                      value={nextStage}
                                    >
                                      {
                                        stageLabels[
                                          nextStage
                                        ]
                                      }
                                    </option>
                                  )
                                )}
                              </select>

                              <div className="mt-3 grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    editDeal(deal)
                                  }
                                  className="flex min-h-10 items-center justify-center gap-2 rounded-xl bg-orange-500 text-xs font-black"
                                >
                                  <FaEdit />
                                  Düzenle
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    void deleteDeal(deal)
                                  }
                                  className="flex min-h-10 items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 text-xs font-black text-red-400"
                                >
                                  <FaTrash />
                                  Sil
                                </button>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
