"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getCurrentMembership } from "@/lib/current-user";
import {
  FaArrowLeft,
  FaCheckCircle,
  FaImage,
  FaMapMarkerAlt,
  FaSave,
  FaTrash,
} from "react-icons/fa";

type TourForm = {
  title: string;
  slug: string;
  short_description: string;
  description: string;
  city: string;
  district: string;
  category: string;
  duration: string;
  meeting_point: string;
  adult_price: string;
  child_price: string;
  old_price: string;
  cover_image: string;
  agency_name: string;
  max_people: string;
  featured: boolean;
  bestseller: boolean;
  early_booking: boolean;
  status: string;
};

const emptyForm: TourForm = {
  title: "",
  slug: "",
  short_description: "",
  description: "",
  city: "",
  district: "",
  category: "",
  duration: "",
  meeting_point: "",
  adult_price: "",
  child_price: "",
  old_price: "",
  cover_image: "",
  agency_name: "",
  max_people: "40",
  featured: false,
  bestseller: false,
  early_booking: false,
  status: "active",
};

export default function EditTourPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [form, setForm] = useState<TourForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [companyId, setCompanyId] =
    useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    async function loadTour() {
      setLoading(true);
      setMessage(null);

      const {
        data: userData,
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !userData.user) {
        setMessage({
          type: "error",
          text: "Oturum bulunamadı.",
        });
        setLoading(false);
        return;
      }

      const membership = await getCurrentMembership(
        userData.user.id
      );

      if (!membership) {
        setMessage({
          type: "error",
          text: "Firma üyeliği bulunamadı.",
        });
        setLoading(false);
        return;
      }

      setCompanyId(membership.company_id);

      const { data, error } = await supabase
        .from("tours")
        .select("*")
        .eq("id", params.id)
        .eq("company_id", membership.company_id)
        .single();

      if (error || !data) {
        console.error(error);
        setMessage({
          type: "error",
          text: "Tur bilgileri yüklenemedi.",
        });
        setLoading(false);
        return;
      }

      setForm({
        title: data.title ?? "",
        slug: data.slug ?? "",
        short_description: data.short_description ?? "",
        description: data.description ?? "",
        city: data.city ?? "",
        district: data.district ?? "",
        category: data.category ?? "",
        duration: data.duration ?? "",
        meeting_point: data.meeting_point ?? "",
        adult_price: String(data.adult_price ?? ""),
        child_price: String(data.child_price ?? ""),
        old_price: String(data.old_price ?? ""),
        cover_image: data.cover_image ?? "",
        agency_name: data.agency_name ?? "",
        max_people: String(data.max_people ?? 40),
        featured: Boolean(data.featured),
        bestseller: Boolean(data.bestseller),
        early_booking: Boolean(data.early_booking),
        status: data.status ?? "active",
      });

      setLoading(false);
    }

    if (params.id) {
      loadTour();
    }
  }, [params.id]);

  function updateField(
    field: keyof TourForm,
    value: string | boolean
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function createSlug(value: string) {
    return value
      .toLocaleLowerCase("tr-TR")
      .replace(/ç/g, "c")
      .replace(/ğ/g, "g")
      .replace(/ı/g, "i")
      .replace(/ö/g, "o")
      .replace(/ş/g, "s")
      .replace(/ü/g, "u")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    let uploadedImageUrl = form.cover_image || null;

    if (imageFile) {
      const extension = imageFile.name.split(".").pop() || "jpg";
      const fileName = `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${extension}`;

      const filePath = `covers/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("tour-images")
        .upload(filePath, imageFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error(uploadError);
        setMessage({
          type: "error",
          text: "Görsel yüklenemedi: " + uploadError.message,
        });
        setSaving(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("tour-images")
        .getPublicUrl(filePath);

      uploadedImageUrl = publicUrlData.publicUrl;
    }

    const { error } = await supabase
      .from("tours")
      .update({
        title: form.title,
        slug: form.slug || createSlug(form.title),
        short_description: form.short_description || null,
        description: form.description || null,
        city: form.city,
        district: form.district || null,
        category: form.category || null,
        duration: form.duration || null,
        meeting_point: form.meeting_point || null,
        adult_price: Number(form.adult_price || 0),
        child_price: Number(form.child_price || 0),
        old_price: Number(form.old_price || 0),
        cover_image: uploadedImageUrl,
        agency_name: form.agency_name || null,
        max_people: Number(form.max_people || 40),
        featured: form.featured,
        bestseller: form.bestseller,
        early_booking: form.early_booking,
        status: form.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.id)
      .eq("company_id", companyId);

    if (error) {
      console.error(error);
      setMessage({
        type: "error",
        text: error.message,
      });
      setSaving(false);
      return;
    }

    setMessage({
      type: "success",
      text: "Tur başarıyla güncellendi.",
    });

    setImageFile(null);
    setImagePreview("");

    if (uploadedImageUrl) {
      updateField("cover_image", uploadedImageUrl);
    }

    setSaving(false);
  }

  async function handleDelete() {
    const approved = window.confirm(
      "Bu turu kalıcı olarak silmek istediğinize emin misiniz?"
    );

    if (!approved) {
      return;
    }

    setDeleting(true);
    setMessage(null);

    const { error } = await supabase
      .from("tours")
      .delete()
      .eq("id", params.id)
      .eq("company_id", companyId);

    if (error) {
      console.error(error);
      setMessage({
        type: "error",
        text: "Tur silinemedi: " + error.message,
      });
      setDeleting(false);
      return;
    }

    router.push("/dashboard/turlar");
    router.refresh();
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <div className="rounded-3xl border border-white/10 bg-slate-900 p-10 text-slate-400">
          Tur bilgileri yükleniyor...
        </div>
      </main>
    );
  }

  return (
    <main data-tour-os-screen="tour-edit" className="min-h-screen bg-slate-950 px-5 py-10 text-white lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-orange-400">
              Tur yönetimi
            </p>

            <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
              Turu düzenle
            </h1>

            <p className="mt-4 text-slate-400">
              Tur bilgilerini güncelle veya yayından kaldır.
            </p>
          </div>

          <Link
            href="/dashboard/turlar"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 text-sm font-black transition hover:border-orange-500/30"
          >
            <FaArrowLeft />
            Turlarıma Dön
          </Link>
        </div>

        <form
          onSubmit={handleSubmit}
          className="grid gap-8 lg:grid-cols-[1fr_340px]"
        >
          <div className="space-y-8">
            <section className="rounded-[30px] border border-white/10 bg-slate-900 p-7">
              <h2 className="text-2xl font-black">Temel bilgiler</h2>

              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <label className="md:col-span-2">
                  <span className="text-sm font-black">Tur adı</span>

                  <input
                    type="text"
                    required
                    value={form.title}
                    onChange={(event) =>
                      updateField("title", event.target.value)
                    }
                    className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 text-sm font-bold text-slate-950 outline-none"
                  />
                </label>

                <label className="md:col-span-2">
                  <span className="text-sm font-black">SEO adresi</span>

                  <input
                    type="text"
                    required
                    value={form.slug}
                    onChange={(event) =>
                      updateField("slug", createSlug(event.target.value))
                    }
                    className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 text-sm font-bold text-slate-950 outline-none"
                  />
                </label>

                <label className="md:col-span-2">
                  <span className="text-sm font-black">Kısa açıklama</span>

                  <input
                    type="text"
                    value={form.short_description}
                    onChange={(event) =>
                      updateField(
                        "short_description",
                        event.target.value
                      )
                    }
                    className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 text-sm font-bold text-slate-950 outline-none"
                  />
                </label>

                <label className="md:col-span-2">
                  <span className="text-sm font-black">Detaylı açıklama</span>

                  <textarea
                    value={form.description}
                    onChange={(event) =>
                      updateField("description", event.target.value)
                    }
                    rows={7}
                    className="mt-2 w-full rounded-2xl bg-white px-5 py-4 text-sm font-bold text-slate-950 outline-none"
                  />
                </label>
              </div>
            </section>

            <section className="rounded-[30px] border border-white/10 bg-slate-900 p-7">
              <h2 className="text-2xl font-black">Konum ve kategori</h2>

              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <label>
                  <span className="text-sm font-black">Şehir</span>

                  <div className="mt-2 flex min-h-14 items-center gap-3 rounded-2xl bg-white px-4">
                    <FaMapMarkerAlt className="text-orange-500" />

                    <input
                      type="text"
                      required
                      value={form.city}
                      onChange={(event) =>
                        updateField("city", event.target.value)
                      }
                      className="w-full bg-transparent text-sm font-bold text-slate-950 outline-none"
                    />
                  </div>
                </label>

                <label>
                  <span className="text-sm font-black">İlçe / Bölge</span>

                  <input
                    type="text"
                    value={form.district}
                    onChange={(event) =>
                      updateField("district", event.target.value)
                    }
                    className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 text-sm font-bold text-slate-950 outline-none"
                  />
                </label>

                <label>
                  <span className="text-sm font-black">Kategori</span>

                  <select
                    value={form.category}
                    onChange={(event) =>
                      updateField("category", event.target.value)
                    }
                    className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 text-sm font-bold text-slate-950 outline-none"
                  >
                    <option value="">Kategori seç</option>
                    <option value="Macera">Macera</option>
                    <option value="Tekne">Tekne</option>
                    <option value="Günübirlik">Günübirlik</option>
                    <option value="Kültür">Kültür</option>
                    <option value="Balayı">Balayı</option>
                    <option value="Yurt Dışı">Yurt Dışı</option>
                  </select>
                </label>

                <label>
                  <span className="text-sm font-black">Süre</span>

                  <input
                    type="text"
                    value={form.duration}
                    onChange={(event) =>
                      updateField("duration", event.target.value)
                    }
                    className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 text-sm font-bold text-slate-950 outline-none"
                  />
                </label>

                <label className="md:col-span-2">
                  <span className="text-sm font-black">Buluşma noktası</span>

                  <input
                    type="text"
                    value={form.meeting_point}
                    onChange={(event) =>
                      updateField("meeting_point", event.target.value)
                    }
                    className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 text-sm font-bold text-slate-950 outline-none"
                  />
                </label>
              </div>
            </section>

            <section className="rounded-[30px] border border-white/10 bg-slate-900 p-7">
              <h2 className="text-2xl font-black">Fiyat ve kapasite</h2>

              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <label>
                  <span className="text-sm font-black">Yetişkin fiyatı</span>

                  <input
                    type="number"
                    min="0"
                    required
                    value={form.adult_price}
                    onChange={(event) =>
                      updateField("adult_price", event.target.value)
                    }
                    className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 text-sm font-bold text-slate-950 outline-none"
                  />
                </label>

                <label>
                  <span className="text-sm font-black">Çocuk fiyatı</span>

                  <input
                    type="number"
                    min="0"
                    value={form.child_price}
                    onChange={(event) =>
                      updateField("child_price", event.target.value)
                    }
                    className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 text-sm font-bold text-slate-950 outline-none"
                  />
                </label>

                <label>
                  <span className="text-sm font-black">Eski fiyat</span>

                  <input
                    type="number"
                    min="0"
                    value={form.old_price}
                    onChange={(event) =>
                      updateField("old_price", event.target.value)
                    }
                    className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 text-sm font-bold text-slate-950 outline-none"
                  />
                </label>

                <label>
                  <span className="text-sm font-black">Maksimum kişi</span>

                  <input
                    type="number"
                    min="1"
                    value={form.max_people}
                    onChange={(event) =>
                      updateField("max_people", event.target.value)
                    }
                    className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 text-sm font-bold text-slate-950 outline-none"
                  />
                </label>
              </div>
            </section>

            <section className="rounded-[30px] border border-white/10 bg-slate-900 p-7">
              <h2 className="text-2xl font-black">Görsel ve acente</h2>

              <div className="mt-6 grid gap-5">
                {form.cover_image && !imagePreview && (
                  <div className="overflow-hidden rounded-2xl border border-white/10">
                    <img
                      src={form.cover_image}
                      alt="Mevcut kapak görseli"
                      className="h-64 w-full object-cover"
                    />
                  </div>
                )}

                <label>
                  <span className="text-sm font-black">
                    Yeni kapak görseli seç
                  </span>

                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      setImageFile(file);

                      if (file) {
                        setImagePreview(URL.createObjectURL(file));
                      } else {
                        setImagePreview("");
                      }
                    }}
                    className="mt-2 block w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-sm text-slate-300 file:mr-4 file:rounded-xl file:border-0 file:bg-orange-500 file:px-4 file:py-2 file:font-black file:text-white"
                  />
                </label>

                {imagePreview && (
                  <div className="overflow-hidden rounded-2xl border border-orange-500/30">
                    <img
                      src={imagePreview}
                      alt="Yeni seçilen kapak görseli"
                      className="h-64 w-full object-cover"
                    />
                  </div>
                )}

                <label>
                  <span className="text-sm font-black">Kapak görseli URL</span>

                  <div className="mt-2 flex min-h-14 items-center gap-3 rounded-2xl bg-white px-4">
                    <FaImage className="text-orange-500" />

                    <input
                      type="url"
                      value={form.cover_image}
                      onChange={(event) =>
                        updateField("cover_image", event.target.value)
                      }
                      className="w-full bg-transparent text-sm font-bold text-slate-950 outline-none"
                    />
                  </div>
                </label>

                <label>
                  <span className="text-sm font-black">Acente adı</span>

                  <input
                    type="text"
                    value={form.agency_name}
                    onChange={(event) =>
                      updateField("agency_name", event.target.value)
                    }
                    className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 text-sm font-bold text-slate-950 outline-none"
                  />
                </label>
              </div>
            </section>
          </div>

          <aside className="lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-[30px] border border-orange-500/20 bg-slate-900 p-7">
              <h2 className="text-2xl font-black">Yayın ayarları</h2>

              <div className="mt-6 space-y-4">
                {[
                  ["featured", "Öne çıkan tur"],
                  ["bestseller", "Çok satan"],
                  ["early_booking", "Erken rezervasyon"],
                ].map(([field, label]) => (
                  <label
                    key={field}
                    className="flex cursor-pointer items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                  >
                    <span className="font-bold">{label}</span>

                    <input
                      type="checkbox"
                      checked={
                        form[field as keyof TourForm] as boolean
                      }
                      onChange={(event) =>
                        updateField(
                          field as keyof TourForm,
                          event.target.checked
                        )
                      }
                      className="h-5 w-5 accent-orange-500"
                    />
                  </label>
                ))}

                <label>
                  <span className="text-sm font-black">Durum</span>

                  <select
                    value={form.status}
                    onChange={(event) =>
                      updateField("status", event.target.value)
                    }
                    className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 text-sm font-bold text-slate-950 outline-none"
                  >
                    <option value="active">Aktif</option>
                    <option value="draft">Taslak</option>
                    <option value="passive">Pasif</option>
                  </select>
                </label>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="mt-7 flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-orange-500 px-6 font-black transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FaSave />
                {saving ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
              </button>

              <button
                type="button"
                disabled={deleting}
                onClick={handleDelete}
                className="mt-3 flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-6 font-black text-red-400 transition hover:bg-red-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FaTrash />
                {deleting ? "Siliniyor..." : "Turu Sil"}
              </button>

              {message && (
                <div
                  className={`mt-5 rounded-2xl border p-4 text-sm font-bold ${
                    message.type === "success"
                      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                      : "border-red-500/20 bg-red-500/10 text-red-400"
                  }`}
                >
                  {message.text}
                </div>
              )}

              <div className="mt-5 flex items-start gap-3 rounded-2xl bg-emerald-500/10 p-4 text-sm text-emerald-400">
                <FaCheckCircle className="mt-0.5 shrink-0" />
                Kaydettiğiniz değişiklikler Supabase’e aktarılır.
              </div>
            </div>
          </aside>
        </form>
      </div>
    </main>
  );
}
