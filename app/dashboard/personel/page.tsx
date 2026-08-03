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
  FaEnvelope,
  FaIdCard,
  FaPhone,
  FaPlus,
  FaSearch,
  FaTrash,
  FaUserTie,
} from "react-icons/fa";
import { supabase } from "@/lib/supabase";
import {
  CurrentMembership,
  getCurrentMembership,
} from "@/lib/current-user";

type StaffRole =
  | "guide"
  | "driver"
  | "operation_manager"
  | "assistant"
  | "other";

type StaffProfile = {
  id: string;
  company_id: string;
  user_id: string | null;
  full_name: string;
  phone: string | null;
  email: string | null;
  staff_role: StaffRole;
  license_number: string | null;
  guide_license_number: string | null;
  profile_photo_url: string | null;
  is_active: boolean;
  created_at: string;
};

type StaffForm = {
  full_name: string;
  phone: string;
  email: string;
  staff_role: StaffRole;
  license_number: string;
  guide_license_number: string;
  profile_photo_url: string;
  is_active: boolean;
};

const emptyForm: StaffForm = {
  full_name: "",
  phone: "",
  email: "",
  staff_role: "guide",
  license_number: "",
  guide_license_number: "",
  profile_photo_url: "",
  is_active: true,
};

const roleLabels: Record<StaffRole, string> = {
  guide: "Rehber",
  driver: "Şoför",
  operation_manager: "Operasyon Müdürü",
  assistant: "Operasyon Asistanı",
  other: "Diğer",
};

function roleClasses(role: StaffRole) {
  if (role === "guide") {
    return "bg-violet-500/15 text-violet-400";
  }

  if (role === "driver") {
    return "bg-blue-500/15 text-blue-400";
  }

  if (role === "operation_manager") {
    return "bg-orange-500/15 text-orange-400";
  }

  if (role === "assistant") {
    return "bg-emerald-500/15 text-emerald-400";
  }

  return "bg-slate-500/15 text-slate-400";
}

export default function StaffPage() {
  const [membership, setMembership] =
    useState<CurrentMembership | null>(null);
  const [staff, setStaff] = useState<StaffProfile[]>([]);
  const [form, setForm] = useState<StaffForm>(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadStaff = useCallback(async (companyId: string) => {
    setErrorMessage("");

    const { data, error } = await supabase
      .from("staff_profiles")
      .select(
        "id, company_id, user_id, full_name, phone, email, staff_role, license_number, guide_license_number, profile_photo_url, is_active, created_at"
      )
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Personel yükleme hatası:", error);
      setErrorMessage(error.message);
      return;
    }

    setStaff((data ?? []) as StaffProfile[]);
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
        await loadStaff(currentMembership.company_id);
      } catch (error) {
        console.error(error);
        setErrorMessage("Personel verileri hazırlanamadı.");
      } finally {
        setLoading(false);
      }
    }

    void initialize();
  }, [loadStaff]);

  const filteredStaff = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("tr-TR");

    if (!query) return staff;

    return staff.filter((person) =>
      [
        person.full_name,
        person.phone,
        person.email,
        person.license_number,
        person.guide_license_number,
        roleLabels[person.staff_role],
      ]
        .filter(Boolean)
        .some((value) =>
          String(value)
            .toLocaleLowerCase("tr-TR")
            .includes(query)
        )
    );
  }, [search, staff]);

  const stats = useMemo(
    () => ({
      total: staff.length,
      guides: staff.filter(
        (person) =>
          person.staff_role === "guide" && person.is_active
      ).length,
      drivers: staff.filter(
        (person) =>
          person.staff_role === "driver" && person.is_active
      ).length,
      inactive: staff.filter((person) => !person.is_active)
        .length,
    }),
    [staff]
  );

  function updateForm<K extends keyof StaffForm>(
    key: K,
    value: StaffForm[K]
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

  function editPerson(person: StaffProfile) {
    setEditingId(person.id);

    setForm({
      full_name: person.full_name,
      phone: person.phone ?? "",
      email: person.email ?? "",
      staff_role: person.staff_role,
      license_number: person.license_number ?? "",
      guide_license_number:
        person.guide_license_number ?? "",
      profile_photo_url: person.profile_photo_url ?? "",
      is_active: person.is_active,
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function savePerson(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!membership) return;

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    const payload = {
      company_id: membership.company_id,
      full_name: form.full_name.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      staff_role: form.staff_role,
      license_number:
        form.staff_role === "driver"
          ? form.license_number.trim() || null
          : null,
      guide_license_number:
        form.staff_role === "guide"
          ? form.guide_license_number.trim() || null
          : null,
      profile_photo_url:
        form.profile_photo_url.trim() || null,
      is_active: form.is_active,
      updated_at: new Date().toISOString(),
    };

    try {
      if (editingId) {
        const { error } = await supabase
          .from("staff_profiles")
          .update(payload)
          .eq("id", editingId)
          .eq("company_id", membership.company_id);

        if (error) throw error;

        setSuccessMessage(
          "Personel bilgileri başarıyla güncellendi."
        );
      } else {
        const { error } = await supabase
          .from("staff_profiles")
          .insert(payload);

        if (error) throw error;

        setSuccessMessage("Yeni personel başarıyla eklendi.");
      }

      await loadStaff(membership.company_id);
      setForm(emptyForm);
      setEditingId("");
    } catch (error) {
      console.error(error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Personel kaydedilemedi."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deletePerson(person: StaffProfile) {
    if (!membership) return;

    const confirmed = window.confirm(
      `${person.full_name} adlı personeli silmek istediğinize emin misiniz?`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("staff_profiles")
      .delete()
      .eq("id", person.id)
      .eq("company_id", membership.company_id);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setSuccessMessage("Personel kaydı silindi.");
    await loadStaff(membership.company_id);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-10 text-white">
        Personel kayıtları yükleniyor...
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
            Personel Yönetimi
          </h1>

          <p className="mt-4 max-w-3xl text-slate-400">
            Rehber, şoför ve operasyon personelini tek
            merkezden yönetin.
          </p>
        </header>

        <section className="mt-9 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Toplam Personel", stats.total],
            ["Aktif Rehber", stats.guides],
            ["Aktif Şoför", stats.drivers],
            ["Pasif Personel", stats.inactive],
          ].map(([label, value]) => (
            <article
              key={String(label)}
              className="rounded-3xl border border-white/10 bg-slate-900 p-6"
            >
              <FaUserTie className="text-orange-400" />

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
                ? "Personeli Düzenle"
                : "Yeni Personel Ekle"}
            </h2>
          </div>

          <form
            onSubmit={savePerson}
            className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3"
          >
            <label>
              <span className="text-sm font-black">
                Ad soyad
              </span>

              <input
                required
                value={form.full_name}
                onChange={(event) =>
                  updateForm("full_name", event.target.value)
                }
                placeholder="Ahmet Yılmaz"
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
                  updateForm("phone", event.target.value)
                }
                placeholder="05xx xxx xx xx"
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
                  updateForm("email", event.target.value)
                }
                placeholder="personel@turobus.com"
                className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
              />
            </label>

            <label>
              <span className="text-sm font-black">
                Görev
              </span>

              <select
                value={form.staff_role}
                onChange={(event) =>
                  updateForm(
                    "staff_role",
                    event.target.value as StaffRole
                  )
                }
                className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
              >
                {Object.entries(roleLabels).map(
                  ([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  )
                )}
              </select>
            </label>

            {form.staff_role === "driver" && (
              <label>
                <span className="text-sm font-black">
                  Ehliyet numarası
                </span>

                <input
                  value={form.license_number}
                  onChange={(event) =>
                    updateForm(
                      "license_number",
                      event.target.value
                    )
                  }
                  className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
                />
              </label>
            )}

            {form.staff_role === "guide" && (
              <label>
                <span className="text-sm font-black">
                  Rehber belge numarası
                </span>

                <input
                  value={form.guide_license_number}
                  onChange={(event) =>
                    updateForm(
                      "guide_license_number",
                      event.target.value
                    )
                  }
                  className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
                />
              </label>
            )}

            <label>
              <span className="text-sm font-black">
                Profil fotoğrafı URL
              </span>

              <input
                value={form.profile_photo_url}
                onChange={(event) =>
                  updateForm(
                    "profile_photo_url",
                    event.target.value
                  )
                }
                placeholder="https://..."
                className="mt-2 min-h-14 w-full rounded-2xl bg-white px-5 font-bold text-slate-950 outline-none"
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
                Personel aktif
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
                    ? "Personeli Güncelle"
                    : "Personeli Kaydet"}
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
              placeholder="Ad, telefon, e-posta veya görev ara"
              className="w-full bg-transparent font-bold text-slate-950 outline-none"
            />
          </label>

          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredStaff.map((person) => (
              <article
                key={person.id}
                className="rounded-[30px] border border-white/10 bg-slate-900 p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  {person.profile_photo_url ? (
                    <img
                      src={person.profile_photo_url}
                      alt={person.full_name}
                      className="h-16 w-16 rounded-2xl object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500/15 text-orange-400">
                      <FaUserTie size={27} />
                    </div>
                  )}

                  <span
                    className={`rounded-full px-3 py-1.5 text-xs font-black ${roleClasses(
                      person.staff_role
                    )}`}
                  >
                    {roleLabels[person.staff_role]}
                  </span>
                </div>

                <h2 className="mt-5 text-2xl font-black">
                  {person.full_name}
                </h2>

                <span
                  className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-black ${
                    person.is_active
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-red-500/15 text-red-400"
                  }`}
                >
                  {person.is_active ? "Aktif" : "Pasif"}
                </span>

                <div className="mt-5 space-y-3 text-sm text-slate-400">
                  {person.phone && (
                    <p className="flex items-center gap-3">
                      <FaPhone className="text-orange-400" />
                      {person.phone}
                    </p>
                  )}

                  {person.email && (
                    <p className="flex items-center gap-3">
                      <FaEnvelope className="text-orange-400" />
                      {person.email}
                    </p>
                  )}

                  {person.license_number && (
                    <p className="flex items-center gap-3">
                      <FaIdCard className="text-orange-400" />
                      Ehliyet: {person.license_number}
                    </p>
                  )}

                  {person.guide_license_number && (
                    <p className="flex items-center gap-3">
                      <FaIdCard className="text-orange-400" />
                      Rehber belgesi:{" "}
                      {person.guide_license_number}
                    </p>
                  )}
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => editPerson(person)}
                    className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-orange-500 font-black"
                  >
                    <FaEdit />
                    Düzenle
                  </button>

                  <button
                    type="button"
                    onClick={() => deletePerson(person)}
                    className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 font-black text-red-400"
                  >
                    <FaTrash />
                    Sil
                  </button>
                </div>
              </article>
            ))}
          </div>

          {filteredStaff.length === 0 && (
            <div className="mt-6 rounded-3xl border border-white/10 bg-slate-900 p-10 text-center text-slate-400">
              Henüz personel kaydı bulunmuyor.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
