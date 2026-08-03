"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  FaBoxOpen,
  FaEdit,
  FaEye,
  FaPlus,
  FaSearch,
  FaStore,
  FaTrash,
} from "react-icons/fa";
import { supabase } from "@/lib/supabase";
import {
  CurrentMembership,
  getCurrentMembership,
} from "@/lib/current-user";

type ProductType =
  | "tour"
  | "activity"
  | "night_club"
  | "transfer"
  | "hotel"
  | "food"
  | "drink"
  | "photo"
  | "video"
  | "spa"
  | "rental"
  | "marketplace"
  | "other";

type CommissionType =
  | "fixed"
  | "percentage"
  | "none";

type SupplierOption = {
  id: string;
  name: string;
  supplier_type: string;
};

type Product = {
  id: string;
  company_id: string;
  supplier_id: string | null;
  name: string;
  sku: string | null;
  product_type: ProductType;
  description: string | null;
  image_url: string | null;
  sales_price: number;
  cost_price: number;
  guide_commission_type: CommissionType;
  guide_commission_value: number;
  tax_rate: number;
  capacity: number | null;
  remaining_capacity: number | null;
  requires_reservation: boolean;
  guest_app_visible: boolean;
  crew_app_visible: boolean;
  marketplace_visible: boolean;
  is_active: boolean;
  created_at: string;
  supplier:
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

type ProductForm = {
  supplier_id: string;
  name: string;
  sku: string;
  product_type: ProductType;
  description: string;
  image_url: string;
  sales_price: string;
  cost_price: string;
  guide_commission_type: CommissionType;
  guide_commission_value: string;
  tax_rate: string;
  capacity: string;
  remaining_capacity: string;
  requires_reservation: boolean;
  guest_app_visible: boolean;
  crew_app_visible: boolean;
  marketplace_visible: boolean;
  is_active: boolean;
};

const emptyForm: ProductForm = {
  supplier_id: "",
  name: "",
  sku: "",
  product_type: "activity",
  description: "",
  image_url: "",
  sales_price: "0",
  cost_price: "0",
  guide_commission_type: "fixed",
  guide_commission_value: "0",
  tax_rate: "0",
  capacity: "",
  remaining_capacity: "",
  requires_reservation: false,
  guest_app_visible: true,
  crew_app_visible: true,
  marketplace_visible: false,
  is_active: true,
};

const productTypeLabels: Record<ProductType, string> = {
  tour: "Tur",
  activity: "Aktivite",
  night_club: "Gece Kulübü",
  transfer: "Transfer",
  hotel: "Otel",
  food: "Yemek",
  drink: "İçecek",
  photo: "Fotoğraf",
  video: "Video",
  spa: "Spa / Masaj",
  rental: "Kiralama",
  marketplace: "Marketplace",
  other: "Diğer",
};

const commissionTypeLabels: Record<
  CommissionType,
  string
> = {
  fixed: "Sabit Tutar",
  percentage: "Yüzde",
  none: "Prim Yok",
};

function firstRelation<T>(
  value: T | T[] | null | undefined
) {
  if (!value) return null;

  return Array.isArray(value)
    ? value[0] ?? null
    : value;
}

function numberValue(value: string) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function nullableNumber(value: string) {
  if (!value.trim()) return null;

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function productTypeClasses(type: ProductType) {
  if (type === "activity") {
    return "bg-orange-500/15 text-orange-400";
  }

  if (type === "night_club") {
    return "bg-violet-500/15 text-violet-400";
  }

  if (type === "transfer") {
    return "bg-blue-500/15 text-blue-400";
  }

  if (type === "marketplace") {
    return "bg-cyan-500/15 text-cyan-400";
  }

  if (type === "spa") {
    return "bg-pink-500/15 text-pink-400";
  }

  return "bg-slate-500/15 text-slate-400";
}

export default function ProductsPage() {
  const [membership, setMembership] =
    useState<CurrentMembership | null>(null);

  const [suppliers, setSuppliers] =
    useState<SupplierOption[]>([]);

  const [products, setProducts] =
    useState<Product[]>([]);

  const [form, setForm] =
    useState<ProductForm>(emptyForm);

  const [editingId, setEditingId] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] =
    useState("");

  const loadData = useCallback(
    async (companyId: string) => {
      setErrorMessage("");

      const [
        { data: supplierData, error: supplierError },
        { data: productData, error: productError },
      ] = await Promise.all([
        supabase
          .from("suppliers")
          .select("id, name, supplier_type")
          .eq("company_id", companyId)
          .eq("is_active", true)
          .order("name", {
            ascending: true,
          }),

        supabase
          .from("products")
          .select(`
            id,
            company_id,
            supplier_id,
            name,
            sku,
            product_type,
            description,
            image_url,
            sales_price,
            cost_price,
            guide_commission_type,
            guide_commission_value,
            tax_rate,
            capacity,
            remaining_capacity,
            requires_reservation,
            guest_app_visible,
            crew_app_visible,
            marketplace_visible,
            is_active,
            created_at,
            supplier:suppliers (
              id,
              name
            )
          `)
          .eq("company_id", companyId)
          .order("created_at", {
            ascending: false,
          }),
      ]);

      if (supplierError) {
        console.error(
          "Tedarikçi listesi yüklenemedi:",
          supplierError
        );
      }

      if (productError) {
        console.error(
          "Ürünler yüklenemedi:",
          productError
        );

        setErrorMessage(productError.message);
      }

      setSuppliers(
        (supplierData ?? []) as SupplierOption[]
      );

      setProducts(
        (productData ?? []) as unknown as Product[]
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
          "Ürün kataloğu hazırlanamadı."
        );
      } finally {
        setLoading(false);
      }
    }

    void initialize();
  }, [loadData]);

  const filteredProducts = useMemo(() => {
    const query = search
      .trim()
      .toLocaleLowerCase("tr-TR");

    if (!query) {
      return products;
    }

    return products.filter((product) => {
      const supplier = firstRelation(
        product.supplier
      );

      return [
        product.name,
        product.sku,
        product.description,
        supplier?.name,
        productTypeLabels[
          product.product_type
        ],
      ]
        .filter(Boolean)
        .some((value) =>
          String(value)
            .toLocaleLowerCase("tr-TR")
            .includes(query)
        );
    });
  }, [products, search]);

  const stats = useMemo(() => {
    const activeProducts = products.filter(
      (product) => product.is_active
    );

    const totalSalesValue = activeProducts.reduce(
      (total, product) =>
        total + Number(product.sales_price),
      0
    );

    const totalPotentialProfit =
      activeProducts.reduce(
        (total, product) =>
          total +
          (Number(product.sales_price) -
            Number(product.cost_price)),
        0
      );

    return {
      total: products.length,
      active: activeProducts.length,
      guestVisible: products.filter(
        (product) => product.guest_app_visible
      ).length,
      averageMargin:
        totalSalesValue > 0
          ? (totalPotentialProfit /
              totalSalesValue) *
            100
          : 0,
    };
  }, [products]);

  function updateForm<K extends keyof ProductForm>(
    key: K,
    value: ProductForm[K]
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

  function editProduct(product: Product) {
    setEditingId(product.id);

    setForm({
      supplier_id: product.supplier_id ?? "",
      name: product.name,
      sku: product.sku ?? "",
      product_type: product.product_type,
      description: product.description ?? "",
      image_url: product.image_url ?? "",
      sales_price:
        product.sales_price.toString(),
      cost_price:
        product.cost_price.toString(),
      guide_commission_type:
        product.guide_commission_type,
      guide_commission_value:
        product.guide_commission_value.toString(),
      tax_rate: product.tax_rate.toString(),
      capacity:
        product.capacity?.toString() ?? "",
      remaining_capacity:
        product.remaining_capacity?.toString() ??
        "",
      requires_reservation:
        product.requires_reservation,
      guest_app_visible:
        product.guest_app_visible,
      crew_app_visible:
        product.crew_app_visible,
      marketplace_visible:
        product.marketplace_visible,
      is_active: product.is_active,
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function saveProduct(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!membership) return;

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    const payload = {
      company_id: membership.company_id,
      supplier_id:
        form.supplier_id || null,
      name: form.name.trim(),
      sku:
        form.sku.trim().toUpperCase() || null,
      product_type: form.product_type,
      description:
        form.description.trim() || null,
      image_url:
        form.image_url.trim() || null,
      sales_price: Math.max(
        0,
        numberValue(form.sales_price)
      ),
      cost_price: Math.max(
        0,
        numberValue(form.cost_price)
      ),
      guide_commission_type:
        form.guide_commission_type,
      guide_commission_value:
        form.guide_commission_type === "none"
          ? 0
          : Math.max(
              0,
              numberValue(
                form.guide_commission_value
              )
            ),
      tax_rate: Math.max(
        0,
        Math.min(
          100,
          numberValue(form.tax_rate)
        )
      ),
      capacity: nullableNumber(
        form.capacity
      ),
      remaining_capacity: nullableNumber(
        form.remaining_capacity
      ),
      requires_reservation:
        form.requires_reservation,
      guest_app_visible:
        form.guest_app_visible,
      crew_app_visible:
        form.crew_app_visible,
      marketplace_visible:
        form.marketplace_visible,
      is_active: form.is_active,
      updated_at: new Date().toISOString(),
    };

    try {
      if (editingId) {
        const { error } = await supabase
          .from("products")
          .update(payload)
          .eq("id", editingId)
          .eq(
            "company_id",
            membership.company_id
          );

        if (error) throw error;

        setSuccessMessage(
          "Ürün başarıyla güncellendi."
        );
      } else {
        const { error } = await supabase
          .from("products")
          .insert(payload);

        if (error) throw error;

        setSuccessMessage(
          "Yeni ürün başarıyla eklendi."
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
          : "Ürün kaydedilemedi."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct(
    product: Product
  ) {
    if (!membership) return;

    const confirmed = window.confirm(
      `${product.name} ürününü silmek istediğinize emin misiniz?`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", product.id)
      .eq(
        "company_id",
        membership.company_id
      );

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setSuccessMessage("Ürün silindi.");

    await loadData(
      membership.company_id
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-10 text-white">
        Ürün kataloğu yükleniyor...
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
            Ürün Kataloğu
          </h1>

          <p className="mt-4 max-w-3xl text-slate-400">
            Ek aktiviteleri, satış fiyatlarını,
            maliyetleri, rehber primlerini ve
            uygulama görünürlüklerini yönetin.
          </p>
        </header>

        <section className="mt-9 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Toplam Ürün", stats.total],
            ["Aktif Ürün", stats.active],
            [
              "Misafir Uygulamasında",
              stats.guestVisible,
            ],
            [
              "Ortalama Brüt Marj",
              `%${stats.averageMargin.toFixed(1)}`,
            ],
          ].map(([label, value]) => (
            <article
              key={String(label)}
              className="rounded-3xl border border-white/10 bg-slate-900 p-6"
            >
              <FaBoxOpen className="text-orange-400" />

              <p className="mt-5 text-sm font-bold text-slate-500">
                {label}
              </p>

              <p className="mt-2 text-4xl font-black">
                {value}
              </p>
            </article>
          ))}
        </section>

        <section className="mt-8 rounded-[32px] border border-white/10 bg-slate-900 p-6 lg:p-8">
          <div className="flex items-center gap-3">
            <FaPlus className="text-orange-400" />

            <h2 className="text-2xl font-black">
              {editingId
                ? "Ürünü Düzenle"
                : "Yeni Ürün Ekle"}
            </h2>
          </div>

          <form
            onSubmit={saveProduct}
            className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-4"
          >
            <label>
              <span className="text-sm font-black">
                Ürün adı
              </span>

              <input
                required
                value={form.name}
                onChange={(event) =>
                  updateForm(
                    "name",
                    event.target.value
                  )
                }
                placeholder="Saklıkent Rafting"
                className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
              />
            </label>

            <label>
              <span className="text-sm font-black">
                Ürün kodu
              </span>

              <input
                value={form.sku}
                onChange={(event) =>
                  updateForm(
                    "sku",
                    event.target.value
                  )
                }
                placeholder="RAFTING-001"
                className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
              />
            </label>

            <label>
              <span className="text-sm font-black">
                Ürün türü
              </span>

              <select
                value={form.product_type}
                onChange={(event) =>
                  updateForm(
                    "product_type",
                    event.target
                      .value as ProductType
                  )
                }
                className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
              >
                {Object.entries(
                  productTypeLabels
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
                Satış fiyatı
              </span>

              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={form.sales_price}
                onChange={(event) =>
                  updateForm(
                    "sales_price",
                    event.target.value
                  )
                }
                className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
              />
            </label>

            <label>
              <span className="text-sm font-black">
                Maliyet fiyatı
              </span>

              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={form.cost_price}
                onChange={(event) =>
                  updateForm(
                    "cost_price",
                    event.target.value
                  )
                }
                className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
              />
            </label>

            <label>
              <span className="text-sm font-black">
                Rehber prim türü
              </span>

              <select
                value={
                  form.guide_commission_type
                }
                onChange={(event) =>
                  updateForm(
                    "guide_commission_type",
                    event.target
                      .value as CommissionType
                  )
                }
                className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
              >
                {Object.entries(
                  commissionTypeLabels
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
                Rehber prim değeri
              </span>

              <input
                type="number"
                min="0"
                step="0.01"
                disabled={
                  form.guide_commission_type ===
                  "none"
                }
                value={
                  form.guide_commission_value
                }
                onChange={(event) =>
                  updateForm(
                    "guide_commission_value",
                    event.target.value
                  )
                }
                className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none disabled:bg-slate-300"
              />

              <span className="mt-2 block text-xs text-slate-500">
                Sabit ise TL, yüzde ise oran
              </span>
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
                Toplam kontenjan
              </span>

              <input
                type="number"
                min="0"
                value={form.capacity}
                onChange={(event) =>
                  updateForm(
                    "capacity",
                    event.target.value
                  )
                }
                placeholder="Sınırsız ise boş"
                className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
              />
            </label>

            <label>
              <span className="text-sm font-black">
                Kalan kontenjan
              </span>

              <input
                type="number"
                min="0"
                value={
                  form.remaining_capacity
                }
                onChange={(event) =>
                  updateForm(
                    "remaining_capacity",
                    event.target.value
                  )
                }
                placeholder="Sınırsız ise boş"
                className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
              />
            </label>

            <label>
              <span className="text-sm font-black">
                Görsel URL
              </span>

              <input
                value={form.image_url}
                onChange={(event) =>
                  updateForm(
                    "image_url",
                    event.target.value
                  )
                }
                placeholder="https://..."
                className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
              />
            </label>

            <label className="md:col-span-2 xl:col-span-4">
              <span className="text-sm font-black">
                Açıklama
              </span>

              <textarea
                rows={4}
                value={form.description}
                onChange={(event) =>
                  updateForm(
                    "description",
                    event.target.value
                  )
                }
                placeholder="Misafir uygulamasında gösterilecek ürün açıklaması"
                className="mt-2 w-full rounded-2xl bg-white px-5 py-4 font-bold text-slate-950 outline-none"
              />
            </label>

            <div className="grid gap-3 md:col-span-2 xl:col-span-4 sm:grid-cols-2 xl:grid-cols-5">
              {[
                {
                  key: "requires_reservation",
                  label: "Rezervasyon gerektirir",
                },
                {
                  key: "guest_app_visible",
                  label: "Misafir uygulamasında",
                },
                {
                  key: "crew_app_visible",
                  label: "Crew uygulamasında",
                },
                {
                  key: "marketplace_visible",
                  label: "Marketplace'te",
                },
                {
                  key: "is_active",
                  label: "Ürün aktif",
                },
              ].map((item) => (
                <label
                  key={item.key}
                  className="flex items-center gap-3 rounded-2xl bg-slate-950 p-4"
                >
                  <input
                    type="checkbox"
                    checked={
                      form[
                        item.key as keyof ProductForm
                      ] as boolean
                    }
                    onChange={(event) =>
                      updateForm(
                        item.key as keyof ProductForm,
                        event.target
                          .checked as never
                      )
                    }
                    className="h-5 w-5"
                  />

                  <span className="text-sm font-black">
                    {item.label}
                  </span>
                </label>
              ))}
            </div>

            <div className="flex gap-3 md:col-span-2 xl:col-span-4">
              <button
                type="submit"
                disabled={saving}
                className="min-h-14 rounded-2xl bg-orange-500 px-7 font-black disabled:opacity-50"
              >
                {saving
                  ? "Kaydediliyor..."
                  : editingId
                    ? "Ürünü Güncelle"
                    : "Ürünü Kaydet"}
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
              placeholder="Ürün, kod, tedarikçi veya tür ara"
              className="w-full bg-transparent font-bold text-slate-950 outline-none"
            />
          </label>

          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredProducts.map((product) => {
              const supplier = firstRelation(
                product.supplier
              );

              const grossProfit =
                Number(product.sales_price) -
                Number(product.cost_price);

              const commission =
                product.guide_commission_type ===
                "percentage"
                  ? (Number(
                      product.sales_price
                    ) *
                      Number(
                        product.guide_commission_value
                      )) /
                    100
                  : product.guide_commission_type ===
                      "fixed"
                    ? Number(
                        product.guide_commission_value
                      )
                    : 0;

              const companyProfit =
                grossProfit - commission;

              return (
                <article
                  key={product.id}
                  className="overflow-hidden rounded-[30px] border border-white/10 bg-slate-900"
                >
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="h-48 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-48 items-center justify-center bg-slate-950 text-orange-400">
                      <FaBoxOpen size={42} />
                    </div>
                  )}

                  <div className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <span
                        className={`rounded-full px-3 py-1.5 text-xs font-black ${productTypeClasses(
                          product.product_type
                        )}`}
                      >
                        {
                          productTypeLabels[
                            product.product_type
                          ]
                        }
                      </span>

                      <span
                        className={`rounded-full px-3 py-1.5 text-xs font-black ${
                          product.is_active
                            ? "bg-emerald-500/15 text-emerald-400"
                            : "bg-red-500/15 text-red-400"
                        }`}
                      >
                        {product.is_active
                          ? "Aktif"
                          : "Pasif"}
                      </span>
                    </div>

                    <p className="mt-5 text-xs font-black uppercase tracking-wider text-orange-400">
                      {product.sku ||
                        "TUROBUS ÜRÜNÜ"}
                    </p>

                    <h2 className="mt-2 text-2xl font-black">
                      {product.name}
                    </h2>

                    {supplier && (
                      <p className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                        <FaStore />
                        {supplier.name}
                      </p>
                    )}

                    <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-2xl bg-slate-950 p-4">
                        <p className="text-slate-500">
                          Satış
                        </p>

                        <p className="mt-1 font-black text-emerald-400">
                          {formatMoney(
                            product.sales_price
                          )}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-slate-950 p-4">
                        <p className="text-slate-500">
                          Maliyet
                        </p>

                        <p className="mt-1 font-black text-red-400">
                          {formatMoney(
                            product.cost_price
                          )}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-slate-950 p-4">
                        <p className="text-slate-500">
                          Rehber primi
                        </p>

                        <p className="mt-1 font-black text-orange-400">
                          {formatMoney(commission)}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-slate-950 p-4">
                        <p className="text-slate-500">
                          Şirkete kalan
                        </p>

                        <p className="mt-1 font-black text-blue-400">
                          {formatMoney(companyProfit)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      {product.guest_app_visible && (
                        <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-400">
                          <FaEye />
                          Misafir App
                        </span>
                      )}

                      {product.crew_app_visible && (
                        <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-black text-blue-400">
                          Crew App
                        </span>
                      )}

                      {product.marketplace_visible && (
                        <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-black text-cyan-400">
                          Marketplace
                        </span>
                      )}
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          editProduct(product)
                        }
                        className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-orange-500 font-black"
                      >
                        <FaEdit />
                        Düzenle
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          deleteProduct(product)
                        }
                        className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 font-black text-red-400"
                      >
                        <FaTrash />
                        Sil
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {filteredProducts.length === 0 && (
            <div className="mt-6 rounded-3xl border border-white/10 bg-slate-900 p-10 text-center text-slate-400">
              Henüz ürün kaydı bulunmuyor.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
