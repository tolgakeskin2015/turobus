"use client";

import Link from "next/link";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  FaArrowRight,
  FaBed,
  FaBolt,
  FaBroom,
  FaBuilding,
  FaCalendarAlt,
  FaChartLine,
  FaCheckCircle,
  FaChevronRight,
  FaCircle,
  FaCloud,
  FaCoins,
  FaCreditCard,
  FaExternalLinkAlt,
  FaFileInvoice,
  FaGlobe,
  FaHome,
  FaImages,
  FaKey,
  FaMapMarkerAlt,
  FaMoneyBillWave,
  FaPlus,
  FaReceipt,
  FaSyncAlt,
  FaToggleOff,
  FaToggleOn,
  FaUserFriends,
  FaUsers,
} from "react-icons/fa";
import { supabase } from "@/lib/supabase";
import VillaBookingDesk from "./components/VillaBookingDesk";
import {
  CurrentMembership,
  getCurrentMembership,
} from "@/lib/current-user";

type Villa = {
  id: string;
  name: string;
  city: string | null;
  district: string | null;
  bedrooms: number;
  bathrooms: number;
  max_guests: number;
  base_nightly_rate: number;
  cleaning_fee: number;
  cleaning_fee_under_nights: number | null;
  security_deposit: number;
  minimum_stay: number;
  marketplace_enabled: boolean;
  marketplace_commission_rate: number;
};

type Reservation = {
  id: string;
  reservation_code: string;
  guest_name: string;
  guest_phone: string | null;
  check_in: string;
  check_out: string;
  grand_total: number;
  paid_total: number;
  balance: number;
  status: string;
  cleaning_status: string;
  sales_channel: string;
  guest_token: string | null;
};

type Cleaning = {
  id: string;
  task_date: string;
  status: string;
  task_type: string;
  fee: number;
  villa_id: string;
  reservation_id: string | null;
};

type Metrics = {
  occupancy_rate?: number;
  revenue?: number;
  paid?: number;
  balance?: number;
  today_checkins?: number;
  today_checkouts?: number;
  cleaning_pending?: number;
  villa_count?: number;
};

type LocationOption = {
  id: number;
  name: string;
};

type SectionKey =
  | "overview"
  | "portfolio"
  | "reservation"
  | "operations";

const money = (value: number | null | undefined) =>
  new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));

const dateLabel = (value: string) => {
  if (!value) return "-";
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
  }).format(new Date(`${value}T12:00:00`));
};

const channelLabel = (channel: string) => {
  const labels: Record<string, string> = {
    direct: "Direkt",
    agency: "Acenta",
    b2b: "B2B",
    airbnb: "Airbnb",
    booking: "Booking",
    vrbo: "Vrbo",
    external: "Harici",
    turobus_marketplace: "Turobus",
  };
  return labels[channel] ?? channel;
};

const statusLabel = (status: string) => {
  const labels: Record<string, string> = {
    pending: "Bekliyor",
    confirmed: "Onaylı",
    checked_in: "Giriş yaptı",
    checked_out: "Çıkış yaptı",
    completed: "Tamamlandı",
    cancelled: "İptal",
    assigned: "Atandı",
    in_progress: "Devam ediyor",
    inspected: "Kontrol edildi",
  };
  return labels[status] ?? status;
};

function MetricCard({
  title,
  value,
  subtitle,
  icon,
  accent = "emerald",
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  accent?: "emerald" | "cyan" | "amber" | "violet";
}) {
  const styles = {
    emerald: "from-emerald-500/20 to-emerald-500/[.03] text-emerald-300",
    cyan: "from-cyan-500/20 to-cyan-500/[.03] text-cyan-300",
    amber: "from-amber-500/20 to-amber-500/[.03] text-amber-300",
    violet: "from-violet-500/20 to-violet-500/[.03] text-violet-300",
  };

  return (
    <div className="relative overflow-hidden rounded-[24px] border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/10">
      <div className={`absolute inset-0 bg-gradient-to-br ${styles[accent]}`} />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.18em] text-slate-500">
              {title}
            </p>
            <div className="mt-2 text-2xl font-black tracking-tight text-white">
              {value}
            </div>
          </div>
          <div className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-black/20 text-base">
            {icon}
          </div>
        </div>
        <p className="mt-3 text-xs font-medium text-slate-400">{subtitle}</p>
      </div>
    </div>
  );
}

function SectionTitle({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="text-[10px] font-black uppercase tracking-[.22em] text-emerald-400">
          {eyebrow}
        </div>
        <h2 className="mt-1 text-xl font-black tracking-tight text-white">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export default function VillaOsPage() {
  const [membership, setMembership] = useState<CurrentMembership | null>(null);
  const [villas, setVillas] = useState<Villa[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [cleaning, setCleaning] = useState<Cleaning[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({});
  const [selectedVillaId, setSelectedVillaId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<SectionKey>("overview");
  const [showVillaForm, setShowVillaForm] = useState(false);
  const [showReservationForm, setShowReservationForm] = useState(false);

  const [provinces, setProvinces] = useState<LocationOption[]>([]);
  const [districts, setDistricts] = useState<LocationOption[]>([]);
  const [selectedProvinceId, setSelectedProvinceId] = useState("");
  const [locationsLoading, setLocationsLoading] = useState(false);

  const [villaPhotoFiles, setVillaPhotoFiles] = useState<File[]>([]);
  const [villaPhotoPreviews, setVillaPhotoPreviews] = useState<string[]>([]);

  const [form, setForm] = useState({
    name: "",
    city: "Muğla",
    district: "Fethiye",
    bedrooms: "2",
    bathrooms: "2",
    maxGuests: "4",
    nightly: "0",
    cleaning: "0",
    cleaningUnder: "4",
    deposit: "0",
    minimumStay: "2",
    commission: "15",
  });


  const load = useCallback(
    async (companyId: string) => {
      setLoading(true);
      try {
        const [villaR, reservationR, cleaningR, metricsR] = await Promise.all([
          supabase
            .from("villas")
            .select(
              "id,name,city,district,bedrooms,bathrooms,max_guests,base_nightly_rate,cleaning_fee,cleaning_fee_under_nights,security_deposit,minimum_stay,marketplace_enabled,marketplace_commission_rate"
            )
            .eq("company_id", companyId)
            .eq("is_active", true)
            .order("name"),
          supabase
            .from("villa_reservations")
            .select(
              "id,reservation_code,guest_name,guest_phone,check_in,check_out,grand_total,paid_total,balance,status,cleaning_status,sales_channel,guest_token"
            )
            .eq("company_id", companyId)
            .order("check_in", { ascending: true })
            .limit(100),
          supabase
            .from("villa_cleaning_tasks")
            .select(
              "id,task_date,status,task_type,fee,villa_id,reservation_id"
            )
            .eq("company_id", companyId)
            .order("task_date")
            .limit(100),
          supabase.rpc("get_villa_os_dashboard", {
            p_company_id: companyId,
            p_month: new Date().toISOString().slice(0, 10),
          }),
        ]);

        for (const result of [villaR, reservationR, cleaningR, metricsR]) {
          if (result.error) throw new Error(result.error.message);
        }

        setVillas((villaR.data ?? []) as Villa[]);
        setReservations((reservationR.data ?? []) as Reservation[]);
        setCleaning((cleaningR.data ?? []) as Cleaning[]);
        setMetrics((metricsR.data ?? {}) as Metrics);

        if (!selectedVillaId && villaR.data?.[0]?.id) {
          setSelectedVillaId(villaR.data[0].id);
        }
      } finally {
        setLoading(false);
      }
    },
    [selectedVillaId]
  );

  useEffect(() => {
    void (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const currentMembership = await getCurrentMembership(user.id);
        if (!currentMembership) return;

        setMembership(currentMembership);
        await load(currentMembership.company_id);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Villa OS yüklenemedi"
        );
      }
    })();
  }, [load]);

  const selectedVilla = useMemo(
    () => villas.find((villa) => villa.id === selectedVillaId) ?? null,
    [selectedVillaId, villas]
  );

  const upcomingReservations = useMemo(
    () =>
      reservations
        .filter((reservation) => reservation.status !== "cancelled")
        .slice(0, 6),
    [reservations]
  );

  const activeMarketplaceCount = villas.filter(
    (villa) => villa.marketplace_enabled
  ).length;

  useEffect(() => {
    if (!showVillaForm) return;

    void (async () => {
      try {
        setLocationsLoading(true);

        const provinceResponse = await fetch(
          "/api/locations/turkey"
        );

        const provinceJson = (await provinceResponse.json()) as {
          data?: LocationOption[];
          error?: string;
        };

        if (!provinceResponse.ok) {
          throw new Error(
            provinceJson.error || "İller yüklenemedi."
          );
        }

        const provinceRows = provinceJson.data ?? [];
        setProvinces(provinceRows);

        const matchedProvince =
          provinceRows.find(
            (item) => item.name === form.city
          ) ??
          provinceRows.find(
            (item) => item.name === "Muğla"
          );

        if (!matchedProvince) return;

        setSelectedProvinceId(
          String(matchedProvince.id)
        );

        setForm((current) => ({
          ...current,
          city: matchedProvince.name,
        }));

        const districtResponse = await fetch(
          `/api/locations/turkey?provinceId=${matchedProvince.id}`
        );

        const districtJson = (await districtResponse.json()) as {
          data?: LocationOption[];
          error?: string;
        };

        if (!districtResponse.ok) {
          throw new Error(
            districtJson.error || "İlçeler yüklenemedi."
          );
        }

        setDistricts(districtJson.data ?? []);
      } catch (locationError) {
        setError(
          locationError instanceof Error
            ? locationError.message
            : "Konum bilgileri yüklenemedi."
        );
      } finally {
        setLocationsLoading(false);
      }
    })();
  }, [showVillaForm]);


  async function handleProvinceChange(
    provinceId: string
  ) {
    setSelectedProvinceId(provinceId);
    setDistricts([]);

    const province =
      provinces.find(
        (item) =>
          String(item.id) === provinceId
      );

    setForm((current) => ({
      ...current,
      city: province?.name ?? "",
      district: "",
    }));

    if (!provinceId) return;

    try {
      setLocationsLoading(true);

      const response = await fetch(
        `/api/locations/turkey?provinceId=${provinceId}`
      );

      const json = (await response.json()) as {
        data?: LocationOption[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          json.error || "İlçeler yüklenemedi."
        );
      }

      setDistricts(json.data ?? []);
    } catch (locationError) {
      setError(
        locationError instanceof Error
          ? locationError.message
          : "İlçeler yüklenemedi."
      );
    } finally {
      setLocationsLoading(false);
    }
  }


  function selectVillaPhotos(
    files: FileList | null
  ) {
    if (!files) return;

    villaPhotoPreviews.forEach((url) =>
      URL.revokeObjectURL(url)
    );

    const selected = Array.from(files)
      .filter((file) =>
        file.type.startsWith("image/")
      )
      .slice(0, 15);

    setVillaPhotoFiles(selected);

    setVillaPhotoPreviews(
      selected.map((file) =>
        URL.createObjectURL(file)
      )
    );
  }


  function removeVillaPhoto(index: number) {
    const preview =
      villaPhotoPreviews[index];

    if (preview) {
      URL.revokeObjectURL(preview);
    }

    setVillaPhotoFiles((current) =>
      current.filter(
        (_, itemIndex) =>
          itemIndex !== index
      )
    );

    setVillaPhotoPreviews((current) =>
      current.filter(
        (_, itemIndex) =>
          itemIndex !== index
      )
    );
  }

  async function addVilla(event: FormEvent) {
    event.preventDefault();
    if (!membership || !form.name.trim()) return;

    setError("");
    setMessage("");

    const slug = `${form.name}-${Date.now()}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-");

    const {
      data: createdVilla,
      error: insertError,
    } = await supabase
      .from("villas")
      .insert({
        company_id: membership.company_id,
        name: form.name.trim(),
        slug,
        city: form.city || null,
        district: form.district || null,
        bedrooms: Number(form.bedrooms),
        bathrooms: Number(form.bathrooms),
        max_guests: Number(form.maxGuests),
        base_nightly_rate: Number(form.nightly),
        cleaning_fee: Number(form.cleaning),
        cleaning_fee_under_nights: form.cleaningUnder
          ? Number(form.cleaningUnder)
          : null,
        security_deposit: Number(form.deposit),
        minimum_stay: Number(form.minimumStay),
        marketplace_commission_rate: Number(form.commission),
      })
      .select("id")
      .single();

    if (insertError) {
      return setError(insertError.message);
    }

    let uploadedPhotoCount = 0;
    const photoErrors: string[] = [];

    if (createdVilla?.id && villaPhotoFiles.length) {
      for (
        let index = 0;
        index < villaPhotoFiles.length;
        index += 1
      ) {
        const file = villaPhotoFiles[index];

        try {
          const extension =
            file.name.split(".").pop() || "jpg";

          const storagePath =
            `${membership.company_id}/${createdVilla.id}/` +
            `${Date.now()}-${index}-${Math.random()
              .toString(36)
              .slice(2)}.${extension}`;

          const {
            error: uploadError,
          } = await supabase.storage
            .from("villa-media")
            .upload(
              storagePath,
              file,
              {
                upsert: false,
                contentType: file.type,
              }
            );

          if (uploadError) {
            throw uploadError;
          }

          const {
            data: publicUrlData,
          } = supabase.storage
            .from("villa-media")
            .getPublicUrl(storagePath);

          const {
            error: photoInsertError,
          } = await supabase
            .from("villa_photos")
            .insert({
              company_id:
                membership.company_id,
              villa_id:
                createdVilla.id,
              storage_path:
                storagePath,
              public_url:
                publicUrlData.publicUrl,
              category:
                "gallery",
              sort_order:
                index,
              is_cover:
                index === 0,
            });

          if (photoInsertError) {
            throw photoInsertError;
          }

          uploadedPhotoCount += 1;
        } catch (photoError) {
          photoErrors.push(
            photoError instanceof Error
              ? photoError.message
              : "Fotoğraf yüklenemedi."
          );
        }
      }
    }

    await supabase.rpc(
      "sync_turobus_villa_network"
    );

    villaPhotoPreviews.forEach((url) =>
      URL.revokeObjectURL(url)
    );

    setVillaPhotoFiles([]);
    setVillaPhotoPreviews([]);

    if (photoErrors.length) {
      setMessage(
        `Villa oluşturuldu. ${uploadedPhotoCount} fotoğraf yüklendi, ${photoErrors.length} fotoğraf yüklenemedi.`
      );
    } else {
      setMessage(
        villaPhotoFiles.length
          ? `Villa ve ${uploadedPhotoCount} fotoğraf başarıyla kaydedildi.`
          : "Villa başarıyla oluşturuldu."
      );
    }

    setForm((current) => ({
      ...current,
      name: "",
    }));

    setSelectedVillaId(
      createdVilla?.id ?? ""
    );

    setShowVillaForm(false);

    await load(
      membership.company_id
    );
  }

  async function toggleMarketplace(villa: Villa) {
    if (!membership) return;

    const { error: updateError } = await supabase
      .from("villas")
      .update({
        marketplace_enabled: !villa.marketplace_enabled,
        updated_at: new Date().toISOString(),
      })
      .eq("id", villa.id)
      .eq("company_id", membership.company_id);

    if (updateError) return setError(updateError.message);

    await supabase.rpc("sync_turobus_villa_network");
    await load(membership.company_id);
  }

  const navigation = [
    ["overview", "Yönetim", FaChartLine],
    ["portfolio", "Villalar", FaHome],
    ["reservation", "Rezervasyon", FaCalendarAlt],
    ["operations", "Operasyon", FaBolt],
  ] as const;

  function scrollVillaSection(
    sectionId: string
  ) {
    window.setTimeout(() => {
      document
        .getElementById(sectionId)
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 50);
  }

  function openVillaModule(
    url: string,
    requireVilla = false
  ) {
    if (
      requireVilla &&
      !selectedVillaId
    ) {
      setError(
        "Bu işlem için önce bir villa seçmelisin."
      );

      scrollVillaSection(
        "villa-portfolio"
      );

      return;
    }

    const separator =
      url.includes("?")
        ? "&"
        : "?";

    window.location.href =
      selectedVillaId
        ? `${url}${separator}villa=${selectedVillaId}`
        : url;
  }

  function handleMainNavigation(
    key: SectionKey
  ) {
    setActiveSection(key);
    setError("");

    if (key === "overview") {
      scrollVillaSection(
        "villa-overview"
      );
      return;
    }

    if (key === "portfolio") {
      scrollVillaSection(
        "villa-portfolio"
      );
      return;
    }

    if (key === "reservation") {
      if (!selectedVillaId) {
        setError(
          "Rezervasyon oluşturmak için önce bir villa seç."
        );

        scrollVillaSection(
          "villa-portfolio"
        );

        return;
      }

      setShowReservationForm(true);
      return;
    }

    if (key === "operations") {
      openVillaModule(
        "/dashboard/villa-os/control-center",
        true
      );
    }
  }

  const professionalModules = [
    {
      title: "Fotoğraf & İlan",
      subtitle:
        "Galeri, kapak görseli ve satış görsellerini yönet.",
      badge:
        "Fotoğraf Yönetimi",
      icon: FaImages,
      action: () =>
        openVillaModule(
          "/dashboard/villa-os/control-center?tab=media",
          true
        ),
    },
    {
      title: "B2B Dağıtım",
      subtitle:
        "Acenta erişimi, partner ağı ve B2B net fiyat yönetimi.",
      badge:
        "Partner Ağı",
      icon: FaUserFriends,
      action: () =>
        openVillaModule(
          "/dashboard/villa-os/b2b-network"
        ),
    },
    {
      title: "Ödeme & Kasa",
      subtitle:
        "Tahsilat, kapora, bakiye, depozito, iade ve kasa.",
      badge:
        "Finans Akışı",
      icon: FaMoneyBillWave,
      action: () =>
        openVillaModule(
          "/dashboard/villa-os/finance-center"
        ),
    },
    {
      title: "Kanal Yönetimi",
      subtitle:
        "Airbnb, Booking, VRBO ve iCal kanal bağlantıları.",
      badge:
        "Channel Manager",
      icon: FaSyncAlt,
      action: () =>
        openVillaModule(
          "/dashboard/villa-os/control-center?tab=channels",
          true
        ),
    },
  ];

  return (
    <main className="min-h-screen bg-[#060b14] text-white">
      <div className="mx-auto max-w-[1680px] px-4 py-5 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-[30px] border border-white/10 bg-slate-900/70 shadow-2xl shadow-black/30">
          <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-emerald-500/15 blur-3xl" />
          <div className="absolute left-1/3 top-0 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl" />

          <div className="relative border-b border-white/10 px-5 py-5 lg:px-7">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-emerald-300 to-cyan-400 text-xl text-slate-950 shadow-lg shadow-emerald-500/20">
                  <FaHome />
                </div>
                <div>
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.24em] text-emerald-400">
                    Turobus Villa OS
                    <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-1 text-[9px] tracking-normal text-emerald-300">
                      LIVE
                    </span>
                  </div>
                  <h1 className="mt-1 text-2xl font-black tracking-tight lg:text-3xl">
                    Villa Operasyon Merkezi
                  </h1>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setShowReservationForm(true)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm font-black text-cyan-200 transition hover:bg-cyan-400/15"
                >
                  <FaCalendarAlt /> Yeni Rezervasyon
                </button>
                <button
                  type="button"
                  onClick={() => setShowVillaForm(true)}
                  className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-300 to-cyan-300 px-4 py-3 text-sm font-black text-slate-950 shadow-lg shadow-emerald-500/10"
                >
                  <FaPlus /> Yeni Villa
                </button>
              </div>
            </div>
          </div>

          <div className="relative flex flex-wrap gap-2 px-4 py-3 lg:px-7">
            {navigation.map(([key, label, Icon]) => (
              <button
                key={key}
                type="button"
                onClick={() =>
                  handleMainNavigation(key)
                }
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black transition ${
                  activeSection === key
                    ? "bg-white text-slate-950 shadow-lg"
                    : "text-slate-400 hover:bg-white/[.05] hover:text-white"
                }`}
              >
                <Icon className="text-xs" /> {label}
              </button>
            ))}
          </div>
        </section>

        {error && (
          <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200">
            {error}
          </div>
        )}
        {message && (
          <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-200">
            {message}
          </div>
        )}

        <section
          id="villa-overview"
          className="scroll-mt-24 mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4"
        >
          <MetricCard
            title="Doluluk"
            value={`%${metrics.occupancy_rate ?? 0}`}
            subtitle={`${metrics.villa_count ?? villas.length} aktif villa`}
            icon={<FaChartLine />}
            accent="emerald"
          />
          <MetricCard
            title="Aylık Gelir"
            value={money(metrics.revenue)}
            subtitle={`${money(metrics.paid)} tahsil edildi`}
            icon={<FaCoins />}
            accent="cyan"
          />
          <MetricCard
            title="Kalan Tahsilat"
            value={money(metrics.balance)}
            subtitle="Açık rezervasyon bakiyesi"
            icon={<FaCreditCard />}
            accent="amber"
          />
          <MetricCard
            title="Bugünkü Operasyon"
            value={`${metrics.today_checkins ?? 0} giriş · ${metrics.today_checkouts ?? 0} çıkış`}
            subtitle={`${metrics.cleaning_pending ?? 0} temizlik görevi bekliyor`}
            icon={<FaBolt />}
            accent="violet"
          />
        </section>

        <section
          id="villa-portfolio"
          className="scroll-mt-24 mt-5 grid gap-5 xl:grid-cols-[1.45fr_.75fr]"
        >
          <div className="rounded-[28px] border border-white/10 bg-slate-900/60 p-5 shadow-2xl shadow-black/10 lg:p-6">
            <SectionTitle
              eyebrow="Canlı operasyon"
              title="Portföy & Yaklaşan Konaklamalar"
              action={
                <button
                  type="button"
                  onClick={() => setActiveSection("portfolio")}
                  className="text-xs font-black text-slate-400 transition hover:text-white"
                >
                  Tüm villaları gör <FaChevronRight className="ml-1 inline" />
                </button>
              }
            />

            <div className="mt-5 grid gap-4 lg:grid-cols-[.9fr_1.1fr]">
              <div className="space-y-3">
                {villas.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => setShowVillaForm(true)}
                    className="w-full rounded-[24px] border border-dashed border-white/15 bg-white/[.02] p-8 text-left transition hover:border-emerald-400/30 hover:bg-emerald-500/[.03]"
                  >
                    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-300">
                      <FaPlus />
                    </div>
                    <div className="mt-4 text-lg font-black">İlk villanı ekle</div>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      Takvim, fiyat, temizlik ve satış kanallarını tek panelden yönet.
                    </p>
                  </button>
                ) : (
                  villas.slice(0, 4).map((villa, index) => (
                    <button
                      key={villa.id}
                      type="button"
                      onClick={() => setSelectedVillaId(villa.id)}
                      className={`w-full rounded-2xl border p-4 text-left transition ${
                        selectedVillaId === villa.id
                          ? "border-emerald-400/30 bg-emerald-500/[.07]"
                          : "border-white/10 bg-black/15 hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex gap-3">
                          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/[.05] text-slate-300">
                            <span className="text-xs font-black">V{index + 1}</span>
                          </div>
                          <div>
                            <div className="font-black">{villa.name}</div>
                            <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                              <FaMapMarkerAlt className="text-[10px]" />
                              {[villa.city, villa.district]
                                .filter(Boolean)
                                .join(" · ") || "Konum eklenmedi"}
                            </div>
                          </div>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase ${
                            villa.marketplace_enabled
                              ? "bg-emerald-500/10 text-emerald-300"
                              : "bg-slate-500/10 text-slate-400"
                          }`}
                        >
                          {villa.marketplace_enabled ? "Online" : "Kapalı"}
                        </span>
                      </div>
                      <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                        <div className="rounded-xl bg-white/[.03] p-2.5">
                          <div className="text-slate-500">Gece</div>
                          <div className="mt-1 font-black text-white">
                            {money(villa.base_nightly_rate)}
                          </div>
                        </div>
                        <div className="rounded-xl bg-white/[.03] p-2.5">
                          <div className="text-slate-500">Kapasite</div>
                          <div className="mt-1 font-black text-white">
                            {villa.max_guests} kişi
                          </div>
                        </div>
                        <div className="rounded-xl bg-white/[.03] p-2.5">
                          <div className="text-slate-500">Min.</div>
                          <div className="mt-1 font-black text-white">
                            {villa.minimum_stay} gece
                          </div>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>

              <div className="rounded-[24px] border border-white/10 bg-[#08111f] p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-black uppercase tracking-[.16em] text-slate-500">
                      Yaklaşan rezervasyonlar
                    </div>
                    <div className="mt-1 text-sm font-bold text-slate-300">
                      Giriş · çıkış · bakiye · kanal
                    </div>
                  </div>
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-cyan-500/10 text-cyan-300">
                    <FaCalendarAlt />
                  </div>
                </div>

                <div className="mt-4 space-y-2.5">
                  {upcomingReservations.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-slate-500">
                      Henüz yaklaşan rezervasyon yok.
                    </div>
                  ) : (
                    upcomingReservations.map((reservation) => (
                      <div
                        key={reservation.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[.025] px-4 py-3"
                      >
                        <div className="min-w-0">
                          <div className="truncate font-black text-white">
                            {reservation.guest_name}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                            <span>{dateLabel(reservation.check_in)}</span>
                            <FaArrowRight className="text-[9px]" />
                            <span>{dateLabel(reservation.check_out)}</span>
                            <span>·</span>
                            <span>{channelLabel(reservation.sales_channel)}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-black text-white">
                            {money(reservation.grand_total)}
                          </div>
                          <div
                            className={`mt-1 text-[10px] font-black ${
                              reservation.balance > 0
                                ? "text-amber-300"
                                : "text-emerald-300"
                            }`}
                          >
                            {reservation.balance > 0
                              ? `${money(reservation.balance)} kalan`
                              : "Ödendi"}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-[28px] border border-white/10 bg-slate-900/60 p-5 shadow-2xl shadow-black/10">
              <SectionTitle eyebrow="Hızlı durum" title="Bugün" />
              <div className="mt-5 space-y-3">
                {[
                  [
                    "Girişler",
                    metrics.today_checkins ?? 0,
                    "Bugün villaya giriş yapacak misafir",
                    FaKey,
                    "text-cyan-300 bg-cyan-500/10",
                  ],
                  [
                    "Çıkışlar",
                    metrics.today_checkouts ?? 0,
                    "Çıkış sonrası temizlik akışı",
                    FaExternalLinkAlt,
                    "text-violet-300 bg-violet-500/10",
                  ],
                  [
                    "Temizlik",
                    metrics.cleaning_pending ?? 0,
                    "Bekleyen / devam eden görev",
                    FaBroom,
                    "text-amber-300 bg-amber-500/10",
                  ],
                ].map(([title, value, subtitle, Icon, color]) => {
                  const TypedIcon = Icon as typeof FaKey;
                  return (
                    <div
                      key={String(title)}
                      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/15 p-3.5"
                    >
                      <div className={`grid h-10 w-10 place-items-center rounded-xl ${color}`}>
                        <TypedIcon />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-black">{String(title)}</span>
                          <span className="text-lg font-black">{String(value)}</span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500">{String(subtitle)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-emerald-500/10 via-slate-900/70 to-cyan-500/10 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[.22em] text-emerald-400">
                    Turobus Marketplace
                  </div>
                  <div className="mt-2 text-xl font-black">{activeMarketplaceCount} villa satışta</div>
                  <p className="mt-2 text-xs leading-5 text-slate-400">
                    Açık villalar Turobus ağına yayınlanır. Direkt ve B2B satışlarda Turobus komisyonu oluşmaz.
                  </p>
                </div>
                <FaGlobe className="mt-1 text-2xl text-emerald-300" />
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveSection("portfolio");
                  scrollVillaSection(
                    "villa-portfolio"
                  );
                }}
                className="mt-5 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.05] px-3 py-2 text-xs font-black text-white transition hover:border-emerald-400/30 hover:bg-emerald-500/[.06]"
              >
                Villa Yayınlarını Yönet
                <FaArrowRight />
              </button>
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
          <div className="rounded-[28px] border border-white/10 bg-slate-900/60 p-5 lg:p-6">
            <SectionTitle
              eyebrow="Villa detay"
              title={selectedVilla?.name ?? "Villa seçilmedi"}
              action={
                selectedVilla ? (
                  <button
                    type="button"
                    onClick={() => toggleMarketplace(selectedVilla)}
                    className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-black ${
                      selectedVilla.marketplace_enabled
                        ? "bg-emerald-500/10 text-emerald-300"
                        : "bg-white/[.05] text-slate-300"
                    }`}
                  >
                    {selectedVilla.marketplace_enabled ? <FaToggleOn /> : <FaToggleOff />}
                    {selectedVilla.marketplace_enabled
                      ? "Turobus satış açık"
                      : "Turobus satış kapalı"}
                  </button>
                ) : null
              }
            />

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Yatak odası", selectedVilla?.bedrooms ?? 0, FaBed],
                ["Maks. misafir", selectedVilla?.max_guests ?? 0, FaUsers],
                ["Temizlik", money(selectedVilla?.cleaning_fee), FaBroom],
                ["Depozito", money(selectedVilla?.security_deposit), FaReceipt],
              ].map(([label, value, Icon]) => {
                const TypedIcon = Icon as typeof FaBed;
                return (
                  <div
                    key={String(label)}
                    className="rounded-2xl border border-white/10 bg-black/15 p-4"
                  >
                    <TypedIcon className="text-slate-500" />
                    <div className="mt-3 text-[10px] font-black uppercase tracking-wider text-slate-500">
                      {String(label)}
                    </div>
                    <div className="mt-1 font-black text-white">{String(value)}</div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 rounded-[22px] border border-white/10 bg-[#08111f] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-black">Satış ve operasyon kuralı</div>
                  <div className="mt-1 text-xs text-slate-500">
                    Fiyat, minimum konaklama ve temizlik koşulları
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-black text-emerald-300">
                    {money(selectedVilla?.base_nightly_rate)}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-500">gecelik</div>
                </div>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <div className="rounded-xl bg-white/[.03] p-3 text-xs text-slate-400">
                  Minimum <strong className="text-white">{selectedVilla?.minimum_stay ?? 0} gece</strong>
                </div>
                <div className="rounded-xl bg-white/[.03] p-3 text-xs text-slate-400">
                  Temizlik eşiği <strong className="text-white">{selectedVilla?.cleaning_fee_under_nights ?? "-"} gece</strong>
                </div>
                <div className="rounded-xl bg-white/[.03] p-3 text-xs text-slate-400">
                  Marketplace <strong className="text-white">%{selectedVilla?.marketplace_commission_rate ?? 0}</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-slate-900/60 p-5 lg:p-6">
            <SectionTitle eyebrow="Operasyon akışı" title="Görev Merkezi" />
            <div className="mt-5 space-y-3">
              {cleaning.slice(0, 5).length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-slate-500">
                  Aktif temizlik görevi yok.
                </div>
              ) : (
                cleaning.slice(0, 5).map((task) => {
                  const villa = villas.find((item) => item.id === task.villa_id);
                  return (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/15 p-3.5"
                    >
                      <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500/10 text-amber-300">
                        <FaBroom />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-black">
                          {villa?.name ?? "Villa"}
                        </div>
                        <div className="mt-1 text-[11px] text-slate-500">
                          {dateLabel(task.task_date)} · {statusLabel(task.status)}
                        </div>
                      </div>
                      <FaChevronRight className="text-xs text-slate-600" />
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  openVillaModule(
                    "/dashboard/villa-os/erp/invoices"
                  )
                }
                className="rounded-xl border border-white/10 bg-white/[.03] px-3 py-3 text-xs font-black text-slate-300 transition hover:border-emerald-400/30 hover:bg-emerald-500/[.05] hover:text-white"
              >
                <FaFileInvoice className="mr-2 inline" />
                Fatura Merkezi
              </button>

              <button
                type="button"
                onClick={() =>
                  openVillaModule(
                    "/dashboard/villa-os/control-center?tab=channels",
                    true
                  )
                }
                className="rounded-xl border border-white/10 bg-white/[.03] px-3 py-3 text-xs font-black text-slate-300 transition hover:border-cyan-400/30 hover:bg-cyan-500/[.05] hover:text-white"
              >
                <FaCloud className="mr-2 inline" />
                Kanal Senkron
              </button>
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">

          {professionalModules.map(
            (module) => {

              const ModuleIcon =
                module.icon;

              return (
                <button
                  key={module.title}
                  type="button"
                  onClick={module.action}
                  className="group rounded-[24px] border border-white/10 bg-slate-900/50 p-5 text-left transition hover:-translate-y-1 hover:border-emerald-400/30 hover:bg-slate-900/90 hover:shadow-2xl hover:shadow-black/20"
                >

                  <div className="flex items-start justify-between">

                    <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/[.05] text-slate-300 transition group-hover:bg-emerald-500/10 group-hover:text-emerald-300">
                      <ModuleIcon />
                    </div>

                    <div className="grid h-8 w-8 place-items-center rounded-xl bg-white/[.025] text-slate-600 transition group-hover:bg-emerald-400 group-hover:text-slate-950">
                      <FaChevronRight className="text-xs" />
                    </div>

                  </div>

                  <div className="mt-4 text-base font-black">
                    {module.title}
                  </div>

                  <p className="mt-1 min-h-[40px] text-xs leading-5 text-slate-500">
                    {module.subtitle}
                  </p>

                  <div className="mt-4 flex items-center justify-between gap-3">

                    <span className="inline-flex rounded-full bg-white/[.04] px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-slate-500 group-hover:text-emerald-300">
                      {module.badge}
                    </span>

                    <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400 opacity-0 transition group-hover:opacity-100">
                      Aç →
                    </span>

                  </div>

                </button>
              );
            }
          )}

        </section>

        <div className="mt-5 flex flex-wrap gap-2 text-xs text-slate-500">
          <Link href="/dashboard/activity-network" className="rounded-lg border border-white/10 px-3 py-2 hover:text-white">
            Activity Network
          </Link>
          <Link href="/dashboard/package-os/builder" className="rounded-lg border border-white/10 px-3 py-2 hover:text-white">
            Package Builder
          </Link>
          <span className="ml-auto inline-flex items-center gap-2 px-2 py-2">
            <FaCircle className={`text-[7px] ${loading ? "text-amber-300" : "text-emerald-300"}`} />
            {loading ? "Veriler güncelleniyor" : "Sistem güncel"}
          </span>
        </div>
      </div>

      {showVillaForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="max-h-[94vh] w-full max-w-6xl overflow-y-auto rounded-[30px] border border-white/10 bg-[#0a1220] shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[.22em] text-emerald-400">Yeni portföy kaydı</div>
                <h3 className="mt-1 text-2xl font-black">Villa Oluştur</h3>
                <p className="mt-1 text-sm text-slate-500">Temel satış ve operasyon kurallarını tek ekranda tanımla.</p>
              </div>
              <button onClick={() => setShowVillaForm(false)} className="rounded-xl border border-white/10 px-3 py-2 text-sm font-black text-slate-400">Kapat</button>
            </div>

            <form onSubmit={addVilla}>
              <div className="grid lg:grid-cols-[minmax(0,1fr)_330px]">

                <div className="p-5 lg:p-7">

                  {/* TEMEL BİLGİLER */}
                  <section className="rounded-[24px] border border-white/10 bg-white/[.025] p-5">

                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/10 text-emerald-300">
                        <FaHome />
                      </div>

                      <div>
                        <div className="text-[10px] font-black uppercase tracking-[.18em] text-emerald-400">
                          01 · Temel Bilgiler
                        </div>
                        <h4 className="mt-1 font-black text-white">
                          Villa Kimliği
                        </h4>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 md:grid-cols-2">

                      <label className="md:col-span-2 block">
                        <span className="text-xs font-black text-slate-300">
                          Villa Adı
                        </span>
                        <span className="mt-1 block text-[11px] text-slate-500">
                          Misafirlerin ve personelin göreceği portföy adı.
                        </span>
                        <input
                          value={form.name}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              name: e.target.value,
                            })
                          }
                          placeholder="Örn. Villa Serenity Ölüdeniz"
                          className="mt-2 w-full rounded-xl border border-white/10 bg-[#07111f] px-4 py-3.5 text-sm font-bold text-white outline-none transition focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/10"
                        />
                      </label>

                      <label className="block">
                        <span className="text-xs font-black text-slate-300">
                          İl / Şehir
                        </span>
                        <span className="mt-1 block text-[11px] text-slate-500">
                          Türkiye'deki 81 ilden seçim yap.
                        </span>

                        <select
                          value={selectedProvinceId}
                          disabled={locationsLoading}
                          onChange={(event) =>
                            void handleProvinceChange(
                              event.target.value
                            )
                          }
                          className="mt-2 w-full rounded-xl border border-white/10 bg-[#07111f] px-4 py-3.5 text-sm font-bold text-white outline-none transition focus:border-emerald-400/50 disabled:opacity-50"
                        >
                          <option value="">
                            İl seçin
                          </option>

                          {provinces.map(
                            (province) => (
                              <option
                                key={province.id}
                                value={province.id}
                              >
                                {province.name}
                              </option>
                            )
                          )}
                        </select>
                      </label>

                      <label className="block">
                        <span className="text-xs font-black text-slate-300">
                          İlçe / Bölge
                        </span>
                        <span className="mt-1 block text-[11px] text-slate-500">
                          Seçtiğin ile bağlı ilçeler otomatik gelir.
                        </span>

                        <select
                          value={form.district}
                          disabled={
                            !selectedProvinceId ||
                            locationsLoading
                          }
                          onChange={(event) =>
                            setForm({
                              ...form,
                              district:
                                event.target.value,
                            })
                          }
                          className="mt-2 w-full rounded-xl border border-white/10 bg-[#07111f] px-4 py-3.5 text-sm font-bold text-white outline-none transition focus:border-emerald-400/50 disabled:opacity-50"
                        >
                          <option value="">
                            İlçe seçin
                          </option>

                          {districts.map(
                            (district) => (
                              <option
                                key={district.id}
                                value={district.name}
                              >
                                {district.name}
                              </option>
                            )
                          )}
                        </select>
                      </label>

                    </div>
                  </section>


                  {/* KAPASİTE */}
                  <section className="mt-4 rounded-[24px] border border-white/10 bg-white/[.025] p-5">

                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-500/10 text-cyan-300">
                        <FaBed />
                      </div>

                      <div>
                        <div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-400">
                          02 · Kapasite
                        </div>
                        <h4 className="mt-1 font-black text-white">
                          Konaklama Özellikleri
                        </h4>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 sm:grid-cols-3">

                      <label className="block">
                        <span className="text-xs font-black text-slate-300">
                          Yatak Odası
                        </span>
                        <span className="mt-1 block text-[11px] text-slate-500">
                          Toplam oda sayısı
                        </span>
                        <div className="relative mt-2">
                          <input
                            type="number"
                            min="0"
                            value={form.bedrooms}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                bedrooms: e.target.value,
                              })
                            }
                            className="w-full rounded-xl border border-white/10 bg-[#07111f] px-4 py-3.5 pr-14 font-black text-white outline-none focus:border-cyan-400/50"
                          />
                          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-600">
                            ODA
                          </span>
                        </div>
                      </label>

                      <label className="block">
                        <span className="text-xs font-black text-slate-300">
                          Banyo
                        </span>
                        <span className="mt-1 block text-[11px] text-slate-500">
                          Toplam banyo sayısı
                        </span>
                        <div className="relative mt-2">
                          <input
                            type="number"
                            min="0"
                            value={form.bathrooms}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                bathrooms: e.target.value,
                              })
                            }
                            className="w-full rounded-xl border border-white/10 bg-[#07111f] px-4 py-3.5 pr-14 font-black text-white outline-none focus:border-cyan-400/50"
                          />
                          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-600">
                            ADET
                          </span>
                        </div>
                      </label>

                      <label className="block">
                        <span className="text-xs font-black text-slate-300">
                          Maksimum Misafir
                        </span>
                        <span className="mt-1 block text-[11px] text-slate-500">
                          Aynı anda konaklayabilir
                        </span>
                        <div className="relative mt-2">
                          <input
                            type="number"
                            min="1"
                            value={form.maxGuests}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                maxGuests: e.target.value,
                              })
                            }
                            className="w-full rounded-xl border border-white/10 bg-[#07111f] px-4 py-3.5 pr-14 font-black text-white outline-none focus:border-cyan-400/50"
                          />
                          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-600">
                            KİŞİ
                          </span>
                        </div>
                      </label>

                    </div>
                  </section>


                  {/* SATIŞ FİYATI */}
                  <section className="mt-4 rounded-[24px] border border-white/10 bg-white/[.025] p-5">

                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-xl bg-violet-500/10 text-violet-300">
                        <FaMoneyBillWave />
                      </div>

                      <div>
                        <div className="text-[10px] font-black uppercase tracking-[.18em] text-violet-400">
                          03 · Fiyatlandırma
                        </div>
                        <h4 className="mt-1 font-black text-white">
                          Satış Kuralları
                        </h4>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 md:grid-cols-2">

                      <label className="block">
                        <span className="text-xs font-black text-slate-300">
                          Standart Gecelik Satış Fiyatı
                        </span>
                        <span className="mt-1 block text-[11px] text-slate-500">
                          Takvimde özel fiyat yoksa bu fiyat kullanılır.
                        </span>
                        <div className="relative mt-2">
                          <input
                            type="number"
                            min="0"
                            value={form.nightly}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                nightly: e.target.value,
                              })
                            }
                            placeholder="Örn. 7500"
                            className="w-full rounded-xl border border-white/10 bg-[#07111f] px-4 py-3.5 pr-16 font-black text-white outline-none focus:border-violet-400/50"
                          />
                          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-violet-300">
                            TL
                          </span>
                        </div>
                      </label>

                      <label className="block">
                        <span className="text-xs font-black text-slate-300">
                          Minimum Konaklama
                        </span>
                        <span className="mt-1 block text-[11px] text-slate-500">
                          Rezervasyon için gereken minimum gece.
                        </span>
                        <div className="relative mt-2">
                          <input
                            type="number"
                            min="1"
                            value={form.minimumStay}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                minimumStay: e.target.value,
                              })
                            }
                            className="w-full rounded-xl border border-white/10 bg-[#07111f] px-4 py-3.5 pr-16 font-black text-white outline-none focus:border-violet-400/50"
                          />
                          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-600">
                            GECE
                          </span>
                        </div>
                      </label>

                    </div>
                  </section>


                  {/* TEMİZLİK / DEPOZİTO */}
                  <section className="mt-4 rounded-[24px] border border-white/10 bg-white/[.025] p-5">

                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500/10 text-amber-300">
                        <FaBroom />
                      </div>

                      <div>
                        <div className="text-[10px] font-black uppercase tracking-[.18em] text-amber-400">
                          04 · Operasyon Ücretleri
                        </div>
                        <h4 className="mt-1 font-black text-white">
                          Temizlik & Depozito
                        </h4>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 md:grid-cols-3">

                      <label className="block">
                        <span className="text-xs font-black text-slate-300">
                          Temizlik Ücreti
                        </span>
                        <span className="mt-1 block text-[11px] text-slate-500">
                          Koşul oluştuğunda eklenir.
                        </span>
                        <div className="relative mt-2">
                          <input
                            type="number"
                            min="0"
                            value={form.cleaning}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                cleaning: e.target.value,
                              })
                            }
                            className="w-full rounded-xl border border-white/10 bg-[#07111f] px-4 py-3.5 pr-14 font-black text-white outline-none focus:border-amber-400/50"
                          />
                          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-amber-300">
                            TL
                          </span>
                        </div>
                      </label>

                      <label className="block">
                        <span className="text-xs font-black text-slate-300">
                          Temizlik Ücreti Eşiği
                        </span>
                        <span className="mt-1 block text-[11px] text-slate-500">
                          Bu gecenin altında ücret uygulanır.
                        </span>
                        <div className="relative mt-2">
                          <input
                            type="number"
                            min="0"
                            value={form.cleaningUnder}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                cleaningUnder: e.target.value,
                              })
                            }
                            className="w-full rounded-xl border border-white/10 bg-[#07111f] px-4 py-3.5 pr-16 font-black text-white outline-none focus:border-amber-400/50"
                          />
                          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-600">
                            GECE
                          </span>
                        </div>
                      </label>

                      <label className="block">
                        <span className="text-xs font-black text-slate-300">
                          Hasar Depozitosu
                        </span>
                        <span className="mt-1 block text-[11px] text-slate-500">
                          Misafirden alınacak güvence bedeli.
                        </span>
                        <div className="relative mt-2">
                          <input
                            type="number"
                            min="0"
                            value={form.deposit}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                deposit: e.target.value,
                              })
                            }
                            className="w-full rounded-xl border border-white/10 bg-[#07111f] px-4 py-3.5 pr-14 font-black text-white outline-none focus:border-amber-400/50"
                          />
                          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-amber-300">
                            TL
                          </span>
                        </div>
                      </label>

                    </div>
                  </section>


                  {/* FOTOĞRAF & İLAN */}
                  <section className="mt-4 rounded-[24px] border border-white/10 bg-white/[.025] p-5">

                    <div className="flex flex-wrap items-start justify-between gap-4">

                      <div className="flex items-center gap-3">
                        <div className="grid h-10 w-10 place-items-center rounded-xl bg-rose-500/10 text-rose-300">
                          <FaImages />
                        </div>

                        <div>
                          <div className="text-[10px] font-black uppercase tracking-[.18em] text-rose-400">
                            05 · Fotoğraflar
                          </div>

                          <h4 className="mt-1 font-black text-white">
                            Villa Galerisi
                          </h4>

                          <p className="mt-1 text-[11px] text-slate-500">
                            İlk fotoğraf otomatik kapak görseli olur. En fazla 15 fotoğraf seçebilirsin.
                          </p>
                        </div>
                      </div>

                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-rose-400 px-4 py-3 text-xs font-black text-slate-950 transition hover:bg-rose-300">
                        <FaImages />
                        Fotoğraf Seç

                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(event) =>
                            selectVillaPhotos(
                              event.target.files
                            )
                          }
                        />
                      </label>

                    </div>


                    {!villaPhotoPreviews.length ? (
                      <label className="mt-5 flex min-h-[190px] cursor-pointer flex-col items-center justify-center rounded-[22px] border-2 border-dashed border-white/10 bg-[#07111f] p-8 text-center transition hover:border-rose-400/30 hover:bg-rose-500/[.025]">

                        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-rose-500/10 text-xl text-rose-300">
                          <FaImages />
                        </div>

                        <div className="mt-4 text-sm font-black text-white">
                          Villa fotoğraflarını buraya ekle
                        </div>

                        <div className="mt-1 max-w-md text-xs leading-5 text-slate-500">
                          Havuz, salon, yatak odaları, manzara, bahçe ve diğer satış görsellerini seç.
                        </div>

                        <div className="mt-4 rounded-full bg-white/[.05] px-3 py-1.5 text-[10px] font-black text-slate-400">
                          JPG · PNG · WEBP
                        </div>

                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(event) =>
                            selectVillaPhotos(
                              event.target.files
                            )
                          }
                        />

                      </label>
                    ) : (
                      <div className="mt-5">

                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div className="text-xs font-black text-slate-300">
                            {villaPhotoPreviews.length} fotoğraf seçildi
                          </div>

                          <div className="text-[10px] text-slate-500">
                            İlk görsel kapak fotoğrafıdır
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">

                          {villaPhotoPreviews.map(
                            (preview, index) => (
                              <div
                                key={preview}
                                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#07111f]"
                              >
                                <div className="aspect-[4/3]">
                                  <img
                                    src={preview}
                                    alt={`Villa fotoğrafı ${index + 1}`}
                                    className="h-full w-full object-cover"
                                  />
                                </div>

                                {index === 0 && (
                                  <div className="absolute left-2 top-2 rounded-full bg-emerald-400 px-2.5 py-1 text-[9px] font-black text-slate-950">
                                    KAPAK
                                  </div>
                                )}

                                <button
                                  type="button"
                                  onClick={() =>
                                    removeVillaPhoto(index)
                                  }
                                  className="absolute right-2 top-2 rounded-lg bg-black/70 px-2.5 py-1.5 text-[10px] font-black text-white backdrop-blur"
                                >
                                  Kaldır
                                </button>
                              </div>
                            )
                          )}

                        </div>

                      </div>
                    )}

                  </section>


                  {/* MARKETPLACE */}
                  <section className="mt-4 rounded-[24px] border border-emerald-400/15 bg-emerald-500/[.035] p-5">

                    <div className="flex flex-wrap items-start justify-between gap-4">

                      <div className="max-w-xl">
                        <div className="flex items-center gap-2 text-xs font-black text-emerald-300">
                          <FaGlobe />
                          06 · Turobus Marketplace
                        </div>

                        <p className="mt-2 text-xs leading-5 text-slate-500">
                          Buradaki oran yalnızca Turobus.com üzerinden gelen marketplace satışlarında uygulanır.
                          Direkt, acenta ve B2B satışlarda Turobus komisyonu oluşmaz.
                        </p>
                      </div>

                      <label className="w-full sm:w-[220px]">
                        <span className="text-xs font-black text-slate-300">
                          Marketplace Komisyonu
                        </span>
                        <div className="relative mt-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={form.commission}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                commission: e.target.value,
                              })
                            }
                            className="w-full rounded-xl border border-emerald-400/20 bg-[#07111f] px-4 py-3.5 pr-12 font-black text-white outline-none focus:border-emerald-400/60"
                          />
                          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-black text-emerald-300">
                            %
                          </span>
                        </div>
                      </label>

                    </div>
                  </section>

                </div>


                {/* CANLI ÖZET */}
                <aside className="border-t border-white/10 bg-[#07111f] p-5 lg:border-l lg:border-t-0 lg:p-6">

                  <div className="lg:sticky lg:top-5">

                    <div className="text-[10px] font-black uppercase tracking-[.22em] text-cyan-400">
                      Canlı Portföy Özeti
                    </div>

                    <h4 className="mt-2 text-xl font-black text-white">
                      {form.name.trim() || "Yeni Villa"}
                    </h4>

                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                      <FaMapMarkerAlt />
                      {[form.city, form.district]
                        .filter(Boolean)
                        .join(" · ") || "Konum belirtilmedi"}
                    </div>


                    <div className="mt-5 rounded-[22px] border border-white/10 bg-white/[.025] p-4">

                      <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                        Gecelik Başlangıç
                      </div>

                      <div className="mt-2 text-3xl font-black text-emerald-300">
                        {money(Number(form.nightly || 0))}
                      </div>

                      <div className="mt-1 text-[11px] text-slate-600">
                        Standart satış fiyatı
                      </div>

                    </div>


                    <div className="mt-3 grid grid-cols-2 gap-2">

                      <div className="rounded-xl border border-white/10 bg-white/[.025] p-3">
                        <FaBed className="text-cyan-300" />
                        <div className="mt-2 text-[10px] uppercase text-slate-600">
                          Yatak Odası
                        </div>
                        <div className="mt-1 text-lg font-black">
                          {form.bedrooms || "0"}
                        </div>
                      </div>

                      <div className="rounded-xl border border-white/10 bg-white/[.025] p-3">
                        <FaUsers className="text-violet-300" />
                        <div className="mt-2 text-[10px] uppercase text-slate-600">
                          Kapasite
                        </div>
                        <div className="mt-1 text-lg font-black">
                          {form.maxGuests || "0"} kişi
                        </div>
                      </div>

                      <div className="rounded-xl border border-white/10 bg-white/[.025] p-3">
                        <FaCalendarAlt className="text-amber-300" />
                        <div className="mt-2 text-[10px] uppercase text-slate-600">
                          Minimum
                        </div>
                        <div className="mt-1 text-lg font-black">
                          {form.minimumStay || "0"} gece
                        </div>
                      </div>

                      <div className="rounded-xl border border-white/10 bg-white/[.025] p-3">
                        <FaReceipt className="text-emerald-300" />
                        <div className="mt-2 text-[10px] uppercase text-slate-600">
                          Depozito
                        </div>
                        <div className="mt-1 text-sm font-black">
                          {money(Number(form.deposit || 0))}
                        </div>
                      </div>

                    </div>


                    <div className="mt-4 rounded-xl border border-white/10 bg-white/[.025] p-4 text-xs">

                      <div className="flex items-center justify-between gap-3">
                        <span className="text-slate-500">
                          Temizlik Ücreti
                        </span>
                        <strong>
                          {money(Number(form.cleaning || 0))}
                        </strong>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-3">
                        <span className="text-slate-500">
                          Ücret Eşiği
                        </span>
                        <strong>
                          {form.cleaningUnder || "0"} gece altı
                        </strong>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-3">
                        <span className="text-slate-500">
                          Turobus Marketplace
                        </span>
                        <strong className="text-emerald-300">
                          %{form.commission || "0"}
                        </strong>
                      </div>

                    </div>


                    <div className="mt-5 rounded-xl border border-cyan-400/15 bg-cyan-500/[.04] p-4">
                      <div className="text-xs font-black text-cyan-300">
                        Kayıt sonrası hazır olacak
                      </div>
                      <div className="mt-2 space-y-1.5 text-[11px] text-slate-500">
                        <div>✓ Merkezi müsaitlik takvimi</div>
                        <div>✓ Fiyat ve minimum gece yönetimi</div>
                        <div>✓ Rezervasyon & ödeme takibi</div>
                        <div>✓ Housekeeping operasyonu</div>
                        <div>✓ Airbnb / kanal bağlantıları</div>
                        <div>✓ B2B ve Turobus Marketplace</div>
                        <div>
                          ✓ {villaPhotoFiles.length
                            ? `${villaPhotoFiles.length} villa fotoğrafı`
                            : "Fotoğraf galerisi"}
                        </div>
                      </div>
                    </div>

                  </div>

                </aside>

              </div>


              <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-[#0a1220]/95 px-5 py-4 backdrop-blur-xl lg:px-7">

                <div className="text-xs text-slate-500">
                  <strong className="text-white">
                    {form.name.trim() || "Villa adı girilmedi"}
                  </strong>
                  {" · "}
                  {form.city || "Şehir yok"}
                  {" · "}
                  {form.maxGuests || "0"} kişi
                </div>

                <div className="flex gap-2">

                  <button
                    type="button"
                    onClick={() => setShowVillaForm(false)}
                    className="rounded-xl border border-white/10 px-5 py-3 text-sm font-black text-slate-400 transition hover:bg-white/[.04] hover:text-white"
                  >
                    Vazgeç
                  </button>

                  <button
                    type="submit"
                    disabled={!form.name.trim()}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-300 to-cyan-300 px-6 py-3 text-sm font-black text-slate-950 shadow-lg shadow-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <FaCheckCircle />
                    Villayı Kaydet
                  </button>

                </div>

              </div>

            </form>
          </div>
        </div>
      )}

      {showReservationForm && membership && (
        <VillaBookingDesk
          companyId={membership.company_id}
          villas={villas}
          selectedVillaId={selectedVillaId}
          onVillaChange={setSelectedVillaId}
          onClose={() =>
            setShowReservationForm(false)
          }
          onCreated={async () => {
            setMessage(
              "Rezervasyon başarıyla oluşturuldu."
            );
            await load(
              membership.company_id
            );
          }}
        />
      )}
    </main>
  );
}
