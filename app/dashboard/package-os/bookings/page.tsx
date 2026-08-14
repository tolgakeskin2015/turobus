"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";
import {
  CurrentMembership,
  getCurrentMembership,
} from "@/lib/current-user";

type BookingStatus =
  | "pending"
  | "confirmed"
  | "in_service"
  | "completed"
  | "cancelled";

type PaymentStatus =
  | "unpaid"
  | "partial"
  | "paid"
  | "refunded";

type Booking = {
  id: string;
  booking_code: string;
  public_token: string;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  package_type: string;
  destination: string | null;
  check_in: string;
  check_out: string;
  adults: number;
  children: number;
  nights: number;
  total_cost: number;
  sale_price: number;
  gross_profit: number;
  net_profit: number;
  paid_amount: number;
  balance_amount: number;
  payment_status: PaymentStatus;
  status: BookingStatus;
  booked_at: string;
  quote_id: string | null;
  quote_snapshot_created_at: string | null;
};

type BookingItem = {
  id: string;
  booking_id: string;
  supplier_id: string | null;
  supplier_status:
    | "pending"
    | "requested"
    | "confirmed"
    | "completed"
    | "cancelled";
  service_date: string | null;
};

type Voucher = {
  id: string;
  booking_id: string;
  booking_item_id: string | null;
};

type Payable = {
  id: string;
  booking_id: string;
  amount: number;
  paid_amount: number;
  status: "open" | "partial" | "paid" | "cancelled";
  due_date: string | null;
};

type FilterKey =
  | "all"
  | "attention"
  | "today"
  | "upcoming"
  | "payment"
  | "supplier"
  | "voucher";

function money(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDate(value: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function dateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function daysUntil(value: string) {
  const today = new Date(`${dateKey()}T12:00:00`);
  const target = new Date(`${value}T12:00:00`);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function paymentLabel(status: PaymentStatus) {
  if (status === "paid") return "Ödendi";
  if (status === "partial") return "Kısmi ödeme";
  if (status === "refunded") return "İade";
  return "Ödenmedi";
}

function bookingLabel(status: BookingStatus) {
  if (status === "confirmed") return "Onaylı";
  if (status === "in_service") return "Tatilde";
  if (status === "completed") return "Tamamlandı";
  if (status === "cancelled") return "İptal";
  return "Bekliyor";
}

function bookingStatusClass(status: BookingStatus) {
  if (status === "confirmed") {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
  }
  if (status === "in_service") {
    return "border-cyan-500/20 bg-cyan-500/10 text-cyan-300";
  }
  if (status === "completed") {
    return "border-slate-500/20 bg-slate-500/10 text-slate-300";
  }
  if (status === "cancelled") {
    return "border-red-500/20 bg-red-500/10 text-red-300";
  }
  return "border-amber-500/20 bg-amber-500/10 text-amber-300";
}

function paymentStatusClass(status: PaymentStatus) {
  if (status === "paid") {
    return "bg-emerald-500/10 text-emerald-300";
  }
  if (status === "partial") {
    return "bg-blue-500/10 text-blue-300";
  }
  if (status === "refunded") {
    return "bg-violet-500/10 text-violet-300";
  }
  return "bg-amber-500/10 text-amber-300";
}

export default function PackageBookingsPage() {
  const [membership, setMembership] =
    useState<CurrentMembership | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [items, setItems] = useState<BookingItem[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [payables, setPayables] = useState<Payable[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [errorMessage, setErrorMessage] = useState("");

  const loadData = useCallback(async (companyId: string) => {
    const [bookingResult, itemResult, voucherResult, payableResult] =
      await Promise.all([
        supabase
          .from("package_bookings")
          .select(`
            id,
            booking_code,
            public_token,
            customer_name,
            customer_phone,
            customer_email,
            package_type,
            destination,
            check_in,
            check_out,
            adults,
            children,
            nights,
            total_cost,
            sale_price,
            gross_profit,
            net_profit,
            paid_amount,
            balance_amount,
            payment_status,
            status,
            booked_at,
            quote_id,
            quote_snapshot_created_at
          `)
          .eq("company_id", companyId)
          .order("check_in", { ascending: true }),

        supabase
          .from("package_booking_items")
          .select(`
            id,
            booking_id,
            supplier_id,
            supplier_status,
            service_date
          `)
          .eq("company_id", companyId),

        supabase
          .from("package_vouchers")
          .select("id, booking_id, booking_item_id")
          .eq("company_id", companyId),

        supabase
          .from("package_supplier_payables")
          .select(`
            id,
            booking_id,
            amount,
            paid_amount,
            status,
            due_date
          `)
          .eq("company_id", companyId),
      ]);

    const firstError =
      bookingResult.error ||
      itemResult.error ||
      voucherResult.error ||
      payableResult.error;

    if (firstError) {
      throw new Error(firstError.message);
    }

    setBookings((bookingResult.data ?? []) as Booking[]);
    setItems((itemResult.data ?? []) as BookingItem[]);
    setVouchers((voucherResult.data ?? []) as Voucher[]);
    setPayables((payableResult.data ?? []) as Payable[]);
  }, []);

  useEffect(() => {
    async function initialize() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setErrorMessage("Kullanıcı oturumu bulunamadı.");
          return;
        }

        const currentMembership = await getCurrentMembership(user.id);

        if (!currentMembership) {
          setErrorMessage("Aktif şirket üyeliği bulunamadı.");
          return;
        }

        setMembership(currentMembership);
        await loadData(currentMembership.company_id);
      } catch (error) {
        console.error(error);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Paket rezervasyonları yüklenemedi."
        );
      } finally {
        setLoading(false);
      }
    }

    void initialize();
  }, [loadData]);

  async function refresh() {
    if (!membership || refreshing) return;

    setRefreshing(true);
    setErrorMessage("");

    try {
      await loadData(membership.company_id);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Veriler yenilenemedi."
      );
    } finally {
      setRefreshing(false);
    }
  }

  const itemMap = useMemo(() => {
    const map = new Map<string, BookingItem[]>();

    for (const item of items) {
      const current = map.get(item.booking_id) ?? [];
      current.push(item);
      map.set(item.booking_id, current);
    }

    return map;
  }, [items]);

  const voucherMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const voucher of vouchers) {
      map.set(voucher.booking_id, (map.get(voucher.booking_id) ?? 0) + 1);
    }
    return map;
  }, [vouchers]);

  const payableMap = useMemo(() => {
    const map = new Map<string, Payable[]>();
    for (const payable of payables) {
      const current = map.get(payable.booking_id) ?? [];
      current.push(payable);
      map.set(payable.booking_id, current);
    }
    return map;
  }, [payables]);

  function operationalState(booking: Booking) {
    const bookingItems = itemMap.get(booking.id) ?? [];
    const bookingPayables = payableMap.get(booking.id) ?? [];
    const voucherCount = voucherMap.get(booking.id) ?? 0;

    const supplierPending = bookingItems.filter(
      (item) =>
        item.supplier_id &&
        !["confirmed", "completed", "cancelled"].includes(
          item.supplier_status
        )
    ).length;

    const serviceItems = bookingItems.filter(
      (item) => item.supplier_status !== "cancelled"
    );

    const voucherMissing = Math.max(serviceItems.length - voucherCount, 0);

    const supplierBalance = bookingPayables.reduce(
      (total, payable) =>
        total +
        Math.max(Number(payable.amount || 0) - Number(payable.paid_amount || 0), 0),
      0
    );

    const overduePayables = bookingPayables.filter(
      (payable) =>
        payable.status !== "paid" &&
        payable.status !== "cancelled" &&
        payable.due_date &&
        payable.due_date < dateKey()
    ).length;

    const days = daysUntil(booking.check_in);
    const today = days === 0;
    const upcoming = days >= 0 && days <= 7;
    const paymentRisk =
      Number(booking.balance_amount || 0) > 0 && days >= 0 && days <= 7;

    const attention =
      supplierPending > 0 ||
      voucherMissing > 0 ||
      paymentRisk ||
      overduePayables > 0;

    return {
      supplierPending,
      voucherMissing,
      supplierBalance,
      overduePayables,
      days,
      today,
      upcoming,
      paymentRisk,
      attention,
    };
  }

  const stats = useMemo(() => {
    let totalSales = 0;
    let totalPaid = 0;
    let totalBalance = 0;
    let netProfit = 0;
    let attention = 0;
    let today = 0;
    let upcoming = 0;
    let supplierPending = 0;
    let voucherMissing = 0;

    for (const booking of bookings) {
      if (booking.status === "cancelled") continue;

      totalSales += Number(booking.sale_price || 0);
      totalPaid += Number(booking.paid_amount || 0);
      totalBalance += Number(booking.balance_amount || 0);
      netProfit += Number(booking.net_profit || 0);

      const state = operationalState(booking);
      if (state.attention) attention += 1;
      if (state.today) today += 1;
      if (state.upcoming) upcoming += 1;
      supplierPending += state.supplierPending;
      voucherMissing += state.voucherMissing;
    }

    return {
      count: bookings.filter((booking) => booking.status !== "cancelled").length,
      totalSales,
      totalPaid,
      totalBalance,
      netProfit,
      attention,
      today,
      upcoming,
      supplierPending,
      voucherMissing,
    };
  }, [bookings, itemMap, payableMap, voucherMap]);

  const filteredBookings = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("tr-TR");

    return bookings.filter((booking) => {
      const state = operationalState(booking);

      const matchesFilter =
        filter === "all" ||
        (filter === "attention" && state.attention) ||
        (filter === "today" && state.today) ||
        (filter === "upcoming" && state.upcoming) ||
        (filter === "payment" && Number(booking.balance_amount || 0) > 0) ||
        (filter === "supplier" && state.supplierPending > 0) ||
        (filter === "voucher" && state.voucherMissing > 0);

      if (!matchesFilter) return false;
      if (!query) return true;

      return [
        booking.booking_code,
        booking.customer_name,
        booking.customer_phone,
        booking.customer_email,
        booking.destination,
        paymentLabel(booking.payment_status),
        bookingLabel(booking.status),
      ]
        .filter(Boolean)
        .some((value) =>
          String(value).toLocaleLowerCase("tr-TR").includes(query)
        );
    });
  }, [bookings, filter, search, itemMap, payableMap, voucherMap]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-white md:p-10">
        <div className="mx-auto max-w-[1600px] animate-pulse">
          <div className="h-10 w-80 rounded-xl bg-white/5" />
          <div className="mt-8 grid gap-4 md:grid-cols-4 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-28 rounded-2xl bg-white/5" />
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-white md:p-8 xl:p-10">
      <div className="mx-auto max-w-[1600px]">
        <header className="rounded-[28px] border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-6 shadow-2xl md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-orange-300">
                  TUROBUS PACKAGE OS
                </span>
                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-black text-emerald-300">
                  Operasyon Canlı
                </span>
              </div>

              <h1 className="mt-5 text-3xl font-black tracking-tight md:text-5xl">
                Paket Rezervasyon Operasyon Merkezi
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400 md:text-base">
                Satıştan tahsilata, tedarikçi teyidinden voucher ve hakedişe kadar
                tüm paket rezervasyonlarını tek ekrandan yönetin.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void refresh()}
                disabled={refreshing}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black transition hover:bg-white/10 disabled:opacity-40"
              >
                {refreshing ? "Yenileniyor..." : "↻ Veriyi Yenile"}
              </button>

              <Link
                href="/dashboard/package-os/builder"
                className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-orange-400"
              >
                + Yeni Paket
              </Link>
            </div>
          </div>
        </header>

        {errorMessage && (
          <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-bold text-red-300">
            {errorMessage}
          </div>
        )}

        <section className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {[
            ["Aktif Rezervasyon", String(stats.count), "Toplam aktif dosya", "text-white"],
            ["Bugün Giriş", String(stats.today), "Bugün başlayacak", "text-cyan-300"],
            ["7 Gün İçinde", String(stats.upcoming), "Yaklaşan operasyon", "text-blue-300"],
            ["Aksiyon Bekleyen", String(stats.attention), "Operasyon kontrolü", "text-amber-300"],
            ["Bekleyen Tahsilat", money(stats.totalBalance), "Müşteriden alınacak", "text-orange-300"],
            ["Net Kâr", money(stats.netProfit), "Rezervasyon toplamı", "text-emerald-300"],
          ].map(([label, value, note, valueClass]) => (
            <div
              key={label}
              className="rounded-2xl border border-white/10 bg-slate-900 p-5 shadow-lg"
            >
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                {label}
              </p>
              <p className={`mt-3 text-2xl font-black ${valueClass}`}>{value}</p>
              <p className="mt-2 text-xs text-slate-500">{note}</p>
            </div>
          ))}
        </section>

        <section className="mt-5 grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Tahsilat Sağlığı
                </p>
                <p className="mt-2 text-2xl font-black text-emerald-300">
                  {money(stats.totalPaid)}
                </p>
              </div>
              <p className="text-right text-xs text-slate-500">
                Satış {money(stats.totalSales)}
              </p>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-emerald-400"
                style={{
                  width: `${Math.min(
                    stats.totalSales > 0
                      ? (stats.totalPaid / stats.totalSales) * 100
                      : 0,
                    100
                  )}%`,
                }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setFilter("supplier")}
            className="rounded-2xl border border-white/10 bg-slate-900 p-5 text-left transition hover:border-amber-500/30"
          >
            <p className="text-xs font-black uppercase tracking-wider text-slate-500">
              Tedarikçi Teyidi
            </p>
            <div className="mt-3 flex items-end justify-between gap-3">
              <p className="text-3xl font-black text-amber-300">{stats.supplierPending}</p>
              <p className="text-xs text-slate-500">bekleyen hizmet</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setFilter("voucher")}
            className="rounded-2xl border border-white/10 bg-slate-900 p-5 text-left transition hover:border-violet-500/30"
          >
            <p className="text-xs font-black uppercase tracking-wider text-slate-500">
              Voucher Kontrolü
            </p>
            <div className="mt-3 flex items-end justify-between gap-3">
              <p className="text-3xl font-black text-violet-300">{stats.voucherMissing}</p>
              <p className="text-xs text-slate-500">eksik voucher</p>
            </div>
          </button>
        </section>

        <section className="mt-5 rounded-[26px] border border-white/10 bg-slate-900 p-4 md:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-2">
              {[
                ["all", "Tümü", bookings.length],
                ["attention", "Aksiyon Bekleyen", stats.attention],
                ["today", "Bugün", stats.today],
                ["upcoming", "7 Gün", stats.upcoming],
                [
                  "payment",
                  "Tahsilat",
                  bookings.filter((booking) => Number(booking.balance_amount || 0) > 0).length,
                ],
                ["supplier", "Tedarikçi", stats.supplierPending],
                ["voucher", "Voucher", stats.voucherMissing],
              ].map(([key, label, count]) => (
                <button
                  key={String(key)}
                  type="button"
                  onClick={() => setFilter(key as FilterKey)}
                  className={`rounded-xl px-3 py-2 text-xs font-black transition md:px-4 ${
                    filter === key
                      ? "bg-orange-500 text-slate-950"
                      : "border border-white/10 bg-slate-950 text-slate-300 hover:bg-white/5"
                  }`}
                >
                  {label} · {count}
                </button>
              ))}
            </div>

            <div className="flex min-w-0 flex-1 gap-2 xl:max-w-xl">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rezervasyon, misafir, telefon, e-posta veya destinasyon ara..."
                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none transition placeholder:text-slate-600 focus:border-orange-500/40"
              />
            </div>
          </div>
        </section>

        <section className="mt-5 space-y-3">
          {filteredBookings.length === 0 ? (
            <div className="rounded-[26px] border border-dashed border-white/10 bg-slate-900/70 p-12 text-center">
              <p className="text-xl font-black">Bu filtrede rezervasyon bulunamadı.</p>
              <p className="mt-2 text-sm text-slate-500">
                Aramayı temizleyin veya farklı bir operasyon filtresi seçin.
              </p>
            </div>
          ) : (
            filteredBookings.map((booking) => {
              const state = operationalState(booking);
              const guestCount = Number(booking.adults || 0) + Number(booking.children || 0);
              const collectionPercent = Math.min(
                booking.sale_price > 0
                  ? (Number(booking.paid_amount || 0) / Number(booking.sale_price || 1)) * 100
                  : 0,
                100
              );

              return (
                <article
                  key={booking.id}
                  className={`rounded-[26px] border bg-slate-900 p-5 shadow-xl transition hover:-translate-y-0.5 hover:shadow-2xl md:p-6 ${
                    state.attention
                      ? "border-amber-500/20"
                      : "border-white/10"
                  }`}
                >
                  <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr_1fr_auto] xl:items-center">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/dashboard/package-os/bookings/${booking.id}`}
                          className="text-xl font-black text-white transition hover:text-orange-300"
                        >
                          {booking.booking_code}
                        </Link>

                        <span
                          className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${bookingStatusClass(
                            booking.status
                          )}`}
                        >
                          {bookingLabel(booking.status)}
                        </span>

                        {booking.quote_snapshot_created_at && (
                          <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black text-emerald-300">
                            🔒 Snapshot
                          </span>
                        )}
                      </div>

                      <p className="mt-3 text-lg font-black text-slate-200">
                        {booking.customer_name}
                      </p>

                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span>{booking.customer_phone ?? "Telefon yok"}</span>
                        <span>{booking.destination ?? "Destinasyon yok"}</span>
                        <span>{guestCount} misafir · {booking.nights} gece</span>
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                        Konaklama
                      </p>
                      <p className="mt-2 font-black text-slate-200">
                        {formatDate(booking.check_in)}
                        <span className="mx-2 text-slate-600">→</span>
                        {formatDate(booking.check_out)}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {state.today && (
                          <span className="rounded-lg bg-cyan-500/10 px-2.5 py-1 text-[10px] font-black text-cyan-300">
                            BUGÜN GİRİŞ
                          </span>
                        )}
                        {!state.today && state.days > 0 && state.days <= 7 && (
                          <span className="rounded-lg bg-blue-500/10 px-2.5 py-1 text-[10px] font-black text-blue-300">
                            {state.days} GÜN KALDI
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-end justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                            Satış / Tahsilat
                          </p>
                          <p className="mt-2 text-lg font-black text-orange-300">
                            {money(booking.sale_price)}
                          </p>
                        </div>
                        <span
                          className={`rounded-lg px-2.5 py-1 text-[10px] font-black ${paymentStatusClass(
                            booking.payment_status
                          )}`}
                        >
                          {paymentLabel(booking.payment_status)}
                        </span>
                      </div>

                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800">
                        <div
                          className="h-full rounded-full bg-emerald-400"
                          style={{ width: `${collectionPercent}%` }}
                        />
                      </div>

                      <div className="mt-2 flex justify-between text-[11px] text-slate-500">
                        <span>Alındı {money(booking.paid_amount)}</span>
                        <span>Kalan {money(booking.balance_amount)}</span>
                      </div>
                    </div>

                    <div className="flex flex-row gap-2 xl:flex-col xl:min-w-[180px]">
                      <Link
                        href={`/dashboard/package-os/bookings/${booking.id}`}
                        className="flex-1 rounded-xl bg-orange-500 px-4 py-3 text-center text-xs font-black text-slate-950 transition hover:bg-orange-400"
                      >
                        Operasyon Detayı
                      </Link>

                      <a
                        href={`/seyahat/${booking.public_token}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-center text-xs font-black text-slate-300 transition hover:bg-white/5"
                      >
                        Misafir Sayfası ↗
                      </a>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-2 border-t border-white/5 pt-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className={`rounded-xl px-3 py-2.5 ${state.supplierPending > 0 ? "bg-amber-500/10" : "bg-emerald-500/5"}`}>
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                        Tedarikçi
                      </p>
                      <p className={`mt-1 text-xs font-black ${state.supplierPending > 0 ? "text-amber-300" : "text-emerald-300"}`}>
                        {state.supplierPending > 0
                          ? `${state.supplierPending} teyit bekliyor`
                          : "Teyitler tamam"}
                      </p>
                    </div>

                    <div className={`rounded-xl px-3 py-2.5 ${state.voucherMissing > 0 ? "bg-violet-500/10" : "bg-emerald-500/5"}`}>
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                        Voucher
                      </p>
                      <p className={`mt-1 text-xs font-black ${state.voucherMissing > 0 ? "text-violet-300" : "text-emerald-300"}`}>
                        {state.voucherMissing > 0
                          ? `${state.voucherMissing} eksik`
                          : "Hazır"}
                      </p>
                    </div>

                    <div className={`rounded-xl px-3 py-2.5 ${state.paymentRisk ? "bg-orange-500/10" : "bg-slate-950"}`}>
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                        Müşteri Bakiyesi
                      </p>
                      <p className={`mt-1 text-xs font-black ${state.paymentRisk ? "text-orange-300" : "text-slate-300"}`}>
                        {money(booking.balance_amount)}
                      </p>
                    </div>

                    <div className={`rounded-xl px-3 py-2.5 ${state.overduePayables > 0 ? "bg-red-500/10" : "bg-slate-950"}`}>
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                        Tedarikçi Hakedişi
                      </p>
                      <p className={`mt-1 text-xs font-black ${state.overduePayables > 0 ? "text-red-300" : "text-slate-300"}`}>
                        {money(state.supplierBalance)}
                        {state.overduePayables > 0 ? ` · ${state.overduePayables} vade geçti` : ""}
                      </p>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </section>
      </div>
    </main>
  );
}
