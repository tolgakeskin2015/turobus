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
  FaEdit,
  FaGasPump,
  FaHotel,
  FaMoneyBillWave,
  FaPlus,
  FaSearch,
  FaTrash,
} from "react-icons/fa";
import { supabase } from "@/lib/supabase";
import {
  CurrentMembership,
  getCurrentMembership,
} from "@/lib/current-user";

type ExpenseCategory =
  | "fuel"
  | "vehicle_rental"
  | "hotel"
  | "activity_supplier"
  | "guide_fee"
  | "driver_fee"
  | "food"
  | "drink"
  | "parking"
  | "highway"
  | "maintenance"
  | "washing"
  | "commission"
  | "payment_fee"
  | "advertising"
  | "insurance"
  | "tax"
  | "club_payment"
  | "marketplace_payment"
  | "refund"
  | "other";

type ExpensePaymentStatus =
  | "pending"
  | "paid"
  | "partial"
  | "cancelled";

type ExpensePaymentMethod =
  | "cash"
  | "card"
  | "bank_transfer"
  | "iyzico"
  | "company_account"
  | "other";

type ReservationOption = {
  id: string;
  reservation_code: string | null;
  full_name: string;
  tour_title: string;
  tour_date: string;
  guests: number;
};

type AssignmentOption = {
  id: string;
  reservation_id: string;
  assignment_status: string;
  pickup_point: string | null;
  destination_name: string | null;
  reservation:
    | {
        reservation_code: string | null;
        full_name: string;
        tour_title: string;
        tour_date: string;
      }
    | {
        reservation_code: string | null;
        full_name: string;
        tour_title: string;
        tour_date: string;
      }[]
    | null;
};

type VehicleOption = {
  id: string;
  plate_number: string;
  display_name: string | null;
};

type SupplierOption = {
  id: string;
  name: string;
};

type StaffOption = {
  id: string;
  full_name: string;
  staff_role: string;
};

type Expense = {
  id: string;
  company_id: string;
  reservation_id: string | null;
  assignment_id: string | null;
  vehicle_id: string | null;
  supplier_id: string | null;
  staff_id: string | null;
  expense_category: ExpenseCategory;
  description: string;
  quantity: number;
  unit_cost: number;
  total_amount: number;
  tax_rate: number;
  tax_amount: number;
  payment_status: ExpensePaymentStatus;
  payment_method: ExpensePaymentMethod | null;
  paid_amount: number;
  expense_date: string;
  receipt_number: string | null;
  invoice_number: string | null;
  notes: string | null;
  created_at: string;
  reservation:
    | {
        reservation_code: string | null;
        full_name: string;
        tour_title: string;
      }
    | {
        reservation_code: string | null;
        full_name: string;
        tour_title: string;
      }[]
    | null;
  vehicle:
    | {
        plate_number: string;
        display_name: string | null;
      }
    | {
        plate_number: string;
        display_name: string | null;
      }[]
    | null;
  supplier:
    | {
        name: string;
      }
    | {
        name: string;
      }[]
    | null;
  staff:
    | {
        full_name: string;
      }
    | {
        full_name: string;
      }[]
    | null;
};

type SaleSummary = {
  reservation_id: string | null;
  grand_total: number;
  total_cost: number;
  total_guide_commission: number;
  company_gross_profit: number;
  payment_status: string;
};

type ExpenseForm = {
  reservation_id: string;
  assignment_id: string;
  vehicle_id: string;
  supplier_id: string;
  staff_id: string;
  expense_category: ExpenseCategory;
  description: string;
  quantity: string;
  unit_cost: string;
  tax_rate: string;
  payment_status: ExpensePaymentStatus;
  payment_method: ExpensePaymentMethod;
  paid_amount: string;
  expense_date: string;
  receipt_number: string;
  invoice_number: string;
  notes: string;
};

const today = new Date().toISOString().slice(0, 10);

const emptyForm: ExpenseForm = {
  reservation_id: "",
  assignment_id: "",
  vehicle_id: "",
  supplier_id: "",
  staff_id: "",
  expense_category: "fuel",
  description: "",
  quantity: "1",
  unit_cost: "0",
  tax_rate: "0",
  payment_status: "paid",
  payment_method: "cash",
  paid_amount: "0",
  expense_date: today,
  receipt_number: "",
  invoice_number: "",
  notes: "",
};

const categoryLabels: Record<ExpenseCategory, string> = {
  fuel: "Mazot / Yakıt",
  vehicle_rental: "Araç Kiralama",
  hotel: "Otel",
  activity_supplier: "Aktivite Tedarikçisi",
  guide_fee: "Rehber Ücreti",
  driver_fee: "Şoför Ücreti",
  food: "Yemek",
  drink: "İçecek",
  parking: "Otopark",
  highway: "Otoyol / Köprü",
  maintenance: "Araç Bakımı",
  washing: "Araç Yıkama",
  commission: "Komisyon",
  payment_fee: "Ödeme / Kart Kesintisi",
  advertising: "Reklam",
  insurance: "Sigorta",
  tax: "Vergi",
  club_payment: "Gece Kulübü Ödemesi",
  marketplace_payment: "Marketplace Ödemesi",
  refund: "Müşteri İadesi",
  other: "Diğer",
};

const paymentStatusLabels: Record<
  ExpensePaymentStatus,
  string
> = {
  pending: "Ödeme Bekliyor",
  paid: "Ödendi",
  partial: "Kısmi Ödeme",
  cancelled: "İptal",
};

const paymentMethodLabels: Record<
  ExpensePaymentMethod,
  string
> = {
  cash: "Nakit",
  card: "Kredi Kartı",
  bank_transfer: "Havale / EFT",
  iyzico: "İyzico",
  company_account: "Şirket Cari Hesabı",
  other: "Diğer",
};

function firstRelation<T>(
  value: T | T[] | null | undefined
) {
  if (!value) return null;

  return Array.isArray(value)
    ? value[0] ?? null
    : value;
}

function parseDecimal(value: string | number | null | undefined) {
  if (value === null || value === undefined) return 0;

  const normalized = String(value)
    .trim()
    .replace(/\s/g, "")
    .replace(",", ".");

  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : 0;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function money(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
  }).format(Number(value || 0));
}

function categoryClasses(category: ExpenseCategory) {
  if (category === "fuel") {
    return "bg-amber-500/15 text-amber-400";
  }

  if (category === "hotel") {
    return "bg-blue-500/15 text-blue-400";
  }

  if (category === "vehicle_rental") {
    return "bg-violet-500/15 text-violet-400";
  }

  if (
    category === "guide_fee" ||
    category === "driver_fee"
  ) {
    return "bg-emerald-500/15 text-emerald-400";
  }

  return "bg-red-500/15 text-red-400";
}

export default function ExpensesPage() {
  const [membership, setMembership] =
    useState<CurrentMembership | null>(null);

  const [reservations, setReservations] =
    useState<ReservationOption[]>([]);

  const [assignments, setAssignments] =
    useState<AssignmentOption[]>([]);

  const [vehicles, setVehicles] =
    useState<VehicleOption[]>([]);

  const [suppliers, setSuppliers] =
    useState<SupplierOption[]>([]);

  const [staff, setStaff] =
    useState<StaffOption[]>([]);

  const [expenses, setExpenses] =
    useState<Expense[]>([]);

  const [sales, setSales] =
    useState<SaleSummary[]>([]);

  const [form, setForm] =
    useState<ExpenseForm>(emptyForm);

  const [editingId, setEditingId] = useState("");
  const [search, setSearch] = useState("");
  const [filterReservationId, setFilterReservationId] =
    useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] =
    useState("");

  const loadData = useCallback(
    async (companyId: string) => {
      setErrorMessage("");

      const [
        { data: reservationData, error: reservationError },
        { data: assignmentData, error: assignmentError },
        { data: vehicleData, error: vehicleError },
        { data: supplierData, error: supplierError },
        { data: staffData, error: staffError },
        { data: expenseData, error: expenseError },
        { data: salesData, error: salesError },
      ] = await Promise.all([
        supabase
          .from("reservations")
          .select(
            "id, reservation_code, full_name, tour_title, tour_date, guests"
          )
          .eq("company_id", companyId)
          .neq("status", "cancelled")
          .order("tour_date", { ascending: false }),

        supabase
          .from("operation_assignments")
          .select(`
            id,
            reservation_id,
            assignment_status,
            pickup_point,
            destination_name,
            reservation:reservations (
              reservation_code,
              full_name,
              tour_title,
              tour_date
            )
          `)
          .eq("company_id", companyId)
          .order("created_at", { ascending: false }),

        supabase
          .from("vehicles")
          .select("id, plate_number, display_name")
          .eq("company_id", companyId)
          .eq("is_active", true)
          .order("plate_number"),

        supabase
          .from("suppliers")
          .select("id, name")
          .eq("company_id", companyId)
          .eq("is_active", true)
          .order("name"),

        supabase
          .from("staff_profiles")
          .select("id, full_name, staff_role")
          .eq("company_id", companyId)
          .eq("is_active", true)
          .order("full_name"),

        supabase
          .from("operation_expenses")
          .select(`
            id,
            company_id,
            reservation_id,
            assignment_id,
            vehicle_id,
            supplier_id,
            staff_id,
            expense_category,
            description,
            quantity,
            unit_cost,
            total_amount,
            tax_rate,
            tax_amount,
            payment_status,
            payment_method,
            paid_amount,
            expense_date,
            receipt_number,
            invoice_number,
            notes,
            created_at,
            reservation:reservations (
              reservation_code,
              full_name,
              tour_title
            ),
            vehicle:vehicles (
              plate_number,
              display_name
            ),
            supplier:suppliers (
              name
            ),
            staff:staff_profiles (
              full_name
            )
          `)
          .eq("company_id", companyId)
          .order("expense_date", { ascending: false })
          .limit(300),

        supabase
          .from("sales")
          .select(
            "reservation_id, grand_total, total_cost, total_guide_commission, company_gross_profit, payment_status"
          )
          .eq("company_id", companyId)
          .neq("payment_status", "cancelled"),
      ]);

      const errors = [
        reservationError,
        assignmentError,
        vehicleError,
        supplierError,
        staffError,
        expenseError,
        salesError,
      ].filter(Boolean);

      if (errors.length > 0) {
        console.error(errors);
        setErrorMessage(
          errors[0]?.message ||
            "Gider verileri yüklenemedi."
        );
      }

      setReservations(
        (reservationData ?? []) as ReservationOption[]
      );

      setAssignments(
        (assignmentData ?? []) as unknown as AssignmentOption[]
      );

      setVehicles(
        (vehicleData ?? []) as VehicleOption[]
      );

      setSuppliers(
        (supplierData ?? []) as SupplierOption[]
      );

      setStaff((staffData ?? []) as StaffOption[]);

      setExpenses(
        (expenseData ?? []) as unknown as Expense[]
      );

      setSales(
        (salesData ?? []) as SaleSummary[]
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
        await loadData(
          currentMembership.company_id
        );
      } catch (error) {
        console.error(error);
        setErrorMessage(
          "Gider yönetimi hazırlanamadı."
        );
      } finally {
        setLoading(false);
      }
    }

    void initialize();
  }, [loadData]);

  const calculation = useMemo(() => {
    const quantity = Math.max(
      0,
      parseDecimal(form.quantity)
    );

    const unitCost = roundMoney(
      Math.max(0, parseDecimal(form.unit_cost))
    );

    const totalAmount = roundMoney(
      quantity * unitCost
    );

    const taxRate = Math.max(
      0,
      parseDecimal(form.tax_rate)
    );

    const taxAmount =
      taxRate > 0
        ? Math.round(
            (
              totalAmount -
              totalAmount / (1 + taxRate / 100)
            ) * 100
          ) / 100
        : 0;

    return {
      quantity,
      unitCost,
      totalAmount,
      taxRate,
      taxAmount,
    };
  }, [
    form.quantity,
    form.unit_cost,
    form.tax_rate,
  ]);

  useEffect(() => {
    if (form.payment_status === "paid") {
      setForm((current) => ({
        ...current,
        paid_amount:
          calculation.totalAmount.toString(),
      }));
    }
  }, [
    calculation.totalAmount,
    form.payment_status,
  ]);

  const filteredExpenses = useMemo(() => {
    const query = search
      .trim()
      .toLocaleLowerCase("tr-TR");

    return expenses.filter((expense) => {
      if (
        filterReservationId &&
        expense.reservation_id !== filterReservationId
      ) {
        return false;
      }

      if (!query) return true;

      const reservation = firstRelation(
        expense.reservation
      );

      const vehicle = firstRelation(expense.vehicle);
      const supplier = firstRelation(
        expense.supplier
      );
      const staffRecord = firstRelation(expense.staff);

      return [
        expense.description,
        expense.receipt_number,
        expense.invoice_number,
        reservation?.reservation_code,
        reservation?.full_name,
        reservation?.tour_title,
        vehicle?.plate_number,
        supplier?.name,
        staffRecord?.full_name,
        categoryLabels[expense.expense_category],
      ]
        .filter(Boolean)
        .some((value) =>
          String(value)
            .toLocaleLowerCase("tr-TR")
            .includes(query)
        );
    });
  }, [
    expenses,
    filterReservationId,
    search,
  ]);

  const financeSummary = useMemo(() => {
    const relevantExpenses = filterReservationId
      ? expenses.filter(
          (expense) =>
            expense.reservation_id ===
            filterReservationId &&
            expense.payment_status !== "cancelled"
        )
      : expenses.filter(
          (expense) =>
            expense.payment_status !== "cancelled"
        );

    const relevantSales = filterReservationId
      ? sales.filter(
          (sale) =>
            sale.reservation_id === filterReservationId
        )
      : sales;

    const extraSalesRevenue = relevantSales.reduce(
      (total, sale) =>
        total + Number(sale.grand_total),
      0
    );

    const productCosts = relevantSales.reduce(
      (total, sale) =>
        total + Number(sale.total_cost),
      0
    );

    const guideCommissions = relevantSales.reduce(
      (total, sale) =>
        total +
        Number(sale.total_guide_commission),
      0
    );

    const operationalExpenses =
      relevantExpenses.reduce(
        (total, expense) =>
          total + Number(expense.total_amount),
        0
      );

    const totalExpense =
      productCosts +
      guideCommissions +
      operationalExpenses;

    return {
      extraSalesRevenue,
      productCosts,
      guideCommissions,
      operationalExpenses,
      totalExpense,
      contributionProfit:
        extraSalesRevenue - totalExpense,
    };
  }, [expenses, filterReservationId, sales]);

  function updateForm<K extends keyof ExpenseForm>(
    key: K,
    value: ExpenseForm[K]
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

  function editExpense(expense: Expense) {
    setEditingId(expense.id);

    setForm({
      reservation_id: expense.reservation_id ?? "",
      assignment_id: expense.assignment_id ?? "",
      vehicle_id: expense.vehicle_id ?? "",
      supplier_id: expense.supplier_id ?? "",
      staff_id: expense.staff_id ?? "",
      expense_category: expense.expense_category,
      description: expense.description,
      quantity: expense.quantity.toString(),
      unit_cost: expense.unit_cost.toString(),
      tax_rate: expense.tax_rate.toString(),
      payment_status: expense.payment_status,
      payment_method:
        expense.payment_method ?? "cash",
      paid_amount: expense.paid_amount.toString(),
      expense_date: expense.expense_date,
      receipt_number:
        expense.receipt_number ?? "",
      invoice_number:
        expense.invoice_number ?? "",
      notes: expense.notes ?? "",
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function saveExpense(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!membership) return;

    if (!form.description.trim()) {
      setErrorMessage(
        "Gider açıklaması zorunludur."
      );
      return;
    }

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const payload = {
      company_id: membership.company_id,
      reservation_id:
        form.reservation_id || null,
      assignment_id:
        form.assignment_id || null,
      vehicle_id: form.vehicle_id || null,
      supplier_id:
        form.supplier_id || null,
      staff_id: form.staff_id || null,
      expense_category:
        form.expense_category,
      description: form.description.trim(),
      quantity: calculation.quantity,
      unit_cost: calculation.unitCost,
      total_amount:
        calculation.totalAmount,
      tax_rate: calculation.taxRate,
      tax_amount: calculation.taxAmount,
      payment_status:
        form.payment_status,
      payment_method:
        form.payment_method || null,
      paid_amount: roundMoney(
        Math.max(0, parseDecimal(form.paid_amount))
      ),
      expense_date: form.expense_date,
      receipt_number:
        form.receipt_number.trim() || null,
      invoice_number:
        form.invoice_number.trim() || null,
      notes: form.notes.trim() || null,
      created_by: user?.id ?? null,
      updated_at: new Date().toISOString(),
    };

    try {
      if (editingId) {
        const { error } = await supabase
          .from("operation_expenses")
          .update(payload)
          .eq("id", editingId)
          .eq(
            "company_id",
            membership.company_id
          );

        if (error) throw error;

        setSuccessMessage(
          "Gider başarıyla güncellendi."
        );
      } else {
        const { error } = await supabase
          .from("operation_expenses")
          .insert(payload);

        if (error) throw error;

        setSuccessMessage(
          "Yeni gider başarıyla kaydedildi."
        );
      }

      await loadData(
        membership.company_id
      );

      setForm(emptyForm);
      setEditingId("");
    } catch (error) {
      console.error(error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Gider kaydedilemedi."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteExpense(expense: Expense) {
    if (!membership) return;

    const confirmed = window.confirm(
      `${expense.description} giderini silmek istediğinize emin misiniz?`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("operation_expenses")
      .delete()
      .eq("id", expense.id)
      .eq(
        "company_id",
        membership.company_id
      );

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setSuccessMessage("Gider silindi.");

    await loadData(
      membership.company_id
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-10 text-white">
        Giderler yükleniyor...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-10 text-white lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header>
          <p className="text-sm font-black uppercase tracking-[0.25em] text-orange-400">
            TUROBUS FINANCE
          </p>

          <h1 className="mt-3 text-4xl font-black md:text-5xl">
            Gider Yönetimi
          </h1>

          <p className="mt-4 max-w-3xl text-slate-400">
            Operasyon, araç, otel, personel ve
            tedarikçi giderlerini tur bazında kayıt
            altına alın.
          </p>
        </header>

        <section className="mt-9 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-3xl border border-white/10 bg-slate-900 p-6">
            <FaMoneyBillWave className="text-emerald-400" />
            <p className="mt-5 text-sm text-slate-500">
              Ek Satış Geliri
            </p>
            <p className="mt-2 text-3xl font-black">
              {money(
                financeSummary.extraSalesRevenue
              )}
            </p>
          </article>

          <article className="rounded-3xl border border-white/10 bg-slate-900 p-6">
            <FaBus className="text-red-400" />
            <p className="mt-5 text-sm text-slate-500">
              Operasyon Giderleri
            </p>
            <p className="mt-2 text-3xl font-black">
              {money(
                financeSummary.operationalExpenses
              )}
            </p>
          </article>

          <article className="rounded-3xl border border-white/10 bg-slate-900 p-6">
            <FaHotel className="text-orange-400" />
            <p className="mt-5 text-sm text-slate-500">
              Ürün Maliyeti + Prim
            </p>
            <p className="mt-2 text-3xl font-black">
              {money(
                financeSummary.productCosts +
                  financeSummary.guideCommissions
              )}
            </p>
          </article>

          <article
            className={`rounded-3xl border p-6 ${
              financeSummary.contributionProfit >= 0
                ? "border-emerald-500/20 bg-emerald-500/10"
                : "border-red-500/20 bg-red-500/10"
            }`}
          >
            <FaMoneyBillWave
              className={
                financeSummary.contributionProfit >= 0
                  ? "text-emerald-400"
                  : "text-red-400"
              }
            />
            <p className="mt-5 text-sm text-slate-400">
              Operasyon Katkı Kârı
            </p>
            <p className="mt-2 text-3xl font-black">
              {money(
                financeSummary.contributionProfit
              )}
            </p>
          </article>
        </section>

        <section className="mt-8 grid gap-7 xl:grid-cols-[minmax(0,1fr)_360px]">
          <form
            onSubmit={saveExpense}
            className="rounded-[32px] border border-white/10 bg-slate-900 p-6 lg:p-8"
          >
            <div className="flex items-center gap-3">
              <FaPlus className="text-orange-400" />
              <h2 className="text-2xl font-black">
                {editingId
                  ? "Gideri Düzenle"
                  : "Yeni Gider Ekle"}
              </h2>
            </div>

            <div className="mt-7 grid gap-5 md:grid-cols-2">
              <label>
                <span className="text-sm font-black">
                  Gider kategorisi
                </span>
                <select
                  value={form.expense_category}
                  onChange={(event) =>
                    updateForm(
                      "expense_category",
                      event.target
                        .value as ExpenseCategory
                    )
                  }
                  className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
                >
                  {Object.entries(categoryLabels).map(
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
              </label>

              <label>
                <span className="text-sm font-black">
                  Gider tarihi
                </span>
                <input
                  type="date"
                  required
                  value={form.expense_date}
                  onChange={(event) =>
                    updateForm(
                      "expense_date",
                      event.target.value
                    )
                  }
                  className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
                />
              </label>

              <label className="md:col-span-2">
                <span className="text-sm font-black">
                  Açıklama
                </span>
                <input
                  required
                  value={form.description}
                  onChange={(event) =>
                    updateForm(
                      "description",
                      event.target.value
                    )
                  }
                  placeholder="Örnek: Saklıkent turu mazot gideri"
                  className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
                />
              </label>

              <label>
                <span className="text-sm font-black">
                  Rezervasyon
                </span>
                <select
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
                    Rezervasyon seçilmedi
                  </option>
                  {reservations.map((reservation) => (
                    <option
                      key={reservation.id}
                      value={reservation.id}
                    >
                      {reservation.reservation_code ??
                        reservation.id.slice(0, 10)}
                      {" — "}
                      {reservation.full_name}
                      {" — "}
                      {reservation.tour_title}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="text-sm font-black">
                  Operasyon görevi
                </span>
                <select
                  value={form.assignment_id}
                  onChange={(event) => {
                    const assignment =
                      assignments.find(
                        (item) =>
                          item.id === event.target.value
                      );

                    setForm((current) => ({
                      ...current,
                      assignment_id:
                        event.target.value,
                      reservation_id:
                        assignment?.reservation_id ||
                        current.reservation_id,
                    }));
                  }}
                  className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
                >
                  <option value="">
                    Görev seçilmedi
                  </option>
                  {assignments.map((assignment) => {
                    const reservation =
                      firstRelation(
                        assignment.reservation
                      );

                    return (
                      <option
                        key={assignment.id}
                        value={assignment.id}
                      >
                        {reservation?.tour_title ||
                          "Operasyon"}
                        {" — "}
                        {reservation?.full_name ||
                          assignment.id.slice(0, 8)}
                      </option>
                    );
                  })}
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
                  <option value="">
                    Araç seçilmedi
                  </option>
                  {vehicles.map((vehicle) => (
                    <option
                      key={vehicle.id}
                      value={vehicle.id}
                    >
                      {vehicle.plate_number}
                      {" — "}
                      {vehicle.display_name ||
                        "TUROBUS Aracı"}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="text-sm font-black">
                  Tedarikçi
                </span>
                <select
                  value={form.supplier_id}
                  onChange={(event) =>
                    updateForm(
                      "supplier_id",
                      event.target.value
                    )
                  }
                  className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
                >
                  <option value="">
                    Tedarikçi seçilmedi
                  </option>
                  {suppliers.map((supplier) => (
                    <option
                      key={supplier.id}
                      value={supplier.id}
                    >
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="text-sm font-black">
                  Personel
                </span>
                <select
                  value={form.staff_id}
                  onChange={(event) =>
                    updateForm(
                      "staff_id",
                      event.target.value
                    )
                  }
                  className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
                >
                  <option value="">
                    Personel seçilmedi
                  </option>
                  {staff.map((person) => (
                    <option
                      key={person.id}
                      value={person.id}
                    >
                      {person.full_name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="text-sm font-black">
                  Miktar
                </span>
                <input
                  type="number"
                  min="0.001"
                  step="0.001"
                  required
                  value={form.quantity}
                  onChange={(event) =>
                    updateForm(
                      "quantity",
                      event.target.value
                    )
                  }
                  className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
                />
              </label>

              <label>
                <span className="text-sm font-black">
                  Birim maliyet
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={form.unit_cost}
                  onChange={(event) =>
                    updateForm(
                      "unit_cost",
                      event.target.value
                    )
                  }
                  className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
                />
              </label>

              <label>
                <span className="text-sm font-black">
                  KDV oranı
                </span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={form.tax_rate}
                  onChange={(event) =>
                    updateForm(
                      "tax_rate",
                      event.target.value
                    )
                  }
                  className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
                />
              </label>

              <label>
                <span className="text-sm font-black">
                  Ödeme durumu
                </span>
                <select
                  value={form.payment_status}
                  onChange={(event) =>
                    updateForm(
                      "payment_status",
                      event.target
                        .value as ExpensePaymentStatus
                    )
                  }
                  className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
                >
                  {Object.entries(
                    paymentStatusLabels
                  ).map(([value, label]) => (
                    <option
                      key={value}
                      value={value}
                    >
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="text-sm font-black">
                  Ödeme yöntemi
                </span>
                <select
                  value={form.payment_method}
                  onChange={(event) =>
                    updateForm(
                      "payment_method",
                      event.target
                        .value as ExpensePaymentMethod
                    )
                  }
                  className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
                >
                  {Object.entries(
                    paymentMethodLabels
                  ).map(([value, label]) => (
                    <option
                      key={value}
                      value={value}
                    >
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="text-sm font-black">
                  Ödenen tutar
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.paid_amount}
                  onChange={(event) =>
                    updateForm(
                      "paid_amount",
                      event.target.value
                    )
                  }
                  className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
                />
              </label>

              <label>
                <span className="text-sm font-black">
                  Fiş numarası
                </span>
                <input
                  value={form.receipt_number}
                  onChange={(event) =>
                    updateForm(
                      "receipt_number",
                      event.target.value
                    )
                  }
                  className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
                />
              </label>

              <label>
                <span className="text-sm font-black">
                  Fatura numarası
                </span>
                <input
                  value={form.invoice_number}
                  onChange={(event) =>
                    updateForm(
                      "invoice_number",
                      event.target.value
                    )
                  }
                  className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
                />
              </label>

              <label className="md:col-span-2">
                <span className="text-sm font-black">
                  Notlar
                </span>
                <textarea
                  rows={4}
                  value={form.notes}
                  onChange={(event) =>
                    updateForm(
                      "notes",
                      event.target.value
                    )
                  }
                  className="mt-2 w-full rounded-2xl bg-white px-5 py-4 font-bold text-slate-950 outline-none"
                />
              </label>
            </div>

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

            <div className="mt-6 flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="min-h-14 rounded-2xl bg-orange-500 px-7 font-black disabled:opacity-50"
              >
                {saving
                  ? "Kaydediliyor..."
                  : editingId
                    ? "Gideri Güncelle"
                    : "Gideri Kaydet"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="min-h-14 rounded-2xl border border-white/10 px-7 font-black"
                >
                  İptal
                </button>
              )}
            </div>
          </form>

          <aside className="h-fit rounded-[32px] border border-red-500/20 bg-red-500/10 p-6">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-red-400">
              Gider hesaplama
            </p>

            <h2 className="mt-2 text-2xl font-black">
              Gider Özeti
            </h2>

            <div className="mt-6 space-y-3">
              <div className="flex justify-between rounded-2xl bg-slate-950 p-4">
                <span className="text-slate-500">
                  Miktar
                </span>
                <strong>{calculation.quantity}</strong>
              </div>

              <div className="flex justify-between rounded-2xl bg-slate-950 p-4">
                <span className="text-slate-500">
                  Birim maliyet
                </span>
                <strong>
                  {money(calculation.unitCost)}
                </strong>
              </div>

              <div className="flex justify-between rounded-2xl bg-slate-950 p-4">
                <span className="text-slate-500">
                  KDV tutarı
                </span>
                <strong>
                  {money(calculation.taxAmount)}
                </strong>
              </div>
            </div>

            <div className="mt-4 rounded-2xl bg-red-500/15 p-5">
              <p className="text-sm text-red-300">
                Toplam gider
              </p>
              <p className="mt-2 text-3xl font-black text-red-400">
                {money(calculation.totalAmount)}
              </p>
            </div>
          </aside>
        </section>

        <section className="mt-8">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex min-h-14 items-center gap-3 rounded-2xl bg-white px-5">
              <FaSearch className="text-orange-500" />
              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Gider, tur, araç, tedarikçi veya personel ara"
                className="w-full bg-transparent font-bold text-slate-950 outline-none"
              />
            </label>

            <select
              value={filterReservationId}
              onChange={(event) =>
                setFilterReservationId(
                  event.target.value
                )
              }
              className="min-h-14 rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
            >
              <option value="">
                Tüm rezervasyonlar
              </option>
              {reservations.map((reservation) => (
                <option
                  key={reservation.id}
                  value={reservation.id}
                >
                  {reservation.reservation_code ??
                    reservation.id.slice(0, 10)}
                  {" — "}
                  {reservation.full_name}
                  {" — "}
                  {reservation.tour_title}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-6 grid gap-5 xl:grid-cols-2">
            {filteredExpenses.map((expense) => {
              const reservation = firstRelation(
                expense.reservation
              );
              const vehicle = firstRelation(
                expense.vehicle
              );
              const supplier = firstRelation(
                expense.supplier
              );
              const staffRecord = firstRelation(
                expense.staff
              );

              return (
                <article
                  key={expense.id}
                  className="rounded-[30px] border border-white/10 bg-slate-900 p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span
                        className={`inline-flex rounded-full px-3 py-1.5 text-xs font-black ${categoryClasses(
                          expense.expense_category
                        )}`}
                      >
                        {
                          categoryLabels[
                            expense.expense_category
                          ]
                        }
                      </span>

                      <h2 className="mt-4 text-xl font-black">
                        {expense.description}
                      </h2>

                      <p className="mt-2 text-sm text-slate-500">
                        {new Date(
                          `${expense.expense_date}T00:00:00`
                        ).toLocaleDateString("tr-TR")}
                      </p>
                    </div>

                    <p className="text-2xl font-black text-red-400">
                      {money(expense.total_amount)}
                    </p>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {reservation && (
                      <div className="rounded-2xl bg-slate-950 p-4 text-sm">
                        <p className="text-slate-500">
                          Rezervasyon
                        </p>
                        <p className="mt-1 font-black">
                          {reservation.reservation_code ??
                            reservation.full_name}
                        </p>
                        <p className="mt-1 text-slate-500">
                          {reservation.tour_title}
                        </p>
                      </div>
                    )}

                    {vehicle && (
                      <div className="rounded-2xl bg-slate-950 p-4 text-sm">
                        <p className="text-slate-500">
                          Araç
                        </p>
                        <p className="mt-1 font-black">
                          {vehicle.plate_number}
                        </p>
                      </div>
                    )}

                    {supplier && (
                      <div className="rounded-2xl bg-slate-950 p-4 text-sm">
                        <p className="text-slate-500">
                          Tedarikçi
                        </p>
                        <p className="mt-1 font-black">
                          {supplier.name}
                        </p>
                      </div>
                    )}

                    {staffRecord && (
                      <div className="rounded-2xl bg-slate-950 p-4 text-sm">
                        <p className="text-slate-500">
                          Personel
                        </p>
                        <p className="mt-1 font-black">
                          {staffRecord.full_name}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        editExpense(expense)
                      }
                      className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-orange-500 font-black"
                    >
                      <FaEdit />
                      Düzenle
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        deleteExpense(expense)
                      }
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

          {filteredExpenses.length === 0 && (
            <div className="mt-6 rounded-3xl border border-white/10 bg-slate-900 p-10 text-center text-slate-400">
              Henüz gider kaydı bulunmuyor.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
