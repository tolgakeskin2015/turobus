"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  FaBuilding,
  FaEdit,
  FaEnvelope,
  FaPhone,
  FaPlus,
  FaSearch,
  FaTrash,
  FaUniversity,
  FaWhatsapp,
} from "react-icons/fa";
import { supabase } from "@/lib/supabase";
import {
  CurrentMembership,
  getCurrentMembership,
} from "@/lib/current-user";

type SupplierType =
  | "activity"
  | "hotel"
  | "restaurant"
  | "night_club"
  | "transport"
  | "boat"
  | "spa"
  | "photography"
  | "marketplace"
  | "other";

type Supplier = {
  id: string;
  company_id: string;
  name: string;
  legal_name: string | null;
  supplier_type: SupplierType;
  contact_name: string | null;
  phone: string | null;
  whatsapp_phone: string | null;
  email: string | null;
  tax_number: string | null;
  tax_office: string | null;
  iban: string | null;
  payment_term_days: number;
  default_commission_rate: number;
  notes: string | null;
  is_active: boolean;
  created_at: string;
};

type SupplierForm = {
  name: string;
  legal_name: string;
  supplier_type: SupplierType;
  contact_name: string;
  phone: string;
  whatsapp_phone: string;
  email: string;
  tax_number: string;
  tax_office: string;
  iban: string;
  payment_term_days: string;
  default_commission_rate: string;
  notes: string;
  is_active: boolean;
};

const emptyForm: SupplierForm = {
  name: "",
  legal_name: "",
  supplier_type: "activity",
  contact_name: "",
  phone: "",
  whatsapp_phone: "",
  email: "",
  tax_number: "",
  tax_office: "",
  iban: "",
  payment_term_days: "0",
  default_commission_rate: "0",
  notes: "",
  is_active: true,
};

const supplierTypeLabels: Record<SupplierType, string> = {
  activity: "Aktivite Firması",
  hotel: "Otel",
  restaurant: "Restoran",
  night_club: "Gece Kulübü",
  transport: "Transfer / Ulaşım",
  boat: "Tekne Firması",
  spa: "Spa / Masaj",
  photography: "Fotoğraf / Video",
  marketplace: "Anlaşmalı İşletme",
  other: "Diğer",
};

function supplierTypeClasses(type: SupplierType) {
  if (type === "hotel") {
    return "bg-blue-500/15 text-blue-400";
  }

  if (type === "activity") {
    return "bg-orange-500/15 text-orange-400";
  }

  if (type === "restaurant") {
    return "bg-emerald-500/15 text-emerald-400";
  }

  if (type === "night_club") {
    return "bg-violet-500/15 text-violet-400";
  }

  if (type === "marketplace") {
    return "bg-cyan-500/15 text-cyan-400";
  }

  return "bg-slate-500/15 text-slate-400";
}

export default function SuppliersPage() {
  const [membership, setMembership] =
    useState<CurrentMembership | null>(null);

  const [suppliers, setSuppliers] =
    useState<Supplier[]>([]);

  const [form, setForm] =
    useState<SupplierForm>(emptyForm);

  const [editingId, setEditingId] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] =
    useState("");

  const loadSuppliers = useCallback(
    async (companyId: string) => {
      setErrorMessage("");

      const { data, error } = await supabase
        .from("suppliers")
        .select(
          "id, company_id, name, legal_name, supplier_type, contact_name, phone, whatsapp_phone, email, tax_number, tax_office, iban, payment_term_days, default_commission_rate, notes, is_active, created_at"
        )
        .eq("company_id", companyId)
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        console.error(
          "Tedarikçiler yüklenemedi:",
          error
        );
        setErrorMessage(error.message);
        return;
      }

      setSuppliers((data ?? []) as Supplier[]);
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

        await loadSuppliers(
          currentMembership.company_id
        );
      } catch (error) {
        console.error(error);

        setErrorMessage(
          "Tedarikçi verileri hazırlanamadı."
        );
      } finally {
        setLoading(false);
      }
    }

    void initialize();
  }, [loadSuppliers]);

  const filteredSuppliers = useMemo(() => {
    const query = search
      .trim()
      .toLocaleLowerCase("tr-TR");

    if (!query) {
      return suppliers;
    }

    return suppliers.filter((supplier) =>
      [
        supplier.name,
        supplier.legal_name,
        supplier.contact_name,
        supplier.phone,
        supplier.email,
        supplier.tax_number,
        supplierTypeLabels[
          supplier.supplier_type
        ],
      ]
        .filter(Boolean)
        .some((value) =>
          String(value)
            .toLocaleLowerCase("tr-TR")
            .includes(query)
        )
    );
  }, [search, suppliers]);

  const stats = useMemo(
    () => ({
      total: suppliers.length,
      active: suppliers.filter(
        (supplier) => supplier.is_active
      ).length,
      activities: suppliers.filter(
        (supplier) =>
          supplier.supplier_type === "activity"
      ).length,
      marketplace: suppliers.filter(
        (supplier) =>
          supplier.supplier_type === "marketplace"
      ).length,
    }),
    [suppliers]
  );

  function updateForm<K extends keyof SupplierForm>(
    key: K,
    value: SupplierForm[K]
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

  function editSupplier(supplier: Supplier) {
    setEditingId(supplier.id);

    setForm({
      name: supplier.name,
      legal_name: supplier.legal_name ?? "",
      supplier_type: supplier.supplier_type,
      contact_name: supplier.contact_name ?? "",
      phone: supplier.phone ?? "",
      whatsapp_phone:
        supplier.whatsapp_phone ?? "",
      email: supplier.email ?? "",
      tax_number: supplier.tax_number ?? "",
      tax_office: supplier.tax_office ?? "",
      iban: supplier.iban ?? "",
      payment_term_days:
        supplier.payment_term_days.toString(),
      default_commission_rate:
        supplier.default_commission_rate.toString(),
      notes: supplier.notes ?? "",
      is_active: supplier.is_active,
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function saveSupplier(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!membership) {
      return;
    }

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    const payload = {
      company_id: membership.company_id,
      name: form.name.trim(),
      legal_name:
        form.legal_name.trim() || null,
      supplier_type: form.supplier_type,
      contact_name:
        form.contact_name.trim() || null,
      phone: form.phone.trim() || null,
      whatsapp_phone:
        form.whatsapp_phone.trim() || null,
      email: form.email.trim() || null,
      tax_number:
        form.tax_number.trim() || null,
      tax_office:
        form.tax_office.trim() || null,
      iban: form.iban.trim() || null,
      payment_term_days: Math.max(
        0,
        Number(form.payment_term_days) || 0
      ),
      default_commission_rate: Math.max(
        0,
        Number(
          form.default_commission_rate
        ) || 0
      ),
      notes: form.notes.trim() || null,
      is_active: form.is_active,
      updated_at: new Date().toISOString(),
    };

    try {
      if (editingId) {
        const { error } = await supabase
          .from("suppliers")
          .update(payload)
          .eq("id", editingId)
          .eq(
            "company_id",
            membership.company_id
          );

        if (error) {
          throw error;
        }

        setSuccessMessage(
          "Tedarikçi başarıyla güncellendi."
        );
      } else {
        const { error } = await supabase
          .from("suppliers")
          .insert(payload);

        if (error) {
          throw error;
        }

        setSuccessMessage(
          "Yeni tedarikçi başarıyla eklendi."
        );
      }

      await loadSuppliers(
        membership.company_id
      );

      setForm(emptyForm);
      setEditingId("");
    } catch (error) {
      console.error(error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Tedarikçi kaydedilemedi."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteSupplier(
    supplier: Supplier
  ) {
    if (!membership) {
      return;
    }

    const confirmed = window.confirm(
      `${supplier.name} tedarikçisini silmek istediğinize emin misiniz?`
    );

    if (!confirmed) {
      return;
    }

    const { error } = await supabase
      .from("suppliers")
      .delete()
      .eq("id", supplier.id)
      .eq(
        "company_id",
        membership.company_id
      );

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setSuccessMessage(
      "Tedarikçi kaydı silindi."
    );

    await loadSuppliers(
      membership.company_id
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-10 text-white">
        Tedarikçiler yükleniyor...
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
            Tedarikçi Yönetimi
          </h1>

          <p className="mt-4 max-w-3xl text-slate-400">
            Aktivite firmalarını, otelleri,
            restoranları, gece kulüplerini ve
            diğer iş ortaklarını yönetin.
          </p>
        </header>

        <section className="mt-9 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Toplam Tedarikçi", stats.total],
            ["Aktif Tedarikçi", stats.active],
            ["Aktivite Firması", stats.activities],
            ["Marketplace İşletmesi", stats.marketplace],
          ].map(([label, value]) => (
            <article
              key={String(label)}
              className="rounded-3xl border border-white/10 bg-slate-900 p-6"
            >
              <FaBuilding className="text-orange-400" />

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
                ? "Tedarikçiyi Düzenle"
                : "Yeni Tedarikçi Ekle"}
            </h2>
          </div>

          <form
            onSubmit={saveSupplier}
            className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3"
          >
            <label>
              <span className="text-sm font-black">
                İşletme adı
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
                Resmî unvan
              </span>

              <input
                value={form.legal_name}
                onChange={(event) =>
                  updateForm(
                    "legal_name",
                    event.target.value
                  )
                }
                placeholder="Örnek Turizm Ltd. Şti."
                className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
              />
            </label>

            <label>
              <span className="text-sm font-black">
                Tedarikçi türü
              </span>

              <select
                value={form.supplier_type}
                onChange={(event) =>
                  updateForm(
                    "supplier_type",
                    event.target
                      .value as SupplierType
                  )
                }
                className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
              >
                {Object.entries(
                  supplierTypeLabels
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
                Yetkili kişi
              </span>

              <input
                value={form.contact_name}
                onChange={(event) =>
                  updateForm(
                    "contact_name",
                    event.target.value
                  )
                }
                placeholder="Mehmet Yılmaz"
                className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
              />
            </label>

            <label>
              <span className="text-sm font-black">
                Telefon
              </span>

              <input
                value={form.phone}
                onChange={(event) =>
                  updateForm(
                    "phone",
                    event.target.value
                  )
                }
                placeholder="05xx xxx xx xx"
                className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
              />
            </label>

            <label>
              <span className="text-sm font-black">
                WhatsApp
              </span>

              <input
                value={form.whatsapp_phone}
                onChange={(event) =>
                  updateForm(
                    "whatsapp_phone",
                    event.target.value
                  )
                }
                placeholder="905xxxxxxxxx"
                className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
              />
            </label>

            <label>
              <span className="text-sm font-black">
                E-posta
              </span>

              <input
                type="email"
                value={form.email}
                onChange={(event) =>
                  updateForm(
                    "email",
                    event.target.value
                  )
                }
                placeholder="firma@ornek.com"
                className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
              />
            </label>

            <label>
              <span className="text-sm font-black">
                Vergi numarası
              </span>

              <input
                value={form.tax_number}
                onChange={(event) =>
                  updateForm(
                    "tax_number",
                    event.target.value
                  )
                }
                className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
              />
            </label>

            <label>
              <span className="text-sm font-black">
                Vergi dairesi
              </span>

              <input
                value={form.tax_office}
                onChange={(event) =>
                  updateForm(
                    "tax_office",
                    event.target.value
                  )
                }
                className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
              />
            </label>

            <label className="md:col-span-2">
              <span className="text-sm font-black">
                IBAN
              </span>

              <input
                value={form.iban}
                onChange={(event) =>
                  updateForm(
                    "iban",
                    event.target.value
                      .toUpperCase()
                  )
                }
                placeholder="TR..."
                className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
              />
            </label>

            <label>
              <span className="text-sm font-black">
                Ödeme vadesi
              </span>

              <input
                type="number"
                min="0"
                value={form.payment_term_days}
                onChange={(event) =>
                  updateForm(
                    "payment_term_days",
                    event.target.value
                  )
                }
                className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
              />

              <span className="mt-2 block text-xs text-slate-500">
                Gün olarak
              </span>
            </label>

            <label>
              <span className="text-sm font-black">
                Varsayılan komisyon
              </span>

              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={
                  form.default_commission_rate
                }
                onChange={(event) =>
                  updateForm(
                    "default_commission_rate",
                    event.target.value
                  )
                }
                className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
              />

              <span className="mt-2 block text-xs text-slate-500">
                Yüzde olarak
              </span>
            </label>

            <label className="md:col-span-2 xl:col-span-3">
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
                placeholder="Sözleşme, ödeme günü veya iş birliği notları"
                className="mt-2 w-full rounded-2xl bg-white px-5 py-4 font-bold text-slate-950 outline-none"
              />
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) =>
                  updateForm(
                    "is_active",
                    event.target.checked
                  )
                }
                className="h-5 w-5"
              />

              <span className="text-sm font-black">
                Tedarikçi aktif
              </span>
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
                    ? "Tedarikçiyi Güncelle"
                    : "Tedarikçiyi Kaydet"}
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
              placeholder="İşletme, yetkili, telefon veya vergi numarası ara"
              className="w-full bg-transparent font-bold text-slate-950 outline-none"
            />
          </label>

          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredSuppliers.map(
              (supplier) => (
                <article
                  key={supplier.id}
                  className="rounded-[30px] border border-white/10 bg-slate-900 p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/15 text-orange-400">
                      <FaBuilding size={24} />
                    </div>

                    <span
                      className={`rounded-full px-3 py-1.5 text-xs font-black ${supplierTypeClasses(
                        supplier.supplier_type
                      )}`}
                    >
                      {
                        supplierTypeLabels[
                          supplier.supplier_type
                        ]
                      }
                    </span>
                  </div>

                  <h2 className="mt-5 text-2xl font-black">
                    {supplier.name}
                  </h2>

                  {supplier.legal_name && (
                    <p className="mt-2 text-sm text-slate-500">
                      {supplier.legal_name}
                    </p>
                  )}

                  <span
                    className={`mt-4 inline-flex rounded-full px-3 py-1 text-xs font-black ${
                      supplier.is_active
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-red-500/15 text-red-400"
                    }`}
                  >
                    {supplier.is_active
                      ? "Aktif"
                      : "Pasif"}
                  </span>

                  <div className="mt-5 space-y-3 text-sm text-slate-400">
                    {supplier.contact_name && (
                      <p>
                        Yetkili:{" "}
                        <strong className="text-white">
                          {supplier.contact_name}
                        </strong>
                      </p>
                    )}

                    {supplier.phone && (
                      <p className="flex items-center gap-3">
                        <FaPhone className="text-orange-400" />
                        {supplier.phone}
                      </p>
                    )}

                    {supplier.whatsapp_phone && (
                      <p className="flex items-center gap-3">
                        <FaWhatsapp className="text-emerald-400" />
                        {supplier.whatsapp_phone}
                      </p>
                    )}

                    {supplier.email && (
                      <p className="flex items-center gap-3">
                        <FaEnvelope className="text-orange-400" />
                        {supplier.email}
                      </p>
                    )}

                    {supplier.iban && (
                      <p className="flex items-start gap-3">
                        <FaUniversity className="mt-1 shrink-0 text-orange-400" />

                        <span className="break-all">
                          {supplier.iban}
                        </span>
                      </p>
                    )}
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-slate-950 p-4">
                      <p className="text-xs text-slate-500">
                        Komisyon
                      </p>

                      <p className="mt-2 font-black">
                        %
                        {Number(
                          supplier.default_commission_rate
                        ).toLocaleString("tr-TR")}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-950 p-4">
                      <p className="text-xs text-slate-500">
                        Ödeme vadesi
                      </p>

                      <p className="mt-2 font-black">
                        {supplier.payment_term_days} gün
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        editSupplier(supplier)
                      }
                      className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-orange-500 font-black"
                    >
                      <FaEdit />
                      Düzenle
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        deleteSupplier(supplier)
                      }
                      className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 font-black text-red-400"
                    >
                      <FaTrash />
                      Sil
                    </button>
                  </div>
                </article>
              )
            )}
          </div>

          {filteredSuppliers.length === 0 && (
            <div className="mt-6 rounded-3xl border border-white/10 bg-slate-900 p-10 text-center text-slate-400">
              Henüz tedarikçi kaydı bulunmuyor.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
