"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  FaAddressCard,
  FaCalendarAlt,
  FaCrown,
  FaEdit,
  FaEnvelope,
  FaHotel,
  FaLink,
  FaPhone,
  FaPlus,
  FaSave,
  FaSearch,
  FaSuitcase,
  FaTimes,
  FaTrash,
  FaUser,
} from "react-icons/fa";
import { supabase } from "@/lib/supabase";
import {
  CurrentMembership,
  getCurrentMembership,
} from "@/lib/current-user";
import {
  attachGuestToReservation,
  createGuest,
  deleteGuest,
  detachGuestFromReservation,
  getGuestCenterData,
  GuestIdentityType,
  GuestReservation,
  GuestVipLevel,
  HotelGuest,
  ReservationGuestRelation,
  updateGuest,
} from "@/lib/hotel/guests/guest-service";

type GuestForm = {
  firstName: string;
  lastName: string;

  gender: string;
  birthDate: string;
  nationality: string;

  identityType:
    | GuestIdentityType
    | "";

  identityNumber: string;
  passportExpiryDate: string;

  phone: string;
  email: string;

  country: string;
  city: string;
  address: string;

  language: string;

  vipLevel: GuestVipLevel;

  tagsText: string;
  notes: string;

  marketingConsent: boolean;
  kvkkConsent: boolean;
};

function emptyForm(): GuestForm {
  return {
    firstName: "",
    lastName: "",

    gender: "",
    birthDate: "",
    nationality: "Türkiye",

    identityType: "",
    identityNumber: "",
    passportExpiryDate: "",

    phone: "",
    email: "",

    country: "Türkiye",
    city: "",
    address: "",

    language: "tr",

    vipLevel: "standard",

    tagsText: "",
    notes: "",

    marketingConsent: false,
    kvkkConsent: false,
  };
}

function firstRelation<T>(
  value: T | T[] | null | undefined
): T | null {
  if (!value) return null;

  return Array.isArray(value)
    ? value[0] ?? null
    : value;
}

function money(
  value: number
): string {
  return new Intl.NumberFormat(
    "tr-TR",
    {
      style: "currency",
      currency: "TRY",
    }
  ).format(Number(value || 0));
}

function formatDate(
  value: string | null
): string {
  if (!value) return "—";

  return new Date(
    `${value}T00:00:00`
  ).toLocaleDateString("tr-TR");
}

const vipLabels: Record<
  GuestVipLevel,
  string
> = {
  standard: "Standart",
  vip: "VIP",
  vip_plus: "VIP Plus",
  blacklist: "Kara Liste",
};

const identityLabels: Record<
  GuestIdentityType,
  string
> = {
  tc_identity: "TC Kimlik",
  passport: "Pasaport",
  foreign_identity:
    "Yabancı Kimlik",
  driving_license:
    "Sürücü Belgesi",
  other: "Diğer",
};

export default function GuestsPage() {
  const [membership, setMembership] =
    useState<CurrentMembership | null>(
      null
    );

  const [guests, setGuests] =
    useState<HotelGuest[]>([]);

  const [
    reservations,
    setReservations,
  ] = useState<GuestReservation[]>([]);

  const [
    relations,
    setRelations,
  ] =
    useState<ReservationGuestRelation[]>(
      []
    );

  const [form, setForm] =
    useState<GuestForm>(
      emptyForm()
    );

  const [editingId, setEditingId] =
    useState("");

  const [
    selectedGuest,
    setSelectedGuest,
  ] = useState<HotelGuest | null>(
    null
  );

  const [search, setSearch] =
    useState("");

  const [vipFilter, setVipFilter] =
    useState("");

  const [
    reservationId,
    setReservationId,
  ] = useState("");

  const [guestType, setGuestType] =
    useState<
      "adult" | "child" | "infant"
    >("adult");

  const [isPrimary, setIsPrimary] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [processing, setProcessing] =
    useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const loadData = useCallback(
    async (companyId: string) => {
      const data =
        await getGuestCenterData(
          companyId
        );

      setGuests(data.guests);

      setReservations(
        data.reservations
      );

      setRelations(
        data.relations
      );
    },
    []
  );

  useEffect(() => {
    async function initialize() {
      try {
        const {
          data: { user },
        } =
          await supabase.auth.getUser();

        if (!user) {
          throw new Error(
            "Kullanıcı oturumu bulunamadı."
          );
        }

        const currentMembership =
          await getCurrentMembership(
            user.id
          );

        if (!currentMembership) {
          throw new Error(
            "Aktif şirket üyeliği bulunamadı."
          );
        }

        setMembership(
          currentMembership
        );

        await loadData(
          currentMembership.company_id
        );
      } catch (error: unknown) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Misafir merkezi yüklenemedi."
        );
      } finally {
        setLoading(false);
      }
    }

    void initialize();
  }, [loadData]);

  async function refresh() {
    if (!membership) return;

    await loadData(
      membership.company_id
    );
  }

  const visibleGuests = useMemo(() => {
    const query = search
      .trim()
      .toLocaleLowerCase("tr-TR");

    return guests.filter((guest) => {
      if (
        vipFilter &&
        guest.vip_level !== vipFilter
      ) {
        return false;
      }

      if (!query) return true;

      return [
        guest.first_name,
        guest.last_name,
        guest.identity_number,
        guest.phone,
        guest.email,
        guest.city,
        ...guest.tags,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value)
            .toLocaleLowerCase(
              "tr-TR"
            )
            .includes(query)
        );
    });
  }, [
    guests,
    search,
    vipFilter,
  ]);

  const selectedRelations =
    useMemo(
      () =>
        selectedGuest
          ? relations.filter(
              (relation) =>
                relation.guest_id ===
                selectedGuest.id
            )
          : [],
      [relations, selectedGuest]
    );

  function resetForm() {
    setForm(emptyForm());
    setEditingId("");
  }

  function editGuest(
    guest: HotelGuest
  ) {
    setEditingId(guest.id);

    setForm({
      firstName:
        guest.first_name,

      lastName:
        guest.last_name,

      gender:
        guest.gender ?? "",

      birthDate:
        guest.birth_date ?? "",

      nationality:
        guest.nationality ?? "",

      identityType:
        guest.identity_type ?? "",

      identityNumber:
        guest.identity_number ?? "",

      passportExpiryDate:
        guest.passport_expiry_date ??
        "",

      phone:
        guest.phone ?? "",

      email:
        guest.email ?? "",

      country:
        guest.country ?? "",

      city:
        guest.city ?? "",

      address:
        guest.address ?? "",

      language:
        guest.language ?? "tr",

      vipLevel:
        guest.vip_level,

      tagsText:
        guest.tags.join(", "),

      notes:
        guest.notes ?? "",

      marketingConsent:
        guest.marketing_consent,

      kvkkConsent:
        guest.kvkk_consent,
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function submitGuest(
    event: FormEvent
  ) {
    event.preventDefault();

    if (
      !membership ||
      processing
    ) {
      return;
    }

    if (
      !form.firstName.trim() ||
      !form.lastName.trim()
    ) {
      setErrorMessage(
        "Misafir adı ve soyadı zorunludur."
      );

      return;
    }

    const tags = form.tagsText
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    setProcessing(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      if (editingId) {
        await updateGuest({
          companyId:
            membership.company_id,

          guestId:
            editingId,

          firstName:
            form.firstName.trim(),

          lastName:
            form.lastName.trim(),

          gender:
            form.gender || null,

          birthDate:
            form.birthDate || null,

          nationality:
            form.nationality.trim() ||
            null,

          identityType:
            form.identityType || null,

          identityNumber:
            form.identityNumber.trim() ||
            null,

          passportExpiryDate:
            form.passportExpiryDate ||
            null,

          phone:
            form.phone.trim() || null,

          email:
            form.email.trim() || null,

          country:
            form.country.trim() ||
            null,

          city:
            form.city.trim() || null,

          address:
            form.address.trim() ||
            null,

          language:
            form.language || "tr",

          vipLevel:
            form.vipLevel,

          tags,

          notes:
            form.notes.trim() || null,

          marketingConsent:
            form.marketingConsent,

          kvkkConsent:
            form.kvkkConsent,
        });

        setSuccessMessage(
          "Misafir bilgileri güncellendi."
        );
      } else {
        const {
          data: { user },
        } =
          await supabase.auth.getUser();

        await createGuest({
          companyId:
            membership.company_id,

          firstName:
            form.firstName.trim(),

          lastName:
            form.lastName.trim(),

          gender:
            form.gender || null,

          birthDate:
            form.birthDate || null,

          nationality:
            form.nationality.trim() ||
            null,

          identityType:
            form.identityType || null,

          identityNumber:
            form.identityNumber.trim() ||
            null,

          passportExpiryDate:
            form.passportExpiryDate ||
            null,

          phone:
            form.phone.trim() || null,

          email:
            form.email.trim() || null,

          country:
            form.country.trim() ||
            null,

          city:
            form.city.trim() || null,

          address:
            form.address.trim() ||
            null,

          language:
            form.language || "tr",

          vipLevel:
            form.vipLevel,

          tags,

          notes:
            form.notes.trim() || null,

          marketingConsent:
            form.marketingConsent,

          kvkkConsent:
            form.kvkkConsent,

          userId:
            user?.id ?? null,
        });

        setSuccessMessage(
          "Yeni misafir profili oluşturuldu."
        );
      }

      resetForm();

      await refresh();
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Misafir kaydedilemedi."
      );
    } finally {
      setProcessing(false);
    }
  }

  async function removeGuest(
    guest: HotelGuest
  ) {
    if (
      !membership ||
      processing ||
      !window.confirm(
        `${guest.first_name} ${guest.last_name} misafir profili kalıcı olarak silinsin mi?`
      )
    ) {
      return;
    }

    setProcessing(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await deleteGuest(
        membership.company_id,
        guest.id
      );

      if (
        selectedGuest?.id ===
        guest.id
      ) {
        setSelectedGuest(null);
      }

      if (editingId === guest.id) {
        resetForm();
      }

      await refresh();

      setSuccessMessage(
        "Misafir profili silindi."
      );
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Misafir silinemedi."
      );
    } finally {
      setProcessing(false);
    }
  }

  async function attachReservation() {
    if (
      !membership ||
      !selectedGuest ||
      !reservationId ||
      processing
    ) {
      return;
    }

    setProcessing(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await attachGuestToReservation({
        companyId:
          membership.company_id,

        reservationId,

        guestId:
          selectedGuest.id,

        isPrimary,

        guestType,
      });

      setReservationId("");
      setGuestType("adult");
      setIsPrimary(false);

      await refresh();

      setSuccessMessage(
        "Misafir rezervasyona bağlandı."
      );
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Misafir rezervasyona bağlanamadı."
      );
    } finally {
      setProcessing(false);
    }
  }

  async function detachRelation(
    relation: ReservationGuestRelation
  ) {
    if (
      !membership ||
      processing ||
      !window.confirm(
        "Misafir bu rezervasyondan çıkarılsın mı?"
      )
    ) {
      return;
    }

    setProcessing(true);

    try {
      await detachGuestFromReservation(
        membership.company_id,
        relation.id
      );

      await refresh();

      setSuccessMessage(
        "Misafir rezervasyondan çıkarıldı."
      );
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Bağlantı kaldırılamadı."
      );
    } finally {
      setProcessing(false);
    }
  }

  if (loading) {
    return (
      <main className="p-10 text-white">
        Misafir merkezi yükleniyor...
      </main>
    );
  }

  return (
    <main className="px-5 py-10 lg:px-10">
      <div className="mx-auto max-w-[1800px]">
        <header>
          <p className="text-sm font-black uppercase tracking-[0.25em] text-orange-400">
            TUROS HOTEL PMS
          </p>

          <h1 className="mt-3 text-4xl font-black md:text-5xl">
            Misafir Profilleri
          </h1>

          <p className="mt-4 max-w-4xl text-slate-400">
            Kimlik, iletişim, tercih,
            VIP ve konaklama bilgilerini
            tek misafir kartında yönetin.
          </p>
        </header>

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

        <form
          onSubmit={submitGuest}
          className="mt-8 rounded-[30px] border border-white/10 bg-slate-900 p-6"
        >
          <div className="flex items-center justify-between gap-4">
            <h2 className="flex items-center gap-3 text-2xl font-black">
              {editingId ? (
                <FaEdit className="text-orange-400" />
              ) : (
                <FaPlus className="text-orange-400" />
              )}

              {editingId
                ? "Misafiri Düzenle"
                : "Yeni Misafir"}
            </h2>

            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5"
              >
                <FaTimes />
              </button>
            )}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <input
              required
              value={form.firstName}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  firstName:
                    event.target.value,
                }))
              }
              placeholder="Ad *"
              className="min-h-12 rounded-xl bg-white px-4 font-bold text-slate-950"
            />

            <input
              required
              value={form.lastName}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  lastName:
                    event.target.value,
                }))
              }
              placeholder="Soyad *"
              className="min-h-12 rounded-xl bg-white px-4 font-bold text-slate-950"
            />

            <select
              value={form.gender}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  gender:
                    event.target.value,
                }))
              }
              className="min-h-12 rounded-xl bg-white px-4 font-bold text-slate-950"
            >
              <option value="">
                Cinsiyet
              </option>
              <option value="male">
                Erkek
              </option>
              <option value="female">
                Kadın
              </option>
              <option value="other">
                Diğer
              </option>
              <option value="unspecified">
                Belirtilmedi
              </option>
            </select>

            <input
              type="date"
              value={form.birthDate}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  birthDate:
                    event.target.value,
                }))
              }
              className="min-h-12 rounded-xl bg-white px-4 font-bold text-slate-950"
            />

            <select
              value={form.identityType}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  identityType:
                    event.target
                      .value as
                      GuestIdentityType,
                }))
              }
              className="min-h-12 rounded-xl bg-white px-4 font-bold text-slate-950"
            >
              <option value="">
                Kimlik türü
              </option>

              {Object.entries(
                identityLabels
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

            <input
              value={form.identityNumber}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  identityNumber:
                    event.target.value,
                }))
              }
              placeholder="Kimlik / Pasaport No"
              className="min-h-12 rounded-xl bg-white px-4 font-bold text-slate-950"
            />

            <input
              type="date"
              value={
                form.passportExpiryDate
              }
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  passportExpiryDate:
                    event.target.value,
                }))
              }
              className="min-h-12 rounded-xl bg-white px-4 font-bold text-slate-950"
              title="Pasaport geçerlilik tarihi"
            />

            <input
              value={form.nationality}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  nationality:
                    event.target.value,
                }))
              }
              placeholder="Uyruk"
              className="min-h-12 rounded-xl bg-white px-4 font-bold text-slate-950"
            />

            <input
              value={form.phone}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  phone:
                    event.target.value,
                }))
              }
              placeholder="Telefon"
              className="min-h-12 rounded-xl bg-white px-4 font-bold text-slate-950"
            />

            <input
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  email:
                    event.target.value,
                }))
              }
              placeholder="E-posta"
              className="min-h-12 rounded-xl bg-white px-4 font-bold text-slate-950"
            />

            <input
              value={form.country}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  country:
                    event.target.value,
                }))
              }
              placeholder="Ülke"
              className="min-h-12 rounded-xl bg-white px-4 font-bold text-slate-950"
            />

            <input
              value={form.city}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  city:
                    event.target.value,
                }))
              }
              placeholder="Şehir"
              className="min-h-12 rounded-xl bg-white px-4 font-bold text-slate-950"
            />

            <select
              value={form.vipLevel}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  vipLevel:
                    event.target
                      .value as
                      GuestVipLevel,
                }))
              }
              className="min-h-12 rounded-xl bg-white px-4 font-bold text-slate-950"
            >
              {Object.entries(
                vipLabels
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

            <input
              value={form.tagsText}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  tagsText:
                    event.target.value,
                }))
              }
              placeholder="Etiketler: balayı, doğum günü, sessiz oda"
              className="min-h-12 rounded-xl bg-white px-4 font-bold text-slate-950"
            />
          </div>

          <textarea
            rows={3}
            value={form.address}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                address:
                  event.target.value,
              }))
            }
            placeholder="Adres"
            className="mt-4 w-full rounded-xl bg-white px-4 py-3 font-bold text-slate-950"
          />

          <textarea
            rows={3}
            value={form.notes}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                notes:
                  event.target.value,
              }))
            }
            placeholder="Misafir notları ve özel tercihleri"
            className="mt-4 w-full rounded-xl bg-white px-4 py-3 font-bold text-slate-950"
          />

          <div className="mt-5 flex flex-wrap gap-5">
            <label className="flex items-center gap-3 font-black">
              <input
                type="checkbox"
                checked={
                  form.kvkkConsent
                }
                onChange={(event) =>
                  setForm(
                    (current) => ({
                      ...current,
                      kvkkConsent:
                        event.target
                          .checked,
                    })
                  )
                }
                className="h-5 w-5"
              />

              KVKK onayı alındı
            </label>

            <label className="flex items-center gap-3 font-black">
              <input
                type="checkbox"
                checked={
                  form.marketingConsent
                }
                onChange={(event) =>
                  setForm(
                    (current) => ({
                      ...current,
                      marketingConsent:
                        event.target
                          .checked,
                    })
                  )
                }
                className="h-5 w-5"
              />

              Pazarlama izni var
            </label>
          </div>

          <button
            type="submit"
            disabled={processing}
            className="mt-6 flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-orange-500 font-black disabled:opacity-50"
          >
            <FaSave />

            {editingId
              ? "Misafiri Güncelle"
              : "Misafiri Kaydet"}
          </button>
        </form>

        <section className="mt-7 rounded-[30px] border border-white/10 bg-slate-900 p-5">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_260px]">
            <label className="flex min-h-12 items-center gap-3 rounded-xl bg-white px-4">
              <FaSearch className="text-orange-500" />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Ad, kimlik, telefon, e-posta veya etiket ara"
                className="w-full bg-transparent font-bold text-slate-950 outline-none"
              />
            </label>

            <select
              value={vipFilter}
              onChange={(event) =>
                setVipFilter(
                  event.target.value
                )
              }
              className="min-h-12 rounded-xl bg-white px-4 font-bold text-slate-950"
            >
              <option value="">
                Tüm misafirler
              </option>

              {Object.entries(
                vipLabels
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
          </div>
        </section>

        <section className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {visibleGuests.map(
            (guest) => (
              <article
                key={guest.id}
                className="rounded-[30px] border border-white/10 bg-slate-900 p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-orange-400">
                      MİSAFİR PROFİLİ
                    </p>

                    <h2 className="mt-2 text-2xl font-black">
                      {guest.first_name}{" "}
                      {guest.last_name}
                    </h2>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1.5 text-xs font-black ${
                      guest.vip_level ===
                      "blacklist"
                        ? "bg-red-500/15 text-red-400"
                        : guest.vip_level ===
                            "vip_plus"
                          ? "bg-violet-500/15 text-violet-400"
                          : guest.vip_level ===
                              "vip"
                            ? "bg-amber-500/15 text-amber-400"
                            : "bg-slate-500/15 text-slate-400"
                    }`}
                  >
                    {
                      vipLabels[
                        guest.vip_level
                      ]
                    }
                  </span>
                </div>

                <div className="mt-5 space-y-3 text-sm text-slate-400">
                  {guest.identity_number && (
                    <p className="flex items-center gap-2">
                      <FaAddressCard className="text-orange-400" />
                      {
                        guest.identity_number
                      }
                    </p>
                  )}

                  {guest.phone && (
                    <p className="flex items-center gap-2">
                      <FaPhone className="text-orange-400" />
                      {guest.phone}
                    </p>
                  )}

                  {guest.email && (
                    <p className="flex items-center gap-2">
                      <FaEnvelope className="text-orange-400" />
                      {guest.email}
                    </p>
                  )}

                  <p className="flex items-center gap-2">
                    <FaCalendarAlt className="text-orange-400" />
                    Doğum:{" "}
                    {formatDate(
                      guest.birth_date
                    )}
                  </p>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3">
                  <div className="rounded-2xl bg-slate-950 p-3 text-center">
                    <p className="text-xl font-black">
                      {guest.total_stays}
                    </p>
                    <p className="mt-1 text-[10px] text-slate-500">
                      Konaklama
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-950 p-3 text-center">
                    <p className="text-xl font-black">
                      {guest.total_nights}
                    </p>
                    <p className="mt-1 text-[10px] text-slate-500">
                      Gece
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-950 p-3 text-center">
                    <p className="truncate text-sm font-black">
                      {money(
                        guest.total_spend
                      )}
                    </p>
                    <p className="mt-1 text-[10px] text-slate-500">
                      Harcama
                    </p>
                  </div>
                </div>

                {guest.tags.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {guest.tags.map(
                      (tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-orange-500/10 px-3 py-1 text-xs font-bold text-orange-300"
                        >
                          {tag}
                        </span>
                      )
                    )}
                  </div>
                )}

                <div className="mt-5 grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedGuest(
                        guest
                      )
                    }
                    className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-500 font-black"
                  >
                    <FaUser />
                    Detay
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      editGuest(guest)
                    }
                    className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-orange-500 font-black"
                  >
                    <FaEdit />
                    Düzenle
                  </button>

                  <button
                    type="button"
                    disabled={processing}
                    onClick={() =>
                      void removeGuest(
                        guest
                      )
                    }
                    className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-500/15 font-black text-red-400"
                  >
                    <FaTrash />
                    Sil
                  </button>
                </div>
              </article>
            )
          )}
        </section>

        {visibleGuests.length === 0 && (
          <div className="mt-6 rounded-3xl border border-white/10 bg-slate-900 p-12 text-center text-slate-500">
            Misafir profili bulunmuyor.
          </div>
        )}
      </div>

      {selectedGuest && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Kapat"
            onClick={() =>
              setSelectedGuest(null)
            }
            className="absolute inset-0"
          />

          <aside className="relative z-10 h-full w-full max-w-xl overflow-y-auto border-l border-white/10 bg-slate-950 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-orange-400">
                  MİSAFİR KARTI
                </p>

                <h2 className="mt-2 text-3xl font-black">
                  {
                    selectedGuest.first_name
                  }{" "}
                  {
                    selectedGuest.last_name
                  }
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedGuest(null)
                }
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5"
              >
                <FaTimes />
              </button>
            </div>

            <section className="mt-7 rounded-3xl border border-white/10 bg-white/[0.03] p-5">
              <h3 className="flex items-center gap-2 font-black">
                <FaLink className="text-orange-400" />
                Rezervasyona Bağla
              </h3>

              <select
                value={reservationId}
                onChange={(event) =>
                  setReservationId(
                    event.target.value
                  )
                }
                className="mt-4 min-h-12 w-full rounded-xl bg-white px-4 font-bold text-slate-950"
              >
                <option value="">
                  Rezervasyon seçin
                </option>

                {reservations.map(
                  (reservation) => {
                    const hotel =
                      firstRelation(
                        reservation.hotel
                      );

                    const room =
                      firstRelation(
                        reservation.room
                      );

                    return (
                      <option
                        key={
                          reservation.id
                        }
                        value={
                          reservation.id
                        }
                      >
                        {
                          reservation.reservation_no
                        }
                        {" · "}
                        {hotel?.name ??
                          "Otel"}
                        {" · "}
                        {room?.room_number
                          ? `Oda ${room.room_number}`
                          : "Oda atanmadı"}
                      </option>
                    );
                  }
                )}
              </select>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <select
                  value={guestType}
                  onChange={(event) =>
                    setGuestType(
                      event.target
                        .value as
                        | "adult"
                        | "child"
                        | "infant"
                    )
                  }
                  className="min-h-12 rounded-xl bg-white px-4 font-bold text-slate-950"
                >
                  <option value="adult">
                    Yetişkin
                  </option>
                  <option value="child">
                    Çocuk
                  </option>
                  <option value="infant">
                    Bebek
                  </option>
                </select>

                <label className="flex min-h-12 items-center gap-3 rounded-xl bg-white/5 px-4 font-black">
                  <input
                    type="checkbox"
                    checked={isPrimary}
                    onChange={(event) =>
                      setIsPrimary(
                        event.target.checked
                      )
                    }
                    className="h-5 w-5"
                  />

                  Ana misafir
                </label>
              </div>

              <button
                type="button"
                disabled={
                  processing ||
                  !reservationId
                }
                onClick={() =>
                  void attachReservation()
                }
                className="mt-4 min-h-12 w-full rounded-xl bg-orange-500 font-black disabled:opacity-50"
              >
                Rezervasyona Bağla
              </button>
            </section>

            <section className="mt-6">
              <h3 className="text-xl font-black">
                Konaklama Geçmişi
              </h3>

              <div className="mt-4 space-y-3">
                {selectedRelations.map(
                  (relation) => {
                    const reservation =
                      firstRelation(
                        relation.reservation
                      );

                    const hotel =
                      firstRelation(
                        reservation?.hotel
                      );

                    const room =
                      firstRelation(
                        reservation?.room
                      );

                    return (
                      <article
                        key={relation.id}
                        className="rounded-2xl bg-white/[0.04] p-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-black">
                              {
                                reservation?.reservation_no
                              }
                            </p>

                            <p className="mt-1 text-sm text-slate-500">
                              {hotel?.name ??
                                "Otel"}
                              {" · "}
                              {room?.room_number
                                ? `Oda ${room.room_number}`
                                : "Oda atanmadı"}
                            </p>

                            <p className="mt-2 text-xs text-slate-500">
                              {formatDate(
                                reservation?.check_in ??
                                  null
                              )}
                              {" – "}
                              {formatDate(
                                reservation?.check_out ??
                                  null
                              )}
                            </p>
                          </div>

                          <button
                            type="button"
                            disabled={processing}
                            onClick={() =>
                              void detachRelation(
                                relation
                              )
                            }
                            className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/15 text-red-400"
                          >
                            <FaTrash />
                          </button>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="rounded-full bg-blue-500/15 px-3 py-1 text-xs font-black text-blue-400">
                            {relation.guest_type ===
                            "adult"
                              ? "Yetişkin"
                              : relation.guest_type ===
                                  "child"
                                ? "Çocuk"
                                : "Bebek"}
                          </span>

                          {relation.is_primary && (
                            <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-black text-amber-400">
                              Ana Misafir
                            </span>
                          )}
                        </div>
                      </article>
                    );
                  }
                )}

                {selectedRelations.length ===
                  0 && (
                  <div className="rounded-2xl bg-white/[0.04] p-6 text-center text-slate-500">
                    Misafir henüz bir
                    rezervasyona bağlı değil.
                  </div>
                )}
              </div>
            </section>
          </aside>
        </div>
      )}
    </main>
  );
}
