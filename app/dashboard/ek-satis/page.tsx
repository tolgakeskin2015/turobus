"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  FaCashRegister,
  FaCheckCircle,
  FaMoneyBillWave,
  FaSearch,
  FaShoppingCart,
  FaUserTie,
} from "react-icons/fa";
import { supabase } from "@/lib/supabase";
import {
  CurrentMembership,
  getCurrentMembership,
} from "@/lib/current-user";

type PaymentStatus =
  | "pending"
  | "paid"
  | "partial"
  | "refunded"
  | "cancelled";

type PaymentMethod =
  | "cash"
  | "card"
  | "iyzico"
  | "bank_transfer"
  | "wallet"
  | "room_charge"
  | "other";

type SalesChannel =
  | "office"
  | "crew"
  | "guide"
  | "guest_app"
  | "website"
  | "marketplace"
  | "partner"
  | "other";

type ReservationOption = {
  id: string;
  reservation_code: string | null;
  full_name: string;
  phone: string;
  email: string;
  tour_title: string;
  tour_date: string;
  guests: number;
};

type ProductOption = {
  id: string;
  supplier_id: string | null;
  name: string;
  sku: string | null;
  sales_price: number;
  cost_price: number;
  guide_commission_type:
    | "fixed"
    | "percentage"
    | "none";
  guide_commission_value: number;
  tax_rate: number;
  remaining_capacity: number | null;
  requires_reservation: boolean;
};

type StaffOption = {
  id: string;
  full_name: string;
  staff_role: string;
};

type SaleRecord = {
  id: string;
  sale_code: string;
  sales_channel: SalesChannel;
  customer_name: string | null;
  grand_total: number;
  total_cost: number;
  total_guide_commission: number;
  company_gross_profit: number;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod | null;
  sold_at: string;
  reservation:
    | {
        reservation_code: string | null;
        tour_title: string;
      }
    | {
        reservation_code: string | null;
        tour_title: string;
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
  items:
    | {
        product_name: string;
        quantity: number;
      }[]
    | null;
};

type SaleForm = {
  reservation_id: string;
  product_id: string;
  sold_by_staff_id: string;
  sales_channel: SalesChannel;
  quantity: string;
  unit_price: string;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod;
  paid_amount: string;
  participant_name: string;
  service_date: string;
  service_time: string;
  notes: string;
};

const emptyForm: SaleForm = {
  reservation_id: "",
  product_id: "",
  sold_by_staff_id: "",
  sales_channel: "office",
  quantity: "1",
  unit_price: "",
  payment_status: "paid",
  payment_method: "cash",
  paid_amount: "",
  participant_name: "",
  service_date: "",
  service_time: "",
  notes: "",
};

const channelLabels: Record<SalesChannel, string> = {
  office: "Ofis",
  crew: "Crew Paneli",
  guide: "Rehber",
  guest_app: "Misafir Uygulaması",
  website: "Web Sitesi",
  marketplace: "Marketplace",
  partner: "İş Ortağı",
  other: "Diğer",
};

const paymentStatusLabels: Record<
  PaymentStatus,
  string
> = {
  pending: "Ödeme Bekliyor",
  paid: "Ödendi",
  partial: "Kısmi Ödeme",
  refunded: "İade",
  cancelled: "İptal",
};

const paymentMethodLabels: Record<
  PaymentMethod,
  string
> = {
  cash: "Nakit",
  card: "Kredi Kartı",
  iyzico: "İyzico",
  bank_transfer: "Havale / EFT",
  wallet: "Dijital Cüzdan",
  room_charge: "Oda Hesabı",
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

function money(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
  }).format(Number(value || 0));
}

function createSaleCode() {
  const date = new Date()
    .toISOString()
    .slice(0, 10)
    .replaceAll("-", "");

  const random = crypto.randomUUID()
    .replaceAll("-", "")
    .slice(0, 8)
    .toUpperCase();

  return `SAT-${date}-${random}`;
}

export default function ExtraSalesPage() {
  const [membership, setMembership] =
    useState<CurrentMembership | null>(null);

  const [reservations, setReservations] = useState<
    ReservationOption[]
  >([]);

  const [products, setProducts] = useState<
    ProductOption[]
  >([]);

  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [sales, setSales] = useState<SaleRecord[]>([]);

  const [form, setForm] =
    useState<SaleForm>(emptyForm);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] =
    useState("");

  const loadData = useCallback(
    async (companyId: string) => {
      const [
        { data: reservationData, error: reservationError },
        { data: productData, error: productError },
        { data: staffData, error: staffError },
        { data: salesData, error: salesError },
      ] = await Promise.all([
        supabase
          .from("reservations")
          .select(
            "id, reservation_code, full_name, phone, email, tour_title, tour_date, guests"
          )
          .eq("company_id", companyId)
          .neq("status", "cancelled")
          .order("tour_date", {
            ascending: false,
          }),

        supabase
          .from("products")
          .select(
            "id, supplier_id, name, sku, sales_price, cost_price, guide_commission_type, guide_commission_value, tax_rate, remaining_capacity, requires_reservation"
          )
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
          .from("sales")
          .select(`
            id,
            sale_code,
            sales_channel,
            customer_name,
            grand_total,
            total_cost,
            total_guide_commission,
            company_gross_profit,
            payment_status,
            payment_method,
            sold_at,
            reservation:reservations (
              reservation_code,
              tour_title
            ),
            staff:staff_profiles (
              full_name
            ),
            items:sale_items (
              product_name,
              quantity
            )
          `)
          .eq("company_id", companyId)
          .order("sold_at", {
            ascending: false,
          })
          .limit(100),
      ]);

      const errors = [
        reservationError,
        productError,
        staffError,
        salesError,
      ].filter(Boolean);

      if (errors.length > 0) {
        console.error(errors);

        setErrorMessage(
          errors[0]?.message ||
            "Ek satış verileri yüklenemedi."
        );
      }

      setReservations(
        (reservationData ?? []) as ReservationOption[]
      );

      setProducts(
        (productData ?? []) as ProductOption[]
      );

      setStaff((staffData ?? []) as StaffOption[]);

      setSales(
        (salesData ?? []) as unknown as SaleRecord[]
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
          "Ek satış ekranı hazırlanamadı."
        );
      } finally {
        setLoading(false);
      }
    }

    void initialize();
  }, [loadData]);

  const selectedReservation = useMemo(
    () =>
      reservations.find(
        (reservation) =>
          reservation.id === form.reservation_id
      ) ?? null,
    [form.reservation_id, reservations]
  );

  const selectedProduct = useMemo(
    () =>
      products.find(
        (product) => product.id === form.product_id
      ) ?? null,
    [form.product_id, products]
  );

  const calculation = useMemo(() => {
    const quantity = Math.max(
      0,
      Number(form.quantity) || 0
    );

    const unitPrice = Math.max(
      0,
      Number(form.unit_price) || 0
    );

    const unitCost = Number(
      selectedProduct?.cost_price ?? 0
    );

    const grossTotal = quantity * unitPrice;
    const totalCost = quantity * unitCost;

    let guideCommission = 0;

    if (
      selectedProduct?.guide_commission_type ===
      "fixed"
    ) {
      guideCommission =
        quantity *
        Number(
          selectedProduct.guide_commission_value
        );
    }

    if (
      selectedProduct?.guide_commission_type ===
      "percentage"
    ) {
      guideCommission =
        (grossTotal *
          Number(
            selectedProduct.guide_commission_value
          )) /
        100;
    }

    const taxRate = Number(
      selectedProduct?.tax_rate ?? 0
    );

    const taxAmount =
      taxRate > 0
        ? grossTotal -
          grossTotal / (1 + taxRate / 100)
        : 0;

    const companyProfit =
      grossTotal - totalCost - guideCommission;

    return {
      quantity,
      unitPrice,
      grossTotal,
      totalCost,
      guideCommission,
      taxRate,
      taxAmount,
      companyProfit,
    };
  }, [
    form.quantity,
    form.unit_price,
    selectedProduct,
  ]);

  useEffect(() => {
    if (!selectedProduct) return;

    setForm((current) => ({
      ...current,
      unit_price:
        selectedProduct.sales_price.toString(),
    }));
  }, [selectedProduct]);

  useEffect(() => {
    if (!selectedReservation) return;

    setForm((current) => ({
      ...current,
      participant_name:
        current.participant_name ||
        selectedReservation.full_name,
      service_date:
        current.service_date ||
        selectedReservation.tour_date,
    }));
  }, [selectedReservation]);

  useEffect(() => {
    if (form.payment_status === "paid") {
      setForm((current) => ({
        ...current,
        paid_amount:
          calculation.grossTotal.toString(),
      }));
    }
  }, [
    calculation.grossTotal,
    form.payment_status,
  ]);

  const filteredSales = useMemo(() => {
    const query = search
      .trim()
      .toLocaleLowerCase("tr-TR");

    if (!query) return sales;

    return sales.filter((sale) => {
      const reservation = firstRelation(
        sale.reservation
      );

      const staffRecord = firstRelation(sale.staff);

      const productNames = (sale.items ?? [])
        .map((item) => item.product_name)
        .join(" ");

      return [
        sale.sale_code,
        sale.customer_name,
        reservation?.reservation_code,
        reservation?.tour_title,
        staffRecord?.full_name,
        productNames,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value)
            .toLocaleLowerCase("tr-TR")
            .includes(query)
        );
    });
  }, [sales, search]);

  const stats = useMemo(() => {
    const paidSales = sales.filter(
      (sale) => sale.payment_status === "paid"
    );

    return {
      count: sales.length,
      revenue: paidSales.reduce(
        (total, sale) =>
          total + Number(sale.grand_total),
        0
      ),
      cost: paidSales.reduce(
        (total, sale) =>
          total + Number(sale.total_cost),
        0
      ),
      profit: paidSales.reduce(
        (total, sale) =>
          total + Number(sale.company_gross_profit),
        0
      ),
    };
  }, [sales]);

  function updateForm<K extends keyof SaleForm>(
    key: K,
    value: SaleForm[K]
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function saveSale(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      !membership ||
      !selectedReservation ||
      !selectedProduct
    ) {
      setErrorMessage(
        "Rezervasyon ve ürün seçilmelidir."
      );
      return;
    }

    if (calculation.quantity <= 0) {
      setErrorMessage(
        "Satış adedi sıfırdan büyük olmalıdır."
      );
      return;
    }

    if (
      selectedProduct.remaining_capacity !== null &&
      calculation.quantity >
        selectedProduct.remaining_capacity
    ) {
      setErrorMessage(
        `Yetersiz kontenjan. Kalan kontenjan: ${selectedProduct.remaining_capacity}`
      );
      return;
    }

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    const saleCode = createSaleCode();

    try {
      const { data: createdSale, error: saleError } =
        await supabase
          .from("sales")
          .insert({
            company_id: membership.company_id,
            reservation_id:
              selectedReservation.id,
            sold_by_staff_id:
              form.sold_by_staff_id || null,
            sale_code: saleCode,
            sales_channel: form.sales_channel,
            customer_name:
              selectedReservation.full_name,
            customer_phone:
              selectedReservation.phone || null,
            customer_email:
              selectedReservation.email || null,
            currency: "TRY",
            subtotal: calculation.grossTotal,
            discount_total: 0,
            tax_total: calculation.taxAmount,
            grand_total: calculation.grossTotal,
            total_cost: calculation.totalCost,
            total_guide_commission:
              calculation.guideCommission,
            company_gross_profit:
              calculation.companyProfit,
            payment_status:
              form.payment_status,
            payment_method:
              form.payment_method,
            paid_amount: Math.max(
              0,
              Number(form.paid_amount) || 0
            ),
            notes: form.notes.trim() || null,
          })
          .select("id")
          .single();

      if (saleError || !createdSale) {
        throw (
          saleError ??
          new Error("Satış kaydı oluşturulamadı.")
        );
      }

      const { error: itemError } = await supabase
        .from("sale_items")
        .insert({
          company_id: membership.company_id,
          sale_id: createdSale.id,
          product_id: selectedProduct.id,
          supplier_id:
            selectedProduct.supplier_id,
          product_name: selectedProduct.name,
          quantity: calculation.quantity,
          unit_price: calculation.unitPrice,
          unit_cost:
            Number(selectedProduct.cost_price),
          discount_amount: 0,
          tax_rate: calculation.taxRate,
          tax_amount: calculation.taxAmount,
          line_total: calculation.grossTotal,
          line_cost: calculation.totalCost,
          guide_commission_amount:
            calculation.guideCommission,
          company_profit:
            calculation.companyProfit,
          service_date:
            form.service_date || null,
          service_time:
            form.service_time || null,
          participant_name:
            form.participant_name.trim() ||
            selectedReservation.full_name,
          status: "confirmed",
          notes: form.notes.trim() || null,
        });

      if (itemError) {
        await supabase
          .from("sales")
          .delete()
          .eq("id", createdSale.id);

        throw itemError;
      }

      if (
        selectedProduct.remaining_capacity !== null
      ) {
        const newRemainingCapacity = Math.max(
          0,
          selectedProduct.remaining_capacity -
            calculation.quantity
        );

        const { error: capacityError } =
          await supabase
            .from("products")
            .update({
              remaining_capacity:
                newRemainingCapacity,
              updated_at: new Date().toISOString(),
            })
            .eq("id", selectedProduct.id)
            .eq(
              "company_id",
              membership.company_id
            );

        if (capacityError) {
          console.error(
            "Kontenjan güncellenemedi:",
            capacityError
          );
        }
      }

      setSuccessMessage(
        `${selectedProduct.name} satışı başarıyla kaydedildi. Satış kodu: ${saleCode}`
      );

      setForm(emptyForm);

      await loadData(
        membership.company_id
      );
    } catch (error) {
      console.error(error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Ek satış kaydedilemedi."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-10 text-white">
        Ek satışlar yükleniyor...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-10 text-white lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header>
          <p className="text-sm font-black uppercase tracking-[0.25em] text-orange-400">
            TUROBUS COMMERCE
          </p>

          <h1 className="mt-3 text-4xl font-black md:text-5xl">
            Ek Satış Yönetimi
          </h1>

          <p className="mt-4 max-w-3xl text-slate-400">
            Misafirlere satılan aktivite ve hizmetleri;
            maliyet, rehber primi ve şirket kârıyla birlikte
            kaydedin.
          </p>
        </header>

        <section className="mt-9 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Toplam Satış", stats.count],
            ["Tahsil Edilen Ciro", money(stats.revenue)],
            ["Toplam Maliyet", money(stats.cost)],
            ["Şirkete Kalan", money(stats.profit)],
          ].map(([label, value]) => (
            <article
              key={String(label)}
              className="rounded-3xl border border-white/10 bg-slate-900 p-6"
            >
              <FaCashRegister className="text-orange-400" />

              <p className="mt-5 text-sm font-bold text-slate-500">
                {label}
              </p>

              <p className="mt-2 text-3xl font-black">
                {value}
              </p>
            </article>
          ))}
        </section>

        <section className="mt-8 grid gap-7 xl:grid-cols-[minmax(0,1fr)_380px]">
          <form
            onSubmit={saveSale}
            className="rounded-[32px] border border-white/10 bg-slate-900 p-6 lg:p-8"
          >
            <div className="flex items-center gap-3">
              <FaShoppingCart className="text-orange-400" />

              <h2 className="text-2xl font-black">
                Yeni Satış Oluştur
              </h2>
            </div>

            <div className="mt-7 grid gap-5 md:grid-cols-2">
              <label className="md:col-span-2">
                <span className="text-sm font-black">
                  Rezervasyon / Misafir
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

                  {reservations.map(
                    (reservation) => (
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
                    )
                  )}
                </select>
              </label>

              <label className="md:col-span-2">
                <span className="text-sm font-black">
                  Satılacak ürün
                </span>

                <select
                  required
                  value={form.product_id}
                  onChange={(event) =>
                    updateForm(
                      "product_id",
                      event.target.value
                    )
                  }
                  className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
                >
                  <option value="">Ürün seçin</option>

                  {products.map((product) => (
                    <option
                      key={product.id}
                      value={product.id}
                    >
                      {product.name}
                      {" — "}
                      {money(product.sales_price)}
                      {product.remaining_capacity !== null
                        ? ` — Kalan: ${product.remaining_capacity}`
                        : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="text-sm font-black">
                  Adet / Katılımcı
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
                  Birim satış fiyatı
                </span>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={form.unit_price}
                  onChange={(event) =>
                    updateForm(
                      "unit_price",
                      event.target.value
                    )
                  }
                  className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
                />
              </label>

              <label>
                <span className="text-sm font-black">
                  Satış kanalı
                </span>

                <select
                  value={form.sales_channel}
                  onChange={(event) =>
                    updateForm(
                      "sales_channel",
                      event.target.value as SalesChannel
                    )
                  }
                  className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
                >
                  {Object.entries(channelLabels).map(
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
                  Satışı yapan personel
                </span>

                <select
                  value={form.sold_by_staff_id}
                  onChange={(event) =>
                    updateForm(
                      "sold_by_staff_id",
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
                  Ödeme durumu
                </span>

                <select
                  value={form.payment_status}
                  onChange={(event) =>
                    updateForm(
                      "payment_status",
                      event.target.value as PaymentStatus
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
                      event.target.value as PaymentMethod
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
                  Tahsil edilen
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
                  Katılımcı adı
                </span>

                <input
                  value={form.participant_name}
                  onChange={(event) =>
                    updateForm(
                      "participant_name",
                      event.target.value
                    )
                  }
                  className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
                />
              </label>

              <label>
                <span className="text-sm font-black">
                  Hizmet tarihi
                </span>

                <input
                  type="date"
                  value={form.service_date}
                  onChange={(event) =>
                    updateForm(
                      "service_date",
                      event.target.value
                    )
                  }
                  className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
                />
              </label>

              <label>
                <span className="text-sm font-black">
                  Hizmet saati
                </span>

                <input
                  type="time"
                  value={form.service_time}
                  onChange={(event) =>
                    updateForm(
                      "service_time",
                      event.target.value
                    )
                  }
                  className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
                />
              </label>

              <label className="md:col-span-2">
                <span className="text-sm font-black">
                  Satış notu
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

            {errorMessage && (
              <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 font-bold text-red-400">
                {errorMessage}
              </div>
            )}

            {successMessage && (
              <div className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 font-bold text-emerald-400">
                <FaCheckCircle className="mt-1 shrink-0" />
                {successMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="mt-6 min-h-14 w-full rounded-2xl bg-orange-500 font-black disabled:opacity-50"
            >
              {saving
                ? "Satış kaydediliyor..."
                : "Ek Satışı Kaydet"}
            </button>
          </form>

          <aside className="h-fit rounded-[32px] border border-orange-500/20 bg-orange-500/10 p-6">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-400">
              Canlı kârlılık
            </p>

            <h2 className="mt-2 text-2xl font-black">
              Satış Özeti
            </h2>

            <div className="mt-6 space-y-3">
              {[
                [
                  "Toplam satış",
                  money(calculation.grossTotal),
                ],
                [
                  "Tedarikçi maliyeti",
                  money(calculation.totalCost),
                ],
                [
                  "Rehber primi",
                  money(calculation.guideCommission),
                ],
                [
                  "Hesaplanan KDV",
                  money(calculation.taxAmount),
                ],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex justify-between gap-4 rounded-2xl bg-slate-950 p-4"
                >
                  <span className="text-sm text-slate-500">
                    {label}
                  </span>

                  <strong>{value}</strong>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-2xl bg-emerald-500/15 p-5">
              <p className="text-sm text-emerald-300">
                Şirkete kalan brüt kâr
              </p>

              <p className="mt-2 text-3xl font-black text-emerald-400">
                {money(calculation.companyProfit)}
              </p>
            </div>

            {calculation.companyProfit < 0 && (
              <div className="mt-4 rounded-2xl bg-red-500/15 p-4 text-sm font-black text-red-400">
                Bu satış zarar oluşturuyor.
              </div>
            )}
          </aside>
        </section>

        <section className="mt-8">
          <label className="flex min-h-14 items-center gap-3 rounded-2xl bg-white px-5">
            <FaSearch className="text-orange-500" />

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Satış kodu, misafir, tur, ürün veya personel ara"
              className="w-full bg-transparent font-bold text-slate-950 outline-none"
            />
          </label>

          <div className="mt-6 grid gap-5 xl:grid-cols-2">
            {filteredSales.map((sale) => {
              const reservation = firstRelation(
                sale.reservation
              );

              const staffRecord = firstRelation(
                sale.staff
              );

              return (
                <article
                  key={sale.id}
                  className="rounded-[30px] border border-white/10 bg-slate-900 p-6"
                >
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider text-orange-400">
                        {sale.sale_code}
                      </p>

                      <h2 className="mt-2 text-xl font-black">
                        {sale.customer_name ||
                          "TUROBUS Misafiri"}
                      </h2>

                      <p className="mt-2 text-sm text-slate-500">
                        {reservation?.tour_title ||
                          "Ek Hizmet Satışı"}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1.5 text-xs font-black ${
                        sale.payment_status === "paid"
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-amber-500/15 text-amber-400"
                      }`}
                    >
                      {
                        paymentStatusLabels[
                          sale.payment_status
                        ]
                      }
                    </span>
                  </div>

                  <div className="mt-5 space-y-2">
                    {(sale.items ?? []).map(
                      (item, index) => (
                        <div
                          key={`${item.product_name}-${index}`}
                          className="flex justify-between rounded-2xl bg-slate-950 p-4"
                        >
                          <span className="font-black">
                            {item.product_name}
                          </span>

                          <span className="text-slate-400">
                            {item.quantity} adet
                          </span>
                        </div>
                      )
                    )}
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl bg-slate-950 p-4">
                      <p className="text-slate-500">
                        Satış
                      </p>
                      <p className="mt-1 font-black text-emerald-400">
                        {money(sale.grand_total)}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-950 p-4">
                      <p className="text-slate-500">
                        Maliyet
                      </p>
                      <p className="mt-1 font-black text-red-400">
                        {money(sale.total_cost)}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-950 p-4">
                      <p className="text-slate-500">
                        Rehber primi
                      </p>
                      <p className="mt-1 font-black text-orange-400">
                        {money(
                          sale.total_guide_commission
                        )}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-950 p-4">
                      <p className="text-slate-500">
                        Şirkete kalan
                      </p>
                      <p className="mt-1 font-black text-blue-400">
                        {money(
                          sale.company_gross_profit
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-2">
                      <FaUserTie />
                      {staffRecord?.full_name ||
                        channelLabels[
                          sale.sales_channel
                        ]}
                    </span>

                    <span>
                      {new Date(
                        sale.sold_at
                      ).toLocaleString("tr-TR")}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
