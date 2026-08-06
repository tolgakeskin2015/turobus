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
  FaCheckCircle,
  FaCrown,
  FaEdit,
  FaEnvelope,
  FaHotel,
  FaIdCard,
  FaLink,
  FaMoneyBillWave,
  FaPhone,
  FaPlus,
  FaSave,
  FaSearch,
  FaSuitcase,
  FaTimes,
  FaTrash,
  FaUser,
  FaUsers,
} from "react-icons/fa";
import { supabase } from "@/lib/supabase";
import {
  CurrentMembership,
  getCurrentMembership,
} from "@/lib/current-user";
import Guest360Panel from "@/components/hotel/guests/Guest360Panel";

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

type GuestTab =
  | "general"
  | "history"
  | "preferences"
  | "notes";

type GuestFilter =
  | "all"
  | "vip"
  | "honeymoon"
  | "corporate"
  | "blacklist";

type GuestFormState = {
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

function emptyGuestForm(): GuestFormState {
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
  if (!value) {
    return null;
  }

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
      maximumFractionDigits: 0,
    }
  ).format(Number(value || 0));
}

function formatDate(
  value: string | null | undefined
): string {
  if (!value) {
    return "Belirtilmedi";
  }

  return new Date(
    `${value}T00:00:00`
  ).toLocaleDateString(
    "tr-TR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  );
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

function vipClass(
  level: GuestVipLevel
): string {
  switch (level) {
    case "vip":
      return "border-amber-500/30 bg-amber-500/10 text-amber-400";

    case "vip_plus":
      return "border-violet-500/30 bg-violet-500/10 text-violet-400";

    case "blacklist":
      return "border-red-500/30 bg-red-500/10 text-red-400";

    default:
      return "border-slate-500/20 bg-slate-500/10 text-slate-400";
  }
}

function hasTag(
  guest: HotelGuest,
  words: string[]
): boolean {
  return guest.tags.some((tag) => {
    const normalized =
      tag.toLocaleLowerCase(
        "tr-TR"
      );

    return words.some((word) =>
      normalized.includes(word)
    );
  });
}

export default function GuestCenter() {
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

  const [
    selectedGuestId,
    setSelectedGuestId,
  ] = useState("");

  const [
    selectedGuestIds,
    setSelectedGuestIds,
  ] = useState<string[]>([]);

  const [activeTab, setActiveTab] =
    useState<GuestTab>("general");

  const [filter, setFilter] =
    useState<GuestFilter>("all");

  const [search, setSearch] =
    useState("");

  const [showForm, setShowForm] =
    useState(false);

  const [editingId, setEditingId] =
    useState("");

  const [form, setForm] =
    useState<GuestFormState>(
      emptyGuestForm()
    );

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

  const todayDate = useMemo(() => {
    const today = new Date();

    const year = today.getFullYear();

    const month = String(
      today.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
      today.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }, []);

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
      setRelations(data.relations);

      setSelectedGuestId(
        (current) => {
          if (
            current &&
            data.guests.some(
              (guest) =>
                guest.id === current
            )
          ) {
            return current;
          }

          return (
            data.guests[0]?.id ?? ""
          );
        }
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

  const selectedGuest =
    useMemo(
      () =>
        guests.find(
          (guest) =>
            guest.id ===
            selectedGuestId
        ) ?? null,
      [guests, selectedGuestId]
    );

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

  const visibleGuests =
    useMemo(() => {
      const query = search
        .trim()
        .toLocaleLowerCase("tr-TR");

      return guests.filter(
        (guest) => {
          if (
            filter === "vip" &&
            ![
              "vip",
              "vip_plus",
            ].includes(
              guest.vip_level
            )
          ) {
            return false;
          }

          if (
            filter ===
              "blacklist" &&
            guest.vip_level !==
              "blacklist"
          ) {
            return false;
          }

          if (
            filter ===
              "honeymoon" &&
            !hasTag(guest, [
              "balayı",
              "balayi",
              "honeymoon",
            ])
          ) {
            return false;
          }

          if (
            filter ===
              "corporate" &&
            !hasTag(guest, [
              "kurumsal",
              "firma",
              "corporate",
            ])
          ) {
            return false;
          }

          if (!query) {
            return true;
          }

          return [
            guest.first_name,
            guest.last_name,
            guest.identity_number,
            guest.phone,
            guest.email,
            guest.nationality,
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
        }
      );
    }, [filter, guests, search]);

  const statistics = useMemo(
    () => ({
      totalGuests: guests.length,

      vipGuests: guests.filter(
        (guest) =>
          [
            "vip",
            "vip_plus",
          ].includes(
            guest.vip_level
          )
      ).length,

      activeStays: relations.filter(
        (relation) => {
          const reservation =
            firstRelation(
              relation.reservation
            );

          return (
            reservation?.status ===
            "checked_in"
          );
        }
      ).length,

      totalStays: guests.reduce(
        (total, guest) =>
          total +
          Number(
            guest.total_stays || 0
          ),
        0
      ),

      totalNights: guests.reduce(
        (total, guest) =>
          total +
          Number(
            guest.total_nights || 0
          ),
        0
      ),

      totalSpend: guests.reduce(
        (total, guest) =>
          total +
          Number(
            guest.total_spend || 0
          ),
        0
      ),
    }),
    [guests, relations]
  );

  async function refresh() {
    if (!membership) {
      return;
    }

    await loadData(
      membership.company_id
    );
  }

  function toggleGuestSelection(
    guestId: string
  ) {
    setSelectedGuestIds(
      (current) =>
        current.includes(guestId)
          ? current.filter(
              (id) => id !== guestId
            )
          : [
              ...current,
              guestId,
            ]
    );
  }

  function toggleAllVisibleGuests() {
    const visibleIds =
      visibleGuests.map(
        (guest) => guest.id
      );

    const allSelected =
      visibleIds.length > 0 &&
      visibleIds.every((id) =>
        selectedGuestIds.includes(id)
      );

    if (allSelected) {
      setSelectedGuestIds(
        (current) =>
          current.filter(
            (id) =>
              !visibleIds.includes(id)
          )
      );

      return;
    }

    setSelectedGuestIds(
      (current) =>
        Array.from(
          new Set([
            ...current,
            ...visibleIds,
          ])
        )
    );
  }

  async function deleteSelectedGuests() {
    if (
      !membership ||
      processing
    ) {
      return;
    }

    const selectedGuests =
      guests.filter((guest) =>
        selectedGuestIds.includes(
          guest.id
        )
      );

    if (
      selectedGuests.length === 0
    ) {
      setErrorMessage(
        "Silmek için en az bir misafir seçmelisiniz."
      );

      return;
    }

    const previewNames =
      selectedGuests
        .slice(0, 3)
        .map(
          (guest) =>
            `${guest.first_name} ${guest.last_name}`
        )
        .join(", ");

    const extraCount =
      Math.max(
        0,
        selectedGuests.length - 3
      );

    const confirmationText =
      extraCount > 0
        ? `${previewNames} ve ${extraCount} misafir daha kalıcı olarak silinecek. Devam edilsin mi?`
        : `${previewNames} kalıcı olarak silinecek. Devam edilsin mi?`;

    if (
      !window.confirm(
        confirmationText
      )
    ) {
      return;
    }

    setProcessing(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      for (
        const guest of selectedGuests
      ) {
        await deleteGuest(
          membership.company_id,
          guest.id
        );
      }

      if (
        selectedGuestId &&
        selectedGuestIds.includes(
          selectedGuestId
        )
      ) {
        setSelectedGuestId("");
      }

      setSelectedGuestIds([]);

      await refresh();

      setSuccessMessage(
        `${selectedGuests.length} misafir profili silindi.`
      );
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Seçili misafirler silinemedi."
      );
    } finally {
      setProcessing(false);
    }
  }

  function openNewGuest() {
    setEditingId("");
    setForm(emptyGuestForm());
    setShowForm(true);
    setErrorMessage("");
    setSuccessMessage("");
  }

  function editSelectedGuest() {
    if (!selectedGuest) {
      return;
    }

    setEditingId(
      selectedGuest.id
    );

    setForm({
      firstName:
        selectedGuest.first_name,

      lastName:
        selectedGuest.last_name,

      gender:
        selectedGuest.gender ?? "",

      birthDate:
        selectedGuest.birth_date ??
        "",

      nationality:
        selectedGuest.nationality ??
        "",

      identityType:
        selectedGuest.identity_type ??
        "",

      identityNumber:
        selectedGuest.identity_number ??
        "",

      passportExpiryDate:
        selectedGuest
          .passport_expiry_date ?? "",

      phone:
        selectedGuest.phone ?? "",

      email:
        selectedGuest.email ?? "",

      country:
        selectedGuest.country ?? "",

      city:
        selectedGuest.city ?? "",

      address:
        selectedGuest.address ?? "",

      language:
        selectedGuest.language ??
        "tr",

      vipLevel:
        selectedGuest.vip_level,

      tagsText:
        selectedGuest.tags.join(", "),

      notes:
        selectedGuest.notes ?? "",

      marketingConsent:
        selectedGuest
          .marketing_consent,

      kvkkConsent:
        selectedGuest.kvkk_consent,
    });

    setShowForm(true);
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
        "Ad ve soyad alanları zorunludur."
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

          guestId: editingId,

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
          "Misafir profili güncellendi."
        );
      } else {
        const {
          data: { user },
        } =
          await supabase.auth.getUser();

        const newGuest =
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

        setSelectedGuestId(
          newGuest.id
        );

        setSuccessMessage(
          "Yeni misafir profili oluşturuldu."
        );
      }

      setShowForm(false);
      setEditingId("");
      setForm(emptyGuestForm());

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

  async function removeSelectedGuest() {
    if (
      !membership ||
      !selectedGuest ||
      processing
    ) {
      return;
    }

    const approved =
      window.confirm(
        `${selectedGuest.first_name} ${selectedGuest.last_name} misafir profili kalıcı olarak silinsin mi?`
      );

    if (!approved) {
      return;
    }

    setProcessing(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await deleteGuest(
        membership.company_id,
        selectedGuest.id
      );

      setSelectedGuestId("");

      await refresh();

      setSuccessMessage(
        "Misafir profili silindi."
      );
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Misafir profili silinemedi."
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
      processing
    ) {
      return;
    }

    const approved =
      window.confirm(
        "Misafir bu rezervasyondan çıkarılsın mı?"
      );

    if (!approved) {
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
        "Rezervasyon bağlantısı kaldırıldı."
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
      <main className="p-10">
        Misafir merkezi yükleniyor...
      </main>
    );
  }

  return (
    <main className="px-4 py-8 lg:px-8">
      <div className="mx-auto max-w-[1900px]">
        <header className="flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.25em] text-orange-400">
              TUROS HOTEL PMS
            </p>

            <h1 className="mt-3 text-4xl font-black md:text-5xl">
              Misafir Profilleri & Kimlik Merkezi
            </h1>

            <p className="mt-4 max-w-4xl text-slate-400">
              Misafir bilgilerini, kimlik
              detaylarını, tercihlerini ve
              konaklama geçmişini tek
              merkezden yönetin.
            </p>
          </div>

          <button
            type="button"
            onClick={openNewGuest}
            className="flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-orange-500 px-7 font-black"
          >
            <FaPlus />
            Yeni Misafir
          </button>
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

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          {[
            {
              label: "Toplam Misafir",
              value:
                statistics.totalGuests,
              icon: FaUsers,
            },
            {
              label: "VIP Misafir",
              value:
                statistics.vipGuests,
              icon: FaCrown,
            },
            {
              label: "Aktif Konaklama",
              value:
                statistics.activeStays,
              icon: FaHotel,
            },
            {
              label: "Toplam Konaklama",
              value:
                statistics.totalStays,
              icon: FaSuitcase,
            },
            {
              label: "Toplam Geceleme",
              value:
                statistics.totalNights,
              icon: FaCalendarAlt,
            },
            {
              label: "Toplam Harcama",
              value: money(
                statistics.totalSpend
              ),
              icon:
                FaMoneyBillWave,
            },
          ].map((item) => {
            const Icon = item.icon;

            return (
              <article
                key={item.label}
                className="rounded-3xl border border-white/10 bg-slate-900 p-5"
              >
                <Icon className="text-orange-400" />

                <p className="mt-4 text-xs text-slate-500">
                  {item.label}
                </p>

                <p className="mt-2 text-2xl font-black">
                  {item.value}
                </p>
              </article>
            );
          })}
        </section>

        <section className="mt-7 grid gap-6 xl:grid-cols-[minmax(390px,0.9fr)_minmax(0,1.6fr)]">
          <article className="rounded-[30px] border border-white/10 bg-slate-900 p-5">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <h2 className="text-2xl font-black">
                  Misafir Arama & Listesi
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  Misafir adı, kimlik,
                  telefon veya e-posta ile
                  arama yapın.
                </p>
              </div>

              <span className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-slate-400">
                {visibleGuests.length} kayıt
              </span>
            </div>

            <label className="mt-5 flex min-h-12 items-center gap-3 rounded-xl bg-white px-4">
              <FaSearch className="text-orange-500" />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Ad, soyad, kimlik, telefon, e-posta..."
                className="w-full bg-transparent font-bold text-slate-950 outline-none"
              />
            </label>

            <div className="mt-4 flex flex-wrap gap-2">
              {[
                {
                  value: "all",
                  label: "Tümü",
                },
                {
                  value: "vip",
                  label: "VIP",
                },
                {
                  value: "honeymoon",
                  label: "Balayı",
                },
                {
                  value: "corporate",
                  label: "Kurumsal",
                },
                {
                  value: "blacklist",
                  label: "Kara Liste",
                },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() =>
                    setFilter(
                      item.value as
                        GuestFilter
                    )
                  }
                  className={`rounded-xl px-4 py-2 text-sm font-black ${
                    filter === item.value
                      ? "bg-orange-500 text-white"
                      : "bg-slate-950 text-slate-400"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="mt-5 flex flex-col justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950 p-4 sm:flex-row sm:items-center">
              <label className="flex items-center gap-3 font-black">
                <input
                  type="checkbox"
                  checked={
                    visibleGuests.length > 0 &&
                    visibleGuests.every(
                      (guest) =>
                        selectedGuestIds.includes(
                          guest.id
                        )
                    )
                  }
                  onChange={
                    toggleAllVisibleGuests
                  }
                  className="h-5 w-5"
                />

                Görünenleri seç
              </label>

              <button
                type="button"
                disabled={
                  processing ||
                  selectedGuestIds.length === 0
                }
                onClick={() =>
                  void deleteSelectedGuests()
                }
                className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-500/15 px-4 font-black text-red-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <FaTrash />
                Seçilenleri Sil (
                {selectedGuestIds.length})
              </button>
            </div>

            <div className="mt-5 max-h-[720px] space-y-3 overflow-y-auto pr-1">
              {visibleGuests.map(
                (guest) => {
                  const selected =
                    guest.id ===
                    selectedGuestId;

                  return (
                    <article
                      key={guest.id}
                      className={`w-full rounded-2xl border p-4 text-left transition ${
                        selected
                          ? "border-orange-400 bg-orange-500/[0.08]"
                          : selectedGuestIds.includes(
                                guest.id
                              )
                            ? "border-blue-400/50 bg-blue-500/[0.06]"
                            : "border-white/10 bg-slate-950 hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={
                            selectedGuestIds.includes(
                              guest.id
                            )
                          }
                          onChange={() =>
                            toggleGuestSelection(
                              guest.id
                            )
                          }
                          className="mt-1 h-5 w-5 shrink-0"
                        />

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedGuestId(
                              guest.id
                            );

                            setActiveTab(
                              "general"
                            );
                          }}
                          className="min-w-0 flex-1 text-left"
                        >
                          <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-black">
                            {guest.first_name}{" "}
                            {guest.last_name}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {guest.email ||
                              guest.phone ||
                              "İletişim bilgisi yok"}
                          </p>
                        </div>

                        <span
                          className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${vipClass(
                            guest.vip_level
                          )}`}
                        >
                          {
                            vipLabels[
                              guest.vip_level
                            ]
                          }
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-xl bg-white/[0.03] p-2">
                          <p className="font-black">
                            {guest.total_stays}
                          </p>

                          <p className="text-[9px] text-slate-500">
                            Konaklama
                          </p>
                        </div>

                        <div className="rounded-xl bg-white/[0.03] p-2">
                          <p className="font-black">
                            {guest.total_nights}
                          </p>

                          <p className="text-[9px] text-slate-500">
                            Gece
                          </p>
                        </div>

                        <div className="rounded-xl bg-white/[0.03] p-2">
                          <p className="truncate text-xs font-black">
                            {money(
                              guest.total_spend
                            )}
                          </p>

                          <p className="text-[9px] text-slate-500">
                            Harcama
                          </p>
                        </div>
                          </div>
                        </button>
                      </div>
                    </article>
                  );
                }
              )}

              {visibleGuests.length ===
                0 && (
                <div className="rounded-2xl bg-slate-950 p-8 text-center text-slate-500">
                  Filtrelere uygun misafir
                  bulunamadı.
                </div>
              )}
            </div>
          </article>

          <article className="rounded-[30px] border border-white/10 bg-slate-900 p-6">
            {!selectedGuest ? (
              <div className="flex min-h-[640px] items-center justify-center text-center">
                <div>
                  <FaUser className="mx-auto text-5xl text-orange-400" />

                  <h2 className="mt-5 text-2xl font-black">
                    Misafir seçin
                  </h2>

                  <p className="mt-2 text-slate-500">
                    Misafir kartı ve geçmişi
                    burada görüntülenecek.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
                  <div className="flex items-center gap-4">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-orange-500/15 text-3xl text-orange-400">
                      <FaUser />
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-3xl font-black">
                          {
                            selectedGuest.first_name
                          }{" "}
                          {
                            selectedGuest.last_name
                          }
                        </h2>

                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-black ${vipClass(
                            selectedGuest.vip_level
                          )}`}
                        >
                          {
                            vipLabels[
                              selectedGuest.vip_level
                            ]
                          }
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-slate-500">
                        Profil ID:{" "}
                        {selectedGuest.id}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={
                        editSelectedGuest
                      }
                      className="flex min-h-11 items-center gap-2 rounded-xl bg-orange-500 px-4 font-black"
                    >
                      <FaEdit />
                      Düzenle
                    </button>

                    <button
                      type="button"
                      disabled={processing}
                      onClick={() =>
                        void removeSelectedGuest()
                      }
                      title="Misafir profilini kalıcı olarak sil"
                      className="flex min-h-11 items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/15 px-4 font-black text-red-400 transition hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <FaTrash />
                      Profili Sil
                    </button>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-2 border-b border-white/10 pb-4">
                  {[
                    {
                      value: "general",
                      label: "Genel Bilgiler",
                    },
                    {
                      value: "history",
                      label:
                        "Konaklama Geçmişi",
                    },
                    {
                      value: "preferences",
                      label:
                        "Tercihler & Etiketler",
                    },
                    {
                      value: "notes",
                      label: "Notlar",
                    },
                  ].map((tab) => (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() =>
                        setActiveTab(
                          tab.value as GuestTab
                        )
                      }
                      className={`rounded-xl px-4 py-2 text-sm font-black ${
                        activeTab ===
                        tab.value
                          ? "bg-orange-500 text-white"
                          : "bg-slate-950 text-slate-400"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {activeTab ===
                  "general" && (
                  <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
                    <div className="grid gap-4 sm:grid-cols-2">
                      {[
                        {
                          label:
                            "Kimlik Türü",
                          value:
                            selectedGuest.identity_type
                              ? identityLabels[
                                  selectedGuest.identity_type
                                ]
                              : "Belirtilmedi",
                          icon: FaIdCard,
                        },
                        {
                          label:
                            "Kimlik / Pasaport No",
                          value:
                            selectedGuest.identity_number ||
                            "Belirtilmedi",
                          icon:
                            FaAddressCard,
                        },
                        {
                          label: "Telefon",
                          value:
                            selectedGuest.phone ||
                            "Belirtilmedi",
                          icon: FaPhone,
                        },
                        {
                          label: "E-posta",
                          value:
                            selectedGuest.email ||
                            "Belirtilmedi",
                          icon: FaEnvelope,
                        },
                        {
                          label:
                            "Doğum Tarihi",
                          value: formatDate(
                            selectedGuest.birth_date
                          ),
                          icon:
                            FaCalendarAlt,
                        },
                        {
                          label: "Uyruk",
                          value:
                            selectedGuest.nationality ||
                            "Belirtilmedi",
                          icon: FaUser,
                        },
                        {
                          label: "Şehir",
                          value:
                            selectedGuest.city ||
                            "Belirtilmedi",
                          icon: FaHotel,
                        },
                        {
                          label: "Dil",
                          value:
                            selectedGuest.language ||
                            "tr",
                          icon: FaUser,
                        },
                      ].map((item) => {
                        const Icon =
                          item.icon;

                        return (
                          <div
                            key={item.label}
                            className="rounded-2xl bg-slate-950 p-4"
                          >
                            <p className="flex items-center gap-2 text-xs text-slate-500">
                              <Icon className="text-orange-400" />
                              {item.label}
                            </p>

                            <p className="mt-2 font-black">
                              {item.value}
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    <div className="space-y-3">
                      {[
                        {
                          label:
                            "Toplam Konaklama",
                          value:
                            selectedGuest.total_stays,
                        },
                        {
                          label:
                            "Toplam Gece",
                          value:
                            selectedGuest.total_nights,
                        },
                        {
                          label:
                            "Toplam Harcama",
                          value: money(
                            selectedGuest.total_spend
                          ),
                        },
                        {
                          label:
                            "Son Konaklama",
                          value: formatDate(
                            selectedGuest.last_stay_at
                          ),
                        },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="rounded-2xl bg-slate-950 p-4"
                        >
                          <p className="text-xs text-slate-500">
                            {item.label}
                          </p>

                          <p className="mt-2 text-xl font-black">
                            {item.value}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab ===
                  "history" && (
                  <div className="mt-6 space-y-4">
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
                            className="rounded-2xl bg-slate-950 p-5"
                          >
                            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                              <div>
                                <p className="font-black">
                                  {
                                    reservation?.reservation_no
                                  }
                                </p>

                                <p className="mt-2 text-sm text-slate-500">
                                  {hotel?.name ||
                                    "Otel"}
                                  {" · "}
                                  {room?.room_number
                                    ? `Oda ${room.room_number}`
                                    : "Oda atanmadı"}
                                </p>

                                <p className="mt-2 text-sm text-slate-500">
                                  {formatDate(
                                    reservation?.check_in
                                  )}
                                  {" – "}
                                  {formatDate(
                                    reservation?.check_out
                                  )}
                                </p>
                              </div>

                              <div className="flex items-center gap-3">
                                {relation.is_primary && (
                                  <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-black text-amber-400">
                                    Ana Misafir
                                  </span>
                                )}

                                <button
                                  type="button"
                                  disabled={
                                    processing
                                  }
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
                            </div>
                          </article>
                        );
                      }
                    )}

                    {selectedRelations.length ===
                      0 && (
                      <div className="rounded-2xl bg-slate-950 p-10 text-center text-slate-500">
                        Bu misafirin bağlı
                        rezervasyonu bulunmuyor.
                      </div>
                    )}
                  </div>
                )}

                {activeTab ===
                  "preferences" && (
                  <div className="mt-6">
                    <h3 className="font-black">
                      Misafir Etiketleri
                    </h3>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {selectedGuest.tags.map(
                        (tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-orange-500/10 px-4 py-2 text-sm font-black text-orange-300"
                          >
                            {tag}
                          </span>
                        )
                      )}

                      {selectedGuest.tags
                        .length === 0 && (
                        <p className="text-slate-500">
                          Misafir etiketi
                          bulunmuyor.
                        </p>
                      )}
                    </div>

                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                      <div className="rounded-2xl bg-slate-950 p-5">
                        <p className="text-xs text-slate-500">
                          KVKK Onayı
                        </p>

                        <p
                          className={`mt-2 font-black ${
                            selectedGuest.kvkk_consent
                              ? "text-emerald-400"
                              : "text-red-400"
                          }`}
                        >
                          {selectedGuest.kvkk_consent
                            ? "Onaylandı"
                            : "Onay yok"}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-slate-950 p-5">
                        <p className="text-xs text-slate-500">
                          Pazarlama İzni
                        </p>

                        <p
                          className={`mt-2 font-black ${
                            selectedGuest.marketing_consent
                              ? "text-emerald-400"
                              : "text-slate-400"
                          }`}
                        >
                          {selectedGuest.marketing_consent
                            ? "İzin var"
                            : "İzin yok"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab ===
                  "notes" && (
                  <div className="mt-6 rounded-2xl bg-slate-950 p-5">
                    <h3 className="font-black">
                      Misafir Notları
                    </h3>

                    <p className="mt-4 whitespace-pre-wrap leading-7 text-slate-400">
                      {selectedGuest.notes ||
                        "Bu misafir için kayıtlı not bulunmuyor."}
                    </p>
                  </div>
                )}

                <Guest360Panel
                  companyId={membership?.company_id ?? ""}
                  guestId={selectedGuest.id}
                />

                <section className="mt-7 rounded-3xl border border-white/10 bg-slate-950 p-5">
                  <h3 className="flex items-center gap-3 text-xl font-black">
                    <FaLink className="text-orange-400" />
                    Rezervasyona Misafir Bağla
                  </h3>

                  <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px_170px_auto]">
                    <select
                      value={reservationId}
                      onChange={(event) =>
                        setReservationId(
                          event.target.value
                        )
                      }
                      className="min-h-12 rounded-xl bg-white px-4 font-bold text-slate-950"
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
                              {hotel?.name ||
                                "Otel"}
                              {" · "}
                              {formatDate(
                                reservation.check_in
                              )}
                            </option>
                          );
                        }
                      )}
                    </select>

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
                            event.target
                              .checked
                          )
                        }
                        className="h-5 w-5"
                      />

                      Ana misafir
                    </label>

                    <button
                      type="button"
                      disabled={
                        processing ||
                        !reservationId
                      }
                      onClick={() =>
                        void attachReservation()
                      }
                      className="min-h-12 rounded-xl bg-orange-500 px-6 font-black disabled:opacity-50"
                    >
                      Bağla
                    </button>
                  </div>
                </section>
              </>
            )}
          </article>
        </section>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Formu kapat"
            onClick={() =>
              setShowForm(false)
            }
            className="absolute inset-0"
          />

          <aside className="relative z-10 h-full w-full max-w-3xl overflow-y-auto border-l border-white/10 bg-slate-950 p-6 lg:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-400">
                  MİSAFİR YÖNETİMİ
                </p>

                <h2 className="mt-2 text-3xl font-black">
                  {editingId
                    ? "Misafir Profilini Düzenle"
                    : "Yeni Misafir Kaydı"}
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  Yıldızlı alanlar zorunludur.
                  Diğer bilgileri daha sonra
                  tamamlayabilirsiniz.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowForm(false)
                }
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5"
              >
                <FaTimes />
              </button>
            </div>

            <form
              onSubmit={submitGuest}
              className="mt-8 space-y-7"
            >
              <section>
                <h3 className="border-b border-white/10 pb-3 text-lg font-black">
                  Kişisel Bilgiler
                </h3>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label>
                    <span className="mb-2 block text-sm font-black">
                      Ad *
                    </span>

                    <input
                      required
                      value={form.firstName}
                      onChange={(event) =>
                        setForm(
                          (current) => ({
                            ...current,
                            firstName:
                              event.target
                                .value,
                          })
                        )
                      }
                      placeholder="Misafirin adı"
                      className="min-h-12 w-full rounded-xl bg-white px-4 font-bold text-slate-950"
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-black">
                      Soyad *
                    </span>

                    <input
                      required
                      value={form.lastName}
                      onChange={(event) =>
                        setForm(
                          (current) => ({
                            ...current,
                            lastName:
                              event.target
                                .value,
                          })
                        )
                      }
                      placeholder="Misafirin soyadı"
                      className="min-h-12 w-full rounded-xl bg-white px-4 font-bold text-slate-950"
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-black">
                      Cinsiyet
                    </span>

                    <select
                      value={form.gender}
                      onChange={(event) =>
                        setForm(
                          (current) => ({
                            ...current,
                            gender:
                              event.target
                                .value,
                          })
                        )
                      }
                      className="min-h-12 w-full rounded-xl bg-white px-4 font-bold text-slate-950"
                    >
                      <option value="">
                        Seçiniz
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
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-black">
                      Doğum Tarihi
                    </span>

                    <input
                      type="date"
                      value={form.birthDate}
                      max={todayDate}
                      onChange={(event) =>
                        setForm(
                          (current) => ({
                            ...current,
                            birthDate:
                              event.target
                                .value,
                          })
                        )
                      }
                      className="min-h-12 w-full rounded-xl bg-white px-4 font-bold text-slate-950"
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-black">
                      Uyruk
                    </span>

                    <input
                      value={
                        form.nationality
                      }
                      onChange={(event) =>
                        setForm(
                          (current) => ({
                            ...current,
                            nationality:
                              event.target
                                .value,
                          })
                        )
                      }
                      placeholder="Örn: Türkiye"
                      className="min-h-12 w-full rounded-xl bg-white px-4 font-bold text-slate-950"
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-black">
                      VIP Seviyesi
                    </span>

                    <select
                      value={form.vipLevel}
                      onChange={(event) =>
                        setForm(
                          (current) => ({
                            ...current,
                            vipLevel:
                              event.target
                                .value as
                                GuestVipLevel,
                          })
                        )
                      }
                      className="min-h-12 w-full rounded-xl bg-white px-4 font-bold text-slate-950"
                    >
                      {Object.entries(
                        vipLabels
                      ).map(
                        ([
                          value,
                          label,
                        ]) => (
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
                </div>
              </section>

              <section>
                <h3 className="border-b border-white/10 pb-3 text-lg font-black">
                  Kimlik Bilgileri
                </h3>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label>
                    <span className="mb-2 block text-sm font-black">
                      Kimlik Türü
                    </span>

                    <select
                      value={
                        form.identityType
                      }
                      onChange={(event) =>
                        setForm(
                          (current) => ({
                            ...current,
                            identityType:
                              event.target
                                .value as
                                | GuestIdentityType
                                | "",
                          })
                        )
                      }
                      className="min-h-12 w-full rounded-xl bg-white px-4 font-bold text-slate-950"
                    >
                      <option value="">
                        Seçiniz
                      </option>

                      {Object.entries(
                        identityLabels
                      ).map(
                        ([
                          value,
                          label,
                        ]) => (
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
                    <span className="mb-2 block text-sm font-black">
                      Kimlik / Pasaport No
                    </span>

                    <input
                      value={
                        form.identityNumber
                      }
                      onChange={(event) =>
                        setForm(
                          (current) => ({
                            ...current,
                            identityNumber:
                              event.target
                                .value,
                          })
                        )
                      }
                      placeholder="Kimlik veya pasaport numarası"
                      className="min-h-12 w-full rounded-xl bg-white px-4 font-bold text-slate-950"
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-black">
                      Pasaport Geçerlilik Tarihi
                    </span>

                    <input
                      type="date"
                      value={
                        form.passportExpiryDate
                      }
                      onChange={(event) =>
                        setForm(
                          (current) => ({
                            ...current,
                            passportExpiryDate:
                              event.target
                                .value,
                          })
                        )
                      }
                      className="min-h-12 w-full rounded-xl bg-white px-4 font-bold text-slate-950"
                    />
                  </label>
                </div>
              </section>

              <section>
                <h3 className="border-b border-white/10 pb-3 text-lg font-black">
                  İletişim Bilgileri
                </h3>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label>
                    <span className="mb-2 block text-sm font-black">
                      Telefon
                    </span>

                    <input
                      value={form.phone}
                      onChange={(event) =>
                        setForm(
                          (current) => ({
                            ...current,
                            phone:
                              event.target
                                .value,
                          })
                        )
                      }
                      placeholder="+90 555 123 45 67"
                      className="min-h-12 w-full rounded-xl bg-white px-4 font-bold text-slate-950"
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-black">
                      E-posta
                    </span>

                    <input
                      type="email"
                      value={form.email}
                      onChange={(event) =>
                        setForm(
                          (current) => ({
                            ...current,
                            email:
                              event.target
                                .value,
                          })
                        )
                      }
                      placeholder="misafir@email.com"
                      className="min-h-12 w-full rounded-xl bg-white px-4 font-bold text-slate-950"
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-black">
                      Ülke
                    </span>

                    <input
                      value={form.country}
                      onChange={(event) =>
                        setForm(
                          (current) => ({
                            ...current,
                            country:
                              event.target
                                .value,
                          })
                        )
                      }
                      placeholder="Ülke"
                      className="min-h-12 w-full rounded-xl bg-white px-4 font-bold text-slate-950"
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-black">
                      Şehir
                    </span>

                    <input
                      value={form.city}
                      onChange={(event) =>
                        setForm(
                          (current) => ({
                            ...current,
                            city:
                              event.target
                                .value,
                          })
                        )
                      }
                      placeholder="Şehir"
                      className="min-h-12 w-full rounded-xl bg-white px-4 font-bold text-slate-950"
                    />
                  </label>
                </div>

                <label className="mt-4 block">
                  <span className="mb-2 block text-sm font-black">
                    Açık Adres
                  </span>

                  <textarea
                    rows={3}
                    value={form.address}
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          address:
                            event.target
                              .value,
                        })
                      )
                    }
                    placeholder="Misafirin adresi"
                    className="w-full rounded-xl bg-white px-4 py-3 font-bold text-slate-950"
                  />
                </label>
              </section>

              <section>
                <h3 className="border-b border-white/10 pb-3 text-lg font-black">
                  Tercihler, Etiketler ve Notlar
                </h3>

                <label className="mt-4 block">
                  <span className="mb-2 block text-sm font-black">
                    Etiketler
                  </span>

                  <input
                    value={form.tagsText}
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          tagsText:
                            event.target
                              .value,
                        })
                      )
                    }
                    placeholder="Balayı, doğum günü, kurumsal, sessiz oda"
                    className="min-h-12 w-full rounded-xl bg-white px-4 font-bold text-slate-950"
                  />

                  <p className="mt-2 text-xs text-slate-500">
                    Etiketleri virgülle
                    ayırarak yazın.
                  </p>
                </label>

                <label className="mt-4 block">
                  <span className="mb-2 block text-sm font-black">
                    Misafir Notları
                  </span>

                  <textarea
                    rows={4}
                    value={form.notes}
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          notes:
                            event.target
                              .value,
                        })
                      )
                    }
                    placeholder="Özel istekler, oda tercihleri, alerji bilgileri ve operasyon notları"
                    className="w-full rounded-xl bg-white px-4 py-3 font-bold text-slate-950"
                  />
                </label>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <label className="flex min-h-12 items-center gap-3 rounded-xl bg-white/5 px-4 font-black">
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

                  <label className="flex min-h-12 items-center gap-3 rounded-xl bg-white/5 px-4 font-black">
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
              </section>

              <div className="sticky bottom-0 flex justify-end gap-3 border-t border-white/10 bg-slate-950 py-5">
                <button
                  type="button"
                  onClick={() =>
                    setShowForm(false)
                  }
                  className="min-h-12 rounded-xl border border-white/10 px-6 font-black"
                >
                  İptal
                </button>

                <button
                  type="submit"
                  disabled={processing}
                  className="flex min-h-12 items-center gap-3 rounded-xl bg-orange-500 px-7 font-black disabled:opacity-50"
                >
                  <FaSave />

                  {processing
                    ? "Kaydediliyor..."
                    : editingId
                      ? "Değişiklikleri Kaydet"
                      : "Misafiri Kaydet"}
                </button>
              </div>
            </form>
          </aside>
        </div>
      )}
    </main>
  );
}
